// utils/fillVars.js
const vm = require('vm');

// Define safe globals with a restricted require implementation
const safeRequire = (moduleName) => {
  // Only allow modules that are side-effect free and don't provide access to filesystem or network
  const ALLOWLIST = [
    'path', 'url', 'querystring', 'util', 'buffer',
    // The following modules could potentially be abused and should only be included if necessary:
    // 'crypto', 'zlib', 'assert', 'events', 'http', 'https', 'stream'
  ];
  if (ALLOWLIST.includes(moduleName)) {
    return require(moduleName);
  }
  throw new Error(`Module "${moduleName}" is not in the allowlist`);
};

// Safe global context without exposing full require
const COMMON = { 
  Math, Date, Intl, console, fetch, 
  require: safeRequire,
  Buffer, JSON, Promise, 
  setTimeout, clearTimeout,
  encodeURI, decodeURI, encodeURIComponent, decodeURIComponent,
  Object, Array, String, Number, Boolean, RegExp, Map, Set, WeakMap, WeakSet
};

// Freeze COMMON object to prevent sandbox tampering
Object.freeze(COMMON);

// Global expression cache to improve performance with size limits to prevent memory leaks
class LRUCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  has(key) {
    return this.cache.has(key);
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (item) {
      // Update access time by removing and re-adding
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }
  
  set(key, value) {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
  
  clear() {
    this.cache.clear();
  }
}

// Global expression cache with size limit
const expressionCache = new LRUCache(5000);

function toString(val) {
  if (val === undefined) return undefined;        // trigger "leave literal"
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

// Import core error handling utilities directly to avoid circular dependencies
const errorHandlerCore = require('./errorHandler');
const { formatConsoleError, TimeoutError } = errorHandlerCore;

// evalExpr now ASYNC with enhanced error classification and suggestions
async function evalExpr(expr, ctx, options = {}) {
  const { debugMode = false } = options;
  
  try {
    // Cache compiled scripts for performance
    if (!expressionCache.has(expr)) {
      // wrap so top-level await works
      const wrapped = `(async () => (${expr}))()`; // arrow preserves "this"
      expressionCache.set(expr, new vm.Script(wrapped));
    }
    
    // Use the cached script
    const script = expressionCache.get(expr);
    
    // Use withTimeout from the imported errorHandlerCore
    const { withTimeout } = errorHandlerCore;
    
    // Execute with timeout protection using our withTimeout utility
    // This ensures the entire execution is properly timed out, not just the sync part
    let result = await withTimeout(
      () => script.runInContext(ctx),
      30_000
    );

    // If result is a promise, we need to await it with an additional timeout protection
    if (result && typeof result.then === 'function') {
      try {
        // Use AbortController for better timeout management
        const controller = new AbortController();
        const { signal } = controller;
        
        // Create a timeout promise with robust cleanup
        const timeoutPromise = new Promise((_, reject) => {
          let timeoutId = setTimeout(() => {
            // Clear the timeout ID first to prevent any race conditions
            const tid = timeoutId;
            timeoutId = null;
            
            // Then reject with detailed error info
            reject(new TimeoutError(`Promise execution timed out after 30000ms`, {
              suggestion: 'Your async operation took too long. Consider optimizing network calls or breaking complex operations into smaller parts.'
            }));
            
            // Finally abort the controller to signal to any cleanup listeners
            controller.abort();
            
            // Extra safety: ensure the timeout is cleared in case the abort listener fails
            clearTimeout(tid);
          }, 30_000);
          
          // Auto-cleanup when abort is called from any source
          signal.addEventListener('abort', () => {
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
          }, { once: true });
        });
        
        // Race the actual promise against the timeout
        result = await Promise.race([
          result.finally(() => controller.abort()), // Ensure cleanup happens
          timeoutPromise
        ]);
      } catch (promiseError) {
        // Enhanced error handling with classification and suggestions
        console.error(`Promise error in expression "${expr}": ${promiseError.message}`);
        
        // Generate user-friendly error message with suggestions if in debug mode
        if (debugMode) {
          const formattedError = formatConsoleError(promiseError, { 
            context: expr,
            colorOutput: false 
          });
          return `{{Error: ${promiseError.message}\n\nSuggestions: ${formattedError.split('\n')[0]}}}`; 
        }
        
        return `{{Error: ${promiseError.message}}}`; // Return formatted error
      }
    }

    const s = toString(result);
    return s === undefined ? `{{${expr}}}` : s;
  } catch (error) {
    // Enhanced error handling with classification and suggestions
    console.error(`Error evaluating "${expr}": ${error.message}`);
    
    // Generate user-friendly error message with suggestions if in debug mode
    if (debugMode) {
      const formattedError = formatConsoleError(error, { 
        context: expr,
        colorOutput: false 
      });
      
      return `{{Error: ${error.message}
Suggestion: ${error.suggestion || 'Check syntax and variable names.'}
Examples: ${error.examples ? `Bad: ${error.examples.bad}, Good: ${error.examples.good}` : 'N/A'}
}}`;
    }
    
    return `{{Error: ${error.message}}}`; // Return formatted error message instead of original expression
  }
}

// Token-based template parser that handles nested expressions and provides detailed errors
async function render(tpl, ctx, options = {}) {
  const { debugMode = false } = options;
  let out = '';
  let i = 0;
  // Calculate a reasonable iteration limit based on template size
  // Using a ratio of 5x template length with a minimum of 1000 and maximum of 10000
  const maxIterations = options.maxIterations || 
    Math.min(10000, Math.max(1000, tpl.length * 5)); // Dynamic safety limit
  let iterations = 0;
  
  try {
    while (i < tpl.length && iterations < maxIterations) {
      iterations++;
      const open = tpl.indexOf('{{', i);
      if (open === -1) { 
        out += tpl.slice(i); 
        break; 
      }
      
      // Add text before the expression
      out += tpl.slice(i, open);
      
      // Find the matching closing brackets with proper nesting support
      let j = open + 2, depth = 0, inString = false, escaping = false;
      // Skip leading whitespace
      while (j < tpl.length && tpl[j].trim() === '') j++;
      
      // Process each character to find the matching closing brackets
      while (j < tpl.length) {
        const char = tpl[j];
        
        // Handle string literals to avoid confusing braces inside strings
        if (char === '"' || char === "'") {
          if (!escaping) inString = !inString;
        }
        
        // Track escape character in strings
        escaping = char === '\\' && !escaping;
        
        // Only count braces when not in a string literal
        if (!inString) {
          if (char === '{') depth++;
          else if (char === '}') {
            if (depth === 0 && tpl[j + 1] === '}') break;
            depth--;
          }
        }
        j++;
      }
      
      // Handle unclosed expression with enhanced error
      if (j >= tpl.length) {
        const errorMessage = debugMode ? 
          `{{Error: Unclosed expression starting at position ${open}.
Suggestion: Check for missing closing braces '}}'. Every opening '{{' must have a matching '}}' pair.
Example: Bad: {{Math.max(1, 2)  Good: {{Math.max(1, 2)}}
}}` :
          `{{Error: Unclosed expression starting at position ${open}}}`;
        
        out += errorMessage;
        break; 
      }
      
      // Extract expression and evaluate - first recursively render template inside
      let expr = tpl.slice(open + 2, j).trim();
      
      // Simple and safer nested template handling 
      // First evaluate any nested templates
      if (expr.includes('{{')) {
        try {
          // Process inner templates first
          expr = await render(expr, ctx, { debugMode });
        } catch (nestedError) {
          // Enhanced error for nested templates
          const nestedErrorMsg = debugMode ?
            formatConsoleError(nestedError, { context: expr, colorOutput: false }) :
            nestedError.message;
            
          out += `{{Error: Failed to process nested template: ${nestedErrorMsg}}}`;
          i = j + 2;
          continue;
        }
      }

      // Then evaluate the expression with debug mode if needed
      const result = await evalExpr(expr, ctx, { debugMode });
      out += result;
      i = j + 2;
    }
    
    if (iterations >= maxIterations) {
      const errorMessage = debugMode ?
        `{{Error: Template processing exceeded ${maxIterations} iterations.
Suggestion: Your template may contain an infinite loop or is extremely complex. Check for circular references or self-replacing patterns.
Example: Bad: {{var}} where var='{{var}}' (self-reference)  Good: {{var}} where var has a final value
}}` :
        `{{Error: Template processing exceeded ${maxIterations} iterations (template length: ${tpl.length}) - possible infinite loop or very complex template}}`;
        
      return errorMessage;
    }
    
    return out;
  } catch (error) {
    // Enhanced error handling with classification and suggestions
    console.error(`Template rendering error: ${error.message}`);
    
    if (debugMode) {
      const formattedError = formatConsoleError(error, {
        context: tpl.substring(0, 100) + (tpl.length > 100 ? '...' : ''),
        colorOutput: false
      });
      
      return `{{Error in template rendering: ${error.message}
Suggestion: ${error.suggestion || 'Check your template syntax for errors.'}
}}`;
    }
    
    return `{{Error in template rendering: ${error.message}}}`;
  }
}

/**
 * Enhanced template engine that fills variables and evaluates expressions safely
 * with improved error handling and user guidance
 * 
 * @param {string} template - raw prompt with {dob} and {{ … }}
 * @param {object} vars - { dob, birthTime, gender }
 * @param {object} helpers - merged helper functions (must return non-void)
 * @param {object} options - optional configuration settings
 * @returns {Promise<string>} rendered prompt
 */
module.exports = async function fillVars(template, vars, helpers = {}, options = {}) {
  // Handle invalid input gracefully
  if (typeof template !== 'string') {
    console.error('fillVars received non-string template:', template);
    return '';
  }
  
  const {
    maxRenderDepth = 10,      // Max recursive rendering depth
    clearCache = false,       // Option to clear the expression cache
    debugMode = false,        // Enable detailed error reporting
    detectMissingVars = true  // Detect and report missing variables
  } = options;
  
  // Clear cache if requested
  if (clearCache) expressionCache.clear();
  
  // 0) escape stray back-ticks
  let txt = template.replace(/`/g, '\\`');

  // 1) simple placeholders {dob} {birthTime}… with enhanced error reporting
  const missingVars = new Set();
  // Improved regex that ignores braces that are immediately followed/preceded by another brace
  // This prevents corruption of JSON or code literals inside {{ … }} blocks
  txt = txt.replace(/(?<!\{)\{([\w]+)\}(?!\})/g, (match, k) => {
    if (k in vars) {
      const val = vars[k];
      return val !== undefined && val !== null ? String(val) : '';
    }
    
    // Track missing variables
    if (detectMissingVars) {
      missingVars.add(k);
    }
    
    // Provide guidance for missing variables in debug mode
    return debugMode ? `{${k}?}` : match; 
  });
  
  // Warn about missing variables if in debug mode
  if (debugMode && missingVars.size > 0) {
    const missingVarsList = Array.from(missingVars).join(', ');
    console.warn(`Template references undefined variables: ${missingVarsList}`);
    
    // Add warning to template output in debug mode
    if (missingVars.size > 0) {
      txt = `{{Warning: Missing variables: ${missingVarsList}.
Suggestion: Make sure all needed variables are provided in the context.
Examples: If using {dob}, make sure 'dob' is in the vars object.
}}\n\n` + txt;
    }
  }

  // 2) build context with enhanced safety
  // Deep freeze utilities to prevent modification
  const utils = Object.freeze({
    isObject: (val) => val !== null && typeof val === 'object',
    isArray: Array.isArray,
    isEmpty: (val) => val == null || val === '' || 
                    (Array.isArray(val) && val.length === 0) || 
                    (typeof val === 'object' && Object.keys(val).length === 0)
  });
  
  // Create a fresh context with frozen common objects to prevent tampering
  const ctx = vm.createContext({
    ...COMMON,  // Common objects are frozen at definition
    ...vars,    // Variables are specific to this render
    ...helpers, // Helper functions should be trusted
    _utils: utils
  });

  // 3) async render with depth tracking for recursive templates and enhanced errors
  let depth = 0;
  const renderWithDepth = async (text) => {
    if (depth >= maxRenderDepth) {
      if (debugMode) {
        return `{{Error: Maximum template nesting depth (${maxRenderDepth}) exceeded.
Suggestion: Your template has too many nested levels. Consider simplifying its structure or breaking it into smaller templates.
Example: Bad: {{a}} where a='{{b}}' where b='{{c}}' etc.  Good: Flatten the structure where possible
}}`;
      }
      
      return `{{Error: Maximum template nesting depth (${maxRenderDepth}) exceeded}}`;
    }
    
    depth++;
    // Pass along options to lower-level render calls
    const result = await render(text, ctx, { 
      maxIterations: options.maxIterations,
      debugMode: debugMode
    });
    depth--;
    return result;
  };
  
  return await renderWithDepth(txt);
};

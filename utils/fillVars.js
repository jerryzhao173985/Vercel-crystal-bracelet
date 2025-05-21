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

// evalExpr now ASYNC – supports await inside helpers with improved error handling
async function evalExpr(expr, ctx) {
  try {
    // Cache compiled scripts for performance
    if (!expressionCache.has(expr)) {
      // wrap so top-level await works
      const wrapped = `(async () => (${expr}))()`; // arrow preserves "this"
      expressionCache.set(expr, new vm.Script(wrapped));
    }
    
    // Use the cached script
    const script = expressionCache.get(expr);
    
    // Execute with timeout protection (30s)
    let result = await script.runInContext(ctx, { timeout: 30_000 });

    // If result is a promise, we need to await it with an additional timeout protection
    if (result && typeof result.then === 'function') {
      try {
        // Use AbortController for better timeout management
        const controller = new AbortController();
        const { signal } = controller;
        
        // Create a timeout promise with proper cleanup
        const timeoutPromise = new Promise((_, reject) => {
          const id = setTimeout(() => {
            reject(new Error(`Promise execution timed out after 30000ms`));
            controller.abort(); // Signal abortion to any listeners
          }, 30_000);
          
          // Ensure the timer is cleared if promise completes or errors
          signal.addEventListener('abort', () => clearTimeout(id), { once: true });
        });
        
        // Race the actual promise against the timeout
        result = await Promise.race([
          result.finally(() => controller.abort()), // Ensure cleanup happens
          timeoutPromise
        ]);
      } catch (promiseError) {
        console.error(`Promise error in expression "${expr}": ${promiseError.message}`);
        return `{{Error: ${promiseError.message}}}`; // Return formatted error
      }
    }

    const s = toString(result);
    return s === undefined ? `{{${expr}}}` : s;
  } catch (error) {
    console.error(`Error evaluating "${expr}": ${error.message}`);
    return `{{Error: ${error.message}}}`; // Return formatted error message instead of original expression
  }
}

// Token-based template parser that handles nested expressions and provides detailed errors
async function render(tpl, ctx, options = {}) {
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
      
      // Handle unclosed expression
      if (j >= tpl.length) { 
        out += `{{Error: Unclosed expression starting at position ${open}}}`;
        break; 
      }
      
      // Extract expression and evaluate - first recursively render template inside
      let expr = tpl.slice(open + 2, j).trim();
      
      // Simple and safer nested template handling 
      // First evaluate any nested templates
      if (expr.includes('{{')) {
        try {
          // Process inner templates first
          expr = await render(expr, ctx);
        } catch (nestedError) {
          out += `{{Error: Failed to process nested template: ${nestedError.message}}}`;
          i = j + 2;
          continue;
        }
      }

      // Then evaluate the expression
      const result = await evalExpr(expr, ctx);
      out += result;
      i = j + 2;
    }
    
    if (iterations >= maxIterations) {
      return `{{Error: Template processing exceeded ${maxIterations} iterations (template length: ${tpl.length}) - possible infinite loop or very complex template}}`;
    }
    
    return out;
  } catch (error) {
    console.error(`Template rendering error: ${error.message}`);
    return `{{Error in template rendering: ${error.message}}}`;
  }
}

/**
 * Enhanced template engine that fills variables and evaluates expressions safely
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
    debugMode = false         // Enable detailed error reporting
  } = options;
  
  // Clear cache if requested
  if (clearCache) expressionCache.clear();
  
  // 0) escape stray back-ticks
  let txt = template.replace(/`/g, '\\`');

  // 1) simple placeholders {dob} {birthTime}…
  txt = txt.replace(/\{([\w]+)\}/g, (match, k) => {
    if (k in vars) {
      const val = vars[k];
      return val !== undefined && val !== null ? String(val) : '';
    }
    return debugMode ? `{${k}?}` : match; // Mark unknown variables in debug mode
  });

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

  // 3) async render with depth tracking for recursive templates
  let depth = 0;
  const renderWithDepth = async (text) => {
    if (depth >= maxRenderDepth) {
      return `{{Error: Maximum template nesting depth (${maxRenderDepth}) exceeded}}`;
    }
    depth++;
    // Pass along options to lower-level render calls, including custom maxIterations
    const result = await render(text, ctx, { maxIterations: options.maxIterations });
    depth--;
    return result;
  };
  
  return await renderWithDepth(txt);
};

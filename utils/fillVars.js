// utils/fillVars.js
const vm = require('vm');

// Define safe globals with a restricted require implementation
const safeRequire = (moduleName) => {
  const ALLOWLIST = [
    'path', 'url', 'querystring', 'crypto', 
    'zlib', 'buffer', 'util', 'stream', 
    'assert', 'events', 'http', 'https'
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

// Global expression cache to improve performance
const expressionCache = new Map();

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

    // second await if expression returns a promise
    if (result && typeof result.then === 'function') {
      try {
        result = await result;
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
async function render(tpl, ctx) {
  let out = '';
  let i = 0;
  const maxIterations = 1000; // Safety limit to prevent infinite loops
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
      
      // Check for nested expressions
      const nestedExprStart = tpl.indexOf('{{', open + 2);
      
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

      const expr = tpl.slice(open + 2, j).trim();
      const result = await evalExpr(expr, ctx);
      out += result;
      i = j + 2;
    }
    
    if (iterations >= maxIterations) {
      return `{{Error: Template processing exceeded ${maxIterations} iterations - possible infinite loop}}`;
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
  const ctx = vm.createContext({
    ...COMMON,
    ...vars,
    ...helpers,
    // Add useful utility functions
    _utils: {
      isObject: (val) => val !== null && typeof val === 'object',
      isArray: Array.isArray,
      isEmpty: (val) => val == null || val === '' || 
                      (Array.isArray(val) && val.length === 0) || 
                      (typeof val === 'object' && Object.keys(val).length === 0)
    }
  });

  // 3) async render with depth tracking for recursive templates
  let depth = 0;
  const renderWithDepth = async (text) => {
    if (depth >= maxRenderDepth) {
      return `{{Error: Maximum template nesting depth (${maxRenderDepth}) exceeded}}`;
    }
    depth++;
    const result = await render(text, ctx);
    depth--;
    return result;
  };
  
  return await renderWithDepth(txt);
};

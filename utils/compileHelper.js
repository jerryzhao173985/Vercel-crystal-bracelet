// utils/compileHelper.js
const vm = require('vm');

// Enhanced security patterns to detect malicious code
const SECURITY_PATTERNS = {
  // Dangerous globals, methods and properties that could enable code breakout
  // Refined pattern to reduce false positives while catching actual threats
  DANGEROUS: /\b(process|global|eval)\b|(?<!\w)Function(?!\w*[:(])|__proto__|\bconstructor\s*[.(]|\bprototype\s*[:=]|\bsetTimeout\(\s*["']|new\s+Function|["']constructor["']/,
  // File system and process related operations
  FILESYSTEM: /\b(require\s*\(\s*["'](?:fs|child_process|path|os|cluster))/,
  // Network access (except safe fetch)
  NETWORK: /\b(require\s*\(\s*["'](?:http|https|net|dgram))/,
  // Uncommon syntax patterns that might indicate obfuscation
  // Simplified pattern without lookbehind for Node.js compatibility
  OBFUSCATION: /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|\\[0-7]{3}|;\s*\[.*\]\s*\(/
};

/**
 * Enhanced helper compiler with improved security and validation
 * 
 * Turn a string like "(dob) => new Date(dob).getFullYear()" into a real function,
 * sandboxed so it can *only* see safe globals. Performs detailed validation and
 * security checks before compiling.
 * 
 * @param {string} src - Source code string for the helper function
 * @param {object} options - Compilation options
 * @returns {Function} The compiled helper function
 */
module.exports = function compileHelper(src = '', options = {}) {
  const {
    maxLength = 1000,     // Increased max length from 500 to allow more complex functions
    timeout = 100,       // Increased timeout for compilation
    allowMultiline = true, // Allow multiline functions for better readability
    strictMode = false,    // Option for extra strict security checks
    requireParameters = false // Whether to require at least one parameter in strict mode
  } = options;
  
  // Basic input validation
  if (typeof src !== 'string') {
    throw new Error('Helper source must be a string');
  }
  
  if (src.length > maxLength) {
    throw new Error(`Helper source exceeds maximum length (${maxLength} chars)`);
  }
  
  if (!allowMultiline && src.includes('\n')) {
    throw new Error('Multiline helpers are not allowed in this context');
  }
  
  // Security checks
  for (const [type, pattern] of Object.entries(SECURITY_PATTERNS)) {
    if (pattern.test(src)) {
      throw new Error(`Security violation: Potentially unsafe code pattern detected (${type})`);
    }
  }

  /* ─── Does it syntactically promise a value? ─────────────────────────
       a) arrow concise  (dob)=>dob+1
       b) block with "return"  (x)=>{return x+1}
       c) async functions with return
  -------------------------------------------------------------------- */
  const returnsValue =
    /=>\s*(\([^)]*\)|[^({\s])/.test(src.trim()) || // arrow concise incl. `( … )`
    /return\s+[^;]*/.test(src) ||             // explicit return with value
    /async\s+.*return\s+/.test(src);          // async with return
    
  // Note: we removed /console\.log\s*\(/ from checking for return values
  // since logging alone doesn't guarantee a return value
    
  if (!returnsValue) {
    throw new Error('Helper must explicitly return a value (use arrow function or return statement)');
  }

  // Add strict mode to wrapper for better security
  const wrapped = `"use strict"; module.exports = (${src});`;
  
  // Create isolated context
  const ctx = vm.createContext({ 
    module: { exports: {} }, 
    exports: {},
    console: { log: (...args) => console.log('[Helper]', ...args) } // Limited console access
  });

  try {
    // Compile and run with timeout protection
    // Note: This timeout only applies to the compilation/definition, not to subsequent function calls
    new vm.Script(wrapped, { filename: 'helper.js' }).runInContext(ctx, { timeout });
    
    let fn = ctx.module.exports;
    
    // Validate the compiled result
    if (typeof fn !== 'function') {
      throw new Error('Compilation did not result in a function');
    }
    
    // Wrap the function with timeout protection if needed
    if (options.wrapWithTimeout) {
      const originalFn = fn;
      fn = function(...args) {
        const timeoutMs = options.executionTimeout || timeout;
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error(`Helper function execution timed out after ${timeoutMs}ms`));
          }, timeoutMs);
          
          try {
            const result = originalFn.apply(this, args);
            clearTimeout(timeoutId);
            resolve(result);
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        });
      };
    }
    
    // Additional validation for function arity if specified in options
    if (strictMode && options.requireParameters && fn.length === 0) {
      throw new Error('Helper function must accept at least one parameter');
    }
    
    return fn;
  } catch (error) {
    // Enhance error reporting
    if (error instanceof SyntaxError) {
      throw new Error(`Syntax error in helper: ${error.message}`);
    }
    throw error;  // Re-throw other errors
  }
};
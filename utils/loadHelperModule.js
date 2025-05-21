// utils/loadHelperModule.js
const vm = require('vm');
const crypto = require('crypto');

// Configuration constants
const MAX_SIZE = 20_000;  // Increased size limit
const TIMEOUT = 200;      // Increased timeout for larger modules

// Enhanced security patterns with more comprehensive checks
const SECURITY_PATTERNS = {
  // Dangerous globals, methods and properties
  DANGEROUS: /\b(process|global|eval|Function\s*\(|["']constructor["']|__proto__|prototype\s*=|constructor\.prototype|Object\.defineProperty\s*\(\s*Object\.prototype)\b/,
  // File system and process related operations
  FILESYSTEM: /\b(require\s*\(\s*["'](?:fs|child_process|path|os|cluster))\b/,
  // Network access (except safe fetch)
  NETWORK: /\b(require\s*\(\s*["'](?:http|https|net|dgram))\b/,
  // Import statements and require usage
  IMPORTS: /\b(import\s+|require\s*\(\s*)/,
  // Process-related access
  PROCESS: /\b(process\.)|process\[/,
  // Potential code obfuscation techniques
  OBFUSCATION: /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|\\[0-7]{3}|;\s*\[.*\]\s*\(/
};

// Safe globals that can be exposed to user code
const SAFE_G = { 
  Math, Date, Intl, String, Number, Boolean, Array, Object, 
  RegExp, Map, Set, WeakMap, WeakSet, Promise, JSON, 
  // Provide controlled console access
  console: { 
    log: (...args) => console.log('[UserHelper]', ...args),
    error: (...args) => console.error('[UserHelper]', ...args),
    warn: (...args) => console.warn('[UserHelper]', ...args),
    info: (...args) => console.info('[UserHelper]', ...args)
  },
  // Add utility functions
  utils: {
    isObject: (val) => val !== null && typeof val === 'object',
    isArray: Array.isArray,
    isEmpty: (val) => val == null || val === '' || 
                      (Array.isArray(val) && val.length === 0) || 
                      (typeof val === 'object' && Object.keys(val).length === 0)
  }
};

// Helper for verifying that a function returns a value
function returnsSomething(fn) {
  if (typeof fn !== 'function') return false;
  
  const s = fn.toString();
  return /=>\s*[^({]/.test(s) ||         // arrow no braces
         /return\s+[^;]*/.test(s) ||      // explicit return
         /async\s+.*return\s+/.test(s);   // async with return
}

/**
 * Enhanced helper module loader with improved security and caching
 * 
 * @param {string} code - JavaScript code to load as a helper module
 * @param {object} options - Options for loading the helper module
 * @returns {object} An object containing the valid helper functions
 */
module.exports = function loadHelperModule(code = '', options = {}) {
  const {
    maxSize = MAX_SIZE,
    timeout = TIMEOUT,
    allowImports = false,    // Whether to allow controlled imports
    disableCache = false     // Whether to disable the caching
  } = options;
  
  // Basic validation
  if (typeof code !== 'string') {
    console.error('Invalid helper module: code must be a string');
    return {};
  }
  
  if (code.length > maxSize) {
    console.error(`Helper module exceeds size limit (${code.length} > ${maxSize})`);
    return {};
  }
  
  // Security scanning
  for (const [type, pattern] of Object.entries(SECURITY_PATTERNS)) {
    // Skip import check if allowImports is true
    if (type === 'IMPORTS' && allowImports) continue;
    
    if (pattern.test(code)) {
      console.error(`Security violation in helper module: ${type} pattern detected`);
      return {};
    }
  }
  
  // Cache helpers using content hash for performance
  const contentHash = crypto.createHash('sha256').update(code).digest('hex');
  const cacheKey = `helper_${contentHash}`;
  
  // Check module cache unless disabled
  if (!disableCache && global.__helperCache && global.__helperCache[cacheKey]) {
    return global.__helperCache[cacheKey];
  }
  
  // Initialize context with safe globals
  const ctx = vm.createContext({ 
    module: { exports: {} }, 
    exports: {}, 
    ...SAFE_G,
    // Add additional context here if needed for specific applications
  });

  try {
    // Add "use strict" at the beginning of the code
    const strictCode = `"use strict";\n${code}`;
    
    // Execute in sandbox with timeout
    new vm.Script(strictCode, { 
      filename: 'userHelpers.js',
      displayErrors: true
    }).runInContext(ctx, { timeout });
  } catch (error) {
    console.error(`Error executing helper module: ${error.message}`);
    return {};
  }

  const bag = {};

  // Extract functions from module.exports (CommonJS style)
  const exp = ctx.module.exports;
  if (exp && typeof exp === 'object') {
    for (const [k, v] of Object.entries(exp)) {
      if (typeof v === 'function' && returnsSomething(v)) {
        bag[k] = v;
      }
    }
  }

  // Also extract any top-level function declarations
  for (const [k, v] of Object.entries(ctx)) {
    if (['module', 'exports', ...Object.keys(SAFE_G)].includes(k)) continue;
    if (typeof v === 'function' && !(k in bag) && returnsSomething(v)) {
      bag[k] = v;
    }
  }
  
  // Cache the result for future use unless caching is disabled
  if (!disableCache) {
    if (!global.__helperCache) global.__helperCache = {};
    global.__helperCache[cacheKey] = bag;
  }

  return bag;
};
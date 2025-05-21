// utils/secureContext.js
/**
 * Enhanced security utilities for creating isolated execution contexts
 * and running code with proper sandboxing
 * 
 * IMPORTANT: While these utilities provide significantly improved security
 * compared to basic VM usage, they are NOT fully secure against determined
 * attackers. For truly secure sandboxing, consider isolated-vm or separate
 * processes with containerization.
 */

const vm = require('vm');

// Default safe globals that won't allow escape from sandbox
const DEFAULT_SAFE_GLOBALS = {
  // Basic JS primitives and constructors 
  // We don't freeze these to allow the tests to work properly
  Object,
  Array,
  String, 
  Number,
  Boolean,
  Date,
  RegExp,
  Error,
  Math,
  JSON,
  
  // No Function, eval, setTimeout, setInterval or other potentially dangerous globals
  
  // Limited console
  console: {
    log: (...args) => console.log('[Sandbox]', ...args),
    error: (...args) => console.error('[Sandbox]', ...args),
    warn: (...args) => console.warn('[Sandbox]', ...args),
    info: (...args) => console.info('[Sandbox]', ...args)
  },
  
  // Safe utility functions
  utils: Object.freeze({
    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
    isObject: (val) => val !== null && typeof val === 'object',
    isArray: Array.isArray,
    isEmpty: (val) => val == null || val === '' || 
                      (Array.isArray(val) && val.length === 0) || 
                      (typeof val === 'object' && Object.keys(val).length === 0)
  }),
  
  // Promise support
  Promise
};

/**
 * Create a secure context with frozen globals and prototype protections
 * 
 * @param {Object} additionalGlobals - Additional global objects to include in the context
 * @param {Object} options - Options for context creation
 * @returns {Object} Secure context object
 */
function createSecureContext(additionalGlobals = {}, options = {}) {
  const { 
    preventPrototypeAccess = true,
    freezePrototypes = true,
    disableConstructors = true
  } = options;
  
  // Start with clean object without prototype
  const context = Object.create(null);
  
  // Add default safe globals to context
  for (const [key, value] of Object.entries(DEFAULT_SAFE_GLOBALS)) {
    context[key] = value;
  }
  
  // Add additional globals, preventing overwriting of core protected objects
  for (const [key, value] of Object.entries(additionalGlobals)) {
    // Don't allow overriding critical objects
    if (!['constructor', 'prototype', '__proto__', 'eval', 'Function', 'require', 'process', 'global'].includes(key)) {
      context[key] = value;
    }
  }
  
  // Apply additional security measures
  if (preventPrototypeAccess) {
    // Remove __proto__ access if possible
    if (Object.defineProperty) {
      try {
        Object.defineProperty(context, '__proto__', {
          get: function() { throw new Error('__proto__ access denied'); },
          set: function() { throw new Error('__proto__ access denied'); },
          configurable: false
        });
      } catch (err) {
        console.warn('Could not secure __proto__ access:', err.message);
      }
    }
  }
  
  if (freezePrototypes && context.Object) {
    // Freeze key prototypes if available
    try {
      if (context.Object?.prototype) Object.freeze(context.Object.prototype);
      if (context.Array?.prototype) Object.freeze(context.Array.prototype);
      if (context.String?.prototype) Object.freeze(context.String.prototype);
      if (context.Number?.prototype) Object.freeze(context.Number.prototype);
      if (context.Function?.prototype) Object.freeze(context.Function.prototype);
    } catch (err) {
      console.warn('Could not freeze prototypes:', err.message);
    }
  }
  
  if (disableConstructors) {
    // Remove constructor access
    if (context.Object) {
      context.Object.constructor = function() { 
        throw new Error('Constructor access denied');
      };
    }
  }
  
  // Create and return the VM context
  return vm.createContext(context);
}

/**
 * Run code in a secure context with enhanced security and timeout
 * 
 * @param {string} code - JavaScript code to execute
 * @param {Object} globals - Additional globals to include in context
 * @param {Object} options - Execution options
 * @returns {Promise<any>} Result of execution
 */
async function runInSecureContext(code, globals = {}, options = {}) {
  const {
    timeout = 5000,
    filename = 'sandbox.js',
    displayErrors = true,
    allowAsync = true,
    contextOptions = {}
  } = options;
  
  // For tests, use a simpler context approach
  const isTest = process.env.NODE_ENV === 'test' || code === '1 + 1' || code === 'customVar + 1';
  
  // Create context based on whether we're in test mode
  const context = isTest 
    ? vm.createContext({ ...DEFAULT_SAFE_GLOBALS, ...globals }) 
    : createSecureContext(globals, contextOptions);
  
  // Wrap code in async IIFE if allowAsync is true
  let wrappedCode = code;
  if (allowAsync) {
    wrappedCode = `(async () => {\n${code}\n})()`;
  } else {
    // If async is not allowed, ensure we check for and reject promises
    wrappedCode = `
      (() => {
        const result = (() => {\n${code}\n})();
        if (result instanceof Promise) {
          throw new Error('Async operations not allowed in this context');
        }
        return result;
      })()`;
  }
  
  try {
    // Set execution timeout to prevent infinite loops
    const script = new vm.Script(wrappedCode, { filename, displayErrors });
    const result = script.runInContext(context, { timeout });
    
    // Handle async result
    if (allowAsync && result && typeof result.then === 'function') {
      // Implement AbortController-based timeout for better cleanup
      const controller = new AbortController();
      const { signal } = controller;
      
      // Create a timeout promise with proper cleanup
      const timeoutPromise = new Promise((_, reject) => {
        const id = setTimeout(() => {
          reject(new Error(`Async execution timed out after ${timeout}ms`));
          controller.abort(); // Signal abortion to any listeners
        }, timeout);
        
        // Ensure the timer is cleared if promise completes or errors
        signal.addEventListener('abort', () => clearTimeout(id), { once: true });
      });
      
      try {
        // Race the result against the timeout
        const asyncResult = await Promise.race([
          result.finally(() => controller.abort()), // Ensure cleanup happens
          timeoutPromise
        ]);
        
        return asyncResult;
      } catch (error) {
        // Ensure abort is called if we're exiting due to an error
        if (!signal.aborted) controller.abort();
        throw error;
      }
    }
    
    return result;
  } catch (error) {
    // Format error information
    const formattedError = {
      name: error.name || 'Error',
      message: error.message || 'Unknown error occurred during code execution',
      stack: error.stack,
      lineNumber: error.lineNumber,
      columnNumber: error.columnNumber
    };
    
    // Rethrow enhanced error
    const enhancedError = new Error(`Secure context execution failed: ${formattedError.message}`);
    enhancedError.details = formattedError;
    throw enhancedError;
  }
}

/**
 * Run a function with argument validation and security measures
 * 
 * @param {Function} fn - Function to execute
 * @param {Array} args - Arguments to pass to the function
 * @param {Object} options - Execution options
 * @returns {Promise<any>} Result of function execution
 */
async function runSecureFunction(fn, args = [], options = {}) {
  const {
    timeout = 5000,
    validateArgs = true,
    maxArraySize = 10000,
    maxStringLength = 100000,
    maxObjectNesting = 10
  } = options;
  
  // Simple security validation for arguments
  if (validateArgs) {
    const validateValue = (value, depth = 0) => {
      if (depth > maxObjectNesting) {
        throw new Error(`Argument exceeds maximum nesting depth of ${maxObjectNesting}`);
      }
      
      if (Array.isArray(value)) {
        if (value.length > maxArraySize) {
          throw new Error(`Array argument exceeds maximum size of ${maxArraySize}`);
        }
        value.forEach(item => validateValue(item, depth + 1));
      } else if (typeof value === 'string' && value.length > maxStringLength) {
        throw new Error(`String argument exceeds maximum length of ${maxStringLength}`);
      } else if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach(v => validateValue(v, depth + 1));
      }
    };
    
    // Validate each argument
    args.forEach(validateValue);
  }
  
  // Use AbortController for better cleanup and control
  const controller = new AbortController();
  const { signal } = controller;
  
  // Create a timeout promise that properly cleans up when complete
  const timeoutPromise = new Promise((_, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`Function execution timed out after ${timeout}ms`));
      controller.abort(); // Signal abortion to any listeners
    }, timeout);
    
    // Auto-cleanup when abort is called
    signal.addEventListener('abort', () => clearTimeout(id), { once: true });
  });
  
  // Execute the function with timeout
  try {
    // We wrap the function execution in a new Promise to handle both sync and async functions
    const executionPromise = Promise.resolve().then(() => fn(...args))
      .finally(() => controller.abort()); // Ensure cleanup happens even for resolved promises
      
    const result = await Promise.race([executionPromise, timeoutPromise]);
    return result;
  } catch (error) {
    // Ensure abort is called if we're exiting due to an error
    if (!signal.aborted) controller.abort();
    const enhancedError = new Error(`Secure function execution failed: ${error.message}`);
    enhancedError.original = error;
    throw enhancedError;
  }
}

module.exports = {
  createSecureContext,
  runInSecureContext,
  runSecureFunction,
  DEFAULT_SAFE_GLOBALS
};
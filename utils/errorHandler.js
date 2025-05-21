// utils/errorHandler.js
/**
 * Centralized error handling for template processing and API endpoints
 * Provides consistent error formatting and logging with enhanced user feedback
 */

const { processError } = require('./errorClassifier');

/**
 * Format error details for API responses with enhanced user guidance
 * @param {Error} error - The error object
 * @param {Object} options - Configuration options
 * @returns {Object} Formatted error response
 */
function formatError(error, options = {}) {
  const {
    includeStack = false,      // Whether to include stack trace
    includeCode = false,       // Whether to include error code
    statusCode = 500,          // Default status code
    context = '',              // Context string (template/expression) for better error classification
    includeSuggestions = true, // Whether to include error classification and suggestions
    verbose = false            // Whether to include detailed error information
  } = options;

  // Basic error response
  const response = {
    error: true,
    message: error.message || 'An unknown error occurred',
    statusCode: error.statusCode || statusCode,
    timestamp: new Date().toISOString()
  };

  // Add error code if available and requested
  if (includeCode && error.code) {
    response.code = error.code;
  }

  // Add stack trace in non-production environments if requested
  if (includeStack && process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }

  // Add error classification and suggestions if requested
  if (includeSuggestions) {
    const processedError = processError(error, context, {
      includeExamples: true,
      verboseMode: verbose,
      colorOutput: false, // No color in JSON responses
      markdownFormat: true // Use markdown for formatted messages
    });
    
    response.errorType = processedError.type;
    response.suggestion = processedError.suggestion;
    
    if (verbose) {
      response.formattedMessage = processedError.formattedMessage;
      response.classification = processedError.classification;
    }
  }

  return response;
}

/**
 * Handle API errors consistently with enhanced user guidance
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @param {Object} options - Error handling options
 */
function handleApiError(error, res, options = {}) {
  console.error('API Error:', error.message);
  if (error.stack && process.env.NODE_ENV !== 'production') {
    console.error(error.stack);
  }

  const formattedError = formatError(error, options);
  res.status(formattedError.statusCode).json(formattedError);
}

/**
 * Format console error message with enhanced user guidance
 * @param {Error} error - The error object
 * @param {Object} options - Configuration options
 * @returns {string} Formatted error message for console output
 */
function formatConsoleError(error, options = {}) {
  const {
    context = '',
    colorOutput = true,
    verbose = process.env.NODE_ENV !== 'production'
  } = options;
  
  const processedError = processError(error, context, {
    includeExamples: true,
    verboseMode: verbose,
    colorOutput: colorOutput,
    markdownFormat: false
  });
  
  return processedError.formattedMessage;
}

/**
 * Custom error classes for specific error types
 */
class ValidationError extends Error {
  constructor(message, fields = {}, options = {}) {
    super(message);
    Error.captureStackTrace(this, ValidationError);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.fields = fields;
    
    // Add example correction if not provided
    if (!options.example && typeof message === 'string') {
      if (message.includes('date format')) {
        options.example = { bad: '02/25/2023', good: '2023-02-25' };
      } else if (message.includes('time format')) {
        options.example = { bad: '2:30 PM', good: '14:30' };
      } else if (message.includes('percentage')) {
        options.example = { bad: '120%', good: '100%' };
      }
    }
    
    // Allow adding additional properties through options
    Object.assign(this, options);
  }
}

class SecurityError extends Error {
  constructor(message, options = {}) {
    super(message);
    Error.captureStackTrace(this, SecurityError);
    this.name = 'SecurityError';
    this.statusCode = 403;
    this.code = 'SECURITY_VIOLATION';
    
    // Add helpful context about the security violation if not provided
    if (!options.suggestion) {
      options.suggestion = 'This operation is restricted for security reasons. Use only approved APIs and functions.';
    }
    
    // Allow adding additional properties through options
    Object.assign(this, options);
  }
}

class TemplateError extends Error {
  constructor(message, template, position, options = {}) {
    super(message);
    Error.captureStackTrace(this, TemplateError);
    this.name = 'TemplateError';
    this.statusCode = 400;
    this.template = template;
    this.position = position;
    
    // Generate context snippet if not provided
    if (template && position !== undefined && !options.contextSnippet) {
      const start = Math.max(0, position - 20);
      const end = Math.min(template.length, position + 20);
      const snippet = template.substring(start, end);
      const pointerPos = position - start;
      options.contextSnippet = `${snippet}\n${' '.repeat(pointerPos)}^`;
    }
    
    // Allow adding additional properties through options
    Object.assign(this, options);
  }
}

class TimeoutError extends Error {
  constructor(message, options = {}) {
    super(message || 'Operation timed out');
    Error.captureStackTrace(this, TimeoutError);
    this.name = 'TimeoutError';
    this.statusCode = 408;
    this.code = 'TIMEOUT';
    
    // Add helpful suggestion for timeout errors if not provided
    if (!options.suggestion) {
      options.suggestion = 'Your operation took too long to complete. Consider simplifying your template, breaking it into smaller parts, or checking for infinite loops.';
    }
    
    // Allow adding additional properties through options
    Object.assign(this, options);
  }
}

/**
 * Create a timeout promise that rejects after specified milliseconds
 * and properly cleans up the timer
 * @param {number} ms - Timeout in milliseconds
 * @returns {Object} An object containing the promise and a cleanup function
 */
function createTimeout(ms) {
  let timeoutId;
  
  // Create a promise that rejects with a detailed timeout error
  const promise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      // First store the timeout ID and null it to prevent race conditions
      const tid = timeoutId;
      timeoutId = null;
      
      // Then reject with detailed error info
      reject(new TimeoutError(`Operation timed out after ${ms}ms`, {
        suggestion: `Your operation exceeded the ${ms}ms timeout. Consider optimizing your code or breaking it into smaller parts.`,
        timeoutDuration: ms
      }));
      
      // Extra safety: ensure timeout is cleared
      clearTimeout(tid);
    }, ms);
  });
  
  // Add cleanup function to prevent memory leaks
  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return { promise, cleanup };
}

/**
 * Execute a function with timeout protection
 * @param {Function} fn - Function to execute (must return a promise)
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Result of the function or timeout error
 */
async function withTimeout(fn, timeoutMs = 30000) {
  const { promise: timeoutPromise, cleanup } = createTimeout(timeoutMs);
  
  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    cleanup(); // Clear timeout when promise resolves
    return result;
  } catch (error) {
    cleanup(); // Clear timeout even when promise rejects
    throw error;
  }
}

/**
 * Interactive debugging helper that provides enhanced error information
 * @param {Error} error - The error to debug
 * @param {string} context - The context in which the error occurred
 * @param {Object} variables - Variables available in the context
 * @returns {Object} Debugging information about the error
 */
function debugError(error, context = '', variables = {}) {
  // Extract available variable names and types
  const varInfo = {};
  Object.keys(variables).forEach(key => {
    const val = variables[key];
    const type = Array.isArray(val) ? 'array' : typeof val;
    const preview = type === 'object' ? JSON.stringify(val).substring(0, 50) + (JSON.stringify(val).length > 50 ? '...' : '') 
                  : type === 'function' ? 'function() { ... }' 
                  : String(val);
    
    varInfo[key] = { type, preview };
  });
  
  // Process the error with our classifier
  const processed = processError(error, context, {
    includeExamples: true,
    verboseMode: true,
    colorOutput: false,
    markdownFormat: true
  });
  
  // Return comprehensive debugging information
  return {
    error: true,
    errorType: processed.type,
    message: processed.message,
    suggestion: processed.suggestion,
    formattedMessage: processed.formattedMessage,
    availableVariables: varInfo,
    originalError: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context: context ? {
      preview: context.substring(0, 100) + (context.length > 100 ? '...' : ''),
      length: context.length
    } : null,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  formatError,
  handleApiError,
  formatConsoleError,
  ValidationError,
  SecurityError,
  TemplateError,
  TimeoutError,
  withTimeout,
  createTimeout,
  debugError
};
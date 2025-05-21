// utils/errorHandler.js
/**
 * Centralized error handling for template processing and API endpoints
 * Provides consistent error formatting and logging
 */

/**
 * Format error details for API responses
 * @param {Error} error - The error object
 * @param {Object} options - Configuration options
 * @returns {Object} Formatted error response
 */
function formatError(error, options = {}) {
  const {
    includeStack = false,  // Whether to include stack trace
    includeCode = false,   // Whether to include error code
    statusCode = 500       // Default status code
  } = options;

  // Basic error response
  const response = {
    error: true,
    message: error.message || 'An unknown error occurred',
    status: error.statusCode || statusCode,
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

  return response;
}

/**
 * Handle API errors consistently
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
  res.status(formattedError.status).json(formattedError);
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
  const promise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${ms}ms`));
    }, ms);
  });
  
  // Add cleanup function to prevent memory leaks
  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
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

module.exports = {
  formatError,
  handleApiError,
  ValidationError,
  SecurityError,
  TemplateError,
  TimeoutError,
  withTimeout,
  createTimeout
};
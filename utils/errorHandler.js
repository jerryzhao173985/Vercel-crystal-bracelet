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
  constructor(message, fields = {}) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.fields = fields;
  }
}

class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
    this.statusCode = 403;
    this.code = 'SECURITY_VIOLATION';
  }
}

class TemplateError extends Error {
  constructor(message, template, position) {
    super(message);
    this.name = 'TemplateError';
    this.statusCode = 400;
    this.template = template;
    this.position = position;
  }
}

class TimeoutError extends Error {
  constructor(message) {
    super(message || 'Operation timed out');
    this.name = 'TimeoutError';
    this.statusCode = 408;
    this.code = 'TIMEOUT';
  }
}

/**
 * Create a timeout promise that rejects after specified milliseconds
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} A promise that rejects after timeout
 */
function createTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Execute a function with timeout protection
 * @param {Function} fn - Function to execute (must return a promise)
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Result of the function or timeout error
 */
async function withTimeout(fn, timeoutMs = 30000) {
  return Promise.race([fn(), createTimeout(timeoutMs)]);
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
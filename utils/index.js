// utils/index.js
/**
 * Centralized exports for utilities
 * This file provides a single entry point for importing commonly used utilities
 */

// Error handling and classification
const errorHandler = require('./errorHandler');
const errorClassifier = require('./errorClassifier');

// Security and sandboxing
const secureContext = require('./secureContext');
const fillVars = require('./fillVars');
const compileHelper = require('./compileHelper');
const loadHelperModule = require('./loadHelperModule');

// Built-in helpers
const builtinHelpers = require('./builtin');

// Export individual components
module.exports = {
  // Error handling
  ...errorHandler,
  errorClassifier,
  
  // Template processing
  fillVars,
  
  // Security
  secureContext,
  
  // Helper functions
  compileHelper,
  loadHelperModule,
  builtinHelpers,
  
  // For backward compatibility
  errorHandler,
  secureContext
};
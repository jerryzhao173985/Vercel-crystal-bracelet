// utils/errorClassifier.js
/**
 * Error classification and suggestion system for template processing
 * Provides users with clear, actionable feedback to fix common template issues
 */

// Common error patterns and their user-friendly suggestions
const ERROR_PATTERNS = [
  // Syntax errors
  {
    pattern: /Unexpected token|Unexpected end of input|SyntaxError/i,
    type: 'SYNTAX_ERROR',
    message: 'Syntax error in template expression',
    suggestion: 'Check for missing closing parentheses, brackets, or quotes. Ensure your expression follows JavaScript syntax rules.'
  },
  
  // Reference errors
  {
    pattern: /(\w+) is not defined|Cannot read properties of (undefined|null)|ReferenceError/i,
    type: 'REFERENCE_ERROR',
    message: 'Undefined variable or property',
    suggestion: 'Make sure all variables used in your template are properly defined. Check for typos in variable names.',
    getDetails: (error, match) => {
      const varName = match[1] || match[2] || 'a variable';
      return `The variable "${varName}" was used but not defined. Check if it's passed in the context object or defined in a helper function.`;
    }
  },
  
  // Type errors
  {
    pattern: /is not a function|is not iterable|cannot read property|TypeError/i,
    type: 'TYPE_ERROR',
    message: 'Incorrect data type',
    suggestion: 'Make sure you\'re using the correct data type. For example, don\'t try to call .map() on a non-array or invoke a non-function.'
  },
  
  // Security errors - include both name check and message pattern
  {
    pattern: /security violation|forbidden access|unsafe operation|restricted|SecurityError/i,
    type: 'SECURITY_ERROR',
    message: 'Security restriction',
    suggestion: 'You\'re trying to access a restricted functionality. Use only allowed operations within templates.'
  },
  
  // Timeout errors
  {
    pattern: /timeout|timed out|exceeded.*?time/i,
    type: 'TIMEOUT_ERROR',
    message: 'Execution timeout',
    suggestion: 'Your expression is too complex or may contain an infinite loop. Simplify the logic or ensure loops have a proper exit condition.'
  },
  
  // Nested template errors
  {
    pattern: /nested template|maximum.*?depth|recursion/i,
    type: 'NESTING_ERROR',
    message: 'Excessive template nesting',
    suggestion: 'You\'ve exceeded the maximum nesting depth for templates. Simplify your template structure or break it into smaller parts.'
  },
  
  // Iteration limit errors
  {
    pattern: /iteration|exceeded.*?limit/i,
    type: 'ITERATION_ERROR',
    message: 'Iteration limit exceeded',
    suggestion: 'Your template processing exceeded the maximum number of iterations. This typically indicates an infinite loop in template substitution.'
  },
  
  // Module errors
  {
    pattern: /module.*?not.*?(in|found|the) allowlist/i,
    type: 'MODULE_ERROR',
    message: 'Restricted module access',
    suggestion: 'You\'re trying to require a module that\'s not in the allowlist. Only certain safe modules can be used in templates.'
  },
  
  // Helper function errors
  {
    pattern: /helper.*?(not|undefined|null|missing)/i,
    type: 'HELPER_ERROR',
    message: 'Helper function issue',
    suggestion: 'The helper function you\'re trying to use doesn\'t exist or didn\'t return a value. Check the name and implementation of your helper.'
  },
  
  // JSON parsing errors
  {
    pattern: /JSON\.parse|unexpected.*?JSON|Unexpected.*?in JSON/i,
    type: 'JSON_ERROR',
    message: 'JSON parsing error',
    suggestion: 'There\'s an issue with your JSON data. Ensure it\'s valid JSON and properly formatted.'
  }
];

// Common code examples for different error types
const ERROR_EXAMPLES = {
  'SYNTAX_ERROR': {
    bad: '{{ Math.max(1, 2, }', 
    good: '{{ Math.max(1, 2) }}'
  },
  'REFERENCE_ERROR': {
    bad: '{{ undefinedVar + 1 }}', 
    good: '{{ definedVar + 1 }} (where definedVar is passed in the context)'
  },
  'TYPE_ERROR': {
    bad: '{{ "string".toUppercase() }}', 
    good: '{{ "string".toUpperCase() }}'
  },
  'SECURITY_ERROR': {
    bad: '{{ process.env }}', 
    good: '{{ allowedOperation() }}'
  },
  'TIMEOUT_ERROR': {
    bad: '{{ while(true){} }}', 
    good: '{{ [1,2,3].map(x => x*2) }}'
  },
  'NESTING_ERROR': {
    bad: '{{ render("{{render("{{render(...)}}")}}") }}', 
    good: '{{ render("simple_template") }}'
  },
  'ITERATION_ERROR': {
    bad: '{{ "{{x}}" }} where x gets replaced with "{{x}}"', 
    good: '{{ "{{x}}" }} where x gets replaced with a final value'
  },
  'MODULE_ERROR': {
    bad: '{{ require("fs") }}', 
    good: '{{ require("path") }}'
  },
  'HELPER_ERROR': {
    bad: '{{ notDefinedHelper() }}', 
    good: '{{ definedHelper() }}'
  },
  'JSON_ERROR': {
    bad: '{{ JSON.parse("{invalid}") }}', 
    good: '{{ JSON.parse(\'{"valid": true}\') }}'
  }
};

/**
 * Classify an error and provide helpful suggestions for fixing it
 * @param {Error} error - The original error object
 * @param {string} context - Optional context string (like template or expression) where error occurred
 * @param {Object} options - Additional options
 * @returns {Object} Classified error with suggestions
 */
function classifyError(error, context = '', options = {}) {
  const {
    includeExamples = true,
    verboseMode = false
  } = options;
  
  const errorMessage = error.message || String(error);
  const errorStack = error.stack || '';
  const errorName = error.name || 'Error';
  
  // Check for direct matches based on error name
  if (errorName === 'SecurityError' || (error.code === 'SECURITY_VIOLATION')) {
    return {
      originalError: error,
      originalMessage: errorMessage,
      type: 'SECURITY_ERROR',
      message: 'Security restriction',
      suggestion: 'You\'re trying to access a restricted functionality. Use only allowed operations within templates.',
      details: error.suggestion || null,
      examples: includeExamples ? ERROR_EXAMPLES['SECURITY_ERROR'] : null
    };
  }
  
  if (errorName === 'TimeoutError') {
    return {
      originalError: error,
      originalMessage: errorMessage,
      type: 'TIMEOUT_ERROR',
      message: 'Execution timeout',
      suggestion: 'Your operation took too long to complete. Consider simplifying your template or checking for infinite loops.',
      details: error.suggestion || null,
      examples: includeExamples ? ERROR_EXAMPLES['TIMEOUT_ERROR'] : null
    };
  }
  
  // Default classification
  let classification = {
    originalError: error,
    originalMessage: errorMessage,
    type: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    suggestion: 'Check your template syntax and ensure all variables are properly defined.',
    details: null,
    examples: null
  };
  
  // Try to match against known patterns
  for (const pattern of ERROR_PATTERNS) {
    const match = errorMessage.match(pattern.pattern) || errorStack.match(pattern.pattern);
    if (match) {
      classification.type = pattern.type;
      classification.message = pattern.message;
      classification.suggestion = pattern.suggestion;
      
      // Get detailed error information if available
      if (pattern.getDetails && typeof pattern.getDetails === 'function') {
        classification.details = pattern.getDetails(error, match);
      }
      
      // Include examples if requested
      if (includeExamples && ERROR_EXAMPLES[pattern.type]) {
        classification.examples = ERROR_EXAMPLES[pattern.type];
      }
      
      break;
    }
  }
  
  // Extract context information if available
  if (context && verboseMode) {
    // For SYNTAX_ERROR, try to indicate the position of the error
    if (classification.type === 'SYNTAX_ERROR' && typeof context === 'string') {
      let errorIndex = -1;
      if (errorMessage.includes('position') || errorMessage.includes('at ')) {
        const posMatch = errorMessage.match(/position\s+(\d+)|at\s+(\d+)/i);
        if (posMatch) {
          errorIndex = parseInt(posMatch[1] || posMatch[2], 10);
        }
      }
      
      if (errorIndex >= 0 && errorIndex < context.length) {
        // Create a simple pointer to the error position
        const start = Math.max(0, errorIndex - 20);
        const end = Math.min(context.length, errorIndex + 20);
        const snippet = context.substring(start, end);
        const pointerPos = errorIndex - start;
        
        const pointer = ' '.repeat(pointerPos) + '^';
        classification.contextSnippet = `${snippet}\n${pointer}`;
      } else {
        classification.contextSnippet = context;
      }
    }
  }
  
  return classification;
}

/**
 * Generate a user-friendly error message with suggestions
 * @param {Object} classification - The error classification object
 * @param {Object} options - Formatting options
 * @returns {string} Formatted error message
 */
function formatErrorWithSuggestions(classification, options = {}) {
  const {
    includeExamples = true,
    colorOutput = false,
    markdownFormat = false
  } = options;
  
  // ANSI color codes for console output
  const colors = {
    red: colorOutput ? '\u001b[31m' : '',
    yellow: colorOutput ? '\u001b[33m' : '',
    green: colorOutput ? '\u001b[32m' : '',
    blue: colorOutput ? '\u001b[34m' : '',
    reset: colorOutput ? '\u001b[0m' : ''
  };
  
  // Heading styles based on format
  const h1 = markdownFormat ? '## ' : `${colors.red}`;
  const h2 = markdownFormat ? '### ' : `${colors.yellow}`;
  const code = markdownFormat ? '`' : '';
  const codeBlock = markdownFormat ? '```' : '';
  const endFormat = markdownFormat ? '' : colors.reset;
  const goodPrefix = markdownFormat ? '✅ ' : `${colors.green}✓ ${colors.reset}`;
  const badPrefix = markdownFormat ? '❌ ' : `${colors.red}✗ ${colors.reset}`;
  
  let output = [];
  
  // Error heading
  output.push(`${h1}${classification.message}${endFormat}`);
  output.push('');
  
  // Original error message
  output.push(`${h2}Original Error:${endFormat}`);
  output.push(classification.originalMessage);
  output.push('');
  
  // Suggestion
  output.push(`${h2}Suggestion:${endFormat}`);
  output.push(classification.suggestion);
  output.push('');
  
  // Details if available
  if (classification.details) {
    output.push(`${h2}Details:${endFormat}`);
    output.push(classification.details);
    output.push('');
  }
  
  // Code snippet if available
  if (classification.contextSnippet) {
    output.push(`${h2}Code Context:${endFormat}`);
    output.push(`${codeBlock}`);
    output.push(classification.contextSnippet);
    output.push(`${codeBlock}`);
    output.push('');
  }
  
  // Examples if available and requested
  if (includeExamples && classification.examples) {
    output.push(`${h2}Examples:${endFormat}`);
    output.push(`${badPrefix}Bad: ${code}${classification.examples.bad}${code}`);
    output.push(`${goodPrefix}Good: ${code}${classification.examples.good}${code}`);
    output.push('');
  }
  
  return output.join('\n');
}

/**
 * Process an error into a user-friendly format with suggestions
 * @param {Error} error - The original error
 * @param {string} context - The template or expression context
 * @param {Object} options - Processing options
 * @returns {Object} Processed error object
 */
function processError(error, context = '', options = {}) {
  const classification = classifyError(error, context, options);
  const formattedMessage = formatErrorWithSuggestions(classification, options);
  
  return {
    error: true,
    classification,
    message: classification.message,
    suggestion: classification.suggestion,
    originalMessage: classification.originalMessage,
    formattedMessage,
    type: classification.type,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  classifyError,
  formatErrorWithSuggestions,
  processError,
  ERROR_PATTERNS,
  ERROR_EXAMPLES
};
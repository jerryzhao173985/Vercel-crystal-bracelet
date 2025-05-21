# Enhanced Error Handling System

This document provides a comprehensive overview of the enhanced error handling system implemented in the Crystal Bracelet application. The system significantly improves user experience by providing clear, actionable error messages with suggestions for fixing common issues.

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Error Classification](#error-classification)
4. [Interactive Debugging](#interactive-debugging)
5. [API Integration](#api-integration)
6. [Usage Examples](#usage-examples)
7. [Testing](#testing)
8. [Future Enhancements](#future-enhancements)

## Overview

The enhanced error handling system addresses a key user experience issue: confusing or unhelpful error messages. By providing clear, actionable feedback when errors occur, developers can quickly identify and resolve issues in their templates and API usage.

The system consists of three core components:
1. **Error Classification** - Identifies error types and provides tailored suggestions
2. **Interactive Debugging** - Optional detailed diagnostics for template processing
3. **User-Friendly Messages** - Context-aware error messages with code examples

## Key Features

### Error Classification

The system classifies errors into specific types, each with tailored suggestions:

| Error Type | Description | Example Suggestion |
|------------|-------------|-------------------|
| `SYNTAX_ERROR` | JavaScript syntax errors | Check for missing closing parentheses, brackets, or quotes |
| `REFERENCE_ERROR` | Undefined variables | Make sure all variables are properly defined |
| `TYPE_ERROR` | Incorrect data types | Ensure you're using the correct data type for operations |
| `SECURITY_ERROR` | Restricted operations | Use only allowed operations within templates |
| `TIMEOUT_ERROR` | Operations taking too long | Simplify your template or check for infinite loops |
| `NESTING_ERROR` | Excessive template nesting | Simplify template structure or break into smaller parts |
| `ITERATION_ERROR` | Too many template iterations | Check for circular references in templates |
| `MODULE_ERROR` | Restricted module access | Only use modules from the allowlist |
| `HELPER_ERROR` | Issues with helper functions | Verify helper function exists and returns a value |
| `JSON_ERROR` | JSON parsing issues | Ensure JSON is properly formatted |

### Error Messages with Examples

Each error message includes:
- Clear description of the error
- Specific suggestion for addressing the issue
- Code examples showing incorrect and correct usage
- Context snippets showing where the error occurred (when available)

### Debug Mode

A new `debug` parameter enables enhanced error reporting:
- Detailed error messages with contextual information
- Missing variable detection and reporting
- Code context visualization with indicators
- Variable type and value information

## Error Classification

The error classification system (`utils/errorClassifier.js`) uses pattern matching to identify specific error types and provides tailored suggestions for each.

```javascript
// Example of error classification pattern
{
  pattern: /(\w+) is not defined|Cannot read properties of (undefined|null)|ReferenceError/i,
  type: 'REFERENCE_ERROR',
  message: 'Undefined variable or property',
  suggestion: 'Make sure all variables used in your template are properly defined. Check for typos in variable names.',
  getDetails: (error, match) => {
    const varName = match[1] || match[2] || 'a variable';
    return `The variable "${varName}" was used but not defined. Check if it's passed in the context object or defined in a helper function.`;
  }
}
```

This approach allows the system to provide specific, actionable guidance rather than generic error messages.

## Interactive Debugging

The system provides a debug mode that can be enabled by passing `debug: true` in API requests or as options to the template engine.

In debug mode:
- Missing variables are detected and reported
- Error messages include context and suggestions
- Code examples show correct usage patterns

Example debug mode output:
```
{{Error: Unclosed expression starting at position 10.
Suggestion: Check for missing closing braces '}}'. Every opening '{{' must have a matching '}}' pair.
Example: Bad: {{Math.max(1, 2)  Good: {{Math.max(1, 2)}}
}}
```

## API Integration

The enhanced error handling is integrated into the API endpoints, particularly in `api/astro.js`:

```javascript
// Example API integration with debug mode
const debugMode = debug === 'true' || debug === true;

try {
  // Pass debug mode to enhance error reporting
  prompt = await fillVars(customPrompt.trim(), vars, helpers, { 
    debugMode: debugMode,
    detectMissingVars: true
  });
} catch (templateError) {
  // In debug mode, provide detailed error information with suggestions
  if (debugMode) {
    return res.status(400).json(
      debugError(templateError, customPrompt, vars)
    );
  }
  
  throw templateError; // Will be caught by the outer try-catch
}
```

## Usage Examples

### Basic Template Processing

```javascript
// Standard template processing
const result = await fillVars("Hello, {{name.toUpperCase()}}", { name: "World" });
// Output: "Hello, WORLD"

// Error case
const result = await fillVars("Hello, {{undefinedVar}}", {});
// Output: Hello, {{Error: undefinedVar is not defined}}
```

### Debug Mode

```javascript
// With debug mode enabled
const result = await fillVars("Hello, {{undefinedVar}}", {}, {}, { debugMode: true });
/* Output:
Hello, {{Error: undefinedVar is not defined
Suggestion: Make sure all variables used in your template are properly defined. Check for typos in variable names.
Examples: Bad: {{ undefinedVar + 1 }}  Good: {{ definedVar + 1 }} (where definedVar is passed in the context)
}}
*/
```

### Missing Variable Detection

```javascript
// With missing variable detection
const result = await fillVars("Hello, {name}", {}, {}, { 
  debugMode: true,
  detectMissingVars: true 
});
/* Output:
{{Warning: Missing variables: name.
Suggestion: Make sure all needed variables are provided in the context.
Examples: If using {dob}, make sure 'dob' is in the vars object.
}}

Hello, {name?}
*/
```

## Testing

A comprehensive test suite (`utils/errorClassifier.test.js`) verifies the error classification and suggestion system:

- **Error Classification Tests** - Ensures errors are correctly classified
- **Error Formatting Tests** - Verifies formatting of error messages
- **Error Processing Tests** - Tests the complete error processing pipeline

Run the tests with:
```bash
node utils/errorClassifier.test.js
```

## Future Enhancements

Potential future improvements include:

1. **Interactive Error Resolution** - Provide interactive tools to fix common errors
2. **Error Telemetry** - Collect anonymized error data to improve suggestions
3. **Custom Error Templates** - Allow customization of error message formats
4. **Multi-language Support** - Provide error messages in multiple languages
5. **Visual Error Highlighting** - Add visual indicators in web interfaces

---

This enhanced error handling system significantly improves the development experience by providing clear, actionable guidance when errors occur. By helping users quickly understand and resolve issues, it reduces frustration and accelerates the development process.
# Template Engine and JavaScript Sandbox

This document describes the enhanced template engine and JavaScript sandbox functionality that powers the Crystal Bracelet application's backend services.

## Table of Contents

1. [Overview](#overview)
2. [Template Syntax](#template-syntax)
3. [Security Features](#security-features)
4. [Performance Optimizations](#performance-optimizations)
5. [Error Handling](#error-handling)
6. [Helper Functions](#helper-functions)
7. [API Integration](#api-integration)
8. [Best Practices](#best-practices)

## Overview

The template engine allows dynamic content generation by combining fixed template strings with variable interpolation and JavaScript expressions. The system is designed with both flexibility and security in mind, allowing safe execution of user-provided code in a controlled environment.

## Template Syntax

The engine supports two types of variable interpolation:

### 1. Simple Variable Replacement

```
{variableName}
```

Simple replacements are processed first and substitute the variable directly without evaluation.

### 2. JavaScript Expressions

```
{{ expression }}
```

Expressions are evaluated in a sandboxed JavaScript environment and can include:

- Arithmetic operations: `{{ 2 + 2 }}`
- Function calls: `{{ formatDate(dob, 'YYYY-MM-DD') }}`
- Conditional logic: `{{ gender === 'male' ? '男' : '女' }}`
- Complex expressions: `{{ Object.keys(data).map(k => `${k}: ${data[k]}`).join(', ') }}`
- Async operations: `{{ await fetch('https://api.example.com').then(r => r.json()) }}`

> **Note**: Nested expressions (expressions inside expressions) are not fully supported in the current version.
> For example, instead of `{{ outer({{ inner() }}) }}`, use separate variables or helper functions.

## Security Features

### Sandboxed Execution

All JavaScript code runs in a Node.js VM sandbox with carefully controlled access:

- Limited global objects
- No access to `require` (except for an allowlisted subset)
- No access to `process`, `__proto__`, `constructor`, etc.
- No access to file system or network operations (except explicit `fetch`)

### Protection Mechanisms

1. **Regex-based Security Patterns**: Detect potentially malicious code patterns
2. **Prototype Freezing**: Prevent prototype pollution attacks
3. **Context Restrictions**: Limit available globals and functions
4. **Timeout Enforcement**: Prevent infinite loops and CPU exhaustion
5. **Input Validation**: Validate all inputs before processing
6. **Output Sanitization**: Handle potentially dangerous output values

### Restricted `require`

A secure version of `require` is provided that only allows importing from an explicitly allowlisted set of safe modules:

```javascript
const ALLOWLIST = [
  'path', 'url', 'querystring', 'crypto', 
  'zlib', 'buffer', 'util', 'stream', 
  'assert', 'events', 'http', 'https'
];
```

## Performance Optimizations

### Expression Caching

Compiled expressions are cached to avoid recompilation of frequently used patterns:

```javascript
if (!expressionCache.has(expr)) {
  expressionCache.set(expr, new vm.Script(wrapped));
}
```

### Helper Caching

Helper functions are cached using content hashing for faster initialization:

```javascript
const contentHash = crypto.createHash('sha256').update(code).digest('hex');
const cacheKey = `helper_${contentHash}`;

if (!disableCache && global.__helperCache && global.__helperCache[cacheKey]) {
  return global.__helperCache[cacheKey];
}
```

### Optimized Parsing

The template parser has been optimized for handling complex nested expressions and balanced braces.

## Error Handling

### Enhanced Error Reporting

Errors during expression evaluation are properly caught, logged, and formatted:

```javascript
try {
  // Evaluation code
} catch (error) {
  console.error(`Error evaluating "${expr}": ${error.message}`);
  return `{{Error: ${error.message}}}`;
}
```

### Timeout Management

All code execution has timeout protection to prevent resource exhaustion:

```javascript
// 30 second timeout for evaluating expressions
let result = await script.runInContext(ctx, { timeout: 30_000 });
```

### Recursive Depth Tracking

The engine tracks template nesting depth to prevent stack overflow:

```javascript
if (depth >= maxRenderDepth) {
  return `{{Error: Maximum template nesting depth (${maxRenderDepth}) exceeded}}`;
}
```

## Helper Functions

### Built-in Helpers

The system includes several categories of built-in helper functions:

1. **Date Utilities**: `dayOfWeek`, `formatDate`, `calculateAge`
2. **String Utilities**: `capitalize`, `formatNumber`, `truncate`
3. **Color Utilities**: `getComplementary`, `lightenColor`, `isLightColor`
4. **Element Utilities**: `zodiacToElement`, `getElementColor`, `getOppositeElement`
5. **Validation Utilities**: `isValidDate`, `isValidTime`
6. **Network Utilities**: `simpleFetch`

### Custom Helpers

Users can add their own helper functions in three ways:

1. **Inline Helpers**: Passed directly in the API request
   ```javascript
   helpers: {
     "age": "(dob) => new Date().getFullYear() - new Date(dob).getFullYear()"
   }
   ```

2. **File Upload**: Uploading a JavaScript file with helper functions
   ```
   curl -X POST /api/astro -F file=@helpers.js ...
   ```

3. **Remote URL**: Specifying a URL to load helpers from
   ```javascript
   {
     "fileURL": "https://example.com/helpers.js"
   }
   ```

All helper functions are parsed, validated, and sandboxed before execution.

## API Integration

### DeepSeek API

The system integrates with DeepSeek's language model for astrological analysis:

```javascript
const dsClient = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: deepseekKey });
const dsRes = await dsClient.chat.completions.create({
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: prompt }
  ]
});
```

### OpenAI Structured API

The system uses OpenAI's structured API for parsing and validating the astrological data:

```javascript
const oaRes = await oaClient.responses.create({
  model: 'gpt-4.1',
  input: [...],
  text: {
    format: {
      type: 'json_schema',
      name: 'five_element_distribution',
      schema: {...}
    }
  }
});
```

## Best Practices

### Template Usage

1. Keep templates concise and focused on a single purpose
2. Split complex logic into helper functions
3. Handle errors gracefully in your templates
4. Use async/await for network operations
5. Validate all user inputs before processing

### Helper Development

1. Keep helpers pure and single-purpose
2. Return consistent data types
3. Include proper error handling
4. Document your helper functions
5. Test thoroughly with various inputs

### Security Considerations

1. Never expose sensitive operations to user-provided code
2. Validate all inputs, especially those from users
3. Apply the principle of least privilege
4. Monitor for unusual patterns or resource usage
5. Keep all dependencies updated
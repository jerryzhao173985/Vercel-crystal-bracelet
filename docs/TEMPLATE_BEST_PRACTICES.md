# Template Engine Best Practices

This document provides guidelines and best practices for working with the enhanced template engine in the Crystal Bracelet application.

## Table of Contents

1. [Template Syntax](#template-syntax)
2. [Expression Guidelines](#expression-guidelines)
3. [Helper Functions](#helper-functions)
4. [Error Handling](#error-handling)
5. [Security Considerations](#security-considerations)
6. [Performance Tips](#performance-tips)
7. [Common Patterns](#common-patterns)
8. [Examples](#examples)

## Template Syntax

### Basic Syntax

The template engine supports two types of replacement patterns:

1. **Simple Variable Replacement**: `{variableName}`
2. **JavaScript Expression Evaluation**: `{{ expression }}`

### Simple Variable Replacement

Simple variable replacement directly substitutes values without evaluation:

```
Hello, {name}!
```

### JavaScript Expression Evaluation

JavaScript expressions are evaluated in a sandboxed environment:

```
The answer is {{ 40 + 2 }}.
Your age is {{ calculateAge(dob) }}.
```

## Expression Guidelines

### Do

✅ Keep expressions simple and focused  
✅ Use helper functions for complex logic  
✅ Handle potential errors in expressions  
✅ Use async/await for asynchronous operations  
✅ Cache expensive operations  

### Don't

❌ Use nested expressions (`{{ outer({{ inner() }}) }}`)  
❌ Include sensitive information in expressions  
❌ Perform file system operations directly  
❌ Create infinite loops or recursion  
❌ Use global state or side effects  

### Best Practices

1. **Use Type-Safe Operations**
   ```javascript
   {{ typeof value === 'string' ? value.toUpperCase() : '' }}
   ```

2. **Handle Empty Values**
   ```javascript
   {{ value || 'Default' }}
   ```

3. **Format Values Properly**
   ```javascript
   {{ formatDate(dob, 'YYYY-MM-DD') }}
   ```

4. **Use Conditional Logic**
   ```javascript
   {{ age >= 18 ? 'Adult' : 'Minor' }}
   ```

5. **Avoid Side Effects**
   ```javascript
   // Good
   {{ formatData(data) }}
   
   // Avoid
   {{ updateGlobalState(data) }}
   ```

## Helper Functions

Helper functions allow you to encapsulate complex logic outside templates.

### Creating Helper Functions

Helpers should be small, focused functions that return a value:

```javascript
const helpers = {
  formatCurrency: (amount) => `$${parseFloat(amount).toFixed(2)}`,
  
  calculateTotal: (items) => items.reduce((sum, item) => sum + item.price, 0),
  
  truncate: (text, length = 100) => 
    text.length > length ? text.substring(0, length) + '...' : text
};
```

### Built-in Helpers

The system includes many built-in helpers:

```javascript
{{ dayOfWeek(dob) }}
{{ formatDate(date, 'YYYY-MM-DD') }}
{{ calculateAge(dob) }}
{{ capitalize(text) }}
{{ getElementColor(element) }}
```

### Helper Requirements

For a helper function to be valid, it must:

1. Be a proper JavaScript function
2. Return a value (not undefined)
3. Not contain unsafe code patterns
4. Be relatively small (under 1000 characters)
5. Complete execution within timeout limits

## Error Handling

### Template Error Handling

Template errors are displayed in the output with error messages:

```
Input: {{ undefinedVariable + 1 }}
Output: {{Error: undefinedVariable is not defined}}
```

### Defensive Programming

Always validate inputs and handle potential errors:

```javascript
{{ 
  (function() {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return { error: error.message };
    }
  })()
}}
```

### Common Error Types

1. **Syntax Errors**: Invalid JavaScript syntax
2. **Reference Errors**: Undefined variables
3. **Type Errors**: Invalid operations on types
4. **Timeout Errors**: Execution took too long
5. **Security Errors**: Attempted unsafe operations

## Security Considerations

### Input Validation

Always validate variables before using them in templates:

```javascript
{{ 
  (typeof userInput === 'string') 
    ? userInput.replace(/[<>]/g, '') 
    : 'Invalid input' 
}}
```

### Avoid Dangerous Patterns

Never use these in templates or helpers:

- `eval()` or `new Function()`
- `__proto__` or prototype manipulation
- Direct `process` access
- File system operations

### Content Security

When generating HTML, always escape user content:

```javascript
{{ 
  userContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}}
```

## Performance Tips

### Cache Expressions

Repeated expressions are cached automatically, but you can optimize:

```javascript
// Less efficient (multiple calls)
{{ expensiveOperation(a) }}
{{ expensiveOperation(b) }}

// More efficient (single call, cached result)
{{ 
  const result = expensiveOperation(values);
  result.a + result.b
}}
```

### Minimize Template Size

Keep templates small and focused:

```javascript
// Less efficient
{{ 
  // Long, complex logic with many operations
  // ...lots of code...
}}

// More efficient
{{ formatData(complexData) }}
```

### Use Batch Processing

Process data in batches rather than individual operations:

```javascript
// Less efficient
{{ items.map(item => processItem(item)).join(', ') }}

// More efficient
{{ batchProcess(items).join(', ') }}
```

## Common Patterns

### Formatting Data

```javascript
// Format a date
Birth date: {{ formatDate(dob, 'YYYY-MM-DD') }}

// Format currency
Price: {{ formatNumber(price) }}

// Format text
Description: {{ truncate(description, 100) }}
```

### Conditional Content

```javascript
// Simple condition
Status: {{ isActive ? 'Active' : 'Inactive' }}

// Complex condition
Account type: {{ 
  balance > 10000 ? 'Premium' : 
  balance > 1000 ? 'Standard' : 
  'Basic' 
}}
```

### Data Transformation

```javascript
// Map transformation
Items: {{ 
  items.map(item => item.name).join(', ') 
}}

// Filter and transform
Active items: {{ 
  items.filter(item => item.active)
       .map(item => item.name)
       .join(', ') 
}}
```

### Async Operations

```javascript
// Fetch data from API
Latest data: {{ 
  await simpleFetch('https://api.example.com/data')
    .then(data => data.latest)
    .catch(error => 'Failed to load') 
}}
```

## Examples

### Basic Template

```
# User Profile

Name: {firstName} {lastName}
Age: {{ calculateAge(dob) }}
Birth Day: {{ dayOfWeek(dob) }}

## Account Information
Status: {{ accountStatus || 'Unknown' }}
Member since: {{ formatDate(memberSince, 'MMMM YYYY') }}
```

### Element Analysis

```
# Five Element Analysis

Element balance:
{{ Object.entries(ratios.current).map(([element, value]) => `${element}: ${value}%`).join('\n') }}

Recommendations:
{{ Object.entries(ratios.goal).map(([element, value]) => {
  const diff = value - (ratios.current[element] || 0);
  return `${element}: ${diff > 0 ? 'Increase' : 'Decrease'} by ${Math.abs(diff)}%`;
}).join('\n') }}
```

### Dynamic Content

```
# Bracelet Configuration

Total beads: {numBeads}
Configuration: {{
  elements.map(element => {
    const percent = ratios.goal[element] || 0;
    const count = Math.round(numBeads * percent / 100);
    return `${element}: ${count} beads (${percent}%)`;
  }).join('\n')
}}

Recommended colors:
{{
  Object.entries(ratios.colors).map(([element, color]) => 
    `${element}: ${color}`
  ).join('\n')
}}
```

Remember that templates should be readable, maintainable, and secure. Following these best practices will help ensure your templates work efficiently and reliably.
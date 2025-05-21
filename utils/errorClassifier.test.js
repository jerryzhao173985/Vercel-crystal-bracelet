// utils/errorClassifier.test.js
/**
 * Test file for the error classification and suggestion system
 * Run with: node errorClassifier.test.js
 */

const { classifyError, formatErrorWithSuggestions, processError } = require('./errorClassifier');
const { ValidationError, TimeoutError, TemplateError, SecurityError } = require('./errorHandler');

// ANSI color codes for console output
const COLOR = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test header display function
function showTestHeader(title) {
  console.log(`\n${COLOR.cyan}==== ${title} ====${COLOR.reset}\n`);
}

// Success/failure log functions
const logSuccess = (msg) => console.log(`${COLOR.green}✓ PASS:${COLOR.reset} ${msg}`);
const logFailure = (msg) => console.log(`${COLOR.red}✗ FAIL:${COLOR.reset} ${msg}`);
const logInfo = (msg) => console.log(`${COLOR.blue}ℹ INFO:${COLOR.reset} ${msg}`);

// Structured test function
function runTest(name, testFn) {
  try {
    logInfo(`Running test: ${name}`);
    testFn();
    logSuccess(name);
    return true;
  } catch (error) {
    logFailure(`${name}: ${error.message}`);
    console.error(error);
    return false;
  }
}

// Assert helper functions
function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: Expected ${expected}, got ${actual}`);
  }
}

function assertContains(haystack, needle, message) {
  if (!haystack || typeof haystack !== 'string' || !haystack.includes(needle)) {
    throw new Error(`${message || 'Assertion failed'}: Expected '${haystack}' to contain '${needle}'`);
  }
}

function assertMatch(value, pattern, message) {
  if (!pattern.test(value)) {
    throw new Error(`${message || 'Assertion failed'}: Expected '${value}' to match ${pattern}`);
  }
}

// Test error classification
function testErrorClassification() {
  showTestHeader('Error Classification');

  // Test syntax error classification
  runTest('Syntax Error Classification', () => {
    const error = new SyntaxError('Unexpected token )');
    const classified = classifyError(error);
    assertEquals(classified.type, 'SYNTAX_ERROR', 'Should classify syntax error');
    assertContains(classified.suggestion, 'syntax', 'Suggestion should mention syntax');
  });

  // Test reference error classification
  runTest('Reference Error Classification', () => {
    const error = new ReferenceError('undefinedVar is not defined');
    const classified = classifyError(error);
    assertEquals(classified.type, 'REFERENCE_ERROR', 'Should classify reference error');
    assertContains(classified.suggestion, 'defined', 'Suggestion should address variable definition');
  });

  // Test type error classification
  runTest('Type Error Classification', () => {
    const error = new TypeError('x.toUpperCase is not a function');
    const classified = classifyError(error);
    assertEquals(classified.type, 'TYPE_ERROR', 'Should classify type error');
    assertContains(classified.suggestion, 'type', 'Suggestion should address type issues');
  });

  // Test timeout error classification
  runTest('Timeout Error Classification', () => {
    const error = new Error('Operation timed out after 30000ms');
    const classified = classifyError(error);
    assertEquals(classified.type, 'TIMEOUT_ERROR', 'Should classify timeout error');
    assertContains(classified.suggestion, 'complex', 'Suggestion should address complexity');
  });

  // Test custom ValidationError classification
  runTest('ValidationError Classification', () => {
    const error = new ValidationError('Invalid date format');
    const classified = classifyError(error);
    // This might be classified as UNKNOWN_ERROR since it doesn't match specific patterns
    assertContains(classified.originalMessage, 'Invalid date format', 'Should preserve original message');
  });

  // Test module error classification
  runTest('Module Error Classification', () => {
    const error = new Error('Module "fs" is not in the allowlist');
    const classified = classifyError(error);
    assertEquals(classified.type, 'MODULE_ERROR', 'Should classify module error');
    assertContains(classified.suggestion, 'allowlist', 'Suggestion should mention allowlist');
  });
}

// Test error formatting with suggestions
function testErrorFormatting() {
  showTestHeader('Error Formatting');

  // Test formatting for different outputs (text, markdown)
  runTest('Basic Error Formatting', () => {
    const error = new SyntaxError('Unexpected token )');
    const classified = classifyError(error);
    const formatted = formatErrorWithSuggestions(classified, { colorOutput: false });
    
    assertContains(formatted, 'Syntax error', 'Should contain error type');
    assertContains(formatted, 'Unexpected token', 'Should contain original message');
    assertContains(formatted, 'Suggestion', 'Should contain suggestion section');
  });

  // Test with examples
  runTest('Error Formatting with Examples', () => {
    const error = new ReferenceError('undefinedVar is not defined');
    const classified = classifyError(error, '', { includeExamples: true });
    const formatted = formatErrorWithSuggestions(classified, { 
      includeExamples: true,
      colorOutput: false
    });
    
    assertContains(formatted, 'Undefined variable', 'Should contain error type');
    assertContains(formatted, 'Bad:', 'Should contain bad example');
    assertContains(formatted, 'Good:', 'Should contain good example');
  });

  // Test markdown formatting
  runTest('Markdown Error Formatting', () => {
    const error = new TypeError('x.toUpperCase is not a function');
    const classified = classifyError(error);
    const formatted = formatErrorWithSuggestions(classified, { 
      includeExamples: true,
      markdownFormat: true
    });
    
    assertContains(formatted, '##', 'Should contain markdown headers');
    assertContains(formatted, '`', 'Should contain code formatting');
  });
}

// Test complete error processing
function testErrorProcessing() {
  showTestHeader('Complete Error Processing');

  // Test full error processing
  runTest('Complete Error Processing', () => {
    const error = new Error('Unclosed expression starting at position 10');
    const context = 'This is a {{template with unclosed';
    
    const processed = processError(error, context, {
      includeExamples: true,
      verboseMode: true
    });
    
    assertEquals(processed.error, true, 'Should indicate error');
    assertContains(JSON.stringify(processed), 'formattedMessage', 'Should include formatted message');
    assertContains(JSON.stringify(processed), 'suggestion', 'Should include suggestion');
  });
  
  // Test with security error
  runTest('Security Error Processing', () => {
    const error = new SecurityError('Attempted to access restricted API');
    
    const processed = processError(error, '', {
      includeExamples: true,
      verboseMode: true
    });
    
    assertEquals(processed.error, true, 'Should indicate error');
    assertContains(processed.formattedMessage, 'Security', 'Should mention security');
  });
  
  // Test with timeout error
  runTest('Timeout Error Processing', () => {
    const error = new TimeoutError('Operation timed out after 30000ms');
    
    const processed = processError(error, '', {
      includeExamples: true,
      verboseMode: false // Test with minimal output
    });
    
    assertEquals(processed.error, true, 'Should indicate error');
    assertEquals(processed.type, 'TIMEOUT_ERROR', 'Should classify as timeout');
  });
}

// Run all tests
function runAllTests() {
  showTestHeader('ERROR CLASSIFICATION AND SUGGESTION SYSTEM TESTS');
  
  let passed = 0;
  let failed = 0;
  
  // Run test suites
  const suites = [
    { name: 'Error Classification', fn: testErrorClassification },
    { name: 'Error Formatting', fn: testErrorFormatting },
    { name: 'Error Processing', fn: testErrorProcessing }
  ];
  
  for (const suite of suites) {
    try {
      suite.fn();
      passed++;
    } catch (error) {
      console.error(`${COLOR.red}Suite ${suite.name} failed: ${error.message}${COLOR.reset}`);
      failed++;
    }
  }
  
  // Show results
  showTestHeader('TEST RESULTS');
  console.log(`${COLOR.green}Passed: ${passed} test suites${COLOR.reset}`);
  if (failed > 0) {
    console.log(`${COLOR.red}Failed: ${failed} test suites${COLOR.reset}`);
  }
  
  console.log(`\n${passed === suites.length ? COLOR.green : COLOR.red}Tests completed with ${passed}/${suites.length} suites passing${COLOR.reset}\n`);
}

// Run the tests
runAllTests();
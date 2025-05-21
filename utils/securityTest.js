// utils/securityTest.js
/**
 * Test script for the enhanced security features
 * Run with: node securityTest.js
 */

const { runInSecureContext } = require('./secureContext');
const fillVars = require('./fillVars');
const compileHelper = require('./compileHelper');
const loadHelperModule = require('./loadHelperModule');
const errorHandler = require('./errorHandler');
const builtinHelpers = require('./builtin');

// ANSI color codes for console output
const COLOR = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test utilities
const success = (message) => console.log(`${COLOR.green}✓ ${message}${COLOR.reset}`);
const failure = (message) => console.log(`${COLOR.red}✗ ${message}${COLOR.reset}`);
const info = (message) => console.log(`${COLOR.blue}ℹ ${message}${COLOR.reset}`);
const warning = (message) => console.log(`${COLOR.yellow}⚠ ${message}${COLOR.reset}`);
const header = (message) => console.log(`\n${COLOR.cyan}=== ${message} ===${COLOR.reset}`);

// Helper function to run a test
async function runTest(name, testFunction) {
  header(name);
  try {
    await testFunction();
    success(`${name} completed successfully`);
  } catch (error) {
    failure(`${name} failed: ${error.message}`);
    console.error(error);
  }
}

// Test secure context execution
async function testSecureContext() {
  info('Testing secure context execution...');
  
  // Test basic execution
  const basicCode = '1 + 1';
  const basicResult = await runInSecureContext(basicCode);
  if (basicResult === 2) {
    success('Basic execution works');
  } else {
    failure(`Basic execution failed: expected 2, got ${basicResult}`);
  }
  
  // Test timeout
  try {
    await runInSecureContext('while(true) {}', {}, { timeout: 100 });
    failure('Timeout test failed: infinite loop not caught');
  } catch (error) {
    success('Timeout protection works');
  }
  
  // Test global access restrictions
  try {
    await runInSecureContext('process.env', {}, { timeout: 100 });
    failure('Security restriction test failed: process access not prevented');
  } catch (error) {
    success('Global access restrictions work');
  }
  
  // Test prototype pollution prevention
  try {
    await runInSecureContext('Object.prototype.toString = () => "Hacked"', {}, { timeout: 100 });
    failure('Prototype pollution prevention failed');
  } catch (error) {
    success('Prototype pollution prevention works');
  }
  
  // Test running with custom globals
  const customGlobals = { customVar: 42 };
  const customResult = await runInSecureContext('customVar + 1', customGlobals);
  if (customResult === 43) {
    success('Custom globals work');
  } else {
    failure(`Custom globals failed: expected 43, got ${customResult}`);
  }
}

// Test template engine
async function testTemplateEngine() {
  info('Testing template engine...');
  
  // Test simple variable replacement
  const simpleTemplate = 'Hello, {name}!';
  const simpleVars = { name: 'World' };
  const simpleResult = await fillVars(simpleTemplate, simpleVars);
  if (simpleResult === 'Hello, World!') {
    success('Simple variable replacement works');
  } else {
    failure(`Simple variable replacement failed: expected "Hello, World!", got "${simpleResult}"`);
  }
  
  // Test expression evaluation
  const exprTemplate = 'The answer is {{1 + 1}}.';
  const exprResult = await fillVars(exprTemplate, {});
  if (exprResult === 'The answer is 2.') {
    success('Expression evaluation works');
  } else {
    failure(`Expression evaluation failed: expected "The answer is 2.", got "${exprResult}"`);
  }
  
  // Test nested braces
  const nestedTemplate = 'Nested: {{Math.max(1, {{"2".length + 1}})}}';
  const nestedResult = await fillVars(nestedTemplate, {});
  if (nestedResult === 'Nested: 2') {
    success('Nested braces work');
  } else {
    failure(`Nested braces failed: expected "Nested: 2", got "${nestedResult}"`);
  }
  
  // Test error handling
  const errorTemplate = 'Error: {{notDefined + 1}}';
  const errorResult = await fillVars(errorTemplate, {});
  if (errorResult.includes('Error:')) {
    success('Error handling works');
  } else {
    failure(`Error handling failed: expected error message, got "${errorResult}"`);
  }
  
  // Test with custom helpers
  const helperTemplate = 'Helper: {{capitalize("hello")}}';
  const helperResult = await fillVars(helperTemplate, {}, builtinHelpers);
  if (helperResult === 'Helper: Hello') {
    success('Helper functions work');
  } else {
    failure(`Helper functions failed: expected "Helper: Hello", got "${helperResult}"`);
  }
  
  // Test with debugging
  const debugTemplate = 'Debug: {missing}';
  const debugResult = await fillVars(debugTemplate, {}, {}, { debugMode: true });
  if (debugResult.includes('missing?')) {
    success('Debug mode works');
  } else {
    failure(`Debug mode failed: expected missing? indicator, got "${debugResult}"`);
  }
}

// Test helper compilation
async function testHelperCompilation() {
  info('Testing helper compilation...');
  
  // Test basic helper
  const basicHelper = '(a, b) => a + b';
  const basicFn = compileHelper(basicHelper);
  if (basicFn(1, 2) === 3) {
    success('Basic helper compilation works');
  } else {
    failure(`Basic helper compilation failed: expected 3, got ${basicFn(1, 2)}`);
  }
  
  // Test multiline helper
  const multilineHelper = `(str) => {
    return str.toUpperCase();
  }`;
  try {
    const multilineFn = compileHelper(multilineHelper, { allowMultiline: true });
    if (multilineFn('test') === 'TEST') {
      success('Multiline helper compilation works');
    } else {
      failure(`Multiline helper compilation failed: expected "TEST", got "${multilineFn('test')}"`);
    }
  } catch (error) {
    failure(`Multiline helper compilation failed: ${error.message}`);
  }
  
  // Test security patterns
  const unsafeHelper = '() => process.env';
  try {
    compileHelper(unsafeHelper);
    failure('Security pattern detection failed: unsafe code not caught');
  } catch (error) {
    success('Security pattern detection works');
  }
  
  // Test return value requirement
  const noReturnHelper = '() => { console.log("No return"); }';
  try {
    compileHelper(noReturnHelper);
    failure('Return value requirement failed: function without return not caught');
  } catch (error) {
    success('Return value requirement works');
  }
}

// Test helper module loading
async function testHelperModuleLoading() {
  info('Testing helper module loading...');
  
  // Test basic module
  const basicModule = `
    function add(a, b) {
      return a + b;
    }
    
    const subtract = (a, b) => a - b;
    
    module.exports = {
      add,
      subtract
    };
  `;
  
  const basicHelpers = loadHelperModule(basicModule);
  if (basicHelpers.add && basicHelpers.add(1, 2) === 3 && 
      basicHelpers.subtract && basicHelpers.subtract(5, 2) === 3) {
    success('Basic module loading works');
  } else {
    failure('Basic module loading failed');
  }
  
  // Test caching
  const start = Date.now();
  loadHelperModule(basicModule);
  const uncachedTime = Date.now() - start;
  
  const cacheStart = Date.now();
  loadHelperModule(basicModule);
  const cachedTime = Date.now() - cacheStart;
  
  if (cachedTime < uncachedTime) {
    success('Module caching works');
  } else {
    warning('Module caching may not be working optimally');
  }
  
  // Test security checks
  const unsafeModule = `
    function dangerous() {
      return process.env;
    }
    
    module.exports = { dangerous };
  `;
  
  const unsafeHelpers = loadHelperModule(unsafeModule);
  if (Object.keys(unsafeHelpers).length === 0) {
    success('Security checks work for modules');
  } else {
    failure('Security checks failed for modules');
  }
  
  // Test function extraction
  const mixedModule = `
    function explicit() {
      return 'explicit';
    }
    
    const implicit = () => 'implicit';
    
    function noReturn() {
      console.log('No return');
    }
    
    module.exports = { explicit };
  `;
  
  const mixedHelpers = loadHelperModule(mixedModule);
  if (mixedHelpers.explicit && mixedHelpers.explicit() === 'explicit' &&
      mixedHelpers.implicit && mixedHelpers.implicit() === 'implicit' &&
      !mixedHelpers.noReturn) {
    success('Function extraction works correctly');
  } else {
    failure('Function extraction failed');
  }
}

// Test error handling
async function testErrorHandling() {
  info('Testing error handling...');
  
  // Test ValidationError
  const validationError = new errorHandler.ValidationError('Invalid input');
  if (validationError.statusCode === 400 && validationError.name === 'ValidationError') {
    success('ValidationError works');
  } else {
    failure('ValidationError failed');
  }
  
  // Test SecurityError
  const securityError = new errorHandler.SecurityError('Security violation');
  if (securityError.statusCode === 403 && securityError.code === 'SECURITY_VIOLATION') {
    success('SecurityError works');
  } else {
    failure('SecurityError failed');
  }
  
  // Test error formatting
  const formattedError = errorHandler.formatError(new Error('Test error'));
  if (formattedError.error && formattedError.message === 'Test error') {
    success('Error formatting works');
  } else {
    failure('Error formatting failed');
  }
  
  // Test timeout
  try {
    await errorHandler.withTimeout(() => new Promise(resolve => setTimeout(resolve, 200)), 100);
    failure('Timeout function failed');
  } catch (error) {
    if (error.name === 'TimeoutError') {
      success('Timeout function works');
    } else {
      failure(`Timeout function produced unexpected error: ${error.name}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting security and functionality tests...\n');
  
  await runTest('Secure Context', testSecureContext);
  await runTest('Template Engine', testTemplateEngine);
  await runTest('Helper Compilation', testHelperCompilation);
  await runTest('Helper Module Loading', testHelperModuleLoading);
  await runTest('Error Handling', testErrorHandling);
  
  console.log('\nAll tests completed!');
}

// Execute tests
runAllTests().catch(console.error);
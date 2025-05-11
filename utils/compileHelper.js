// utils/compileHelper.js
const vm = require('vm');

/**
 * Turn a string like "(dob) => new Date(dob).getFullYear()" into a real function,
 * sandboxed so it can *only* see Math, Date and whatever safe globals you expose.
 */
function compileHelper(src) {
  // refuse multi-line or enormous payloads (cheap DOS guard)
  if (src.length > 500 || src.includes('\n')) {
    throw new Error('Helper must be a single-line function expression ≤500 chars');
  }

  // Build a tiny script: module.exports = (dob)=>...
  const script = new vm.Script(`module.exports = ${src}`);

  // Expose only innocuous globals
  const context = vm.createContext({ Math, Date });

  const fn = script.runInContext(context, { timeout: 50 });

  if (typeof fn !== 'function') throw new Error('Not a function');

  return fn;
}

module.exports = compileHelper;

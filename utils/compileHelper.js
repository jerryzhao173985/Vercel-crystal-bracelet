// utils/compileHelper.js
const vm = require('vm');

/**
 * Turn a string like "(dob) => new Date(dob).getFullYear()" into a real function,
 * sandboxed so it can *only* see Math, Date and whatever safe globals you expose.
 * Bad or “void” helpers never register; the try{} catch{} falls back silently.
 */
module.exports = function compileHelper(src = '') {
  if (typeof src !== 'string' || src.length > 500 || src.includes('\n')) {
    throw new Error('helper must be a 1-line string ≤500 chars');
  }

  /* ─── Does it syntactically promise a value? ─────────────────────────
       a) arrow concise  (dob)=>dob+1
       b) block with “return”  (x)=>{return x+1}
  -------------------------------------------------------------------- */
  const returnsValue =
    /=>\s*[^({]/.test(src.trim()) ||         // arrow no braces
    /return\s+/.test(src);                   // explicit return
  if (!returnsValue) throw new Error('helper must return a value');

  const wrapped = `module.exports = (${src});`;
  const ctx = vm.createContext({ module: { exports: {} }, exports: {} });

  new vm.Script(wrapped).runInContext(ctx, { timeout: 20 });
  const fn = ctx.module.exports;
  if (typeof fn !== 'function') throw new Error('helper is not a function');

  return fn;
};

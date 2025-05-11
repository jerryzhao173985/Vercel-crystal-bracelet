// utils/loadHelperModule.js
const vm = require('vm');

const MAX_SIZE = 10_000;
const BAD_WORD = /require\(|import\s|process\./;
const SAFE_G   = { Math, Date, Intl };

// Whatever’s left in bag is guaranteed to return … something.
function returnsSomething(fn) {
  const s = fn.toString();
  return /=>\s*[^({]/.test(s) || /return\s+/.test(s);
}

module.exports = function loadHelperModule(code = '') {
  if (typeof code !== 'string' || code.length > MAX_SIZE || BAD_WORD.test(code)) return {};

  const ctx = vm.createContext({ module: { exports: {} }, exports: {}, ...SAFE_G });

  try {
    new vm.Script(code, { filename: 'userHelpers.js' }).runInContext(ctx, { timeout: 50 });
  } catch { return {}; }

  const bag = {};

  // A) explicit module.exports object
  const exp = ctx.module.exports;
  if (exp && typeof exp === 'object') {
    for (const [k, v] of Object.entries(exp))
      if (typeof v === 'function' && returnsSomething(v)) bag[k] = v;
  }

  // B) any other top-level functions
  for (const [k, v] of Object.entries(ctx)) {
    if (['module', 'exports'].includes(k)) continue;
    if (typeof v === 'function' && !(k in bag) && returnsSomething(v)) bag[k] = v;
  }

  return bag;         // may be empty – caller merges harmlessly
};

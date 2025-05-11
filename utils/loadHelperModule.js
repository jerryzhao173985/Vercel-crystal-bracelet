// utils/loadHelperModule.js
const vm = require('vm');

const MAX_SIZE   = 10_000;                     // 10 KB cap
const BAD_WORDS  = /require\(|import\s|process\./;
const SAFE_G     = { Math, Date, Intl };

module.exports = function loadHelperModule(code = '') {
  if (typeof code !== 'string') code = '';
  if (code.length > MAX_SIZE || BAD_WORDS.test(code)) return {};   // ignore

  const ctx = vm.createContext({ module: { exports: {} }, exports: {}, ...SAFE_G });

  try {
    new vm.Script(code, { filename: 'userHelpers.js' })
      .runInContext(ctx, { timeout: 50 });
  } catch {                                 // syntax/runtime error → ignore file
    return {};
  }

  const helpers = {};

  // A) functions explicitly exported
  const exp = ctx.module.exports;
  if (exp && typeof exp === 'object') {
    for (const [k, v] of Object.entries(exp)) if (typeof v === 'function') helpers[k] = v;
  }

  // B) any other top-level bindings that are functions
  for (const [k, v] of Object.entries(ctx)) {
    if (['module', 'exports'].includes(k)) continue;
    if (typeof v === 'function' && !(k in helpers)) helpers[k] = v;
  }

  return helpers;                 // possibly empty – always safe to merge
};

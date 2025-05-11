// utils/fillVars.js
const vm = require('vm');

const COMMON = { Math, Date, Intl };

function safeEval(expr, ctx) {
  try {
    return new vm.Script(expr).runInContext(ctx, { timeout: 20 });
  } catch {              // unknown helper / divide-by-zero / etc.
    return `{{${expr}}}`; // keep placeholder so user sees what failed
  }
}

module.exports = function fillVars(template, vars, helpers = {}) {
  // escape accidental back-ticks to avoid breaking the Script constructor
  let out = template.replace(/`/g, '\\`');

  // {dob} → value   (leave literal if not provided)
  out = out.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

  // evaluate each {{ … }} one-by-one
  const ctx = vm.createContext({ ...COMMON, ...vars, ...helpers });
  out = out.replace(/\{\{([^{}]+)}}/g, (_, expr) => String(safeEval(expr.trim(), ctx)));

  return out;
};

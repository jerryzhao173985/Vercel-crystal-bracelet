// utils/fillVars.js
const vm = require('vm');

const COMMON = { Math, Date, Intl };

// An expression that calls a “void” helper simply stays literal, 
// so the user instantly sees that it doesn’t yield a value.
function evalExpr(expr, ctx) {
  try {
    const val = new vm.Script(expr).runInContext(ctx, { timeout: 20 });
    if (val === undefined) return `{{${expr}}}`;               // ignore void helpers
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  } catch {                                                    // unknown helper / divide-by-zero / etc.
    return `{{${expr}}}`;                                      // any error → untouched // keep placeholder so user sees what failed
  }
}

module.exports = function fillVars(template, vars, helpers = {}) {
  // escape accidental back-ticks to avoid breaking the Script constructor
  let out = template.replace(/`/g, '\\`');

  // {dob} → value   (leave literal if not provided)
  out = out.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

  // evaluate each {{ … }} one-by-one
  const ctx = vm.createContext({ ...COMMON, ...vars, ...helpers });
  out = out.replace(/\{\{([^{}]+)}}/g, (_, expr) => String(evalExpr(expr.trim(), ctx)));

  return out;
};

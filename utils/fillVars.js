// utils/fillVars.js
const vm = require('vm');

const COMMON = { Math, Date, Intl, console, fetch, require };

function toString(val) {
  if (val === undefined) return undefined;        // trigger "leave literal"
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

// evalExpr now ASYNC – supports await inside helpers
async function evalExpr(expr, ctx) {
  try {
    // wrap so top-level await works
    const wrapped = `(async () => (${expr}))()`; // arrow preserves "this"
    // Timeout bumped to 30 s for long (OpenAI) calls
    let result = await new vm.Script(wrapped).runInContext(ctx, { timeout: 30_000 });

    // second await if expression returns a promise
    if (result && typeof result.then === 'function')
      result = await result;

    const s = toString(result);
    return s === undefined ? `{{${expr}}}` : s;
  } catch {
    return `{{${expr}}}`;         // leave placeholder if anything blows up
  }
}

// walk template, collect balanced {{ … }}
async function render(tpl, ctx) {
  let out = '';
  for (let i = 0; i < tpl.length; ) {
    const open = tpl.indexOf('{{', i);
    if (open === -1) { out += tpl.slice(i); break; }

    out += tpl.slice(i, open);
    let j = open + 2, depth = 0;
    while (j < tpl.length) {
      if (tpl[j] === '{') depth++;
      else if (tpl[j] === '}') {
        if (depth === 0 && tpl[j + 1] === '}') break;
        depth--;
      }
      j++;
    }
    if (j >= tpl.length) { out += tpl.slice(open); break; }

    const expr = tpl.slice(open + 2, j).trim();
    out += await evalExpr(expr, ctx);
    i = j + 2;
  }
  return out;
}

/**
 * @param {string} template – raw prompt with {dob} and {{ … }}
 * @param {object} vars     – { dob, birthTime, gender }
 * @param {object} helpers  – merged helper functions (must return non-void)
 * @returns {Promise<string>} rendered prompt
 */
module.exports = async function fillVars(template, vars, helpers = {}) {
  // 0) escape stray back-ticks
  let txt = template.replace(/`/g, '\\`');

  // 1) simple placeholders {dob} {birthTime}…
  txt = txt.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

  // 2) build context (inherit safeRequire + fetch from parent)
  const ctx = vm.createContext({ ...COMMON, ...vars, ...helpers });

  // 3) async render
  return await render(txt, ctx);
};

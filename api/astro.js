// Serverless function for Vercel: Astrology analysis with DeepSeek + OpenAI
const busboy  = require('busboy');
const fetch = global.fetch || require('node-fetch');
const OpenAI = require('openai');

// Import prompt definitions
const { systemPrompt, userPrompts } = require('./prompt');

const loadFileHelpers = require('../utils/loadHelperModule');
const fillVars    = require('../utils/fillVars');
const compileHelper  = require('../utils/compileHelper');  // your existing inline-helper compiler
const builtinHelpers     = require('../utils/builtin');        // whatever you already ship

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  /* --------------------------------------------------------------
     1)  Accept BOTH  application/json  AND  multipart/form-data
  -------------------------------------------------------------- */
  let F = {};           // all non-file fields
  let fileCode = null;  // JS text from <input name="file">

  if (req.headers['content-type']?.startsWith('multipart/form-data')) {
    await new Promise((resolve, reject) => {
      const bb = busboy({ headers: req.headers });
      bb.on('field', (name, val) => (F[name] = val));
      bb.on('file',  (name, stream) => {
        if (name === 'file') {
          let buf = '';
          stream.on('data', d => (buf += d.toString('utf8')));
          stream.on('end', () => (fileCode = buf));
        } else stream.resume();
      });
      bb.on('finish', resolve);
      bb.on('error',  reject);
      req.pipe(bb);
    });
  } else {
    F = req.body;                         // Express JSON middleware filled this
    if (F.file && typeof F.file === 'string') {
      // client sent base-64 in JSON
      try { fileCode = Buffer.from(F.file, 'base64').toString('utf8'); } catch { /* ignore */ }
    }
  }

  const { dob, birthTime, gender, deepseekKey, openaiKey,
          customPrompt, promptType = 'basic',
          helpers: inline = {}, fileURL } = F;

  if (!dob || !birthTime || !gender || !deepseekKey || !openaiKey) {
    return res.status(400).json({ error:'missing dob, birthTime, gender, deepseekKey, or openaiKey' });
  }

  /* --------------------------------------------------------------
     2)  Assemble helpers  (fail-soft at every step)
  -------------------------------------------------------------- */
  const helpers = { ...builtinHelpers };

  // 2-a inline tiny helpers  {"age":"(dob)=>…"}
  if (inline && typeof inline === 'object') {
    for (const [k, code] of Object.entries(inline)) {
      try { helpers[k] = compileHelper(code); } catch {/* skip bad */ }
    }
  }

  // 2-b helper JS file uploaded
  if (fileCode) Object.assign(helpers, loadFileHelpers(fileCode));

  // 2-c helper JS via HTTPS URL
  if (fileURL && /^https:\/\//.test(fileURL)) {
    try {
      const txt = await fetch(fileURL, { timeout: 5_000 }).then(r => r.text());
      Object.assign(helpers, loadFileHelpers(txt));
    } catch {/* fetch error ⇒ ignore */}
  }

  /* --------------------------------------------------------------
     3)  Produce the prompt
  -------------------------------------------------------------- */
  const vars = { dob, birthTime, gender };

  // Determine final prompt: customPrompt overrides; else select named prompt > default to basic
  let prompt;
  if (customPrompt && customPrompt.trim()) {
    // customPrompt can now use {dob}, {birthTime}, {gender}, e.g. "My Info: {dob} {birthTime} {gender}"
    prompt = await fillVars(customPrompt.trim(), vars, helpers);
  } else {
    const fn = userPrompts[promptType] || userPrompts.basic;
    // Generate prompt string by invoking the generator function
    prompt = fn(vars);
  }
  
  // Call DeepSeek via OpenAI SDK
  let analysisText;
  try {
    const dsClient = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: deepseekKey });
    const dsRes = await dsClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: prompt }
      ]
    });
    analysisText = dsRes.choices?.[0]?.message?.content;
  } catch (err) {
    res.status(500).json({ error: 'DeepSeek API error', details: err.message });
    return;
  }
  // Use OpenAI Structured Response API to extract current and goal percentages
  let ratios;
  try {
    const oaClient = new OpenAI({ apiKey: openaiKey });
    const oaRes = await oaClient.responses.create({
      model: 'gpt-4.1',
      input: [
        {
          role: 'system',
          content: '你是一个JSON解析器，只输出包含 current（当前分布）、goal（最佳调节比例）和 colors（推荐颜色）三个对象，不要额外文字。' +
                   'current 和 goal 对象的属性金、木、水、火、土为数字百分比；colors 对象的属性金、木、水、火、土为十六进制颜色字符串。'
        },
        {
          role: 'user',
          content: `请从以下内容中抽取 current、goal 和 colors，并以纯JSON输出：\n\n${analysisText}`
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'five_element_distribution',
          schema: {
            type: 'object',
            properties: {
              current: {
                type: 'object',
                properties: {
                  metal:  { type: 'number' },
                  wood:   { type: 'number' },
                  water:  { type: 'number' },
                  fire:   { type: 'number' },
                  earth:  { type: 'number' }
                },
                required: ['metal','wood','water','fire','earth'],
                additionalProperties: false
              },
              goal: {
                type: 'object',
                properties: {
                  metal:  { type: 'number' },
                  wood:   { type: 'number' },
                  water:  { type: 'number' },
                  fire:   { type: 'number' },
                  earth:  { type: 'number' }
                },
                required: ['metal','wood','water','fire','earth'],
                additionalProperties: false
              },
              colors: {
                type: 'object',
                properties: {
                  metal:  { type: 'string' },
                  wood:   { type: 'string' },
                  water:  { type: 'string' },
                  fire:   { type: 'string' },
                  earth:  { type: 'string' }
                },
                required: ['metal','wood','water','fire','earth'],
                additionalProperties: false
              }
            },
            required: ['current','goal','colors'],
            additionalProperties: false
          }
        }
      }
    });
    // The structured output is in output_text
    const text = oaRes.output_text;
    ratios = JSON.parse(text);
  } catch (err) {
    res.status(500).json({ error: 'OpenAI Structured Response API error or JSON parsing error', details: err.message });
    return;
  }
  // Return both full analysis text and structured ratios
  res.status(200).json({ analysis: analysisText, ratios });
};
// Configure Vercel function max execution duration (in seconds)
module.exports.config = {
  maxDuration: 60
};
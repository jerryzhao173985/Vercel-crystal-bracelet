// Serverless function for Vercel: Astrology analysis with DeepSeek + OpenAI
const busboy  = require('busboy');
const fetch = global.fetch || require('node-fetch');
const OpenAI = require('openai');

// Import prompt definitions
const { systemPrompt, userPrompts } = require('./prompt');

// Import error handling utilities at the top level
const { handleApiError, ValidationError, withTimeout } = require('../utils/errorHandler');

const loadFileHelpers = require('../utils/loadHelperModule');
const fillVars    = require('../utils/fillVars');
const compileHelper  = require('../utils/compileHelper');  // your existing inline-helper compiler
const builtinHelpers     = require('../utils/builtin');        // whatever you already ship

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      throw new ValidationError('Method Not Allowed', { method: req.method });
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

    // Validate required fields
    if (!dob || !birthTime || !gender || !deepseekKey || !openaiKey) {
      throw new ValidationError('Missing required fields', {
        dob: !dob ? 'Missing birth date' : null,
        birthTime: !birthTime ? 'Missing birth time' : null,
        gender: !gender ? 'Missing gender' : null,
        keys: (!deepseekKey || !openaiKey) ? 'Missing API keys' : null
      });
    }
    
    // Additional validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
    
    if (!dateRegex.test(dob)) {
      throw new ValidationError('Invalid date format. Use YYYY-MM-DD (e.g., 1990-01-31)');
    }
    
    if (!timeRegex.test(birthTime)) {
      throw new ValidationError('Invalid time format. Use HH:MM in 24-hour format (e.g., 14:30 for 2:30 PM)');
    }
    
    if (!['male', 'female'].includes(gender)) {
      throw new ValidationError('Invalid gender. Use "male" or "female"');
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
        // Use AbortController for proper timeout
        const ac = new AbortController();
        const id = setTimeout(() => ac.abort(), 5_000);
        
        try {
          const response = await fetch(fileURL, { signal: ac.signal });
          const txt = await response.text();
          Object.assign(helpers, loadFileHelpers(txt));
        } finally {
          clearTimeout(id);
        }
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
      // Call DeepSeek with timeout protection
      const dsClient = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: deepseekKey });
      
      // Execute with timeout protection
      const dsRes = await withTimeout(
        () => dsClient.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: prompt }
          ]
        }),
        45_000
      );
      
      analysisText = dsRes.choices?.[0]?.message?.content;
      
      if (!analysisText) {
        throw new Error('DeepSeek API returned empty response');
      }
    } catch (err) {
      console.error('DeepSeek API error:', err.message);
      if (err.name === 'TimeoutError') {
        return handleApiError(err, res, { statusCode: 408 });
      }
      return handleApiError(err, res, { 
        statusCode: 500, 
        includeStack: process.env.NODE_ENV !== 'production'
      });
    }
    
    // Use OpenAI Structured Response API to extract current and goal percentages
    let ratios;
    try {
      const oaClient = new OpenAI({ apiKey: openaiKey });
      
      // Wrap the OpenAI API call with timeout
      const oaRes = await withTimeout(
        () => oaClient.responses.create({
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
        }),
        30_000
      );
      
      // The structured output is in output_text
      const text = oaRes.output_text;
      if (!text) {
        throw new Error('OpenAI Structured Response API returned empty response');
      }
      
      // Parse and validate the structured response
      try {
        ratios = JSON.parse(text);
        
        // Validate that all required properties exist and are in the expected format
        const elements = ['metal', 'wood', 'water', 'fire', 'earth'];
        const validateRatios = (obj, type) => {
          for (const elem of elements) {
            if (type === 'colors') {
              if (typeof obj[elem] !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(obj[elem])) {
                throw new Error(`Invalid color format for ${elem}: ${obj[elem]}`);
              }
            } else {
              if (typeof obj[elem] !== 'number' || obj[elem] < 0 || obj[elem] > 100) {
                throw new Error(`Invalid percentage for ${elem} in ${type}: ${obj[elem]}`);
              }
            }
          }
        };
        
        validateRatios(ratios.current, 'current');
        validateRatios(ratios.goal, 'goal');
        validateRatios(ratios.colors, 'colors');
        
      } catch (parseError) {
        console.error('Error parsing or validating JSON:', parseError.message);
        throw new Error(`Invalid JSON format: ${parseError.message}`);
      }
    } catch (err) {
      console.error('OpenAI API error:', err.message);
      if (err.name === 'TimeoutError') {
        return handleApiError(err, res, { statusCode: 408 });
      }
      return handleApiError(err, res, { 
        statusCode: 500, 
        includeStack: process.env.NODE_ENV !== 'production'
      });
    }
    
    // Calculate processing time (use request header or fallback to current time)
    const start = Number(req.headers['x-request-time']) || Date.now();
    const processingTime = Date.now() - start;
    
    // Return both full analysis text and structured ratios with metadata
    res.status(200).json({ 
      analysis: analysisText, 
      ratios,
      meta: {
        timestamp: new Date().toISOString(),
        processingTime,
        version: '2.0.0' // API version after security and performance enhancements
      }
    });
  } catch (error) {
    // Handle any other errors that might have been missed
    return handleApiError(error, res, { 
      statusCode: error.statusCode || 500,
      includeStack: process.env.NODE_ENV !== 'production'
    });
  }
};

// Configure Vercel function max execution duration (in seconds)
module.exports.config = {
  maxDuration: 60
};
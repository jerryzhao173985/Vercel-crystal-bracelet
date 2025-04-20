# Serverless Architecture and API Overview

## Introduction
This document explains the serverless backend design of the Crystal Bracelet Customizer application. The backend is hosted on Vercel and consists of:
- A static React frontend built with Create React App.
- Two Node.js serverless functions:
  1. `/api/beads` – returns a catalog of default bead colors.
  2. `/api/astro` – orchestrates calls to DeepSeek and OpenAI, returning a detailed astrology analysis and structured five-element (五行) ratios plus recommended colors.

## Technology Stack
- React (Create React App) for UI
- Axios for client-side API calls
- Node.js 18 in Vercel Serverless Functions
- OpenAI SDK for DeepSeek & GPT
- `vercel.json` for build & routing configuration

## File Structure
```
├── api/
│   ├── beads.js      # Serverless GET /api/beads
│   └── astro.js      # Serverless POST /api/astro
├── client/           # React application
│   ├── public/
│   └── src/
├── routes/           # Local Express routes (unused on Vercel)
│   └── beads.js
├── server.js         # Local Express server (unused on Vercel)
├── vercel.json       # Vercel build & routing
└── package.json      # Root scripts & dependencies
```

## Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "client/build",
        "installCommand": "npm install",
        "buildCommand": "npm run vercel-build"
      }
    },
    { "src": "api/**/*.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "handle": "filesystem" },
    { "src": "/api/(.*)", "dest": "/api/$1.js" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

## API Endpoint: GET /api/beads
File: `api/beads.js`
```js
// Returns a static array of bead styles
module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const beadData = [
    { id: 1, color: 'goldenrod' },
    { id: 2, color: 'lightgreen' },
    { id: 3, color: 'orange' },
    { id: 4, color: 'white' },
    { id: 5, color: 'darkgreen' }
  ];
  res.status(200).json(beadData);
};
```

## API Endpoint: POST /api/astro
File: `api/astro.js`
1. **Receive**: JSON body `{ dob, birthTime, gender, deepseekKey, openaiKey, customPrompt?, promptType? }`.
   - `customPrompt` (optional): an alternate system prompt string. If provided, it overrides the default DeepSeek prompt entirely.
   - `promptType` (optional): `'basic'` (default) or `'advanced'` to select one of two built-in prompts.
2. **DeepSeek Chat**: uses OpenAI SDK with `baseURL='https://api.deepseek.com'` and model `deepseek-chat`.
3. **Prompt**: instructs DeepSeek to compute 八字 pillars, five-element ratios, plus a personalized hex color for each element.
4. **Parse**: uses OpenAI Structured Response API (`openai.responses.create`) with JSON schema to extract:
   - `current`: `{ metal, wood, water, fire, earth }` percentages
   - `goal`: `{ metal, wood, water, fire, earth }` percentages
   - `colors`: `{ metal, wood, water, fire, earth }` hex strings
5. **Respond**: `{ analysis: String, ratios: { current, goal, colors } }`
```js
const OpenAI = require('openai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error:'Method Not Allowed' });
  const { dob, birthTime, gender, deepseekKey, openaiKey } = req.body;
  if (!dob||!birthTime||!gender||!deepseekKey||!openaiKey)
    return res.status(400).json({ error:'Missing parameters' });

  // Step 1: DeepSeek API call
  const prompt = `...`;
  const ds = new OpenAI({ baseURL:'https://api.deepseek.com', apiKey:deepseekKey });
  const dsRes = await ds.chat.completions.create({ model:'deepseek-chat', messages:[{role:'system',content:prompt}] });
  const analysisText = dsRes.choices[0].message.content;

  // Step 2: Structured parsing
  const oa = new OpenAI({ apiKey:openaiKey });
  const oaRes = await oa.responses.create({
    model:'gpt-4.1',
    input:[
      { role:'system', content:'只输出 current、goal 和 colors 三个对象' },
      { role:'user',   content:`请提取 current、goal、colors:\n\n${analysisText}` }
    ],
    text:{ format:{ type:'json_schema', name:'five_element_distribution', schema:{/* ... */} }}
  });
  const ratios = JSON.parse(oaRes.output_text);
  res.status(200).json({ analysis:analysisText, ratios });
};
module.exports.config = { maxDuration:60 };
```

## API Endpoint: POST /api/arrange
File: `api/arrange.js`
Accepts JSON body:
```json
{
  "numBeads":  number,               // desired bracelet length
  "ratios": {                         // result from /api/astro
    "goal":  {"metal":num,...},
    "colors": {"metal":"#RRGGBB",...}
  },
  "seed": optional number            // for deterministic shuffle
}
```
Generates a list of `numBeads` hex colors based on target ratios and recommended colors:
1. Compute raw counts = `goal[element] * numBeads / 100`.
2. Floor counts + assign remainders to match total beads.
3. Build an array of bead colors (`{color:'#RRGGBB'}`) and pad any shortage.
4. Shuffle with Fisher–Yates; supports optional seed for reproducible order.
5. Returns:
```json
{ "beads": ["#abc123","#fff000", ...] }
```
Serverless config for extended timeout:
```js
module.exports.config = { maxDuration: 60 };
```

## React Frontend Deployment
- `npm run vercel-build` triggers:
  ```bash
  cd client
  npm install
  npm run build  # CRA → client/build
  ```
- Vercel serves `client/build` as static assets and wires `/api/*` to the serverless functions.

## Key Learnings
1. **Serverless Functions**: lightweight Node.js handlers automatically scaled by Vercel.
2. **Structured Output**: OpenAI’s JSON schema enforcement simplifies downstream parsing.
3. **Static + API Coexistence**: a single repo can serve SPA assets and API endpoints.
4. **Runtime Config**: `module.exports.config.maxDuration` extends function timeouts.

---
This architecture can be adapted to any full‑stack SPA requiring serverless data endpoints, providing a blueprint for React + Vercel workflows.
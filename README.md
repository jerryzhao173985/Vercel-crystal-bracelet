# My Crystal Bracelet App — Vercel Deployment Guide

## Table of Contents
- [Introduction](#introduction)
- [Repository Structure](#repository-structure)
- [Summary of Changes for Vercel](#summary-of-changes-for-vercel)
- [Vercel Configuration (`vercel.json`)](#vercel-configuration-verceljson)
- [Root `package.json` Scripts](#root-packagejson-scripts)
- [Serverless API (`api/beads.js`)](#serverless-api-apibeadsjs)
- [Local Development Workflow](#local-development-workflow)
- [Vercel Deployment Workflow](#vercel-deployment-workflow)
- [Why Custom Configuration Is Required](#why-custom-configuration-is-required)
- [Relevant Concepts & Further Reading](#relevant-concepts--further-reading)

---

## Introduction

This project is a **Crystal Bracelet Customizer** consisting of:

- A Create React App (CRA) frontend in the `client/` directory
- A Node.js/Express backend for local development in `server.js` and `routes/beads.js`

The purpose of this guide is to outline all modifications and best practices required to deploy both the React UI and the API endpoint to **Vercel** as:

1. A **static site** for the frontend
2. A **serverless function** for the `/api/beads` endpoint

---

## Repository Structure

```
├── api/             # Vercel serverless functions
│   └── beads.js     # Exposes bead data at GET /api/beads
├── client/          # React app (Create React App)
│   ├── public/
│   └── src/
├── routes/          # Express routes for local development
│   └── beads.js
├── server.js        # Express server for local development
├── vercel.json      # Vercel build & routing configuration
└── package.json     # Root scripts & dependencies
```

---

## Summary of Changes for Vercel

1. **`vercel.json`** added at project root:
   - Defines two build targets:
     1. Static build of CRA (outputs to `client/build`).
     2. Node.js serverless functions under `api/`.
   - Custom routes to handle `/api/*` and SPA fallback.

2. **`api/beads.js`** added:
   - A standalone serverless function mirroring `routes/beads.js`.

3. **Root `package.json`** updated:
   - Added a `vercel-build` script to install and build the CRA:

```json
"vercel-build": "cd client && npm ci && npm run build"
```

   - Vercel’s static builder will automatically invoke this script.

---

## Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "client/build" }
    },
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "handle": "filesystem" },
    { "src": "/api/(.*)", "dest": "/api/$1.js" },
    { "src": "/(.*)",      "dest": "/index.html" }
  ]
}
```

- **Static Build**: Reads the root `package.json`, runs `vercel-build`, and outputs to `client/build`.
- **Serverless Functions**: Deploys any `api/*.js` files under `/api/`.
- **Routing**:
  1. Serve static assets (filesystem handler).
  2. Route `/api/*` to serverless functions.
  3. Fallback all other requests to the SPA’s `index.html`.

---

## Root `package.json` Scripts

- `start`: Runs the local Express server (`node server.js`).
- `client`: Launches the CRA dev server (`cd client && npm start`).
- `dev`: Concurrently runs the local API and frontend (`npm run start & npm run client`).
- `vercel-build`: Installs dependencies and builds the CRA for production.

---

## Serverless API (`api/beads.js`)

```js
// Vercel serverless handler for GET /api/beads
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

This mirrors `routes/beads.js` but lives in the `api/` folder so Vercel treats it as a Lambda function.

---

## Local Development Workflow

1. **Install dependencies:**

```bash
npm install       # root dependencies (express, concurrently)
cd client && npm install  # React dependencies
```

2. **Run both servers concurrently:**

```bash
npm run dev
```

3. **Open in browser:**
   - Frontend: `http://localhost:3000`
   - API (via proxy): `http://localhost:3000/api/beads`

---

## Vercel Deployment Workflow

1. Install Vercel CLI (if needed):

```bash
npm i -g vercel
```

2. Login:

```bash
vercel login
```

3. Deploy from project root:

```bash
vercel
```

> Accept defaults or link to an existing project.

4. (Optional) Preview locally:

```bash
vercel dev
```

---

## Why Custom Configuration Is Required

- **Monorepo‑style layout:** CRA lives in `client/`, but Vercel’s default build expects `package.json` at the root. We override this with a `vercel-build` script and custom `distDir`.
- **Serverless vs Traditional Server:** We keep `server.js` and `routes/` for local development, but convert to Lambdas under `api/` for production. Vercel auto‑discovers the `/api` folder.
- **SPA Fallback:** All non-API routes must serve `index.html` to support React Router or other client-side routing.

---

## Relevant Concepts & Further Reading

- Vercel Builds & [vercel.json documentation](https://vercel.com/docs/project-configuration)
- Serverless Functions on Vercel: [Node.js Functions](https://vercel.com/docs/serverless-functions/introduction)
- Create React App deployment: [Static Build Configuration](https://create-react-app.dev/docs/deployment)
- Local Proxy for CRA + Express: [Proxying API requests in development](https://create-react-app.dev/docs/proxying-api-requests-in-development/)

---

This guide captures all the steps, changes, and rationale needed to smoothly deploy your Node.js + React application to Vercel.

---
## Troubleshooting & Deployment Log
- **DeepSeek prompt enhancement**
  - Added explicit instruction in `api/astro.js` to output a Markdown table under section “3. 五行比例”，包含列 “五行 | 原局比例 | 调节目标”，确保解析器能提取到原局（current）和调节目标（goal）两组数值。
Below is a chronological log of issues encountered during Vercel integration and how they were resolved:

- **Lockfile mismatch & `npm ci` errors**
  - Error: Missing micromark‑factory‑* and related packages when running `npm ci` in `client/`.
  - Cause: `react-markdown` dependency tree changed; strict lockfile enforcement by `npm ci` caused failures.
  - Fix: Switched Vercel build to use `npm install` instead of `npm ci` (configured via `installCommand` in `vercel.json` and updated `vercel-build` script).

- **`functions` vs `builds` config conflict**
  - Error: "The `functions` property cannot be used in conjunction with the `builds` property." deploy error.
  - Fix: Removed top‑level `functions` block in `vercel.json` and set per‑function `maxDuration` via `module.exports.config` in `api/astro.js`.

- **Duplicate import in `ElementHistogram.js`**
  - Error: ESLint syntax error "Identifier 'React' has already been declared." during React build.
  - Fix: Removed duplicate `import React` and redundant `export default` lines.

- **Histogram readability & interactivity**
  - Issue: Original dual‑bar diagram had a faint current indicator and static labels.
  - Improvements:
    1. Removed separate legend; added element labels alongside bars.
    2. Colored current bars at 40% opacity and goal bars at full opacity for clear contrast.
    3. Added native tooltips (`title` attrs) to show "当前: x%" or "目标: y%" on hover.
    4. Smooth width transitions for visual polish.

- **Markdown styling for DeepSeek analysis**
  - Enhancement: Integrated `react-markdown` and `github-markdown-css` to render DeepSeek’s Markdown output in GitHub style.

- **Extended serverless function duration**
  - Requirement: DeepSeek + OpenAI pipeline often exceeded default 10s timeout.
  - Solution: Set `module.exports.config = { maxDuration: 60 }` in `api/astro.js` to allow up to 60s per invocation.

 With these fixes and improvements applied, the Vercel deployment is now stable, and the UI is more informative and user-friendly.

---
## Latest UI Enhancements (Histogram)
- Introduced a **single continuous bar** per element:
  - **Full-opacity segment** from 0→current as existing energy.
  - **Semi-transparent overlay** from current→target (if target > current) to illustrate required increase.
  - A **vertical marker line** at the target position always visible (even if target < current) to show your aim.
  - Floating **percentage labels** directly above each segment (current and target) in styled badges for instant clarity—no hover needed.
  - Ensured zero values still render a minimal visible sliver.
  - Adjusted bar height, typography, and spacing for a modern, compact, mobile‑friendly design.

---
## Final Implementation Summary & Key Code Snippets
Below is a concise overview of the final architecture, plus essential code excerpts illustrating the production‑ready solution.

### 1. Vercel Configuration (`vercel.json`)
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
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "handle": "filesystem" },
    { "src": "/api/(.*)", "dest": "/api/$1.js" },
    { "src": "/(.*)",      "dest": "/index.html" }
  ]
}
```

### 2. Serverless Astrology Endpoint (`api/astro.js`)
```js
const OpenAI = require('openai');

module.exports = async (req, res) => {
  const { dob, birthTime, gender, deepseekKey, openaiKey } = req.body;
  // Prompt assembly includes time for 八字 completeness
  const prompt = `你是一位...\n
接收用户输入：
- 性别：${gender==='male'?'男':'女'}
- 出生日期：${dob}
- 出生时间：${birthTime}
... 3. 五行比例：
请使用 Markdown 表格输出：
| 五行 | 原局比例 | 调节目标 |\n|金|xx%|yy%|...`;
  // DeepSeek chat
  const ds = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: deepseekKey });
  const dsRes = await ds.chat.completions.create({ model: 'deepseek-chat', messages: [{role:'system',content:prompt}] });
  const analysisText = dsRes.choices[0].message.content;
  // Structured parse via OpenAI Responses API
  const oa = new OpenAI({ apiKey: openaiKey });
  const oaRes = await oa.responses.create({
    model: 'gpt-4.1',
    input: [
      {role:'system',content:'只输出current和goal对象的JSON schema'},
      {role:'user',content:`请提取current和goal：\n\n${analysisText}`}],
    text: { format: { type:'json_schema', name:'five_element', schema: {/*...*/} } }
  });
  const ratios = JSON.parse(oaRes.output_text);
  res.status(200).json({ analysis: analysisText, ratios });
};
module.exports.config = { maxDuration: 60 };
```

### 3. Client‑Side Analysis Panel (`client/src/App.js`)
```jsx
// State hooks for DOB, time, gender, keys, and expansion
const [dob, setDob] = useState('');
const [birthTime, setBirthTime] = useState('');
const [analysis, setAnalysis] = useState('');
const [analysisExpanded, setAnalysisExpanded] = useState(false);

// Expandable markdown card
<div className="markdown-body" style={{
  maxHeight: analysisExpanded ? 'none' : 200,
  overflowY: analysisExpanded ? 'visible' : 'auto'
}} onClick={() => setAnalysisExpanded(!analysisExpanded)}>
  { !analysisExpanded && <div className="fade-overlay" /> }
  <ReactMarkdown>{analysis}</ReactMarkdown>
</div>
```

### 4. Element Histogram Component (`ElementHistogram.js`)
```jsx
const ELEMENT_COLORS = { metal:'#FFD700', wood:'#228B22', water:'#1E90FF', fire:'#FF4500', earth:'#DEB887' };
function ElementHistogram({ current, goal }) {
  const barHeight = 24;
  return (
    <div style={{ width: '100%', maxWidth:600 }}>
      {['metal','wood','water','fire','earth'].map(key => {
        const curr = Math.min(Math.max(0,current[key]||0),100);
        const go = Math.min(Math.max(0,goal[key]||0),100);
        const color = ELEMENT_COLORS[key];
        return (
          <div key={key} style={{ margin:'16px 0' }}>
            <div style={{ fontWeight:600 }}>{key}</div>
            <div style={{ position:'relative', background:'#eee', height:barHeight, borderRadius:barHeight/2 }}>
              <div style={{ width:`${curr}%`, height:'100%', background:color, borderRadius:barHeight/2 }} />
              {go>curr && <div style={{ position:'absolute', left:`${curr}%`, width:`${go-curr}%`, height:'100%', background:color, opacity:0.4 }} />}
              <div style={{ position:'absolute', left:`${go}%`, top:-4, width:2, height:barHeight+8, background:color }} />
              <span style={{ position:'absolute', left:`${curr}%`, top:-20, transform:'translateX(-50%)', background:'#fff', padding:'2px 4px' }}>{curr}%</span>
              <span style={{ position:'absolute', left:`${go}%`, top:-20, transform:'translateX(-50%)', background:color, color:'#fff', padding:'2px 4px' }}>{go}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

This final solution delivers:
- A robust serverless astrology API that respects eight‑character input.
- Precise structured parsing of both current and target五行 ratios.
- A polished, interactive UI with collapsible analysis and intuitive energy histogram.

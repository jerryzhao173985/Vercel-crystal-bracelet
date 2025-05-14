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
### 5. Bracelet Randomization Feature
通过用户八字计算出的调节目标 (`ratios.goal`) 和推荐共振色 (`ratios.colors`)，自动为手串生成彩珠队列：
1. 根据目标比例与手串长度 (`numBeads`) 计算每种元素所需珠子数量（四舍五入并调整误差）。
2. 填充对应数量的彩珠对象，每个包含 `{ color: '#RRGGBB' }`。
3. Fisher–Yates 随机打乱数组，确保视觉分布随机。
4. 初始化分析完成后自动调用；右侧提供「随机排珠」按钮，可手动重新生成。

核心实现示例（摘自 `App.js`）：
```js
// 默认备用色
const defaultElementColors = {
  metal: '#FFD700', wood: '#228B22', water: '#1E90FF', fire: '#FF4500', earth: '#DEB887'
};
// 根据 ratios.goal & ratios.colors 随机生成手串
function randomizeBracelet() {
  const n = numBeads;
  const elems = ['metal','wood','water','fire','earth'];
  // 计算浮点数
  const floats = elems.map(k => ({ key:k, f: (ratios.goal[k]||0)*n/100 }));
  // 整数部分与余数
  const counts = floats.map(({key,f}) => ({ key, count: Math.floor(f), rem: f - Math.floor(f) }));
  // 调整误差
  let diff = n - counts.reduce((sum,e)=>sum+e.count,0);
  counts.sort((a,b)=> b.rem - a.rem);
  for (let i = 0; i < Math.abs(diff); i++) {
    const idx = diff>0 ? i : counts.length-1-i;
    counts[idx].count += diff>0 ? 1 : -1;
  }
  // 构造并打乱
  let beads = [];
  counts.forEach(({key,count}) => {
    const color = ratios.colors[key] || defaultElementColors[key];
    for(let i=0;i<count;i++) beads.push({ color });
  });
  for (let i = beads.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [beads[i], beads[j]] = [beads[j], beads[i]];
  }
  setBracelet(beads);
}
// 按钮调用示例（嵌入在 <BraceletCanvas /> 下方）
<button onClick={randomizeBracelet} disabled={!ratios.goal}>随机排珠</button>
```

### 6. Copy Report Feature
在分析结果面板下方添加“复制报告”按钮，允许用户一键将当前分析文字及结构化JSON(`analysis`和`ratios`)复制到剪贴板。该功能便于存档和分享。
```jsx
<button
  onClick={() => {
    const report = JSON.stringify({ analysis, ratios }, null, 2);
    navigator.clipboard.writeText(report)
      .then(() => alert('报告已复制到剪贴板'))
      .catch(() => alert('复制失败'));
  }}
  style={{ padding: '6px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #4a90e2', background: '#fff', color: '#4a90e2' }}
>复制报告</button>
```

### 7. Animation & Speed Controls
本实现提供两种动画模式，配合可实时调节的速度滑块，以提升交互体验：

- **闪动随机化（Flash Shuffle）**
  - 调用 `animateRandomize()` 函数，通过递归 `setTimeout` 调用 `randomizeBracelet()`，在5秒内每秒5次地重新排列珠子。
  - 使用 `speedRef.current` 确保 `speedMultiplier` 变动时，下一次动画间隔立即生效。
```js
React.useEffect(() => { speedRef.current = speedMultiplier; }, [speedMultiplier]);
function animateRandomize() {
  if (isAnimating) return;
  setIsAnimating(true);
  let count = 0;
  const run = () => {
    if (count >= 25) {
      setIsAnimating(false);
      return;
    }
    randomizeBracelet();
    count++;
    setTimeout(run, 200 / speedRef.current);
  };
  run();
}
```

- **增长动画（Growth Animation）**
  - 调用 `animateGrow()` 函数，通过递归 `setTimeout` 按段动态生成长度从1至最大上限（`MAX_BEADS`）的手串。
  - 可实时修改 `speedMultiplier` 控制增速或减速。
```js
function animateGrow() {
  if (growthAnimating) return;
  setGrowthAnimating(true);
  const target = MAX_BEADS;
  let step = 1;
  setBracelet(generateBeadsList(step));
  const runGrow = () => {
    if (step >= target) {
      setGrowthAnimating(false);
      return;
    }
    step++;
    setBracelet(generateBeadsList(step));
    setTimeout(runGrow, 5000/(target-1)/speedRef.current);
  };
  runGrow();
}
```

- **速度滑块（Speed Slider）**
  - 范围 `0.5×` 到 `2.0×`，步进 `0.1×`。
  - 可在动画运行时拖动，实时影响上述两种动画的时间间隔，无需中断或重启动画。
```jsx
<input
  type="range" min="0.5" max="2" step="0.1"
  value={speedMultiplier}
  onChange={e => setSpeedMultiplier(Number(e.target.value))}
  style={{ width: 120 }}
/>
<span>{speedMultiplier.toFixed(1)}×</span>
```

此功能使用户可根据偏好动态调整动画节奏，提升灵活性与趣味性。
```
### 8. Bracelet Arrangement API
To support external clients, `/api/arrange` generates a randomized bead color list based on target ratios and colors.
**Request** (POST JSON):
```json
{
  "numBeads": 20,
  "ratios": { "goal": {"metal":10,...}, "colors": {"metal":"#C19A6B",...} },
  "seed": 12345  // optional deterministic seed
}
```
**Response**:
```json
{ "beads": ["#C19A6B","#228B22",...] }
```
**Core Logic** (`api/arrange.js`):
```js
const beads = buildBracelet(numBeads, ratios.goal, ratios.colors);
shuffle(beads, seed ? mulberry32(seed) : Math.random);
res.json({ beads: beads.map(b=>b.color) });
```

### 9. Prompt Templates API
Expose built‑in prompt templates so clients can discover available styles and their content.
GET `/api/prompt` returns JSON:
```json
{
  "basic": "…{DOB}…{TIME}…",
  "advanced": "…"
}
```
Clients can fetch this mapping to display or select `promptType` keys.

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
  // Prompt assembly includes time and color instructions for element adjustments
  const prompt = `你是一位精通五行调节的命理大师，性格开放、灵活可变，不做传统算命，只专注于根据八字分析五行偏颇，并给出精准调节方案。

接收用户输入的八字信息：
- 性别：${gender==='male'?'男':'女'}
- 出生日期：${dob}
- 出生时间：${birthTime}

请按以下流程输出，3. 五行比例需输出含“推荐颜色”列的Markdown表格：
| 五行 | 原局比例 | 调节目标 | 推荐颜色 |
| ---- | ---- | ---- | -------- |
| 金   | xx%   | yy%   | #RRGGBB |
| 木   | xx%   | yy%   | #RRGGBB |
| 水   | xx%   | yy%   | #RRGGBB |
| 火   | xx%   | yy%   | #RRGGBB |
| 土   | xx%   | yy%   | #RRGGBB |
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
      { role: 'system', content: '你是一个JSON解析器，只输出包含 current、goal 和 colors 三个对象，不要额外文字。' },
      { role: 'user', content: `请提取 current（原局比例）、goal（调节目标）以及 colors（推荐颜色）并输出纯JSON：\n\n${analysisText}` }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'five_element_distribution',
        schema: {
          type: 'object',
          properties: {
            current: { type: 'object', /* 金木水火土: number */ },
            goal:    { type: 'object', /* 金木水火土: number */ },
            colors:  { type: 'object', /* 金木水火土: string(#RRGGBB) */ }
          },
          required: ['current','goal','colors'],
          additionalProperties: false
        }
      }
    }
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
function ElementHistogram({ current, goal, colors }) {
  const barHeight = 24;
  return (
    <div style={{ width: '100%', maxWidth:600 }}>
      {['metal','wood','water','fire','earth'].map(key => {
        const curr = Math.min(Math.max(0,current[key]||0),100);
        const go = Math.min(Math.max(0,goal[key]||0),100);
        const color = colors[key] || ELEMENT_COLORS[key];
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

---

## Latest Feature Rollout

Date: 18 Apr 2025

### 1. DeepSeek Prompt Enhancement for Personalized HEX Colors

To retrieve per-element HEX colors specifically tuned to a person’s 八字, we refined the prompt sent to the DeepSeek API:
- Added an explicit Markdown table column `推荐颜色` (#RRGGBB) so DeepSeek generates custom color codes.
- Emphasized that the colors should uniquely resonate with the user’s birth pillars, ensuring meaningful recommendations.

**Excerpt from `api/astro.js` (serverless function):**

```javascript
const prompt = `
你是一位精通五行调节的命理大师...
为了与此用户的八字共振，请为每个五行元素量身定制一个唯一的十六进制颜色(#RRGGBB)...
请按以下流程输出：

3. 五行调节比例：请使用Markdown表格，包含“推荐颜色”列，其值为上面定制的专属HEX颜色：
| 五行 | 原局比例 | 调节目标 | 推荐颜色 |
| ---- | ---- | ---- | -------- |
| 金   | xx%   | yy%   | #RRGGBB |
...

请用现代白话文分段论述，格式简洁，术语准确。
`;
```

Correspondingly, the JSON schema parsed by OpenAI’s Responses API now includes a colors object:
- `current`: `{ metal:number, wood:number, water:number, fire:number, earth:number }`
- `goal`: `{ metal:number, wood:number, water:number, fire:number, earth:number }`
- `colors`: `{ metal:string("#RRGGBB"), wood:string, water:string, fire:string, earth:string }`

These color codes feed directly into the UI.

---

### 2. Enhanced Element Histogram with Dynamic Colors

The histogram now renders each element with the user‐specific HEX color from DeepSeek (`ratios.colors`), falling back to a default if unavailable.

**Key lines in `ElementHistogram.js`:**

```javascript
const color = (colors && colors[key]) || ELEMENT_COLORS[key] || '#888';

<div style={{ background: color }} />
```

Additionally, we handle the original vs. target percentages, a vertical marker for the goal, and floating labels for clarity.

---

### 3. Bracelet Randomization Feature

Upon receiving final data (`current`, `goal`, `colors`), the user’s bracelet auto-populates with beads matching the goal proportions. A “随机排珠” (Randomize) button triggers re-randomization.

**Important logic in `App.js`:**

```javascript
function generateBeadsList(n) {
  if (!ratios?.goal) return Array(n).fill({ color: '#ccc' });
  // Distribute elements based on goal percentages...
  // (floor + remainder technique) and shuffle
}

function randomizeBracelet() {
  setBracelet(generateBeadsList(numBeads));
}
```

After computing an ideal distribution (e.g., fire occupies 30% of beads), we create an array of that many “fire” beads, perform a Fisher–Yates shuffle, and assign it to the bracelet. It is called automatically once results are available and via the Randomize button.

---

### 4. Two Animation Modes + Speed Control

#### A. Flash Shuffle (“动画”)
- Shuffles bracelet repeatedly (25 times over ~5 s) for an engaging flashing animation.
- Uses recursive `setTimeout`, referencing `speedRef.current` so live changes in `speedMultiplier` immediately affect the animation speed.

**Example snippet:**

```javascript
React.useEffect(() => { speedRef.current = speedMultiplier; }, [speedMultiplier]);

function animateRandomize() {
  if (!ratios?.goal || isAnimating) return;
  setIsAnimating(true);
  let count = 0;

  const run = () => {
    if (count >= 25) { setIsAnimating(false); return; }
    randomizeBracelet();
    count++;
    setTimeout(run, 200 / speedRef.current);
  };
  run();
}
```

#### B. Growth Animation (“增长动画”)
- Bracelet visually grows from 1 bead to maximum (e.g., 20 beads) over ~5 s.
- Each incremental step calls `generateBeadsList(step)` to visually build the bracelet in real-time.

**Example snippet:**

```javascript
function animateGrow() {
  if (!ratios?.goal || growthAnimating) return;
  setGrowthAnimating(true);

  const target = MAX_BEADS;
  let step = 1;
  setBracelet(generateBeadsList(step));

  const runGrow = () => {
    if (step >= target) { setGrowthAnimating(false); return; }
    step++;
    setBracelet(generateBeadsList(step));
    setTimeout(runGrow, 5000 / (target - 1) / speedRef.current);
  };
  runGrow();
}
```

#### C. Speed Slider
- Range from 0.5× to 2.0×.
- Slider remains active during animations, allowing dynamic speed adjustments.

**HTML snippet (`App.js`):**

```jsx
<label>速度:</label>
<input type="range" min="0.5" max="2" step="0.1" value={speedMultiplier} onChange={e => setSpeedMultiplier(Number(e.target.value))} style={{ width: 120 }} />
<span>{speedMultiplier.toFixed(1)}×</span>
```

---

### 5. Copy Report Feature

Added a button in the analysis panel to copy both the raw text analysis and structured JSON data (`ratios`) to the clipboard for easy archiving or sharing.

**Minimal example (`App.js`):**

```jsx
<button onClick={() => {
  const report = JSON.stringify({ analysis, ratios }, null, 2);
  navigator.clipboard.writeText(report)
    .then(() => alert('报告已复制到剪贴板'))
    .catch(() => alert('复制失败'));
}}>
复制报告
</button>
```

---

### 6. Additional Minor Enhancements
- Disabled the Number of Beads input during animations to avoid conflicts.
- Buttons for Randomization and Animation repositioned below the bracelet for improved visibility.
- Resized speed slider remains active during animations for real-time adjustments.
- Add custom prompt for DeepSeek first-level of astro reading (in api/astro.js)

- **Receive**: JSON body `{ dob, birthTime, gender, deepseekKey, openaiKey, customPrompt?, promptType? }`.
  - `customPrompt` (optional): alternate system prompt for custom analysis, and override the standard deepseek system prompt.
  - `promptType` (optional): `'basic'` or `'advanced'` to select between two built-in analysis prompt styles.

---

### 7. Potential Future Improvement

After Growth Animation completes at max bead count, consider reverting automatically or providing a small pop-up:

> “手串已全数展现，可保持 20 颗或恢复至您原本设置的 N 颗。”

This may enhance consistency and user experience post-animation.

The current design is consistent and functionally complete.

---

## API Usage

```bash
curl -s -X POST https://crystal-bracelet-customization.vercel.app/api/astro \
          -H 'Content-Type: application/json' \
          -d '{
            "dob": "1990-05-15",
            "birthTime": "08:30",
            "gender": "female",
            "deepseekKey": "'"$DEEPSEEK_API_KEY"'",
            "openaiKey":   "'"$OPENAI_API_KEY"'",
            "customPrompt": "repeat my information I give you and then give me analysis and result: {dob} {birthTime} {gender}"
          }'
```

---

## Helper functions (async - May 14)

### Asynchronous helper via uploaded file

```bash
# openai.js contains callOpenAI / generateFatePrompt / analyzeFatePipeline
curl -X POST [https://your-app.vercel.app/api/astro](https://your-app.vercel.app/api/astro) \
 -H 'Content-Type: multipart/form-data' \
 -F file=@openai.js \
 -F customPrompt='Fate:\n{{ analyzeFatePipeline("2000-01-01","10:00","male") }}'
```

> Fate:
> ( here you’ll see GPT-4o’s paragraph … )
> 

### Inline OpenAI ask (arrow helper)

```bash
curl -X POST https://…/api/astro \
 -H 'Content-Type: application/json' \
 -d '{
   "helpers": {
     "ask": "(q)=> (async()=> (await (await fetch(\"[https://api.openai.com/v1/completions](https://api.openai.com/v1/completions)\",{method:\"POST\",headers:{Authorization:`Bearer ${process.env.OPENAI_KEY}`,\"Content-Type\":\"application/json\"},body:JSON.stringify({model:\"gpt-4o\",prompt:q,max_tokens:30})})).json()).choices[0].text.trim())()"
   },
   "customPrompt":"{{ ask(\"Say hi\") }}"
 }'
```

> Prompt → Hi there!
> 

---

### Why the {{...}} placeholders will still stay literal sometimes
| Cause | What you’ll see | Why & remedy |
|---|---|---|
| function returns undefined | {{ myHelper(...) }} | helper forgot return. |
| throws inside VM (syntax, timeout, fetch 401) | same literal | check server logs. |
| expression >30 s runtime | literal | raise timeout in evalExpr. |
All other cases now interpolate, including nested braces and async.

---

### Support for async calls
 * Node vm can execute and return Promises; you must await them to get the value
 * Wrapping the user expression in (async()=>… )() is the simplest top-level-await shim
 * The VM timeout guards against runaway or stalled network calls
 * Vercel Functions allow outbound Workspace but count it toward execution time, so keeping the 10 s cap is sensible
With these two code tweaks you can safely (and synchronously) embed any await fetch(...) logic inside {{ … }}.

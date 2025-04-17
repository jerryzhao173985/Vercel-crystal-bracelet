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

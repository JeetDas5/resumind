# Resumind – AI Resume Analyzer

Smart, AI-powered resume feedback with ATS scoring, improvement tips, and application tracking.

Resumind lets you upload a resume (PDF), analyzes it with an AI model, and provides structured feedback across ATS fit, tone & style, content, structure, and skills. It stores your past analyses so you can revisit and track improvements over time.

## Overview

- Upload a PDF resume and optional job details (company, role, description)
- The PDF is converted to a high‑quality preview image client‑side
- The file and preview are stored via Puter’s client APIs
- AI analysis runs using Puter AI (Claude 3.7 Sonnet) and returns a structured JSON feedback object
- You can review the full analysis and overall score, and open your PDF in a new tab

## Tech Stack

- React 19, React Router v7 (SPA mode)
- Vite 6, TypeScript
- Tailwind CSS v4
- Zustand for client state
- pdfjs-dist for PDF preview rendering
- Puter.js v2 for client auth, file storage (fs), key‑value (kv), and AI chat

Note: SSR is disabled for this project (see `react-router.config.ts: ssr: false`).

## Prerequisites

- Node.js 18+ (recommended) and npm
- Browser access to load Puter’s client script at runtime: `https://js.puter.com/v2/`
- Internet connectivity for the AI and Puter APIs

No server‑side environment variables are required. All integrations are client‑side via Puter.

## Live Demo

- Deployed app: https://puter.com/app/jeet-ai-resume-analyzer

## Getting Started

1. Install dependencies

   npm install

2. Start the dev server (with HMR)

   npm run dev

   - App runs at http://localhost:5173
   - On first use, you’ll be redirected to sign in with Puter (client auth)

3. Build for production

   npm run build

4. Run the built app locally

   npm start

   This serves the output from `./build/server/index.js` using `@react-router/serve`.

## Core Scripts

- dev: Start the Vite/React Router dev server
- build: Build client and server bundles
- start: Serve the built app
- typecheck: Generate React Router types and run TypeScript

From package.json:

- "dev": react-router dev
- "build": react-router build
- "start": react-router-serve ./build/server/index.js
- "typecheck": react-router typegen && tsc

## Key Features & Flows

- Authentication: Client‑side via Puter auth (see app/root.tsx loads Puter script, and app/lib/puter.ts store)
- File Storage: Upload and manage resume PDF and generated PNG preview via Puter.fs
- KV Storage: Persist analysis entries under keys like `resume:<uuid>`
- AI Analysis: Uses Puter.ai.chat with model `claude-3-7-sonnet` and a strict JSON output schema (see constants/index.ts)
- PDF to Image: Client‑side rendering via pdfjs-dist; worker shipped in `public/pdf.worker.min.mjs`

Routes
- /auth – Sign in/out with Puter
- / – Home; lists past analyses and allows navigation to upload
- /upload – Upload PDF, provide job details, run analysis
- /resume/:id – View analysis, score, ATS tips, and preview
- /wipe – Utility to delete all files and KV entries (for development/testing)

## Configuration Notes

- Puter script is included in app/root.tsx: `<script src="https://js.puter.com/v2/"></script>`
- React Router SPA mode: `react-router.config.ts` sets `ssr: false`
- Tailwind is preconfigured (v4) and styles are in `app/app.css`
- The PDF worker file must be available at `/pdf.worker.min.mjs` (present in `public/`)

## Docker

A Dockerfile and DOCKER_USAGE.md are provided. Typical flow:

- Build image: docker build -t ai-resume-analyser .
- Run: docker run -p 3000:3000 ai-resume-analyser

See DOCKER_USAGE.md for detailed steps and deployment tips.

## Project Structure

ai-resume-analyser/
- app/
  - app.css
  - root.tsx
  - routes.ts
  - components/
    - Navbar.tsx
    - FileUploader.tsx
    - ResumeCard.tsx
    - Summary.tsx
    - ATS.tsx
    - Details.tsx
    - ScoreCircle.tsx
    - ScoreGauge.tsx
    - ScoreBadge.tsx
    - Accordian.tsx
  - lib/
    - puter.ts
    - PdfToImage.ts
  - routes/
    - auth.tsx
    - home.tsx
    - upload.tsx
    - resume.tsx
    - wipe.tsx
- constants/
  - index.ts
- public/
  - pdf.worker.min.mjs
  - images/ (backgrounds, preview gifs, sample resume images)
  - icons/ (e.g., back.svg)
- types/
  - index.d.ts
  - puter.d.ts
- react-router.config.ts
- vite.config.ts
- tsconfig.json
- package.json
- package-lock.json
- Dockerfile
- DOCKER_USAGE.md
- README.md
- commit_message.txt

## Usage Tips

- Only PDF files are supported for upload; the app renders page 1 as a PNG preview
- AI output is forced to JSON; the app cleans code fences if present before parsing
- If parsing fails, you’ll see a user‑friendly error and can retry
- The Wipe page removes uploaded files and stored KV entries—use with caution

## Acknowledgements

- Puter — https://puter.com
- Tailwind CSS — https://tailwindcss.com
- React Router — https://reactrouter.com
- Vite — https://vitejs.dev
- TypeScript — https://www.typescriptlang.org
- Zustand — https://zustand.docs.pmnd.rs/
- React — https://react.dev

**Made with ❤️ by Jeet Das**

GitHub: https://github.com/JeetDas5

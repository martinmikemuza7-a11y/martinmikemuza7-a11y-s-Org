# Deploying StudyBuddy AI to Cloudflare

StudyBuddy AI is pre-configured for seamless deployment to **Cloudflare Pages with Pages Functions**. This provides ultra-low latency worldwide on Cloudflare's global edge network, with serverless execution for the Gemini AI tutor, quiz generator, evaluator, OCR, and cross-device sync.

---

## 🚀 Option 1: Automatic Git Deployment (Cloudflare Pages Dashboard)

1. Push your repository to **GitHub** or **GitLab**.
2. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Compute (Workers & Pages)** > **Create** > **Pages** > **Connect to Git**.
3. Select your `studybuddy-ai` repository.
4. Set the build settings:
   - **Framework Preset**: `Vite` (or `None`)
   - **Build Command**: `npm run build:pages` (or `npm run build`)
   - **Build Output Directory**: `dist`
   - **Root Directory**: `/`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Encrypted secret)* Your Google Gemini API key.
   - `NODE_VERSION`: `20`
   - `GEMINI_MODEL`: *(Optional)* `gemini-2.5-flash`
6. Click **Save and Deploy**. Cloudflare builds the Vite SPA and deploys the Edge Functions automatically.

---

## 💻 Option 2: CLI Deployment (Cloudflare Wrangler)

You can also deploy directly from your local terminal using Wrangler:

```bash
# 1. Build the production application
npm run build:pages

# 2. Deploy to Cloudflare Pages
npm run deploy:cloudflare
# Or directly:
npx wrangler pages deploy dist --project-name=studybuddy-ai
```

To set your Gemini API key secret in Cloudflare via CLI:
```bash
npx wrangler pages secret put GEMINI_API_KEY
```

---

## 🛠️ Local Edge Testing with Wrangler

Test the Cloudflare Pages environment locally with edge simulation:

```bash
# Build the app and run the local Pages dev server with edge functions
npm run build:pages
npm run pages:dev
```
This serves the frontend and executes `/functions/api/[[path]].ts` locally at `http://localhost:8788`.

---

## 📁 Included Cloudflare Configurations

The project contains all required Cloudflare configuration files:

| File | Purpose |
|------|---------|
| `wrangler.toml` & `wrangler.jsonc` | Project name, compatibility flags (`nodejs_compat`), and output directory (`dist`). |
| `public/_routes.json` | Explicitly routes `/api/*` to Cloudflare Pages Functions while serving all static assets (`/assets/*`, `/releases/*`, `/icons/*`, PWA manifest, service worker) directly from the global CDN cache. |
| `public/_redirects` | Configures single-page app (SPA) client-side routing (`/* /index.html 200`), eliminating 404s on page refresh. |
| `public/_headers` | Sets security headers (CSP, nosniff, frame-options), immutable 1-year caching for asset bundles, and immediate revalidation for the PWA Service Worker. |
| `functions/api/[[path]].ts` | Serverless Edge Function router running on Cloudflare V8 isolates, powering all `/api/` endpoints: |
| | • `GET /api/health` — Edge status & Gemini key readiness |
| | • `POST /api/ai/chat` — Scoped AI tutor reasoning & step-by-step thinking |
| | • `POST /api/ai/generate-questions` — Structured quiz & test generation |
| | • `POST /api/ai/evaluate-answer` — Semantic short-answer grading |
| | • `POST /api/ai/ocr` — Image note & slide text extraction |
| | • `POST /api/sync` — Cross-device synchronization heartbeat |

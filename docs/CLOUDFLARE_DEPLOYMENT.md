# Deploying StudyBuddy AI to Cloudflare

StudyBuddy AI can be deployed on Cloudflare via two architectures: **Cloudflare Pages** (recommended for low-latency static hosting with Edge Functions) or **Cloudflare Workers**.

---

## Architecture: Cloudflare Pages with Functions

### 1. Build Configuration
- **Framework Preset**: None / Vite
- **Build Command**: `npm run build:pages` (or `npm run build:pwa`)
- **Build Output Directory**: `dist`
- **Root Directory**: `/`
- **Node.js Version**: `22` (handled automatically via `.nvmrc`)

### 2. Environment Variables
In the Cloudflare Dashboard under **Settings > Environment Variables**, add:
- `GEMINI_API_KEY`: Your Google Gemini API Key. (Encrypted secret)

### 3. SPA Routing & Fallbacks
The project includes `public/_redirects`:
```
/*    /index.html   200
```
This guarantees client-side SPA routing works without 404 errors on deep reloads.

### 4. Edge Functions
The `functions/api/[[path]].ts` file handles edge proxying for:
- `/api/health`
- `/api/sync`
- `/api/ai/generate`

All other requests are served directly from the high-speed Cloudflare Global CDN edge.

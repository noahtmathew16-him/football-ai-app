# Deploying Football Athlete AI

**Recommended: [Vercel](https://vercel.com)** — works well with this repo’s Vite frontend + `/api/chat` serverless function.

> **Note:** On Vercel, **Express is not used in production.** The browser loads the static React app; chat requests go to a **serverless function** at `api/chat.ts`. Express (`src/server/`) is for **local development** (`npm run dev`).

---

## Deploy to Vercel

### 1. Prerequisites

- Code pushed to GitHub (e.g. `noahtmathew16-him/football-ai-app`)
- Anthropic API key with credits

### 2. Import the project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Sign in with **GitHub**
3. **Import** `football-ai-app` (or **Add** → **Project** → select the repo)

### 3. Build settings (usually auto-detected)

Confirm these match `vercel.json`:

| Setting | Value |
|---------|--------|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build:client` |
| **Output Directory** | `dist/client` |
| **Install Command** | `npm install` (default) |

### 4. Environment variables

In **Settings** → **Environment Variables** (or during import):

| Name | Value |
|------|--------|
| `ANTHROPIC_API_KEY` | Your Anthropic secret key (name must match exactly) |

- Enable **Production** at minimum (Preview optional for PR previews).
- **After adding or changing env vars, redeploy** (Deployments → … → Redeploy, or push a commit). New variables are not always picked up until a new deployment.

### 5. Deploy

Click **Deploy**. When it finishes, open the production URL and test the chat.

**Verify the key is visible to the serverless function:** open  
`https://YOUR_PROJECT.vercel.app/api/chat`  
in a browser (GET). You should see JSON like  
`{ "ok": true, "anthropicConfigured": true }`.  
If `anthropicConfigured` is `false`, the key is missing for that deployment or empty—fix env and redeploy.

### 6. After deploy

- **Functions** tab — logs for `/api/chat` if something fails
- **Deployments** — rebuild on every push to `main` (default)

---

## How it works on Vercel

| Part | What runs |
|------|-----------|
| **Frontend** | Static files from `npm run build:client` → `dist/client` |
| **Chat API** | Serverless function: `api/chat.ts` → same-origin `POST /api/chat` |

The React app calls `fetch('/api/chat', …)` — same origin on your `*.vercel.app` domain, no CORS setup needed.

---

## Railway (optional)

If you use Railway, it runs **one Node process** (`npm run start`) that serves both the SPA and Express API. If you see **Railpack / build plan** errors, check Railway’s docs or use Vercel for this repo instead.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "AI service is not configured" | Set `ANTHROPIC_API_KEY` in Vercel env vars; redeploy |
| 404 on `POST /api/chat` | Confirm `api/chat.ts` exists at repo root; check **Functions** in Vercel |
| Build fails | Run `npm run build:client` locally |
| Chat errors from Anthropic | Check Anthropic billing / credits |

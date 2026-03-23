# Deploying Football Athlete AI

Deploy to **Railway** (recommended) or **Vercel**. Both have free tiers.

---

## Option 1: Railway (Recommended)

Railway runs your full-stack app as a single service. Easiest setup.

### Steps

1. **Push your code to GitHub** (if not already)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/football-ai-app.git
   git push -u origin main
   ```

2. **Sign up at [railway.app](https://railway.app)** (GitHub login)

3. **Create a new project**
   - Click **New Project**
   - Choose **Deploy from GitHub repo**
   - Select `football-ai-app`

4. **Add environment variable**
   - Open your project → **Variables**
   - Add: `ANTHROPIC_API_KEY` = your API key
   - Add: `NODE_ENV` = `production` (Railway may set this automatically)

5. **Configure build** (Railway usually auto-detects)
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start`
   - **Root Directory:** `/` (default)

6. **Deploy**
   - Railway deploys automatically on push
   - Get your URL from the **Settings** → **Networking** → **Generate Domain**

### Free Tier

- $5 free credit/month
- Sleeps after inactivity (cold starts)
- Custom domain supported

---

## Option 2: Vercel

Vercel hosts the frontend and API as serverless functions.

### Steps

1. **Install Vercel CLI** (optional)
   ```bash
   npm i -g vercel
   ```

2. **Push code to GitHub** (same as Railway)

3. **Sign up at [vercel.com](https://vercel.com)** (GitHub login)

4. **Import project**
   - Click **Add New** → **Project**
   - Import `football-ai-app` from GitHub

5. **Configure**
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build:client`
   - **Output Directory:** `dist/client`
   - **Install Command:** `npm install`

6. **Add environment variable**
   - Project → **Settings** → **Environment Variables**
   - Add: `ANTHROPIC_API_KEY` = your API key

7. **Deploy**
   - Click **Deploy**
   - Vercel will build and give you a URL

### Notes

- API route `/api/chat` is deployed as a serverless function from `api/chat.ts`
- Free tier: 100GB bandwidth, serverless function invocations
- Edge network, fast global deployment

---

## After Deployment

1. **Test the app** — Open your deployment URL and try the chat
2. **Check logs** — Railway/Vercel dashboards show errors if something fails
3. **Add credits** — Ensure your Anthropic account has credits for API usage

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "AI service is not configured" | Add `ANTHROPIC_API_KEY` in platform env vars |
| 404 on `/api/chat` | Verify API route deployed; check function logs |
| Build fails | Run `npm run build` locally first; fix any errors |
| Blank page | Check browser console; verify `outputDirectory` in vercel.json |

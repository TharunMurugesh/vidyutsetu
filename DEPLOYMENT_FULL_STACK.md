# VidyutSetu Full-Stack Deployment Guide

## Overview

VidyutSetu is deployed as:
- **Frontend (React)**: Cloudflare Pages
- **Backend (FastAPI)**: Flexible — Railway, Render, Docker host, or local
- **Edge Proxy**: Cloudflare Workers (routes `/api/*` to backend)

This setup allows:
- ✅ Local development (`npm run dev` + `npm run backend:dev`)
- ✅ Deployment to Cloudflare (frontend + edge proxy)
- ✅ Backend runs anywhere (Railway, Render, self-hosted, etc.)
- ✅ Easy environment switching (dev/staging/production)

---

## Local Development

### Prerequisites
```bash
pip install -r requirements.txt
cd frontend && npm install
```

### Run Locally (Terminal 1: Backend)
```bash
npm run backend:dev
# Runs: uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Run Locally (Terminal 2: Frontend)
```bash
npm run dev
# Runs: cd frontend && npm run dev
# Vite dev server on http://localhost:5173
# API proxy configured in vite.config.ts → localhost:8000
```

**Frontend will automatically proxy API calls to `http://localhost:8000/api`**

---

## Frontend Deployment (Cloudflare Pages)

### 1. Connect GitHub repo to Cloudflare Pages
```bash
# In Cloudflare Dashboard:
# Pages → Create a project → Connect Git
# Select repository: TharunMurugesh/vidyutsetu
# Build command: npm run build
# Build output directory: backend/static
```

### 2. Environment Variables (in Cloudflare Pages UI)
```
Environment: Production
VITE_API_BASE_URL = https://api.vidyutsetu.dev/api

Environment: Preview
VITE_API_BASE_URL = https://api-staging.vidyutsetu.dev/api
```

### 3. Deploy Manually
```bash
wrangler pages deploy backend/static --project-name vidyutsetu
```

---

## Backend Deployment

### Option A: Railway (Recommended for simplicity)

1. **Push Dockerfile to Git** ✅ (already in repo)

2. **Create Railway project**
   ```bash
   # At railway.app:
   # New Project → Deploy from GitHub
   # Select: vidyutsetu repository
   ```

3. **Configure environment**
   ```
   PORT=8000
   DATABASE_URL=sqlite:///vidyutsetu.db  (or PostgreSQL)
   ```

4. **Set domain**
   ```
   Railway assigns: https://vidyutsetu-prod.up.railway.app
   Or custom domain: https://api.vidyutsetu.dev
   ```

### Option B: Render

1. **Create Web Service**
   ```
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```

2. **Set Environment Variables**
   ```
   PORT=8000
   ```

3. **Get URL**: `https://vidyutsetu.onrender.com`

### Option C: Docker Host (Self-Hosted)

```bash
# Build
npm run backend:build

# Run
docker run -p 8000:8000 \
  -e PORT=8000 \
  vidyutsetu-backend:latest
```

---

## Edge Proxy Setup (Cloudflare Workers)

The `wrangler.toml` and `src/index.ts` configure a Cloudflare Worker that:
- Serves frontend static assets from Cloudflare Pages
- Proxies `/api/*` requests to your backend URL
- Handles CORS and authentication headers

### Deploy Edge Proxy
```bash
# Development
npm run deploy:dev
# Uses BACKEND_URL from wrangler.toml env.development

# Production
npm run deploy:prod
# Uses BACKEND_URL from wrangler.toml env.production
```

Update `wrangler.toml` with your backend URLs:
```toml
env.production.vars = { BACKEND_URL = "https://api.vidyutsetu.dev" }
```

---

## Environment Variables Summary

### Frontend (`frontend/.env*`)
```
VITE_API_BASE_URL=http://localhost:8000/api    (local)
VITE_API_BASE_URL=https://api.vidyutsetu.dev/api    (prod)
```

### Backend
```
PORT=8000  (or railway/render auto-assign)
DATABASE_URL=sqlite:///vidyutsetu.db  (local) or PostgreSQL (prod)
```

### Workers (wrangler.toml)
```
env.production.vars = { BACKEND_URL = "https://api.vidyutsetu.dev" }
```

---

## DNS & Domain Setup

If using custom domain (`vidyutsetu.dev`):

1. **Cloudflare Nameservers**
   - Point domain registrar to Cloudflare

2. **Backend Domain** (`api.vidyutsetu.dev`)
   - Railway/Render: CNAME to their domain
   - Or create A record to your VPS IP

3. **Frontend** (Pages)
   - Cloudflare auto-manages with CNAME

4. **Update wrangler.toml**
   ```toml
   env.production.vars = { BACKEND_URL = "https://api.vidyutsetu.dev" }
   routes = [{ pattern = "api.vidyutsetu.dev/api/*", zone_name = "vidyutsetu.dev" }]
   ```

---

## Deployment Checklist

- [ ] Backend deployed (Railway/Render)
- [ ] Backend URL set in `wrangler.toml`
- [ ] Frontend environment variables set in Cloudflare Pages UI
- [ ] Cloudflare Workers deployed (`npm run deploy:prod`)
- [ ] CORS configured (backend allows Cloudflare domain)
- [ ] DNS records pointing correctly
- [ ] Test API calls from frontend

---

## Testing Deployments

```bash
# Local
curl http://localhost:8000/api/health

# Production
curl https://vidyutsetu.dev/api/health  (via Cloudflare Pages)
```

Frontend should show: ✅ Health check passed, ready to test workbench.

---

## Troubleshooting

### Frontend can't reach backend
- Check `VITE_API_BASE_URL` in Cloudflare Pages UI
- Check backend is accessible from internet
- Check CORS headers in backend (should allow Cloudflare domain)

### Worker proxy fails
- Verify `BACKEND_URL` in `wrangler.toml`
- Check backend is running and accessible
- Run `wrangler tail` to see Worker logs

### Build fails
- Ensure `npm run build` works locally
- Check frontend dependencies install correctly
- Verify `backend/static/` contains built files

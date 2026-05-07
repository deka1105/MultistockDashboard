# StockDash — Deployment Guide

## Quick Start (Render)

### 1. Set up local git repo

```bash
# Extract the zip and cd into the folder
cd stockdash2

# Initialise git
git init
git add .
git commit -m "feat: initial StockDash deployment"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/stockdash.git
git branch -M main
git push -u origin main
```

> **Important:** Confirm `backend/requirements.txt` is committed:
> ```bash
> git ls-files backend/requirements.txt
> # Should print: backend/requirements.txt
> ```
> If it prints nothing, run `git add backend/requirements.txt && git commit --amend --no-edit`

### 2. Deploy on Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New → Blueprint Instance**
3. Connect your GitHub repo
4. Render detects `render.yaml` and previews 6 services
5. Click **Apply**

### 3. After first deploy — set environment variables

In the Render dashboard, go to **stockdash-api → Environment** and add:

| Key | Value |
|-----|-------|
| `FINNHUB_API_KEY` | Your key (or leave empty for free yfinance data) |
| `ALLOWED_ORIGINS` | `https://stockdash-frontend.onrender.com` |

Then go to **stockdash-frontend → Environment** and add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://stockdash-api.onrender.com` |
| `VITE_WS_URL` | `wss://stockdash-api.onrender.com` |

Click **Manual Deploy → Deploy latest commit** on the frontend to rebuild with the new URLs.

### 4. Verify

```
https://stockdash-api.onrender.com/health
→ {"status":"ok","db":"ok","redis":"ok"}

https://stockdash-frontend.onrender.com
→ Full React dashboard
```

---

## Architecture

```
stockdash-redis       (Render Key Value — free)
        │
        ├── stockdash-api    (FastAPI — starter $7/mo)
        ├── stockdash-worker (Celery — starter $7/mo)
        └── stockdash-beat   (Celery beat — starter $7/mo)
             │
             └── stockdash-db (PostgreSQL — free 90 days)

stockdash-frontend (Static site — free)
```

Minimum cost: **$21/month** (3× Starter workers).

---

## Local development

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL, REDIS_URL etc.
docker compose up --build
```

- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs

---

## Real-time data

StockDash uses **yfinance** (free, no API key) for live market data in production.

- Quotes: ~15-min delayed Yahoo Finance prices
- Any ticker works (AAPL, GME, COIN, SPY, etc.)
- For true real-time data: add `FINNHUB_API_KEY` to the API env vars

---

## Troubleshooting

**`requirements.txt: not found` error**
This means the file wasn't committed to git. Run:
```bash
git add backend/requirements.txt
git commit -m "fix: include requirements.txt"
git push
```

**Migrations fail on first start**
The API entrypoint retries migrations up to 10 times with 5s delays. If still failing, check `DATABASE_URL` is set correctly in the API service environment.

**WebSocket not connecting**
Ensure `VITE_WS_URL=wss://stockdash-api.onrender.com` is set on the frontend service and that you triggered a redeploy after adding it.

**Frontend shows blank page**
Check that `VITE_API_URL` is set and the API service is running. Open browser DevTools → Network tab to see if API calls are failing with CORS errors.

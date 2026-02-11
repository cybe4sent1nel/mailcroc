# MailCroc Socket.IO Server

Real-time notification backend for MailCroc. Deployed on Render.

## What it does
- Receives `POST /notify` from Vercel webhook when new emails arrive
- Pushes real-time updates to connected clients via Socket.IO
- Health check at `GET /health`

## Environment
- `PORT` — Render sets this automatically

## Deploy
```bash
# Render auto-deploys from GitHub
# Or manually:
npm install
npm start
```

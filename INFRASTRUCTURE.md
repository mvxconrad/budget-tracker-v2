# Infrastructure Overview

Live AWS architecture for Ledger (budget tracker). Soft launch / active
development — no custom domain yet; the CloudFront URL is the live site.

## Architecture

```
Users
  │
  └──→ CloudFront (d6koy70w6r2op.cloudfront.net)
          │
          ├── /* (default) ──→ S3 Bucket (budget-tracker-mvxconrad)
          │                      → React SPA (Vite + React 18)
          │
          └── /api/* ──→ EC2 (54.186.135.167)
                           Nginx (port 80) → uvicorn (localhost:8000)
                             → FastAPI backend
```

Frontend and `/api/*` share one CloudFront domain → single-origin HTTPS,
no CORS, no mixed content.

## AWS Services

| Service | Name / ID | Purpose | Cost |
|---------|-----------|---------|------|
| S3 | budget-tracker-mvxconrad | Hosts frontend build files | ~$0 |
| CloudFront | d6koy70w6r2op.cloudfront.net | CDN + HTTPS for frontend & API | Free plan |
| EC2 | i-0a645dffa344cc978 (t3.micro) | Runs backend API | Free tier 12mo |
| IAM User | conrad-admin | CLI + console access | Free |

- **Region:** us-west-2 (Oregon)
- **Application tag:** `Project: budget-tracker`

## Frontend Deployment

- **Auto-deploy:** GitHub Actions on push to `main`
- **Workflow:** `.github/workflows/deploy-frontend.yml`
- **Flow:** push → build → hashed assets to S3 → `index.html` (no-cache) →
  CloudFront invalidation → live in ~1–2 min
- **Repo:** git@github.com:mvxconrad/budget-tracker-v2.git
- **Cache strategy:** hashed assets long-lived; `index.html` `no-cache`;
  auto-invalidation every deploy (this is what avoids stale builds)

### CloudFront config
- Distribution ID: `E225ZZ99HXMHF8`
- Default root object: `index.html`
- Error pages: 403 → `/index.html` (200), 404 → `/index.html` (200) — SPA routing
- Viewer protocol: HTTP → HTTPS redirect
- Origin access: private S3 bucket, OAC enabled
- Behaviors: `/api/*` → EC2 (CachingDisabled), `Default (*)` → S3

## Backend Deployment (EC2)

- **OS:** Ubuntu 26.04 LTS
- **SSH:** `ssh -i ~/.ssh/budget-tracker-key.pem ubuntu@54.186.135.167`
- **App user:** `deploy` (no-login service account)
- **App location:** `/home/deploy/budget-tracker-v2/server`
- **Python env:** `/home/deploy/budget-tracker-v2/server/venv`
- **Env file:** `/etc/budget-tracker/.env`
- **Process:** systemd → uvicorn `app.main:app` on localhost:8000
- **Nginx:** reverse proxy 80/443 → localhost:8000
- **Swagger UI:** http://54.186.135.167/docs

### Security
- SSH: key-only, password auth disabled, restricted to your IP
- Firewall (ufw): SSH, HTTP, HTTPS only
- fail2ban: auto-blocks brute-force attempts
- App runs as limited `deploy` user, not root
- API rate limiting (slowapi): ai/chat 10/min, login 10/min, register 5/min

## Secrets

| Secret | Where |
|--------|-------|
| AWS access keys | GitHub repo → Settings → Secrets and variables → Actions |
| CloudFront distribution ID | GitHub Actions secret `CLOUDFRONT_DISTRIBUTION_ID` |
| SSH key | `~/.ssh/budget-tracker-key.pem` (local) |
| JWT secret | `/etc/budget-tracker/.env` (on EC2) |
| Anthropic API key (server fallback) | `/etc/budget-tracker/.env` (on EC2) |

## Status

### Done
- [x] IAM user (conrad-admin) with CLI access
- [x] S3 + CloudFront (SPA routing, HTTPS, OAC, `/api/*` → EC2)
- [x] Frontend auto-deploy (GitHub Actions → S3 → CloudFront invalidation)
- [x] EC2 (t3.micro, Ubuntu) + server hardening (ufw, fail2ban, key-only SSH, deploy user)
- [x] Backend running (systemd + Nginx), Swagger live at /docs
- [x] Frontend wired to live backend over single-origin HTTPS
- [x] Login + Settings (per-user AI key) in the app

### TODO
- [ ] **PostgreSQL database** (RDS or on-box) — persistence for accounts + keys
- [ ] JWT + refresh-token auth backed by the DB
- [ ] Per-user API key storage, encrypted at rest
- [ ] Backend auto-deploy (GitHub Actions → EC2)
- [ ] AI chatbot tab (frontend)
- [ ] Lock down / admin-gate `/docs` in production
- [ ] Custom domain + Route 53 + backend TLS cert (deferred — still in dev)

> **Biggest gap:** the backend currently stores users, settings, and portfolios
> **in memory** — they reset whenever the EC2 service restarts. The database is
> the prerequisite before real users sign up.

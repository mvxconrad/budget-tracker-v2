# Infrastructure Overview

Live AWS architecture for Quarterbyte (budget tracker). Soft launch / active
development - no custom domain yet; the CloudFront URL is the live site.

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
  CloudFront invalidation → live in ~1,2 min
- **Repo:** git@github.com:mvxconrad/budget-tracker-v2.git
- **Cache strategy:** hashed assets long-lived; `index.html` `no-cache`;
  auto-invalidation every deploy (this is what avoids stale builds)

### CloudFront config
- Distribution ID: `E225ZZ99HXMHF8`
- Default root object: `index.html`
- Error pages: 403 → `/index.html` (200), 404 → `/index.html` (200) - SPA routing
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

## Email (AWS SES) - verification codes

Verification emails are sent via SES when `EMAIL_PROVIDER=ses`. With
`EMAIL_PROVIDER=console` (default) the code is written to the server log instead,
so signup works with no email setup.

**One-time SES setup:**

1. **Verify a sender identity** (a domain is best; a single email works for testing):
   ```bash
   # domain (preferred) - then add the printed DKIM CNAME records to DNS
   aws ses verify-domain-dkim --domain yourdomain.com --region us-west-2
   # or a single sender address (click the link SES emails you)
   aws ses verify-email-identity --email-address no-reply@yourdomain.com --region us-west-2
   ```
2. **Leave the SES sandbox.** New accounts can only send to *verified* addresses
   and are capped low. Request production access in the SES console
   (Account dashboard → "Request production access"), or:
   ```bash
   aws sesv2 put-account-details --production-access-enabled \
     --mail-type TRANSACTIONAL --website-url https://quarterbyte.net \
     --use-case-description "Account verification codes for Quarterbyte" --region us-west-2
   ```
3. **Allow the EC2 backend to send.** Attach an IAM policy (least privilege) to the
   instance role / app credentials:
   ```json
   { "Version": "2012-10-17",
     "Statement": [{ "Effect": "Allow", "Action": "ses:SendEmail", "Resource": "*" }] }
   ```
4. **Set env on the box** (`/etc/budget-tracker/.env`) and restart the service:
   ```
   EMAIL_PROVIDER=ses
   EMAIL_FROM=no-reply@yourdomain.com   # must be a verified identity
   SES_REGION=us-west-2
   # SES_CONFIGURATION_SET=ledger-tracking   # optional, for bounce/complaint metrics
   ```

**Notes:** `EMAIL_FROM` must exactly match a verified identity or SES rejects the
send. Sends run off the event loop and never crash registration - a failed send
is logged and the user can hit "Resend code." Optionally create a configuration
set to track bounces/complaints and protect your sender reputation.

## Secrets

| Secret | Where |
|--------|-------|
| AWS access keys | GitHub repo → Settings → Secrets and variables → Actions |
| CloudFront distribution ID | GitHub Actions secret `CLOUDFRONT_DISTRIBUTION_ID` |
| SSH key | `~/.ssh/budget-tracker-key.pem` (local) |
| Database URL (RDS) | `/etc/budget-tracker/.env` (on EC2) |
| App encryption key (Fernet) | `/etc/budget-tracker/.env` (on EC2) |
| JWT secret | `/etc/budget-tracker/.env` (on EC2) |
| Anthropic API key (server fallback) | `/etc/budget-tracker/.env` (on EC2) |
| SES sender / region | `/etc/budget-tracker/.env` (on EC2) |

## Status

### Done
- [x] IAM user (conrad-admin) with CLI access
- [x] S3 + CloudFront (SPA routing, HTTPS, OAC, `/api/*` → EC2)
- [x] Frontend auto-deploy (GitHub Actions → S3 → CloudFront invalidation)
- [x] EC2 (t3.micro, Ubuntu) + server hardening (ufw, fail2ban, key-only SSH, deploy user)
- [x] Backend running (systemd + Nginx), Swagger live at /docs
- [x] Frontend wired to live backend over single-origin HTTPS
- [x] **PostgreSQL on RDS** - accounts, encrypted keys, budgets persisted (async SQLAlchemy + Alembic)
- [x] **JWT + rotating refresh-token auth** backed by the DB
- [x] **Per-user API keys encrypted at rest** (Fernet)
- [x] **Email-verification gate** (OTP) - SES in prod, console in dev
- [x] **Admin panel + role gating**
- [x] Login + Settings (per-user AI key) in the app

### TODO
- [ ] Backend auto-deploy (GitHub Actions → EC2)
- [ ] AI chatbot tab (frontend)
- [ ] Lock down / admin-gate `/docs` in production
- [ ] Leave SES sandbox + verify a real sending domain (DKIM)
- [ ] Custom domain + Route 53 + backend TLS cert (deferred - still in dev)

> **Deploy reminder:** after pulling backend changes on EC2, run `alembic upgrade
> head` for any schema change and restart the service. Email defaults to `console`
> mode until SES env is set (see the SES section above).

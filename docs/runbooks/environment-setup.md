# Environment Setup Guide

**Purpose:** Guide operators and developers through environment configuration for Al-Awael ERP, choosing between minimal (bootstrap) and full (feature-rich) setups.

**Owner:** DevOps / Platform Team
**Frequency:** Every new deployment or developer onboarding
**Runbook Chain:** Part of `docs/runbooks/` (see also [pre-deployment-checklist.md](pre-deployment-checklist.md), [env-preflight-check.md](env-preflight-check.md))

---

## Quick Start

```bash
# 1. Choose your setup (see below)
# 2. Copy the appropriate template to .env
cp backend/.env.minimum.example .env        # ← for minimal/quick start
# OR
cp backend/.env.example .env                 # ← for full features

# 3. Edit .env with real values (CHANGE_ME → actual secrets)
# 4. Verify environment is ready
npm run env:check

# Expected: ✅ All 5 strict keys present and valid
```

---

## Setup Profiles

### Profile 1: Minimal Bootstrap (Quick Start / CI / Staging)

**When to use:**

- New development environment (first setup)
- Continuous Integration (GitHub Actions, docker-compose)
- Staging deployments (before production)
- Unit test environments (MongoMemoryServer)

**Template:** `backend/.env.minimum.example` (26 lines)

**Required (5 strict keys):**
| Key | Purpose | Generation |
|-----|---------|-----------|
| `MONGODB_URI` | Database connection | Local `mongodb://127.0.0.1:27017/alawael_erp` or managed URL |
| `JWT_SECRET` | Primary auth token signing | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Refresh token signing | `openssl rand -base64 64` |
| `ENCRYPTION_KEY` | AES-256 field-level encryption | `openssl rand -base64 64` |
| `SESSION_SECRET` | Express session signing | `openssl rand -base64 64` |

**Optional (recommended defaults):**

```env
NODE_ENV=production              # or development for local debug
PORT=3001
JWT_EXPIRES_IN=24h
```

**Exit criteria:**

```bash
npm run env:check
# Output: ✅ All 5 keys present and valid
# Exit code: 0 → proceed to npm run quality:push
```

**What's disabled in minimal:**

- Email system (notifications fall back to in-app only)
- WhatsApp integration (uses stub mode)
- File storage (S3 disabled — uploads to local disk)
- Government integrations (all mock mode)
- Observability (Sentry, metrics — basic console logging only)
- Scheduled sweepers (manual operations only)
- DAST scanning (security tests skipped)

**Bootstrap time:** ~30s (after MongoDB is ready)

---

### Profile 2: Full Features (Production / Staging with Services)

**When to use:**

- Production deployments (all features enabled)
- Staging with live integrations (test against real gov APIs in sandbox)
- Development on specific features (payments, WhatsApp, NPHIES, etc.)

**Template:** `backend/.env.example` (48KB, 350+ lines)

**Inherits:** All 5 keys from Profile 1, plus:

#### Core Services

| Key            | Category | Default                 | If Missing               | Notes                                              |
| -------------- | -------- | ----------------------- | ------------------------ | -------------------------------------------------- |
| `FRONTEND_URL` | CORS     | `http://localhost:3000` | ◯ (CORS restricted)      | Origin for browser requests                        |
| `REDIS_URL`    | Cache    | disabled                | ◯ (no distributed cache) | Redis connection string; omit for in-process cache |
| `LOG_LEVEL`    | Logging  | `info`                  | —                        | `debug` / `info` / `warn` / `error`                |

#### Email System (production required)

| Key               | Type   | Provider                                  | Notes                  |
| ----------------- | ------ | ----------------------------------------- | ---------------------- |
| `EMAIL_PROVIDER`  | enum   | `smtp` / `sendgrid` / `mailgun` / `azure` | —                      |
| `EMAIL_FROM`      | string | —                                         | Sender display address |
| `EMAIL_FROM_NAME` | string | `نظام الأوائل ERP`                        | Sender display name    |

**For SMTP:**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password          # Google: https://myaccount.google.com/apppasswords
```

**For SendGrid:**

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@alawael-erp.com
```

#### File Storage (S3)

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=me-south-1
S3_BUCKET=alawael-uploads
FILE_SIZE_LIMIT_MB=50
```

#### Payments (Stripe)

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### WhatsApp (Meta Cloud API v21.0)

```env
WHATSAPP_ENABLED=true
WHATSAPP_API_TOKEN=EAAB...
WHATSAPP_PHONE_ID=1234567890
WHATSAPP_BUSINESS_ID=...
WHATSAPP_WEBHOOK_SECRET=<random 32+ chars>
WHATSAPP_VERIFY_TOKEN=<random 32+ chars>
ENABLE_WHATSAPP_BOT_MENU=true
ENABLE_WHATSAPP_BOT_LIVE_DATA=true
```

#### Government Integrations (Saudi Arabia)

All default to `mock` mode (credential-free). To go live:

1. Sign business contract (see `docs/sprints/GOV_INTEGRATIONS_GO_LIVE.md`)
2. Populate all `{PROVIDER}_*` keys below
3. Set `{PROVIDER}_MODE=live`
4. Test: `POST /admin/gov-integrations/{provider}/test-connection`

**Providers:**

| Provider                          | Keys Required                                                             | Sandbox                                   | Rate Limit               |
| --------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------- | ------------------------ |
| **GOSI** (Social Insurance)       | `_MODE`, `_BASE_URL`, `_CLIENT_ID`, `_CLIENT_SECRET`                      | `https://api-staging.gosi.gov.sa`         | 30/min default           |
| **NPHIES** (Health Insurance)     | `_MODE`, `_BASE_URL`, `_CLIENT_ID`, `_CLIENT_SECRET`, `_PROVIDER_ID`      | Multiple endpoints                        | 60/min default           |
| **SCFHS** (Health Specialties)    | `_MODE`, `_BASE_URL`, `_API_KEY`                                          | TBD                                       | per-contract             |
| **Absher** (Civil Registry)       | `_MODE`, `_BASE_URL`, `_CLIENT_ID`, `_CLIENT_SECRET`                      | `https://api-staging.absher.sa`           | 10/min (billed per call) |
| **Qiwa** (HR Ministry)            | `_MODE`, `_BASE_URL`, `_CLIENT_ID`, `_CLIENT_SECRET`, `_ESTABLISHMENT_ID` | Sandbox TBD                               | per-contract             |
| **Nafath** (SSO)                  | `_MODE`, `_BASE_URL`, `_APP_ID`, `_SERVICE_ID`, `_PRIVATE_KEY`            | —                                         | per-contract             |
| **ZATCA/Fatoora** (Invoicing)     | Complex (CSR cert + private key + binary token)                           | `https://gw-staging-fatoora.zatca.gov.sa` | 600/min (10/s)           |
| **Muqeem** (Residency)            | `_MODE`, `_BASE_URL`, `_CLIENT_ID`, `_CLIENT_SECRET`, `_ESTABLISHMENT_ID` | Sandbox TBD                               | per-contract             |
| **Balady** (Municipality Permits) | `_MODE`, `_BASE_URL`, `_CLIENT_ID`, `_CLIENT_SECRET`                      | Sandbox TBD                               | per-contract             |
| **Wasel** (Postal Addresses)      | `_MODE`, `_BASE_URL`, `_API_KEY`                                          | `https://api-staging.address.gov.sa`      | 30/min default           |

#### Observability & Disaster Recovery

```env
# Sentry (error tracking)
SENTRY_DSN=https://xxxxxxxx@sentry.io/xxxxxxxx

# Backup encryption
BACKUP_ENCRYPTION_KEY=<64 hex chars>  # Generate: node backend/scripts/backup-keygen.js
ENABLE_AUTO_BACKUP=true
DB_BACKUP_KEEP_DAYS=30

# Ops alerting
OPS_ALERT_EMAIL=oncall@alawael-erp.com
OPS_ALERT_PHONE=+966500000001
```

#### Scheduler Feature Flags

```env
# Sweepers (background jobs)
ENABLE_EMAIL_DIGESTS=true
ENABLE_FALLS_REASSESSMENT_SWEEPER=true
ENABLE_SPEECH_RETENTION_CRON=true        # PDPL compliance (see S3 setup)
NPHIES_RECON_ENABLED=true                # Claim reconciliation
ZATCA_SLA_SWEEPER_ENABLED=true          # Invoice SLA monitoring
```

**Bootstrap time:** ~45s (database index creation, cache warmup)

---

## Environment Strategies

### Strategy A: Hardcoded .env (Development Only)

✅ **Use for:** Local development, laptop testing
❌ **Never for:** Production, CI, shared staging

```bash
cd backend
cp .env.example .env
# Edit .env with test values
npm run dev
```

**Risk:** `.env` is human-edited; typos, expired secrets, committed to git if `.gitignore` fails.

---

### Strategy B: .env.example Template + Secret Manager (Recommended Production)

✅ **Use for:** Production, CI/CD, Kubernetes, Docker
✅ **Prevents:** Secrets in git, environment drift, typos

**Process:**

1. **Commit `.env.example` + `.env.minimum.example`** (template only, no secrets):

   ```bash
   git add backend/.env.example backend/.env.minimum.example
   git commit -m "docs: environment templates"
   ```

2. **Populate real secrets in external store** (example: GitHub Secrets, AWS Secrets Manager, HashiCorp Vault):

   ```bash
   # GitHub Actions
   export MONGODB_URI="${{ secrets.MONGODB_URI }}"
   export JWT_SECRET="${{ secrets.JWT_SECRET }}"
   # ... (5 strict keys + optional)
   ```

3. **Bootstrap at runtime** (container entrypoint, GitHub Actions script):
   ```bash
   #!/bin/bash
   cat > .env << EOF
   NODE_ENV=production
   MONGODB_URI=${MONGODB_URI}
   JWT_SECRET=${JWT_SECRET}
   JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
   ENCRYPTION_KEY=${ENCRYPTION_KEY}
   SESSION_SECRET=${SESSION_SECRET}
   EOF
   npm run env:check
   npm start
   ```

**Benefits:**

- Secrets never touch git
- Audit trail (secret manager logs all access)
- Rotation without code changes
- CI/CD integrates cleanly

---

### Strategy C: Docker Secrets (Kubernetes / Docker Swarm)

✅ **Use for:** Kubernetes, orchestrated deployments
✅ **Prevents:** Secrets in environment variables (visible in `ps` / container logs)

```bash
# Kubernetes secret
kubectl create secret generic alawael-env \
  --from-literal=MONGODB_URI=mongodb://... \
  --from-literal=JWT_SECRET=... \
  # ... (all 5 strict keys)

# Pod mounts as file
volumes:
  - name: env-secret
    secret:
      secretName: alawael-env

# Entrypoint reads from /run/secrets/
export JWT_SECRET=$(cat /run/secrets/JWT_SECRET)
```

---

## Setup Workflows

### Workflow 1: New Developer (5 min)

```bash
# 1. Clone repo
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp/backend

# 2. Minimal bootstrap
cp .env.minimum.example .env

# 3. Generate 5 secure keys (use a script or manually)
# Edit .env, replace CHANGE_ME values:
sed -i 's/CHANGE_ME_64B/'"$(openssl rand -base64 64)"'/g' .env

# 4. Start local MongoDB (if needed)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# 5. Verify and run
npm run env:check
npm run dev
```

**Expected:** Server listening on `http://localhost:3001`

---

### Workflow 2: CI/GitHub Actions (1 min)

```yaml
# .github/workflows/test.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:latest
        options: >-
          --health-cmd "mongosh --eval 'db.runCommand({ ping: 1 })';"

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Setup environment (minimal)
        env:
          MONGODB_URI: mongodb://localhost:27017/alawael-test
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          JWT_REFRESH_SECRET: ${{ secrets.JWT_REFRESH_SECRET }}
          ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}
          SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
        run: npm run env:check

      - name: Run tests
        run: npm run test:sprint
```

---

### Workflow 3: Docker Compose (Staging, Local Full Stack)

```yaml
# docker-compose.yml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}

  backend:
    build: ./backend
    ports:
      - '3001:3001'
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      MONGODB_URI: mongodb://root:${MONGO_PASSWORD}@mongodb:27017/alawael-erp?authSource=admin
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      SESSION_SECRET: ${SESSION_SECRET}
    depends_on:
      - mongodb

  redis:
    image: redis:latest
    ports:
      - '6379:6379'
```

**Bootstrap:**

```bash
cp backend/.env.example .env.local
# Edit .env.local with test values
docker-compose --env-file .env.local up
```

---

## Troubleshooting

### Error: `env:check failed: MONGODB_URI not set`

**Cause:** One of 5 strict keys is missing or empty

**Fix:**

```bash
# List current values (redacted)
grep -E '^(MONGODB_URI|JWT_SECRET|JWT_REFRESH_SECRET|ENCRYPTION_KEY|SESSION_SECRET)' .env | awk -F= '{print $1"=***"}'

# Re-generate all 5
for key in JWT_SECRET JWT_REFRESH_SECRET ENCRYPTION_KEY SESSION_SECRET; do
  value=$(openssl rand -base64 64)
  sed -i "s/^$key=.*/$key=$value/" .env
done

# Verify
npm run env:check
```

---

### Error: `MONGODB_URI connection timeout`

**Cause:** MongoDB not running or unreachable

**Fix:**

```bash
# Check MongoDB is running
mongosh --eval 'db.runCommand({ ping: 1 })'

# If not running, start it:
# Local: mongod --dbpath /data/db
# Docker: docker run -p 27017:27017 mongo:latest

# Update .env MONGODB_URI if needed
# e.g. mongodb://127.0.0.1:27017/alawael_erp

npm run env:check
```

---

### Error: `WhatsApp webhook HMAC signature mismatch`

**Cause:** `WHATSAPP_WEBHOOK_SECRET` missing or mismatched with Meta dashboard

**Fix:**

1. Go to Meta App Dashboard → Whatsapp → Settings → Webhooks
2. Copy "App Secret" (NOT "Verify Token")
3. Update `.env`:
   ```bash
   WHATSAPP_WEBHOOK_SECRET=<meta-app-secret>
   WHATSAPP_VERIFY_TOKEN=<any-random-string>
   ```
4. Restart backend and re-subscribe webhook in Meta

---

### Error: `GOSI_MODE=live but circuit breaker open`

**Cause:** `_TIMEOUT_MS` or `_MAX_FAILURES` exceeded; adapter in fallback

**Fix:**

```bash
# Increase timeout or increase max failures
GOSI_TIMEOUT_MS=10000          # 10s instead of 8s
GOSI_MAX_FAILURES=10           # 10 instead of 5

# Test connection to GOSI
curl -X POST http://localhost:3001/admin/gov-integrations/gosi/test-connection \
  -H "Authorization: Bearer <admin-jwt>"
```

---

## Maintenance

### Rotating Secrets

**Every 90 days (recommended):**

1. **Generate new values:**

   ```bash
   for key in JWT_SECRET JWT_REFRESH_SECRET ENCRYPTION_KEY SESSION_SECRET; do
     echo "$key=$(openssl rand -base64 64)"
   done
   ```

2. **Update in secret manager** (do NOT commit to .env)

3. **Restart all instances** (load balancer should drain gracefully)

4. **Monitor**: Check error rates and logs for stale tokens

---

### Syncing .env.example with Code

**The `.env.example` template is guarded by drift detection.** If new required keys are added to `validateEnv.js`, the drift guard fails CI and blocks merge:

```bash
# This will fail CI:
# "env.example is out of sync with validateEnv.js STRICT_REQUIRED_KEYS"

# Fix: Update both files and sync
npm run stats:check docs/PROJECT_STATS.md   # Verify structure
npm run env:check                            # Verify all keys work
# Then commit both files together
```

---

## Related Documentation

- [Pre-Deployment Checklist](pre-deployment-checklist.md) — Full deployment workflow
- [Environment Preflight Check](env-preflight-check.md) — `npm run env:check` deep dive
- [Go-Live Checklist](../blueprint/23-go-live-checklist.md) — Production readiness
- [SECURITY.md](../../SECURITY.md) — Secret rotation, DAST, gitleaks
- [Government Integrations](../sprints/GOV_INTEGRATIONS_GO_LIVE.md) — Per-provider contracts

---

**Version:** 1.0.0 (W1400 · 2026-06-17)
**Last updated:** 2026-06-17
**Maintained by:** DevOps Team

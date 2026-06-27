# Al-Awael ERP — Deployment Checklist

> **Repository:** `c:/Users/x-be/OneDrive/المستندات/04-10-2025/66666`  
> **Branch:** `feat/w1463-atomic-numbering`  
> **Backend:** Express + MongoDB + Redis (optional)  
> **Node requirement:** `>= 20.0.0`  

---

## 1. Install Dependencies

```bash
cd backend
npm install
```

- If you see `EBADENGINE` warnings, ensure Node.js is **v20+**.
- On Windows, use `npm install --legacy-peer-deps` if peer-dependency conflicts occur.

---

## 2. Set Up Environment Variables

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env` and set the **minimum required** values:

| Variable | Required? | How to generate |
|----------|-----------|-----------------|
| `JWT_SECRET` | **Yes** | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | **Yes** | `openssl rand -base64 64` (different from above) |
| `SETUP_SECRET_KEY` | **Yes** | `openssl rand -base64 32` |
| `ADMIN_EMAIL` | **Yes** | Your admin email |
| `ADMIN_PASSWORD` | **Yes** | Strong password (min 8 chars) |
| `MONGODB_URI` | **Yes** | e.g. `mongodb://localhost:27017/alawael-erp` |
| `NODE_ENV` | **Yes** | `production` for live, `development` for local |
| `PORT` | No | Defaults to `3001` |
| `FRONTEND_URL` | No | Defaults to `http://localhost:3000` |

### Optional but recommended for production

- `REDIS_URL` — for rate-limiting & session caching (omit or set `DISABLE_REDIS=true` to skip)
- `EMAIL_PROVIDER` + SMTP/SendGrid credentials — for email notifications
- `AWS_*` — for S3 file uploads
- `STRIPE_SECRET_KEY` — for payment processing
- `FIREBASE_*` — for push notifications
- `GOSI_MODE`, `ZATCA_SIGNER_MODE`, `FATOORA_MODE`, etc. — Saudi gov integrations (all default to `mock`)

> ⚠️ **Never commit `.env` to Git.** It is already in `.gitignore`.

---

## 3. Start the Server

### Development (with auto-reload)

```bash
cd backend
npm run dev
```

### Production

```bash
cd backend
npm start
# or explicitly:
node server.js
```

For memory-constrained environments:

```bash
npm run start:prod
# equivalent to: node --max-old-space-size=1024 server.js
```

---

## 4. Verify It's Running

### Basic Health Check

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-06-27T12:00:00.000Z"
}
```

### Route Health Dashboard

```bash
curl http://localhost:3001/api/health/routes
```

Shows: total routes, healthy routes, empty stubs, warnings.

### Domain Health Check

```bash
curl http://localhost:3001/api/v2/domains/health
```

Shows aggregated health across all domain modules.

---

## 5. Database Setup (First Time Only)

```bash
cd backend

# Check database health
npm run db:health

# Run migrations
npm run migrate:mongo:up

# Seed demo data (optional — dev only)
npm run db:seed:comprehensive

# Or seed just users + settings
npm run db:seed:users
npm run db:seed:settings
```

---

## 6. Pre-Flight Checks (Before Production Deploy)

```bash
cd backend

# Verify all required services are reachable
npm run check:services

# Verify environment variables are complete
npm run validate:env

# Run smoke tests
npm run smoke:health

# Run comprehensive smoke test
npm run smoke:comprehensive

# Audit for stub routes
npm run audit:stubs

# Check route health
npm run audit:route-health
```

---

## 7. Docker Deployment (Alternative)

```bash
# Production compose
docker compose -f docker-compose.prod.yml up -d

# Or streamlined version (lighter)
docker compose -f docker-compose.streamlined.yml up -d
```

---

## 8. Common Issues & Solutions

### Issue: `npm install` fails with `EBADENGINE`

**Cause:** Node.js version is below v20.  
**Fix:**

```bash
# Check current version
node -v

# Install Node 20+ (via nvm, fnm, or official installer)
# Example with nvm:
nvm install 20
nvm use 20
```

---

### Issue: `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017`

**Cause:** MongoDB is not running.  
**Fix:**

```bash
# Start MongoDB locally
mongod --dbpath /path/to/data

# Or use Docker
docker run -d -p 27017:27017 --name mongo mongo:7

# Or use mock DB for quick testing
# Edit .env and uncomment: USE_MOCK_DB=true
```

---

### Issue: `JWT_SECRET` not set / server exits on boot

**Cause:** Required secrets are missing.  
**Fix:**

```bash
cd backend
node scripts/generate-secrets.js
# Then apply to .env:
node scripts/generate-secrets.js --apply
```

---

### Issue: Port 3001 is already in use

**Cause:** Another process is using the port.  
**Fix:**

```bash
# Linux / macOS
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or start on a different port
PORT=3002 npm start
```

---

### Issue: `/health` returns 404

**Cause:** The app may not have finished booting, or the health probe is disabled.  
**Fix:**

```bash
# Check logs for "Health probes mounted"
tail -f logs/app.log

# Verify the startup script loaded
grep -n "setupHealthProbes" backend/app.js
```

---

### Issue: Emails are not sending

**Cause:** Email provider not configured.  
**Fix:**

```bash
# Minimum SMTP config in .env:
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@alawael-erp.com
```

---

### Issue: Redis connection errors in logs

**Cause:** Redis is not running but the app is trying to connect.  
**Fix:**

```bash
# Option A: Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Option B: Disable Redis
# Add to .env:
DISABLE_REDIS=true
```

---

### Issue: `npm run test` fails with memory errors

**Cause:** Jest needs more heap space.  
**Fix:**

```bash
# Run tests with increased memory
node --max-old-space-size=4096 node_modules/jest/bin/jest.js --no-coverage

# Or use the provided script
npm run test:chunked
```

---

## 9. Post-Deployment Verification Checklist

- [ ] `curl http://localhost:3001/health` returns `{"status":"ok"}`
- [ ] `curl http://localhost:3001/api/health/routes` returns route stats
- [ ] MongoDB connection is active (check logs)
- [ ] Admin user can log in via `/api/auth/login`
- [ ] Email test passes: `npm run smoke:health`
- [ ] No `ERROR` or `FATAL` in `logs/app.log`
- [ ] `.env` is NOT tracked by Git (`git status` should not show `.env`)

---

## 10. Useful Commands Reference

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm run validate:env` | Check .env completeness |
| `npm run smoke:health` | Quick health smoke test |
| `npm run smoke:comprehensive` | Full system smoke test |
| `npm run audit:stubs` | Find empty / stub routes |
| `npm run routes:list` | List all mounted routes |
| `npm run db:health` | Check MongoDB health |
| `npm run migrate:mongo:up` | Run database migrations |
| `npm run preflight` | Run full preflight checks |
| `npm run preflight:prod` | Production preflight (CI mode) |

---

*Generated during cleanup on 2026-06-27. For questions, check `backend/.env.example` or the project docs.*

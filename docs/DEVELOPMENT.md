# Development Guide — Al-Awael ERP

> دليل المطور الشامل — الإعداد، التطوير، الاختبار، والنشر

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Start](#2-quick-start)
3. [Environment Setup](#3-environment-setup)
4. [Running the Project](#4-running-the-project)
5. [Testing](#5-testing)
6. [Code Standards](#6-code-standards)
7. [Git Workflow](#7-git-workflow)
8. [Troubleshooting](#8-troubleshooting)
9. [Useful Scripts](#9-useful-scripts)

---

## 1. Prerequisites

| Tool    | Min Version | Install                                |
|---------|-------------|----------------------------------------|
| Node.js | 18.0.0      | https://nodejs.org                     |
| npm     | 9.0.0       | Included with Node.js                  |
| MongoDB | 5.0+        | https://www.mongodb.com/try/download   |
| Git     | 2.30+       | https://git-scm.com                    |
| Redis   | 6.0+        | Optional — set `DISABLE_REDIS=true` to skip |

---

## 2. Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# 2. Install all dependencies (root + backend + frontend)
npm run install:all

# 3. Copy environment template
cp .env.example .env

# 4. Start development servers
npm run dev:all
```

Open:
- **API**: http://localhost:3001
- **Frontend**: http://localhost:3000
- **Swagger**: http://localhost:3001/api-docs

---

## 3. Environment Setup

### Minimal `.env` for Development

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/alawael_erp
JWT_SECRET=your-secret-key-min-32-chars-recommended

# Disable Redis if not installed locally
DISABLE_REDIS=true

# Enable Swagger UI
ENABLE_SWAGGER=true

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Full `.env` Reference

See `.env.example` for all available variables with descriptions.

### Key Environment Flags

| Flag                | Default       | Effect                                          |
|---------------------|---------------|-------------------------------------------------|
| `DISABLE_REDIS`     | `false`       | Skip Redis entirely (no NOAUTH errors)          |
| `ENABLE_SWAGGER`    | `true`        | Enable Swagger UI at `/api-docs`                |
| `MONGOOSE_DEBUG`    | `false`       | Log all Mongoose queries to console             |
| `SKIP_PHASE17`      | `false`       | Skip Phase 17 routes during startup             |
| `NODE_ENV`          | `development` | `development` / `production` / `test`           |

---

## 4. Running the Project

### Backend Only

```bash
# Development (nodemon auto-restart)
npm run dev

# Production
npm run start:prod

# With PM2 (cluster mode)
cd backend && npx pm2 start ecosystem.config.js
```

### Frontend Only

```bash
npm run start:frontend
# Or:
cd frontend && npm start
```

### Both Concurrently

```bash
npm run dev:all
```

### Docker (Recommended for Full Stack)

```bash
# Development
docker compose up -d

# Check logs
docker compose logs -f backend

# Production
docker compose -f docker-compose.production.yml up -d --build
```

---

## 5. Testing

### Backend Tests (Jest)

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Single file
cd backend && npx jest __tests__/auth.test.js
```

### Frontend Tests

```bash
npm run test:frontend

# Or:
cd frontend && npm test
```

### E2E Tests (Cypress)

```bash
cd frontend && npx cypress open     # Interactive
cd frontend && npx cypress run      # Headless
```

### Test Environment

Tests use `MongoMemoryServer` — no real MongoDB needed.
Set `NODE_ENV=test` to use in-memory database automatically.

---

## 6. Code Standards

### Backend

- **Style**: ESLint (`backend/.eslintrc.json`) + Prettier
- **Language**: Node.js (CommonJS `require/module.exports`)
- **Error Handling**: Always use `try/catch` + call `respond()` helper
- **Validation**: Validate inputs in controllers before calling services

```javascript
// ✅ Good controller pattern
exports.createItem = async (req, res) => {
  try {
    const error = validateInput(req.body);
    if (error) return respond(res, 400, false, error);

    if (!service) return respond(res, 503, false, 'الخدمة غير متاحة');

    const result = await service.create(req.body);
    return respond(res, 201, true, 'تم الإنشاء بنجاح', { item: result });
  } catch (err) {
    console.error('[createItem]', err);
    return respond(res, 500, false, 'خطأ داخلي', { error: err.message });
  }
};
```

### Frontend

- **Style**: ESLint + Prettier
- **Language**: React 18 (functional components + hooks)
- **State**: useState + useCallback + useEffect (no Redux)
- **UI**: Material-UI v5 (RTL Arabic)
- **Pattern**: Every major page must have an Error Boundary

```jsx
// ✅ Good page pattern
class PageErrorBoundary extends Component { /* ... */ }

function PageInner() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  // ...
}

export default function Page() {
  return <PageErrorBoundary><PageInner /></PageErrorBoundary>;
}
```

### Mongoose Models

```javascript
// ✅ Always specify type: String for enum fields
status: { type: String, enum: ['active', 'inactive'], default: 'active' }

// ✅ timestamps in schema options, not inside body
new Schema({ name: String }, { timestamps: true })

// ✅ Avoid duplicate indexes
// If field has unique: true, do NOT add .index({ field: 1 }, { unique: true })
```

---

## 7. Git Workflow

### Branch Naming

```
main          ← production (protected)
dev           ← development integration
feat/name     ← new feature
fix/name      ← bug fix
hotfix/name   ← critical production fix
docs/name     ← documentation only
refactor/name ← code refactoring
```

### Commit Message Format

```
type(scope): short description in Arabic or English

- detail 1
- detail 2

Types: feat | fix | docs | refactor | test | chore | perf | security
```

**Examples:**
```
feat(rehab): إضافة نظام خطط التأهيل الفردية مع AI assessment
fix(auth): استبدال authGuard الوهمي بـ JWT حقيقي
fix(models): إصلاح enum fields بدون type:String في 4 ملفات
docs(architecture): إضافة وثيقة ARCHITECTURE.md الشاملة
```

### Pre-commit Hooks (Husky)

Automatically runs on every commit:
- ESLint check
- Cache file detection (prevents committing Redis cache files)

To bypass false-positive hook detection (for legitimate files like `cache.config.js`):
```bash
git commit --no-verify -m "your message"
```

### Push to GitHub

```bash
git add -A
git commit --no-verify -m "type(scope): description"
git push origin main
```

---

## 8. Troubleshooting

### ❌ Redis NOAUTH errors in logs

**Cause**: Redis is configured but not running locally, or has no password set.

**Fix**: Add `DISABLE_REDIS=true` to your `.env` file:
```env
DISABLE_REDIS=true
```

### ❌ MongoDB connection failed

**Fix**:
```bash
# Start MongoDB locally
mongod --dbpath /data/db

# Or use Docker
docker run -d -p 27017:27017 mongo:6
```

### ❌ Route fails to load at startup

Routes using `safeMount` will not crash the server. Check startup logs:
```bash
# Look for ROUTE FAIL messages
npm run dev 2>&1 | grep "ROUTE FAIL"
```

### ❌ Mongoose "Duplicate index" warnings

This means a field has `unique: true` AND a separate `.index()` call.
**Fix**: Remove the redundant `.index()` call — the `unique: true` on the field definition already creates the index.

### ❌ "400 Bad Request" when creating rehab plan

**Cause**: Field name mismatch between frontend and controller.
**Fix**: The controller now supports both `beneficiary` (frontend) and `beneficiaryId` (service) automatically. Check that `startDate` is provided — it's required.

### ❌ Frontend page shows blank / white screen

**Cause**: Unhandled rendering error.
**Fix**: Wrap the page component in an `ErrorBoundary` class component. Check browser console for the actual error.

### ❌ git commit rejected by hook

**Cause**: Pre-commit hook (`.husky/pre-commit`) incorrectly flags legitimate files containing "cache" or "seed" in their names.

**Fix**:
```bash
git commit --no-verify -m "your commit message"
```

---

## 9. Useful Scripts

```bash
# Development setup check (env + services + deps)
node backend/scripts/dev-setup.js

# Check MongoDB/Redis connectivity
node backend/scripts/check-services.js

# Inspect all registered Express routes
node backend/scripts/inspect-routes.js

# Generate secure JWT_SECRET and other secrets
node backend/scripts/generate-secrets.js

# Project statistics (files, lines, tests count)
node backend/scripts/project-stats.js

# Clean up logs, temp files, cache
node backend/scripts/cleanup.js

# Seed initial branch data (12 branches + HQ)
node backend/seeds/branches.seed.js
```

---

## Module Documentation

| Module               | Documentation                                      |
|---------------------|----------------------------------------------------|
| Architecture         | [docs/ARCHITECTURE.md](./ARCHITECTURE.md)         |
| API Reference        | http://localhost:3001/api-docs (Swagger)           |
| Changelog            | [CHANGELOG.md](../CHANGELOG.md)                   |
| Contributing         | [CONTRIBUTING.md](../CONTRIBUTING.md)             |
| Rehabilitation Plans | [docs/rehabilitation-dashboard.html](./rehabilitation-dashboard.html) |

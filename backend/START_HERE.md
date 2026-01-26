# AlAwael ERP Backend - Quick Start Guide

## ✅ Current Status

- Backend is **fully configured** and ready to run
- All 116+ Phase 29-33 endpoints are implemented
- Server.js is properly structured with all middleware and routes

## 🚀 Recommended: Start with PM2

PM2 هو process manager يحافظ على استقرار التطبيق ويمنع التوقف غير المتوقع.

### Install PM2:

```bash
npm install -g pm2
```

### Start Backend:

```bash
cd backend
pm2 start server.js --name alawael-backend --watch
```

### View Logs:

```bash
pm2 logs alawael-backend
```

### Stop Backend:

```bash
pm2 stop alawael-backend
```

### Restart Backend:

```bash
pm2 restart alawael-backend
```

### Save Configuration:

```bash
pm2 save
pm2 startup
```

## 🔄 Alternative: Run Directly

إذا لم يكن PM2 متاحاً، يمكنك استخدام Node مباشرة:

```bash
cd backend
node server.js
```

**ملاحظة:** في PowerShell على Windows، قد يتوقف الخادم عند إجراء HTTP requests.
استخدم PM2 أو CMD بدلاً من PowerShell.

## 🧪 Test Endpoints

بعد بدء الخادم، اختبر الـ endpoints:

```bash
# Health Check
curl http://localhost:3001/health

# Phase 29-33 Base
curl http://localhost:3001/phases-29-33

# Test Endpoint
curl http://localhost:3001/test-first

# HTML Documentation
# افتح في المتصفح: http://localhost:3001/phase29-33-docs.html
```

## 📊 Expected Output

عند بدء الخادم بنجاح، ستظهر هذه الرسائل:

```
✅ Auth routes using In-Memory User model
✅ Super early test endpoints mounted: /test-first, /api/test
✅ Socket.IO initialized for Messaging
✅ Phase 29-33 router mounted at /phases-29-33 (public)
✅ Phase 29-33 router mounted at /api/phases-29-33
✅ Static files served from public/ (including phase29-33-docs.html)
✅ Integration routes mounted successfully
✅ Phase 21-28 Advanced Enterprise Routes mounted (153+ endpoints)
✅ Redis: Connected and ready
Server running at http://localhost:3001 (0.0.0.0)
```

## 🎯 Phase 29-33 Endpoints

| Phase    | Description       | Endpoints | Example                                              |
| -------- | ----------------- | --------- | ---------------------------------------------------- |
| Phase 29 | AI Integration    | 23        | `/phases-29-33/ai/llm/providers`                     |
| Phase 30 | Quantum Computing | 22        | `/phases-29-33/quantum/crypto/status`                |
| Phase 31 | Extended Reality  | 24        | `/phases-29-33/xr/hologram/status/test`              |
| Phase 32 | DevOps/MLOps      | 25        | `/phases-29-33/devops/k8s/metrics/test`              |
| Phase 33 | Optimization      | 22        | `/phases-29-33/optimization/performance/report/test` |

**Total:** 116+ endpoints

## 🔧 Environment Variables

```bash
PORT=3001
USE_MOCK_DB=true
NODE_ENV=development
```

## 📚 Documentation

- Quick Start: `⚡_PHASE_29-33_QUICK_START.md`
- Final Status: `⚡_FINAL_STATUS_PHASE_29-33.md`
- HTML Docs: `http://localhost:3001/phase29-33-docs.html`

## ✅ System Ready

النظام جاهز للتشغيل والاختبار! 🎉

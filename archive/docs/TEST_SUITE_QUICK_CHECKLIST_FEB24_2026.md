# ✅ قائمة التحقق السريعة لـ Test Suite

## 🚀 خطوات التشغيل السريعة

### الخطوة 1: التحقق من الخوادم المطلوبة

```bash
# 1. تحقق من MongoDB
mongosh --eval "db.adminCommand('ping')"
# النتيجة المتوقعة: { ok: 1 }

# 2. تحقق من Redis
redis-cli ping
# النتيجة المتوقعة: PONG
```

### الخطوة 2: نسخ متغيرات البيئة

```bash
cd erp_new_system/backend
cp .env.example .env

# تأكد من وجود:
NODE_ENV=test
MONGODB_URI=mongodb://admin:password@localhost:27017/alawael_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret-key
```

### الخطوة 3: تثبيت الـ Dependencies

```bash
cd erp_new_system/backend
npm install --legacy-peer-deps

cd supply-chain-management/frontend
npm install --legacy-peer-deps
```

### الخطوة 4: تشغيل الاختبارات

#### Backend Tests:
```bash
cd erp_new_system/backend
npm test
```

**النتيجة المتوقعة:**
```
Test Suites: X passed, 0 failed
Tests:       Y passed, 0 failed
Statements:  > 80%
Branches:    > 75%
```

#### Frontend Tests:
```bash
cd supply-chain-management/frontend
npm test -- --watchAll=false
```

**النتيجة المتوقعة:**
```
PASS  src/components/...
PASS  src/pages/...
Test Suites: X passed, 0 failed
Tests:       Y passed, 0 failed
```

---

## 🔍 استكشاف الأخطاء

### ❌ المشكلة: "A worker process has failed to exit"

**الحل:**
```bash
# 1. تأكد من استخدام الإصدار الجديد من jest.config.js
grep "forceExit" erp_new_system/jest.config.js
# يجب أن ترى: forceExit: true,

# 2. حاول مع أعلام verbose
npm test -- --verbose --forceExit
```

### ❌ المشكلة: "Cannot find module 'mongoose'"

**الحل:**
```bash
cd erp_new_system/backend
npm install mongoose
# أو
npm ci
```

### ❌ المشكلة: "ECONNREFUSED MongoDB"

**الحل:**
```bash
# 1. ابدأ MongoDB locally
# على macOS:
brew services start mongodb-community

# على Windows:
net start MongoDB

# 2. أو استخدم Docker:
docker run -d -p 27017:27017 mongo:7.0
```

### ❌ المشكلة: "ECONNREFUSED Redis"

**الحل:**
```bash
# 1. ابدأ Redis locally
# على macOS:
brew services start redis

# على Windows:
redis-server

# 2. أو استخدم Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

---

## 📊 مراقبة الأداء

### Slow Tests

إذا رأيت:
```
⚠️ Slow test "should create user": 5000ms
```

**الحل:**
- ✅ المتوقع للاختبارات قد يصل إلى 5+ ثواني
- ✅ هذا لا يسبب فشل
- ✅ لكن قد تحتاج تحسين الأداء

### Memory Issues

```bash
# شغّل مع حد أعلى للذاكرة
npm test -- --maxWorkers=2

# أو حتى worker واحد
npm test -- --maxWorkers=1
```

---

## ✨ أرقام النجاح

### Backend Tests:
- **Test Suites:** 12 passed
- **Tests:** 250+ tests
- **Coverage:** 75-85%
- **Time:** 2-3 minutes

### Frontend Tests:
- **Test Suites:** 8 passed
- **Tests:** 100+ tests
- **Coverage:** 60-70%
- **Time:** 1-2 minutes

---

## 🔄 GitHub Actions

### عند PR/Push:

1. ✅ Workflow يبدأ تلقائياً
2. ✅ Linting checks
3. ✅ Backend tests
4. ✅ Frontend tests
5. ✅ Coverage reports
6. ✅ PR comments with results

### حالات النجاح:

```
✅ All checks passed
✅ Coverage maintained
✅ No failing tests
```

### حالات الفشل:

```
❌ Check the logs for details
❌ Fix the failing tests locally
❌ Push again
```

---

## 📝 أفضل الممارسات

### 1. قبل الكود:
```bash
npm test -- --watch
# اختبر أثناء الكتابة
```

### 2. قبل الـ Commit:
```bash
npm test && npm run lint
# اختبر و lint
```

### 3. قبل الـ Push:
```bash
npm test -- --coverage
# تحقق من coverage
```

---

## 🎯 التحقق النهائي

### قائمة التحقق:

- [ ] MongoDB يعمل
- [ ] Redis يعمل
- [ ] Dependencies مثبتة
- [ ] Environment variables معرّفة
- [ ] اختبارات Backend تمر
- [ ] اختبارات Frontend تمر
- [ ] Coverage > 70%
- [ ] Linting بدون أخطاء

---

## 📞 للمساعدة

### مراجع مفيدة:

- [Jest Documentation](https://jestjs.io/)
- [MongoDB Testing](https://docs.mongodb.com/manual/core/replica-set-arbiter/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

### الملفات المحدثة:

- `jest.config.js` - Configuration
- `jest.setup.js` - Global setup
- `backend/tests/setup.js` - Backend setup
- `.eslintrc.json` - Linting
- `.github/workflows/test.yml` - Main workflow
- `.github/workflows/ci-cd.yml` - CI/CD pipeline

---

**آخر تحديث:** 24 فبراير 2026

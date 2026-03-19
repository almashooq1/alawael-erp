# خطوات التحقق والنشر - CI/CD Pipeline

## ✅ قائمة التحقق من التطبيق

### المرحلة 1: التحقق المحلي (قبل الـ Commit)

```bash
# 1. اختبار ESLint محليًا
cd alawael-erp/backend
npm run lint

# 2. اختبار الصيغة (Prettier)
npm run format:check

# 3. تشغيل جميع الاختبارات
npm test

# 4. تشغيل quality check كامل
npm run quality
```

### المرحلة 2: إعداد Git

```bash
# 1. التحقق من الملفات المتغيرة
git status

# 2. إضافة الملفات المحدثة
git add .github/workflows/
git add alawael-erp/backend/.eslintrc.json
git add CI_CD_PIPELINE_FIX_REPORT_FEB24_2026.md
git add CI_CD_SOLUTION_SUMMARY.md

# 3. إنشاء commit واضح
git commit -m "fix: Improve CI/CD pipeline reliability and ESLint configuration

- Add explicit Jest globals to ESLint config
- Improve error handling in GitHub Actions workflows
- Add path checks before directory operations
- Add fallback commands for optional dependencies
- Update ecmaVersion to ES2022 for modern JavaScript support

Fixes #CI-PIPELINE-FAILED"

# 4. الدفع إلى GitHub
git push origin master
```

### المرحلة 3: التحقق على GitHub

```
1. افتح https://github.com/almashooq1/alawael-erp/actions
2. اختر آخر workflow run
3. تحقق من الحالة:
   ✅ lint job = passed
   ✅ test-backend job = passed
   ✅ test-frontend job = passed
4. انقر على كل job لرؤية التفاصيل
```

### المرحلة 4: التحقق من التفاصيل

**في lint job:**
- ✅ يجب أن ترى "ESLint configuration updated"
- ✅ يجب ألا ترى أخطاء "jest is not defined"
- ✅ التحذيرات يجب أن تكون حاضرة فقط (warnings not errors)

**في test-backend job:**
- ✅ يجب أن ترى "npm test" يعمل بنجاح
- ✅ يجب أن ترى coverage reports
- ⚠️ Codecov upload قد لا ينجح (هذا عادي)

**في test-frontend job:**
- ✅ يجب أن ترى "Build frontend" مكتمل
- ✅ يجب أن ترى "Run frontend tests" (أو يتم تخطيه إذا لم تكن موجودة)

---

## 🔧 استكشاف الأخطاء

### المشكلة: "jest is not defined"

**الحل:**
```bash
# تحقق من .eslintrc.json
cat alawael-erp/backend/.eslintrc.json

# تأكد من وجود:
# "jest": "readonly" في globals
```

### المشكلة: "Cannot find module"

**الحل:**
```bash
# تأكد من تثبيت جميع المكتبات
npm ci
cd backend && npm ci

# امسح node_modules وأعد التثبيت
rm -rf node_modules package-lock.json
npm install
```

### المشكلة: GitHub Actions workflow timeout

**الحل:**
```yaml
# أضف timeout-minutes:
jobs:
  test-backend:
    timeout-minutes: 30  # بدلاً من الافتراضي 360
```

---

## 📋 الملفات المهمة للمراجعة

### 1. `.github/workflows/ci-cd.yml`
**ماذا تحقق:**
- استخدام `if [ -d "path" ]` قبل الـ cd
- استخدام `|| true` للأوامر الاختيارية
- `continue-on-error: true` للمهام غير الحرجة

### 2. `alawael-erp/backend/.eslintrc.json`
**ماذا تحقق:**
- وجود `"jest": true` في `env`
- وجود jest globals في `globals` section
- `"ecmaVersion": 2022`

### 3. `alawael-erp/.github/workflows/ci-cd.yml`
**ماذا تحقق:**
- نفس النقاط أعلاه مطبقة هنا أيضًا

---

## 🚀 نصائح الإنتاج

### 1. ضبط النسخ الاحتياطية
```bash
# قبل الدفع الأول
git branch ci-cd-backup
git push origin ci-cd-backup
```

### 2. مراقبة الـ Workflow
```bash
# شاهد الـ workflow في الوقت الفعلي
gh run list --repo almashooq1/alawael-erp
gh run view <run-id> --repo almashooq1/alawael-erp

# أو استخدم GitHub CLI:
gh workflow list
```

### 3. تعطيل Workflow مؤقتًا
```yaml
# أضف في بداية الملف:
on:
  workflow_dispatch:  # للتشغيل اليدوي فقط
  # push:
  #   branches: [master, develop]
```

### 4. الإشعارات
اذهب إلى Settings → Notifications:
- ✅ Workflow runs failures
- ✅ Pull request reviews
- ⚠️ حدد Slack webhook إذا أردت notifications هناك

---

## 📊 قائمة قريبة المدى

- [ ] تطبيق الإصلاحات على master branch
- [ ] التحقق من أول workflow run
- [ ] مراجعة logs للتحقق من عدم الأخطاء
- [ ] دمج PRs المعلقة
- [ ] تحديث documentation
- [ ] إشعار الفريق بالتحسينات

---

## 📞 الدعم والمساعدة

إذا واجهت مشاكل:

1. **افحص GitHub Actions logs:**
   - Actions tab → Click latest run → View logs

2. **جرب locally:**
   ```bash
   npm run lint
   npm test
   npm run quality
   ```

3. **افحص syntax:**
   ```bash
   # تحقق من JSON validity
   node -c alawael-erp/backend/.eslintrc.json
   ```

4. **Rerun failed job:**
   - في GitHub Actions → Click "Re-run" button

---

**تم الإنشاء:** 24 فبراير 2026  
**آخر تحديث:** متزامن  
**الحالة:** جاهز للنشر ✅

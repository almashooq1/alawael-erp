# 📋 أوامر سريعة

> استخدم هذه الأوامر للتعامل السريع مع المشاكل الشائعة

## 🚀 البدء السريع

```powershell
# تشغيل بالطريقة المحسّنة (موصى به)
.\start-optimized.ps1

# أو بطريقة عادية
npm start
```

---

## 🧹 التنظيف والتنظيف

```bash
# حذف كل الكاش والذاكرة المؤقتة
npm cache clean --force
npx jest --clearCache
rm -r node_modules package-lock.json
npm install

# تنظيف سريع (الكاش فقط)
npx jest --clearCache

# حذف ملفات الاختبار القديمة
rm final-test.txt temp-test.txt test-output.txt test-output.log
```

---

## 🧪 تشغيل الاختبارات

```bash
# اختبارات سريعة
npm test -- --passWithNoTests

# مع تحديد عدد workers
npm test -- --maxWorkers=4

# اختبار ملف واحد
npm test -- src/components/Modal.test.js

# مع مراقبة التغييرات
npm run test:watch

# مع تغطية الكود
npm run test:coverage

# اختبار مع verbose output
npm test -- --verbose
```

---

## 🔍 التشخيص

```powershell
# عمليات heavy
Get-Process | Where-Object {$_.CPU -gt 10}

# Node processes
Get-Process node | Select Name, CPU, @{N="Memory(MB)";E={[math]::round($_.PagedMemorySize/1MB)}}

# إيقاف جميع node processes
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# حجم المشروع
(Get-ChildItem . -Recurse | Measure-Object -Property Length -Sum).Sum / 1GB
```

---

## 🛠️ الإصلاح السريع

```bash
# إذا لم تعمل أي شيء
rm -r node_modules package-lock.json .jest-cache
npm cache clean --force
npm install --legacy-peer-deps
npm test

# زيادة الذاكرة
$env:NODE_OPTIONS = "--max-old-space-size=8192"

# استخدام port مختلف
PORT=3001 npm start
```

---

## 🔄 إعادة تشغيل كاملة

```bash
# 1. أغلق كل شيء
Stop-Process -Name node, npm -Force -ErrorAction SilentlyContinue

# 2. امسح الكاش
npm cache clean --force
npx jest --clearCache

# 3. أعد التثبيت
rm -r node_modules
npm install

# 4. ابدأ من جديد
.\start-optimized.ps1
```

---

## 📊 المراقبة

```bash
# مراقبة استهلاك الموارد (في Windows)
wmic os get totalvisiblememorysize, freephysicalmemory
 
# استهلاك CPU الفوري
Get-Process | Measure-Object -Property CPU -Sum

# الملفات الكبيرة
Get-ChildItem . -Recurse | 
  Sort-Object Length -Descending | 
  Select-Object -First 10 FullName, @{N="Size(MB)";E={[math]::round($_.Length/1MB)}}
```

---

## 🎯 checklist سريع

| المهمة | الأمر |
|-------|-------|
| تشغيل عادي | `npm start` |
| اختبارات | `npm test` |
| بناء | `npm build` |
| تنظيف | `npm cache clean --force` |
| حل المشاكل | `rm node_modules && npm install` |
| إيقاف معلق | `Stop-Process -Name node -Force` |

---

## 💡 نصائح

- استخدم PowerShell 7+ للأداء الأفضل
- لا تستهتر بـ `npm install --legacy-peer-deps` إذا واجهت مشاكل
- تجنب OneDrive - استخدم مجلد محلي
- افحص RAM و CPU قبل البدء (`Get-Process | Measure-Object CPU -Sum`)
- استخدم `--maxWorkers=2` إذا كان لديك RAM محدود

---

**آخر تحديث:** 16 فبراير 2026

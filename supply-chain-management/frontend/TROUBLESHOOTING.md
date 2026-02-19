# 🔧 دليل استكشاف الأخطاء وإصلاحها

## الأسئلة الشائعة والحلول

### س1: VS Code يتجمد بعد الإصلاحات. ماذا أفعل؟

**الخطوات:**
1. اضغط `Ctrl+Shift+Esc` لفتح Task Manager
2. ابحث عن عمليات Node.js تحتل نسبة عالية من CPU
3. انقر كليك يمين وحدد "End Task"
4. أغلق VS Code
5. شغل Script الآتي:

```powershell
cd supply-chain-management/frontend
npm cache clean --force
npx jest --clearCache
.\start-optimized.ps1
```

---

### س2: الاختبارات تستغرق وقتاً طويلاً جداً

**الحل:**
```bash
# استخدم عدد أقل من workers
npm test -- --maxWorkers=2

# أو شغل اختبار واحد فقط
npm test -- src/components/Modal.test.js
```

---

### س3: كيف أتحقق من استهلاك الموارد؟

**في Windows:**
```powershell
# اعرض العمليات الثقيلة
Get-Process | Where-Object {$_.PagedMemorySize -gt 300MB} | 
  Select-Object Name, CPU, @{N="Memory(MB)";E={[math]::round($_.PagedMemorySize/1MB,2)}}

# راقب استهلاك الذاكرة لـ Node
Get-Process node | Select-Object -First 1 | 
  Select-Object Name, Handles, CPU, @{N="Memory(MB)";E={[math]::round($_.PagedMemorySize/1MB,2)}}
```

---

### س4: رسالة "Port 3000 is already in use" - ماذا أفعل؟

**الحل الأول (قتل العملية):**
```powershell
# ابحث عن العملية التي تستخدم Port 3000
Get-Process | Where-Object {
  $_.ProcessName -match "node|npm"
} | Stop-Process -Force
```

**الحل الثاني (استخدم port مختلف):**
```bash
# شغل على port مختلف
PORT=3001 npm start
```

---

### س5: أخطاء "ENOSPC: Cannot watch file" بسبب inotify

**الحل (لـ Linux/WSL):**
```bash
# زيادة الحد الأقصى للملفات المراقبة
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

### س6: "Cannot find module" بعد التحديثات

**الحل:**
```bash
# حذف جميع المتعلقات والتثبيت من جديد
rm -r node_modules package-lock.json
npm install

# أو استخدم نسخة أقدم من آخر نسخة مستقرة
npm install --legacy-peer-deps
```

---

### س7: Jest يتوقف عند اختبار معين

**الحل:**
```bash
# اختبر ملف واحد فقط لتحديد المشكلة
npm test -- src/components/problematic.test.js

# استخدم --verbose للحصول على معلومات تفصيلية
npm test -- --verbose

# قم بإضافة بطاقة انتظار أطول
npm test -- --testTimeout=30000
```

---

### س8: "Cannot allocate memory" - Node.js نفد الذاكرة

**الحل:**
```bash
# زيادة الذاكرة المتاحة لـ Node
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm start

# أو بشكل دائم في start-optimized.ps1
```

---

### س9: الملفات لا تُحفظ بشكل صحيح في VS Code

**الحل:**
1. تأكد من أن المشروع ليس على OneDrive مباشرة
2. تأكد من أن `.watchmanconfig` موجود
3. أعد تشغيل VS Code
4. استخدم "Reload Window" من Command Palette

---

### س10: أخطاء من Ant Design - "Error: Cannot find module"

**الحل:**
```bash
# تثبيت حزمة rc-resize-observer التي تحتاجها Ant Design
npm install rc-resize-observer --save

# أو إعادة تثبيت كامل
npm install --save antd@latest
```

---

## 🔍 أدوات التشخيص

### 1. التحقق من حجم node_modules
```powershell
$size = (Get-ChildItem node_modules -Recurse | Measure-Object -Property Length -Sum).Sum
"Size: $([math]::round($size / 1GB, 2)) GB"
```

### 2. البحث عن الملفات الكبيرة
```powershell
Get-ChildItem -Recurse | 
  Where-Object {$_.Length -gt 10MB} | 
  Sort-Object Length -Descending | 
  Select-Object -First 10 FullName, @{N="Size(MB)";E={[math]::round($_.Length/1MB,2)}}
```

### 3. التحقق من استهلاك Node.js الفعلي
```bash
# قبل البدء
npm start &
# بعد دقيقة، في terminal آخر
Get-Process node | Select CPU, PagedMemorySize
```

### 4. تحليل سرعة البناء
```bash
npm start -- --verbose
# لاحظ الوقت الذي تستغرقه كل خطوة
```

---

## 🚨 حالات طوارئ

### إذا لم يعمل شيء:

```bash
# الخيار النووي - حذف كل شيء وابدأ من جديد
rm -r node_modules package-lock.json .jest-cache
npm cache clean --force
npm install
npm test -- --passWithNoTests
```

### إذا كانت المشكلة من VS Code:

```bash
# حذف بيانات VS Code المتعلقة بالمشروع
rm -r .vscode/workspace-settings.json
# ثم افتح VS Code مجدداً
```

### إذا كنت تستخدم WSL على Windows:

```bash
# تحقق من أن WSL يستخدم kernel الأخير
wsl --update

# استخدم `--distribution` لتحديد توزيعة معينة
wsl -d Ubuntu npm start
```

---

## ✅ قائمة فحص ما قبل البدء

- [ ] Node.js محدّث (v18+)
- [ ] npm محدّث (v9+)
- [ ] جميع الملفات المذكورة موجودة (.watchmanconfig, jsconfig.json, إلخ)
- [ ] .env مكتمل مع جميع المتغيرات
- [ ] لا توجد عمليات Node معلقة
- [ ] RAM متاح > 2GB
- [ ] Disk Space متاح > 1GB
- [ ] VS Code آخر نسخة

---

## 📞 الحصول على مزيد من المساعدة

إذا استمرت المشاكل:

1. اجمع المعلومات:
```powershell
npm --version
node --version
# انسخ output من build/test
npm test 2>&1 | Out-File test-output.log
```

2. تحقق من السجلات:
```bash
npm start -- --verbose > build.log 2>&1
```

3. جرب في بيئة نظيفة:
```bash
npx create-react-app test-app
cd test-app
npm test
```

---

**أخر تحديث:** 16 فبراير 2026

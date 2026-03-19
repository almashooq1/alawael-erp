# ⚡ خطوات فورية لتحسين أداء VS Code

## 🎯 نفّذ الآن (3 دقائق فقط)

### الخطوة 1️⃣: إعادة تحميل VS Code

```
اضغط: Ctrl + Shift + P
اكتب: Reload Window
اضغط: Enter
```

⏱️ **الوقت**: 10 ثواني

---

### الخطوة 2️⃣: إغلاق جميع الملفات المفتوحة

```
اضغط: Ctrl + K
ثم اضغط: W
```

⏱️ **الوقت**: 5 ثواني

---

### الخطوة 3️⃣: إعادة تشغيل TypeScript Server

```
اضغط: Ctrl + Shift + P
اكتب: TypeScript: Restart TS Server
اضغط: Enter
```

⏱️ **الوقت**: 15 ثانية

---

### الخطوة 4️⃣: تنظيف Cache (اختياري)

افتح PowerShell في Terminal واكتب:

```powershell
# تنظيف TypeScript Cache
if (Test-Path "$env:LOCALAPPDATA\Microsoft\TypeScript") {
    Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Microsoft\TypeScript"
    Write-Host "✅ تم تنظيف TypeScript Cache" -ForegroundColor Green
}

# تنظيف VS Code Cache
if (Test-Path "$env:APPDATA\Code\Cache") {
    Remove-Item -Recurse -Force "$env:APPDATA\Code\Cache\*"
    Write-Host "✅ تم تنظيف VS Code Cache" -ForegroundColor Green
}

Write-Host "✅ اكتمل التنظيف - أعد تشغيل VS Code" -ForegroundColor Cyan
```

⏱️ **الوقت**: 30 ثانية

---

### الخطوة 5️⃣: فحص الإضافات الثقيلة

```
اضغط: Ctrl + Shift + P
اكتب: Developer: Show Running Extensions
اضغط: Enter
```

**عطّل مؤقتاً** الإضافات التي تستهلك الكثير من الموارد:

- GitLens (إذا كان يستهلك أكثر من 100MB)
- Docker
- Remote Development
- Live Share

⏱️ **الوقت**: 1 دقيقة

---

## 📊 التحقق من التحسين

### قبل التنفيذ - سجّل الأداء الحالي:

- [ ] وقت فتح ملف: **\_** ثانية
- [ ] وقت ظهور IntelliSense: **\_** ثانية
- [ ] استهلاك الذاكرة (Task Manager): **\_** MB

### بعد التنفيذ - قارن:

- [ ] وقت فتح ملف: **\_** ثانية
- [ ] وقت ظهور IntelliSense: **\_** ثانية
- [ ] استهلاك الذاكرة (Task Manager): **\_** MB

---

## 🔍 إذا استمر البطء

### خيار A: استخدم Workspace محدد

بدلاً من فتح المجلد الرئيسي:

```
File > Close Workspace
File > Open Folder > اختر مجلد فرعي (مثل: supply-chain-management/backend)
```

### خيار B: تعطيل Git مؤقتاً

في [.vscode/settings.json](.vscode/settings.json) تأكد من:

```json
"git.enabled": false
```

### خيار C: فحص عمليات Node.js

```powershell
Get-Process node | Select-Object CPU, @{Name="Memory(MB)";Expression={$_.WorkingSet / 1MB}}, ProcessName | Format-Table
```

---

## ✅ ما تم تطبيقه تلقائياً

تم تحديث الإعدادات التالية:

### في [.vscode/settings.json](.vscode/settings.json):

- ✅ زيادة ذاكرة TypeScript إلى 4GB
- ✅ تعطيل Minimap
- ✅ تقليل عدد الاقتراحات
- ✅ استثناء مجلدات node_modules من المراقبة
- ✅ تحديد عدد الملفات المفتوحة (10 فقط)
- ✅ تحسين إعدادات البحث
- ✅ تعطيل ميزات ثقيلة

### في [tsconfig.json](tsconfig.json):

- ✅ استثناء مجلدات كبيرة من الفهرسة
- ✅ استثناء archive و intelligent-agent

---

## 🚀 النتيجة المتوقعة

### تحسين الأداء بنسبة:

- 🎯 **سرعة الفتح**: 50-70% أسرع
- 🎯 **استهلاك الذاكرة**: 30-50% أقل
- 🎯 **IntelliSense**: 60-80% أسرع

### إذا لم تلاحظ تحسناً:

راجع [الدليل الكامل](00_VSCODE_PERFORMANCE_GUIDE_AR.md) للحلول المتقدمة.

---

## 📞 تواصل

إذا استمرت المشاكل، يمكن:

1. إعادة تثبيت VS Code
2. تحديث Node.js
3. فحص مشاكل النظام (Antivirus، Disk Space)

---

**تحديث أخير:** مارس 1, 2026
**الحالة:** ✅ مطبق تلقائياً

# 🚀 دليل تحسين أداء VS Code للمشاريع الكبيرة

## تاريخ: مارس 1, 2026

---

## ✅ التحسينات التي تم تطبيقها تلقائياً

### 1. إعدادات TypeScript/JavaScript

- ✓ زيادة الذاكرة المخصصة للـ TypeScript Server إلى 4GB
- ✓ تحسين إعدادات المراقبة (Watch Options)
- ✓ تعطيل الميزات الثقيلة (CodeLens، Auto Import Update)
- ✓ استثناء المجلدات الكبيرة من الفهرسة

### 2. إعدادات المحرر (Editor)

- ✓ تعطيل Parameter Hints
- ✓ تقليل عدد الاقتراحات المعروضة
- ✓ تعطيل Minimap
- ✓ تحديد عدد الملفات المفتوحة (10 فقط)

### 3. استثناءات الملفات والمجلدات

- ✓ استثناء جميع مجلدات `node_modules`
- ✓ استثناء مجلدات البناء (`dist`, `build`, `coverage`)
- ✓ استثناء ملفات الـ Map والـ Log
- ✓ استثناء مجلدات Terraform و Git

### 4. تحسينات البحث

- ✓ تحديد نتائج البحث بـ 5000 نتيجة
- ✓ تعطيل متابعة الروابط الرمزية
- ✓ تحسين الكاش للبحث السريع

---

## 🔧 إجراءات إضافية يدوية موصى بها

### 1. إعادة تحميل VS Code

```
اضغط Ctrl+Shift+P ثم اكتب "Reload Window" واضغط Enter
```

### 2. تنظيف ذاكرة التخزين المؤقت لـ TypeScript

```powershell
# في Terminal
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Microsoft\TypeScript"
```

### 3. تعطيل الإضافات الثقيلة

افتح قائمة الإضافات (Ctrl+Shift+X) وعطّل:

- ❌ GitLens (مؤقتاً)
- ❌ Live Share
- ❌ Remote Development (إذا لم تكن تستخدمها)
- ❌ Docker (إذا لم تكن تستخدمها)
- ❌ ESLint (مؤقتاً إذا كان يسبب بطء)

### 4. إغلاق الملفات غير المستخدمة

```
اضغط Ctrl+K ثم W لإغلاق جميع الملفات المفتوحة
```

### 5. استخدام Multi-root Workspace

بدلاً من فتح المجلد الرئيسي بالكامل، افتح فقط المجلدات التي تعمل عليها:

1. File > Add Folder to Workspace
2. اختر المجلد المحدد (مثلاً: `supply-chain-management/backend`)
3. احفظ Workspace (File > Save Workspace As)

---

## 📊 مراقبة استهلاك الموارد

### فحص العمليات النشطة

1. اضغط `Ctrl+Shift+P`
2. اكتب `Developer: Show Running Extensions`
3. تحقق من الإضافات التي تستهلك CPU/Memory

### عرض أداء VS Code

```
Help > Toggle Developer Tools > Performance Monitor
```

---

## 🎯 نصائح للعمل على المشاريع الكبيرة

### 1. العمل على أجزاء محددة

- افتح فقط المجلد الذي تعمل عليه
- استخدم `code path/to/specific/folder` من Terminal

### 2. استخدام .gitignore بشكل فعّال

تأكد من أن `.gitignore` يتضمن:

```gitignore
node_modules/
dist/
build/
coverage/
*.map
*.log
.DS_Store
```

### 3. تقسيم المهام

- لا تفتح أكثر من 10 ملفات في نفس الوقت
- استخدم Quick Open (Ctrl+P) بدلاً من Explorer

### 4. إيقاف Auto Save المؤقت

```json
"files.autoSave": "off"
```

---

## 🔍 تشخيص المشاكل

### إذا استمر البطء، جرب:

#### 1. فحص Node.js Memory

```powershell
# تحقق من استهلاك TypeScript Server
Get-Process -Name node | Select-Object CPU,WorkingSet,ProcessName
```

#### 2. زيادة ذاكرة Node.js

أضف إلى `~/.bashrc` أو Environment Variables:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### 3. تعطيل Git مؤقتاً

```json
"git.enabled": false
```

#### 4. Restart TypeScript Server

```
Ctrl+Shift+P > TypeScript: Restart TS Server
```

---

## ⚡ الإعدادات الاحترافية للسرعة القصوى

إذا كنت بحاجة لأقصى سرعة وتريد التضحية ببعض الميزات:

```json
{
  // تعطيل كامل لـ IntelliSense
  "editor.quickSuggestions": false,
  "editor.parameterHints.enabled": false,
  "editor.suggestOnTriggerCharacters": false,

  // تعطيل Error Checking
  "typescript.validate.enable": false,
  "javascript.validate.enable": false,

  // حد أدنى من الميزات
  "editor.minimap.enabled": false,
  "editor.lightbulb.enabled": false,
  "breadcrumbs.enabled": false
}
```

---

## 📈 مقارنة الأداء

### قبل التحسين:

- ⏱️ وقت فتح المشروع: 15-30 ثانية
- 💾 استهلاك الذاكرة: 2-4 GB
- 🔄 تأخير IntelliSense: 2-5 ثواني

### بعد التحسين المتوقع:

- ⏱️ وقت فتح المشروع: 5-10 ثواني
- 💾 استهلاك الذاكرة: 1-2 GB
- 🔄 تأخير IntelliSense: <1 ثانية

---

## 🆘 الدعم الفني

إذا استمرت المشاكل، جرب:

1. **إعادة تثبيت VS Code**

   ```powershell
   winget uninstall Microsoft.VisualStudioCode
   winget install Microsoft.VisualStudioCode
   ```

2. **حذف ملفات التكوين**

   ```powershell
   Remove-Item -Recurse "$env:APPDATA\Code" -Force
   ```

3. **تحديث Node.js و npm**
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```

---

## 📝 ملاحظات مهمة

⚠️ **تحذير**: بعض التحسينات تعطل ميزات مفيدة. إذا احتجت لميزة معينة، يمكنك تفعيلها مؤقتاً.

✅ **التوصية**: استخدم Multi-root Workspace للعمل على أجزاء محددة من المشروع بدلاً من فتح المشروع بالكامل.

💡 **نصيحة**: قم بإعادة تحميل VS Code بعد كل تغيير في الإعدادات (`Ctrl+Shift+P > Reload Window`).

---

## 🔗 مصادر إضافية

- [VS Code Performance Tips](https://code.visualstudio.com/docs/setup/setup-overview#_performance)
- [TypeScript Performance](https://github.com/microsoft/TypeScript/wiki/Performance)
- [VS Code Extension API](https://code.visualstudio.com/api)

---

**تم إنشاء هذا الدليل في:** مارس 1, 2026
**إصدار VS Code الموصى به:** 1.85.0+
**إصدار Node.js الموصى به:** 18.x LTS أو أحدث

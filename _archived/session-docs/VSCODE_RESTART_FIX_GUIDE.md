# 🔧 دليل حل مشكلة إعادة التشغيل المتكررة في VS Code

## 📋 المشكلة

VS Code يتعطل أو ينغلق بشكل متكرر دون سبب واضح.

---

## 🎯 الحلول السريعة

### ✅ الحل 1: تشغيل السكريبت الذاتي (الأسهل)

#### على Windows (PowerShell):
```powershell
# تشغيل السكريبت
.\fix-vscode-restart-issue.ps1

# أو قم بنسخ اللأمر التالي مباشرة في PowerShell:
$VSCodePath = "$env:APPDATA\Code"
Remove-Item "$VSCodePath\logs" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$VSCodePath\.cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$VSCodePath\User\workspaceStorage" -Recurse -Force -ErrorAction SilentlyContinue
```

#### على macOS/Linux:
```bash
./fix-vscode-restart-issue.sh
```

---

### ✅ الحل 2: الخطوات اليدوية

#### الخطوة 1: إغلاق VS Code
```
1. أغلق VS Code تماماً
2. تأكد من عدم وجود أي نافذة VS Code في الخلفية
```

#### الخطوة 2: حذف ملفات المشكلة

**على Windows:**
```powershell
# الطرية السريعة:
rmdir "$env:APPDATA\Code\logs" /s /q 2>nul
rmdir "$env:APPDATA\Code\.cache" /s /q 2>nul
rmdir "$env:APPDATA\Code\User\workspaceStorage" /s /q 2>nul

# أو اليدوية:
# 1. اذهب إلى: C:\Users\YourUsername\AppData\Roaming\Code
# 2. احذف المجلدات التالية:
#    - logs/
#    - .cache/
#    - User/workspaceStorage/
```

**على macOS:**
```bash
rm -rf ~/Library/Application\ Support/Code/logs
rm -rf ~/Library/Application\ Support/Code/.cache
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage
```

**على Linux:**
```bash
rm -rf ~/.config/Code/logs
rm -rf ~/.config/Code/.cache
rm -rf ~/.config/Code/User/workspaceStorage
```

#### الخطوة 3: إعادة فتح VS Code
```
1. افتح VS Code مجدداً
2. دع البرنامج يحمل الإعدادات الجديدة
3. جرّب المشروع
```

---

## 🔍 الأسباب المحتملة

### 1️⃣ **ملفات مؤقتة فاسدة**
- السبب: ملفات logs أو cache قديمة
- الحل: حذف المجلدات المؤقتة

### 2️⃣ **إضافات مشكوك فيها**
- السبب: إضافة تتسبب في تعطل
- الحل: حذف الإضافات والبدء من جديد

### 3️⃣ **مشاكل في TypeScript Server**
- السبب: استهلاك عالي للذاكرة
- الحل: تحديث إعدادات TypeScript

### 4️⃣ **مشاكل في Node Modules**
- السبب: ملفات متضررة في node_modules
- الحل: إعادة تثبيت node_modules

### 5️⃣ **تحديثات VS Code غير مكتملة**
- السبب: تحديث لم يكتمل بشكل سليم
- الحل: إعادة تثبيت VS Code كاملاً

---

## 🚀 الحلول المتقدمة

### إذا لم تنجح الحول البسيطة:

#### 1. إزالة جميع الإضافات
```bash
# Windows:
rmdir "%APPDATA%\Code\User\extensions" /s /q

# macOS/Linux:
rm -rf ~/Library/Application\ Support/Code/User/extensions
```

#### 2. إعادة تثبيت Node Modules
```bash
cd your-project
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

#### 3. إعادة تثبيت VS Code كاملاً
```powershell
# Windows:
$VSCodePath = "$env:APPDATA\Code"
rmdir $VSCodePath /s /q

# ثم أعد تثبيت VS Code من:
# https://code.visualstudio.com/Download
```

#### 4. فحص الملفات المتضررة
```bash
# فحص ملفات النظام (Windows):
sfc /scannow

# بحث عن بكتيريا أو برامج ضارة
```

---

## 📊 ملف الإعدادات المحسّن

### إذا لم تنجح الحلول الأخرى، استخدم الإعدادات المحسّنة:

```json
{
  "editor.enablePreview": false,
  "editor.maxTokenizationLineLength": 2000,
  "editor.largeFileOptimizations": true,
  "files.watcherExclude": {
    "**/.git": true,
    "**/node_modules/**": true,
    "**/dist": true,
    "**/build": true,
    "**/.vscode": true
  },
  "extensions.verifySignature": false,
  "telemetry.enableTelemetry": false,
  "telemetry.enableCrashReporter": false,
  "typescript.tsserver.maxTsServerMemory": 3072,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "editor.formatOnSave": false,
  "files.maxSize": 20971520,
  "search.maxResults": 5000,
  "update.enableWindowsBackgroundUpdates": false,
  "update.mode": "manual"
}
```

---

## 🐞 فحص السجلات

### موقع ملفات السجلات:

**Windows:**
```
C:\Users\YourUsername\AppData\Roaming\Code\logs\
```

**macOS:**
```
~/Library/Application Support/Code/logs/
```

**Linux:**
```
~/.config/Code/logs/
```

### كيفية فحص السجلات:
```bash
# افتح أحدث ملف log
# ابحث عن كلمات مفتاحية:
# - "ERROR"
# - "FATAL"
# - "extensionHost"
# - "crash"
```

---

## ✅ قائمة التحقق

قبل طلب الدعم، تحقق من:

- [ ] تم تشغيل السكريبت الإصلاح
- [ ] تم إغلاق VS Code تماماً
- [ ] تم حذف ملفات logs و cache و workspaceStorage
- [ ] تم إعادة فتح VS Code
- [ ] تم تثبيت node_modules من جديد
- [ ] تم استخدام الإعدادات المحسّنة
- [ ] تم فحص ملفات السجلات للأخطاء

---

## 🆘 عندما تطلب الدعم

قدم المعلومات التالية:

1. **نسخة VS Code**: `Help > About (نسخة رقم)`
2. **نسخة Node.js**: `node --version`
3. **نظام التشغيل**: Windows/macOS/Linux
4. **آخر رسالة خطأ**: من ملفات السجلات
5. **ملفات السجلات**: من `C:\Users\YourUsername\AppData\Roaming\Code\logs\`
6. **قائمة الإضافات**: اء `Extensions > Show Built-in Extensions`

---

## 📞 طلب الدعم

إذا استمرت المشكلة:

- 📧 **البريد**: support@alawael.com
- 💬 **Discord**: https://discord.gg/alawael
- 🐙 **GitHub**: https://github.com/almashooq1/alawael-erp/issues
- 📱 **Telegram**: @alawael_support

---

## 💡 نصائح للوقاية

### تجنب المشاكل المستقبلية:

1. ✅ **حدّث VS Code بشكل منتظم**
   ```
   Help > Check for Updates
   ```

2. ✅ **استخدم الإضافات الموثوقة فقط**
   - ESLint
   - Prettier
   - GitLens
   - Thunder Client
   - REST Client

3. ✅ **نظّف البيانات المؤقتة شهرياً**
   ```bash
   # Windows
   rmdir "%APPDATA%\Code\User\workspaceStorage" /s /q
   ```

4. ✅ **راقب استهلاك الذاكرة**
   - افتح: Task Manager (Ctrl+Shift+Esc)
   - ابحث عن: Code.exe
   - تحقق من الذاكرة المستخدمة

5. ✅ **استخدم ملفات محدثة**
   - حافظ على package.json محدثة
   - استخدم --legacy-peer-deps عند الحاجة

---

## 🔄 خطوات البدء من الصفر (Nuclear Option)

إذا فشل كل شيء:

```powershell
# 1. إغلاق VS Code تماماً
# (انتظر 10 ثواني)

# 2. حذف كل شيء (Windows):
$VSCodeAppData = "$env:APPDATA\Code"
$VSCodeLocal = "$env:LocalAppData\Code"
rmdir $VSCodeAppData /s /q -ErrorAction SilentlyContinue
rmdir $VSCodeLocal /s /q -ErrorAction SilentlyContinue

# 3. أعد تثبيت VS Code من:
# https://code.visualstudio.com/Download

# 4. لا تثبت إضافات قديمة
```

---

**آخر تحديث**: مارس 1, 2026

> 💡 **نصيحة**: معظم مشاكل إعادة التشغيل تُحل بتشغيل السكريبت الإصلاح!

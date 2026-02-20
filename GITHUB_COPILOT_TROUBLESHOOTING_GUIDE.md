# دليل حل مشاكل GitHub Copilot على VS Code

## المشاكل الشائعة والحلول

### 1. Copilot لا يعمل أو لا يظهر الاقتراحات

#### الحل:
```powershell
# أ) إعادة تحميل VS Code
- اضغط Ctrl+Shift+P
- اختر "Developer: Reload Window"

# ب) تحديث الإضافات
- قم بفتح Extensions (Ctrl+Shift+X)
- ابحث عن "GitHub Copilot"
- تأكد من أنه محدّث للإصدار الأخير
```

### 2. مشاكل المصادقة (Authentication)

#### الحل:
```powershell
# أ) تسجيل الخروج وإعادة تسجيل الدخول
- اضغط Ctrl+Shift+P
- ابحث عن "GitHub Copilot: Sign Out"
- بعدها: "GitHub Copilot: Sign In"

# ب) حذف بيانات المصادقة المخزنة
Remove-Item "$env:APPDATA\Code\User\globalStorage\GitHub.copilot" -Force -Recurse
```

### 3. بطء أو تأخر في الاقتراحات

#### الحل:
```json
// في settings.json (Ctrl+,)
{
  "github.copilot.advanced": {
    "debug.overrideEngine": "gpt-4",
    "length.up": 8000,
    "length.down": 250
  },
  "github.copilot.autocomplete.enable": true
}
```

### 4. عدم توفر Copilot في ملفات معينة

#### الحل:
```json
// تأكد من أن نوع الملف مدعوم في settings.json
{
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": false
  }
}
```

### 5. مشاكل الوكيل/البروكسي (Proxy Issues)

#### الحل:
```powershell
# تحديد إعدادات البروكسي
# في settings.json:
{
  "http.proxy": "http://your-proxy:port",
  "http.proxyStrictSSL": false
}
```

### 6. مشاكل الأداء العامة

#### الحل:
```powershell
# أ) تعطيل الإضافات غير الضرورية
- افتح Extensions
- عطّل أي إضافات غير مستخدمة

# ب) تنظيف ذاكرة التخزين المؤقت
Remove-Item "$env:APPDATA\Code\Cache" -Force -Recurse

# ج) إعادة تثبيت Copilot
# في VS Code:
- حذف GitHub Copilot من Extensions
- أغلق VS Code
- افتح من جديد
- أعد تثبيت GitHub Copilot
```

### 7. مشاكل تثبيت الإضافات

#### إذا لم يتم التثبيت بنجاح:
```powershell
# قم بتنظيف المجلدات وإعادة التثبيت
$extensionPath = "$env:USERPROFILE\.vscode\extensions"
Get-ChildItem $extensionPath -Filter "*copilot*" | Remove-Item -Force -Recurse

# ثم أعد تثبيت من VS Code marketplace
```

## الخطوات التشخيصية

### فحص سجلات الأخطاء:
```powershell
# اضغط Ctrl+Shift+U لفتح Output
# في القائمة، اختر "GitHub Copilot"
# افحص رسائل الخطأ
```

### تفعيل وضع Debug:
```json
{
  "github.copilot.advanced": {
    "listDebounceMS": 0,
    "parsePythonSemantic": false,
    "skippyEnabled": true
  }
}
```

## الأوامر المفيدة

| الأمر | الوصف |
|------|-------|
| GitHub Copilot: Open in Sidebar | فتح Copilot في الشريط الجانبي |
| GitHub Copilot: Sign Out | تسجيل الخروج |
| GitHub Copilot: Sign In | تسجيل الدخول |
| Developer: Reload Window | إعادة تحميل النافذة |
| Developer: Open Extension Logs | فتح سجلات الإضافات |

## متطلبات النظام

- **VS Code**: الإصدار 1.85.0 أو أحدث
- **Node.js**: الإصدار 16 أو أحدث
- **اتصال إنترنت**: مستقر وموثوق
- **حساب GitHub**: مفعّل وله صلاحيات Copilot

## خطوات إضافية

### إذا استمرت المشاكل:

1. **فتح VS Code بوضع الأمان الكامل**:
   ```powershell
   code --disable-extensions
   ```

2. **حذف جميع الإعدادات وإعادة التثبيت**:
   ```powershell
   Remove-Item "$env:APPDATA\Code" -Force -Recurse
   # ثم أعدِ فتح VS Code
   ```

3. **التحقق من الإنترنت والتوقيع**:
   - تأكد من اتصال الإنترنت
   - تحقق من تسجيل الدخول لـ GitHub

4. **الاتصال بـ GitHub Support**:
   - زر: https://docs.github.com/en/copilot/troubleshooting-github-copilot

---

**تُحدَّث**: فبراير 20, 2026

# 🚀 حل سريع 60 ثانية لمشاكل GitHub Copilot

## اختر مشكلتك:

### 1️⃣ **لا يعمل بعد التثبيت** (2 دقيقة)
```
► Ctrl+Shift+X → GitHub Copilot → Install
► Ctrl+Shift+P → GitHub Copilot: Sign In
► متابعة تسجيل الدخول
► أعد فتح VS Code
✓ جاهز!
```

### 2️⃣ **لا يظهر اقتراح** (3 دقائق)
```
► افتح ملف .js أو .py
► اكتب: // دالة تضيف الأرقام
► Enter
► إذا لا شيء يظهر:
  - Ctrl+Shift+P → Reload Window
  - Ctrl+Shift+P → Sign Out → Sign In
✓ حاول مجدداً
```

### 3️⃣ **بطيء جداً** (3 دقائق)
```
► Ctrl+Shift+X → عطّل الإضافات غير المستخدمة
► Ctrl+Shift+P → Settings (JSON)
► أضف:
  "files.watcherExclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/dist": true
  }
► أعد التحميل
✓ أسرع!
```

### 4️⃣ **خطأ في المصادقة** (2 دقيقة)
```
► Ctrl+Shift+P → GitHub Copilot: Sign Out
► Ctrl+Shift+P → GitHub Copilot: Sign In
► انتظر 30 ثانية
✓ هكذا يعمل!
```

### 5️⃣ **عطل شامل** (15 دقيقة)
```powershell
# في PowerShell (كمسؤول):
Remove-Item "$env:USERPROFILE\.vscode\extensions\github.copilot*" -Force -Recurse
Remove-Item "$env:APPDATA\Code\User\globalStorage\GitHub.copilot" -Force -Recurse
Remove-Item "$env:APPDATA\Code\Cache" -Force -Recurse

# ثم:
# 1. افتح VS Code
# 2. Ctrl+Shift+X → GitHub Copilot → Install
# 3. Ctrl+Shift+P → Sign In
4. انتظر دقيقة
✓ كما هو جديد!
```

---

## 🆘 لا يزال لا يعمل؟

```
1. تحقق من الاشتراك:
   → https://github.com/settings/copilot
   
2. تأكد من الإنترنت موصول

3. أغلق VPN إن كانت مفعلة

4. انتظر دقيقة قبل المحاولة

5. افتح Issue على GitHub:
   → github.com/github/copilot-docs/issues
```

---

## ⚡ ملفات مساعدة في المشروع

| الملف | الوصف |
|------|-------|
| `COPILOT_SOLUTION_CENTER.md` | مركز حل المشاكل الشامل |
| `QUICK_FIX_GUIDE.md` | حلول سريعة لكل مشكلة |
| `COPILOT_USAGE_TIPS.md` | نصائح الاستخدام الفعال |
| `recommended_settings.json` | إعدادات موصى بها |
| `fix_copilot.ps1` | سكريبت إصلاح تلقائي |

---

**آخر تحديث**: فبراير 20, 2026

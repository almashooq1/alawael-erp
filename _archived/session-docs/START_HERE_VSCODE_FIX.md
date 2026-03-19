# ⚡ الحل السريع لمشاكل VS Code

## 🎯 ثلاث خطوات فقط:

### 1️⃣ شغّل السكريبت

```powershell
.\apply-vscode-fix.ps1
```

### 2️⃣ أغلق VS Code كاملاً

### 3️⃣ افتح VS Code مرة أخرى

---

## ✅ ماذا سيحدث؟

- ❌ لا **Git errors**
- ❌ لا **Extension crashes**
- ✅ VS Code **أسرع**
- ✅ استهلاك **أقل للذاكرة**
- ✅ بدء **أسرع**

---

## 📖 لمزيد من التفاصيل

اقرأ: **VSCODE_FIX_COMPLETE_AR.md**

---

## 🔄 للعودة للإعدادات القديمة

```powershell
# ستجد النسخة الاحتياطية في
.vscode\settings.json.backup-YYYYMMDD-HHMMSS

# للعودة:
Copy-Item ".vscode\settings.json.backup-*" ".vscode\settings.json" -Force
```

---

## 🆘 إذا استمرت المشكلة

1. أرسل الملف: `cleanup-report-*.txt`
2. شغّل Extension Bisect في VS Code:
   - `Ctrl+Shift+P`
   - ابحث عن: "Start Extension Bisect"

---

**آخر تحديث**: 1 مارس 2026
✅ **جاهز للتطبيق الآن!**

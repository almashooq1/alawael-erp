# 🚨 دليل استرداد الطوارئ لمشكلة PowerShell
# PowerShell Emergency Recovery Guide

**التاريخ**: 20 فبراير 2026  
**الحالة**: حل جذري ونهائي  
**الوقت المطلوب**: 3-5 دقائق

---

## 📋 المحتويات | Contents

1. [الحل السريع](#-الحل-السريع)
2. [الأسباب الجذرية](#-الأسباب-الجذرية)
3. [خطوات الإصلاح اليدوي](#-خطوات-الإصلاح-اليدوي)
4. [الحلول البديلة](#-الحلول-البديلة)
5. [الإعدادات المُحسَّنة](#-الإعدادات-المُحسَّنة)
6. [الأسئلة الشائعة](#-الأسئلة-الشائعة)

---

## ⚡ الحل السريع

### الطريقة 1: تشغيل السكريبت التلقائي

```batch
# انقر مرتين على هذا الملف:
FIX_POWERSHELL_NOW.bat
```

### الطريقة 2: التشغيل اليدوي

1. افتح PowerShell كمسؤول
2. شغّل الأمر التالي:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
& "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\POWERSHELL_RADICAL_FIX.ps1"
```

---

## 🔍 الأسباب الجذرية

### لماذا يتجمد PowerShell؟

| السبب | التفسير | الحل |
|-------|---------|------|
| **إصدار الإضافة غير مستقر** | PowerShell Extension v2025.4.0 يحتوي على أخطاء | ترقية أو تخفيض الإصدار |
| **مسار يحتوي على أحرف عربية** | "المستندات" يسبب مشاكل في الترميز | استخدام مسار إنجليزي |
| **تحميل وحدات تلقائي** | PSModuleAutoLoading يسبب تعارضات | تعطيل التحميل التلقائي |
| **ذاكرة تخزين مؤقت تالفة** | Cache فارغ أو تالف | مسح الـ Cache |
| **ملف profile معقد** | تحميل وحدات كثيرة عند البدء | ملف profile مبسط |

---

## 🔧 خطوات الإصلاح اليدوي

### الخطوة 1: إغلاق VS Code بالكامل

```powershell
# أغلق جميع عمليات VS Code
Stop-Process -Name "Code" -Force -ErrorAction SilentlyContinue
```

### الخطوة 2: مسح ذاكرة التخزين المؤقت

```powershell
# مسح جميع ملفات Cache
$cachePaths = @(
    "$env:APPDATA\Code\Cache",
    "$env:APPDATA\Code\CachedData",
    "$env:APPDATA\Code\GPUCache"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}
```

### الخطوة 3: إزالة إضافة PowerShell

```powershell
# إزالة الإضافة المشكلة
$extPath = "$env:USERPROFILE\.vscode\extensions"
Get-ChildItem -Path $extPath -Directory -Filter "*powershell*" | 
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
```

### الخطوة 4: إنشاء ملف Profile آمن

```powershell
# إنشاء المجلد
$profileDir = "C:\Users\$env:USERNAME\Documents\PowerShell"
New-Item -ItemType Directory -Path $profileDir -Force | Out-Null

# محتوى ملف Profile
$content = @'
$env:PSModuleAutoLoadingPreference = 'ModuleQualified'
Set-Alias -Name grep -Value Select-String -Force -ErrorAction SilentlyContinue
Write-Host "✓ PowerShell Ready" -ForegroundColor Green
'@

# حفظ الملف
Set-Content -Path "$profileDir\profile.ps1" -Value $content -Encoding UTF8 -Force
```

### الخطوة 5: تحديث إعدادات VS Code

```powershell
# فتح إعدادات VS Code
code $env:APPDATA\Code\User\settings.json
```

أضف هذه الإعدادات:
```json
{
    "powershell.scriptAnalysis.enable": false,
    "powershell.codeLens.enable": false,
    "powershell.startAutomaticallyOnOpen": false,
    "powershell.integratedConsole.showOnStartup": false,
    "terminal.integrated.defaultProfile.windows": "PowerShell"
}
```

### الخطوة 6: إعادة تثبيت الإضافة

1. افتح VS Code

# GitHub Copilot Troubleshooting & Repair Script
# العربية: سكريبت إصلاح مشاكل GitHub Copilot

Write-Host "================================" -ForegroundColor Cyan
Write-Host "GitHub Copilot Troubleshooting" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. تحديد نسخة VS Code
Write-Host "[1/5] التحقق من إصدار VS Code..." -ForegroundColor Yellow
$vsCodeVersion = code --version 2>$null | Select-Object -First 1
if ($vsCodeVersion) {
    Write-Host "✓ الإصدار: $vsCodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ VS Code غير مثبت أو غير في PATH" -ForegroundColor Red
}

Write-Host ""

# 2. التحقق من الإضافات المثبتة
Write-Host "[2/5] فحص إضافات GitHub Copilot..." -ForegroundColor Yellow
$copilotExtensions = code --list-extensions 2>$null | Select-String -Pattern "copilot"
if ($copilotExtensions) {
    Write-Host "✓ الإضافات المكتشفة:" -ForegroundColor Green
    $copilotExtensions | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }
} else {
    Write-Host "✗ لم يتم العثور على إضافات Copilot" -ForegroundColor Red
    Write-Host "  نصيحة: قم بتثبيت 'GitHub Copilot' من VS Code Marketplace" -ForegroundColor Yellow
}

Write-Host ""

# 3. فحص الملفات والمجلدات المهمة
Write-Host "[3/5] فحص مجلدات التكوين..." -ForegroundColor Yellow
$appDataPath = "$env:APPDATA\Code"
$extensionsPath = "$env:USERPROFILE\.vscode\extensions"

if (Test-Path $appDataPath) {
    Write-Host "✓ مجلد VS Code موجود" -ForegroundColor Green
} else {
    Write-Host "✗ مجلد VS Code غير موجود" -ForegroundColor Red
}

if (Test-Path $extensionsPath) {
    $copilotExt = Get-ChildItem $extensionsPath -Filter "*copilot*" -ErrorAction SilentlyContinue
    if ($copilotExt) {
        Write-Host "✓ مجلدات Copilot الموجودة:" -ForegroundColor Green
        $copilotExt | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Cyan }
    } else {
        Write-Host "! لم يتم العثور على مجلدات Copilot محلية" -ForegroundColor Yellow
    }
} else {
    Write-Host "! مجلد Extensions غير موجود" -ForegroundColor Yellow
}

Write-Host ""

# 4. عرض الخيارات المتاحة
Write-Host "[4/5] خيارات الإصلاح المتاحة:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1) إعادة تحميل VS Code" -ForegroundColor Cyan
Write-Host "2) تنظيف ذاكرة التخزين المؤقت" -ForegroundColor Cyan
Write-Host "3) حذف وإعادة تثبيت Copilot" -ForegroundColor Cyan
Write-Host "4) عرض الإعدادات الموصى بها" -ForegroundColor Cyan
Write-Host "5) تشغيل جميع الفحوصات والإصلاحات" -ForegroundColor Cyan
Write-Host "6) الخروج" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "اختر رقم الخيار (1-6)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "إعادة تحميل VS Code..." -ForegroundColor Yellow
        Write-Host "الخطوات:" -ForegroundColor Cyan
        Write-Host "1. اضغط Ctrl+Shift+P في VS Code" -ForegroundColor White
        Write-Host "2. اكتب: Developer: Reload Window" -ForegroundColor White
        Write-Host "3. اضغط Enter" -ForegroundColor White
    }
    
    "2" {
        Write-Host ""
        Write-Host "تنظيف ذاكرة التخزين المؤقت..." -ForegroundColor Yellow
        
        $cachePath = "$env:APPDATA\Code\Cache"
        if (Test-Path $cachePath) {
            try {
                Remove-Item $cachePath -Force -Recurse -ErrorAction Stop
                Write-Host "✓ تم تنظيف الذاكرة المؤقتة بنجاح" -ForegroundColor Green
            } catch {
                Write-Host "✗ خطأ: قد يكون VS Code قيد التشغيل. أغلقه أولاً." -ForegroundColor Red
            }
        } else {
            Write-Host "! مجلد الذاكرة المؤقتة غير موجود" -ForegroundColor Yellow
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "حذف وإعادة تثبيت Copilot..." -ForegroundColor Yellow
        
        # Check if VS Code is running
        $vsCodeRunning = Get-Process code -ErrorAction SilentlyContinue
        if ($vsCodeRunning) {
            Write-Host "✗ خطأ: VS Code قيد التشغيل. يرجى إغلاق VS Code أولاً." -ForegroundColor Red
            Write-Host "اضغط على Ctrl+Q في VS Code أو أغلقه من Task Manager" -ForegroundColor Yellow
        } else {
            try {
                $extensionPath = "$env:USERPROFILE\.vscode\extensions"
                Get-ChildItem $extensionPath -Filter "*copilot*" -ErrorAction SilentlyContinue |
                    Remove-Item -Force -Recurse -ErrorAction Stop
                Write-Host "✓ تم حذف إضافات Copilot" -ForegroundColor Green
                Write-Host "الخطوة التالية:" -ForegroundColor Cyan
                Write-Host "1. افتح VS Code" -ForegroundColor White
                Write-Host "2. اذهب إلى Extensions (Ctrl+Shift+X)" -ForegroundColor White
                Write-Host "3. ابحث عن 'GitHub Copilot'" -ForegroundColor White
                Write-Host "4. اضغط 'Install'" -ForegroundColor White
            } catch {
                Write-Host "✗ خطأ أثناء الحذف: $_" -ForegroundColor Red
            }
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "الإعدادات الموصى بها:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "أضف هذا إلى settings.json (Ctrl+Shift+P > Preferences: Open Settings JSON):" -ForegroundColor Cyan
        Write-Host ""
        Write-Host '{
  "github.copilot.enable": {
    "*": true,
    "yaml": false,
    "plaintext": false
  },
  "github.copilot.autocomplete.enable": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }
}' -ForegroundColor Green
    }
    
    "5" {
        Write-Host ""
        Write-Host "تشغيل جميع الفحوصات والإصلاحات..." -ForegroundColor Yellow
        
        # Clean cache
        Write-Host ""
        Write-Host "▶ تنظيف الذاكرة المؤقتة..." -ForegroundColor Cyan
        $cachePath = "$env:APPDATA\Code\Cache"
        if (Test-Path $cachePath) {
            try {
                Remove-Item $cachePath -Force -Recurse -ErrorAction Stop
                Write-Host "✓ تم التنظيف" -ForegroundColor Green
            } catch {
                Write-Host "! تخطي: VS Code قد يكون قيد التشغيل" -ForegroundColor Yellow
            }
        }
        
        # Verify extensions
        Write-Host ""
        Write-Host "▶ التحقق من الإضافات..." -ForegroundColor Cyan
        $copilotExt = code --list-extensions 2>$null | Select-String -Pattern "copilot"
        if ($copilotExt) {
            Write-Host "✓ إضافات Copilot موجودة" -ForegroundColor Green
        } else {
            Write-Host "! لم يتم العثور على إضافات Copilot" -ForegroundColor Yellow
        }
        
        # Summary
        Write-Host ""
        Write-Host "================================" -ForegroundColor Green
        Write-Host "ملخص الفحص:" -ForegroundColor Green
        Write-Host "================================" -ForegroundColor Green
        Write-Host "✓ تم فحص جميع المكونات" -ForegroundColor Green
        Write-Host "✓ تم تنظيف الذاكرة المؤقتة (إن أمكن)" -ForegroundColor Green
        Write-Host ""
        Write-Host "الخطوة التالية:" -ForegroundColor Yellow
        Write-Host "1. أغلق VS Code تماماً" -ForegroundColor White
        Write-Host "2. أعد فتح VS Code" -ForegroundColor White
        Write-Host "3. قم بتسجيل الدخول إلى GitHub إذا لزم الأمر" -ForegroundColor White
    }
    
    "6" {
        Write-Host ""
        Write-Host "الخروج..." -ForegroundColor Yellow
        exit
    }
    
    default {
        Write-Host ""
        Write-Host "✗ اختيار غير صحيح" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "انتهى السكريبت" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

#!/usr/bin/env pwsh
<#
.SYNOPSIS
    نصيحة البدء السريع - تشغيل المشروع الكامل
    
.DESCRIPTION
    يقوم هذا السكريبت بتشغيل المشروع كاملاً مع التحقق من المتطلبات
    
.EXAMPLE
    .\🚀_QUICK_START.ps1
#>

# الألوان
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

Write-Host "$Cyan" -NoNewline
Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                  🚀 البدء السريع للمشروع 🚀                   ║
║            Advanced Management System v2.1.0                   ║
║                    مشروع الإدارة المتقدم                       ║
╚════════════════════════════════════════════════════════════════╝
"@
Write-Host "$Reset"

# التحقق من المتطلبات
Write-Host "$Yellow`n📋 التحقق من المتطلبات...`n$Reset"

# 1. فحص Node.js
Write-Host "$Cyan▶ فحص Node.js$Reset"
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node -v
    Write-Host "$Green  ✅ Node.js $nodeVersion موجود$Reset"
}
else {
    Write-Host "$Red  ❌ Node.js غير موجود - يرجى التثبيت من https://nodejs.org$Reset"
    exit 1
}

# 2. فحص npm
Write-Host "$Cyan▶ فحص npm$Reset"
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm -v
    Write-Host "$Green  ✅ npm $npmVersion موجود$Reset"
}
else {
    Write-Host "$Red  ❌ npm غير موجود$Reset"
    exit 1
}

# 3. فحص MongoDB
Write-Host "$Cyan▶ فحص MongoDB$Reset"
if (Get-Command mongod -ErrorAction SilentlyContinue) {
    Write-Host "$Green  ✅ MongoDB موجود$Reset"
}
else {
    Write-Host "$Yellow  ⚠️  MongoDB غير موجود - سيتم استخدام محاكي$Reset"
}

# 4. فحص Redis
Write-Host "$Cyan▶ فحص Redis$Reset"
if (Get-Command redis-server -ErrorAction SilentlyContinue) {
    Write-Host "$Green  ✅ Redis موجود$Reset"
}
else {
    Write-Host "$Yellow  ⚠️  Redis غير موجود - الميزات المتقدمة قد لا تعمل$Reset"
}

# تثبيت المكتبات
Write-Host "$Yellow`n⬇️  تثبيت المكتبات الضرورية...`n$Reset"

if (!(Test-Path "frontend/node_modules")) {
    Write-Host "$Cyan▶ تثبيت المكتبات الأمامية...$Reset"
    cd frontend
    npm install --prefer-offline --no-audit
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$Green  ✅ تم تثبيت المكتبات الأمامية$Reset"
    }
    else {
        Write-Host "$Red  ❌ فشل التثبيت$Reset"
        exit 1
    }
    cd ..
}
else {
    Write-Host "$Green  ✅ المكتبات الأمامية موجودة$Reset"
}

if (!(Test-Path "backend/node_modules")) {
    Write-Host "$Cyan▶ تثبيت المكتبات الخلفية...$Reset"
    cd backend
    npm install --prefer-offline --no-audit
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$Green  ✅ تم تثبيت المكتبات الخلفية$Reset"
    }
    else {
        Write-Host "$Red  ❌ فشل التثبيت$Reset"
        exit 1
    }
    cd ..
}
else {
    Write-Host "$Green  ✅ المكتبات الخلفية موجودة$Reset"
}

# إنشاء ملفات البيئة
Write-Host "$Yellow`n🔧 إعداد بيئة التطوير...`n$Reset"

if (!(Test-Path "frontend/.env.local")) {
    Write-Host "$Cyan▶ إنشاء ملف البيئة للواجهة الأمامية...$Reset"
    @"
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_VERSION=2.1.0
"@ | Out-File -FilePath "frontend/.env.local" -Encoding UTF8
    Write-Host "$Green  ✅ تم إنشاء .env.local$Reset"
}
else {
    Write-Host "$Green  ✅ ملف البيئة موجود$Reset"
}

if (!(Test-Path "backend/.env")) {
    Write-Host "$Cyan▶ إنشاء ملف البيئة للخادم الخلفي...$Reset"
    @"
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/project
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
API_KEY=your-api-key
STRIPE_SECRET=your-stripe-key
"@ | Out-File -FilePath "backend/.env" -Encoding UTF8
    Write-Host "$Green  ✅ تم إنشاء ملف البيئة$Reset"
}
else {
    Write-Host "$Green  ✅ ملف البيئة موجود$Reset"
}

# بدء الخوادم
Write-Host "$Yellow`n🚀 بدء الخوادم...`n$Reset"

Write-Host "$Cyan" -NoNewline
Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                   معلومات التشغيل الأولية                      ║
╠════════════════════════════════════════════════════════════════╣
║  الواجهة الأمامية:     http://localhost:3000                  ║
║  الخادم الخلفي:       http://localhost:5000                  ║
║  قاعدة البيانات:      mongodb://localhost:27017/project      ║
║  الذاكرة المؤقتة:      redis://localhost:6379                ║
╠════════════════════════════════════════════════════════════════╣
║                      أوامر مفيدة:                             ║
║  npm start           - بدء الخادم                           ║
║  npm test            - تشغيل الاختبارات                       ║
║  npm run build       - بناء المشروع                          ║
║  npm run lint        - فحص الكود                             ║
╚════════════════════════════════════════════════════════════════╝
"@
Write-Host "$Reset"

# فتح نافذتي Terminal
Write-Host "$Yellow`n📂 فتح الخوادم في نوافذ جديدة...`n$Reset"

# الواجهة الأمامية
Write-Host "$Cyan▶ بدء الواجهة الأمامية (المنفذ 3000)...$Reset"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$pwd\frontend'; npm start"

# الخادم الخلفي
Write-Host "$Cyan▶ بدء الخادم الخلفي (المنفذ 5000)...$Reset"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$pwd\backend'; npm start"

Write-Host "$Green" -NoNewline
Write-Host @"

✅ تم بدء الخوادم بنجاح!

📱 افتح المتصفح على: http://localhost:3000
🔐 تسجيل الدخول: استخدم بيانات الاختبار
📚 التوثيق: اطلع على README.md

💡 نصائح:
   • لفتح أدوات المطور: F12
   • لتعطيل الخادم: Ctrl+C في نوافذ Terminal
   • لإعادة التشغيل: بدء هذا السكريبت مجدداً

"@
Write-Host "$Reset"

# انتظار المستخدم
Read-Host "`nاضغط Enter للخروج"

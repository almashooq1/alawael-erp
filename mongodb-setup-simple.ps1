#!/usr/bin/env pwsh
# MongoDB Atlas Setup Guide - Interactive

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   MongoDB Atlas - نظام إدارة Alawael                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n"

# Step 1: Check if already configured
Write-Host "1️⃣  فحص الإعدادات الحالية..." -ForegroundColor Yellow

$envPath = "$PSScriptRoot/backend/.env"
$envContent = Get-Content $envPath -Raw
$useMockDB = [regex]::Match($envContent, 'USE_MOCK_DB=(.+)').Groups[1].Value

if ($useMockDB -eq "false") {
    Write-Host "✅ MongoDB بالفعل مُفعّل" -ForegroundColor Green
    exit
}

Write-Host "⚠️  نظام المحاكاة قيد الاستخدام حالياً" -ForegroundColor Yellow
Write-Host "`n"

# Step 2: Manual Setup Instructions
Write-Host "2️⃣  خطوات الإعداد اليدوي:" -ForegroundColor Yellow
Write-Host ""
Write-Host "أ) الدخول إلى MongoDB Atlas:" -ForegroundColor Cyan
Write-Host "   1. زيارة https://www.mongodb.com/cloud/atlas" -ForegroundColor White
Write-Host "   2. إنشاء حساب أو تسجيل الدخول" -ForegroundColor White
Write-Host "   3. إنشاء مشروع جديد: 'Alawael'" -ForegroundColor White
Write-Host ""

Write-Host "ب) إنشاء Cluster:" -ForegroundColor Cyan
Write-Host "   1. اختيار 'Build a Database'" -ForegroundColor White
Write-Host "   2. اختيار 'Shared' (مجاني)" -ForegroundColor White
Write-Host "   3. اختيار المنطقة الأقرب (Middle East)" -ForegroundColor White
Write-Host "   4. تسمية: 'alawael-cluster'" -ForegroundColor White
Write-Host "   5. انتظار الإنشاء (5-10 دقائق)" -ForegroundColor White
Write-Host ""

Write-Host "ج) إنشاء Database User:" -ForegroundColor Cyan
Write-Host "   1. في Security > Database Access" -ForegroundColor White
Write-Host "   2. اسم المستخدم: 'alawael'" -ForegroundColor White
Write-Host "   3. كلمة المرور: (قويّة - احفظها)" -ForegroundColor White
Write-Host ""

Write-Host "د) الحصول على Connection String:" -ForegroundColor Cyan
Write-Host "   1. في Deployment > Database" -ForegroundColor White
Write-Host "   2. اضغط 'Connect'" -ForegroundColor White
Write-Host "   3. اختر 'Drivers' > 'Node.js'" -ForegroundColor White
Write-Host "   4. انسخ Connection String" -ForegroundColor White
Write-Host ""

# Step 3: Input Connection String
Write-Host "3️⃣  إدخال Connection String:" -ForegroundColor Yellow
Write-Host ""
$connectionString = Read-Host "الصق Connection String هنا (أو اضغط Enter للتخطي)"

if ($connectionString) {
    Write-Host ""
    Write-Host "4️⃣  تحديث .env..." -ForegroundColor Yellow
    
    # Update .env
    $newEnv = $envContent -replace 'USE_MOCK_DB=true', 'USE_MOCK_DB=false'
    $newEnv = $newEnv -replace 'MONGODB_URI=.*', "MONGODB_URI=$connectionString"
    
    Set-Content -Path $envPath -Value $newEnv
    Write-Host "✅ تم تحديث .env" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "5️⃣  إعادة تشغيل Backend..." -ForegroundColor Yellow
    
    # Stop all Node processes
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
    
    # Start Backend with Redis
    cd backend
    $env:REDIS_ENABLED = "true"
    Start-Process powershell -ArgumentList '-NoExit', '-Command', 'node server.js'
    
    Start-Sleep -Seconds 8
    
    # Test connection
    Write-Host ""
    Write-Host "6️⃣  اختبار الاتصال..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri http://localhost:3001/health -ErrorAction SilentlyContinue
        if ($response.status -eq "OK") {
            Write-Host "✅ MongoDB متصل بنجاح!" -ForegroundColor Green
            Write-Host "   الرسالة: $($response.message)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  جاري الاتصال... حاول مجدداً" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "✅ اكتمل الإعداد!" -ForegroundColor Green
    Write-Host ""
    Write-Host "ملاحظات مهمة:" -ForegroundColor Cyan
    Write-Host "- قد يستغرق الاتصال الأول 30-60 ثانية" -ForegroundColor White
    Write-Host "- تأكد من whitelist IP في MongoDB Atlas" -ForegroundColor White
    Write-Host "- اختبر باستخدام Postman أو curl" -ForegroundColor White
    Write-Host ""
}
else {
    Write-Host "❌ تم التخطي" -ForegroundColor Red
    Write-Host ""
    Write-Host "للمتابعة يدوياً:" -ForegroundColor Yellow
    Write-Host "1. حدّث MONGODB_URI في backend/.env" -ForegroundColor White
    Write-Host "2. غيّر USE_MOCK_DB من true إلى false" -ForegroundColor White
    Write-Host "3. أعد تشغيل Backend" -ForegroundColor White
    Write-Host ""
}

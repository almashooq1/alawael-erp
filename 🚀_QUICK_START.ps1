# 🚀 برنامج تشغيل سريع - بدون MongoDB محلي
# AlAwael ERP Quick Start

Clear-Host
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        🎊 AlAwael ERP - نظام التشغيل السريع             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# الإعدادات
$projectRoot = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

# الخطوة 1: إيقاف العمليات القديمة
Write-Host "⏹️  إيقاف العمليات القديمة..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Write-Host "✅ تم" -ForegroundColor Green
Write-Host ""

# الخطوة 2: التحقق من المتطلبات
Write-Host "🔍 التحقق من المتطلبات..." -ForegroundColor Yellow
$nodeCheck = node --version 2>$null
$npmCheck = npm --version 2>$null

if ($nodeCheck -and $npmCheck) {
    Write-Host "  ✅ Node.js و npm موجودة" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Node.js أو npm غير موجود" -ForegroundColor Red
    Write-Host "  تحميل من: https://nodejs.org" -ForegroundColor Yellow
    exit
}
Write-Host ""

# الخطوة 3: الانتقال إلى المشروع
Write-Host "📁 الانتقال إلى مجلد المشروع..." -ForegroundColor Yellow
Set-Location $projectRoot
Write-Host "✅ تم" -ForegroundColor Green
Write-Host ""

# الخطوة 4: فتح نافذة Backend
Write-Host "🔧 فتح Backend Server..." -ForegroundColor Cyan
$backendScript = @"
Clear-Host
Write-Host "╔═════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  🔧 AlAwael ERP Backend Server          ║" -ForegroundColor Green
Write-Host "╚═════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Set-Location "$projectRoot\backend"
Write-Host "🚀 بدء الخادم..." -ForegroundColor Yellow
npm start

Write-Host ""
Write-Host "اضغط أي مفتاح للخروج..." -ForegroundColor Red
`$null = `$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
"@
$backendScript | Out-File -FilePath "$env:TEMP\start-backend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-backend.ps1"
Start-Sleep -Seconds 3

# الخطوة 5: فتح نافذة Frontend
Write-Host "⚛️  فتح Frontend Server..." -ForegroundColor Cyan
$frontendScript = @"
Clear-Host
Write-Host "╔═════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ⚛️  AlAwael ERP Frontend Server        ║" -ForegroundColor Green
Write-Host "╚═════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Set-Location "$projectRoot\frontend"
Write-Host "🚀 بدء الواجهة الأمامية..." -ForegroundColor Yellow
npm run dev

Write-Host ""
Write-Host "اضغط أي مفتاح للخروج..." -ForegroundColor Red
`$null = `$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
"@
$frontendScript | Out-File -FilePath "$env:TEMP\start-frontend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-frontend.ps1"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ تم فتح جميع الخوادم                       ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📍 يمكنك الآن الوصول إلى:" -ForegroundColor Cyan
Write-Host "   🌐 Frontend:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "   🔧 Backend:   http://localhost:3001" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔐 بيانات تسجيل الدخول:" -ForegroundColor Cyan
Write-Host "   📧 البريد:    admin@alawael.com" -ForegroundColor Yellow
Write-Host "   🔑 كلمة المرور: Admin@123456" -ForegroundColor Yellow
Write-Host ""

Write-Host "⏱️  انتظر 30 ثانية حتى يبدأ البرنامج..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "📝 ملاحظات هامة:" -ForegroundColor Cyan
Write-Host "  • تأكد من اتصالك بالإنترنت" -ForegroundColor Yellow
Write-Host "  • MongoDB Atlas يجب أن يكون معدّاً (راجع الدليل)" -ForegroundColor Yellow
Write-Host "  • إذا فشل Backend، تحقق من قاعدة البيانات" -ForegroundColor Yellow
Write-Host ""

Write-Host "✨ النظام جاهز للاستخدام!" -ForegroundColor Green
Write-Host ""

# الانتظار حتى الخروج
Read-Host "اضغط Enter عند الانتهاء"

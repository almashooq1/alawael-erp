@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════════════════════
echo         🚀 AlAwael ERP - تشغيل محلي
echo ═══════════════════════════════════════════════════════════════
echo.

echo 📋 التحقق من المتطلبات...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js غير مثبت
    echo حمل من: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js موجود

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm غير موجود
    pause
    exit /b 1
)
echo ✅ npm موجود
echo.

echo 📦 تثبيت حزم Backend...
cd backend
if exist package.json (
    npm install --production
    echo ✅ تم تثبيت حزم Backend
) else (
    echo ⚠️ ملف package.json غير موجود في backend
)
cd ..
echo.

echo 🚀 تشغيل الخادم...
if exist backend\server.js (
    cd backend
    echo ✅ تشغيل الخادم على http://localhost:3000
    echo.
    echo ═══════════════════════════════════════════════════════════════
    echo   🎉 الخادم يعمل الآن!
    echo   📍 العنوان: http://localhost:3000
    echo   📍 API: http://localhost:3000/api/v1
    echo   🛑 اضغط Ctrl+C للإيقاف
    echo ═══════════════════════════════════════════════════════════════
    node server.js
) else (
    echo ❌ ملف server.js غير موجود
    pause
    exit /b 1
)

pause
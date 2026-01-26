@echo off
REM ===============================================
REM نظام بدء سريع - Quick Start System
REM الاستخدام: تشغيل ملف BAT هذا مباشرة
REM ===============================================

setlocal enabledelayedexpansion

cd /d "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

echo.
echo ===============================================
echo 🚀 نظام البدء السريع - Quick Start
echo ===============================================
echo.

REM القائمة الرئيسية
:menu
echo.
echo 📋 اختر الخيار:
echo ===============
echo 1) فحص الصحة المحلي (بدون Docker)
echo 2) فحص الصحة الكامل (مع Docker)
echo 3) استرجاع النظام الشامل
echo 4) تشغيل المراقبة المستمرة
echo 5) عرض السجلات
echo 6) إيقاف الخدمات
echo 7) الخروج
echo.

set /p choice="اختر (1-7): "

if "%choice%"=="1" goto local_check
if "%choice%"=="2" goto full_check
if "%choice%"=="3" goto recovery
if "%choice%"=="4" goto monitor
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto stop
if "%choice%"=="7" goto end
goto menu

:local_check
echo.
echo 🔍 فحص الخدمات المحلية...
echo ===============================================
node scripts/monitoring/health-check-local.js
pause
goto menu

:full_check
echo.
echo 🔍 فحص الصحة الكامل...
echo ===============================================
npm run health:check
pause
goto menu

:recovery
echo.
echo 🛠️  استرجاع النظام الشامل...
echo ===============================================
echo هذا قد يستغرق عدة دقائق...
powershell -ExecutionPolicy Bypass -File "scripts/recovery/system-recovery.ps1"
pause
goto menu

:monitor
echo.
echo 📊 تشغيل المراقبة المستمرة...
echo (اضغط Ctrl+C للإيقاف)
echo ===============================================
npm run monitor:all
goto menu

:logs
echo.
echo 📋 عرض السجلات...
echo (اضغط Ctrl+C للإيقاف)
echo ===============================================
docker-compose logs -f
goto menu

:stop
echo.
echo 🛑 إيقاف الخدمات...
echo ===============================================
docker-compose down
echo ✅ تم إيقاف الخدمات
echo.
pause
goto menu

:end
echo.
echo 👋 تم الخروج
echo.
exit /b 0

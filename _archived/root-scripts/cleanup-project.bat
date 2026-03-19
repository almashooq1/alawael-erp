@echo off
chcp 65001 >nul
echo ============================================
echo    تنظيف وتوحيد مشروع الأصول ERP
echo    Unification and Cleanup Script
echo ============================================
echo.

echo [1/5] إنشاء مجلد الأرشيف...
if not exist "archive" mkdir archive

echo [2/5] أرشفة النسخ المكررة...
:: أرشفة النسخ القديمة
if exist "alawael-backend-LOCAL" (
    echo    - أرشفة alawael-backend-LOCAL
    move "alawael-backend-LOCAL" "archive\alawael-backend-LOCAL" >nul 2>&1
)
if exist "alawael-backend-REFERENCE" (
    echo    - أرشفة alawael-backend-REFERENCE
    move "alawael-backend-REFERENCE" "archive\alawael-backend-REFERENCE" >nul 2>&1
)
if exist "alawael-unified-LOCAL" (
    echo    - أرشفة alawael-unified-LOCAL
    move "alawael-unified-LOCAL" "archive\alawael-unified-LOCAL" >nul 2>&1
)
if exist "backend-1" (
    echo    - أرشفة backend-1
    move "backend-1" "archive\backend-1" >nul 2>&1
)
if exist "backend-finance" (
    echo    - أرشفة backend-finance
    move "backend-finance" "archive\backend-finance" >nul 2>&1
)

echo [3/5] أرشفة الوثائق القديمة...
if not exist "archive\docs" mkdir archive\docs
:: نقل ملفات التقارير القديمة
move *FEB19*.md "archive\docs\" >nul 2>&1
move *FEB20*.md "archive\docs\" >nul 2>&1
move *FEB21*.md "archive\docs\" >nul 2>&1
move *FEB22*.md "archive\docs\" >nul 2>&1
move *FEB24*.md "archive\docs\" >nul 2>&1
move *FEB25*.md "archive\docs\" >nul 2>&1

echo [4/5] إنشاء ملف README للمشروع...
(
echo # نظام الأصول ERP - الإصدار 2.0.0
echo.
echo ## الهيكل الرئيسي
echo.
echo ```
echo ├── backend/        # الخادم (Node.js + Express + MongoDB)
echo ├── frontend/       # واجهة المستخدم (React)
echo ├── mobile/         # تطبيق الجوال
echo ├── archive/        # الأرشيف
echo └── docs/           # التوثيق
echo ```
echo.
echo ## التشغيل السريع
echo.
echo ### الخادم:
echo ```bash
echo cd backend
echo npm install
echo npm start
echo ```
echo.
echo ### الواجهة:
echo ```bash
echo cd frontend
echo npm install
echo npm start
echo ```
echo.
echo ## معلومات الاتصال
echo - MongoDB: mongodb://localhost:27017/alawael
echo - Redis: localhost:6379
echo - Port: 5000
) > README.md

echo [5/5] تنظيف الملفات المؤقتة...
del /q *.tmp >nul 2>&1
del /q *.log >nul 2>&1

echo.
echo ============================================
echo    ✅ تم الانتهاء من التنظيف بنجاح!
echo ============================================
echo.
echo تم نقل النسخ المكررة إلى مجلد archive/
echo تم نقل الوثائق القديمة إلى archive/docs/
echo.
pause
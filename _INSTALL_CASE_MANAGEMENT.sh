#!/bin/bash

# 🚀 دليل التثبيت السريع - نظام إدارة الحالات المتكامل

echo "════════════════════════════════════════════════════════"
echo "    تثبيت نظام إدارة الحالات المتكامل"
echo "    Advanced Case Management System Setup"
echo "════════════════════════════════════════════════════════"
echo ""

# ============= Backend Setup =============
echo "📦 الخطوة 1: تثبيت حزم Backend..."
cd erp_new_system/backend

# تثبيت multer لرفع الملفات
npm install multer --save

echo "✅ تم تثبيت حزم Backend"
echo ""

# ============= Frontend Setup =============
echo "📦 الخطوة 2: تثبيت حزم Frontend..."
cd ../frontend

# تثبيت حزم التواريخ
npm install date-fns --save

# تثبيت MUI Timeline (إن لم تكن موجودة)
npm install @mui/lab --save

echo "✅ تم تثبيت حزم Frontend"
echo ""

# ============= Backend Configuration =============
echo "⚙️ الخطوة 3: تكوين Backend..."
cd ../backend

# إضافة Routes إلى server.js
echo "يجب إضافة السطور التالية إلى server.js:"
echo ""
echo "// في بداية الملف (مع باقي الـ requires)"
echo "const caseManagementRoutes = require('./routes/caseManagement');"
echo "const medicalFilesRoutes = require('./routes/medicalFiles');"
echo "const path = require('path');"
echo ""
echo "// بعد باقي الـ routes"
echo "app.use('/api/case-management', caseManagementRoutes);"
echo "app.use('/api/medical-files', medicalFilesRoutes);"
echo ""
echo "// لتقديم الملفات المرفوعة"
echo "app.use('/uploads', express.static(path.join(__dirname, 'uploads')));"
echo ""

# ============= Frontend Configuration =============
echo "⚙️ الخطوة 4: تكوين Frontend..."
cd ../frontend

echo "يجب إضافة السطور التالية إلى App.js:"
echo ""
echo "// في بداية الملف (مع باقي الـ imports)"
echo "import CaseManagementList from './components/CaseManagement/CaseManagementList';"
echo "import CaseDetails from './components/CaseManagement/CaseDetails';"
echo ""
echo "// داخل <Routes>"
echo "<Route path=\"/case-management\" element={<CaseManagementList />} />"
echo "<Route path=\"/case-management/:id\" element={<CaseDetails />} />"
echo ""

# ============= Database Setup =============
echo "🗄️ الخطوة 5: إعداد قاعدة البيانات..."
echo ""
echo "لا حاجة لإجراءات إضافية - سيتم إنشاء Collection تلقائياً عند أول استخدام"
echo ""

# ============= Final Steps =============
echo "════════════════════════════════════════════════════════"
echo "✅ التثبيت الأساسي مكتمل!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📝 الخطوات المتبقية (يدوية):"
echo ""
echo "1️⃣ تحديث server.js في Backend:"
echo "   - إضافة requires للـ Routes الجديدة"
echo "   - إضافة app.use() للـ Routes"
echo "   - إضافة middleware للملفات الثابتة"
echo ""
echo "2️⃣ تحديث App.js في Frontend:"
echo "   - إضافة imports للمكونات الجديدة"
echo "   - إضافة Routes للصفحات"
echo ""
echo "3️⃣ إضافة رابط في القائمة الجانبية:"
echo "   - فتح Sidebar.jsx"
echo "   - إضافة رابط لـ /case-management"
echo ""
echo "4️⃣ تشغيل النظام:"
echo "   Backend:  cd backend && npm start"
echo "   Frontend: cd frontend && npm start"
echo ""
echo "════════════════════════════════════════════════════════"
echo "🎉 النظام جاهز للاستخدام!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📚 للحصول على التوثيق الكامل:"
echo "   اقرأ ملف: _ADVANCED_CASE_MANAGEMENT_SYSTEM.md"
echo ""
echo "🌐 الوصول إلى النظام:"
echo "   Frontend: http://localhost:3000/case-management"
echo "   Backend:  http://localhost:3001/api/case-management"
echo ""

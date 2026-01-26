#!/bin/bash

# 🚀 Quick Start - Admin Dashboard Integration
# دليل البدء السريع - تفعيل لوحة تحكم المسؤول

echo "🎯 بدء تفعيل Admin Dashboard..."
echo "=================================="

# الخطوة 1: التحقق من وجود البيئة
echo "✓ الخطوة 1: التحقق من البيئة..."

if [ ! -f ".env" ]; then
    echo "⚠️ ملف .env غير موجود"
    echo "تأكد من وجود ملف .env مع المتغيرات المطلوبة"
fi

# الخطوة 2: تثبيت المكتبات
echo "✓ الخطوة 2: تثبيت المكتبات..."

echo "  → Backend dependencies..."
pip install flask flask-cors python-dotenv --quiet

echo "  → Frontend dependencies..."
npm install @mui/material @mui/icons-material axios --silent

# الخطوة 3: الإشعارات
echo ""
echo "=================================="
echo "✅ التفعيل مكتمل!"
echo "=================================="
echo ""
echo "الخطوات التالية:"
echo ""
echo "1️⃣  في Backend (app.py):"
echo "    from routes.admin_routes import admin_bp"
echo "    app.register_blueprint(admin_bp)"
echo ""
echo "2️⃣  في Frontend (App.jsx):"
echo "    import AdminDashboard from './components/Admin/AdminDashboard';"
echo "    <Route path=\"/admin\" element={<AdminDashboard />} />"
echo ""
echo "3️⃣  الوصول إلى لوحة التحكم:"
echo "    http://localhost:3000/admin"
echo ""
echo "4️⃣  اختبار API:"
echo "    curl http://localhost:3001/api/admin/health"
echo ""
echo "🎉 تم الإعداد! استمتع بـ Admin Dashboard"

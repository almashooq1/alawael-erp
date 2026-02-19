#!/bin/bash

# 🚀 MongoDB Setup - Quick Start Script
# اختيار التثبيت سريع

echo "=================================="
echo "🌟 MongoDB Setup - Quick Selection"
echo "=================================="
echo ""
echo "اختر الخيار المناسب:"
echo "1) MongoDB Atlas (مجاني - موصى به) ⭐"
echo "2) Hostinger (استضافة)"
echo "3) Docker (محلي)"
echo ""
read -p "اختر رقم (1/2/3): " choice

case $choice in
  1)
    echo ""
    echo "📌 MongoDB Atlas - اتبع هذه الخطوات:"
    echo "1. اذهب: https://www.mongodb.com/cloud/atlas"
    echo "2. اضغط: Sign Up → أنشئ حساب"
    echo "3. اضغط: Create Deployment → اختر Free"
    echo "4. انتظر 10 دقائق"
    echo "5. اضغط: Connect → اختر Drivers → Node.js"
    echo "6. انسخ Connection String"
    echo ""
    read -p "أدخل Connection String: " conn_str
    echo "USE_MOCK_DB=false" >> ../.env
    echo "MONGODB_URI=$conn_str" >> ../.env
    echo "✅ تم الحفظ!"
    ;;
  2)
    echo ""
    echo "🏢 Hostinger - اتبع هذه الخطوات:"
    echo "1. سجل الدخول Hostinger"
    echo "2. Database → MongoDB → Create"
    echo "3. انسخ Connection String"
    echo ""
    read -p "أدخل Connection String: " conn_str
    echo "USE_MOCK_DB=false" >> ../.env
    echo "MONGODB_URI=$conn_str" >> ../.env
    echo "✅ تم الحفظ!"
    ;;
  3)
    echo ""
    echo "🐳 Docker - تشغيل محلي:"
    docker run -d -p 27017:27017 --name mongodb-local mongo
    echo "USE_MOCK_DB=false" >> ../.env
    echo "MONGODB_URI=mongodb://localhost:27017/alawael-db" >> ../.env
    echo "✅ تم التشغيل والحفظ!"
    ;;
  *)
    echo "❌ اختيار غير صحيح!"
    exit 1
    ;;
esac

echo ""
echo "=================================="
echo "الخطوات التالية:"
echo "1. npm run dev"
echo "2. npm run db:validate"
echo "=================================="

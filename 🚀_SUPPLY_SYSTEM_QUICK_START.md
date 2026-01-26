# 🚀 دليل بدء سريع - نظام الإمداد والمساندة

## Quick Start Guide - Supply & Support System

**التاريخ:** 22 يناير 2026  
**الإصدار:** 4.0.0  
**الحالة:** ✅ **جاهز للعمل**

---

## 📋 المتطلبات - REQUIREMENTS

```bash
Node.js 14+
npm 6+
Express.js
```

---

## ⚡ التثبيت السريع - QUICK INSTALLATION

### 1. نسخ الملفات

```bash
# Core System
backend/lib/supply_support_system.js

# Routes
backend/routes/supply_support_routes.js

# Tests
backend/tests/supply_system_test.js
```

### 2. إضافة الأولويات

في ملف `backend/app.js`:

```javascript
const supplyRoutes = require('./routes/supply_support_routes');

// استخدم المسارات
app.use('/api/supply', supplyRoutes);
```

### 3. تشغيل الاختبارات

```bash
cd backend
node tests/supply_system_test.js
```

---

## 🎯 الاستخدام الأساسي - BASIC USAGE

### 1. فتح الفروع

```bash
GET /api/supply/branches

# النتيجة:
{
  "branches": [
    {"id": "BR001", "name": "الفرع الرئيسي", ...},
    {"id": "BR002", "name": "الفرع الشمالي", ...},
    {"id": "BR003", "name": "الفرع الغربي", ...},
    {"id": "BR004", "name": "الفرع الجنوبي", ...}
  ]
}
```

### 2. عرض مخزون الفرع

```bash
GET /api/supply/branches/BR001

# النتيجة:
{
  "branch_name": "الفرع الرئيسي",
  "inventory": {
    "medical_supplies": {"bandages": 500, "syringes": 1000, ...},
    "equipment": {...},
    ...
  },
  "total_items": 10500,
  "capacity_used": "85%"
}
```

### 3. طلب إمداد

```bash
POST /api/supply/requests

{
  "fromBranch": "BR001",
  "toBranch": "BR002",
  "items": [
    {"item_name": "bandages", "quantity": 100, "unit_price": 10},
    {"item_name": "gloves", "quantity": 500, "unit_price": 5}
  ],
  "priority": "normal"
}

# النتيجة:
{
  "id": "REQ-1",
  "status": "pending",
  "total_amount": 3500,
  "estimated_delivery": "2026-01-29"
}
```

### 4. الموافقة على الطلب

```bash
POST /api/supply/requests/REQ-1/approve

# النتيجة:
{
  "transfer": {
    "id": "TRN-1",
    "status": "pending",
    "tracking_code": "TRK-ABC123XYZ"
  }
}
```

### 5. تحديث التحويل

```bash
PUT /api/supply/transfers/TRN-1

{
  "status": "in_transit",
  "notes": "الشحنة في الطريق"
}

# ثم:
{
  "status": "delivered",
  "notes": "تم التسليم"
}
```

### 6. تذكرة دعم

```bash
POST /api/supply/tickets

{
  "fromBranch": "BR002",
  "category": "supply",
  "description": "نفاد المجهزات الطبية - طلب عاجل",
  "priority": "urgent"
}

# النتيجة:
{
  "id": "TKT-1",
  "status": "open",
  "created_at": "2026-01-22T10:30:00Z"
}
```

### 7. إضافة تعليق

```bash
POST /api/supply/tickets/TKT-1/comments

{
  "author": "Ahmed Al-Rashid",
  "comment": "نحتاج إلى 200 وحدة إضافية فوراً"
}
```

### 8. حل المشكلة

```bash
POST /api/supply/tickets/TKT-1/resolve

{
  "resolution": "تم الحصول على 300 وحدة من الفرع الرئيسي"
}

# النتيجة:
{
  "status": "resolved",
  "resolved_at": "2026-01-22T11:00:00Z"
}
```

---

## 📊 الاستعلامات المتقدمة - ADVANCED QUERIES

### 1. مؤشرات الأداء

```bash
GET /api/supply/branches/BR001/metrics

# النتيجة:
{
  "metrics": {
    "pending_requests": 3,
    "total_transfers": 12,
    "delivery_rate": "95.0%",
    "order_accuracy": "98.0%",
    "avg_response_time": "4.5 hours",
    "satisfaction_rating": 4.7
  }
}
```

### 2. التحليل التنبؤي

```bash
GET /api/supply/branches/BR001/predictions

# النتيجة:
{
  "low_stock_items": [
    {"item": "bandages", "current_quantity": 50, "action": "Urgent reorder"}
  ],
  "surplus_items": [
    {"item": "paper", "quantity": 600, "recommendation": "Redistribute"}
  ]
}
```

### 3. التقرير الشامل

```bash
GET /api/supply/branches/BR001/report

# النتيجة:
{
  "branch_name": "الفرع الرئيسي",
  "summary": {
    "total_inventory_value": 525000,
    "items_in_stock": 10500,
    "pending_requests": 3,
    "active_transfers": 5
  },
  "performance": {...}
}
```

### 4. سجل التحويلات

```bash
GET /api/supply/branches/BR001/transfers?direction=both

# النتيجة:
{
  "sent": [...],
  "received": [...],
  "total_transfers": 12
}
```

### 5. إحصائيات النظام

```bash
GET /api/supply/system-status

# النتيجة:
{
  "total_branches": 4,
  "total_requests": 25,
  "total_transfers": 18,
  "pending_requests": 3,
  "in_transit_transfers": 2,
  "open_tickets": 5
}
```

---

## 💼 حالات الاستخدام الشاملة - USE CASES

### الحالة 1: نقص المخزون

```
1. فرع BR002 ينخفض مخزونه من المجهزات الطبية
2. ينشئ طلب إمداد عاجل من BR001
3. يوافق BR001 على الطلب
4. يتم إنشاء تحويل مع رمز تتبع
5. يتم الشحن والاستقبال
6. يتم تحديث المخزون تلقائياً
```

### الحالة 2: مشكلة فنية

```
1. يحدث عطل في معدات BR003
2. ينشئ تذكرة دعم بأولوية عالية
3. يضيف تفاصيل عن المشكلة
4. يتم تخصيص الفني المسؤول
5. يُضافون تعليقات بالحل
6. يتم إغلاق التذكرة
```

### الحالة 3: توزيع ذكي

```
1. يحلل النظام المخزون في جميع الفروع
2. يتنبأ بالفروع التي بها فائض
3. ينقل الفائض إلى الفروع التي بها نقص
4. يوفر تكاليف الطلبات الجديدة
5. يحسن استخدام المخزون الكلي
```

---

## 🔧 التخصيص والإعدادات

### إضافة فرع جديد

```javascript
const newBranch = {
  id: 'BR005',
  name: 'فرع جديد',
  location: 'موقع جديد',
  manager: 'اسم المدير',
  contact: '+966-XX-XXXXXX',
  capacity: 400,
  inventory_space: 300,
};

// إضافة للنظام
supplySystem.branches.set(newBranch.id, {
  ...newBranch,
  inventory: supplySystem.initializeInventory(),
  pending_requests: [],
  sent_transfers: [],
  received_transfers: [],
  support_tickets: [],
});
```

### تغيير مستوى الأولوية

```javascript
// في ملف التكوين
const priorities = {
  normal: 7, // 7 أيام
  urgent: 3, // 3 أيام
  emergency: 1, // يوم واحد
};
```

---

## 📱 أمثلة cURL

### إنشاء طلب

```bash
curl -X POST http://localhost:3001/api/supply/requests \
  -H "Content-Type: application/json" \
  -d '{
    "fromBranch": "BR001",
    "toBranch": "BR002",
    "items": [
      {"item_name": "bandages", "quantity": 100, "unit_price": 10}
    ],
    "priority": "normal"
  }'
```

### الموافقة على طلب

```bash
curl -X POST http://localhost:3001/api/supply/requests/REQ-1/approve
```

### تحديث تحويل

```bash
curl -X PUT http://localhost:3001/api/supply/transfers/TRN-1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "delivered",
    "notes": "تم التسليم بنجاح"
  }'
```

### إنشاء تذكرة

```bash
curl -X POST http://localhost:3001/api/supply/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "fromBranch": "BR002",
    "category": "supply",
    "description": "نفاد المخزون",
    "priority": "urgent"
  }'
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: فرع غير موجود

```bash
الحل: تأكد من استخدام معرّف فرع صحيح (BR001-BR004)
```

### المشكلة: مخزون غير كافي

```bash
الحل: تحقق من الكمية المتاحة أو اطلب من فرع آخر
```

### المشكلة: طلب معلق

```bash
الحل: استخدم POST /approve لتحويل الطلب إلى تحويل فعلي
```

---

## 📈 المقاييس والتحليلات

### KPIs المتابعة

```
✓ معدل التسليم (Delivery Rate)
✓ دقة الطلبات (Order Accuracy)
✓ وقت الاستجابة (Response Time)
✓ رضا العملاء (Satisfaction)
✓ استخدام السعة (Capacity Usage)
```

### التحسينات المخططة

```
🔄 نظام الإشعارات الفوري
🔄 الأتمتة الذكية
🔄 التقارير المتقدمة
🔄 التكامل مع الأنظمة الخارجية
```

---

## ✅ قائمة التحقق قبل الاستخدام

- [ ] تم التحقق من تثبيت Node.js
- [ ] تم استيراد الملفات الأساسية
- [ ] تم تشغيل الاختبارات بنجاح
- [ ] تم إضافة المسارات في app.js
- [ ] تم التحقق من الفروع الأربعة
- [ ] تم اختبار طلب إمداد
- [ ] تم اختبار تحويل
- [ ] تم اختبار تذكرة دعم

---

## 🎉 النتيجة

**النظام جاهز للاستخدام الفوري!**

يمكنك البدء بـ:

```bash
# 1. بدء الخادم
npm start

# 2. اختبار الصحة
curl http://localhost:3001/api/supply/health

# 3. عرض الفروع
curl http://localhost:3001/api/supply/branches

# 4. إنشاء طلب
# استخدم أمثلة cURL أعلاه
```

---

**Version:** 4.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** January 22, 2026

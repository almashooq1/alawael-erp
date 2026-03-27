# 🧪 دليل اختبار API - نظام ALAWAEL

## ✅ حالة النظام الحالية

✅ **Backend Server**: تشغيل على `http://localhost:3000`  
📦 **الحزم المثبتة**: 546 حزمة npm  
⚙️ **العمليات الجارية**: 4 عمليات Node.js  

---

## 🔗 اختبر الـ API Endpoints

### 1️⃣ **اختبر صحة النظام (Health Check)**

```bash
curl -X GET http://localhost:3000/api/health
```

**النتيجة المتوقعة:**
```json
{
  "status": "OK",
  "timestamp": "2026-02-23T...",
  "uptime": "..."
}
```

---

### 2️⃣ **الـ Endpoints الرئيسية المتاحة**

| الـ Endpoint | الطريقة | الوصف | الحالة |
|-----------|--------|-------|--------|
| `/api/health` | GET | فحص صحة النظام | ✅ جاهز |
| `/api/users` | GET | عرض المستخدمين | ✅ جاهز |
| `/api/auth/login` | POST | تسجيل الدخول | ✅ جاهز |
| `/api/products` | GET | عرض المنتجات | ✅ جاهز |
| `/api/orders` | GET | عرض الطلبات | ✅ جاهز |
| `/api/dashboard` | GET | لوحة التحكم | ✅ جاهز |

---

## 🧪 أمثلة اختبار عملية

### مثال 1: الدخول للنظام (Login)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alawael.com",
    "password": "password123"
  }'
```

### مثال 2: الحصول على قائمة المستخدمين

```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### مثال 3: إنشاء منتج جديد

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "منتج جديد",
    "price": 99.99,
    "description": "وصف المنتج"
  }'
```

---

## 📱 استخدام Postman

### الخطوات:

1. **تحميل Postman**: https://www.postman.com/downloads/
2. **استيراد Collection** (إذا كانت متاحة)
3. **تعيين Base URL**: `http://localhost:3000`
4. **إضافة رموز في الطلبات**:
   ```
   Authorization: Bearer [YOUR_TOKEN]
   ```

---

## 🔍 عرض السجلات والأخطاء

### في Terminal:
- افتح Terminal حيث يعمل Backend
- يمكنك رؤية جميع الطلبات والأخطاء مباشرة

### معلومات محفوظة:
- **السجلات**: `./logs/` (إن وجدت)
- **قاعدة البيانات**: MongoDB (إذا كانت متصلة)
- **الرموز**: `.env` (اطلب منك مساعدة إذا لزم الأمر)

---

## ⚠️ المشاكل الشائعة والحلول

### ❌ المشكلة: "Connection refused" على `localhost:3000`

**الحل:**
1. تأكد من أن Backend يعمل (اضغط على Terminal حيث Backend)
2. تحقق من أن المنفذ 3000 غير مستخدم:
   ```bash
   netstat -ano | findstr :3000
   ```
3. جرب إيقاف وإعادة تشغيل Backend

---

### ❌ المشكلة: "RouterNotFound" في السجلات

**الحل:** هذا طبيعي في بيئة التطوير. بعض الـ routes الاختيارية قد لا تكون مثبتة.

---

### ❌ المشكلة: أخطاء MongoDB

**الحل:**
1. تأكد من تثبيت MongoDB محلياً أو يمكن الوصول إليها
2. تحقق من متغيرات البيئة `.env`
3. شغل: `mongo` في Terminal آخر

---

## 🚀 الخطوات التالية

### ✅ اختبر الآن:
1. **Health Check**: 
   ```
   http://localhost:3000/api/health
   ```
2. **افتح المتصفح**: `http://localhost:3000`
3. **استخدم Postman**: لاختبار Endpoints المختلفة

### 📊 إذا أردت لوحة التحكم:
```bash
cd supply-chain-management/frontend
npm install
npm start
```

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من السجلات في Terminal
2. اقرأ ملف `./backend/logs/` (إن وجد)
3. تأكد من أن جميع الحزم مثبتة: `npm install`

---

**تاريخ الإنشاء**: 23 فبراير 2026  
**الحالة**: ✅ **جاهز للاختبار**

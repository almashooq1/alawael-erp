# 📘 API Documentation (Swagger/OpenAPI)

**آخر تحديث:** 1 فبراير 2026  
**الحالة:** ✅ جاهز

---

## 🎯 الهدف

توفير توثيق API رسمي وسهل الاستخدام عبر Swagger/OpenAPI مع أمثلة طلبات/استجابات
ومعايير موحّدة للأخطاء والأمان.

---

## ✅ نقاط التوثيق الأساسية

### 1) التحقق (Authentication)

- جميع نقاط النهاية المحمية تتطلب JWT عبر Header:
  - `Authorization: Bearer <TOKEN>`

### 2) التنسيقات القياسية للاستجابة

- **استجابة ناجحة:**
  - `success: true`
  - `data: {...}`
  - `message: "..."`
- **استجابة خطأ:**
  - `success: false`
  - `error: "..."`
  - `code: "..."`

### 3) أخطاء شائعة

- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `500` Internal Server Error

---

## 🚀 تفعيل Swagger UI

### 1) تثبيت الحزم

```bash
npm install swagger-jsdoc swagger-ui-express
```

### 2) إعداد Swagger

- يوجد دليل كامل للتجهيز في الملف التالي:
  - `backend/docs/SWAGGER_DOCUMENTATION.md`

### 3) الوصول إلى واجهة Swagger

- بعد التشغيل:

```
http://localhost:3001/api/docs
```

---

## 📌 ما يجب توثيقه داخل Swagger

- جميع المسارات الأساسية في:
  - المستخدمين
  - المصادقة
  - التقارير
  - الدفع
  - الإشعارات
  - البحث المتقدم
  - الإعدادات

  ### مراقبة النظام (Monitoring)
  - `GET /api/monitoring/health`
  - `GET /api/monitoring/health/dashboard`
  - `GET /api/monitoring/dashboard`
  - `GET /api/monitoring/stream`
  - `GET /api/monitoring/alerts`
  - `POST /api/monitoring/alerts/test`

### لكل Endpoint يجب توثيق:

- وصف الوظيفة
- المدخلات (Parameters / Body)
- مثال Request
- مثال Response
- كود الأخطاء
- الصلاحيات المطلوبة

---

## 🔁 دورة تحديث التوثيق

1. إضافة Endpoint جديد في الكود
2. تحديث وصفه في Swagger
3. التأكد من ظهوره في Swagger UI
4. مراجعة الأمثلة

---

## ✅ مخرجات متوقعة

- توثيق API حي ومحدّث تلقائياً
- واجهة تفاعلية للاختبار
- سهولة مشاركة التوثيق مع الفرق والعملاء

---

**الحالة النهائية:** ✅ توثيق API جاهز ومتكامل

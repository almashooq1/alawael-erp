# 👨‍💻 Developer Guide

**آخر تحديث:** 1 فبراير 2026

---

## 1) تشغيل المشروع محلياً

```bash
cd backend
npm install
npm start
```

### نمط الاختبار السريع (Smart Mode)

```bash
npm run start:smart
```

---

## 2) هيكل المشروع (مختصر)

- `routes/` مسارات الـ API
- `controllers/` منطق الأعمال
- `models/` نماذج قاعدة البيانات
- `middleware/` المصادقة والتحقق
- `config/` الإعدادات
- `utils/` أدوات مساعدة

---

## 3) الاختبارات

- تشغيل جميع الاختبارات:

```bash
npm test
```

- Smoke Tests:

```bash
npm run smoke:comprehensive
```

---

## 4) معايير كتابة Endpoint

- استخدام `async/await`
- توحيد صيغة الاستجابة
- التحقق من المدخلات
- تسجيل الأخطاء في سجلات مركزية

---

## 5) التوثيق (Swagger)

- تحديث التوثيق لكل Endpoint جديد
- التأكد من ظهوره في Swagger UI

---

## 6) الأداء

- استخدام `cacheManager` للكاش
- تشغيل `indexOptimizer` بعد تغييرات قاعدة البيانات
- اعتماد `queryOptimizer` للاستعلامات المعقدة

---

## 6.1) المراقبة والتنبيهات

- لوحة الصحة: `/api/monitoring/health/dashboard`
- حالة النظام: `/api/monitoring/health`
- اللوحة العامة: `/api/monitoring/dashboard`
- البث اللحظي (SSE): `/api/monitoring/stream`

**ENV للتنبيهات (اختياري):**

```text
ALERT_EMAILS=admin@example.com,ops@example.com
ALERT_SMS=+966500000000,+966511111111
```

---

## 7) النصائح الموصى بها

- لا تضف Endpoint بدون توثيق
- لا تعتمد Query بدون فهرس ملائم
- استخدم اختبارات تلقائية لكل ميزة

---

**الحالة:** ✅ دليل المطور جاهز

# ⚡ نظام محوِّل التاريخ - دليل التثبيت السريع

## 🚀 ابدأ في دقيقتين!

### الخطوة 1️⃣: إضافة Routes في Backend

**في ملف: `backend/server.js` أو `backend/app.js`**

```javascript
// أضف هذا السطر بعد باقي الـ routes:
const dateConverterRoutes = require('./routes/dateConverterRoutes');

// ثم أضف:
app.use('/api/date-converter', dateConverterRoutes);
```

### الخطوة 2️⃣: إضافة المكون في Frontend

**في ملف: `frontend/src/App.js`**

```javascript
// أضف الاستيراد في الأعلى:
import DateConverterComponent from './components/DateConverterComponent';

// ثم أضفه في JSX:
function App() {
  return (
    <div>
      {/* باقي المكونات */}
      <DateConverterComponent />
    </div>
  );
}
```

### الخطوة 3️⃣: تشغيل النظام

```bash
# من مجلد backend:
npm start

# من مجلد frontend (terminal جديد):
npm start
```

### الخطوة 4️⃣: جرب الخدمة!

افتح المتصفح وانتقل إلى:

```
http://localhost:3000
```

---

## 📌 أمثلة سريعة

### 1. تحويل ميلادي إلى هجري

```javascript
// في React Component:
const result = await fetch('/api/date-converter/gregorian-to-hijri', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ gregorianDate: '2025-01-16' }),
});
const data = await result.json();
console.log(data.hijri.formatted); // "16 جمادى الآخرة 1445 هـ"
```

### 2. تحويل هجري إلى ميلادي

```javascript
const result = await fetch('/api/date-converter/hijri-to-gregorian', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ hijriDate: '16/6/1445' }),
});
const data = await result.json();
console.log(data.gregorian.formatted); // "January 16, 2025"
```

### 3. الحصول على معلومات اليوم

```bash
curl http://localhost:5000/api/date-converter/today
```

---

## 🧪 تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل اختبارات محدد فقط
npm test -- dateConverterService.test.js

# مع عرض التغطية
npm test -- --coverage
```

---

## ⚙️ الإعدادات المتقدمة

### إضافة Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const dateConverterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب كحد أقصى
});

app.use('/api/date-converter', dateConverterLimiter);
```

### إضافة Logging

```javascript
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
```

---

## 📊 API Endpoints - النسخة السريعة

| النقطة                      | الطريقة | الوصف                 |
| --------------------------- | ------- | --------------------- |
| `/gregorian-to-hijri`       | POST    | تحويل ميلادي إلى هجري |
| `/hijri-to-gregorian`       | POST    | تحويل هجري إلى ميلادي |
| `/info`                     | POST    | معلومات شاملة         |
| `/today`                    | GET     | اليوم الحالي          |
| `/validate`                 | POST    | التحقق من صحة التاريخ |
| `/difference`               | POST    | حساب الفرق            |
| `/format`                   | POST    | تنسيق التاريخ         |
| `/batch`                    | POST    | تحويل دفعي            |
| `/hijri-month/:month/:year` | GET     | معلومات الشهر         |

---

## 🎯 حالات استخدام شائعة

### عرض التاريخ بصيغتين

```javascript
const info = DateConverterService.getCompleteDateInfo('2025-01-16');
console.log(`${info.gregorian.formatted} / ${info.hijri.formatted}`);
// "16 January 2025 / 16 جمادى الآخرة 1445 هـ"
```

### حساب العمر

```javascript
const diff = DateConverterService.getDifference('1990-05-15', new Date());
console.log(`العمر: ${diff.years} سنة`);
```

### التحقق من التاريخ

```javascript
if (DateConverterService.isValidHijri(1445, 6, 16)) {
  console.log('التاريخ صحيح');
}
```

---

## 🐛 استكشاف الأخطاء

### مشكلة: الـ routes لا تعمل

✅ **الحل**: تأكد من إضافة `app.use('/api/date-converter', dateConverterRoutes)` في server.js

### مشكلة: المكون لا يظهر

✅ **الحل**: تأكد من استيراد المكون بشكل صحيح في App.js

### مشكلة: خطأ في التحويل

✅ **الحل**: تأكد من صيغة التاريخ (YYYY-MM-DD للميلادي، DD/MM/YYYY للهجري)

---

## 📞 المساعدة

- 📖 ادرس دليل الـ [DATE_CONVERTER_COMPLETE_GUIDE.md](📅_DATE_CONVERTER_COMPLETE_GUIDE.md)
- 🧪 شاهد الاختبارات في [dateConverterService.test.js](backend/__tests__/dateConverterService.test.js)
- 💻 انظر إلى الكود في [DateConverterService.js](backend/services/DateConverterService.js)

---

## ✅ قائمة التحقق

- [ ] تم إضافة الـ routes في server.js
- [ ] تم استيراد المكون في App.js
- [ ] تم تشغيل الـ backend
- [ ] تم تشغيل الـ frontend
- [ ] تم اختبار الواجهة في المتصفح
- [ ] تم اختبار الـ API مع curl أو Postman

---

## 🎉 تم! أنت الآن جاهز للاستخدام

استمتع بنظام تحويل التاريخ المتقدم! 🚀

---

**للمزيد من المعلومات**: [DATE_CONVERTER_COMPLETE_GUIDE.md](📅_DATE_CONVERTER_COMPLETE_GUIDE.md)

# ⚡ Quick Start Guide - AGI System

## 🚀 البدء السريع في 5 دقائق

### الخطوة 1️⃣: التثبيت

```bash
cd intelligent-agent/backend/agi
npm install
```

### الخطوة 2️⃣: التشغيل

```bash
npm run dev
```

✅ السيرفر يعمل الآن على: `http://localhost:5001`

### الخطوة 3️⃣: الاختبار الأول

```bash
# اختبار الحالة
curl http://localhost:5001/health

# اختبار AGI
curl -X POST http://localhost:5001/api/agi/process \
  -H "Content-Type: application/json" \
  -d '{"input":"Hello AGI!","context":{}}'
```

---

## 📚 الملفات المهمة

| الملف                                          | الوصف          |
| ---------------------------------------------- | -------------- |
| [README_AGI.md](./README_AGI.md)               | التوثيق الكامل |
| [EXAMPLES.md](./EXAMPLES.md)                   | أمثلة عملية    |
| [COMPLETION_REPORT.md](./COMPLETION_REPORT.md) | تقرير الإنجاز  |

---

## 🎯 الأوامر الأساسية

```bash
# التطوير
npm run dev

# البناء
npm run build

# الاختبار
npm test

# الاختبار المستمر
npm run test:watch

# تغطية الاختبارات
npm run test:coverage
```

---

## 🌐 نقاط API الرئيسية

### 1. المعالجة العامة

```bash
POST /api/agi/process
```

### 2. التفكير المنطقي

```bash
POST /api/agi/reason
```

### 3. التعلم

```bash
POST /api/agi/learn
```

### 4. اتخاذ القرار

```bash
POST /api/agi/decide
```

### 5. الإبداع

```bash
POST /api/agi/create
```

### 6. التخطيط

```bash
POST /api/agi/plan
```

### 7. الحالة

```bash
GET /api/agi/status
```

### 8. القدرات

```bash
GET /api/agi/capabilities
```

### 9. الأمثلة

```bash
GET /api/agi/examples
```

---

## 💡 مثال سريع - JavaScript

```javascript
const axios = require('axios');

async function testAGI() {
  const response = await axios.post('http://localhost:5001/api/agi/process', {
    input: 'How can I improve my coding skills?',
    context: { domain: 'programming' },
  });

  console.log(response.data);
}

testAGI();
```

---

## 💡 مثال سريع - Python

```python
import requests

def test_agi():
    response = requests.post('http://localhost:5001/api/agi/process', json={
        'input': 'How can I improve my coding skills?',
        'context': {'domain': 'programming'}
    })
    print(response.json())

test_agi()
```

---

## 💡 مثال سريع - cURL

```bash
curl -X POST http://localhost:5001/api/agi/process \
  -H "Content-Type: application/json" \
  -d '{
    "input": "How can I improve my coding skills?",
    "context": {"domain": "programming"}
  }'
```

---

## 🎓 التعلم أكثر

1. **التوثيق الكامل**: اقرأ [README_AGI.md](./README_AGI.md)
2. **الأمثلة العملية**: تصفح [EXAMPLES.md](./EXAMPLES.md)
3. **الكود المصدري**: استكشف الملفات في المجلد
4. **الاختبارات**: شغل `npm test` لرؤية الأمثلة

---

## 🆘 المساعدة

### المشكلة: خطأ في التثبيت

```bash
# حذف node_modules وإعادة التثبيت
rm -rf node_modules
npm install
```

### المشكلة: المنفذ مستخدم

```bash
# تغيير المنفذ
export AGI_PORT=5002
npm run dev
```

### المشكلة: خطأ TypeScript

```bash
# إعادة بناء المشروع
npm run build
```

---

## 🎉 جاهز للاستخدام!

الآن أنت جاهز لاستخدام نظام AGI المتقدم! 🚀

**Next Steps:**

- جرب الأمثلة في [EXAMPLES.md](./EXAMPLES.md)
- اقرأ التوثيق الكامل في [README_AGI.md](./README_AGI.md)
- ابدأ بتطوير تطبيقك الخاص!

**Happy Coding! 🧠✨**

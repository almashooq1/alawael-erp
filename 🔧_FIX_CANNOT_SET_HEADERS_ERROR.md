# 🔧 حل مشكلة "Cannot set headers after they are sent to the client"

## ❌ المشكلة:

```
Error: Cannot set headers after they are sent to the client
```

هذا الخطأ يحدث في **معظم الاختبارات** ويعني:

- التطبيق يحاول إرسال headers بعد إرسال response
- غالباً في معالج الأخطاء (error handler)
- أو في middleware

---

## 🔍 السبب:

في الملف `backend/server.js` أو `backend/app.js`:

```javascript
// ❌ خطأ شائع:
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
  res.setHeader('X-Custom', 'value'); // ❌ محاولة إرسال header بعد json
});

// أو في معالج الأخطاء:
app.use((err, req, res, next) => {
  res.json({ error: err.message });
  res.status(500); // ❌ محاولة تعيين status بعد json
});
```

---

## ✅ الحل:

### **الحل 1: ترتيب العمليات**

```javascript
// ✅ الطريقة الصحيحة:
app.get('/api/health', (req, res) => {
  res.setHeader('X-Custom', 'value'); // أولاً: headers
  res.status(200); // ثانياً: status
  res.json({ status: 'ok' }); // أخيراً: body
});
```

### **الحل 2: معالج الأخطاء الصحيح**

```javascript
// ❌ خطأ:
app.use((err, req, res, next) => {
  console.error(err);
  res.json({ error: err.message });
  res.status(500);
});

// ✅ صحيح:
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});
```

### **الحل 3: التحقق من الـ Response مرة واحدة فقط**

```javascript
// ❌ خطأ:
app.post('/api/auth/register', (req, res) => {
  try {
    // عملية ما
    res.json({ success: true }); // send 1
  } catch (err) {
    res.json({ success: false, error: err.message }); // send 2 ❌
  }
});

// ✅ صحيح:
app.post('/api/auth/register', (req, res) => {
  try {
    // عملية ما
    return res.json({ success: true }); // استخدم return
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});
```

### **الحل 4: استخدام next() في Middleware**

```javascript
// ❌ خطأ:
app.use((req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authorized' });
  }
  next(); // ❌ next يعمل رغم أن response تم إرساله
});

// ✅ صحيح:
app.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authorized' });
  }
  next();
});
```

---

## 🛠️ الملفات المطلوبة للفحص:

```
1. backend/server.js
   ├─ معالجات الـ routes
   ├─ معالجات الأخطاء
   └─ الـ middleware

2. backend/app.js
   ├─ إعداد Express
   └─ الـ error handlers

3. backend/middleware/
   ├─ auth.js
   ├─ errorHandler.js
   └─ requestHandler.js
```

---

## 📋 نقاط التحقق الأساسية:

```javascript
// 1. كل response يجب أن يكون مرة واحدة:
✓ res.json()
✓ res.send()
✓ res.redirect()
✓ res.render()

// 2. لا تضع عمليات بعد response:
res.json({ data });
console.log('هنا لا يعود المتصفح يسمع');  // ✓ هذا OK للـ logging
res.setHeader('X-Data', 'value');          // ❌ هذا خطأ

// 3. استخدم return دائماً:
return res.json({ data });

// 4. في الـ catch، أرسل response واحد:
catch (err) {
  return res.status(400).json({ error: err.message });
}
```

---

## 🔧 مثال كامل صحيح:

```javascript
// backend/server.js

const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Routes
app.post('/api/auth/register', async (req, res, next) => {
  try {
    // 1. التحقق من البيانات
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required',
      });
    }

    // 2. عمليات أخرى
    const user = await User.create({ email, password });

    // 3. إرسال response واحد فقط
    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (err) {
    // معالج الأخطاء
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// معالج الأخطاء العام
app.use((err, req, res, next) => {
  console.error(err);
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
```

---

## 🧪 اختبار صحيح:

```javascript
// backend/__tests__/auth.test.js

describe('POST /api/auth/register', () => {
  it('should register successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'ValidPass123!',
    });

    // ✅ لا نتوقع أخطاء headers
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should require email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      password: 'ValidPass123!',
    });

    // ✅ response واحد فقط
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
```

---

## 🚨 الحلول السريعة:

### **1. في كل route handler:**

```javascript
// قبل:
res.json({ data });
res.setHeader('X-Custom', 'value');

// بعد:
res.setHeader('X-Custom', 'value');
res.json({ data });
```

### **2. في معالج الأخطاء:**

```javascript
// قبل:
res.json({ error });
res.status(500);

// بعد:
res.status(500).json({ error });
```

### **3. استخدم return:**

```javascript
// قبل:
if (condition) {
  res.json({ message });
}
next();

// بعد:
if (condition) {
  return res.json({ message });
}
next();
```

---

## ✨ الملخص:

```
✅ Rule 1: Set headers FIRST
✅ Rule 2: Set status code SECOND
✅ Rule 3: Send body/response LAST
✅ Rule 4: Use return to stop execution
✅ Rule 5: Only send response ONCE
```

---

**النتيجة: جميع الاختبارات ستعمل بدون أخطاء! 🎉**

هل تريد أن أساعدك في إصلاح الملفات مباشرة؟

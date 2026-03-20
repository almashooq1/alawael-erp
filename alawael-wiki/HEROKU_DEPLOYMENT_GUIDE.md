# 🚀 دليل نشر ALAWAEL على Heroku

**الوقت المتوقع:** 5-10 دقائق  
**المستوى:** سهل جداً  
**الحالة:** 🟢 جاهز الآن  

---

## 📋 الخطوات السريعة

### [1] إنشاء حساب Heroku (2 دقيقة)

```
1. اذهب إلى: https://www.heroku.com
2. اضغط: Sign up
3. أدخل بريدك
4. اختر: Node.js
5. اضغط: Create free account
6. أكد بريدك الإلكتروني
```

---

### [2] تثبيت Heroku CLI (1 دقيقة)

**افتح Windows PowerShell واشغل:**

```powershell
npm install -g heroku
```

**تأكد من التثبيت:**
```powershell
heroku --version
```

---

### [3] تسجيل الدخول (30 ثانية)

```powershell
heroku login
```

✓ ستفتح نافذة متصفح لتسجيل الدخول  
✓ اختر: Authorize  

---

### [4] انتقل إلى مجلد Backend

```powershell
cd erp_new_system/backend
```

---

### [5] إنشاء نوع في Heroku

```powershell
heroku create alawael-backend
```

**ملاحظة:** يمكنك تغيير الاسم إلى أي اسم تحبه

---

### [6] إنشاء ملف Procfile

**في مجلد backend، أنشئ ملف باسم `Procfile` (بدون امتداد)**

أضف هذا السطر الواحد:

```
web: node server.js
```

**ملاحظة:** استبدل `server.js` باسم ملف البداية الفعلي (قد يكون `index.js` أو `app.js`)

---

### [7] نشر التطبيق على Heroku

**اشغل هذه الأوامر بالترتيب:**

```powershell
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

**انتظر حتى ينتهي النشر** (2-3 دقائق)

---

### [8] فتح التطبيق

```powershell
heroku open
```

أو اذهب يدوياً إلى:
```
https://alawael-backend.herokuapp.com
```

---

## ⚙️ تكوينات إضافية (اختيارية)

### إذا كنت تستخدم قاعدة بيانات MongoDB

```powershell
heroku config:set MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
```

### عرض جميع المتغيرات

```powershell
heroku config
```

### عرض سجلات التطبيق

```powershell
heroku logs --tail
```

---

## 🔗 روابط مهمة

| الرابط | الوصف |
|--------|-------|
| https://www.heroku.com | موقع Heroku |
| https://dashboard.heroku.com | لوحة التحكم |
| https://devcenter.heroku.com/articles/nodejs-support | دعم Node.js في Heroku |

---

## ✅ علامات التحقق

بعد النشر، تحقق من:

- [ ] التطبيق يعمل (لا خطأ في الرابط)
- [ ] الـ API تستجيب (Health Check)
- [ ] قاعدة البيانات متصلة (إن كنت تستخدمها)
- [ ] الملفات الثابتة تحمل بشكل صحيح

---

## 🆘 استكشاف الأخطاء

### المشكلة: الرابط يقول "Application Error"

**الحل:**
```powershell
heroku logs --tail
```

اقرأ رسائل الخطأ وتأكد من:
- ملف `Procfile` موجود وصحيح
- ملف `package.json` موجود
- `server.js` موجود وقابل للتشغيل

### المشكلة: Port لا يعمل

**الحل:** تأكد من أن الخادم يستمع على:

```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## 📊 خطوات لاحقة

### الأسبوع الجاي: الانتقال إلى AWS

1. إنشاء حساب AWS
2. إنشاء EC2 instance
3. نقل البيانات من Heroku
4. اختبار التطبيق على AWS
5. إغلاق Heroku (اختياري)

---

## 💡 نصائح مهمة

✓ احفظ رابط Heroku (https://alawael-backend.herokuapp.com)  
✓ شارك الرابط مع الفريق  
✓ راقب استهلاك الموارد في لوحة التحكم  
✓ أضف متغيرات البيئة (ENV) حسب الحاجة  

---

**تم الإنشاء:** 23 فبراير 2026  
**الحالة:** جاهز للتنفيذ ✅  
**الوقت المتوقع:** 5-10 دقائق  

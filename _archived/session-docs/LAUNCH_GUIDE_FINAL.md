# 🚀 دليل إطلاق مشروع الأوال ERP
# Final Launch Guide - AlAwael ERP

---

## ✅ المشروع جاهز للإطلاق بنسبة 100%

---

## 📋 الخطوات الفورية للإطلاق

### الخطوة 1: إعداد قاعدة البيانات (10 دقائق)

1. اذهب إلى [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. أنشئ حساب مجاني
3. أنشئ Cluster مجاني
4. احصل على Connection String
5. ضعه في ملف `.env.production`

```
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/alawael-erp?retryWrites=true&w=majority
```

### الخطوة 2: تعديل ملف البيئة (5 دقائق)

افتح ملف `.env.production` وغيّر القيم التالية:

```bash
# ضروري - غيّر هذه القيم
JWT_SECRET=ضع-مفتاح-عشوائي-من-32-حرف-هنا
SESSION_SECRET=ضع-مفتاح-جلسة-عشوائي-من-32-حرف

# اختياري - للبريد الإلكتروني
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### الخطوة 3: اختيار طريقة الإطلاق

---

## 🎯 الخيار 1: التشغيل المحلي (الأسهل للتجربة)

```bash
# في المجلد الرئيسي
chmod +x launch-now.sh
./launch-now.sh --local
```

أو يدوياً:
```bash
cd backend
npm install
npm start
```

---

## 🐳 الخيار 2: Docker (الأقوى)

```bash
# تأكد من تشغيل Docker
./launch-now.sh --docker
```

أو:
```bash
docker-compose up -d
```

---

## 🟣 الخيار 3: Heroku (للإنتاج السحابي)

```bash
# تثبيت Heroku CLI أولاً
./launch-now.sh --heroku
```

أو يدوياً:
```bash
heroku create alawael-erp
heroku addons:create mongodb-atlas
heroku config:set JWT_SECRET=your-secret
git push heroku main
```

---

## 📊 ما بعد الإطلاق

### التحقق من عمل النظام

```bash
# فحص الصحة
curl http://localhost:3000/health

# فحص API
curl http://localhost:3000/api/v1/status
```

### بيانات الدخول الافتراضية

```
المستخدم: admin@alawael.com
كلمة المرور: Admin@123
```

⚠️ **غيّر كلمة المرور فوراً بعد أول تسجيل دخول!**

---

## 🔧 استكشاف الأخطاء

### المشكلة: لا يعمل الخادم
```bash
# تحقق من السجلات
docker logs alawael-backend
# أو
cd backend && npm run logs
```

### المشكلة: خطأ في قاعدة البيانات
```bash
# تحقق من الاتصال
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('OK')).catch(console.error)"
```

---

## 📞 الدعم

- **GitHub Issues**: https://github.com/almashooq1/alawael-erp/issues
- **Wiki**: ./alawael-wiki/Home.md

---

## ✅ قائمة التحقق النهائية

- [ ] إنشاء MongoDB Atlas
- [ ] تحديث `.env.production` بالقيم الحقيقية
- [ ] تشغيل `./launch-now.sh`
- [ ] التحقق من عمل الموقع
- [ ] تغيير كلمة مرور المدير
- [ ] إعداد SSL (للإنتاج)
- [ ] إعداد النسخ الاحتياطي

---

## 🎉 تهانينا!

المشروع جاهز للاستخدام. ابدأ الآن بتنفيذ:

```bash
./launch-now.sh
```

ثم اختر الخيار المناسب لك.
# 🚀 دليل نشر نظام الأوائل ERP على Hostinger VPS

## المتطلبات
- **VPS Hostinger**: Ubuntu 22.04 أو أحدث
- **دومين**: موصول بـ IP السيرفر
- **SSH**: اتصال SSH بالسيرفر

---

## 📋 الخطوات الكاملة

---

### الخطوة 1: إعداد MongoDB Atlas (مجاني)

1. **افتح** [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. **سجّل حساب** جديد (أو سجّل دخول بـ Google)
3. اضغط **"Build a Database"**
4. اختر **M0 FREE** (مجاني)
5. اختر **المنطقة**: `aws` → `eu-central-1 (Frankfurt)` (الأقرب للسعودية)
6. اسم الـ Cluster: `alawael-prod`
7. اضغط **Create**

#### إعداد المستخدم:
1. في القائمة الجانبية اضغط **Database Access**
2. اضغط **Add New Database User**
3. اختر **Password Authentication**
4. **Username**: `alawael-admin`
5. **Password**: ولّد كلمة مرور قوية (اضغط Autogenerate) **واحفظها!**
6. **Role**: `Atlas admin`
7. اضغط **Add User**

#### إعداد الشبكة:
1. في القائمة الجانبية اضغط **Network Access**
2. اضغط **Add IP Address**
3. أدخل **IP سيرفر Hostinger** الخاص بك
4. اضغط **Confirm**

#### الحصول على رابط الاتصال:
1. اذهب لـ **Database** → اضغط **Connect**
2. اختر **Drivers** → **Node.js**
3. انسخ الرابط:
```
mongodb+srv://alawael-admin:<password>@alawael-prod.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
```
4. **استبدل** `<password>` بكلمة المرور التي حفظتها

---

### الخطوة 2: توصيل الدومين بالسيرفر

#### في لوحة تحكم Hostinger:
1. اذهب لـ **Domains** → اختر دومينك
2. اذهب لـ **DNS / Nameservers** → **DNS Records**
3. أضف/عدّل السجلات:

| النوع | الاسم | القيمة |
|-------|-------|--------|
| A | @ | `IP_السيرفر` |
| A | www | `IP_السيرفر` |

4. انتظر **5-30 دقيقة** لتحديث DNS

#### للتحقق (من جهازك):
```bash
ping yourdomain.com
```

---

### الخطوة 3: الدخول إلى السيرفر عبر SSH

```bash
ssh root@IP_السيرفر
```
أو من خلال **Hostinger Panel** → **VPS** → **SSH Access**

---

### الخطوة 4: رفع الملفات إلى السيرفر

#### الطريقة 1: Git (مُفضّلة)
```bash
# على السيرفر
mkdir -p /home/alawael/app
cd /home/alawael/app
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

#### الطريقة 2: رفع مباشر بـ SCP (من جهازك)
```bash
# من جهازك المحلي - اضغط بزر اليمين في مجلد المشروع واختر Open in Terminal
scp -r backend/ root@IP_السيرفر:/home/alawael/app/backend/
scp -r frontend/ root@IP_السيرفر:/home/alawael/app/frontend/
scp -r deploy/ root@IP_السيرفر:/home/alawael/app/deploy/
```

#### الطريقة 3: FileZilla (سحب وإفلات)
1. حمّل [FileZilla](https://filezilla-project.org/)
2. اتصل: `sftp://IP_السيرفر` | المستخدم: `root` | كلمة المرور
3. ارفع المجلدات (`backend`, `frontend`, `deploy`) إلى `/home/alawael/app/`

> ⚠️ **مهم**: لا ترفع مجلدات `node_modules` - سيتم تثبيتها على السيرفر

---

### الخطوة 5: إعداد السيرفر (تلقائي)

```bash
# على السيرفر
cd /home/alawael/app
chmod +x deploy/hostinger/setup-server.sh
sudo bash deploy/hostinger/setup-server.sh
```

السكربت يسألك:
- **اسم الدومين**: أدخل دومينك (مثل: `alawael.com`)
- **البريد الإلكتروني**: لشهادة SSL

السكربت يثبّت تلقائياً:
- ✅ Node.js 20
- ✅ PM2 (مدير العمليات)
- ✅ Nginx (خادم الويب)
- ✅ شهادة SSL (Let's Encrypt)
- ✅ جدار الحماية (UFW)

---

### الخطوة 6: إعداد ملف البيئة (.env)

```bash
# على السيرفر
cp /home/alawael/app/deploy/hostinger/.env.production /home/alawael/app/backend/.env
nano /home/alawael/app/backend/.env
```

**عدّل القيم التالية** (اضغط على القيمة وغيّرها):

```env
# ── رابط MongoDB Atlas (من الخطوة 1) ──
MONGODB_URI=mongodb+srv://alawael-admin:YOUR_PASSWORD@alawael-prod.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority

# ── الدومين ──
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# ── مفاتيح الأمان (غيّرها لقيم عشوائية) ──
JWT_SECRET=هنا_ضع_نص_عشوائي_طويل_جداً_32_حرف_على_الأقل
JWT_REFRESH_SECRET=نص_عشوائي_آخر_مختلف_عن_الأول
SESSION_SECRET=نص_عشوائي_ثالث_مختلف
```

#### لتوليد مفاتيح عشوائية آمنة:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
شغّل الأمر **3 مرات** ← انسخ كل نتيجة لمفتاح مختلف.

**احفظ الملف**: اضغط `Ctrl+X` → `Y` → `Enter`

---

### الخطوة 7: تحديث رابط الـ Frontend

```bash
nano /home/alawael/app/frontend/.env.production
```

**غيّر** `YOUR_DOMAIN.com` إلى دومينك:
```env
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_API_V1_URL=https://yourdomain.com/api/v1
REACT_APP_WS_URL=wss://yourdomain.com
```

**احفظ**: `Ctrl+X` → `Y` → `Enter`

---

### الخطوة 8: نشر التطبيق

```bash
cd /home/alawael/app
chmod +x deploy/hostinger/deploy.sh
sudo -u alawael bash deploy/hostinger/deploy.sh
```

هذا السكربت:
1. ✅ يثبّت حزم Backend
2. ✅ يبني Frontend
3. ✅ يشغّل التطبيق مع PM2
4. ✅ يتحقق من التشغيل

---

### الخطوة 9: التحقق من النشر ✅

```bash
# حالة التطبيق
pm2 list

# فحص الصحة
curl https://yourdomain.com/health

# فحص API
curl https://yourdomain.com/api/health

# السجلات (لو في مشاكل)
pm2 logs alawael-api --lines 50
```

**افتح المتصفح** وادخل: `https://yourdomain.com`

يجب أن ترى صفحة تسجيل الدخول! 🎉

---

## 🔧 أوامر الصيانة اليومية

```bash
# إعادة تشغيل التطبيق
pm2 restart alawael-api

# إيقاف التطبيق
pm2 stop alawael-api

# عرض السجلات مباشرة
pm2 logs alawael-api

# مراقبة الأداء
pm2 monit

# حالة Nginx
sudo systemctl status nginx

# إعادة تشغيل Nginx
sudo systemctl restart nginx
```

---

## 🔄 تحديث التطبيق (عند وجود نسخة جديدة)

```bash
# الدخول للسيرفر
ssh root@IP_السيرفر

# الطريقة 1: Git
cd /home/alawael/app
git pull origin main

# الطريقة 2: SCP (من جهازك)
scp -r backend/ root@IP_السيرفر:/home/alawael/app/backend/
scp -r frontend/ root@IP_السيرفر:/home/alawael/app/frontend/

# إعادة النشر
cd /home/alawael/app
sudo -u alawael bash deploy/hostinger/deploy.sh
```

---

## 🆘 حل المشاكل الشائعة

### "502 Bad Gateway"
```bash
# تحقق أن التطبيق يعمل
pm2 list
# إذا متوقف:
pm2 restart alawael-api
# شوف السجلات:
pm2 logs alawael-api --lines 100
```

### "Connection Refused" أو "ECONNREFUSED"
```bash
# تحقق من ملف .env
cat /home/alawael/app/backend/.env | grep MONGODB
# تحقق من اتصال MongoDB
node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI||'YOUR_URI').then(()=>console.log('OK')).catch(e=>console.log(e.message))"
```

### "Cannot GET /"
```bash
# تأكد من بناء Frontend
ls /home/alawael/app/frontend/build/
# إذا فارغ:
cd /home/alawael/app/frontend && npm run build
sudo systemctl reload nginx
```

### مشاكل SSL
```bash
# تجديد الشهادة يدوياً
sudo certbot renew
sudo systemctl reload nginx
```

### المساحة ممتلئة
```bash
# تحقق من المساحة
df -h
# حذف سجلات قديمة
pm2 flush
```

---

## 📊 النسخ الاحتياطي لقاعدة البيانات

### طريقة يدوية:
```bash
# تثبيت أدوات MongoDB
npm install -g mongodump-stream

# نسخ احتياطي
mongodump --uri="mongodb+srv://alawael-admin:PASSWORD@alawael-prod.xxxxx.mongodb.net/alawael-erp" --out=/home/alawael/backups/db_$(date +%Y%m%d)
```

### من MongoDB Atlas مباشرة:
1. اذهب لـ Atlas Dashboard
2. اضغط على **Cluster** → **...** → **Back Up / Restore**
3. اضغط **Take Snapshot Now**

> 💡 **نصيحة**: MongoDB Atlas M0 المجاني يأخذ نسخ احتياطية تلقائياً!

---

## 📞 معلومات مهمة

| البند | القيمة |
|-------|--------|
| مسار التطبيق | `/home/alawael/app` |
| مسار Backend | `/home/alawael/app/backend` |
| مسار Frontend Build | `/home/alawael/app/frontend/build` |
| مسار السجلات | `/home/alawael/logs` |
| إعدادات Nginx | `/etc/nginx/sites-available/alawael` |
| ملف البيئة | `/home/alawael/app/backend/.env` |
| PM2 Config | `/home/alawael/app/ecosystem.config.js` |
| شهادة SSL | `/etc/letsencrypt/live/yourdomain.com/` |
| Port Backend | `5000` |

---

**تم بنجاح! 🎉** النظام جاهز للعمل على `https://yourdomain.com`

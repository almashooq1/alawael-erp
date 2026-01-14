# دليل النشر الشامل - AlAwael ERP System

## Complete Deployment Guide

📅 **تاريخ:** 10 يناير 2026  
🚀 **الحالة:** جاهز للنشر على Hostinger

---

## 📊 حالة المشروع الحالية

### ✅ ما تم إنجازه

#### 1. تطوير النظام

- ✅ Backend API كامل (Node.js + Express)
- ✅ Frontend كامل (React)
- ✅ قاعدة بيانات MongoDB
- ✅ نظام المصادقة JWT
- ✅ جميع الخدمات (Employees, Users, Reports, Finance, etc.)

#### 2. التوثيق

- ✅ README.md شامل مع badges احترافية
- ✅ CONTRIBUTING.md
- ✅ MIT License
- ✅ HOSTINGER_DEPLOYMENT.md (13,850 bytes)
- ✅ دليل استخدام USAGE_GUIDE.md

#### 3. ملفات النشر

- ✅ deploy-hostinger.sh (سكريبت bash للنشر التلقائي)
- ✅ deploy-to-hostinger.ps1 (سكريبت PowerShell)
- ✅ nginx-hostinger.conf (إعدادات Nginx)
- ✅ HOSTINGER_CONNECT_GUIDE.ps1 (دليل الاتصال)

#### 4. GitHub Repository

- ✅ الكود محمل على: https://github.com/almashooq1/alawael-erp
- ✅ جميع الملفات محدثة
- ✅ 8+ commits للنشر

---

## 🔧 المتطلبات التقنية

### النظام المحلي (Windows)

```
✅ Node.js: v22.20.0
✅ npm: v10.9.3
✅ Git: مثبت
✅ Backend dependencies: مثبتة
✅ Frontend dependencies: مثبتة
```

### Hostinger Server

```
⚠️ يحتاج تفعيل:
  - Node.js (من cPanel)
  - npm
  - PM2 (سيتم تثبيته)
  - Git (موجود)
```

---

## 🌐 معلومات Hostinger

### بيانات الاتصال

```
Host:     82.25.96.160
Port:     65002
Username: u799444911
Password: Be@101010
```

### خطوات تفعيل Node.js على Hostinger

1. **الدخول إلى cPanel**
   - افتح: https://hpanel.hostinger.com
   - سجل الدخول بحسابك

2. **تفعيل Node.js**
   - اذهب إلى: Advanced → Node.js Selector
   - اختر: Node.js Version (أحدث إصدار متاح)
   - اضغط: Enable Node.js

3. **تفعيل SSH Access**
   - اذهب إلى: Advanced → SSH Access
   - تأكد من تفعيل SSH
   - احفظ معلومات الاتصال

---

## 🚀 طرق النشر (3 طرق)

### الطريقة 1: PuTTY (الأسهل - موصى بها)

#### أ. تحميل وإعداد PuTTY

```
1. حمّل PuTTY من: https://www.putty.org/
2. شغّل putty.exe
3. في Session:
   - Host Name: 82.25.96.160
   - Port: 65002
   - Connection type: SSH
4. اضغط Open
5. Login as: u799444911
6. Password: Be@101010
```

#### ب. أوامر النشر (نفذها واحدة تلو الأخرى)

```bash
# 1. التحقق من البيئة
whoami
pwd
node --version
npm --version
git --version

# 2. إزالة النسخة القديمة (إن وجدت)
cd ~
rm -rf alawael-erp

# 3. استنساخ المشروع من GitHub
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# 4. إعداد Backend
cd backend
npm install --production

# 5. إنشاء ملف .env للـ Backend
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/alawael-erp
JWT_SECRET=your-super-secret-jwt-key-change-this-2026
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://yourdomain.com
REDIS_HOST=localhost
REDIS_PORT=6379
EOF

# 6. تثبيت PM2 (مدير العمليات)
npm install -g pm2

# 7. تشغيل Backend
pm2 start server.js --name alawael-backend
pm2 save
pm2 startup

# 8. إعداد Frontend
cd ../frontend
npm install --production

# 9. إنشاء ملف .env للـ Frontend
cat > .env.production << 'EOF'
REACT_APP_API_URL=http://yourdomain.com:3001
REACT_APP_ENV=production
EOF

# 10. بناء Frontend
npm run build

# 11. تشغيل Frontend
pm2 start npm --name alawael-frontend -- start
pm2 save

# 12. فحص الحالة
pm2 list
pm2 logs alawael-backend --lines 20
pm2 logs alawael-frontend --lines 20
```

#### ج. التحقق من التشغيل

```bash
# فحص Backend
curl http://localhost:3001/health

# فحص المنافذ
netstat -tuln | grep 3001
netstat -tuln | grep 3000

# فحص PM2
pm2 status
```

---

### الطريقة 2: PowerShell Script (تلقائي)

```powershell
# في PowerShell على Windows
cd "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

# تثبيت Posh-SSH إذا لم يكن مثبتاً
Install-Module -Name Posh-SSH -Force -Scope CurrentUser

# تشغيل سكريبت النشر التلقائي
.\deploy-to-hostinger.ps1
```

**ملاحظة:** يتطلب أن يكون Node.js مفعّل على Hostinger أولاً.

---

### الطريقة 3: استضافة سحابية بديلة (سريع)

إذا واجهت صعوبات مع Hostinger، استخدم:

#### Frontend: Vercel

```bash
# في مجلد frontend
npm install -g vercel
vercel login
vercel --prod
```

#### Backend: Railway

```bash
# في مجلد backend
npm install -g railway
railway login
railway init
railway up
```

**الوقت المتوقع:** 10 دقائق  
**التكلفة:** مجاني للبداية

---

## 🔐 إعداد الدومين و SSL

### 1. ربط الدومين (بعد النشر)

```
1. اذهب إلى Hostinger Control Panel
2. Domains → Manage
3. DNS Records → Add Record:
   - Type: A
   - Name: @ (أو www)
   - Points to: 82.25.96.160
   - TTL: 14400
```

### 2. تثبيت SSL Certificate

```bash
# على Hostinger عبر SSH
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# اتبع التعليمات التفاعلية
# سيتم التجديد تلقائياً كل 90 يوم
```

### 3. إعداد Nginx

```bash
# نسخ إعدادات Nginx
cd /etc/nginx/sites-available/
sudo nano alawael-erp

# الصق محتوى nginx-hostinger.conf
# ثم احفظ (Ctrl+O, Enter, Ctrl+X)

# تفعيل الإعدادات
sudo ln -s /etc/nginx/sites-available/alawael-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧪 اختبار النظام بعد النشر

### 1. Backend API Test

```bash
# Health Check
curl http://yourdomain.com:3001/health

# Login Test
curl -X POST http://yourdomain.com:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alawael.com","password":"Admin@123456"}'
```

### 2. Frontend Test

```
افتح المتصفح: http://yourdomain.com

سجل الدخول:
  Email: admin@alawael.com
  Password: Admin@123456
```

### 3. PM2 Monitoring

```bash
# حالة الخدمات
pm2 status

# عرض اللوجات
pm2 logs

# معلومات مفصلة
pm2 show alawael-backend
pm2 show alawael-frontend

# إعادة التشغيل
pm2 restart all

# إيقاف الخدمات
pm2 stop all

# حذف الخدمات
pm2 delete all
```

---

## 🔄 تحديث النظام (Pull من GitHub)

```bash
# على Hostinger عبر SSH
cd ~/alawael-erp

# إيقاف الخدمات
pm2 stop all

# سحب التحديثات
git pull origin main

# تحديث Backend
cd backend
npm install --production
pm2 restart alawael-backend

# تحديث Frontend
cd ../frontend
npm install --production
npm run build
pm2 restart alawael-frontend

# فحص الحالة
pm2 status
```

---

## 🚨 حل المشاكل الشائعة

### مشكلة 1: Node.js not found

```
الحل:
1. ادخل cPanel
2. Advanced → Node.js Selector
3. فعّل Node.js
4. أعد المحاولة
```

### مشكلة 2: Port 3001 in use

```bash
# إيجاد العملية
lsof -i :3001

# إيقافها
kill -9 [PID]

# أو استخدم PM2
pm2 delete alawael-backend
pm2 start server.js --name alawael-backend
```

### مشكلة 3: MongoDB connection failed

```bash
# تحقق من MongoDB
sudo systemctl status mongodb

# ابدأها إذا كانت متوقفة
sudo systemctl start mongodb

# أو استخدم MongoDB Atlas (سحابي)
# غيّر MONGODB_URI في .env إلى:
# mongodb+srv://username:password@cluster.mongodb.net/alawael-erp
```

### مشكلة 4: Frontend build fails

```bash
# امسح cache وأعد البناء
cd frontend
rm -rf node_modules build
npm install
npm run build
```

### مشكلة 5: CORS errors

```javascript
// في backend/server.js تأكد من:
const cors = require('cors');
app.use(
  cors({
    origin: 'http://yourdomain.com',
    credentials: true,
  }),
);
```

---

## 📈 مراقبة الأداء

### PM2 Monitoring

```bash
# Dashboard تفاعلي
pm2 monit

# استخدام الموارد
pm2 list

# Logs الوقت الفعلي
pm2 logs --lines 100
```

### Log Files

```bash
# Backend logs
tail -f ~/.pm2/logs/alawael-backend-out.log
tail -f ~/.pm2/logs/alawael-backend-error.log

# Frontend logs
tail -f ~/.pm2/logs/alawael-frontend-out.log
```

---

## 🔒 أمان النظام

### 1. تغيير كلمة السر الافتراضية

```javascript
// في backend, غيّر:
// - JWT_SECRET في .env
// - كلمة سر المسؤول من Dashboard
```

### 2. تفعيل Firewall

```bash
# السماح بالمنافذ الضرورية فقط
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. تحديثات الأمان

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تحديث npm packages
npm update
npm audit fix
```

---

## 📊 ملخص الأوامر السريعة

### التشغيل المحلي (Windows)

```powershell
# Backend
cd backend
node server.js

# Frontend (terminal آخر)
cd frontend
npm start
```

### النشر على Hostinger

```bash
# PuTTY → SSH
ssh -p 65002 u799444911@82.25.96.160

# أو PowerShell
.\deploy-to-hostinger.ps1
```

### إدارة الخدمات

```bash
pm2 list          # عرض الحالة
pm2 restart all   # إعادة تشغيل
pm2 stop all      # إيقاف
pm2 logs          # عرض اللوجات
pm2 monit         # مراقبة
```

---

## 📞 الدعم والمساعدة

### الملفات المرجعية

- 📄 `HOSTINGER_DEPLOYMENT.md` - دليل النشر المفصل
- 📄 `HOSTINGER_CONNECT_GUIDE.ps1` - دليل الاتصال
- 📄 `deploy-hostinger.sh` - سكريبت النشر التلقائي
- 📄 `nginx-hostinger.conf` - إعدادات Nginx

### الروابط المفيدة

- 🔗 GitHub: https://github.com/almashooq1/alawael-erp
- 🔗 PuTTY: https://www.putty.org/
- 🔗 PM2 Docs: https://pm2.keymetrics.io/
- 🔗 Hostinger Help: https://support.hostinger.com

---

## ✅ Checklist النشر

قبل النشر:

- [ ] Node.js مفعّل على Hostinger
- [ ] SSH Access مفعّل
- [ ] معلومات الاتصال صحيحة
- [ ] GitHub repository محدث

أثناء النشر:

- [ ] المشروع استُنسخ بنجاح
- [ ] Dependencies مثبتة
- [ ] ملفات .env تم إنشاؤها
- [ ] Backend يعمل على port 3001
- [ ] Frontend مبني ويعمل على port 3000
- [ ] PM2 يعمل ومحفوظ

بعد النشر:

- [ ] Health check ناجح
- [ ] Login API يعمل
- [ ] Dashboard يظهر
- [ ] Domain متصل (اختياري)
- [ ] SSL مثبت (اختياري)
- [ ] Nginx معدّ (اختياري)

---

## 🎯 الخطوة التالية

**اختر طريقة واحدة وابدأ:**

1. **للمبتدئين:** استخدم PuTTY (الطريقة 1)
2. **للمتقدمين:** نفذ السكريبت التلقائي (الطريقة 2)
3. **للسرعة:** استخدم Vercel + Railway (الطريقة 3)

**جاهز؟ ابدأ الآن! 🚀**

---

**آخر تحديث:** 10 يناير 2026  
**الإصدار:** 1.0.0  
**الحالة:** ✅ جاهز للنشر

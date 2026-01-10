# 🚀 دليل رفع AlAwael ERP إلى Hostinger

# 📚 Hostinger Deployment Guide for AlAwael ERP

## 📋 المتطلبات | Requirements

- ✅ حساب Hostinger مع دعم Node.js
- ✅ إمكانية SSH/Terminal
- ✅ Git مثبت على السيرفر
- ✅ Node.js v18+ على السيرفر
- ✅ npm v8+
- ✅ Hostinger Account with Node.js support
- ✅ SSH/Terminal access
- ✅ Git installed on server
- ✅ Node.js v18+ on server
- ✅ npm v8+

---

## 🔧 الخطوة 1: تحضير Hostinger | Step 1: Prepare Hostinger

### 1.1 تفعيل Node.js | Enable Node.js

**في لوحة تحكم Hostinger:**

1. اذهب إلى **Hosting** → **Manage**
2. انظر إلى قسم **Node.js**
3. تأكد من تفعيل Node.js
4. اختر الإصدار v18.x أو أحدث

```
In Hostinger Control Panel:
1. Go to Hosting → Manage
2. Look for Node.js section
3. Enable Node.js
4. Select version v18.x or latest
```

### 1.2 الوصول عبر SSH | SSH Access

**احصل على بيانات SSH:**

1. من لوحة التحكم: **Hosting** → **Manage**
2. ابحث عن **SSH/SFTP Credentials**
3. ستجد:
   - **Server/Host**: يبدأ بـ `217.xxx.xxx.xxx`
   - **Username**: المستخدم
   - **Password**: كلمة المرور
   - **Port**: عادة `22`

```
Get SSH credentials:
1. Go to Hosting → Manage
2. Find SSH/SFTP Credentials
3. You'll get:
   - Server/Host: 217.xxx.xxx.xxx
   - Username: your_username
   - Password: your_password
   - Port: 22
```

### 1.3 الاتصال عبر SSH | Connect via SSH

**استخدم Putty أو Terminal:**

```bash
# Windows (PowerShell)
ssh -p 22 username@217.xxx.xxx.xxx

# أو استخدم Putty
# Host: 217.xxx.xxx.xxx
# Port: 22
# Username: your_username
# Password: your_password
```

---

## 📁 الخطوة 2: تحضير الملفات | Step 2: Prepare Files

### 2.1 اختر مكان التثبيت | Choose Installation Location

```bash
# في SSH:
# عادة تكون الملفات في:
cd ~/domains/yourdomain.com/public_html

# أو
cd ~/public_html

# أنشئ مجلد للمشروع (اختياري):
mkdir alawael-erp
cd alawael-erp
```

### 2.2 استنسخ من GitHub | Clone from GitHub

```bash
# استنسخ المشروع
git clone https://github.com/almashooq1/alawael-erp.git .

# إذا أردت في مجلد منفصل:
git clone https://github.com/almashooq1/alawael-erp.git alawael-erp
cd alawael-erp
```

---

## ⚙️ الخطوة 3: إعداد Backend | Step 3: Setup Backend

### 3.1 انتقل إلى مجلد Backend | Go to Backend Directory

```bash
cd backend

# تحقق من وجود package.json
ls -la
```

### 3.2 تثبيت Dependencies | Install Dependencies

```bash
# تثبيت المكتبات المطلوبة
npm install --production

# أو إذا أردت التطوير:
npm install
```

### 3.3 إعداد متغيرات البيئة | Setup Environment Variables

```bash
# أنشئ ملف .env
nano .env

# أو
cat > .env << EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
FRONTEND_URL=https://yourdomain.com
EOF
```

**متغيرات البيئة المهمة:**

```env
# Port - استخدم port متاح على Hostinger (عادة يكون محدد)
PORT=3001

# Environment
NODE_ENV=production

# JWT Secrets - غيّر هذه القيم!
JWT_SECRET=your-super-secret-jwt-key-12345-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key-67890-change-this

# Token Expiration
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Database (إذا استخدمت MongoDB)
# DATABASE_URL=your-mongodb-connection-string
```

### 3.4 اختبر البدء | Test Start

```bash
# تشغيل تجريبي
node server.js

# يجب أن تراه يبدأ
# ستشاهد: ✅ Backend running on port 3001

# اضغط Ctrl+C للإيقاف
```

---

## 🎨 الخطوة 4: إعداد Frontend | Step 4: Setup Frontend

### 4.1 انتقل إلى مجلد Frontend | Go to Frontend Directory

```bash
# عد إلى المجلد الأساسي
cd ..
cd frontend

# تحقق من وجود package.json
ls -la
```

### 4.2 تثبيت Dependencies | Install Dependencies

```bash
npm install --production
```

### 4.3 إعداد متغيرات البيئة | Setup Environment Variables

```bash
# أنشئ ملف .env.production
cat > .env.production << EOF
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_API_BASE=/api
PORT=3000
BROWSER=none
EOF
```

### 4.4 بناء Frontend | Build Frontend

```bash
# بناء الإصدار الإنتاجي
npm run build

# ستُنشئ مجلد `build` يحتوي على الملفات المُجمعة
```

---

## 🚀 الخطوة 5: تشغيل الخادم | Step 5: Run Server

### 5.1 استخدم PM2 لتشغيل دائم | Use PM2 for Persistent Running

**PM2 يبقي التطبيق يعمل حتى بعد إغلاق SSH**

```bash
# تثبيت PM2 (عام)
npm install -g pm2

# في مجلد backend
cd backend

# تشغيل Backend باستخدام PM2
pm2 start server.js --name "alawael-backend"

# تشغيل Frontend باستخدام PM2
cd ../frontend
pm2 start "npm start" --name "alawael-frontend"

# عرض الخدمات الجارية
pm2 list

# جعل PM2 يبدأ عند إعادة تشغيل السيرفر
pm2 startup
pm2 save
```

### 5.2 بدائل: استخدم Service Files | Alternative: Use Service Files

إنشئ ملف service للبدء التلقائي:

```bash
# إنشئ ملف service للـ Backend
sudo nano /etc/systemd/system/alawael-backend.service

# أضف المحتوى:
[Unit]
Description=AlAwael ERP Backend
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/home/your_username/alawael-erp/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

ثم قم بتفعيله:

```bash
# تفعيل الخدمة
sudo systemctl enable alawael-backend.service

# بدء الخدمة
sudo systemctl start alawael-backend.service

# معرفة حالة الخدمة
sudo systemctl status alawael-backend.service
```

---

## 🔗 الخطوة 6: إعداد Domain و Proxy | Step 6: Setup Domain & Proxy

### 6.1 إعادة توجيه النطاق | Domain Routing

**في لوحة تحكم Hostinger:**

1. **للـ Frontend (الواجهة الأمامية):**
   - اذهب إلى **Domains**
   - اختر النطاق الأساسي: `yourdomain.com`
   - وجهه إلى مجلد `frontend/build`

2. **للـ Backend API (الواجهة الخلفية):**
   - أنشئ subdomain: `api.yourdomain.com`
   - وجهه للـ port 3001

### 6.2 استخدم Reverse Proxy | Reverse Proxy Setup

إذا كنت تستخدم Nginx (غالباً موجود على Hostinger):

```bash
# عدّل ملف الإعدادات
sudo nano /etc/nginx/sites-enabled/yourdomain.com

# أضف الكود التالي:
```

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    root /home/username/domains/yourdomain.com/frontend/build;
    index index.html;
    
    location / {
        try_files $uri /index.html;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

ثم أعد تشغيل Nginx:

```bash
# تحقق من الإعدادات
sudo nginx -t

# أعد تشغيل
sudo systemctl restart nginx
```

---

## 🔒 الخطوة 7: SSL Certificate | Step 7: SSL Certificate

### 7.1 استخدم Let's Encrypt (مجاني) | Use Let's Encrypt (Free)

```bash
# تثبيت Certbot
sudo apt-get install certbot python3-certbot-nginx

# الحصول على شهادة SSL
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# التحديث التلقائي
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 7.2 Hostinger SSL | Hostinger Built-in SSL

1. من لوحة التحكم: **SSL Certificates**
2. اختر **Install Free Let's Encrypt SSL**
3. اختر نطاقك
4. اضغط Install

---

## 🧪 الخطوة 8: الاختبار | Step 8: Testing

### 8.1 اختبر Backend API | Test Backend API

```bash
# من جهازك (ليس SSH):
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alawael.com","password":"Admin@123456"}'

# يجب أن ترجع:
# {"success":true,"data":{"accessToken":"eyJ...","user":{...}}}
```

### 8.2 اختبر Frontend | Test Frontend

```bash
# افتح في المتصفح:
https://yourdomain.com

# حاول تسجيل الدخول:
# Email: admin@alawael.com
# Password: Admin@123456
```

### 8.3 قائمة الاختبار | Test Checklist

- [ ] Frontend يحمل على `https://yourdomain.com`
- [ ] Login يعمل بدون أخطاء
- [ ] Dashboard يظهر بعد التسجيل
- [ ] API requests تعمل (`/api/employees` وغيره)
- [ ] الأخطاء تظهر في Console بشكل صحيح

---

## 📊 مراقبة الخدمة | Monitor Services

### 8.1 مع PM2 | With PM2

```bash
# عرض الخدمات
pm2 list

# عرض السجلات (logs)
pm2 logs alawael-backend
pm2 logs alawael-frontend

# مراقبة الموارد (CPU, Memory)
pm2 monit
```

### 8.2 مع Systemd | With Systemd

```bash
# معرفة الحالة
sudo systemctl status alawael-backend

# عرض السجلات
sudo journalctl -u alawael-backend -f

# إيقاف/بدء الخدمة
sudo systemctl stop alawael-backend
sudo systemctl start alawael-backend
```

---

## 🔄 تحديثات المشروع | Update Project

### 9.1 سحب أحدث الكود من GitHub | Pull Latest Code

```bash
# في المجلد الأساسي
git pull origin main

# ثبّت المكتبات الجديدة (إن وجدت)
cd backend
npm install --production

cd ../frontend
npm install --production
npm run build
```

### 9.2 إعادة تشغيل الخدمات | Restart Services

```bash
# مع PM2
pm2 restart alawael-backend
pm2 restart alawael-frontend

# مع Systemd
sudo systemctl restart alawael-backend
```

---

## 🆘 استكشاف الأخطاء | Troubleshooting

### المشكلة 1: Backend لا يبدأ | Backend Won't Start

```bash
# تحقق من السجلات
pm2 logs alawael-backend

# تحقق من Port
netstat -tlnp | grep 3001

# تحقق من Permissions
chmod +x server.js

# تشغيل يدوي لرؤية الخطأ
cd backend
node server.js
```

### المشكلة 2: Frontend لا يحمل | Frontend Won't Load

```bash
# تحقق من build
cd frontend
npm run build

# تحقق من أن build موجود
ls -la build/

# تحقق من Nginx config
sudo nginx -t
```

### المشكلة 3: API errors | API Errors

```bash
# تحقق من اتصال البيانات
curl http://localhost:3001/health

# تحقق من متغيرات البيئة
cat backend/.env

# تحقق من CORS headers
curl -i http://localhost:3001/api/employees
```

### المشكلة 4: Port مستخدم | Port Already in Use

```bash
# ابحث عن العملية
lsof -i :3001

# أوقفها
kill -9 PID

# أو استخدم port مختلف في .env
```

---

## 📱 خيارات بديلة | Alternative Hosting Options

### إذا أردت استضافة أسهل:

**للـ Frontend (مجاني):**
- ✅ Vercel: `vercel.com` (Recommended)
- ✅ Netlify: `netlify.com`
- ✅ GitHub Pages

**للـ Backend:**
- ✅ Railway: `railway.app`
- ✅ Render: `render.com`
- ✅ Fly.io: `fly.io`

---

## 📝 ملخص الخطوات | Summary

```bash
# 1. SSH إلى Hostinger
ssh username@host.com

# 2. استنسخ من GitHub
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# 3. Backend
cd backend
npm install --production
cat > .env << EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-key
FRONTEND_URL=https://yourdomain.com
EOF
pm2 start server.js --name "alawael-backend"

# 4. Frontend
cd ../frontend
npm install --production
npm run build
pm2 start "npm start" --name "alawael-frontend"

# 5. Configure Nginx/Domain
# (عن طريق لوحة التحكم)

# 6. SSL Certificate
sudo certbot --nginx -d yourdomain.com

# 7. معرفة الحالة
pm2 list
pm2 logs
```

---

## 🎯 نقاط مهمة | Important Notes

1. **غيّر JWT Secret:** استخدم قيم آمنة وليست القيم الافتراضية
2. **استخدم HTTPS:** لا تستخدم HTTP في الإنتاج
3. **حماية البيانات:** حماية ملف `.env` (يجب ألا يكون في GitHub)
4. **النسخ الاحتياطية:** احعل backup دوري للبيانات
5. **المراقبة:** راقب logs الخدمات بانتظام

---

## 📞 دعم إضافي | Additional Support

إذا واجهت مشاكل:

1. **تحقق من Hostinger Docs**: https://support.hostinger.com
2. **Node.js Deployment**: https://nodejs.org/en/docs/guides/nodejs-web-app/
3. **PM2 Docs**: https://pm2.keymetrics.io
4. **Nginx Docs**: https://nginx.org/en/docs/

---

<div align="center">

## ✅ تم! AlAwael ERP الآن على Hostinger!

### 🎉 Your ERP System is Now Live!

**Site:** https://yourdomain.com

**Admin Panel:** https://api.yourdomain.com

**GitHub:** https://github.com/almashooq1/alawael-erp

</div>

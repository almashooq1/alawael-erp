# 🚀 PRIORITY 5: Production Deployment - LIVE GUIDE

**Status:** 📋 READY FOR DEPLOYMENT  
**Estimated Time:** 90 دقيقة  
**Difficulty:** Intermediate

---

## 🎯 ما سننجزه خلال 90 دقيقة

| المرحلة | المهمة        | الوقت    |
| ------- | ------------- | -------- |
| 1       | إنشاء VPS     | 10 دقائق |
| 2       | إعداد الخادم  | 15 دقائق |
| 3       | نشر التطبيق   | 15 دقائق |
| 4       | إعداد PM2     | 10 دقائق |
| 5       | إعداد Nginx   | 15 دقائق |
| 6       | تفعيل SSL     | 10 دقائق |
| 7       | اختبار النظام | 5 دقائق  |

**النتيجة:** تطبيقك LIVE على الإنترنت! 🎉

---

## 🟢 المرحلة 1: إنشاء VPS (10 دقائق)

### اختر من هذه الخيارات:

#### ✨ الخيار الأول: DigitalOcean (موصى به)

```
⏱️ الوقت: 5 دقائق
💰 السعر: $5-6 شهرياً
✅ سهل جداً
```

**الخطوات:**

```
1. اذهب إلى: https://www.digitalocean.com
2. اضغط: "Sign Up" أو "Create Account"
3. ادخل: البريد الإلكتروني
4. أكمل التحقق
5. اضغط: "Create" → "Droplet"

في الخيارات:
- OS: Ubuntu 22.04 LTS
- Size: Basic ($5/month, 1GB RAM) ← هذا كافي!
- Region: اختر أقرب منطقة
- SSH Key: اختر "Use password" (أسهل)

ثم: "Create Droplet"
```

**ستحصل على:**

- IP Address مثل: `123.45.67.89`
- كلمة مرور (ستصلك بالبريد)

#### الخيار الثاني: AWS (مجاني لمدة سنة)

```
1. اذهب إلى: https://aws.amazon.com
2. اضغط: "Free Tier"
3. اختر EC2 من الخدمات
4. Ubuntu 22.04 LTS
5. Type: t2.micro (مجاني!)
```

#### الخيار الثالث: Linode

```
1. https://www.linode.com
2. اختر: Linode 4GB ($20/month)
3. Ubuntu 22.04
4. Boot
```

---

## 🟢 المرحلة 2: إعداد الخادم (15 دقائق)

### الخطوة 1: الدخول إلى الخادم

**على Windows:**

```powershell
# افتح PowerShell

# للدخول عبر SSH:
ssh -i "C:\path\to\key.pem" root@YOUR_SERVER_IP

# أو إذا استخدمت password:
ssh root@YOUR_SERVER_IP
# ثم أدخل الكلمة المرور
```

**ستشوف:**

```
root@ubuntu:~#
```

### الخطوة 2: تحديث النظام

```bash
apt update && apt upgrade -y
```

### الخطوة 3: تثبيت Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs npm
```

**تحقق من التثبيت:**

```bash
node --version    # v18.x.x
npm --version     # 9.x.x
```

### الخطوة 4: تثبيت Nginx و PM2

```bash
apt install -y nginx
npm install -g pm2
```

---

## 🟢 المرحلة 3: نشر التطبيق (15 دقائق)

### الخطوة 1: نسخ المشروع

**اختر واحد من هذه:**

**Option A: من GitHub**

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/alawael-erp.git
cd alawael-erp
```

**Option B: Upload من جهازك**

```bash
# على جهازك (PowerShell):
scp -r "C:\path\to\66666\*" root@YOUR_SERVER_IP:/root/alawael-erp

# على الخادم:
cd /root/alawael-erp
```

### الخطوة 2: تثبيت Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
npm run build
```

### الخطوة 3: إنشاء .env

في Backend، أنشئ ملف `.env`:

```bash
nano .env
```

اكتب:

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://alawael_admin:Admin%402026@cluster0.5njwaqd.mongodb.net/alawael-erp
USE_MOCK_DB=false
JWT_SECRET=your_secret_key_change_this
LOG_LEVEL=info
```

اضغط: `Ctrl+X` ثم `Y` ثم `Enter`

---

## 🟢 المرحلة 4: إعداد PM2 (10 دقائق)

PM2 يدير تطبيقك تلقائياً!

### الخطوة 1: أنشئ ecosystem.config.js

في root المشروع:

```bash
cd /root/alawael-erp
nano ecosystem.config.js
```

اكتب:

```javascript
module.exports = {
  apps: [
    {
      name: 'alawael-backend',
      script: '/root/alawael-erp/backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/root/logs/error.log',
      out_file: '/root/logs/out.log',
      max_memory_restart: '500M',
    },
  ],
};
```

اضغط: `Ctrl+X` ثم `Y` ثم `Enter`

### الخطوة 2: ابدأ PM2

```bash
mkdir -p /root/logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### الخطوة 3: تحقق من الحالة

```bash
pm2 status
pm2 logs
```

**يجب أن ترى:**

```
✓ alawael-backend online
```

---

## 🟢 المرحلة 5: إعداد Nginx (15 دقائق)

Nginx سيوجه الـ Traffic إلى تطبيقك!

### الخطوة 1: أنشئ Config

```bash
nano /etc/nginx/sites-available/alawael
```

اكتب:

```nginx
upstream backend {
  server localhost:3001;
}

server {
  listen 80;
  server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

  # Frontend
  location / {
    root /root/alawael-erp/frontend;
    try_files $uri $uri/ /index.html;
    expires -1;
  }

  # Backend APIs
  location /api/ {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # Health check
  location /health {
    proxy_pass http://backend;
  }
}
```

اضغط: `Ctrl+X` ثم `Y` ثم `Enter`

### الخطوة 2: فعّل الـ Config

```bash
ln -s /etc/nginx/sites-available/alawael /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# تحقق من الصيغة:
nginx -t

# أعد تشغيل:
systemctl restart nginx
systemctl enable nginx
```

---

## 🟢 المرحلة 6: تفعيل SSL (10 دقائق)

SSL يعطي 🔒 HTTPS

### الخطوة 1: تثبيت Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### الخطوة 2: احصل على شهادة

```bash
certbot certonly --standalone -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com
```

اتبع التعليمات على الشاشة

### الخطوة 3: حدّث Nginx

عدّل `/etc/nginx/sites-available/alawael`:

```bash
nano /etc/nginx/sites-available/alawael
```

أضف في الأعلى:

```nginx
# HTTP to HTTPS redirect
server {
  listen 80;
  server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;
  return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
  listen 443 ssl http2;
  server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

  ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN.com/privkey.pem;

  # ... باقي الـ config
}
```

### الخطوة 4: أعد تشغيل

```bash
nginx -t
systemctl restart nginx
```

---

## 🟢 المرحلة 7: اختبار النظام (5 دقائق)

### اختبر التطبيق:

```bash
# على الخادم:
curl http://localhost:3001/health
curl http://localhost:3001/api/backup/list

# من متصفحك:
# http://YOUR_SERVER_IP
# https://YOUR_DOMAIN.com
```

---

## 🎯 QUICK REFERENCE

### أوامر مفيدة:

```bash
# حالة التطبيق
pm2 status

# شوف الـ logs
pm2 logs alawael-backend

# أعد التشغيل
pm2 restart all

# أوقف التطبيق
pm2 stop all

# ابدأ من جديد
pm2 start ecosystem.config.js

# شوف استخدام الموارد
pm2 monit
```

### أوامر Nginx:

```bash
# اختبر الـ config
sudo nginx -t

# أعد التشغيل
sudo systemctl restart nginx

# شوف الحالة
sudo systemctl status nginx

# عرض الـ logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🆘 TROUBLESHOOTING

| المشكلة                     | الحل                                |
| --------------------------- | ----------------------------------- |
| `Connection refused`        | تأكد أن Backend بدأ: `pm2 logs`     |
| `Port already in use`       | `lsof -i :3001` ثم اقتل الـ process |
| `Nginx error`               | شغل `sudo nginx -t`                 |
| `SSL certificate error`     | أعد تشغيل Certbot                   |
| `MongoDB connection failed` | تحقق من `.env` والـ IP whitelist    |

---

## ✅ FINAL CHECKLIST

- [ ] VPS تم إنشاؤه
- [ ] Node.js مثبت
- [ ] المشروع نسخ
- [ ] Dependencies مثبتة
- [ ] .env محدثة
- [ ] PM2 بدأ
- [ ] Nginx معاد تشغيله
- [ ] SSL فعّل
- [ ] Backend يستجيب
- [ ] Frontend محمل

---

## 🎊 SUCCESS!

إذا رأيت:

```
✅ التطبيق يفتح بدون أخطاء
✅ البيانات تحمل من Database
✅ الـ APIs تستجيب
✅ HTTPS يعمل (🔒 في المتصفح)
```

**🎉 تطبيقك LIVE على الإنترنت!**

---

## 📊 SYSTEM STATUS

بعد الإكمال:

```
Frontend:  https://YOUR_DOMAIN.com ✅
Backend:   http://localhost:3001 (Internal) ✅
Database:  MongoDB Atlas ✅
Processes: PM2 (auto-restart) ✅
SSL:       Let's Encrypt ✅
Uptime:    24/7 🚀
```

---

## 🔄 MONITORING

### طريقة 1: PM2 Plus (مجاني)

```bash
pm2 link [SECRET_KEY] [PUBLIC_KEY]
# اذهب إلى: https://app.pm2.io
```

### طريقة 2: Uptime Robot (مجاني)

```
https://uptimerobot.com
أضف: https://YOUR_DOMAIN.com
```

---

## 🎯 NEXT STEPS

```
✅ Priority 3 Complete: Domain + SSL
✅ Priority 4 Complete: Testing
✅ Priority 5 Complete: Production Deploy

🎊 ALAWAEL ERP IS LIVE! 🎊
```

**Congratulations! 🚀**

# 🎯 خطوات النشر الفعلية على Hostinger - دليل عملي

**التاريخ:** 2026-01-19  
**الحالة:** ✅ جاهز للتنفيذ الفوري

---

## 🚀 الخطوات العملية (30 دقيقة فقط)

### المرحلة 1: التحضير (5 دقائق)

#### 1.1 تحضير الملفات للرفع

```powershell
# من مجلد المشروع
cd "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

# إنشاء مجلد للنشر
New-Item -ItemType Directory -Force -Path "deploy_package"

# نسخ الملفات المطلوبة فقط
Copy-Item -Path "backend" -Destination "deploy_package\backend" -Recurse -Force
Copy-Item -Path "frontend\build" -Destination "deploy_package\frontend" -Recurse -Force
Copy-Item -Path ".env.production" -Destination "deploy_package\.env" -Force
```

#### 1.2 تنظيف الملفات غير المطلوبة

```powershell
# حذف node_modules (سيتم تثبيتها على الخادم)
Remove-Item -Path "deploy_package\backend\node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# حذف ملفات التطوير
Remove-Item -Path "deploy_package\backend\tests" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "deploy_package\backend\*.test.js" -Force -ErrorAction SilentlyContinue

# حذف log files
Remove-Item -Path "deploy_package\backend\*.log" -Force -ErrorAction SilentlyContinue
```

---

### المرحلة 2: رفع الملفات إلى Hostinger (10 دقائق)

#### الطريقة A: رفع عبر FTP (الأسهل)

**استخدم FileZilla أو WinSCP:**

1. **تحميل FileZilla:**
   - https://filezilla-project.org/download.php

2. **بيانات الاتصال:**

   ```
   Host: ftp.yourdomain.com (أو IP الخادم من Hostinger)
   Username: your-hostinger-username
   Password: your-hostinger-password
   Port: 21 (FTP) أو 22 (SFTP - أفضل)
   ```

3. **الرفع:**
   - اسحب مجلد `deploy_package` كاملاً
   - ضعه في `/home/your-username/public_html/`
   - انتظر حتى ينتهي الرفع

#### الطريقة B: رفع عبر cPanel File Manager

1. ادخل إلى cPanel من Hostinger
2. افتح File Manager
3. انتقل إلى `public_html`
4. اضغط Upload
5. ارفع ملف ZIP من `deploy_package`
6. فك الضغط على الخادم

---

### المرحلة 3: إعداد الخادم (10 دقائق)

#### 3.1 الاتصال بـ SSH

```bash
# من Terminal أو PowerShell
ssh your-username@your-server-ip

# أو من Hostinger Terminal (في cPanel)
```

#### 3.2 تثبيت Dependencies

```bash
# الانتقال لمجلد Backend
cd ~/public_html/backend

# تثبيت Node.js packages
npm ci --production

# أو إذا كان Python app
pip3 install -r requirements.txt --user
```

#### 3.3 إعداد قاعدة البيانات

**إذا كنت تستخدم MongoDB:**

```bash
# الاتصال بـ MongoDB
mongo

# إنشاء قاعدة بيانات
use alawael_erp

# إنشاء مستخدم
db.createUser({
  user: "alawael_user",
  pwd: "secure_password_here",
  roles: ["readWrite"]
})
```

**أو من Hostinger Database Manager:**

- اذهب إلى Databases في hPanel
- أنشئ قاعدة بيانات جديدة
- احصل على Connection String
- ضعه في `.env`

#### 3.4 تحديث ملف .env

```bash
# تحرير .env
nano ~/public_html/backend/.env

# تحديث القيم:
NODE_ENV=production
PORT=5000
DATABASE_URL=your-mongodb-connection-string
SECRET_KEY=your-secret-key-here
```

---

### المرحلة 4: تشغيل التطبيق (5 دقائق)

#### 4.1 تثبيت PM2 (Process Manager)

```bash
# تثبيت PM2 عالمياً
npm install -g pm2

# تشغيل التطبيق
cd ~/public_html/backend
pm2 start server.js --name "alawael-erp"

# حفظ التكوين
pm2 save

# تفعيل البدء التلقائي
pm2 startup
# اتبع التعليمات التي ستظهر
```

#### 4.2 التحقق من التشغيل

```bash
# فحص الحالة
pm2 status

# عرض السجلات
pm2 logs alawael-erp

# اختبار API
curl http://localhost:5000/api/health
```

---

### المرحلة 5: تكوين Nginx/Apache (اختياري)

#### إذا كنت تستخدم Nginx:

```bash
# تحرير تكوين Nginx
sudo nano /etc/nginx/sites-available/default

# أضف:
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /static {
        alias /home/your-username/public_html/frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# إعادة تشغيل Nginx
sudo systemctl restart nginx
```

#### إذا كنت تستخدم Apache (.htaccess):

```apache
# إنشاء .htaccess في public_html
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:5000/$1 [P,L]
```

---

## 🧪 اختبار ما بعد النشر

### 1. فحص الصحة العامة

```bash
# من خارج الخادم
curl https://yourdomain.com/api/health

# يجب أن يرجع:
{
  "status": "ok",
  "timestamp": "2026-01-19T...",
  "uptime": 123.45
}
```

### 2. اختبار تسجيل الدخول

```bash
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

### 3. اختبار Frontend

افتح متصفح واذهب إلى:

```
https://yourdomain.com
```

يجب أن تشاهد صفحة تسجيل الدخول

---

## 🔧 الأوامر المفيدة

### إدارة PM2

```bash
# إعادة تشغيل
pm2 restart alawael-erp

# إيقاف
pm2 stop alawael-erp

# حذف من PM2
pm2 delete alawael-erp

# عرض السجلات الحية
pm2 logs alawael-erp --lines 100

# مسح السجلات
pm2 flush

# معلومات مفصلة
pm2 show alawael-erp
```

### مراقبة النظام

```bash
# استخدام الذاكرة
free -h

# استخدام المعالج
top
# أو
htop

# مساحة القرص
df -h

# عمليات Node.js النشطة
ps aux | grep node
```

### مراقبة Logs

```bash
# Backend logs (PM2)
pm2 logs alawael-erp

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logs
tail -f ~/public_html/logs/backend.log
```

---

## 🚨 استكشاف الأخطاء

### المشكلة: التطبيق لا يعمل بعد النشر

```bash
# 1. تحقق من PM2
pm2 status

# 2. شاهد الأخطاء
pm2 logs alawael-erp --err

# 3. تحقق من المنفذ
netstat -tulpn | grep 5000

# 4. أعد التشغيل
pm2 restart alawael-erp
```

### المشكلة: Database connection error

```bash
# 1. تحقق من MongoDB
systemctl status mongod

# 2. اختبر الاتصال
mongo --eval "db.runCommand({ ping: 1 })"

# 3. تحقق من .env
cat backend/.env | grep DATABASE

# 4. اختبر من Node.js
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.DATABASE_URL).then(() => console.log('OK')).catch(err => console.error(err));"
```

### المشكلة: Frontend لا يعمل

```bash
# 1. تحقق من ملفات build
ls -la ~/public_html/frontend/

# 2. تحقق من صلاحيات الملفات
chmod -R 755 ~/public_html/frontend

# 3. تحقق من Nginx/Apache config
nginx -t
# أو
apachectl configtest
```

---

## 🔐 تأمين التطبيق (مهم!)

### 1. تفعيل HTTPS (SSL)

```bash
# استخدام Let's Encrypt (مجاني)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# أو من Hostinger:
# اذهب إلى SSL في hPanel
# فعّل SSL/HTTPS
```

### 2. Firewall

```bash
# تفعيل UFW
sudo ufw enable

# السماح بـ SSH
sudo ufw allow 22/tcp

# السماح بـ HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# فحص الحالة
sudo ufw status
```

### 3. تحديثات الأمان

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تحديث Node.js packages
cd ~/public_html/backend
npm audit fix
```

---

## 📊 المراقبة والصيانة

### إعداد مراقبة تلقائية

```bash
# استخدام PM2 monitoring
pm2 install pm2-server-monit

# أو استخدام خدمة خارجية:
# - UptimeRobot (مجاني)
# - Pingdom
# - New Relic
```

### النسخ الاحتياطي التلقائي

```bash
# إنشاء cron job للنسخ الاحتياطي
crontab -e

# أضف (نسخة احتياطية يومية الساعة 2 صباحاً):
0 2 * * * mongodump --out=/home/backup/$(date +\%Y\%m\%d) && tar -czf /home/backup/backup_$(date +\%Y\%m\%d).tar.gz /home/backup/$(date +\%Y\%m\%d)
```

---

## ✅ قائمة التحقق النهائية

- [ ] ✅ الملفات مرفوعة على الخادم
- [ ] ✅ Dependencies مثبتة
- [ ] ✅ قاعدة البيانات تعمل
- [ ] ✅ .env محدّث بقيم الإنتاج
- [ ] ✅ PM2 يدير التطبيق
- [ ] ✅ Nginx/Apache مكوّن
- [ ] ✅ HTTPS مُفعّل
- [ ] ✅ Firewall مُكوّن
- [ ] ✅ API يستجيب
- [ ] ✅ Frontend يعمل
- [ ] ✅ تسجيل الدخول يعمل
- [ ] ✅ Monitoring مُفعّل
- [ ] ✅ النسخ الاحتياطي مجدول
- [ ] ✅ الفريق مُبلّغ

---

## 🎉 مبروك! النشر اكتمل

**الموقع الآن مباشر:** https://yourdomain.com

### معلومات الاتصال السريع:

```
Frontend: https://yourdomain.com
Backend API: https://yourdomain.com/api
Health Check: https://yourdomain.com/api/health
Admin Panel: https://yourdomain.com/admin

SSH: ssh your-username@your-server-ip
PM2 Status: pm2 status
Logs: pm2 logs alawael-erp
```

---

**آخر تحديث:** 2026-01-19  
**الحالة:** ✅ منشور وجاهز للعمل

# إعداد Hostinger VPS - خطوة بخطوة

## 📋 الخطوة الحالية: إنشاء كلمة سر Root

### ما يجب فعله الآن:

#### 1. Root Password

```
اكتب كلمة سر قوية في الحقل:
المقترح: Be@101010
أو: AlAwael@2026#Secure!

⚠️ احفظ هذه الكلمة - ستحتاجها!
```

#### 2. SSH Key (اختياري)

```
اضغط: Skip أو تجاهله
يمكنك إضافته لاحقاً من Dashboard
```

#### 3. اضغط: Continue أو Next

---

## 🔄 بعد إنشاء الـ VPS

### سيعطيك Hostinger معلومات الاتصال:

```
IP Address: سيظهر (مثل: 82.25.96.160)
SSH Port: عادة 22 (قد يكون مختلف)
Username: root
Password: الذي أدخلته للتو
```

**احفظ هذه المعلومات!**

---

## 🚀 الخطوات التالية

### 1. بعد إنشاء الـ VPS (انتظر 2-5 دقائق)

الـ VPS سيتم تجهيزه تلقائياً.

### 2. الاتصال بالـ VPS

#### الطريقة 1: PuTTY (موصى به)

```
1. حمّل PuTTY: https://www.putty.org/
2. شغّله وأدخل:
   - Host Name: [IP من Hostinger]
   - Port: 22 (أو المنفذ المعطى)
   - Connection type: SSH
3. اضغط Open
4. Login as: root
5. Password: [كلمة السر التي أنشأتها]
```

#### الطريقة 2: PowerShell (Windows 10/11)

```powershell
ssh root@[IP_Address]
# ثم أدخل كلمة السر عندما يطلبها
```

---

## 📦 تثبيت البيئة (بعد الاتصال)

### سكريبت التثبيت التلقائي

بعد الاتصال بـ VPS، نفذ هذه الأوامر:

```bash
# 1. تحديث النظام
apt update && apt upgrade -y

# 2. تثبيت Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. تثبيت Git
apt install -y git

# 4. تثبيت PM2
npm install -g pm2

# 5. تثبيت Nginx
apt install -y nginx

# 6. تثبيت MongoDB (اختياري)
# راجع: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/

# 7. التحقق من التثبيت
node --version
npm --version
git --version
pm2 --version
nginx -v
```

---

## 🎯 نشر المشروع

### بعد تثبيت البيئة:

```bash
# 1. الذهاب إلى المجلد الرئيسي
cd ~

# 2. استنساخ المشروع
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# 3. إعداد Backend
cd backend
npm install --production

# إنشاء ملف .env
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/alawael-erp
JWT_SECRET=AlAwael-2026-Secret-Key-Change-This
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://[YOUR_VPS_IP]
REDIS_HOST=localhost
REDIS_PORT=6379
EOF

# 4. تشغيل Backend مع PM2
pm2 start server.js --name alawael-backend
pm2 save
pm2 startup

# 5. إعداد Frontend
cd ../frontend
npm install --production

# إنشاء ملف .env.production
cat > .env.production << 'EOF'
REACT_APP_API_URL=http://[YOUR_VPS_IP]:3001
REACT_APP_ENV=production
EOF

# 6. بناء Frontend
npm run build

# 7. تشغيل Frontend مع PM2
pm2 start npm --name alawael-frontend -- start
pm2 save

# 8. فحص الحالة
pm2 list
pm2 logs
```

---

## 🔧 إعداد Nginx (Reverse Proxy)

```bash
# 1. إنشاء ملف إعدادات
nano /etc/nginx/sites-available/alawael-erp

# 2. الصق هذا المحتوى:
server {
    listen 80;
    server_name [YOUR_VPS_IP];

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 3. حفظ (Ctrl+O, Enter, Ctrl+X)

# 4. تفعيل الإعدادات
ln -s /etc/nginx/sites-available/alawael-erp /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 🔒 تأمين الـ VPS

### 1. Firewall (UFW)

```bash
# تثبيت وتفعيل Firewall
apt install -y ufw

# السماح بالمنافذ الضرورية
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Frontend (مؤقت)
ufw allow 3001/tcp  # Backend (مؤقت)

# تفعيل Firewall
ufw enable
ufw status
```

### 2. تغيير منفذ SSH (اختياري لكن موصى به)

```bash
# تعديل ملف SSH
nano /etc/ssh/sshd_config

# غيّر السطر:
# Port 22
# إلى:
Port 2222  # أو أي منفذ آخر

# حفظ (Ctrl+O, Enter, Ctrl+X)

# إعادة تشغيل SSH
systemctl restart sshd

# تحديث Firewall
ufw allow 2222/tcp
ufw delete allow 22/tcp
```

---

## 🧪 اختبار النظام

### 1. فحص الخدمات

```bash
# PM2 Status
pm2 status
pm2 logs --lines 50

# Nginx Status
systemctl status nginx

# فحص المنافذ
netstat -tuln | grep -E ':(80|3000|3001)'
```

### 2. فحص من المتصفح

```
افتح: http://[YOUR_VPS_IP]

يجب أن يظهر:
- Frontend على المنفذ 80 (عبر Nginx)
- أو مباشرة على المنفذ 3000

سجل الدخول:
Email: admin@alawael.com
Password: Admin@123456
```

### 3. فحص API

```bash
# من VPS نفسه
curl http://localhost:3001/health

# من جهازك
curl http://[YOUR_VPS_IP]:3001/health
```

---

## 📊 مراقبة النظام

### PM2 Monitoring

```bash
# Dashboard تفاعلي
pm2 monit

# عرض اللوجات الوقت الفعلي
pm2 logs

# معلومات مفصلة
pm2 show alawael-backend
pm2 show alawael-frontend

# إعادة تشغيل الخدمات
pm2 restart all

# إيقاف الخدمات
pm2 stop all

# حذف الخدمات
pm2 delete all
```

---

## 🔄 التحديثات المستقبلية

```bash
# على الـ VPS
cd ~/alawael-erp

# إيقاف الخدمات
pm2 stop all

# سحب التحديثات من GitHub
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

## 🆘 حل المشاكل

### المشكلة 1: لا يمكن الاتصال بالـ VPS

```bash
# تحقق من حالة SSH
systemctl status sshd

# تحقق من Firewall
ufw status

# تأكد من المنفذ الصحيح
```

### المشكلة 2: Backend لا يعمل

```bash
# فحص اللوجات
pm2 logs alawael-backend

# فحص المنفذ
netstat -tuln | grep 3001

# إعادة التشغيل
pm2 restart alawael-backend
```

### المشكلة 3: Frontend لا يظهر

```bash
# فحص Nginx
nginx -t
systemctl status nginx

# فحص PM2
pm2 logs alawael-frontend

# فحص المنفذ
netstat -tuln | grep 3000
```

---

## ✅ Checklist التثبيت

### المرحلة 1: إنشاء VPS

- [ ] أدخلت Root Password
- [ ] تخطيت SSH Key (أو أضفته)
- [ ] تم إنشاء الـ VPS
- [ ] حصلت على IP Address

### المرحلة 2: الاتصال

- [ ] اتصلت بـ VPS عبر SSH
- [ ] سجلت الدخول كـ root

### المرحلة 3: تثبيت البيئة

- [ ] تحديث النظام (apt update)
- [ ] تثبيت Node.js
- [ ] تثبيت Git
- [ ] تثبيت PM2
- [ ] تثبيت Nginx

### المرحلة 4: نشر المشروع

- [ ] استنساخ من GitHub
- [ ] تثبيت Backend dependencies
- [ ] إنشاء ملف .env
- [ ] تشغيل Backend مع PM2
- [ ] تثبيت Frontend dependencies
- [ ] بناء Frontend
- [ ] تشغيل Frontend مع PM2

### المرحلة 5: الإعدادات النهائية

- [ ] إعداد Nginx
- [ ] إعداد Firewall
- [ ] اختبار النظام
- [ ] فحص PM2

---

## 📞 الملفات المرجعية

- 📄 `COMPLETE_DEPLOYMENT_GUIDE.md` - الدليل الشامل
- 📄 `HOSTINGER_DEPLOYMENT.md` - دليل Shared Hosting
- 📄 هذا الملف - دليل VPS

---

## 🎯 الخطوة التالية مباشرة

**الآن:**

1. أدخل Root Password: `Be@101010`
2. تخطى SSH Key
3. اضغط Continue
4. انتظر إنشاء الـ VPS (2-5 دقائق)
5. احصل على IP Address من Dashboard
6. اتصل بـ VPS عبر PuTTY
7. نفذ سكريبت التثبيت أعلاه

---

**آخر تحديث:** 10 يناير 2026  
**نوع الاستضافة:** VPS  
**الحالة:** ✅ جاهز للإعداد

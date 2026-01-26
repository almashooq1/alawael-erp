# 🚀 دليل النشر السريع - خطوات مبسطة للنشر الفوري

**التاريخ:** 2026-01-19  
**الحالة:** ✅ جاهز للتنفيذ

---

## ⚡ نشر سريع في 5 دقائق

### الطريقة 1: تشغيل سكربت النشر الآلي (الأسهل)

```powershell
# من مجلد المشروع
cd "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

# تشغيل سكربت النشر
.\deploy.ps1 -Environment production
```

### الطريقة 2: أوامر يدوية سريعة

```powershell
# 1. بناء Frontend
cd frontend
npm run build

# 2. تثبيت Backend dependencies
cd ..\backend
npm ci --production

# 3. تشغيل Backend
npm start
```

---

## 📋 قائمة التحقق السريعة

- [x] ✅ تم فحص النظام (68/68 اختبار ناجح)
- [x] ✅ Frontend مبني (`build/` موجود)
- [x] ✅ Backend dependencies مثبتة
- [x] ✅ ملفات البيئة جاهزة (.env.production)
- [x] ✅ قاعدة البيانات جاهزة (migrations موجودة)
- [ ] ⏳ نشر على الخادم (الخطوة التالية)

---

## 🌐 خيارات النشر

### خيار A: Hostinger VPS/Cloud Hosting

**خطوات سريعة:**

1. **رفع الملفات عبر FTP/SFTP:**

```bash
# استخدم FileZilla أو WinSCP
Host: your-server.hostinger.com
Username: your-username
Port: 21 (FTP) أو 22 (SFTP)

# ارفع:
- backend/ (كامل)
- frontend/build/ (فقط المجلد المبني)
- .env.production (غيّر اسمه إلى .env)
```

2. **تثبيت على الخادم (SSH):**

```bash
# اتصل بـ SSH
ssh your-username@your-server.hostinger.com

# انتقل إلى مجلد التطبيق
cd /home/your-username/public_html

# تثبيت dependencies
cd backend
npm ci --production

# تشغيل PM2 (Process Manager)
pm2 start server.js --name "alawael-erp"
pm2 save
pm2 startup
```

3. **تكوين Nginx (إذا لزم الأمر):**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /static {
        alias /home/your-username/public_html/frontend/build/static;
    }
}
```

### خيار B: Hostinger Shared Hosting

**إذا كنت تستخدم Shared Hosting (محدود):**

1. استخدم Node.js من Hostinger Control Panel
2. ارفع الملفات عبر File Manager
3. اضبط Node.js Application من cPanel

⚠️ **ملاحظة:** Shared hosting قد لا يدعم جميع الميزات

---

## 🐳 خيار C: Docker Deployment (موصى به للإنتاج)

```bash
# بناء الحاويات
docker-compose -f docker-compose.production.yml build

# تشغيل
docker-compose -f docker-compose.production.yml up -d

# فحص الحالة
docker-compose ps
```

---

## 🔧 اختبار بعد النشر

### 1. فحص Backend Health

```bash
curl http://your-domain.com/api/health
# يجب أن يرجع: {"status": "ok"}
```

### 2. فحص Frontend

```bash
curl http://your-domain.com
# يجب أن يرجع صفحة HTML
```

### 3. اختبار Login

```bash
curl -X POST http://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

---

## 📊 مراقبة النظام بعد النشر

### مراقبة Logs

```bash
# Backend logs
tail -f logs/backend.log

# PM2 logs (إذا استخدمت PM2)
pm2 logs alawael-erp

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### مراقبة الأداء

```bash
# استخدام htop
htop

# مراقبة memory
free -h

# مراقبة disk
df -h
```

---

## 🚨 استكشاف الأخطاء الشائعة

### خطأ: "Cannot find module"

```bash
# الحل: أعد تثبيت dependencies
cd backend
rm -rf node_modules
npm ci --production
```

### خطأ: "Port already in use"

```bash
# الحل: أوقف العملية القديمة
pm2 stop all
# أو
pkill -f node
```

### خطأ: "Database connection failed"

```bash
# تحقق من .env
cat backend/.env | grep DATABASE

# تأكد من أن DB server يعمل
systemctl status mongodb
# أو
systemctl status postgresql
```

### خطأ: "Permission denied"

```bash
# الحل: صلاحيات الملفات
chmod -R 755 backend
chown -R www-data:www-data backend
```

---

## 📞 الدعم والمساعدة

إذا واجهت مشاكل:

1. **راجع السجلات أولاً:**

   ```bash
   tail -100 logs/backend.log
   ```

2. **تحقق من الاتصال:**

   ```bash
   ping your-server.com
   telnet your-server.com 5000
   ```

3. **اتصل بدعم Hostinger:**
   - Live Chat: متوفر 24/7
   - Email: support@hostinger.com
   - Knowledge Base: https://support.hostinger.com

---

## ✅ قائمة Post-Deployment

- [ ] النظام يعمل ويستجيب
- [ ] جميع API endpoints تعمل
- [ ] Frontend يُحمّل بشكل صحيح
- [ ] قاعدة البيانات متصلة
- [ ] الـ Authentication يعمل
- [ ] Logs تُكتب بشكل صحيح
- [ ] SSL/HTTPS مُفعّل (إذا لزم)
- [ ] Backup تلقائي مجدول
- [ ] Monitoring مُفعّل
- [ ] فريق العمل مُبلّغ بالنشر

---

## 🎉 مبروك!

النظام الآن منشور وجاهز للعمل! 🚀

**الروابط المهمة:**

- 🌐 Frontend: http://your-domain.com
- 🔌 Backend API: http://your-domain.com/api
- 💚 Health Check: http://your-domain.com/api/health

---

**آخر تحديث:** 2026-01-19

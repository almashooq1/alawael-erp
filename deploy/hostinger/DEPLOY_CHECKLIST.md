# 🚀 قائمة نشر Hostinger — نظام الأوائل ERP

## المتطلبات قبل البدء

- [ ] خطة Hostinger VPS (KVM 2 على الأقل — 2GB RAM)
- [ ] دومين مربوط بـ Hostinger DNS
- [ ] حساب MongoDB Atlas (مجاني M0 كافي للبداية)
- [ ] حساب Gmail مع App Password (للإشعارات)
- [ ] SSH Client (PuTTY على Windows أو Terminal على Mac/Linux)

---

## خطوات النشر

### 1️⃣ على جهازك (محلياً)

```bash
# 1. فحص الجاهزية
npm run deploy:hostinger:check

# 2. توليد مفاتيح الأمان
npm run deploy:hostinger -- --gen-secrets
# احفظ النتائج — ستحتاجها لاحقاً

# 3. ضبط الدومين في جميع الملفات
cd deploy/hostinger
bash configure-domain.sh yourdomain.com

# 4. بناء الواجهة
cd ../../frontend
npm install
npm run build

# 5. تأكد من البناء
ls -la build/index.html
```

### 2️⃣ على السيرفر — الإعداد الأول (مرة واحدة)

```bash
# 1. اتصل بالسيرفر
ssh root@IP_السيرفر

# 2. ارفع الملفات — من جهازك:
scp -r backend/ root@IP:/home/alawael/app/backend/
scp -r frontend/ root@IP:/home/alawael/app/frontend/
scp -r deploy/ root@IP:/home/alawael/app/deploy/

# 3. شغّل سكربت الإعداد (على السيرفر)
cd /home/alawael/app
sudo bash deploy/hostinger/setup-server.sh
# سيطلب: الدومين + البريد لشهادة SSL
```

### 3️⃣ على السيرفر — ضبط البيئة

```bash
# 1. انسخ ملف البيئة
cp deploy/hostinger/.env.production backend/.env

# 2. عدّل القيم
nano backend/.env

# غيّر هذه القيم الضرورية:
#   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/alawael
#   JWT_SECRET=...         (من الخطوة 2 أعلاه)
#   JWT_REFRESH_SECRET=... (من الخطوة 2 أعلاه)
#   SESSION_SECRET=...     (من الخطوة 2 أعلاه)
#   SMTP_USER=your@gmail.com
#   SMTP_PASS=your-app-password
```

### 4️⃣ على السيرفر — النشر

```bash
sudo -u alawael bash deploy/hostinger/deploy.sh
```

### 5️⃣ التحقق

```bash
# فحص صحة التطبيق
curl https://yourdomain.com/health

# فحص PM2
pm2 list
pm2 logs alawael-api --lines 20

# فحص Nginx
sudo nginx -t
sudo systemctl status nginx
```

---

## 🔄 للتحديث لاحقاً

```bash
# من جهازك — ارفع الملفات المحدّثة فقط
scp -r backend/ root@IP:/home/alawael/app/backend/
scp -r frontend/ root@IP:/home/alawael/app/frontend/

# على السيرفر — أعد النشر
cd /home/alawael/app
sudo -u alawael bash deploy/hostinger/deploy.sh
```

## 🤖 النشر التلقائي (GitHub Actions)

اضف هذه Secrets في GitHub → Settings → Secrets → Actions:

| Secret | القيمة |
|--------|--------|
| `VPS_HOST` | IP السيرفر |
| `VPS_USER` | `alawael` |
| `VPS_SSH_KEY` | المفتاح الخاص SSH (من setup-vps-cicd.sh) |
| `DOMAIN` | الدومين (مثل `alawael.com`) |

بعدها كل `git push origin main` سينشر تلقائياً!

---

## 🔧 أوامر مفيدة

| الأمر | الوظيفة |
|-------|---------|
| `pm2 list` | حالة التطبيق |
| `pm2 logs alawael-api` | السجلات المباشرة |
| `pm2 restart alawael-api` | إعادة تشغيل |
| `pm2 monit` | مراقبة الأداء |
| `sudo nginx -t` | فحص إعدادات Nginx |
| `sudo systemctl reload nginx` | إعادة تحميل Nginx |
| `sudo certbot renew --dry-run` | اختبار تجديد SSL |
| `df -h` | مساحة القرص |
| `free -m` | استخدام الذاكرة |

## ❗ حل المشاكل الشائعة

| المشكلة | الحل |
|---------|------|
| 502 Bad Gateway | `pm2 restart alawael-api` ثم `pm2 logs` |
| SSL Error | `sudo certbot renew --force-renewal` |
| MongoDB Connection Error | تحقق من whitelist IP في Atlas (0.0.0.0/0) |
| Port 5000 مشغول | `pm2 delete all && pm2 start ecosystem.config.js` |
| ذاكرة ممتلئة | `pm2 flush && sudo journalctl --vacuum-size=100M` |

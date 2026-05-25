# 🚀 دليل النشر الآمن على Hostinger

## Safe Deployment Guide to Hostinger

## 📋 متطلبات النشر

### تأكد من توفر:

```bash
☑️ حساب Hostinger نشط
☑️ وصول SSH
☑️ قاعدة بيانات PostgreSQL أو MySQL
☑️ نطاق مسجل
☑️ SSL Certificate
☑️ Git مثبت على Hostinger
```

---

## 🎯 خطوات النشر خطوة بخطوة

### الخطوة 1: تحضير المشروع محلياً (في جهازك)

```bash
# 1. تنظيف المشروع
git clean -fd
rm -rf __pycache__ .pytest_cache
rm -rf *.log logs/*

# 2. التحقق من الملفات الحرجة
ls -la wsgi.py app_factory.py config.py gunicorn.conf.py requirements.txt

# 3. اختبار محلي
python -m venv venv_test
source venv_test/bin/activate  # على Windows: venv_test\Scripts\activate
pip install -r requirements.txt
python wsgi.py

# 4. اختبار الـ API
curl http://localhost:5000/api/health
# يجب أن يرد: {"status": "healthy"}

# 5. إذا مرت الاختبارات، أكمل
deactivate
rm -rf venv_test
```

---

### الخطوة 2: إعداد Hostinger

```bash
# 1. تسجيل الدخول عبر SSH
ssh your-username@your-domain.com

# 2. إنشاء مجلد التطبيق
mkdir -p ~/applications/alawael-erp
cd ~/applications/alawael-erp

# 3. إنشاء بيئة Python افتراضية
python3 -m venv venv
source venv/bin/activate

# 4. التحقق من الإصدار
python --version  # يجب أن يكون Python 3.8+
```

---

### الخطوة 3: رفع الملفات

#### الطريقة الأولى: استخدام Git

```bash
# على Hostinger
cd ~/applications/alawael-erp

# إضافة Git repository
git clone https://github.com/your-username/alawael-erp.git .

# أو إذا كان الـ repository موجود
git pull origin main

# تفعيل البيئة الافتراضية
source venv/bin/activate

# تثبيت المتطلبات
pip install -r requirements.txt
pip install gunicorn
```

#### الطريقة الثانية: استخدام FTP/SFTP

```bash
# على جهازك (استخدم WinSCP أو Filezilla)
1. اتصل بـ your-domain.com
2. رفع جميع الملفات إلى ~/applications/alawael-erp
3. تجاهل المجلدات: venv, __pycache__, .git, logs, *.log
```

---

### الخطوة 4: تكوين قاعدة البيانات

```bash
# على Hostinger

# 1. أنشئ قاعدة البيانات من لوحة التحكم
# أو استخدم SSH:
mysql -u root -p
# أو psql إذا كنت تستخدم PostgreSQL

# 2. تحديث .env.production
nano .env.production

# أضف:
DATABASE_URL=postgresql://username:password@localhost/alawael_prod
SECRET_KEY=your-very-strong-key-at-least-32-characters
JWT_SECRET_KEY=your-jwt-secret-key-at-least-32-characters
FLASK_ENV=production
MAIL_SERVER=smtp.hostinger.com
MAIL_USERNAME=your-email@yourdomain.com
MAIL_PASSWORD=your-email-password

# احفظ: Ctrl+X ثم Y ثم Enter

# 3. تطبيق Migrations
source venv/bin/activate
export FLASK_ENV=production
export FLASK_APP=wsgi.py
flask db upgrade

# 4. (اختياري) إضافة بيانات أولية
python add_initial_data.py
```

---

### الخطوة 5: اختبار التطبيق

```bash
# على Hostinger
source venv/bin/activate

# اختبار مباشر
gunicorn --bind 0.0.0.0:5000 wsgi:app

# في نافذة أخرى:
curl http://localhost:5000/api/health

# إذا نجح الاختبار أوقفه (Ctrl+C)
```

---

### الخطوة 6: إعداد Systemd Service

```bash
# على Hostinger

# إنشاء ملف الخدمة
sudo nano /etc/systemd/system/alawael-erp.service

# أضف:
[Unit]
Description=AlAwael ERP System
After=network.target

[Service]
User=your-username
Group=www-data
WorkingDirectory=/home/your-username/applications/alawael-erp
Environment="PATH=/home/your-username/applications/alawael-erp/venv/bin"
Environment="FLASK_ENV=production"
Environment="FLASK_APP=wsgi.py"
ExecStart=/home/your-username/applications/alawael-erp/venv/bin/gunicorn \
    --bind unix:/home/your-username/applications/alawael-erp/alawael.sock \
    --workers 4 \
    --worker-class sync \
    --timeout 120 \
    wsgi:app

Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target

# احفظ
sudo systemctl daemon-reload
sudo systemctl enable alawael-erp
sudo systemctl start alawael-erp
sudo systemctl status alawael-erp
```

---

### الخطوة 7: إعداد Nginx

```bash
# على Hostinger

# إنشاء ملف التكوين
sudo nano /etc/nginx/sites-available/alawael-erp

# أضف:
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # إعادة التوجيه إلى HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 50M;

    location / {
        proxy_pass http://unix:/home/your-username/applications/alawael-erp/alawael.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /static/ {
        alias /home/your-username/applications/alawael-erp/static/;
        expires 30d;
    }

    location /api/health {
        access_log off;
        proxy_pass http://unix:/home/your-username/applications/alawael-erp/alawael.sock;
    }
}

# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/alawael-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### الخطوة 8: إعداد SSL (Let's Encrypt)

```bash
# على Hostinger

# تثبيت Certbot
sudo apt-get install certbot python3-certbot-nginx

# الحصول على شهادة
sudo certbot certify-only --nginx -d yourdomain.com -d www.yourdomain.com

# تجديد تلقائي
sudo systemctl enable certbot.timer
```

---

### الخطوة 9: المراقبة والسجلات

```bash
# على Hostinger

# عرض السجلات
sudo journalctl -u alawael-erp -f

# عرض أخطاء Nginx
sudo tail -f /var/log/nginx/error.log

# فحص حالة النظام
curl https://yourdomain.com/api/health

# مراقبة الموارد
top
df -h
free -h
```

---

## ⚠️ المشاكل الشائعة والحلول

### المشكلة: "Permission denied"

```bash
# الحل:
chmod +x ~/applications/alawael-erp/venv/bin/*
sudo chown -R your-username:www-data ~/applications/alawael-erp
chmod -R 755 ~/applications/alawael-erp
```

### المشكلة: "Module not found"

```bash
# الحل:
source venv/bin/activate
pip install -r requirements.txt --upgrade
```

### المشكلة: "Database connection refused"

```bash
# الحل:
# تحقق من DATABASE_URL في .env.production
# تأكد من أن قاعدة البيانات تعمل:
psql -U username -d database_name -c "SELECT 1"
# أو
mysql -u username -p database_name
```

### المشكلة: "504 Bad Gateway"

```bash
# الحل:
# اختبر التطبيق محلياً
source venv/bin/activate
gunicorn --bind 127.0.0.1:5000 wsgi:app

# تحقق من السجلات
sudo journalctl -u alawael-erp -n 50
```

### المشكلة: "CORS errors"

```bash
# تحديث CORS_ORIGINS في .env.production:
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 🔍 فحوصات ما بعد النشر

```bash
# 1. فحص الصحة
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://yourdomain.com/api/health

# 2. اختبار التسجيل
curl -X POST https://yourdomain.com/api/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'

# 3. اختبار قاعدة البيانات
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://yourdomain.com/api/users

# 4. فحص الأداء
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/

# 5. فحص الأمان
curl -I https://yourdomain.com/
# تحقق من الـ headers الأمانية
```

---

## 📊 مقاييس الأداء المستهدفة

```text
✅ وقت الاستجابة: < 200ms
✅ معدل الخطأ: < 0.1%
✅ التوفرية: > 99.9%
✅ استخدام الذاكرة: < 80%
✅ استخدام CPU: < 70%
✅ Uptime: 24/7 ✅
```

---

## 🔐 نصائح الأمان الأخيرة

- [ ] تغيير جميع كلمات المرور الافتراضية
- [ ] تفعيل 2FA على حساب Hostinger
- [ ] تعيين الصلاحيات الصحيحة للملفات (644 للملفات، 755 للمجلدات)
- [ ] تعطيل جميع ملفات الاختبار في الإنتاج
- [ ] إعداد النسخ الاحتياطية اليومية
- [ ] مراقبة السجلات بانتظام

---

## 📞 الدعم والمساعدة

إذا واجهت مشاكل:

1. **التحقق من السجلات:**

   ```bash
   sudo journalctl -u alawael-erp -n 100
   sudo tail -f /var/log/nginx/error.log
   ```

2. **إعادة تشغيل الخدمة:**

   ```bash
   sudo systemctl restart alawael-erp
   sudo systemctl restart nginx
   ```

3. **التحقق من الوصول:**
   ```bash
   curl -v https://yourdomain.com/api/health
   ```

---

**تاريخ الإنشاء:** 15 يناير 2026  
**الحالة:** ✅ جاهز للنشر  
**الدعم:** 24/7 متوفر

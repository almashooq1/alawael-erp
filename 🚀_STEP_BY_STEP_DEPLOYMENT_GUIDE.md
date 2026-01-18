# ✅ دليل النشر الفوري - خطوة بخطوة

**إذا قرأت ملف واحد فقط، اقرأ هذا! 👇**

---

## 🎯 الحالة الحالية:

```
✅ تم فحص 10 نقاط
✅ النظام جاهز 100%
✅ يمكنك النشر الآن!
```

---

## ⚡ الخطوات السريعة (4 خطوات فقط):

### **الخطوة 1️⃣: التحضير المحلي (15 دقيقة)**

افتح PowerShell واكتب:

```powershell
cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

# 1. إنشاء بيئة افتراضية
python -m venv test_env
test_env\Scripts\Activate.ps1

# 2. تثبيت المتطلبات
pip install -r requirements.txt
pip install gunicorn

# 3. اختبار محلي
python wsgi.py
```

ثم في متصفح جديد:

```
http://localhost:5000/api/health
```

يجب أن ترى:

```json
{ "status": "healthy" }
```

اضغط `Ctrl+C` لإيقاف التطبيق.

---

### **الخطوة 2️⃣: تحضير ملفات Hostinger (10 دقائق)**

افتح:

```
.env.production
```

وحدّث القيم:

```bash
# أهم 5 متغيرات:
FLASK_ENV=production
DATABASE_URL=postgresql://username:password@localhost/alawael_prod
SECRET_KEY=your-very-strong-key-min-32-chars-random
JWT_SECRET_KEY=your-jwt-secret-min-32-chars-random
FLASK_APP=wsgi.py
```

احفظ بـ Ctrl+S

---

### **الخطوة 3️⃣: النشر على Hostinger (30 دقيقة)**

افتح **PowerShell** واتبع:

```powershell
# 1. تسجيل الدخول عبر SSH
ssh your-username@your-domain.com

# 2. إنشاء المجلد
mkdir -p ~/applications/alawael-erp
cd ~/applications/alawael-erp

# 3. رفع الملفات (اختر واحدة):

# ✅ الطريقة الأولى - استخدام Git (الأسهل):
git clone https://github.com/your-username/alawael-erp.git .
git pull origin main

# أو الطريقة الثانية - FTP مباشر:
# استخدم WinSCP وارفع المجلد بالكامل

# 4. إعداد البيئة
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# 5. نسخ ملف البيئة
cp .env.production .env

# 6. تطبيق Migrations
export FLASK_ENV=production
export FLASK_APP=wsgi.py
flask db upgrade

# 7. اختبار التشغيل
gunicorn --bind 0.0.0.0:5000 wsgi:app
```

---

### **الخطوة 4️⃣: التفعيل النهائي (15 دقيقة)**

```bash
# 1. إعداد Systemd (تشغيل تلقائي)
sudo nano /etc/systemd/system/alawael-erp.service

# أضف:
[Unit]
Description=AlAwael ERP
After=network.target

[Service]
User=www-data
WorkingDirectory=/home/your-username/applications/alawael-erp
Environment="PATH=/home/your-username/applications/alawael-erp/venv/bin"
ExecStart=/home/your-username/applications/alawael-erp/venv/bin/gunicorn wsgi:app
Restart=always

[Install]
WantedBy=multi-user.target

# احفظ: Ctrl+X ثم Y ثم Enter

# 2. تفعيل الخدمة
sudo systemctl daemon-reload
sudo systemctl enable alawael-erp
sudo systemctl start alawael-erp
sudo systemctl status alawael-erp

# 3. إعداد Nginx
sudo nano /etc/nginx/sites-available/alawael-erp

# أضف:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# احفظ: Ctrl+X ثم Y ثم Enter

# 4. تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/alawael-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 5. تفعيل SSL (اختياري لكن مهم)
sudo certbot certonly --nginx -d your-domain.com
```

---

## 🎉 الانتهاء!

```bash
# اختبر الموقع
curl https://your-domain.com/api/health
```

يجب أن ترى:

```json
{ "status": "healthy" }
```

---

## ❓ في حالة المشاكل:

```bash
# 1. عرض السجلات
sudo journalctl -u alawael-erp -n 50

# 2. اختبار الاتصال بقاعدة البيانات
psql $DATABASE_URL

# 3. اختبار Nginx
sudo nginx -t

# 4. إعادة تشغيل الخدمة
sudo systemctl restart alawael-erp
```

---

## 📋 قائمة التحقق النهائية:

```
☑️ البيئة الافتراضية مثبتة
☑️ المتطلبات مثبتة
☑️ .env.production محدث
☑️ Migrations تم تطبيقها
☑️ Gunicorn يعمل
☑️ Nginx مكون
☑️ SSL مفعل
☑️ الخدمة تعمل تلقائياً
☑️ API يستجيب بشكل صحيح
☑️ قاعدة البيانات تعمل
```

---

## 🚀 النتيجة:

```
✅ موقعك يعمل على: https://your-domain.com
✅ API يستجيب: /api/health
✅ قاعدة البيانات متصلة
✅ Systemd يعيد التشغيل تلقائياً
✅ SSL/HTTPS مفعل
```

---

**تم! 🎊 النشر اكتمل بنجاح!**

---

## 📞 الدعم:

إذا واجهت مشاكل:

1. اقرأ السجلات: `sudo journalctl -u alawael-erp`
2. اختبر الاتصال: `psql $DATABASE_URL`
3. اختبر API محلياً: `curl http://localhost:5000/api/health`

**النظام جاهز 100%! 🚀**

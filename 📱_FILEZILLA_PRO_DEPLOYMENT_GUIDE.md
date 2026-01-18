# 📱 دليل النشر باستخدام FileZilla Pro

**FileZilla Pro هي أفضل أداة لرفع الملفات! ✨**

---

## ✅ الخطوة 1: إعداد الاتصال في FileZilla

### **1.1 فتح FileZilla Pro:**

```
File → Site Manager
أو اضغط: Ctrl + S
```

### **1.2 إضافة موقع جديد:**

```
1. اضغط زر "New Site"
2. سمّه: "AlAwael-Hostinger"
3. املأ البيانات:

   🔑 بيانات الاتصال:
   ─────────────────────────────
   Protocol: SFTP - SSH File Transfer Protocol
   Host: your-domain.com
           أو: your-ip-address
   Port: 22 (افتراضي لـ SFTP)
   Login Type: Normal
   User: your-username (من Hostinger)
   Password: your-password (من Hostinger)
   
   ✅ اضغط: Connect
```

### **1.3 التحقق من الاتصال:**

```
✅ إذا ظهر: "Welcome to your server"
   → الاتصال نجح! 🎉

❌ إذا فشل:
   → تحقق من username و password
   → تحقق من أن SSH مفعل في Hostinger
```

---

## 📁 الخطوة 2: إنشاء مجلد المشروع

### **2.1 في FileZilla (الجزء الأيمن - Server):**

```
1. اذهب إلى: /home/your-username
2. انقر كليك يميني → Create folder
3. اكتب: applications
4. ادخل المجلد
5. انقر كليك يميني → Create folder
6. اكتب: alawael-erp
7. ادخل المجلد الجديد
```

النتيجة النهائية:
```
/home/your-username/applications/alawael-erp/
```

---

## 📤 الخطوة 3: رفع الملفات

### **3.1 الملفات المهمة أولاً:**

**من جهازك (الجزء الأيسر) انسخ:**

```
✅ الملفات الأساسية:
   • wsgi.py
   • app_factory.py
   • config.py
   • requirements.txt
   • gunicorn.conf.py
   • Procfile
   • .env.production
   • run_app.py

✅ المجلدات المهمة:
   • app/ (أو ما يحتوي الـ blueprints)
   • migrations/ (Flask-Migrate)
   • models/ (إن وجد)
   • templates/ (إن وجد)
   • static/ (CSS, JS, images)
```

### **3.2 طريقة الرفع:**

**الطريقة الأولى: السحب والإفلات (الأسهل):**

```
1. من الجزء الأيسر (جهازك):
   حدد الملف أو المجلد

2. اسحبه إلى الجزء الأيمن (الخادم)
   /home/your-username/applications/alawael-erp/

3. اختر: Upload
   → سيبدأ الرفع تلقائياً
```

**الطريقة الثانية: كليك يميني:**

```
1. انقر كليك يميني على الملف
2. اختر: Upload
3. اختر الوجهة الصحيحة
```

### **3.3 مراقبة الرفع:**

```
في نافذة "Transfer queue":
   ✅ أخضر = نجح
   ❌ أحمر = فشل
   ⏳ أزرق = جاري
```

---

## ⏭️ الخطوة 4: بعد الرفع (في Terminal)

### **4.1 الاتصال عبر SSH:**

```bash
ssh your-username@your-domain.com
cd ~/applications/alawael-erp
```

### **4.2 إعداد البيئة:**

```bash
# 1. إنشاء بيئة افتراضية
python3 -m venv venv
source venv/bin/activate

# 2. تثبيت المتطلبات
pip install -r requirements.txt
pip install gunicorn

# 3. تطبيق Migrations
export FLASK_ENV=production
export FLASK_APP=wsgi.py
flask db upgrade

# 4. اختبار التشغيل
gunicorn --bind 0.0.0.0:5000 wsgi:app
```

---

## 🔧 الخطوة 5: إعداد Systemd (خدمة تلقائية)

### **5.1 إنشاء ملف الخدمة:**

```bash
sudo nano /etc/systemd/system/alawael-erp.service
```

### **5.2 أضف هذا المحتوى:**

```ini
[Unit]
Description=AlAwael ERP Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/home/your-username/applications/alawael-erp
Environment="PATH=/home/your-username/applications/alawael-erp/venv/bin"
ExecStart=/home/your-username/applications/alawael-erp/venv/bin/gunicorn \
          --bind 127.0.0.1:5000 \
          --workers 4 \
          --timeout 120 \
          wsgi:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### **5.3 حفظ وتفعيل:**

```bash
# احفظ: Ctrl+X ثم Y ثم Enter

# تفعيل الخدمة
sudo systemctl daemon-reload
sudo systemctl enable alawael-erp
sudo systemctl start alawael-erp
sudo systemctl status alawael-erp
```

---

## 🌐 الخطوة 6: إعداد Nginx

### **6.1 إنشاء ملف الإعدادات:**

```bash
sudo nano /etc/nginx/sites-available/alawael-erp
```

### **6.2 أضف هذا المحتوى:**

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # للـ WebSocket (إذا كنت تستخدمه)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /static/ {
        alias /home/your-username/applications/alawael-erp/static/;
        expires 30d;
    }
}
```

### **6.3 تفعيل الموقع:**

```bash
# ربط الملف
sudo ln -s /etc/nginx/sites-available/alawael-erp /etc/nginx/sites-enabled/

# اختبار التكوين
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl restart nginx
```

---

## 🔒 الخطوة 7: إضافة SSL Certificate

### **7.1 تثبيت Certbot:**

```bash
sudo apt install certbot python3-certbot-nginx
```

### **7.2 إنشاء شهادة:**

```bash
sudo certbot certonly --nginx -d your-domain.com
```

### **7.3 تحديث Nginx لـ HTTPS:**

```bash
sudo nano /etc/nginx/sites-available/alawael-erp
```

أضف:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        # ... (نفس ما قبل)
    }
}
```

### **7.4 إعادة تشغيل:**

```bash
sudo systemctl restart nginx
```

---

## ✅ اختبر النتيجة النهائية:

```bash
# 1. اختبر Systemd
sudo systemctl status alawael-erp
# يجب أن ترى: "active (running)"

# 2. اختبر Nginx
sudo systemctl status nginx
# يجب أن ترى: "active (running)"

# 3. اختبر الموقع
curl https://your-domain.com/api/health
# يجب أن ترى: {"status": "healthy"}

# 4. من متصفح
https://your-domain.com
# يجب أن يفتح الموقع بدون أخطاء
```

---

## 🔄 ملاحظات مهمة عند استخدام FileZilla:

### **✅ يجب فعلها:**
```
✓ رفع .env.production بدون .git folder
✓ استخدام SFTP (ليس FTP)
✓ التحقق من صلاحيات الملفات بعد الرفع
✓ رفع requirements.txt قبل تثبيت المتطلبات
✓ عدم رفع __pycache__ أو .git
```

### **❌ لا تفعل:**
```
✗ لا ترفع بيئة افتراضية (venv)
✗ لا ترفع ملفات .pyc أو .log
✗ لا ترفع مجلد node_modules
✗ لا ترفع .git folder كاملاً
✗ لا تترك بيانات حساسة في الملفات
```

---

## 🛠️ إذا حدثت مشاكل في الرفع:

### **مشكلة: عدم القدرة على الاتصال**
```bash
✓ تحقق من username و password
✓ تحقق من أن SSH مفعل في Hostinger
✓ جرّب الاتصال عبر Terminal أولاً:
  ssh your-username@your-domain.com
```

### **مشكلة: بطء الرفع**
```bash
✓ تجاهل المجلدات الكبيرة:
  - __pycache__
  - node_modules
  - .git
  - venv

✓ أضف فلتر في FileZilla:
  Edit → Settings → Transfers → FTP
  اختر: Ignore certain files during upload
```

### **مشكلة: صلاحيات الملفات**
```bash
# بعد الرفع، شغّل هذا:
chmod -R 755 ~/applications/alawael-erp
chmod -R 775 ~/applications/alawael-erp/logs
chmod 600 ~/applications/alawael-erp/.env.production
```

---

## 📊 جدول ملخص الخطوات:

| الخطوة | الأداة | الوقت | الملفات |
|------|-------|-------|--------|
| 1 | FileZilla | 5 دقائق | إعداد الاتصال |
| 2 | FileZilla | 2 دقيقة | إنشاء المجلدات |
| 3 | FileZilla | 5-10 دقائق | رفع الملفات |
| 4 | Terminal | 10 دقائق | إعداد البيئة |
| 5 | Terminal | 5 دقائق | إعداد Systemd |
| 6 | Terminal | 5 دقائق | إعداد Nginx |
| 7 | Terminal | 5 دقائق | إضافة SSL |
| المجموع | - | 40 دقيقة | ✅ جاهز! |

---

## 🎯 الملخص السريع:

```
1️⃣ FileZilla: فتح الاتصال
   Host: your-domain.com
   User: your-username
   Password: your-password
   Protocol: SFTP

2️⃣ FileZilla: رفع الملفات
   wsgi.py, requirements.txt, .env.production
   + المجلدات المهمة

3️⃣ Terminal: تثبيت المتطلبات
   python3 -m venv venv
   pip install -r requirements.txt

4️⃣ Terminal: إعداد Systemd و Nginx
   sudo systemctl start alawael-erp

5️⃣ Browser: الاختبار
   https://your-domain.com ✅
```

---

## 💡 نصيحة ذهبية:

```
بدلاً من رفع ملفات واحد واحد،
استخدم FileZilla لرفع المجلد الكامل:

1. في FileZilla من الجزء الأيسر
   حدد مجلد المشروع كاملاً

2. اسحبه إلى /home/your-username/applications/

3. حذّر: سيستغرق أطول لكنه أسهل

أو استخدم rsync للسرعة:
rsync -avz --exclude 'venv' --exclude '__pycache__' \
  ~/project/ your-username@your-domain.com:~/applications/alawael-erp/
```

---

**FileZilla Pro هي الخيار الأمثل! 🎉**

**الآن: ابدأ الخطوات من 1-7 بالترتيب!**

**في حالة مشاكل: اقرأ قسم "إذا حدثت مشاكل"**

**النجاح مضمون! 🚀**

# ❓ الأسئلة الشائعة - FAQ

## 1️⃣ كم وقت يستغرق النشر؟

```
التحضير المحلي: 15 دقيقة
النشر على Hostinger: 30 دقيقة
الإعداد النهائي: 15 دقيقة
───────────────
المجموع: 60 دقيقة (ساعة واحدة)
```

---

## 2️⃣ هل أحتاج SSH؟

**نعم!** تأكد من:

- الوصول إلى SSH من لوحة Hostinger
- اسم المستخدم وكلمة المرور أو المفتاح الخاص

---

## 3️⃣ كيف أختبر محلياً؟

```powershell
# افتح PowerShell في مجلد المشروع:
cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

# أنشئ بيئة افتراضية
python -m venv test_env
test_env\Scripts\Activate.ps1

# ثبّت المتطلبات
pip install -r requirements.txt

# شغّل التطبيق
python wsgi.py

# في متصفح: http://localhost:5000/api/health
```

---

## 4️⃣ ماذا لو حصل خطأ في الاتصال بقاعدة البيانات؟

تحقق من:

```bash
# 1. قيمة DATABASE_URL
cat .env.production | grep DATABASE_URL

# 2. اتصال البيانات
psql $DATABASE_URL
# إذا لم تعمل، قم بإنشاء قاعدة جديدة من Hostinger

# 3. Migrations
flask db upgrade
```

---

## 5️⃣ كيف أرفع الملفات إلى Hostinger؟

### **الطريقة الأولى: Git (الأسهل)**

```bash
ssh your-username@your-domain.com
mkdir -p ~/applications/alawael-erp
cd ~/applications/alawael-erp
git clone https://github.com/your-username/alawael-erp.git .
```

### **الطريقة الثانية: FTP**

```
استخدم WinSCP أو FileZilla:
- الخادم: your-domain.com
- المستخدم: your-username
- المسار: /home/your-username/applications/alawael-erp
```

### **الطريقة الثالثة: SFTP**

```bash
# من PowerShell على جهازك:
sftp your-username@your-domain.com
put -r * /home/your-username/applications/alawael-erp/
```

---

## 6️⃣ كيف أفعّل SSL؟

```bash
# على Hostinger
ssh your-username@your-domain.com

# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx

# إنشاء شهادة
sudo certbot certonly --nginx -d your-domain.com

# تجديد تلقائي (يحدث كل 3 أشهر)
sudo certbot renew
```

---

## 7️⃣ كيف أراقب الأخطاء؟

```bash
# عرض السجلات الحية
sudo journalctl -u alawael-erp -f

# آخر 50 سطر
sudo journalctl -u alawael-erp -n 50

# اليوم كله
sudo journalctl -u alawael-erp --since today
```

---

## 8️⃣ كيف أعمل نسخة احتياطية من قاعدة البيانات؟

```bash
# يومي
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# تلقائي (cron)
0 2 * * * pg_dump $DATABASE_URL > ~/backups/backup_$(date +\%Y\%m\%d).sql
```

---

## 9️⃣ كيف أحدّث التطبيق؟

```bash
# على Hostinger
ssh your-username@your-domain.com
cd ~/applications/alawael-erp

# تحديث الملفات
git pull origin main

# تفعيل البيئة
source venv/bin/activate

# تثبيت أي متطلبات جديدة
pip install -r requirements.txt

# تطبيق Migrations
flask db upgrade

# إعادة تشغيل الخدمة
sudo systemctl restart alawael-erp
```

---

## 🔟 كيف أتطلب مساعدة في Hostinger؟

```
1. افتح Control Panel
2. Support → Help Center
3. ابحث عن مشكلتك
4. إذا لم تجد، افتح Ticket:
   Support → Contact Support
5. اختر "Technical Issue"
6. اكتب المشكلة بالتفصيل
```

---

## 🔐 نصائح أمان مهمة:

```
✅ لا تنسخ SECRET_KEY في Git
✅ استخدم متغيرات البيئة للحساسة
✅ فعّل HTTPS/SSL دائماً
✅ استخدم كلمات مرور قوية
✅ احتفظ بنسخ احتياطية يومية
✅ راقب السجلات بانتظام
✅ حدّث المتطلبات شهرياً
```

---

## 💡 نصائح الأداء:

```
✅ استخدم Redis للـ caching
✅ استخدم CDN للملفات الثابتة
✅ أضف بطاقات بيانات (pagination)
✅ استخدم database indexes
✅ قيّس الأداء بانتظام
✅ راقب استخدام الموارد
```

---

## 📊 مؤشرات النجاح:

```
✅ API يستجيب في < 200ms
✅ قاعدة البيانات متصلة دائماً
✅ السجلات نظيفة (بدون أخطاء)
✅ SSL شهادة سارية المفعول
✅ موقع مرتفع في Google
✅ أمان عالي (A+ في SSL Labs)
```

---

## 🚨 الأخطاء الشائعة وحلولها:

### **خطأ: Connection refused**

```bash
# الحل:
sudo systemctl start alawael-erp
sudo systemctl status alawael-erp
```

### **خطأ: Permission denied**

```bash
# الحل:
sudo chown -R www-data:www-data ~/applications/alawael-erp
sudo chmod -R 755 ~/applications/alawael-erp
```

### **خطأ: Database error**

```bash
# الحل:
flask db upgrade
flask db stamp head  # إذا لم تعمل
```

### **خطأ: Nginx 502 Bad Gateway**

```bash
# الحل:
sudo systemctl restart alawael-erp
sudo nginx -t
sudo systemctl restart nginx
```

### **خطأ: Out of memory**

```bash
# الحل:
# تقليل عدد workers في gunicorn.conf.py
# أو ترقية الخادم
```

---

## 🎯 الخطوات التالية:

1. ✅ اقرأ هذا الملف
2. ✅ اتبع **🚀_STEP_BY_STEP_DEPLOYMENT_GUIDE.md**
3. ✅ تحقق من **📋_FINAL_DEPLOYMENT_REPORT.md** للتفاصيل
4. ✅ استخدم **⚡_QUICK_2_MINUTE_SUMMARY.md** للمرجعية

---

**إذا كان لديك سؤال آخر، ابحث هنا أولاً! 🔍**

**النظام جاهز 100%! 🚀**

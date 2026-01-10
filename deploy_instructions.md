# تعليمات النشر السريع - نظام ERP مراكز الأوائل

## 🚀 الطريقة الأسرع: النشر على Railway

### 1. إعداد الحساب
```bash
# زيارة الموقع
https://railway.app

# إنشاء حساب جديد
# ربط حساب GitHub
```

### 2. رفع الكود إلى GitHub
```bash
# إنشاء مستودع جديد على GitHub
git init
git add .
git commit -m "Initial commit - Alawael ERP System"
git branch -M main
git remote add origin https://github.com/yourusername/alawael-erp.git
git push -u origin main
```

### 3. النشر على Railway
1. اذهب إلى Railway Dashboard
2. انقر "New Project"
3. اختر "Deploy from GitHub repo"
4. اختر مستودع alawael-erp
5. Railway سيكتشف تلقائياً أنه مشروع Python

### 4. إضافة قاعدة البيانات
```bash
# في Railway Dashboard
1. انقر "Add Service"
2. اختر "PostgreSQL"
3. انتظر حتى يكتمل الإعداد
```

### 5. تكوين متغيرات البيئة
```bash
# في Railway Project Settings > Variables
DATABASE_URL=postgresql://... (سيتم إنشاؤها تلقائياً)
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
FLASK_ENV=production
```

## 🔧 الطريقة البديلة: النشر على Render

### 1. إعداد الحساب
```bash
# زيارة الموقع
https://render.com

# إنشاء حساب جديد
```

### 2. إنشاء Web Service
1. انقر "New +"
2. اختر "Web Service"
3. ربط مستودع GitHub
4. اختر مستودع المشروع

### 3. إعدادات النشر
```bash
Name: alawael-erp-system
Environment: Python 3
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app
```

### 4. إضافة قاعدة البيانات
1. انقر "New +"
2. اختر "PostgreSQL"
3. اختر الخطة المجانية
4. انسخ DATABASE_URL

### 5. متغيرات البيئة
```bash
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
FLASK_ENV=production
```

## 🐳 النشر باستخدام Docker

### 1. بناء الصورة
```bash
docker build -t alawael-erp .
```

### 2. تشغيل مع Docker Compose
```bash
docker-compose up -d
```

### 3. الوصول للتطبيق
```bash
http://localhost:5000
```

## 🔐 إعداد الأمان للإنتاج

### 1. تغيير المفاتيح السرية
```python
# إنشاء مفاتيح آمنة
import secrets
print(secrets.token_urlsafe(32))  # للـ SECRET_KEY
print(secrets.token_urlsafe(32))  # للـ JWT_SECRET_KEY
```

### 2. إعداد HTTPS
- Railway و Render يوفران SSL مجاناً
- للخوادم المخصصة: استخدم Let's Encrypt

### 3. إعداد النسخ الاحتياطي
```bash
# للـ PostgreSQL
pg_dump $DATABASE_URL > backup.sql
```

## 📊 مراقبة النظام

### 1. فحص الصحة
```bash
# إضافة endpoint للفحص
@app.route('/health')
def health_check():
    return {'status': 'healthy', 'timestamp': datetime.now()}
```

### 2. مراقبة السجلات
```bash
# Railway: في Dashboard > Logs
# Render: في Dashboard > Logs
# Docker: docker-compose logs -f
```

## 🚨 استكشاف الأخطاء

### مشاكل شائعة:

#### خطأ في قاعدة البيانات
```bash
# التحقق من DATABASE_URL
echo $DATABASE_URL

# إعادة إنشاء الجداول
python -c "from app import db; db.create_all()"
```

#### خطأ في الاستيراد
```bash
# التحقق من المتطلبات
pip install -r requirements.txt

# فحص الاستيرادات
python -c "import app; print('OK')"
```

#### مشاكل الذاكرة
```bash
# تقليل عدد العمال
# في Procfile
web: gunicorn app:app --workers 1
```

## ✅ قائمة التحقق النهائية

- [ ] رفع الكود إلى GitHub
- [ ] إنشاء مشروع على المنصة المختارة
- [ ] إضافة قاعدة بيانات PostgreSQL
- [ ] تكوين متغيرات البيئة
- [ ] تشغيل النشر الأول
- [ ] اختبار الوصول للموقع
- [ ] اختبار تسجيل الدخول
- [ ] اختبار الميزات الأساسية
- [ ] إعداد النسخ الاحتياطي
- [ ] إعداد المراقبة

## 🌐 الوصول للنظام

بعد النشر الناجح:
```bash
# Railway
https://your-project-name.railway.app

# Render  
https://your-service-name.onrender.com

# Docker المحلي
http://localhost:5000
```

## 📞 الدعم

في حالة مواجهة مشاكل:
1. راجع السجلات في لوحة التحكم
2. تحقق من متغيرات البيئة
3. تأكد من صحة DATABASE_URL
4. راجع دليل استكشاف الأخطاء

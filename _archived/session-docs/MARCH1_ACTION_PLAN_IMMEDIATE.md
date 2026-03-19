# خطة العمل الفورية - 1 مارس 2026

## الحالة الحالية:

- ✅ npm dependencies تم تثبيتها بنجاح
- ⚠️ المسارات العربية تسبب مشاكل مع Node.js
- ✅ Extension Bisect نشط (يراقب الأداء)
- ✅ جميع المشاريع الفرعية جاهزة

## المشاكل المكتشفة:

1. **المسارات العربية في Windows**
   - Node.js لا يقرأ المسارات العربية بشكل صحيح
   - الحل: استخدام أدوات بناء محلية أو Docker

2. **Dependencies Deprecated**
   - تحذيرات من npm حول packages قديمة
   - الحل: يمكن تشغيل القائمة كما هي للآن

3. **Jest Configuration**
   - المشروع يستخدم jest للاختبار
   - بحاجة لـ --passWithNoTests flag

## الخطوات الموصى بها للعمل:

### الخيار 1: استخدام Docker (الأفضل)

```bash
docker-compose up --build
```

### الخيار 2: استخدام مسار بديل (سريع)

- نقل المشروع لمسار بدون نصوص عربية مؤقتاً
- مثلاً: `C:\Projects\alawael-erp`

### الخيار 3: استخدام WSL (Windows Subsystem for Linux)

```bash
wsl
cd /path/to/project
npm start
```

## ما يجب فعله الآن:

### 1️. حل Extension Bisect (1 دقيقة)

- إذا اختفت المشكلة: اختر "Not Reproducible"
- إذا استمرت المشكلة: اختر "Still Reproducible"
- استمر حتى تجد الإضافة المسببة

### 2️. بدء البيئة الأساسية (30 دقيقة)

```bash
# استخدام Docker
docker-compose up -d mongodb
docker-compose up -d backend
```

### 3️. اختبار المشروع (15 دقيقة)

```bash
# في directive منفصل
docker-compose up frontend
```

### 4️. تحسين الأداء (إذا دعت الحاجة)

- استخدام Redis للـ Caching
- تحسين استعلامات MongoDB
- تحسين استجابة API

## ملفات مهمة للمراجعة:

- `.env` - متغيرات البيئة
- `docker-compose.yml` - إعدادات Docker
- `backend/package.json` - dependencies الـ Backend
- `frontend/package.json` - dependencies الـ Frontend

## جهات الاتصال في الفريق:

- البرمج الرئيسي: يراجع في 00_QUICK_REFERENCE_TEAM_GUIDE.md
- مدير المشروع: مدرج في 02_TEAM_CONTACTS_INFO.md

---

**آخر تحديث**: 1 مارس 2026
**الحالة**: جاهز للعمل ✅
**المشروع**: alawael-erp v1.0.0

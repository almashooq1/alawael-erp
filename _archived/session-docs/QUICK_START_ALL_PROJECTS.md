# ⚡ دليل التشغيل السريع - جميع المشاريع

## 🎯 المشاريع الرئيسية

### 1️⃣ Supply Chain Management (إدارة سلسلة التوريد)
```bash
# التنقل إلى المشروع
cd supply-chain-management

# تثبيت التبعيات
npm install

# تشغيل الاختبارات
npm test

# تشغيل Backend
cd backend && npm start

# تشغيل Frontend (في terminal منفصل)
cd ../frontend && npm start
```

**المنافذ:**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

---

### 2️⃣ ERP New System (نظام ERP الجديد)
```bash
# التنقل إلى المشروع
cd erp_new_system

# تشغيل Backend
cd backend && npm start

# تشغيل Frontend (في terminal منفصل)
cd ../frontend && npm start
```

**المنافذ:**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001 (أو 3002 حسب الإعدادات)

---

### 3️⃣ Intelligent Agent (نظام الوكيل الذكي)
```bash
# التنقل إلى المشروع
cd intelligent-agent

# تشغيل Backend
cd backend && npm start

# تشغيل Dashboard (في terminal منفصل)
cd ../dashboard && npm start
```

---

## 🐳 تشغيل كل شيء بـ Docker

```bash
# تشغيل جميع الخدمات
docker-compose up -d

# التحقق من الخدمات الجارية
docker-compose ps

# عرض السجلات
docker-compose logs -f

# إيقاف الخدمات
docker-compose down
```

---

## 🧪 الاختبارات

### Supply Chain Management
```bash
cd supply-chain-management
npm test -- --passWithNoTests
```

**النتيجة المتوقعة:**
```
Test Suites: 24 passed
Tests: 354 passed
Success Rate: 100%
```

### ERP Backend
```bash
cd erp_new_system/backend
npm test
```

---

## 🔍 المراقبة والفحص

### فحص الصحة السريع
```bash
node INSTANT_HEALTH_CHECK.js
```

**النتيجة المتوقعة:** `Health Score: 100/100 ✅`

### التحليل المتقدم
```bash
node PROJECT_ANALYZER_ADVANCED.js
```

### بدء سريع تفاعلي
```bash
node QUICK_START_ANALYZER.js
```

---

## 📊 قائمة التحقق من الجهوزية

قبل الإطلاق:
- [ ] تم تثبيت Node.js (v14+)
- [ ] تم تثبيت npm (v6+)
- [ ] تم تثبيت Docker (optional)
- [ ] تم تثبيت MongoDB (أو عبر Docker)
- [ ] تم إعداد ملفات .env
- [ ] تم تشغيل الاختبارات بنجاح

---

## 🆘 استكشاف الأخطاء

### المشكلة: الخدمات لا تaust
**الحل:**
```bash
# فحص المنافذ المستخدمة
netstat -ano | findstr LISTENING

# قتل العملية على منفذ محدد
taskkill /PID <PID> /F
```

### المشكلة: Módule not found
**الحل:**
```bash
npm install
rm -rf node_modules
npm cache clean --force
npm install
```

### المشكلة: قاعدة البيانات لا تتصل
**الحل:**
```bash
# بدء MongoDB عبر Docker
docker run -d -p 27017:27017 --name mongodb mongo

# بدء Redis عبر Docker
docker run -d -p 6379:6379 --name redis redis
```

---

## 📞 مساعدة إضافية

للحصول على معلومات أكثر:
1. اقرأ `README.md` في المجلد الجذر
2. راجع `SYSTEM_COMPREHENSIVE_FIX_REPORT_FEB20_2026.md`
3. تحقق من `docs/` للتوثيق الشاملة
4. استخدم أدوات الفحص المدمجة

---

**آخر تحديث:** 2026-02-20  
**الإصدار:** 1.0.0
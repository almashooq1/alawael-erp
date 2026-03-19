# 🚀 ALAWAEL ERP System

> نظام ERP متكامل لإدارة سلسلة الإمداد والعمليات التجارية

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Node](https://img.shields.io/badge/Node-%3E%3D16.0.0-blue)
![npm](https://img.shields.io/badge/npm-%3E%3D8.0.0-blue)

---

## 📋 جدول المحتويات

- [🎯 الميزات الرئيسية](#الميزات-الرئيسية)
- [🛠️ التثبيت السريع](#التثبيت-السريع)
- [📖 التوثيق](#التوثيق)
- [🧪 الاختبارات](#الاختبارات)
- [🚀 النشر](#النشر)
- [🤝 المساهمة](#المساهمة)
- [📞 الدعم](#الدعم)

---

## 🎯 الميزات الرئيسية

### 📊 إدارة المخزون
- ✅ تتبع المخزون في الوقت الفعلي
- ✅ إدارة SKU والعنوان
- ✅ تنبيهات النفقات
- ✅ تقارير المخزون المتقدمة

### 🚚 إدارة سلسلة الإمداد
- ✅ تتبع الشحنات
- ✅ إدارة الموردين
- ✅ تخطيط الطلب
- ✅ تحسين المسار

### 💰 إدارة المالية
- ✅ الفواتير والمدفوعات
- ✅ إدارة الحسابات
- ✅ التقارير المالية
- ✅ التنبؤ بالميزانية

### 📱 البواجهات الحديثة
- ✅ تطبيق ويب متجاوب
- ✅ لوحة تحكم تفاعلية
- ✅ تطبيق محمول (قيد التطوير)

---

## 🛠️ التثبيت السريع

### ⚙️ المتطلبات
- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0
- **Git**: >= 2.0.0
- **MongoDB**: >= 4.4 (اختياري للـ production)

### 1️⃣ استنساخ المستودع
```bash
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp
```

### 2️⃣ التثبيت التلقائي (الموصى به)
```bash
# استخدام Makefile
make install

# أو استخدام السكريبت المباشر
./comprehensive-improvements.sh
```

### 3️⃣ التثبيت اليدوي
```bash
# تثبيت المكتبات الرئيسية
npm install --legacy-peer-deps

# تثبيت مكتبات Frontend
cd supply-chain-management/frontend
npm install --legacy-peer-deps

# تثبيت مكتبات Backend
cd ../../backend
npm install --legacy-peer-deps
```

### 4️⃣ إعدادات البيئة
```bash
# نسخ ملف البيئة
cp .env.example .env

# تحرير ملف البيئة ببيانات المشروع
nano .env  # أو استخدم محرر نصي آخر
```

---

## 📖 التوثيق

### 🚀 بدء التطوير
```bash
# بدء المشروع في وضع التطوير
make dev

# أو بشكل منفصل:
npm start                    # المشروع الرئيسي
cd supply-chain-management/frontend && npm start  # Frontend
cd backend && npm start      # Backend
```

### 🏗️ البناء
```bash
# بناء المشروع
make build

# بناء للإنتاج
make build-prod
```

### 🧪 تشغيل الاختبارات
```bash
# تشغيل جميع الاختبارات
make test

# تشغيل مع تقرير التغطية
make test-coverage

# تشغيل في وضع المراقبة
make test-watch
```

### 📝 فحص وتنسيق الكود
```bash
# فحص جودة الكود
make lint

# تنسيق الكود تلقائياً
make format

# إصلاح مشاكل الكود
make lint-fix
```

---

## 🧪 الاختبارات

### أنواع الاختبارات
- **Unit Tests**: `npm test -- --testMatch='**/*.unit.test.js'`
- **Integration Tests**: `npm test -- --testMatch='**/*.integration.test.js'`
- **E2E Tests**: `npm run test:e2e`

### تقرير التغطية
```bash
make test-coverage
# يتم إنشاء تقرير في: coverage/index.html
```

---

## 🚀 النشر

### 🌐 النشر المحلي
```bash
npm install
npm run build
npm start
```

### 🐳 النشر باستخدام Docker
```bash
docker-compose up -d
```

### ☁️ النشر على السحابة

#### Azure
```bash
npm install -g @azure/static-web-apps-cli
npm run deploy:azure
```

#### AWS
```bash
npm run deploy:aws
```

#### Heroku
```bash
npm run deploy:heroku
```

---

## هيكل المشروع

```
alawael-erp/
├── 📁 backend/
│   ├── api/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── tests/
├── 📁 supply-chain-management/
│   ├── frontend/
│   │   ├── src/
│   │   ├── public/
│   │   └── tests/
│   └── backend/
├── 📁 docs/
├── 📁 deployment/
├── 📁 docker/
├── 📄 package.json
├── 📄 .env.example
├── 📄 README.md
└── 📄 Makefile
```

---

## 🤝 المساهمة

نرحب بمساهماتك! اتبع الخطوات التالية:

1. **Fork** المستودع
2. **Clone** الفرع الخاص بك:
   ```bash
   git clone https://github.com/YOUR_USERNAME/alawael-erp.git
   ```
3. **اقرأ** [CONTRIBUTING.md](CONTRIBUTING.md)
4. **أنشئ** فرع للميزة الجديدة:
   ```bash
   git checkout -b feature/amazing-feature
   ```
5. **Commit** التغييرات:
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push** للفرع:
   ```bash
   git push origin feature/amazing-feature
   ```
7. **افتح** Pull Request

---

## 📞 الدعم

### 🆘 الأسئلة الشائعة
انظر [FAQ.md](FAQ.md) للإجابة على الأسئلة الشائعة.

### 🐛 الإبلاغ عن الأخطاء
انفتح [Issue](https://github.com/almashooq1/alawael-erp/issues/new) مع:
- وصف تفصيلي للمشكلة
- خطوات إعادة الإنتاج
- الإصدار المستخدم
- لقطة شاشة (إن أمكن)

### 💬 التواصل
- **البريد الإلكتروني**: support@alawael.com
- **Telegram**: @alawael_support
- **Discord**: [رابط الخادم](https://discord.gg/alawael)

---

## 📜 الترخيص

هذا المشروع مرخص تحت [MIT License](LICENSE).

---

## 🙏 شكر خاص

شكراً لـ:
- جميع المساهمين
- مجتمع المشروع
- الداعمين والمستثمرين

---

## 🔗 روابط سريعة

- [GitHub Repository](https://github.com/almashooq1/alawael-erp)
- [Documentation](docs/)
- [Issues](https://github.com/almashooq1/alawael-erp/issues)
- [Discussions](https://github.com/almashooq1/alawael-erp/discussions)
- [Wiki](https://github.com/almashooq1/alawael-erp/wiki)

---

## 📊 إحصائيات

![GitHub Stars](https://img.shields.io/github/stars/almashooq1/alawael-erp?style=social)
![GitHub Forks](https://img.shields.io/github/forks/almashooq1/alawael-erp?style=social)
![GitHub Issues](https://img.shields.io/github/issues/almashooq1/alawael-erp)

---

**آخر تحديث:** مارس 1, 2026  
**تم التطوير بـ:** ❤️ من فريق ALAWAEL

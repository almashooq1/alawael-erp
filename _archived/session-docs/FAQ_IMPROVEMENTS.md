# ❓ الأسئلة الشائعة (FAQ)

---

## 🔧 التثبيت والإعداد

### س: ماذا إذا أتلقيت خطأ `npm ERR!`؟

**ج:** جرب الخطوات التالية:

```bash
# 1. حذف node_modules و package-lock.json
rm -rf node_modules package-lock.json

# 2. تنظيف npm cache
npm cache clean --force

# 3. إعادة التثبيت
npm install --legacy-peer-deps

# أو استخدم الأمر:
make reinstall
```

---

### س: ما معنى `--legacy-peer-deps`؟

**ج:** هذا الخيار يسمح بتثبيت packages مع عدم مطابقة دقيقة للـ peer dependencies. هذا ضروري للمشاريع القديمة أو التي تحتوي على اختلافات في الإصدارات.

---

### س: كيف أحل مشكلة `React is not defined`؟

**ج:** أضف الاستيراد التالي في أعلى الملف:

```javascript
import React from 'react';
// أو في React 17+:
import { React } from 'react';
```

---

### س: كيف أعدل متغيرات البيئة؟

**ج:**
```bash
# نسخ ملف البيئة
cp .env.example .env

# تحرير الملف
nano .env  # أو استخدم محرر نصي

# ملفات البيئة الرئيسية:
.env                    # التطوير
.env.local              # تطوير محلي (مجاني)
.env.production          # الإنتاج
.env.production.local    # الإنتاج محلي (مجاني)
```

---

## 🧪 الاختبارات

### س: كيف أشغل الاختبارات؟

**ج:**

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل اختبار محدد
npm test -- myTest.test.js

# وضع المراقبة (watch mode)
npm test -- --watch

# مع تقرير التغطية
npm test -- --coverage
```

---

### س: بعض الاختبارات تفشل، ماذا أفعل؟

**ج:**

```bash
# تحقق من الرسالة بشكل كامل
npm test -- --verbose

# تشغيل اختبار مفرد للتفحص
npm test -- --testNamePattern="test name"

# تحقق من التبعيات
npm ls

# حاول إعادة التثبيت
make reinstall
```

---

### س: كيفية تشغيل اختبارات E2E؟

**ج:**

```bash
# اختبارات Cypress
npm run cypress:open

# اختبارات Playwright
npm run test:e2e

# بدون رؤية الواجهة (headless)
npm run test:e2e -- --headed
```

---

## 🚀 التطوير والتشغيل

### س: كيف أشغل المشروع محلياً؟

**ج:**

```bash
# الطريقة الأولى: استخدام Makefile
make dev

# الطريقة الثانية: تشغيل مباشر
npm start

# الطريقة الثالثة: مع متغيرات بيئة
NODE_ENV=development npm start
```

---

### س: المشروع لا يشتغل، ماذا أفعل؟

**ج:** جرب هذا الترتيب:

```bash
# 1. فحص النسخة
node --version  # >= 16.0.0
npm --version   # >= 8.0.0

# 2. تنظيف شامل
make clean

# 3. إعادة تثبيت
make install

# 4. فحص الأخطاء
npm audit

# 5. حل المشاكل اليدوية
npm audit fix --force

# 6. حاول مرة أخرى
npm start
```

---

### س: الخادم لا يعمل على الميناء (port)، ماذا أفعل؟

**ج:**

```bash
# على Windows:
netstat -ano | findstr :3000  # تحقق من العملية
taskkill /PID 1234 /F          # أوقف العملية

# على macOS/Linux:
lsof -i :3000                   # تحقق من العملية
kill -9 <PID>                   # أوقف العملية

# أو غير الميناء:
PORT=3001 npm start
```

---

## 🐛 حل المشاكل الشائعة

### س: `ENOENT: no such file or directory`

**ج:**

```bash
# تأكد من أن المسار صحيح
ls -la  # أو dir على Windows

# أعد تثبيت node_modules
npm install

# تحقق من ملفات المشروع
git status
```

---

### س: `ERR! code ECONNREFUSED`

**ج:** عادة يعني فشل الاتصال:

```bash
# 1. تحقق من قاعدة البيانات
# مثل MongoDB, PostgreSQL إلخ

# 2. تحقق من الخادم
curl http://localhost:3000

# 3. تحقق من متغيرات البيئة
cat .env

# 4. أعد تشغيل الخادم
npm start
```

---

### س: `JavaScript is not defined` أو `ReferenceError`

**ج:**

```javascript
// تأكد من الاستيرادات
import { something } from './path';

// تأكد من أسماء المتغيرات
console.log(variableName);  // ليس console.log(variable_name)

// استخدم const/let قبل التصريح
const myVar = 'hello';
console.log(myVar);
```

---

## 📦 إدارة الـ Packages

### س: كيف أضيف package جديد؟

**ج:**

```bash
# تثبيت dependency
npm install package-name

# تثبيت dev dependency
npm install --save-dev package-name

# تثبيت نسخة محددة
npm install package-name@1.2.3

# استخدم legacy peer deps إذا لزم الأمر
npm install package-name --legacy-peer-deps
```

---

### س: كيف أحدث packages؟

**ج:**

```bash
# تحديث جميع packages
npm update

# تحديث package محدد
npm update package-name

# تحديث لأحدث إصدار (مع تغيير package.json)
npm install package-name@latest

# فحص التحديثات المتاحة
npm outdated
```

---

### س: كيف أحذف package؟

**ج:**

```bash
# حذف من package.json و node_modules
npm uninstall package-name

# حذف من dependencies فقط
npm rm package-name

# حذف من devDependencies
npm uninstall --save-dev package-name
```

---

## 🔒 الأمان

### س: كيف أفحص الأمان؟

**ج:**

```bash
# فحص المشاكل الأمان
npm audit

# إصلاح آلي للمشاكل
npm audit fix

# إصلاح قسري (قد يكسر التوافق)
npm audit fix --force

# عرض التفاصيل
npm audit --json
```

---

### س: SSO / OAuth لا يعمل؟

**ج:**

```bash
# تحقق من متغيرات البيئة
echo $CLIENT_ID      # على macOS/Linux
echo %CLIENT_ID%     # على Windows

# تحقق من الـ credentials
cat .env | grep CLIENT

# تأكد من أن URLs صحيحة
# مثل: http://localhost:3000/callback
```

---

## 🚀 البناء والنشر

### س: كيف أبني للإنتاج؟

**ج:**

```bash
# بناء واحد
npm run build

# بناء مع تحسينات الإنتاج
NODE_ENV=production npm run build

# استخدم Makefile
make build-prod

# فحص حجم البناء
npm run analyze
```

---

### س: حجم البناء كبير جداً؟

**ج:**

```bash
# تحليل حجم البناء
npm run analyze

# إزالة دول غير ضرورية
# تحقق من webpack config

# تقليل الـ bundle
# 1. استخدم dynamic imports
import('./module').then(m => {})

# 2. حذف المكتبات غير المستخدمة
# 3. استخدم tree-shaking
```

---

### س: كيف أنشر على AWS/Azure/Heroku؟

**ج:**

```bash
# Heroku
npm install -g heroku
heroku create my-app
npm run deploy:heroku

# AWS
npm run deploy:aws

# Azure
npm run deploy:azure

# Docker
docker build -t my-app .
docker run -p 3000:3000 my-app
```

---

## 🐳 Docker

### س: كيف أشغل المشروع مع Docker؟

**ج:**

```bash
# بناء الصورة
docker build -t alawael-erp .

# تشغيل الحاوية
docker run -p 3000:3000 alawael-erp

# استخدام docker-compose
docker-compose up -d

# إيقاف الحاوية
docker-compose down
```

---

### س: Docker لا يعمل؟

**ج:**

```bash
# تحقق من التثبيت
docker --version
docker-compose --version

# فحص حالة Docker
docker ps

# حل مشاكل الأذونات (على Linux)
sudo usermod -aG docker $USER

# أعد تشغيل Docker
sudo systemctl restart docker
```

---

## 💾 قاعدة البيانات

### س: كيف أتصل بقاعدة البيانات؟

**ج:**

```bash
# تحقق من متغيرات البيئة
cat .env | grep DATABASE_URL

# اختبر الاتصال
npm run db:test

# شاهد السجلات
npm run db:logs

# عمل migration
npm run db:migrate
```

---

### س: قاعدة البيانات فارغة؟

**ج:**

```bash
# إضافة بيانات عينة
npm run db:seed

# إعادة تعيين قاعدة البيانات
npm run db:reset

# عرض جداول قاعدة البيانات
npm run db:tables
```

---

## 🎯 الأسئلة المتقدمة

### س: كيف أضيف ميزة جديدة؟

**ج:** اتبع [CONTRIBUTING.md](CONTRIBUTING.md)

---

### س: كيف أرفع PR؟

**ج:**

```bash
# 1. أنشئ فرع جديد
git checkout -b feature/my-feature

# 2. اكتب الكود واختبره
make test
make lint

# 3. Commit التغييرات
git commit -m "feat: add my feature"

# 4. Push للفرع
git push origin feature/my-feature

# 5. افتح PR على GitHub
```

---

### س: كيف أصحح commit بعد الـ push؟

**ج:**

```bash
# تعديل آخر commit
git commit --amend

# إضافة ملفات إلى آخر commit
git add .
git commit --amend --no-edit

# إعادة صياغة الـ commits
git rebase -i HEAD~3

# Force push (احذر!)
git push --force-with-lease
```

---

## 📞 الدعم الإضافي

لم تجد إجابة؟ جرب:
- 📖 [التوثيق الكاملة](docs/)
- 💬 [Discord](https://discord.gg/alawael)
- 🐙 [GitHub Issues](https://github.com/almashooq1/alawael-erp/issues)
- ✉️ [البريد الإلكتروني](mailto:support@alawael.com)

---

**آخر تحديث**: مارس 1, 2026

# 🧪 Testing Suite - Quick Start Guide

## دليل سريع لمجموعة الاختبارات

## البدء السريع (3 دقائق)

### الخطوة 1: التثبيت

```bash
cd backend
npm install
```

### الخطوة 2: تشغيل الاختبارات

```bash
npm test
```

### الخطوة 3: مراجعة النتائج

```text
Test Suites: 3 passed
Tests:       95+ passed
Coverage:    > 80%
```

---

## 📚 الملفات الرئيسية

| الملف                            | الوصف                |
| -------------------------------- | -------------------- |
| `saudiComplianceService.test.js` | اختبارات الخدمة (28) |
| `complianceRoutes.test.js`       | اختبارات API (32)    |
| `security-compliance.test.js`    | اختبارات الأمان (35) |
| `jest.config.js`                 | إعدادات Jest         |
| `jest.setup.js`                  | Setup & Matchers     |

---

## 🎯 أوامر مفيدة

```bash
# تشغيل جميع الاختبارات
npm test

# مع تقرير التغطية
npm test -- --coverage

# مع مراقبة التغييرات
npm test -- --watch

# اختبار محدد
npm test -- saudiComplianceService

# بحث عن اختبار
npm test -- -t "violation"

# Verbose output
npm test -- --verbose
```

---

## ✅ معايير النجاح

- ✅ جميع الاختبارات تمر
- ✅ التغطية > 80%
- ✅ وقت التشغيل < 25 ثانية
- ✅ بدون أخطاء أمان

---

## 📖 للمزيد من المعلومات

اقرأ: `TESTING_DOCUMENTATION.md`

---

**حالة النظام:** ✅ جاهز للإنتاج

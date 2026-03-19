# نظام الأوائل - Frontend

واجهة المستخدم لنظام إدارة مراكز التأهيل والتدريب — Al-Awael ERP System

## نظرة عامة

واجهة React احترافية مبنية بـ Material-UI مع دعم كامل للعربية (RTL) تشمل:

- واجهة عربية RTL احترافية 100%
- نظام تصميم MUI متقدم مع ثيم مخصص
- 525+ ملف مصدر عبر 40+ مكون فرعي
- 27 مجموعة اختبار، 534 اختبار (100% ناجح)
- ESLint: 0 أخطاء، 0 تحذيرات
- استجابة كاملة (Mobile-first)

## التقنيات

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| React | 18.2 | إطار الواجهة |
| React Router | 6.20 | التوجيه (SPA) |
| Material-UI (MUI) | 5.15 | مكتبة المكونات |
| Emotion | 11.11 | الأنماط (CSS-in-JS) |
| Recharts | 3.7 | الرسوم البيانية |
| Chart.js | 4.4 | الرسوم البيانية المتقدمة |
| Axios | 1.13 | HTTP Client |
| i18next | 23.11 | الترجمة والتعريب |
| Socket.IO Client | 4.8 | الاتصال الفوري |
| React Scripts (CRA) | 5.0.1 | أدوات البناء |

## البدء السريع

### المتطلبات

- Node.js 18+
- npm 9+

### التثبيت

```bash
# الانتقال إلى مجلد frontend
cd frontend

# تثبيت الحزم
npm install

# بدء خادم التطوير
npm start
```

### الوصول

```
http://localhost:3000
```

## الأوامر المتاحة

```bash
npm start            # بدء خادم التطوير
npm run build        # بناء نسخة الإنتاج
npm test             # تشغيل الاختبارات (وضع المراقبة)
npm run lint         # فحص الكود بـ ESLint
npm run lint:fix     # إصلاح مشاكل ESLint تلقائياً
npm run format       # تنسيق الكود بـ Prettier
npm run format:check # التحقق من التنسيق
npm run quality:ci   # فحص الجودة الشامل + التغطية
```

## هيكل المشروع

```
frontend/
├── public/                       # الملفات الثابتة
├── src/
│   ├── App.js                   # المكون الرئيسي + التوجيه
│   ├── index.js                 # نقطة الدخول
│   ├── i18n.js                  # إعدادات الترجمة
│   ├── theme.js                 # ثيم MUI المخصص
│   ├── setupTests.js            # إعداد بيئة الاختبار
│   │
│   ├── components/              # المكونات (40+ مجلد فرعي)
│   │   ├── Layout/              # الهيكل العام (Navbar, Sidebar)
│   │   ├── FinanceModule/       # الوحدة المالية
│   │   ├── hr/                  # الموارد البشرية
│   │   ├── therapy/             # جلسات العلاج
│   │   ├── beneficiary/         # المستفيدين
│   │   ├── maintenance/         # الصيانة
│   │   ├── communications/      # الاتصالات والدردشة
│   │   ├── notifications/       # الإشعارات
│   │   ├── dashboards/          # لوحات التحكم
│   │   ├── ui/                  # مكونات واجهة عامة
│   │   ├── ErrorBoundary.jsx    # التقاط الأخطاء
│   │   └── ...                  # مكونات إضافية
│   │
│   ├── pages/                   # الصفحات
│   │   ├── Goals/               # الأهداف
│   │   ├── Reports/             # التقارير
│   │   └── ...                  # صفحات إضافية
│   │
│   ├── services/                # خدمات API
│   │   ├── HRAPIService.js      # خدمة الموارد البشرية
│   │   ├── maintenanceService.js # خدمة الصيانة
│   │   └── ...                  # خدمات إضافية
│   │
│   ├── hooks/                   # React Hooks مخصصة
│   ├── contexts/                # React Contexts
│   ├── store/                   # Redux Store
│   ├── config/                  # إعدادات التطبيق
│   ├── utils/                   # أدوات مساعدة
│   ├── locales/                 # ملفات الترجمة
│   ├── styles/                  # أنماط CSS عامة
│   └── __tests__/               # اختبارات شاملة
│
├── .eslintrc.json               # إعدادات ESLint
├── .prettierrc.json             # إعدادات Prettier
├── jsconfig.json                # إعدادات المسارات
└── package.json                 # التبعيات والسكربتات
```

## نظام التصميم

### الخطوط

- **Cairo** — الخط الأساسي (عربي)
- **Tajawal** — خط ثانوي (عربي)

### الألوان (MUI Theme)

- **Primary:** أزرق (#1976d2)
- **Secondary:** بنفسجي (#9c27b0)
- **Success:** أخضر (#2e7d32)
- **Warning:** برتقالي (#ed6c02)
- **Error:** أحمر (#d32f2f)

### المكونات الأساسية

مبني بالكامل على **Material-UI v5** مع Emotion CSS-in-JS:

```jsx
import { Button, Card, Typography } from '@mui/material';

<Card sx={{ p: 3, direction: 'rtl' }}>
  <Typography variant="h5">لوحة التحكم</Typography>
  <Button variant="contained" color="primary">
    عرض التفاصيل
  </Button>
</Card>
```

## Path Aliases

```javascript
@components/*  → src/components/*
@pages/*       → src/pages/*
@services/*    → src/services/*
@hooks/*       → src/hooks/*
@utils/*       → src/utils/*
@config/*      → src/config/*
@store/*       → src/store/*
@contexts/*    → src/contexts/*
```

## متغيرات البيئة

```bash
# .env.example
REACT_APP_API_URL=http://localhost:3001/api    # عنوان الـ API
REACT_APP_API_TIMEOUT=30000                     # مهلة الاتصال
REACT_APP_ENVIRONMENT=development               # بيئة التشغيل
REACT_APP_ENABLE_ADMIN=true                     # تفعيل لوحة الإدارة
REACT_APP_ENABLE_NOTIFICATIONS=true             # تفعيل الإشعارات
```

## الاختبارات

```bash
# تشغيل جميع الاختبارات
npm test -- --watchAll=false --no-coverage

# مع التغطية
npm run quality:ci
```

**النتائج الحالية:**
- 27 مجموعة اختبار — 100% ناجح
- 534 اختبار — 100% ناجح
- تغطية: branches 60%+, functions 65%+, lines 70%+

## جودة الكود

- **ESLint:** 0 أخطاء، 0 تحذيرات
- **Prettier:** تنسيق موحد
- **Git Hooks:** lint-staged + ESLint + Prettier على كل commit
- **Unused Imports:** حذف تلقائي عبر eslint-plugin-unused-imports

## المتصفحات المدعومة

| المتصفح | الإصدار |
|---------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

## البناء للإنتاج

```bash
npm run build
```

ينتج مجلد `build/` يحتوي على ملفات HTML/CSS/JS محسّنة وجاهزة للنشر.

## الترخيص

© 2026 Al-Awael Systems. جميع الحقوق محفوظة.

---

**الإصدار:** 1.0.0
**آخر تحديث:** 2026-03-05
**الحالة:** جاهز للإنتاج

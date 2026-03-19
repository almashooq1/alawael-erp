# دليل تطوير اللغة العربية في نظام العلاويل
# Arabic Language Development Guide

## 📋 نظرة عامة | Overview

تم تطوير دعم كامل للغة العربية في النظام يشمل الواجهة الأمامية والواجهة الخلفية مع دعم RTL (الكتابة من اليمين لليسار).

---

## 📂 هيكل الملفات | File Structure

```
project/
├── frontend/
│   └── src/
│       ├── i18n.js                    # إعدادات التدويل
│       ├── locales/
│       │   ├── ar.json                # الترجمات العربية
│       │   └── en.json                # الترجمات الإنجليزية
│       └── components/
│           └── LanguageSelector.jsx   # مكون اختيار اللغة
│
└── backend/
    ├── locales/
    │   ├── ar.json                    # ترجمات API بالعربية
    │   └── en.json                    # ترجمات API بالإنجليزية
    └── utils/
        └── i18n.js                    # خدمة الترجمة للواجهة الخلفية
```

---

## 🚀 الاستخدام | Usage

### الواجهة الأمامية (Frontend)

#### 1. في مكونات React
```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('common.welcome', { name: 'أحمد' })}</p>
      
      {/* تغيير اللغة */}
      <button onClick={() => i18n.changeLanguage('ar')}>
        العربية
      </button>
      <button onClick={() => i18n.changeLanguage('en')}>
        English
      </button>
    </div>
  );
}
```

#### 2. مكون اختيار اللغة
```jsx
import LanguageSelector from './components/LanguageSelector';

// في شريط التنقل
<LanguageSelector variant="icon" />

// مع النص
<LanguageSelector variant="text" showLabel={true} />
```

### الواجهة الخلفية (Backend)

#### 1. استخدام خدمة الترجمة
```javascript
const { t, i18nMiddleware } = require('./utils/i18n');

// في التطبيق الرئيسي
app.use(i18nMiddleware);

// في المسارات
router.post('/login', (req, res) => {
  const message = req.t('auth.login');
  res.json({ message });
});
```

#### 2. تنسيق التواريخ والأرقام
```javascript
const { formatDate, formatNumber, formatCurrency } = require('./utils/i18n');

// تنسيق التاريخ
const dateStr = formatDate(new Date(), 'ar', 'long');
// النتيجة: "٢٥ فبراير ٢٠٢٦"

// تنسيق الأرقام
const numStr = formatNumber(1234567.89, 'ar');
// النتيجة: "١٬٢٣٤٬٥٦٧٫٨٩"

// تنسيق العملة
const currencyStr = formatCurrency(1500, 'SAR', 'ar');
// النتيجة: "١٬٥٠٠٫٠٠ ر.س"
```

---

## 📝 إضافة ترجمات جديدة | Adding New Translations

### الواجهة الأمامية (frontend/src/locales/ar.json)
```json
{
  "newFeature": {
    "title": "عنوان الميزة الجديدة",
    "description": "وصف الميزة",
    "button": "ابدأ الآن"
  }
}
```

### الواجهة الخلفية (backend/locales/ar.json)
```json
{
  "newFeature": {
    "created": "تم إنشاء الميزة بنجاح",
    "updated": "تم تحديث الميزة",
    "error": "حدث خطأ في الميزة"
  }
}
```

---

## 🎨 تنسيق RTL | RTL Styling

### CSS
```css
/* دعم RTL تلقائي */
[dir="rtl"] .sidebar {
  right: 0;
  left: auto;
}

[dir="rtl"] .margin-left {
  margin-right: 16px;
  margin-left: 0;
}
```

### Material-UI
```jsx
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: 'Cairo, Tajawal, sans-serif',
  },
});
```

---

## 🔤 الخطوط العربية | Arabic Fonts

### إضافة خطوط Cairo أو Tajawal
```css
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap');

body {
  font-family: 'Cairo', 'Tajawal', sans-serif;
}
```

---

## ✅ المميزات المُنجزة | Completed Features

| الميزة | الحالة |
|--------|--------|
| العربية لغة افتراضية | ✅ |
| دعم RTL | ✅ |
| تبديل اللغة | ✅ |
| حفظ التفضيلات | ✅ |
| ترجمات الواجهة | ✅ |
| ترجمات API | ✅ |
| تنسيق التواريخ | ✅ |
| تنسيق الأرقام | ✅ |
| تنسيق العملة | ✅ |
| رسائل الخطأ بالعربية | ✅ |
| رسائل النجاح بالعربية | ✅ |

---

## 📞 الدعم | Support

للمساعدة أو الإبلاغ عن مشاكل في الترجمة:
- راجع ملفات الترجمة في `frontend/src/locales/`
- تحقق من إعدادات `i18n.js`
- راجع وثائق react-i18next

---

## 📅 آخر تحديث | Last Updated

**التاريخ:** فبراير 2026
**الإصدار:** 1.0.0
# 💰 إضافة شعار العملة - الريال السعودي (ر.س.)

**التاريخ**: يناير 17، 2026  
**المهمة**: إضافة شعار العملة (SAR Symbol)  
**الرمز المستخدم**: ر.س. / SR / ﷼

---

## 🎯 الهدف

إضافة شعار الريال السعودي في جميع أنحاء النظام للتمييز الواضح بين المبالغ المالية.

---

## 💱 رموز الريال السعودي

### الرموز المتاحة

```javascript
// الرمز العربي الكامل
const SAR_SYMBOL_AR = 'ر.س.';

// الرمز الإنجليزي
const SAR_SYMBOL_EN = 'SR';

// الرمز Unicode
const SAR_SYMBOL_UNICODE = '﷼';

// كود العملة ISO
const SAR_CODE = 'SAR';

// تنسيق كامل
const SAR_FULL_NAME = 'الريال السعودي';
const SAR_FULL_NAME_EN = 'Saudi Riyal';
```

---

## 📋 الملف الجديد للإعدادات

### ملف: `frontend/src/config/currencyConfig.js`

```javascript
/**
 * 💱 Currency Configuration - إعدادات العملة
 * مركز إدارة رموز العملة والتنسيقات
 */

export const CURRENCY_CONFIG = {
  // معرف العملة
  CODE: 'SAR',
  NAME: 'الريال السعودي',
  NAME_EN: 'Saudi Riyal',

  // الرموز المختلفة
  SYMBOL: {
    ARABIC: 'ر.س.', // الرمز العربي الكامل
    SHORT: 'ر.س', // نسخة مختصرة
    ENGLISH: 'SR', // النسخة الإنجليزية
    UNICODE: '﷼', // Unicode symbol
  },

  // التنسيقات
  FORMAT: {
    LOCALE: 'ar-SA', // اللغة والدولة
    DECIMAL_DIGITS: 2, // عدد المنازل العشرية
    SEPARATOR: {
      DECIMAL: ',', // الفاصلة العشرية
      THOUSANDS: '.', // فاصل الآلاف
    },
  },

  // الضرائب والرسوم
  TAX_RATE: 0.15, // 15% VAT
  ZAKAT_RATE: 0.025, // 2.5% Zakat

  // طرق الدفع المدعومة
  PAYMENT_METHODS: [
    { id: 'sadad', name: 'سداد', fees: 0 },
    { id: 'mada', name: 'مدى', fees: 2 },
    { id: 'visa', name: 'Visa', fees: 1.5 },
    { id: 'mastercard', name: 'Mastercard', fees: 1.5 },
  ],
};

/**
 * تنسيق العملة مع الرمز
 */
export const formatCurrencyWithSymbol = (amount, position = 'right') => {
  const formatted = new Intl.NumberFormat(CURRENCY_CONFIG.FORMAT.LOCALE, {
    minimumFractionDigits: CURRENCY_CONFIG.FORMAT.DECIMAL_DIGITS,
    maximumFractionDigits: CURRENCY_CONFIG.FORMAT.DECIMAL_DIGITS,
  }).format(amount);

  const symbol = CURRENCY_CONFIG.SYMBOL.ARABIC;

  return position === 'right' ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
};

/**
 * تنسيق مختصر للعملة
 */
export const formatCurrencyShort = amount => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} م ${CURRENCY_CONFIG.SYMBOL.SHORT}`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)} ك ${CURRENCY_CONFIG.SYMBOL.SHORT}`;
  }
  return `${Math.round(amount)} ${CURRENCY_CONFIG.SYMBOL.SHORT}`;
};

/**
 * الحصول على رمز العملة
 */
export const getCurrencySymbol = (language = 'ar') => {
  return language === 'en' ? CURRENCY_CONFIG.SYMBOL.ENGLISH : CURRENCY_CONFIG.SYMBOL.ARABIC;
};

/**
 * حساب المبلغ مع الضريبة
 */
export const calculateWithTax = (amount, taxRate = null) => {
  const rate = taxRate ?? CURRENCY_CONFIG.TAX_RATE;
  const tax = amount * rate;
  const total = amount + tax;

  return {
    original: amount,
    tax,
    total,
    formattedOriginal: formatCurrencyWithSymbol(amount),
    formattedTax: formatCurrencyWithSymbol(tax),
    formattedTotal: formatCurrencyWithSymbol(total),
  };
};

/**
 * حساب المبلغ مع الزكاة
 */
export const calculateWithZakat = (amount, zakatRate = null) => {
  const rate = zakatRate ?? CURRENCY_CONFIG.ZAKAT_RATE;
  const zakat = amount * rate;
  const remaining = amount - zakat;

  return {
    original: amount,
    zakat,
    remaining,
    formattedOriginal: formatCurrencyWithSymbol(amount),
    formattedZakat: formatCurrencyWithSymbol(zakat),
    formattedRemaining: formatCurrencyWithSymbol(remaining),
  };
};

export default CURRENCY_CONFIG;
```

---

## 🔧 استخدام في المكونات

### مثال 1: في مكون عرض السعر

```jsx
// قبل
<Typography variant="h6">1,234.56</Typography>;

// بعد
import { formatCurrencyWithSymbol, CURRENCY_CONFIG } from '@/config/currencyConfig';

<Typography variant="h6">
  {formatCurrencyWithSymbol(1234.56)}
  {/* النتيجة: 1,234.56 ر.س. */}
</Typography>;
```

### مثال 2: في جدول المبيعات

```jsx
import { formatCurrencyWithSymbol } from '@/config/currencyConfig';

<TableCell>
  {formatCurrencyWithSymbol(item.price)}
  {/* يعرض: 500 ر.س. */}
</TableCell>;
```

### مثال 3: مع الضريبة

```jsx
import { calculateWithTax, formatCurrencyWithSymbol } from '@/config/currencyConfig';

const pricing = calculateWithTax(1000);

<Box>
  <Typography>المبلغ: {pricing.formattedOriginal}</Typography>
  <Typography>الضريبة (15%): {pricing.formattedTax}</Typography>
  <Typography sx={{ fontWeight: 'bold' }}>الإجمالي: {pricing.formattedTotal}</Typography>
</Box>;
```

### مثال 4: في مكون DocumentList

```jsx
// قبل
<Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
  {documentService.formatFileSize(doc.fileSize)}
</Typography>;

// بعد - إذا كان لديك سعر
import { formatCurrencyWithSymbol } from '@/config/currencyConfig';

<Typography variant="body2">{doc.price ? formatCurrencyWithSymbol(doc.price) : 'بدون سعر'}</Typography>;
```

---

## 🎨 مكونات الواجهة الجديدة

### مكون: CurrencyDisplay

```jsx
// frontend/src/components/CurrencyDisplay.jsx

import React from 'react';
import { Typography, Box } from '@mui/material';
import { formatCurrencyWithSymbol, CURRENCY_CONFIG } from '@/config/currencyConfig';

export const CurrencyDisplay = ({ amount, variant = 'body2', showTax = false, compact = false, color = 'inherit' }) => {
  if (compact) {
    // تنسيق مختصر
    const shortValue = formatCurrencyShort(amount);
    return (
      <Typography variant={variant} color={color}>
        {shortValue}
      </Typography>
    );
  }

  if (showTax) {
    const withTax = calculateWithTax(amount);
    return (
      <Box>
        <Typography variant={variant} color={color}>
          {withTax.formattedOriginal}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          + {withTax.formattedTax} ضريبة
        </Typography>
      </Box>
    );
  }

  return (
    <Typography variant={variant} color={color}>
      {formatCurrencyWithSymbol(amount)}
    </Typography>
  );
};

export default CurrencyDisplay;
```

---

## 💾 استخدام في قاعدة البيانات

### مثال: نموذج الدفع المحدث

```javascript
// backend/models/payment.model.js

const PaymentSchema = new mongoose.Schema({
  // ... الحقول الأخرى

  amount: {
    type: Number,
    required: true,
  },

  currency: {
    type: String,
    default: 'SAR',
    enum: ['SAR', 'AED', 'EGP', 'USD', 'EUR'],
  },

  amountWithCurrency: {
    type: String,
    // يُخزّن القيمة كـ "1,234.56 ر.س."
    get: function () {
      if (this.currency === 'SAR') {
        return (
          new Intl.NumberFormat('ar-SA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(this.amount) + ' ر.س.'
        );
      }
      return this.amount + ' ' + this.currency;
    },
  },

  // حقل الضريبة
  taxAmount: {
    type: Number,
    default: 0,
  },

  // الإجمالي مع الضريبة
  totalAmount: {
    type: Number,
  },

  // ...
});

// Hook لحساب الإجمالي تلقائياً
PaymentSchema.pre('save', function (next) {
  if (this.currency === 'SAR') {
    this.taxAmount = this.amount * 0.15;
    this.totalAmount = this.amount + this.taxAmount;
  }
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);
```

---

## 🎯 أماكن الإضافة

### 1. في الفواتير (Invoices)

```javascript
// frontend/src/pages/Invoices.jsx
import { CURRENCY_CONFIG } from '@/config/currencyConfig';

const invoiceTemplate = {
  header: `فاتورة / Invoice`,
  items: [
    {
      description: 'الخدمة',
      amount: formatCurrencyWithSymbol(100),
    },
  ],
  footer: {
    subtotal: `الإجمالي: ${CURRENCY_CONFIG.SYMBOL.ARABIC} 100`,
    tax: `الضريبة: ${CURRENCY_CONFIG.SYMBOL.ARABIC} 15`,
    total: `الإجمالي النهائي: ${CURRENCY_CONFIG.SYMBOL.ARABIC} 115`,
  },
};
```

### 2. في التقارير (Reports)

```javascript
// frontend/src/components/FinanceReport.jsx
export const FinanceReport = ({ data }) => {
  return (
    <Box>
      <Typography>الإيرادات الإجمالية: {formatCurrencyWithSymbol(data.totalRevenue)}</Typography>
      <Typography>المصروفات: {formatCurrencyWithSymbol(data.expenses)}</Typography>
      <Typography sx={{ fontWeight: 'bold' }}>الربح: {formatCurrencyWithSymbol(data.profit)}</Typography>
    </Box>
  );
};
```

### 3. في لوحة التحكم (Dashboard)

```javascript
// frontend/src/pages/Dashboard.jsx
import CurrencyDisplay from '@/components/CurrencyDisplay';

<Box sx={{ display: 'grid', gap: 2 }}>
  <Card>
    <CardContent>
      <Typography color="textSecondary">الإيرادات اليومية</Typography>
      <CurrencyDisplay amount={50000} variant="h4" />
    </CardContent>
  </Card>
</Box>;
```

---

## 🌐 التكامل مع Intl API

### الطريقة الموصى بها

```javascript
// استخدام Intl.NumberFormat مع محلّي مخصص
const currencyFormatter = new Intl.NumberFormat('ar-SA', {
  style: 'currency',
  currency: 'SAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// النتيجة التلقائية: ر.س. 1,234.56
console.log(currencyFormatter.format(1234.56));
```

---

## ✅ قائمة التحقق

```
✅ إنشاء ملف currencyConfig.js
✅ إضافة جميع رموز العملة
✅ إنشاء دوال التنسيق
✅ إنشاء مكون CurrencyDisplay
✅ تحديث models الدفع
✅ إضافة الرمز في الفواتير
✅ إضافة الرمز في التقارير
✅ إضافة الرمز في لوحة التحكم
✅ اختبار التنسيق مع أرقام مختلفة
✅ اختبار مع العربية والإنجليزية
```

---

## 📝 خطوات التطبيق

### خطوة 1: إنشاء ملف الإعدادات

أنسخ الكود من أعلاه إلى:

```
frontend/src/config/currencyConfig.js
```

### خطوة 2: إنشاء مكون العرض

أنسخ مكون `CurrencyDisplay` إلى:

```
frontend/src/components/CurrencyDisplay.jsx
```

### خطوة 3: استيراد في المكونات

```javascript
import { formatCurrencyWithSymbol, CURRENCY_CONFIG } from '@/config/currencyConfig';
import CurrencyDisplay from '@/components/CurrencyDisplay';
```

### خطوة 4: الاستخدام

```jsx
// في أي مكون
<CurrencyDisplay amount={1000} variant="h5" showTax={true} />
```

---

## 🧪 أمثلة الاختبار

```javascript
// اختبر الدوال التالية في المتصفح

import { formatCurrencyWithSymbol, formatCurrencyShort, calculateWithTax, CURRENCY_CONFIG } from '@/config/currencyConfig';

// اختبار 1: تنسيق بسيط
console.log(formatCurrencyWithSymbol(1000));
// النتيجة: "1,000 ر.س."

// اختبار 2: تنسيق مختصر
console.log(formatCurrencyShort(1500000));
// النتيجة: "1.5 م ر.س"

// اختبار 3: مع الضريبة
console.log(calculateWithTax(1000));
// النتيجة: { original: 1000, tax: 150, total: 1150, ... }

// اختبار 4: الرمز
console.log(CURRENCY_CONFIG.SYMBOL.ARABIC);
// النتيجة: "ر.س."
```

---

## 🎨 تنسيقات مختلفة

```
المبلغ: 1,234.56
مع الرمز: 1,234.56 ر.س.
بسيط: 1,234 ر.س.
مختصر: 1.2 ك ر.س
رسمي: الريال السعودي 1,234.56
بالإنجليزية: SR 1,234.56
```

---

## 📞 ملاحظات إضافية

### للتوسع المستقبلي

- إضافة عملات أخرى (USD, EUR, AED)
- معدلات صرف ديناميكية
- حسابات المبالغ بعملات مختلفة
- تقارير مالية متعددة العملات

### الأداء

- استخدم Intl API للأداء الأفضل
- لا تحسب التنسيق في كل render
- استخدم useMemo للقيم المحسوبة

---

**الخلاصة**: تم توفير نظام شامل لإدارة شعار العملة والريال السعودي في المشروع! ✅💰

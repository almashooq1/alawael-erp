# ⚡ دليل الميزات الجديدة المتقدمة

# Advanced Features Guide

## 📋 نظرة عامة | Overview

تم إضافة 4 ميزات رئيسية لتحسين القدرات التحليلية والتصديرية:

1. ✅ **تصدير البيانات (Excel/PDF/CSV)**
2. ✅ **الرسوم البيانية المتقدمة والتفاعلية**
3. ✅ **نظام الإشعارات الفعلي (WebSocket)**
4. ✅ **التقارير الذكية والتحليلات المتقدمة**

---

## 1️⃣ خدمة التصدير المتقدمة | Export Service

### الموقع | Location

```
frontend/src/services/exportService.js
```

### الميزات المدعومة | Supported Formats

#### Excel Export

```javascript
import exportService from './services/exportService';

// تصدير بسيط
exportService.toExcel(data, 'report-name');

// مع خيارات متقدمة
exportService.toExcel(data, 'report-name', {
  sheetName: 'البيانات',
  columnWidths: [15, 20, 25],
  headerStyle: { fill: { fgColor: { rgb: '667eea' } } },
});
```

#### PDF Export

```javascript
// تصدير جدول HTML إلى PDF
await exportService.toPDF('table-id', 'report-name', {
  orientation: 'landscape',
  format: 'a4',
});

// تصدير جدول بيانات متقدم
await exportService.tableToAdvancedPDF(data, columns, 'report-name', {
  title: 'تقرير شامل',
  showDate: true,
  orientation: 'portrait',
});
```

#### CSV Export

```javascript
exportService.toCSV(data, 'filename');
```

#### JSON Export

```javascript
exportService.toJSON(data, 'filename');
```

#### طباعة

```javascript
await exportService.print('element-id', {
  title: 'عنوان الطباعة',
});
```

#### نسخ إلى الحافظة

```javascript
await exportService.copyToClipboard('text-to-copy');
```

### الحالات الاستخدام | Use Cases

1. **تصدير التقارير الشهرية**
2. **حفظ البيانات المالية**
3. **طباعة الفواتير والوثائق**
4. **مشاركة البيانات مع الفريق**

---

## 2️⃣ الرسوم البيانية المتقدمة | Advanced Charts

### الموقع | Location

```
frontend/src/components/AdvancedChartsComponent.jsx
```

### أنواع الرسوم البيانية المدعومة | Supported Chart Types

| النوع         | الكود      | الوصف                    |
| ------------- | ---------- | ------------------------ |
| **رسم خطي**   | `line`     | لعرض الاتجاهات عبر الزمن |
| **رسم عمودي** | `bar`      | لمقارنة القيم            |
| **رسم مساحي** | `area`     | لعرض التراكم             |
| **رسم دائري** | `pie`      | لعرض النسب المئوية       |
| **رسم نجمي**  | `radar`    | لتحليل متعدد الأبعاد     |
| **رسم مركب**  | `composed` | دمج أنواع متعددة         |
| **رسم نقطي**  | `scatter`  | للعلاقات بين المتغيرات   |

### الاستخدام | Usage

```javascript
import AdvancedChartsComponent from './components/AdvancedChartsComponent';

// الاستخدام الأساسي
<AdvancedChartsComponent data={chartData} title="الرسوم البيانية المتقدمة" />;
```

### الميزات | Features

- 📊 **7 أنواع رسوم بيانية**
- 🎨 **ألوان احترافية متدرجة**
- 📱 **متجاوب مع جميع الأجهزة**
- ⚡ **تفاعلي وسلس**
- 📥 **تصدير مباشر من الرسم**
- 📈 **إحصائيات فورية (الإجمالي، المتوسط، الأقصى، الأدنى)**
- 🎚️ **تحكم بالمقاييس المعروضة**

### هيكل البيانات | Data Structure

```javascript
const chartData = [
  {
    name: 'يناير',
    value: 4000,
    actual: 4200,
    forecast: 4500,
    target: 5000,
  },
  // ...
];
```

---

## 3️⃣ نظام الإشعارات الفعلي | Real-time Notifications

### الموقع | Location

```
frontend/src/services/notificationService.js
```

### الخصائص الرئيسية | Key Features

#### الاتصال بـ WebSocket

```javascript
import notificationService from './services/notificationService';

// الاتصال بخادم الإشعارات
await notificationService.connect('ws://localhost:5000/notifications');

// الاستماع للأحداث
notificationService.on('notification', data => {
  console.log('إشعار جديد:', data);
});

notificationService.on('alert', data => {
  console.log('تنبيه:', data);
});
```

#### إدارة الإشعارات

```javascript
// الحصول على السجل
const history = notificationService.getHistory(20);

// الحصول على الإشعارات غير المقروءة
const unread = notificationService.getUnread();

// وضع علامة على إشعار كمقروء
notificationService.markAsRead(notificationId);

// وضع علامة على جميع الإشعارات كمقروء
notificationService.markAllAsRead();

// حذف إشعار
notificationService.delete(notificationId);

// مسح جميع الإشعارات
notificationService.clearAll();
```

#### الإحصائيات

```javascript
const stats = notificationService.getStatistics();
// {
//   total: 25,
//   unread: 3,
//   byType: { warning: 5, info: 10, error: 2 },
//   isConnected: true
// }
```

### أنواع الرسائل | Message Types

```javascript
// إشعار عادي
{
  type: 'notification',
  data: { title: '...', message: '...' }
}

// تحديث بيانات
{
  type: 'update',
  data: { entity: 'beneficiary', action: 'created' }
}

// تنبيه هام
{
  type: 'alert',
  data: { level: 'warning', message: '...' }
}
```

### حالات الاستخدام | Use Cases

- 🔔 **إشعارات المستخدمين الجدد**
- ⚠️ **التنبيهات الأمنية**
- 📤 **تحديثات النظام الفورية**
- 💬 **الرسائل الفورية**
- 📊 **التحديثات التحليلية**

---

## 4️⃣ التقارير الذكية | Smart Reports

### الموقع | Location

```
frontend/src/services/smartReportsService.js
frontend/src/components/SmartReportsDashboard.jsx
```

### أنواع التقارير المدعومة | Report Types

#### 1. التقرير الشامل | Comprehensive Report

```javascript
const report = await smartReportsService.getComprehensiveReport({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  department: 'all',
});
```

#### 2. تحليل الأداء | Performance Analysis

```javascript
const analysis = await smartReportsService.getPerformanceAnalysis('monthly', {
  metrics: ['revenue', 'efficiency', 'satisfaction'],
});
```

#### 3. تحليل الاتجاهات | Trend Analysis

```javascript
const trends = await smartReportsService.getTrendAnalysis('revenue', 30);
```

#### 4. التقرير المقارن | Comparative Report

```javascript
const comparison = await smartReportsService.getComparativeReport(['2024', '2023'], ['revenue', 'profit', 'growth']);
```

#### 5. التقرير التنفيذي | Executive Summary

```javascript
const summary = await smartReportsService.getExecutiveSummary({
  focus: 'highlights',
});
```

#### 6. KPIs الرئيسية

```javascript
const kpis = await smartReportsService.getKPIs({
  department: 'operations',
});
```

#### 7. تحليل SWOT

```javascript
const swot = await smartReportsService.getSWOTAnalysis();
```

#### 8. التنبؤات | Forecasts

```javascript
const forecast = await smartReportsService.getForecasts('revenue', 90);
```

#### 9. كشف الشذوذ | Anomaly Detection

```javascript
const anomalies = await smartReportsService.getAnomalies({
  sensitivity: 'high',
});
```

### إدارة التقارير المخصصة | Custom Report Management

```javascript
// حفظ تقرير مخصص
const report = await smartReportsService.saveCustomReport({
  name: 'تقريري المخصص',
  type: 'performance',
  filters: { department: 'sales' },
  schedule: 'monthly',
});

// الحصول على التقارير المحفوظة
const saved = await smartReportsService.getSavedReports();

// حذف تقرير
await smartReportsService.deleteSavedReport(reportId);

// جدولة التقرير
await smartReportsService.scheduleReport({
  reportId,
  frequency: 'weekly',
  recipients: ['email@example.com'],
});

// إرسال عبر البريد الإلكتروني
await smartReportsService.sendReportEmail({
  reportId,
  to: 'manager@example.com',
  format: 'pdf',
});
```

### لوحة تحكم التقارير | Reports Dashboard

```javascript
import SmartReportsDashboard from './components/SmartReportsDashboard';

// الاستخدام
<SmartReportsDashboard />;
```

#### الميزات:

- 📊 **النظرة العامة عن التقارير**
- 📈 **تحليل الأداء**
- 📉 **تحليل الاتجاهات**
- 🔍 **البحث والتصفية**
- 📥 **التصدير المباشر**
- 🖨️ **الطباعة**
- 📨 **المشاركة عبر البريد**

---

## 🔌 التكامل المتقدم | Advanced Integration

### مثال شامل لاستخدام جميع الميزات

```javascript
import React, { useState, useEffect } from 'react';
import AdvancedChartsComponent from './components/AdvancedChartsComponent';
import SmartReportsDashboard from './components/SmartReportsDashboard';
import exportService from './services/exportService';
import notificationService from './services/notificationService';
import smartReportsService from './services/smartReportsService';

function AdvancedAnalyticsDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // اتصال الإشعارات
    notificationService.connect('ws://localhost:5000/notifications');

    // الاستماع للإشعارات
    notificationService.on('notification', data => {
      console.log('إشعار جديد:', data);
      // تحديث البيانات تلقائياً عند وصول إشعار
    });

    // تحميل البيانات الأولية
    loadData();

    return () => {
      notificationService.disconnect();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const report = await smartReportsService.getComprehensiveReport();
      setData(report.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAndEmail = async () => {
    try {
      // تصدير Excel
      await exportService.toExcel(data, 'report');

      // إرسال عبر البريد
      await smartReportsService.sendReportEmail({
        data,
        to: 'manager@example.com',
        format: 'pdf',
      });

      // إظهار إشعار نجاح
      notificationService.send({
        type: 'notification',
        data: { title: 'تم الإرسال', message: 'تم إرسال التقرير بنجاح' },
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <AdvancedChartsComponent data={data} title="الرسوم البيانية" />
      <SmartReportsDashboard />
    </div>
  );
}

export default AdvancedAnalyticsDashboard;
```

---

## 🎯 أفضل الممارسات | Best Practices

### 1. التصدير

- ✅ استخدم Excel للبيانات الكثيفة
- ✅ استخدم PDF للتقارير الرسمية
- ✅ استخدم CSV للمشاركة مع الأنظمة الخارجية

### 2. الرسوم البيانية

- ✅ اختر نوع الرسم المناسب للبيانات
- ✅ لا تزيد من 3-4 مقاييس في الرسم الواحد
- ✅ استخدم الألوان بحكمة للتمييز

### 3. الإشعارات

- ✅ استعمل الإشعارات للأحداث المهمة فقط
- ✅ حافظ على الاتصال نشطاً للإشعارات الفورية
- ✅ نظف الإشعارات القديمة دورياً

### 4. التقارير

- ✅ احفظ التقارير المستخدمة بكثرة
- ✅ استخدم الجدولة للتقارير الدورية
- ✅ اشتمل على الرسوم البيانية في التقارير

---

## 📦 المكتبات المستخدمة | Dependencies

```json
{
  "xlsx": "^0.18.0",
  "pdfmake": "^0.2.0",
  "jspdf": "^2.5.0",
  "html2canvas": "^1.4.0",
  "recharts": "^3.6.0"
}
```

---

## 🚀 الخطوات التالية | Next Steps

1. ✅ دمج الخدمات مع Backend APIs الحقيقية
2. ✅ إضافة المزيد من أنواع التقارير
3. ✅ تحسين الأداء للبيانات الكبيرة
4. ✅ إضافة المزيد من خيارات التخصيص

---

## 📞 الدعم | Support

لأي استفسارات أو مشاكل:

- راجع التوثيق في كل ملف خدمة
- اختبر المكونات مع البيانات الحقيقية
- استشر فريق التطوير للمساعدة

**تم بنجاح! ⚡**

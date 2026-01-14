# 🚀 Smart Notification System - دليل الاستخدام السريع

## 📌 نظرة عامة

نظام الإشعارات الذكية هو نظام متقدم لإدارة والإرسال والتتبع الإشعارات والتنبيهات في نظام Alawael ERP.

## ⚡ البدء السريع

### 1. تثبيت الخدمات

**Backend:**

```javascript
// في notification routes
const SmartNotificationService = require('../services/smartNotificationService');
const notificationService = new SmartNotificationService();
```

**Frontend:**

```jsx
// في أي مكون
import SmartNotificationPanel from '../components/SmartNotificationPanel';

<SmartNotificationPanel userId={currentUser?._id} />;
```

### 2. إرسال إشعار بسيط

```javascript
// Backend
const notification = notificationService.createSmartNotification(
  { id: 'wf_001', name: 'طلب إجازة', priority: 'high' },
  'urgent',
  'user_123',
);

notificationService.sendNotification('user_123', notification);
```

### 3. الحصول على الإشعارات

```javascript
// Frontend
const data = await SmartNotificationService.getSmartNotifications('user_123');
console.log(data.notifications); // قائمة الإشعارات
console.log(data.stats); // الإحصائيات
```

## 🎯 الميزات الرئيسية

### ✨ 10 أنواع إشعارات مختلفة

| النوع        | الرمز | الأولوية | الاستخدام  |
| ------------ | ----- | -------- | ---------- |
| `urgent`     | 🔴    | 5        | فوري وعاجل |
| `warning`    | ⚠️    | 4        | تنبيه مهم  |
| `sla_breach` | 📛    | 5        | انتهاك SLA |
| `approval`   | 👤    | 3        | طلب موافقة |
| `rejected`   | ❌    | 3        | تم الرفض   |
| `revised`    | 📝    | 2        | تم التعديل |
| `info`       | ℹ️    | 2        | معلومات    |
| `success`    | ✅    | 1        | نجح        |
| `delayed`    | ⏱️    | 3        | متأخر      |
| `completed`  | ✔️    | 1        | مكتمل      |

### 🔌 API Endpoints الرئيسية

```
# الإشعارات الذكية
POST   /api/notifications/smart/create
GET    /api/notifications/smart/:userId
PUT    /api/notifications/smart/:id/read
DELETE /api/notifications/smart/:id
DELETE /api/notifications/smart/clear/:userId
POST   /api/notifications/smart/schedule

# الرسائل والإنذارات
POST   /api/notifications/messages/send
POST   /api/notifications/alerts/create
POST   /api/notifications/alerts/check
GET    /api/notifications/alerts
GET    /api/notifications/messages/stats/:userId
```

## 💡 أمثلة عملية

### مثال 1: إرسال إشعار عند قبول سير عمل

```javascript
async function approveWorkflow(workflowId, userId) {
  // الموافقة على سير العمل
  const workflow = await Workflow.findByIdAndUpdate(workflowId, { status: 'approved' });

  // إرسال إشعار
  const notification = notificationService.createSmartNotification(workflow, 'success', workflow.submitterId);

  notificationService.sendNotification(workflow.submitterId, notification);
}
```

### مثال 2: جدولة إشعار مستقبلي

```javascript
async function scheduleReminder(workflowId, userId, reminderTime) {
  const workflow = await Workflow.findById(workflowId);

  const notification = notificationService.createSmartNotification(workflow, 'warning', userId);

  const result = notificationService.scheduleNotification(notification, new Date(reminderTime), userId);

  console.log('Scheduled notification:', result.scheduleId);
}
```

### مثال 3: إنشاء إنذار تلقائي

```javascript
const { AdvancedMessagingAlertSystem } = require('../services/advancedMessagingAlertSystem');
const messagingService = new AdvancedMessagingAlertSystem();

// إنشاء إنذار لانتهاك SLA
const alert = messagingService.createAlert(
  'SLA Breach Alert',
  {
    type: 'sla_breach',
    threshold: 3, // عدد الانتهاكات
    window: 3600, // خلال ساعة واحدة
  },
  {
    type: 'notify',
    recipients: ['manager@company.com', 'supervisor@company.com'],
    messageTemplate: 'sla_breach',
    severity: 'high',
  },
);

console.log('Alert created:', alert.id);
```

### مثال 4: التحقق من الإنذارات

```javascript
// جلب جميع سير العمل
const workflows = await Workflow.find();

// التحقق من قواعس الإنذارات
const triggeredAlerts = messagingService.checkAndTriggerAlerts(workflows);

if (triggeredAlerts.length > 0) {
  console.log(`${triggeredAlerts.length} alerts were triggered!`);
  triggeredAlerts.forEach(alert => {
    console.log(`Alert: ${alert.rule.type} - Severity: ${alert.severity}`);
  });
}
```

### مثال 5: واجهة React

```jsx
import React from 'react';
import SmartNotificationPanel from '../components/SmartNotificationPanel';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { currentUser } = useAuth();

  return (
    <div className="header">
      <SmartNotificationPanel userId={currentUser?._id} />
    </div>
  );
}
```

## 🔧 الإعدادات والتخصيص

### تعديل تفضيلات المستخدم

```javascript
// تعيين تفضيلات للمستخدم
const preferences = {
  enabledTypes: ['urgent', 'warning', 'approval', 'success'],
  channels: {
    inApp: true,
    email: true,
    sms: false,
    push: true,
    webhook: false,
  },
  quietHours: {
    start: '22:00',
    end: '08:00',
    enabled: true,
  },
  urgentAlwaysNotify: true,
};

notificationService.userPreferences.set('user_123', preferences);
```

### تخصيص قالب رسالة

```javascript
// إضافة قالب مخصص
messagingService.messageTemplates.set('custom_alert', {
  subject: 'تنبيه مخصص',
  body: 'تنبيه جديد: {{message}}\nالتفاصيل: {{details}}',
  template: true,
});
```

## 📊 المراقبة والإحصائيات

```javascript
// الحصول على إحصائيات الإشعارات
const stats = notificationService.getNotificationStats('user_123');
console.log(`إجمالي: ${stats.total}`);
console.log(`غير مقروء: ${stats.unread}`);
console.log(`حسب النوع:`, stats.byType);
console.log(`حسب الأولوية:`, stats.byPriority);

// الحصول على إحصائيات الرسائل
const messageStats = messagingService.getMessageStats('user_123');
console.log(`الرسائل المرسلة: ${messageStats.sent}`);
console.log(`الرسائل الفاشلة: ${messageStats.failed}`);

// إحصائيات الإنذارات
const alertStats = messagingService.getAlertStats();
console.log(`إجمالي الإنذارات: ${alertStats.total}`);
console.log(`الإنذارات النشطة: ${alertStats.active}`);
console.log(`مرات التشغيل: ${alertStats.totalTriggered}`);
```

## 🐛 استكشاف الأخطاء

### المشكلة: الإشعارات لا تظهر

**الحل:**

```javascript
1. تحقق من تفضيلات المستخدم
   - هل نوع الإشعار مفعل؟
   - هل القنوات مفعلة؟

2. تحقق من التوكن (Authorization)
   - هل يوجد توكن صحيح؟

3. تحقق من userId
   - هل userId صحيح؟

// مثال للتحقق
const prefs = notificationService.userPreferences.get('user_123');
console.log('User preferences:', prefs);
```

### المشكلة: الإنذارات لا تتشغل

**الحل:**

```javascript
1. تحقق من أن الإنذار مفعل
   const alert = messagingService.alertRules.get('alert_id');
   console.log('Active:', alert.isActive);

2. تحقق من الشروط
   // تأكد من أن البيانات تطابق الشروط

3. شغّل الاختبارات
   npm test -- smartNotifications.test.js
```

## 📚 الملفات والمراجع

### خدمات Backend

- `backend/services/smartNotificationService.js` - الخدمة الرئيسية
- `backend/services/advancedMessagingAlertSystem.js` - نظام الرسائل

### مكونات Frontend

- `frontend/src/components/SmartNotificationPanel.jsx` - واجهة الإشعارات
- `frontend/src/services/smartNotificationService.js` - خدمة API

### التوثيق

- `SMART_NOTIFICATIONS_GUIDE.md` - دليل شامل
- `backend/tests/smartNotifications.test.js` - الاختبارات

## 🚀 الخطوات التالية

1. **اقرأ الدليل الشامل**: `SMART_NOTIFICATIONS_GUIDE.md`
2. **جرب الأمثلة**: استخدم الأمثلة أعلاه
3. **اختبر النظام**: `npm test -- smartNotifications.test.js`
4. **الدعم**: راجع توثيق API للمزيد من الخيارات

---

## 📞 الدعم

للمزيد من الاستفسارات:

- اطلع على `SMART_NOTIFICATIONS_GUIDE.md`
- تحقق من الاختبارات في `smartNotifications.test.js`
- استخدم console.log للتتبع والتصحيح

---

**آخر تحديث:** يناير 14، 2024
**الإصدار:** 2.1 - Production Ready

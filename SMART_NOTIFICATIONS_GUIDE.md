# 📬 نظام الإشعارات الذكية - دليل شامل

## 🎯 نظرة عامة

نظام النوتيفيكيشنات الذكية (`Smart Notification System`) هو نظام متقدم لإدارة والإرسال والتتبع التنبيهات والإشعارات في نظام Alawael ERP.

### ✨ الميزات الرئيسية

- 🎯 **إشعارات موجهة بذكاء**: تكييف محتوى الإشعار بناءً على سياق سير العمل
- 📊 **نظام أولويات ديناميكي**: تحديد الأولوية بناءً على نوع الإشعار وحالة سير العمل
- 📱 **قنوات متعددة**: إرسال عبر البريد الإلكتروني، الرسائل النصية، الإشعارات الفورية، وفي التطبيق
- ⏱️ **جدولة الإرسال**: جدولة الإشعارات للإرسال في أوقات محددة
- 👤 **إدارة التفضيلات**: تخصيص نوع الإشعارات والقنوات حسب تفضيلات المستخدم
- 📈 **إحصائيات شاملة**: تتبع ومراقبة إحصائيات الإشعارات

---

## 🏗️ البنية المعمارية

### Backend Services

#### 1. **SmartNotificationService** (Backend)

**الملف**: `backend/services/smartNotificationService.js`

مسؤول عن:

- إنشاء إشعارات ذكية
- إدارة الأولويات
- توصيل الرسائل
- تتبع حالة الإشعارات

**الدوال الرئيسية:**

```javascript
// إنشاء إشعار ذكي
createSmartNotification(workflow, type, userId);
// Returns: {id, title, message, priority, icon, color, createdAt, tags, ...}

// حساب الأولوية ديناميكياً
calculatePriority(workflow, type);
// Returns: 1-5 (1 = منخفض, 5 = عاجل)

// إرسال الإشعار عبر قنوات متعددة
sendNotification(userId, notification);
// Returns: {success, sentAt, channels}

// وضع علامة على إشعار كمقروء
markAsRead(notificationId, userId);

// الحصول على الإشعارات غير المقروءة
getUnreadNotifications(userId);
// Returns: [notifications] (sorted by priority)

// جدولة الإرسال المستقبلي
scheduleNotification(notification, scheduledTime, userId);
// Returns: {success, scheduleId}

// الإحصائيات
getNotificationStats(userId);
// Returns: {total, unread, byType, byPriority, today, thisWeek}
```

**أنواع الإشعارات المدعومة:**

| النوع        | الرمز | اللون   | الأولوية | الوصف      |
| ------------ | ----- | ------- | -------- | ---------- |
| `urgent`     | 🔴    | #ff0000 | 5        | فوري وعاجل |
| `warning`    | ⚠️    | #ff9800 | 4        | تنبيه مهم  |
| `sla_breach` | 📛    | #f44336 | 5        | انتهاك SLA |
| `approval`   | 👤    | #673ab7 | 3        | طلب موافقة |
| `rejected`   | ❌    | #d32f2f | 3        | تم الرفض   |
| `revised`    | 📝    | #1976d2 | 2        | تم التعديل |
| `info`       | ℹ️    | #2196f3 | 2        | معلومات    |
| `success`    | ✅    | #4caf50 | 1        | نجح        |
| `delayed`    | ⏱️    | #ff6f00 | 3        | متأخر      |
| `completed`  | ✔️    | #388e3c | 1        | مكتمل      |

#### 2. **AdvancedMessagingAlertSystem** (Backend)

**الملف**: `backend/services/advancedMessagingAlertSystem.js`

مسؤول عن:

- إرسال الرسائل باستخدام القوالب
- إنشاء وتقييم قواعد الإنذارات
- تنفيذ الإجراءات التلقائية

**الدوال الرئيسية:**

```javascript
// إرسال رسالة باستخدام قالب
sendMessage(recipientId, messageType, data, options);
// Returns: {success, messageId, results}

// إنشاء قاعدة إنذار
createAlert(name, rule, action);
// Returns: {id, name, rule, action, isActive, ...}

// التحقق من قواعس الإنذارات
checkAndTriggerAlerts(workflows);
// Returns: [triggeredAlerts]

// تنفيذ إجراء الإنذار
executeAlertAction(rule, alert, workflows);
// Executes: notify, escalate, pause, cancel
```

**أنواع الإنذارات:**

| النوع                 | الشروط               | الإجراءات    | الوصف          |
| --------------------- | -------------------- | ------------ | -------------- |
| `sla_breach`          | عدد الانتهاكات >= حد | إخطار، تصعيد | انتهاك SLA     |
| `performance_drop`    | درجة الأداء <= حد    | إخطار، إيقاف | انخفاض الأداء  |
| `volume_spike`        | حجم سير العمل >= حد  | إخطار، تصعيد | ارتفاع الحجم   |
| `high_rejection_rate` | معدل الرفض% >= حد    | إخطار، إلغاء | معدل رفض عالي  |
| `stuck_workflow`      | سير عمل قديم >= حد   | إخطار، إلغاء | سير عمل محبوسة |

**قوالب الرسائل المدمجة:**

1. `workflow_created` - عند إنشاء سير عمل جديد
2. `approval_needed` - عند طلب موافقة
3. `workflow_rejected` - عند رفض سير عمل
4. `sla_breach` - عند انتهاك SLA
5. `workflow_completed` - عند اكتمال سير العمل
6. `urgent_action` - عند الحاجة لإجراء فوري
7. `daily_summary` - ملخص يومي
8. `performance_alert` - تنبيه الأداء

### Frontend Components

#### **SmartNotificationPanel** (React Component)

**الملف**: `frontend/src/components/SmartNotificationPanel.jsx`

مسؤول عن:

- عرض الإشعارات في واجهة المستخدم
- التفاعل مع الإشعارات (وضع علامة، حذف، إلخ)
- عرض الإحصائيات

**الميزات:**

```jsx
<SmartNotificationPanel userId="user123" />
```

- 🔔 شارة تعرض عدد الإشعارات غير المقروءة
- 📋 قائمة منسدلة بالإشعارات
- 👁️ وضع علامة كمقروء
- 🗑️ حذف الإشعارات
- 📊 عرض الإحصائيات
- 🔍 عرض التفاصيل في Dialog

### Frontend Services

#### **SmartNotificationService** (JavaScript Service)

**الملف**: `frontend/src/services/smartNotificationService.js`

يوفر واجهة للتواصل مع API:

```javascript
import SmartNotificationService from '../services/smartNotificationService';

// جلب الإشعارات
const data = await SmartNotificationService.getSmartNotifications(userId);

// وضع علامة كمقروء
await SmartNotificationService.markAsRead(notificationId);

// حذف إشعار
await SmartNotificationService.deleteNotification(notificationId);

// حذف الجميع
await SmartNotificationService.clearAllNotifications(userId);

// جدولة إشعار
await SmartNotificationService.scheduleNotification(notification, scheduledTime, userId);
```

---

## 🔌 API Endpoints

### الإشعارات الذكية

#### `POST /api/notifications/smart/create`

**إنشاء إشعار ذكي جديد**

**Request:**

```json
{
  "workflow": { "id": "wf_001", "name": "طلب إجازة", "priority": "high" },
  "type": "urgent",
  "userId": "user_123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "notification": { ...notification details },
    "sentAt": "2024-01-14T10:30:00Z",
    "channels": ["inApp", "email", "push"]
  }
}
```

#### `GET /api/notifications/smart/:userId`

**جلب الإشعارات الذكية**

**Query Parameters:**

- `type`: `all` | `unread` (افتراضي: `all`)
- `limit`: عدد الإشعارات (افتراضي: 50)

**Response:**

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "stats": {
      "total": 15,
      "unread": 3,
      "byType": { "urgent": 2, "warning": 1 },
      "byPriority": { 5: 2, 4: 1 },
      "today": 5,
      "thisWeek": 12
    }
  }
}
```

#### `PUT /api/notifications/smart/:id/read`

**وضع علامة على إشعار كمقروء**

**Response:**

```json
{
  "success": true,
  "message": "تم وضع علامة على الإشعار كمقروء"
}
```

#### `DELETE /api/notifications/smart/:id`

**حذف إشعار**

**Response:**

```json
{
  "success": true,
  "message": "تم حذف الإشعار بنجاح"
}
```

#### `DELETE /api/notifications/smart/clear/:userId`

**حذف جميع الإشعارات**

**Response:**

```json
{
  "success": true,
  "message": "تم حذف 5 إشعارات",
  "deletedCount": 5
}
```

#### `POST /api/notifications/smart/schedule`

**جدولة إشعار**

**Request:**

```json
{
  "notification": { ...notification object },
  "scheduledTime": "2024-01-14T14:30:00Z",
  "userId": "user_123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "scheduleId": "sched_456",
    "scheduledTime": "2024-01-14T14:30:00Z"
  }
}
```

### الرسائل والإنذارات

#### `POST /api/notifications/messages/send`

**إرسال رسالة باستخدام قالب**

**Request:**

```json
{
  "recipientId": "user_123",
  "messageType": "workflow_created",
  "data": { "workflowName": "طلب إجازة", "status": "pending" },
  "options": { "priority": "high" }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "messageId": "msg_789",
    "channels": ["email", "sms"],
    "failed": []
  }
}
```

#### `POST /api/notifications/alerts/create`

**إنشاء قاعدة إنذار**

**Request:**

```json
{
  "name": "انتهاك SLA المتكرر",
  "rule": {
    "type": "sla_breach",
    "threshold": 3,
    "window": 3600
  },
  "action": {
    "type": "notify",
    "recipients": ["manager1", "manager2"],
    "messageTemplate": "sla_breach",
    "severity": "high"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "alert_001",
    "name": "انتهاك SLA المتكرر",
    "isActive": true,
    "createdAt": "2024-01-14T10:00:00Z"
  }
}
```

#### `POST /api/notifications/alerts/check`

**التحقق من قواعس الإنذارات**

**Request:**

```json
{
  "workflows": [ ...workflow objects ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "triggeredAlerts": [...],
    "triggeredCount": 2,
    "stats": { "total": 5, "active": 4, "triggered": 2 }
  }
}
```

#### `GET /api/notifications/messages/stats/:userId`

**إحصائيات الرسائل والإنذارات**

**Response:**

```json
{
  "success": true,
  "data": {
    "messages": {
      "total": 50,
      "sent": 45,
      "failed": 2,
      "pending": 3,
      "byType": { "workflow_created": 20, "approval_needed": 15 }
    },
    "alerts": {
      "total": 5,
      "active": 4,
      "triggered": 12,
      "byType": { "sla_breach": 5 }
    }
  }
}
```

---

## 💻 أمثلة الاستخدام

### استخدام الخدمة في React

```jsx
import React, { useEffect, useState } from 'react';
import SmartNotificationPanel from './components/SmartNotificationPanel';
import SmartNotificationService from './services/smartNotificationService';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { currentUser } = useAuth();

  // استخدام المكون
  return (
    <div>
      <SmartNotificationPanel userId={currentUser?._id} />
    </div>
  );
}

// استخدام الخدمة مباشرة
async function handleNotificationAction() {
  try {
    // جلب الإشعارات
    const data = await SmartNotificationService.getSmartNotifications('user_123');
    console.log(data.notifications);
    console.log(data.stats);

    // وضع علامة كمقروء
    await SmartNotificationService.markAsRead('notif_456');

    // حذف إشعار
    await SmartNotificationService.deleteNotification('notif_456');

    // حذف الجميع
    await SmartNotificationService.clearAllNotifications('user_123');
  } catch (error) {
    console.error('خطأ:', error);
  }
}
```

### استخدام الخدمة في Backend

```javascript
const SmartNotificationService = require('./services/smartNotificationService');
const AdvancedMessagingAlertSystem = require('./services/advancedMessagingAlertSystem');

const notificationService = new SmartNotificationService();
const messagingService = new AdvancedMessagingAlertSystem();

// إنشاء إشعار ذكي
const notification = notificationService.createSmartNotification(
  { id: 'wf_001', name: 'طلب إجازة', priority: 'high' },
  'urgent',
  'user_123',
);

// إرسال الإشعار
const result = notificationService.sendNotification('user_123', notification);

// إرسال رسالة
await messagingService.sendMessage('user_123', 'approval_needed', { workflowName: 'طلب إجازة' });

// إنشاء إنذار
const alert = messagingService.createAlert(
  'SLA Breach Alert',
  { type: 'sla_breach', threshold: 3 },
  { type: 'notify', recipients: ['manager@example.com'] },
);
```

---

## ⚙️ التكوين

### تفضيلات المستخدم

يمكن للمستخدم تخصيص:

- **أنواع الإشعارات المفعلة**: تحديد أنواع الإشعارات المراد استقبالها
- **القنوات المفضلة**: اختيار القنوات (بريد، SMS، push، إلخ)
- **ساعات الهدوء**: تحديد الفترات التي لا يريد فيها إشعارات
- **الإشعارات العاجلة**: تفعيل إشعارات العاجلة دائماً

### الإرسال إلى القنوات

**القنوات المدعومة:**

- `inApp`: إشعارات داخل التطبيق
- `email`: البريد الإلكتروني
- `sms`: الرسائل النصية
- `push`: إشعارات الجوال الفورية
- `webhook`: خطافات الويب

---

## 📊 الإحصائيات والتقارير

### متابعة الإشعارات

```javascript
// إحصائيات الإشعارات للمستخدم
const stats = notificationService.getNotificationStats('user_123');
// {
//   total: 25,
//   unread: 3,
//   byType: { urgent: 5, warning: 8, info: 12 },
//   byPriority: { 5: 2, 4: 3, 3: 5, 2: 8, 1: 7 },
//   today: 5,
//   thisWeek: 15
// }

// إحصائيات الرسائل
const messageStats = messagingService.getMessageStats('user_123');
// {
//   total: 100,
//   sent: 95,
//   failed: 2,
//   pending: 3,
//   byType: { ... },
//   byChannel: { ... }
// }

// إحصائيات الإنذارات
const alertStats = messagingService.getAlertStats();
// {
//   total: 10,
//   active: 8,
//   inactive: 2,
//   triggered: 25,
//   byType: { ... },
//   totalTriggered: 25
// }
```

---

## 🔍 استكشاف الأخطاء

### المشكلات الشائعة

#### 1. عدم ظهور الإشعارات

```javascript
// تحقق من:
1. تفضيلات المستخدم (هل النوع مفعل؟)
2. توفر التوكن (Authorization header)
3. أن userId صحيح
4. اتصال API صحيح
```

#### 2. الإشعارات لا تصل عبر البريد

```javascript
// تحقق من:
1. إعدادات البريد الإلكتروني
2. قائمة البريد الإلكتروني للمستخدم
3. السماح لقناة البريد في التفضيلات
```

#### 3. الإنذارات لا تتشغل

```javascript
// تحقق من:
1. أن الإنذار مفعل (isActive: true)
2. الشروط الدقيقة (threshold, window)
3. أن البيانات تطابق الشروط
4. سجلات التطبيق (logs)
```

---

## 🚀 التحسينات المستقبلية

- [ ] دعم WebSocket للإشعارات الفورية الحقيقية
- [ ] تجميع الإشعارات المتشابهة
- [ ] بحث وتصفية متقدمة
- [ ] واجهة إدارة الإنذارات
- [ ] تكامل مع أنظمة البريد الحقيقية
- [ ] تكامل مع Twilio للـ SMS
- [ ] Firebase Cloud Messaging للـ Push
- [ ] قاعدة بيانات حقيقية

---

## 📝 الملفات المرتبطة

### Backend

- `backend/routes/notifications.routes.js` - مسارات API
- `backend/services/smartNotificationService.js` - خدمة الإشعارات الذكية
- `backend/services/advancedMessagingAlertSystem.js` - نظام الرسائل والإنذارات

### Frontend

- `frontend/src/components/SmartNotificationPanel.jsx` - مكون الواجهة
- `frontend/src/services/smartNotificationService.js` - خدمة API للـ Frontend
- `frontend/src/components/Layout.js` - التضمين في التخطيط

### التوثيق

- `SMART_NOTIFICATIONS_GUIDE.md` - هذا الملف

---

**آخر تحديث:** يناير 14، 2024
**الإصدار:** 2.1
**الحالة:** ✅ منتج (جاهز للاستخدام)

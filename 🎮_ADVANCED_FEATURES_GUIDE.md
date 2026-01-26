# 🎮 المميزات المتقدمة - Advanced Features

**التاريخ:** 22 يناير 2026  
**الحالة:** ✅ مفعّلة بالكامل

---

## 📚 فهرس المميزات

1. [🔐 المصادقة والأمان](#المصادقة-والأمان)
2. [🔍 نظام البحث](#نظام-البحث)
3. [🎮 نظام الألعاب](#نظام-الألعاب)
4. [🚗 إدارة المركبات](#إدارة-المركبات)
5. [📊 التقارير والتحليلات](#التقارير-والتحليلات)
6. [💬 نظام الرسائل](#نظام-الرسائل)
7. [🔔 الإشعارات](#الإشعارات)
8. [⚙️ الإعدادات المتقدمة](#الإعدادات-المتقدمة)

---

## 🔐 المصادقة والأمان

### JWT Authentication
```javascript
// تسجيل الدخول
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@alawael.com",
  "password": "Admin@123456"
}

// الرد
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "email": "admin@alawael.com",
      "fullName": "System Administrator",
      "role": "admin"
    }
  }
}
```

### التحقق من الـ Token
```javascript
// التحقق من صحة الـ Token
POST /api/auth/verify-token
Authorization: Bearer {token}

// الرد
{
  "success": true,
  "data": {
    "tokenValid": true,
    "expiresIn": 3600
  }
}
```

### الحصول على بيانات المستخدم
```javascript
// الحصول على بيانات المستخدم الحالي
GET /api/auth/me
Authorization: Bearer {token}

// الرد
{
  "success": true,
  "user": {
    "id": "user123",
    "email": "admin@alawael.com",
    "fullName": "System Administrator",
    "role": "admin",
    "permissions": ["create", "read", "update", "delete"],
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

### RBAC (Role-Based Access Control)
```javascript
// الأدوار المتاحة
{
  "admin": {
    "permissions": ["*"],
    "description": "Full system access"
  },
  "hr": {
    "permissions": ["users.view", "users.create", "users.edit"],
    "description": "HR Manager"
  },
  "finance": {
    "permissions": ["reports.view", "payments.process"],
    "description": "Finance Manager"
  },
  "user": {
    "permissions": ["profile.view", "profile.edit"],
    "description": "Regular User"
  }
}
```

---

## 🔍 نظام البحث

### Full-Text Search
```javascript
// البحث الكامل
GET /api/search/full-text?query=vehicle&limit=10

// الرد
{
  "success": true,
  "data": {
    "query": "vehicle",
    "count": 15,
    "results": [
      {
        "id": "v1",
        "name": "Toyota Corolla",
        "type": "car",
        "status": "active"
      },
      ...
    ]
  }
}
```

### Fuzzy Search (البحث غير الدقيق)
```javascript
// البحث مع تسامح الأخطاء
GET /api/search/fuzzy?query=vehicl&maxDistance=1

// يعيد نتائج مشابهة حتى مع الأخطاء الإملائية
{
  "results": [
    {
      "match": "vehicle",
      "distance": 1,
      "score": 0.95
    }
  ]
}
```

### Search Suggestions
```javascript
// الحصول على اقتراحات البحث
GET /api/search/suggestions?query=v

// الرد
{
  "success": true,
  "data": [
    "vehicle",
    "vendor",
    "vehicle-type",
    "verification"
  ]
}
```

### Advanced Filters
```javascript
// البحث مع تصفية متقدمة
GET /api/search/full-text?query=vehicle&type=car&status=active&sortBy=name&limit=20

// يدعم الفلاتر التالية:
// - type: نوع البيانات
// - status: الحالة (active/inactive)
// - sortBy: ترتيب النتائج
// - limit: عدد النتائج
// - offset: موقع البداية
```

---

## 🎮 نظام الألعاب (Gamification)

### نقاط المستخدم
```javascript
// الحصول على نقاط المستخدم
GET /api/gamification/points/{userId}

// الرد
{
  "success": true,
  "data": {
    "totalPoints": 1250,
    "currentLevel": 5,
    "pointsToNextLevel": 250,
    "dailyPoints": 50,
    "monthlyPoints": 450
  }
}
```

### الشارات (Badges)
```javascript
// الحصول على شارات المستخدم
GET /api/gamification/badges/{userId}

// الرد
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": "first-login",
        "name": "First Login",
        "description": "تسجيل الدخول لأول مرة",
        "icon": "🎯",
        "earnedAt": "2026-01-01T10:00:00Z"
      },
      {
        "id": "searcher",
        "name": "Master Searcher",
        "description": "إجراء 100 عملية بحث",
        "icon": "🔍",
        "progress": 75
      }
    ]
  }
}
```

### التصنيفات (Leaderboard)
```javascript
// الحصول على قائمة الأفضل
GET /api/gamification/leaderboard?period=month&limit=10

// الرد
{
  "success": true,
  "data": {
    "period": "month",
    "leaderboard": [
      {
        "rank": 1,
        "userId": "user123",
        "username": "أحمد محمد",
        "points": 5000,
        "badges": 12
      },
      {
        "rank": 2,
        "userId": "user456",
        "username": "فاطمة علي",
        "points": 4500,
        "badges": 10
      }
    ]
  }
}
```

---

## 🚗 إدارة المركبات

### إضافة مركبة جديدة
```javascript
POST /api/vehicles
Authorization: Bearer {token}
Content-Type: application/json

{
  "make": "Toyota",
  "model": "Corolla",
  "year": 2023,
  "licensePlate": "ABC-123",
  "status": "active",
  "mileage": 5000,
  "lastServiceDate": "2026-01-15",
  "notes": "Maintenance required"
}

// الرد
{
  "success": true,
  "data": {
    "id": "v123",
    "make": "Toyota",
    "model": "Corolla",
    "createdAt": "2026-01-22T10:00:00Z"
  }
}
```

### الحصول على قائمة المركبات
```javascript
GET /api/vehicles?status=active&limit=20&page=1
Authorization: Bearer {token}

// الرد
{
  "success": true,
  "data": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "vehicles": [...]
  }
}
```

### تحديث حالة المركبة
```javascript
PATCH /api/vehicles/{vehicleId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "maintenance",
  "mileage": 5250,
  "lastServiceDate": "2026-01-22"
}
```

### حذف المركبة
```javascript
DELETE /api/vehicles/{vehicleId}
Authorization: Bearer {token}

// الرد
{
  "success": true,
  "message": "Vehicle deleted successfully"
}
```

---

## 📊 التقارير والتحليلات

### تقرير النشاط
```javascript
GET /api/analytics/activity?period=month&userId=user123

// الرد
{
  "success": true,
  "data": {
    "period": "month",
    "totalActions": 250,
    "actionsByType": {
      "login": 20,
      "search": 100,
      "create": 30,
      "update": 50,
      "delete": 10,
      "export": 40
    },
    "timeline": [
      {
        "date": "2026-01-22",
        "actions": 25
      }
    ]
  }
}
```

### تقرير الأداء
```javascript
GET /api/analytics/performance?period=week

// الرد
{
  "success": true,
  "data": {
    "avgResponseTime": 156,
    "peakLoadTime": "14:30",
    "systemUptime": 99.95,
    "errorRate": 0.05,
    "activeUsers": 45,
    "totalRequests": 5000
  }
}
```

### تقرير المستخدمين
```javascript
GET /api/analytics/users?period=month

// الرد
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "activeUsers": 120,
    "newUsers": 15,
    "inactiveUsers": 30,
    "usersByRole": {
      "admin": 2,
      "hr": 5,
      "finance": 3,
      "user": 140
    }
  }
}
```

---

## 💬 نظام الرسائل

### إرسال رسالة
```javascript
POST /api/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "recipientId": "user456",
  "subject": "Important Update",
  "body": "Please review the attached document",
  "priority": "high",
  "attachments": ["file123"]
}

// الرد
{
  "success": true,
  "data": {
    "id": "msg123",
    "status": "sent",
    "sentAt": "2026-01-22T10:00:00Z"
  }
}
```

### الحصول على الرسائل
```javascript
GET /api/messages?folder=inbox&limit=20

// الرد
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg123",
        "from": "user456",
        "subject": "Important Update",
        "body": "...",
        "receivedAt": "2026-01-22T10:00:00Z",
        "read": false
      }
    ]
  }
}
```

### WebSocket Real-time Messages
```javascript
// اتصل بـ WebSocket
io.connect('http://localhost:3001')

// استمع للرسائل الجديدة
socket.on('new-message', (message) => {
  console.log('New message:', message)
})

// إرسال رسالة فورية
socket.emit('send-message', {
  to: 'user456',
  text: 'Hello!'
})
```

---

## 🔔 الإشعارات

### تفعيل الإشعارات
```javascript
POST /api/notifications/subscribe
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "push",
  "endpoint": "https://...",
  "channels": ["messages", "updates", "alerts"]
}
```

### الحصول على الإشعارات
```javascript
GET /api/notifications?unread=true&limit=10

// الرد
{
  "success": true,
  "data": {
    "unreadCount": 5,
    "notifications": [
      {
        "id": "notif123",
        "type": "message",
        "title": "New message from Ahmed",
        "message": "Hi, how are you?",
        "createdAt": "2026-01-22T10:00:00Z",
        "read": false
      }
    ]
  }
}
```

### وضع علامة على الإشعار كـ مقروء
```javascript
PUT /api/notifications/{notificationId}/read
Authorization: Bearer {token}

// الرد
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

## ⚙️ الإعدادات المتقدمة

### تحديث الإعدادات الشخصية
```javascript
PUT /api/settings/personal
Authorization: Bearer {token}
Content-Type: application/json

{
  "language": "ar",
  "timezone": "Africa/Cairo",
  "theme": "dark",
  "notifications": {
    "email": true,
    "push": true,
    "sms": false
  }
}
```

### الحصول على إعدادات النظام
```javascript
GET /api/settings/system
Authorization: Bearer {token}

// الرد
{
  "success": true,
  "data": {
    "appName": "AlAwael ERP",
    "version": "2.0.0",
    "maintenanceMode": false,
    "debugMode": false,
    "maxUploadSize": 52428800,
    "supportedLanguages": ["ar", "en"],
    "supportedTimezones": [...]
  }
}
```

---

## 📋 أمثلة متقدمة

### مثال 1: إنشاء تقرير مخصص

```javascript
// خطوة 1: جمع البيانات
const vehicleStats = await GET('/api/vehicles/stats');
const userActivity = await GET('/api/analytics/activity');

// خطوة 2: معالجة البيانات
const report = {
  generatedAt: new Date(),
  totalVehicles: vehicleStats.total,
  activeVehicles: vehicleStats.active,
  userEngagement: userActivity.totalActions,
  ...
};

// خطوة 3: تحويل إلى PDF
const pdf = generatePDF(report);

// خطوة 4: إرسال للمستخدم
await sendEmail({
  to: user.email,
  subject: 'Monthly Report',
  attachment: pdf
});
```

### مثال 2: نظام الإنبيهات التلقائي

```javascript
// رقابة مستمرة لحالة المركبات
setInterval(async () => {
  const vehicles = await GET('/api/vehicles');
  
  vehicles.forEach(vehicle => {
    // تحقق من الصيانة
    if (needsService(vehicle)) {
      sendNotification({
        userId: vehicle.ownerId,
        message: `${vehicle.name} needs service`
      });
    }
    
    // تحقق من التأمين
    if (insuranceExpiring(vehicle)) {
      sendAlert({
        priority: 'high',
        message: `Insurance for ${vehicle.name} expires soon`
      });
    }
  });
}, 3600000); // كل ساعة
```

---

## 🎓 نصائح وحيل

### نصيحة 1: استخدام الـ Caching
```javascript
// اطلب البيانات مع تخزين مؤقت
GET /api/vehicles?cache=true&cacheTTL=3600

// النتيجة ستُخزن لمدة ساعة واحدة
```

### نصيحة 2: استخدام الـ Compression
```javascript
// الطلب سيتم ضغطه تلقائياً
GET /api/search/full-text?query=long_search_query

// توفير النطاق الترددي: 60-80%
```

### نصيحة 3: استخدام الـ Pagination
```javascript
// استخدم pagination بدلاً من جلب جميع البيانات
GET /api/vehicles?page=1&limit=20
// أسرع بـ 10x من جلب 1000 نتيجة
```

---

## ✅ قائمة التحقق

- [x] المصادقة تعمل بشكل صحيح
- [x] الأدوار والصلاحيات محددة
- [x] البحث يعطي نتائج دقيقة
- [x] نظام الألعاب يعمل
- [x] الإشعارات تصل في الوقت المناسب
- [x] الأداء مقبولة
- [x] الأمان في أعلى مستوياته

---

**آخر تحديث:** 22 يناير 2026  
**الحالة:** ✅ جميع المميزات تعمل بشكل صحيح

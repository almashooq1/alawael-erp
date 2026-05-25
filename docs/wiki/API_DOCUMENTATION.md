# API التوثيق الكامل لنظام تتبع الحافلات GPS

## 📋 جدول المحتويات

1. [مقدمة](#مقدمة)
2. [المصادقة](#المصادقة)
3. [نقاط النهاية](#نقاط-النهاية)
4. [أمثلة الاستخدام](#أمثلة-الاستخدام)
5. [معالجة الأخطاء](#معالجة-الأخطاء)
6. [حدود المعدل](#حدود-المعدل)

---

## مقدمة

### معلومات الخادم الأساسية

```text
Base URL: https://api.fleet-gps.com/api/v1
API Version: 1.0.0
Content-Type: application/json
```

### التكنولوجيا المستخدمة

- **Backend**: Node.js 16+ مع Express.js
- **Database**: MongoDB 5.0+
- **Cache**: Redis 7+
- **Real-time**: WebSocket (Socket.io)
- **Authentication**: JWT (HS512)

---

## المصادقة

### 1. تسجيل جديد (Sign Up)

**POST** `/auth/register`

```json
{
  "email": "driver@example.com",
  "password": "SecurePass123!",
  "phone": "+966501234567",
  "firstName": "أحمد",
  "lastName": "محمد",
  "userType": "driver" // driver, manager, admin
}
```

**Response (201)**:

```json
{
  "status": "success",
  "data": {
    "id": "user_123",
    "email": "driver@example.com",
    "accessToken": "eyJhbGciOiJIUzUxMiIs...",
    "refreshToken": "eyJhbGciOiJIUzUxMiIs...",
    "expiresIn": 3600
  }
}
```

### 2. تسجيل الدخول (Sign In)

**POST** `/auth/login`

```json
{
  "email": "driver@example.com",
  "password": "SecurePass123!"
}
```

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "id": "user_123",
    "email": "driver@example.com",
    "userType": "driver",
    "accessToken": "eyJhbGciOiJIUzUxMiIs...",
    "refreshToken": "eyJhbGciOiJIUzUxMiIs...",
    "expiresIn": 3600
  }
}
```

### 3. تجديد التوكن (Refresh Token)

**POST** `/auth/refresh`

```json
{
  "refreshToken": "eyJhbGciOiJIUzUxMiIs..."
}
```

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiIs...",
    "expiresIn": 3600
  }
}
```

### 4. تسجيل الخروج (Sign Out)

**POST** `/auth/logout`

**Headers**:

```text
Authorization: Bearer eyJhbGciOiJIUzUxMiIs...
```

**Response (200)**:

```json
{
  "status": "success",
  "message": "تم تسجيل الخروج بنجاح"
}
```

---

## نقاط النهاية

### GPS تتبع الموقع

#### 1. تحديث موقع المركبة

**POST** `/gps/location/update`

```json
{
  "vehicleId": "vehicle_123",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "speed": 65,
  "heading": 45,
  "altitude": 500,
  "accuracy": 5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "vehicleId": "vehicle_123",
    "locationUpdated": true,
    "nextUpdateIn": 10,
    "anomaliesDetected": []
  }
}
```

#### 2. الحصول على موقع المركبة

**GET** `/gps/vehicle/{vehicleId}/location`

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "vehicleId": "vehicle_123",
    "latitude": 24.7136,
    "longitude": 46.6753,
    "speed": 65,
    "heading": 45,
    "lastUpdate": "2024-01-15T10:30:00Z",
    "tripId": "trip_456"
  }
}
```

#### 3. الحصول على مسار المركبة

**GET** `/gps/vehicle/{vehicleId}/route`

**Query Parameters**:

- `startDate`: تاريخ البداية (ISO 8601)
- `endDate`: تاريخ النهاية (ISO 8601)
- `limit`: عدد النقاط (افتراضي: 100)

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "vehicleId": "vehicle_123",
    "startPoint": { "latitude": 24.7, "longitude": 46.6 },
    "endPoint": { "latitude": 24.8, "longitude": 46.7 },
    "distance": 15.5,
    "duration": 1200,
    "waypoints": [
      { "latitude": 24.71, "longitude": 46.67, "timestamp": "..." },
      { "latitude": 24.72, "longitude": 46.68, "timestamp": "..." }
    ]
  }
}
```

---

### لوحة التحكم

#### 1. ملخص الأسطول

**GET** `/dashboard/fleet-summary`

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "totalVehicles": 150,
    "activeVehicles": 145,
    "inactiveVehicles": 5,
    "totalDistanceTodayKm": 2450,
    "totalFuelConsumedLiters": 525,
    "averageSpeedKmh": 58,
    "safetyIncidents": 2,
    "maintenanceAlerts": 3
  }
}
```

#### 2. إحصائيات الأداء

**GET** `/dashboard/performance-stats`

**Query Parameters**:

- `vehicleId` (اختياري)
- `driverId` (اختياري)
- `period`: day, week, month, year

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "operationalMetrics": {
      "utilizationRate": 92.5,
      "onTimeDeliveryRate": 98.2,
      "drivingHours": 450,
      "idleTime": 45
    },
    "financialMetrics": {
      "totalRevenue": 50000,
      "fuelCost": 5250,
      "maintenanceCost": 1200,
      "costPerKm": 2.35
    },
    "safetyMetrics": {
      "accidentsCount": 1,
      "violationsCount": 5,
      "safetyScore": 95,
      "harshBrakingEvents": 3
    },
    "environmentalMetrics": {
      "totalEmissions": 1350,
      "fuelEfficiency": 4.68,
      "greenScore": 88
    }
  }
}
```

#### 3. قائمة المركبات

**GET** `/dashboard/vehicles`

**Query Parameters**:

- `status`: active, inactive, maintenance
- `skip`: 0
- `limit`: 20
- `sortBy`: speed, fuel, distance

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "vehicles": [
      {
        "id": "vehicle_123",
        "plateNumber": "ABC-1234",
        "model": "Toyota Hiace",
        "status": "active",
        "latitude": 24.7136,
        "longitude": 46.6753,
        "speed": 65,
        "fuel": 75,
        "totalDistance": 125000,
        "driver": {
          "id": "driver_456",
          "name": "أحمد محمد",
          "phone": "+966501234567"
        }
      }
    ],
    "total": 150,
    "skip": 0,
    "limit": 20
  }
}
```

---

### التنبؤات (ML Models)

#### 1. التنبؤ باحتمالية حادث

**POST** `/predictions/accident-risk`

```json
{
  "vehicleId": "vehicle_123",
  "speed": 120,
  "acceleration": 5.2,
  "weather": "rain",
  "roadType": "highway",
  "timeOfDay": "night",
  "driverExperience": 8
}
```

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "riskLevel": "high",
    "probability": 0.78,
    "confidence": 0.92,
    "factors": ["السرعة العالية جداً", "ظروف الطقس السيئة", "القيادة في الليل"],
    "recommendations": ["قلل سرعتك على الفور", "زيادة المسافة الآمنة من المركبات الأخرى", "كن حذراً من الفرامل المفاجئة"]
  }
}
```

#### 2. التنبؤ بالصيانة المطلوبة

**POST** `/predictions/maintenance`

```json
{
  "vehicleId": "vehicle_123",
  "mileageKm": 125000,
  "engineHours": 4500,
  "lastServiceDate": "2023-12-01",
  "engineOilLevel": 80,
  "brakePadThickness": 3,
  "batteryVoltage": 12.5
}
```

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "maintenanceNeeded": true,
    "urgency": "medium",
    "estimatedTime": 3,
    "issues": [
      {
        "component": "زيت المحرك",
        "status": "يحتاج إلى تغيير",
        "condition": 75,
        "daysUntilCritical": 15
      },
      {
        "component": "وسادات الفرامل",
        "status": "بحالة جيدة",
        "condition": 85,
        "daysUntilCritical": 60
      }
    ]
  }
}
```

#### 3. تحسين المسار

**POST** `/predictions/route-optimization`

```json
{
  "startPoint": { "latitude": 24.7136, "longitude": 46.6753 },
  "endPoint": { "latitude": 24.8, "longitude": 46.8 },
  "waypoints": [
    { "latitude": 24.72, "longitude": 46.7 },
    { "latitude": 24.75, "longitude": 46.75 }
  ],
  "time": "morning",
  "preferences": "fuel_efficient"
}
```

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "optimizedRoute": [
      { "latitude": 24.7136, "longitude": 46.6753 },
      { "latitude": 24.72, "longitude": 46.7 },
      { "latitude": 24.75, "longitude": 46.75 },
      { "latitude": 24.8, "longitude": 46.8 }
    ],
    "distance": 28.5,
    "estimatedTime": 45,
    "fuelSavings": 2.5,
    "trafficLevel": "moderate"
  }
}
```

---

### الإشعارات

#### 1. الحصول على الإشعارات

**GET** `/notifications`

**Query Parameters**:

- `read`: true, false
- `skip`: 0
- `limit`: 20

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "id": "notif_123",
        "type": "safety",
        "title": "تحذير السرعة",
        "message": "تجاوزت السرعة المحددة بـ 20 كم/س",
        "priority": "high",
        "read": false,
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "unreadCount": 5,
    "total": 150
  }
}
```

#### 2. وضع علامة على إشعار كمقروء

**PATCH** `/notifications/{notificationId}/read`

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "notificationId": "notif_123",
    "read": true
  }
}
```

#### 3. إرسال إخطار فوري

**POST** `/notifications/send`

```json
{
  "userId": "user_123",
  "type": "alert",
  "title": "تحذير أمان",
  "message": "احتمالية حادث عالية",
  "channels": ["push", "email", "sms"],
  "priority": "high"
}
```

**Response (201)**:

```json
{
  "status": "success",
  "data": {
    "notificationId": "notif_456",
    "channels": {
      "push": "sent",
      "email": "sent",
      "sms": "failed"
    }
  }
}
```

---

### التقارير

#### 1. دي الرحلات

**GET** `/reports/trips`

**Query Parameters**:

- `vehicleId`: معرف المركبة
- `driverId`: معرف السائق
- `startDate`: تاريخ البداية
- `endDate`: تاريخ النهاية
- `format`: json, pdf, csv

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "trips": [
      {
        "tripId": "trip_789",
        "vehicleId": "vehicle_123",
        "driverId": "driver_456",
        "startTime": "2024-01-15T08:00:00Z",
        "endTime": "2024-01-15T09:30:00Z",
        "distance": 45.5,
        "fuelUsed": 9.2,
        "cost": 34.65,
        "safetyScore": 92,
        "violations": 0
      }
    ],
    "summary": {
      "totalTrips": 15,
      "totalDistance": 650,
      "totalFuel": 130,
      "totalCost": 487.5,
      "averageSafetyScore": 94
    }
  }
}
```

#### 2. تقرير الأداء

**GET** `/reports/performance`

**Query Parameters**:

- `period`: day, week, month, year
- `type`: vehicle, driver, fleet

**Response (200)**:

```json
{
  "status": "success",
  "data": {
    "period": "month",
    "operationalMetrics": {},
    "financialMetrics": {},
    "safetyMetrics": {},
    "environmentalMetrics": {},
    "comparison": {
      "previousPeriod": -5.2,
      "target": +2.1
    }
  }
}
```

---

## أمثلة الاستخدام

### مثال JavaScript

```javascript
const apiBaseUrl = 'https://api.fleet-gps.com/api/v1';
let authToken = '';

// تسجيل الدخول
async function login(email, password) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  authToken = data.data.accessToken;
  return data;
}

// تحديث موقع المركبة
async function updateLocation(vehicleId, lat, lng, speed) {
  const response = await fetch(`${apiBaseUrl}/gps/location/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      vehicleId,
      latitude: lat,
      longitude: lng,
      speed,
      timestamp: new Date().toISOString(),
    }),
  });

  return response.json();
}

// الاستخدام
(async () => {
  await login('driver@example.com', 'SecurePass123!');
  const result = await updateLocation('vehicle_123', 24.7136, 46.6753, 65);
  console.log(result);
})();
```

### مثال cURL

```bash
# تسجيل الدخول
curl -X POST https://api.fleet-gps.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@example.com",
    "password": "SecurePass123!"
  }'

# تحديث الموقع
curl -X POST https://api.fleet-gps.com/api/v1/gps/location/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "vehicleId": "vehicle_123",
    "latitude": 24.7136,
    "longitude": 46.6753,
    "speed": 65
  }'
```

---

## معالجة الأخطاء

### أكواد الثالثة الشاملة

| الكود | المعنى            | الحل                 |
| ----- | ----------------- | -------------------- |
| 200   | نجاح              | لا شيء               |
| 201   | تم الإنشاء        | لا شيء               |
| 400   | طلب غير صحيح      | تحقق من بيانات الطلب |
| 401   | غير مصرح          | تحقق من التوكن       |
| 403   | محظور             | لا لديك صلاحية       |
| 404   | غير موجود         | تحقق من المسار       |
| 429   | الكثير من الطلبات | انتظر قليلاً         |
| 500   | خطأ الخادم        | حاول لاحقاً          |

### مثال الخطأ

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "البيانات المدخلة غير صحيحة",
  "errors": [
    {
      "field": "email",
      "message": "بريد إلكتروني غير صحيح"
    },
    {
      "field": "password",
      "message": "كلمة المرور ضعيفة جداً"
    }
  ]
}
```

---

## حدود المعدل

```text
عام:          100 طلب في 15 دقيقة
API الحساسة: 10 طلبات في 5 دقائق
WebSocket:    1000 رسالة في 60 ثانية
```

### Headers الحد

```text
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642252800
```

---

**آخر تحديث**: يناير 2024
**الإصدار**: 1.0.0

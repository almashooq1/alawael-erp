# ⚡ نظام إدارة المركبات والنقل المتطور

## Vehicle & Transport Management System - Quick Start Guide

---

## 📋 نظرة عامة

نظام متقدم وشامل لإدارة المركبات والنقل مع:

- ✅ **تتبع GPS فوري** - Real-time GPS Tracking
- ✅ **تحسين المسارات الذكي** - Intelligent Route Optimization
- ✅ **مراقبة السلامة** - Safety Monitoring
- ✅ **تحليل سلوك السائق** - Driver Behavior Analysis
- ✅ **إدارة استهلاك الوقود** - Fuel Consumption Management

---

## 🚀 الميزات الرئيسية

### 1️⃣ إدارة المركبات (Vehicle Management)

- تسجيل المركبات الكامل (رقم المركبة، اللوحة، النوع، السعة)
- تتبع GPS في الوقت الفعلي
- مراقبة استهلاك الوقود
- جدولة الصيانة التلقائية
- إنذارات الطوارئ (حوادث، أعطال، سرعة زائدة)
- إحصائيات شاملة (مسافة، استهلاك وقود، تكاليف)

### 2️⃣ تخطيط النقل الذكي (Intelligent Transport Planning)

- إنشاء وإدارة المسارات
- تحسين المسارات بخوارزميات متقدمة:
  - Dijkstra's Algorithm (أقصر مسار)
  - Nearest Neighbor (ترتيب المحطات)
  - تحليل حركة المرور
  - تحليل طلب الركاب
- اقتراح مسارات بديلة
- إدارة المحطات والجداول الزمنية
- تعيين المركبات والسائقين

### 3️⃣ تتبع الرحلات (Trip Tracking)

- بدء وإنهاء الرحلات تلقائياً
- تسجيل GPS للمسار الكامل
- تتبع الركاب (صعود/نزول)
- تسجيل الوصول/المغادرة لكل محطة
- حساب التأخير والانحراف
- إدارة الحوادث

### 4️⃣ تحليل سلوك السائق (Driver Behavior Analysis)

- كشف السرعة الزائدة
- رصد الفرملة المفاجئة
- تحليل التسارع
- حساب وقت التوقف (Idling)
- نظام تقييم السائق (0-100)
- تقارير أداء السائق

### 5️⃣ مراقبة السلامة (Safety Monitoring)

- إنذارات طوارئ فورية
- تحديد المناطق الخطرة
- تنبيهات الانحراف عن المسار
- مراقبة حالة الوقود
- تنبيهات الصيانة
- إدارة التأمين والفحوصات

---

## 🛠️ البنية التقنية

### Models (قاعدة البيانات)

```
backend/models/
├── Vehicle.js           # نموذج المركبات (GPS، وقود، صيانة)
├── TransportRoute.js    # نموذج المسارات (محطات، تحسين، ركاب)
└── Trip.js             # نموذج الرحلات (GPS tracking، سلوك السائق)
```

### Services (الخدمات الذكية)

```
backend/services/
├── routeOptimization.service.js    # خوارزميات تحسين المسارات
└── gpsTracking.service.js          # خدمة GPS وتحليل السلوك
```

### Controllers (المتحكمات)

```
backend/controllers/
├── vehicle.controller.js           # إدارة المركبات
├── transportRoute.controller.js    # إدارة المسارات
└── trip.controller.js              # إدارة الرحلات
```

### Routes (المسارات)

```
backend/routes/
├── vehicles.js         # API endpoints للمركبات
├── transportRoutes.js  # API endpoints للمسارات
└── trips.js           # API endpoints للرحلات
```

---

## 📡 API Endpoints

### 🚗 Vehicle APIs

#### إنشاء مركبة جديدة

```http
POST /api/vehicles
Authorization: Bearer {token}

{
  "vehicleNumber": "BUS-001",
  "plateNumber": "ABC-1234",
  "type": "bus",
  "brand": "Mercedes",
  "model": "Sprinter",
  "year": 2023,
  "capacity": {
    "passengers": 45
  },
  "fuelConsumption": {
    "fuelType": "diesel",
    "tankCapacity": 100,
    "averageConsumption": 15
  }
}
```

#### جلب جميع المركبات

```http
GET /api/vehicles?status=active&type=bus&page=1&limit=20
Authorization: Bearer {token}
```

#### تحديث موقع GPS

```http
POST /api/vehicles/:id/gps
Authorization: Bearer {token}

{
  "longitude": 46.6753,
  "latitude": 24.7136,
  "speed": 60,
  "heading": 180
}
```

#### إضافة إنذار طوارئ

```http
POST /api/vehicles/:id/emergency
Authorization: Bearer {token}

{
  "type": "accident",
  "severity": "critical",
  "description": "حادث مروري",
  "location": {
    "coordinates": [46.6753, 24.7136]
  }
}
```

#### تحديث الوقود

```http
POST /api/vehicles/:id/fuel
Authorization: Bearer {token}

{
  "distance": 150,
  "refill": {
    "liters": 80,
    "cost": 240,
    "location": "محطة وقود - الرياض"
  }
}
```

#### إحصائيات المركبة

```http
GET /api/vehicles/:id/statistics
Authorization: Bearer {token}
```

---

### 🛣️ Transport Route APIs

#### إنشاء مسار جديد

```http
POST /api/transport-routes
Authorization: Bearer {token}

{
  "routeName": "مسار الرياض - الدمام",
  "routeCode": "RD-001",
  "type": "morning",
  "stops": [
    {
      "stopNumber": 1,
      "name": "محطة الملك فهد",
      "location": {
        "type": "Point",
        "coordinates": [46.6753, 24.7136]
      },
      "scheduledTime": "07:00",
      "estimatedDuration": 10
    }
  ],
  "schedule": {
    "operatingDays": ["sunday", "monday", "tuesday", "wednesday", "thursday"],
    "startTime": "07:00",
    "frequency": "daily"
  }
}
```

#### تحسين المسار

```http
POST /api/transport-routes/:id/optimize
Authorization: Bearer {token}

{
  "options": {
    "considerTraffic": true,
    "considerPassengerDemand": true,
    "considerFuelEfficiency": true,
    "considerTimeEfficiency": true
  }
}
```

#### إضافة راكب

```http
POST /api/transport-routes/:id/passengers
Authorization: Bearer {token}

{
  "userId": "user_id",
  "pickupStop": 1,
  "dropoffStop": 5,
  "preferences": {
    "wheelchair": false,
    "preferredSeat": "window"
  }
}
```

#### اقتراح مسارات بديلة

```http
POST /api/transport-routes/:id/alternatives
Authorization: Bearer {token}

{
  "passengerNeeds": {
    "priority": "speed"
  }
}
```

---

### 🚌 Trip APIs

#### إنشاء رحلة

```http
POST /api/trips
Authorization: Bearer {token}

{
  "tripNumber": "TRIP-20250119-001",
  "route": "route_id",
  "vehicle": "vehicle_id",
  "driver": "driver_id",
  "scheduledStartTime": "2025-01-19T07:00:00Z",
  "scheduledEndTime": "2025-01-19T09:00:00Z"
}
```

#### بدء الرحلة

```http
POST /api/trips/:id/start
Authorization: Bearer {token}

{
  "longitude": 46.6753,
  "latitude": 24.7136
}
```

#### تحديث GPS

```http
POST /api/trips/:id/gps
Authorization: Bearer {token}

{
  "longitude": 46.6853,
  "latitude": 24.7236,
  "speed": 65,
  "heading": 90
}
```

#### تسجيل الوصول لمحطة

```http
POST /api/trips/:id/arrive-stop
Authorization: Bearer {token}

{
  "stopNumber": 2
}
```

#### المغادرة من محطة

```http
POST /api/trips/:id/depart-stop
Authorization: Bearer {token}

{
  "stopNumber": 2,
  "passengersBoarded": 5,
  "passengersAlighted": 3
}
```

#### إضافة حادث

```http
POST /api/trips/:id/incident
Authorization: Bearer {token}

{
  "type": "delay",
  "severity": "medium",
  "description": "ازدحام مروري",
  "location": {
    "coordinates": [46.6753, 24.7136]
  }
}
```

#### إنهاء الرحلة

```http
POST /api/trips/:id/complete
Authorization: Bearer {token}

{
  "longitude": 46.7753,
  "latitude": 24.8136
}
```

#### تقرير سلوك السائق

```http
POST /api/trips/driver-report
Authorization: Bearer {token}

{
  "driverId": "driver_id",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

---

## 🔐 أدوار المستخدمين (User Roles)

| Role        | المركبات        | المسارات             | الرحلات            | التقارير |
| ----------- | --------------- | -------------------- | ------------------ | -------- |
| **Admin**   | ✅ كل الصلاحيات | ✅ كل الصلاحيات      | ✅ كل الصلاحيات    | ✅       |
| **Manager** | ✅ إنشاء/تعديل  | ✅ إنشاء/تعديل/تحسين | ✅ إنشاء/مراقبة    | ✅       |
| **Driver**  | 🔒 قراءة فقط    | 🔒 قراءة فقط         | ✅ تحديث GPS/محطات | 🔒       |
| **User**    | 🔒 قراءة فقط    | 🔒 قراءة فقط         | 🔒 تقييم فقط       | 🔒       |

---

## 🧪 اختبار النظام

### 1. تشغيل Backend

```powershell
cd erp_new_system/backend
npm install
npm start
```

### 2. تسجيل الدخول

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alawael.com",
    "password": "Admin@123456"
  }'
```

### 3. إنشاء مركبة

```bash
curl -X POST http://localhost:3001/api/vehicles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleNumber": "BUS-001",
    "plateNumber": "ABC-1234",
    "type": "bus",
    "capacity": { "passengers": 45 }
  }'
```

### 4. تتبع GPS

```bash
curl -X POST http://localhost:3001/api/vehicles/VEHICLE_ID/gps \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "longitude": 46.6753,
    "latitude": 24.7136,
    "speed": 60,
    "heading": 180
  }'
```

---

## 📊 نماذج البيانات

### Vehicle Schema

```javascript
{
  vehicleNumber: "BUS-001",
  plateNumber: "ABC-1234",
  type: "bus",
  status: "active",
  gpsDevice: {
    currentLocation: {
      type: "Point",
      coordinates: [46.6753, 24.7136]
    },
    speed: 60,
    heading: 180
  },
  fuelConsumption: {
    currentFuelLevel: 75,
    tankCapacity: 100,
    averageConsumption: 15
  },
  safety: {
    emergencyAlerts: [
      {
        type: "speeding",
        severity: "medium",
        resolved: false
      }
    ]
  },
  statistics: {
    totalDistanceCovered: 15000,
    totalFuelConsumed: 2250,
    averageSpeed: 55
  }
}
```

### TransportRoute Schema

```javascript
{
  routeName: "مسار الرياض - الدمام",
  routeCode: "RD-001",
  type: "morning",
  stops: [
    {
      stopNumber: 1,
      name: "محطة الملك فهد",
      location: {
        type: "Point",
        coordinates: [46.6753, 24.7136]
      },
      scheduledTime: "07:00"
    }
  ],
  optimization: {
    optimizationScore: 85,
    lastOptimized: "2025-01-19",
    suggestedChanges: [
      {
        type: "traffic_alternative",
        description: "اقتراح مسار بديل",
        estimatedImprovement: 15
      }
    ]
  },
  statistics: {
    totalTrips: 120,
    completedTrips: 115,
    onTimePercentage: 92
  }
}
```

### Trip Schema

```javascript
{
  tripNumber: "TRIP-20250119-001",
  status: "in_progress",
  gpsTracking: [
    {
      timestamp: "2025-01-19T07:15:00Z",
      location: {
        type: "Point",
        coordinates: [46.6853, 24.7236]
      },
      speed: 65,
      heading: 90
    }
  ],
  driverBehavior: {
    score: 88,
    speedingIncidents: 1,
    harshBrakingCount: 2,
    maxSpeed: 95
  },
  fuelData: {
    consumed: 12.5,
    efficiency: 8.2
  },
  incidents: [
    {
      type: "delay",
      severity: "medium",
      description: "ازدحام مروري"
    }
  ]
}
```

---

## 🎯 خوارزميات التحسين

### 1. Dijkstra's Algorithm

- حساب أقصر مسار بين المحطات
- تحديد المسافة الكلية
- تحسين الوقت والوقود

### 2. Nearest Neighbor

- ترتيب المحطات بكفاءة
- تقليل المسافة الكلية
- تحسين تسلسل التوقفات

### 3. Traffic Analysis

- رصد حركة المرور
- تجنب الازدحام
- تعديل المواعيد

### 4. Passenger Demand

- تحليل الإشغال
- دمج/فصل المسارات
- تحسين السعة

### 5. Fuel Efficiency

- تقليل عدد التوقفات
- تحسين المسافة
- توفير الوقود

---

## 📈 التقارير والإحصائيات

### تقرير سلوك السائق

```javascript
{
  driver: { name: "أحمد محمد" },
  period: { startDate: "2025-01-01", endDate: "2025-01-31" },
  totalTrips: 60,
  completedTrips: 58,
  totalDistance: 4500,
  averageScore: 88,
  incidents: {
    speeding: 5,
    harshBraking: 12,
    accidents: 0
  },
  fuelEfficiency: 8.5,
  safetyRating: 92
}
```

### إحصائيات المركبة

```javascript
{
  performance: {
    totalDistance: 15000,
    averageSpeed: 55,
    totalTrips: 120
  },
  fuel: {
    currentLevel: 75,
    totalConsumed: 2250,
    averageConsumption: 15
  },
  maintenance: {
    status: "good",
    nextDate: "2025-02-15"
  },
  safety: {
    activeAlerts: 0,
    totalIncidents: 3
  }
}
```

---

## 🔔 إنذارات السلامة

### أنواع الإنذارات

1. **Critical Speed** - سرعة خطيرة (>120 km/h)
2. **Low Fuel** - وقود منخفض (<10%)
3. **Maintenance Overdue** - صيانة متأخرة
4. **Route Deviation** - انحراف عن المسار (>500m)
5. **Dangerous Zone** - منطقة خطرة
6. **Accident** - حادث
7. **Breakdown** - عطل

### مستويات الخطورة

- 🔴 **Critical** - تدخل فوري
- 🟠 **High** - مراقبة دقيقة
- 🟡 **Medium** - انتباه مطلوب
- 🟢 **Low** - معلومات فقط

---

## 🚦 حالات النظام

### حالات المركبة

- ✅ **Active** - نشطة
- 🔧 **Maintenance** - صيانة
- ⏸️ **Inactive** - معطلة
- 🚨 **Emergency** - طوارئ

### حالات المسار

- ✅ **Active** - نشط
- ⏸️ **Inactive** - غير نشط
- ⏳ **Suspended** - معلق
- 🔧 **Maintenance** - صيانة

### حالات الرحلة

- 📅 **Scheduled** - مجدولة
- 🚌 **In Progress** - جارية
- ✅ **Completed** - مكتملة
- ❌ **Cancelled** - ملغاة
- ⏰ **Delayed** - متأخرة

---

## 💾 قاعدة البيانات

### Geospatial Indexes

```javascript
// Vehicle GPS Index
{
  "gpsDevice.currentLocation": "2dsphere"
}

// Route Stops Index
{
  "stops.location": "2dsphere"
}

// Trip GPS Tracking Index
{
  "gpsTracking.location": "2dsphere"
}
```

### Performance Indexes

```javascript
// Vehicle Lookup
{ vehicleNumber: 1 }
{ plateNumber: 1 }
{ status: 1 }

// Route Lookup
{ routeCode: 1 }
{ type: 1, status: 1 }

// Trip Lookup
{ tripNumber: 1 }
{ status: 1 }
{ scheduledStartTime: 1 }
```

---

## 🎓 أمثلة الاستخدام

### مثال 1: إنشاء رحلة كاملة

```javascript
// 1. إنشاء مركبة
POST /api/vehicles
{ vehicleNumber: "BUS-001", ... }

// 2. إنشاء مسار
POST /api/transport-routes
{ routeName: "مسار الصباح", stops: [...] }

// 3. تحسين المسار
POST /api/transport-routes/:id/optimize
{ options: { considerTraffic: true } }

// 4. تعيين مركبة وسائق
POST /api/transport-routes/:id/assign-vehicle
{ vehicleId: "..." }

// 5. إنشاء رحلة
POST /api/trips
{ route: "...", vehicle: "...", driver: "..." }

// 6. بدء الرحلة
POST /api/trips/:id/start
{ longitude: 46.6753, latitude: 24.7136 }

// 7. تحديث GPS طوال الرحلة
POST /api/trips/:id/gps
{ longitude: ..., latitude: ..., speed: ... }

// 8. تسجيل الوصول للمحطات
POST /api/trips/:id/arrive-stop
{ stopNumber: 1 }

// 9. إنهاء الرحلة
POST /api/trips/:id/complete
{ longitude: 46.7753, latitude: 24.8136 }

// 10. عرض الإحصائيات
GET /api/trips/:id/statistics
```

### مثال 2: مراقبة السلامة

```javascript
// رصد التنبيهات الفورية
GET /api/vehicles/:id/statistics

// إضافة إنذار طوارئ
POST /api/vehicles/:id/emergency
{
  type: "accident",
  severity: "critical",
  description: "حادث مروري خطير"
}

// تحليل سلوك السائق
GET /api/trips/:id/behavior-analysis

// تقرير السائق الشهري
POST /api/trips/driver-report
{
  driverId: "...",
  startDate: "2025-01-01",
  endDate: "2025-01-31"
}
```

---

## 🎉 النظام جاهز للاستخدام!

✅ **Models** - 3 نماذج شاملة  
✅ **Services** - 2 خدمات ذكية  
✅ **Controllers** - 3 متحكمات متطورة  
✅ **Routes** - 3 ملفات مسارات مع 40+ endpoint  
✅ **Integration** - دمج كامل مع app.js

---

## 📞 الدعم والمساعدة

- 📧 Email: support@alawael.com
- 📱 Phone: +966-XX-XXX-XXXX
- 🌐 Website: www.alawael.com

**جميع الحقوق محفوظة © 2025 - نظام الأوائل**

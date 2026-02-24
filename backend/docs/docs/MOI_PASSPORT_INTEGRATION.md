# 🇸🇦 MOI Passport Integration System - نظام تكامل الجوازات

**الإصدار:** 3.0.0  
**تاريخ التحديث:** فبراير 2026  
**الحالة:** ✅ جاهز للإنتاج

---

## 📚 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [الميزات الرئيسية](#الميزات-الرئيسية)
3. [البنية المعمارية](#البنية-المعمارية)
4. [التثبيت والإعداد](#التثبيت-والإعداد)
5. [دليل الاستخدام](#دليل-الاستخدام)
6. [واجهات API](#واجهات-api)
7. [أمثلة عملية](#أمثلة-عملية)
8. [المراقبة والتحليلات](#المراقبة-والتحليلات)
9. [استكشاف الأخطاء](#استكشاف-الأخطاء)
10. [أفضل الممارسات](#أفضل-الممارسات)

---

## 🎯 نظرة عامة

### الوصف

نظام متخصص وذكي للتكامل مع خدمات الجوازات السعودية (General Directorate of Passports - GDP)، يوفر:

- ✅ التحقق الفوري من جوازات السفر
- ✅ التحقق من الهويات الوطنية
- ✅ التحقق من بطاقات الإقامة
- ✅ طلب تأشيرات الخروج والعودة
- ✅ الحصول على بيانات المسافرين الكاملة
- ✅ إدارة متقدمة للبيانات والتخزين المؤقت
- ✅ معالجة أخطاء احترافية وإعادة محاولة ذكية
- ✅ أنظمة الأمان والتشفير
- ✅ مراقبة وتحليلات شاملة
- ✅ سجل تدقيق كامل

### العملاء المستهدفين

- الشركات والمؤسسات الحكومية
- أنظمة إدارة الموارد البشرية
- شركات الطيران والسياحة
- وكالات التوظيف
- الجهات الحكومية

---

## ⭐ الميزات الرئيسية

### 1. التحقق الذكي

```
✓ تحقق فوري من صحة البيانات
✓ دعم أنماط متعددة للتحقق
✓ رسائل خطأ واضحة وterrorifying
✓ تحقق من الصيغة والطول والنطاق
```

### 2. نظام الذاكرة المؤقتة المتقدم

```
✓ تخزين مؤقت تلقائي للنتائج
✓ إدارة حجم الذاكرة تلقائياً
✓ انتهاء صلاحية مخصص للـ TTL
✓ إحصائيات استخدام الذاكرة
```

### 3. إعادة المحاولة الذكية

```
✓ إعادة محاولة تلقائية عند الفشل
✓ تأخير أسي (Exponential Backoff)
✓ تشخيص أخطاء متقدم
✓ حد أقصى قابل للتخصيص
```

### 4. تحديد السرعة (Rate Limiting)

```
✓ 100 طلب لكل ساعة لكل مستخدم
✓ إدارة النافذة الزمنية
✓ الإشعارات عند تجاوز الحد
```

### 5. الأمان والتشفير

```
✓ تشفير AES-256 للبيانات الحساسة
✓ مفاتيح API آمنة
✓ معرّفات الطلب الفريدة
✓ رؤوس أمان مخصصة
```

### 6. المراقبة المتقدمة

```
✓ تتبع المقاييس في الوقت الفعلي
✓ حساب متوسط وقت الاستجابة
✓ معدل النجاح والفشل
✓ إحصائيات استخدام الذاكرة
```

### 7. سجل التدقيق الكامل

```
✓ تسجيل كل العمليات
✓ تتبع المستخدمين والإجراءات
✓ طوابع زمنية ومعرفات فريدة
✓ تصفية وبحث متقدم
```

---

## 🏗️ البنية المعمارية

### الملفات الرئيسية

```
erp_new_system/backend/
├── services/
│   └── moi-passport.service.js       # الخدمة الرئيسية (800+ سطر)
├── routes/
│   └── moi-passport.routes.js        # مسارات API (500+ سطر)
├── tests/
│   └── moi-passport.test.js          # اختبارات شاملة (800+ سطر)
└── docs/
    └── MOI_PASSPORT_INTEGRATION.md   # التوثيق
```

### معمارية الخدمة

```
MOIPassportService (يرث من EventEmitter)
├── Configuration
│   ├── API Base URL
│   ├── API Key & Secret
│   ├── Timeout Settings
│   ├── Retry Configuration
│   └── Cache Settings
├── Data Storage
│   ├── Cache (Map)
│   ├── Request Queue
│   ├── Metrics
│   ├── Error Log
│   ├── Audit Log
│   └── Rate Limiter
├── Core Methods
│   ├── Verification Methods
│   ├── Cache Management
│   ├── Rate Limiting
│   ├── API Requests
│   ├── Encryption/Decryption
│   └── Event Emission
└── Monitoring
    ├── Metrics Collection
    ├── Health Checks
    ├── Audit Logging
    └── Error Tracking
```

---

## 🔧 التثبيت والإعداد

### 1. المتطلبات

```bash
Node.js >= 14.0.0
npm >= 6.0.0
Express >= 4.17.0
Axios >= 0.21.0
```

### 2. التثبيت

```bash
# نسخ الخدمة
cp moi-passport.service.js backend/services/

# نسخ المسارات
cp moi-passport.routes.js backend/routes/

# نسخ الاختبارات
cp moi-passport.test.js backend/tests/

# تثبيت المتطلبات
npm install axios dotenv
```

### 3. إعدادات البيئة (.env)

```env
# MOI Passport Configuration
JAWAZAT_API_BASE_URL=https://api.gdp.gov.sa/v1
JAWAZAT_API_KEY=your-api-key-here
JAWAZAT_API_SECRET=your-api-secret-here
JAWAZAT_WEBHOOK_URL=https://your-domain.com/webhooks/moi
JAWAZAT_TIMEOUT=30000
JAWAZAT_RETRY_ATTEMPTS=3
JAWAZAT_RETRY_DELAY=1000

# Cache Configuration
PASSPORT_CACHE_SIZE=10000
PASSPORT_CACHE_TTL=3600000

# Security
PASSPORT_ENABLE_ENCRYPTION=true
```

### 4. تسجيل المسارات في التطبيق الرئيسي

```javascript
// server.js أو app.js
const moiPassportRoutes = require('./routes/moi-passport.routes');

app.use('/api/moi', moiPassportRoutes);
```

---

## 📖 دليل الاستخدام

### التهيئة الأساسية

```javascript
const MOIPassportService = require('./services/moi-passport.service');

const passportService = new MOIPassportService({
  apiBaseUrl: 'https://api.gdp.gov.sa/v1',
  apiKey: process.env.JAWAZAT_API_KEY,
  enableEncryption: true,
  maxCacheSize: 10000,
  cacheTTL: 3600000, // 1 ساعة
});

// الاستماع للأحداث
passportService.on('passport:verified', (data) => {
  console.log('تم التحقق من جواز السفر:', data);
});

passportService.on('cache:hit', ({ key }) => {
  console.log('استخدام الذاكرة المؤقتة:', key);
});

passportService.on('request:failure', (error) => {
  console.error('فشل الطلب:', error);
});
```

### اسخداماتUsages أساسية

```javascript
// 1. التحقق من جواز السفر
const passportResult = await passportService.verifyPassport(
  'ABC123456',
  'user-id-123'
);

// 2. التحقق من الهوية الوطنية
const idResult = await passportService.verifyNationalId(
  '1234567890',
  'user-id-123'
);

// 3. التحقق من الإقامة
const iqamaResult = await passportService.verifyIqama(
  '2345678901',
  'user-id-123'
);

// 4. طلب تأشيرة خروج وعودة
const visaResult = await passportService.requestExitReentryVisa(
  '2345678901',
  'multiple', // single أو multiple
  90, // عدد الأيام
  'user-id-123'
);

// 5. الحصول على ملف المسافر الكامل
const profileResult = await passportService.getTravelerProfile(
  '2345678901',
  'user-id-123'
);

// 6. الحصول على المقاييس
const metrics = passportService.getMetrics();

// 7. الفحص الصحي
const health = await passportService.healthCheck();

// 8. مسح الذاكرة المؤقتة
passportService.clearCache('passport');
```

---

## 🌐 واجهات API

### Endpoints الرئيسية

#### 1. التحقق من جواز السفر

```http
POST /api/moi/passports/verify
Content-Type: application/json
Authorization: Bearer <token>

{
  "passportNumber": "ABC123456"
}

Response:
{
  "success": true,
  "data": {
    "passportNumber": "ABC123456",
    "fullNameArabic": "أحمد محمد علي",
    "fullNameEnglish": "Ahmed Mohammed Ali",
    "nationality": "Saudi Arabia",
    "dateOfBirth": "1990-01-15",
    "gender": "M",
    "issueDate": "2020-01-01",
    "expiryDate": "2030-01-01",
    "status": "valid",
    "issuingAuthority": "General Directorate of Passports",
    "verificationDate": "2026-02-19T10:30:00Z"
  },
  "source": "api",
  "responseTime": 245
}
```

#### 2. التحقق من الهوية الوطنية

```http
POST /api/moi/national-ids/verify
Content-Type: application/json
Authorization: Bearer <token>

{
  "nationalId": "1234567890"
}

Response:
{
  "success": true,
  "data": {
    "nationalId": "1234567890",
    "fullNameArabic": "أحمد محمد علي",
    "fullNameEnglish": "Ahmed Mohammed Ali",
    "birthDate": "1990-01-15",
    "gender": "M",
    "nationality": "Saudi Arabia",
    "issueDate": "2020-01-01",
    "expiryDate": "2030-01-01",
    "status": "valid",
    "verificationDate": "2026-02-19T10:30:00Z"
  },
  "source": "cache",
  "responseTime": 12
}
```

#### 3. التحقق من الإقامة

```http
POST /api/moi/iqamas/verify
Content-Type: application/json
Authorization: Bearer <token>

{
  "iqamaNumber": "2345678901"
}

Response:
{
  "success": true,
  "data": {
    "iqamaNumber": "2345678901",
    "fullNameArabic": "محمد علي فرج",
    "fullNameEnglish": "Mohamed Ali Faraj",
    "nationality": "Egyptian",
    "dateOfBirth": "1985-05-15",
    "sponsorName": "Ahmed Al-Saeed Company",
    "sponsorNumber": "EST12345",
    "issueDate": "2020-01-01",
    "expiryDate": "2025-12-31",
    "status": "valid",
    "occupationCode": "9411",
    "occupationName": "Engineer",
    "verificationDate": "2026-02-19T10:30:00Z"
  },
  "source": "api",
  "responseTime": 312
}
```

#### 4. التحقق الجماعي

```http
POST /api/moi/verify/bulk
Content-Type: application/json
Authorization: Bearer <token>

{
  "documents": [
    {
      "type": "passport",
      "value": "ABC123456"
    },
    {
      "type": "national-id",
      "value": "1234567890"
    },
    {
      "type": "iqama",
      "value": "2345678901"
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "verified": [...],
    "failed": [...],
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0,
      "successRate": "100.00%"
    }
  }
}
```

#### 5. طلب تأشيرة الخروج والعودة

```http
POST /api/moi/exit-reentry/request
Content-Type: application/json
Authorization: Bearer <token>

{
  "iqamaNumber": "2345678901",
  "visaType": "multiple",
  "duration": 90
}

Response:
{
  "success": true,
  "data": {
    "requestId": "ERV1234567890",
    "iqamaNumber": "2345678901",
    "visaType": "multiple",
    "duration": 90,
    "status": "pending",
    "expiryDate": "2026-05-19",
    "createdDate": "2026-02-19",
    "estimatedCollectionDate": "2026-02-21"
  },
  "responseTime": 456
}
```

#### 6. الحصول على ملف المسافر

```http
GET /api/moi/travelers/2345678901
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "iqamaNumber": "2345678901",
    "personalInfo": {
      "fullNameAr": "محمد علي فرج",
      "fullNameEn": "Mohamed Ali Faraj",
      "dateOfBirth": "1985-05-15",
      "gender": "M",
      "nationality": "Egyptian"
    },
    "documentInfo": {
      "passport": "ABC123456",
      "passportExpiry": "2030-01-01",
      "iqama": "2345678901",
      "iqamaExpiry": "2025-12-31",
      "nationalId": "3456789012"
    },
    "travelHistory": [
      {
        "date": "2025-01-15",
        "country": "UAE",
        "duration": 5
      }
    ],
    "currentVisa": {
      "type": "multiple re-entry",
      "expiryDate": "2026-05-19"
    },
    "exitBans": [],
    "flaggedStatus": false
  }
}
```

#### 7. المقاييس والإحصائيات

```http
GET /api/moi/metrics
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "requests": {
      "total": 1543,
      "successful": 1523,
      "failed": 20,
      "successRate": "98.70%",
      "averageResponseTime": "245ms"
    },
    "cache": {
      "hits": 4521,
      "size": 2341,
      "maxSize": 10000,
      "utilization": "23.41%"
    },
    "logs": {
      "errorLogSize": 45,
      "auditLogSize": 3456
    }
  },
  "timestamp": "2026-02-19T10:30:00Z"
}
```

#### 8. الفحص الصحي

```http
GET /api/moi/health
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "apiResponse": true,
    "responseTime": 125,
    "timestamp": "2026-02-19T10:30:00Z"
  }
}
```

#### 9. سجل التدقيق

```http
GET /api/moi/audit-logs?action=PASSPORT_VERIFY&limit=50
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "audit-uuid",
        "action": "PASSPORT_VERIFY",
        "userId": "user-123",
        "details": {...},
        "timestamp": "2026-02-19T10:30:00Z"
      }
    ],
    "count": 50
  }
}
```

---

## 💡 أمثلة عملية

### مثال 1: التطبيق - تحديث بيانات الموظف

```javascript
// عند تعيين موظف جديد، تحقق من جميع بيانات الهوية
async function onboardNewEmployee(employeeData) {
  const passportService = new MOIPassportService();
  
  try {
    // التحقق من جواز السفر
    const passportVerification = await passportService.verifyPassport(
      employeeData.passportNumber,
      'hr-admin'
    );

    // التحقق من الإقامة
    const iqamaVerification = await passportService.verifyIqama(
      employeeData.iqamaNumber,
      'hr-admin'
    );

    // الحصول على بيانات المسافر الكاملة
    const travelProfile = await passportService.getTravelerProfile(
      employeeData.iqamaNumber,
      'hr-admin'
    );

    // إذا كان سعودياً، تحقق من الهوية الوطنية
    if (employeeData.nationality === 'Saudi') {
      const idVerification = await passportService.verifyNationalId(
        employeeData.nationalId,
        'hr-admin'
      );
    }

    // تحديث السجل
    return {
      employeeId: employeeData.id,
      verified: true,
      documentVerifications: {
        passport: passportVerification.data,
        iqama: iqamaVerification.data,
        travelProfile: travelProfile.data,
      },
      verificationDate: new Date(),
    };
  } catch (error) {
    logger.error('Failed to verify employee documents:', error);
    return {
      employeeId: employeeData.id,
      verified: false,
      error: error.message,
    };
  }
}
```

### مثال 2: نظام إدارة الر حلات

```javascript
// عند إنشاء طلب رحلة، تحقق من حالة الموظف
async function createTravelRequest(employeeId, destinationCountry) {
  const passportService = new MOIPassportService();
  const employee = await getEmployee(employeeId);

  try {
    // الحصول على ملف المسافر
    const profile = await passportService.getTravelerProfile(
      employee.iqamaNumber,
      'travel-admin'
    );

    // التحقق من الحالة
    const checks = {
      passportValid: new Date(profile.data.documentInfo.passportExpiry) > new Date(),
      iqamaValid: new Date(profile.data.documentInfo.iqamaExpiry) > new Date(),
      noExitBans: profile.data.exitBans.length === 0,
      visaAvailable: profile.data.currentVisa !== null,
      notFlagged: !profile.data.flaggedStatus,
    };

    if (Object.values(checks).every((check) => check)) {
      // جميع الفحوصات نجحت
      return {
        canTravel: true,
        message: 'الموظف متاح للسفر',
        profile: profile.data,
      };
    } else {
      // بعض الفحوصات فشلت
      return {
        canTravel: false,
        message: 'يوجد مشاكل في وثائق الموظف',
        issues: checks,
      };
    }
  } catch (error) {
    return {
      canTravel: false,
      error: error.message,
    };
  }
}
```

### مثال 3: نظام مراقبة الإقامات

```javascript
// فحص دوري للإقامات التي تنتهي صلاحيتها
async function checkExpiringIqamas() {
  const passportService = new MOIPassportService();
  const employees = await getAllEmployees();
  const alerts = [];

  for (const employee of employees) {
    try {
      const iqamaCheck = await passportService.verifyIqama(
        employee.iqamaNumber,
        'system:scheduler'
      );

      const expiryDate = new Date(iqamaCheck.data.expiryDate);
      const daysUntilExpiry = Math.ceil(
        (expiryDate - new Date()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 30) {
        alerts.push({
          employeeId: employee.id,
          employeeName: employee.fullName,
          iqamaNumber: employee.iqamaNumber,
          expiryDate: expiryDate,
          daysRemaining: daysUntilExpiry,
          severity: daysUntilExpiry <= 7 ? 'high' : 'medium',
        });
      }
    } catch (error) {
      logger.error(`Failed to check Iqama for ${employee.id}:`, error);
    }
  }

  // إرسال تنبيهات
  if (alerts.length > 0) {
    await notificationService.sendAlert(
      'IQAMA_EXPIRY_WARNING',
      alerts
    );
  }

  return {
    checked: employees.length,
    alertsGenerated: alerts.length,
    alerts: alerts,
  };
}
```

---

## 📊 المراقبة والتحليلات

### قراءة المقاييس

```javascript
const metrics = passportService.getMetrics();

console.log(`إجمالي الطلبات: ${metrics.totalRequests}`);
console.log(`معدل النجاح: ${metrics.successRate}`);
console.log(`متوسط وقت الاستجابة: ${metrics.averageResponseTime}`);
console.log(`استخدام الذاكرة المؤقتة: ${metrics.cacheUtilization}`);
```

### نظام التنبيهات

```javascript
passportService.on('cache:hit', ({ key }) => {
  metrics.cacheHits++;
});

passportService.on('request:failure', (errorInfo) => {
  logger.error('Request failed:', errorInfo);
  alertService.notify({
    type: 'PASSPORT_API_FAILURE',
    severity: 'high',
    details: errorInfo,
  });
});

passportService.on('audit:logged', (entry) => {
  auditDatabase.insert(entry);
});
```

---

## 🔍 استكشاف الأخطاء

### الأخطاء الشائعة والحلول

| الخطأ | السبب | الحل |
|------|------|------|
| `Rate limit exceeded` | تجاوز 100 طلب بالساعة | انتظر قبل إجراء طلبات جديدة |
| `Invalid passport format` | تنسيق جواز السفر خاطئ | استخدم أحرف كبيرة وأرقام فقط |
| `API response timeout` | انقطاع الاتصال | أعد المحاولة بعد ثواني |
| `Encryption error` | فشل التشفير | تحقق من قيمة `apiSecret` |
| `Cache overflow` | الذاكرة امتلأت | امسح الذاكرة المؤقتة |

### مثال على معالجة الأخطاء

```javascript
try {
  const result = await passportService.verifyPassport('ABC123456', 'user-id');
  console.log('Verification successful:', result);
} catch (error) {
  if (error.type === 'PASSPORT_VERIFICATION_ERROR') {
    console.error('Invalid passport number');
  } else if (error.message.includes('Rate limit')) {
    console.error('Too many requests. Please try again later.');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

---

## ✅ أفضل الممارسات

### 1. التخزين المؤقت

```javascript
// ✅ صحيح: استخدم التخزين المؤقت للطلبات المتكررة
const result1 = await passportService.verifyPassport('ABC123456', 'user1');
const result2 = await passportService.verifyPassport('ABC123456', 'user2'); // من الذاكرة المؤقتة

// ❌ خاطئ: عدم استخدام التخزين المؤقت
for (let i = 0; i < 10; i++) {
  await passportService.verifyPassport('ABC123456', i); // 10 طلبات API
}
```

### 2. معالجة الأخطاء

```javascript
// ✅ صحيح: معالجة شاملة للأخطاء
try {
  const result = await passportService.verifyPassport(passportNumber, userId);
  if (!result.success) {
    logger.warn('Verification failed but no error thrown');
  }
} catch (error) {
  if (error.type === 'RATE_LIMIT_ERROR') {
    // تعامل خاص مع تحديد السرعة
  } else {
    // تعامل عام مع الأخطاء
  }
}

// ❌ خاطئ: عدم معالجة الأخطاء
const result = await passportService.verifyPassport(passportNumber, userId);
```

### 3. إدارة الموارد

```javascript
// ✅ صحيح: تنظيف الموارد نهائياً
app.on('shutdown', () => {
  passportService.destroy();
});

// ✅ صحيح: مسح الذاكرة المؤقتة دورياً
setInterval(() => {
  passportService.clearCache();
}, 3600000); // كل ساعة

// ❌ خاطئ: عدم تنظيف الموارد
// (قد يؤدي لتسريب الذاكرة)
```

### 4. الأمان

```javascript
// ✅ صحيح: استخدام متغيرات البيئة
const service = new MOIPassportService({
  apiKey: process.env.JAWAZAT_API_KEY,
  enableEncryption: true,
});

// ❌ خاطئ: وضع المفاتيح في الكود
const service = new MOIPassportService({
  apiKey: 'my-secret-key-123', // لا تفعل هذا!
});
```

### 5. السجلات والمراقبة

```javascript
// ✅ صحيح: تسجيل الأحداث المهمة
passportService.on('passport:verified', (data) => {
  logger.info('Passport verified successfully', { data });
});

passportService.on('request:failure', (error) => {
  logger.error('API request failed', { error });
  alertService.notify({
    type: 'CRITICAL',
    message: 'MOI API failure detected',
  });
});

// ❌ خاطئ: عدم تسجيل الأحداث
// (صعوبة تتبع المشاكل)
```

---

## 📞 الدعم والمساعدة

### الأسئلة الشائعة

**س: هل البيانات آمنة؟**
ج: نعم، جميع البيانات يتم تشفيرها بـ AES-256 وتتم عبر HTTPS

**س: هل هناك حد أقصى للطلبات؟**
ج: 100 طلب لكل ساعة لكل مستخدم

**س: كم تستغرق المعالجة؟**
ج: عادة 200-500 ملي ثانية حسب حالة الذاكرة المؤقتة

**س: هل يدعم الطلبات الجماعية؟**
ج: نعم، حتى 100 وثيقة في الطلب الواحد

---

## 🎓 الدليل الكامل

للمزيد من المعلومات والأمثلة المتقدمة، انظر:

- [API Documentation](../API_DOCUMENTATION.md)
- [Architecture Guide](../SYSTEM_ARCHITECTURE.md)
- [Security Guidelines](../SECURITY_GUIDELINES.md)
- [Performance Tuning](../PERFORMANCE_OPTIMIZATION.md)

---

## 📝 سجل التغييرات

### النسخة 3.0.0 (فبراير 2026)

- ✨ نسخة جديدة كاملة
- ✅ نظام تخزين مؤقت متقدم
- ✅ إعادة محاولة ذكية مع exponential backoff
- ✅ تشفير AES-256
- ✅ سجل تدقيق شامل
- ✅ مراقبة وتحليلات سطح البيانات
- ✅ 40+ نقطة نهاية API
- ✅ 80+ حالة اختبار

---

**تم الإنشاء بواسطة:** فريق التطوير  
**آخر تحديث:** 19 فبراير 2026  
**الترخيص:** مملوك خاص

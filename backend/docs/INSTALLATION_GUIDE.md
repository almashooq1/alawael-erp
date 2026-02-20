# 🎯 نظام المقاييس والبرامج التأهيلية الذكي
## Smart Measurement & Rehabilitation System - Installation & Usage Guide

---

## 📦 محتويات الملفات الجديدة

### 1. **نماذج قاعدة البيانات**
```
backend/models/
├── MeasurementModels.js          # المقاييس والتقييمات
└── RehabilitationProgramModels.js # البرامج التأهيلية
```

### 2. **الخدمات والمحركات الذكية**
```
backend/services/
├── MeasurementService.js              # خدمات المقاييس
└── SmartMeasurementProgramEngine.js   # محرك الربط الذكي
```

### 3. **مسارات API**
```
backend/routes/
└── measurements.routes.js  # جميع مسارات المقاييس والبرامج
```

### 4. **بيانات البذر**
```
backend/seeds/
└── measurement-system.seed.js  # بيانات المقاييس والبرامج الأساسية
```

### 5. **الاختبارات**
```
backend/tests/
└── measurement-system.test.js  # اختبارات شاملة
```

### 6. **التوثيق**
```
backend/docs/
└── MEASUREMENT_SYSTEM_GUIDE.md  # دليل شامل
```

---

## 🔧 خطوات التثبيت والتشغيل

### 1️⃣ إضافة المسارات إلى تطبيق Express الرئيسي

في `backend/app.js` أو `backend/server.js`:

```javascript
// إضافة مسارات المقاييس والبرامج
const measurementsRoutes = require('./routes/measurements.routes');
app.use('/api/measurements', measurementsRoutes);

// أو إذا أردت مسار أساسي مختلف
app.use('/api/rehabilitation', measurementsRoutes);
```

### 2️⃣ تشغيل البيانات الأساسية (Seed)

```bash
# طريقة 1: مستقيمة من Node
node -e "const seed = require('./seeds/measurement-system.seed'); seed.seedMeasurementSystem();"

# طريقة 2: أضف نص إلى package.json
{
  "scripts": {
    "seed:measurements": "node scripts/seed-measurements.js"
  }
}

# ثم شغل:
npm run seed:measurements
```

### 3️⃣ إنشاء ملف النصيدة `scripts/seed-measurements.js`:

```javascript
const mongoose = require('mongoose');
require('dotenv').config();
const { seedMeasurementSystem } = require('../seeds/measurement-system.seed');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ متصل بقاعدة البيانات');
    await seedMeasurementSystem();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ خطأ:', err);
    process.exit(1);
  });
```

### 4️⃣ تثبيت المتطلبات الإضافية (إن لزم)

```bash
npm install mongoose-paginate-v2  # اختياري للترقيم
npm install joi  # للتحقق من الصحة
```

---

## 🌐 استخدام API - أمثلة عملية

### A. تسجيل مستفيد جديد وإجراء تقييم

#### الخطوة 1: تسجيل نتيجة مقياس

```bash
curl -X POST http://localhost:3001/api/measurements/results/BN-0001 \
  -H "Content-Type: application/json" \
  -d '{
    "measurementId": "MEAS-IQ-WECHSLER-001",
    "typeId": "INTEL_001",
    "rawScore": 45,
    "standardScore": 40,
    "percentileRank": 1,
    "overallLevel": "SEVERE",
    "interpretation": {
      "summary": "إعاقة ذهنية شديدة",
      "strengths": [],
      "weaknesses": ["ضعف كبير في القدرات العقلية"]
    },
    "administratedBy": {
      "userId": "PSYCH-001",
      "name": "د. علي أحمد",
      "certifications": ["BA Psychology"]
    },
    "dateAdministrated": "2026-02-18"
  }'
```

**الرد (Response):**
```json
{
  "success": true,
  "message": "تم تسجيل نتيجة القياس بنجاح وتم تفعيل البرامج المناسبة",
  "data": {
    "measurementResult": {
      "_id": "xxx",
      "beneficiaryId": "BN-0001",
      "status": "PENDING_REVIEW"
    },
    "automatedPrograms": {
      "analyzedPrograms": [
        {
          "programId": "xxx",
          "programName": "برنامج العناية بالذات",
          "matchScore": 95,
          "activationDate": "2026-02-18"
        }
      ]
    }
  }
}
```

#### الخطوة 2: إنشاء خطة تأهيل

```bash
curl -X POST http://localhost:3001/api/rehabilitation-plans/BN-0001 \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiaryInfo": {
      "name": "علي محمد أحمد",
      "disabilityType": "INTELLECTUAL",
      "severityLevel": "SEVERE",
      "age": 10
    },
    "planningTeam": [
      {
        "role": "Team Leader",
        "userId": "COORD-001",
        "name": "فريق التأهيل",
        "specialty": "Special Education"
      }
    ],
    "vision": {
      "longTermGoals": ["تحقيق الاستقلالية قدومة الإمكان"]
    },
    "mission": {
      "shortTermObjectives": ["تطوير مهارات الحياة اليومية الأساسية"]
    },
    "rehabilitationAreas": [
      {
        "areaName": "مهارات الحياة اليومية",
        "currentLevel": "Low",
        "targetLevel": "Moderate",
        "priority": "HIGH"
      }
    ],
    "planPeriod": {
      "startDate": "2026-02-20",
      "endDate": "2026-05-20"
    }
  }'
```

#### الخطوة 3: تسجيل جلسة برنامج

```bash
curl -X POST "http://localhost:3001/api/programs/sessions/BN-0001/PROG-DAILY-SELF-CARE-001" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionNumber": 1,
    "scheduledDate": "2026-02-20",
    "sessionDuration": 60,
    "sessionType": "INDIVIDUAL",
    "facilitators": [
      {
        "userId": "THER-001",
        "name": "علياء محمد",
        "role": "Occupational Therapist"
      }
    ],
    "content": {
      "objectives": ["تعليم مهارات الأكل بالملعقة"],
      "activitiesPerformed": [
        "تمرين استخدام الملعقة",
        "تعزيز إيجابي"
      ],
      "techniques": ["Positive Reinforcement"],
      "materialsUsed": ["ملعقة توضيحية", "أطباق آمنة"]
    },
    "performance": {
      "beneficiaryEngagement": "GOOD",
      "taskCompletion": 75,
      "behavioralNotes": "المستفيد كان متعاوناً وملتزماً",
      "strengthsObserved": [
        "رغبة في التعلم",
        "القدرة على التركيز"
      ],
      "challengesEncountered": [
        "صعوبة في التحكم بالحركة الدقيقة"
      ]
    },
    "education": {
      "parentTrainingTopics": [
        "تقنيات التعزيز",
        "ممارسة المهارات في البيت"
      ],
      "homeActivities": [
        "تمرين الأكل مرة يومياً",
        "تشجيع الاستقلالية"
      ]
    },
    "nextSteps": {
      "plannedInterventions": [
        "تشديد ممارسة مهارات الأكل",
        "تقديم تحديات أعلى"
      ],
      "nextSessionDate": "2026-02-22"
    }
  }'
```

#### الخطوة 4: الحصول على التقرير الشامل

```bash
curl http://localhost:3001/api/reports/BN-0001/comprehensive \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**الرد الشامل يتضمن:**
- آخر المقاييس والدرجات
- البرامج النشطة والمكتملة
- الخطة التأهيلية الفردية
- الملخص والتوصيات
- الإحصائيات والمؤشرات

---

## 📊 أمثلة متقدمة

### مثال 1: مقارنة تقدم المستفيد

```bash
# مقارنة نتائج مقياس السلوك التكيفي عبر الزمن
curl "http://localhost:3001/api/measurements/results/BN-0001/compare/ADAPT_001"

# الرد يتضمن:
# - عدد المقاييس المسجلة
# - الاتجاه الزمني (تحسن/انخفاض/مستقر)
# - النسبة المئوية للتحسن
# - التوصيات بناءً على التقدم
```

### مثال 2: الحصول على البرامج النشطة

```bash
curl "http://localhost:3001/api/programs/active/BN-0001"

# سيعود بقائمة برامج نشطة مع:
# - تاريخ الالتحاق
# - التاريخ المتوقع للانتهاء
# - عدد الجلسات المكتملة
# - نسبة تحقق الأهداف
```

### مثال 3: فعالية البرنامج

```bash
curl "http://localhost:3001/api/programs/effectiveness/PROG-ID-xxx"

# الرد يتضمن:
# - نسبة الحضور
# - عدد الأهداف المحققة
# - معدل اكتساب المهارات
# - درجة الانخراط
# - الفعالية الإجمالية
```

---

## 🔌 دمج مع المكونات الموجودة

### دمج مع نموذج BeneficiaryProfile:

```javascript
// في models/BeneficiaryProfile.js أو ملف مشابه
const beneficiarySchema = new mongoose.Schema({
  // ... الحقول الموجودة
  
  // ربط مع نظام المقاييس والبرامج
  measurementResults: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MeasurementResult'
  }],
  
  programsEnrolled: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProgramProgress'
  }],
  
  individualRehabPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IndividualRehabPlan'
  }
});
```

### استخدام مع لوحة التحكم الموجودة:

```javascript
// في routes dashboard atau analytics
router.get('/beneficiary/:id/overview', async (req, res) => {
  const beneficiaryId = req.params.id;
  
  // جلب البيانات من النظام الجديد
  const latestResults = await MeasurementResult.find({
    beneficiaryId
  }).sort({ dateAdministrated: -1 }).limit(5);
  
  const activePrograms = await ProgramProgress.find({
    beneficiaryId,
    overallStatus: 'ACTIVE'
  });
  
  const irp = await IndividualRehabPlan.findOne({
    beneficiaryId,
    status: 'ACTIVE'
  });
  
  res.json({
    beneficiaryId,
    latestMeasurement: latestResults[0],
    activePrograms,
    plan: irp
  });
});
```

---

## ⚙️ الإعدادات والمتغيرات البيئية

أضف إلى `.env`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/erp_system

# Measurement System
MEASUREMENT_SYSTEM_ENABLED=true
AUTO_PROGRAM_ACTIVATION=true
MEASUREMENT_REPORT_LANGUAGE=ar  # ar or en

# Program Configuration
MAX_ACTIVE_PROGRAMS_PER_BENEFICIARY=5
DEFAULT_PROGRAM_DURATION_WEEKS=12

# Logging
MEASUREMENT_LOGGING=true
```

---

## 🧪 تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
npm test -- measurement-system.test.js

# تشغيل اختبار معين
npm test -- measurement-system.test.js -t "Smart Linkage"

# مع تقرير تغطية
npm test -- measurement-system.test.js --coverage
```

---

## 📱 الإمكانيات المتقدمة

### 1. تقارير مخصصة

```javascript
// يمكن توسيع النظام لإنشاء تقارير مخصصة
const customReport = {
  format: 'PDF',
  language: 'AR',
  includeGraphs: true,
  includeRecommendations: true,
  filters: {
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    programsOnly: true
  }
};
```

### 2. تنبيهات ذكية

```javascript
// إشعارات تلقائية:
// - عندما يتحسن المستفيد بـ 20%+
// - عند تأخر في الجلسات
// - عند الوصول لأهداف معينة
```

### 3. دعم الفيديو والملفات

```javascript
// حفظ مقاطع فيديو للجلسات
// توثيق التقدم بصرياً
session.attachments = [{
  fileName: 'session-video.mp4',
  type: 'VIDEO',
  url: 'uploads/videos/xxx.mp4'
}];
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: لا تتفعل البرامج
**الحل:**
```javascript
// تحقق من:
// 1. الاتصال بقاعدة البيانات
// 2. بيانات المقياس صحيحة
// 3. البرامج موجودة وفعالة
// 4. قواعد التفعيل صحيحة

// تشغيل تصحيح:
console.log('Measurement:', measurement);
console.log('Activation Rules:', program.linkedMeasurements);
```

### المشكلة: أداء بطيء
**الحل:**
```javascript
// أضف indexes للمتكررات:
MeasurementResult.collection.createIndex({ beneficiaryId: 1, dateAdministrated: -1 });
ProgramProgress.collection.createIndex({ beneficiaryId: 1, overallStatus: 1 });
```

---

## 📞 الدعم والمساعدة

- 📖 اقرأ الدليل الكامل: `MEASUREMENT_SYSTEM_GUIDE.md`
- 🧪 اختبر الأمثلة: `measurement-system.test.js`
- 💬 اطلب المساعدة: support@company.com

---

## ✨ الميزات الرئيسية الموجزة

| الميزة | الوصف | الحالة |
|--------|-------|--------|
| 50+ مقياس | مقاييس معيارية وداخلية | ✅ جاهز |
| ربط ذكي | تفعيل برامج تلقائي | ✅ جاهز |
| تقارير شاملة | تقارير متعددة المستويات | ✅ جاهز |
| تتبع التقدم | مؤشرات وإحصائيات | ✅ جاهز |
| خطط فردية | IRP متكاملة | ✅ جاهز |
| تقييمات سريعة | تقييمات يومية | ✅ جاهز |
| API كامل | توافق RESTful | ✅ جاهز |
| اختبارات | test suite شامل | ✅ جاهز |

---

**نسخة**: 2.0 - فبراير 2026  
**آخر تحديث**: $(date)  
**الحالة**: جاهز للإنتاج ✅

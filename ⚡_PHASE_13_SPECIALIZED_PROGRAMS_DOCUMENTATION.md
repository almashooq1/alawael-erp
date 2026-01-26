# نظام البرامج المتخصصة والجلسات المتقدمة
## الوثائق الشاملة - Phase 13

### محتويات الوثيقة
1. [النظرة العامة](#النظرة-العامة)
2. [البنية والمعمارية](#البنية-والمعمارية)
3. [المميزات الرئيسية](#المميزات-الرئيسية)
4. [دليل الاستخدام](#دليل-الاستخدام)
5. [API المتوفرة](#api-المتوفرة)
6. [أمثلة عملية](#أمثلة-عملية)

---

## النظرة العامة

يوفر هذا النظام حلاً متكاملاً لإدارة البرامج العلاجية والتعليمية المتخصصة حسب نوع الإعاقة، مع نظام جدولة ذكي وتتبع شامل للجلسات.

### أنواع الإعاقات المدعومة:
- **إعاقة حركية** (Motor Disability)
- **إعاقة بصرية** (Visual Impairment)
- **إعاقة سمعية** (Hearing Impairment)
- **إعاقة ذهنية** (Intellectual Disability)
- **اضطراب تطوري** (Developmental Disorder)
- **اضطراب التواصل** (Communication Disorder)
- **إعاقات متعددة** (Multiple Disabilities)

### مستويات شدة الإعاقة:
- خفيفة (Mild)
- متوسطة (Moderate)
- شديدة (Severe)
- عميقة (Profound)

---

## البنية والمعمارية

### 1. نموذج البرامج المتخصصة (Specialized Programs)

```javascript
SpecializedProgram {
  // المعلومات الأساسية
  name: String,
  code: String,
  description: String,
  disabilityType: String,
  supportedSeverityLevels: [String],
  
  // معلومات الجلسات
  sessionConfig: {
    standardDuration: Number,        // مدة الجلسة (دقائق)
    frequencyPerWeek: Number,        // عدد الجلسات الأسبوعية
    maxConcurrentParticipants: Number
  },
  
  // الأهداف والأنشطة
  programGoals: [{
    title: String,
    category: String,
    measurable: Boolean,
    timeline: Number
  }],
  
  activities: [{
    name: String,
    difficulty: String,
    equipment: [String],
    estimatedDuration: Number
  }],
  
  // الإحصائيات
  statistics: {
    totalBeneficiaries: Number,
    successRate: Number,
    averageOutcomeImprovement: Number
  }
}
```

### 2. نموذج الجلسات المتقدمة (Advanced Sessions)

```javascript
AdvancedSession {
  // معرفات العلاقة
  beneficiaryId: ObjectId,
  programId: ObjectId,
  specialistId: ObjectId,
  
  // معلومات الجلسة
  title: String,
  scheduledDateTime: Date,
  actualStartTime: Date,
  actualEndTime: Date,
  
  // حضور المستفيد
  beneficiaryAttendance: {
    status: String,        // present, absent, late
    remarks: String
  },
  
  // تقييم الأداء
  performanceAssessment: {
    overallEngagement: String,
    progressTowardGoals: String,
    estimatedGoalAttainment: Number
  },
  
  // الأنشطة والملاحظات
  implementedActivities: [{
    name: String,
    completed: Boolean,
    competencyLevel: String,
    modifications: String
  }],
  
  specialistNotes: {
    generalObservations: String,
    strengthsObserved: [String],
    challengesIdentified: [String],
    recommendations: [String],
    homeExercises: [Object]
  }
}
```

### 3. نموذج الجدولة الذكية (Smart Scheduler)

```javascript
SmartScheduler {
  beneficiaryId: ObjectId,
  programId: ObjectId,
  
  // معايير الجدولة
  schedulingCriteria: {
    availableSpecialists: [{
      specialistId: ObjectId,
      availabilitySlots: [Object]
    }],
    beneficiaryNeeds: {
      preferredTimeOfDay: String,
      preferredDays: [Number],
      specialRequirements: [String]
    }
  },
  
  // خطة الجدولة
  schedulingPlan: {
    frequency: String,
    sessionsPerWeek: Number,
    suggestedSchedule: [{
      scheduledDateTime: Date,
      recommendedSpecialist: Object,
      confidenceScore: Number
    }]
  },
  
  // الإحصائيات
  analytics: {
    schedulingEfficiency: Number,
    resourceUtilization: Number,
    specialistUtilization: Number
  }
}
```

---

## المميزات الرئيسية

### 1. إدارة البرامج المتخصصة

- ✅ إنشاء وتحديث برامج متخصصة
- ✅ تصنيف البرامج حسب نوع الإعاقة ومستوى الشدة
- ✅ تحديد معايير الأهلية والقبول
- ✅ تتبع الإحصائيات والنتائج
- ✅ إدارة المواد التعليمية والمعدات

### 2. إدارة الجلسات المتقدمة

- ✅ جدولة الجلسات بسهولة
- ✅ تسجيل الحضور والغياب
- ✅ تقييم الأداء والاستجابة
- ✅ تسجيل تفاصيل الأنشطة المنفذة
- ✅ تدوين الملاحظات والتوصيات
- ✅ توليد تقارير شاملة

### 3. الجدولة الذكية

- ✅ جدولة آلية مع تجنب التعارضات
- ✅ مراعاة توفر الأخصائيين والموارد
- ✅ احترام تفضيلات المستفيد
- ✅ تخصيص مدة الجلسات حسب الاحتياجات
- ✅ توليد مقترحات متعددة مع درجات ثقة
- ✅ تحليلات الكفاءة والاستخدام

### 4. التتبع والمراقبة

- ✅ تتبع تقدم المستفيد
- ✅ مراقبة التزام الجدولة
- ✅ تقارير الأداء الدورية
- ✅ تنبيهات التعارضات والمشاكل

---

## دليل الاستخدام

### إنشاء برنامج متخصص جديد

#### الواجهة الرسومية:

1. انقر على "إضافة برنامج جديد"
2. ملء البيانات:
   - اسم البرنامج
   - كود فريد
   - نوع الإعاقة
   - مستويات الشدة المدعومة
   - معلومات الجلسات
3. انقر "إنشاء"

#### عبر API:

```bash
POST /api/programs
Content-Type: application/json

{
  "name": "برنامج العلاج الطبيعي للإعاقة الحركية",
  "code": "PROG-MOTOR-001",
  "disabilityType": "MOTOR",
  "description": "برنامج متخصص للعلاج الطبيعي",
  "supportedSeverityLevels": ["MILD", "MODERATE"],
  "sessionConfig": {
    "standardDuration": 60,
    "frequencyPerWeek": 2,
    "maxConcurrentParticipants": 1
  },
  "ageGroup": { "min": 5, "max": 18 }
}
```

### جدولة جلسة جديدة

#### الخطوات:

1. اختر المستفيد والبرنامج
2. انقر "إضافة جلسة جديدة"
3. ملء البيانات:
   - اسم الجلسة
   - التاريخ والوقت
   - المدة
   - الأخصائي والموقع
4. انقر "إنشاء"

#### عبر API:

```bash
POST /api/sessions
Content-Type: application/json

{
  "beneficiaryId": "5f7d8e9b0c1a2b3c4d5e6f7g",
  "programId": "5f7d8e9b0c1a2b3c4d5e6f7h",
  "specialistId": "5f7d8e9b0c1a2b3c4d5e6f7i",
  "title": "جلسة العلاج الطبيعي - الأسبوع الأول",
  "scheduledDateTime": "2026-01-25T10:00:00Z",
  "scheduledDuration": 60,
  "location": {
    "roomId": "room-001",
    "roomName": "غرفة العلاج الطبيعي"
  }
}
```

### استخدام الجدولة الذكية

#### إنشاء جدولة ذكية:

```bash
POST /api/scheduler/create-schedule
Content-Type: application/json

{
  "beneficiaryId": "5f7d8e9b0c1a2b3c4d5e6f7g",
  "programId": "5f7d8e9b0c1a2b3c4d5e6f7h",
  "frequency": "weekly",
  "sessionsPerWeek": 2,
  "planDuration": 90
}
```

#### توليد المقترحات:

```bash
POST /api/scheduler/{schedulerId}/generate-suggestions
```

#### الموافقة والتفعيل:

```bash
POST /api/scheduler/{schedulerId}/approve-schedule
POST /api/scheduler/{schedulerId}/activate-schedule
```

---

## API المتوفرة

### البرامج المتخصصة

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| GET | `/api/programs` | جلب جميع البرامج |
| GET | `/api/programs/:id` | جلب تفاصيل برنامج |
| GET | `/api/programs/by-disability/:type` | جلب البرامج حسب النوع |
| POST | `/api/programs` | إنشاء برنامج جديد |
| PUT | `/api/programs/:id` | تحديث برنامج |
| DELETE | `/api/programs/:id` | حذف/أرشفة برنامج |
| POST | `/api/programs/:id/activate` | تفعيل برنامج |
| GET | `/api/programs/:id/statistics` | جلب الإحصائيات |

### الجلسات المتقدمة

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| GET | `/api/sessions` | جلب الجلسات |
| GET | `/api/sessions/:id` | جلب تفاصيل جلسة |
| POST | `/api/sessions` | إنشاء جلسة جديدة |
| PUT | `/api/sessions/:id` | تحديث جلسة |
| POST | `/api/sessions/:id/start` | بدء جلسة |
| POST | `/api/sessions/:id/complete` | إكمال جلسة |
| POST | `/api/sessions/:id/cancel` | إلغاء جلسة |
| POST | `/api/sessions/:id/reschedule` | إعادة جدولة |
| GET | `/api/sessions/:id/report` | جلب تقرير الجلسة |

### الجدولة الذكية

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| POST | `/api/scheduler/create-schedule` | إنشاء جدولة |
| GET | `/api/scheduler/:id` | جلب تفاصيل جدولة |
| POST | `/api/scheduler/:id/generate-suggestions` | توليد المقترحات |
| POST | `/api/scheduler/:id/approve-schedule` | الموافقة على الجدولة |
| POST | `/api/scheduler/:id/activate-schedule` | تفعيل الجدولة |
| GET | `/api/scheduler/:id/conflicts` | الكشف عن التعارضات |
| POST | `/api/scheduler/:id/customize-duration` | تخصيص المدة |
| GET | `/api/scheduler/:id/analytics` | جلب التحليلات |

---

## أمثلة عملية

### مثال 1: إنشاء برنامج ومجموعة جلسات

```javascript
// 1. إنشاء البرنامج
const program = {
  name: 'برنامج تحسين النطق والتواصل',
  code: 'PROG-COMM-001',
  disabilityType: 'COMMUNICATION',
  description: 'برنامج متخصص لاضطرابات التواصل',
  sessionConfig: {
    standardDuration: 45,
    frequencyPerWeek: 3,
    maxConcurrentParticipants: 1
  }
};

// 2. إنشاء جدولة ذكية
const scheduler = {
  beneficiaryId: 'beneficiary123',
  programId: 'program123',
  frequency: 'weekly',
  sessionsPerWeek: 3,
  planDuration: 60
};

// 3. توليد المقترحات
// POST /api/scheduler/{id}/generate-suggestions

// 4. الموافقة والتفعيل
// POST /api/scheduler/{id}/approve-schedule
// POST /api/scheduler/{id}/activate-schedule
```

### مثال 2: إكمال جلسة مع تقييم شامل

```javascript
const sessionCompletion = {
  beneficiaryAttendance: {
    status: 'present',
    arrivalTime: '2026-01-25T10:00:00Z',
    departureTime: '2026-01-25T10:50:00Z',
    remarks: 'حضر المستفيد بنشاط وتفاعل جيد'
  },
  
  implementedActivities: [
    {
      name: 'تمارين النطق الأساسية',
      completed: true,
      competencyLevel: 'supervised',
      modifications: 'تقليل شدة التمارين قليلاً',
      successIndicators: ['نطق واضح', 'تركيز جيد']
    },
    {
      name: 'التطبيق العملي',
      completed: true,
      competencyLevel: 'assisted',
      modifications: 'مساعدة من الأخصائي'
    }
  ],
  
  performanceAssessment: {
    overallEngagement: 'excellent',
    engagement: 'المستفيد أظهر اهتماماً كبيراً',
    motivation: 'high',
    concentration: 'excellent',
    cooperation: 'excellent',
    progressTowardGoals: 'good',
    estimatedGoalAttainment: 75
  },
  
  specialistNotes: {
    generalObservations: 'تطور ملحوظ في مستوى النطق',
    strengthsObserved: ['تركيز عالي', 'تعاون جيد', 'تحسن في الوضوح'],
    challengesIdentified: ['صعوبة في بعض الأصوات', 'إرهاق بعد وقت طويل'],
    recommendations: [
      'زيادة مدة الجلسات تدريجياً',
      'إضافة تمارين منزلية',
      'استخدام الألعاب التفاعلية'
    ],
    homeExercises: [
      {
        exerciseName: 'تمارين التنفس',
        frequency: 'يومياً',
        duration: 10,
        instructions: 'تكرار 5 مرات صباحاً ومساءً'
      }
    ]
  },
  
  usedEquipment: [
    { name: 'مرآة تفاعلية', quantity: 1 },
    { name: 'بطاقات الأصوات', quantity: 1 }
  ]
};

// POST /api/sessions/{sessionId}/complete
```

### مثال 3: جلب التقارير والإحصائيات

```javascript
// جلب إحصائيات البرنامج
GET /api/programs/{programId}/statistics

// الاستجابة:
{
  "success": true,
  "data": {
    "programId": "prog123",
    "programName": "برنامج تحسين النطق والتواصل",
    "statistics": {
      "totalBeneficiaries": 25,
      "totalSessions": 150,
      "successRate": 88,
      "averageOutcomeImprovement": 72
    }
  }
}
```

---

## أفضل الممارسات

### 1. تصميم البرامج
- تحديد أهداف قابلة للقياس
- ربط الأنشطة بالأهداف بشكل واضح
- تقدير مدة معقولة لكل نشاط
- توثيق جميع المتطلبات والمعدات

### 2. جدولة الجلسات
- احترام تفضيلات المستفيد
- ضمان توفر الأخصائي والموارد
- تجنب الجدولة المكثفة المتتالية
- السماح بفترات راحة كافية

### 3. توثيق الجلسات
- ملء الملاحظات بشكل دقيق
- تسجيل الحضور والأداء
- تدوين أي تعديلات أو تحديات
- توصيات واضحة للجلسات القادمة

### 4. المتابعة والتقييم
- مراجعة التقدم بشكل منتظم
- تعديل البرنامج حسب الحاجة
- تواصل مستمر مع الأسرة
- توثيق جميع التحسينات

---

## الإصدارات والتحديثات

**الإصدار 1.0.0** - يناير 2026
- إطلاق النظام الأولي
- البرامج المتخصصة الأساسية
- إدارة الجلسات
- الجدولة الذكية

---

## التواصل والدعم

للاستفسارات والدعم الفني:
- البريد الإلكتروني: support@alawael.com
- الهاتف: +966-XXXX-XXXX
- الموقع: www.alawael.com

---

**آخر تحديث:** 22 يناير 2026
**الإصدار:** 1.0.0
**الحالة:** جاهز للإنتاج ✅

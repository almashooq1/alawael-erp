# الدليل الشامل لبرامج ومقاييس تأهيل ذوي الإعاقة
# Complete Guide to Disability Rehabilitation Metrics and Programs

## 📋 فهرس المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [المقاييس المعيارية](#المقاييس-المعيارية)
3. [خطط التأهيل الفردية](#خطط-التأهيل-الفردية)
4. [برامج التأهيل المتخصصة](#برامج-التأهيل-المتخصصة)
5. [نظام التقييم المستمر](#نظام-التقييم-المستمر)
6. [التكاملات الحكومية](#التكاملات-الحكومية)
7. [واجهات برمجة التطبيقات](#واجهات-برمجة-التطبيقات)

---

## نظرة عامة

### الهدف
توفير نظام متكامل لتأهيل ذوي الإعاقة يتضمن:
- مقاييس تقييم معيارية معتمدة دولياً ومحلياً
- خطط تأهيل فردية قابلة للتخصيص
- برامج تدخل متخصصة
- نظام متابعة وتقييم مستمر

### المكونات الرئيسية

```
┌─────────────────────────────────────────────────────────────────┐
│                    نظام تأهيل ذوي الإعاقة                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  المقاييس       │  │  خطط التأهيل    │  │   البرامج      │ │
│  │  المعيارية     │  │  الفردية        │  │  المتخصصة      │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │          │
│           └────────────────────┼────────────────────┘          │
│                                │                               │
│                    ┌───────────▼───────────┐                   │
│                    │   نظام التقييم        │                   │
│                    │   والمتابعة           │                   │
│                    └───────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## المقاييس المعيارية

### 1. مقاييس الوظائف الحركية

#### مقياس فغنلتر للأداء الحركي (FMS-2024)
```javascript
// استخدام المقياس
const metricsService = new RehabilitationMetricsService();

const assessment = await metricsService.administerMetric('FMS-2024', {
  id: 'BEN-001',
  age: 7,
  region: 'saudi'
}, {
  'التحكم في الرأس': 8,
  'الجلوس': 9,
  'الحبو': 7,
  'الوقوف': 8,
  'المشي': 6,
  'الجري': 5,
  'القفز': 4,
  'صعود الدرج': 5,
  'الإمساك': 7,
  'النقر': 8,
  'الكتابة': 6,
  // ... باقي العناصر
});
```

#### المجالات والمقاييس المتاحة

| المجال | المقياس | العمر | الدرجات |
|--------|---------|-------|---------|
| الحركة الكبرى | FMS-2024 | 0-18 | 0-72 |
| الحركة الدقيقة | FMS-2024 | 0-18 | 0-54 |
| التوازن | FMS-2024 | 0-18 | 0-36 |
| التنسيق | FMS-2024 | 0-18 | 0-27 |

### 2. مقاييس الحياة اليومية

#### مقياس أنشطة الحياة اليومية (ADL-2024)
```javascript
const adlAssessment = await metricsService.administerMetric('ADL-2024', 
  beneficiaryData, 
  {
    'تناول الطعام': 8,
    'الاستحمام': 6,
    'ارتداء الملابس': 7,
    'التنقل': 5,
    'استخدام المرحاض': 8,
    'التحكم في البول والبراز': 9,
    'استخدام الهاتف': 7,
    'التسوق': 4,
    'تحضير الطعام': 3
  }
);
```

#### مستويات التسجيل
| الدرجة | المستوى | الوصف |
|--------|---------|-------|
| 0 | معتمد كلياً | يحتاج مساعدة كاملة |
| 2-4 | مساعدة كبيرة | يحتاج مساعدة في معظم الأنشطة |
| 6-8 | إشراف | يحتاج تذكير أو إشراف |
| 10 | مستقل | يؤدي النشاط بشكل مستقل |

### 3. مقاييس التواصل

#### مقياس التواصل الشامل (CS-2024)
- **الاستقبال والفهم**: 50 درجة
- **التعبير**: 50 درجة
- **الاستخدام الاجتماعي للغة**: 25 درجة
- **التواصل غير اللفظي**: 25 درجة

### 4. مقاييس السلوك التكيفي

#### مقياس فينلاند للسلوك التكيفي (VABS-2024)
```javascript
const vinelandAssessment = await metricsService.administerMetric('VABS-2024',
  beneficiaryData,
  {
    // التواصل
    'الاستقبالية': 25,
    'التعبيرية': 22,
    'الكتابية': 18,
    // المهارات اليومية
    'الشخصية': 30,
    'المنزلية': 25,
    'المجتمعية': 20,
    // التطبيع الاجتماعي
    'العلاقات البينشخصية': 28,
    'اللعب والترفيه': 24,
    'المهارات الاجتماعية': 22
  }
);
```

### 5. مقاييس الذكاء

#### مقياس وكسلر للذكاء (WISC-2024)
| المؤشر | الاختبارات الفرعية |
|--------|-------------------|
| الفهم اللفظي | المتشابهات، المفردات، المعلومات، الفهم |
| الاستدلال الإدراكي | تصميم المكعبات، الرسوم المصورة، المصفوفات |
| الذاكرة العاملة | الأرقام، الحروف والأرقام، الحساب الذهني |
| سرعة المعالجة | الترميز، البحث عن الرموز، الإلغاء |

### 6. مقاييس جودة الحياة

#### مقياس جودة الحياة لذوي الإعاقة (DQOLS-2024)
```javascript
const qolAssessment = await metricsService.administerMetric('DQOLS-2024',
  beneficiaryData,
  {
    // الاستقلالية
    'القرارات اليومية': 20,
    'التنقل': 15,
    'العناية الذاتية': 18,
    // المشاركة
    'المشاركة الاجتماعية': 22,
    'المشاركة التعليمية': 19,
    'المشاركة المهنية': 12,
    // الرفاهية
    'الصحة الجسدية': 25,
    'الصحة النفسية': 20,
    'الرضا العام': 22
  }
);
```

### 7. مقاييس التأهيل المهني

#### مقياس الاستعداد للعمل (WRS-2024)
| البعد | الكفاءات |
|-------|---------|
| المهارات المهنية | التقنية، الحاسوبية، الكتابية، الحسابية |
| المهارات الاجتماعية | التواصل، العمل الجماعي، حل النزاعات |
| إدارة الذات | المواعيد، تنظيم الوقت، المظهر |
| السلوك الوظيفي | الانتباه، اتباع التعليمات، المبادرة |

---

## خطط التأهيل الفردية

### أنواع القوالب المتاحة

#### 1. خطة التأهيل الشاملة
```javascript
const planService = new IndividualizedRehabilitationPlanService();

const comprehensivePlan = await planService.createPlan({
  templateType: 'comprehensive',
  beneficiaryId: 'BEN-001',
  beneficiaryName: 'محمد أحمد',
  dateOfBirth: '2015-05-15',
  disabilityType: 'إعاقة حركية',
  disabilitySeverity: 'متوسط',
  effectiveDate: new Date(),
  coordinator: { id: 'EMP-001', name: 'أ. فاطمة علي' },
  teamMembers: [
    { role: 'معالج طبيعي', id: 'EMP-002' },
    { role: 'معالج وظيفي', id: 'EMP-003' },
    { role: 'أخصائي تخاطب', id: 'EMP-004' }
  ],
  strengths: ['الذاكرة الجيدة', 'الحماس للتعلم'],
  needs: ['تحسين المهارات الحركية الدقيقة', 'تطوير التواصل'],
  priorityNeeds: ['الاستقلالية في الحركة', 'المهارات الاجتماعية']
});
```

#### 2. خطة التربية الخاصة (IEP)
```javascript
const iepPlan = await planService.createPlan({
  templateType: 'educational',
  beneficiaryId: 'BEN-002',
  beneficiaryName: 'سارة محمود',
  dateOfBirth: '2016-03-20',
  disabilityType: 'اضطراب طيف autism',
  effectiveDate: new Date(),
  // ...
});
```

#### 3. خطة التدخل المبكر (IFSP)
- للفئة العمرية: 0-3 سنوات
- تركيز على الأسرة
- مراجعة شهرية

#### 4. خطة التأهيل المهني
- تقييم المهارات المهنية
- تحديد الميول
- التدريب والتوظيف

#### 5. خطة الحياة المستقلة
- مهارات الحياة اليومية
- السكن المستقل
- إدارة الموارد

### بنك الأهداف

#### إضافة هدف من البنك
```javascript
// الحصول على أهداف متاحة
const goals = planService.getGoalsFromBank('motorSkills', 'grossMotor');
// Returns:
// [
//   { code: 'GM-01', description: 'يحافظ على وضعية الجلوس...', criteria: '80% من المحاولات' },
//   { code: 'GM-02', description: 'يمشي لمسافة 10 أمتار...', criteria: '3 من 4 محاولات' },
//   ...
// ]

// تخصيص وإضافة هدف
const goalResult = planService.customizeGoalFromBank(
  planId,
  'GM-02',
  {
    accuracy: 70,
    frequency: '5 من 6 محاولات',
    targetDate: new Date('2024-06-01'),
    priority: 'high',
    baseline: 0,
    target: 100
  }
);
```

#### تصنيف الأهداف
| التصنيف | الوصف | المدة |
|---------|-------|-------|
| طويلة المدى | أهداف استراتيجية | 6-12 شهر |
| قصيرة المدى | أهداف تكتيكية | 1-3 شهر |
| تفصيلية | خطوات إجرائية | 1-4 أسبوع |

### إضافة الخدمات والتدخلات

```javascript
// إضافة خدمة علاج طبيعي
const ptService = planService.addService(planId, {
  type: 'physicalTherapy',
  category: 'primary',
  description: 'جلسات علاج طبيعي لتحسين التوازن والمشي',
  sessionsPerWeek: 3,
  sessionDuration: 45,
  setting: 'مركز التأهيل',
  providerName: 'أ. خالد العتيبي',
  relatedGoals: ['G-123', 'G-124']
});

// إضافة خدمة علاج تخاطب
const stService = planService.addService(planId, {
  type: 'speechTherapy',
  category: 'primary',
  description: 'تطوير مهارات التواصل اللفظي',
  sessionsPerWeek: 2,
  sessionDuration: 30,
  setting: 'مركز التأهيل',
  providerName: 'أ. نورة السالم'
});
```

### تسجيل جلسة خدمة

```javascript
const session = planService.recordServiceSession(planId, serviceId, {
  date: new Date(),
  duration: 45,
  therapist: 'أ. خالد العتيبي',
  present: true,
  late: false,
  activities: [
    'تمارين التوازن على الكرة',
    'تدريب المشي على الشريط',
    'تمارين تقوية العضلات'
  ],
  skillsAddressed: ['التوازن', 'المشي', 'القوة العضلية'],
  engagement: 'high',
  challenges: ['صعوبة في الحفاظ على التوازن'],
  successes: ['تحسن في المشي لمسافة 5 أمتار'],
  homeActivities: ['تمارين التوازن اليومية'],
  nextSessionFocus: 'زيادة مسافة المشي'
});
```

### تتبع التقدم

```javascript
// تحديث تقدم هدف
const progressUpdate = planService.updateGoalProgress(planId, goalId, {
  value: 65,
  method: 'ملاحظة مباشرة',
  observer: 'أ. خالد العتيبي',
  context: 'جلسة العلاج الطبيعي',
  notes: 'تحسن ملحوظ في الحفاظ على التوازن'
});

// تقرير التقدم
const report = planService.generateProgressReport(planId, {
  type: 'quarterly',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-31')
});
```

---

## برامج التأهيل المتخصصة

### 1. برامج التدخل المبكر

#### برنامج التدخل المبكر الشامل
```javascript
// الفئة العمرية: 0-3 سنوات
const earlyInterventionProgram = {
  components: [
    'العلاج الطبيعي',
    'العلاج الوظيفي',
    'علاج التخاطب',
    'التدخل السلوكي',
    'دعم الأسرة'
  ],
  frequency: '2-5 جلسات أسبوعياً',
  setting: ['منزلي', 'مجتمعي', 'مركزي'],
  familyInvolvement: 'مطلوب'
};
```

### 2. برامج التأهيل المهني

#### برنامج التوظيف المدعوم
```javascript
const supportedEmploymentProgram = {
  phases: [
    {
      name: 'التقييم المهني',
      duration: '2-4 أسابيع',
      activities: ['تقييم المهارات', 'تحديد الميول', 'تحليل القدرات']
    },
    {
      name: 'التدريب',
      duration: '4-12 أسبوع',
      activities: ['تدريب مهاري', 'تدريب سلوكي', 'تدريب اجتماعي']
    },
    {
      name: 'البحث عن عمل',
      duration: '4-8 أسابيع',
      activities: ['إعداد السيرة', 'التدريب على المقابلات', 'التواصل مع أصحاب العمل']
    },
    {
      name: 'الدعم المستمر',
      duration: 'مستمر',
      activities: ['متابعة أسبوعية', 'حل المشكلات', 'التطوير المستمر']
    }
  ]
};
```

### 3. برامج التأهيل التعليمي

#### برنامج الدمج التعليمي
```javascript
const inclusionProgram = {
  accommodations: [
    'تكييف المنهج الدراسي',
    'وقت إضافي للاختبارات',
    'وسائل تعليمية بديلة',
    'مساعد تربوي متخصص'
  ],
  supportServices: [
    'غرفة مصادر',
    'خدمات التخاطب',
    'العلاج الوظيفي',
    'الإرشاد النفسي'
  ]
};
```

### 4. برامج الحياة المستقلة

```javascript
const independentLivingProgram = {
  domains: {
    selfCare: ['النظافة الشخصية', 'ارتداء الملابس', 'تناول الطعام'],
    homeManagement: ['التنظيف', 'الطبخ', 'الغسيل'],
    financialLiteracy: ['إدارة المال', 'الميزانية', 'الادخار'],
    communitySkills: ['التسوق', 'المواصلات', 'الخدمات الحكومية'],
    socialSkills: ['بناء العلاقات', 'التواصل', 'حل المشكلات']
  },
  trainingApproach: {
    method: 'التدريب في البيئة الطبيعية',
    duration: '6-18 شهر',
    support: 'دعم متناقص تدريجياً'
  }
};
```

---

## نظام التقييم المستمر

### جدول التقييمات

| نوع التقييم | التكرار | المسؤول |
|-------------|---------|---------|
| تقييم أولي | عند القبول | الفريق المتعدد التخصصات |
| تقييم شهري | شهرياً | المعالج الرئيسي |
| تقييم ربع سنوي | كل 3 أشهر | الفريق المتعدد التخصصات |
| تقييم سنوي | سنوياً | الفريق المتعدد التخصصات + الأسرة |
| تقييم قبل الانتقال | عند الانتقال | الفريق المتعدد التخصصات |

### مؤشرات الأداء الرئيسية (KPIs)

```javascript
const rehabilitationKPIs = {
  beneficiary: {
    goalAchievementRate: 'نسبة تحقيق الأهداف',
    attendanceRate: 'نسبة الحضور',
    progressRate: 'معدل التقدم',
    satisfactionScore: 'درجة الرضا'
  },
  program: {
    completionRate: 'نسبة إتمام البرنامج',
    successRate: 'نسبة النجاح',
    transitionRate: 'نسبة الانتقال الناجح',
    employmentRate: 'نسبة التوظيف (للتأهيل المهني)'
  },
  center: {
    capacityUtilization: 'نسبة استغلال الطاقة',
    averageWaitTime: 'متوسط وقت الانتظار',
    staffToBeneficiaryRatio: 'نسبة الموظفين للمستفيدين',
    costPerBeneficiary: 'التكلفة لكل مستفيد'
  }
};
```

---

## التكاملات الحكومية

### التكامل مع وزارة الموارد البشرية

```javascript
const hrsdIntegration = {
  services: [
    'تسجيل ذوي الإعاقة',
    'إصدار بطاقات الإعاقة',
    'صرف الإعانات',
    'برامج التأهيل المهني'
  ],
  endpoints: {
    registration: '/api/hrsd/disability/register',
    benefits: '/api/hrsd/disability/benefits',
    employment: '/api/hrsd/disability/employment'
  }
};
```

### التكامل مع وزارة الصحة

```javascript
const mohIntegration = {
  services: [
    'استيراد التقارير الطبية',
    'التاريخ الصحي الموحد',
    'وصفات العلاج',
    'التكامل مع نظام صحة'
  ]
};
```

---

## واجهات برمجة التطبيقات

### API المقاييس

```http
POST /api/rehabilitation/metrics/assess
Content-Type: application/json

{
  "metricId": "FMS-2024",
  "beneficiaryId": "BEN-001",
  "responses": {
    "التحكم في الرأس": 8,
    "الجلوس": 9
  }
}
```

### API خطط التأهيل

```http
POST /api/rehabilitation/plans
GET /api/rehabilitation/plans/:planId
PUT /api/rehabilitation/plans/:planId/goals
POST /api/rehabilitation/plans/:planId/services
GET /api/rehabilitation/plans/:planId/reports
```

### API التقارير

```http
GET /api/rehabilitation/reports/progress/:planId?type=quarterly
GET /api/rehabilitation/reports/assessment/:assessmentId
```

---

## الخلاصة

تم تطوير نظام شامل ومتكامل لبرامج ومقاييس تأهيل ذوي الإعاقة يتضمن:

### ✅ ما تم إنجازه:
1. **خدمة المقاييس المعيارية** (`rehabilitation-metrics-service.js`)
   - 9 فئات من المقاييس المعتمدة
   - بيانات معيارية سعودية
   - نظام تسجيل متقدم
   - تفسير آلي للنتائج

2. **نظام خطط التأهيل الفردية** (`individualized-rehabilitation-plan-service.js`)
   - 5 قوالب خطط متخصصة
   - بنك أهداف من 6 مجالات
   - 6 استراتيجيات تدخل
   - نظام متابعة وتقييم شامل

3. **التوثيق الشامل**
   - أدلة استخدام مفصلة
   - أمثلة برمجية
   - واجهات API

### 📁 الملفات المنشأة:
- `backend/rehabilitation-services/rehabilitation-metrics-service.js`
- `backend/rehabilitation-services/individualized-rehabilitation-plan-service.js`
- `docs/REHABILITATION_METRICS_AND_PROGRAMS_COMPLETE_GUIDE.md`

---

*تم إعداد هذا الدليل كجزء من نظام الألايل لتأهيل ذوي الإعاقة*
*التاريخ: فبراير 2026*
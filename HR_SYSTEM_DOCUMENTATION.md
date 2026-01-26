# 📋 نظام إدارة الموارد البشرية المتخصص

## الدليل الشامل والتوثيق

---

## 📑 جدول المحتويات

1. [النظرة العامة](#النظرة-العامة)
2. [المميزات الرئيسية](#المميزات-الرئيسية)
3. [البنية التحتية](#البنية-التحتية)
4. [قواعد البيانات](#قواعد-البيانات)
5. [واجهات برمجية](#واجهات-برمجية)
6. [المكونات](#المكونات)
7. [أمثلة الاستخدام](#أمثلة-الاستخدام)

---

## 🎯 النظرة العامة

نظام HR متقدم يوفر إدارة شاملة للموارد البشرية تتضمن:

- ملفات موظفين متقدمة
- نظام تقييمات متعدد الأبعاد
- تخطيط التعاقب الوظيفي
- برامج التطوير الفردية

---

## ✨ المميزات الرئيسية

### 1️⃣ ملفات الموظفين المتقدمة

```
✅ المعلومات الشخصية والوظيفية
✅ السجل المهني الشامل
✅ المؤهلات والشهادات
✅ الدورات التدريبية
✅ التخصصات والمهارات
✅ الخبرات السابقة
✅ إدارة الوثائق
```

### 2️⃣ نظام التقييمات المتعدد الأبعاد

```
تقييمات من 4 جهات مختلفة:
├── تقييم من الإدارة (40% وزن)
├── تقييمات من الزملاء (30% وزن)
├── تقييمات من المستفيدين (20% وزن)
└── التقييم الذاتي (10% وزن)

معايير التقييم:
├── المهارات التقنية
├── المهارات اللينة
├── القيادة
├── العمل الجماعي
├── التواصل
├── الإنتاجية
├── جودة العمل
├── الموثوقية
├── الابتكار
└── خدمة العملاء
```

### 3️⃣ تخطيط التعاقب الوظيفي

```
✅ تحديد الكفاءات المطلوبة
✅ اختيار مرشحي الخلافة
✅ تقييم الجاهزية (%)
✅ خطط التطوير الفردية
✅ برامج الإعداد القيادي
✅ برامج التوجيه الفردي
✅ تقييم مؤشرات المخاطر
```

### 4️⃣ خطط التطوير الفردية

```
✅ أهداف تنموية محددة
✅ دورات تدريبية مخطط لها
✅ مسؤوليات إضافية
✅ متابعة دورية
✅ حساب نسبة التقدم
✅ توصيات التحسين
```

---

## 🏗️ البنية التحتية

### نماذج قاعدة البيانات (Models)

#### 1. EmployeeProfile

```javascript
{
  userId: ObjectId,
  personalInfo: {
    firstName, lastName, dateOfBirth, nationality,
    nationalId, email, phone, address, emergencyContact
  },
  jobInfo: {
    department, position, employmentType, joinDate,
    reportingTo, salary, workLocation
  },
  professionalRecord: {
    qualifications: [],      // المؤهلات
    certifications: [],      // الشهادات
    licenses: [],           // التراخيص
    trainingCourses: [],    // الدورات
    specializations: [],    // التخصصات
    workExperience: []      // الخبرات
  },
  skills: {
    technical: [],
    softSkills: [],
    languages: []
  },
  documents: {},
  status: 'active|inactive|on_leave|terminated'
}
```

#### 2. PerformanceEvaluation

```javascript
{
  employeeId: ObjectId,
  evaluationPeriod: {
    startDate, endDate
  },
  evaluations: {
    managementEvaluation: {},
    peerEvaluations: [],
    recipientEvaluations: [],
    selfEvaluation: {}
  },
  summary: {
    weightedScores: {
      management: 4.5,
      peers: 4.2,
      recipients: 4.0,
      self: 4.3
    },
    overallScore: 4.25,
    overallRating: 'ممتاز|جيد جداً|جيد|مقبول|ضعيف',
    promotionRecommended: Boolean,
    salaryAdjustmentPercentage: Number
  }
}
```

#### 3. SuccessionPlan

```javascript
{
  positionId: String,
  positionTitle: String,
  currentHolder: ObjectId,
  requiredCompetencies: [],
  successors: [
    {
      candidateId: ObjectId,
      readinessLevel: 'ready_now|ready_1_year|ready_3_years|developing',
      readinessPercentage: Number,
      keyStrengths: [],
      developmentNeeds: [],
      developmentPlan: ObjectId
    }
  ],
  riskLevel: 'critical|high|medium|low',
  leadershipProgram: {},
  mentorshipProgram: {},
  status: 'draft|active|completed|archived'
}
```

#### 4. DevelopmentPlan

```javascript
{
  employeeId: ObjectId,
  developmentGoals: [
    {
      goal: String,
      category: 'technical|leadership|soft_skills|...',
      targetDate: Date,
      status: 'not_started|in_progress|completed|on_hold',
      completionPercentage: Number
    }
  ],
  plannedTrainings: [],
  expandedResponsibilities: [],
  reviewNotes: [],
  progress: {
    goalsCompletion: Number,
    trainingsCompletion: Number,
    responsibilitiesCompletion: Number,
    overallProgress: Number
  }
}
```

---

## 🔌 واجهات برمجية (APIs)

### Employee Profile APIs

#### 1. الحصول على ملف الموظف

```http
GET /api/hr/employees/:employeeId
Header: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": { /* EmployeeProfile */ }
}
```

#### 2. إنشاء ملف جديد

```http
POST /api/hr/employees/create
Header: Authorization: Bearer {token}
Body: {
  "userId": "...",
  "personalInfo": {},
  "jobInfo": {}
}
```

#### 3. إضافة مؤهل علمي

```http
POST /api/hr/employees/:employeeId/add-qualification
Header: Authorization: Bearer {token}
Body: {
  "degree": "بكالوريوس",
  "field": "علوم الحاسوب",
  "institution": "جامعة ...",
  "graduationDate": "2020-06-15",
  "gpa": 3.8
}
```

#### 4. إضافة شهادة مهنية

```http
POST /api/hr/employees/:employeeId/add-certification
Header: Authorization: Bearer {token}
Body: {
  "name": "شهادة ...",
  "issuingOrganization": "...",
  "issueDate": "2023-01-15",
  "expiryDate": "2025-01-15",
  "credentialId": "..."
}
```

#### 5. إضافة دورة تدريبية

```http
POST /api/hr/employees/:employeeId/add-training
Header: Authorization: Bearer {token}
Body: {
  "courseTitle": "...",
  "provider": "...",
  "startDate": "2024-01-15",
  "endDate": "2024-02-15",
  "duration": 40,
  "rating": 4.5
}
```

#### 6. البحث عن الموظفين

```http
GET /api/hr/employees/search/profiles?department=IT&status=active
Header: Authorization: Bearer {token}

Response:
{
  "success": true,
  "count": 25,
  "data": []
}
```

### Performance Evaluation APIs

#### 1. إنشاء دورة تقييم

```http
POST /api/performance/create
Header: Authorization: Bearer {token}
Body: {
  "employeeId": "...",
  "evaluationPeriod": {
    "startDate": "2024-01-01",
    "endDate": "2024-03-31"
  }
}
```

#### 2. إضافة تقييم من الإدارة

```http
POST /api/performance/:evaluationId/management-evaluation
Header: Authorization: Bearer {token}
Body: {
  "score": 4.5,
  "scores": [
    { "criteriaName": "المهارات التقنية", "score": 5 },
    { "criteriaName": "القيادة", "score": 4 }
  ],
  "comments": "...",
  "strengths": ["..."],
  "areasForImprovement": ["..."],
  "recommendations": "..."
}
```

#### 3. إضافة تقييم من الزملاء

```http
POST /api/performance/:evaluationId/peer-evaluation
Header: Authorization: Bearer {token}
Body: { /* نفس الهيكل أعلاه */ }
```

#### 4. إضافة تقييم من المستفيدين

```http
POST /api/performance/:evaluationId/recipient-evaluation
Header: Authorization: Bearer {token}
Body: { /* نفس الهيكل أعلاه */ }
```

#### 5. إضافة التقييم الذاتي

```http
POST /api/performance/:evaluationId/self-evaluation
Header: Authorization: Bearer {token}
Body: { /* نفس الهيكل أعلاه */ }
```

#### 6. إكمال وإقرار التقييم

```http
PUT /api/performance/:evaluationId/finalize
Header: Authorization: Bearer {token}
Body: {
  "executiveSummary": "...",
  "keyAchievements": ["..."],
  "mainChallenges": ["..."],
  "trainingNeeds": ["..."],
  "promotionRecommended": true,
  "salaryAdjustmentPercentage": 5
}
```

#### 7. الحصول على التقييمات

```http
GET /api/performance/:evaluationId
GET /api/performance/employee/:employeeId
Header: Authorization: Bearer {token}
```

#### 8. تقارير التقييمات

```http
GET /api/performance/reports/statistics?period=Q1-2024
Header: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "totalEvaluations": 45,
    "averageScore": 4.1,
    "ratingDistribution": {
      "excellent": 15,
      "veryGood": 20,
      "good": 8,
      "acceptable": 2,
      "poor": 0
    },
    "promotionRecommendations": 12,
    "trainingNeeded": 18
  }
}
```

### Succession Planning APIs

#### 1. إنشاء خطة تعاقب

```http
POST /api/succession/create
Header: Authorization: Bearer {token}
Body: {
  "positionId": "IT-001",
  "positionTitle": "مدير تقنية المعلومات",
  "department": "IT",
  "currentHolder": "...",
  "requiredCompetencies": [
    {
      "competency": "إدارة الفريق",
      "proficiencyLevel": "advanced",
      "criticality": "critical"
    }
  ]
}
```

#### 2. إضافة مرشح خلافة

```http
POST /api/succession/:planId/add-successor
Header: Authorization: Bearer {token}
Body: {
  "candidateId": "...",
  "readinessLevel": "ready_1_year",
  "readinessPercentage": 75,
  "keyStrengths": ["...", "..."],
  "developmentNeeds": ["..."],
  "assessmentComments": "..."
}
```

#### 3. إنشاء خطة تطوير فردية

```http
POST /api/succession/:planId/create-development-plan/:successorId
Header: Authorization: Bearer {token}
Body: {
  "developmentGoals": [
    {
      "goal": "تحسين مهارات القيادة",
      "category": "leadership",
      "targetDate": "2024-12-31",
      "priority": "high"
    }
  ],
  "plannedTrainings": [],
  "expandedResponsibilities": []
}
```

#### 4. الحصول على خطة التعاقب

```http
GET /api/succession/:planId
GET /api/succession/position/:positionId/plans
Header: Authorization: Bearer {token}
```

#### 5. تقارير المخاطر

```http
GET /api/succession/reports/risk-assessment
Header: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "totalPositions": 25,
    "criticalRisk": 2,
    "highRisk": 5,
    "mediumRisk": 10,
    "lowRisk": 8,
    "noSuccessors": 3,
    "readySuccessors": 15
  }
}
```

---

## 📦 المكونات (Components)

### 1. HRDashboard.jsx

```
لوحة التحكم الرئيسية
├── الإحصائيات العامة
├── جدول الموظفين
├── عرض ملفات الموظفين
└── الإجراءات السريعة
```

### 2. EmployeeProfileManager.jsx

```
إدارة ملفات الموظفين
├── المؤهلات العلمية
├── الشهادات المهنية
├── الدورات التدريبية
├── الخبرات السابقة
└── المهارات
```

### 3. PerformanceEvaluation.jsx

```
نظام التقييمات
├── تقييم الإدارة
├── تقييمات الزملاء
├── تقييمات المستفيدين
├── التقييم الذاتي
└── الملخص والنتائج
```

### 4. SuccessionPlanning.jsx

```
تخطيط التعاقب الوظيفي
├── مرشحو الخلافة
├── الكفاءات المطلوبة
├── برامج التطوير
└── تقييم المخاطر
```

---

## 🚀 أمثلة الاستخدام

### مثال 1: إضافة موظف جديد وتكوين ملفه

```javascript
// 1. إنشاء الملف الأساسي
const profile = await axios.post('/api/hr/employees/create', {
  userId: '507f1f77bcf86cd799439011',
  personalInfo: {
    firstName: 'أحمد',
    lastName: 'محمد',
    email: 'ahmed@company.com',
    phone: '+966501234567',
  },
  jobInfo: {
    department: 'تقنية المعلومات',
    position: 'مهندس برمجيات',
    employmentType: 'دائم',
    joinDate: new Date(),
    salary: 5000,
  },
});

// 2. إضافة المؤهلات
await axios.post(`/api/hr/employees/${userId}/add-qualification`, {
  degree: 'بكالوريوس',
  field: 'علوم الحاسوب',
  institution: 'جامعة الملك سعود',
  graduationDate: '2020-06-15',
  gpa: 3.8,
});

// 3. إضافة الشهادات
await axios.post(`/api/hr/employees/${userId}/add-certification`, {
  name: 'AWS Solutions Architect',
  issuingOrganization: 'Amazon',
  issueDate: '2023-01-15',
  expiryDate: '2025-01-15',
});

// 4. إضافة الدورات
await axios.post(`/api/hr/employees/${userId}/add-training`, {
  courseTitle: 'Advanced JavaScript',
  provider: 'Udemy',
  startDate: '2024-01-01',
  endDate: '2024-02-01',
  duration: 40,
});
```

### مثال 2: إجراء تقييم شامل

```javascript
// 1. إنشاء دورة تقييم
const evaluation = await axios.post('/api/performance/create', {
  employeeId: '507f1f77bcf86cd799439011',
  evaluationPeriod: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
  },
});

// 2. تقييم الإدارة
await axios.post(`/api/performance/${evaluation.id}/management-evaluation`, {
  score: 4.5,
  scores: [
    { criteriaName: 'المهارات التقنية', score: 5 },
    { criteriaName: 'القيادة', score: 4 },
    { criteriaName: 'الاتصال', score: 4.5 },
  ],
  comments: 'أداء ممتاز',
  strengths: ['إتقان تقني عالي', 'قيادة فعالة'],
  areasForImprovement: ['التواصل مع الفريق'],
  recommendations: 'ترقية للمنصب التالي',
});

// 3. تقييمات الزملاء (من 3 زملاء مثلاً)
for (let i = 0; i < 3; i++) {
  await axios.post(`/api/performance/${evaluation.id}/peer-evaluation`, {
    score: 4 + Math.random() * 0.5,
    scores: [
      /* ... */
    ],
    comments: 'زميل متعاون وموثوق',
  });
}

// 4. إكمال التقييم
await axios.put(`/api/performance/${evaluation.id}/finalize`, {
  executiveSummary: 'موظف متميز',
  keyAchievements: ['إنجاز المشاريع في الموعد', 'نقل المعرفة للفريق'],
  trainingNeeds: ['مهارات القيادة المتقدمة'],
  promotionRecommended: true,
  salaryAdjustmentPercentage: 10,
});
```

### مثال 3: تخطيط التعاقب الوظيفي

```javascript
// 1. إنشاء خطة تعاقب
const plan = await axios.post('/api/succession/create', {
  positionId: 'IT-001',
  positionTitle: 'مدير تقنية المعلومات',
  department: 'IT',
  currentHolder: '507f1f77bcf86cd799439011',
  requiredCompetencies: [
    {
      competency: 'إدارة الفريق',
      proficiencyLevel: 'advanced',
      criticality: 'critical',
    },
  ],
});

// 2. إضافة مرشحي الخلافة
const candidates = [
  { id: '111', readiness: 'ready_now', percentage: 90 },
  { id: '222', readiness: 'ready_1_year', percentage: 75 },
  { id: '333', readiness: 'ready_3_years', percentage: 60 },
];

for (const candidate of candidates) {
  await axios.post(`/api/succession/${plan.id}/add-successor`, {
    candidateId: candidate.id,
    readinessLevel: candidate.readiness,
    readinessPercentage: candidate.percentage,
    keyStrengths: ['القيادة', 'التواصل'],
    developmentNeeds: ['الخبرة الإدارية'],
  });
}

// 3. إنشاء خطة تطوير للمرشح الأساسي
await axios.post(`/api/succession/${plan.id}/create-development-plan/222`, {
  developmentGoals: [
    {
      goal: 'تطوير مهارات القيادة',
      category: 'leadership',
      targetDate: '2024-12-31',
      priority: 'high',
    },
  ],
  plannedTrainings: [
    {
      trainingTitle: 'برنامج الإدارة العليا',
      provider: 'معهد الإدارة',
      startDate: '2024-02-01',
      duration: 100,
    },
  ],
});
```

---

## 📊 التقارير المتاحة

### 1. تقرير التقييمات

- إجمالي التقييمات المكتملة
- متوسط الأداء
- توزيع التقييمات (ممتاز، جيد جداً، جيد، مقبول، ضعيف)
- عدد الترقيات الموصى بها
- احتياجات التدريب

### 2. تقرير التعاقب الوظيفي

- أفضل مرشحي الخلافة
- مستويات الجاهزية
- المراكز الحرجة
- معدل الخطر

### 3. تقرير تطوير الموظفين

- نسب التقدم في الأهداف
- الدورات المكتملة
- التطورات في المهارات

---

## ⚙️ التثبيت والإعداد

### 1. تثبيت الـ Backend

```bash
cd backend
npm install
# قم بتضمين الملفات الجديدة:
# - routes/employeeProfile.js
# - routes/performanceEvaluation.js
# - routes/successionPlanning.js
# - models/EmployeeProfile.js
# - models/PerformanceEvaluation.js
# - models/SuccessionPlan.js
# - models/DevelopmentPlan.js

npm start
```

### 2. تثبيت الـ Frontend

```bash
cd frontend
npm install

# قم بتضمين المكونات الجديدة:
# - src/components/HR/HRDashboard.jsx
# - src/components/HR/EmployeeProfileManager.jsx
# - src/components/HR/PerformanceEvaluation.jsx
# - src/components/HR/SuccessionPlanning.jsx

npm start
```

---

## ✅ الخلاصة

يوفر هذا النظام حلاً شاملاً لإدارة الموارد البشرية يشمل:

✨ **ملفات موظفين متقدمة** - إدارة السجل المهني الشامل 🌟 **تقييمات متعددة
الأبعاد** - تقييم موضوعي من جهات متعددة 🚀 **تخطيط التعاقب** - ضمان استمرارية
القيادة والكفاءات 📈 **خطط التطوير** - تنمية الكفاءات والمهارات

---

**آخر تحديث:** يناير 2025 **الإصدار:** 2.0.0

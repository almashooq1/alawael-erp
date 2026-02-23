# نظام إدارة مراكز تأهيل ذوي الإعاقة الشامل
# Comprehensive Rehabilitation Center Management System

## نظرة عامة | Overview

تم تطوير مجموعة متكاملة من الأنظمة لإدارة مراكز تأهيل ذوي الإعاقة بشكل شامل واحترافي.

---

## الأنظمة المُطوّرة | Developed Systems

### 1. نظام التقييم والتشخيص المتقدم
### Advanced Assessment and Diagnosis System

**النماذج:**
- `AssessmentTool` - أدوات التقييم المعتمدة
- `BeneficiaryAssessment` - تقييمات المستفيدين

**الميزات:**
- إدارة أدوات التقييم المعتمدة (قائمة، محكية، سلوكية، إلخ)
- تسجيل نتائج التقييم حسب المجالات
- تحديد نقاط القوة والاحتياجات
- التشخيص باستخدام ICD-10 و DSM-5
- نظام الموافقات من الأوصياء والمشرفين
- إدارة محاضر الاجتماعات

**API Endpoints:**
```
GET    /api/rehabilitation/assessment-tools     - قائمة أدوات التقييم
POST   /api/rehabilitation/assessment-tools     - إنشاء أداة جديدة
GET    /api/rehabilitation/assessment-tools/:id - تفاصيل أداة
PUT    /api/rehabilitation/assessment-tools/:id - تحديث أداة

GET    /api/rehabilitation/assessments          - قائمة التقييمات
POST   /api/rehabilitation/assessments          - إنشاء تقييم
GET    /api/rehabilitation/assessments/:id      - تفاصيل تقييم
PUT    /api/rehabilitation/assessments/:id      - تحديث تقييم
POST   /api/rehabilitation/assessments/:id/approve - الموافقة على تقييم
```

---

### 2. نظام الخطط العلاجية الفردية (ITP)
### Individualized Treatment Plans System

**النموذج:** `IndividualizedPlan`

**الميزات:**
- خطط تعليمية فردية (IEP)
- خطط خدمة فردية (ISP)
- خطط التدخل السلوكي (BIP)
- خطط الانتقال
- إدارة الفريق متعدد التخصصات
- أهداف طويلة وقصيرة المدى
- متابعة تقدم الأهداف
- خدمات الدعم المتعددة
- التعديلات والتكييفات
- خطة الطوارئ
- مشاركة الأسرة
- مراجعات الخطة الدورية

**API Endpoints:**
```
GET    /api/rehabilitation/plans                    - قائمة الخطط
POST   /api/rehabilitation/plans                    - إنشاء خطة
GET    /api/rehabilitation/plans/:id                - تفاصيل خطة
PUT    /api/rehabilitation/plans/:id                - تحديث خطة
POST   /api/rehabilitation/plans/:id/goals/short-term - إضافة هدف
PUT    /api/rehabilitation/plans/:id/goals/:goalId/progress - تحديث تقدم
```

---

### 3. نظام الجلسات الجماعية
### Group Sessions Management System

**النموذج:** `GroupSession`

**الميزات:**
- أنواع متعددة من المجموعات (اجتماعية، تواصل، سلوكية، إلخ)
- إدارة المشاركين وقائمة الانتظار
- جدولة المجموعات
- تسجيل حضور الجلسات
- تقييم فعالية المجموعة
- منهج وأنشطة المجموعة

**API Endpoints:**
```
GET    /api/rehabilitation/groups                   - قائمة المجموعات
POST   /api/rehabilitation/groups                   - إنشاء مجموعة
GET    /api/rehabilitation/groups/:id               - تفاصيل مجموعة
POST   /api/rehabilitation/groups/:id/participants  - إضافة مشارك
POST   /api/rehabilitation/groups/:id/sessions      - إضافة جلسة
```

---

### 4. نظام رضا المستفيدين
### Beneficiary Satisfaction System

**النماذج:**
- `SatisfactionSurvey` - استطلاعات الرضا
- `SurveyResponse` - الردود على الاستطلاعات

**الميزات:**
- أنواع متعددة من الاستطلاعات
- أسئلة متنوعة (تقييم، اختيار متعدد، مفتوحة)
- استهداف فئات مختلفة
- نظام الشكاوى
- تحليل النتائج

**API Endpoints:**
```
GET    /api/rehabilitation/surveys                  - قائمة الاستطلاعات
POST   /api/rehabilitation/surveys                  - إنشاء استطلاع
POST   /api/rehabilitation/surveys/:id/respond      - إرسال رد
```

---

### 5. نظام التحويلات والتوجيه
### Referral and Routing System

**النموذج:** `Referral`

**الميزات:**
- مصادر تحويل متعددة
- التقييم الأولي للقبول
- إدارة حالة التحويل
- التحويلات الخارجية
- متابعة التحويلات

**API Endpoints:**
```
GET    /api/rehabilitation/referrals                - قائمة التحويلات
POST   /api/rehabilitation/referrals                - إنشاء تحويل
PUT    /api/rehabilitation/referrals/:id/accept     - قبول/رفض تحويل
```

---

### 6. نظام الجدولة الذكية
### Smart Scheduling System

**النموذج:** `Schedule`

**الميزات:**
- جدولة المواعيد الفردية والجماعية
- كشف التعارضات
- المواعيد المتكررة
- نظام التنبيهات
- تسجيل الحضور والانصراف
- إعادة الجدولة

**API Endpoints:**
```
GET    /api/rehabilitation/schedules                - قائمة المواعيد
POST   /api/rehabilitation/schedules                - إنشاء موعد
PUT    /api/rehabilitation/schedules/:id/status     - تحديث حالة
POST   /api/rehabilitation/schedules/:id/check-in   - تسجيل حضور
POST   /api/rehabilitation/schedules/:id/check-out  - تسجيل انصراف
```

---

### 7. نظام إدارة الأجهزة والمعدات المساعدة
### Assistive Equipment Management System

**النموذج:** `AssistiveEquipment`

**الميزات:**
- تصنيف المعدات (حركية، تواصل، حسية، إلخ)
- إدارة المخزون والموقع
- إسناد المعدات للمستفيدين
- سجل الإعارة
- سجل الصيانة
- حجز المعدات

**API Endpoints:**
```
GET    /api/rehabilitation/equipment                - قائمة المعدات
POST   /api/rehabilitation/equipment                - إضافة معدة
PUT    /api/rehabilitation/equipment/:id/assign     - إسناد معدة
```

---

### 8. نظام التواصل مع الأسرة
### Family Communication Portal System

**النموذج:** `FamilyCommunication`

**الميزات:**
- أنواع متعددة من الرسائل
- إرسال لأولياء الأمور
- تتبع حالة التسليم والقراءة
- الردود من أولياء الأمور
- المرفقات
- نظام المتابعة

**API Endpoints:**
```
GET    /api/rehabilitation/communications           - قائمة الرسائل
POST   /api/rehabilitation/communications           - إرسال رسالة
```

---

### 9. نظام إدارة الانتظار
### Waitlist Management System

**النموذج:** `Waitlist`

**الميزات:**
- تسجيل في قائمة الانتظار
- حساب درجة الأولوية
- تقديم عروض الخدمة
- متابعة جهات الاتصال
- إحصائيات الانتظار

**API Endpoints:**
```
GET    /api/rehabilitation/waitlist                 - قائمة الانتظار
POST   /api/rehabilitation/waitlist                 - إضافة لقائمة الانتظار
PUT    /api/rehabilitation/waitlist/:id/offer       - تقديم عرض
```

---

### 10. نظام التقارير المتقدم
### Advanced Reporting System

**النماذج:**
- `ReportTemplate` - قوالب التقارير
- `GeneratedReport` - التقارير المُولّدة

**الميزات:**
- قوالب تقارير قابلة للتخصيص
- توليد تقارير PDF/Excel/Word
- مشاركة التقارير
- أرشفة التقارير

**API Endpoints:**
```
GET    /api/rehabilitation/reports/templates        - قائمة القوالب
POST   /api/rehabilitation/reports/templates        - إنشاء قالب
POST   /api/rehabilitation/reports/generate         - توليد تقرير
GET    /api/rehabilitation/reports                  - قائمة التقارير
```

---

### 11. الإحصائيات والتقارير العامة
### Statistics and Overview

**API Endpoint:**
```
GET    /api/rehabilitation/statistics/overview      - إحصائيات عامة
```

**البيانات المتوفرة:**
- إجمالي التقييمات
- الخطط العلاجية النشطة
- المجموعات النشطة
- التحويلات المعلقة
- قائمة الانتظار
- مواعيد اليوم

---

## التثبيت والتشغيل | Installation & Setup

### 1. تثبيت التبعيات
```bash
npm install
```

### 2. إضافة المسارات للخادم الرئيسي
في ملف `backend/app.js` أو `backend/server.js`:

```javascript
const rehabilitationRoutes = require('./routes/rehabilitation-center.routes');
app.use('/api/rehabilitation', rehabilitationRoutes);
```

### 3. تشغيل الخادم
```bash
npm run dev
```

---

## هيكل قاعدة البيانات | Database Schema

### المجموعات (Collections):
- `assessmenttools` - أدوات التقييم
- `beneficiaryassessments` - تقييمات المستفيدين
- `individualizedplans` - الخطط العلاجية
- `groupsessions` - الجلسات الجماعية
- `satisfactionsurveys` - استطلاعات الرضا
- `surveyresponses` - ردود الاستطلاعات
- `referrals` - التحويلات
- `schedules` - الجدولة
- `assistiveequipments` - المعدات
- `familycommunications` - التواصل الأسري
- `waitlists` - قوائم الانتظار
- `reporttemplates` - قوالب التقارير
- `generatedreports` - التقارير

---

## الصلاحيات المطلوبة | Required Roles

| الدور | الصلاحيات |
|-------|----------|
| `admin` | جميع العمليات |
| `supervisor` | إدارة التقييمات، الخطط، التقارير |
| `therapist` | إنشاء وتحديث التقييمات والخطط |
| `psychologist` | التقييمات النفسية |
| `special_educator` | التقييمات التربوية |
| `case_manager` | إدارة الحالات |

---

## أمثلة الاستخدام | Usage Examples

### إنشاء تقييم جديد
```javascript
POST /api/rehabilitation/assessments
{
  "beneficiary_id": "beneficiary_id_here",
  "assessment_type": "initial",
  "assessment_tool": {
    "tool_name": "مقياس فاينلاند للسلوك التكيفي"
  },
  "assessment_team": [{
    "evaluator_id": "user_id",
    "name": "أحمد محمد",
    "role": "أخصائي نفسي",
    "specialization": "علم نفس إكلينيكي"
  }],
  "domain_scores": [{
    "domain_name": "التواصل",
    "raw_score": 45,
    "standard_score": 85,
    "percentile": 16,
    "interpretation": "ضمن الحدود الطبيعية الدنيا"
  }],
  "overall_results": {
    "total_raw_score": 180,
    "functional_level": "mild",
    "summary_ar": "يظهر المستفيد قدرات جيدة في مجال التواصل..."
  }
}
```

### إنشاء خطة علاجية
```javascript
POST /api/rehabilitation/plans
{
  "beneficiary_id": "beneficiary_id_here",
  "plan_name": "الخطة العلاجية الفردية 2026",
  "plan_type": "individualized_education",
  "plan_period": {
    "start_date": "2026-03-01",
    "end_date": "2027-02-28",
    "review_dates": ["2026-06-01", "2026-09-01", "2026-12-01"]
  },
  "team_members": [{
    "member_id": "therapist_id",
    "name": "سارة أحمد",
    "role": "أخصائية علاج وظيفي",
    "is_primary": true
  }],
  "long_term_goals": [{
    "domain": "الحركة الدقيقة",
    "goal_statement": "سيتمكن من استخدام المقص بشكل صحيح",
    "measurable_criteria": "قص خط مستقيم بدقة 80%",
    "baseline_performance": "غير قادر على الإمساك بالمقص",
    "target_performance": "قص خط مستقيم بنجاح",
    "target_date": "2026-08-01"
  }]
}
```

---

## ملفات النظام | System Files

```
backend/
├── models/
│   └── rehabilitation-center.model.js    # نماذج قاعدة البيانات
├── routes/
│   └── rehabilitation-center.routes.js   # مسارات API
└── docs/
    └── REHABILITATION_CENTER_SYSTEMS_DOCUMENTATION.md  # هذا الملف
```

---

## التحديثات المستقبلية | Future Updates

- [ ] واجهة أمامية React للنظام
- [ ] تطبيق موبايل لأولياء الأمور
- [ ] تكامل مع أنظمة التأمين
- [ ] تقارير تحليلية متقدمة
- [ ] نظام الذكاء الاصطناعي للتوصيات
- [ ] تكامل مع السجلات الصحية الإلكترونية

---

## الدعم الفني | Support

للمساعدة أو الاستفسارات، يرجى التواصل مع فريق التطوير.

**تاريخ الإنشاء:** 2026-02-21
**الإصدار:** 2.0.0

# دليل البدء السريع - نظام التأهيل

## Quick Start Guide - Rehabilitation System

---

## 🚀 ابدأ الآن في 5 دقائق

### الخطوة 1️⃣: الوصول إلى النظام

```bash
# الواجهة الأمامية
http://localhost:3000/rehabilitation

# API الخادم
http://localhost:3001/api/rehabilitation
```

---

## 📝 الاستخدام الأساسي

### **1. إنشاء تقييم جديد**

```bash
curl -X POST http://localhost:3001/api/rehabilitation/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiary_id": "BEN001",
    "beneficiary_name": "أحمد محمد علي",
    "date_of_birth": "1990-01-15",
    "gender": "male",
    "disability_profile": {
      "type": "physical",
      "severity": "moderate",
      "onset_type": "acquired",
      "duration_years": 5,
      "comorbidities": ["hypertension"]
    },
    "assessment_details": {
      "assessor_id": "ASS001",
      "assessor_name": "دكتور علي أحمد",
      "assessment_method": "clinical",
      "assessment_date": "2026-01-13"
    },
    "rehabilitation_readiness": {
      "motivation_score": 85,
      "cognitive_capacity": 75,
      "physical_capacity": 60,
      "family_support": 90,
      "resource_availability": 80,
      "overall_readiness": "high"
    }
  }'
```

### **2. إنشاء برنامج تأهيل**

```bash
curl -X POST http://localhost:3001/api/rehabilitation/programs \
  -H "Content-Type: application/json" \
  -d '{
    "program_title": "برنامج العلاج الطبيعي المتقدم",
    "program_code": "PT001-2026",
    "beneficiary_id": "BEN001",
    "disability_type": "physical",
    "program_type": "outpatient",
    "program_setting": {
      "facility_name": "مركز التأهيل المتقدم",
      "facility_type": "rehabilitation_center",
      "location": "الرياض"
    },
    "session_frequency": "3 times per week",
    "session_duration_minutes": 60,
    "team_leader_id": "THER001",
    "team_leader_name": "سارة أحمد",
    "program_start_date": "2026-01-13",
    "goals": [
      {
        "goal_statement": "تحسين المدى الحركي للطرف العلوي الأيسر بنسبة 50%",
        "domain": "mobility",
        "goal_type": "short_term",
        "start_date": "2026-01-13",
        "target_date": "2026-03-13",
        "measurement_method": "Goniometer",
        "target_measure": "90 degrees ROM",
        "responsible_team_members": [
          {
            "member_id": "THER001",
            "member_name": "سارة أحمد",
            "role": "Physical Therapist"
          }
        ]
      }
    ]
  }'
```

### **3. إضافة جلسة علاجية**

```bash
curl -X POST http://localhost:3001/api/rehabilitation/programs/{programId}/therapy-session \
  -H "Content-Type: application/json" \
  -d '{
    "session_date": "2026-01-13",
    "start_time": "10:00 AM",
    "end_time": "11:00 AM",
    "duration_minutes": 60,
    "therapist_id": "THER001",
    "therapist_name": "سارة أحمد",
    "therapy_type": "physical",
    "session_objectives": [
      "تحسين قوة العضلات",
      "زيادة المرونة",
      "تقليل الألم"
    ],
    "activities_performed": [
      {
        "activity_name": "تمارين التقوية",
        "duration": 30,
        "equipment_used": ["Weights", "Resistance Bands"],
        "intensity_level": "moderate",
        "difficulty_level": 6
      },
      {
        "activity_name": "تمارين المرونة",
        "duration": 20,
        "intensity_level": "light",
        "difficulty_level": 4
      },
      {
        "activity_name": "تمارين الاسترخاء",
        "duration": 10,
        "intensity_level": "light"
      }
    ],
    "client_response": {
      "engagement_level": 9,
      "cooperation_level": 9,
      "fatigue_level": 5,
      "pain_level": 3,
      "mood": "positive",
      "comments": "المريض متحمس وتجاوب جيد"
    },
    "observations": {
      "improvements": [
        "زيادة المرونة",
        "تقليل الألم",
        "تحسن المزاج"
      ],
      "challenges": [
        "تعب سريع في البداية"
      ],
      "recommendations": [
        "الاستمرار في التمارين المنزلية",
        "زيادة المدة تدريجياً"
      ]
    },
    "session_status": "completed"
  }'
```

---

## 📊 أمثلة الاستجابات

### استجابة إنشاء التقييم:

```json
{
  "success": true,
  "message": "تم إنشاء التقييم بنجاح",
  "assessment_id": "507f1f77bcf86cd799439011",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "beneficiary_id": "BEN001",
    "beneficiary_name": "أحمد محمد علي",
    "disability_profile": {
      "type": "physical",
      "severity": "moderate"
    },
    "createdAt": "2026-01-13T10:30:00Z"
  }
}
```

### استجابة التحقق من الجاهزية:

```json
{
  "success": true,
  "is_ready": true,
  "readiness_details": {
    "motivation_score": 85,
    "cognitive_capacity": 75,
    "physical_capacity": 60,
    "family_support": 90,
    "resource_availability": 80,
    "overall_readiness": "high",
    "readiness_status": "جاهز للتأهيل"
  }
}
```

### استجابة تقدم البرنامج:

```json
{
  "success": true,
  "data": {
    "program_id": "507f1f77bcf86cd799439012",
    "beneficiary": {
      "id": "BEN001",
      "name": "أحمد محمد علي"
    },
    "program_status": "active",
    "enrollment_date": "2026-01-13",
    "duration_weeks": 2,
    "goal_progress": {
      "short_term_progress": 75,
      "long_term_progress": 50,
      "goals_achieved": 2,
      "total_goals": 5
    },
    "compliance_rate": 95,
    "attendance_rate": 92,
    "sessions_completed": 6,
    "progress_trajectory": "improving"
  }
}
```

---

## 🎯 حالات الاستخدام الشاملة

### **سيناريو 1: مريض جديد**

**الخطوة 1: إنشاء التقييم**

- أدخل معلومات المريض الأساسية
- قييم القدرات الوظيفية
- حدد نوع وشدة الإعاقة
- قيّم جاهزية التأهيل

**الخطوة 2: التحقق من الجاهزية**

```bash
GET /api/rehabilitation/assessments/{assessmentId}/readiness
```

**الخطوة 3: إنشاء برنامج تأهيل**

- حدد نوع البرنامج (داخلي/خارجي)
- أضف أهدافاً قابلة للقياس
- شكل فريق العلاج

---

### **سيناريو 2: متابعة البرنامج**

**الخطوة 1: إضافة جلسات علاجية**

```bash
POST /api/rehabilitation/programs/{programId}/therapy-session
```

**الخطوة 2: تحديث تقدم الأهداف**

```bash
PUT /api/rehabilitation/programs/{programId}/goals/{goalId}/progress
```

**الخطوة 3: الحصول على تقرير التقدم**

```bash
GET /api/rehabilitation/programs/{programId}/progress-report
```

---

### **سيناريو 3: إنهاء البرنامج**

**الخطوة 1: مراجعة النتائج**

```bash
GET /api/rehabilitation/programs/{programId}/outcomes
```

**الخطوة 2: الحصول على مقارنة النتائج**

```bash
GET /api/rehabilitation/programs/{programId}/outcome-comparison
```

**الخطوة 3: إنهاء البرنامج**

```bash
POST /api/rehabilitation/programs/{programId}/discharge
```

---

## 📱 استخدام واجهة المستخدم

### **تبويب التقييمات:**

1. **عرض التقييمات:**
   - اضغط على "تقييم جديد"
   - ملء نموذج التقييم
   - اضغط "إنشاء"

2. **عرض التقرير:**
   - انقر على أيقونة "العين"
   - سيظهر التقرير الشامل

3. **التحقق من الجاهزية:**
   - انقر على أيقونة "الاختيار"
   - سترى رسالة بحالة الجاهزية

### **تبويب البرامج:**

1. **إنشاء برنامج:**
   - اضغط على "برنامج تأهيل جديد"
   - ملء بيانات البرنامج
   - اضغط "إنشاء"

2. **إضافة جلسة:**
   - اختر البرنامج
   - اضغط على "إضافة جلسة"
   - ملء تفاصيل الجلسة

3. **عرض التقدم:**
   - اختر البرنامج
   - اضغط على "عرض التقدم"
   - سترى الإحصائيات والرسوم البيانية

---

## 🔍 البحث والتصفية

### **البحث المتقدم:**

```bash
POST /api/rehabilitation/search
{
  "keyword": "أحمد",
  "disability_type": "physical",
  "program_status": "active",
  "date_from": "2026-01-01",
  "date_to": "2026-01-31"
}
```

### **الإحصائيات:**

```bash
GET /api/rehabilitation/statistics
```

**الاستجابة:**

```json
{
  "success": true,
  "data": {
    "active_programs": 15,
    "discharged_programs": 8,
    "completed_programs": 12,
    "total_programs": 35,
    "ready_for_rehabilitation": 5,
    "by_disability_type": [...]
  }
}
```

---

## 💡 نصائح مهمة

✅ **احفظ معرفات البرامج** - ستحتاجها للعمليات اللاحقة

✅ **حدث الجلسات بانتظام** - يسهل متابعة التقدم

✅ **استخدم التقارير** - للتحليل والتحسين

✅ **راقب مؤشرات الالتزام** - ضرورية لنجاح البرنامج

✅ **تفاعل مع الفريق** - التعاون أساس النجاح

---

## 🆘 حل المشاكل الشائعة

**المشكلة:** خطأ في إنشاء البرنامج  
**الحل:** تأكد من وجود التقييم أولاً

**المشكلة:** لا تظهر الجلسات  
**الحل:** تأكد من صحة معرف البرنامج

**المشكلة:** بيانات غير صحيحة  
**الحل:** استخدم التواريخ بصيغة ISO (YYYY-MM-DD)

**المشكلة:** الوصول مرفوض  
**الحل:** تأكد من وجود التوثيق (JWT Token)

---

## 📞 معلومات الدعم

**القسم المسؤول:** قسم التأهيل  
**البريد الإلكتروني:** rehabilitation@system.com  
**الهاتف:** +966-XX-XXX-XXXX  
**ساعات العمل:** من 8:00 إلى 16:00

---

## 📚 موارد إضافية

- [التوثيق الكامل](./REHABILITATION_SYSTEM.md)
- [ملخص التطوير](./REHABILITATION_SUMMARY.md)
- [قائمة المقاييس](./REHABILITATION_SYSTEM.md#المقاييس)
- [أمثلة API](./REHABILITATION_SYSTEM.md#أمثلة-الاستخدام)

---

**ابدأ الآن! 🚀**

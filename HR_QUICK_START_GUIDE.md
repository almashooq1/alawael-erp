# 🚀 دليل الاستخدام السريع - نظام الموارد البشرية المتقدم

## 🎯 الخطوات الأولى

### 1️⃣ **البدء بالنظام**

```bash
# تشغيل Backend
cd backend
npm install                    # تثبيت الحزم (إذا لم تكن مثبتة)
npm start                      # تشغيل الخادم

# في نافذة أخرى - تشغيل Frontend
cd frontend
npm run dev                    # تشغيل التطبيق

# الوصول للنظام
http://localhost:5173/hr      # صفحة HR Dashboard
```

---

## 📱 واجهات النظام

### **HR Management Dashboard**

الوصول إلى: `/hr` أو `/pages/HRManagementPage`

#### الأقسام الخمسة الرئيسية:

#### 1️⃣ **قسم الموظفين**

```
الوصول: Click on "الموظفين" Tab

المميزات:
✅ عرض جميع الموظفين في جدول
✅ إضافة موظف جديد (زر "موظف جديد")
✅ تعديل بيانات الموظف
✅ عرض التقييمات (Rating)
✅ بحث وفلترة

البيانات المعروضة:
- الاسم والبريد
- المنصب والقسم
- الحالة (نشط/غير نشط)
- التقييم (1-5 نجوم)
```

#### 2️⃣ **قسم الرواتب**

```
الوصول: Click on "الرواتب" Tab

المميزات:
✅ إجمالي الرواتب الشهرية
✅ عدد الرواتب المعالجة
✅ معالجة الرواتب (زر "معالجة الرواتب")
✅ تحويل الرواتب (زر "تحويل")
✅ تنزيل التقارير (زر "تقرير")

البيانات المعروضة:
- الراتب الأساسي
- المزايا والخصومات
- الراتب الصافي
- حالة الدفع
```

#### 3️⃣ **قسم التدريب**

```
الوصول: Click on "التدريب" Tab

المميزات:
✅ إنشاء برنامج تدريبي
✅ تسجيل الموظفين
✅ تتبع التقدم (نسبة مئوية)
✅ عرض التفاصيل

البيانات المعروضة:
- اسم البرنامج
- المدة والمشاركين
- نسبة التقدم
```

#### 4️⃣ **قسم الأداء**

```
الوصول: Click on "الأداء" Tab

المميزات:
✅ متوسط التقييمات
✅ عدد التقييمات المعلقة
✅ عرض التقييمات
✅ تقييمات الموظفين

البيانات المعروضة:
- اسم الموظف
- التقييم الحالي (1-5)
- حالة التقييم
```

#### 5️⃣ **قسم الإحصائيات**

```
الوصول: Click on "الإحصائيات" Tab

المؤشرات الرئيسية (KPIs):
- إجمالي الموظفين
- المتدربين الحاليين
- متوسط الراتب
- العقود المنتهية قريباً

التقارير:
- توزيع الموظفين حسب القسم
- إحصائيات الأداء
- تكاليف الرواتب
```

---

## 🔌 API Endpoints - الاستخدام

### **إدارة الموظفين**

#### إنشاء موظف جديد

```bash
POST /api/hr/employees
Content-Type: application/json

{
  "firstName": "أحمد",
  "lastName": "محمد",
  "email": "ahmed@company.com",
  "phone": "0501234567",
  "position": "مهندس برمجيات",
  "department": "تطوير",
  "hireDate": "2024-01-13",
  "salary": {
    "base": 5000,
    "allowances": [
      {"name": "housing", "amount": 1000, "type": "monthly"}
    ]
  }
}
```

#### جلب جميع الموظفين

```bash
GET /api/hr/employees?department=تطوير&status=active&page=1&limit=20

Response:
{
  "success": true,
  "data": [...employees],
  "pagination": {
    "total": 50,
    "pages": 3,
    "current": 1
  }
}
```

#### الحصول على ملف الموظف الكامل

```bash
GET /api/hr/employees/:id/profile

Response:
{
  "success": true,
  "data": {
    "employee": {...full employee data},
    "payrollHistory": [...last 12 months],
    "trainings": [...trainings enrolled],
    "performanceReviews": [...recent reviews]
  }
}
```

#### البحث عن موظفين

```bash
POST /api/hr/employees/search
Content-Type: application/json

{
  "searchTerm": "أحمد",
  "filters": {
    "department": "تطوير",
    "status": "active"
  }
}
```

---

### **نظام الرواتب**

#### إنشاء كشف رواتب

```bash
POST /api/hr/payroll/generate
Content-Type: application/json

{
  "month": "2024-01",
  "employeeData": [
    {
      "employeeId": "EMP00001",
      "baseSalary": 5000,
      "allowances": [{"name": "housing", "amount": 1000}],
      "attendance": {"presentDays": 22}
    }
  ]
}
```

#### معالجة الرواتب

```bash
POST /api/hr/payroll/2024-01/process

Response:
{
  "success": true,
  "message": "تم معالجة الرواتب",
  "data": {...}
}
```

#### ملخص الرواتب الشهري

```bash
GET /api/hr/payroll/2024-01/summary

Response:
{
  "success": true,
  "data": {
    "summary": {
      "totalGross": 250000,
      "totalDeductions": 50000,
      "totalNet": 200000,
      "employeeCount": 50
    },
    "payrolls": [...]
  }
}
```

---

### **التدريب والتطوير**

#### إنشاء برنامج تدريب

```bash
POST /api/hr/training
Content-Type: application/json

{
  "title": "برنامج تطوير الإدارة",
  "description": "برنامج متقدم لتطوير مهارات الإدارة",
  "provider": "جامعة الملك سعود",
  "startDate": "2024-02-01",
  "endDate": "2024-02-28",
  "duration": 30,
  "category": "leadership"
}
```

#### تسجيل الموظفين

```bash
POST /api/hr/training/:trainingId/enroll
Content-Type: application/json

{
  "employeeIds": ["6571234567890abcdef12345", "6571234567890abcdef12346"]
}
```

#### إكمال البرنامج

```bash
POST /api/hr/training/:trainingId/complete/:employeeId
Content-Type: application/json

{
  "score": 85
}
```

---

### **إدارة الأداء**

#### إنشاء تقييم أداء

```bash
POST /api/hr/performance
Content-Type: application/json

{
  "employeeId": "6571234567890abcdef12345",
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "goals": [
    {
      "description": "إكمال المشروع A",
      "weight": 30,
      "targetValue": 100,
      "actualValue": 95
    }
  ],
  "ratings": {
    "productivity": 4,
    "quality": 5,
    "teamwork": 4,
    "communication": 3
  }
}
```

#### توقيع الموظف

```bash
POST /api/hr/performance/:id/acknowledge

Response:
{
  "success": true,
  "message": "تم التوقيع بنجاح",
  "data": {...performance}
}
```

#### موافقة المدير

```bash
POST /api/hr/performance/:id/approve

Response:
{
  "success": true,
  "message": "تمت الموافقة",
  "data": {...performance}
}
```

---

### **الإحصائيات والتقارير**

#### الإحصائيات العامة

```bash
GET /api/hr/analytics/summary

Response:
{
  "success": true,
  "data": {
    "totalEmployees": 50,
    "activeEmployees": 48,
    "departmentStats": [...],
    "employeesByStatus": [...],
    "averageSalary": 5500
  }
}
```

#### العقود المنتهية

```bash
GET /api/hr/analytics/expiring-contracts?days=30

Response:
{
  "success": true,
  "data": [...employees with expiring contracts]
}
```

#### التقييمات المعلقة

```bash
GET /api/hr/analytics/pending-reviews

Response:
{
  "success": true,
  "data": [...pending performance reviews]
}
```

---

## 💡 أمثلة الاستخدام العملي

### **سيناريو 1: إضافة موظف جديد**

```javascript
// 1. ملء نموذج الموظف الجديد
const newEmployee = {
  firstName: 'فاطمة',
  lastName: 'علي',
  email: 'fatima@company.com',
  position: 'محاسبة',
  department: 'المالية',
};

// 2. إرسال الطلب
fetch('http://localhost:3001/api/hr/employees', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newEmployee),
})
  .then(res => res.json())
  .then(data => console.log('تم إضافة الموظف:', data));

// 3. سيتم إنشاء الموظف برقم فريد: EMP00051
```

### **سيناريو 2: حساب الرواتب الشهرية**

```javascript
// 1. جمع بيانات الموظفين
const employees = await fetch('http://localhost:3001/api/hr/employees').then(r => r.json());

// 2. إنشاء كشف الرواتب
const payrollData = {
  month: '2024-01',
  employeeData: employees.data.map(emp => ({
    employeeId: emp._id,
    baseSalary: emp.salary.base,
    allowances: emp.salary.allowances,
  })),
};

// 3. إرسال الطلب
fetch('http://localhost:3001/api/hr/payroll/generate', {
  method: 'POST',
  body: JSON.stringify(payrollData),
})
  .then(res => res.json())
  .then(data => console.log('تم إنشاء الرواتب'));
```

### **سيناريو 3: تقييم موظف**

```javascript
// 1. إنشاء تقييم
const review = {
  employeeId: 'emp_id_here',
  ratings: {
    productivity: 4,
    quality: 5,
    teamwork: 4,
  },
  strengths: ['سريع التعلم', 'متعاون'],
  weaknesses: ['احيانا متأخر'],
};

// 2. إرسال التقييم
await fetch('http://localhost:3001/api/hr/performance', {
  method: 'POST',
  body: JSON.stringify(review),
});

// 3. الموظف يوقع (يعترف)
await fetch('http://localhost:3001/api/hr/performance/{id}/acknowledge', {
  method: 'POST',
});

// 4. المدير يوافق
await fetch('http://localhost:3001/api/hr/performance/{id}/approve', {
  method: 'POST',
});
```

---

## 📊 قوائم التحقق

### ✅ قبل الاستخدام الفوري

- [ ] تثبيت جميع الحزم (`npm install`)
- [ ] تشغيل قاعدة البيانات (MongoDB)
- [ ] تشغيل Backend (`npm start`)
- [ ] تشغيل Frontend (`npm run dev`)
- [ ] التحقق من صفحة الصحة (`/health`)
- [ ] تسجيل الدخول (admin@alawael.com / Admin@123456)

### ✅ قبل الإنتاج

- [ ] تهيئة البيئة الإنتاجية
- [ ] تفعيل قاعدة البيانات الرئيسية
- [ ] إنشاء نسخ احتياطية
- [ ] اختبار جميع الوظائف
- [ ] مراجعة سياسات الأمان
- [ ] تدريب المستخدمين

---

## 🆘 استكشاف الأخطاء

### مشكلة: رسالة خطأ "لا توجد بيانات"

**الحل:** تأكد من:

- تشغيل Backend بشكل صحيح
- الاتصال بقاعدة البيانات
- المصادقة (JWT token)

### مشكلة: الرواتب لا تحسب بشكل صحيح

**الحل:**

- تحقق من بيانات الموظف
- تأكد من المزايا والخصومات
- اضغط على زر "إعادة الحساب"

### مشكلة: التقييمات لا تظهر

**الحل:**

- تأكد من وجود موظفين في النظام
- انتظر تحميل الصفحة
- احدث الصفحة (F5)

---

## 📞 للمزيد من المعلومات

📄 اقرأ الملفات التالية:

- `HR_ADVANCED_SYSTEM.md` - توثيق شامل
- `HR_DEVELOPMENT_SUMMARY.md` - ملخص التطوير

---

**تم الإنشاء:** 13 يناير 2026  
**الإصدار:** 2.0.0  
**الحالة:** جاهز للاستخدام ✅

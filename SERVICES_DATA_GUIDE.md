# 📚 دليل استخدام خدمات البيانات (Services)

## نظرة عامة

خدمات البيانات توفر واجهة موحدة للوصول إلى البيانات الوهمية. كل خدمة تحتوي على عدة دوال async لاسترجاع بيانات مختلفة.

---

## 1️⃣ Student Portal Service

### الملف:

```
frontend/src/services/studentPortalService.js
```

### الدوال المتاحة:

#### getStudentDashboard(studentId)

```javascript
import { studentPortalService } from '../services/studentPortalService';

// الاستخدام:
const data = await studentPortalService.getStudentDashboard('student001');

// البيانات المسترجعة:
{
  student: { id, name, grade, ... },
  announcements: [ ... ],
  schedule: [ ... ],
  assignments: [ ... ],
  messages: [ ... ]
}
```

#### getSchedule(studentId)

استرجاع الجدول الدراسي الأسبوعي

#### getGrades(studentId)

استرجاع الدرجات والتقييمات

#### getAttendance(studentId)

استرجاع سجل الحضور

#### getAssignments(studentId)

استرجاع قائمة الواجبات

#### getLibraryResources(studentId)

استرجاع موارد المكتبة الرقمية

---

## 2️⃣ Therapist Portal Service

### الملف:

```
frontend/src/services/therapistService.js
```

### الدوال المتاحة:

#### getTherapistDashboard(therapistId)

```javascript
const data = await therapistService.getTherapistDashboard('therapist001');

// البيانات:
{
  stats: { patients, sessions, ... },
  patients: [ ... ],
  sessions: [ ... ],
  cases: [ ... ]
}
```

#### getPatients(therapistId)

قائمة المرضى والعملاء

#### getSessions(therapistId)

سجل الجلسات

#### getCases(therapistId)

إدارة الحالات الطبية

#### getReports(therapistId)

التقارير والإحصائيات

---

## 3️⃣ Admin Portal Service

### الملف:

```
frontend/src/services/adminService.js
```

### الدوال المتاحة:

#### getAdminDashboard(adminId)

```javascript
const data = await adminService.getAdminDashboard('admin001');

// البيانات:
{
  stats: { users, therapists, ... },
  services: [ ... ],
  activities: [ ... ],
  alerts: [ ... ]
}
```

#### getAdminUsers(adminId)

قائمة المستخدمين

#### getAdminSettings(adminId)

إعدادات النظام

#### getAdminReports(adminId)

التقارير التحليلية

#### getAdminAuditLogs(adminId)

سجلات التدقيق الأمني

#### getAdminClinics(adminId)

إدارة العيادات

#### getAdminPayments(adminId)

سجل الدفعات

#### getAdminNotifications(adminId)

إدارة الإشعارات

---

## 4️⃣ Parent Portal Service ⭐ جديد

### الملف:

```
frontend/src/services/parentService.js
```

### الدوال المتاحة:

### 1. getParentDashboard(parentId)

```javascript
import { parentService } from '../services/parentService';

const data = await parentService.getParentDashboard('parent001');

// البيانات المسترجعة:
{
  children: [
    {
      id: 'child001',
      name: 'أحمد محمد',
      age: 8,
      overallProgress: 75,
      attendance: 95,
      sessionsCompleted: 24,
      nextSessionDays: 3,
      skills: [
        {
          id: 1,
          name: 'النطق الواضح',
          progress: 85,
          status: 'محسّن',
          lastUpdate: '2025-01-15'
        },
        // ... مهارات أخرى
      ],
      upcomingSessions: [ ... ],
      therapists: [ ... ],
      documents: [ ... ]
    },
    // ... أطفال آخرون
  ],
  alerts: [ ... ]
}
```

**الاستخدام في المكون:**

```jsx
useEffect(() => {
  const fetchData = async () => {
    const data = await parentService.getParentDashboard('parent001');
    setDashboardData(data);
  };
  fetchData();
}, []);
```

---

### 2. getChildrenProgress(parentId)

```javascript
const data = await parentService.getChildrenProgress('parent001');

// البيانات المسترجعة:
{
  children: [
    {
      id: 'child001',
      name: 'أحمد محمد',
      skillsImproved: 5,
      averageProgress: 75,
      milestonesReached: 8,
      coreSkills: [
        {
          id: 1,
          name: 'النطق والتلفظ',
          progress: 85,
          target: '100%',
          therapist: 'فاطمة علي',
          lastUpdate: '2025-01-15'
        },
        // ... مهارات أخرى
      ],
      monthlyProgress: [
        {
          id: 1,
          month: 'نوفمبر',
          progress: 55,
          sessions: 4,
          notes: 'بداية جيدة'
        },
        // ... أشهر أخرى
      ],
      achievements: [ ... ],
      improvedAreas: [ ... ]
    }
  ]
}
```

---

### 3. getAttendanceReports(parentId)

```javascript
const data = await parentService.getAttendanceReports('parent001');

// البيانات المسترجعة:
{
  summaryStats: [
    {
      id: 1,
      value: '24',
      label: 'الجلسات المكتملة',
      color: '#4CAF50'
    },
    // ... إحصائيات أخرى
  ],
  attendanceRecords: [
    {
      id: 1,
      date: '2025-01-15',
      time: '02:00 PM',
      therapist: 'فاطمة علي',
      status: 'حاضر',
      notes: 'جلسة منتجة جداً'
    },
    // ... سجلات أخرى
  ],
  behaviorReports: [ ... ],
  performanceMetrics: [ ... ]
}
```

---

### 4. getTherapistCommunications(parentId)

```javascript
const data = await parentService.getTherapistCommunications('parent001');

// البيانات المسترجعة:
{
  therapists: [
    {
      id: 'therapist001',
      name: 'فاطمة علي',
      specialization: 'متخصصة نطق وتخاطب',
      unreadCount: 2,
      lastMessage: 'الطفل أظهر تحسناً جيداً...',
      messages: [
        {
          id: 1,
          sender: 'فاطمة علي',
          senderType: 'therapist',
          text: 'السلام عليكم، كيف حال أحمد؟',
          timestamp: '10:30 AM',
          date: '2025-01-15',
        },
        // ... رسائل أخرى
      ],
    },
    // ... معالجون آخرون
  ];
}
```

---

### 5. getPaymentsHistory(parentId)

```javascript
const data = await parentService.getPaymentsHistory('parent001');

// البيانات المسترجعة:
{
  summaryCards: [
    {
      id: 1,
      amount: '15,000 ر.س',
      label: 'إجمالي المدفوع',
      color: '#4CAF50'
    },
    // ... بطاقات أخرى
  ],
  payments: [
    {
      id: 1,
      invoiceNumber: 'INV-001',
      date: '2025-01-15',
      description: 'جلسات علاج نطق (5 جلسات)',
      amount: '5,000',
      status: 'مدفوعة'
    },
    // ... دفعات أخرى
  ],
  paymentMethods: [ ... ]
}
```

---

### 6. getDocumentsReports(parentId)

```javascript
const data = await parentService.getDocumentsReports('parent001');

// البيانات المسترجعة:
{
  stats: [
    {
      id: 1,
      value: '32',
      label: 'إجمالي المستندات',
      color: '#667eea'
    },
    // ... إحصائيات أخرى
  ],
  folders: [
    {
      id: 'all',
      name: 'جميع المستندات',
      count: 32
    },
    // ... فئات أخرى
  ],
  documents: [
    {
      id: 1,
      name: 'تقرير التقييم الأولي',
      type: 'PDF',
      size: '2.5 MB',
      date: '2025-01-15',
      category: 'reports',
      description: 'تقرير التقييم الشامل الأولي',
      therapist: 'فاطمة علي',
      lastUpdated: '2025-01-15',
      status: 'مكتمل'
    },
    // ... مستندات أخرى
  ]
}
```

---

### 7. getAppointmentsScheduling(parentId)

```javascript
const data = await parentService.getAppointmentsScheduling('parent001');

// البيانات المسترجعة:
{
  stats: [
    {
      id: 1,
      value: '3',
      label: 'جلسات قادمة',
      color: '#667eea'
    },
    // ... إحصائيات أخرى
  ],
  therapists: [
    {
      id: 1,
      name: 'فاطمة علي',
      specialization: 'نطق وتخاطب'
    },
    // ... معالجون آخرون
  ],
  upcomingAppointments: [
    {
      id: 1,
      date: '2025-01-20',
      time: '02:00 PM',
      childName: 'أحمد محمد',
      therapist: 'فاطمة علي',
      type: 'جلسة فردية',
      status: 'مؤكدة'
    },
    // ... جلسات أخرى
  ],
  completedSessions: [ ... ]
}
```

---

### 8. getParentMessages(parentId)

```javascript
const data = await parentService.getParentMessages('parent001');

// البيانات المسترجعة:
{
  stats: [
    {
      id: 1,
      value: '12',
      label: 'رسائل جديدة',
      color: '#667eea'
    },
    // ... إحصائيات أخرى
  ],
  inbox: [
    {
      id: 1,
      sender: 'فاطمة علي',
      date: '2025-01-15',
      lastMessage: 'الطفل أظهر تحسناً جيداً...',
      subject: 'تقرير الجلسة',
      content: 'السلام عليكم، أحمد أظهر تحسناً ملحوظاً...',
      unread: true
    },
    // ... رسائل أخرى
  ],
  announcements: [ ... ],
  forums: [ ... ]
}
```

---

## 🔧 أمثلة عملية للاستخدام

### مثال 1: في مكون ParentDashboard

```jsx
import { parentService } from '../services/parentService';

export default function ParentDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await parentService.getParentDashboard('parent001');
      setDashboardData(data);
      if (data?.children?.length > 0) {
        setSelectedChild(data.children[0]);
      }
    };
    fetchData();
  }, []);

  if (!dashboardData) {
    return <LinearProgress />;
  }

  return <Container>{/* استخدام dashboardData */}</Container>;
}
```

### مثال 2: في مكون ChildrenProgress

```jsx
useEffect(() => {
  const fetchData = async () => {
    const data = await parentService.getChildrenProgress('parent001');
    setProgressData(data);
    if (data?.children?.length > 0) {
      setSelectedChild(data.children[0]);
    }
  };
  fetchData();
}, []);
```

### مثال 3: في مكون PaymentsHistory

```jsx
useEffect(() => {
  const fetchData = async () => {
    const data = await parentService.getPaymentsHistory('parent001');
    setPaymentData(data);
  };
  fetchData();
}, []);

// استخدام البيانات:
const filteredPayments = paymentData.payments?.filter(p => {
  const matchesSearch = p.invoiceNumber.includes(searchText);
  const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
  return matchesSearch && matchesStatus;
});
```

---

## 📊 هيكل البيانات العام

### معايير النامنج:

```javascript
// معرّفات:
- id: string (فريدة)
- userId/parentId/therapistId: identifier string

// التواريخ:
- date: 'YYYY-MM-DD'
- time: 'HH:MM AM/PM'
- timestamp: 'HH:MM AM/PM'

// الحالات:
- status: 'مدفوعة' | 'قيد الانتظار' | 'متأخرة'
- active: true | false

// الألوان:
- color: '#XXXXXX' (hex color)
```

---

## 🎯 أفضل الممارسات

### 1. معالجة البيانات الفارغة

```javascript
if (!data || !data.children) {
  return <Typography>لا توجد بيانات</Typography>;
}
```

### 2. التحميل التدريجي

```javascript
if (!data) {
  return <LinearProgress />;
}
// البيانات متاحة الآن
```

### 3. استخراج معرّفات فريدة

```javascript
data.children?.map(child => <Item key={child.id} data={child} />);
```

### 4. التصفية والبحث

```javascript
const filtered = data.payments?.filter(p => p.invoiceNumber.includes(searchText));
```

---

## ⚙️ معلومات تقنية

### الطلبات المتزامنة:

```javascript
const [data1, data2, data3] = await Promise.all([
  parentService.getParentDashboard('parent001'),
  parentService.getChildrenProgress('parent001'),
  parentService.getPaymentsHistory('parent001'),
]);
```

### معالجة الأخطاء:

```javascript
try {
  const data = await parentService.getParentDashboard('parent001');
  setData(data);
} catch (error) {
  console.error('Error:', error);
}
```

---

## 📝 ملفات الخدمات

```
frontend/src/services/
├── studentPortalService.js (500+ سطر)
├── therapistService.js (500+ سطر)
├── adminService.js (500+ سطر)
└── parentService.js (580 سطر) ⭐
```

---

**آخر تحديث**: 2025-01-16
**الإصدار**: 1.0.0
**الحالة**: جاهز للاستخدام ✨

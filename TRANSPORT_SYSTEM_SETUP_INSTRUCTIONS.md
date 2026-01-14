/\*\*

- تحديثات الإضافة إلى App.js
- Update Instructions for App.js
  \*/

// ==================== الإضافات المطلوبة ====================

// 1. أضف هذه الـ Imports في أعلى App.js:

import StudentTransportPage from './pages/StudentTransportPage';
import ParentTransportPage from './pages/ParentTransportPage';
import DriverTransportPage from './pages/DriverTransportPage';
import AdminTransportPage from './pages/AdminTransportPage';

// ==================== أضف هذه المسارات في Routes Section ====================

/\*\*

- قم بإضافة هذه المسارات في قسم <Routes> الخاص بك:
  \*/

{/_ نظام النقل والمواصلات _/}
<Route path="/student-transport" element={<StudentTransportPage />} />
<Route path="/parent-transport" element={<ParentTransportPage />} />
<Route path="/driver-transport" element={<DriverTransportPage />} />
<Route path="/admin-transport" element={<AdminTransportPage />} />

// ==================== تحديثات في الملاحة Navigation ====================

/\*\*

- أضف هذه العناصر في قائمة الملاحة:
  \*/

// في قائمة الطالب:
{
label: 'النقل والمواصلات',
path: '/student-transport',
icon: 'DirectionsBus'
}

// في قائمة ولي الأمر:
{
label: 'متابعة النقل',
path: '/parent-transport',
icon: 'DirectionsBus'
}

// في قائمة السائق:
{
label: 'لوحة السائق',
path: '/driver-transport',
icon: 'DirectionsBus'
}

// في قائمة المسؤول:
{
label: 'إدارة النقل',
path: '/admin-transport',
icon: 'DirectionsBus'
}

// ==================== تحديثات في server.js ====================

/\*\*

- أضف هذا الكود في server.js:
  \*/

// Require the transport routes
const transportRoutes = require('./api/routes/transport.routes');

// Register the transport routes
app.use('/api/transport', transportRoutes);

// ==================== اختبار الـ API ====================

/\*\*

- لاختبار الـ APIs، استخدم Postman أو أي أداة مشابهة:
  \*/

// 1. جلب جميع الحافلات:
GET http://localhost:3001/api/transport/buses

// 2. إضافة حافلة جديدة:
POST http://localhost:3001/api/transport/buses
Body: {
"busNumber": "BUS-001",
"licensePlate": "ABC1234",
"capacity": 45,
"model": "Mercedes Sprinter",
"color": "أبيض",
"status": "active"
}

// 3. إضافة سائق:
POST http://localhost:3001/api/transport/drivers
Body: {
"firstName": "محمد",
"lastName": "علي",
"email": "driver@example.com",
"phone": "0501234567",
"licenseNumber": "DRV123456",
"licenseCategory": "D",
"licenseExpiry": "2026-12-31",
"status": "active"
}

// 4. إضافة مسار:
POST http://localhost:3001/api/transport/routes
Body: {
"routeName": "المسار الشرقي",
"description": "مسار يغطي المناطق الشرقية",
"startPoint": "المدرسة",
"endPoint": "مدينة الملك عبدالعزيز",
"scheduleType": "daily",
"status": "active"
}

// 5. تسجيل طالب:
POST http://localhost:3001/api/transport/student-registration
Body: {
"studentId": "STU123",
"currentRoute": "<routeId>",
"shift": "morning",
"pickupPoint": "الشارع الرئيسي",
"dropoffPoint": "المنزل",
"parentContact": {
"name": "أب الطالب",
"phone": "0501234567",
"email": "parent@example.com"
},
"emergencyContact": {
"name": "العم",
"phone": "0509876543",
"relationship": "عم"
},
"medicalInformation": {
"allergies": "الفول السوداني",
"medicines": "لا يوجد",
"specialNeeds": "لا توجد"
}
}

// ==================== معايير الحالات الشاملة ====================

/\*\*

- حالات الحافلات:
- - active: الحافلة تعمل بشكل طبيعي
- - inactive: الحافلة موقوفة
- - maintenance: الحافلة تخضع للصيانة
    \*/

/\*\*

- حالات السائقين:
- - active: السائق يعمل حالياً
- - inactive: السائق غير نشط
- - on_leave: السائق في إجازة
- - suspended: السائق موقوف عن العمل
    \*/

/\*\*

- حالات التسجيل:
- - active: التسجيل نشط وموافق عليه
- - inactive: التسجيل غير نشط
- - suspended: التسجيل موقوف
- - waiting_approval: في انتظار الموافقة
    \*/

/\*\*

- حالات الدفع:
- - paid: تم الدفع بالكامل
- - partial: تم دفع جزء من المبلغ
- - unpaid: لم يتم الدفع
- - overdue: متأخر عن موعد الدفع
    \*/

/\*\*

- حالات الشكاوى:
- - open: الشكوى مفتوحة
- - investigating: قيد البحث والتحقيق
- - resolved: تم حلها
- - closed: مغلقة
    \*/

/\*\*

- أنواع الشكاوى:
- - safety: تتعلق بالسلامة
- - behavior: تتعلق بالسلوك
- - late_arrival: تأخر الوصول
- - damage: ضرر أو تلف
- - hygiene: نظافة وصحة
- - other: أخرى
    \*/

// ==================== بيانات نموذجية للاختبار ====================

/\*\*

- بيانات نموذجية يمكن إضافتها للاختبار:
  \*/

// حافلات نموذجية:
const sampleBuses = [
{
busNumber: "BUS-001",
licensePlate: "ABC1234",
capacity: 45,
model: "Mercedes Sprinter",
color: "أبيض"
},
{
busNumber: "BUS-002",
licensePlate: "XYZ5678",
capacity: 50,
model: "Hyundai Solati",
color: "أزرق"
}
];

// سائقون نموذجيون:
const sampleDrivers = [
{
firstName: "محمد",
lastName: "علي",
phone: "0501234567",
licenseNumber: "DRV001",
licenseCategory: "D",
licenseExpiry: "2026-12-31"
},
{
firstName: "أحمد",
lastName: "سالم",
phone: "0509876543",
licenseNumber: "DRV002",
licenseCategory: "D",
licenseExpiry: "2025-06-30"
}
];

// مسارات نموذجية:
const sampleRoutes = [
{
routeName: "المسار الشرقي",
description: "يغطي الأحياء الشرقية",
startPoint: "المدرسة",
endPoint: "حي الملك فهد",
scheduleType: "daily"
},
{
routeName: "المسار الغربي",
description: "يغطي الأحياء الغربية",
startPoint: "المدرسة",
endPoint: "حي الربوة",
scheduleType: "daily"
}
];

// ==================== خطوات التشغيل ====================

/\*\*

- خطوات تفعيل النظام:
-
- 1.  تحديث server.js:
- - أضف الـ import للـ transport routes
- - سجل الـ routes في التطبيق
-
- 2.  تحديث App.js:
- - أضف الـ imports للصفحات الجديدة
- - أضف المسارات الجديدة إلى Routes
-
- 3.  تحديث الملاحة:
- - أضف العناصر الجديدة إلى قوائم الملاحة
-
- 4.  إعادة تشغيل الخوادم:
- - npm start (في backend)
- - npm start (في frontend)
-
- 5.  الاختبار:
- - اختبر جميع الـ APIs باستخدام Postman
- - اختبر جميع الصفحات من خلال الويب
-
- 6.  إضافة البيانات النموذجية:
- - أضف حافلات للاختبار
- - أضف سائقين
- - أضف مسارات
- - سجل بعض الطلاب
    \*/

// ==================== معلومات مهمة ====================

/\*\*

- ملاحظات مهمة:
-
- ✓ جميع الـ APIs محمية بـ JWT authentication
- ✓ جميع العمليات مسجلة ومراقبة
- ✓ النظام يدعم تتبع GPS في الوقت الفعلي
- ✓ التنبيهات تُرسل تلقائياً عند التأخير
- ✓ جميع البيانات محفوظة وآمنة
- ✓ النظام قابل للتوسع والتطوير
  \*/

// ==================== التواصل والدعم ====================

/\*\*

- في حالة الحاجة إلى مساعدة:
-
- - راجع ملف التوثيق: TRANSPORT_SYSTEM_DOCUMENTATION.md
- - تحقق من الـ Console للأخطاء
- - تأكد من تثبيت جميع الحزم المطلوبة
- - تأكد من تشغيل الخوادم بشكل صحيح
    \*/

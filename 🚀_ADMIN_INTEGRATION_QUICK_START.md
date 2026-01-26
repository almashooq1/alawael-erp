# 🚀 دليل التكامل السريع - Admin Dashboard

## البدء الفوري (5 دقائق)

### الخطوة 1: تفعيل في Backend

```python
# backend/app.py أو backend/server.py

# أضف هذا في الأعلى مع الـ imports:
from routes.admin_routes import admin_bp

# أضف هذا بعد إنشاء التطبيق (app = Flask(__name__)):
app.register_blueprint(admin_bp)

# تأكد من أن CORS مفعل:
from flask_cors import CORS
CORS(app)
```

### الخطوة 2: التحقق من التفعيل

```bash
# شغّل المخدم:
python app.py

# اختبر الـ endpoint:
curl http://localhost:3001/api/admin/health
```

الاستجابة المتوقعة:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-20T...",
  "endpoints": {
    "users": "/api/admin/users",
    "roles": "/api/admin/roles",
    "audit_logs": "/api/admin/audit-logs",
    "stats": "/api/admin/stats",
    "dashboard": "/api/admin/dashboard"
  }
}
```

### الخطوة 3: تفعيل في Frontend

```jsx
// في frontend/src/App.jsx أو Router الرئيسي:

import AdminDashboard from './components/Admin/AdminDashboard';

// أضف Route:
<Route path="/admin" element={<AdminDashboard />} />

// أو أضفها في القائمة الجانبية:
<SidebarItem label="لوحة التحكم" icon={AdminIcon} link="/admin" />
```

### الخطوة 4: الوصول إلى لوحة التحكم

```
http://localhost:3000/admin
```

---

## 🔧 مثال استخدام عملي

### إنشاء مستخدم جديد

```bash
curl -X POST http://localhost:3001/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "علي محمد",
    "email": "ali@example.com",
    "role": "manager"
  }'
```

الاستجابة:

```json
{
  "id": "user_1",
  "name": "علي محمد",
  "email": "ali@example.com",
  "role": "manager",
  "status": "active",
  "created_at": "2026-01-20T...",
  "permissions": [...]
}
```

### الحصول على المستخدمين

```bash
curl http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### البحث عن مستخدم

```bash
curl "http://localhost:3001/api/admin/users/search?q=علي" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### تعطيل مستخدم

```bash
curl -X POST http://localhost:3001/api/admin/users/user_1/disable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 الإحصائيات والتقارير

### الحصول على الإحصائيات

```bash
curl http://localhost:3001/api/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

الاستجابة:

```json
{
  "total_users": 25,
  "total_roles": 6,
  "total_audit_logs": 150,
  "active_users": 22,
  "inactive_users": 3,
  "users_by_role": {
    "super_admin": 1,
    "admin": 2,
    "manager": 5,
    "supervisor": 8,
    "staff": 9,
    "user": 20
  }
}
```

### سجلات التدقيق

```bash
curl "http://localhost:3001/api/admin/audit-logs?skip=0&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 حالات الاستخدام الشائعة

### 1. إدارة المستخدمين الجدد

```jsx
// في أي مكان في التطبيق
import adminService from './services/adminService';

async function addNewUser() {
  try {
    const user = await adminService.createUser({
      name: 'أحمد علي',
      email: 'ahmed.ali@company.com',
      role: 'supervisor',
    });
    console.log('تم إنشاء المستخدم:', user);
  } catch (error) {
    console.error('خطأ:', error);
  }
}
```

### 2. تقرير النشاط

```jsx
// الحصول على نشاط مستخدم معين
const activity = await adminService.getUserActivity('user_1');
console.log('عدد الإجراءات:', activity.total_actions);
console.log('آخر نشاطات:', activity.recent_activities);
```

### 3. إدارة الأدوار والصلاحيات

```jsx
// إنشاء دور جديد
const role = await adminService.createRole({
  name: 'محقق البيانات',
  description: 'مسؤول تحليل البيانات',
});

// إضافة صلاحيات للدور
await adminService.assignPermissionToRole(role.id, 'VIEW_REPORTS');
await adminService.assignPermissionToRole(role.id, 'EXPORT_DATA');
```

### 4. تصدير البيانات

```jsx
// تصدير المستخدمين إلى CSV
const blob = await adminService.exportUsersToCSV();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'users.csv';
a.click();
```

---

## 🔐 المصادقة والتفويض

### إضافة Token

```javascript
// عند تسجيل دخول المستخدم:
localStorage.setItem('token', response.token);

// سيتم إرساله تلقائياً مع كل طلب:
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

### التحقق من الصلاحيات

```jsx
// التحقق قبل عرض الميزة:
const permissions = await adminService.getUserPermissions(userId);

if (permissions.permissions.includes('CREATE_USER')) {
  // عرض زر إنشاء مستخدم
}
```

---

## 🛠️ استكشاف الأخطاء

### المشكلة: 404 Not Found

```
❌ GET /api/admin/users 404

الحل:
1. تأكد من تسجيل الـ Blueprint:
   app.register_blueprint(admin_bp)
2. تأكد من المسار الصحيح:
   /api/admin/...
```

### المشكلة: 401 Unauthorized

```
❌ 401 Unauthorized

الحل:
1. تأكد من وجود Token
2. التحقق من صحة Token
3. إعادة تسجيل الدخول
```

### المشكلة: CORS Error

```
❌ CORS policy: No 'Access-Control-Allow-Origin'

الحل:
1. تفعيل CORS في Backend:
   CORS(app)
2. التحقق من صحة الدومين
```

---

## 📱 استجابة API

### نجاح (200)

```json
{
  "id": "user_1",
  "name": "علي",
  "email": "ali@example.com",
  ...
}
```

### خطأ (400)

```json
{
  "error": "Missing required fields"
}
```

### غير مرخص (401)

```json
{
  "error": "Unauthorized"
}
```

### غير موجود (404)

```json
{
  "error": "User not found"
}
```

---

## ✅ Checklist للتفعيل

- [ ] تم تسجيل Blueprint في Backend
- [ ] تم تفعيل CORS
- [ ] تم اختبار /api/admin/health
- [ ] تم إضافة Route في Frontend
- [ ] تم الوصول إلى /admin بنجاح
- [ ] تم إنشاء مستخدم تجريبي
- [ ] تم الحصول على الإحصائيات
- [ ] تم عرض سجلات التدقيق

---

## 📞 الدعم والمساعدة

### الأسئلة الشائعة

**س: كيف أضيف صلاحيات جديدة؟**

```python
class Permission(Enum):
    NEW_PERMISSION = "new_permission"
```

**س: كيف أغير الأدوار الافتراضية؟**

```python
ROLE_PERMISSIONS = {
    UserRole.NEW_ROLE: [permissions...]
}
```

**س: كيف أسجل إجراء مخصص؟**

```python
AdminService._log_audit("CUSTOM_ACTION", "التفاصيل")
```

---

**تم! النظام جاهز للاستخدام الفوري! 🚀**

# 🔐 Phase 2: RBAC Middleware - دليل التكامل السريع

**تم إنشاء جميع المكونات في 20 يناير 2026**

---

## ✅ ما تم إنجازه

### 🎯 Backend Files

| الملف                                   | الوصف                                | الأسطر |
| --------------------------------------- | ------------------------------------ | ------ |
| `backend/middleware/auth_middleware.py` | Middleware للمصادقة والصلاحيات       | 450    |
| `backend/routes/auth_routes.py`         | مسارات المصادقة (Login/Register/etc) | 400    |

**الميزات:**

- ✅ JWT Authentication
- ✅ Permission-Based Decorators
- ✅ Role-Based Decorators
- ✅ Token Management (Create/Verify/Refresh)
- ✅ 7 Decorators مختلفة

### 🎨 Frontend Files

| الملف                                            | الوصف                 | الأسطر |
| ------------------------------------------------ | --------------------- | ------ |
| `frontend/src/services/authService.js`           | خدمة المصادقة         | 280    |
| `frontend/src/hooks/usePermissions.js`           | React Hooks للصلاحيات | 150    |
| `frontend/src/components/Guards/RouteGuards.jsx` | حماية المسارات        | 220    |
| `frontend/src/components/Auth/Login.jsx`         | مكون تسجيل الدخول     | 100    |
| `frontend/src/components/Auth/Login.css`         | أنماط Login           | 80     |

**الميزات:**

- ✅ Authentication Service
- ✅ 8 Permission Hooks
- ✅ 10 Route Guards
- ✅ Login Component
- ✅ Role-Based Components

---

## 🚀 التكامل السريع (10 دقائق)

### الخطوة 1: Backend Setup (3 دقائق)

#### 1.1 تثبيت PyJWT

```bash
cd backend
pip install pyjwt
```

#### 1.2 تسجيل Routes في app.py

```python
from routes.auth_routes import auth_bp
from routes.admin_routes import admin_bp

# تسجيل Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
```

#### 1.3 إضافة Secret Key في .env

```env
JWT_SECRET_KEY=your-super-secret-key-change-in-production
```

---

### الخطوة 2: Frontend Setup (5 دقائق)

#### 2.1 تثبيت react-router-dom

```bash
cd frontend
npm install react-router-dom
```

#### 2.2 إعداد Routes في App.js

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  PrivateRoute,
  PublicRoute,
  PermissionRoute,
} from './components/Guards/RouteGuards';
import Login from './components/Auth/Login';
import AdminDashboard from './components/Admin/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Private Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Permission-Based Routes */}
        <Route
          path="/admin"
          element={
            <PermissionRoute permission="view_admin">
              <AdminDashboard />
            </PermissionRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

---

### الخطوة 3: استخدام Middleware (2 دقيقة)

#### 3.1 حماية Admin Routes

```python
from flask import Blueprint
from middleware.auth_middleware import AuthMiddleware
from services.admin_service import Permission

@admin_bp.route('/users', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_USERS)
def get_users():
    return jsonify(AdminService.get_all_users())

@admin_bp.route('/users', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.CREATE_USER)
def create_user():
    data = request.get_json()
    user = AdminService.create_user(data)
    return jsonify(user), 201
```

---

## 📖 أمثلة عملية

### Example 1: Backend Decorators

```python
from middleware.auth_middleware import AuthMiddleware
from services.admin_service import Permission, UserRole

# مصادقة فقط
@app.route('/profile')
@AuthMiddleware.require_auth
def profile():
    return jsonify({"user_id": g.user_id})

# صلاحية واحدة
@app.route('/users/delete/<id>')
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.DELETE_USER)
def delete_user(id):
    AdminService.delete_user(id)
    return jsonify({"message": "User deleted"})

# دور معين
@app.route('/admin-panel')
@AuthMiddleware.require_auth
@AuthMiddleware.require_role(UserRole.ADMIN)
def admin_panel():
    return jsonify({"message": "Welcome admin"})

# أي صلاحية من القائمة
@app.route('/users/view')
@AuthMiddleware.require_auth
@AuthMiddleware.require_any_permission([Permission.VIEW_USERS, Permission.EDIT_USER])
def view_users():
    return jsonify(AdminService.get_all_users())

# جميع الصلاحيات
@app.route('/critical-action')
@AuthMiddleware.require_auth
@AuthMiddleware.require_all_permissions([Permission.DELETE_USER, Permission.EDIT_ROLE])
def critical_action():
    return jsonify({"message": "Action performed"})
```

### Example 2: Frontend Hooks

```jsx
import { useAuth, usePermission, useRole } from '../hooks/usePermissions';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const canEditUsers = usePermission('edit_user');
  const isAdmin = useRole('admin');

  if (!isAuthenticated) {
    return <p>Please login</p>;
  }

  return (
    <div>
      <h1>Welcome {user.name}</h1>
      {canEditUsers && <button>Edit Users</button>}
      {isAdmin && <button>Admin Panel</button>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Example 3: Frontend Route Guards

```jsx
import { PermissionRoute, RoleRoute } from './components/Guards/RouteGuards';

// صلاحية واحدة
<Route path="/users/edit" element={
  <PermissionRoute permission="edit_user">
    <EditUsers />
  </PermissionRoute>
} />

// دور معين
<Route path="/admin" element={
  <RoleRoute role="admin">
    <AdminPanel />
  </RoleRoute>
} />

// أي صلاحية من القائمة
<Route path="/users" element={
  <AnyPermissionRoute permissions={['view_users', 'edit_user']}>
    <UsersList />
  </AnyPermissionRoute>
} />

// جميع الصلاحيات
<Route path="/critical" element={
  <AllPermissionsRoute permissions={['delete_user', 'edit_role']}>
    <CriticalAction />
  </AllPermissionsRoute>
} />
```

### Example 4: Conditional Rendering

```jsx
import {
  ConditionalRender,
  PermissionButton,
} from './components/Guards/RouteGuards';

function UserTable() {
  return (
    <div>
      <table>{/* ... */}</table>

      {/* زر يظهر فقط مع الصلاحية */}
      <PermissionButton permission="create_user">إضافة مستخدم</PermissionButton>

      {/* عرض شرطي */}
      <ConditionalRender
        permission="delete_user"
        fallback={<p>ليس لديك صلاحية الحذف</p>}
      >
        <button>حذف المستخدم</button>
      </ConditionalRender>
    </div>
  );
}
```

---

## 🧪 اختبار API

### 1. Register User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "admin"
  }'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_1",
    "name": "Test User",
    "email": "test@example.com",
    "role": "admin",
    "permissions": ["create_user", "edit_user", ...]
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Get Current User (with Token)

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Access Protected Route

```bash
curl -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Refresh Token

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"token": "OLD_TOKEN"}'
```

---

## 📊 الصلاحيات المتاحة

```python
# User Management
CREATE_USER = "create_user"
EDIT_USER = "edit_user"
DELETE_USER = "delete_user"
VIEW_USERS = "view_users"
RESET_PASSWORD = "reset_password"

# Role Management
CREATE_ROLE = "create_role"
EDIT_ROLE = "edit_role"
DELETE_ROLE = "delete_role"
VIEW_ROLES = "view_roles"
ASSIGN_PERMISSION = "assign_permission"

# Audit Logs
VIEW_AUDIT_LOGS = "view_audit_logs"
EXPORT_AUDIT_LOGS = "export_audit_logs"

# System
VIEW_STATS = "view_stats"
MANAGE_SYSTEM = "manage_system"
VIEW_REPORTS = "view_reports"
EXPORT_DATA = "export_data"
```

---

## 🎯 الأدوار المتاحة

```python
SUPER_ADMIN = "super_admin"  # جميع الصلاحيات
ADMIN = "admin"              # معظم الصلاحيات
MANAGER = "manager"          # إدارة محدودة
SUPERVISOR = "supervisor"    # مشاهدة وتعديل
STAFF = "staff"              # مشاهدة فقط
USER = "user"                # أساسية
```

---

## 🔧 Troubleshooting

### مشكلة: "Invalid token"

**الحل:**

```python
# تأكد من إضافة Secret Key
AuthMiddleware.SECRET_KEY = "your-secret-key"

# أو في .env
JWT_SECRET_KEY=your-secret-key
```

### مشكلة: "Authorization header is missing"

**الحل:**

```javascript
// تأكد من إضافة Bearer Token
headers: {
  'Authorization': `Bearer ${token}`
}
```

### مشكلة: "Insufficient permissions"

**الحل:**

```python
# تحقق من الصلاحيات في ROLE_PERMISSIONS
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        Permission.CREATE_USER,
        Permission.EDIT_USER,
        # ... أضف الصلاحيات المطلوبة
    ]
}
```

---

## ✅ Checklist

- [ ] تثبيت PyJWT
- [ ] تسجيل auth_bp في app.py
- [ ] إضافة JWT_SECRET_KEY في .env
- [ ] تثبيت react-router-dom
- [ ] إعداد Routes في App.js
- [ ] اختبار Login Endpoint
- [ ] اختبار Protected Endpoint
- [ ] تطبيق Decorators على Admin Routes
- [ ] تطبيق Guards على Frontend Routes
- [ ] اختبار Permission Hooks

---

## 🎉 الخطوة التالية

بعد إتمام Phase 2:

- ✅ Phase 1: Admin Dashboard
- ✅ Phase 2: RBAC Middleware
- ⏭️ Phase 3: AI Prediction System
- ⏭️ Phase 4: Advanced Reports System

---

**تاريخ الإنشاء:** 20 يناير 2026  
**الحالة:** ✅ جاهز للتطبيق  
**المدة المتوقعة:** 10 دقائق للتكامل

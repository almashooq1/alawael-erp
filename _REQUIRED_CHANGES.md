# ✏️ التعديلات المطلوبة لتفعيل نظام إدارة الحالات

## 📋 نظرة عامة

هذه التعديلات ضرورية لدمج نظام إدارة الحالات مع النظام الحالي.

---

## 🔧 التعديلات المطلوبة

### 1️⃣ ملف Backend Server

**الملف:** `erp_new_system/backend/server.js`

**التعديلات:**

#### أ) إضافة Requires (في بداية الملف)

```javascript
// بعد السطر:
// const express = require('express');

// أضف:
const path = require('path');

// بعد السطر:
// const authRoutes = require('./routes/auth');

// أضف:
const caseManagementRoutes = require('./routes/caseManagement');
const medicalFilesRoutes = require('./routes/medicalFiles');
```

#### ب) إضافة Routes (بعد باقي الـ routes)

```javascript
// بعد السطر:
// app.use('/api/auth', authRoutes);

// أضف:
app.use('/api/case-management', caseManagementRoutes);
app.use('/api/medical-files', medicalFilesRoutes);
```

#### ج) إضافة Middleware للملفات الثابتة

```javascript
// بعد السطر:
// app.use(express.json());

// أضف:
// Serve uploaded medical files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

---

### 2️⃣ ملف Frontend App

**الملف:** `erp_new_system/frontend/src/App.js`

**التعديلات:**

#### أ) إضافة Imports (في بداية الملف)

```javascript
// بعد السطر:
// import Dashboard from './pages/Dashboard';

// أضف:
import CaseManagementList from './components/CaseManagement/CaseManagementList';
import CaseDetails from './components/CaseManagement/CaseDetails';
```

#### ب) إضافة Routes (داخل <Routes>)

```javascript
// بعد السطر:
// <Route path="/dashboard" element={<Dashboard />} />

// أضف:
<Route path="/case-management" element={<CaseManagementList />} />
<Route path="/case-management/:id" element={<CaseDetails />} />
<Route path="/case-management/new" element={<CaseDetails />} />
```

---

### 3️⃣ ملف القائمة الجانبية (Sidebar)

**الملف:** `erp_new_system/frontend/src/components/layout/Sidebar.jsx`

**التعديلات:**

#### إضافة رابط إدارة الحالات

```javascript
// بعد السطر:
// import DashboardIcon from '@mui/icons-material/Dashboard';

// أضف:
import FolderSharedIcon from '@mui/icons-material/FolderShared';

// في قائمة menuItems، أضف:
{
  title: 'إدارة الحالات',
  icon: <FolderSharedIcon />,
  path: '/case-management',
  roles: ['admin', 'doctor', 'case_manager']
},
```

---

### 4️⃣ ملف Axios Configuration (اختياري)

**الملف:** `erp_new_system/frontend/src/utils/axios.js`

**إضافة (إن لم تكن موجودة):**

```javascript
// إضافة interceptor للـ file uploads
axios.interceptors.request.use(
  config => {
    // للطلبات التي تحتوي على FormData (رفع ملفات)
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);
```

---

### 5️⃣ ملف Package.json للـ Backend

**الملف:** `erp_new_system/backend/package.json`

**التحقق من وجود:**

```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1"
  }
}
```

**إذا لم يكن موجوداً، قم بالتثبيت:**

```bash
cd erp_new_system/backend
npm install multer --save
```

---

### 6️⃣ ملف Package.json للـ Frontend

**الملف:** `erp_new_system/frontend/package.json`

**التحقق من وجود:**

```json
{
  "dependencies": {
    "date-fns": "^2.30.0",
    "@mui/lab": "^5.0.0-alpha.170"
  }
}
```

**إذا لم تكن موجودة، قم بالتثبيت:**

```bash
cd erp_new_system/frontend
npm install date-fns @mui/lab --save
```

---

## 📝 ملف .gitignore

**الملف:** `erp_new_system/backend/.gitignore`

**أضف (إن لم يكن موجوداً):**

```
# Uploaded medical files
uploads/
!uploads/.gitkeep
```

**أنشئ ملف:** `erp_new_system/backend/uploads/.gitkeep` (ملف فارغ للحفاظ على
المجلد)

---

## 🔐 ملف Roles/Permissions

**الملف:** `erp_new_system/backend/middleware/auth.js`

**تحقق من وجود الأدوار:**

```javascript
const roles = {
  admin: ['*'], // كل الصلاحيات
  doctor: ['case_management', 'diagnoses', 'treatment_plans'],
  case_manager: ['case_management', 'notes', 'files'],
  therapist: ['treatment_plans', 'sessions'],
  user: ['view_only'],
};
```

---

## 🎯 خطوات التطبيق بالترتيب

### الخطوة 1: تثبيت الحزم

```bash
# Backend
cd erp_new_system/backend
npm install multer --save

# Frontend
cd ../frontend
npm install date-fns @mui/lab --save
```

### الخطوة 2: تعديل server.js

- افتح `erp_new_system/backend/server.js`
- أضف الـ requires في الأعلى
- أضف الـ routes بعد باقي الـ routes
- أضف middleware الملفات الثابتة

### الخطوة 3: تعديل App.js

- افتح `erp_new_system/frontend/src/App.js`
- أضف الـ imports في الأعلى
- أضف الـ routes داخل <Routes>

### الخطوة 4: تعديل Sidebar.jsx

- افتح `erp_new_system/frontend/src/components/layout/Sidebar.jsx`
- أضف الأيقونة المطلوبة
- أضف عنصر القائمة الجديد

### الخطوة 5: إنشاء مجلد الملفات

```bash
mkdir -p erp_new_system/backend/uploads/medical-files
touch erp_new_system/backend/uploads/.gitkeep
```

### الخطوة 6: إعادة التشغيل

```bash
# أوقف Backend والـ Frontend إن كانا يعملان
# ثم شغّل من جديد

# Backend
cd erp_new_system/backend
npm start

# Frontend (في terminal آخر)
cd erp_new_system/frontend
npm start
```

---

## ✅ التحقق من النجاح

### 1. Backend

افتح المتصفح وجرب:

```
http://localhost:3001/api/case-management/statistics/overview
```

يجب أن ترى:

```json
{
  "success": true,
  "data": {
    "totalCases": 0,
    "activeCases": 0,
    ...
  }
}
```

### 2. Frontend

افتح المتصفح:

```
http://localhost:3000/case-management
```

يجب أن ترى صفحة قائمة الحالات مع بطاقات الإحصائيات.

---

## 🐛 حل المشاكل

### مشكلة: Cannot find module 'multer'

**الحل:**

```bash
cd erp_new_system/backend
npm install multer --save
```

### مشكلة: date-fns not found

**الحل:**

```bash
cd erp_new_system/frontend
npm install date-fns --save
```

### مشكلة: 404 على /api/case-management

**الحل:**

- تأكد من إضافة الـ routes في server.js
- أعد تشغيل Backend

### مشكلة: صفحة فارغة في /case-management

**الحل:**

- تأكد من إضافة الـ imports والـ routes في App.js
- تحقق من console للـ errors
- أعد تشغيل Frontend

---

## 📞 الدعم

إذا واجهت أي مشاكل:

1. راجع console للـ errors
2. تحقق من Network tab في DevTools
3. راجع هذا الملف للتأكد من تطبيق جميع التعديلات

---

## 🎉 بعد التطبيق

النظام سيكون جاهزاً وستتمكن من:

- ✅ إنشاء حالات جديدة
- ✅ عرض قائمة الحالات
- ✅ البحث والفلترة
- ✅ عرض تفاصيل الحالة
- ✅ إضافة تشخيصات
- ✅ رفع ملفات طبية
- ✅ إنشاء خطط علاج
- ✅ إضافة ملاحظات

---

**تاريخ الإنشاء:** 22 يناير 2026  
**الإصدار:** 1.0.0  
**الحالة:** جاهز للتطبيق

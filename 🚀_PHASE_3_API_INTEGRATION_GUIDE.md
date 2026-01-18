# 🚀 المرحلة الثالثة: API Integration Guide

## ✨ نظرة عامة

هذه المرحلة تركز على **ربط Frontend مع Backend API** وتحويل البيانات من بيانات وهمية إلى بيانات حقيقية من خادم.

---

## 📋 المتطلبات الأساسية

### ✅ جاهز من Frontend

- ✅ axios instance مُعد (`api.js`)
- ✅ interceptors للتوثيق
- ✅ معالجة الأخطاء
- ✅ Pinia stores
- ✅ جميع الصفحات

### ⏳ نحتاج لإنشاء (Backend)

- [ ] Express.js / Flask server
- [ ] MongoDB / PostgreSQL database
- [ ] API endpoints
- [ ] Authentication (JWT)
- [ ] Data validation

---

## 🎯 خطوات التنفيذ

### الخطوة 1: إعداد Backend (Node.js)

#### 1.1 إنشاء مشروع Node.js

```bash
cd backend
npm init -y
npm install express cors dotenv axios mongoose
npm install -D nodemon
```

#### 1.2 ملف `package.json`

```json
{
  "name": "alawael-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "mongoose": "^7.0.0"
  }
}
```

#### 1.3 ملف `.env`

```env
PORT=3000
API_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/alawael
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### الخطوة 2: هيكل المشروع

```
backend/
├── server.js                 # نقطة الدخول
├── .env                      # متغيرات البيئة
├── package.json
│
├── config/
│   ├── database.js           # اتصال MongoDB
│   └── cors.js               # إعدادات CORS
│
├── models/
│   ├── Student.js            # نموذج الطالب
│   ├── Program.js            # نموذج البرنامج
│   ├── Session.js            # نموذج الجلسة
│   ├── Plan.js               # نموذج الخطة
│   └── User.js               # نموذج المستخدم
│
├── routes/
│   ├── students.js           # endpoints الطلاب
│   ├── programs.js           # endpoints البرامج
│   ├── sessions.js           # endpoints الجلسات
│   ├── plans.js              # endpoints الخطط
│   └── auth.js               # endpoints التوثيق
│
├── controllers/
│   ├── studentController.js  # منطق الطلاب
│   ├── programController.js  # منطق البرامج
│   ├── sessionController.js  # منطق الجلسات
│   ├── planController.js     # منطق الخطط
│   └── authController.js     # منطق التوثيق
│
├── middleware/
│   ├── auth.js               # تحقق من التوثيق
│   └── errorHandler.js       # معالجة الأخطاء
│
└── utils/
    └── validators.js         # التحقق من البيانات
```

---

## 🔗 API Endpoints المطلوبة

### 1. Students Endpoints

```
GET    /api/students              # الحصول على جميع الطلاب
POST   /api/students              # إنشاء طالب جديد
GET    /api/students/:id          # الحصول على طالب محدد
PUT    /api/students/:id          # تحديث بيانات الطالب
DELETE /api/students/:id          # حذف طالب
GET    /api/students/search?q=    # بحث عن طلاب
```

### 2. Programs Endpoints

```
GET    /api/programs              # الحصول على جميع البرامج
POST   /api/programs              # إنشاء برنامج جديد
GET    /api/programs/:id          # الحصول على برنامج محدد
PUT    /api/programs/:id          # تحديث البرنامج
DELETE /api/programs/:id          # حذف برنامج
```

### 3. Sessions Endpoints

```
GET    /api/sessions              # الحصول على جميع الجلسات
POST   /api/sessions              # إنشاء جلسة جديدة
GET    /api/sessions/:id          # الحصول على جلسة محددة
PUT    /api/sessions/:id          # تحديث الجلسة
DELETE /api/sessions/:id          # حذف جلسة
```

### 4. Plans Endpoints

```
GET    /api/plans                 # الحصول على جميع الخطط
POST   /api/plans                 # إنشاء خطة جديدة
GET    /api/plans/:id             # الحصول على خطة محددة
PUT    /api/plans/:id             # تحديث الخطة
DELETE /api/plans/:id             # حذف خطة
```

### 5. Authentication Endpoints

```
POST   /api/auth/register         # تسجيل مستخدم جديد
POST   /api/auth/login            # تسجيل الدخول
POST   /api/auth/logout           # تسجيل الخروج
POST   /api/auth/refresh          # تحديث التوكن
GET    /api/auth/me               # بيانات المستخدم الحالي
```

---

## 💾 نماذج قاعدة البيانات

### نموذج الطالب (Student)

```javascript
{
  _id: ObjectId,
  name: String,              // الاسم الكامل
  email: String,             // البريد الإلكتروني
  phone: String,             // رقم الهاتف
  program: ObjectId,         // معرف البرنامج
  registrationDate: Date,    // تاريخ التسجيل
  status: String,            // الحالة (active, completed, suspended)
  progress: Number,          // نسبة التقدم (0-100)
  attendance: Number,        // نسبة الحضور (0-100)
  notes: String,             // ملاحظات
  createdAt: Date,
  updatedAt: Date
}
```

### نموذج البرنامج (Program)

```javascript
{
  _id: ObjectId,
  title: String,             // اسم البرنامج
  description: String,       // الوصف
  level: String,             // المستوى (beginner, intermediate, advanced)
  duration: Number,          // المدة بالساعات
  instructor: String,        // اسم المحاضر
  capacity: Number,          // السعة الكلية
  enrolled: Number,          // عدد المسجلين
  status: String,            // الحالة (active, inactive, planning)
  startDate: Date,           // تاريخ البدء
  endDate: Date,             // تاريخ الانتهاء
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 آلية المصادقة

### 1. تسجيل الدخول

```javascript
// POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}

// الرد:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123",
    "name": "Admin",
    "email": "admin@example.com"
  }
}
```

### 2. الطلبات مع التوثيق

```javascript
// جميع الطلبات تحتاج على Bearer Token
headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
}
```

### 3. تجديد التوكن

```javascript
// POST /api/auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

// الرد:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 🔄 تحديث Frontend للعمل مع API

### الخطوة 1: تحديث `useStudentStore.js`

```javascript
import { defineStore } from 'pinia';
import api from '@/utils/api';
import { useNotification } from '@/composables/useNotification';

export const useStudentStore = defineStore('student', {
  state: () => ({
    students: [],
    currentStudent: null,
    loading: false,
    error: null,
  }),

  actions: {
    // جلب الطلاب من API
    async fetchStudents() {
      this.loading = true;
      try {
        const response = await api.get('/students');
        this.students = response.data.data;
        this.error = null;
      } catch (error) {
        this.error = error.response?.data?.message || 'خطأ في جلب البيانات';
        useNotification().showError(this.error);
      } finally {
        this.loading = false;
      }
    },

    // إضافة طالب جديد
    async addStudent(studentData) {
      this.loading = true;
      try {
        const response = await api.post('/students', studentData);
        this.students.push(response.data.data);
        useNotification().showSuccess('تم إضافة الطالب بنجاح');
        return response.data.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'خطأ في إضافة الطالب';
        useNotification().showError(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // تحديث طالب
    async updateStudent(id, studentData) {
      this.loading = true;
      try {
        const response = await api.put(`/students/${id}`, studentData);
        const index = this.students.findIndex(s => s._id === id);
        if (index !== -1) {
          this.students[index] = response.data.data;
        }
        useNotification().showSuccess('تم تحديث الطالب بنجاح');
        return response.data.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'خطأ في التحديث';
        useNotification().showError(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // حذف طالب
    async deleteStudent(id) {
      this.loading = true;
      try {
        await api.delete(`/students/${id}`);
        this.students = this.students.filter(s => s._id !== id);
        useNotification().showSuccess('تم حذف الطالب بنجاح');
      } catch (error) {
        this.error = error.response?.data?.message || 'خطأ في الحذف';
        useNotification().showError(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
```

### الخطوة 2: تحديث الصفحات

```vue
<!-- Students.vue -->
<script setup>
import { onMounted } from 'vue';
import { useStudentStore } from '@/stores/useStudentStore';
import DataTable from '@/components/DataTable.vue';
import StatCard from '@/components/StatCard.vue';

const studentStore = useStudentStore();

onMounted(async () => {
  await studentStore.fetchStudents();
});
</script>

<template>
  <div class="page">
    <h1>الطلاب</h1>

    <!-- رسالة التحميل -->
    <div v-if="studentStore.loading" class="loading">جاري التحميل...</div>

    <!-- رسالة الخطأ -->
    <div v-if="studentStore.error" class="error">
      {{ studentStore.error }}
    </div>

    <!-- البيانات -->
    <div v-if="!studentStore.loading && studentStore.students.length">
      <DataTable :columns="columns" :data="studentStore.students" />
    </div>

    <!-- لا توجد بيانات -->
    <div v-if="!studentStore.loading && !studentStore.students.length" class="empty">لا توجد بيانات</div>
  </div>
</template>
```

---

## 📝 ملف `.env` للـ Frontend

أضف في `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Alawael Training Center
VITE_APP_VERSION=1.0.0
```

---

## ✅ قائمة المراجعة

### Phase 3 Implementation

- [ ] إنشاء مشروع Backend (Node.js/Express)
- [ ] إعداد قاعدة البيانات (MongoDB)
- [ ] إنشاء نماذج البيانات
- [ ] تطوير API endpoints
- [ ] تطبيق المصادقة (JWT)
- [ ] تحديث Pinia stores
- [ ] تحديث الصفحات للعمل مع API
- [ ] اختبار جميع العمليات
- [ ] معالجة الأخطاء الشاملة
- [ ] توثيق API

---

## 🧪 اختبار API

### استخدام Postman أو curl

```bash
# تسجيل الدخول
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# الحصول على الطلاب
curl -X GET http://localhost:3000/api/students \
  -H "Authorization: Bearer YOUR_TOKEN"

# إضافة طالب جديد
curl -X POST http://localhost:3000/api/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "أحمد محمود",
    "email": "ahmad@example.com",
    "phone": "01234567890",
    "program": "609f7c3b3e5d8a001f8c6d4c"
  }'
```

---

## 🚀 التشغيل

### تشغيل Frontend و Backend معاً

```bash
# في Terminal 1: تشغيل Backend
cd backend
npm install
npm run dev
# سيعمل على http://localhost:3000

# في Terminal 2: تشغيل Frontend
cd frontend
npm install
npm run dev
# سيعمل على http://localhost:5173
```

---

## 📚 الموارد المفيدة

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT Authentication](https://jwt.io/)
- [CORS Configuration](https://expressjs.com/en/resources/middleware/cors.html)

---

## 🎯 الخطوات التالية

1. ✅ **Backend Setup** (2-3 ساعات)
   - Express.js server
   - MongoDB connection
   - Basic CRUD operations

2. ✅ **API Endpoints** (2-3 ساعات)
   - Students CRUD
   - Programs CRUD
   - Sessions CRUD
   - Plans CRUD

3. ✅ **Authentication** (1-2 ساعة)
   - JWT implementation
   - Login/Register
   - Token refresh

4. ✅ **Frontend Integration** (1-2 ساعة)
   - Connect stores to API
   - Update pages
   - Error handling

5. ✅ **Testing** (2-3 ساعات)
   - Manual testing
   - API testing
   - Performance testing

---

**المرحلة الثالثة ستضيف 30% للمشروع ليصبح 100% اكتمالاً!** 🎉

# دليل تكامل Phase 13 مع التطبيق الرئيسي
## Integration Guide - Integrating Phase 13 with Main App

---

## 📌 نظرة عامة على التكامل

هذا الدليل يشرح كيفية دمج مكونات ونماذج Phase 13 مع التطبيق الرئيسي الموجود.

---

## الخطوة 1: تكامل Backend

### 1.1 التحقق من التسجيل

تأكد من أن الراوتات الثلاث مسجلة في `backend/app.js`:

```javascript
// يجب أن تكون موجودة في app.js حول السطر 121-147

const specializedProgramsRouter = safeRequire('./routes/specializedPrograms');
const advancedSessionsRouter = safeRequire('./routes/advancedSessions');
const smartSchedulerRouter = safeRequire('./routes/smartScheduler');

// ...

if (specializedProgramsRouter) app.use('/api/programs', specializedProgramsRouter);
if (advancedSessionsRouter) app.use('/api/sessions', advancedSessionsRouter);
if (smartSchedulerRouter) app.use('/api/scheduler', smartSchedulerRouter);
```

### 1.2 تفعيل الوسط الوسيط (Middleware)

تأكد من أن جميع الوسط الوسيط المطلوب مفعل:

```javascript
// في app.js - تحقق من وجود:
app.use(express.json());                    // JSON parsing
app.use(express.urlencoded());              // URL encoded data
app.use(authMiddleware);                    // Authentication
app.use(rbacMiddleware);                    // Role-based access control
app.use(errorHandler);                      // Error handling
```

### 1.3 التحقق من الاتصال بقاعدة البيانات

```javascript
// تأكد من اتصال MongoDB:
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));
```

---

## الخطوة 2: تكامل Frontend

### 2.1 نسخ المكونات

انسخ الملفات التالية إلى مشروعك:

```bash
# نسخ المكونات
cp frontend/src/components/SpecializedPrograms.jsx src/components/
cp frontend/src/components/SpecializedPrograms.css src/components/

cp frontend/src/components/AdvancedSessions.jsx src/components/
cp frontend/src/components/AdvancedSessions.css src/components/

cp frontend/src/components/SmartScheduler.jsx src/components/
cp frontend/src/components/SmartScheduler.css src/components/
```

### 2.2 استيراد المكونات في App.jsx

```javascript
// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// استيراد المكونات الجديدة
import SpecializedPrograms from './components/SpecializedPrograms';
import AdvancedSessions from './components/AdvancedSessions';
import SmartScheduler from './components/SmartScheduler';

// استيراد المكونات الموجودة
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <Navigation />
      <Routes>
        {/* الطرق الموجودة */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* طرق Phase 13 الجديدة */}
        <Route path="/programs" element={<SpecializedPrograms />} />
        <Route path="/sessions" element={<AdvancedSessions />} />
        <Route path="/scheduler" element={<SmartScheduler />} />
      </Routes>
    </Router>
  );
}

export default App;
```

### 2.3 تحديث شريط التنقل

```javascript
// src/components/Navigation.jsx

import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <nav className="main-navigation">
      <div className="nav-links">
        {/* الروابط الموجودة */}
        <Link to="/dashboard">لوحة التحكم</Link>
        <Link to="/users">المستخدمون</Link>
        
        {/* الروابط الجديدة لـ Phase 13 */}
        <div className="phase-13-links">
          <h3>الخدمات المتخصصة</h3>
          <Link to="/programs">البرامج المتخصصة</Link>
          <Link to="/sessions">الجلسات المتقدمة</Link>
          <Link to="/scheduler">الجدولة الذكية</Link>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
```

---

## الخطوة 3: تحديث المتغيرات البيئية

### 3.1 ملف Backend .env

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/alawael

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRE=7d

# CORS (تحديث إذا لزم الأمر)
CORS_ORIGIN=http://localhost:3000

# Features
ENABLE_PHASE_13=true
```

### 3.2 ملف Frontend .env

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000
REACT_APP_API_VERSION=v1
REACT_APP_REQUEST_TIMEOUT=30000

# Feature Flags
REACT_APP_ENABLE_PHASE_13=true
REACT_APP_ENABLE_PROGRAMS=true
REACT_APP_ENABLE_SESSIONS=true
REACT_APP_ENABLE_SCHEDULER=true
```

---

## الخطوة 4: التحقق من التوافقية

### 4.1 فحص إصدارات الحزم

```bash
# تحقق من أن لديك الإصدارات المناسبة:
npm list react              # يجب أن يكون 17+
npm list react-router-dom   # يجب أن يكون 6+
npm list mongoose           # يجب أن يكون 5+
npm list express            # يجب أن يكون 4+
```

### 4.2 تحديث الحزم المطلوبة

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

---

## الخطوة 5: اختبار التكامل

### 5.1 اختبار التوصيل

```bash
# في Terminal - فحص الاتصال بـ API
curl http://localhost:5000/api/programs
# يجب أن تحصل على قائمة البرامج

# أو استخدم Postman/Insomnia
GET http://localhost:5000/api/programs
```

### 5.2 اختبار المكونات

```javascript
// في المتصفح - استقصاء Console
// يجب أن لا تكون هناك أخطاء

// اختبر المسارات:
// http://localhost:3000/programs
// http://localhost:3000/sessions
// http://localhost:3000/scheduler
```

### 5.3 اختبار المصادقة

```javascript
// تأكد من أن:
// 1. المستخدم مصرح به
// 2. الرموز (Tokens) صحيحة
// 3. الصلاحيات (Permissions) موجودة

// في الكود:
const response = await fetch('/api/programs', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## الخطوة 6: معالجة الأخطاء الشائعة

### المشكلة 1: خطأ CORS

```javascript
// الحل: تحديث CORS في app.js
const cors = require('cors');
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

### المشكلة 2: خطأ 404 للراوتات

```javascript
// تحقق من:
// 1. ترتيب تسجيل الراوتات
// 2. أسماء الملفات صحيحة
// 3. مسارات التصدير صحيحة
```

### المشكلة 3: خطأ في تحميل المكونات

```javascript
// تحقق من:
// 1. المسارات النسبية صحيحة
// 2. أسماء المكونات مطابقة
// 3. ملفات CSS في نفس الدليل
```

### المشكلة 4: خطأ في الاتصال بـ MongoDB

```javascript
// تحقق من:
// 1. MongoDB مشغّل ومستمع
// 2. MONGODB_URI صحيح في .env
// 3. قاعدة البيانات موجودة
```

---

## الخطوة 7: تكوين الصلاحيات (RBAC)

### 7.1 تحديد الأدوار المطلوبة

```javascript
// backend/middleware/rbac.js - إضافة أدوار جديدة

const rolePermissions = {
  admin: [
    'create:program',
    'read:program',
    'update:program',
    'delete:program',
    'manage:session',
    'manage:scheduler'
  ],
  
  specialist: [
    'read:program',
    'create:session',
    'update:session',
    'view:scheduler'
  ],
  
  beneficiary: [
    'read:program',
    'view:session',
    'view:scheduler'
  ]
};
```

### 7.2 حماية الراوتات

```javascript
// backend/routes/specializedPrograms.js

const { protect, authorize } = require('../middleware/auth');

// حماية الراوت
router.post('/api/programs', 
  protect,                           // يجب أن يكون مسجل دخول
  authorize('admin', 'specialist'),  // يجب أن يكون له الصلاحية
  createProgram
);
```

---

## الخطوة 8: إعداد قاعدة البيانات

### 8.1 تشغيل بيانات البذر

```bash
# قم بتشغيل ملف البذر
node scripts/seedPhase13Data.js
```

### 8.2 التحقق من البيانات

```bash
# في MongoDB Compass أو عبر CLI:
db.specializedprograms.find()
db.advancedsessions.find()
db.smartschedulers.find()
```

---

## الخطوة 9: التكامل مع المكونات الموجودة

### 9.1 استخدام نفس نمط API

```javascript
// تأكد من استخدام نفس نمط استدعاء API

// نمط موجود:
const response = await fetch('/api/users', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// نفس النمط للبرامج:
const programsResponse = await fetch('/api/programs', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 9.2 استخدام نفس نمط الحالة (State)

```javascript
// استخدم نفس pattern للحالة مثل المكونات الأخرى
const [programs, setPrograms] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// استرجع البيانات
useEffect(() => {
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/programs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPrograms(data.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  
  fetchPrograms();
}, [token]);
```

---

## الخطوة 10: الاختبار الشامل

### 10.1 قائمة التحقق من التكامل

```
✅ Backend Files:
  ☐ specializedProgram.js
  ☐ advancedSession.js
  ☐ smartScheduler.js
  ☐ specializedPrograms routes
  ☐ advancedSessions routes
  ☐ smartScheduler routes
  ☐ app.js مع التسجيل

✅ Frontend Files:
  ☐ SpecializedPrograms.jsx
  ☐ AdvancedSessions.jsx
  ☐ SmartScheduler.jsx
  ☐ ملفات CSS (3)
  ☐ App.jsx محدث
  ☐ Navigation محدثة

✅ Configuration:
  ☐ .env Backend
  ☐ .env Frontend
  ☐ MongoDB متصل
  ☐ CORS مُعد
  ☐ RBAC مُعد

✅ Testing:
  ☐ API endpoints تعمل
  ☐ المكونات تظهر
  ☐ البيانات تحميل بشكل صحيح
  ☐ المصادقة تعمل
  ☐ الأخطاء معالجة بشكل صحيح
```

### 10.2 سيناريوهات الاختبار

```
1. إنشاء برنامج جديد
   ✓ الفورم يظهر
   ✓ البيانات تُحفظ
   ✓ البرنامج يظهر في القائمة

2. إنشاء جلسة جديدة
   ✓ الفورم يظهر
   ✓ الجلسة تُنشأ
   ✓ تحديثات الحالة تعمل

3. استخدام الجدولة الذكية
   ✓ توليد المقترحات يعمل
   ✓ الموافقة تسجل
   ✓ التفعيل ينجح
```

---

## الخطوة 11: التوثيق والصيانة

### 11.1 توثيق التغييرات

```markdown
# تغييرات Phase 13

## المكونات الجديدة:
- SpecializedPrograms.jsx
- AdvancedSessions.jsx
- SmartScheduler.jsx

## الراوتات الجديدة:
- POST /api/programs
- GET /api/sessions
- POST /api/scheduler/create-schedule

## المتطلبات الجديدة:
- mongoose 5+
- react-router-dom 6+

## الملفات المعدلة:
- backend/app.js
- src/App.jsx
- src/components/Navigation.jsx
```

### 11.2 تحديث README

```markdown
## Phase 13 - البرامج المتخصصة والجلسات المتقدمة

### المميزات الجديدة:
- إدارة البرامج حسب نوع الإعاقة
- تتبع شامل للجلسات
- جدولة ذكية

### كيفية البدء:
```

---

## الخطوة 12: الدعم والصيانة المستمرة

### 12.1 المراقبة

```javascript
// أضف logging للمراقبة:
console.log('📊 Program Created:', program.code);
console.log('📅 Session Scheduled:', session._id);
console.log('⏰ Smart Scheduler Created:', scheduler._id);
```

### 12.2 النسخ الاحتياطية

```bash
# قم بعمل نسخ احتياطية منتظمة
mongodump --uri mongodb://localhost:27017/alawael --out ./backups/$(date +%Y%m%d_%H%M%S)
```

### 12.3 التحديثات الدورية

```bash
# حدّث الحزم بانتظام
npm update

# تحقق من الثغرات الأمنية
npm audit

# أصلح الثغرات
npm audit fix
```

---

## الدعم والمساعدة

إذا واجهت مشاكل:

1. تحقق من [معالجة الأخطاء الشائعة](#الخطوة-6-معالجة-الأخطاء-الشائعة)
2. راجع [وثائق Phase 13](⚡_PHASE_13_SPECIALIZED_PROGRAMS_DOCUMENTATION.md)
3. تحقق من [دليل الاختبار](⚡_PHASE_13_TESTING_GUIDE.md)
4. تواصل مع فريق الدعم

---

**آخر تحديث: 22 يناير 2026**
**الإصدار: 1.0.0**
**الحالة: جاهز للتطبيق ✅**

# 📚 دليل المطور الشامل - نظام إدارة مراكز التأهيل

## 📖 المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [البنية المعمارية](#البنية-المعمارية)
3. [إعدادات التطوير](#إعدادات-التطوير)
4. [دليل API](#دليل-api)
5. [دليل Frontend](#دليل-frontend)
6. [الاختبار والنشر](#الاختبار-والنشر)
7. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## 🎯 نظرة عامة

### وصف المشروع

نظام متكامل لإدارة مراكز التأهيل يوفر:

- إدارة المستفيدين والبيانات الطبية
- جدولة ومتابعة جلسات العلاج
- إنشاء وتوزيع التقارير
- تتبع الأهداف والتقدم
- إدارة البرامج التأهيلية

### الجمهور المستهدف

- مديرو المراكز
- المعالجون والأخصائيون
- الممرضون
- الإداريون

### حالة المشروع

- **الإصدار:** 1.0-Beta
- **الحالة:** 80% إكمال
- **آخر تحديث:** [التاريخ]

---

## 🏗️ البنية المعمارية

### المعمارية الشاملة

```
┌─────────────────┐
│   Frontend      │ (React + Redux)
│   (3000)        │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Nginx  │
    │(80/443) │
    └────┬────┘
         │
┌────────▼────────┐
│     Backend     │ (Flask)
│     (5000)      │
│  ┌──────────┐   │
│  │  REST    │   │
│  │   API    │   │
│  └──────────┘   │
│  ┌──────────┐   │
│  │ WebSocket│   │
│  └──────────┘   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Database  │ (PostgreSQL/SQLite)
    │ & Cache   │ (Redis)
    └───────────┘
```

### طبقات التطبيق

**Backend Layers:**

1. **API Layer** - Flask Routes
2. **Business Logic** - Services
3. **Data Access** - SQLAlchemy Models
4. **Database** - PostgreSQL/SQLite

**Frontend Layers:**

1. **Presentation** - React Components
2. **State Management** - Redux Store
3. **API Integration** - Axios Service
4. **Routing** - React Router

---

## ⚙️ إعدادات التطوير

### المتطلبات الأساسية

```
Python 3.8+
Node.js 14+
PostgreSQL 12+ (أو SQLite)
Redis (اختياري)
Git
```

### خطوات الإعداد الكاملة

#### 1. استنساخ المشروع

```bash
git clone https://github.com/your-repo/rehabilitation-center.git
cd rehabilitation-center
```

#### 2. إعداد Backend

```bash
# انتقل إلى مجلد Backend
cd backend

# أنشئ بيئة افتراضية
python -m venv venv

# فعّل البيئة الافتراضية
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# ثبّت المتطلبات
pip install -r requirements.txt

# أنشئ ملف .env
cat > .env << EOF
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=postgresql://user:password@localhost/rehab
JWT_SECRET_KEY=your-secret-key
REDIS_URL=redis://localhost:6379
EOF

# شغّل تهيئة قاعدة البيانات
python
>>> from app import db
>>> db.create_all()
>>> exit()

# شغّل الخادم
python app.py
```

#### 3. إعداد Frontend

```bash
# افتح Terminal جديد
cd frontend

# ثبّت المكتبات
npm install

# أنشئ ملف .env.local
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local

# شغّل التطبيق
npm start
```

---

## 📡 دليل API

### البنية العامة للـ Requests

```javascript
// Authentication
Authorization: Bearer {access_token}
Content-Type: application/json

// Example Request:
GET /api/beneficiaries
Headers: {
  Authorization: "Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### endpoints الرئيسية

#### 🔐 Authentication

```
POST /api/auth/register          - تسجيل مستخدم جديد
POST /api/auth/login             - تسجيل الدخول
POST /api/auth/logout            - تسجيل الخروج
POST /api/auth/refresh           - تحديث الـ Token
GET  /api/auth/profile           - الحصول على بيانات المستخدم
PUT  /api/auth/profile           - تحديث بيانات المستخدم
```

#### 👥 Beneficiaries

```
GET    /api/beneficiaries                  - قائمة المستفيدين
GET    /api/beneficiaries/:id              - تفاصيل مستفيد
POST   /api/beneficiaries                  - إضافة مستفيد
PUT    /api/beneficiaries/:id              - تعديل مستفيد
DELETE /api/beneficiaries/:id              - حذف مستفيد
GET    /api/beneficiaries/:id/sessions     - جلسات المستفيد
GET    /api/beneficiaries/stats            - إحصائيات
```

#### 📋 Reports

```
GET    /api/reports                        - قائمة التقارير
GET    /api/reports/:id                    - تفاصيل التقرير
POST   /api/reports                        - إنشاء تقرير
PUT    /api/reports/:id                    - تعديل تقرير
DELETE /api/reports/:id                    - حذف تقرير
POST   /api/reports/:id/publish            - نشر التقرير
POST   /api/reports/:id/comments           - إضافة تعليق
GET    /api/reports/:id/versions           - إصدارات التقرير
```

#### 🎯 Sessions

```
GET    /api/sessions                       - قائمة الجلسات
GET    /api/sessions/:id                   - تفاصيل الجلسة
POST   /api/sessions                       - جدولة جلسة
PUT    /api/sessions/:id                   - تعديل الجلسة
DELETE /api/sessions/:id                   - حذف الجلسة
POST   /api/sessions/:id/complete          - إكمال الجلسة
POST   /api/sessions/:id/cancel            - إلغاء الجلسة
```

#### 📊 Assessments

```
GET    /api/assessments                    - قائمة التقييمات
GET    /api/assessments/:id                - تفاصيل التقييم
POST   /api/assessments                    - إنشاء تقييم
PUT    /api/assessments/:id                - تعديل التقييم
DELETE /api/assessments/:id                - حذف التقييم
POST   /api/assessments/:id/compare        - مقارنة التقييمات
```

#### 🏥 Programs

```
GET    /api/programs                       - قائمة البرامج
GET    /api/programs/:id                   - تفاصيل البرنامج
POST   /api/programs                       - إنشاء برنامج
PUT    /api/programs/:id                   - تعديل البرنامج
POST   /api/programs/:id/enroll            - تسجيل مستفيد
```

#### 🎲 Goals

```
GET    /api/goals                          - قائمة الأهداف
GET    /api/goals/:id                      - تفاصيل الهدف
POST   /api/goals                          - إنشاء هدف
PUT    /api/goals/:id                      - تعديل الهدف
POST   /api/goals/:id/progress             - تحديث التقدم
```

### نماذج Response

#### Success Response

```json
{
  "status": "success",
  "message": "البيانات تم جلبها بنجاح",
  "data": {
    /* entity */
  },
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 100,
    "pages": 10
  }
}
```

#### Error Response

```json
{
  "status": "error",
  "message": "خطأ في العملية",
  "code": "VALIDATION_ERROR",
  "errors": {
    "field_name": ["error message"]
  }
}
```

---

## 🎨 دليل Frontend

### هيكل المشروع

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── App.jsx              # المكون الرئيسي
│   ├── index.js             # نقطة الدخول
│   ├── pages/               # الصفحات الرئيسية
│   │   ├── Auth/
│   │   ├── Dashboard/
│   │   ├── Beneficiaries/
│   │   ├── Reports/
│   │   ├── Sessions/
│   │   ├── Assessments/
│   │   ├── Programs/
│   │   └── Goals/
│   ├── components/          # المكونات المشتركة
│   ├── layouts/             # المخططات الأساسية
│   ├── routes/              # إعدادات التوجيه
│   ├── store/               # Redux Store
│   │   └── slices/          # Redux Slices
│   ├── services/            # خدمات API
│   ├── hooks/               # Custom Hooks
│   ├── utils/               # وظائف مساعدة
│   └── styles/              # أنماط عامة
├── .env.local              # متغيرات البيئة
├── package.json
└── README.md
```

### Redux Store Structure

```javascript
store: {
  auth: {
    user: null,
    isAuthenticated: false,
    tokens: { access: "", refresh: "" },
    loading: false,
    error: null
  },
  beneficiaries: {
    list: [],
    currentBeneficiary: null,
    pagination: {},
    loading: false,
    error: null
  },
  reports: {
    list: [],
    currentReport: null,
    pagination: {},
    loading: false,
    error: null
  },
  // ... similar for other slices
}
```

### مثال على استخدام Component

```javascript
import { useDispatch, useSelector } from 'react-redux';
import { fetchBeneficiaries, createBeneficiary } from '../store/slices/beneficiariesSlice';

function BeneficiariesPage() {
  const dispatch = useDispatch();
  const { beneficiaries, loading } = useSelector(state => state.beneficiaries);

  useEffect(() => {
    dispatch(fetchBeneficiaries({ page: 1, per_page: 10 }));
  }, []);

  const handleCreate = async data => {
    try {
      await dispatch(createBeneficiary(data)).unwrap();
      // Success handling
    } catch (error) {
      // Error handling
    }
  };

  if (loading) return <CircularProgress />;

  return <div>{/* Content */}</div>;
}
```

---

## 🧪 الاختبار والنشر

### اختبار Backend

```bash
cd backend

# اختبر الـ Models
python -m pytest tests/test_models.py -v

# اختبر الـ Routes
python -m pytest tests/test_routes.py -v

# اختبر كل شيء
python -m pytest -v

# اختبر مع Coverage
python -m pytest --cov=app tests/
```

### اختبار Frontend

```bash
cd frontend

# تشغيل الاختبارات
npm test

# اختبار مع Coverage
npm test -- --coverage

# اختبار E2E (Cypress)
npm run cypress:open
```

### البناء للإنتاج

```bash
# Backend
cd backend
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# Frontend
cd frontend
npm run build
# سيتم إنشاء مجلد build جاهز للنشر
```

### النشر مع Docker

```bash
# بناء الصور
docker build -t rehab-backend ./backend
docker build -t rehab-frontend ./frontend

# تشغيل باستخدام Docker Compose
docker-compose up -d

# عرض السجلات
docker-compose logs -f backend
docker-compose logs -f frontend

# إيقاف الخدمات
docker-compose down
```

---

## 🐛 استكشاف الأخطاء

### الأخطاء الشائعة وحلولها

#### 1. CORS Error

```
المشكلة: Access to XMLHttpRequest has been blocked by CORS policy

الحل:
في backend/app.py:
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

#### 2. Database Connection Error

```
المشكلة: could not connect to server: Connection refused

الحل:
1. تحقق من تشغيل PostgreSQL: psql -U postgres
2. أو استخدم SQLite: sqlite:///rehabilitation.db
3. تحقق من DATABASE_URL في .env
```

#### 3. JWT Token Expired

```
المشكلة: Invalid or expired token

الحل:
سيتم تحديث الـ Token تلقائياً باستخدام Refresh Token
في frontend/src/services/api.js الـ Interceptor يتولى هذا
```

#### 4. Port Already in Use

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

#### 5. Module Not Found

```bash
# في Backend
pip install -r requirements.txt --upgrade

# في Frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

---

## 📞 أرقام الاتصال والدعم

### فريق التطوير

- **البريد الإلكتروني:** dev@example.com
- **Chat:** #rehabilitation-channel
- **الاجتماعات:** الاثنين والخميس 10 صباحاً

### موارد مفيدة

- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev)
- [Redux Documentation](https://redux.js.org)
- [Material-UI Documentation](https://mui.com)

---

## 🎓 الخطوات التالية

### للمطورين الجدد

1. ✅ اقرأ هذا الدليل بالكامل
2. ✅ قم بإعداد البيئة التطويرية
3. ✅ شغّل التطبيق محلياً
4. ✅ عدّل ملف بسيط (مثل رسالة ترحيب)
5. ✅ التزم بالتغييرات

### للمساهمين

1. ✅ انشئ فرع جديد: `git checkout -b feature/new-feature`
2. ✅ قم بالتغييرات المطلوبة
3. ✅ اكتب الاختبارات
4. ✅ التزم بالتغييرات: `git commit -m "Add new feature"`
5. ✅ ادفع الفرع: `git push origin feature/new-feature`
6. ✅ أنشئ Pull Request

---

## 📄 الترخيص

هذا المشروع مرخص تحت MIT License.

---

_آخر تحديث: الآن | المؤلف: فريق التطوير_

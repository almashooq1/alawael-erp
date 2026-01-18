# 🏗️ دليل البنية المعمارية والتثبيت - نظام الموارد البشرية السعودي

**الإصدار:** v1.0.0  
**التاريخ:** 14 يناير 2026  
**الموضوع:** البنية المعمارية الكاملة والتثبيت والنشر

---

## 📐 البنية المعمارية الشاملة

### 1. معمارية النظام العام

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (الواجهة)                  │
│  ┌──────────────────┬──────────────────┬─────────────────┐  │
│  │  Web Browser     │  Mobile App      │  Admin Panel    │  │
│  │  (React)         │  (React Native)  │  (React)        │  │
│  └──────────────────┴──────────────────┴─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              API GATEWAY & LOAD BALANCER                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • Rate Limiting (Redis)                            │   │
│  │  • Request Validation                               │   │
│  │  • Authentication Middleware                        │   │
│  │  • CORS & Security Headers                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                          │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │   HR     │  Finance │ Security │ Reports  │ Admin    │  │
│  │ Service  │ Service  │ Service  │ Service  │ Service  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Employee │  Payroll │ Leave    │ Insurance│ Audit    │  │
│  │ Handler  │ Handler  │ Handler  │ Handler  │ Logger   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   CACHING LAYER                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  L1: Memory Cache (Node.js)  (< 1ms)                │   │
│  │  L2: Redis Cluster (6 nodes) (< 5ms)                │   │
│  │  L3: Database Query Cache    (< 50ms)               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                │
│  ┌──────────────────┬──────────────────┬────────────────┐   │
│  │ MongoDB          │ Redis            │ File Storage   │   │
│  │ Replica Set      │ Cluster          │ (S3/Local)     │   │
│  │ (3 nodes)        │ (6 nodes)        │                │   │
│  └──────────────────┴──────────────────┴────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL INTEGRATIONS                          │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │  GOSI    │  MOL     │ Banks    │ Insurance│ Email    │  │
│  │  API     │  API     │  SWIFT   │  APIs    │ Service  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2. معمارية Backend (Express.js)

```
project/
├── src/
│   ├── middleware/
│   │   ├── auth.js (JWT + MFA)
│   │   ├── errorHandler.js
│   │   ├── rateLimit.js (Redis-based)
│   │   ├── validator.js (express-validator)
│   │   ├── sanitizer.js (mongo-sanitize, xss-clean)
│   │   ├── auditLog.js (Audit logging)
│   │   └── cors.js (CORS configuration)
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   │   ├─ POST /api/v1/auth/login
│   │   │   ├─ POST /api/v1/auth/register
│   │   │   ├─ POST /api/v1/auth/refresh
│   │   │   ├─ POST /api/v1/auth/logout
│   │   │   ├─ POST /api/v1/auth/verify-mfa
│   │   │   └─ POST /api/v1/auth/setup-mfa
│   │   │
│   │   ├── employees.js
│   │   │   ├─ GET /api/v1/employees
│   │   │   ├─ GET /api/v1/employees/:id
│   │   │   ├─ POST /api/v1/employees
│   │   │   ├─ PUT /api/v1/employees/:id
│   │   │   ├─ DELETE /api/v1/employees/:id
│   │   │   └─ POST /api/v1/employees/:id/terminate
│   │   │
│   │   ├── payroll.js
│   │   │   ├─ POST /api/v1/payroll/calculate
│   │   │   ├─ POST /api/v1/payroll/:id/approve
│   │   │   ├─ POST /api/v1/payroll/:id/finalize
│   │   │   ├─ POST /api/v1/payroll/:id/transfer
│   │   │   ├─ GET /api/v1/payroll/report
│   │   │   └─ GET /api/v1/payroll/:id/slip
│   │   │
│   │   ├── leaves.js
│   │   │   ├─ POST /api/v1/leaves/request
│   │   │   ├─ GET /api/v1/leaves/my-balance
│   │   │   ├─ PUT /api/v1/leaves/:id/approve
│   │   │   ├─ PUT /api/v1/leaves/:id/reject
│   │   │   └─ GET /api/v1/leaves/:id/history
│   │   │
│   │   ├── insurance.js
│   │   │   ├─ POST /api/v1/insurance/claim
│   │   │   ├─ GET /api/v1/insurance/claims
│   │   │   ├─ GET /api/v1/insurance/:id/status
│   │   │   └─ GET /api/v1/insurance/coverage
│   │   │
│   │   ├── gosi.js
│   │   │   ├─ POST /api/v1/gosi/register
│   │   │   ├─ POST /api/v1/gosi/report
│   │   │   ├─ POST /api/v1/gosi/terminate
│   │   │   └─ GET /api/v1/gosi/:id/status
│   │   │
│   │   └── reports.js
│   │       ├─ GET /api/v1/reports/employees
│   │       ├─ GET /api/v1/reports/payroll
│   │       ├─ GET /api/v1/reports/compliance
│   │       ├─ GET /api/v1/reports/gosi
│   │       └─ GET /api/v1/reports/taxes
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── employeeController.js
│   │   ├── payrollController.js
│   │   ├── leaveController.js
│   │   ├── insuranceController.js
│   │   ├── gosiController.js
│   │   └── reportController.js
│   │
│   ├── services/
│   │   ├── authService.js (JWT, passwords, MFA)
│   │   ├── employeeService.js (CRUD, validation)
│   │   ├── payrollService.js (calculations, approval flow)
│   │   ├── leaveService.js (balance, requests, approval)
│   │   ├── insuranceService.js (claims, coverage)
│   │   ├── gosiService.js (API integration)
│   │   ├── bankingService.js (SWIFT/ACH)
│   │   ├── emailService.js (notifications)
│   │   ├── cacheService.js (multi-level caching)
│   │   ├── securityService.js (monitoring, blocking)
│   │   ├── auditService.js (logging)
│   │   └── reportService.js (generating reports)
│   │
│   ├── models/
│   │   ├── Employee.js (Mongoose schema)
│   │   ├── Payroll.js
│   │   ├── Leave.js
│   │   ├── Insurance.js
│   │   ├── GOSI.js
│   │   ├── AuditLog.js
│   │   └── User.js
│   │
│   ├── validators/
│   │   ├── employeeValidator.js
│   │   ├── payrollValidator.js
│   │   ├── leaveValidator.js
│   │   ├── saudiLaborLawValidator.js
│   │   └── gosiValidator.js
│   │
│   ├── utils/
│   │   ├── encryption.js (AES-256)
│   │   ├── hashing.js (bcrypt)
│   │   ├── jwt.js (token management)
│   │   ├── errorHandler.js
│   │   ├── logger.js (Winston)
│   │   ├── dateHelper.js (Islamic calendar)
│   │   ├── mathHelper.js (salary calculations)
│   │   └── constants.js (enums, fixed values)
│   │
│   ├── integrations/
│   │   ├── gosiIntegration.js (e.gosi.gov.sa)
│   │   ├── molIntegration.js (api.mol.gov.sa)
│   │   ├── bankingIntegration.js (SWIFT/ACH)
│   │   ├── insuranceIntegration.js (APIs/SFTP)
│   │   ├── emailIntegration.js (SendGrid/SMTP)
│   │   └── webhookHandler.js (External webhooks)
│   │
│   ├── config/
│   │   ├── database.js (MongoDB connection)
│   │   ├── redis.js (Redis cluster)
│   │   ├── secrets.js (env variables)
│   │   ├── logger.js (Winston config)
│   │   ├── cors.js (CORS settings)
│   │   └── constants.js (application constants)
│   │
│   └── server.js (Entry point)
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── models/
│   │   ├── validators/
│   │   └── utils/
│   │
│   ├── integration/
│   │   ├── auth.test.js
│   │   ├── employees.test.js
│   │   ├── payroll.test.js
│   │   ├── leaves.test.js
│   │   ├── insurance.test.js
│   │   └── gosi.test.js
│   │
│   └── e2e/
│       └── workflows/ (full scenarios)
│
├── migrations/
│   ├── 001_initial_schema.js
│   ├── 002_add_indexes.js
│   ├── 003_encryption_setup.js
│   ├── 004_replica_set_init.js
│   └── 005_sharding_config.js
│
├── seeds/
│   ├── departments.js
│   ├── employees.js
│   ├── payroll-templates.js
│   └── sample-data.js
│
├── scripts/
│   ├── backup.js
│   ├── restore.js
│   ├── setup-gosi.js
│   ├── generate-reports.js
│   └── maintenance.js
│
├── .env.example
├── .env.test
├── .env.production
│
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

### 3. معمارية Frontend (React)

```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
│
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Loading.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   │
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── MFASetup.jsx
│   │   │   └── ResetPassword.jsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── EmployeeDashboard.jsx
│   │   │   ├── ManagerDashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   └── Charts.jsx
│   │   │
│   │   ├── employees/
│   │   │   ├── EmployeeList.jsx
│   │   │   ├── EmployeeDetails.jsx
│   │   │   ├── EmployeeForm.jsx
│   │   │   ├── EmployeeEdit.jsx
│   │   │   └── EmployeeTerminate.jsx
│   │   │
│   │   ├── payroll/
│   │   │   ├── PayrollList.jsx
│   │   │   ├── PayrollCalculate.jsx
│   │   │   ├── PayrollApprove.jsx
│   │   │   ├── PayrollSlip.jsx
│   │   │   └── PayrollReports.jsx
│   │   │
│   │   ├── leaves/
│   │   │   ├── LeaveBalance.jsx
│   │   │   ├── LeaveRequest.jsx
│   │   │   ├── LeaveApproval.jsx
│   │   │   └── LeaveHistory.jsx
│   │   │
│   │   ├── insurance/
│   │   │   ├── InsuranceInfo.jsx
│   │   │   ├── InsuranceClaim.jsx
│   │   │   ├── ClaimStatus.jsx
│   │   │   └── ClaimHistory.jsx
│   │   │
│   │   └── reports/
│   │       ├── ReportsDashboard.jsx
│   │       ├── EmployeeReports.jsx
│   │       ├── PayrollReports.jsx
│   │       ├── ComplianceReports.jsx
│   │       └── ExportReport.jsx
│   │
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── NotFoundPage.jsx
│   │
│   ├── hooks/
│   │   ├── useAuth.js (auth context)
│   │   ├── useApi.js (API calls)
│   │   ├── useCache.js (caching)
│   │   ├── usePagination.js
│   │   └── useForm.js
│   │
│   ├── context/
│   │   ├── AuthContext.js
│   │   ├── UserContext.js
│   │   └── NotificationContext.js
│   │
│   ├── services/
│   │   ├── api.js (Axios instance)
│   │   ├── authService.js
│   │   ├── employeeService.js
│   │   ├── payrollService.js
│   │   ├── leaveService.js
│   │   ├── insuranceService.js
│   │   └── reportService.js
│   │
│   ├── utils/
│   │   ├── formatters.js (date, currency)
│   │   ├── validators.js (client-side)
│   │   ├── errorHandler.js
│   │   ├── constants.js
│   │   └── helpers.js
│   │
│   ├── styles/
│   │   ├── App.css
│   │   ├── theme.js (Material-UI custom)
│   │   ├── variables.css
│   │   └── responsive.css
│   │
│   ├── App.jsx
│   └── index.js
│
├── .env.example
├── .env.development
├── .env.production
│
├── package.json
└── README.md
```

---

## 🛠️ متطلبات التثبيت

### المتطلبات النظامية

```bash
# نظام التشغيل
Linux (Ubuntu 20.04+) أو Windows Server 2019+ أو macOS 11+

# متطلبات وقت التشغيل
Node.js: v18.0.0 أو أحدث
npm: v9.0.0 أو أحدث
MongoDB: v7.0.0 أو أحدث
Redis: v7.0.0 أو أحدث
```

### المكتبات الأساسية

**Backend:**

```json
{
  "dependencies": {
    "express": "^4.22.1",
    "mongoose": "^9.1.2",
    "jsonwebtoken": "^9.0.3",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^8.1.0",
    "express-validator": "^7.0.1",
    "express-mongo-sanitize": "^2.2.0",
    "xss-clean": "^0.1.4",
    "hpp": "^0.2.3",
    "express-rate-limit": "^8.2.1",
    "rate-limit-redis": "^4.2.1",
    "redis": "^4.7.0",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "axios": "^1.6.2",
    "nodemailer": "^6.9.7",
    "winston": "^3.11.0",
    "joi": "^17.11.0",
    "date-fns": "^2.30.0",
    "uuid": "^9.0.1",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "eslint": "^8.55.0",
    "prettier": "^3.1.1",
    "nodemon": "^3.0.2"
  }
}
```

**Frontend:**

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "@mui/material": "^5.14.20",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "axios": "^1.6.2",
    "formik": "^2.4.5",
    "yup": "^1.3.3",
    "react-query": "^3.39.3",
    "zustand": "^4.4.6",
    "date-fns": "^2.30.0",
    "recharts": "^2.10.4",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "vite": "^5.0.7",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.55.0",
    "prettier": "^3.1.1"
  }
}
```

---

## 📦 خطوات التثبيت الكاملة

### الخطوة 1: تثبيت MongoDB

**على Linux (Ubuntu):**

```bash
# إضافة مستودع MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# التثبيت
sudo apt-get update
sudo apt-get install -y mongodb-org

# بدء الخدمة
sudo systemctl start mongod
sudo systemctl enable mongod

# التحقق
mongosh --version
```

**إعداد Replica Set:**

```bash
# الاتصال بـ MongoDB
mongosh

# تهيئة Replica Set
rs.initiate({
  _id: "hrReplicaSet",
  members: [
    { _id: 0, host: "localhost:27017", priority: 2 },
    { _id: 1, host: "localhost:27018", priority: 1 },
    { _id: 2, host: "localhost:27019", priority: 1 }
  ]
})

# التحقق
rs.status()
```

### الخطوة 2: تثبيت Redis

**على Linux (Ubuntu):**

```bash
# التثبيت
sudo apt-get install -y redis-server

# بدء الخدمة
sudo systemctl start redis-server
sudo systemctl enable redis-server

# التحقق
redis-cli ping
# الرد: PONG
```

**إعداد Redis Cluster:**

```bash
# إنشاء 6 أنوديات (3 masters + 3 replicas)
for i in {1..6}; do
  mkdir -p /data/redis-$i
  # إنشاء config لكل node
done

# أو استخدام Docker Compose
docker-compose -f redis-cluster.yml up -d
```

### الخطوة 3: تثبيت Backend

```bash
# نسخ المستودع
git clone <repo-url> hr-system
cd hr-system/backend

# تثبيت المكتبات
npm install

# إنشاء ملف البيئة
cp .env.example .env

# تحرير .env
MONGODB_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/hr_database?replicaSet=hrReplicaSet
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key_here
ENCRYPTION_KEY=your_32_bytes_encryption_key_here_exactly
NODE_ENV=development
PORT=3001

# تشغيل التهيئة
npm run setup

# بدء الخادم
npm start
```

### الخطوة 4: تثبيت Frontend

```bash
# نسخ مجلد Frontend
cd ../frontend

# تثبيت المكتبات
npm install

# إنشاء ملف البيئة
cp .env.example .env

# تحرير .env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=HR System
VITE_APP_VERSION=1.0.0

# بدء الخادم
npm run dev
```

---

## 🗄️ إعداد قاعدة البيانات

### نماذج البيانات

**Employee Schema:**

```javascript
const employeeSchema = new Schema({
  personal: {
    arabicName: { type: String, required: true },
    englishName: { type: String, required: true },
    idNumber: { type: String, unique: true, required: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['M', 'F'] },
    nationality: String,
    phone: String,
    email: { type: String, unique: true, required: true },
    address: String,
  },

  employment: {
    employeeNumber: { type: String, unique: true },
    positionTitle: String,
    department: String,
    manager: { type: Schema.Types.ObjectId, ref: 'Employee' },
    hireDate: Date,
    baseSalary: { type: Number, min: 3000 },
    status: { type: String, enum: ['active', 'inactive', 'terminated'] },
  },

  socialInsurance: {
    gosiId: { type: String, unique: true, sparse: true },
    insuranceType: String,
    registrationDate: Date,
    insurableSalary: { type: Number, max: 45000 },
    employeeContribution: Number,
    employerContribution: Number,
  },

  healthInsurance: {
    policyNumber: { type: String, unique: true },
    insurer: String,
    planType: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'] },
    monthlyPremium: Number,
    familyCoverage: Boolean,
    coveredDependents: [String],
  },

  banking: {
    bankName: String,
    accountNumber: String,
    iban: { type: String, match: /^SA\d{24}$/ },
    swiftCode: String,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
```

**Payroll Schema:**

```javascript
const payrollSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  payPeriod: { type: String, required: true }, // YYYY-MM

  earnings: {
    basicSalary: Number,
    allowances: {
      housing: Number,
      transportation: Number,
      meals: Number,
      phone: Number,
      medical: Number,
      dependents: Number,
      location: Number,
    },
    overtime: {
      regularHours: Number,
      nightHours: Number,
      weekendHours: Number,
      holidayHours: Number,
      amount: Number,
    },
    bonuses: {
      performance: Number,
      annual: Number,
      attendance: Number,
      project: Number,
    },
    grossEarnings: Number,
  },

  deductions: {
    socialInsurance: Number,
    incomeTax: Number,
    loans: Number,
    advances: Number,
    absences: Number,
    other: Number,
    totalDeductions: Number,
  },

  netSalary: Number,

  payment: {
    method: { type: String, enum: ['bank_transfer', 'check', 'cash'] },
    status: { type: String, enum: ['pending', 'approved', 'processed', 'paid'] },
    bankReference: String,
    paymentDate: Date,
  },

  approvals: [
    {
      level: { type: Number, min: 1, max: 3 },
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    },
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
```

### بيانات وهمية (Seed Data)

```javascript
// seed-employees.js
const employees = [
  {
    personal: {
      arabicName: 'أحمد محمد علي',
      englishName: 'Ahmad Mohammad Ali',
      idNumber: '1234567890',
      dateOfBirth: '1990-01-15',
      gender: 'M',
      nationality: 'SA',
      phone: '0505555555',
      email: 'a.ali@company.com',
      address: 'الرياض، حي النور',
    },
    employment: {
      employeeNumber: 'EMP-089012',
      positionTitle: 'مهندس تطوير ويب أول',
      department: 'تطوير البرمجيات',
      hireDate: '2020-01-01',
      baseSalary: 18000,
      status: 'active',
    },
    socialInsurance: {
      insuranceType: '1',
      registrationDate: '2020-01-01',
      insurableSalary: 18000,
      employeeContribution: 1755,
      employerContribution: 2340,
    },
    healthInsurance: {
      planType: 'silver',
      monthlyPremium: 600,
      familyCoverage: true,
      coveredDependents: ['spouse', 'child1', 'child2'],
    },
    banking: {
      bankName: 'الراجحي',
      accountNumber: '1234567890123',
      iban: 'SA1212345678901234567890',
      swiftCode: 'RJHISARX',
    },
  },
  // ... more employees
];

async function seedEmployees() {
  try {
    const count = await Employee.countDocuments();
    if (count > 0) {
      console.log('✓ Employees already seeded');
      return;
    }

    const inserted = await Employee.insertMany(employees);
    console.log(`✓ Seeded ${inserted.length} employees`);
  } catch (error) {
    console.error('✗ Error seeding employees:', error);
  }
}

module.exports = seedEmployees;
```

---

## 🚀 نشر الإنتاج (Production Deployment)

### الخطوة 1: إعداد الخادم

**متطلبات الخادم:**

- CPU: 4 cores حد أدنى
- Memory: 16GB حد أدنى
- Storage: 500GB SSD
- Bandwidth: 100Mbps

**على AWS (مثال):**

```yaml
# docker-compose.yml (Production)
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb-data:/data/db
      - mongodb-config:/data/configdb
    ports:
      - '27017:27017'
    restart: always

  redis:
    image: redis:7.0
    ports:
      - '6379:6379'
    restart: always

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/hr_database
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    ports:
      - '3001:3001'
    depends_on:
      - mongodb
      - redis
    restart: always

  frontend:
    build: ./frontend
    ports:
      - '3000:3000'
    environment:
      VITE_API_URL: https://api.company.com
    restart: always

  nginx:
    image: nginx:latest
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: always

volumes:
  mongodb-data:
  mongodb-config:
```

### الخطوة 2: تأمين الإنتاج

```bash
# تثبيت HTTPS
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --standalone -d api.company.com -d hr.company.com

# إعدادات الأمان
# 1. تعطيل SSH password، استخدم SSH keys فقط
# 2. Enable firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 3. تحديث جميع الأنظمة
sudo apt update && sudo apt upgrade -y

# 4. تثبيت fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### الخطوة 3: المراقبة والسجلات

```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'hr-system' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

module.exports = logger;
```

---

## 📊 الاختبار الشامل

### اختبارات الوحدة (Unit Tests)

```javascript
// tests/unit/services/employeeService.test.js
describe('Employee Service', () => {
  describe('createEmployee', () => {
    it('should create a new employee', async () => {
      const data = {
        personal: { arabicName: 'أحمد', email: 'test@test.com' },
        employment: { baseSalary: 18000 },
      };

      const employee = await employeeService.createEmployee(data);
      expect(employee).toHaveProperty('_id');
      expect(employee.personal.email).toBe('test@test.com');
    });

    it('should validate minimum salary', async () => {
      const data = {
        employment: { baseSalary: 2000 }, // أقل من 3000
      };

      await expect(employeeService.createEmployee(data)).rejects.toThrow('Salary must be at least 3000');
    });
  });
});
```

### اختبارات التكامل (Integration Tests)

```javascript
// tests/integration/payroll.test.js
describe('Payroll Integration', () => {
  it('should calculate full payroll cycle', async () => {
    // 1. إنشاء موظفين
    const employees = await Employee.insertMany([...]);

    // 2. حساب الرواتب
    const payroll = await calculatePayroll({
      period: '2026-03',
      employees: employees.map(e => e._id)
    });

    // 3. التحقق من الحسابات
    expect(payroll.totalCost).toBeGreaterThan(0);
    expect(payroll.approvals).toHaveLength(0); // pending approval

    // 4. الموافقات
    await approvePayroll(payroll._id, 1); // first level
    await approvePayroll(payroll._id, 2); // second level
    await approvePayroll(payroll._id, 3); // final approval

    // 5. التحقق من الحالة
    const finalized = await Payroll.findById(payroll._id);
    expect(finalized.payment.status).toBe('approved');
  });
});
```

---

## 📋 قوائم التحقق للنشر

```
Pre-Production Checklist:
☐ جميع الاختبارات تمر بنجاح (100%)
☐ لا توجد تحذيرات الأمان
☐ جميع المتغيرات البيئية محددة
☐ النسخ الاحتياطية معدة
☐ خطة الاستعادة مختبرة
☐ سجلات الأخطاء معدة
☐ المراقبة معدة
☐ الأداء مختبر (load test)
☐ التوثيق محدث
☐ التدريب مكتمل

Post-Deployment Checklist:
☐ جميع الخدمات تعمل
☐ لا توجد أخطاء في السجلات
☐ قاعدة البيانات متزامنة
☐ المتصفحات تعمل بشكل صحيح
☐ المصادقة تعمل
☐ البريد الإلكتروني يُرسل
☐ API endpoints متاحة
☐ الأداء قبول
☐ Backups تعمل
☐ المراقبة تعمل
```

---

## 🔧 استكشاف الأخطاء

### مشاكل MongoDB شائعة

```
المشكلة: "MongooseError: Cannot connect to MongoDB"
الحل:
1. تحقق من status MongoDB: sudo systemctl status mongod
2. تحقق من MongoDB URI في .env
3. تحقق من firewall: sudo ufw status
4. أعد تشغيل MongoDB: sudo systemctl restart mongod

المشكلة: "Replica set not initialized"
الحل:
1. اتصل بـ MongoDB: mongosh
2. قم بتهيئة: rs.initiate(...)
3. تحقق من الحالة: rs.status()
```

### مشاكل Redis شائعة

```
المشكلة: "Redis connection refused"
الحل:
1. تحقق من Redis: redis-cli ping
2. أعد تشغيل Redis: sudo systemctl restart redis-server
3. تحقق من الاتصال: redis-cli
4. فحص الملف: /etc/redis/redis.conf
```

---

**🎉 تم إعداد جميع معلومات التثبيت والنشر والاختبار بنجاح!**

**الإصدار:** v1.0.0  
**التاريخ:** 14 يناير 2026  
**الحالة:** ✅ جاهز للتثبيت والنشر الفوري

---

_"نظام موارد بشرية سعودي - جاهز للإنتاج"_

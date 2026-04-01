# Changelog — Al-Awael ERP

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [3.1.0] — 2026-03-29

### Added — نظام خطط التأهيل الفردية (Rehabilitation Plans System)

- `backend/models/RehabilitationPlan.js` — نموذج Mongoose كامل بمعايير WHO-ICF + APTA + ICD-11
  - Sub-schemas: SmartGoalSchema, SessionRecordSchema, PlanServiceSchema, AIAssessmentSchema, PlanReviewSchema, TeleSessionSchema
  - Virtual fields: goalAchievementRate, completedSessionsCount, weeksRemaining, latestAIAssessment
  - Pre-save hooks: توليد planCode فريد، تحديث overallProgress تلقائيًا
  - Static methods: getTherapistStats, getPlansNeedingReview
- `backend/routes/rehabilitationPlan.routes.js` — 16 endpoint REST API (CRUD + AI + Tele-Rehab)
- `backend/controllers/rehabilitationPlan.controller.js` — متحكم كامل يربط 8 خدمات (AI، جدولة، تقارير، جودة...)
- `frontend/src/pages/RehabDashboard.jsx` — لوحة تحكم React متكاملة (5 تبويبات، CRUD كامل، AI assessment)
- `frontend/src/pages/SpecializedRehab/` — 6 صفحات تأهيل متخصصة:
  - BehaviorManagement.jsx, ProgramEnrollment.jsx, RehabProgramsLibrary.jsx
  - RehabProgressTracking.jsx, ScaleAdministration.jsx, SpecializedScalesLibrary.jsx
- `docs/rehabilitation-dashboard.html` — توثيق تفاعلي للوحة التأهيل
- `docs/rehabilitation-plan-template.html` — قالب خطة التأهيل الموحد
- `backend/seeds/branches.seed.js` — بيانات أولية للفروع الـ 12 + المقر الرئيسي

### Fixed — إصلاحات أمنية وتقنية حرجة

#### 🔐 أمان (Security)

- **CRITICAL**: استبدال `authGuard` الوهمي في `rehabilitationPlan.routes.js` الذي كان يُعيّن `req.user = { id: 'dev-user', role: 'therapist' }` بـ JWT حقيقي من `middleware/auth.js`

#### 🗄️ نماذج Mongoose (Model Fixes)

- `backend/models/advanced.models.js`: إصلاح 8 حقول enum بدون `type: String` (invoices.status، costs.category، payments.method، customReports.type/format، charts.type، systemSettings.language، backups.status)
- `backend/models/Camera.js`: إصلاح جدول تسجيل الأسبوع — كل يوم من 7 أيام كان `{ from: '00:00' }` بدلًا من `{ from: { type: String, default: '00:00' }, to: { type: String, default: '23:59' } }`
- `backend/models/comprehensive.models.js`: إصلاح 9 حقول enum بدون `type: String` (sessionType، status، goals.status، messages.type، preferredContactMethod، contactFrequency، allergies.severity، dailyRecords.status، leaves.type)
- `backend/models/Zakat.model.js`: إزالة `timestamps: true` من داخل جسم 3 schemas (كانت تُعامَل كحقل وليس كـ option)
- `backend/models/Branch.js`: إزالة duplicate index على حقل `code` (كان محددًا مرتين)
- `backend/models/Camera.js`: إزالة duplicate index على `hikvision.ipAddress` (كان يحمل `unique: true` ثم index مستقل)

#### ⚙️ Redis Configuration

- `backend/config/cache.config.js`: إضافة فحص `DISABLE_REDIS=true` في `createRedisClient()` لمنع رسائل NOAUTH المتكررة
- `backend/config/cache.advanced.js`: إضافة فحص `DISABLE_REDIS=true` في `initializeRedis()`
- `backend/config/redis.config.js`: إضافة فحص `DISABLE_REDIS=true` في `connectRedis()`

#### 🔍 تحقق من المدخلات (Validation)

- `backend/controllers/rehabilitationPlan.controller.js`:
  - `validatePlanData()`: يدعم حقول الفرونت (`beneficiary`, `primaryDiagnosis`) والخدمة (`beneficiaryId`, `disabilityType`) معًا — يمنع 400 Bad Request الصامت
  - `validateGoalData()`: يدعم `goalText` (فرونت) و `description` (خدمة) معًا
  - إضافة field normalization في `createPlan` و `addGoal` — توحيد أسماء الحقول قبل الإرسال
  - حذف `const path = require('path')` غير المستخدم

#### 🛣️ مسارات (Routes)

- `backend/routes/_registry.js`: حذف مسار مكرر `/api/rehabilitation` الذي كان يشير لنفس وحدة `/api/disability-rehabilitation` (الفرونت يستخدم `/api/rehab-plans`)

### Improved — تحسينات UX وموثوقية الفرونت

- `frontend/src/pages/RehabDashboard.jsx`:
  - إضافة `RehabErrorBoundary` (React Error Boundary) — يلتقط أخطاء React غير المتوقعة ويعرض رسالة عربية مع زر "إعادة المحاولة"
  - إضافة client-side validation قبل الإرسال:
    - `handleCreatePlan()`: تحقق من المستفيد، التشخيص، تاريخ البدء، وترتيب التواريخ
    - `handleAddGoal()`: تحقق من نص الهدف
    - `handleRecordSession()`: تحقق من تاريخ الجلسة
- `frontend/src/pages/Sessions/index.jsx`:
  - إضافة `SessionsErrorBoundary` — يلتقط أخطاء غير متوقعة ويسجّلها في console

---

## [3.0.0] — 2026-01-15

### Added

- Branch Management System — 12 فرع + HQ الرياض
  - RBAC متقدم: hq_super_admin / hq_admin / branch_manager / therapist / driver / receptionist
  - 25 endpoint: HQ dashboard، مقارنة الفروع، الموارد البشرية، الجداول، التقارير، KPIs
  - Phase 2: Analytics، Forecasting، AI Recommendations

---

## [Unreleased]

---

## [3.2.0] — 2026-04-01

### Added

- Backend ESLint configuration (`backend/.eslintrc.json`) for consistent code quality.
- Pagination middleware — caps `?limit` to a maximum of 100 to prevent full-collection dumps.
- Magic-byte validation for file uploads — rejects files whose content doesn't match their declared MIME/extension.
- Rate limiter on payment write operations (`POST`/`PUT`/`PATCH`/`DELETE`).
- Redis health check with actual `PING` in `/api/v1/health/system`.
- `security.txt` at `/.well-known/security.txt`.
- `CONTRIBUTING.md` — contribution guide for developers.
- Server request timeouts (`timeout`, `keepAliveTimeout`, `headersTimeout`).

### Fixed

- `setInterval` leaks in `performanceOptimization.js` (WebSocket batcher + memory monitor) and `advanced-logger.js` (log rotation) — all intervals now store IDs and expose cleanup methods.
- File upload filter changed from OR (MIME **or** extension) to AND (MIME **and** extension) — prevents MIME spoofing bypass.
- ESLint flat config (`frontend/eslint.config.js`) — removed incompatible plugins (`unused-imports`, `react-hooks`) that used deprecated ESLint v8 APIs (`context.getFilename`, `context.getSourceCode`) causing push failures with ESLint v10.
- Syntax error in `frontend/src/__tests__/apiEndpoints.test.js` — fixed `it.each` arrow function syntax.
- `no-undef` error in `backend/rehabilitation-ai/recommendation-engine.js` — fixed `vabs_adaptive_composite` undefined variable.

### Changed

- CI pipeline: added frontend Jest tests step.
- Diagnostic utility scripts (`check_*.js`, `fix_*.js`, `trace_*.js`) added to `.gitignore` to keep repository clean.

---

## [1.0.0] — 2025-06-01

### Added

- Initial release: 200+ API route modules, 350+ Mongoose models, 400+ services.
- React 18 frontend with MUI 5, RTL support, 90+ routes.
- JWT authentication, RBAC, audit trail, rate limiting.
- Docker Compose dev / production / professional profiles.
- Jest test suite — 288 suites, 8,930 tests.
- Kubernetes & Helm deployment manifests.
- GitHub Actions CI (lint → test → build → security audit → summary).

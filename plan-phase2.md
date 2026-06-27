# خطة التنفيذ الشاملة — لوحة التحكم + التقارير + ربط الجلسات
## Al-Awael ERP v3.3.0 — المرحلة التالية

## المرحلة 1: Backend Services (بالتوازي)

### 1A: Clinical Dashboard Aggregation Service
**File:** `backend/services/clinicalDashboard.service.js`
- تجميع بيانات المستفيد من جميع الوحدات:
  - `ICFAssessment.findLatestByPatient(beneficiaryId)` → درجات ICF الحالية
  - `CarePlanVersion.findOne({ beneficiaryId, status: 'active' })` → خطة الرعاية + الأهداف
  - `ClinicalSession.find({ beneficiaryId, date: { $gte: today } })` → الجلسات القادمة
  - `ClinicalSession.find({ beneficiaryId, status: 'completed' }).limit(5)` → آخر 5 جلسات
  - `MDTMeeting.find({ 'cases.beneficiary': beneficiaryId }).limit(3)` → آخر اجتماعات MDT
  - `TherapeuticGoal.find({ participantId: beneficiaryId, status: 'active' })` → الأهداف النشطة
- ترتيب الحسبة وإرجاع JSON موحد
- Endpoint: `GET /api/v1/clinical-dashboard/:beneficiaryId`

### 1B: Integrated Report Generator Service
**File:** `backend/services/integratedReport.service.js`
- تجميع بيانات المستفيد لإنشاء تقرير شامل
- تنسيقات: PDF (أولوية) و Word و JSON
- استخدام `html-pdf` أو `puppeteer` لتوليد PDF من HTML template
- Template يحتوي على:
  - صفحة غلاف مع اسم المستفيد وتاريخ التقرير
  - قسم ICF: درجات المجالات + مخطط رادار
  - قسم Care Plan: الأهداف + نسب الإنجاز
  - قسم Sessions: الجلسات + ملاحظات SOAP
  - قسم MDT: قرارات الفريق
  - قسم Assessments: نتائج المقاييس
- Endpoint: `POST /api/v1/reports/integrated/:beneficiaryId`

### 1C: Session-ICF Goal Linking Service
**File:** `backend/services/sessionICFLinker.service.js`
- عند إنشاء/تحديث جلسة علاجية:
  - تحديد الأهداف المستهدفة في الجلسة (من `TherapeuticGoal` المرتبطة بـ ICF)
  - تسجيل التقدم على أكواد ICF المرتبطة
  - تحديث `progressPercentage` في الهدف
- Endpoint: `POST /api/v1/sessions/:sessionId/icf-progress`
- تلقائي: في `ClinicalSession` pre-save hook

## المرحلة 2: Frontend Pages (بالتوازي)

### 2A: Clinical Dashboard Page
**File:** `frontend/src/pages/clinical/ClinicalDashboard.jsx`
- Route: `/clinical-dashboard/:beneficiaryId`
- Sidebar navigation: "الملف السريري المتكامل"
- Layout: 3 أقسام
  - القسم الأيمن: بطاقة المستفيد + درجات ICF (Radar chart) + KPIs
  - القسم الأوسط: خطة الرعاية + الأهداف النشطة + التقدم
  - القسم الأيسر: الجلسات القادمة + آخر الجلسات + MDT meetings
- استخدام `recharts` للمخططات
- Animated cards with `framer-motion`

### 2B: Integrated Report Generator Page
**File:** `frontend/src/pages/reports/IntegratedReportGenerator.jsx`
- Route: `/reports/integrated`
- اختيار المستفيد + فترة التقرير
- معاينة التقرير (live preview)
- أزرار: توليد PDF / Word / JSON
- إرسال عبر البريد / واتساب

### 2C: Session ICF Linking UI
**File:** `frontend/src/pages/sessions/SessionICFProgress.jsx`
- Route: `/sessions/:sessionId/icf-progress`
- عند فتح الجلسة: عرض الأهداف المرتبطة بـ ICF
- تسجيل التقدم: sliders لكل كود ICF
- ربط تلقائي بين الجلسة والأهداف

## المرحلة 3: التكامل والاختبار
- تحديث `sidebarNavConfig.jsx` بروابط جديدة
- تحديث `unifiedRouteRegistry.js` بالمسارات الجديدة
- اختبار الدخان (Smoke Test)

---

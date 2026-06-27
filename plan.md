# plan.md — Integration Tests + Data Seeding
# خطة العمل: اختبارات التكامل + بيانات تجريبية

## المرحلة: Phase 5 — QA Deep Dive
## التاريخ: 2025-06-27

---

## Stage 1: Planning (Orchestrator — الآن)

- قراءة هيكل المشروع الحالي
- تحديد المسارات الرئيسية للاختبار
- تحديد المعلومات المطلوبة للبيانات التجريبية

---

## Stage 2: Parallel Execution (2 agents simultaneously)

### Agent A: Integration Tester (subagent_type: coder)
**الهدف:** اختبارات تكامل تتحقق من 5 تدفقات رئيسية بين الأنظمة الـ 20

**الملف المطلوب:** `backend/tests/integration/phase34-integration.test.js`

**التدفقات المطلوبة:**

1. **Flow: ICF → Goals → Care Plan → Session Progress**
   - إنشاء تقييم ICF → توليد أهداف → إنشاء خطة علاج → تسجيل تقدم في جلسة
   - يتحقق من أن `icfGoalIntegration.service.js` يعمل مع `sessionICFLinker.service.js`

2. **Flow: Clinical Dashboard → AI Predictive**
   - جلب بيانات لوحة القيادة → تشغيل خوارزميات التنبؤ
   - يتحقق من أن `clinicalDashboard.service.js` يُطعم `aiPredictiveAnalytics.service.js`

3. **Flow: Telehealth → Session Recording → Report**
   - إنشاء جلسة عن بُعد → تسجيل الفيديو → توليد تقرير
   - يتحقق من أن `telehealth.routes.js` → `integratedReport.service.js`

4. **Flow: Parent Portal → WhatsApp Notification**
   - تسجيل تقدم → إرسال إشعار للأهل → تلقي رد من الروبوت
   - يتحقق من أن `parentPortal.service.js` → `whatsappChatbot.service.js`

5. **Flow: Executive Dashboard → BI Analytics**
   - جمع KPIs → تشغيل تقرير متقدم → تنبؤات مستقبلية
   - يتحقق من أن `executiveDashboard.service.js` → `biAnalytics.service.js`

**المتطلبات:**
- استخدام Jest مع `beforeAll`/`afterAll` للإعداد
- Mock لـ MongoDB (MongoMemoryServer أو mongoose mock)
- Mock لـ Redis (ioredis mock)
- Mock لـ WhatsApp API (axios mock)
- Mock لـ CCTV streams (Express mock)
- كل اختبار يتحقق من `200 OK` + تكامل البيانات

---

### Agent B: Data Seeding Developer (subagent_type: coder)
**الهدف:** إنشاء سكربتات لبيانات تجريبية واقعية

**الملفات المطلوبة:**
- `backend/scripts/seed/seedDatabase.js` — السكربت الرئيسي
- `backend/scripts/seed/data/beneficiaries.js` — بيانات المستفيدين
- `backend/scripts/seed/data/therapists.js` — بيانات المعالجين
- `backend/scripts/seed/data/icfAssessments.js` — تقييمات ICF
- `backend/scripts/seed/data/sessions.js` — جلسات العلاج
- `backend/scripts/seed/cleanDatabase.js` — تنظيف قاعدة البيانات

**الأهداف الكمية:**
| الكيان | العدد | التفاصيل |
|--------|-------|----------|
| Beneficiaries | 100 | أسماء عربية حقيقية، سعودية، أنواع إعاقة متنوعة |
| Therapists | 50 | أطباء، أخصائيين علاج طبيعي، نطق، وظيفي |
| ICF Assessments | 50 | تقييمات كاملة لـ 50 مستفيد (coreSet: rehab, autism, cp) |
| Care Plans | 30 | خطط علاجية مرتبطة بتقييمات ICF |
| Goals | 150 | أهداف SMART مرتبطة بخطط العلاج |
| Sessions | 200 | جلسات فردية وجماعية + حضور/غياب |
| Telehealth Sessions | 30 | جلسات عن بُعد + روابط تسجيل |
| Prescriptions | 40 | وصفات طبية + أدوية |
| Vital Signs | 300 | علامات حيوية (3 لكل مستفيد) |
| Compliance Audits | 20 | تدقيقات CBAHI/JCI/NPHIES |
| Gamification Profiles | 100 | نقاط + شارات + متواليات |
| WhatsApp Conversations | 80 | محادثات بالعربية + نية + ردود تلقائية |
| CCTV Cameras | 15 | كاميرات بمواقع مختلفة + حالة |
| Reports | 25 | تقارير متكاملة + قوالب BI |

**المتطلبات الواقعية:**
- أسماء عربية سعودية حقيقية (على الأقل 30 اسم ذكر + 30 اسم أنثى)
- أرقام هواتف سعودية (9665xxxxxxxx)
- أنواع إعاقة: جسدية، بصرية، سمعية، فكرية، توحد، تعلم
- كودات ICF حقيقية: b130, d430, e150, s110, etc.
- تواريخ واقعية (2024-2025)
- نتائج متدرجة (بعضها تحسن، بعضها ثابت، بعضها تراجع)
- ملاحظات بالعربية واقعية

---

## Stage 3: Verification (Orchestrator)

- تشغيل اختبارات التكامل والتأكد من النجاح
- تشغيل سكربت البيانات التجريبية والتأكد من الإدخال
- تحديث تقرير QA النهائي

---

## المرجعيات

- `backend/tests/setup.js` — إعداد Jest
- `backend/tests/unit/phase34-services.test.js` — اختبارات الوحدة الحالية
- `backend/models/` — جميع النماذج
- `backend/services/` — جميع الخدمات
- `backend/config/database.js` — إعداد قاعدة البيانات
- `backend/package.json` — التبعيات

---

## ملاحظات السلامة
- **عدم الإدخال مباشرة إلى MongoDB الإنتاجية** — السكربت يتحقق من NODE_ENV
- **تنظيف تلقائي** — قبل الإدخال يجب تنظيف المجموعات المستهدفة
- **فهرسة** — إعادة إنشاء الفهارس بعد الإدخال لتحسين الأداء
- **بدون بيانات حساسة** — لا كلمات مرور حقيقية، لا هويات شخصية حقيقية

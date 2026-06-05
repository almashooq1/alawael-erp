# Critical Issues — Prioritized Audit (2026-06-04)

> منهجية الإصلاح المعتمدة في المشروع (W269 → W896). هذا الملف مرجع
> للأولويات؛ التفاصيل التشغيلية في
> `docs/sessions/2026-06-04-module-hardening-session.md`.

## 1. فئات المشاكل الحرجة (مرتبة بالأولوية)

### P0 — عزل الفروع / IDOR (أمن + PDPL)

**الوصف:** مستخدم مقيّد بفرع A يقرأ أو يعدّل سجلات فرع B بتخمين `ObjectId` على
مسارات `GET|PATCH|DELETE /:id` التي تستخدم `findById(req.params.id)` بدون
`branchFilter` أو بوابة مستفيد (`assertBeneficiaryInScope`).

**الأنماط الثلاثة:**

| النمط                               | المثال                              | الإصلاح القياسي                                                           |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| A — نموذج فيه `branchId` / `branch` | `CarePlan`, `WaitlistEntry`         | `findOne({ _id, ...branchFilter })` أو `effectiveBranchScope` على القوائم |
| B — مرتبط بمستفيد بلا `branchId`    | `InsuranceClaim`, `MedicalReferral` | `fetchScopedByBeneficiary` / `assertBeneficiaryInScope` **قبل** أي قراءة  |
| C — حارس خامد                       | `clinical-docs`, `speech`           | `requireBranchAccess` **بعد** المصادقة + نفس A أو B                       |

**ما أُغلق (W866–W896+):** شكاوى، MDT، MAR، waitlist-admin، telehealth، evidence،
pharmacy، فواتير، إحالات، NPS، حضور يومي، events، عقود، CPE، guardians،
parent-portal ownership، وغيرها — انظر سجل الجلسة.

**أعلى المتبقي (P0):**

1. `emr.routes.js` — سجلات طبية، مختبرات، حساسية (~8 مسارات عارية)
2. `insuranceClaims.routes.js` — مطالبات/عقود/موافقات مسبقة (مالية + PHI)
3. `medicalReferrals.routes.js` — إحالات سريرية (~6)
4. `waitlist.routes.js` — شقيق `waitlist-admin` (**يُصلَح W898**)
5. `payroll.routes.js` — رواتب (~11)
6. `clinical-docs.routes.js` — مستندات سريرية (**يُصلَح W899**)
7. `smart-assessment-engine.routes.js` — مقاييس إكلينيكية
8. `icf-assessments.routes.js`, `episodes.routes.js`

**مؤجّل (قرار منتج):** `crisis`, `meetings`, `strategicPlanning`,
`medicalEquipment` / `asset-management` (لا `branchId` على النموذج).

---

### P1 — تكامل البيانات (نماذج مزدوجة / refs وهمية)

- تسجيل `mongoose.model` مكرر (حارس W340، ADR-021)
- `ref:` شبحي (حارس W325c — baseline فارغ)
- فهارس Mongoose مكررة (**مغلق W884** — `check:duplicate-schema-index`)

---

### P2 — سلامة الكتابة / mass-assignment

- `...req.body` على `POST/PATCH` حساسة (مغلق تدريجياً من W451+)
- `req.branchId` — **محظور** (حارس W269h)

---

### P3 — تغطية اختبارية

- Sprint: ~658 ملف؛ مسارات جديدة تحتاج `*-branch-isolation-waveNNN.test.js`
- واجهة web-admin: `typecheck` + `lint` فقط (لا Jest)

---

### P4 — تشغيل / ديون تقنية

- `app.js` مُقسّم لكن لا يزال كبيراً (~2.4k سطر)
- خدمات V4 NestJS **مجمدة** — لا تبني domains جديدة هناك

---

## 2. منهجية الإصلاح (وصفة موحّدة)

لكل ملف مسار P0:

1. **قراءة** — هل النموذج `branchId` أم beneficiary-keyed؟
2. **Middleware** — `authenticate` → `requireBranchAccess` → `bodyScopedBeneficiaryGuard` (بالترتيب)
3. **قوائم** — `effectiveBranchScope(req)` + `branchFilter(req)`؛ لا `req.query.branchId` خام
4. **Instance** — `scopedById` = `findOne({ _id, ...scope })` أو بوابة مستفيد
5. **POST** — تثبيت `branchId`/`branch` من نطاق المتصل، لا من `body`
6. **اختبار** — supertest + MongoMemoryServer + mock auth فقط
7. **Sprint** — سطر في `sprint-tests.txt` + `npm run sync:sprint-paths`
8. **بوابات** — `check:routes-load`, `check:wave-collision`, `no-broken-req-branchid-wave269h`

---

## 3. خطة الموجات المقترحة (التالي)

| Wave  | الملف                                                   | سبب الأولوية                                  |
| ----- | ------------------------------------------------------- | --------------------------------------------- |
| W898  | `waitlist.routes.js`                                    | نفس تسريب W870 على مسار `/api/waitlist` العام |
| W899  | `clinical-docs.routes.js`                               | حارس W441 خامد + مستندات PHI                  |
| W900  | `care-plans-admin.routes.js`                            | قائمة بلا `branchFilter` رغم وجود `branchId`  |
| W901+ | `emr`, `insuranceClaims`, `medicalReferrals`, `payroll` | أعلى حساسية سريرية/مالية                      |

---

## 4. ما لا يُصلَح تلقائياً

- مسارات org-wide بالتصميم (كتالوج أدوية، `riskAssessment`، قوالب `rehab`)
- أي ملف يحتاج `branchId` على Schema — يتطلب ADR + migration
- `crisis` — خطط طوارئ قد تكون على مستوى المؤسسة

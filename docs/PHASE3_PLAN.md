# Phase P3 — Intelligence & Automation | خطة المرحلة الثالثة

> **هذا الملف tracker تنفيذي يربط الـ deliverables التعاقدية في blueprint/09-roadmap.md بالموجات الفعلية المُسلَّمة في git log.**
> آخر مزامنة: 2026-05-19 (بعد Wave 124).
>
> **ملاحظة (2026-05-23)**: يوجد عمل منفصل تحت اسم "Phase 3 Gov + AI" (W280-W286 — تكاملات حكومية + AI متقدم) ليس جزءاً من هذا الملف. التتبع الكامل لتلك المرحلة في `CLAUDE.md` ضمن قسم "Phase 3 Gov + AI surface". اسم الـ phase نفسه عبر بَرنامجَي تخطيط مختلفَين، لكن الـ deliverables مختلفة تماماً: هذا الملف يتتبع Intelligence & Automation (Waves 39-124); ذاك يتتبع DPIA + Sehhaty + Disability Authority + Mudad WPS + RAG + Speech (Waves 280-286).

---

## 1. مصدر الحقيقة (Source of Truth)

| طبقة                       | الملف                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| **التعريف التعاقدي لـ P3** | [docs/blueprint/09-roadmap.md §5](blueprint/09-roadmap.md)                                      |
| **معمارية النظام**         | [docs/ARCHITECTURE.md](ARCHITECTURE.md) (v3.1.0)                                                |
| **خريطة الوحدات**          | [docs/MODULES.md](MODULES.md) + [docs/blueprint/03-modules-map.md](blueprint/03-modules-map.md) |
| **gap analysis**           | [docs/blueprint/10-gap-analysis.md](blueprint/10-gap-analysis.md)                               |

**ملاحظة قاعدية:** الموجات (Waves) 1→113 المُسجَّلة في git log هي وسيلة التسليم الفعلية. كل commit بِبادئة `feat(intelligence):` هو تنفيذ لـ P3 — وكل الـ commits الأخيرة (39→113) تخدم P3.

---

## 2. حالة كل deliverable من P3

| #        | Deliverable               | الحالة                                                     | الدليل                                                                                                                                                                                                                                                                                                                                                                                      | الفجوات المتبقية                                                                   |
| -------- | ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **P3.1** | Smart Alerts Engine       | ✅ **مُسلَّم جوهريًا**                                     | Waves 11-16 (alert engine complete) + Wave 19 (anomaly generators) + Wave 30 (kpi-series loader) + Wave 113 (Hikvision anomaly detector). موجود [alertEvaluator.service.js](../backend/services/alertEvaluator.service.js) + [dashboardAlertCoordinator.service.js](../backend/services/dashboardAlertCoordinator.service.js) + [alerts/](../backend/alerts/)                               | rule-builder UI عام (موجود لـ Hikvision فقط)، توحيد register patterns عبر النطاقات |
| **P3.2** | AI Assessment Assistant   | ✅ **مُسلَّم**                                             | Waves 41-60 (Care Planning vertical) + Wave 48 (LLM-explain views) + [care-plan-llm-caller.service.js](../backend/intelligence/care-plan-llm-caller.service.js) + [aiDiagnostic.service.js](../backend/services/aiDiagnostic.service.js)                                                                                                                                                    | قياس وفر الوقت (KPI: 30%)، توسعة عن care-plan إلى تقييمات أخرى                     |
| **P3.3** | Progress Prediction Model | ✅ **مُسلَّم في Wave 118**                                 | [services/ai/progressPrediction.service.js](../backend/services/ai/progressPrediction.service.js) (Prompt 20) — يستدعي ML خارجي عبر `ML_SERVICE_URL` مع fallback heuristic. Wave 118 أضاف 23 اختبار + CLI `progress-validate.js` + AiModelConfig accuracy tracking                                                                                                                          | نشر ML service خارجي + UI integration                                              |
| **P3.4** | No-Show Prediction        | ✅ **مُسلَّم في Wave 115**                                 | [intelligence/no-show-prediction.registry.js](../backend/intelligence/no-show-prediction.registry.js) + [intelligence/no-show-prediction.service.js](../backend/intelligence/no-show-prediction.service.js) + [routes/no-show-prediction.routes.js](../backend/routes/no-show-prediction.routes.js). 43/43 tests pass. 9 features، 4 risk bands، 6 intervention tiers، 3 perms، 3 endpoints | تثبيت دقة على بيانات حقيقية، UI badge في صفحة المواعيد (Wave 116+)                 |
| **P3.5** | Schedule Optimization v2  | ✅ **مُسلَّم في Wave 117**                                 | [services/ai/scheduleOptimizerV2.service.js](../backend/services/ai/scheduleOptimizerV2.service.js) — risk-aware enrichment فوق V1، يدمج Wave-115 no-show + يُولّد swap suggestions + expected attended metrics + POST /api/ai-analytics/schedule/optimize/v2. 23/23 tests pass                                                                                                             | نشر prod + ربط UI                                                                  |
| **P3.6** | Parent Chatbot            | ✅ **Phase 1+2a+2b+admin مُسلَّم (Waves 120+122+123+124)** | Wave 120 foundation + Wave 122 context + Wave 123 LLM + Wave 124 admin visibility (`listSessions` بـ filters + pagination + `getStats` aggregates byIntent / escalationRate / avgConfidence + 2 admin routes). **108/108 tests pass**. classifierSource = llm/llm-cache/rule.                                                                                                               | Phase 3: Parent Portal UI                                                          |

**خلاصة:** 6/6 deliverables مُسلَّمة backend (P3.1-P3.6). P3.6 يحتاج Phase 3 (Parent Portal UI) لاكتمال UX-side، لكن الـ backend stack كامل.

---

## 3. الموجات داخل P3 (تاريخ مُختصر)

البنية الذكية كاملة محصورة في `backend/intelligence/` (85 ملف). أبرز الموجات:

| موجة   | المحتوى                                                                                                                                                                                                                     | الـ deliverable                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 18-19  | Insights Layer + anomaly generators                                                                                                                                                                                         | P3.1                                |
| 20-30  | drilldown + role-profiles + data-quality + KPI loaders                                                                                                                                                                      | P3.1+P3.2 supporting                |
| 31-38  | Authz Constitution + branch-scope + MFA + access-review foundations                                                                                                                                                         | infrastructure                      |
| 39-40  | Beneficiary-360 lifecycle state machine                                                                                                                                                                                     | بنية لـ P3.2                        |
| 41-60  | Care Planning vertical (Phase 9 رسميًا)                                                                                                                                                                                     | **P3.2 الأساسي**                    |
| 72-82  | Access Review + role-profiles توسعة                                                                                                                                                                                         | governance                          |
| 83-95  | Security hardening (audit chain + MFA enforcement + هندسة موحَّدة)                                                                                                                                                          | infrastructure                      |
| 96-113 | **Hikvision vertical** (workforce surveillance + face library + recognition + reconciliation + payroll + fraud detection + sync + scheduler + stream + branch-config + ops aggregator + org summary + **anomaly detector**) | **P3.1 application + new vertical** |
| 114    | **Hikvision Anomaly History** — snapshot persistence + trend chart on top of Wave 113                                                                                                                                       | P3.7 (Hikvision continuation)       |
| 115    | **No-Show Prediction** — 9-feature heuristic + 4 risk bands + 6 interventions + AiPrediction persistence + 3 endpoints                                                                                                      | **P3.4 — مُغلق**                    |
| 116    | **No-Show Operationalization** — validateActualOutcome + validatePending sweeper + dailyScanAllBranches + 2 CLI scripts + accuracy tracking                                                                                 | **P3.4 — تشغيلي**                   |
| 117    | **Schedule Optimizer V2** — risk-aware enrichment فوق V1، swap suggestions، expected attended metrics، route /schedule/optimize/v2                                                                                          | **P3.5 — مُغلق**                    |
| 118    | **Progress Prediction validation** — 23 jest tests على progressPrediction service + CLI `progress-validate` + AiModelConfig accuracy persistence                                                                            | **P3.3 — مُغلق**                    |
| 120    | **Parent Chatbot Phase 1** — registry (11 intents) + service (classifyIntent + generateResponse + ask + getSession) + ParentChatbotSession model (TTL 30d) + 3 perms + 2 routes                                             | **P3.6 — Phase 1**                  |

---

## 4. مقارنة الـ Roadmap الأصلي vs الواقع

الـ roadmap في `blueprint/09-roadmap.md` يضع P3 بدءًا من **2025-10-01** بـ 6 deliverables. الواقع:

- ✅ بدأ التنفيذ مبكرًا (Wave 18 ≈ 2025 H2)
- ✅ شُحنت 3 من 6 جوهريًا
- ⚠️ ظهر vertical غير مُجدوَل أصلًا (Hikvision Workforce Surveillance) واستهلك 18 موجة (96-113) — قيمة عالية لكن خارج الـ roadmap الرسمي
- ❌ P3.4 + P3.6 لم تُلامَس
- ⚠️ P3.5 يحتاج تأكيد إن كانت "v2" أم لا

**التوصية على الـ roadmap:** تحديث `09-roadmap.md` لتعكس الواقع — إضافة Hikvision كـ P3.7 وتأكيد ما شُحن من P3.1-P3.5.

---

## 5. Wave 114 — الواقع: Hikvision Anomaly History

**اكتُشف بعد فحص working tree:** Wave 114 بُدئ بالفعل (uncommitted WIP) كـ **Hikvision Anomaly History** — تكملة طبيعية لـ Wave 113. ليس P3.4.

**ما هو مُسلَّم في Wave 114 (مرحلة pre-commit):**

| Artifact | المسار                                                                   | الحجم           |
| -------- | ------------------------------------------------------------------------ | --------------- |
| Model    | `backend/models/HikvisionAnomalySnapshot.js`                             | جديد            |
| Service  | `backend/intelligence/hikvision-anomaly-history.service.js`              | جديد            |
| Tests    | `backend/__tests__/hikvision-wave114-anomaly-history.test.js`            | جديد، 14/14 يمر |
| Perm     | `hikvision.anomalies.history.read` في governance.registry                | إضافة           |
| REASON   | `ANOMALY_HISTORY_NOT_FOUND` + `ANOMALY_SCAN_FAILED`                      | إضافة           |
| JOB_ID   | `ANOMALY_SCAN` كل 10د                                                    | إضافة           |
| Routes   | `GET /anomalies/history`, `GET /anomalies/trend`, `POST /anomalies/scan` | إضافة           |
| Wiring   | `app.js` + `hikvision-scheduler.service.js` + scheduler test             | تعديل           |

**الحالة الاختبارية:** 309/309 عبر 13 Hikvision suites تمر — لا regressions.

**يُكمل**: Wave 113 (detector) → Wave 114 (history + trend chart) — يجيب على سؤال "هل تحسّن الوضع بعد التدخل؟".

## 6. Wave 115 — مُسلَّم: P3.4 No-Show Prediction ✅

**التسليم الفعلي (commit pending):**

| Artifact | المسار                                                                               | الحجم                                      |
| -------- | ------------------------------------------------------------------------------------ | ------------------------------------------ |
| Registry | `backend/intelligence/no-show-prediction.registry.js`                                | جديد — 9 أوزان + 4 bands + 6 تدخلات        |
| Service  | `backend/intelligence/no-show-prediction.service.js`                                 | جديد — 5 دوال عامة، نقية، قابلة للضبط      |
| Routes   | `backend/routes/no-show-prediction.routes.js`                                        | جديد — 3 endpoints (predict/batch/summary) |
| Tests    | `backend/__tests__/no-show-prediction.test.js`                                       | جديد، 43/43 يمر                            |
| Perms    | `ai.no-show.read` + `ai.no-show.predict` + `ai.no-show.batch` في governance.registry | إضافة                                      |
| Wiring   | `app.js` — wiring graceful (يتعطّل إن غاب Appointment أو AiPrediction)               | تعديل                                      |

**الفحوصات:** 395/395 عبر 15 suites (Hikvision 309 + no-show 43 + scheduler 14 + ...). Lint نظيف. Anti-duplication نظيف عبر 2038 ملف.

**ميزات Wave 115:**

- 9 features: `noShowRate90d` (0.45 weight — أقوى إشارة)، `cancellationRate90d` (0.15)، `recentStreak` (0.10)، `daysSinceLastAttended` (0.10)، `rescheduleCount` (0.05)، `isFirstAppointment` (0.05)، `earlyOrLateHour` (0.03)، `noInsuranceApproval` (0.02)، `branchBaseline` (0.05).
- 4 risk bands: `low` < 0.30، `medium` 0.30-0.55، `high` 0.55-0.75، `critical` ≥ 0.75.
- 6 intervention tiers: `standard_reminder` → `sms_24h_before` → `sms_2h_before` → `phone_call_task` → `phone_call_required` → `therapist_alert`. كل band يحدد قائمة تدخلات تصاعدية.
- `AiPrediction` reuse — لا schema migration؛ `prediction_type:'attendance'` موجود بالفعل في الـ enum، `prediction_details.{band, contributions, interventions}` يحمل التفاصيل.
- Graceful degradation: feature يتعطّل بصمت إن لم تُحمَّل نماذج Appointment أو AiPrediction.

## 7. Wave 116 — مُسلَّم: P3.4 Operationalization ✅

**التسليم الفعلي:**

| Artifact | المسار                                                                       | الحجم                                                                      |
| -------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Registry | `intelligence/no-show-prediction.registry.js`                                | إضافة `TERMINAL_STATUSES` + `STATUS_TO_ACTUAL_VALUE` + 2 REASON            |
| Service  | `intelligence/no-show-prediction.service.js`                                 | إضافة `validateActualOutcome` + `validatePending` + `dailyScanAllBranches` |
| Tests    | `__tests__/no-show-prediction-wave116.test.js`                               | جديد، 17/17 يمر                                                            |
| Scripts  | `scripts/no-show-scan.js` + `scripts/no-show-validate.js`                    | جديد — CLI داعم لـ --json/--quiet/--dry-run/--horizon/--branch             |
| npm      | `no-show:scan(:json)` + `no-show:validate(:json)` في backend + proxy في root | إضافة                                                                      |

**الفحوصات:** 369/369 عبر 15 suites (Hikvision 309 + Wave 115 43 + Wave 116 17). Lint نظيف. Anti-duplication نظيف عبر 2038 ملف.

**سيناريو التشغيل الكامل لدورة P3.4:**

1. **Cron يومي صباحي** → `npm run no-show:scan` → ينشئ تنبؤات لكل مواعيد الـ 48 ساعة القادمة، 4 bands + تدخلات مقترحة.
2. **خلال اليوم** → Frontend يقرأ من `GET /api/v1/ai/no-show/summary` للوحات per-branch، أو `POST /api/v1/ai/no-show/predict/appointment/:id` لتنبؤ فوري.
3. **Cron مسائي/ليلي** → `npm run no-show:validate` → يقارن predictions بالنتائج الفعلية، يكتب `actual_value` + `deviation` + accuracy.
4. **مراقبة الدقة** → استعلام `summarizeByBranch` يعطي accuracy% — أساس قرار الترقية لـ ML model في موجة لاحقة.

## 8. Wave 117+ — ما تبقّى في P3

### بدائل Wave 117:

- **(أ) P3.4 UI** — badge على صفحة المواعيد + لوحة per-branch تقرأ من `/summary`. تكملة UX طبيعية.
- **(ب) P3.5 v2 confirmation + upgrade** — راجع scheduleOptimizer الحالي، رفعه لـ CP-SAT إن كان بسيطًا.
- **(ج) Smart Alerts cross-domain harmonization** — تعميم نمط Wave 113 anomaly registry على alertEvaluator القديم.
- **(د) Hikvision Anomaly History UI** — صفحة trend chart فوق Wave 114 (داخل الـ vertical نفسها).

---

## 6. كيف تُحدَّث هذه الوثيقة

عند انتهاء كل موجة تخدم P3:

1. حدّث جدول §2 إن أُغلق deliverable
2. أضف صف للموجة في §3
3. إن تغيرت الـ roadmap الأصلية، سجّل ذلك في §4
4. إن تغيّر مرشّح Wave التالية، حدّث §5

عند إغلاق P3 بأكمله (6/6) — حرّك هذا الملف إلى `_archived/` ولخّص النتائج في `docs/blueprint/09-roadmap.md`.

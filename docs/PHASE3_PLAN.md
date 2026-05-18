# Phase P3 — Intelligence & Automation | خطة المرحلة الثالثة

> **هذا الملف tracker تنفيذي يربط الـ deliverables التعاقدية في blueprint/09-roadmap.md بالموجات الفعلية المُسلَّمة في git log.**
> آخر مزامنة: 2026-05-18 (بعد Wave 115).

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

| #        | Deliverable               | الحالة                        | الدليل                                                                                                                                                                                                                                                                                                                                                                                      | الفجوات المتبقية                                                                   |
| -------- | ------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **P3.1** | Smart Alerts Engine       | ✅ **مُسلَّم جوهريًا**        | Waves 11-16 (alert engine complete) + Wave 19 (anomaly generators) + Wave 30 (kpi-series loader) + Wave 113 (Hikvision anomaly detector). موجود [alertEvaluator.service.js](../backend/services/alertEvaluator.service.js) + [dashboardAlertCoordinator.service.js](../backend/services/dashboardAlertCoordinator.service.js) + [alerts/](../backend/alerts/)                               | rule-builder UI عام (موجود لـ Hikvision فقط)، توحيد register patterns عبر النطاقات |
| **P3.2** | AI Assessment Assistant   | ✅ **مُسلَّم**                | Waves 41-60 (Care Planning vertical) + Wave 48 (LLM-explain views) + [care-plan-llm-caller.service.js](../backend/intelligence/care-plan-llm-caller.service.js) + [aiDiagnostic.service.js](../backend/services/aiDiagnostic.service.js)                                                                                                                                                    | قياس وفر الوقت (KPI: 30%)، توسعة عن care-plan إلى تقييمات أخرى                     |
| **P3.3** | Progress Prediction Model | ⚠️ **موجود — يحتاج تقييم**    | [services/ai/progressPrediction.service.js](../backend/services/ai/progressPrediction.service.js) (Prompt 20)، يستدعي ML service خارجي عبر `ML_SERVICE_URL`                                                                                                                                                                                                                                 | تحقق دقة 75% على بيانات تاريخية، نشر prod، تكامل في UI                             |
| **P3.4** | No-Show Prediction        | ✅ **مُسلَّم في Wave 115**    | [intelligence/no-show-prediction.registry.js](../backend/intelligence/no-show-prediction.registry.js) + [intelligence/no-show-prediction.service.js](../backend/intelligence/no-show-prediction.service.js) + [routes/no-show-prediction.routes.js](../backend/routes/no-show-prediction.routes.js). 43/43 tests pass. 9 features، 4 risk bands، 6 intervention tiers، 3 perms، 3 endpoints | تثبيت دقة على بيانات حقيقية، UI badge في صفحة المواعيد (Wave 116+)                 |
| **P3.5** | Schedule Optimization v2  | ⚠️ **موجود — لم يُسمَّ "v2"** | [tests/unit/scheduleOptimizer.service.test.js](../backend/tests/unit/scheduleOptimizer.service.test.js) — يشير لخدمة موجودة، لا توجد موجة باسم optimization v2                                                                                                                                                                                                                              | تأكيد إن كانت v2 (CP-SAT) أم v1 بسيط                                               |
| **P3.6** | Parent Chatbot            | ❌ **فجوة كاملة**             | لا يوجد إلا template بريد، لا خدمة chatbot ولا KB                                                                                                                                                                                                                                                                                                                                           | يحتاج موجة كبيرة (LLM + KB + UI portal)                                            |

**خلاصة:** 4/6 مُسلَّمة جوهريًا، 1/6 موجودة جزئيًا (P3.5)، 1/6 فجوة كاملة (P3.6).

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

## 7. Wave 116+ — ما تبقّى في P3

### بدائل Wave 116:

- **(أ) P3.4 UI** — badge على صفحة المواعيد + لوحة per-branch + scheduler يومي. تكملة طبيعية.
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

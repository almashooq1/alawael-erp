# Phase P3 — Intelligence & Automation | خطة المرحلة الثالثة

> **هذا الملف tracker تنفيذي يربط الـ deliverables التعاقدية في blueprint/09-roadmap.md بالموجات الفعلية المُسلَّمة في git log.**
> آخر مزامنة: 2026-05-18 (بعد Wave 113).

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

| #        | Deliverable               | الحالة                        | الدليل                                                                                                                                                                                                                                                                                                                                                        | الفجوات المتبقية                                                                   |
| -------- | ------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **P3.1** | Smart Alerts Engine       | ✅ **مُسلَّم جوهريًا**        | Waves 11-16 (alert engine complete) + Wave 19 (anomaly generators) + Wave 30 (kpi-series loader) + Wave 113 (Hikvision anomaly detector). موجود [alertEvaluator.service.js](../backend/services/alertEvaluator.service.js) + [dashboardAlertCoordinator.service.js](../backend/services/dashboardAlertCoordinator.service.js) + [alerts/](../backend/alerts/) | rule-builder UI عام (موجود لـ Hikvision فقط)، توحيد register patterns عبر النطاقات |
| **P3.2** | AI Assessment Assistant   | ✅ **مُسلَّم**                | Waves 41-60 (Care Planning vertical) + Wave 48 (LLM-explain views) + [care-plan-llm-caller.service.js](../backend/intelligence/care-plan-llm-caller.service.js) + [aiDiagnostic.service.js](../backend/services/aiDiagnostic.service.js)                                                                                                                      | قياس وفر الوقت (KPI: 30%)، توسعة عن care-plan إلى تقييمات أخرى                     |
| **P3.3** | Progress Prediction Model | ⚠️ **موجود — يحتاج تقييم**    | [services/ai/progressPrediction.service.js](../backend/services/ai/progressPrediction.service.js) (Prompt 20)، يستدعي ML service خارجي عبر `ML_SERVICE_URL`                                                                                                                                                                                                   | تحقق دقة 75% على بيانات تاريخية، نشر prod، تكامل في UI                             |
| **P3.4** | No-Show Prediction        | ❌ **فجوة نظيفة**             | لا توجد خدمة prediction للـ no-show؛ الكلمة تظهر فقط في reporting/scheduling كنص حالة                                                                                                                                                                                                                                                                         | **مرشّح Wave 114 المُوصى به**                                                      |
| **P3.5** | Schedule Optimization v2  | ⚠️ **موجود — لم يُسمَّ "v2"** | [tests/unit/scheduleOptimizer.service.test.js](../backend/tests/unit/scheduleOptimizer.service.test.js) — يشير لخدمة موجودة، لا توجد موجة باسم optimization v2                                                                                                                                                                                                | تأكيد إن كانت v2 (CP-SAT) أم v1 بسيط                                               |
| **P3.6** | Parent Chatbot            | ❌ **فجوة كاملة**             | لا يوجد إلا template بريد، لا خدمة chatbot ولا KB                                                                                                                                                                                                                                                                                                             | يحتاج موجة كبيرة (LLM + KB + UI portal)                                            |

**خلاصة:** 3/6 مُسلَّمة جوهريًا، 2/6 موجودة جزئيًا، 1/6 فجوة كاملة (P3.6).

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

## 6. Wave 115 — التوصية: P3.4 No-Show Prediction (الفجوة الحقيقية)

P3.4 (No-Show Prediction) يبقى أولوية Phase 3 الأولى:

**لماذا:**

1. **فجوة نظيفة في P3** — لا توجد خدمة prediction للـ no-show حاليًا.
2. **بنية تحتية جاهزة** — يستفيد من نمط [services/ai/progressPrediction.service.js](../backend/services/ai/progressPrediction.service.js) (feature extraction + `AiPrediction` model — enum يدعم `'attendance'` بالفعل، لا schema migration).
3. **حجم منضبط** — service + registry + scheduler + 2-3 endpoints + اختبارات. ~600-900 سطر.
4. **قيمة أعمال عالية** — exit-criteria في roadmap: تقليل no-show ≥ 20%.
5. **يُغلِق deliverable كامل في P3** — يرفع نسبة الإنجاز من 3/6 إلى 4/6.

**نطاق Wave 115 المقترح:**

- `intelligence/no-show-prediction.registry.js` — BAND_THRESHOLDS + FEATURE_WEIGHTS + INTERVENTIONS_BY_BAND + REASON codes
- `intelligence/no-show-prediction.service.js` — extractFeatures + fallbackPrediction (weighted heuristic) + predictNoShow (يحفظ `AiPrediction` بـ `prediction_type:'attendance'`) + predictBatch + summarizeByBranch
- جدولة يومية: تنبؤ على مواعيد الـ 48 ساعة القادمة
- intervention hook: زيادة تذكيرات للمواعيد عالية الخطورة (HIGH/CRITICAL)
- اختبارات: 20+ على feature extraction، monotonicity، band edges، intervention emission، persistence

### بدائل (إن لم يعجبك):

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

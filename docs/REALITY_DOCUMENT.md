# وثيقة واقع — Al-Awael Platform Stabilization (Bootstrap)

> واحدة صفحة. حالة مؤكّدة/مفترَضة/تحتاج سرّ المالك قبل أي تعديل جوهري.
> التاريخ: 2026-06-19

## 1. ما هو مؤكّد

| #    | ملاحظة                                                                                                                        | مصدر                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1.1  | الـ backend الحيّ هو `66666/backend` (Express + Mongo)، 501 route، المنفذ 3001.                                               | `CLAUDE.md` §Runtime Reality                         |
| 1.2  | الـ UI الحيّ هو `alawael-rehab-platform/apps/web-admin` (Next.js) ويتصل بـ 66666.                                             | `MIGRATION_LEDGER.md`                                |
| 1.3  | V4 micro-services (`services/*`) مُجمَّدة ومُنقَّلة حديثاً إلى `_archive/services-v4/` في شجرة العمل غير المُلتَزَمة.         | `git status` يظهر حذف `services/` وإنشاء `_archive/` |
| 1.4  | `UnifiedCarePlan` (`domains/care-plans`) هو الـ canonical لخطط الرعاية؛ `CarePlanVersion` مُوقَّف بـ ADR-041.                 | ADR-041                                              |
| 1.5  | `api.ts` في web-admin مهاجَرة جزئياً إلى `@alawael/api-client` للـ Beneficiaries/Appointments/RedFlags/Consents فقط.          | قراءة `api.ts`                                       |
| 1.6  | Care Plan API في `api.ts` ما زال يستخدم `request`/`safeList` القديمة (غير مهاجَر).                                            | `api.ts` §Care plan endpoints                        |
| 1.7  | `care-planning-api.ts` يستهدف الـ `CarePlanVersion` المُوقَّف؛ لا يزال موجوداً في الكود.                                      | `care-planning-api.ts`                               |
| 1.8  | الـ OpenAPI spec الحالي (`docs/api/openapi-integration.yaml`) لا يحتوي على Care Plans/Sessions/Documents/Assessments/Reports. | قراءة الـ spec                                       |
| 1.9  | هناك 15 package فعلية في workspace بعد أرشفة V4 (5 apps + 10 packages).                                                       | `pnpm-workspace.yaml` + `find`                       |
| 1.10 | التغييرات الحالية غير مُلتَزَمة في كلا الـ repo؛ لا يوجد commit جديد منذ W1383.                                               | `git log --oneline -20` + `git status`               |

## 2. ما هو مفترَض (عالَمي)

| #   | افتراض                                                                             | تأثير إن كان خاطئاً                                     |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 2.1 | الجداول الإنتاجية فارغة تقريباً (7 مستفيدين، 1 جلسة) ⇒ هجرة سهلة.                  | إن كانت غير فارغة، توحيد الكيانات يحتاج backfill حقيقي. |
| 2.2 | `CarePlanVersion` collection فارغة في الإنتاج (ADR-041 يقول W1235).                | إن وجدت بيانات، لا يجوز إسقاط النموذج.                  |
| 2.3 | لا client حيّ يتصل بـ `/api/care-plans` القديم أو `/api/care-plan` W42.            | إن كان هناك caller، إزالة المسارات تكسره.               |
| 2.4 | المحتوى الأرشيفي في `_archive/services-v4/` غير مُبنى وغير مُستورَد من أي كود حيّ. | إن كان هناك استيراد، الأرشفة تكسر البناء.               |

## 3. ما يحتاج سرّ/قرار المالك

| #   | البند                                                               | لماذا                                                        |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| 3.1 | بيانات الإنتاج الفعلية — أرقام دقيقة لكل collection.                | بدونها لا يمكن إثبات `baseline=0` سلوكياً (A5).              |
| 3.2 | هل mobile/legacy يتصل بـ `/api/hr` غير v1؟ (ADR-043 Q3)             | يحدد مصير التطبيع إلى `/api/v1/hr`.                          |
| 3.3 | هل أي client يتصل بـ `/api/therapist/...` (camelCase)؟ (ADR-042 Q2) | يحدد أي route يمكن إحالته.                                   |
| 3.4 | أسرار SMTP / Nafath-MoE / بوابة الدفع / Meta.                       | لا يمكن تفعيلها بدون سر؛ يُحضَّر mock-first + env-gated OFF. |
| 3.5 | صلاحية الدمج/النشر إلى main والإنتاج.                               | بدونها، الـ handoff النهائي يبقى في §11.                     |

## 4. القرارات المتخذّة ذاتياً (DF §4)

| قرار | بند القرار                                                    | سبب                                                 | ثقة   |
| ---- | ------------------------------------------------------------- | --------------------------------------------------- | ----- |
| D1   | متابعة OpenAPI migration للـ `carePlanApi` في `api.ts` أولاً. | أعلى رافعة، يتوافق مع ADR-041، ويُزيل احتكاك إطلاق. | عالية |
| D2   | تحديث `MIGRATION_LEDGER.md` بأرشفة V4.                        | active issue، وثائقي فقط.                           | عالية |
| D3   | تعليق `care-planning-api.ts` كـ deprecated-candidate دون حذف. | ADR-041 ينصّ على "deprecation-candidate دون حذف".   | عالية |
| D4   | لا حذف git mutations إلا بتأكيد (خارج صلاحيتي الذاتية).       | تعليمات CLAUDE.md الأساسية.                         | عالية |

## 5. Rollback المتاح

- كل التعديلات على ملفات YAML/TS قابلة للتراجع عبر `git checkout -- <file>`.
- لا تعديلات على MongoDB.
- لا تعديلات على البنية التحتية.

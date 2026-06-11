# Production Cutover — Blueprint-43 Arc (W1204–W1219)

> **Scope**: the full vertical implementation of
> [`docs/blueprint/43-beneficiary-journey-operating-system.md`](../blueprint/43-beneficiary-journey-operating-system.md)
> roadmap items **R3 (الإلزام في الواجهة) + R4 (حزم المسارات) + R6 (الإجراء
> الأفضل التالي) + R7-autonomous (سُلَّم المخرجات §6.4)** — backend on
> `alawael-erp` branch `feat/w928-core-linkage` (lands on main via PR #354),
> UI already **merged to `alawael-rehab-platform` master** (PRs #71/#74/#78).
>
> **آخر تحديث**: 2026-06-11 · **الحالة**: جاهز للتفعيل فور وصول الفرع إلى main

---

## 1. الخلاصة التنفيذية — ما الذي يصل للإنتاج؟

| موجة | السطح | يعمل فور النشر؟ |
| ----- | ------ | ---------------- |
| W1204 | بوابة الخيط الذهبي `GOLDEN_THREAD_ENFORCEMENT` | نعم — **خاملة** (افتراضي `off`) |
| W1205 | `/api(/v1)/pathway-bundles` (كتالوج + اقتراح + تطبيق) | نعم — لا أعلام بيئة |
| W1206 | `/api(/v1)/next-best-action` (كتالوج + مستفيد + طابور فرعي) | نعم — قراءة فقط |
| W1214 | `/api(/v1)/outcomes-rollup` (مستفيد/فرع/مركز) | نعم — قراءة فقط |
| W1207/W1218 | صفحات web-admin: `/next-best-action(+/[id])` + `/pathway-bundles` + `/outcomes-rollup` | **على master الآن** — تتدهور بأمان لرسائل خطأ حتى يصل الـ backend |
| W1212/W1219 | 40 اختباراً سلوكياً (خدمات + مسارات) | بوابة CI فقط |

**لا يوجد أي تغيير سلوكي افتراضي عند النشر** — كل ما يكتب مقيَّد بأعلام أو
باختيار صريح من الأخصائي.

## 2. علم البيئة الوحيد — وصفة التدرج (R3)

```text
GOLDEN_THREAD_ENFORCEMENT = off | warn | enforce        (افتراضي: off)
```

نقاط الإنفاذ: `POST /api/v1/goals/goals` + إنشاء هدف خطة الرعاية المضمَّن +
`PUT /api/v1/sessions/:id/complete`. **جدولة الجلسات غير مُقيَّدة عمداً**
(مسار الاستقبال). قيمة غير معروفة ⇒ تتدهور إلى `off` (fail-safe).

| خطوة | الفعل | إشارة المتابعة |
| ----- | ----- | --------------- |
| 0 | انشر بالافتراضي (`off`) | `GET /api/v1/goals/golden-thread/enforcement-status` يُظهر `mode:"off"` |
| 1 | راقب طابور W1167 حتى ينخفض | `GET /api/v1/goals/golden-thread/caseload-attention` → `summary.urgentCount` |
| 2 | `warn` + أعد التشغيل (`pm2 restart alawael-api --update-env`) | استجابات الإنشاء تحمل `goldenThread.warnings[]` — راقب الحجم أسبوعاً |
| 3 | `enforce` | الرفض = `422` بجسم `code:"GOLDEN_THREAD_VIOLATION"` ثنائي اللغة |
| ↩ | تراجع فوري | احذف العلم أو ضع `off` + أعد التشغيل |

## 3. متطلبات البيانات (R4 حزم المسارات)

الاقتراح "يرفض الاختلاق" — يعرض فقط ما يطابق في المكتبات الحية:

1. **مكتبة المقاييس**: `npm run seed:measures` (مطابقة عبر
   `targetPopulation` + `category`).
2. **بنك الأهداف** (`GoalBank`): يحتاج محتوى بمجالات
   `SPEECH/OCCUPATIONAL/PHYSICAL/BEHAVIORAL/SPECIAL_EDU` ونوافذ عمرية — بدونه
   يظهر للمستخدم "لا أهداف مطابقة" (سلوك مقصود، ليس عطلاً).
3. **حلقة رعاية نشطة** (`EpisodeOfCare status:'active'`): إنشاء أهداف الحزمة
   يتطلبها (`TherapeuticGoal.episodeId` إلزامي) — وإلا تُتخطى الأهداف بسبب
   واضح في `skipped[]`.

## 4. الأدوار

| السطح | قراءة | كتابة |
| ------ | ----- | ----- |
| pathway-bundles | admin/manager/clinical_supervisor/therapist/specialist/social_worker/coordinator | نفسها عدا social_worker/coordinator |
| next-best-action | نفس قائمة القراءة | — (قراءة فقط) |
| outcomes-rollup | القراءة + `quality` | — (قراءة فقط) |
| **مستوى المركز** `/outcomes-rollup/center` | **أدوار عابرة للفروع فقط** — المقيَّد يستلم 403 وتختفي اللوحة من الواجهة | — |

عزل الفروع: W269 كاملاً — `enforceBeneficiaryBranch` على كل مفتاح مستفيد،
وتثبيت الفرع على الكتابة، وانتحال `?branchId`/`body.branchId` يُرفض **403 في
`requireBranchAccess` نفسه**.

## 5. التحقق بعد النشر (دقيقتان)

```bash
# 1) الأسطح حية (401 بلا توكن = mounted)
for p in pathway-bundles next-best-action/catalogue outcomes-rollup/center \
         goals/golden-thread/enforcement-status; do
  curl -s -o /dev/null -w "%{http_code} $p\n" https://<host>/api/v1/$p; done
# 2) الحزمة الاختبارية للقوس (~10 ثوانٍ، 150+ تأكيداً)
cd backend && npx jest --config=jest.config.js \
  __tests__/{golden-thread-enforcement-wave1204,pathway-bundles-wave1205,next-best-action-wave1206,pathway-bundles-behavioral-wave1212,next-best-action-behavioral-wave1212,outcomes-rollup-wave1214,golden-thread-gate-routes-behavioral-wave1219,pathway-bundles-routes-behavioral-wave1219,next-best-action-routes-behavioral-wave1219}.test.js \
  --runInBand --no-coverage
```

## 6. إصلاحات مرافقة وصلت ضمن القوس (لا فعل مطلوب — للعلم)

- **W1212**: شيم Mongoose-9 على الفرع كان أقدم من إصلاح W954 (أي حفظ على نموذج
  بخطاف `post('save', function(doc))` كان يتجمد) — أُخذت نسخة main حرفياً.
- **W1219**: قوائم `goals.validator` كانت منحرفة كلياً عن enums النموذج
  (`short-term` مقابل `short_term`) — القيم الصحيحة كانت تُرفض 400 والمقبولة
  تنفجر عند الحفظ. الآن مرآة للنموذج.
- **W1219**: أخطاء `enforceBeneficiaryBranch` (تحمل `err.status`) كانت تتحول
  500 في المسارات الثلاثة الجديدة — تُعاد الآن 403/404 صحيحة.

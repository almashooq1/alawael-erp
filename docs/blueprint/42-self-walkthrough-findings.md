# 42 — Self-Walkthrough Findings (W263/W264/W267, 2026-05-22)

> **القاعدة الحاكمة**: هذا تَطبيق الـ"بديل ١" المنصوص عليه في [`41`](./41-pro-rehab-validation-orchestration.md): التَجربة الذاتية المُهيكلة كبديل عن جلسة سريرية حقيقية. ٤٠% من قيمة جلسة حقيقية، لكن متاحة الآن.
>
> **الفرضية المُختبَرة**: لو لم يَستطع المعالج الوصول للميزة من نقطة بدئه الطبيعية (ملف المستفيد)، الجلسة تَفشل قبل أن تَبدأ بغض النظر عن جودة الـUI الداخلية.
>
> **النتيجة**: ٣ فجوات اكتشاف (discoverability gaps) لم تَكن لتَكشف في جلسة سريرية لأن المعالج سيَستسلم قبل أن يَصل للميزة.

---

## ١. الفجوة الكبرى — لا روابط من ملف المستفيد

افتح `/beneficiaries/[id]` كأنك معالج بدأ يومه. الصفحة تَحتوي:

- BeneficiaryHeader
- RedFlagsSection
- ConsentsSection
- DetailCard
- GuardiansSection
- AssessmentsSection
- CarePlanSection
- SessionsSection
- DocumentsSection
- AuditTrailTimeline

**صفر روابط** لـ:

- `/aac/[beneficiaryId]` (ملف التواصل البديل — W263)
- `/gas/beneficiary/[beneficiaryId]` (مؤشر T-Score المركّب — W264)
- `/behavior-plans` (مدخل BIP/FBA — موجود قبلي + W267 BIP tracking)

**الأثر السريري**: معالج يَفتح ملف مستفيد غير ناطق ⇒ لا يَجد طريقاً لـAAC ⇒ يَنقر "البحث" في الـnavigation ⇒ يَفقد ٣٠ ثانية ⇒ يَستخدم Excel.

### الإصلاح المُقترَح (تَنفيذ في هذا الـcommit)

إضافة `ClinicalToolsLinks` section في `beneficiaries/[id]/page.tsx` بـ٣ بطاقات:

| البطاقة                     | الـhref                 | الموجة        |
| --------------------------- | ----------------------- | ------------- |
| التواصل البديل (AAC + PECS) | `/aac/[id]`             | W263          |
| مقياس GAS — T-score المركّب | `/gas/beneficiary/[id]` | W264          |
| خطط التدخل السلوكي (BIP)    | `/behavior-plans`       | موجودة + W267 |

تَحسين Discoverability من 0 → 100% لـ٣ ميزات بكلفة ~٢٠ سطر.

---

## ٢. فجوة GAS Builder — beneficiaryId يدوي

في `/gas/[goalId]` (وضع المُنشئ):

```tsx
const [builder, setBuilder] = useState<BuilderState>({
  beneficiaryId: '', // المستخدم يَكتبها يدوياً
  // ...
});
```

المستخدم وَصل من `/therapeutic-goals/[goalId]` (الـCTA) — الـbeneficiaryId مَعروف هناك سياقاً (الهدف ينتمي لمستفيد). لكن النظام لا يَنقله.

**الأثر**: المعالج يَفتح الـbuilder، يَرى حقل beneficiaryId فارغاً، يَنسخ المعرّف من tab آخر بشكل يَدوي. كل عملية = فرصة لخطأ نَسخ. الـUI يَطلب من الإنسان فعل ما الـUI يَجب أن يَفعله.

**تَكلفة الإصلاح**: يَحتاج إما:

- (أ) endpoint جديد `/api/v1/therapeutic-goals/:id` يَرجع الـgoal مع beneficiaryId (لا يَوجد حالياً)
- (ب) تَمرير beneficiaryId كـsearch param من therapeutic-goals/[id] إلى /gas/[goalId] — لكن صفحة الهدف لا تَحمّل beneficiaryId حالياً (تَستخدم weightedProgress الذي لا يَحمل beneficiaryId)
- (ج) إضافة beneficiaryId إلى `WeightedProgressResult` response (backend change)

**القرار**: مُؤجَّل إلى wave منفصلة. الـscope > 20 lines.

**Workaround مَوصى به الآن**: إضافة tooltip فوق الحقل: "انسخ المعرّف من URL صفحة الهدف (...goal-id...). سيُحَل تلقائياً في تَحديث قادم."

---

## ٣. فجوة BIP Tracking — لا entry per-beneficiary

`/bip-tracking/at-risk` عَالمي (بـbranch scope). `/bip-tracking/[fbaAssessmentId]` يَتطلب معرفة fbaId.

**كيف يَصل المشرف لـfbaId مستفيد معيّن؟**

- `/behavior-plans` (موجود قبلي) ⇒ ربما يَحوي قائمة FBAs
- لكن لا رابط مباشر من Beneficiary detail لـ"BIP tracking لهذا المستفيد"

**الفجوة الفعلية**: نَفتقد `/bip-tracking/beneficiary/[beneficiaryId]` — قائمة FBAs المُتابَعة لمستفيد محدد. الـbackend يَدعمها (الـmodel فيه beneficiaryId مُفهرَس) لكن لا UI route.

**الأثر السريري**: مشرف يَفتح ملف مستفيد، يَرغب في فحص حالة BIP، **لا يَجد طريقاً** إلا عبر `/behavior-plans` ⇒ بحث ⇒ نقر ⇒ مَلاحظة مكان `/bip-tracking/[id]` ⇒ ٣ نقرات بدل ١.

**القرار**: مُؤجَّل. يَحتاج:

- (أ) endpoint جديد `GET /api/v1/bip-tracking/beneficiary/:id` يَرجع كل FBAs للمستفيد مع آخر fidelity status
- (ب) صفحة UI جديدة تَعرضها

`scope ~ 50 lines backend + 80 lines UI`. أكبر من scope هذا الـwalkthrough.

**Workaround في الإصلاح الأول**: البطاقة الثالثة في ClinicalToolsLinks تَفتح `/behavior-plans` (الـentry الموجود) — أفضل من لا شيء.

---

## ٤. فجوات صغرى مَلاحَظة (لم تُصلَح، مُسجَّلة)

| الفجوة                                                                                                                  | الموجة | الأولوية |
| ----------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| `/aac` (list) يَعرض profiles موجودة لكن لا زر "إنشاء جديد" — كيف يَنشئ المعالج profile لمستفيد جديد؟                    | W265   | متوسطة   |
| `/gas/[goalId]` (active mode) يَعرض supersede + archive في الـUI لكن لا أزرار — السمات مَدفونة                          | W266   | منخفضة   |
| `/bip-tracking/[fbaId]` يَعرض diagnosis card مَركزياً لكن لا CTA "افتح FBA لمراجعة الفرضية" حين hypothesis_likely_wrong | W268   | عالية    |
| الـsidebar entry "متابعة BIP" يَنتقل لـ`/at-risk` مباشرة — لا hub page                                                  | W268   | منخفضة   |
| `/gas/beneficiary/[id]` لا يَحمل crumb لـ"الأهداف العلاجية" — Cross-link مفقود                                          | W266   | منخفضة   |

---

## ٥. ما تَعلّمناه عن الـself-walkthrough

**القيمة الفعلية**: كَشف ٣ فجوات entry-point لم تَظهر في أي اختبار سابق (typecheck/lint/unit). هذه الفجوات كانت ستَنسف جلسة validation الأولى — يَستسلم المعالج قبل أن يَصل للميزة.

**الحدّ من القيمة**: الـself-walkthrough لا يَكشف:

- مَفهومية المُصطلحات بالعربية (Rowland levels، Kiresuk T-score)
- الـcognitive load الفعلي عند كتابة 5 GAS levels
- ما إذا كان المعالج سيَفتح `/bip-tracking` كل خميس صباحاً

هذه تَحتاج مَعالجاً حقيقياً. الـself-walkthrough = **شرط لازم، غير كافٍ**.

**القاعدة الجديدة**: قبل أي جلسة validation حقيقية، **افعل self-walkthrough أولاً وأصلح فجوات entry-point**. وفّر للمعالج ٢٠ دقيقة من المُحتوى الفعلي، لا ٢٠ دقيقة من البحث عن "أين الميزة".

---

## ٦. الإجراء التالي

ما طُبِّق في commit هذا الـpath:

1. ✅ إضافة `ClinicalToolsLinks` section في `/beneficiaries/[id]/page.tsx`
2. ✅ ٣ بطاقات تَربط AAC / GAS / BIP

ما تَركَ كـTODO:

- فَجوة #2 (GAS beneficiaryId auto-fill) — يَتطلب backend endpoint جديد
- فَجوة #3 (BIP per-beneficiary list) — يَتطلب backend + UI كاملان
- فجوات #4 (٥ صغرى) — أَولوية متوسطة، تُعالَج عند تَوفر تَحقق سريري

> **المبدأ**: لا نَبني wave 4 (standardized scales) قبل أن تُلامَس waves 1-3 بمعالج حقيقي — لكن أَصلَحنا الـentry-point gaps حتى لا تَفشل الجلسة الأولى.

---

> الجلسة الحقيقية الآن أكثر احتمالاً للنجاح بفارق كبير. ابدأ بأقرب معالج لك. خذ معك بطاقة [38a](./38a-cheatsheet-aac.md) أو [39a](./39a-cheatsheet-gas.md) أو [40a](./40a-cheatsheet-bip.md) — اختر **واحدة**.

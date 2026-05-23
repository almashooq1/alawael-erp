## Canonical Data Model (Wave 285)

النواة الموحدة للكيانات السريرية والتشغيلية. هذا الملف عقد (contract) يطابق
ما يفرضه `copilot-instructions.md`:

> اعتمد دائماً على ملف مستفيد طولي واحد، Episode of Care موحد، Canonical
> Data Model موحد وقابل للتوسع، وامنع تكرار البيانات.

### المبدأ

كل وحدة في النظام (127 module) يجب أن تتفق على **الحد الأدنى من الحقول
المشتركة** لكل كيان أساسي. هذه الحقول هي العقد. الموديل في `models/*.js`
حر في إضافة حقول أخرى (clinical depth, audit, integrations) — لكنه لا
يستطيع تغيير معنى أو نوع أي حقل في العقد.

### الكيانات (10)

| Canonical             | Mongoose model(s)                          |
| --------------------- | ------------------------------------------ |
| `Beneficiary`         | `models/Beneficiary.js`                    |
| `EpisodeOfCare`       | `domains/episodes/models/EpisodeOfCare.js` |
| `Assessment`          | `models/Assessment.js`                     |
| `Measure`             | `models/MeasurementModels.js`              |
| `PlanOfCare`          | `models/CarePlan.js` (إن وُجد)             |
| `Session`             | `models/Session.js`                        |
| `GroupTherapySession` | `models/GroupSession.js` (إن وُجد)         |
| `TeleRehabSession`    | `models/TeleSession.js` (إن وُجد)          |
| `ARVRSession`         | `models/ImmersiveSession.js` (إن وُجد)     |
| `BehaviorIncident`    | `models/BehaviorIncident.js` (إن وُجد)     |

الموديلات المُعلَّمة بـ "إن وُجد" قد تكون stubs بعد — الـ canonical schema
يحدد العقد المتوقع، والـ drift guard سيُبلِّغ عند اكتمال الموديل.

### الاستخدام

```js
const { canonical, validateBody } = require('../intelligence/canonical');

// 1) Validate API input
router.post('/beneficiaries', validateBody('Beneficiary'), handler);

// 2) Parse manually
const result = canonical.Beneficiary.safeParse(payload);
if (!result.success) return res.status(400).json({ errors: result.error.format() });

// 3) Drift detection (ran by __tests__/canonical-drift.test.js)
const { detectDrift } = require('../intelligence/canonical/mongoose-drift.lib');
```

### Drift guard

`__tests__/canonical-drift.test.js` يفحص أن كل حقل في العقد موجود
في الـ Mongoose schema المقابل وبنوع متوافق. أي divergence يكسر CI.

### Reason codes (للـ validator)

الـ validator middleware يستخدم reason codes من
`intelligence/reason-codes.registry.js`:

- `CANONICAL_VALIDATION_FAILED` — payload لا يطابق العقد

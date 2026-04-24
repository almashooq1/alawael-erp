# 15 — Integration Hardening Layer | طبقة تصليب التكامل

> Phase I من خارطة طريق التكامل: 4 ضوابط cross-cutting تخدم كل تكامل خارجي
> (حكومي / دفع / اتصالات) بصورة موحّدة.

---

## 1. المكوّنات

| المكوّن           | الملف                                                                                              | الغرض                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Idempotency Store | [backend/infrastructure/idempotencyStore.js](../../backend/infrastructure/idempotencyStore.js)     | تخزين الاستجابة الأولى لمفتاح `Idempotency-Key` لمدة 24 ساعة |
| Idempotency MW    | [backend/middleware/idempotency.middleware.js](../../backend/middleware/idempotency.middleware.js) | تطبيق الإعادة الحتمية على endpoints المتغيّرة                |
| Dead Letter Queue | [backend/infrastructure/deadLetterQueue.js](../../backend/infrastructure/deadLetterQueue.js)       | إيقاف المكالمات الخارجية الفاشلة بعد استنفاد المحاولات       |
| DLQ Admin Routes  | [backend/routes/admin-ops-dlq.routes.js](../../backend/routes/admin-ops-dlq.routes.js)             | واجهة `list / inspect / discard / replay` للمشغّل            |
| Webhook HMAC MW   | [backend/middleware/webhookHmac.middleware.js](../../backend/middleware/webhookHmac.middleware.js) | التحقق الموحّد من توقيع الـ webhooks الواردة                 |
| PII Redactor      | [backend/utils/piiRedactor.js](../../backend/utils/piiRedactor.js)                                 | تنظيف PDPL للبيانات قبل تخزينها في logs / DLQ / audit        |

---

## 2. أين تُطبَّق

### 2.1 Idempotency Middleware

ضعها على أي route يُنفِّذ side-effect خارجي:

```js
const idempotency = require('../middleware/idempotency.middleware');

router.post('/payments', idempotency({ scope: req => req.user.tenantId }), paymentHandler);
```

المفتاح الواحد يُخزَّن 24 ساعة بشكل افتراضي. عند تكرار الطلب بنفس المفتاح
تُعاد نفس الاستجابة حرفياً مع header `Idempotent-Replay: true`.

### 2.2 Dead Letter Queue

مُضَمَّنة تلقائياً داخل `AclClient`. كل adapter حكومي يُورث هذا السلوك. يمكن
تعطيلها عبر `parkOnFailure: false` (لا يُنصح).

لفحص الصف:

```
GET /api/v1/admin/ops/dlq?integration=nafath&status=parked
GET /api/v1/admin/ops/dlq/:id
POST /api/v1/admin/ops/dlq/:id/discard
POST /api/v1/admin/ops/dlq/:id/replay
```

### 2.3 Webhook HMAC

لكل provider (ZATCA، HyperPay، Twilio، SendGrid، Meta WA):

```js
const verifyHmac = require('../middleware/webhookHmac.middleware');

router.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

router.post(
  '/webhooks/zatca',
  verifyHmac({
    secret: process.env.ZATCA_WEBHOOK_SECRET,
    header: 'X-ZATCA-Signature',
    prefix: 'sha256=',
    timestampHeader: 'X-ZATCA-Timestamp',
    toleranceSec: 300,
  }),
  zatcaCallback,
);
```

### 2.4 PII Redactor

مطلوبة قبل **كل** `console.log` / `logger.info` / DLQ park / audit row
يحتوي على بيانات مستخدم أو طلب. الـ AclClient يطبّقها تلقائياً.

```js
const { redact } = require('../utils/piiRedactor');
logger.info('payment received', redact({ user, request }));
```

---

## 3. Production adapters

الـ in-memory stores هي الافتراض للـ dev/test. الإنتاج يحتاج:

- **Idempotency adapter:** Redis مع TTL (أقل من 24 ساعة لا يُنصَح).
- **DLQ adapter:** Mongo collection `deadLetterQueue` مع index مركَّب على
  `(integration, status, createdAt)`.

توصيلة الـ adapter في startup:

```js
// backend/server.js
const { setStore: setIdem } = require('./infrastructure/idempotencyStore');
const { setStore: setDlq } = require('./infrastructure/deadLetterQueue');

setIdem(require('./infrastructure/adapters/redisIdempotencyStore').create(redis));
setDlq(require('./infrastructure/adapters/mongoDlqStore').create(db));
```

كلا الـ setStores يرفض أي adapter لا يطابق عقد الـ interface.

---

## 4. ضوابط PDPL المُغطَّاة

| ضابط                                  | التنفيذ                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------- |
| MD2.3 — عدم تخزين PII في logs         | PII Redactor يُطبَّق في AclClient + يجب استخدامه في أي logger call يدوي |
| MD2.7 — تتبع كامل لكل تبادل خارجي     | IntegrationLog + DLQ أي طلب فاشل                                        |
| MD4.1 — idempotency للمعاملات المالية | Idempotency middleware مع نطاق per-tenant                               |
| MD5.2 — مصادقة قنوات الـ webhook      | HMAC middleware إلزامي على كل webhook endpoint                          |

---

## 5. اختبار وتشغيل

الاختبارات الموحّدة (39 تأكيد في 5 suites):

```
npx jest \
  backend/__tests__/idempotency-middleware.test.js \
  backend/__tests__/dead-letter-queue.test.js \
  backend/__tests__/webhook-hmac-middleware.test.js \
  backend/__tests__/pii-redactor.test.js \
  backend/__tests__/acl-client-dlq.test.js
```

النتيجة: `5 passed / 39 tests`.

---

## 6. Phase II — شُحِنَت (v4.0.94)

1. ✅ **Mongo DLQ adapter** — [backend/infrastructure/adapters/mongoDeadLetterStore.js](../../backend/infrastructure/adapters/mongoDeadLetterStore.js) + نموذج [DeadLetterEntry.model.js](../../backend/models/DeadLetterEntry.model.js) مع indexes مركّبة.
2. ✅ **Redis idempotency adapter** — [backend/infrastructure/adapters/redisIdempotencyStore.js](../../backend/infrastructure/adapters/redisIdempotencyStore.js) يستخدم `SET NX PX` للحجز الذرّي.
3. ✅ **Bootstrap** — [backend/startup/integrationHardeningBootstrap.js](../../backend/startup/integrationHardeningBootstrap.js) يختار adapter تلقائياً بناءً على توفر mongo/redis، ومُضَمَّن في `app.js` بين integrationBus و financeBootstrap.
4. ✅ **Admin router RBAC-guarded** — محمية بـ `authenticate + authorize(['admin','super_admin'])`.
5. ✅ **Idempotency مُطبَّقة على 4 endpoints حساسة**:
   - `POST /api/admin/invoices/:id/issue` (ZATCA)
   - `POST /api/v1/payment-gateway/initiate` (Mada/HyperPay)
   - `POST /api/v1/payment-gateway/:id/refund`
   - `POST /api/admin/nphies-claims/:id/submit`
6. ✅ **Scheduled replay worker** — [backend/startup/dlqReplayScheduler.js](../../backend/startup/dlqReplayScheduler.js). كل 15 دقيقة، batch=25، min-age=60s، max-replay=5، timeout=30s لكل entry، overlap guard مُنَفَّذ.

## 7. Phase III — المرشّح التالي

1. مؤشرات Prometheus counter: `dlq_parked_total{integration}` + `idempotency_hit_total{route}`.
2. تعميم الـ idempotency على باقي الـ adapters الحكومية (Madaa, Wasel, Muqeem).
3. Grafana dashboard يقرأ من الـ counters أعلاه.
4. Circuit-breaker metrics عبر Prometheus بدلاً من logs.
5. Health endpoint `/api/v1/admin/ops/hardening/status` يُرجِع كل الحالات في JSON واحد.

# 16 — Nafath E-Signature | التوقيع الرقمي عبر نفاذ

> التوقيع القانوني على IRP، عقود الموظفين، نماذج الموافقة، والسياسات عبر
> هوية نفاذ الرقمية الوطنية. هذا المستند وثيقة تشغيل لتدفق التوقيع
> (منفصل عن تدفق الدخول SSO الذي يعيش في [nafath.routes.js](../../backend/routes/nafath.routes.js)).

---

## 1. الغرض القانوني

الوثائق التالية تحتاج توقيعاً رقمياً قانونياً لتكون مقبولة أمام:

- **وزارة الموارد البشرية** — عقود الموظفين (GOSI/Qiwa).
- **هيئة رعاية ذوي الإعاقة** — خطة التأهيل الفردية IRP.
- **PDPL** — نماذج الموافقة (Consent) للمستفيدين وولي الأمر.
- **CBAHI** — توقيع الممارسين على السياسات والإجراءات.

بدون توقيع نفاذ → كل هذه الوثائق تبقى مسودات غير قانونية.

---

## 2. البنية

```
[Document in system]                [Nafath identity]                [Evidence Repo]
  (IRP / Contract /                    (gov service)                 (JWS + manifest)
   Consent / Policy)
         │
         ▼
 ┌─────────────────────┐
 │  PDF renderer       │
 │  → sha256(bytes)    │───┐
 └─────────────────────┘   │
                           ▼
                  ┌───────────────────────┐       ┌────────────────────┐
                  │ nafathSigningService  │──────▶│ signingClient      │
                  │   .requestSignature() │       │   (AclClient-based)│
                  └───────────────────────┘       └────────────────────┘
                           │                              │
                           │                              ▼
                           │                   ┌─────────────────────┐
                           │                   │ Nafath mobile app   │
                           │                   │ (Absher push + OTP) │
                           │                   └─────────────────────┘
                           │                              │
                           ▼                              ▼
                  ┌───────────────────────┐       ┌────────────────────┐
                  │ NafathSignatureRequest│◀──────│ pollStatus() →     │
                  │   (Mongo)             │       │   APPROVED + JWS   │
                  └───────────────────────┘       └────────────────────┘
                           │
                           ▼
                  ┌───────────────────────┐
                  │ jwsVerifier.verify()  │
                  │  - alg allowlist      │
                  │  - exp + iat window   │
                  │  - documentHash match │
                  │  - nationalId match   │
                  └───────────────────────┘
                           │
                           ▼
                  ┌───────────────────────┐
                  │ buildEvidencePackage()│
                  └───────────────────────┘
```

---

## 3. المكوّنات

| المكوّن        | الملف                                                                                                  | الدور                                    |
| -------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Model          | [backend/models/NafathSignatureRequest.model.js](../../backend/models/NafathSignatureRequest.model.js) | persistence + lifecycle + indexes        |
| JWS Verifier   | [backend/integrations/nafath/jwsVerifier.js](../../backend/integrations/nafath/jwsVerifier.js)         | يتحقق من التوقيع + المطالبات             |
| Signing Client | [backend/integrations/nafath/signingClient.js](../../backend/integrations/nafath/signingClient.js)     | HTTP mock + live (عبر AclClient)         |
| Service        | [backend/services/nafathSigningService.js](../../backend/services/nafathSigningService.js)             | business logic + verification + evidence |
| Routes         | [backend/routes/nafath-signing.routes.js](../../backend/routes/nafath-signing.routes.js)               | HTTP surface + idempotency               |

---

## 4. API Surface

كلها تحت `/api/v1/nafath/signing` (تتطلّب authenticate):

| Method | Path            | Role            | الوصف                        |
| ------ | --------------- | --------------- | ---------------------------- |
| POST   | `/request`      | user            | بدء طلب توقيع (idempotent)   |
| GET    | `/:id/status`   | user            | استعلام الحالة + transitions |
| POST   | `/:id/cancel`   | user            | إلغاء المستخدم               |
| GET    | `/:id/verify`   | user            | إعادة التحقق من JWS المخزّن  |
| GET    | `/:id/evidence` | admin / auditor | حزمة دليل JSON للمدقق        |

### مثال POST /request

```json
{
  "documentType": "IRP",
  "documentId": "65e1...",
  "documentHash": "a3f1...", // sha256 of the rendered PDF bytes
  "purpose": "sign",
  "signerNationalId": "1087654321",
  "signerRole": "guardian"
}
```

**Headers:**

```
Authorization: Bearer <jwt>
Idempotency-Key: irp-65e1-sign-<random>
```

**Response (201 new / 200 reused):**

```json
{
  "success": true,
  "requestId": "66af...",
  "transactionId": "nafath-sign-1709...",
  "randomNumber": "47",
  "expiresAt": "2026-04-24T14:35:00.000Z",
  "status": "PENDING",
  "mode": "mock",
  "reused": false
}
```

المستخدم يفتح تطبيق نفاذ على جواله → يختار الرقم `47` → يوافق.

---

## 5. State Machine

```
REQUESTED ─▶ PENDING ─▶ APPROVED
                 │
                 ├──▶ REJECTED    (user declined)
                 ├──▶ EXPIRED     (15min TTL exceeded)
                 ├──▶ CANCELLED   (user canceled in our UI)
                 └──▶ ERROR       (JWS verification failed)
```

- **PENDING**: بانتظار موافقة التطبيق الجوال.
- **APPROVED**: JWS تم التحقق منه ضد documentHash + nationalId المخزَّنين.
- **ERROR**: نفاذ أعادت توقيعاً ولكن فشل التحقق — يُسجَّل ويُبلَّغ عنه بشكل بارز.

---

## 6. Fingerprint de-duplication

لمنع إرسال إشعارين لجوال المستخدم عند double-click:

```
fingerprint = sha256(documentType | documentId | documentHash | nationalId | purpose)
```

خلال نافذة 15 دقيقة وحالة ∈ {REQUESTED, PENDING} → يُعاد استخدام الطلب.

---

## 7. الضوابط الأمنية

| الضابط              | التنفيذ                                            |
| ------------------- | -------------------------------------------------- |
| **Idempotency**     | middleware موحّد + fingerprint window داخلياً      |
| **DLQ + retry**     | موروث تلقائياً من AclClient (v4.0.93/94)           |
| **PII redaction**   | موروث تلقائياً من AclClient — national IDs في logs |
| **JWS allowlist**   | RS256 / ES256 / HS256 فقط (HS256 للـ mock)         |
| **Clock tolerance** | 60 ثانية افتراضياً                                 |
| **Claim binding**   | documentHash + nationalId مطابقان للمخزَّن         |
| **IP + UA audit**   | ipHash (salted sha256) + userAgent على كل طلب      |
| **Tenant scope**    | idempotency key مُنْطَقٌ بـ tenant/branch/user     |

---

## 8. أوضاع التشغيل

### Mock (dev / test)

```bash
NAFATH_MODE=mock                    # default
NAFATH_MOCK_APPROVE_MS=5000         # وقت الموافقة الآلي
NAFATH_JWS_HS_SECRET=<secret>       # لتوقيع HS256 في الـ mock
```

سلوك تلقائي:

- National ID ينتهي بـ `99` → REJECTED.
- National ID ينتهي بـ `88` → EXPIRED.
- غير ذلك → APPROVED بعد `MOCK_APPROVE_MS`.

### Live (production)

```bash
NAFATH_MODE=live
NAFATH_BASE_URL=https://api.nafath.sa
NAFATH_APP_ID=<provisioned>
NAFATH_SERVICE_ID=<provisioned>
NAFATH_PRIVATE_KEY_PEM=<RSA key>    # لتوقيع الطلبات الصادرة
NAFATH_PUBLIC_KEY_PEM=<RSA key>     # للتحقق من JWS الوارد
```

عند الحصول على الاعتماد من نفاذ، يكفي إعادة تشغيل الخدمة — لا تغييرات كود.

---

## 9. Evidence Package (`GET /:id/evidence`)

JSON قابل للتنزيل يحتوي:

```json
{
  "kind": "nafath-signature-evidence",
  "version": 1,
  "generatedAt": "...",
  "request": { documentType, documentId, documentHash, mode },
  "signer": { nationalId, role, attributes },
  "transaction": { transactionId, randomNumber, approvedAt, status },
  "signature": { jws, algo },
  "verification": { verified: true, payload, header },
  "auditContext": { initiatedBy, ipHash, userAgent }
}
```

هذا هو ما يسلَّم للمدقق القانوني أو PDPL. الـ JWS قابل لإعادة التحقق
باستخدام جدار نفاذ العام الرسمي.

---

## 10. الاختبارات

- 10 tests في [nafath-jws-verifier.test.js](../../backend/__tests__/nafath-jws-verifier.test.js)
- 9 tests في [nafath-signing-service.test.js](../../backend/__tests__/nafath-signing-service.test.js)
- يغطيان: malformed / tampered / expired / alg-not-allowed / signer mismatch /
  full lifecycle / dedup / cancel / evidence / RS256 real key path

النتيجة: `2 suites / 19 tests passed`.

---

## 11. التالي

1. **PAdES embedding** — دمج JWS داخل PDF نفسه (Long Term Validation).
2. **Batch signing UI** — توقيع عدة وثائق دفعة واحدة.
3. **Webhook from Nafath** — بدلاً من polling (يحتاج تسجيل endpoint مع نفاذ).
4. **Integration with Consent model** — عند APPROVED يتم انشاء Consent record تلقائياً.
5. **Integration with Contract + IRP** — field `signatureRequestId` + UI "Sign with Nafath" في كل منهما.

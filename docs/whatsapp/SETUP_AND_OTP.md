# WhatsApp Business — Setup & OTP Activation (W725)

This platform has **one** canonical WhatsApp implementation:
`backend/services/whatsapp/` (Meta Cloud API, Graph v21.0, built-in `https`).
The old `backend/communication/whatsapp-service.js` is now a thin compatibility
adapter that delegates to it — do not add provider logic there.

New code should import from the canonical barrel:

```js
const { whatsappService } = require('../services/whatsapp');
await whatsappService.sendText('+966512345678', 'مرحباً من الأوائل');
```

---

## 1. Provider recommendation

**Primary: Meta WhatsApp Cloud API.** It is the canonical service's target,
is official + free at low volume, supports approved OTP templates, and is the
cleanest path for Saudi PDPL compliance (data stays in the Meta ↔ our-server
channel; we add consent gating + 30-day TTL on stored conversation rows).

Fallback / optional (not implemented, abstract behind the same service if ever
needed): Twilio WhatsApp (multi-region failover) or a Saudi local gateway
(Unifonic / Taqnyat) for SMS fallback when a user is outside Meta's 24h window.

---

## 2. Meta Cloud API setup (one-time)

1. Create a **Meta Business** account and a **WhatsApp Business Account (WABA)**.
2. In the Meta App dashboard → _WhatsApp → API Setup_:
   - Copy the **Phone number ID** → `WHATSAPP_PHONE_ID`.
   - Copy the **WhatsApp Business Account ID** → `WHATSAPP_BUSINESS_ID`.
   - Generate a **System User permanent token** → `WHATSAPP_API_TOKEN`.
3. App → _Settings → Basic_ → copy **App Secret** → `WHATSAPP_WEBHOOK_SECRET`
   (used for X-Hub HMAC verification of inbound webhooks).
4. Choose any random string for `WHATSAPP_VERIFY_TOKEN` (echoed back during the
   GET webhook handshake).
5. Configure the **webhook** in _WhatsApp → Configuration_:
   - Callback URL: `https://<your-host>/api/v1/whatsapp/webhook`
   - Verify token: the `WHATSAPP_VERIFY_TOKEN` value above
   - Subscribe to the `messages` field.
6. Set `WHATSAPP_ENABLED=true`.

### Environment variables (canonical names)

| Variable                  | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `WHATSAPP_ENABLED`        | `true` to enable sending                   |
| `WHATSAPP_API_TOKEN`      | Meta system-user permanent token           |
| `WHATSAPP_PHONE_ID`       | Phone-number-id from Meta dashboard        |
| `WHATSAPP_BUSINESS_ID`    | WhatsApp Business Account ID               |
| `WHATSAPP_WEBHOOK_SECRET` | Meta App Secret (X-Hub HMAC)               |
| `WHATSAPP_VERIFY_TOKEN`   | GET `/webhook?hub.verify_token` echo value |

**Deprecated legacy aliases** (consolidated W725, do not use):
`WHATSAPP_ACCESS_TOKEN` → `WHATSAPP_API_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID` → `WHATSAPP_PHONE_ID`,
`WHATSAPP_PROVIDER` → removed.

---

## 3. OTP via WhatsApp

OTP delivery goes through `whatsappService.sendOtp(to, code, expiryMinutes)`,
which sends an **approved template** message (templates are the only way to
message a user outside the 24h service window).

### Required template

Create and submit for approval in _WhatsApp Manager → Message Templates_:

- **Name:** `otp_verification`
- **Category:** Authentication
- **Language:** Arabic (`ar`)
- **Body:** uses two positional params:
  - `{{1}}` = the OTP code
  - `{{2}}` = expiry in minutes

Example Arabic body:

```text
رمز التحقق الخاص بك في منصة الأوائل هو: {{1}}
ينتهي خلال {{2}} دقائق. لا تشاركه مع أحد.
```

If the template is not yet approved, `sendOtp` falls back to a plain-text
message via `sendText`, which is only deliverable inside Meta's 24h window.
In production, OTP **requires** the approved template.

### Code path

```text
auth/otp-service.js
  └─ sendOTPViaWhatsApp(phone, otp, purpose)
       └─ whatsappService.sendOtp(phone, otp, expiryMinutes)   // canonical
            └─ sendTemplate(phone, 'otp_verification', 'ar', components)
```

`expiryMinutes` is derived from `otp.expirySeconds` config. On send failure in
development it logs the OTP and continues; in production it throws.

### OTP-at-rest security (W726)

The raw OTP code is **never persisted**. `otp-service.js` stores an
HMAC-SHA256 digest keyed by a server-side pepper (`OTP_HASH_SECRET`, falling
back to `JWT_SECRET`/`SESSION_SECRET`; **required in production**). Verification
re-hashes the supplied code and timing-safe-compares the hex digests. Combined
with `maxAttempts` (3–5 per purpose), rate limiting, and short expiry, this
gives defense-in-depth against store leakage, replay, and brute force.

---

## 4. End-to-end test (manual)

1. Set the six env vars above + `WHATSAPP_ENABLED=true`.
2. Ensure `otp_verification` (ar) is **approved**.
3. From a number that has opted in, trigger a login/registration OTP.
4. Confirm the template message arrives with the code + expiry.
5. Enter the code → verification succeeds (`verifyLoginOTP` / `verifyRegisterOTP`).
6. Check the conversation row is written with a 30-day TTL.

Automated regression guards (run via `npm run test:sprint`):

- `__tests__/whatsapp-canonical-consolidation-wave725.test.js` — asserts the
  legacy file stays an adapter and OTP uses the canonical `sendOtp`.
- `__tests__/otp-hash-at-rest-wave726.test.js` — proves OTP is hashed at rest
  and still round-trips verification.
- `__tests__/whatsapp-webhook-signature.test.js` — HMAC verification.
- `__tests__/whatsapp-activation-phase-a.*`, `-hardening-phase-b.*`,
  `-gap-closure-phase-e.*` — canonical service behavior.

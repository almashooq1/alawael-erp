# Government Integrations Go-Live Runbook

Operational checklist for flipping each of the 10 Saudi government
adapters shipped in the 2026-04-17/18 sprint from `mock` to `live`.

All adapters default to `mock` so dev and staging run without any
credentials. This doc is what operations needs the day you sign the
production agreements.

---

## Pre-requisites per provider

Before touching any env var, verify the business contracts / certificates
are in hand.

| Provider        | Onboarding path                                                                                    | Typical lead time |
| --------------- | -------------------------------------------------------------------------------------------------- | ----------------- |
| GOSI            | Employer agreement via Muqeem portal → API sandbox → prod client-id                                | 2–4 weeks         |
| SCFHS           | Health provider license + API agreement via [scfhs.org.sa](https://scfhs.org.sa)                   | 2–3 weeks         |
| Absher / Yakeen | Business agreement via [yakeen.absher.sa](https://yakeen.absher.sa) — requires CR + bank guarantee | 3–6 weeks         |
| Qiwa            | Establishment portal → API onboarding → WPS agreement                                              | 1–2 weeks         |
| Nafath          | Integration via Ministry of Interior SSO portal → service ID + private key                         | 4–8 weeks         |
| Fatoora (ZATCA) | e-invoicing compliance portal → CSR → CSID → compliance tests → prod CSID                          | 2–6 weeks         |
| Muqeem          | Same portal as GOSI; separate scope                                                                | 2–4 weeks         |
| NPHIES (CCHI)   | Health provider license (HPO) + CCHI onboarding                                                    | 3–6 weeks         |
| Wasel (SPL)     | Saudi Post business account → API key                                                              | 1 week            |
| Balady          | Ministry of Municipal Affairs open-data / business gateway                                         | 2–3 weeks         |

---

## Flip-to-live checklist (per provider)

### 1. GOSI

```env
GOSI_MODE=live
GOSI_BASE_URL=https://api.gosi.gov.sa          # confirm with GOSI
GOSI_CLIENT_ID=<issued by GOSI>
GOSI_CLIENT_SECRET=<issued by GOSI>
GOSI_TIMEOUT_MS=8000                            # optional (default 8s)
GOSI_MAX_FAILURES=5                             # optional (circuit trip)
GOSI_COOLDOWN_MS=120000                         # optional (circuit cooldown)
```

**Verify:**

```bash
POST /api/admin/gov-integrations/gosi/test-connection
# → { ok: true, mode: "live", tokenLifetimeSec: 3599 }
```

---

### 2. SCFHS

```env
SCFHS_MODE=live
SCFHS_BASE_URL=<confirm with SCFHS>
SCFHS_API_KEY=<issued by SCFHS>
```

**Verify:** run a sample license (known active) through
`POST /admin/gov-integrations/scfhs/verify-sample`.

---

### 3. Absher / Yakeen

```env
ABSHER_MODE=live
ABSHER_BASE_URL=https://api.absher.sa
ABSHER_CLIENT_ID=<issued by Absher>
ABSHER_CLIENT_SECRET=<issued by Absher>
```

**Verify:** check-connection. Real verifications cost money per call —
use sparingly.

---

### 4. Qiwa

```env
QIWA_MODE=live
QIWA_BASE_URL=https://api.qiwa.sa
QIWA_CLIENT_ID=<issued by Qiwa>
QIWA_CLIENT_SECRET=<issued by Qiwa>
QIWA_ESTABLISHMENT_ID=<your employer ID>         # critical
```

**Verify:** check any employee's WPS status; should match their actual
salary transfer history.

---

### 5. Nafath

```env
NAFATH_MODE=live
NAFATH_BASE_URL=<confirm with MOI>
NAFATH_APP_ID=<your Nafath app ID>
NAFATH_SERVICE_ID=<issued service ID>
NAFATH_PRIVATE_KEY=<PEM from MOI>               # sensitive — store via secret manager
```

**Verify:** admin-only test-connection → ok. **Do not** trigger real
Nafath requests from staging accounts (consumes user SMS).

---

### 6. Fatoora (ZATCA)

Two-stage flow. **Complete the signer config first**.

#### Signer config:

```env
ZATCA_SIGNER_MODE=live
ZATCA_PRIVATE_KEY=<PEM — 2048-bit RSA from your CSR>
ZATCA_CSID_CERT=<base64 DER — production CSID from compliance portal>
ZATCA_SELLER_NAME=<as registered>
ZATCA_SELLER_VAT=<your VAT number>
ZATCA_SELLER_CR=<your commercial registration>
```

#### Fatoora submission config:

```env
FATOORA_MODE=live
FATOORA_BASE_URL=https://gw-fatoora.zatca.gov.sa/e-invoicing/core
FATOORA_BINARY_TOKEN=<base64 CSID for Basic auth>
FATOORA_MODE_TYPE=reporting   # or 'clearance' for B2B invoices > threshold
FATOORA_TIMEOUT_MS=12000
```

**Compliance checklist (required by ZATCA before prod):**

- [ ] CSR generated with correct commonName, organization, country (SA)
- [ ] CSID received from compliance portal
- [ ] 6 sample invoices submitted successfully to compliance endpoint
- [ ] Production CSID received
- [ ] First real invoice goes to **sandbox URL** first — confirm `status: "REPORTED"` — then switch base URL

**Verify end-to-end:**

1. Issue any invoice → `POST /admin/invoices/:id/issue` (builds envelope)
2. Submit → `POST /admin/invoices/:id/submit-to-zatca`
3. Expect `zatca.zatcaStatus = "REPORTED" | "ACCEPTED"` + real
   `zatcaReference` (not `MOCK-*`)

---

### 7. Muqeem

```env
MUQEEM_MODE=live
MUQEEM_BASE_URL=https://api.muqeem.sa
MUQEEM_CLIENT_ID=<issued by MoI>
MUQEEM_CLIENT_SECRET=<issued by MoI>
MUQEEM_ESTABLISHMENT_ID=<your sponsor ID>
```

---

### 8. NPHIES (CCHI)

```env
NPHIES_MODE=live
NPHIES_BASE_URL=<confirm with CCHI>
NPHIES_CLIENT_ID=<issued by CCHI>
NPHIES_CLIENT_SECRET=<issued by CCHI>
NPHIES_PROVIDER_ID=<your CCHI HPO license number>
```

**NPHIES-specific:** real claims require ICD-10 codes + valid CPT
service codes. Our models are permissive (free-form strings) — tighten
validation against your specific contract's covered codes before
first submission.

---

### 9. Wasel (SPL)

```env
WASEL_MODE=live
WASEL_BASE_URL=https://api.address.gov.sa
WASEL_API_KEY=<Saudi Post business API key>
WASEL_TEST_CODE=RFYA1234                         # optional — for test-connection
```

---

### 10. Balady

```env
BALADY_MODE=live
BALADY_BASE_URL=<confirm with Ministry of Municipal>
BALADY_CLIENT_ID=...
BALADY_CLIENT_SECRET=...
```

---

## Post-deploy verification

1. Open `/admin/gov-integrations` in the web admin.
2. Every provider card should show **mode: live** and **configured: true**.
3. Click "اختبار الاتصال" on each card — all should return `ok: true`
   with latency < 2s.
4. For employees table at `/admin/hr/compliance`, run **تحقق جماعي**
   with scope `both` — verify counts change from `NOT_VERIFIED` to
   actual statuses.
5. For a test branch in `/admin/branches`, run both verify buttons
   (Balady + Wasel) and confirm the status chips populate correctly.
6. Send one sample invoice through the full flow:
   `draft → issue → submit-to-zatca` — confirm real ZATCA reference.

---

## Rollback

Each adapter can be rolled back independently without code deploy:

```env
{ANY_PROVIDER}_MODE=mock
```

Restart backend. Mock mode takes over immediately — the adapter
contract is identical so nothing downstream breaks. This is the
**emergency kill-switch** for a misbehaving provider.

---

## Observability

All adapters log through `backend/utils/logger.js` with these events:

- `[compliance] {kind} verified` with `{ employeeId, status, mode, by }`
- `[invoices] submitted to ZATCA` with `{ id, status, mode, by }`
- `[nafath] approved + token issued` with `{ requestId, userId }`
- Circuit breaker opens/closes (GOSI) with failure count

Track in your APM:

- Adapter latency p95 per provider (should be < 2s)
- Circuit breaker open rate (should be 0 in steady state)
- Failed verification count per hour (alert if > 10/hour)

---

## Emergency contacts

Operational incident during live calls:

- **ZATCA Fatoora helpdesk**: 19993 / fatoora@zatca.gov.sa
- **GOSI helpdesk**: 8001243344
- **SCFHS** compliance: info@scfhs.org.sa
- **CCHI (NPHIES)**: cchi@cchi.gov.sa
- **Nafath MOI** portal support: via business portal only

Internal incident — on-call engineer:

- Check `logs/app.log` for `[WARN] Some routes failed to mount`
- Check `/admin/gov-integrations` — any `configured: false` with
  missing env vars
- Toggle adapter to mock via env + restart to stop error cascade

---

## Document history

| Date       | Change                            |
| ---------- | --------------------------------- |
| 2026-04-18 | Initial version after sprint ship |

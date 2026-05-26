# Vendor Outreach Drafts — Sandbox Credentials Requests

**Type**: Email/letter templates (3 drafts ready for user to send)
**Date**: 2026-05-25
**Audience**: User — for review + send to each vendor
**Purpose**: Eliminate the "what do I write?" friction; just sign + send

These are drafts. Review for accuracy of company-specific details (company legal name, signatory title, etc.) before sending. The technical asks are correct as-is.

---

## 1. Saudi Disability Authority — Sandbox creds + API spec

**Recipient**: Disability Authority IT / partnerships contact
**Subject (AR)**: طلب صلاحيات اختبار + مواصفات API للتقرير الشهري — مركز [اسم المركز]
**Subject (EN)**: Sandbox credentials + monthly-report API spec request — [Center Name]

### Body (Arabic)

```
السلام عليكم ورحمة الله وبركاته،

مركزنا [اسم المركز]، رقم الترخيص [number]، يَعمل على تَفعيل المُكامَلة الآلية مع
نظام الهيئة لرفع تقارير الخدمات الشهرية وتَدقيق بطاقات الإعاقة.

نَطلب لذلك ثلاثة عناصر:

  1. **بيانات اعتماد بيئة الاختبار**:
     - DISABILITY_AUTHORITY_BASE_URL (نَفترض أن مَنفذ sandbox يَختلف عن production)
     - DISABILITY_AUTHORITY_API_KEY (مفتاح اختبار مَخصّص لمَركزنا)
     - DISABILITY_AUTHORITY_CENTER_ID (مُعَرّف المركز في نظامكم)

  2. **مواصفات API للتقرير الشهري** (monthly periodic report):
     - شكل JSON المَطلوب (field schema)
     - حقول إلزامية + اختيارية
     - متطلبات تَنسيق التَواريخ + اللغة (AR/EN)
     - رمز الاستجابة المتوقع + شكل acknowledgement
     - حدود حجم الـ payload (إن وُجدت)

  3. **مواصفات API لتَدقيق بطاقة الإعاقة** (verify disability card):
     - حقول الطلب (cardNumber + nationalId؟)
     - شكل الاستجابة + حقولها (valid/expired/classification…)

نَستعد لـ pilot في فرع واحد خلال 4 أسابيع. هَل يُمكن جَدوَلة مكالمة فنية مع
فريقكم لتَوضيح التَفاصيل؟

شكراً لتَعاوُنكم،
[الاسم]
[المُسَمّى الوَظيفي]
[رقم الجَوّال + البريد]
```

### What to expect back

- Sandbox URL + API key (may take 2-4 weeks)
- PDF/Postman collection of API spec
- Maybe: pre-prod NDA to sign first

### Once received → action

```bash
# Set in pilot env:
export DISABILITY_AUTHORITY_BASE_URL=https://sandbox.disability-authority.gov.sa/api
export DISABILITY_AUTHORITY_API_KEY=<key>
export DISABILITY_AUTHORITY_CENTER_ID=<your-center-id>
export DISABILITY_AUTHORITY_MODE=live

# Verify:
cd backend && npm run preflight    # should show disabilityAuthority configured
```

Then build the real payload (in `startup/disabilityAuthorityBootstrap.js`) replacing the `STUB_PAYLOAD_MARKER` stub — Claude can do this once you have the spec doc from the Authority.

---

## 2. Sehhaty / Tawakkalna — Sandbox creds + spec

**Recipient**: Ministry of Health partnerships contact (or whoever handles Sehhaty B2B integrations)
**Subject (AR)**: طلب صلاحيات اختبار صحتي + مواصفات API لاستيراد ملف صحي للمستفيد
**Subject (EN)**: Sehhaty/Tawakkalna sandbox credentials + health-summary import API spec

### Body (Arabic)

```
السلام عليكم ورحمة الله وبركاته،

مركز التأهيل [اسم المركز] يَعمل على تَفعيل استيراد الملخص الصحي للمُستفيدين من
نظام صحتي / تَوَكَّلنا، بَعد الحصول على موافقة المُستفيد الصريحة (consent-gated).

نَطلب:

  1. **بيانات اعتماد بيئة الاختبار**:
     - SEHHATY_BASE_URL (sandbox endpoint)
     - SEHHATY_CLIENT_ID + SEHHATY_CLIENT_SECRET (OAuth2)
     - SEHHATY_CENTER_ID (مُعَرّف المركز في نظامكم)

  2. **مواصفات endpoints الـ 3**:
     - importHealthSummary (نَفترض GET /summary?nationalId=…)
     - importVaccinations (تاريخ التَطعيمات)
     - linkTawakkalna (ربط حساب الـ Tawakkalna بسجل المُستفيد)

  3. **متطلبات الـ consent / موافقة المُستفيد** (نَطلب وَثيقة الـ consent format
     التي يَوَقّعها المُستفيد رقمياً — أو نَستخدم نَموذجنا المَحَلّي).

نَستعد لـ pilot خلال 4 أسابيع. مَكالمة فنية لتَوضيح التَفاصيل مَطلوبة.

شكراً،
[الاسم]
[المُسَمّى الوَظيفي]
[رقم الجَوّال + البريد]
```

### Once received → action

```bash
export SEHHATY_BASE_URL=https://sandbox.sehhaty.sa/api
export SEHHATY_CLIENT_ID=<id>
export SEHHATY_CLIENT_SECRET=<secret>
export SEHHATY_CENTER_ID=<id>
export SEHHATY_MODE=live
cd backend && npm run preflight    # should show sehhaty configured
```

Claude can then implement the 3 `live*` functions in `services/sehhatyAdapter.js` (currently throw `SEHHATY_LIVE_NOT_CONFIGURED`).

---

## 3. SAMA Mudad — WPS sandbox creds + spec

**Recipient**: SAMA Mudad / banking partner that hosts the WPS upload endpoint
**Subject (AR)**: طلب صلاحيات بيئة اختبار للرفع الآلي إلى نظام حماية الأجور (مُدد)
**Subject (EN)**: Mudad WPS sandbox SFTP credentials request — [Establishment Name]

### Body (Arabic)

```
السلام عليكم ورحمة الله وبركاته،

مُؤَسّسة [اسم المُؤَسّسة]، رقم منشأة [number]، تَعمل على أتمتة رفع ملف الرواتب
الشهري إلى نظام حماية الأجور (Mudad) عبر SFTP بدلاً من الرفع اليدوي.

نَطلب:

  1. **بيانات اعتماد SFTP لبيئة الاختبار**:
     - MUDAD_SFTP_HOST (sandbox endpoint)
     - MUDAD_SFTP_USER (مُستخدم SFTP لمُؤَسّستنا)
     - مفتاح SSH العام لتَسجيله (سنُرسله بعد ردكم)
     - منفذ + مَسار upload (إن لم يكن standard /uploads)

  2. **مواصفات ملف SIF** (Salary Information File):
     - شكل الـ header / detail / footer rows
     - حقول إلزامية لكل سجل عامل (IBAN, nationalId, amount, currency…)
     - متطلبات التَواقيع الرقمية (إن وُجدت)
     - حجم الـ batch الأقصى المَسموح به

  3. **مواصفات endpoint الاستجابة**:
     - كيف نَستعلم عن حالة الـ batch بعد الرفع
     - تَنسيق رسائل الأخطاء (per-employee errors)

نَستعد لـ pilot خلال 4 أسابيع. هَل توفِّرون وَثيقة integration guide + Postman
collection؟

شكراً،
[الاسم]
[المُسَمّى الوَظيفي]
[رقم الجَوّال + البريد]
```

### Once received → action

```bash
export MUDAD_SFTP_HOST=sandbox.mudad.sa
export MUDAD_SFTP_USER=<user>
export MUDAD_SFTP_KEY_REF=<path-or-vault-ref>
export MUDAD_MODE=live
```

Then Claude can:

- Implement `services/mudadAdapter.js` (currently `loadOptional` → null fallback)
- Verify against the existing W282b orchestrator
- Sandbox-test with synthetic payroll data before live cutover

---

## Reply tracking

Suggest keeping a simple log:

| Vendor                     | Sent       | Reply (Y/N) | Creds received | Status |
| -------------------------- | ---------- | :---------: | :------------: | ------ |
| Saudi Disability Authority | 2026-MM-DD |             |                |        |
| Sehhaty (MoH)              | 2026-MM-DD |             |                |        |
| SAMA Mudad                 | 2026-MM-DD |             |                |        |

Vendor lead times historically:

- DA: 2-4 weeks
- Sehhaty: 4-6 weeks
- Mudad: 2-3 weeks

Send all 3 in parallel — they don't depend on each other.

---

## Related

- [`PRODUCTION_GAPS_BEFORE_LIVE.md`](../PRODUCTION_GAPS_BEFORE_LIVE.md) §2 — vendor dependency matrix
- [`pilot/SCENARIO_5_DISABILITY_AUTHORITY_REPORT.md`](SCENARIO_5_DISABILITY_AUTHORITY_REPORT.md) — DA workflow validation (mock now, live after creds)
- [`SESSION_2026-05-25_HANDOFF.md`](../SESSION_2026-05-25_HANDOFF.md) §3 — full user-side action priority list

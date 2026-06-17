# WhatsApp Menu Bot — Activation & Operations Runbook

> The stateful, menu-driven WhatsApp assistant ("مساعد الأوائل الذكي"). Built
> across six waves and **deployed to production** (W1366 + W1380–W1383 are live
> on Hostinger; W1384 + W1408 are merged and deploy once the ops gate is green).
> The code is **live but inert** until the feature flags are set AND WhatsApp
> itself is provisioned. This is the single reference for activating, verifying,
> and operating it.

| Wave | What it adds |
| --- | --- |
| W1366 | Stateful FSM: welcome menu (bot disclosure + human escalation) + 10 multi-step flows |
| W1380 | 4 new units → 14 total: FAQ, location, satisfaction survey, emergency fast-track |
| W1381 | Native interactive WhatsApp menu (tappable category list → sub-list) |
| W1382 | Intelligence: score-based routing, idle-flow timeout reset, usage analytics |
| W1383 | Bilingual (Arabic / English), sticky + switchable |
| W1384 | Completed flows create real DB records (Complaint / NpsResponse / PublicBookingRequest) |
| W1408 | Bot events linked to the beneficiary's unified-core CareTimeline |

---

## 1. The four feature flags

All default **OFF**. Set in `backend/.env` (production:
`/home/alawael/app/backend/.env`). Each requires `ENABLE_WHATSAPP_BOT_MENU`.

| Flag | Effect | Safety |
| --- | --- | --- |
| `ENABLE_WHATSAPP_BOT_MENU` | The menu + all 14 flows. Lookup units **escalate** to staff. | Safe — escalation-only; no PII auto-sent. |
| `ENABLE_WHATSAPP_BOT_INTERACTIVE` | Main menu sent as a tappable WhatsApp list (categories → sub-lists) instead of numbered text. | Safe — numbered text remains the fallback for old clients. |
| `ENABLE_WHATSAPP_BOT_LIVE_DATA` | Attendance / session-report / billing units return **real data** to a verified guardian. | Sensitive — auto-sends clinical/financial data. Enable only after reviewing §5. |
| `ENABLE_WHATSAPP_BOT_RECORDS` | Completed flows create real trackable records (§6). | Records into Complaint / NpsResponse / PublicBookingRequest queues. |

**Core-timeline linkage (W1408) has no separate flag** — it runs automatically
when the bot handles a beneficiary-attributable event (it's part of the bot's
behavior once `ENABLE_WHATSAPP_BOT_MENU` is on; defensive, never blocks a reply).

Recommended rollout: `MENU` first (fully safe) → then `INTERACTIVE` → then
`RECORDS` → then `LIVE_DATA` (most sensitive) once comfortable.

## 2. Architecture & files

The engine is **pure** (no DB/network); the dispatcher owns all I/O.

| File | Role |
| --- | --- |
| `intelligence/whatsapp-bot-flow.registry.js` | Pure constants + helpers: 14-unit menu, per-unit steps, triggers, Arabic-digit menu parsing, score-based keyword routing, interactive category builders (W1381), FAQ content. |
| `intelligence/whatsapp-bot-flow.service.js` | The FSM. `handleTurn(flowState, text, ctx) → {reply, nextFlowState, sideEffect, handled, menu}`. Language-aware (W1383), idle-stale + analytics helpers (W1382). |
| `intelligence/whatsapp-bot-flow.i18n.js` | Bilingual overlay (Arabic-first + English layer) + language detection/switch (W1383). |
| `services/whatsapp/whatsappBotData.service.js` | Guardian-verified live-data lookups (W1372 Wave 2). |
| `services/whatsapp/whatsappBotRecords.service.js` | Side-effect → real DB record (W1384). |
| `services/whatsapp/whatsappBotTimeline.service.js` | Side-effect → unified-core CareTimeline (W1408). |
| `models/WhatsAppConversation.js` | `botFlow` subdoc persists the flow cursor (`unit, step, phase, collected, lang`). |
| `services/whatsapp/whatsappWebhook.service.js` | Dispatcher: runs the FSM before the stateless autoReply; `dispatchBotPlan()` sends (text or interactive list), persists, creates records, escalates, and timelines. |

## 3. The 14 menu units

| # | Unit | On completion |
| --- | --- | --- |
| 1 | معلومات عن المركز | Static info |
| 2 | التسجيل الأولي | → PublicBookingRequest (or escalate) |
| 3 | حجز/تعديل/إلغاء موعد | → escalate (+ timeline) |
| 4 | تقارير الحضور | Live data (or escalate) |
| 5 | تقارير الجلسات | Live data (or escalate) |
| 6 | التمارين المنزلية | Static per-department exercises |
| 7 | الرسوم والفواتير | Live data (or escalate) |
| 8 | الإشعارات والتنبيهات | Static info |
| 9 | الشكاوى والملاحظات | → Complaint (+ timeline) |
| 10 | التواصل مع موظف بشري | → escalate (+ timeline) |
| 11 | الأسئلة الشائعة (FAQ) | Static topic answer |
| 12 | الموقع والاتجاهات | Static info |
| 13 | تقييم الخدمة (رضا) | → NpsResponse (+ timeline) |
| 14 | 🚨 بلاغ عاجل | → urgent escalate (+ critical timeline) |

Senders can type a number, a keyword (e.g. "أبغى أحجز موعد"), tap an interactive
row, or "القائمة" to return to the menu. Typing "english" / "عربي" switches
language (sticky). An abandoned multi-step flow auto-resets after 6h.

## 4. Interactive menu (W1381)

When `ENABLE_WHATSAPP_BOT_INTERACTIVE` is on, the main menu is a WhatsApp **list**
of 7 categories (the 14 units exceed WhatsApp's 10-row cap, so it's two-level);
tapping a category sends a sub-list of its units. Reply ids are namespaced
`BOTNAV:cat:*` / `BOTNAV:unit:*`. Numbered text remains the fallback.

## 5. Live-data authorization (privacy-critical)

Units 4 / 5 / 7 send beneficiary data **only** when `ENABLE_WHATSAPP_BOT_LIVE_DATA`
is on AND:

1. The inbound phone resolves to a `FamilyMember` that is an **authorized
   guardian** (`portalAccess.enabled` / `isLegalGuardian` / `isPrimaryContact`).
2. Data is **always** for a beneficiary in the phone's **own** authorized set;
   the typed name only disambiguates among that phone's children. Ambiguous /
   unverified → decline + escalate (never look a stranger's child up by name).
3. Every query is keyed by an authorized `beneficiaryId` → cross-branch leakage
   is structurally impossible.

> ⚠️ Related open finding: **W1407** (PR #526) reported a cross-tenant leak in the
> staff-facing `/conversations` read route (scopes by an unset `organizationId`).
> Coordinate the owner's branch-scope fix before exposing WhatsApp externally.

## 6. Records (W1384) — `ENABLE_WHATSAPP_BOT_RECORDS`

Completed flows create real trackable records (else escalation only). Clinical
condition is never guessed — an unclear diagnosis maps to the schema's
"غير متأكد — أحتاج تقييماً" with the raw text in `notes`.

| Flow | Record |
| --- | --- |
| complaint | `Complaint` (source=parent) |
| satisfaction | `NpsResponse` (1–5 → 0–10 NPS + bucket; needs a phone-linked guardian) |
| registration | `PublicBookingRequest` (source=whatsapp) |

Staff are still notified, with the created record id attached.

## 7. Core-timeline linkage (W1408)

Beneficiary-attributable events land on the beneficiary's unified `CareTimeline`
(via a direct `timelineService.addEvent`, only when the phone resolves to an
authorized-guardian beneficiary):

| Event | CareTimeline eventType (category / severity) |
| --- | --- |
| complaint | `note_added` (communication / warning) |
| emergency | `red_flag_raised` (clinical / **critical**) |
| callback | `family_contact` (communication) |
| satisfaction | `nps_response_recorded` (communication) |
| appointment | `note_added` (administrative) |

Registration (no beneficiary yet) + read-only lookups are not timelined.

## 8. Activation procedure

### Step 1 — Provision WhatsApp (Meta) — owner task

Set in `backend/.env` (the bot does nothing until WhatsApp is connected):

| Key | Source |
| --- | --- |
| `WHATSAPP_API_TOKEN` | Meta system-user permanent token |
| `WHATSAPP_PHONE_ID` | Phone-number-id from Meta |
| `WHATSAPP_BUSINESS_ID` | Meta WhatsApp Business Account ID |
| `WHATSAPP_WEBHOOK_SECRET` | Meta App Secret (X-Hub HMAC) |
| `WHATSAPP_VERIFY_TOKEN` | A value you choose |

Register the webhook `https://alaweal.org/api/whatsapp/webhook` in Meta with the
verify token, subscribe to `messages`, and approve message templates.

### Step 2 — Enable flags + restart

```env
ENABLE_WHATSAPP_BOT_MENU=true
# optionally, after review:
ENABLE_WHATSAPP_BOT_INTERACTIVE=true
ENABLE_WHATSAPP_BOT_RECORDS=true
ENABLE_WHATSAPP_BOT_LIVE_DATA=true
```

```bash
pm2 restart alawael-api --update-env   # --update-env re-reads .env
curl -s "http://localhost:5000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=test"  # echoes "test"
```

Send "القائمة" to the business number → expect the welcome menu.

## 9. Operations

- **Escalations** → staff pending-review queue (`requiresHumanReview=true`,
  `status='pending_review'`, in-app notification `category:'whatsapp_bot_request'`,
  carrying any created record id). Emergencies go straight to `escalated` +
  critical.
- **Records** land in their own queues (Complaint / NpsResponse / admissions).
- **Timeline** — bot events appear on the beneficiary's `CareTimeline`.
- **Analytics** — parseable `[WhatsApp BotAnalytics] event=… unit=…` log lines.

## 10. Tests

```bash
cd backend
npx jest --config=jest.config.js \
  __tests__/whatsapp-bot-flow-menu-wave1372.test.js \
  __tests__/whatsapp-bot-data-lookup-wave1372.test.js \
  __tests__/whatsapp-bot-new-units-wave1380.test.js \
  __tests__/whatsapp-bot-interactive-menu-wave1381.test.js \
  __tests__/whatsapp-bot-intelligence-wave1382.test.js \
  __tests__/whatsapp-bot-bilingual-wave1383.test.js \
  __tests__/whatsapp-bot-records-wave1384.test.js \
  __tests__/whatsapp-bot-core-linkage-wave1408.test.js --no-coverage
```

All enumerated in `sprint-tests.txt`; the full WhatsApp suite is green.

## 11. Rollback

Unset (or set ≠ `true`) the flags and `pm2 restart alawael-api --update-env`.
Inbound handling reverts to the prior stateless auto-reply. No data migration;
`botFlow` state is simply ignored while the menu flag is off.

## 12. Production reference

- Host: `ssh -i ~/.ssh/alawael_deploy root@72.60.84.56` (Hostinger VPS `srv995033`).
- App: `/home/alawael/app/backend`, runs as `alawael`, pm2 `alawael-api`, port 5000
  behind nginx serving `alaweal.org`. `pm2 restart … --update-env` to apply `.env`.

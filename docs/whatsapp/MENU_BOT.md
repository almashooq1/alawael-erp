# WhatsApp Menu Bot — Activation & Operations Runbook

> Feature **W1372** ("مساعد الأوائل الذكي" — the stateful, menu-driven WhatsApp
> assistant). Shipped in PR #510, merged to `main` (`5d70413d3`) and deployed to
> production. The code is **live but inert** — it does nothing until the two
> feature flags are set AND WhatsApp itself is provisioned. This runbook is the
> single reference for turning it on, verifying it, and operating it.

---

## 1. What it is

The pre-existing WhatsApp inbound pipeline was **stateless**: one inbound
message → one intent classification (`whatsappAI.classifyIntent`) → one reply
decision (`autoReply.decide`). It had no concept of "which step of a multi-turn
flow is this sender on".

W1372 adds a deterministic **finite-state machine** on top:

- A **welcome menu** that discloses it is a bot ("بوت افتراضي") and offers human
  escalation (WhatsApp business-bot policy compliance).
- A numbered **10-unit main menu**.
- Per-unit **multi-step flows** (registration, appointment request, complaint,
  human callback) that collect fields one short question at a time, summarize,
  ask for confirmation, then hand off to staff.
- Read-only **lookup units** (attendance, session report, billing) that — when
  the live-data flag is on — return real data to a verified guardian, otherwise
  collect the request and escalate.
- Static **informational units** (center info, home exercises, notifications).

It runs **before** the stateless `autoReply` classifier and short-circuits it
when it handles a turn. Any engine error falls through to the old path
(fail-safe), so enabling it can never make inbound handling worse.

## 2. The two feature flags

Both default **OFF**. Set in `backend/.env` (production:
`/home/alawael/app/backend/.env`).

| Flag                                 | Effect                                                                                                                                     | Safety                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `ENABLE_WHATSAPP_BOT_MENU=true`      | Activates the menu + all 10 flows. Lookup units **escalate** to staff (no sensitive data sent).                                            | Safe — escalation-only; no PII auto-sent.                                                                 |
| `ENABLE_WHATSAPP_BOT_LIVE_DATA=true` | The attendance / session-report / billing units return **real data** to a verified guardian instead of escalating. Requires the menu flag. | Sensitive — auto-sends clinical/financial data. Enable only after reviewing the authorization model (§5). |

You can run the menu flag alone indefinitely; the live-data flag is an
independent, later decision.

## 3. Architecture & files

| File                                                   | Role                                                                                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/intelligence/whatsapp-bot-flow.registry.js`   | Pure constants + helpers: the 10-unit menu, per-unit step definitions, triggers, Arabic-digit-aware menu parsing, free-text keyword routing, yes/no/cancel/skip detection. |
| `backend/intelligence/whatsapp-bot-flow.service.js`    | The stateful FSM. `handleTurn(flowState, text, ctx) → {reply, nextFlowState, sideEffect, handled}`. No DB / network.                                                       |
| `backend/services/whatsapp/whatsappBotData.service.js` | The guardian-verified live-data layer (§5).                                                                                                                                |
| `backend/models/WhatsAppConversation.js`               | `botFlow` subdocument persists each sender's flow cursor (`{unit, step, phase, collected}`).                                                                               |
| `backend/services/whatsapp/whatsappWebhook.service.js` | The dispatcher: runs the FSM, sends replies, persists state, escalates side effects.                                                                                       |

State is persisted per phone on `WhatsAppConversation.botFlow`; `unit: null`
means idle (between flows).

## 4. The 10 menu units

| #   | Unit                    | Behavior                              | On completion                   |
| --- | ----------------------- | ------------------------------------- | ------------------------------- |
| 1   | معلومات عن المركز       | Static info                           | —                               |
| 2   | التسجيل الأولي          | Collects 8 fields → summary → confirm | Escalate (registration request) |
| 3   | حجز/تعديل/إلغاء موعد    | Collects action + details → confirm   | Escalate (appointment request)  |
| 4   | تقارير الحضور والانصراف | Collects name + date                  | Live data (or escalate)         |
| 5   | تقارير الجلسات          | Collects name + dept + period         | Live data (or escalate)         |
| 6   | التمارين المنزلية       | Collects name + dept                  | Static per-department exercises |
| 7   | الرسوم والفواتير        | Collects guardian + name              | Live data (or escalate)         |
| 8   | الإشعارات والتنبيهات    | Static info                           | —                               |
| 9   | الشكاوى والملاحظات      | Collects 5 fields → summary → confirm | Escalate (complaint)            |
| 10  | التواصل مع موظف بشري    | Collects 4 fields → summary → confirm | Escalate (callback request)     |

Senders can type a number, a keyword (e.g. "أبغى أحجز موعد"), or "القائمة" to
return to the menu at any time.

## 5. Authorization model for live data (privacy-critical)

Units 4 / 5 / 7 send beneficiary data **only** when `ENABLE_WHATSAPP_BOT_LIVE_DATA`
is on AND the request passes a strict guardian-authorization gate:

1. The inbound phone must resolve to a `FamilyMember` record that is an
   **authorized guardian** (`portalAccess.enabled`, `isLegalGuardian`, or
   `isPrimaryContact`). A bare secondary contact does not qualify.
2. The data returned is **always** for a beneficiary in the phone's **own**
   authorized set. The typed name only disambiguates among that phone's children
   (siblings). If the phone has several children and the name doesn't match
   exactly one, the bot **declines and escalates** — it never looks a stranger's
   child up by name.
3. Every query is keyed by an authorized `beneficiaryId`, so cross-branch
   leakage is structurally impossible.

When the gate fails (unverified phone, ambiguous child, no data, model
unavailable) the bot falls back to escalation — staff follow up manually.

## 6. Activation procedure

### Step 1 — Provision WhatsApp (Meta) — owner task

This is external setup in Meta Business Manager (the bot does nothing until it
is done). Obtain and set these in `backend/.env`:

| Key                       | Source                                               |
| ------------------------- | ---------------------------------------------------- |
| `WHATSAPP_API_TOKEN`      | Meta system-user permanent token                     |
| `WHATSAPP_PHONE_ID`       | Phone-number-id from the Meta dashboard              |
| `WHATSAPP_BUSINESS_ID`    | Meta WhatsApp Business Account ID                    |
| `WHATSAPP_WEBHOOK_SECRET` | Meta "App Secret" (HMAC of inbound webhooks)         |
| `WHATSAPP_VERIFY_TOKEN`   | A value you choose; entered in Meta's webhook config |

Then in Meta's dashboard, register the webhook callback URL
`https://alaweal.org/api/whatsapp/webhook` with the same verify token, and
subscribe to `messages`. Approve message templates for sends outside the 24-hour
service window. (See also `docs/whatsapp/SETUP_AND_OTP.md`.)

### Step 2 — Enable the flags

In `backend/.env` on production:

```env
ENABLE_WHATSAPP_BOT_MENU=true
# Optional, only after reviewing §5:
ENABLE_WHATSAPP_BOT_LIVE_DATA=true
```

### Step 3 — Restart & verify

```bash
# on the prod host, as the app user
pm2 restart alawael-api --update-env   # --update-env so the new .env is read

# verify the service is up and WhatsApp is enabled
curl -s http://localhost:5000/api/whatsapp/status   # (needs an auth token)

# webhook reachability (Meta will call this)
curl -s "http://localhost:5000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=test"
# → should echo "test" when the verify token matches
```

Then send a WhatsApp message to the business number (e.g. "القائمة") and confirm
the welcome menu replies.

## 7. Operations

- **Escalations** land in the staff "pending review" queue: a completed flow with
  a side effect sets `WhatsAppConversation.requiresHumanReview = true`,
  `status = 'pending_review'`, and `escalationReason`, and fires an in-app
  notification (`category: 'whatsapp_bot_request'`) carrying the collected
  payload.
- **Side-effect kinds**: `create_registration`, `create_appointment_request`,
  `lookup_attendance`, `lookup_session_report`, `lookup_billing`,
  `create_complaint`, `callback_request`. A future wave can branch on these to
  create dedicated records (e.g. `ComplaintEnhanced`) instead of escalating.
- **Where staff see it**: the existing WhatsApp conversations dashboard /
  pending-review queue (`GET /api/whatsapp/conversations/pending-review`).

## 8. Verification & tests

```bash
cd backend
npx jest --config=jest.config.js \
  __tests__/whatsapp-bot-flow-menu-wave1372.test.js \
  __tests__/whatsapp-bot-data-lookup-wave1372.test.js --no-coverage
# 46 tests: FSM static + behavioral walk, authZ gate, formatters, parsers.
```

Both suites are enumerated in `backend/sprint-tests.txt` (so they run in the
sharded deploy gate) and the CI `paths:` triggers.

## 9. Rollback

To disable instantly, unset (or set to anything other than `true`) the flags and
restart:

```bash
# edit backend/.env → remove/false the two ENABLE_WHATSAPP_BOT_* lines
pm2 restart alawael-api --update-env
```

Inbound handling reverts to the prior stateless auto-reply behavior. No data
migration is involved; `botFlow` state on existing conversations is simply
ignored while the menu flag is off.

## 10. Production reference

- Host: `ssh -i ~/.ssh/alawael_deploy root@72.60.84.56`
- App dir: `/home/alawael/app/backend` (runs as the `alawael` user, pm2 process
  `alawael-api`, port 5000 behind nginx).
- Env: `backend/.env`, loaded via dotenv. `pm2 restart … --update-env` is
  required for `.env` changes to take effect (a plain reload does not re-read it).

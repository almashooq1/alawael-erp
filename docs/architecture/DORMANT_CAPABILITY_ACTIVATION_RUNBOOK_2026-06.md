# Dormant-capability activation runbook (2026-06 wiring waves)

**Status:** 🟢 Reference / ops runbook
**Audience:** operators / on-call enabling the capabilities wired in the 2026-06
"dormant-capability" waves.

This session wired several capabilities that were **built but never started** (the
W225 pattern: code existed, nothing scheduled/called it). Each ships **env-gated,
default OFF** so deploys stay inert — they do nothing until an operator opts in.
This runbook is the single place that lists the flags, what they do, prerequisites,
and the safe activation order. Without it these capabilities stay invisible.

> All flags are read from the backend process env (`66666/backend`, `.env` +
> `pm2 restart --update-env` to re-read — `reload` does NOT). Verify each with the
> stated check before/after flipping.

---

## Cross-cutting prerequisite — email delivery

Several capabilities below produce **email** (report delivery, quality audit
notifications, incident→NCR alerts). Email is hardened (W735) but **inert until a
provider credential is set**:

- `SENDGRID_API_KEY` **or** `SMTP_USER` + `SMTP_PASS` (Gmail app-password)
- Verify: `node -e "console.log(require('./services/emailService').emailStatus())"`
  should report a configured transporter (not `null`).

Until this is set, the email-producing capabilities still run safely — they just
log "no recipient / transporter unavailable" instead of sending. **Set this first**
to get value from reporting + quality + incident emails in one move.

---

## Capabilities (each default OFF)

| Capability | Flag(s) | Default | What enabling does | Mutates / egresses? | Extra prereq |
|---|---|---|---|---|---|
| **Reporting scheduler** (W762) | `ENABLE_REPORT_SCHEDULER=true` | OFF | Starts the Phase-10 reporting platform — periodic + ops report runs per `report.catalog` periodicity | Emits reports (email/in-app) | email secret (for email delivery) |
| **Reporting delivery webhooks** (W933) | `ENABLE_REPORT_WEBHOOKS=true` | OFF | Wires the real delivery/read-receipt handler → `ReportDelivery` ledger. Portal read-receipts record immediately; the 4 external providers (sendgrid/mailgun/twilio/whatsapp) are **fail-closed (401)** until signing secrets are wired | Updates ReportDelivery rows | provider signing secrets to enable external providers (portal works without) |
| **Care-plan workers** (W973) | `ENABLE_CARE_PLAN_WORKERS=true` (`CARE_PLAN_OVERDUE_REVIEW_CRON`, `CARE_PLAN_FAMILY_RETRY_CRON`) | OFF | Schedules the overdue-review scanner (daily) + family-notification retry (15 min) | Notifies staff/family | email/SMS channel for family sends |
| **Incident → NCR auto-link** (W976) | `ENABLE_INCIDENT_NCR_AUTOLINK=true` | OFF | On a NEW incident, emits `quality.incident.reported`; the pipeline auto-creates an NCR + CAPA for **serious** incidents (severity major/critical/sentinel — self-filtered) | **Creates** NCR + CAPA records; emits alert | — |
| **Retention sweep** (W983) | `ENABLE_RETENTION_SWEEP=true` (`RETENTION_SWEEP_CRON`, `RETENTION_SWEEP_BRANCH_IDS`, `RETENTION_SWEEP_LIMIT`) | OFF | Daily batch churn/retention-risk re-assessment | **Creates** RetentionAssessment rows; **emits interventions** (psychologist notify / home-visit request / case flag) | validate the churn model + scope before enabling org-wide |

> Always-on (no flag, shipped this session): **W941/W974** unified the quality event
> bus so audit/quality events reach the email notification router. These need only
> the email secret to actually send.

> Related earlier flag (for completeness): **W676** `ENABLE_DB_BACKUP_CRON=true` —
> nightly mongodump; prereq: `mongodump` on host + writable `DB_BACKUP_DIR`.

---

## Recommended activation order (lowest blast-radius first)

1. **Set the email secret** (unlocks delivery for everything below). Verify `emailStatus()`.
2. **`ENABLE_REPORT_SCHEDULER`** — read-mostly; produces scheduled reports. Verify a
   report instance runs on the next periodicity tick + a `ReportDelivery` row appears.
3. **`ENABLE_REPORT_WEBHOOKS`** — portal read-receipts only at first (externals stay
   fail-closed). Verify a portal read updates the ledger to READ.
4. **`ENABLE_CARE_PLAN_WORKERS`** — review-scan + family-retry. Verify the overdue
   scan logs `[care-plan] overdue-review scan: …` on the next cron tick.
5. **`ENABLE_INCIDENT_NCR_AUTOLINK`** — state-mutating. Pilot: file one *serious*
   test incident, confirm exactly one NCR + CAPA are created (dedup by incidentId).
6. **`ENABLE_RETENTION_SWEEP`** — highest blast radius (mass interventions). Pilot on
   ONE branch via `RETENTION_SWEEP_BRANCH_IDS=<one>` + a low `RETENTION_SWEEP_LIMIT`,
   review the generated assessments/interventions, then widen.

Each is independently reversible: unset the flag + `pm2 restart --update-env`.

---

## Verification & rollback (per flag)

- **Confirm a flag is live in the process** (not just `.env`): the bootstrap logs a
  line at boot — e.g. `[startup] W762 reporting scheduler started …`,
  `[startup] W983 retention sweep scheduled …`. Absence of the "disabled" log line
  + presence of the "started/scheduled" line means it's on. (`/proc/<pid>/environ`
  does NOT show dotenv-injected vars — check the boot log instead.)
- **Rollback:** remove the flag from `.env`, `pm2 restart alawael-api --update-env`,
  confirm the "disabled" log line returns.

## Cross-references

Per-wave detail in agent memory (`project_reporting_scheduler_w762_*`,
`project_reporting_webhooks_w931_*`, `project_care_plan_workers_w973_*`,
`project_retention_sweeper_w983_*`) + `QUALITY_EVENT_BUS_FINDINGS_2026-06-05.md`
(W941/W974/W976 quality bus).

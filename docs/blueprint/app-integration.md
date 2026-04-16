# App Integration Guide

> How to wire the P1/P2 scaffolded modules (ABAC, Privacy, KPI Dashboard, Alerts) into the running Express app.

This document is for the engineer(s) who will integrate these modules with `backend/app.js` and the existing route registry (`backend/routes/_registry.js`). Each module was built with dependency injection so the integration is straightforward and reversible.

---

## 1. Privacy routes (`/api/privacy`)

```js
// backend/app.js  (or a startup/init file)
const express = require('express');
const { Consent, DataSubjectRequest } = require('./privacy');
const { buildRouter } = require('./privacy/privacy.routes');
const { authenticateToken } = require('./middleware/auth');

app.use(
  '/api/privacy',
  authenticateToken, // require a logged-in user
  buildRouter({
    Consent,
    DataSubjectRequest,
    audit: (req, evt) => req.log?.info({ event: 'privacy_audit', ...evt }),
  }),
);
```

Suggested ABAC protection (P2+):

```js
const { enforce } = require('./authorization/abac');

app.use(
  '/api/privacy/dsr',
  authenticateToken,
  enforce({ action: 'manage', resourceType: 'DataSubjectRequest' }),
  buildRouter({ Consent, DataSubjectRequest }).routes,
);
```

---

## 2. KPI + Executive Dashboard (`/api/dashboard`)

```js
const { buildRouter: buildDashboardRouter } = require('./kpi/dashboard.routes');

// Collect the models you want computed.
const models = {
  Beneficiary: require('./models/Beneficiary'),
  Session: require('./models/Session'),
  Invoice: require('./models/Invoice'),
  Employee: require('./models/Employee'),
  Appointment: require('./models/Appointment'),
  Incident: require('./models/Incident'),
  Complaint: require('./models/Complaint'),
  Credential: require('./models/Credential'),
};

app.use('/api/dashboard', authenticateToken, buildDashboardRouter({ models }));
```

Endpoints exposed:

| Method | Path                                    | Purpose                                      |
| ------ | --------------------------------------- | -------------------------------------------- |
| GET    | `/api/dashboard/kpi-definitions`        | list all 50 KPIs + hasComputer flag          |
| GET    | `/api/dashboard/kpi/:id`                | compute one KPI (branchId + period optional) |
| GET    | `/api/dashboard/kpi?category=financial` | compute a category                           |
| GET    | `/api/dashboard/executive-snapshot`     | current-month snapshot grouped by category   |

ABAC tip: wrap with a `scope:read` action and a resource-loader that stamps `resource.branchId = req.query.branchId` so `cross-branch-access` policy enforces tenant isolation automatically.

---

## 3. ABAC middleware on existing routes

ABAC is **opt-in per route**. Recommended pattern:

```js
const { enforce } = require('./authorization/abac');

router.get(
  '/beneficiaries/:id',
  authenticateToken,
  enforce({
    action: 'read',
    resourceType: 'Beneficiary',
    resourceLoader: async req => {
      const b = await Beneficiary.findById(req.params.id);
      if (!b) return null;
      return {
        type: 'Beneficiary',
        id: b._id,
        branchId: b.branchId,
        caseTeam: b.caseTeam,
        confidentialityLevel: b.confidentialityLevel,
      };
    },
    onNotApplicable: 'allow', // fall back to RBAC if no ABAC rule matched
  }),
  controller.getBeneficiary,
);
```

**Migration order** (recommended):

1. Add ABAC to high-sensitivity reads first (Beneficiary, Assessment, SessionNote).
2. Then writes (Invoice create, Contract sign).
3. Then admin endpoints (role assignment, branch config).
4. Keep RBAC middleware as the baseline; ABAC layers _on top_.

---

## 4. Alerts: model + dispatcher + scheduler

```js
// startup/alerts.js
const cron = require('node-cron');
const { buildEngine, AlertDispatcher, AlertsScheduler, AlertModel, buildDefaultRecipientResolver } = require('../alerts');

const engine = buildEngine();

// Your notification channels (reuse existing services).
const emailChannel = {
  name: 'email',
  async send(alert, recipients) {
    const service = require('../communication/email-service');
    return service
      .sendAlert(alert, recipients)
      .then(() => ({ success: true }))
      .catch(err => ({ success: false, error: err.message }));
  },
};
const waChannel = {
  name: 'whatsapp',
  async send(alert, recipients) {
    const wa = require('../communication/whatsapp-service');
    return wa
      .sendAlert(alert, recipients)
      .then(() => ({ success: true }))
      .catch(err => ({ success: false, error: err.message }));
  },
};
const inAppChannel = {
  name: 'in_app',
  async send(alert, recipients) {
    const nf = require('../services/notificationService');
    return Promise.all(recipients.map(r => nf.push(r.id, alert)))
      .then(() => ({ success: true }))
      .catch(err => ({ success: false, error: err.message }));
  },
};

const recipients = buildDefaultRecipientResolver({ UserModel: require('../models/User') });

const dispatcher = new AlertDispatcher({
  engine,
  AlertModel,
  channels: { email: emailChannel, whatsapp: waChannel, in_app: inAppChannel },
  recipients,
});

const scheduler = new AlertsScheduler({
  dispatcher,
  cronExpression: '*/5 * * * *', // every 5 minutes
  cron,
});

// At boot (after DB is ready):
scheduler.start(() => ({
  models: {
    Credential: require('../models/Credential'),
    IRP: require('../models/RehabilitationPlan'),
    Invoice: require('../models/AccountingInvoice'),
    Incident: require('../models/Incident'),
  },
}));

module.exports = { engine, dispatcher, scheduler };
```

Endpoints to consider adding:

- `GET /api/alerts/active` — list active alerts for the current user's scope.
- `POST /api/alerts/:id/acknowledge` — mark an alert acknowledged.
- `GET /api/alerts/rules` — list configured rules.

---

## 5. Environment variables introduced

| Var               | Purpose            | Default                        |
| ----------------- | ------------------ | ------------------------------ |
| `NAFATH_BASE_URL` | Nafath API base    | `https://nafath.sa/api`        |
| `NAFATH_SANDBOX`  | use sandbox        | `false`                        |
| `ABSHER_BASE_URL` | Absher API base    | `https://absher.sa/api`        |
| `ABSHER_SANDBOX`  | use sandbox        | `false`                        |
| `YAKEEN_BASE_URL` | Yakeen API base    | `https://yakeen.sa/api`        |
| `YAKEEN_SANDBOX`  | use sandbox        | `false`                        |
| `WASEL_BASE_URL`  | Wasel/CHI API base | `https://wasel.chi.gov.sa/api` |
| `WASEL_SANDBOX`   | use sandbox        | `false`                        |
| `MADAA_SFTP_HOST` | Madaa SFTP server  | —                              |
| `MADAA_SANDBOX`   | use sandbox        | `false`                        |

All adapter credentials should come from a secrets manager (AWS Secrets Manager / HashiCorp Vault) rather than environment files. The `*_KEY_REF` variables are placeholders for the vault reference id, not the secret itself.

---

## 6. Rollback plan

Every integration above is a simple `app.use(...)` call. To disable:

```js
if (process.env.ENABLE_PRIVACY_ROUTES !== 'false') {
  app.use('/api/privacy', ...);
}
```

All scaffolded modules default to no-op if the required models/dependencies are not injected, so they can be included in the codebase without being active.

---

## 7. Migration sequencing

1. **Week 1** — Mount `/api/privacy` (Consent endpoints only; DSR behind feature flag).
2. **Week 2** — Mount `/api/dashboard`; enable a small set of KPIs (5-10).
3. **Week 3** — Wire alerts scheduler in dev environment, observe a week; promote to prod.
4. **Week 4** — Begin adding ABAC `enforce()` to 5 high-sensitivity routes.
5. **Week 5+** — Expand ABAC coverage + integrate gov adapters with sandbox.

Each step is independently shippable, independently reversible.

# Smart Alerts Engine

Declarative, rule-driven alerts that watch domain events and metrics and
emit notifications to owners. Targets the P2-P3 smart-alerts roadmap item
(see `docs/blueprint/06-workflows.md § 5` and `docs/blueprint/09-roadmap.md § P3.1`).

## Rule Shape

```js
module.exports = {
  id: 'credential-expiry-30d',
  severity: 'warning',
  category: 'hr',
  description: 'Credential expires within 30 days',
  // Invoked on schedule or when relevant events occur.
  async evaluate(ctx) {
    const found = await ctx.models.Credential.find({
      verificationStatus: 'verified',
      expiryDate: { $lte: addDays(30), $gte: new Date() },
    });
    return found.map(c => ({
      key: `credential-expiry:${c._id}`,
      subject: { type: 'Credential', id: c._id },
      branchId: c.branchId,
      message: `Credential ${c.licenseNumber} expires on ${c.expiryDate}`,
    }));
  },
};
```

## Engine Responsibilities

- Load all registered rules.
- Run them on cadence (cron) or on event triggers.
- Dedupe alerts by `key` (so the same condition doesn't alert daily).
- Route alerts to the right recipients (owner + escalation chain).
- Record alerts in `Alert` collection for history + audit.
- Resolve / auto-close when the condition clears.

## Structure

```
backend/alerts/
├── README.md
├── index.js                 # public API
├── engine.js                # rule runner + dedupe
├── rules/                   # rule definitions
│   ├── index.js
│   ├── credential-expiry-30d.js
│   ├── irp-overdue-approval.js
│   ├── invoice-overdue-60d.js
│   ├── incident-major.js
│   └── zatca-submission-rejected.js
└── __tests__/
```

## Implementation status

- ✅ Engine skeleton
- ✅ 5 initial rules (scaffolded)
- ⏳ Notification routing (requires BC-11 completion)
- ⏳ Cron wiring (node-cron already in deps)
- ⏳ Alert model (Mongoose) + UI

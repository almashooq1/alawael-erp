# Canonical Location Precedence — Mongoose Model Registration

**Type**: Convention (Cycle 5 no-regrets #3 from ADR-021 DECISION-BRIEF §5)
**Date**: 2026-05-25
**Audience**: every agent + dev who adds or consolidates Mongoose model registrations
**Source**: ADR-021 §"Decision framework for stakeholders" + 5 Tier 1 entity classifications in [021-DECISION-BRIEF.md](decisions/021-DECISION-BRIEF.md)

When duplicate Mongoose model registrations exist under the same name (the W340 bug class), pick the canonical based on **schema richness** AND **directory authority**, in this precedence order:

## Precedence rule

```
1. authorization/         — highest authority (security domain)
2. intelligence/canonical/ — explicit canonical contracts (W325 P1)
3. models/ root           — primary model directory
4. models/<subdir>/       — domain-grouped models
5. services/<domain>/     — service-internal schemas
6. workflow/, queues/, etc. — engine-specific
```

When choosing between same-priority locations, **pick the one with the richest schema** (most fields + lifecycle/methods + indexes), since callers that need fewer fields can usually project; callers that need MORE fields fail silently when the canonical lacks them.

## Worked examples (from Tier 1 audit, 2026-05-25)

| Entity               | Locations found                              | Canonical chosen                                    | Why                                                                                                 |
| -------------------- | -------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **ApprovalRequest**  | authorization/, models/, services/documents/ | `authorization/approvals/approval-request.model.js` | Top of precedence + richest schema (chainId + decisions + slaDeadline + currentApproverRole method) |
| **AuditLog**         | models/, database/, routes/                  | `models/auditLog.model.js`                          | Lives in models/ root + 60+ event-type enum (richest)                                               |
| **ReportTemplate**   | models/reports/, services/documents/         | `models/reports/ReportTemplate.js`                  | models/ subdir (rule 4) beats services/ subdir (rule 5)                                             |
| **WorkflowInstance** | workflow/, services/documents/ × 2           | `workflow/intelligent-workflow-engine.js`           | Generic engine directory + only direct registration (others are document-engine-specific)           |
| **TransitionPlan**   | models/, rehabilitation-services/            | `models/TransitionPlan.js`                          | models/ root + W361 lifecycle + Wave-18 invariants (richer than legacy snake_case)                  |

In all 5 cases, the chosen canonical was the location with the richest schema in the most-authoritative directory. No case required deviating from the precedence rule.

## Anti-pattern: don't do this

```javascript
// ❌ WRONG — registers in services/, but the model is platform-wide
// in services/documents/documentApprovalChains.service.js
const ApprovalRequest = mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', approvalRequestSchema); // 3rd registration, wins lottery half the time
```

```javascript
// ✓ RIGHT — domain-specific service uses a domain-specific name
// in services/documents/documentApprovalChains.service.js
const DocumentApprovalRequest =
  mongoose.models.DocumentApprovalRequest || mongoose.model('DocumentApprovalRequest', documentApprovalRequestSchema);
```

## When adding a new model

Before `mongoose.model('SomeName', schema)`:

1. **Grep first**: `grep -rn "mongoose.model('SomeName'" backend/ --include="*.js"` — if results exist, you're about to create a duplicate
2. **If duplicate would result**: re-read this doc + apply ADR-021's 4-pattern decision tree (A/B/C/D)
3. **If no duplicate**: pick the location per the precedence rule

The W340 drift guard at `backend/__tests__/no-duplicate-model-registration-wave340.test.js` runs on every PR. New duplicates fail CI unless added to `KNOWN_DUPLICATE_REGISTRATIONS` baseline with explicit ADR reference.

## Why this matters

Mongoose silently keeps the FIRST registration of a model name. Subsequent registrations return the cached model via `mongoose.models.X || ...` idiom. So if your code does:

```javascript
const ApprovalRequest = mongoose.model('ApprovalRequest'); // returns whichever loaded first
await ApprovalRequest.find({ status: 'pending' });
```

You don't know which schema's `status` field enum applies. The result depends on `require()` order. In production, this is non-deterministic across deploy + restart.

Pattern D rename (per ADR-021) fixes this by giving each distinct entity its own name.

## Related

- [ADR-021](decisions/021-duplicate-model-registration-consolidation-strategy.md) — the 4-pattern framework (A/B/C/D) for handling duplicates
- [ADR-021 DECISION-BRIEF](decisions/021-DECISION-BRIEF.md) — applies the framework to 5 Tier 1 entities
- [CALLER_AUDIT_TIER1.md](decisions/CALLER_AUDIT_TIER1.md) — pre-rename caller classification
- W340 drift guard: `backend/__tests__/no-duplicate-model-registration-wave340.test.js`
- W325c phantom-ref drift guard (sister concept — refs that don't resolve to ANY model)

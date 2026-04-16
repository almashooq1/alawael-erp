# 9. Audit Trail Standard

Date: 2026-04-17

## Status

✅ Accepted

## Context

The platform requires comprehensive audit trails for:

- Regulatory compliance (PDPL, CBAHI, ZATCA)
- Clinical accountability (who changed this record, when, why)
- Forensic investigation (security incidents)
- Business analytics (usage patterns)

Auditing was present but inconsistent: some writes logged, some reads, some not at all. Formats varied.

## Decision

We adopt a **single canonical audit record shape and coverage policy** enforced via middleware and mongoose plugins.

### Canonical AuditLog Schema

```ts
AuditLog {
  id:           UUID
  timestamp:    DateTime (indexed)
  actorType:    'user' | 'system' | 'api_key' | 'service_account'
  actorId:      UUID | null
  actorName:    String                       // denormalized for readability
  branchId:     UUID | null                  // user's branch at time of action
  resourceType: String                       // 'Beneficiary', 'Invoice', ...
  resourceId:   UUID
  action:       'create' | 'read' | 'update' | 'delete' | 'approve' |
                'reject' | 'export' | 'login' | 'logout' | 'sign' |
                'emergency_access' | 'impersonate' | 'permission_change'
  scope:        'own' | 'branch' | 'cross_branch' | 'global'
  before:       Object | null                // prior state snapshot (diff-only)
  after:        Object | null                // new state snapshot (diff-only)
  reason:       String | null                // required for: emergency access,
                                             // cross-branch writes, override approvals
  ip:           String
  userAgent:    String
  correlationId: UUID                        // for saga tracking
  severity:     'info' | 'notice' | 'warn' | 'critical'
  tags:         [String]                     // e.g., ['phi', 'financial']
}
```

Indexed on: `(resourceType, resourceId, timestamp)`, `(actorId, timestamp)`, `timestamp`.

### Coverage Policy

| Operation Category                                     | Audit?    | Level                       |
| ------------------------------------------------------ | --------- | --------------------------- |
| Login / Logout / MFA                                   | ✅ Always | info (success), warn (fail) |
| Every write (create/update/delete) on operational data | ✅ Always | info                        |
| Reads of PHI                                           | ✅ Always | info                        |
| Reads of PII (outside own-record)                      | ✅ Always | info                        |
| Cross-branch reads by bypass roles                     | ✅ Always | notice                      |
| Export of any dataset                                  | ✅ Always | notice                      |
| Permission or role changes                             | ✅ Always | warn                        |
| Emergency / break-glass access                         | ✅ Always | critical                    |
| System-initiated writes (cron, webhook)                | ✅ Always | info                        |
| Public-page reads (non-authenticated)                  | ❌ No     | —                           |
| Healthcheck requests                                   | ❌ No     | —                           |

### Retention

- **7 years** minimum (matches PDPL recommendations and regulatory norms).
- **Archived** after 1 year to cold storage (S3 Glacier).
- **Searchable** in hot storage for 1 year.

### Integrity

- AuditLog is **append-only**; no updates, no deletes from application code.
- Daily integrity check: hash chain over day's entries, stored with offsite comparison.
- Backup separate from operational backups (dedicated archive).

### Privacy

- `before`/`after` do not store raw sensitive fields like password hashes or encrypted nationalId blobs — store references or redact.
- AuditLog access itself is audited (who looked at whose trail).

## Enforcement

1. **Middleware:** `audit.middleware.js` wraps every mutating route, builds the record from request + response, writes async.
2. **Mongoose plugin:** `auditPlugin` hooks into `save`, `findOneAndUpdate`, `deleteOne` to capture diffs at model level — backup in case a route bypasses the middleware.
3. **Explicit logger:** `auditLogger.log({...})` for non-HTTP actions (background jobs, events).
4. **Lint/CI:** static analysis to flag routes missing `audit.middleware` usage.
5. **Test:** integration test per resource type verifies audit entries appear with correct shape.

## Consequences

### Positive

- Regulatory questions answerable with a query.
- Clinical disputes resolvable.
- Security incident forensics feasible.
- Usage analytics possible (as byproduct).

### Negative

- Storage cost (manageable — JSON docs are small, archive tier for old entries).
- Small write-path latency (async mitigates).
- Discipline required across teams.

### Risks

- A developer writes directly to Mongo bypassing both middleware and plugin. Mitigation: lint rule + CI check; code review checklist.
- Actor IDs lose meaning if users are later deleted. Mitigation: denormalize `actorName` + keep actor shadow records in audit-specific storage.

## References

- [blueprint/08-risks-controls.md](../../blueprint/08-risks-controls.md)
- `backend/middleware/audit.middleware.js`
- `backend/middleware/auditTrail.middleware.js`
- `backend/middleware/enhancedAudit.middleware.js`
- `backend/models/AuditLog.js`

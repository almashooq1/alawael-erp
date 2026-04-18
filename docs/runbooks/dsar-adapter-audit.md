# Runbook — PDPL Data Subject Access Request (DSAR)

**Who triggers this:** a user (or their legal representative) asks us,
under Saudi Arabia's Personal Data Protection Law (PDPL, نظام حماية
البيانات الشخصية), to disclose which of their personal data records
we accessed in third-party government systems, when, and under whose
authority.

**Legal clock:** PDPL grants the controller 30 days to respond,
extendable by 30 days with justification. Start the workflow within
48 hours of receipt.

**Not an alert** — this is a compliance workflow, not an incident.

---

## Who handles the request

| Role               | Responsibility                                           |
| ------------------ | -------------------------------------------------------- |
| DPO                | Owns the request, coordinates response, signs the report |
| Compliance officer | Executes the queries below; validates scope              |
| On-call engineer   | Only consulted if the data export fails technically      |

---

## The canonical flow (4 steps, ~20 min)

### Step 1 — Verify the requester identity

- DSAR must be signed by the data subject or their legal rep.
- Confirm national ID / email / employee ID matches our records.
- Do NOT proceed until identity is verified — a leaked DSAR response
  is itself a PDPL breach.

### Step 2 — Map the subject to local records

The audit trail keys are `actorEmail` (operator who made the call)
and `targetHash` (SHA-256 of the subject's ID). To query by subject
we need to compute their targetHash client-side using the shipped
helper — **run it locally**, not on a shared host:

```bash
cd backend
node scripts/dsar-hash.js 1234567890
# → 1d3f0bd14e1d2db0d3fefb87d9c9f091
```

The hash is deterministic — same ID + same salt (`JWT_SECRET`) →
same hash. The audit DB stores only the hash so the log itself
isn't a PII store. If `JWT_SECRET` has been rotated, pass the
historical value explicitly: `JWT_SECRET=old-value node scripts/dsar-hash.js ...`.

### Step 3 — Run the queries

Open `/admin/adapter-audit` as `dpo` or `compliance_officer`.

**Query A — all rows where we accessed the subject's record:**

```
Filter: (use URL bar)
/admin/adapter-audit?targetHash=<hash-from-step-2>&limit=200
```

Click **تصدير CSV** in the header. The download includes
`createdAt / provider / operation / mode / status / success /
latencyMs / actorEmail / actorRole / targetKind / targetHash /
entityKind / entityId / ipHash / errorMessage`.

**Query B — broaden by entity ref** (if the subject is also a local
record, e.g. an Employee):

```
/admin/adapter-audit?entityKind=Employee&entityId=<mongo-id>&limit=200
```

**Query C — expand any cascade** (if a row looks interesting):

Click the Hub icon → all other adapter calls fired in the same HTTP
request. Or programmatically:

```bash
curl -H "Authorization: Bearer $DPO_JWT" \
  $BASE/api/admin/adapter-audit/by-correlation/<correlationId>
```

### Step 4 — Produce the report

The DSAR response should include:

- Requester's identity verification
- Scope disclosed (the ID types we queried)
- Per-provider summary (count + first/last timestamp)
- Attached CSV export (redact `ipHash` if the subject is not the IP owner)
- Retention policy note: **730 days** by default (tune via
  `PDPL_AUDIT_TTL_DAYS`); records older than that have auto-purged
  and cannot be recovered.

## Edge cases

### Subject was never verified

- No rows returned. Respond with a negative disclosure letter; still
  log the DSAR intake.

### Subject has rows but the targetHash mismatches

- Check `JWT_SECRET` hasn't been rotated since the records were
  written. If it has, the subject's hash calculated today differs
  from historical rows. Compute using the OLD secret (stored in
  secret-management rotation history) and rerun.

### Cross-request correlation gives >10 providers

- A cascade spanning 10+ providers is unusual and probably
  legitimate (e.g. a one-shot onboarding import). Validate by
  checking the `actorEmail` — if it's our system user (e.g. cron),
  document in the response that the access was automated.

### Subject asks for erasure, not just access

- Different workflow. The 730-day TTL doesn't satisfy Art. 18 PDPL
  erasure — you must issue a targeted delete on `AdapterAudit` rows
  matching the hash, AND remove the local entity refs. Escalate to
  legal before running a delete.

## Related

- Source of hashing: `backend/services/adapterAuditLogger.js::hashString`
- Retention TTL: `backend/models/AdapterAudit.js` (env: `PDPL_AUDIT_TTL_DAYS`)
- Bulk filter + export: `/admin/adapter-audit` + `GET /export.csv`
- By cascade: `/admin/adapter-audit/by-correlation/:id`

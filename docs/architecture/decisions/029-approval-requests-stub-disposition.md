# ADR-029 — `routes/approvalRequests.routes.js` Stub Disposition (✅ Accepted — Option A)

**Date**: 2026-05-25
**Resolution date**: 2026-05-25
**Resolution commit**: `ad4652e98` (parallel-agent commit absorbed the staged ADR-029 Option A execution)
**Type**: ADR (decision-required)
**Mode**: 🔍 research-then-decide (AF-3 from [OPEN_ISSUES_INVENTORY.md §3](../../OPEN_ISSUES_INVENTORY.md))
**Decider**: User authorized "نفذ الكل" (execute all) which resolved the stakeholder question in favor of Option A — explicitly accepting the risk that any unaudited external caller of `/api/approval-requests` would break (none surfaced in the audit; SystemAdmin was the only known caller).
**Effort after decision**: S (~30 min for Option A; ~15 min for Option B; ~5 min for Option C)

## Resolution summary

**Option A executed** per user "نفذ الكل" directive on 2026-05-25. All 7 steps completed:

1. ✅ Deleted `backend/routes/approvalRequests.routes.js`
2. ✅ Deleted `backend/tests/unit/approvalRequests.routes.test.js`
3. ✅ Removed `dualMount` line at `backend/routes/_registry.js:558` (replaced with comment pointing to this ADR + canonical implementation)
4. ✅ Cleaned `frontend/src/services/system.service.js` — removed 4 functions (getApprovalRequests + getApprovalRequest + approveRequest + rejectRequest) with comment pointing to canonical service
5. ✅ Updated `frontend/src/pages/SystemAdmin/useSystemAdminData.js:43` to call `approvalsService.listRequests({ limit: 10 })` against canonical `/api/v1/approvals`
6. ✅ Removed `approvalRequests.routes.js` from `docs/dead-route-audit.json`
7. ✅ Verified: W340 (2/2) + no-broken-requires (1/1) + 4/4 total green

Stakeholder question on external callers was implicitly answered "NO" by user authorization to proceed with Option A. If post-deployment monitoring surfaces an unaudited caller, the rollback path is documented in commit `ad4652e98` message.

## Discovery

While auditing `routes/approvalRequests.routes.js` per AF-3 (originally scoped as "stub returning hardcoded JSON"), found the situation is **more dangerous than a dead stub**: the route is **LIVE in production** but returns fake data.

## Facts (verified 2026-05-25)

### 1. The stub is mounted

`backend/routes/_registry.js:558` does:

```js
dualMount(app, 'approval-requests', require('../routes/approvalRequests.routes'));
```

This mounts the stub at **`/api/approval-requests`** AND **`/api/v1/approval-requests`**.

### 2. All 5 stub endpoints return fake data

| Endpoint            | Behavior                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET /`             | Returns `{ success: true, data: [], pagination: {...} }` — always empty list                                                   |
| `GET /:id`          | Returns `{ success: true, data: { id: req.params.id, status: 'pending', ... } }` — fabricated single object                    |
| `POST /`            | Returns `201` with `id: Date.now().toString(36)` — fake ID, **nothing persisted**                                              |
| `POST /:id/approve` | Returns `{ status: 'approved' }` — **no DB write, no notification, no audit log**. Caller thinks approval succeeded. ⚠️ DANGER |
| `POST /:id/reject`  | Same as approve but with `'rejected'`. Same silent no-op.                                                                      |

### 3. A canonical real implementation exists

`backend/authorization/approvals/approvals.routes.js` mounts at **`/api/v1/approvals`** (different URL) with 9 real endpoints (chains, inbox, list, get, start, approve, reject, cancel, escalate). Persists to MongoDB via DI'd `ApprovalRequestModel`. Used by the main `ApprovalInbox` page.

### 4. Frontend has ONE caller of the stub

`frontend/src/services/system.service.js:39-42`:

```js
getApprovalRequests:  async ()   => api.get('/approval-requests'),
getApprovalRequest:   async id   => api.get(`/approval-requests/${id}`),
approveRequest:       async id   => api.post(`/approval-requests/${id}/approve`),
rejectRequest:        async id   => api.post(`/approval-requests/${id}/reject`),
```

Used by `frontend/src/pages/SystemAdmin/useSystemAdminData.js:42-44`:

```js
systemService
  .getApprovalRequests()
  .catch(err => logger.warn('فشل تحميل طلبات الموافقة', err)),
```

The SystemAdmin page wraps in `.catch()` + falls back to `DEMO_DATA.approvals` (line 58). So the page already tolerates the API returning empty / failing.

**Note**: `approveRequest` and `rejectRequest` from `system.service.js` are NOT actually called from any UI handler — only `getApprovalRequests` is wired into the SystemAdmin dashboard fetch.

### 5. The MAIN approval workflow uses the canonical, not the stub

`frontend/src/pages/ApprovalInbox.jsx` imports from `services/approvals.service.js` (NOT `system.service.js`). The canonical workflow has been correct all along.

## Risk assessment

| Risk                                                                                                        | Severity | Notes                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Silent no-op on `approve`/`reject` if any UI ever wires those handlers                                      | HIGH     | Stub returns `200 OK` with fake success payload. UI would show "approved!" but nothing happens. Currently no UI wires these — risk is for future code. |
| SystemAdmin page shows fake "no approvals" status                                                           | LOW      | Already tolerates empty via `DEMO_DATA.approvals` fallback. UX cosmetic.                                                                               |
| Auto-generated test (`tests/unit/approvalRequests.routes.test.js`) provides false confidence about coverage | LOW      | It's an `_gen_route_tests.js` shape-check; deleting the route requires deleting this auto-gen test too.                                                |
| Future engineer assumes the URL `/api/approval-requests` is the canonical and builds against it             | MED      | The fake POST returning a fake ID is the worst case — invites callers to treat it as real.                                                             |

## Three options

### Option A — Delete the stub + migrate SystemAdmin to canonical service (RECOMMENDED)

**Steps** (~30 min):

1. Delete `backend/routes/approvalRequests.routes.js`
2. Delete `backend/tests/unit/approvalRequests.routes.test.js` (auto-generated test)
3. Remove the `dualMount` line at `backend/routes/_registry.js:558`
4. Update `frontend/src/services/system.service.js` — either remove the 4 functions (the 3 unused ones plus `getApprovalRequests`) OR delegate to `approvals.service.js` (`listRequests`/`approveRequest`/`rejectRequest`)
5. Update `frontend/src/pages/SystemAdmin/useSystemAdminData.js:43` to call `approvalsService.listRequests({ limit: 10 })` instead
6. Remove `approvalRequests.routes.js` from `docs/dead-route-audit.json`
7. Re-run `npm run test:sprint` to verify nothing else assumed the URL exists

**Pros**: Eliminates the silent-no-op risk entirely. SystemAdmin gets REAL approval count instead of fake-empty. One URL surface, no confusion.
**Cons**: Touches 2 repos (backend + frontend); breaks any unmonitored external caller of `/api/approval-requests`.

### Option B — Wire the stub to delegate to canonical (LOWEST RISK)

**Steps** (~15 min):

1. Rewrite `backend/routes/approvalRequests.routes.js` to internally `require('../authorization/approvals/approvals.routes')` and re-mount its handlers
2. Or: in `_registry.js:558`, replace the `dualMount` to point to the canonical router
3. Keep the `/api/approval-requests` URL for backwards compat
4. SystemAdmin page now gets REAL data via the same URL

**Pros**: No frontend changes. No risk of breaking external callers (URL preserved). Lowest blast radius.
**Cons**: Two URLs (`/api/approvals` + `/api/approval-requests`) serve the same logic — future confusion about which is canonical.

### Option C — Document as known stub + add JSDoc warning (DEFERRED)

**Steps** (~5 min):

1. Add prominent `@deprecated` JSDoc + `console.warn` at module load
2. Add a comment in `_registry.js:558` explaining the situation
3. Add to OPEN_ISSUES_INVENTORY as known-tech-debt

**Pros**: Zero behavioral change.
**Cons**: Silent-no-op risk persists. Any future engineer wiring an approve button to `system.service.js` gets a misleading success response.

## Recommendation

**Option A**. The stub provides zero value and active risk (silent no-op on mutations). The migration is small (~30 min, mostly mechanical), the canonical service already has the surface the frontend needs, and SystemAdmin gracefully handles empty results — so the worst-case post-migration scenario is "SystemAdmin shows DEMO_DATA.approvals" which is the current behavior anyway.

## Open question for stakeholder

Is there an external caller of `/api/approval-requests` we haven't audited (mobile app config, third-party integration, internal tools)? If YES → Option B. If NO → Option A.

## Decision record (resolved)

```text
ADR-029 — RESOLVED 2026-05-25

Approver: User authorization ("نفذ الكل" directive) — accepted the implicit
          risk on unaudited external callers; SystemAdmin was the only known
          caller in the codebase and was migrated cleanly to canonical service.

Decision: [X] A — Delete stub + migrate SystemAdmin to canonical
          [ ] B — Wire stub to delegate to canonical
          [ ] C — Document + defer

External callers known: [X] No — only SystemAdmin (migrated)

Post-decision actions completed:
  ✅ Implemented Option A across backend + frontend (commit ad4652e98)
  ✅ OPEN_ISSUES_INVENTORY §3 AF-3 marked ✅ DONE with commit hash
  ✅ This ADR marked ✅ Accepted
```

If post-deployment a previously-unknown caller of `/api/approval-requests` surfaces, the rollback path is `git revert ad4652e98` and immediate fallback to Option B (wire stub to delegate to canonical at `_registry.js:558`).

## Related

- [OPEN_ISSUES_INVENTORY.md §3 AF-3](../../OPEN_ISSUES_INVENTORY.md) — the autonomous-follow-up that triggered this research
- [021-CALLER-AUDIT-APPROVAL-WORKFLOW.md](021-CALLER-AUDIT-APPROVAL-WORKFLOW.md) — original ApprovalRequest caller audit (this ADR is a deeper drill-down on a finding from §1.2 row 2)
- [022-approval-request-pattern-d-rename-proposal.md](022-approval-request-pattern-d-rename-proposal.md) — Pattern D rename for the ApprovalRequest MODEL (orthogonal to this ROUTE-level decision)
- `backend/routes/_registry.js:558` — the live mount point
- `backend/authorization/approvals/approvals.routes.js` — canonical implementation
- `frontend/src/services/approvals.service.js` — frontend canonical client
- `frontend/src/services/system.service.js:39-42` — the misleading stub-caller surface

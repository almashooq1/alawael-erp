# Production Secrets Cutover Run Sheet — W1406

**Date:** [DD] / [MM] / [YYYY]  
**Change Window:** From [HH:MM] to [HH:MM] (Asia/Riyadh)  
**Environment:** Production  
**Change Ticket / CAB Ref:** [fill]

---

## A) Team & Approvals

- **Ops Lead (A):** [fill] Signature: [fill] Time: [HH:MM]
- **DevOps Executor (R):** [fill] Signature: [fill] Time: [HH:MM]
- **Backend Verifier (R):** [fill] Signature: [fill] Time: [HH:MM]
- **Release Manager (C):** [fill] Signature: [fill] Time: [HH:MM]
- **Security On-call (I):** [fill] Acknowledged: ☐ Yes ☐ No

---

## B) Preconditions (T-60 → T-15)

> Mark each item with ✅ / ❌ and log proof reference.

| #   | Check                                                                                                           | Status | Evidence Ref | Time    |
| --- | --------------------------------------------------------------------------------------------------------------- | ------ | ------------ | ------- |
| B1  | Managed secret store reachable                                                                                  | ☐      | [fill]       | [HH:MM] |
| B2  | All strict keys present (`MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `SESSION_SECRET`) | ☐      | [fill]       | [HH:MM] |
| B3  | Key versions labeled (current + previous)                                                                       | ☐      | [fill]       | [HH:MM] |
| B4  | Runtime identity has read-only access                                                                           | ☐      | [fill]       | [HH:MM] |
| B5  | Break-glass path documented and audited                                                                         | ☐      | [fill]       | [HH:MM] |
| B6  | No plaintext secret in CI/deploy logs                                                                           | ☐      | [fill]       | [HH:MM] |

**Precondition Gate Decision:** ☐ GO to execution ☐ NO-GO (stop)

---

## C) Execution Steps (T-15 → T+10)

| #   | Action                                       | Status | Operator | Time    | Notes  |
| --- | -------------------------------------------- | ------ | -------- | ------- | ------ |
| C1  | Start config freeze                          | ☐      | [fill]   | [HH:MM] | [fill] |
| C2  | Bind deployment to managed secret source     | ☐      | [fill]   | [HH:MM] | [fill] |
| C3  | Run `npm run env:check` in prod-like context | ☐      | [fill]   | [HH:MM] | [fill] |
| C4  | Deploy/restart services                      | ☐      | [fill]   | [HH:MM] | [fill] |
| C5  | Validate startup health checks               | ☐      | [fill]   | [HH:MM] | [fill] |
| C6  | Validate auth issue/refresh sanity           | ☐      | [fill]   | [HH:MM] | [fill] |
| C7  | Validate one protected read endpoint         | ☐      | [fill]   | [HH:MM] | [fill] |

---

## D) Evidence Pack (attach links/artifacts)

- [ ] D1 Secret store snapshot (names only, masked values): [fill]
- [ ] D2 `env:check` success output: [fill]
- [ ] D3 Service health outputs (API/frontend/db/redis): [fill]
- [ ] D4 Auth sanity validation evidence: [fill]
- [ ] D5 Release manager approval note: [fill]

---

## E) Rollback Trigger Matrix

If any item below fails, execute rollback immediately:

- ☐ `env:check` failed
- ☐ App startup failed due to strict env validation
- ☐ Auth token signing/encryption mismatch observed
- ☐ Critical health endpoint failed post-deploy

### Rollback Steps

| #   | Rollback action                            | Status | Operator | Time    | Notes  |
| --- | ------------------------------------------ | ------ | -------- | ------- | ------ |
| R1  | Rebind previous known-good secret versions | ☐      | [fill]   | [HH:MM] | [fill] |
| R2  | Redeploy services                          | ☐      | [fill]   | [HH:MM] | [fill] |
| R3  | Re-run `npm run env:check`                 | ☐      | [fill]   | [HH:MM] | [fill] |
| R4  | Re-validate health + auth sanity           | ☐      | [fill]   | [HH:MM] | [fill] |
| R5  | Log incident + root-cause follow-up        | ☐      | [fill]   | [HH:MM] | [fill] |

---

## F) Final Decision (Go / No-Go)

### GO Criteria (all must be true)

- [ ] All 5 strict keys resolved from managed source
- [ ] `env:check` passed
- [ ] Startup healthy
- [ ] Auth sanity checks passed
- [ ] Evidence pack attached

**Decision:** ☐ GO ☐ NO-GO  
**Decision Time:** [HH:MM]  
**Approved by:** [fill] Signature: [fill]

---

## G) Post-Window Notes

- Incident IDs (if any): [fill]
- Follow-up actions: [fill]
- Next review date: [DD] / [MM] / [YYYY]

---

## References

- `docs/runbooks/production-secrets-cutover-checklist-w1406.md`
- `docs/runbooks/go-live-final-report-w1405.md`
- `docs/runbooks/env-preflight-check.md`

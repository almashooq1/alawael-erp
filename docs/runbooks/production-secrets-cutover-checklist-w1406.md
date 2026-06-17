# Production Secrets Cutover Checklist — W1406

**Date:** 2026-06-17  
**Status:** Ready for execution  
**Scope:** Final production cutover prerequisite — persist strict secrets in secure environment source (not session-only variables).

## 1) Objective

Close the final pre-production action from `go-live-final-report-w1405.md` by ensuring all strict-required keys are:

1. Stored in a managed secret source (Vault/Key Vault/GitHub Encrypted Secrets/etc.)
2. Injected deterministically at deploy/runtime
3. Verified through `env:check` and startup health
4. Recoverable via rollback procedure

## 2) In-Scope Secrets (strict-required)

From `config/validateEnv.js` + runbook `env-preflight-check.md`:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `SESSION_SECRET`

## 3) RACI (minimum)

- **Owner (A):** Platform/Ops Lead
- **Executor (R):** DevOps engineer on cutover shift
- **Verifier (R):** Backend lead (runtime validation)
- **Approver (C):** Release manager
- **Informed (I):** Security + On-call

## 4) Pre-Cutover Gate (T-60 to T-15)

- [ ] Confirm `.env` local/session values are NOT the source of truth for production
- [ ] Confirm target secret store contains all 5 strict keys
- [ ] Confirm each key has current version label and last-rotated timestamp
- [ ] Confirm access policy is least-privilege (runtime identity read-only)
- [ ] Confirm break-glass access path exists and is audited
- [ ] Confirm no secret values appear in CI logs or deployment manifests

## 5) Cutover Execution (T-15 to T+10)

- [ ] Freeze configuration changes (change window starts)
- [ ] Inject secrets from secure source into production deployment path
- [ ] Run preflight gate: `npm run env:check` in production-like runtime context
- [ ] Deploy/restart services with new secret source bindings
- [ ] Validate startup health and endpoint health checks
- [ ] Validate authentication flow sanity (token issue + refresh)
- [ ] Validate one read endpoint behind auth middleware

## 6) Evidence to Capture (audit trail)

Store in release ticket/change record:

- [ ] Screenshot/log of secret store key presence (names only, masked values)
- [ ] `env:check` success output
- [ ] Service health evidence after rollout
- [ ] Timestamp + actor for secret-source update
- [ ] Approval note from release manager

## 7) Rollback Plan (if any gate fails)

Trigger rollback if one or more happen:

- `env:check` fails in deployment environment
- startup fails due to strict env validation
- auth endpoints fail due to signing/encryption mismatch

Rollback actions:

1. Rebind to previous known-good secret versions
2. Redeploy services
3. Re-run `env:check`
4. Re-validate health and auth sanity
5. Record incident + diff for postmortem

## 8) Exit Criteria (Go/No-Go)

**GO only if all are true:**

- [ ] All 5 strict keys resolved from managed secret source
- [ ] `env:check` passes
- [ ] Startup healthy
- [ ] Auth sanity checks pass
- [ ] Evidence attached to change record

If any item above is false → **NO-GO** until fixed.

## 9) Related Docs

- `docs/runbooks/go-live-final-report-w1405.md`
- `docs/runbooks/env-preflight-check.md`
- `docs/runbooks/environment-setup.md`
- `SECURITY.md`

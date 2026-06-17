# Production Secrets Cutover — One-Page Run Sheet (W1406)

**Date:** [DD]/[MM]/[YYYY]  
**Window:** [HH:MM] → [HH:MM] (Asia/Riyadh)  
**Ticket/CAB:** [fill]  
**Owner:** [fill]

---

## 1) GO/NO-GO precheck (must all be ✅)

- [ ] Managed secret source reachable
- [ ] 5 strict keys present: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `SESSION_SECRET`
- [ ] Runtime identity can read secrets (least privilege)
- [ ] Previous key versions available for rollback
- [ ] No plaintext secrets in CI/deploy logs

**Precheck Decision:** ☐ GO ☐ NO-GO  
**By:** [fill] **Time:** [HH:MM]

---

## 2) Execution (mark time)

- [ ] Freeze config changes — [HH:MM]
- [ ] Bind deployment to managed secret source — [HH:MM]
- [ ] Run `npm run env:check` (prod-like context) — [HH:MM]
- [ ] Deploy/restart services — [HH:MM]
- [ ] Health checks green (API/frontend/db/redis) — [HH:MM]
- [ ] Auth sanity OK (issue/refresh) — [HH:MM]
- [ ] Protected read endpoint OK — [HH:MM]

---

## 3) Rollback triggers (any = rollback)

- [ ] `env:check` fails
- [ ] Startup strict-env validation fails
- [ ] Auth signing/encryption mismatch
- [ ] Critical health check fails post-deploy

### Rollback actions

- [ ] Rebind previous known-good secret versions
- [ ] Redeploy services
- [ ] Re-run `npm run env:check`
- [ ] Re-validate health + auth sanity

**Rollback executed:** ☐ Yes ☐ No  
**By:** [fill] **Time:** [HH:MM]

---

## 4) Final decision

- [ ] All 5 strict keys resolved from managed source
- [ ] `env:check` passed
- [ ] Startup healthy
- [ ] Auth sanity passed
- [ ] Evidence attached

**Final Decision:** ☐ GO ☐ NO-GO  
**Approver:** [fill] **Signature:** [fill] **Time:** [HH:MM]

---

## 5) Evidence references (IDs/links)

- Secret source snapshot (masked): [fill]
- `env:check` output: [fill]
- Health outputs: [fill]
- Auth sanity output: [fill]
- Incident/notes: [fill]

---

**Detailed versions:**

- `docs/runbooks/production-secrets-cutover-checklist-w1406.md`
- `docs/runbooks/production-secrets-cutover-runsheet-w1406.md`

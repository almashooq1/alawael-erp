# Runbook — Gov adapter is misconfigured

**Alert:** `GovAdapterMisconfigured` (warning)
**Metric:** `gov_adapter_configured{provider="X"} == 0`
**Triggered by:** provider X has missing required env vars in its
current mode (usually `live`), sustained for 10 minutes.

## What this means in plain Arabic

مزوّد X غير مُهيَّأ — المتغيرات البيئية المطلوبة إما ناقصة أو فارغة.
كل استدعاءات `verify` سترجع `status: unknown`، وعمليات التحقق التي
يعتمد عليها تدفق الأعمال (مثل التحقق من GOSI عند تعيين موظف) ستفشل
بصمت من وجهة نظر المستخدم. المزوّد قد يكون live أو mock — تحقق من
المتغير `*_MODE`.

## Who should respond

Deploy engineer (likely cause: secret rotation or config drift).
Integration owner second.

## Immediate actions (3 minutes)

1. Open `/admin/gov-integrations` — the provider card shows
   `missing: [VAR1, VAR2]`. Note the exact names.
2. Check the deployment config for those env vars. Common places:
   - k8s Secret `alawael-gov-integrations`
   - `.env.production` on the app host
   - CI/CD secrets (GitHub Actions / GitLab variables)
3. Confirm with `git log -- backend/services/XAdapter.js` that the
   variable names match what the adapter expects.

## Diagnosis path

### Case A: secret was rotated upstream, not updated here

- Check with the integration owner: was the `*_CLIENT_SECRET` or
  `*_API_KEY` rotated recently on the provider's side?
- Fix: obtain the new value from the provider portal, update the
  secret, redeploy. Verify with `POST /admin/gov-integrations/X/test-connection`.

### Case B: config drift after a deploy/rollback

- Newer config had the var, rolled-back config didn't.
- Check git blame on the relevant k8s/terraform config for recent
  changes.
- Fix: forward-migrate the rollback target to include the current
  config, OR roll forward to a fixed version.

### Case C: someone ran `unset` on the app host

- `env | grep XADAPTER_` on production host — is the var there?
- If missing, re-export from the secret source and restart the
  process. Blame log / audit trail in access-log tells you who did it.

### Case D: fresh cluster / new environment

- You spun up staging / a new region and forgot to copy the secrets.
- Don't flip `*_MODE=live` until the secrets exist. Keep mock mode
  as the safe default.

## Preventing recurrence

- **Pre-deploy check**: CI runs `POST /admin/gov-integrations/X/test-connection`
  against the staging deploy and fails the promote if any provider
  returns `configured: false`.
- **Secret rotation calendar**: track provider secret expiration in
  your password manager. Most Saudi gov providers rotate every 90
  days.
- **Alert escalation**: if `GovAdapterMisconfigured` fires for >2h,
  Alertmanager should PAGE the integration owner (add a secondary
  route).

## Related

- Source: each adapter's `getConfig()` method enumerates its required
  env vars
- Pre-deploy config check endpoint: `POST
/api/admin/gov-integrations/:provider/test-connection`
- UI: `/admin/gov-integrations` (red border on misconfigured cards)
- Go-live checklist (full env var list per provider):
  `docs/sprints/GOV_INTEGRATIONS_GO_LIVE.md`

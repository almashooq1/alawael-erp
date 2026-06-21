# Deployment Notes — W1437 (feat/w1406-preflight-followup)

> Generated: 2026-06-21  
> Branch: `feat/w1406-preflight-followup`  
> PR: [#579](https://github.com/almashooq1/alawael-erp/pull/579)

## Scope

This release contains:

- **W1427–W1435**: DDD subscriber fixes, session-ref drift fixes, MongoMemoryServer fixes, DB compound indexes, npm audit fixes.
- **W1436**: Structured diagnostics for LLM anomaly save failures.
- **W1437**: Production DB timeout root-cause fixes (`AdvancedTicket` `$nin` → `$in`, `NphiesClaim.updatedAt` schema fix).
- **Bulk sync**: All previously pending working-tree changes committed, including new backend modules (beneficiary lifecycle, journey score, access console, clinical legacy adapter), frontend components, docs, and security/config files.

## Prerequisites before deploy

1. **Resolve merge conflicts with `main`**.  
   PR #579 is currently in `DIRTY` merge state because `main` has advanced with PRs #580, #581, #582.

   - Option A: `git rebase origin/main` on the feature branch, resolve conflicts, force-push.
   - Option B: `git merge origin/main` into the feature branch, resolve conflicts, push.

2. **Run the NphiesClaim backfill migration** in production **before** deploying the new application code:

   ```bash
   NODE_ENV=production node backend/scripts/migrate-nphies-claim-updatedAt.js
   ```

   This sets `nphies.submission.updatedAt` for existing documents where it is missing. Without this, the reconciliation sweeper will skip old `PENDING_REVIEW` claims.

3. **Verify production MongoDB compound indexes** for `AdvancedTicket` and `NphiesClaim` are built. Mongoose `autoIndex` builds them on startup if enabled; otherwise build them manually:

   ```js
   db.advancedtickets.createIndex({ status: 1, 'sla.firstResponseAt': 1, 'sla.isBreached': 1, createdAt: -1 });
   db.nphiesclaims.createIndex({ 'nphies.submission.status': 1, 'nphies.submission.updatedAt': 1, 'nphies.submission.submittedAt': 1 });
   ```

## Deployment steps

1. Ensure CI / `test:sprint` is green.
2. Merge PR #579 to `main` after conflicts are resolved.
3. Deploy backend services.
4. Deploy frontend build.
5. Deploy mobile build (if applicable).
6. Verify application starts without errors.

## Post-deployment verification

1. **P0-1 / P0-2 DB timeouts**: Watch `error1.log` for 30 minutes. The following messages should stop:

   - `Operation advancedtickets.find() buffering timed out after 10000ms`
   - `Operation nphiesclaims.find() buffering timed out after 10000ms`

2. **P2-4 LLM anomaly save failure**: Watch `error1.log` for:

   - `[llm-anomaly-history] save failed:` — should stop if root cause was DB timeouts.
   - If it persists, the new structured log line includes `name=`, `code=`, `source=`, `total=`, `recordedAt=` for diagnosis.

3. **NPHIES reconciliation sweeper**: Confirm it is polling old `PENDING_REVIEW` claims and transitioning them.

4. **SLA scheduler**: Confirm `checkResolutionBreaches`, `assignMissingSlaDeadlines`, and `getSlaStats` complete without timeout errors.

## Rollback

- Revert the merge commit on `main`.
- Re-deploy the previous release.
- Note: reverting the W1437 code without rolling back the migration is safe; old code will ignore the new `updatedAt` field.

## Known risks / follow-up work

- **Merge conflicts**: Must be resolved before merge.
- **Dependency updates**: `npm outdated` reports many available updates (including major versions like Express 5, React 19, Expo 56). These are intentionally deferred to a dedicated dependency wave to keep this release focused. `npm audit` remains clean.
- **web-admin repo**: Not present locally; not validated in this release.
- **IEP/session model fragmentation**: ADR-044 and ADR-045 still pending stakeholder decision.

## Sign-off checklist

- [ ] Merge conflicts with `main` resolved.
- [ ] `test:sprint` green.
- [ ] `backend/scripts/migrate-nphies-claim-updatedAt.js` executed in production.
- [ ] Production DB indexes verified.
- [ ] Deploy completed.
- [ ] `error1.log` monitored for 30 min post-deploy.

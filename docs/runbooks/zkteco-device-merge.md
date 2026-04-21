# Runbook — ZKTeco device-model merge (Phase 6, last genuine split)

**Alert:** none — this is a one-shot operational consolidation, not a recurring cron.
**Trigger:** the operations manager decides to close out the last grandfathered pair in `no-duplicate-service-pairs` drift.
**Frequency:** once per environment (staging, then production).

## What this is

The ZKTeco biometric-device domain has two Mongoose models that write to two different MongoDB collections:

| Model file                             | Mongoose name  | Collection      | Consumer                                 |
| -------------------------------------- | -------------- | --------------- | ---------------------------------------- |
| `backend/models/ZktecoDevice.js`       | `ZktecoDevice` | `zktecodevices` | routes/biometric-attendance + 2 services |
| `backend/models/zktecoDevice.model.js` | `ZKTecoDevice` | `zktecodevice`  | services/hr/zktecoService (1024L)        |

Same physical hardware, divergent schemas — the legacy one carries `name`, `ipAddress`, `lastSyncAt`, `enrolledCount`; the canonical one carries `deviceName`, `port`, `deviceInfo{userCount, sdkVersion, ...}`, `capabilities{}`, `deviceUsers[]`, `syncLogs[]`, etc.

A merge script (`backend/scripts/migrations/zkteco-device-merge.js`) consolidates the legacy collection INTO the canonical one, keyed by `serialNumber`. It's **dry-run by default** and won't write unless `--execute --confirm=I-UNDERSTAND-THIS-WRITES-TO-MONGODB` are both present.

## Pre-flight (5 minutes)

1. **Read the dry-run output.** From any backend host:

   ```bash
   cd backend && npm run migrate:zkteco        # colored human output
   cd backend && npm run migrate:zkteco:json   # pipeline-friendly JSON
   ```

   Sample output (dry-run):

   ```
   ZKTeco device merge — DRY RUN
     Legacy rows: 12  Canonical rows: 9
     Plan:
       insert    3
       update    0
       noop      9
       conflict  0
     Dry run only. Re-run with --execute to write.
   ```

2. **Interpret the plan:**

   - **insert** — legacy rows that have no canonical match by `serialNumber`. Safe to land.
   - **noop** — legacy rows where the canonical side already has an equivalent record. Safe.
   - **update** — legacy rows that exist canonically but with missing canonical fields the legacy fills in. Safe to land.
   - **conflict** — legacy and canonical disagree on at least one field (e.g. legacy `ipAddress: 10.1.1.5`, canonical `ipAddress: 10.1.1.9`). **The script REFUSES to execute while any conflict exists.** Manual review required.

3. **If there are conflicts, do NOT execute.** Instead:

   ```bash
   npm run migrate:zkteco:json | jq '.conflictSamples[0:5]'
   ```

   For each conflict, decide which side is authoritative (usually canonical, since it's the newer collection) and manually reconcile in Mongo. Re-run dry-run until `conflict: 0`.

4. **Back up first.** Take a MongoDB dump of both collections before executing:

   ```bash
   mongodump --uri "$MONGODB_URI" --collection zktecodevices  --out ./backup-$(date +%Y%m%d)
   mongodump --uri "$MONGODB_URI" --collection zktecodevice   --out ./backup-$(date +%Y%m%d)
   ```

## Execute (90 seconds)

Run the execute step. The `--confirm` phrase is exactly as below (no env expansion, hardcoded in the script):

```bash
cd backend && node scripts/migrations/zkteco-device-merge.js \
  --execute \
  --confirm=I-UNDERSTAND-THIS-WRITES-TO-MONGODB
```

Expected exit codes:

- `0` — executed cleanly, every row landed as planned.
- `1` — execute refused because ≥1 conflict is still present (return to pre-flight).
- `2` — internal error (bad MongoDB connection, etc. — stderr has the detail).

On success you'll see:

```
✓ Executed: inserted 3, no-op 9
```

## Post-execute (5 minutes)

1. **Verify the canonical collection grew by the expected count:**

   ```bash
   mongosh "$MONGODB_URI" --eval 'db.zktecodevice.countDocuments()'
   # Should equal prior count + plan.insertCount
   ```

2. **Point the legacy consumers at the canonical model.** Three files still `require('../models/ZktecoDevice')`:

   - `backend/routes/biometric-attendance.routes.js`
   - `backend/services/zktecoSdk.service.js`
   - `backend/services/kpi-attendance.scheduler.js`

   Swap each to `require('../models/zktecoDevice.model')` and adjust field access (`name` → `deviceName`, `lastSyncAt` → `lastSync`, `enrolledCount` → `deviceInfo.userCount`, `supportFingerprint` → `capabilities.fingerprint`, `supportFace` → `capabilities.face`, `supportCard` → `capabilities.rfidCard`, `communicationType` → `protocol`).

3. **Drop the legacy collection** (only after all three consumers are swapped and tested):

   ```bash
   mongosh "$MONGODB_URI" --eval 'db.zktecodevices.drop()'
   ```

4. **Delete the legacy model file** and remove `'zktecodevice'` from `GRANDFATHERED_MODEL_PAIRS` in `backend/__tests__/no-duplicate-service-pairs.test.js`. Drift test now enforces the canonical-only invariant.

## Rollback

If the execute step landed unexpected data:

```bash
mongorestore --uri "$MONGODB_URI" --drop \
  --nsInclude 'alawael-erp.zktecodevice' \
  ./backup-$(date +%Y%m%d)
```

This restores the canonical collection to its pre-execute state. The legacy collection is untouched by the merge, so no restore needed there.

## Exit criteria (all 4 must be met before calling this "done")

- [ ] Canonical collection contains every unique `serialNumber` from both pre-merge collections.
- [ ] All 3 legacy consumers rewired to canonical model.
- [ ] Legacy collection dropped.
- [ ] `backend/__tests__/no-duplicate-service-pairs.test.js` grandfather list no longer includes `'zktecodevice'` — the drift test now guards the invariant automatically.

## Who should run this

Backend ops lead. Not on-call. Plan a 30-minute window with one reviewer present; not urgent so not out-of-hours.

## Related

- `docs/technical-debt/consolidation-roadmap.md` — the 12-pair audit that led here.
- `backend/__tests__/zkteco-device-merge-script.test.js` — 12 unit tests covering `mapLegacyToCanonical` and `classifyRow` (insert/update/conflict/noop classification).
- `backend/__tests__/no-duplicate-service-pairs.test.js` — the drift test that enforces "no more NEW splits".

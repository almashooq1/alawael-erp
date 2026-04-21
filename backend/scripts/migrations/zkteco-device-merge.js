#!/usr/bin/env node
/**
 * zkteco-device-merge.js — ZKTeco legacy → canonical device-model merge.
 *
 * Phase 6 of docs/technical-debt/consolidation-roadmap.md:
 *   • legacy model: backend/models/ZktecoDevice.js       (Mongoose name "ZktecoDevice")
 *   • canonical:    backend/models/zktecoDevice.model.js (Mongoose name "ZKTecoDevice")
 * These register on two different MongoDB collections — same physical
 * devices written twice with divergent schemas. This script reconciles
 * them onto the canonical collection and reports conflicts.
 *
 * Default mode: DRY RUN (read-only). No writes happen without
 * `--execute` + the confirm phrase `I-UNDERSTAND-THIS-WRITES-TO-MONGODB`.
 *
 * Exit codes:
 *   0 — dry run clean OR execution succeeded
 *   1 — conflicts detected (manual review required before execute)
 *   2 — internal error
 *
 * Usage:
 *   node scripts/migrations/zkteco-device-merge.js                  # dry run
 *   node scripts/migrations/zkteco-device-merge.js --json           # dry run + JSON output
 *   node scripts/migrations/zkteco-device-merge.js --execute \\
 *     --confirm=I-UNDERSTAND-THIS-WRITES-TO-MONGODB                 # write canonical rows
 *
 * Field mapping (legacy → canonical):
 *   name              → deviceName
 *   lastSyncAt        → lastSync
 *   enrolledCount     → (nested) deviceInfo.userCount
 *   isActive=false    → status='inactive'
 *   supportFingerprint → capabilities.fingerprint
 *   supportFace        → capabilities.face
 *   supportCard        → capabilities.rfidCard
 *   communicationType  → protocol
 * Fields present in BOTH under same name (pass-through): ipAddress,
 *   port, serialNumber, location, status, branchId, model.
 * Canonical-only fields (no legacy source, left untouched): deviceUsers,
 *   syncLogs, consecutiveFailures, connectionTimeout.
 */

'use strict';

const args = new Set(process.argv.slice(2));
const confirmFlag = [...args].find(a => a.startsWith('--confirm='));
const CONFIRM_REQUIRED = 'I-UNDERSTAND-THIS-WRITES-TO-MONGODB';

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'zkteco-device-merge — legacy → canonical device-row reconciliation',
      '',
      'Default: DRY RUN (read-only, reports plan).',
      '',
      'Exit codes:',
      '  0  dry-run clean OR execution succeeded',
      '  1  conflicts present (manual review required)',
      '  2  internal error',
      '',
      'Usage:',
      '  node scripts/migrations/zkteco-device-merge.js',
      '  node scripts/migrations/zkteco-device-merge.js --json',
      '  node scripts/migrations/zkteco-device-merge.js --execute \\',
      `      --confirm=${CONFIRM_REQUIRED}`,
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = args.has('--json');
const QUIET = args.has('--quiet');
const EXECUTE = args.has('--execute');
const useColor = !JSON_MODE && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  cyan: useColor ? '\x1b[36m' : '',
};

/**
 * Map a legacy document to the canonical shape. Pure function — safe
 * to unit-test. Only emits fields the canonical schema accepts.
 */
function mapLegacyToCanonical(legacy) {
  const out = {
    serialNumber: legacy.serialNumber,
    deviceName: legacy.name || legacy.deviceName,
    ipAddress: legacy.ipAddress,
    port: legacy.port ?? 4370,
    model: legacy.model,
    location: legacy.location,
    branchId: legacy.branchId,
    status: legacy.isActive === false ? 'inactive' : legacy.status || 'offline',
    lastSync: legacy.lastSyncAt,
    capabilities: {
      fingerprint: legacy.supportFingerprint ?? true,
      face: legacy.supportFace ?? false,
      rfidCard: legacy.supportCard ?? true,
    },
    protocol: legacy.communicationType || 'tcp',
    deviceInfo: {
      ...(legacy.sdkVersion ? { sdkVersion: legacy.sdkVersion } : {}),
      ...(legacy.firmwareVersion ? { firmwareVersion: legacy.firmwareVersion } : {}),
      ...(legacy.enrolledCount != null ? { userCount: legacy.enrolledCount } : {}),
    },
  };
  // Strip undefineds so the canonical $set is minimal.
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

/**
 * Compare a legacy-projected canonical doc against what's already in
 * the canonical collection. Returns one of 'insert' / 'update' /
 * 'conflict' / 'noop' + the specific diff per field.
 */
function classifyRow(mapped, existing) {
  if (!existing) return { action: 'insert', diffs: [] };
  const diffs = [];
  for (const [k, v] of Object.entries(mapped)) {
    if (k === 'capabilities' || k === 'deviceInfo') {
      for (const [sk, sv] of Object.entries(v || {})) {
        if (
          existing[k] &&
          existing[k][sk] !== undefined &&
          String(existing[k][sk]) !== String(sv)
        ) {
          diffs.push({ field: `${k}.${sk}`, legacy: sv, canonical: existing[k][sk] });
        }
      }
      continue;
    }
    if (existing[k] !== undefined && String(existing[k]) !== String(v)) {
      diffs.push({ field: k, legacy: v, canonical: existing[k] });
    }
  }
  if (diffs.length === 0) return { action: 'noop', diffs: [] };
  // If any canonical-side field conflicts with the legacy value, that's
  // a conflict we can't auto-resolve (canonical may have newer data).
  return { action: 'conflict', diffs };
}

async function main() {
  const mongoose = require('mongoose');

  // Registering BOTH models in the same process so we can read from
  // each of their collections. The names differ ("ZktecoDevice" vs
  // "ZKTecoDevice"), which is exactly the core of the bug.
  const LegacyModel = require('../../models/ZktecoDevice');
  const CanonicalModel = require('../../models/zktecoDevice.model');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const legacyRows = await LegacyModel.find({}).lean();
  const canonicalBySerial = new Map();
  for (const d of await CanonicalModel.find({}).select('serialNumber').lean()) {
    if (d.serialNumber) canonicalBySerial.set(d.serialNumber, d);
  }

  const plan = { insert: [], update: [], conflict: [], noop: [] };
  for (const legacy of legacyRows) {
    if (!legacy.serialNumber) {
      plan.conflict.push({
        reason: 'no_serial_number',
        legacyId: legacy._id,
        diffs: [],
      });
      continue;
    }
    const mapped = mapLegacyToCanonical(legacy);
    const existing = canonicalBySerial.get(legacy.serialNumber);
    const decision = classifyRow(mapped, existing);
    plan[decision.action].push({
      serialNumber: legacy.serialNumber,
      deviceName: mapped.deviceName,
      diffs: decision.diffs,
    });
  }

  let executed = null;
  if (EXECUTE) {
    if (!confirmFlag || confirmFlag.split('=')[1] !== CONFIRM_REQUIRED) {
      await mongoose.disconnect();
      const msg = `refusing to execute — pass --confirm=${CONFIRM_REQUIRED}`;
      if (JSON_MODE) {
        process.stdout.write(JSON.stringify({ error: msg }) + '\n');
      } else {
        console.error(`${c.red}${msg}${c.reset}`);
      }
      process.exit(2);
    }
    if (plan.conflict.length > 0) {
      await mongoose.disconnect();
      const msg = `refusing to execute — ${plan.conflict.length} conflict(s) require manual review`;
      if (JSON_MODE) {
        process.stdout.write(JSON.stringify({ error: msg, conflicts: plan.conflict }) + '\n');
      } else {
        console.error(`${c.red}${msg}${c.reset}`);
      }
      process.exit(1);
    }
    // Safe to execute: only inserts + no-op + (optional) non-conflicting updates.
    let inserted = 0;
    for (const row of plan.insert) {
      const source = legacyRows.find(l => l.serialNumber === row.serialNumber);
      if (!source) continue;
      const mapped = mapLegacyToCanonical(source);
      await CanonicalModel.create(mapped);
      inserted += 1;
    }
    executed = { inserted, noop: plan.noop.length };
  }

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          dryRun: !EXECUTE,
          legacyCount: legacyRows.length,
          canonicalCount: canonicalBySerial.size,
          plan: {
            insertCount: plan.insert.length,
            updateCount: plan.update.length,
            conflictCount: plan.conflict.length,
            noopCount: plan.noop.length,
          },
          insertSamples: plan.insert.slice(0, 10),
          conflictSamples: plan.conflict.slice(0, 20),
          executed,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(`\n${c.bold}ZKTeco device merge — ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}${c.reset}\n`);
    console.log(
      `  ${c.dim}Legacy rows: ${c.cyan}${legacyRows.length}${c.reset}  ${c.dim}Canonical rows: ${c.cyan}${canonicalBySerial.size}${c.reset}\n`
    );
    console.log(`  ${c.bold}Plan:${c.reset}`);
    console.log(`    ${c.green}insert${c.reset}    ${plan.insert.length}`);
    console.log(`    ${c.cyan}update${c.reset}    ${plan.update.length}`);
    console.log(`    ${c.yellow}noop${c.reset}      ${plan.noop.length}`);
    console.log(`    ${c.red}conflict${c.reset}  ${plan.conflict.length}\n`);
    if (plan.conflict.length > 0) {
      console.log(`  ${c.red}Conflicts (first 10):${c.reset}`);
      for (const con of plan.conflict.slice(0, 10)) {
        console.log(
          `    ${c.yellow}${con.serialNumber || '(no-serial)'}${c.reset}  ${c.dim}${con.diffs.length} field diff(s)${c.reset}`
        );
      }
      console.log();
    }
    if (executed) {
      console.log(
        `  ${c.green}✓ Executed: inserted ${executed.inserted}, no-op ${executed.noop}${c.reset}\n`
      );
    } else {
      console.log(`  ${c.dim}Dry run only. Re-run with --execute to write.${c.reset}\n`);
    }
  }

  return plan.conflict.length > 0 ? 1 : 0;
}

module.exports = { mapLegacyToCanonical, classifyRow };

// Only run main() when executed as a script, not when required for
// unit-testing the exported helpers.
if (require.main === module) {
  main()
    .then(code => process.exit(code))
    .catch(err => {
      if (!JSON_MODE) console.error(`${c.red}zkteco-device-merge failed:${c.reset} ${err.message}`);
      else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
      process.exit(2);
    });
}

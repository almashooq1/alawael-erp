#!/usr/bin/env node
/**
 * seed-cbahi-attestations.js — bootstrap CBAHI attestations for a branch (W380).
 *
 * The W360+W367 CBAHI module ships with a 45-standard registry but ZERO
 * pre-seeded attestations. Quality leads would have to POST 45 × N-branches
 * times to start a compliance program. This seeder generates draft
 * attestations for every standard in the registry for a given branch
 * (or all active branches) — making the module plug-and-play.
 *
 * Idempotent: skips standards that already have an attestation for the
 * target branch (the W360 model has a (branchId, standardKey) unique
 * compound index that would reject duplicates anyway).
 *
 * Usage:
 *   node scripts/seed-cbahi-attestations.js --branch <branchId>     seed one branch
 *   node scripts/seed-cbahi-attestations.js --all-branches          seed every active branch
 *   node scripts/seed-cbahi-attestations.js --dry-run               preview, no DB write
 *   node scripts/seed-cbahi-attestations.js --list                  list standards + exit
 *   node scripts/seed-cbahi-attestations.js --reset --branch <id>   delete existing drafts first
 *   node scripts/seed-cbahi-attestations.js --json                  machine-readable output
 *
 * Env:
 *   MONGODB_URI   mongo connection (required unless --dry-run / --list)
 *
 * After seeding, navigate to /cbahi/attestations in the web-admin and you
 * will see 45 drafts per branch, ready to be filled in via the /attest
 * endpoint as evidence accumulates.
 */

'use strict';

const args = process.argv.slice(2);
function arg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}
function flag(name) {
  return args.includes(name);
}

const HELP = flag('--help') || flag('-h');
const DRY_RUN = flag('--dry-run');
const LIST = flag('--list');
const RESET = flag('--reset');
const ALL_BRANCHES = flag('--all-branches');
const JSON_OUT = flag('--json');
const BRANCH_ID = arg('--branch') || null;

if (HELP) {
  console.log(require('fs').readFileSync(__filename, 'utf8').split('\n').slice(0, 35).join('\n'));
  process.exit(0);
}

const registry = require('../intelligence/cbahi-standards.registry');

if (LIST) {
  if (JSON_OUT) {
    console.log(JSON.stringify(registry.STANDARDS, null, 2));
  } else {
    console.log(
      `CBAHI registry: ${registry.STANDARDS.length} standards across ${registry.CHAPTER_KEYS.length} chapters\n`
    );
    for (const ch of registry.CHAPTER_KEYS) {
      const std = registry.listChapter(ch);
      console.log(`  ${ch} — ${registry.CHAPTERS[ch].titleAr} (${std.length} standards):`);
      for (const s of std) console.log(`    • ${s.code}  ${s.titleAr}`);
    }
  }
  process.exit(0);
}

if (!ALL_BRANCHES && !BRANCH_ID) {
  console.error('Error: provide either --branch <id> or --all-branches.');
  console.error('Use --list to see the standards catalog, --help for full usage.');
  process.exit(1);
}

if (DRY_RUN) {
  const target = ALL_BRANCHES ? '<all active branches>' : BRANCH_ID;
  console.log(`[dry-run] Would seed ${registry.STANDARDS.length} draft attestations per branch.`);
  console.log(`[dry-run] Target: ${target}`);
  if (RESET) console.log(`[dry-run] --reset enabled: would delete existing drafts first.`);
  console.log(`[dry-run] No database connection required.`);
  process.exit(0);
}

// ─── Real run — connect + seed ──────────────────────────────────────

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required for non-dry-run.');
    process.exit(2);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);

  // Load models lazily (depends on mongoose connection)
  const CbahiAttestation = require('../models/CbahiAttestation');
  let Branch;
  try {
    Branch = require('../models/Branch');
  } catch {
    Branch = null;
  }

  let targetBranchIds = [];
  if (BRANCH_ID) {
    targetBranchIds = [BRANCH_ID];
  } else if (ALL_BRANCHES) {
    if (!Branch) {
      console.error('Error: Branch model not registered; cannot enumerate --all-branches.');
      await mongoose.disconnect();
      process.exit(3);
    }
    const branches = await Branch.find({}).select('_id name').lean();
    if (branches.length === 0) {
      console.error('No branches found in the database.');
      await mongoose.disconnect();
      process.exit(4);
    }
    targetBranchIds = branches.map(b => String(b._id));
  }

  const summary = {
    targetBranchCount: targetBranchIds.length,
    standardsCount: registry.STANDARDS.length,
    branches: [],
  };

  for (const branchId of targetBranchIds) {
    const perBranch = { branchId, created: 0, skipped: 0, deleted: 0, errors: 0 };

    if (RESET) {
      // Only delete drafts (never delete attested-with-evidence records)
      const delResult = await CbahiAttestation.deleteMany({ branchId, status: 'draft' });
      perBranch.deleted = delResult.deletedCount || 0;
    }

    for (const std of registry.STANDARDS) {
      try {
        const existing = await CbahiAttestation.findOne({
          branchId,
          standardKey: std.key,
        })
          .select('_id status')
          .lean();
        if (existing) {
          perBranch.skipped++;
          continue;
        }
        await CbahiAttestation.create({
          branchId,
          standardKey: std.key,
          standardChapter: std.chapter,
          standardCode: std.code,
          status: 'draft',
          notes: `Seeded by scripts/seed-cbahi-attestations.js at ${new Date().toISOString()}`,
        });
        perBranch.created++;
      } catch (err) {
        perBranch.errors++;
        if (!JSON_OUT) {
          console.error(
            `  [error] branch=${branchId} standard=${std.key}: ${err instanceof Error ? err.message : err}`
          );
        }
      }
    }

    summary.branches.push(perBranch);
    if (!JSON_OUT) {
      const action = RESET ? `deleted=${perBranch.deleted} ` : '';
      console.log(
        `Branch ${branchId}: ${action}created=${perBranch.created} skipped=${perBranch.skipped} errors=${perBranch.errors}`
      );
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    const totalCreated = summary.branches.reduce((acc, b) => acc + b.created, 0);
    const totalSkipped = summary.branches.reduce((acc, b) => acc + b.skipped, 0);
    const totalErrors = summary.branches.reduce((acc, b) => acc + b.errors, 0);
    console.log(
      `\nDone. Branches: ${summary.targetBranchCount}, created: ${totalCreated}, skipped: ${totalSkipped}, errors: ${totalErrors}.`
    );
    if (totalCreated > 0) {
      console.log(
        `Next: navigate to /cbahi to see the new drafts + start attaching evidence via POST /api/v1/cbahi/attestations/:id/attest.`
      );
    }
  }

  await mongoose.disconnect();
  process.exit(totalErrorsExitCode(summary));
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(99);
});

function totalErrorsExitCode(summary) {
  return summary.branches.some(b => b.errors > 0) ? 5 : 0;
}

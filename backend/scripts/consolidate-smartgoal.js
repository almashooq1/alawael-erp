#!/usr/bin/env node
'use strict';

/**
 * consolidate-smartgoal.js — ADR-040 SmartGoal → TherapeuticGoal consolidation.
 * ════════════════════════════════════════════════════════════════════
 * SmartGoal is one of three coexisting goal models; ADR-040 makes
 * `TherapeuticGoal` canonical and retires `SmartGoal`. This tool performs that
 * consolidation SAFELY:
 *
 *   • DRY-RUN by default — prints the plan, writes nothing. `--execute` to write.
 *   • REFUSES to FABRICATE the clinical fields `TherapeuticGoal` *requires* but
 *     `SmartGoal` lacks: `episodeId`, `type`, `target.value`. A SmartGoal cannot
 *     be turned into a valid TherapeuticGoal without a clinician supplying these,
 *     so a non-empty SmartGoal set is REPORTED (with exactly what's missing per
 *     row), never silently mis-migrated.
 *   • If SmartGoal is EMPTY → reports "safe to retire" (deprecate the 2 write
 *     surfaces + drop the empty collection — no data migration).
 *
 * The dev audit (2026-06-10) showed SmartGoal=0 → the likely prod outcome is the
 * trivial empty-retire. Run against prod first to confirm.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/consolidate-smartgoal.js            # dry-run
 *   MONGODB_URI=... node scripts/consolidate-smartgoal.js --execute  # write (never fabricates)
 *   MONGODB_URI=... node scripts/consolidate-smartgoal.js --json
 *
 * Exit codes: 0 = ran (safe) · 2 = usage/connection error.
 */

const EXECUTE = process.argv.includes('--execute');
const JSON_OUT = process.argv.includes('--json');

function log(...a) {
  if (!JSON_OUT) console.log(...a);
}

// SmartGoal.status → TherapeuticGoal.status
const STATUS_MAP = Object.freeze({
  active: 'active',
  achieved: 'achieved',
  paused: 'deferred',
  cancelled: 'discontinued',
});

// Fields TherapeuticGoal REQUIRES that a SmartGoal cannot supply — these need
// clinical judgment, so the tool never invents them.
const CLINICAL_REQUIRED_ABSENT = Object.freeze(['episodeId', 'type', 'target.value']);

/**
 * PURE — map a SmartGoal to a TherapeuticGoal candidate + the required fields it
 * cannot supply. No DB. `mapped` carries only the mechanically-safe fields.
 * @param {object} sg
 * @returns {{ mapped: object|null, missingRequired: string[] }}
 */
function mapSmartGoalToTherapeutic(sg) {
  if (!sg) return { mapped: null, missingRequired: [] };
  const mapped = {
    beneficiaryId: sg.beneficiary || null,
    title: sg.title || null,
    specific: sg.specific || undefined,
    measurable: sg.measurable || undefined,
    achievable: sg.achievable || undefined,
    relevant: sg.relevant || undefined,
    status: STATUS_MAP[sg.status] || 'draft',
    currentProgress: typeof sg.overallProgress === 'number' ? sg.overallProgress : 0,
    branchId: sg.branch || undefined,
    startDate: sg.createdAt || undefined,
    targetDate: sg.timeBoundDate || undefined,
    // idempotency marker (so a re-run can skip already-migrated SmartGoals)
    tags: ['migrated-from-smartgoal', String(sg._id || '')],
  };
  const missingRequired = [];
  if (!mapped.beneficiaryId) missingRequired.push('beneficiaryId');
  for (const f of CLINICAL_REQUIRED_ABSENT) missingRequired.push(f);
  return { mapped, missingRequired };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required.');
    process.exit(2);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);

  let SmartGoal;
  try {
    SmartGoal = require('../models/SmartGoal');
  } catch {
    SmartGoal = mongoose.models.SmartGoal;
  }
  if (!SmartGoal) {
    console.error('Error: SmartGoal model not resolvable.');
    await mongoose.disconnect();
    process.exit(2);
  }

  const total = await SmartGoal.estimatedDocumentCount();

  const result = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    smartGoalCount: total,
    migrated: 0,
    skipped: 0,
    blocked: 0,
  };

  if (total === 0) {
    result.verdict =
      'SmartGoal is EMPTY — retire is trivial: deprecate the 2 write surfaces ' +
      '(therapistPortal /smart-goals + assessmentRecommendation) and drop the empty ' +
      'collection. No data migration. (This tool does NOT auto-drop collections.)';
  } else {
    // Non-empty: report what each row needs; never fabricate.
    const sample = await SmartGoal.find({})
      .select(
        'beneficiary title status overallProgress branch timeBoundDate createdAt specific measurable achievable relevant'
      )
      .limit(500)
      .lean();
    let blocked = 0;
    for (const sg of sample) {
      const { missingRequired } = mapSmartGoalToTherapeutic(sg);
      if (missingRequired.length) blocked += 1;
    }
    result.blocked = blocked;
    result.verdict =
      `${total} SmartGoal(s) exist but each lacks the TherapeuticGoal-required clinical ` +
      `fields [${CLINICAL_REQUIRED_ABSENT.join(', ')}]. This tool will NOT fabricate them. ` +
      `Options: (a) backfill episode/type/target per goal then re-run, or (b) keep SmartGoal ` +
      `read-only. NOTHING was migrated${EXECUTE ? ' (even with --execute — refusing to fabricate)' : ''}.`;
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    log('');
    log(`ADR-040 SmartGoal → TherapeuticGoal consolidation [${result.mode}]`);
    log('──────────────────────────────────────────────────────────────────');
    log(`  SmartGoal documents: ${total}`);
    log(`  ${result.verdict}`);
    log('');
  }

  await mongoose.disconnect();
  process.exit(0);
}

module.exports = { mapSmartGoalToTherapeutic, STATUS_MAP, CLINICAL_REQUIRED_ABSENT };

if (require.main === module) {
  main().catch(err => {
    console.error('consolidate-smartgoal failed:', err.message);
    process.exit(2);
  });
}

#!/usr/bin/env node
'use strict';

/**
 * seed-hr-intelligence.js — populate the HR workforce-intelligence suite so the
 * 9-box (W1198) and skills-gap (W1201) dashboards show real data (W1202).
 *
 * Seeds, for the active workforce:
 *   - RoleCompetencyRequirement — a competency baseline per distinct job title
 *   - EmployeeCompetency        — a deterministic assessed level per employee×competency
 *   - TalentReview              — a deterministic performance×potential placement
 * Pay-equity + diversity compute live from Employee data (no seed needed).
 *
 * DETERMINISTIC: levels/bands are a hash of (employeeId, key) — same DB → same
 * result, and tuned so ~⅓ of competencies fall below requirement (realistic gaps).
 * IDEMPOTENT: re-running upserts; --reset clears the three collections first
 * (these are W1198/W1201 models with no production data yet).
 *
 * Usage:
 *   node scripts/seed-hr-intelligence.js                 seed all active employees
 *   node scripts/seed-hr-intelligence.js --branch <id>   one branch
 *   node scripts/seed-hr-intelligence.js --dry-run       preview, no DB write
 *   node scripts/seed-hr-intelligence.js --reset         delete seeded rows first
 *   node scripts/seed-hr-intelligence.js --limit 200     cap employees seeded
 *   node scripts/seed-hr-intelligence.js --json          machine-readable summary
 *
 * Env: MONGODB_URI (required unless --dry-run).
 */

const mongoose = require('mongoose');

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const opt = name => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};
const DRY_RUN = flag('--dry-run');
const RESET = flag('--reset');
const JSON_OUT = flag('--json');
const BRANCH = opt('--branch');
const LIMIT = Number(opt('--limit')) || 1000;

// ── deterministic helpers (pure, exported for tests) ─────────────────────────
function hashInt(str) {
  let h = 5381;
  const s = String(str);
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}
// 1..3 band
function bandFor(id, key) {
  return (hashInt(`${id}|${key}`) % 3) + 1;
}
// current level for a required level: required minus a 0..2 deterministic shortfall,
// clamped to [0,5] — so ~⅓ meet, ~⅔ have a gap of 1-2.
function currentLevelFor(id, competencyKey, requiredLevel) {
  const shortfall = hashInt(`${id}|c|${competencyKey}`) % 3; // 0,1,2
  const v = requiredLevel - shortfall;
  return v < 0 ? 0 : v > 5 ? 5 : v;
}

// competency baseline applied to every job title (rehab-center generic set)
const COMPETENCY_CATALOG = [
  {
    competencyKey: 'assessment',
    competencyNameAr: 'التقييم السريري',
    requiredLevel: 4,
    criticality: 'core',
  },
  {
    competencyKey: 'documentation',
    competencyNameAr: 'التوثيق',
    requiredLevel: 3,
    criticality: 'important',
  },
  {
    competencyKey: 'patient_safety',
    competencyNameAr: 'سلامة المستفيد',
    requiredLevel: 4,
    criticality: 'core',
  },
  {
    competencyKey: 'communication',
    competencyNameAr: 'التواصل',
    requiredLevel: 3,
    criticality: 'important',
  },
  {
    competencyKey: 'evidence_based',
    competencyNameAr: 'الممارسة المبنية على الأدلة',
    requiredLevel: 3,
    criticality: 'important',
  },
  {
    competencyKey: 'aac',
    competencyNameAr: 'التواصل المعزّز والبديل',
    requiredLevel: 2,
    criticality: 'nice',
  },
];

function out(summary) {
  if (JSON_OUT) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log('');
    console.log('HR intelligence seed —', DRY_RUN ? 'DRY RUN (no writes)' : 'applied');
    console.log(`  job titles: ${summary.jobTitles}   requirements: ${summary.requirements}`);
    console.log(
      `  employees: ${summary.employees}   competencies: ${summary.competencies}   talentReviews: ${summary.talentReviews}`
    );
    if (summary.reset) console.log(`  reset deleted: ${JSON.stringify(summary.reset)}`);
    console.log('');
  }
}

async function main() {
  if (DRY_RUN) {
    out({
      jobTitles: '(dry)',
      requirements: COMPETENCY_CATALOG.length + ' per title',
      employees: '(dry)',
      competencies: '(dry)',
      talentReviews: '(dry)',
    });
    process.exit(0);
  }
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI required (or use --dry-run).');
    process.exit(2);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const Employee = require('../models/HR/Employee');
  const RoleCompetencyRequirement = require('../models/HR/RoleCompetencyRequirement');
  const EmployeeCompetency = require('../models/HR/EmployeeCompetency');
  const TalentReview = require('../models/HR/TalentReview');

  const empFilter = { status: 'active', deleted_at: null };
  if (BRANCH) empFilter.branch_id = BRANCH;
  const employees = await Employee.find(empFilter)
    .select('_id job_title_en job_title_ar branch_id')
    .limit(LIMIT)
    .lean();
  const jobTitle = e => e.job_title_en || e.job_title_ar || 'general';
  const titles = [...new Set(employees.map(jobTitle))];

  const summary = {
    jobTitles: titles.length,
    requirements: 0,
    employees: employees.length,
    competencies: 0,
    talentReviews: 0,
  };

  if (RESET) {
    const empIds = employees.map(e => e._id);
    const r1 = await EmployeeCompetency.deleteMany({ employeeId: { $in: empIds } });
    const r2 = await TalentReview.deleteMany({ employeeId: { $in: empIds } });
    const r3 = await RoleCompetencyRequirement.deleteMany({ jobTitle: { $in: titles } });
    summary.reset = {
      competencies: r1.deletedCount,
      talentReviews: r2.deletedCount,
      requirements: r3.deletedCount,
    };
  }

  // 1) role baselines
  for (const t of titles) {
    for (const c of COMPETENCY_CATALOG) {
      await RoleCompetencyRequirement.updateOne(
        { jobTitle: t, competencyKey: c.competencyKey },
        {
          $set: {
            competencyNameAr: c.competencyNameAr,
            requiredLevel: c.requiredLevel,
            criticality: c.criticality,
            active: true,
          },
        },
        { upsert: true }
      );
      summary.requirements++;
    }
  }

  // 2) employee competencies + 3) talent reviews
  const reviewCycle = '2026-H1';
  for (const e of employees) {
    const id = String(e._id);
    for (const c of COMPETENCY_CATALOG) {
      const currentLevel = currentLevelFor(id, c.competencyKey, c.requiredLevel);
      const existing = await EmployeeCompetency.findOne({
        employeeId: e._id,
        competencyKey: c.competencyKey,
      });
      const doc =
        existing || new EmployeeCompetency({ employeeId: e._id, competencyKey: c.competencyKey });
      doc.competencyNameAr = c.competencyNameAr;
      doc.currentLevel = currentLevel;
      doc.assessedAt = new Date();
      await doc.save();
      summary.competencies++;
    }
    const existingTR = await TalentReview.findOne({ employeeId: e._id, reviewCycle });
    const tr = existingTR || new TalentReview({ employeeId: e._id, reviewCycle });
    tr.performanceBand = bandFor(id, 'perf');
    tr.potentialBand = bandFor(id, 'potential');
    tr.performanceSource = 'manual';
    await tr.save(); // pre('validate') computes box/segment
    summary.talentReviews++;
  }

  out(summary);
  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) {
  main().catch(err => {
    console.error('seed-hr-intelligence failed:', err && err.message);
    process.exit(99);
  });
}

module.exports = { hashInt, bandFor, currentLevelFor, COMPETENCY_CATALOG };

#!/usr/bin/env node
/**
 * migrate-beneficiary-file-refs.js
 * ═══════════════════════════════════════════════════════════════
 * Migrates all code references from legacy 'BeneficiaryFile' model
 * to the canonical 'Beneficiary' model.
 *
 * Changes:
 *   1. ref: 'BeneficiaryFile' → ref: 'Beneficiary'  (29 occurrences in 15 model files)
 *   2. require('./BeneficiaryFile') → require('./Beneficiary')  (6 service files)
 *   3. safeModel('BeneficiaryFile') → safeModel('Beneficiary')  (5 occurrences in 2 route files)
 *   4. Test file references  (2 occurrences in 1 file)
 *
 * Run: node scripts/migrate-beneficiary-file-refs.js
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');

let totalChanges = 0;
let filesChanged = 0;

function replaceInFile(filePath, patterns) {
  const abs = path.join(BACKEND, filePath);
  if (!fs.existsSync(abs)) {
    console.warn(`  ⚠  SKIP (not found): ${filePath}`);
    return 0;
  }
  const original = fs.readFileSync(abs, 'utf8');
  let content = original;
  let count = 0;

  for (const [search, replace] of patterns) {
    const regex = typeof search === 'string' ? new RegExp(escapeRegex(search), 'g') : search;
    const matches = content.match(regex);
    if (matches) {
      count += matches.length;
      content = content.replace(regex, replace);
    }
  }

  if (content !== original) {
    fs.writeFileSync(abs, content, 'utf8');
    console.log(`  ✔  ${filePath} — ${count} replacement(s)`);
    totalChanges += count;
    filesChanged++;
  } else {
    console.log(`  –  ${filePath} — no changes needed`);
  }
  return count;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ────────────────────────────────────────────────────────────────
// Phase 1: Model ref: 'BeneficiaryFile' → ref: 'Beneficiary'
// ────────────────────────────────────────────────────────────────
console.log('\n═══ Phase 1: Model ref replacements ═══');

const modelFiles = [
  'models/Appointment.js',
  'models/appointmentScheduling.model.js',
  'models/clinical-assessment-battery.model.js',
  'models/Feedback.js',
  'models/Gamification.js',
  'models/HomeAssignment.js',
  'models/Invoice.js',
  'models/pharmacy.model.js',
  'models/RehabProgramTemplate.js',
  'models/SessionDocumentation.js',
  'models/SpecializedAssessmentScale.js',
  'models/StandardizedAssessment.js',
  'models/TherapeuticPlan.js',
  'models/TherapySession.js',
  'models/Waitlist.js',
];

const refPattern = [/ref:\s*['"]BeneficiaryFile['"]/g, "ref: 'Beneficiary'"];

for (const f of modelFiles) {
  replaceInFile(f, [refPattern]);
}

// ────────────────────────────────────────────────────────────────
// Phase 2: Service require('./BeneficiaryFile') → require('./Beneficiary')
// ────────────────────────────────────────────────────────────────
console.log('\n═══ Phase 2: Service require replacements ═══');

const serviceFiles = [
  'services/globalSearch.service.js',
  'services/portal.service.js',
  'services/smartDashboard.service.js',
  'services/smartFinance.service.js',
  'services/smartPatient.service.js',
  'services/therapeutic-session.service.js',
];

const requirePatterns = [
  [/require\(['"]\.\.\/models\/BeneficiaryFile['"]\)/g, "require('../models/Beneficiary')"],
  [/require\(['"]\.\/BeneficiaryFile['"]\)/g, "require('./Beneficiary')"],
  // Also handle destructured imports from models/index.js
  [/require\(['"]\.\.\/models['"]\)\.BeneficiaryFile/g, "require('../models').Beneficiary"],
];

for (const f of serviceFiles) {
  replaceInFile(f, requirePatterns);
}

// ────────────────────────────────────────────────────────────────
// Phase 3: Route safeModel('BeneficiaryFile') → safeModel('Beneficiary')
// ────────────────────────────────────────────────────────────────
console.log('\n═══ Phase 3: Route safeModel replacements ═══');

const routeFiles = ['routes/bi-dashboard.routes.js', 'routes/bi.routes.js'];

const safeModelPattern = [/safeModel\(['"]BeneficiaryFile['"]\)/g, "safeModel('Beneficiary')"];

for (const f of routeFiles) {
  replaceInFile(f, [safeModelPattern]);
}

// ────────────────────────────────────────────────────────────────
// Phase 4: Test file references
// ────────────────────────────────────────────────────────────────
console.log('\n═══ Phase 4: Test file replacements ═══');

replaceInFile('__tests__/therapist-portal.test.js', [
  [/mongoose\.models\.BeneficiaryFile/g, 'mongoose.models.Beneficiary'],
  [/mongoose\.model\(['"]BeneficiaryFile['"]/g, "mongoose.model('Beneficiary'"],
  [/require\(['"].*BeneficiaryFile['"]\)/g, "require('../models/Beneficiary')"],
]);

// ────────────────────────────────────────────────────────────────
// Phase 5: models/index.js — keep BeneficiaryFile export as alias
// ────────────────────────────────────────────────────────────────
console.log('\n═══ Phase 5: models/index.js ═══');

replaceInFile('models/index.js', [
  [
    /const BeneficiaryFile = require\('\.\/BeneficiaryFile'\);/g,
    "const BeneficiaryFile = require('./BeneficiaryFile'); // → alias for Beneficiary (see BeneficiaryFile.js)",
  ],
]);

// ────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log(`  Total replacements: ${totalChanges}`);
console.log(`  Files changed: ${filesChanged}`);
console.log('═══════════════════════════════════════════\n');

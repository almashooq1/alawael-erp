#!/usr/bin/env node
'use strict';
/**
 * fix-model-conflicts.js
 * ═══════════════════════
 * Resolves DDD model name conflicts by renaming model registrations
 * in model files, exports, and corresponding service files.
 *
 * Usage:
 *   node scripts/fix-model-conflicts.js --dry-run
 *   node scripts/fix-model-conflicts.js
 */

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');
const modelsDir = path.join(__dirname, '..', 'backend', 'models');
const servicesDir = path.join(__dirname, '..', 'backend', 'services');

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Rename Definitions                                         */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const RENAMES = [
  { old: 'DDDBenchmark', new: 'DDDSatisfactionBenchmark', modelFile: 'DddSatisfactionTracker.js' },
  { old: 'DDDCEURecord', new: 'DDDCredentialCEURecord', modelFile: 'DddCredentialManager.js' },
  { old: 'DDDComplianceAssessment', new: 'DDDStdComplianceAssessment', modelFile: 'DddStandardsCompliance.js' },
  { old: 'DDDCredential', new: 'DDDCompetencyCredential', modelFile: 'DddCompetencyTracker.js' },
  { old: 'DDDDataCollection', new: 'DDDOutcomeDataCollection', modelFile: 'DddOutcomeResearch.js' },
  { old: 'DDDFeedback', new: 'DDDPerfEvalFeedback', modelFile: 'DddPerformanceEvaluator.js' },
  { old: 'DDDIncident', new: 'DDDSystemIncident', modelFile: 'DddIncidentResponse.js' },
  { old: 'DDDLearningPath', new: 'DDDHealthEduPath', modelFile: 'DddHealthEducation.js' },
  { old: 'DDDMaintenanceRecord', new: 'DDDAssetMaintenanceRecord', modelFile: 'DddAssetTracker.js' },
  { old: 'DDDMessage', new: 'DDDCollabMessage', modelFile: 'DddCollaborationHub.js' },
  { old: 'DDDOutreachEvent', new: 'DDDCampaignEvent', modelFile: 'DddOutreachTracker.js' },
  { old: 'DDDRetentionPolicy', new: 'DDDDataRetentionPolicy', modelFile: 'DddConsentManager.js' },
  { old: 'DDDStaffProfile', new: 'DDDWorkforceStaffProfile', modelFile: 'WorkforceAnalytics.js' },

  // ── Batch 2: merge-pair conflicts (rename in singular/management file) ──
  { old: 'DDDClinicalTrial', new: 'DDDTrialMonitor', modelFile: 'DddClinicalTrial.js' },
  { old: 'DDDAdverseEvent', new: 'DDDTrialMonitorAdverseEvent', modelFile: 'DddClinicalTrial.js' },
  { old: 'DDDVolunteerShift', new: 'DDDVolMgmtShift', modelFile: 'DddVolunteerManagement.js' },
  { old: 'DDDVolunteerRecognition', new: 'DDDVolMgmtRecognition', modelFile: 'DddVolunteerManagement.js' },
];

console.log(DRY ? '=== DRY RUN ===' : '=== LIVE RUN ===');
console.log('');

let okCount = 0,
  failCount = 0;

for (const rename of RENAMES) {
  const modelPath = path.join(modelsDir, rename.modelFile);
  if (!fs.existsSync(modelPath)) {
    console.log('  SKIP ' + rename.modelFile + ' — file not found');
    failCount++;
    continue;
  }

  let src = fs.readFileSync(modelPath, 'utf8');
  const origSrc = src;

  // 1. Replace model name in mongoose.model('OLD', ...) and mongoose.models.OLD
  const oldEsc = rename.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const countBefore = (src.match(new RegExp(oldEsc, 'g')) || []).length;

  src = src.replace(new RegExp(oldEsc, 'g'), rename.new);

  const countAfter = (src.match(new RegExp(rename.new, 'g')) || []).length;

  if (countBefore === 0) {
    console.log('  SKIP ' + rename.modelFile + ' — model name "' + rename.old + '" not found');
    failCount++;
    continue;
  }

  if (!DRY) {
    fs.writeFileSync(modelPath, src, 'utf8');
  }
  console.log('  MODEL ' + rename.modelFile + ': ' + rename.old + ' → ' + rename.new + ' (' + countBefore + ' occurrences)');

  // 2. Find and update corresponding service file
  const svcName = rename.modelFile.replace('.js', '').replace(/^Ddd/, 'ddd');
  const svcPath = path.join(servicesDir, svcName + '.js');
  if (fs.existsSync(svcPath)) {
    let svcSrc = fs.readFileSync(svcPath, 'utf8');
    const svcCount = (svcSrc.match(new RegExp(oldEsc, 'g')) || []).length;
    if (svcCount > 0) {
      svcSrc = svcSrc.replace(new RegExp(oldEsc, 'g'), rename.new);
      if (!DRY) {
        fs.writeFileSync(svcPath, svcSrc, 'utf8');
      }
      console.log('    SVC ' + svcName + '.js: ' + svcCount + ' replacements');
    }
  }

  // 3. Find and update corresponding route file
  const routeName = rename.modelFile
    .replace('.js', '')
    .replace(/^Ddd/, 'ddd-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
  const routePath = path.join(__dirname, '..', 'backend', 'routes', routeName + '.routes.js');
  if (fs.existsSync(routePath)) {
    let routeSrc = fs.readFileSync(routePath, 'utf8');
    const routeCount = (routeSrc.match(new RegExp(oldEsc, 'g')) || []).length;
    if (routeCount > 0) {
      routeSrc = routeSrc.replace(new RegExp(oldEsc, 'g'), rename.new);
      if (!DRY) {
        fs.writeFileSync(routePath, routeSrc, 'utf8');
      }
      console.log('    RTD ' + routeName + '.routes.js: ' + routeCount + ' replacements');
    }
  }

  // 4. Find and update corresponding validation file
  const valName = rename.modelFile
    .replace('.js', '')
    .replace(/^Ddd/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
  const valPath = path.join(__dirname, '..', 'backend', 'validations', valName + '.validation.js');
  if (fs.existsSync(valPath)) {
    let valSrc = fs.readFileSync(valPath, 'utf8');
    const valCount = (valSrc.match(new RegExp(oldEsc, 'g')) || []).length;
    if (valCount > 0) {
      valSrc = valSrc.replace(new RegExp(oldEsc, 'g'), rename.new);
      if (!DRY) {
        fs.writeFileSync(valPath, valSrc, 'utf8');
      }
      console.log('    VAL ' + valName + '.validation.js: ' + valCount + ' replacements');
    }
  }

  okCount++;
}

console.log('');
console.log('=== SUMMARY: ' + okCount + ' renamed, ' + failCount + ' skipped ===');

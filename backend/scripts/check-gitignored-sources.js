#!/usr/bin/env node
/**
 * check-gitignored-sources.js — fail when a tracked source file matches a
 * `.gitignore` pattern. This is exactly the W444-class bug:
 * `intelligence/canonical/_primitives.js` was required by 22 canonical
 * schemas, lived on the local FS, was tracked in git, AND matched the
 * `_*.js` rule in `.gitignore` — so a `git clean -fdx` (or any fresh
 * clone with strict ignore enforcement) would silently delete it and
 * break 22 schema loads in CI. Local sprint passed; CI broke.
 *
 * Fix layer: baseline the current 31 tracked-ignored entries (all
 * archived/dev artifacts) + fail on any NEW addition + fail on stale
 * baseline entries that are no longer tracked-ignored (ratchet-DOWN
 * pattern from W325c).
 *
 * Usage:
 *   node scripts/check-gitignored-sources.js        # human-readable
 *   node scripts/check-gitignored-sources.js --json # machine-readable
 *
 * Exit: 0 = baseline matches current; 1 = drift detected.
 */

'use strict';

const { execSync } = require('child_process');
const _path = require('path');

const JSON_MODE = process.argv.includes('--json');

// Baseline as of 2026-05-26 (Cycle 11 final layer). Every entry below
// is intentionally tracked-ignored: _archived/ historical dumps, dev
// artifacts (.env.*, jest-results.json), generator scripts (_gen_*.js,
// _relax_*.js), and the routes/_registry.js index. Add a NEW entry
// here ONLY with a comment explaining why ignore-pattern overlap is
// intentional + safe (the file isn't required by tracked production
// code). Better: add a `!path/to/file` negation to .gitignore instead.
const BASELINE_TRACKED_IGNORED = new Set([
  // _archived/* — historical dead-model snapshots, intentionally kept
  // in git as documentation but matched by `_archived/` ignore rule.
  '_archived/dead-models/2026-05-01/BeneficiaryManagement_Beneficiary.js',
  '_archived/dead-models/assessmentScales-ClinicalAssessment.js',
  '_archived/dead-models/domains-assessments-ClinicalAssessment.js',
  '_archived/dead-models/domains-core-Beneficiary.js',
  '_archived/dead-models/domains-programs-Program.js',
  '_archived/dead-models/domains-research-ResearchStudy.js',
  '_archived/dead-tests/assessmentScales-ClinicalAssessment.model.test.js',
  '_archived/dead-tests/assessments-models-ClinicalAssessment.domain.test.js',
  '_archived/root-artifacts/2026-05-01/missing_imports.txt',
  // _archived/dead-flask-templates/* — legacy Flask HTML templates archived
  // 2026-06; matched by the _archived/ ignore rule, kept as documentation.
  '_archived/dead-flask-templates/socket-test.html',
  '_archived/dead-flask-templates/templates/admin_dashboard.html',
  '_archived/dead-flask-templates/templates/ados.html',
  '_archived/dead-flask-templates/templates/advanced_dashboard.html',
  '_archived/dead-flask-templates/templates/ai_communications.html',
  '_archived/dead-flask-templates/templates/ai_programs_assessments.html',
  '_archived/dead-flask-templates/templates/appointments.html',
  '_archived/dead-flask-templates/templates/appointments_calendar.html',
  '_archived/dead-flask-templates/templates/approval_management.html',
  '_archived/dead-flask-templates/templates/ar_vr_dashboard.html',
  '_archived/dead-flask-templates/templates/ar_vr_management.html',
  '_archived/dead-flask-templates/templates/arizona.html',
  '_archived/dead-flask-templates/templates/assessment_details.html',
  '_archived/dead-flask-templates/templates/assistive_devices.html',
  '_archived/dead-flask-templates/templates/automation.html',
  '_archived/dead-flask-templates/templates/automation_management.html',
  '_archived/dead-flask-templates/templates/base.html',
  '_archived/dead-flask-templates/templates/branch_integration.html',
  '_archived/dead-flask-templates/templates/case_tracking.html',
  '_archived/dead-flask-templates/templates/chat_interface.html',
  '_archived/dead-flask-templates/templates/clinic_reports.html',
  '_archived/dead-flask-templates/templates/clinics.html',
  '_archived/dead-flask-templates/templates/communications_management.html',
  '_archived/dead-flask-templates/templates/comprehensive_rehabilitation.html',
  '_archived/dead-flask-templates/templates/conners.html',
  '_archived/dead-flask-templates/templates/crm_management.html',
  '_archived/dead-flask-templates/templates/dap.html',
  '_archived/dead-flask-templates/templates/dashboard.html',
  '_archived/dead-flask-templates/templates/documents_management.html',
  '_archived/dead-flask-templates/templates/driver_app.html',
  '_archived/dead-flask-templates/templates/elearning_platform.html',
  '_archived/dead-flask-templates/templates/emergency_management.html',
  '_archived/dead-flask-templates/templates/family_child_management.html',
  '_archived/dead-flask-templates/templates/family_login.html',
  '_archived/dead-flask-templates/templates/family_portal.html',
  '_archived/dead-flask-templates/templates/finance_management.html',
  '_archived/dead-flask-templates/templates/formboard.html',
  '_archived/dead-flask-templates/templates/gars.html',
  '_archived/dead-flask-templates/templates/help_bob.html',
  '_archived/dead-flask-templates/templates/hr_management.html',
  '_archived/dead-flask-templates/templates/index.html',
  '_archived/dead-flask-templates/templates/integration_management.html',
  '_archived/dead-flask-templates/templates/intelligent_assistant.html',
  '_archived/dead-flask-templates/templates/learning_behavior_analysis.html',
  '_archived/dead-flask-templates/templates/login.html',
  '_archived/dead-flask-templates/templates/maintenance_management.html',
  '_archived/dead-flask-templates/templates/medical_followup.html',
  '_archived/dead-flask-templates/templates/messaging.html',
  '_archived/dead-flask-templates/templates/ml_analytics.html',
  '_archived/dead-flask-templates/templates/munther.html',
  '_archived/dead-flask-templates/templates/parent_dashboard.html',
  '_archived/dead-flask-templates/templates/performance_monitoring.html',
  '_archived/dead-flask-templates/templates/psychological_assessment.html',
  '_archived/dead-flask-templates/templates/quality_management.html',
  '_archived/dead-flask-templates/templates/rehabilitation.html',
  '_archived/dead-flask-templates/templates/rehabilitation_activities.html',
  '_archived/dead-flask-templates/templates/rehabilitation_modals.html',
  '_archived/dead-flask-templates/templates/rehabilitation_plans.html',
  '_archived/dead-flask-templates/templates/rehabilitation_programs.html',
  '_archived/dead-flask-templates/templates/rehabilitation_reports.html',
  '_archived/dead-flask-templates/templates/reynell.html',
  '_archived/dead-flask-templates/templates/risk_management.html',
  '_archived/dead-flask-templates/templates/security_management.html',
  '_archived/dead-flask-templates/templates/session_scheduling.html',
  '_archived/dead-flask-templates/templates/smart_therapy_recommendations.html',
  '_archived/dead-flask-templates/templates/social_maturity.html',
  '_archived/dead-flask-templates/templates/speech_therapy.html',
  '_archived/dead-flask-templates/templates/staff_assignments.html',
  '_archived/dead-flask-templates/templates/stanford_binet.html',
  '_archived/dead-flask-templates/templates/student_comprehensive.html',
  '_archived/dead-flask-templates/templates/student_notifications.html',
  '_archived/dead-flask-templates/templates/student_skills.html',
  '_archived/dead-flask-templates/templates/supply_management.html',
  '_archived/dead-flask-templates/templates/surveillance_management.html',
  '_archived/dead-flask-templates/templates/vanderbilt.html',
  '_archived/dead-flask-templates/templates/vineland.html',
  '_archived/dead-flask-templates/templates/volunteer_staff_management.html',
  '_archived/dead-flask-templates/templates/wechsler.html',
  '_archived/dead-flask-templates/templates/workflow_builder.html',
  '_archived/dead-flask-templates/templates/workflow_templates.html',
  // backend/_archived/* — same pattern, scoped to backend repo
  'backend/_archived/dead-models/ELearning.js',
  'backend/_archived/dead-models/EnterpriseRisk.js',
  'backend/_archived/dead-models/EventManagement.js',
  'backend/_archived/dead-models/PublicRelations.js',
  'backend/_archived/dead-models/Training.js',
  'backend/_archived/dead-models/schemas.js',
  'backend/_archived/dead-tests/ELearning.model.test.js',
  'backend/_archived/dead-tests/EnterpriseRisk.model.test.js',
  'backend/_archived/dead-tests/EventManagement.model.test.js',
  'backend/_archived/dead-tests/PublicRelations.model.test.js',
  'backend/_archived/dead-tests/Training.model.test.js',
  'backend/_archived/dead-tests/schemas.model.test.js',
  'backend/_archived/scripts/verify-ddd-platform.js',
  // Generated index — matches `_*.js` but is required by route loader.
  // Safe because git tracks it + CI installs do `git checkout`, not
  // `git clean -fdx`. If we ever migrate to a Dockerfile that runs
  // `git clean`, this needs a `!` negation in .gitignore.
  'backend/routes/_registry.js',
  // Frontend dev artifacts — checked in for the auto-test scaffold +
  // env templates. The `_*.js` rule catches the two generator scripts
  // and `*.env*` rule catches the env templates, but they're intentional.
  'frontend/.env.development',
  'frontend/.env.production',
  'frontend/jest-results.json',
  'frontend/scripts/_gen_frontend_tests.js',
  'frontend/scripts/_relax_p107_assertions.js',
  // Ops shell scripts ignored by a broad ops/ rule — kept tracked
  // because they're the deploy/healthcheck entrypoints.
  'ops/deploy-docker-compose.sh',
  'ops/health-check-all.sh',
  // SCM sub-module env template
  'supply-chain-management/backend/.env.development',
]);

function repoRoot() {
  return execSync('git rev-parse --show-toplevel', {
    encoding: 'utf8',
  }).trim();
}

function listTrackedIgnored(cwd) {
  // -c = tracked, -i = ignored, --exclude-standard = honor .gitignore
  const out = execSync('git ls-files -ci --exclude-standard', {
    cwd,
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .filter(Boolean)
    .map(s => s.replace(/\\/g, '/'));
}

// Pure set-diff helper. Exposed for unit tests because the ratchet-DOWN
// pattern (W325c) needs BOTH `added` (new violations) AND `removed`
// (stale baseline entries) to fire — silently dropping either direction
// would weaken the gate. See `check-gitignored-sources-script.test.js`.
function diffBaseline(current, baseline) {
  const added = [...current].filter(f => !baseline.has(f)).sort();
  const removed = [...baseline].filter(f => !current.has(f)).sort();
  return { added, removed };
}

function main() {
  const cwd = repoRoot();
  const current = new Set(listTrackedIgnored(cwd));
  const baseline = BASELINE_TRACKED_IGNORED;

  const { added, removed } = diffBaseline(current, baseline);

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          baselineSize: baseline.size,
          currentSize: current.size,
          added,
          removed,
        },
        null,
        2
      ) + '\n'
    );
  } else {
    console.log(`Tracked-ignored files: ${current.size} (baseline: ${baseline.size}).`);
    if (added.length > 0) {
      console.log(`✗ ${added.length} NEW tracked-ignored file(s) — likely silent breakage risk:`);
      for (const f of added) console.log(`  + ${f}`);
      console.log('');
      console.log('Each of these is a tracked file that ALSO matches a .gitignore rule.');
      console.log('CI clones get the file, but any `git clean -fdx` deletes it — and');
      console.log('local sprint runs may silently pass while CI fails. Fix one of:');
      console.log('  (a) preferred — add `!path/to/file` negation to .gitignore');
      console.log('  (b) if file is legitimately archived/dev — add to BASELINE');
      console.log('      in scripts/check-gitignored-sources.js with a comment.');
    }
    if (removed.length > 0) {
      console.log(
        `✗ ${removed.length} STALE baseline entr(y/ies) — file no longer tracked-ignored:`
      );
      for (const f of removed) console.log(`  - ${f}`);
      console.log('');
      console.log(
        'Remove these from BASELINE_TRACKED_IGNORED in scripts/check-gitignored-sources.js'
      );
      console.log('(ratchet-DOWN per W325c pattern).');
    }
    if (added.length === 0 && removed.length === 0) {
      console.log('✓ Baseline matches current state.');
    }
  }

  process.exit(added.length + removed.length === 0 ? 0 : 1);
}

// Export pure helpers + baseline for unit tests. Only run main() as CLI.
module.exports = {
  BASELINE_TRACKED_IGNORED,
  listTrackedIgnored,
  diffBaseline,
};

if (require.main === module) {
  main();
}

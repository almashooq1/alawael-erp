#!/usr/bin/env node
/**
 * check-mongoose-hook-style.js — fail when a Mongoose model has multiple
 * pre/post hooks for the SAME event with MIXED dispatch styles
 * (async/Promise-returning vs callback-with-next).
 *
 * This is the W465 → W483 silent-break class. Complaint.js had two
 * pre('save', …) hooks: one async, one callback-style with `next`.
 * Mongoose's Kareem middleware dispatches the chain via Promise
 * adapters when any hook is async, which leaves `next` undefined for
 * the callback siblings — they throw TypeError on every doc.save().
 * Blast radius was every parent-portal-v2 + complaint-creation flow;
 * CI parent-portal-v2.api.test.js was RED on main for ~24h before the
 * pattern was identified + fixed.
 *
 * Recipe (per memory feedback_mongoose_mixed_pre_save_hook_styles):
 *   "grep existing pre('save'/etc.) hooks BEFORE adding a new one +
 *    match their style"
 * This script is the static gate that enforces the recipe at push time.
 *
 * Usage:
 *   node scripts/check-mongoose-hook-style.js        # human-readable
 *   node scripts/check-mongoose-hook-style.js --json # machine-readable
 *
 * Exit: 0 = all model files use consistent style per event; 1 = drift.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const JSON_MODE = process.argv.includes('--json');

// Directories where Mongoose schemas can be declared. backend/models/ is
// the canonical home but pre/post hooks also live in domain-specific
// folders (domains/*/models/), plugins (database/plugins/), authorization
// (tenantScope.plugin), privacy (data-subject-request.model), and a few
// services that declare their own schemas inline.
const SCAN_DIRS = [
  path.resolve(__dirname, '..', 'models'),
  path.resolve(__dirname, '..', 'domains'),
  path.resolve(__dirname, '..', 'database'),
  path.resolve(__dirname, '..', 'authorization'),
  path.resolve(__dirname, '..', 'privacy'),
  path.resolve(__dirname, '..', 'integration'),
  path.resolve(__dirname, '..', 'intelligence'),
  path.resolve(__dirname, '..', 'rehabilitation-services'),
  path.resolve(__dirname, '..', 'services'),
];
const SKIP_DIR_NAMES = new Set([
  '_archived',
  '_backups',
  'node_modules',
  '__tests__',
  'tests',
  'scripts',
]);

// Match `<Schema>.pre('event', <opts?>, <fn>)` or .post(...). Capture
// event name + signature start. We need to read forward to see whether
// the function is `async function` / `function (next)` / arrow.
const HOOK_RE =
  /(\w+(?:Schema|schema))\s*\.\s*(pre|post)\s*\(\s*['"]([a-zA-Z]+)['"]\s*(?:,\s*\{[^}]*\}\s*)?,\s*(async\s+)?function\s*\(([^)]*)\)/g;

// W494 baseline (2026-05-27): files with at least one pure callback-
// style pre/post hook. Under Mongoose 9, EVERY callback hook throws
// `TypeError: next is not a function` on .save() because Kareem now
// dispatches all hooks via Promise adapters. Each entry below is a
// LATENT bug — the W494 incident exposed 4 of these (StoryBook +
// StorySurfaceVariant + EquityDisparityAlert + OutcomeBenchmark) at
// once; the remaining ~99 will fire as soon as something exercises
// each model's .save() path under Mongoose 9.
//
// Ratchet-DOWN per W325c pattern:
//   - NEW callback file (not in baseline) → fail at push (forces async
//     style for all new model hooks per the memory recipe)
//   - STALE baseline entry (file fixed) → fail at push (forces removal
//     from baseline in same commit as the conversion to async)
//
// Cleanup strategy: convert each file's hooks one-at-a-time, prune the
// entry from this Set, commit. Same wave pattern that drove W325c
// phantom-ref baseline 58 → 0 across ~12 waves.
const KNOWN_CALLBACK_HOOK_BASELINE = new Set([
  'domains/care-plans/models/UnifiedCarePlan.js',
  'domains/sessions/models/ClinicalSession.js',
  'models/AccountingExpense.js',
  'models/AiRecommendationBundle.js',
  'models/Assessment.js',
  'models/Asset.js',
  'models/AwarenessProgram.js',
  'models/BeneficiaryManagement/AcademicRecord.js',
  'models/BeneficiaryManagement/Achievement.js',
  'models/BeneficiaryManagement/AttendanceRecord.js',
  'models/BeneficiaryManagement/CounselingSession.js',
  'models/BeneficiaryManagement/FinancialSupport.js',
  'models/BeneficiaryManagement/Scholarship.js',
  'models/BeneficiaryManagement/SkillsDevelopment.js',
  'models/BeneficiaryManagement/SupportPlan.js',
  'models/BeneficiaryVoiceLog.js',
  // W494 ratchet wave 3: 3 Cdss* + ClinicalRule + CpdRecord (-5)
  // W494 ratchet wave 4: CommunityActivity + ComplianceMetric +
  //   CourseEnrollment + CourseModule + CrisisIncident (-5)
  'models/ComplaintEnhanced.js',
  // W494 ratchet wave 1: Webhook + EmailPreference + CrmCampaign (-3)
  // W494 ratchet wave 2: 5 Crm* models (CrmLead/Partner/Referral/Segment/Survey)
  //   — all single uuid-fill hooks, trivial async conversion.
  'models/CulturalProfile.js',
  'models/DecisionRightsAssessment.js',
  'models/Delegation.js',
  'models/DifferentialDiagnosis.js',
  // (CrmCampaign + Webhook + EmailPreference removed — see W494 ratchet)
  'models/DisabilityProgram.js',
  'models/DisabilitySession.js',
  'models/DiscussionForum.js',
  'models/DrugLibrary.js',
  'models/ESignature.js',
  'models/EStamp.js',
  'models/ElearningCourse.js',
  'models/ElearningQuiz.js',
  'models/EmergencyPlan.js',
  'models/EnterpriseRisk.js',
  'models/EventParticipation.js',
  'models/Exam.js',
  'models/FamilyCounsellingSession.js',
  'models/FinancialTransaction.js',
  'models/ForumReply.js',
  'models/Goal.js',
  'models/HikvisionRawEvent.js',
  'models/ImportExportJob.js',
  'models/ImportExportTemplate.js',
  'models/Incident.js',
  'models/InsuranceTariff.js',
  'models/LearningPath.js',
  'models/MDTCoordination.js',
  'models/Maintenance.js',
  'models/MaintenancePrediction.js',
  'models/ModuleProgress.js',
  'models/ParentChatbotSession.js',
  'models/PaymentVoucher.js',
  'models/PrescriptionValidation.js',
  'models/Product.js',
  'models/Productivity/UserPreferences.js',
  'models/QuizAttempt.js',
  'models/QuizQuestion.js',
  'models/RehabPlanSuggestion.js',
  'models/RiskAssessment.js',
  'models/Schedule.js',
  'models/SiblingAdjustmentRecord.js',
  'models/SmartIRP.js',
  'models/TaxFiling.js',
  'models/TrainerEvaluation.js',
  'models/TrainingCompliance.js',
  'models/WaitlistEntry.js',
  'models/WebhookDelivery.js',
  'models/auditLog.model.js',
  'models/clinical-assessment/caregiver-burden-assessment.model.js',
  'models/clinical-assessment/mchat-assessment.model.js',
  'models/clinical-assessment/quality-of-life-assessment.model.js',
  'models/conversation.model.js',
  'models/disability-assessment.model.js',
  'models/ecommerce.models.js',
  'models/emr.model.js',
  'models/gratuity.model.js',
  'models/pharmacy.model.js',
  // W503: CapaItem converted to async style — unblocks auto-CAPA on major equity disparity.
  'models/quality/Risk.model.js',
  'models/rehabilitation/Program.js',
  'models/reports/ReportSchedule.js',
  'privacy/consent.model.js',
  'privacy/data-subject-request.model.js',
  'services/whatsapp/templateSync.service.js',
]);

function listSchemaFiles(roots) {
  const out = [];
  function walk(d) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return; // dir may not exist (e.g. fresh checkout missing one of SCAN_DIRS)
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIR_NAMES.has(e.name)) continue;
        walk(full);
      } else if (e.isFile() && e.name.endsWith('.js')) {
        out.push(full);
      }
    }
  }
  for (const root of roots) walk(root);
  return out;
}

// Classify a hook by signature:
//   async-no-next      — `async function ()`              SAFE
//   async-with-next    — `async function (next)`          INCONSISTENT but harmless
//   callback           — `function (next)` + body calls `next(...)`  DANGEROUS when mixed w/ async
//   sync-no-next       — `function ()`                    SAFE (Mongoose handles)
// Returns one of: 'async' | 'callback' | 'sync'
function classifyHook(isAsync, params, bodyAhead) {
  const paramsTrim = params.trim();
  const hasNext = /\bnext\b/.test(paramsTrim);
  if (isAsync) return 'async';
  if (!hasNext) return 'sync';
  // sync with `next` param — check if body actually calls next(). If it
  // does, it's the dangerous callback style. If it doesn't, treat as sync.
  if (/\bnext\s*\(/.test(bodyAhead)) return 'callback';
  return 'sync';
}

// Classify hooks in a single file. Returns:
//   - mixed: groups where async + callback coexist on same event (W483)
//   - callbackOnly: hooks using pure callback style (W494 — broken under Mongoose 9)
function classifyFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const hooks = [];
  let m;
  HOOK_RE.lastIndex = 0;
  while ((m = HOOK_RE.exec(src)) !== null) {
    const [, schemaName, when, event, asyncKw, params] = m;
    const bodyAhead = src.slice(m.index + m[0].length, m.index + m[0].length + 600);
    const style = classifyHook(!!asyncKw, params, bodyAhead);
    hooks.push({ schemaName, when, event, style, line: lineOf(src, m.index) });
  }
  return hooks;
}

function analyze(file) {
  const hooks = classifyFile(file);
  // Group by (schema, when, event) and check for mixed callback ↔ async
  const groups = {};
  for (const h of hooks) {
    const key = `${h.schemaName}.${h.when}('${h.event}')`;
    (groups[key] ||= []).push(h);
  }
  const drift = [];
  for (const [key, list] of Object.entries(groups)) {
    if (list.length < 2) continue;
    const styles = new Set(list.map(h => h.style));
    if (styles.has('async') && styles.has('callback')) {
      drift.push({
        file: path.relative(path.resolve(__dirname, '..'), file),
        key,
        hooks: list.map(h => ({ line: h.line, style: h.style })),
      });
    }
  }
  return drift;
}

// W494 (Mongoose 9): even PURE callback-style hooks fail because Kareem
// dispatches every hook chain via Promise adapters now. `function(next)
// { next() }` throws `TypeError: next is not a function` on every
// .save(). Memory: feedback_mongoose_9_pre_save_callback_silent_break.
// Returns true if the file has ANY callback-style hook (regardless of
// siblings or event). Returns false if all hooks are async or sync.
function hasCallbackHook(file) {
  return classifyFile(file).some(h => h.style === 'callback');
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

function main() {
  const files = listSchemaFiles(SCAN_DIRS);
  const allDrift = [];
  const currentCallbackFiles = new Set();
  for (const f of files) {
    const d = analyze(f);
    if (d.length) allDrift.push(...d);
    if (hasCallbackHook(f)) {
      const rel = path.relative(path.resolve(__dirname, '..'), f).split(path.sep).join('/');
      currentCallbackFiles.add(rel);
    }
  }

  // W494 ratchet-DOWN diff
  const newCallback = [...currentCallbackFiles]
    .filter(f => !KNOWN_CALLBACK_HOOK_BASELINE.has(f))
    .sort();
  const staleBaseline = [...KNOWN_CALLBACK_HOOK_BASELINE]
    .filter(f => !currentCallbackFiles.has(f))
    .sort();

  const totalFailures = allDrift.length + newCallback.length + staleBaseline.length;

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          scanned: files.length,
          mixedStyleDrift: allDrift,
          newCallbackFiles: newCallback,
          staleBaselineEntries: staleBaseline,
          callbackBaselineSize: KNOWN_CALLBACK_HOOK_BASELINE.size,
          currentCallbackFileCount: currentCallbackFiles.size,
        },
        null,
        2
      ) + '\n'
    );
  } else {
    console.log(`Scanned ${files.length} model files.`);
    if (totalFailures === 0) {
      console.log('✓ No mixed async/callback hook styles found.');
      console.log(
        `✓ Callback-hook baseline in sync (${currentCallbackFiles.size} files, baseline: ${KNOWN_CALLBACK_HOOK_BASELINE.size}).`
      );
    }
    if (allDrift.length > 0) {
      console.log(
        `✗ ${allDrift.length} mixed-style hook group(s) — TypeError on every save() risk (W483):`
      );
      for (const d of allDrift) {
        console.log(`  ${d.file}: ${d.key}`);
        for (const h of d.hooks) console.log(`    line ${h.line}: ${h.style}`);
      }
      console.log('');
      console.log('Mongoose Kareem dispatches the WHOLE hook chain via Promise adapters');
      console.log('when ANY hook is async — callback siblings receive undefined for `next`.');
      console.log('Fix: convert ALL hooks for that event to async style.');
    }
    if (newCallback.length > 0) {
      console.log(
        `✗ ${newCallback.length} NEW file(s) with callback-style hook — W494 silent break under Mongoose 9:`
      );
      for (const f of newCallback) console.log(`  + ${f}`);
      console.log('');
      console.log('Under Mongoose 9, ALL `function(next) { next() }` hooks throw');
      console.log('`TypeError: next is not a function` on every .save() call. Fix:');
      console.log('  pre("save", async function () { … this.x = 1 … })');
      console.log('See memory: feedback_mongoose_9_pre_save_callback_silent_break.');
    }
    if (staleBaseline.length > 0) {
      console.log(
        `✗ ${staleBaseline.length} STALE baseline entr(y/ies) — file no longer has callback hooks:`
      );
      for (const f of staleBaseline) console.log(`  - ${f}`);
      console.log('');
      console.log('Remove these from KNOWN_CALLBACK_HOOK_BASELINE in');
      console.log('scripts/check-mongoose-hook-style.js (ratchet-DOWN per W325c).');
    }
  }
  process.exit(totalFailures === 0 ? 0 : 1);
}

// Pure helpers exported for unit tests (check-mongoose-hook-style-script.test.js).
// Only invoke main() when run as CLI — required-as-module needs the helpers
// without auto-executing the filesystem scan.
module.exports = {
  classifyHook,
  analyze,
  classifyFile,
  hasCallbackHook,
  listSchemaFiles,
  SCAN_DIRS,
  KNOWN_CALLBACK_HOOK_BASELINE,
};

if (require.main === module) {
  main();
}

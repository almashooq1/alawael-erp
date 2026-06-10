#!/usr/bin/env node
/**
 * check-phantom-schema-writes.js — W1189 on-demand audit.
 *
 * Bug class (struck 3× in the forms system alone before W1186 closed it):
 * code writes a literal key in `Model.create({ ... })` that the target
 * schema never declares → Mongoose strict mode SILENTLY DROPS it on save.
 * Examples: `approvalWorkflow` (designed approval chains never persisted),
 * `reviewedAt` pre-declaration (review analytics permanently zero),
 * `metadata` on FormTemplate (catalog provenance lost).
 *
 * What it does (pure source, no DB, no app boot):
 *   1. Index backend/models/*.js → for each file, every `new Schema({...})`
 *      object literal's TOP-LEVEL keys (string-/comment-/template-aware
 *      brace walker, not regex-on-lines).
 *   2. Scan routes/ + services/ for `X.create({ ... })` call sites where X
 *      binds to a models file (`require('.../models/Y')`) or a registered
 *      name (`mongoose.model('Y')` / `safeModel('Y')`).
 *   3. Flag literal keys not declared in ANY schema of the bound model file
 *      (plus always-allowed: _id, __v, createdAt, updatedAt).
 *
 * Honest limitations (v1, by design):
 *   - Sites whose first arg isn't an object literal, or that contain a
 *     top-level spread (`...x`), are skipped (counted as `skippedSites`).
 *   - Bindings it can't resolve statically are skipped.
 *   - Computed keys (`[k]:`) are ignored.
 *
 * Exit: 0 clean (or all findings baselined) · 1 new phantom writes / stale
 * baseline · 2 internal error.   Flags: --json · --root=<dir> (tests).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const argRoot = process.argv.find(a => a.startsWith('--root='));
const ROOT = argRoot ? path.resolve(argRoot.slice('--root='.length)) : path.join(__dirname, '..');
const JSON_MODE = process.argv.includes('--json');

// file::model-file-base::key — pre-existing findings to burn down (W325c
// ratchet pattern): new entries must FAIL CI; fixed entries must be removed.
const KNOWN_PHANTOM_WRITES = new Set([
  "routes/admin.routes.js::user::name",
  "routes/admin.routes.js::user::status",
  "routes/budgetManagement.routes.js::budget::totalAmount",
  "routes/budgetManagement.routes.js::budget::spentAmount",
  "routes/budgetManagement.routes.js::budget::lineItems",
  "routes/contracts.routes.js::contract.model::value",
  "routes/documents.smart.routes.js::documentaccesslog::accessedAt",
  "routes/documents.smart.routes.js::document::beneficiaryId",
  "routes/documents.smart.routes.js::documentversion::fileUrl",
  "routes/documents.smart.routes.js::documentversion::changeNote",
  "routes/electronic-directives.routes.js::document::directiveType",
  "routes/electronic-directives.routes.js::document::beneficiaryId",
  "routes/electronic-directives.routes.js::document::content",
  "routes/electronic-directives.routes.js::document::requiredSigners",
  "routes/electronic-directives.routes.js::document::signatureStatus",
  "routes/electronic-directives.routes.js::document::createdBy",
  "routes/electronic-directives.routes.js::document::auditTrail",
  "routes/email-v2.routes.js::communication::channel",
  "routes/email-v2.routes.js::communication::direction",
  "routes/email-v2.routes.js::communication::recipient",
  "routes/email-v2.routes.js::communication::cc",
  "routes/email-v2.routes.js::communication::bcc",
  "routes/email-v2.routes.js::communication::replyTo",
  "routes/email-v2.routes.js::communication::body",
  "routes/email-v2.routes.js::communication::sentAt",
  "routes/email-v2.routes.js::communication::sentBy",
  "routes/employeePortal.routes.js::leaverequest::employee",
  "routes/employeePortal.routes.js::leaverequest::employeeName",
  "routes/employeePortal.routes.js::leaverequest::department",
  "routes/employeePortal.routes.js::leaverequest::totalDays",
  "routes/employeePortal.routes.js::leaverequest::isHalfDay",
  "routes/employeePortal.routes.js::leaverequest::halfDayPeriod",
  "routes/guardianPortal.routes.js::appointment::beneficiaryId",
  "routes/guardianPortal.routes.js::appointment::serviceType",
  "routes/guardianPortal.routes.js::appointment::requestedBy",
  "routes/guardianPortal.routes.js::appointment::requestedByUserId",
  "routes/guardianPortal.routes.js::communication::channel",
  "routes/guardianPortal.routes.js::communication::direction",
  "routes/guardianPortal.routes.js::communication::body",
  "routes/guardianPortal.routes.js::communication::senderId",
  "routes/guardianPortal.routes.js::communication::recipientId",
  "routes/guardianPortal.routes.js::communication::metadata",
  "routes/guardians.routes.js::guardian::name_ar",
  "routes/guardians.routes.js::guardian::name_en",
  "routes/guardians.routes.js::guardian::phone2",
  "routes/guardians.routes.js::guardian::employer",
  "routes/guardians.routes.js::guardian::city",
  "routes/guardians.routes.js::guardian::preferredContactMethod",
  "routes/guardians.routes.js::guardian::preferredLanguage",
  "routes/guardians.routes.js::guardian::canPickup",
  "routes/notifications-module.routes.js::notification::sentBy",
  "routes/riskAssessment.routes.js::riskassessment::title",
  "routes/riskAssessment.routes.js::riskassessment::description",
  "routes/riskAssessment.routes.js::riskassessment::probability",
  "routes/riskAssessment.routes.js::riskassessment::impact",
  "routes/riskAssessment.routes.js::riskassessment::identifiedBy",
  "routes/smartNotificationCenter.routes.js::smartnotification::sentBy",
  "routes/student-certificates.routes.js::document::beneficiaryId",
  "routes/student-certificates.routes.js::document::certificateType",
  "routes/student-certificates.routes.js::document::data",
  "routes/student-certificates.routes.js::document::verificationCode",
  "routes/student-certificates.routes.js::document::issuedAt",
  "routes/student-certificates.routes.js::document::issuedBy",
  "routes/student-complaints.routes.js::communication::channel",
  "routes/student-complaints.routes.js::communication::body",
  "routes/student-complaints.routes.js::communication::direction",
  "routes/student-complaints.routes.js::communication::notes",
  "routes/student-elearning.routes.js::studentactivity::activityType",
  "routes/student-elearning.routes.js::studentactivity::data",
  "routes/student-elearning.routes.js::studentactivity::recordedBy",
  "routes/student-elearning.routes.js::studentactivity::date",
  "routes/student-elearning.routes.js::studentactivity::activityType",
  "routes/student-elearning.routes.js::studentactivity::studentId",
  "routes/student-elearning.routes.js::studentactivity::data",
  "routes/student-elearning.routes.js::studentactivity::recordedBy",
  "routes/student-elearning.routes.js::studentactivity::date",
  "routes/student-elearning.routes.js::studentactivity::activityType",
  "routes/student-elearning.routes.js::studentactivity::studentId",
  "routes/student-elearning.routes.js::studentactivity::data",
  "routes/student-elearning.routes.js::studentactivity::recordedBy",
  "routes/student-elearning.routes.js::studentactivity::date",
  "routes/student-events.routes.js::studentactivity::activityType",
  "routes/student-events.routes.js::studentactivity::data",
  "routes/student-events.routes.js::studentactivity::date",
  "routes/student-events.routes.js::studentactivity::recordedBy",
  "routes/student-rewards-store.routes.js::studentactivity::studentId",
  "routes/student-rewards-store.routes.js::studentactivity::activityType",
  "routes/student-rewards-store.routes.js::studentactivity::points",
  "routes/student-rewards-store.routes.js::studentactivity::reason",
  "routes/student-rewards-store.routes.js::studentactivity::recordedBy",
  "routes/student-rewards-store.routes.js::studentactivity::date",
  "routes/student-rewards-store.routes.js::studentactivity::activityType",
  "routes/student-rewards-store.routes.js::studentactivity::data",
  "routes/student-rewards-store.routes.js::studentactivity::recordedBy",
  "routes/student-rewards-store.routes.js::studentactivity::date",
  "routes/student-rewards-store.routes.js::studentactivity::studentId",
  "routes/student-rewards-store.routes.js::studentactivity::activityType",
  "routes/student-rewards-store.routes.js::studentactivity::points",
  "routes/student-rewards-store.routes.js::studentactivity::reason",
  "routes/student-rewards-store.routes.js::studentactivity::data",
  "routes/student-rewards-store.routes.js::studentactivity::recordedBy",
  "routes/student-rewards-store.routes.js::studentactivity::date",
  "routes/student-rewards-store.routes.js::studentactivity::studentId",
  "routes/student-rewards-store.routes.js::studentactivity::activityType",
  "routes/student-rewards-store.routes.js::studentactivity::data",
  "routes/student-rewards-store.routes.js::studentactivity::reason",
  "routes/student-rewards-store.routes.js::studentactivity::recordedBy",
  "routes/student-rewards-store.routes.js::studentactivity::date",
  "routes/user-management.routes.js::user::branch",
  "routes/waitlist.routes.js::beneficiary::branch",
  "routes/waitlist.routes.js::beneficiary::fileNumber",
  "routes/waitlist.routes.js::beneficiary::disabilityType",
  "routes/waitlist.routes.js::beneficiary::disabilitySeverity",
  "routes/waitlist.routes.js::beneficiary::referralSource",
  "services/BeneficiaryService.js::beneficiarytransfer::beneficiary",
  "services/BeneficiaryService.js::beneficiarytransfer::fromBranch",
  "services/BeneficiaryService.js::beneficiarytransfer::toBranch",
  "services/smartInsurance.service.js::insuranceclaim::claimUuid",
  "services/smartInsurance.service.js::insuranceclaim::policyId",
  "services/smartInsurance.service.js::insuranceclaim::insuranceCompanyId",
  "services/smartInsurance.service.js::insuranceclaim::serviceSessionId",
  "services/smartInsurance.service.js::insuranceclaim::billedAmount",
  "services/smartInsurance.service.js::insuranceclaim::diagnosisCodes",
  "services/smartInsurance.service.js::insuranceclaim::procedureCodes",
  "services/smartInsurance.service.js::insuranceclaim::lineItems",
  "services/smartInsurance.service.js::insuranceclaim::priorAuthId",
  "services/smartInsurance.service.js::insuranceclaim::createdBy",
]);

const ALWAYS_ALLOWED = new Set([
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  // injected by shared plugins/middleware at schema-compile time — invisible
  // to per-file static analysis (e.g. hrBranchScope.plugin adds branchId):
  'branchId',
  'tenantId',
  'organizationId',
  'deleted_at',
  'isDeleted',
]);

// ─── string/comment/template-aware scanner ──────────────────────────────────

/**
 * Walk src starting at the index of an opening `{` and return
 * { keys: [...top-level keys], end, hasSpread } — or null when unbalanced.
 */
function scanObjectLiteral(src, openIdx) {
  if (src[openIdx] !== '{') return null;
  const keys = [];
  let hasSpread = false;
  let depth = 0;
  let i = openIdx;
  let state = 'code'; // code | line | block | sq | dq | tpl
  const tplStack = [];
  let expectKey = true; // at depth 1, before `:` of the current property

  const isIdentChar = c => /[A-Za-z0-9_$]/.test(c);

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (state === 'line') {
      if (c === '\n') state = 'code';
      i += 1;
      continue;
    }
    if (state === 'block') {
      if (c === '*' && next === '/') {
        state = 'code';
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (state === 'sq' || state === 'dq') {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if ((state === 'sq' && c === "'") || (state === 'dq' && c === '"')) state = 'code';
      i += 1;
      continue;
    }
    if (state === 'tpl') {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '`') {
        state = 'code';
        i += 1;
        continue;
      }
      if (c === '$' && next === '{') {
        tplStack.push(depth);
        state = 'code';
        depth += 1; // the ${ acts as an opener
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    // state === 'code'
    if (c === '/' && next === '/') {
      state = 'line';
      i += 2;
      continue;
    }
    if (c === '/' && next === '*') {
      state = 'block';
      i += 2;
      continue;
    }

    // Key-position handling MUST run before the generic string transitions,
    // or quoted keys get consumed as plain strings and never recorded.
    if (depth === 1 && expectKey) {
      if (c === '.' && next === '.' && src[i + 2] === '.') {
        hasSpread = true;
        expectKey = false;
        i += 3;
        continue;
      }
      if (c === "'" || c === '"') {
        const quote = c;
        let j = i + 1;
        let key = '';
        while (j < src.length && src[j] !== quote) {
          if (src[j] === '\\') j += 1;
          else key += src[j];
          j += 1;
        }
        let k = j + 1;
        while (k < src.length && /\s/.test(src[k])) k += 1;
        if (src[k] === ':') {
          keys.push(key);
          expectKey = false;
          i = k + 1;
          continue;
        }
        i = j + 1;
        continue;
      }
      if (isIdentChar(c)) {
        let j = i;
        while (j < src.length && isIdentChar(src[j])) j += 1;
        const word = src.slice(i, j);
        let k = j;
        while (k < src.length && /\s/.test(src[k])) k += 1;
        if (src[k] === ':') {
          keys.push(word);
          expectKey = false;
          i = k + 1;
          continue;
        }
        // shorthand `{ data, }` — the property name IS the key
        if (src[k] === ',' || src[k] === '}') {
          keys.push(word);
          expectKey = false;
          i = j;
          continue;
        }
        expectKey = false;
        i = j;
        continue;
      }
    }

    if (c === "'") {
      state = 'sq';
      i += 1;
      continue;
    }
    if (c === '"') {
      state = 'dq';
      i += 1;
      continue;
    }
    if (c === '`') {
      state = 'tpl';
      i += 1;
      continue;
    }

    if (c === '{' || c === '(' || c === '[') {
      depth += 1;
      if (c === '{' && depth === 1) expectKey = true;
      i += 1;
      continue;
    }
    if (c === '}' || c === ')' || c === ']') {
      if (c === '}' && tplStack.length && tplStack[tplStack.length - 1] === depth - 1) {
        tplStack.pop();
        depth -= 1;
        state = 'tpl';
        i += 1;
        continue;
      }
      depth -= 1;
      if (depth === 0) return { keys, end: i, hasSpread };
      i += 1;
      continue;
    }

    if (depth === 1 && c === ',') {
      expectKey = true;
      i += 1;
      continue;
    }
    i += 1;
  }
  return null; // unbalanced
}

/**
 * Find every schema-definition object literal in a model source:
 *   1. `new [mongoose.]Schema({ ... })` inline literals
 *   2. `new [mongoose.]Schema(someVar)` → resolve `someVar = { ... }` in-file
 *   3. `<schemaVar>.add({ ... })` additive fields
 * Returns key sets; a file that uses NONE of these shapes yields [] and the
 * model is excluded from verification (conservative — no false positives).
 */
function extractSchemaKeySets(src) {
  const sets = [];
  const re = /new\s+(?:mongoose\.)?Schema\s*\(\s*/g;
  let sawIndirect = false;
  let m;
  while ((m = re.exec(src))) {
    const i = m.index + m[0].length;
    if (src[i] === '{') {
      const obj = scanObjectLiteral(src, i);
      if (obj && obj.keys.length > 0) sets.push(obj.keys);
      continue;
    }
    // `new Schema(definitionVar, ...)` — resolve the in-file literal
    const idM = /^([A-Za-z_$][\w$]*)/.exec(src.slice(i, i + 80));
    if (idM) {
      const defRe = new RegExp(
        `(?:const|let|var)\\s+${idM[1].replace(/\$/g, '\\$')}\\s*=\\s*`,
        'g'
      );
      const dm = defRe.exec(src);
      if (dm) {
        let j = dm.index + dm[0].length;
        while (j < src.length && /\s/.test(src[j])) j += 1;
        if (src[j] === '{') {
          const obj = scanObjectLiteral(src, j);
          if (obj && obj.keys.length > 0) {
            sets.push(obj.keys);
            continue;
          }
        }
      }
      sawIndirect = true; // unresolvable definition var — poison the file
    }
  }
  // schema.add({ ... }) additive declarations
  const addRe = /\.add\s*\(\s*\{/g;
  while ((m = addRe.exec(src))) {
    const obj = scanObjectLiteral(src, m.index + m[0].length - 1);
    if (obj && obj.keys.length > 0) sets.push(obj.keys);
  }
  // If ANY schema in the file came from an unresolvable variable, the union
  // is incomplete → verifying against it would flood false positives.
  if (sawIndirect) return [];
  return sets;
}

// ─── repo walking ────────────────────────────────────────────────────────────

function listJsFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.js') && !e.name.endsWith('.test.js')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function buildModelIndex(modelsDir) {
  // modelFileBase (no ext, lowercased) → Set(union of declared keys across
  // every schema in the file) — union keeps sub-schema fields legal, which
  // trades a little recall for near-zero false positives. Same-basename
  // collisions across subfolders also UNION (never overwrite) — and a file
  // whose schemas were unresolvable POISONS the base (deleted from index)
  // so partial key sets can't flood false positives.
  const index = new Map();
  const poisoned = new Set();
  for (const file of listJsFiles(modelsDir)) {
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const base = path.basename(file, '.js').toLowerCase();
    const sets = extractSchemaKeySets(src);
    if (sets.length === 0) {
      // No parseable schema. If the file LOOKS like it defines one (mentions
      // Schema), poison the base; pure re-export shims don't poison.
      if (/\bSchema\s*\(/.test(src)) poisoned.add(base);
      continue;
    }
    const union = index.get(base) || new Set();
    for (const keys of sets) for (const k of keys) union.add(k);
    index.set(base, union);
  }
  for (const base of poisoned) index.delete(base);
  return index;
}

/** Resolve `X` → model file base, from require/model-lookup bindings. */
function buildBindings(src) {
  const bindings = new Map(); // varName → modelFileBase(lowercase)
  let m;
  // models live in subfolders too (models/HR/..., models/tools/...) — bind to
  // the LAST path segment, which is what the model index is keyed by.
  const reqRe =
    /(?:const|let|var)\s+(\w+)\s*=\s*require\(\s*['"][^'"]*\/models\/(?:[\w.-]+\/)*([\w.-]+?)(?:\.js)?['"]\s*\)/g;
  while ((m = reqRe.exec(src))) bindings.set(m[1], m[2].toLowerCase());
  const lookupRe = /(?:const|let|var)\s+(\w+)\s*=\s*(?:mongoose\.model|safeModel)\(\s*['"](\w+)['"]\s*\)/g;
  while ((m = lookupRe.exec(src))) bindings.set(m[1], m[2].toLowerCase());
  return bindings;
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

function scanRepo({ root = ROOT, baseline } = {}) {
  // The embedded baseline describes THIS repo's files — applying it to a
  // custom --root (test fixtures) would mark every entry stale and fail.
  const effectiveBaseline =
    baseline ||
    (path.resolve(root) === path.resolve(path.join(__dirname, '..'))
      ? KNOWN_PHANTOM_WRITES
      : new Set());
  const modelIndex = buildModelIndex(path.join(root, 'models'));
  const findings = [];
  let scannedSites = 0;
  let skippedSites = 0;

  const targets = [...listJsFiles(path.join(root, 'routes')), ...listJsFiles(path.join(root, 'services'))];
  for (const file of targets) {
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const bindings = buildBindings(src);
    if (bindings.size === 0) continue;
    const createRe = /\b(\w+)\.create\s*\(/g;
    let m;
    while ((m = createRe.exec(src))) {
      const varName = m[1];
      const base = bindings.get(varName);
      if (!base) continue;
      const declared = modelIndex.get(base);
      if (!declared) continue; // model file unparsable / not in models/
      let i = m.index + m[0].length;
      while (i < src.length && /\s/.test(src[i])) i += 1;
      if (src[i] !== '{') {
        skippedSites += 1;
        continue;
      }
      const obj = scanObjectLiteral(src, i);
      if (!obj || obj.hasSpread) {
        skippedSites += 1;
        continue;
      }
      scannedSites += 1;
      const unknown = obj.keys.filter(k => !declared.has(k) && !ALWAYS_ALLOWED.has(k));
      for (const key of unknown) {
        findings.push({
          file: path.relative(root, file).replace(/\\/g, '/'),
          line: lineOf(src, m.index),
          model: base,
          key,
          id: `${path.relative(root, file).replace(/\\/g, '/')}::${base}::${key}`,
        });
      }
    }
  }

  const newFindings = findings.filter(f => !effectiveBaseline.has(f.id));
  const currentIds = new Set(findings.map(f => f.id));
  const staleBaseline = [...effectiveBaseline].filter(id => !currentIds.has(id));

  return {
    modelsIndexed: modelIndex.size,
    scannedSites,
    skippedSites,
    findings,
    newFindings,
    staleBaseline,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function main() {
  const r = scanRepo({ root: ROOT });
  const fail = r.newFindings.length > 0 || r.staleBaseline.length > 0;
  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          modelsIndexed: r.modelsIndexed,
          scannedSites: r.scannedSites,
          skippedSites: r.skippedSites,
          newFindings: r.newFindings,
          staleBaseline: r.staleBaseline,
          baselineSize: KNOWN_PHANTOM_WRITES.size,
        },
        null,
        2
      ) + '\n'
    );
  } else {
    process.stdout.write(
      `check-phantom-schema-writes — models indexed: ${r.modelsIndexed}, create-sites verified: ${r.scannedSites} (skipped ${r.skippedSites})\n`
    );
    for (const f of r.newFindings) {
      process.stdout.write(`  ✗ ${f.file}:${f.line} — ${f.model}.create() writes undeclared key '${f.key}'\n`);
    }
    for (const id of r.staleBaseline) {
      process.stdout.write(`  ⚠ stale baseline entry (fixed — remove from KNOWN_PHANTOM_WRITES): ${id}\n`);
    }
    if (!fail) process.stdout.write('  ✓ no phantom schema writes detected\n');
  }
  process.exit(fail ? 1 : 0);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`[check-phantom-schema-writes] ERROR: ${err.stack || err.message}\n`);
    process.exit(2);
  }
}

module.exports = { scanObjectLiteral, extractSchemaKeySets, buildBindings, scanRepo };

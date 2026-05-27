/**
 * W507 — close mass-assignment via raw req.body in Mongoose CREATE
 * calls (sibling of W506 which closed UPDATE calls).
 *
 * Pattern found across 22 route files (34 call sites):
 *
 *   await Model.create(req.body, ...)
 *   await Model.insertMany(req.body, ...)
 *   const doc = new Model(req.body)   ; await doc.save()
 *
 * What raw req.body in CREATE lets an attacker do:
 *
 *   1. Pre-seed server-controlled meta: createdBy / createdAt /
 *      _id (mostly no-op for ObjectId but some models use string
 *      _id and would accept attacker-provided values).
 *
 *   2. Inject privileged fields on Models that carry role /
 *      isAdmin / permissions columns (some non-User actor-history
 *      models still do).
 *
 *   3. Pre-seed cross-tenant branchId — the doc gets persisted in
 *      ANOTHER tenant from the start, evading branchFilter on
 *      every subsequent read by callers of the original branch.
 *
 *   4. Prototype pollution via __proto__ injection.
 *
 *   5. Bypass any server-side defaults — e.g. status='pending'
 *      that an attacker overrides to status='approved' on a
 *      privileged-workflow document.
 *
 * Fix: wrap with `stripUpdateMeta(req.body)`. Same deny-list as
 * W506: _id / __v / id / createdBy / createdAt / updatedAt / role /
 * roles / isAdmin / isSuperAdmin / permissions / password /
 * passwordHash / __proto__ / constructor / prototype.
 *
 * Highest-impact files in W507 batch:
 *   - emr.routes.js — Lab results (PHI).
 *   - icf-assessments.routes.js — Clinical assessments (PHI).
 *   - payroll.routes.js — CompensationStructure / IndividualIncentive /
 *     PerformancePenalty / BenefitsSummary (financial).
 *   - branches.routes.js — Branch creation (tenant boundary).
 *   - quality.js — Accreditation + QualityIndicator records.
 *   - montessori.js — Student / Plan / Session / Evaluation /
 *     Activity / TeamMember / Parent / MediaFile / Report (9 sites
 *     across the montessori day-care surface).
 *
 * Drift guard: this test scans backend/routes/ for any call to
 * Model.create / Model.insertMany / new Model() whose first arg is
 * bare `req.body` (no stripUpdateMeta wrap). Depth-aware parser
 * tolerates nested-paren payloads; block + line comments stripped
 * to avoid doc-comment false positives.
 *
 * Service-layer calls (`await svc.create(req.body, actor)`) are
 * NOT in scope — that's the service layer's responsibility.
 * Only direct Mongoose create calls in route files.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');

function walkJs(root, results = []) {
  if (!fs.existsSync(root)) return results;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (
      entry.name === '_archived' ||
      entry.name === '__pycache__' ||
      entry.name === 'node_modules'
    ) {
      continue;
    }
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walkJs(full, results);
    else if (entry.isFile() && entry.name.endsWith('.js')) results.push(full);
  }
  return results;
}

function extractArgs(src, openParenIdx) {
  let depth = 0;
  let i = openParenIdx;
  let inStr = null;
  const args = [];
  let argStart = openParenIdx + 1;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      depth--;
      if (depth === 0 && c === ')') {
        args.push(src.slice(argStart, i).trim());
        return args;
      }
    } else if (c === ',' && depth === 1) {
      args.push(src.slice(argStart, i).trim());
      argStart = i + 1;
    }
  }
  return null;
}

function findOffenders(src) {
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(l => l.replace(/\/\/.*$/, ''))
    .join('\n');
  const offenders = [];

  // Model.create( and Model.insertMany( — capture identifier first
  // so we know it's a Mongoose-shape call (PascalCase or camelCase
  // service var both qualify here; the test is the FIRST argument).
  const dotMethodRe = /\b[A-Za-z_$][\w$]*\.(create|insertMany)\s*\(/g;
  let m;
  while ((m = dotMethodRe.exec(code)) !== null) {
    const openIdx = m.index + m[0].length - 1;
    const args = extractArgs(code, openIdx);
    if (!args) continue;
    if (args.length >= 1 && args[0] === 'req.body') {
      offenders.push({ shape: m[1], lineNo: code.slice(0, openIdx).split('\n').length });
    }
  }

  // new Model(req.body) — PascalCase identifier
  const newRe = /\bnew\s+([A-Z][\w$]*)\s*\(/g;
  while ((m = newRe.exec(code)) !== null) {
    const openIdx = m.index + m[0].length - 1;
    const args = extractArgs(code, openIdx);
    if (!args) continue;
    if (args.length === 1 && args[0] === 'req.body') {
      offenders.push({ shape: 'new ' + m[1], lineNo: code.slice(0, openIdx).split('\n').length });
    }
  }

  return offenders;
}

describe('W507 — no raw req.body in Mongoose CREATE / new Model() calls', () => {
  const files = walkJs(ROUTES_DIR);

  const fileOffenders = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const offs = findOffenders(src);
    if (offs.length > 0) {
      const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
      fileOffenders.push({ file: rel, offenders: offs });
    }
  }

  test('no route file passes bare `req.body` to Model.create / new Model() / Model.insertMany', () => {
    expect(fileOffenders).toEqual([]);
  });

  test('PHI-critical files wrapped: emr.routes.js + icf-assessments.routes.js', () => {
    for (const rel of ['emr.routes.js', 'icf-assessments.routes.js']) {
      const file = path.join(ROUTES_DIR, rel);
      const src = fs.readFileSync(file, 'utf8');
      expect(src).toMatch(/stripUpdateMeta\(req\.body\)/);
    }
  });

  test('payroll.routes.js wraps all 4 financial-model construction sites', () => {
    const file = path.join(ROUTES_DIR, 'payroll.routes.js');
    const src = fs.readFileSync(file, 'utf8');
    const wraps = (src.match(/stripUpdateMeta\(req\.body\)/g) || []).length;
    expect(wraps).toBeGreaterThanOrEqual(4);
  });

  test('montessori.js wraps all 9 day-care construction sites', () => {
    const file = path.join(ROUTES_DIR, 'montessori.js');
    const src = fs.readFileSync(file, 'utf8');
    const wraps = (src.match(/stripUpdateMeta\(req\.body\)/g) || []).length;
    expect(wraps).toBeGreaterThanOrEqual(9);
  });
});

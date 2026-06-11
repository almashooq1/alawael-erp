/**
 * W1178 — Raw req.body persistence ratchet (domains/ layer)
 *
 * الثغرة: تمرير req.body خاماً إلى create/new Model/findByIdAndUpdate يسمح
 * بحقن حقول ملكية (branchId / beneficiaryId / createdBy) — مستخدم مقيّد بفرع
 * يستطيع إنشاء سجل في فرع أجنبي أو نقل سجل لفرع/مستفيد آخر.
 *
 * الإصلاحات في W1178:
 *   - goals POST /goals          → new TherapeuticGoal({ ...req.body, branchId: pinned })
 *   - goals PUT  /goals/:goalId  → strip { branchId, beneficiaryId } before findByIdAndUpdate
 *   - hr    POST /employees      → hr.employee.create({ ...req.body, branchId: pinned })
 *
 * استثناءات موثّقة (baseline):
 *   - security-rbac roles/permissions create — خلف router.use(requireAdmin) (W1166)،
 *     وكائنات RBAC عالمية بلا branchId أصلاً.
 *
 * Ratchet: أي موقع raw-body جديد في domains/ يُفشل CI ما لم يُضف للـbaseline
 * مع تبرير موثّق، وأي إدخال baseline لم يعد موجوداً في المصدر يُفشل CI أيضاً.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DOMAINS_DIR = path.join(__dirname, '..', 'domains');

// ─── Documented exclusions ───────────────────────────────────────────────────
// "<relative path>:<pattern snippet>" → justification
const KNOWN_RAW_BODY_BASELINE = new Map([
  [
    'security/routes/security-rbac.routes.js:sec.roles.create(req.body)',
    'admin-gated (W1166 requireAdmin) — global RBAC object, no branchId field',
  ],
  [
    'security/routes/security-rbac.routes.js:sec.permissions.create(req.body)',
    'admin-gated (W1166 requireAdmin) — global RBAC object, no branchId field',
  ],
]);

const RAW_BODY_PATTERNS = [
  /new\s+[A-Z]\w+\(\s*req\.body\s*\)/g,
  /[\w.]+\.create\(\s*req\.body\s*\)/g,
  /findByIdAndUpdate\(\s*[^,]+,\s*req\.body\s*[,)]/g,
  /Object\.assign\(\s*\w+\s*,\s*req\.body\s*[,)]/g,
];

function listRouteFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listRouteFiles(full));
    else if (entry.name.endsWith('.routes.js')) out.push(full);
  }
  return out;
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function findRawBodySites(src) {
  const cleaned = stripComments(src);
  const hits = [];
  for (const pattern of RAW_BODY_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(cleaned)) !== null) {
      hits.push(m[0].replace(/\s+/g, ''));
    }
  }
  return hits;
}

describe('W1178 — raw req.body persistence ratchet across domains/', () => {
  const routeFiles = listRouteFiles(DOMAINS_DIR);

  test('sanity — domains route files discovered', () => {
    expect(routeFiles.length).toBeGreaterThan(10);
  });

  test('no raw req.body persistence outside the documented baseline', () => {
    const violations = [];
    const seenBaselineKeys = new Set();

    for (const file of routeFiles) {
      const rel = path.relative(DOMAINS_DIR, file).replace(/\\/g, '/');
      const hits = findRawBodySites(fs.readFileSync(file, 'utf8'));
      for (const hit of hits) {
        const key = `${rel}:${hit}`;
        if (KNOWN_RAW_BODY_BASELINE.has(key)) {
          seenBaselineKeys.add(key);
        } else {
          violations.push(key);
        }
      }
    }

    expect(violations).toEqual([]);

    // ratchet-down: stale baseline entries must be pruned in the same commit
    const stale = [...KNOWN_RAW_BODY_BASELINE.keys()].filter(
      (k) => !seenBaselineKeys.has(k)
    );
    expect(stale).toEqual([]);
  });
});

describe('W1178 — fixed routes pin/strip ownership fields', () => {
  const goalsSrc = fs.readFileSync(
    path.join(DOMAINS_DIR, 'goals', 'routes', 'goals.routes.js'),
    'utf8'
  );
  const hrSrc = fs.readFileSync(
    path.join(DOMAINS_DIR, 'hr', 'routes', 'hr.routes.js'),
    'utf8'
  );

  test('goals create spreads req.body THEN conditionally pins branchId', () => {
    expect(goalsSrc).toMatch(
      /new\s+TherapeuticGoal\(\{\s*\.\.\.req\.body,\s*\.\.\.\(createScope\s*\?\s*\{\s*branchId:\s*createScope\s*\}\s*:\s*\{\}\)/
    );
    expect(goalsSrc).not.toMatch(/new\s+TherapeuticGoal\(\s*req\.body\s*\)/);
  });

  test('goals update strips branchId + beneficiaryId before findByIdAndUpdate', () => {
    expect(goalsSrc).toMatch(
      /\{\s*branchId:\s*_branchId,\s*beneficiaryId:\s*_beneficiaryId,\s*\.\.\.safeUpdate\s*\}\s*=\s*req\.body/
    );
    expect(goalsSrc).toMatch(/findByIdAndUpdate\(req\.params\.goalId,\s*safeUpdate/);
    expect(goalsSrc).not.toMatch(/findByIdAndUpdate\(req\.params\.goalId,\s*req\.body/);
  });

  test('hr employee create spreads req.body THEN conditionally pins branchId', () => {
    expect(hrSrc).toMatch(
      /hr\.employee\.create\(\{\s*\.\.\.req\.body,\s*\.\.\.\(createScope\s*\?\s*\{\s*branchId:\s*createScope\s*\}\s*:\s*\{\}\)/
    );
    expect(hrSrc).not.toMatch(/hr\.employee\.create\(\s*req\.body\s*\)/);
  });

  test('both fixed routes derive the pin from effectiveBranchScope(req)', () => {
    for (const src of [goalsSrc, hrSrc]) {
      expect(src).toMatch(/const\s+createScope\s*=\s*effectiveBranchScope\(req\)/);
    }
  });
});

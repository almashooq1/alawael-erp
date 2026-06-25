'use strict';

/**
 * check-beneficiary-branch-isolation-script.test.js — self-test for the W1529
 * pre-push gate. Verifies the pure scan flags/clears the right shapes and that
 * the gate agrees with the repo's clean state (the canonical W440 guard is the
 * authoritative CI backstop).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  scanRoutes,
  countBeneficiaryReads,
} = require('../scripts/check-beneficiary-branch-isolation');

// Build a throwaway backend-like dir with routes/<files>.
function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biso-'));
  fs.mkdirSync(path.join(dir, 'routes'), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, 'routes', name), content);
  }
  return dir;
}

describe('W1529 countBeneficiaryReads (pure)', () => {
  test('counts params + body + FK shapes; ignores none', () => {
    expect(countBeneficiaryReads('req.params.beneficiaryId').total).toBe(1);
    expect(countBeneficiaryReads('const { beneficiaryId } = req.body').total).toBe(1);
    expect(countBeneficiaryReads('req.body.beneficiary_id').total).toBe(1);
    expect(countBeneficiaryReads('req.body.beneficiary)').total).toBe(1);
    expect(countBeneficiaryReads('const x = 1;').total).toBe(0);
    // beneficiaryName must NOT match the FK pattern
    expect(countBeneficiaryReads('req.body.beneficiaryName').total).toBe(0);
  });
});

describe('W1529 scanRoutes', () => {
  test('flags a route reading beneficiaryId from body with NO enforcement', () => {
    const dir = fixture({
      'bad.routes.js': `const r = require('express').Router();
        r.post('/x', (req, res) => { const { beneficiaryId } = req.body; res.json({ beneficiaryId }); });
        module.exports = r;`,
    });
    const offenders = scanRoutes(dir);
    expect(offenders).toHaveLength(1);
    expect(offenders[0].file).toBe('routes/bad.routes.js');
  });

  test('clears a route that applies an enforcement signal', () => {
    const dir = fixture({
      'good.routes.js': `const { enforceBeneficiaryBranch } = require('../middleware/assertBranchMatch');
        const r = require('express').Router();
        r.post('/x', async (req, res) => {
          const { beneficiaryId } = req.body;
          await enforceBeneficiaryBranch(req, beneficiaryId);
          res.json({ beneficiaryId });
        });
        module.exports = r;`,
    });
    expect(scanRoutes(dir)).toEqual([]);
  });

  test('ignores a route with no beneficiary id', () => {
    const dir = fixture({
      'neutral.routes.js': `const r = require('express').Router();
        r.get('/x', (req, res) => res.json({ ok: true }));
        module.exports = r;`,
    });
    expect(scanRoutes(dir)).toEqual([]);
  });

  test('a beneficiaryId mention inside a comment does NOT count', () => {
    const dir = fixture({
      'commented.routes.js': `const r = require('express').Router();
        // legacy: req.body.beneficiaryId was read here; now removed
        r.get('/x', (req, res) => res.json({ ok: true }));
        module.exports = r;`,
    });
    expect(scanRoutes(dir)).toEqual([]);
  });
});

describe('W1529 CLI exit contract', () => {
  const SCRIPT = path.join(__dirname, '../scripts/check-beneficiary-branch-isolation.js');

  test('exits 0 on the real (clean) repo + agrees with the canonical guard', () => {
    // scanRoutes on the real backend must be clean (main passes W440/W441/W442).
    expect(scanRoutes()).toEqual([]);
    const out = execFileSync(process.execPath, [SCRIPT, '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    expect(parsed.ok).toBe(true);
    expect(parsed.offenders).toEqual([]);
  });
});

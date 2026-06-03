'use strict';

/**
 * W813 — ratchet: hollow stub route count must not regress above Phase-0 floor.
 *
 * W768 audit found 39 stubs; W775 de-bloat drove the count to 5 library/fs-backed
 * surfaces that the heuristic misclassified. W813 extends audit signals and
 * locks stubCount at 0 — any new hollow route file fails CI.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const BACKEND = path.join(__dirname, '..');

function runAuditJson() {
  const out = execFileSync(process.execPath, [path.join(BACKEND, 'scripts', 'audit-stub-routes.js'), '--json'], {
    cwd: BACKEND,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(out);
}

describe('W813 stub-audit ratchet', () => {
  it('audit reports zero hollow stubs after W813 signal extensions', () => {
    const { stubCount, stubs } = runAuditJson();
    expect(stubCount).toBe(0);
    expect(stubs).toEqual([]);
  });

  it('W775 intentional surfaces remain mounted (not deleted as hollow)', () => {
    const fs = require('fs');
    const kept = [
      'routes/rehab-measures.routes.js',
      'routes/rehab-templates.routes.js',
      'routes/uploads.routes.js',
      'routes/build-info.routes.js',
      'routes/public-uploads.routes.js',
    ];
    kept.forEach(rel => {
      expect(fs.existsSync(path.join(BACKEND, rel))).toBe(true);
    });
  });
});

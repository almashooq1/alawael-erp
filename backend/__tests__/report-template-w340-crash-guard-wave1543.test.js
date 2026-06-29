/**
 * W1543 — ReportTemplate W340 OverwriteModelError crash-guard.
 *
 * Three files register the model name 'ReportTemplate' with DIFFERENT schemas:
 * models/analytics/ReportTemplate.js, models/ReportTemplate.js, and the canonical
 * models/reports/ReportTemplate.js. The first two used BARE
 * `mongoose.model('ReportTemplate', schema)` (no `models.X ||` guard), so whenever
 * the second one loaded it threw `Cannot overwrite 'ReportTemplate' model once
 * compiled` — crashing whichever consumer required it second (biAnalytics vs
 * domains/reports).
 *
 * This guard locks the `models.X ||` crash-guard on both bare files. It is the
 * runtime-crash fix ONLY — it does NOT pick a canonical schema, so the ADR-023
 * consolidation (and check:no-duplicate-model-registration tracking it) is
 * untouched. Static source read (no mongoose).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const BARE_RE = /module\.exports\s*=\s*mongoose\.model\(\s*'ReportTemplate'\s*,/;
const GUARDED_RE =
  /mongoose\.models\.ReportTemplate\s*\|\|\s*mongoose\.model\(\s*'ReportTemplate'\s*,/;

describe('W1543 — ReportTemplate registrations are crash-guarded (no bare overwrite)', () => {
  test.each([
    'models/analytics/ReportTemplate.js',
    'models/ReportTemplate.js',
    'models/reports/ReportTemplate.js',
  ])('%s registers ReportTemplate with the `models.X ||` guard, never bare', file => {
    const src = read(file);
    expect(src).toMatch(GUARDED_RE);
    expect(src).not.toMatch(BARE_RE);
  });
});

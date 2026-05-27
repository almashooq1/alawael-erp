/**
 * W461 — extend the W423 CSV formula-injection defang to 4 more
 * export routes that shipped with RFC-4180 escaping but NO OWASP
 * formula-injection defang:
 *
 *   routes/measures-outcomes.routes.js     (pairs.csv — beneficiary
 *                                            names from intake)
 *   routes/attendance-admin.routes.js      (attendance export —
 *                                            beneficiary names + notes)
 *   routes/goal-progress-admin.routes.js   (goal-progress export —
 *                                            therapist-written notes +
 *                                            beneficiary names)
 *   routes/measures-workflow.routes.js     (anomalies export — measure
 *                                            metadata + IDs)
 *
 * Attack: a malicious intake user writes `=cmd|'/c calc'!A0` as a
 * beneficiary name (or in a note). When the CSV export is opened in
 * Excel, the formula EXECUTES, which can:
 *   - Exfiltrate the next cell's content via HTTP GET (WEBSERVICE())
 *   - Execute arbitrary commands on the analyst's machine (cmd|... DDE)
 *   - Steal credentials from the analyst's network shares
 *
 * Fix: wire the existing helper from
 * services/importExport/format-helpers.js (W423-era) into each
 * file's CSV-cell escape function so values starting with =, +, -,
 * @, TAB, or CR get prefixed with a single quote (Excel literal-string
 * marker — displays as-is, never executes).
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  'routes/measures-outcomes.routes.js',
  'routes/attendance-admin.routes.js',
  'routes/goal-progress-admin.routes.js',
  'routes/measures-workflow.routes.js',
];

describe('W461 — CSV formula-injection defang on 4 export routes', () => {
  for (const rel of FILES) {
    describe(rel, () => {
      const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

      test('imports escapeFormulaInjection from format-helpers', () => {
        expect(src).toMatch(/escapeFormulaInjection/);
        expect(src).toMatch(/require\(['"]\.\.\/services\/importExport\/format-helpers['"]\)/);
      });

      test('CSV-cell escape function applies formula defang before quote-wrap', () => {
        // The fix shape: the cell-escape helper assigns
        // `const s = _esc(String(v))` BEFORE checking for quotes/commas.
        // Accepts any reasonable alias name for the imported helper.
        expect(src).toMatch(
          /(?:_escapeFormula|_escFormula|_escFormula461|escapeFormulaInjection)\(\s*String\(v\)\s*\)/
        );
      });

      test('module loads without throwing', () => {
        expect(() => require('../' + rel.replace(/\.js$/, ''))).not.toThrow();
      });
    });
  }
});

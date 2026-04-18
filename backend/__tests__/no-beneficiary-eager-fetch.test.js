/**
 * no-beneficiary-eager-load.test.js — regression guard for 4.0.8.
 *
 * 4.0.8 removed 6 instances of `/admin/beneficiaries?limit=100|200`
 * eager-loads and replaced them with BeneficiaryTypeahead (on-demand
 * server-side search). If someone rebuilds a picker from scratch and
 * falls into the same pattern, they silently truncate at the nth
 * kid in the branch — the exact bug 4.0.8 fixed.
 *
 * This test scans frontend/src for the anti-pattern and fails CI if
 * it comes back.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FRONTEND_SRC = path.join(REPO_ROOT, 'frontend/src');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && /\.(jsx?|tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('no eager /admin/beneficiaries?limit= eager-loads in frontend', () => {
  const files = walk(FRONTEND_SRC);

  it('at least one frontend source file was scanned (sanity)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // Known exception — AdminCarePlans keeps the eager-load for the
  // listing-table beneficiaryMap (display-only, separate from the
  // form picker which already uses BeneficiaryTypeahead). Flagged
  // with a TODO in that file; proper fix is backend-side populate.
  const ALLOWED = new Set([path.join('frontend', 'src', 'pages', 'Admin', 'AdminCarePlans.jsx')]);

  it('no NEW file issues GET /admin/beneficiaries?limit=<N>', () => {
    // Specifically match the regression pattern — a limit-qualified
    // beneficiaries fetch. BeneficiaryTypeahead's own internal call
    // to /admin/beneficiaries/search is NOT caught (different path).
    const re = /\/admin\/beneficiaries\?limit=/;
    const violators = files
      .filter(f => re.test(fs.readFileSync(f, 'utf8')))
      .map(f => path.relative(REPO_ROOT, f))
      .filter(rel => !ALLOWED.has(rel));
    if (violators.length) {
      throw new Error(
        'Regression: /admin/beneficiaries?limit=<N> reappeared in:\n  ' +
          violators.join('\n  ') +
          '\n\nUse <BeneficiaryTypeahead> instead (frontend/src/components/BeneficiaryTypeahead.jsx).'
      );
    }
  });
});

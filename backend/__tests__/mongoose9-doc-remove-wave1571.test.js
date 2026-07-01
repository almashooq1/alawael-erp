'use strict';

/**
 * W1571 — Mongoose 9 removed `Document.prototype.remove()` (and subdoc `.remove()`,
 * plus `Model.remove/count/update`, `findByIdAndRemove`, `findOneAndRemove`,
 * `ensureIndex`). Calling any of them throws "X is not a function" — a hard 500.
 *
 * Three live crash sites fixed to `.deleteOne()`:
 *   - controllers/accounting-expense.controller.js  (expense.remove -> deleteOne)
 *   - controllers/accounting-payment.controller.js  (payment.remove -> deleteOne)
 *   - routes/caseManagement.js                       (medicalFiles subdoc .remove -> deleteOne)
 *
 * Left intentionally (NOT bugs): retentionService (tries deleteOne first, remove is a
 * dead defensive fallback) and scheduledWhatsApp (`job.remove()` is a Bull queue job).
 *
 * Guard: (1) runtime — this Mongoose really lacks doc/subdoc `.remove()`; (2) ratchet
 * to zero on the Mongoose-only removed names; (3) the 3 fixed files use `.deleteOne()`.
 */

jest.unmock('mongoose'); // need the real Mongoose to probe removed APIs (no DB connection required)
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BACKEND = path.join(__dirname, '..');

function walk(dir, out) {
  out = out || [];
  let es;
  try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', '.git', 'tests', '__tests__'].includes(e.name)) walk(p, out);
    } else if (e.name.endsWith('.js') && !e.name.endsWith('.test.js')) {
      out.push(p);
    }
  }
  return out;
}
function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}

describe('W1571 no Mongoose-9-removed remove()/count()/update() APIs', () => {
  test('this Mongoose version really lacks doc/subdoc remove() (so the class matters)', () => {
    const child = new mongoose.Schema({ name: String });
    const parent = new mongoose.Schema({ kids: [child] });
    const P = mongoose.model('W1571Probe_' + Date.now(), parent);
    const doc = new P({ kids: [{ name: 'a' }] });
    expect(typeof doc.remove).toBe('undefined');
    expect(typeof doc.kids[0].remove).toBe('undefined');
    expect(typeof doc.deleteOne).toBe('function');
    expect(typeof doc.kids[0].deleteOne).toBe('function');
    expect(typeof P.findByIdAndRemove).toBe('undefined');
    expect(typeof P.ensureIndex).toBe('undefined');
  });

  test('zero calls to Mongoose-only removed names across backend/', () => {
    const re = /\.\s*(findByIdAndRemove|findOneAndRemove|ensureIndex)\s*\(/g;
    const hits = [];
    for (const f of walk(BACKEND, [])) {
      const src = stripComments(fs.readFileSync(f, 'utf8'));
      let m;
      while ((m = re.exec(src))) {
        hits.push(path.relative(BACKEND, f).replace(/\\/g, '/') + ' .' + m[1] + '()');
      }
    }
    expect(hits).toEqual([]);
  });

  test('the 3 fixed delete handlers use deleteOne(), not the removed remove()', () => {
    const cases = [
      ['controllers/accounting-expense.controller.js', /await\s+expense\.deleteOne\(\)/, /await\s+expense\.remove\(\)/],
      ['controllers/accounting-payment.controller.js', /await\s+payment\.deleteOne\(\)/, /await\s+payment\.remove\(\)/],
      ['routes/caseManagement.js', /file\.deleteOne\(\)/, /file\.remove\(\)/],
    ];
    for (const [rel, good, bad] of cases) {
      const src = stripComments(fs.readFileSync(path.join(BACKEND, rel), 'utf8'));
      expect(src).toMatch(good);
      expect(src).not.toMatch(bad);
    }
  });
});

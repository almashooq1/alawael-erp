'use strict';

/**
 * W1565 — Mongoose 9 makes `Types.ObjectId(x)` a hard crash.
 *
 * Under Mongoose 9.x, `mongoose.Types.ObjectId` is a real ES class, so invoking
 * it WITHOUT `new` throws "Class constructor ObjectId cannot be invoked without
 * 'new'" — a 500 on every code path that hits it. The M9 upgrade (~W1221) silently
 * broke 19 such sites across 14 files (aggregation $match casts, model statics,
 * workflow engine, finance/quality/branch services). Two shapes existed:
 *   A) require('mongoose').Types.ObjectId(x)  -> new (require('mongoose').Types.ObjectId)(x)
 *   B) mongoose.Types.ObjectId(x)             -> new mongoose.Types.ObjectId(x)
 * (finance.service had a THIRD, already-broken shape `new require('mongoose').Types
 * .ObjectId(x)` which mis-parses as `(new require('mongoose')).Types...` — folded
 * into shape A.)
 *
 * Guard: (1) runtime — this Mongoose version really does throw without `new`, so the
 * class matters; (2) ratchet-to-zero — no `Types.ObjectId(` call anywhere under
 * backend/ (excluding tests) may lack `new`, and no `new require('mongoose')...`
 * mis-bind may exist.
 */

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

describe('W1565 no ObjectId constructor call without `new` (Mongoose 9 crash)', () => {
  test('this Mongoose version throws when ObjectId is invoked without `new`', () => {
    // if this ever stops throwing (downgrade), the guard is moot but harmless
    expect(() => mongoose.Types.ObjectId('507f1f77bcf86cd799439011')).toThrow();
    expect(new mongoose.Types.ObjectId('507f1f77bcf86cd799439011').toString()).toBe('507f1f77bcf86cd799439011');
  });

  const files = walk(BACKEND, []);
  const offenders = [];
  const misbind = [];
  const callRe = /((?:[A-Za-z_$][\w$]*\s*\.\s*)*)Types\s*\.\s*ObjectId\s*\(/g;

  for (const f of files) {
    const src = stripComments(fs.readFileSync(f, 'utf8'));
    let m;
    while ((m = callRe.exec(src))) {
      const qualifier = m[1] || '';
      if (/Schema\s*\.\s*$/.test(qualifier)) continue; // Schema.Types.ObjectId is a type, not a call
      const pre = src.slice(Math.max(0, m.index - 6), m.index);
      const rel = path.relative(BACKEND, f).replace(/\\/g, '/');
      if (!/new\s+$/.test(pre)) {
        offenders.push(rel + ':' + src.slice(0, m.index).split('\n').length);
      }
    }
    // the mis-bind shape: `new require('mongoose').Types.ObjectId(`
    const mb = /new\s+require\(\s*['"]mongoose['"]\s*\)\s*\.\s*Types\s*\.\s*ObjectId\s*\(/g;
    let mm;
    while ((mm = mb.exec(src))) {
      misbind.push(path.relative(BACKEND, f).replace(/\\/g, '/') + ':' + src.slice(0, mm.index).split('\n').length);
    }
  }

  test('zero `Types.ObjectId(` calls without `new` across backend/', () => {
    expect(offenders).toEqual([]);
  });

  test('zero mis-bound `new require(\'mongoose\').Types.ObjectId(` (needs paren-wrap)', () => {
    expect(misbind).toEqual([]);
  });
});

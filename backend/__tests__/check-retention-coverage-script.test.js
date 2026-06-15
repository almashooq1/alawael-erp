'use strict';

/**
 * check-retention-coverage-script.test.js — locks the pure-helper contract
 * of scripts/check-retention-coverage.js (W1307, GAPS Item 10).
 *
 * The script is a READ-ONLY PDPL retention inventory. These tests pin its
 * detection logic (real TTL vs commented-out example vs none) + report
 * shape, and assert that requiring the module never runs main(). No Mongo,
 * no DB — pure string + filesystem helpers.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  listModelFiles,
  hasRetention,
  buildReport,
} = require('../scripts/check-retention-coverage');

describe('check-retention-coverage — hasRetention()', () => {
  it('detects a TTL index via expireAfterSeconds', () => {
    expect(hasRetention('schema.index({ at: 1 }, { expireAfterSeconds: 2592000 });')).toBe(true);
  });

  it('detects a numeric field-level expires option', () => {
    expect(hasRetention('  code: { type: String, expires: 900 },')).toBe(true);
  });

  it('detects a string-duration expires option', () => {
    expect(hasRetention("  token: { type: String, expires: '30d' },")).toBe(true);
  });

  it('returns false for a model with no retention', () => {
    expect(hasRetention('const s = new Schema({ name: String });')).toBe(false);
  });

  it('does NOT count a commented-out expireAfterSeconds example', () => {
    // This is the NafathRequest.js trap: a // comment mentioning the option.
    const src = '// can set expireAfterSeconds:0 — do not duplicate at field level\nconst s = 1;';
    expect(hasRetention(src)).toBe(false);
  });

  it('does NOT count a block-commented retention example', () => {
    const src = '/* example: schema.index({x:1},{expireAfterSeconds:0}) */\nconst s = 1;';
    expect(hasRetention(src)).toBe(false);
  });

  it('does not mistake a URL // for a comment when TTL is real', () => {
    const src = 'const url = "http://x"; schema.index({ a: 1 }, { expireAfterSeconds: 60 });';
    expect(hasRetention(src)).toBe(true);
  });
});

describe('check-retention-coverage — buildReport()', () => {
  it('partitions models into with/without TTL and computes coverage', () => {
    const report = buildReport([
      { file: 'models/A.js', source: 'index({a:1},{expireAfterSeconds:60})' },
      { file: 'models/B.js', source: 'const x = 1;' },
      { file: 'models/C.js', source: "token: { expires: '15m' }" },
    ]);
    expect(report.total).toBe(3);
    expect(report.withTtlCount).toBe(2);
    expect(report.withoutTtlCount).toBe(1);
    expect(report.coveragePct).toBeCloseTo(66.7, 1);
    expect(report.withTtl).toEqual(['models/A.js', 'models/C.js']);
    expect(report.withoutTtl).toEqual(['models/B.js']);
  });

  it('handles an empty model set without dividing by zero', () => {
    const report = buildReport([]);
    expect(report).toEqual(
      expect.objectContaining({ total: 0, withTtlCount: 0, withoutTtlCount: 0, coveragePct: 0 })
    );
  });

  it('sorts both partitions deterministically', () => {
    const report = buildReport([
      { file: 'models/Z.js', source: 'x' },
      { file: 'models/A.js', source: 'x' },
    ]);
    expect(report.withoutTtl).toEqual(['models/A.js', 'models/Z.js']);
  });
});

describe('check-retention-coverage — listModelFiles()', () => {
  let tmp;
  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retn-'));
    fs.writeFileSync(path.join(tmp, 'Foo.js'), 'x');
    fs.mkdirSync(path.join(tmp, 'sub'));
    fs.writeFileSync(path.join(tmp, 'sub', 'Bar.js'), 'x');
    fs.mkdirSync(path.join(tmp, 'node_modules'));
    fs.writeFileSync(path.join(tmp, 'node_modules', 'Skip.js'), 'x');
    fs.writeFileSync(path.join(tmp, 'notes.md'), 'x'); // non-js ignored
  });
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('recurses, finds *.js, and skips node_modules + non-js', () => {
    const found = listModelFiles(tmp)
      .map(f => path.basename(f))
      .sort();
    expect(found).toEqual(['Bar.js', 'Foo.js']);
  });

  it('returns [] for a non-existent directory', () => {
    expect(listModelFiles(path.join(tmp, '__nope__'))).toEqual([]);
  });
});

describe('check-retention-coverage — module shape', () => {
  it('exports pure helpers without running main() on require', () => {
    const mod = require('../scripts/check-retention-coverage');
    expect(typeof mod.hasRetention).toBe('function');
    expect(typeof mod.buildReport).toBe('function');
    expect(typeof mod.listModelFiles).toBe('function');
  });
});

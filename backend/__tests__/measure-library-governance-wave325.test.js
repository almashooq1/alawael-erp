'use strict';

/**
 * W325 Pass 1 drift guard — Measure Library governance schema shape.
 *
 * Static-analysis guard following the W324 pattern (read source, regex
 * against schema declarations). We deliberately avoid loading Mongoose
 * because backend/jest.setup.js fully mocks the mongoose module — any
 * runtime assertion on `schema.paths[X].instance` returns undefined
 * inside Jest even though the real schema is correct.
 *
 * Asserts MeasurementMaster.model.js declares 5 Pass-1 additive fields
 * with the correct shape:
 *
 *   - abbreviation        (String, trim, maxlength 20, indexed)
 *   - disciplines[]       (8-discipline enum)
 *   - scoreUnits          (9-value enum)
 *   - scoreDirection      (4-value enum)
 *   - lifecycleStatus     (4-value enum, default 'ACTIVE', indexed)
 *
 * Pass 2 will add lifecycleHistory[], the publish/deprecate/retire state
 * machine, and GAS_LINKED / COMPOSITE scoring — this guard extends then.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.join(
  __dirname,
  '..',
  'models',
  'measurement',
  'MeasurementMaster.model.js'
);
const SRC = fs.readFileSync(SOURCE_PATH, 'utf8');

// Extract `<name>: { ... }` field-declaration block, scoped to one brace pair.
function fieldBlock(name) {
  const re = new RegExp(`\\b${name}\\s*:\\s*\\{([^{}]*)\\}`);
  const m = SRC.match(re);
  return m ? m[1] : null;
}

// Extract `<name>: [ { ... } ]` array-of-subdoc declaration.
// Allows the trailing comma between `}` and `]` (the common style in this repo).
function arrayBlock(name) {
  const re = new RegExp(`\\b${name}\\s*:\\s*\\[\\s*\\{([^{}]*)\\}[\\s,]*\\]`);
  const m = SRC.match(re);
  return m ? m[1] : null;
}

describe('W325 Pass 1 measure-library governance fields', () => {
  it('declares `abbreviation` as trimmed indexed String (maxlength 20)', () => {
    const block = fieldBlock('abbreviation');
    expect(block).not.toBeNull();
    expect(block).toMatch(/type\s*:\s*String\b/);
    expect(block).toMatch(/trim\s*:\s*true\b/);
    expect(block).toMatch(/maxlength\s*:\s*20\b/);
    expect(block).toMatch(/index\s*:\s*true\b/);
  });

  it('declares `disciplines` as an Array enum of the 8 disciplines', () => {
    const block = arrayBlock('disciplines');
    expect(block).not.toBeNull();
    expect(block).toMatch(/type\s*:\s*String\b/);
    for (const v of [
      'PT',
      'OT',
      'SLP',
      'PSYCHOLOGY',
      'SPECIAL_ED',
      'SOCIAL_WORK',
      'BEHAVIOR_ANALYSIS',
      'NURSING',
    ]) {
      expect(block).toMatch(new RegExp(`'${v}'`));
    }
  });

  it('declares `scoreUnits` enum with 9 unit values', () => {
    const block = fieldBlock('scoreUnits');
    expect(block).not.toBeNull();
    expect(block).toMatch(/type\s*:\s*String\b/);
    for (const v of [
      'NONE',
      'SECONDS',
      'REPETITIONS',
      'PERCENTAGE',
      'STANDARD_SCORE',
      'T_SCORE',
      'Z_SCORE',
      'AGE_EQUIVALENT',
      'GRADE_EQUIVALENT',
    ]) {
      expect(block).toMatch(new RegExp(`'${v}'`));
    }
  });

  it('declares `scoreDirection` enum with 4 directional values', () => {
    const block = fieldBlock('scoreDirection');
    expect(block).not.toBeNull();
    expect(block).toMatch(/type\s*:\s*String\b/);
    for (const v of ['HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'TARGET_RANGE', 'NEUTRAL']) {
      expect(block).toMatch(new RegExp(`'${v}'`));
    }
  });

  it('declares `lifecycleStatus` enum (4 values) default ACTIVE, indexed', () => {
    const block = fieldBlock('lifecycleStatus');
    expect(block).not.toBeNull();
    expect(block).toMatch(/type\s*:\s*String\b/);
    for (const v of ['DRAFT', 'ACTIVE', 'DEPRECATED', 'RETIRED']) {
      expect(block).toMatch(new RegExp(`'${v}'`));
    }
    expect(block).toMatch(/default\s*:\s*'ACTIVE'/);
    expect(block).toMatch(/index\s*:\s*true\b/);
  });

  it('Pass 1 stays purely additive — no `required: true` on the 5 new fields', () => {
    // None of the 5 governance fields may carry `required: true` in Pass 1;
    // that would break existing documents lacking the field. State-machine
    // and required-on-publish validation land in Pass 2.
    for (const name of ['abbreviation', 'scoreUnits', 'scoreDirection', 'lifecycleStatus']) {
      const block = fieldBlock(name);
      expect(block).not.toBeNull();
      expect(block).not.toMatch(/required\s*:\s*true\b/);
    }
    // disciplines is an array — check its sub-doc block too.
    const arr = arrayBlock('disciplines');
    expect(arr).not.toBeNull();
    expect(arr).not.toMatch(/required\s*:\s*true\b/);
  });

  it('preserves the existing `isActive` boolean for backward compatibility', () => {
    const block = fieldBlock('isActive');
    expect(block).not.toBeNull();
    expect(block).toMatch(/type\s*:\s*Boolean\b/);
    expect(block).toMatch(/default\s*:\s*true\b/);
  });
});

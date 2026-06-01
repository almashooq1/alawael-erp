'use strict';

/**
 * icf-reference-common-wave705.test.js — drift guard for the W705 expansion of
 * the ICF reference catalog (extends the W692/W696 icf /codes work).
 *
 * Locks reference-common.json: ≥50 standard second-level ICF categories, each
 * hierarchically parented (parentCode) to its first-level chapter, bilingual,
 * with zero overlap against generic_brief (the seed merges memberships by code,
 * so a duplicate would silently double-register). Pure-data, no DB.
 */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'intelligence', 'icf', 'core-sets');
const COMMON = path.join(DIR, 'reference-common.json');
const GENERIC = path.join(DIR, 'generic-brief.json');

const VALID_COMPONENTS = [
  'bodyFunctions',
  'bodyStructures',
  'activitiesParticipation',
  'environmentalFactors',
];
const PREFIX_MAP = {
  b: 'bodyFunctions',
  s: 'bodyStructures',
  d: 'activitiesParticipation',
  e: 'environmentalFactors',
};

describe('W705 — reference-common Core Set', () => {
  let data;
  beforeAll(() => {
    data = JSON.parse(fs.readFileSync(COMMON, 'utf8'));
  });

  it('declares setName "reference_common" (snake_case, no digits)', () => {
    expect(data.setName).toBe('reference_common');
    expect(data.setName).toMatch(/^[a-z_]+$/);
  });

  it('has bilingual displayName + description', () => {
    expect(data.displayName.en.length).toBeGreaterThan(0);
    expect(data.displayName.ar.length).toBeGreaterThan(0);
    expect(data.description.ar.length).toBeGreaterThan(0);
  });

  it('ships at least 50 second-level codes', () => {
    expect(data.codes.length).toBeGreaterThanOrEqual(50);
  });

  it('every code: 3-digit format, level 2, valid component, bilingual title', () => {
    for (const c of data.codes) {
      expect(c.code).toMatch(/^[bsde]\d{3}$/);
      expect(c.level).toBe(2);
      expect(VALID_COMPONENTS).toContain(c.component);
      expect(c.component).toBe(PREFIX_MAP[c.code[0]]);
      expect(typeof c.title).toBe('string');
      expect(c.title.length).toBeGreaterThan(0);
      expect(typeof c.titleAr).toBe('string');
      expect(c.titleAr.length).toBeGreaterThan(0);
    }
  });

  it('every code is parented to its first-level chapter (parentCode = prefix+chapter)', () => {
    for (const c of data.codes) {
      expect(c.parentCode).toBe(c.code[0] + c.chapter);
      expect(c.chapter).toBe(parseInt(c.code.slice(1, 2), 10));
    }
  });

  it('has no internal duplicate codes', () => {
    const codes = data.codes.map(c => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('does NOT overlap generic_brief (avoids silent double-registration on seed)', () => {
    const generic = new Set(JSON.parse(fs.readFileSync(GENERIC, 'utf8')).codes.map(c => c.code));
    const overlap = data.codes.map(c => c.code).filter(code => generic.has(code));
    expect(overlap).toEqual([]);
  });
});

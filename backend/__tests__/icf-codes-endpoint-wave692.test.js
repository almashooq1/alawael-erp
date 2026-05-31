'use strict';

/**
 * icf-codes-endpoint-wave692.test.js — static drift guard.
 *
 * W692 closes a SHADOW-PLACEHOLDER bug: routes/icf-assessments.routes.js
 * mounts at _registry.js:663, BEFORE the controller route from
 * clinical-assessment.registry.js — so its inline /codes handler (which
 * returned 5 hard-coded entries with a non-canonical `body_functions`
 * underscore component) shadowed the real DB-backed ICFCodeReference query.
 * W692 rewires /codes + /codes/tree/:component to query the seeded
 * ICFCodeReference collection, and adds the 30-chapter reference Core Set so
 * the catalog covers all 4 components.
 *
 * Locks:
 *   • /codes + /codes/tree no longer ship the placeholder literals
 *   • both endpoints query ICFCodeReference (via the IcfCodeReference loader)
 *   • reference-chapters.json present + well-formed: 30 level-1 chapter
 *     headers, bilingual, covering b(8) s(8) d(9) e(5)
 *
 * Static analysis + pure-data. No mongoose, no DB. Behavioral counterpart:
 * icf-codes-endpoint-behavioral-wave692.test.js.
 */

const fs = require('fs');
const path = require('path');

const ROUTE_PATH = path.join(__dirname, '..', 'routes', 'icf-assessments.routes.js');
const REF_PATH = path.join(
  __dirname,
  '..',
  'intelligence',
  'icf',
  'core-sets',
  'reference-chapters.json'
);

const VALID_COMPONENTS = [
  'bodyFunctions',
  'bodyStructures',
  'activitiesParticipation',
  'environmentalFactors',
];

describe('W692 — /codes placeholder removed + wired to ICFCodeReference', () => {
  const src = fs.readFileSync(ROUTE_PATH, 'utf8');

  it('no longer ships the 5 hard-coded placeholder codes', () => {
    expect(src).not.toMatch(/Energy and drive functions/);
    expect(src).not.toMatch(/'e115'/);
    // non-canonical underscore components were the placeholder tell
    expect(src).not.toMatch(/component:\s*'body_functions'/);
  });

  it('declares an IcfCodeReference model loader', () => {
    expect(src).toMatch(/function IcfCodeReference\s*\(/);
    expect(src).toMatch(/mongoose\.model\(\s*['"]ICFCodeReference['"]\s*\)/);
  });

  it('/codes handler queries the model with a filter + sort', () => {
    const block = src.slice(src.indexOf("'/codes'"), src.indexOf("'/codes/tree/:component'"));
    expect(block).toMatch(/IcfCodeReference\(\)/);
    expect(block).toMatch(/\.find\(/);
    expect(block).toMatch(/component/);
    expect(block).toMatch(/coreSetMemberships\.setName/);
    expect(block).toMatch(/\$or/); // search support
  });

  it('/codes/tree builds a parentCode → children tree from the model', () => {
    const idx = src.indexOf("'/codes/tree/:component'");
    const block = src.slice(idx, idx + 900);
    expect(block).toMatch(/IcfCodeReference\(\)/);
    expect(block).toMatch(/parentCode/);
    expect(block).toMatch(/children/);
    expect(block).not.toMatch(/codes:\s*\[\s*\]\s*\}\s*\)\s*;\s*\}\s*\)\s*\)/); // no static empty
  });

  it('degrades gracefully (returns empty, never 500) when model unavailable', () => {
    expect(src).toMatch(/if\s*\(\s*!M\s*\)\s*return res\.json/);
  });
});

describe('W692 — reference-chapters Core Set', () => {
  let data;
  beforeAll(() => {
    data = JSON.parse(fs.readFileSync(REF_PATH, 'utf8'));
  });

  it('declares setName "reference_chapters" (snake_case, no digits)', () => {
    expect(data.setName).toBe('reference_chapters');
    expect(data.setName).toMatch(/^[a-z_]+$/);
  });

  it('has bilingual displayName + description', () => {
    expect(data.displayName.en.length).toBeGreaterThan(0);
    expect(data.displayName.ar.length).toBeGreaterThan(0);
    expect(data.description.ar.length).toBeGreaterThan(0);
  });

  it('contains exactly 30 chapter headers', () => {
    expect(data.codes.length).toBe(30);
  });

  it('every entry is a level-1 chapter header with valid component + bilingual title', () => {
    for (const c of data.codes) {
      expect(c.level).toBe(1);
      expect(c.code).toMatch(/^[bsde]\d$/);
      expect(VALID_COMPONENTS).toContain(c.component);
      expect(typeof c.title).toBe('string');
      expect(c.title.length).toBeGreaterThan(0);
      expect(typeof c.titleAr).toBe('string');
      expect(c.titleAr.length).toBeGreaterThan(0);
    }
  });

  it('chapter digit matches the code suffix + component prefix', () => {
    const prefixMap = {
      b: 'bodyFunctions',
      s: 'bodyStructures',
      d: 'activitiesParticipation',
      e: 'environmentalFactors',
    };
    for (const c of data.codes) {
      expect(c.chapter).toBe(parseInt(c.code.slice(1), 10));
      expect(c.component).toBe(prefixMap[c.code[0]]);
    }
  });

  it('covers the full WHO chapter counts per component (b8 s8 d9 e5)', () => {
    const count = comp => data.codes.filter(c => c.component === comp).length;
    expect(count('bodyFunctions')).toBe(8);
    expect(count('bodyStructures')).toBe(8);
    expect(count('activitiesParticipation')).toBe(9);
    expect(count('environmentalFactors')).toBe(5);
  });

  it('has no duplicate codes', () => {
    const codes = data.codes.map(c => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

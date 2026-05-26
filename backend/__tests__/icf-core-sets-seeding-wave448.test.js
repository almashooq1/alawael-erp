'use strict';

/**
 * W448 drift guard — ICF Core Sets infrastructure.
 *
 * Locks W448 build:
 *   • Generic Brief Core Set JSON present at intelligence/icf/core-sets/
 *   • Every Core Set file shape: { setName, setVersion, displayName, codes[] }
 *   • Every code entry shape: { code, component, chapter, level, title, titleAr }
 *   • component ∈ canonical 4 enum values (matches existing model)
 *   • Arabic translations present for every code (titleAr non-empty)
 *   • Code format: /^[bsde]\d+$/
 *   • ICFCodeReference model has the W448 extensions: coreSetMemberships + isCyOnly
 *   • seed-icf-codes.js exists + exports loadCoreSets
 *   • Generic Brief covers all 3 active components (b/d/e) — s is structural-only
 *     and not in the Generic Brief by design.
 *
 * Static analysis + pure-data on Core Set JSON files. No mongoose, no DB.
 */

const fs = require('fs');
const path = require('path');

const CORE_SETS_DIR = path.join(__dirname, '..', 'intelligence', 'icf', 'core-sets');
const MODEL_PATH = path.join(__dirname, '..', 'models', 'icf', 'ICFCodeReference.model.js');
const SEED_PATH = path.join(__dirname, '..', 'scripts', 'seed-icf-codes.js');

const VALID_COMPONENTS = [
  'bodyFunctions',
  'bodyStructures',
  'activitiesParticipation',
  'environmentalFactors',
];
const CODE_FORMAT = /^[bsde]\d+$/;

describe('W448 — Core Sets directory exists', () => {
  it('intelligence/icf/core-sets/ directory exists', () => {
    expect(fs.existsSync(CORE_SETS_DIR)).toBe(true);
  });

  it('contains at least the Generic Brief Core Set', () => {
    const files = fs.readdirSync(CORE_SETS_DIR).filter(f => f.endsWith('.json'));
    expect(files).toContain('generic-brief.json');
  });
});

describe('W448 — Generic Brief Core Set JSON shape', () => {
  let data;
  beforeAll(() => {
    const raw = fs.readFileSync(path.join(CORE_SETS_DIR, 'generic-brief.json'), 'utf8');
    data = JSON.parse(raw);
  });

  it('declares setName "generic_brief"', () => {
    expect(data.setName).toBe('generic_brief');
  });

  it('declares setVersion', () => {
    expect(typeof data.setVersion).toBe('string');
    expect(data.setVersion.length).toBeGreaterThan(0);
  });

  it('has bilingual displayName', () => {
    expect(data.displayName).toBeDefined();
    expect(typeof data.displayName.en).toBe('string');
    expect(typeof data.displayName.ar).toBe('string');
    expect(data.displayName.ar.length).toBeGreaterThan(0);
  });

  it('has bilingual description', () => {
    expect(data.description).toBeDefined();
    expect(typeof data.description.en).toBe('string');
    expect(typeof data.description.ar).toBe('string');
  });

  it('has codes array with at least 15 entries', () => {
    expect(Array.isArray(data.codes)).toBe(true);
    expect(data.codes.length).toBeGreaterThanOrEqual(15);
  });
});

describe('W448 — every code entry is well-formed', () => {
  let data;
  beforeAll(() => {
    data = JSON.parse(fs.readFileSync(path.join(CORE_SETS_DIR, 'generic-brief.json'), 'utf8'));
  });

  it('every code matches /^[bsde]\\d+$/', () => {
    for (const c of data.codes) {
      expect(c.code).toMatch(CODE_FORMAT);
    }
  });

  it('every code has a valid component', () => {
    for (const c of data.codes) {
      expect(VALID_COMPONENTS).toContain(c.component);
    }
  });

  it('every code declares chapter (1-9)', () => {
    for (const c of data.codes) {
      expect(typeof c.chapter).toBe('number');
      expect(c.chapter).toBeGreaterThanOrEqual(1);
      expect(c.chapter).toBeLessThanOrEqual(9);
    }
  });

  it('every code declares level (1-4)', () => {
    for (const c of data.codes) {
      expect(typeof c.level).toBe('number');
      expect(c.level).toBeGreaterThanOrEqual(1);
      expect(c.level).toBeLessThanOrEqual(4);
    }
  });

  it('every code has English title (non-empty)', () => {
    for (const c of data.codes) {
      expect(typeof c.title).toBe('string');
      expect(c.title.length).toBeGreaterThan(0);
    }
  });

  it('every code has Arabic title (non-empty)', () => {
    for (const c of data.codes) {
      expect(typeof c.titleAr).toBe('string');
      expect(c.titleAr.length).toBeGreaterThan(0);
    }
  });

  it('component code prefix matches component name', () => {
    const prefixMap = {
      b: 'bodyFunctions',
      s: 'bodyStructures',
      d: 'activitiesParticipation',
      e: 'environmentalFactors',
    };
    for (const c of data.codes) {
      const prefix = c.code[0];
      expect(c.component).toBe(prefixMap[prefix]);
    }
  });

  it('code chapter matches the digit in the code', () => {
    for (const c of data.codes) {
      const codeChapter = parseInt(c.code.slice(1, 2), 10);
      expect(c.chapter).toBe(codeChapter);
    }
  });

  it('no duplicate codes within the Core Set', () => {
    const codes = data.codes.map(c => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('W448 — Generic Brief covers expected components', () => {
  let data;
  beforeAll(() => {
    data = JSON.parse(fs.readFileSync(path.join(CORE_SETS_DIR, 'generic-brief.json'), 'utf8'));
  });

  it('includes bodyFunctions codes', () => {
    expect(data.codes.some(c => c.component === 'bodyFunctions')).toBe(true);
  });

  it('includes activitiesParticipation codes', () => {
    expect(data.codes.some(c => c.component === 'activitiesParticipation')).toBe(true);
  });

  it('includes environmentalFactors codes', () => {
    expect(data.codes.some(c => c.component === 'environmentalFactors')).toBe(true);
  });
});

describe('W448 — ICFCodeReference model extensions', () => {
  const modelSrc = fs.readFileSync(MODEL_PATH, 'utf8');

  it('declares coreSetMemberships field', () => {
    expect(modelSrc).toMatch(/coreSetMemberships\s*:/);
  });

  it('coreSetMemberships entries declare setName + setVersion + isCanonical', () => {
    const block = modelSrc.match(/coreSetMemberships[\s\S]+?\]/)[0];
    expect(block).toMatch(/setName\s*:/);
    expect(block).toMatch(/setVersion\s*:/);
    expect(block).toMatch(/isCanonical\s*:/);
  });

  it('declares isCyOnly field with Boolean type + default false', () => {
    expect(modelSrc).toMatch(/isCyOnly\s*:\s*\{[^}]*type:\s*Boolean[^}]*default:\s*false/);
  });

  it('declares an index on coreSetMemberships.setName for filtering by Core Set', () => {
    expect(modelSrc).toMatch(/['"]coreSetMemberships\.setName['"]/);
  });
});

describe('W448 — seed script', () => {
  it('seed-icf-codes.js exists', () => {
    expect(fs.existsSync(SEED_PATH)).toBe(true);
  });

  it('exports loadCoreSets', () => {
    const mod = require('../scripts/seed-icf-codes');
    expect(typeof mod.loadCoreSets).toBe('function');
  });

  it('loadCoreSets discovers the Generic Brief set', () => {
    const { loadCoreSets } = require('../scripts/seed-icf-codes');
    const sets = loadCoreSets();
    expect(sets.length).toBeGreaterThanOrEqual(1);
    const genericBrief = sets.find(s => s.data.setName === 'generic_brief');
    expect(genericBrief).toBeDefined();
    expect(genericBrief.data.codes.length).toBeGreaterThanOrEqual(15);
  });

  it('declares --dry-run + --list + --set + --update flags in usage block', () => {
    const src = fs.readFileSync(SEED_PATH, 'utf8');
    expect(src).toMatch(/--dry-run/);
    expect(src).toMatch(/--list/);
    expect(src).toMatch(/--set\s+/);
    expect(src).toMatch(/--update/);
  });

  it('declares MONGODB_URI requirement in header', () => {
    const src = fs.readFileSync(SEED_PATH, 'utf8');
    expect(src).toMatch(/MONGODB_URI/);
  });
});

describe('W448 — Core Set catalog integrity (drift guard)', () => {
  it('every JSON file in core-sets/ has valid shape', () => {
    const files = fs.readdirSync(CORE_SETS_DIR).filter(f => f.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const raw = fs.readFileSync(path.join(CORE_SETS_DIR, file), 'utf8');
      const data = JSON.parse(raw);

      expect(data.setName).toBeDefined();
      expect(typeof data.setName).toBe('string');
      expect(data.codes).toBeDefined();
      expect(Array.isArray(data.codes)).toBe(true);
      expect(data.codes.length).toBeGreaterThan(0);

      // Sample: first code well-formed
      const sample = data.codes[0];
      expect(sample.code).toMatch(CODE_FORMAT);
      expect(VALID_COMPONENTS).toContain(sample.component);
    }
  });

  it('Core Set names follow {condition}_{tier} snake_case convention', () => {
    const files = fs.readdirSync(CORE_SETS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(CORE_SETS_DIR, file), 'utf8'));
      expect(data.setName).toMatch(/^[a-z_]+$/);
    }
  });
});

/**
 * rehab-measures-library.test.js
 * Unit tests for backend/rehabilitation-services/rehab-measures-library.js
 */

'use strict';

const {
  MEASURES_CATALOG,
  CATEGORIES,
  listAllMeasures,
  getMeasuresByCategory,
  getMeasuresForPopulation,
  getMeasure,
  getSmartRecommendations,
  getCategories,
} = require('../../rehabilitation-services/rehab-measures-library');

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG SANITY
// ─────────────────────────────────────────────────────────────────────────────

describe('MEASURES_CATALOG — catalog sanity', () => {
  test('has at least 10 measures', () => {
    expect(Object.keys(MEASURES_CATALOG).length).toBeGreaterThanOrEqual(10);
  });

  test('every measure has required fields: id, name_ar, category', () => {
    for (const [_key, m] of Object.entries(MEASURES_CATALOG)) {
      expect(m).toHaveProperty('id', expect.any(String));
      expect(m).toHaveProperty('name_ar', expect.any(String));
      expect(m).toHaveProperty('category', expect.any(String));
    }
  });

  test('every measure category exists in CATEGORIES', () => {
    const cats = Object.keys(CATEGORIES);
    for (const [_key, m] of Object.entries(MEASURES_CATALOG)) {
      expect(cats).toContain(m.category);
    }
  });

  test('well-known measures are present: GMFCS, FIM, CARS2, BergBalance', () => {
    expect(MEASURES_CATALOG).toHaveProperty('GMFCS');
    expect(MEASURES_CATALOG).toHaveProperty('FIM');
    expect(MEASURES_CATALOG).toHaveProperty('CARS2');
    expect(MEASURES_CATALOG).toHaveProperty('BergBalance');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listAllMeasures
// ─────────────────────────────────────────────────────────────────────────────

describe('listAllMeasures()', () => {
  test('returns an array with the same count as MEASURES_CATALOG', () => {
    const all = listAllMeasures();
    expect(all).toHaveLength(Object.keys(MEASURES_CATALOG).length);
  });

  test('each entry has a key and categoryMeta', () => {
    const all = listAllMeasures();
    for (const m of all) {
      expect(m).toHaveProperty('key');
      expect(m).toHaveProperty('categoryMeta');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMeasuresByCategory
// ─────────────────────────────────────────────────────────────────────────────

describe('getMeasuresByCategory()', () => {
  test('filters correctly for "motor" category', () => {
    const results = getMeasuresByCategory('motor');
    expect(results.length).toBeGreaterThan(0);
    results.forEach(m => expect(m.category).toBe('motor'));
  });

  test('returns empty array for unknown category', () => {
    expect(getMeasuresByCategory('nonexistent_xyz')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMeasuresForPopulation
// ─────────────────────────────────────────────────────────────────────────────

describe('getMeasuresForPopulation()', () => {
  test('returns measures for "شلل دماغي" (cerebral palsy)', () => {
    const results = getMeasuresForPopulation('شلل دماغي');
    expect(results.length).toBeGreaterThan(0);
  });

  test('returns empty array for completely unknown population', () => {
    expect(getMeasuresForPopulation('zzz_unknown_population_zzz')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMeasure
// ─────────────────────────────────────────────────────────────────────────────

describe('getMeasure()', () => {
  test('returns measure by catalog key', () => {
    const m = getMeasure('GMFCS');
    expect(m).not.toBeNull();
    expect(m.abbreviation).toBe('GMFCS');
  });

  test('returns measure by id string (e.g. GMFCS-2007)', () => {
    const byKey = getMeasure('GMFCS');
    const byId = getMeasure(byKey.id);
    expect(byId).not.toBeNull();
    expect(byId.id).toBe(byKey.id);
  });

  test('returns null for unknown key', () => {
    expect(getMeasure('DOES_NOT_EXIST')).toBeNull();
  });

  test('FIM has 18 total items', () => {
    const fim = getMeasure('FIM');
    expect(fim.totalItems).toBe(18);
  });

  test('BergBalance has 14 items', () => {
    const bbs = getMeasure('BergBalance');
    expect(bbs).not.toBeNull();
    expect(bbs.totalItems).toBe(14);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSmartRecommendations
// ─────────────────────────────────────────────────────────────────────────────

describe('getSmartRecommendations()', () => {
  test('returns array of recommendations for valid measure + tier', () => {
    const recs = getSmartRecommendations('FIM', 'severe');
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
  });

  test('returns empty array for unknown tier', () => {
    expect(getSmartRecommendations('FIM', 'unknown_tier')).toEqual([]);
  });

  test('returns empty array for unknown measure key', () => {
    expect(getSmartRecommendations('UNKNOWN_MEASURE', 'severe')).toEqual([]);
  });

  test('GMFCS level 1 recommendations are strings', () => {
    const recs = getSmartRecommendations('GMFCS', 1);
    expect(Array.isArray(recs)).toBe(true);
    recs.forEach(r => expect(typeof r).toBe('string'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCategories
// ─────────────────────────────────────────────────────────────────────────────

describe('getCategories()', () => {
  test('returns the CATEGORIES object', () => {
    const cats = getCategories();
    expect(typeof cats).toBe('object');
    expect(Object.keys(cats).length).toBeGreaterThan(0);
  });

  test('each category has a label_ar', () => {
    const cats = getCategories();
    for (const [_key, cat] of Object.entries(cats)) {
      expect(cat).toHaveProperty('label_ar');
    }
  });
});

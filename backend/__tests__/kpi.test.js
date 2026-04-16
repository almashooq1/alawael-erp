/**
 * KPI framework scaffold tests.
 */
const { CATEGORIES, definitions, byId, byCategory, count, KpiComputeEngine } = require('../kpi');

describe('KPI definitions', () => {
  test('at least 50 KPIs registered', () => {
    expect(count()).toBeGreaterThanOrEqual(50);
  });

  test('all KPI ids are unique kebab-case', () => {
    const ids = definitions.map(d => d.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
  });

  test('every KPI has a valid category', () => {
    const valid = new Set(Object.values(CATEGORIES));
    for (const d of definitions) {
      expect(valid.has(d.category)).toBe(true);
    }
  });

  test('all 6 categories are represented', () => {
    for (const cat of Object.values(CATEGORIES)) {
      expect(byCategory(cat).length).toBeGreaterThan(0);
    }
  });

  test('byId returns the correct definition', () => {
    const d = byId('active-beneficiaries');
    expect(d).toBeDefined();
    expect(d.category).toBe(CATEGORIES.CLINICAL);
  });

  test('byId returns undefined for unknown', () => {
    expect(byId('nonexistent')).toBeUndefined();
  });
});

describe('KpiComputeEngine', () => {
  test('can register and compute a KPI', async () => {
    const engine = new KpiComputeEngine();
    engine.register('active-beneficiaries', async () => 42);
    const result = await engine.compute('active-beneficiaries', {
      period: { from: new Date(), to: new Date() },
    });
    expect(result.value).toBe(42);
    expect(result.definition.id).toBe('active-beneficiaries');
  });

  test('throws on register for unknown KPI', () => {
    const engine = new KpiComputeEngine();
    expect(() => engine.register('nope', () => 1)).toThrow('Unknown KPI id');
  });

  test('compute returns value=null + error when computer throws', async () => {
    const engine = new KpiComputeEngine();
    engine.register('active-beneficiaries', async () => {
      throw new Error('db down');
    });
    const result = await engine.compute('active-beneficiaries', {});
    expect(result.value).toBeNull();
    expect(result.error).toBe('db down');
  });

  test('missingComputers lists all initially', () => {
    const engine = new KpiComputeEngine();
    expect(engine.missingComputers().length).toBe(definitions.length);
    engine.register('active-beneficiaries', async () => 1);
    expect(engine.missingComputers().length).toBe(definitions.length - 1);
  });
});

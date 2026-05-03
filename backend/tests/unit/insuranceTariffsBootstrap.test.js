'use strict';

const {
  bootstrap,
  SEED_TARIFFS,
  STARTER_NOTE,
  DEFAULT_EFFECTIVE_FROM,
} = require('../../services/finance/insuranceTariffsBootstrap');

// Lightweight in-memory tariff model that mimics the parts the bootstrap
// touches: findOne(filter), create(props), and instance.save().
function makeMemModel() {
  const rows = [];

  function matches(row, filter) {
    return Object.keys(filter).every(k => {
      if (k === 'effectiveFrom') {
        const a = row[k] && new Date(row[k]).getTime();
        const b = filter[k] && new Date(filter[k]).getTime();
        return a === b;
      }
      return row[k] === filter[k];
    });
  }

  return {
    rows,
    findOne: jest.fn(async filter => {
      const found = rows.find(r => matches(r, filter));
      return found || null;
    }),
    create: jest.fn(async props => {
      const doc = { ...props };
      doc.save = jest.fn(async () => doc);
      rows.push(doc);
      return doc;
    }),
  };
}

describe('services/finance/insuranceTariffsBootstrap', () => {
  describe('seed dataset shape', () => {
    test('has the expected total row count (5 insurers × 5 CPTs)', () => {
      expect(SEED_TARIFFS).toHaveLength(25);
    });

    test('each row has provider, providerId, cptCode, unitPrice', () => {
      for (const r of SEED_TARIFFS) {
        expect(typeof r.provider).toBe('string');
        expect(r.provider.length).toBeGreaterThan(0);
        expect(typeof r.providerId).toBe('string');
        expect(r.cptCode).toMatch(/^\d{5}$/);
        expect(Number.isFinite(r.unitPrice)).toBe(true);
        expect(r.unitPrice).toBeGreaterThan(0);
      }
    });

    test('every row uses one of the 5 mapped CPT codes', () => {
      const expected = new Set(['97110', '97530', '92507', '97153', '96130']);
      const actual = new Set(SEED_TARIFFS.map(r => r.cptCode));
      expect(actual).toEqual(expected);
    });

    test('covers exactly 5 distinct providers', () => {
      const providers = new Set(SEED_TARIFFS.map(r => r.provider));
      expect(providers.size).toBe(5);
      expect(providers).toContain('Bupa Arabia');
      expect(providers).toContain('Tawuniya');
    });

    test('every (provider, cptCode) pair is unique', () => {
      const keys = SEED_TARIFFS.map(r => `${r.provider}::${r.cptCode}`);
      const dedup = new Set(keys);
      expect(keys.length).toBe(dedup.size);
    });
  });

  describe('bootstrap()', () => {
    test('throws when tariffModel missing', async () => {
      await expect(bootstrap({})).rejects.toThrow(/tariffModel/);
    });

    test('inserts every row on a fresh database', async () => {
      const model = makeMemModel();
      const r = await bootstrap({ tariffModel: model });
      expect(r.inserted).toBe(SEED_TARIFFS.length);
      expect(r.updated).toBe(0);
      expect(r.skipped).toBe(0);
      expect(model.rows).toHaveLength(SEED_TARIFFS.length);
      // Defaults
      const sample = model.rows[0];
      expect(sample.currency).toBe('SAR');
      expect(sample.isActive).toBe(true);
      expect(sample.effectiveFrom.getTime()).toBe(DEFAULT_EFFECTIVE_FROM.getTime());
      expect(sample.notes).toBe(STARTER_NOTE);
    });

    test('re-running on identical data inserts 0, updates 0, skips all', async () => {
      const model = makeMemModel();
      await bootstrap({ tariffModel: model });
      const second = await bootstrap({ tariffModel: model });
      expect(second.inserted).toBe(0);
      expect(second.updated).toBe(0);
      expect(second.skipped).toBe(SEED_TARIFFS.length);
    });

    test('updates rows whose unitPrice has drifted', async () => {
      const model = makeMemModel();
      await bootstrap({ tariffModel: model });

      // Manually mutate one row to simulate drift.
      model.rows[0].unitPrice = 9999;

      const r = await bootstrap({ tariffModel: model });
      expect(r.updated).toBe(1);
      expect(r.skipped).toBe(SEED_TARIFFS.length - 1);
      expect(model.rows[0].unitPrice).toBe(SEED_TARIFFS[0].unitPrice);
    });

    test('dry-run: reports counts but does not write', async () => {
      const model = makeMemModel();
      const r = await bootstrap({ tariffModel: model, dryRun: true });
      expect(r.inserted).toBe(SEED_TARIFFS.length);
      expect(r.dryRun).toBe(true);
      expect(model.rows).toHaveLength(0);
      expect(model.create).not.toHaveBeenCalled();
    });

    test('dry-run on drifted data reports update count without writing', async () => {
      const model = makeMemModel();
      await bootstrap({ tariffModel: model });
      model.rows[0].unitPrice = 9999;
      const r = await bootstrap({ tariffModel: model, dryRun: true });
      expect(r.updated).toBe(1);
      expect(model.rows[0].unitPrice).toBe(9999); // unchanged
    });

    test('does NOT auto-restore a soft-disabled row', async () => {
      const model = makeMemModel();
      await bootstrap({ tariffModel: model });
      model.rows[0].isActive = false;

      await bootstrap({ tariffModel: model });
      // The row stays disabled — operator must explicitly restore.
      expect(model.rows[0].isActive).toBe(false);
    });
  });
});

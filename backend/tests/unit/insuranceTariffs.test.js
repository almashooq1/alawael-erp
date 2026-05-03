'use strict';

const { lookupPrice } = require('../../services/insuranceTariffs');
const mongoose = require('mongoose');

// Helper: build a chainable Tariff model mock that filters an in-memory
// row list the same way the real Mongo query would.
function makeTariffModel(rows) {
  return {
    find: jest.fn(filter => {
      let result = rows.filter(r => r.cptCode === filter.cptCode);
      if (filter.isActive !== undefined) {
        result = result.filter(r => r.isActive === filter.isActive);
      }
      if (filter.effectiveFrom?.$lte) {
        const at = filter.effectiveFrom.$lte;
        result = result.filter(r => r.effectiveFrom <= at);
      }
      if (filter.$or) {
        const at = filter.$or[1]?.effectiveTo?.$gte;
        result = result.filter(r => r.effectiveTo === null || (at && r.effectiveTo >= at));
      }
      if (filter.providerId) {
        result = result.filter(r => r.providerId === filter.providerId);
      } else if (filter.provider?.$regex) {
        const re = new RegExp(filter.provider.$regex, filter.provider.$options || '');
        result = result.filter(r => re.test(r.provider));
      }
      result = result.sort((a, b) => b.effectiveFrom - a.effectiveFrom);
      return {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(result.slice(0, 2)),
      };
    }),
  };
}

const id = () => new mongoose.Types.ObjectId();

describe('services/insuranceTariffs.lookupPrice', () => {
  describe('input validation', () => {
    test('returns missing_input when cptCode absent', async () => {
      const r = await lookupPrice({
        provider: 'X',
        date: new Date(),
        models: { InsuranceTariff: makeTariffModel([]) },
      });
      expect(r).toEqual({ found: false, reason: 'missing_input' });
    });

    test('returns missing_input when both provider AND providerId absent', async () => {
      const r = await lookupPrice({
        cptCode: '97110',
        date: new Date(),
        models: { InsuranceTariff: makeTariffModel([]) },
      });
      expect(r).toEqual({ found: false, reason: 'missing_input' });
    });

    test('returns missing_input when date is unparseable', async () => {
      const r = await lookupPrice({
        provider: 'Bupa',
        cptCode: '97110',
        date: 'not-a-date',
        models: { InsuranceTariff: makeTariffModel([]) },
      });
      expect(r).toEqual({ found: false, reason: 'missing_input' });
    });
  });

  describe('matching strategy', () => {
    const baseRow = {
      _id: id(),
      provider: 'Bupa Arabia',
      providerId: 'BUPA-001',
      cptCode: '97110',
      unitPrice: 200,
      currency: 'SAR',
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
      isActive: true,
    };

    test('matches by providerId first (canonical NPHIES id)', async () => {
      const rows = [{ ...baseRow, provider: 'Other Name', providerId: 'BUPA-001', unitPrice: 200 }];
      const r = await lookupPrice({
        providerId: 'BUPA-001',
        cptCode: '97110',
        date: new Date('2026-04-30'),
        models: { InsuranceTariff: makeTariffModel(rows) },
      });
      expect(r.found).toBe(true);
      expect(r.unitPrice).toBe(200);
      expect(r.source).toBe('tariff:providerId');
    });

    test('falls back to provider name when providerId has no rows', async () => {
      const rows = [{ ...baseRow, providerId: null, unitPrice: 175 }];
      const r = await lookupPrice({
        provider: 'BUPA ARABIA', // case-insensitive
        providerId: 'NOT-FOUND',
        cptCode: '97110',
        date: new Date('2026-04-30'),
        models: { InsuranceTariff: makeTariffModel(rows) },
      });
      expect(r.found).toBe(true);
      expect(r.unitPrice).toBe(175);
      expect(r.source).toBe('tariff:provider');
    });

    test('escapes regex meta-characters in provider name', async () => {
      const rows = [{ ...baseRow, provider: 'Tawuniya (Saudi)', providerId: null, unitPrice: 250 }];
      const r = await lookupPrice({
        provider: 'Tawuniya (Saudi)',
        cptCode: '97110',
        date: new Date('2026-04-30'),
        models: { InsuranceTariff: makeTariffModel(rows) },
      });
      expect(r.found).toBe(true);
      expect(r.unitPrice).toBe(250);
    });

    test('returns no_match when neither id nor name matches', async () => {
      const rows = [{ ...baseRow, provider: 'Some Other Insurer', providerId: null }];
      const r = await lookupPrice({
        provider: 'Bupa Arabia',
        cptCode: '97110',
        date: new Date(),
        models: { InsuranceTariff: makeTariffModel(rows) },
      });
      expect(r).toEqual({ found: false, reason: 'no_match' });
    });
  });

  describe('effective-date window', () => {
    test('skips rows with effectiveFrom in the future', async () => {
      const rows = [
        {
          _id: id(),
          provider: 'Bupa',
          cptCode: '97110',
          unitPrice: 999,
          effectiveFrom: new Date('2030-01-01'),
          effectiveTo: null,
          isActive: true,
        },
      ];
      const r = await lookupPrice({
        provider: 'Bupa',
        cptCode: '97110',
        date: new Date('2026-04-30'),
        models: { InsuranceTariff: makeTariffModel(rows) },
      });
      expect(r.found).toBe(false);
    });

    test('skips rows whose effectiveTo has passed', async () => {
      const rows = [
        {
          _id: id(),
          provider: 'Bupa',
          cptCode: '97110',
          unitPrice: 100,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: new Date('2025-01-01'),
          isActive: true,
        },
      ];
      const r = await lookupPrice({
        provider: 'Bupa',
        cptCode: '97110',
        date: new Date('2026-04-30'),
        models: { InsuranceTariff: makeTariffModel(rows) },
      });
      expect(r.found).toBe(false);
    });

    test('picks the most-recent effectiveFrom among overlapping rows', async () => {
      const rows = [
        {
          _id: id(),
          provider: 'Bupa',
          cptCode: '97110',
          unitPrice: 100,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: null,
          isActive: true,
        },
        {
          _id: id(),
          provider: 'Bupa',
          cptCode: '97110',
          unitPrice: 175,
          effectiveFrom: new Date('2026-01-01'),
          effectiveTo: null,
          isActive: true,
        },
      ];
      const r = await lookupPrice({
        provider: 'Bupa',
        cptCode: '97110',
        date: new Date('2026-04-30'),
        models: { InsuranceTariff: makeTariffModel(rows) },
      });
      expect(r.unitPrice).toBe(175);
    });
  });

  describe('ambiguity', () => {
    test('throws when two active rows tie on effectiveFrom', async () => {
      const same = new Date('2026-01-01');
      const rows = [
        {
          _id: id(),
          provider: 'Bupa',
          cptCode: '97110',
          unitPrice: 100,
          effectiveFrom: same,
          effectiveTo: null,
          isActive: true,
        },
        {
          _id: id(),
          provider: 'Bupa',
          cptCode: '97110',
          unitPrice: 175,
          effectiveFrom: same,
          effectiveTo: null,
          isActive: true,
        },
      ];
      await expect(
        lookupPrice({
          provider: 'Bupa',
          cptCode: '97110',
          date: new Date('2026-04-30'),
          models: { InsuranceTariff: makeTariffModel(rows) },
        })
      ).rejects.toThrow(/ambiguous/);
    });
  });

  describe('inactive rows', () => {
    test('isActive:false rows are ignored', async () => {
      const rows = [
        {
          _id: id(),
          provider: 'Bupa',
          cptCode: '97110',
          unitPrice: 100,
          effectiveFrom: new Date('2026-01-01'),
          effectiveTo: null,
          isActive: false,
        },
      ];
      const r = await lookupPrice({
        provider: 'Bupa',
        cptCode: '97110',
        date: new Date('2026-04-30'),
        models: { InsuranceTariff: makeTariffModel(rows) },
      });
      expect(r.found).toBe(false);
    });
  });
});

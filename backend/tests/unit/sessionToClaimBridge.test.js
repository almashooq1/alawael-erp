'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const mongoose = require('mongoose');
const {
  buildClaimFromSession,
  SESSION_TYPE_TO_CPT,
  TERMINAL_NON_BILLABLE,
  mapSessionTypeToCpt,
  generateClaimNumber,
} = require('../../services/sessionToClaimBridge');

// ─── Helpers ─────────────────────────────────────────────────────────────
function makeMockModels({ session, beneficiary, tariffRows = [] } = {}) {
  const created = [];
  // Mock InsuranceTariff with a chained .find().sort().limit().lean()
  const tariffFind = jest.fn(filter => {
    // Naive filter match: cptCode + (provider regex OR providerId)
    let rows = tariffRows.filter(r => r.cptCode === filter.cptCode && r.isActive !== false);
    if (filter.providerId) {
      rows = rows.filter(r => r.providerId === filter.providerId);
    } else if (filter.provider?.$regex) {
      const re = new RegExp(filter.provider.$regex, filter.provider.$options || '');
      rows = rows.filter(r => re.test(r.provider));
    }
    rows = rows.sort((a, b) => b.effectiveFrom - a.effectiveFrom);
    return {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(rows.slice(0, 2)),
    };
  });

  return {
    created,
    tariffFind,
    models: {
      TherapySession: {
        findById: jest.fn(() => ({
          populate: jest
            .fn()
            .mockResolvedValue(
              session ? { ...session, beneficiary: beneficiary || session.beneficiary } : null
            ),
        })),
      },
      Beneficiary: {},
      NphiesClaim: {
        create: jest.fn(async draft => {
          const saved = { _id: new mongoose.Types.ObjectId(), ...draft };
          created.push(saved);
          return saved;
        }),
      },
      InsuranceTariff: { find: tariffFind },
    },
  };
}

function makeSession(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    sessionType: 'علاج طبيعي',
    status: 'COMPLETED',
    isBilled: false,
    date: new Date('2026-04-30T10:00:00Z'),
    ...overrides,
  };
}

function makeBeneficiary(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    insuranceInfo: {
      hasInsurance: true,
      provider: 'Bupa Arabia',
      policyNumber: 'BUP-12345678',
      groupNumber: 'GRP-001',
      coverageType: 'full',
      coverageEndDate: new Date('2027-12-31'),
      copayAmount: 50,
      deductible: 0,
    },
    ...overrides,
  };
}

const VALID_ID = new mongoose.Types.ObjectId().toString();

// ═══════════════════════════════════════════════════════════════════════════
describe('services/sessionToClaimBridge', () => {
  describe('static maps', () => {
    test('SESSION_TYPE_TO_CPT covers the 5 enum values used in TherapySession', () => {
      const expected = ['علاج طبيعي', 'علاج وظيفي', 'نطق وتخاطب', 'علاج سلوكي', 'علاج نفسي'];
      expected.forEach(t => expect(SESSION_TYPE_TO_CPT[t]).toBeTruthy());
      expected.forEach(t => expect(SESSION_TYPE_TO_CPT[t].code).toMatch(/^\d{5}$/));
    });

    test('TERMINAL_NON_BILLABLE includes all cancellation/no-show statuses', () => {
      expect(TERMINAL_NON_BILLABLE.has('CANCELLED_BY_PATIENT')).toBe(true);
      expect(TERMINAL_NON_BILLABLE.has('CANCELLED_BY_CENTER')).toBe(true);
      expect(TERMINAL_NON_BILLABLE.has('NO_SHOW')).toBe(true);
      expect(TERMINAL_NON_BILLABLE.has('RESCHEDULED')).toBe(true);
      expect(TERMINAL_NON_BILLABLE.has('COMPLETED')).toBe(false);
    });
  });

  describe('generateClaimNumber', () => {
    test('matches CLM-YYYYMM-XXXXXX format', () => {
      expect(generateClaimNumber()).toMatch(/^CLM-\d{6}-[0-9A-Z]{6}$/);
    });

    test('produces unique values', () => {
      const a = generateClaimNumber();
      const b = generateClaimNumber();
      expect(a).not.toBe(b);
    });
  });

  describe('mapSessionTypeToCpt', () => {
    test('returns mapped CPT for known session type', () => {
      const r = mapSessionTypeToCpt('علاج طبيعي', { code: 'X', description: 'Y', specialty: 'Z' });
      expect(r.code).toBe('97110');
      expect(r.source).toBe('session-type');
    });

    test('falls back to provided default for unknown type', () => {
      const r = mapSessionTypeToCpt('unknown', {
        code: 'XYZ',
        description: 'Default',
        specialty: 'GEN',
      });
      expect(r.code).toBe('XYZ');
      expect(r.source).toBe('fallback');
    });
  });

  describe('buildClaimFromSession — input validation', () => {
    test('rejects invalid session id', async () => {
      const { models } = makeMockModels();
      const r = await buildClaimFromSession('not-an-id', { models });
      expect(r.ok).toBe(false);
      expect(r.errors).toContain('invalid_session_id');
    });

    test('rejects missing session', async () => {
      const { models } = makeMockModels({ session: null });
      const r = await buildClaimFromSession(VALID_ID, { models });
      expect(r.ok).toBe(false);
      expect(r.errors).toContain('session_not_found');
    });

    test('rejects session with no beneficiary populated', async () => {
      const { models } = makeMockModels({ session: makeSession({ beneficiary: null }) });
      const r = await buildClaimFromSession(VALID_ID, { models });
      expect(r.ok).toBe(false);
      expect(r.errors).toContain('beneficiary_missing');
    });
  });

  describe('buildClaimFromSession — insurance gating', () => {
    test('rejects beneficiary without insurance', async () => {
      const beneficiary = makeBeneficiary({ insuranceInfo: { hasInsurance: false } });
      const { models } = makeMockModels({ session: makeSession({ beneficiary }) });
      const r = await buildClaimFromSession(VALID_ID, { models });
      expect(r.ok).toBe(false);
      expect(r.errors).toContain('no_insurance_on_file');
    });

    test('rejects insurance without policy number', async () => {
      const beneficiary = makeBeneficiary({
        insuranceInfo: { hasInsurance: true, provider: 'X' },
      });
      const { models } = makeMockModels({ session: makeSession({ beneficiary }) });
      const r = await buildClaimFromSession(VALID_ID, { models });
      expect(r.ok).toBe(false);
      expect(r.errors).toContain('insurance_policy_number_missing');
    });

    test('rejects expired insurance coverage', async () => {
      const beneficiary = makeBeneficiary({
        insuranceInfo: {
          hasInsurance: true,
          provider: 'X',
          policyNumber: 'P',
          coverageEndDate: new Date('2020-01-01'),
        },
      });
      const { models } = makeMockModels({ session: makeSession({ beneficiary }) });
      const r = await buildClaimFromSession(VALID_ID, { models });
      expect(r.ok).toBe(false);
      expect(r.errors).toContain('insurance_coverage_expired');
    });
  });

  describe('buildClaimFromSession — status gating', () => {
    test('rejects cancelled-by-patient sessions as non-billable', async () => {
      const session = makeSession({
        status: 'CANCELLED_BY_PATIENT',
        beneficiary: makeBeneficiary(),
      });
      const { models } = makeMockModels({ session });
      const r = await buildClaimFromSession(VALID_ID, { models });
      expect(r.ok).toBe(false);
      expect(r.errors.find(e => e.startsWith('session_not_billable'))).toBeTruthy();
    });

    test('rejects no-show sessions as non-billable', async () => {
      const session = makeSession({ status: 'NO_SHOW', beneficiary: makeBeneficiary() });
      const { models } = makeMockModels({ session });
      const r = await buildClaimFromSession(VALID_ID, { models });
      expect(r.ok).toBe(false);
      expect(r.errors.find(e => e.startsWith('session_not_billable'))).toBeTruthy();
    });

    test('warns but does not block when session is still SCHEDULED', async () => {
      const session = makeSession({ status: 'SCHEDULED', beneficiary: makeBeneficiary() });
      const { models } = makeMockModels({ session });
      const r = await buildClaimFromSession(VALID_ID, {
        models,
        unitPrice: 100,
        diagnosis: [{ code: 'F84', description: 'Autism' }],
      });
      expect(r.ok).toBe(true);
      expect(r.warnings.find(w => w.startsWith('session_not_completed'))).toBeTruthy();
    });

    test('warns when session is already billed (does not block)', async () => {
      const session = makeSession({ isBilled: true, beneficiary: makeBeneficiary() });
      const { models } = makeMockModels({ session });
      const r = await buildClaimFromSession(VALID_ID, {
        models,
        unitPrice: 100,
        diagnosis: [{ code: 'F84' }],
      });
      expect(r.ok).toBe(true);
      expect(r.warnings).toContain('session_already_billed');
    });
  });

  describe('buildClaimFromSession — happy path', () => {
    test('builds claim with mapped CPT, pricing, and insurance fields', async () => {
      const beneficiary = makeBeneficiary();
      const session = makeSession({ sessionType: 'نطق وتخاطب', beneficiary });
      const { models, created } = makeMockModels({ session });

      const r = await buildClaimFromSession(VALID_ID, {
        models,
        unitPrice: 250,
        diagnosis: [{ code: 'F80.9', description: 'Speech disorder' }],
      });

      expect(r.ok).toBe(true);
      expect(r.errors).toEqual([]);
      expect(r.dryRun).toBe(false);
      expect(created).toHaveLength(1);

      const c = r.claim;
      expect(c.claimNumber).toMatch(/^CLM-\d{6}-/);
      expect(c.memberId).toBe('BUP-12345678');
      expect(c.insurerName).toBe('Bupa Arabia');
      expect(c.serviceDate).toEqual(session.date);
      expect(c.services[0].code).toBe('92507'); // SLP CPT
      expect(c.services[0].unitPrice).toBe(250);
      expect(c.services[0].total).toBe(250);
      expect(c.totalAmount).toBe(250);
      expect(c.copay).toBe(50);
      expect(c.diagnosis).toEqual([{ code: 'F80.9', description: 'Speech disorder' }]);
      expect(c.nphies.submission.status).toBe('NOT_SUBMITTED');
    });

    test('warns when unitPrice is missing or zero', async () => {
      const session = makeSession({ beneficiary: makeBeneficiary() });
      const { models } = makeMockModels({ session });
      const r = await buildClaimFromSession(VALID_ID, {
        models,
        diagnosis: [{ code: 'F84' }],
      });
      expect(r.ok).toBe(true);
      expect(r.warnings).toContain('unit_price_missing_or_zero');
      expect(r.claim.totalAmount).toBe(0);
    });

    test('warns when diagnosis is missing', async () => {
      const session = makeSession({ beneficiary: makeBeneficiary() });
      const { models } = makeMockModels({ session });
      const r = await buildClaimFromSession(VALID_ID, { models, unitPrice: 100 });
      expect(r.ok).toBe(true);
      expect(r.warnings).toContain('diagnosis_missing');
    });

    test('warns when sessionType is unmapped', async () => {
      const session = makeSession({ sessionType: 'أخرى', beneficiary: makeBeneficiary() });
      const { models } = makeMockModels({ session });
      const r = await buildClaimFromSession(VALID_ID, {
        models,
        unitPrice: 100,
        diagnosis: [{ code: 'F84' }],
      });
      expect(r.ok).toBe(true);
      expect(r.warnings.find(w => w.startsWith('unmapped_session_type'))).toBeTruthy();
    });

    test('cptOverride takes precedence over fallback', async () => {
      const session = makeSession({ sessionType: 'أخرى', beneficiary: makeBeneficiary() });
      const { models } = makeMockModels({ session });
      const r = await buildClaimFromSession(VALID_ID, {
        models,
        unitPrice: 100,
        diagnosis: [{ code: 'F84' }],
        cptOverride: { code: '12345', description: 'Custom', specialty: 'CUSTOM' },
      });
      expect(r.claim.services[0].code).toBe('12345');
      expect(r.claim.services[0].description).toBe('Custom');
    });
  });

  describe('buildClaimFromSession — tariff fallback', () => {
    test('looks up unit price from tariff when caller did not pass one', async () => {
      const beneficiary = makeBeneficiary({
        insuranceInfo: {
          hasInsurance: true,
          provider: 'Bupa Arabia',
          policyNumber: 'P-1',
        },
      });
      const session = makeSession({
        sessionType: 'علاج طبيعي',
        beneficiary,
        date: new Date('2026-04-30'),
      });
      const tariffRows = [
        {
          _id: new mongoose.Types.ObjectId(),
          provider: 'Bupa Arabia',
          providerId: null,
          cptCode: '97110',
          unitPrice: 175,
          currency: 'SAR',
          effectiveFrom: new Date('2026-01-01'),
          effectiveTo: null,
          isActive: true,
        },
      ];
      const { models } = makeMockModels({ session, tariffRows });

      const r = await buildClaimFromSession(VALID_ID, {
        models,
        diagnosis: [{ code: 'F84' }],
      });

      expect(r.ok).toBe(true);
      expect(r.claim.services[0].unitPrice).toBe(175);
      expect(r.claim.totalAmount).toBe(175);
      expect(r.priceSource).toBe('tariff:provider');
      expect(r.warnings).not.toContain('unit_price_missing_or_zero');
    });

    test('caller-supplied unitPrice wins over tariff', async () => {
      const beneficiary = makeBeneficiary();
      const session = makeSession({ beneficiary });
      const tariffRows = [
        {
          _id: new mongoose.Types.ObjectId(),
          provider: 'Bupa Arabia',
          cptCode: '97110',
          unitPrice: 175,
          effectiveFrom: new Date('2026-01-01'),
          effectiveTo: null,
          isActive: true,
        },
      ];
      const { models } = makeMockModels({ session, tariffRows });

      const r = await buildClaimFromSession(VALID_ID, {
        models,
        unitPrice: 999,
        diagnosis: [{ code: 'F84' }],
      });

      expect(r.priceSource).toBe('override');
      expect(r.claim.services[0].unitPrice).toBe(999);
    });

    test('warns when no tariff matches and no override', async () => {
      const session = makeSession({ beneficiary: makeBeneficiary() });
      const { models } = makeMockModels({ session, tariffRows: [] });

      const r = await buildClaimFromSession(VALID_ID, {
        models,
        diagnosis: [{ code: 'F84' }],
      });

      expect(r.ok).toBe(true);
      expect(r.warnings).toContain('unit_price_missing_or_zero');
      expect(r.priceSource).toBeNull();
    });

    test('useTariff:false skips lookup even when row would match', async () => {
      const session = makeSession({ beneficiary: makeBeneficiary() });
      const tariffRows = [
        {
          _id: new mongoose.Types.ObjectId(),
          provider: 'Bupa Arabia',
          cptCode: '97110',
          unitPrice: 175,
          effectiveFrom: new Date('2026-01-01'),
          effectiveTo: null,
          isActive: true,
        },
      ];
      const { models, tariffFind } = makeMockModels({ session, tariffRows });

      const r = await buildClaimFromSession(VALID_ID, {
        models,
        useTariff: false,
        diagnosis: [{ code: 'F84' }],
      });

      expect(tariffFind).not.toHaveBeenCalled();
      expect(r.warnings).toContain('unit_price_missing_or_zero');
    });
  });

  describe('buildClaimFromSession — dryRun', () => {
    test('returns the claim shape without persisting', async () => {
      const session = makeSession({ beneficiary: makeBeneficiary() });
      const { models, created } = makeMockModels({ session });

      const r = await buildClaimFromSession(VALID_ID, {
        models,
        dryRun: true,
        unitPrice: 200,
        diagnosis: [{ code: 'F84' }],
      });

      expect(r.ok).toBe(true);
      expect(r.dryRun).toBe(true);
      expect(created).toHaveLength(0);
      expect(r.claim.claimNumber).toMatch(/^CLM-/);
    });
  });
});

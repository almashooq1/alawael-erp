'use strict';

const chain = () => {
  const c = {};
  [
    'find',
    'findById',
    'findByIdAndUpdate',
    'findOne',
    'sort',
    'skip',
    'limit',
    'lean',
    'populate',
    'countDocuments',
    'create',
    'aggregate',
    'updateMany',
  ].forEach(m => {
    c[m] = jest.fn().mockReturnValue(c);
  });
  c.then = undefined;
  return c;
};
const makeModel = () => {
  const c = chain();
  const M = jest.fn(() => c);
  Object.assign(M, c);
  return M;
};

const mockDDDClaim = makeModel();
const mockDDDClaimBatch = makeModel();
const mockDDDClaimAppeal = makeModel();
const mockDDDEOB = makeModel();

jest.mock('../../models/DddClaimsProcessor', () => ({
  DDDClaim: mockDDDClaim,
  DDDClaimBatch: mockDDDClaimBatch,
  DDDClaimAppeal: mockDDDClaimAppeal,
  DDDEOB: mockDDDEOB,
  CLAIM_STATUSES: ['draft', 'submitted', 'approved', 'denied'],
  CLAIM_TYPES: ['institutional', 'professional'],
  DENIAL_REASONS: ['missing_info', 'not_covered'],
  APPEAL_STATUSES: ['pending', 'submitted', 'approved', 'denied'],
  APPEAL_LEVELS: ['first', 'second', 'external'],
  SUBMISSION_CHANNELS: ['electronic', 'paper'],
  EOB_TYPES: ['standard', 'detailed'],
  ADJUDICATION_TYPES: ['auto', 'manual'],
  BUILTIN_CLAIM_TEMPLATES: [{ code: 'DEFAULT' }],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor() {}
    log() {}
    _create(M, d) {
      return M.create(d);
    }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...o }).lean();
    }
    _list(M, f, o) {
      return M.find(f)
        .sort(o?.sort || {})
        .lean();
    }
    _getById(M, id) {
      return M.findById(id).lean();
    }
  };
});

const service = require('../../services/dddClaimsProcessor');

beforeEach(() => {
  [mockDDDClaim, mockDDDClaimBatch, mockDDDClaimAppeal, mockDDDEOB].forEach(M => {
    Object.values(M).forEach(v => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
  });
});

/* ═══════════ helpers ═══════════ */
const fakeClaim = (overrides = {}) => ({
  _id: 'c1',
  status: 'draft',
  lines: [],
  diagnosis: ['Z00'],
  policyId: 'pol1',
  history: [],
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

describe('dddClaimsProcessor', () => {
  /* ── initialize ── */
  it('initialize returns true', async () => {
    expect(await service.initialize()).toBe(true);
  });

  /* ── Sequence generators ── */
  describe('_nextClaimNumber', () => {
    it('generates CLM- number', async () => {
      mockDDDClaim.countDocuments.mockResolvedValue(5);
      const r = await service._nextClaimNumber();
      expect(r).toMatch(/^CLM-\d{4}-0000006$/);
    });
  });

  describe('_nextBatchNumber', () => {
    it('generates BATCH- number', async () => {
      mockDDDClaimBatch.countDocuments.mockResolvedValue(2);
      const r = await service._nextBatchNumber();
      expect(r).toMatch(/^BATCH-\d{4}-00003$/);
    });
  });

  describe('_nextAppealNumber', () => {
    it('generates APL- number', async () => {
      mockDDDClaimAppeal.countDocuments.mockResolvedValue(0);
      const r = await service._nextAppealNumber();
      expect(r).toMatch(/^APL-\d{4}-000001$/);
    });
  });

  describe('_nextEOBNumber', () => {
    it('generates EOB- number', async () => {
      mockDDDEOB.countDocuments.mockResolvedValue(9);
      const r = await service._nextEOBNumber();
      expect(r).toMatch(/^EOB-\d{4}-0000010$/);
    });
  });

  /* ── Claim CRUD ── */
  describe('listClaims', () => {
    it('returns all claims sorted', async () => {
      mockDDDClaim.find.mockReturnThis();
      mockDDDClaim.sort.mockReturnThis();
      mockDDDClaim.lean.mockResolvedValue([{ _id: 'c1' }]);
      expect(await service.listClaims({})).toHaveLength(1);
      expect(mockDDDClaim.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
    it('applies beneficiaryId filter', async () => {
      mockDDDClaim.find.mockReturnThis();
      mockDDDClaim.sort.mockReturnThis();
      mockDDDClaim.lean.mockResolvedValue([]);
      await service.listClaims({ beneficiaryId: 'b1' });
      expect(mockDDDClaim.find).toHaveBeenCalledWith(
        expect.objectContaining({ beneficiaryId: 'b1' })
      );
    });
    it('applies date range filter', async () => {
      mockDDDClaim.find.mockReturnThis();
      mockDDDClaim.sort.mockReturnThis();
      mockDDDClaim.lean.mockResolvedValue([]);
      await service.listClaims({ from: '2025-01-01', to: '2025-12-31' });
      expect(mockDDDClaim.find).toHaveBeenCalledWith(
        expect.objectContaining({
          submittedAt: expect.objectContaining({ $gte: expect.any(Date), $lte: expect.any(Date) }),
        })
      );
    });
  });

  describe('getClaim', () => {
    it('returns by id', async () => {
      mockDDDClaim.findById.mockReturnThis();
      mockDDDClaim.lean.mockResolvedValue({ _id: 'c1' });
      expect(await service.getClaim('c1')).toHaveProperty('_id');
    });
  });

  describe('createClaim', () => {
    it('auto-generates claimNumber when missing', async () => {
      mockDDDClaim.countDocuments.mockResolvedValue(0);
      mockDDDClaim.create.mockResolvedValue({ _id: 'c1', claimNumber: 'CLM-2026-0000001' });
      const r = await service.createClaim({ lines: [{ quantity: 2, unitPrice: 50 }] });
      expect(r).toHaveProperty('claimNumber');
    });
    it('keeps provided claimNumber', async () => {
      mockDDDClaim.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createClaim({ claimNumber: 'CUSTOM', lines: [] });
      expect(r.claimNumber).toBe('CUSTOM');
    });
    it('calculates totalCharged from lines', async () => {
      mockDDDClaim.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createClaim({ lines: [{ quantity: 3, unitPrice: 100 }] });
      expect(r.totalCharged).toBe(300);
    });
  });

  describe('updateClaim', () => {
    it('updates via _update', async () => {
      mockDDDClaim.findByIdAndUpdate.mockReturnThis();
      mockDDDClaim.lean.mockResolvedValue({ _id: 'c1', status: 'validated' });
      const r = await service.updateClaim('c1', { status: 'validated' });
      expect(r.status).toBe('validated');
    });
  });

  describe('validateClaim', () => {
    it('returns errors when diagnosis missing', async () => {
      mockDDDClaim.findById.mockResolvedValue(
        fakeClaim({ diagnosis: [], lines: [{}], policyId: 'p1' })
      );
      const r = await service.validateClaim('c1');
      expect(r.valid).toBe(false);
      expect(r.errors).toContain('At least one diagnosis required');
    });
    it('validates and updates status', async () => {
      const claim = fakeClaim({ diagnosis: ['Z00'], lines: [{}], policyId: 'p1' });
      mockDDDClaim.findById.mockResolvedValue(claim);
      const r = await service.validateClaim('c1');
      expect(r.valid).toBe(true);
      expect(claim.status).toBe('validated');
      expect(claim.save).toHaveBeenCalled();
    });
    it('throws when claim not found', async () => {
      mockDDDClaim.findById.mockResolvedValue(null);
      await expect(service.validateClaim('x')).rejects.toThrow('Claim not found');
    });
  });

  describe('submitClaim', () => {
    it('updates status to submitted', async () => {
      const claim = fakeClaim();
      mockDDDClaim.findById.mockResolvedValue(claim);
      await service.submitClaim('c1', 'user1');
      expect(claim.status).toBe('submitted');
      expect(claim.save).toHaveBeenCalled();
    });
    it('throws when claim not found', async () => {
      mockDDDClaim.findById.mockResolvedValue(null);
      await expect(service.submitClaim('x', 'u')).rejects.toThrow('Claim not found');
    });
  });

  describe('adjudicateClaim', () => {
    it('fully approves with no denials', async () => {
      const line = { _id: 'l1' };
      const claim = fakeClaim({
        lines: { id: jest.fn().mockReturnValue(line) },
        history: [],
      });
      mockDDDClaim.findById.mockResolvedValue(claim);
      await service.adjudicateClaim('c1', {
        lines: [{ lineId: 'l1', approvedAmount: 100, deniedAmount: 0 }],
      });
      expect(claim.status).toBe('approved');
      expect(claim.totalApproved).toBe(100);
      expect(claim.save).toHaveBeenCalled();
    });
    it('sets denied when totalApproved=0', async () => {
      const line = { _id: 'l1' };
      const claim = fakeClaim({
        lines: { id: jest.fn().mockReturnValue(line) },
        history: [],
      });
      mockDDDClaim.findById.mockResolvedValue(claim);
      await service.adjudicateClaim('c1', {
        lines: [{ lineId: 'l1', approvedAmount: 0, deniedAmount: 50 }],
        denialReasons: ['not_covered'],
      });
      expect(claim.status).toBe('denied');
    });
    it('sets partially_approved when both amounts', async () => {
      const line = { _id: 'l1' };
      const claim = fakeClaim({
        lines: { id: jest.fn().mockReturnValue(line) },
        history: [],
      });
      mockDDDClaim.findById.mockResolvedValue(claim);
      await service.adjudicateClaim('c1', {
        lines: [{ lineId: 'l1', approvedAmount: 80, deniedAmount: 20 }],
      });
      expect(claim.status).toBe('partially_approved');
    });
    it('throws when claim not found', async () => {
      mockDDDClaim.findById.mockResolvedValue(null);
      await expect(service.adjudicateClaim('x', {})).rejects.toThrow('Claim not found');
    });
  });

  describe('markClaimPaid', () => {
    it('marks claim paid', async () => {
      const claim = fakeClaim({ totalApproved: 100, history: [] });
      mockDDDClaim.findById.mockResolvedValue(claim);
      await service.markClaimPaid('c1', { amount: 100 });
      expect(claim.status).toBe('paid');
      expect(claim.totalPaid).toBe(100);
    });
    it('marks partially_paid when amount < approved', async () => {
      const claim = fakeClaim({ totalApproved: 100, history: [] });
      mockDDDClaim.findById.mockResolvedValue(claim);
      await service.markClaimPaid('c1', { amount: 50 });
      expect(claim.status).toBe('partially_paid');
    });
    it('throws when claim not found', async () => {
      mockDDDClaim.findById.mockResolvedValue(null);
      await expect(service.markClaimPaid('x', {})).rejects.toThrow('Claim not found');
    });
  });

  /* ── Batches ── */
  describe('listBatches', () => {
    it('returns batches sorted', async () => {
      mockDDDClaimBatch.find.mockReturnThis();
      mockDDDClaimBatch.sort.mockReturnThis();
      mockDDDClaimBatch.lean.mockResolvedValue([]);
      expect(await service.listBatches({})).toEqual([]);
    });
  });

  describe('getBatch', () => {
    it('returns by id', async () => {
      mockDDDClaimBatch.findById.mockReturnThis();
      mockDDDClaimBatch.lean.mockResolvedValue({ _id: 'b1' });
      expect(await service.getBatch('b1')).toHaveProperty('_id');
    });
  });

  describe('createBatch', () => {
    it('auto-generates batchNumber', async () => {
      mockDDDClaimBatch.countDocuments.mockResolvedValue(0);
      mockDDDClaimBatch.create.mockResolvedValue({ _id: 'b1', batchNumber: 'BATCH-2026-00001' });
      const r = await service.createBatch({ claimIds: ['c1', 'c2'] });
      expect(r).toHaveProperty('batchNumber');
    });
  });

  describe('submitBatch', () => {
    it('submits batch and updates claims', async () => {
      const batch = { _id: 'b1', claimIds: ['c1'], save: jest.fn().mockResolvedValue(true) };
      mockDDDClaimBatch.findById.mockResolvedValue(batch);
      mockDDDClaim.updateMany.mockResolvedValue({ modifiedCount: 1 });
      await service.submitBatch('b1', 'user1');
      expect(batch.status).toBe('submitted');
      expect(mockDDDClaim.updateMany).toHaveBeenCalled();
    });
    it('throws when batch not found', async () => {
      mockDDDClaimBatch.findById.mockResolvedValue(null);
      await expect(service.submitBatch('x', 'u')).rejects.toThrow('Batch not found');
    });
  });

  /* ── Appeals ── */
  describe('listAppeals', () => {
    it('returns appeals sorted', async () => {
      mockDDDClaimAppeal.find.mockReturnThis();
      mockDDDClaimAppeal.sort.mockReturnThis();
      mockDDDClaimAppeal.lean.mockResolvedValue([]);
      expect(await service.listAppeals({})).toEqual([]);
    });
  });

  describe('getAppeal', () => {
    it('returns by id', async () => {
      mockDDDClaimAppeal.findById.mockReturnThis();
      mockDDDClaimAppeal.lean.mockResolvedValue({ _id: 'a1' });
      expect(await service.getAppeal('a1')).toHaveProperty('_id');
    });
  });

  describe('createAppeal', () => {
    it('creates appeal and updates claim status', async () => {
      mockDDDClaimAppeal.countDocuments.mockResolvedValue(0);
      mockDDDClaimAppeal.create.mockResolvedValue({ _id: 'a1' });
      mockDDDClaim.findByIdAndUpdate.mockResolvedValue({});
      const r = await service.createAppeal({ claimId: 'c1' });
      expect(r).toHaveProperty('_id');
      expect(mockDDDClaim.findByIdAndUpdate).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ status: 'appealed' })
      );
    });
  });

  describe('submitAppeal', () => {
    it('submits via findByIdAndUpdate', async () => {
      mockDDDClaimAppeal.findByIdAndUpdate.mockReturnThis();
      mockDDDClaimAppeal.lean.mockResolvedValue({ _id: 'a1', status: 'submitted' });
      const r = await service.submitAppeal('a1', 'user1');
      expect(r.status).toBe('submitted');
    });
  });

  describe('resolveAppeal', () => {
    it('approves appeal', async () => {
      mockDDDClaimAppeal.findByIdAndUpdate.mockReturnThis();
      mockDDDClaimAppeal.lean.mockResolvedValue({ _id: 'a1', status: 'approved' });
      const r = await service.resolveAppeal('a1', { approved: true, reviewer: 'dr1' });
      expect(r.status).toBe('approved');
    });
    it('denies appeal', async () => {
      mockDDDClaimAppeal.findByIdAndUpdate.mockReturnThis();
      mockDDDClaimAppeal.lean.mockResolvedValue({ _id: 'a1', status: 'denied' });
      const r = await service.resolveAppeal('a1', { approved: false, reviewer: 'dr1' });
      expect(r.status).toBe('denied');
    });
  });

  /* ── EOBs ── */
  describe('listEOBs', () => {
    it('returns EOBs sorted', async () => {
      mockDDDEOB.find.mockReturnThis();
      mockDDDEOB.sort.mockReturnThis();
      mockDDDEOB.lean.mockResolvedValue([]);
      expect(await service.listEOBs({})).toEqual([]);
    });
  });

  describe('getEOB', () => {
    it('returns by id', async () => {
      mockDDDEOB.findById.mockReturnThis();
      mockDDDEOB.lean.mockResolvedValue({ _id: 'e1' });
      expect(await service.getEOB('e1')).toHaveProperty('_id');
    });
  });

  describe('createEOB', () => {
    it('creates EOB and links to claim', async () => {
      mockDDDEOB.countDocuments.mockResolvedValue(0);
      mockDDDEOB.create.mockResolvedValue({ _id: 'e1' });
      mockDDDClaim.findByIdAndUpdate.mockResolvedValue({});
      const r = await service.createEOB({ claimId: 'c1' });
      expect(r).toHaveProperty('_id');
      expect(mockDDDClaim.findByIdAndUpdate).toHaveBeenCalledWith('c1', { eobId: 'e1' });
    });
  });

  /* ── Analytics ── */
  describe('getClaimsSummary', () => {
    it('returns summary with denial rate', async () => {
      mockDDDClaim.aggregate.mockReturnThis();
      mockDDDClaim.then = jest.fn(cb => cb([{ _id: 'approved', count: 8 }]));
      mockDDDClaim.countDocuments
        .mockResolvedValueOnce(2) // denied
        .mockResolvedValueOnce(10); // total
      const r = await service.getClaimsSummary({});
      expect(r).toHaveProperty('denialRate');
      expect(r).toHaveProperty('totalClaims');
      delete mockDDDClaim.then;
    });
  });

  describe('getAgingReport', () => {
    it('returns 5 age ranges', async () => {
      mockDDDClaim.find.mockReturnThis();
      mockDDDClaim.lean.mockResolvedValue([]);
      const r = await service.getAgingReport();
      expect(r).toHaveLength(5);
      expect(r[0]).toHaveProperty('label', '0-30 days');
    });
  });
});

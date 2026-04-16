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
    'insertMany',
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

const mockDDDArchiveRecord = makeModel();
const mockDDDRetentionPolicy = makeModel();
const mockDDDLegalHold = makeModel();
const mockDDDDisposalRequest = makeModel();

jest.mock('../../models/DddArchiveManager', () => ({
  DDDArchiveRecord: mockDDDArchiveRecord,
  DDDRetentionPolicy: mockDDDRetentionPolicy,
  DDDLegalHold: mockDDDLegalHold,
  DDDDisposalRequest: mockDDDDisposalRequest,
  ARCHIVE_TYPES: ['document', 'record', 'medical'],
  ARCHIVE_STATUSES: ['active', 'archived', 'pending_disposal', 'restored'],
  RETENTION_CATEGORIES: ['medical', 'financial', 'legal'],
  HOLD_TYPES: ['legal', 'regulatory', 'investigation'],
  DISPOSAL_METHODS: ['shred', 'digital_delete', 'incinerate'],
  ARCHIVE_PRIORITIES: ['normal', 'high', 'critical'],
  BUILTIN_RETENTION_POLICIES: [
    { code: 'MED-7Y', name: 'Medical Records 7 Years', retentionDays: 2555 },
    { code: 'FIN-5Y', name: 'Financial Records 5 Years', retentionDays: 1825 },
  ],
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

const service = require('../../services/dddArchiveManager');

beforeEach(() => {
  [mockDDDArchiveRecord, mockDDDRetentionPolicy, mockDDDLegalHold, mockDDDDisposalRequest].forEach(
    M => {
      Object.values(M).forEach(v => {
        if (typeof v === 'function' && v.mockClear) v.mockClear();
      });
    }
  );
});

describe('dddArchiveManager', () => {
  /* ── initialize ── */
  describe('initialize', () => {
    it('seeds builtin retention policies', async () => {
      mockDDDRetentionPolicy.findOne.mockReturnThis();
      mockDDDRetentionPolicy.lean.mockResolvedValue(null);
      mockDDDRetentionPolicy.create.mockResolvedValue({});
      const r = await service.initialize();
      expect(r).toBe(true);
      expect(mockDDDRetentionPolicy.create).toHaveBeenCalledTimes(2);
    });

    it('skips existing policies', async () => {
      mockDDDRetentionPolicy.findOne.mockReturnThis();
      mockDDDRetentionPolicy.lean.mockResolvedValue({ _id: 'exists' });
      await service.initialize();
      expect(mockDDDRetentionPolicy.create).not.toHaveBeenCalled();
    });
  });

  /* ── Archives ── */
  describe('listArchives', () => {
    it('returns archives sorted by archivedAt', async () => {
      mockDDDArchiveRecord.find.mockReturnThis();
      mockDDDArchiveRecord.sort.mockReturnThis();
      mockDDDArchiveRecord.limit.mockReturnThis();
      mockDDDArchiveRecord.lean.mockResolvedValue([{ _id: 'a1' }]);
      const r = await service.listArchives({});
      expect(r).toEqual([{ _id: 'a1' }]);
    });

    it('applies type/status/priority filters', async () => {
      mockDDDArchiveRecord.find.mockReturnThis();
      mockDDDArchiveRecord.sort.mockReturnThis();
      mockDDDArchiveRecord.limit.mockReturnThis();
      mockDDDArchiveRecord.lean.mockResolvedValue([]);
      await service.listArchives({ type: 'document', status: 'active', priority: 'high' });
      expect(mockDDDArchiveRecord.find).toHaveBeenCalledWith({
        type: 'document',
        status: 'active',
        priority: 'high',
      });
    });
  });

  describe('getArchive', () => {
    it('returns archive by id via _getById', async () => {
      mockDDDArchiveRecord.findById.mockReturnThis();
      mockDDDArchiveRecord.lean.mockResolvedValue({ _id: 'a1' });
      const r = await service.getArchive('a1');
      expect(r).toEqual({ _id: 'a1' });
    });
  });

  describe('createArchive', () => {
    it('creates archive with auto-code', async () => {
      mockDDDArchiveRecord.create.mockResolvedValue({ _id: 'a1', archiveCode: 'ARC-123' });
      const r = await service.createArchive({ title: 'Doc' });
      expect(r.archiveCode).toMatch(/^ARC-/);
    });

    it('keeps provided archiveCode', async () => {
      mockDDDArchiveRecord.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createArchive({ archiveCode: 'CUSTOM' });
      expect(r.archiveCode).toBe('CUSTOM');
    });
  });

  describe('updateArchive', () => {
    it('updates via _update', async () => {
      mockDDDArchiveRecord.findByIdAndUpdate.mockReturnThis();
      mockDDDArchiveRecord.lean.mockResolvedValue({ _id: 'a1', title: 'Updated' });
      const r = await service.updateArchive('a1', { title: 'Updated' });
      expect(r.title).toBe('Updated');
    });
  });

  describe('restoreArchive', () => {
    it('sets status to restored', async () => {
      mockDDDArchiveRecord.findByIdAndUpdate.mockReturnThis();
      mockDDDArchiveRecord.lean.mockResolvedValue({ _id: 'a1', status: 'restored' });
      const r = await service.restoreArchive('a1');
      expect(r.status).toBe('restored');
    });
  });

  /* ── Retention Policies ── */
  describe('listPolicies', () => {
    it('lists active policies via _list', async () => {
      mockDDDRetentionPolicy.find.mockReturnThis();
      mockDDDRetentionPolicy.sort.mockReturnThis();
      mockDDDRetentionPolicy.lean.mockResolvedValue([{ code: 'MED-7Y' }]);
      const r = await service.listPolicies();
      expect(r).toHaveLength(1);
    });
  });

  describe('createPolicy', () => {
    it('creates policy via _create', async () => {
      mockDDDRetentionPolicy.create.mockResolvedValue({ _id: 'p1' });
      const r = await service.createPolicy({ code: 'NEW', name: 'Test' });
      expect(r).toHaveProperty('_id');
    });
  });

  describe('updatePolicy', () => {
    it('updates via _update', async () => {
      mockDDDRetentionPolicy.findByIdAndUpdate.mockReturnThis();
      mockDDDRetentionPolicy.lean.mockResolvedValue({ _id: 'p1', name: 'Updated' });
      const r = await service.updatePolicy('p1', { name: 'Updated' });
      expect(r.name).toBe('Updated');
    });
  });

  /* ── Legal Holds ── */
  describe('listHolds', () => {
    it('returns holds sorted by issuedAt', async () => {
      mockDDDLegalHold.find.mockReturnThis();
      mockDDDLegalHold.sort.mockReturnThis();
      mockDDDLegalHold.lean.mockResolvedValue([{ _id: 'h1' }]);
      const r = await service.listHolds({});
      expect(r).toHaveLength(1);
    });

    it('applies isActive and type filters', async () => {
      mockDDDLegalHold.find.mockReturnThis();
      mockDDDLegalHold.sort.mockReturnThis();
      mockDDDLegalHold.lean.mockResolvedValue([]);
      await service.listHolds({ isActive: true, type: 'legal' });
      expect(mockDDDLegalHold.find).toHaveBeenCalledWith({ isActive: true, type: 'legal' });
    });
  });

  describe('createHold', () => {
    it('creates hold with auto-code', async () => {
      mockDDDLegalHold.create.mockResolvedValue({ _id: 'h1', holdCode: 'HOLD-123' });
      const r = await service.createHold({ reason: 'Audit' });
      expect(r.holdCode).toMatch(/^HOLD-/);
    });
  });

  describe('releaseHold', () => {
    it('deactivates hold with release details', async () => {
      mockDDDLegalHold.findByIdAndUpdate.mockReturnThis();
      mockDDDLegalHold.lean.mockResolvedValue({ _id: 'h1', isActive: false });
      const r = await service.releaseHold('h1', 'u1', 'Resolved');
      expect(r.isActive).toBe(false);
      expect(mockDDDLegalHold.findByIdAndUpdate).toHaveBeenCalledWith(
        'h1',
        expect.objectContaining({ isActive: false, releaseReason: 'Resolved' }),
        { new: true }
      );
    });
  });

  /* ── Disposals ── */
  describe('listDisposals', () => {
    it('returns disposals', async () => {
      mockDDDDisposalRequest.find.mockReturnThis();
      mockDDDDisposalRequest.sort.mockReturnThis();
      mockDDDDisposalRequest.lean.mockResolvedValue([{ _id: 'd1' }]);
      const r = await service.listDisposals({});
      expect(r).toHaveLength(1);
    });

    it('applies status filter', async () => {
      mockDDDDisposalRequest.find.mockReturnThis();
      mockDDDDisposalRequest.sort.mockReturnThis();
      mockDDDDisposalRequest.lean.mockResolvedValue([]);
      await service.listDisposals({ status: 'pending' });
      expect(mockDDDDisposalRequest.find).toHaveBeenCalledWith({ status: 'pending' });
    });
  });

  describe('createDisposal', () => {
    it('creates disposal with auto-code', async () => {
      mockDDDDisposalRequest.create.mockResolvedValue({ _id: 'd1', disposalCode: 'DSP-123' });
      const r = await service.createDisposal({ recordId: 'a1' });
      expect(r.disposalCode).toMatch(/^DSP-/);
    });
  });

  describe('approveDisposal', () => {
    it('approves with userId and timestamp', async () => {
      mockDDDDisposalRequest.findByIdAndUpdate.mockReturnThis();
      mockDDDDisposalRequest.lean.mockResolvedValue({ _id: 'd1', status: 'approved' });
      const r = await service.approveDisposal('d1', 'u1');
      expect(r.status).toBe('approved');
    });
  });

  /* ── Analytics ── */
  describe('getArchiveAnalytics', () => {
    it('returns aggregate counts', async () => {
      mockDDDArchiveRecord.countDocuments.mockResolvedValueOnce(50).mockResolvedValueOnce(3);
      mockDDDRetentionPolicy.countDocuments.mockResolvedValue(5);
      mockDDDLegalHold.countDocuments.mockResolvedValue(2);
      mockDDDDisposalRequest.countDocuments.mockResolvedValue(10);
      const r = await service.getArchiveAnalytics();
      expect(r).toEqual({
        archives: 50,
        policies: 5,
        activeHolds: 2,
        disposals: 10,
        pendingDisposal: 3,
      });
    });
  });
});

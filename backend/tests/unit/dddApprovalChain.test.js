'use strict';

/* ── helpers ── */
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

let service, DDDApprovalPolicy, DDDApprovalRequest, DDDDelegation;

beforeEach(() => {
  jest.resetModules();
  DDDApprovalPolicy = makeModel();
  DDDApprovalRequest = makeModel();
  DDDDelegation = makeModel();
  global.DDDApprovalPolicy = DDDApprovalPolicy;
  global.DDDApprovalRequest = DDDApprovalRequest;
  global.DDDDelegation = DDDDelegation;
  global.oid = jest.fn(v => v);

  jest.mock('../../services/base/BaseCrudService', () => {
    return class BaseCrudService {
      constructor() {}
      log() {}
      _create(M, data) {
        return M.create(data);
      }
      _update(M, id, data, opts) {
        return M.findByIdAndUpdate(id, data, { new: true, ...opts }).lean();
      }
      _list(M, filter, opts) {
        return M.find(filter)
          .sort(opts.sort || {})
          .lean();
      }
    };
  });

  service = require('../../services/dddApprovalChain');
});

afterEach(() => {
  delete global.DDDApprovalPolicy;
  delete global.DDDApprovalRequest;
  delete global.DDDDelegation;
  delete global.oid;
  jest.restoreAllMocks();
});

describe('dddApprovalChain', () => {
  /* ── listPolicies ── */
  describe('listPolicies', () => {
    it('returns paginated policies', async () => {
      DDDApprovalPolicy.find.mockReturnThis();
      DDDApprovalPolicy.sort.mockReturnThis();
      DDDApprovalPolicy.skip.mockReturnThis();
      DDDApprovalPolicy.limit.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue([{ _id: 'p1' }]);
      DDDApprovalPolicy.countDocuments.mockResolvedValue(1);

      const r = await service.listPolicies({});
      expect(r).toEqual({ data: [{ _id: 'p1' }], total: 1, page: 1, pages: 1 });
    });

    it('applies type filter', async () => {
      DDDApprovalPolicy.find.mockReturnThis();
      DDDApprovalPolicy.sort.mockReturnThis();
      DDDApprovalPolicy.skip.mockReturnThis();
      DDDApprovalPolicy.limit.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue([]);
      DDDApprovalPolicy.countDocuments.mockResolvedValue(0);

      await service.listPolicies({ type: 'leave' });
      expect(DDDApprovalPolicy.find).toHaveBeenCalled();
    });
  });

  /* ── getPolicy ── */
  describe('getPolicy', () => {
    it('returns policy by id', async () => {
      DDDApprovalPolicy.findById.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue({ _id: 'p1', name: 'Test' });
      const r = await service.getPolicy('p1');
      expect(r).toEqual({ _id: 'p1', name: 'Test' });
    });
  });

  /* ── createPolicy ── */
  describe('createPolicy', () => {
    it('creates a policy via _create', async () => {
      DDDApprovalPolicy.create.mockResolvedValue({ _id: 'p1' });
      const r = await service.createPolicy({ name: 'Test' });
      expect(r).toHaveProperty('_id');
    });
  });

  /* ── updatePolicy ── */
  describe('updatePolicy', () => {
    it('updates policy by id', async () => {
      DDDApprovalPolicy.findByIdAndUpdate.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue({ _id: 'p1', name: 'Updated' });
      const r = await service.updatePolicy('p1', { name: 'Updated' });
      expect(r.name).toBe('Updated');
    });
  });

  /* ── createRequest ── */
  describe('createRequest', () => {
    it('creates a request with auto-code', async () => {
      DDDApprovalPolicy.findById.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue({
        _id: 'p1',
        type: 'leave',
        levels: [{ levelNumber: 1, autoEscalateHours: 24 }],
      });
      DDDApprovalRequest.countDocuments.mockResolvedValue(5);
      DDDApprovalRequest.create.mockResolvedValue({ _id: 'r1', code: 'APR-X', status: 'pending' });

      const r = await service.createRequest({ policyId: 'p1' });
      expect(DDDApprovalRequest.create).toHaveBeenCalled();
      expect(r).toHaveProperty('code');
    });

    it('throws when policy not found', async () => {
      DDDApprovalPolicy.findById.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue(null);
      await expect(service.createRequest({ policyId: 'bad' })).rejects.toThrow(
        'Approval policy not found'
      );
    });
  });

  /* ── listRequests ── */
  describe('listRequests', () => {
    it('returns paginated requests', async () => {
      DDDApprovalRequest.find.mockReturnThis();
      DDDApprovalRequest.sort.mockReturnThis();
      DDDApprovalRequest.skip.mockReturnThis();
      DDDApprovalRequest.limit.mockReturnThis();
      DDDApprovalRequest.populate.mockReturnThis();
      DDDApprovalRequest.lean.mockResolvedValue([]);
      DDDApprovalRequest.countDocuments.mockResolvedValue(0);

      const r = await service.listRequests({});
      expect(r).toHaveProperty('data');
      expect(r).toHaveProperty('total');
    });
  });

  /* ── getRequest ── */
  describe('getRequest', () => {
    it('returns request with populations', async () => {
      DDDApprovalRequest.findById.mockReturnThis();
      DDDApprovalRequest.populate.mockReturnThis();
      DDDApprovalRequest.lean.mockResolvedValue({ _id: 'r1' });
      const r = await service.getRequest('r1');
      expect(r).toEqual({ _id: 'r1' });
    });
  });

  /* ── decide ── */
  describe('decide', () => {
    const mockRequest = (overrides = {}) => {
      const req = {
        _id: 'r1',
        status: 'pending',
        policyId: 'p1',
        type: 'leave',
        currentLevel: 1,
        decisions: [],
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnThis(),
        ...overrides,
      };
      return req;
    };

    it('rejects request', async () => {
      const req = mockRequest();
      DDDApprovalRequest.findById.mockResolvedValue(req);
      DDDApprovalPolicy.findById.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue({ _id: 'p1', levels: [{ levelNumber: 1 }] });
      DDDDelegation.findOne.mockReturnThis();
      DDDDelegation.lean.mockResolvedValue(null);

      const r = await service.decide('r1', 'u1', 'rejected', 'bad');
      expect(req.status).toBe('rejected');
      expect(req.save).toHaveBeenCalled();
    });

    it('approves and advances to next level', async () => {
      const req = mockRequest();
      DDDApprovalRequest.findById.mockResolvedValue(req);
      DDDApprovalPolicy.findById.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue({
        _id: 'p1',
        levels: [{ levelNumber: 1 }, { levelNumber: 2, autoEscalateHours: 48 }],
      });
      DDDDelegation.findOne.mockReturnThis();
      DDDDelegation.lean.mockResolvedValue(null);

      await service.decide('r1', 'u1', 'approved', 'ok');
      expect(req.currentLevel).toBe(2);
      expect(req.save).toHaveBeenCalled();
    });

    it('approves and completes when last level', async () => {
      const req = mockRequest();
      DDDApprovalRequest.findById.mockResolvedValue(req);
      DDDApprovalPolicy.findById.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue({ _id: 'p1', levels: [{ levelNumber: 1 }] });
      DDDDelegation.findOne.mockReturnThis();
      DDDDelegation.lean.mockResolvedValue(null);

      await service.decide('r1', 'u1', 'approved', 'ok');
      expect(req.status).toBe('approved');
      expect(req.completedAt).toBeInstanceOf(Date);
    });

    it('throws when request not pending', async () => {
      DDDApprovalRequest.findById.mockResolvedValue({ status: 'approved' });
      await expect(service.decide('r1', 'u1', 'approved')).rejects.toThrow('Request not pending');
    });

    it('returns request when decision is "returned"', async () => {
      const req = mockRequest();
      DDDApprovalRequest.findById.mockResolvedValue(req);
      DDDApprovalPolicy.findById.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue({ _id: 'p1', levels: [{ levelNumber: 1 }] });
      DDDDelegation.findOne.mockReturnThis();
      DDDDelegation.lean.mockResolvedValue(null);

      await service.decide('r1', 'u1', 'returned', 'needs changes');
      expect(req.status).toBe('returned');
    });
  });

  /* ── escalate ── */
  describe('escalate', () => {
    it('escalates a request', async () => {
      DDDApprovalRequest.findByIdAndUpdate.mockReturnThis();
      DDDApprovalRequest.lean.mockResolvedValue({ _id: 'r1', status: 'escalated' });
      const r = await service.escalate('r1', 'u1', 'overdue');
      expect(r.status).toBe('escalated');
    });
  });

  /* ── cancelRequest ── */
  describe('cancelRequest', () => {
    it('cancels a request', async () => {
      DDDApprovalRequest.findByIdAndUpdate.mockReturnThis();
      DDDApprovalRequest.lean.mockResolvedValue({ _id: 'r1', status: 'cancelled' });
      const r = await service.cancelRequest('r1');
      expect(r.status).toBe('cancelled');
    });
  });

  /* ── getPendingForUser ── */
  describe('getPendingForUser', () => {
    it('returns empty when no matching policies', async () => {
      DDDApprovalPolicy.find.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue([]);
      const r = await service.getPendingForUser('u1', 'admin');
      expect(r).toEqual({ data: [], total: 0 });
    });

    it('returns pending requests for matching user', async () => {
      DDDApprovalPolicy.find.mockReturnThis();
      DDDApprovalPolicy.lean.mockResolvedValue([
        { _id: 'p1', levels: [{ levelNumber: 1, approverId: 'u1' }] },
      ]);
      DDDApprovalRequest.find.mockReturnThis();
      DDDApprovalRequest.sort.mockReturnThis();
      DDDApprovalRequest.populate.mockReturnThis();
      DDDApprovalRequest.lean.mockResolvedValue([{ _id: 'r1' }]);

      const r = await service.getPendingForUser('u1', 'admin');
      expect(r.total).toBe(1);
    });
  });

  /* ── Delegations ── */
  describe('delegations', () => {
    it('creates delegation via _create', async () => {
      DDDDelegation.create.mockResolvedValue({ _id: 'd1' });
      const r = await service.createDelegation({ delegatorId: 'u1', delegateId: 'u2' });
      expect(r).toHaveProperty('_id');
    });

    it('lists active delegations', async () => {
      DDDDelegation.find.mockReturnThis();
      DDDDelegation.populate.mockReturnThis();
      DDDDelegation.lean.mockResolvedValue([{ _id: 'd1' }]);
      const r = await service.listDelegations('u1');
      expect(r).toHaveLength(1);
    });

    it('revokes delegation', async () => {
      DDDDelegation.findByIdAndUpdate.mockReturnThis();
      DDDDelegation.lean.mockResolvedValue({ _id: 'd1', isActive: false });
      const r = await service.revokeDelegation('d1');
      expect(r.isActive).toBe(false);
    });
  });

  /* ── autoEscalate ── */
  describe('autoEscalate', () => {
    it('escalates overdue requests', async () => {
      DDDApprovalRequest.find.mockReturnThis();
      DDDApprovalRequest.lean.mockResolvedValue([{ _id: 'r1' }, { _id: 'r2' }]);
      DDDApprovalRequest.findByIdAndUpdate.mockResolvedValue({});

      const r = await service.autoEscalate();
      expect(r).toEqual({ escalated: 2, total: 2 });
    });

    it('returns zero when nothing overdue', async () => {
      DDDApprovalRequest.find.mockReturnThis();
      DDDApprovalRequest.lean.mockResolvedValue([]);
      const r = await service.autoEscalate();
      expect(r).toEqual({ escalated: 0, total: 0 });
    });
  });

  /* ── getStats ── */
  describe('getStats', () => {
    it('returns approval chain statistics', async () => {
      DDDApprovalPolicy.countDocuments.mockResolvedValue(5);
      DDDApprovalRequest.countDocuments
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(20) // approved
        .mockResolvedValueOnce(3); // rejected
      DDDApprovalRequest.aggregate.mockResolvedValue([{ _id: null, avg: 2.5 }]);

      const r = await service.getStats();
      expect(r).toHaveProperty('policyCount', 5);
      expect(r).toHaveProperty('pendingCount', 10);
      expect(r).toHaveProperty('approvedCount', 20);
      expect(r).toHaveProperty('rejectedCount', 3);
      expect(r).toHaveProperty('avgApprovalDays', 2.5);
      expect(r).toHaveProperty('builtinPolicies');
    });

    it('returns 0 avg when no approved requests', async () => {
      DDDApprovalPolicy.countDocuments.mockResolvedValue(0);
      DDDApprovalRequest.countDocuments.mockResolvedValue(0);
      DDDApprovalRequest.aggregate.mockResolvedValue([]);
      const r = await service.getStats();
      expect(r.avgApprovalDays).toBe(0);
    });
  });
});

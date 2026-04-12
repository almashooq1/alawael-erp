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

const mockDDDContract = makeModel();
const mockDDDContractTemplate = makeModel();
const mockDDDContractAmendment = makeModel();
const mockDDDContractObligation = makeModel();

jest.mock('../../models/DddContractManager', () => ({
  DDDContract: mockDDDContract,
  DDDContractTemplate: mockDDDContractTemplate,
  DDDContractAmendment: mockDDDContractAmendment,
  DDDContractObligation: mockDDDContractObligation,
  CONTRACT_TYPES: ['service', 'supply'],
  CONTRACT_STATUSES: ['draft', 'active', 'expired'],
  OBLIGATION_TYPES: ['payment', 'delivery'],
  OBLIGATION_STATUSES: ['pending', 'fulfilled', 'overdue'],
  AMENDMENT_TYPES: ['addendum', 'modification'],
  TEMPLATE_CATEGORIES: ['standard', 'custom'],
  BUILTIN_CONTRACT_TEMPLATES: [{ code: 'CT1', name: 'Standard' }],
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

const svc = require('../../services/dddContractManager');

beforeEach(() => jest.clearAllMocks());

/* ─── singleton ─── */
describe('dddContractManager – singleton', () => {
  test('exports instance with expected methods', () => {
    expect(svc).toBeDefined();
    expect(typeof svc.listContracts).toBe('function');
    expect(typeof svc.getContractAnalytics).toBe('function');
  });
});

/* ─── initialize ─── */
describe('dddContractManager – initialize', () => {
  test('seeds templates via findOne/create', async () => {
    mockDDDContractTemplate.findOne.mockReturnValue(mockDDDContractTemplate);
    mockDDDContractTemplate.lean.mockResolvedValue(null);
    mockDDDContractTemplate.create.mockResolvedValue({});
    const r = await svc.initialize();
    expect(r).toBe(true);
    expect(mockDDDContractTemplate.findOne).toHaveBeenCalled();
  });

  test('skips create when template exists', async () => {
    mockDDDContractTemplate.findOne.mockReturnValue(mockDDDContractTemplate);
    mockDDDContractTemplate.lean.mockResolvedValue({ code: 'CT1' });
    await svc.initialize();
    expect(mockDDDContractTemplate.create).not.toHaveBeenCalled();
  });
});

/* ─── contracts ─── */
describe('dddContractManager – contracts', () => {
  test('listContracts with type/status filter', async () => {
    mockDDDContract.find.mockReturnValue(mockDDDContract);
    mockDDDContract.sort.mockReturnValue(mockDDDContract);
    mockDDDContract.limit.mockReturnValue(mockDDDContract);
    mockDDDContract.lean.mockResolvedValueOnce([]);
    await svc.listContracts({ type: 'service', status: 'active' });
    expect(mockDDDContract.find).toHaveBeenCalledWith({ type: 'service', status: 'active' });
  });

  test('getContract', async () => {
    mockDDDContract.findById.mockReturnValue(mockDDDContract);
    mockDDDContract.lean.mockResolvedValueOnce({ _id: 'c1' });
    await svc.getContract('c1');
    expect(mockDDDContract.findById).toHaveBeenCalledWith('c1');
  });

  test('createContract auto-generates contractCode', async () => {
    mockDDDContract.create.mockResolvedValueOnce({ contractCode: 'CTR-1' });
    await svc.createContract({ name: 'Test' });
    const arg = mockDDDContract.create.mock.calls[0][0];
    expect(arg.contractCode).toMatch(/^CTR-/);
  });

  test('createContract preserves existing code', async () => {
    mockDDDContract.create.mockResolvedValueOnce({ contractCode: 'CUSTOM' });
    await svc.createContract({ contractCode: 'CUSTOM' });
    const arg = mockDDDContract.create.mock.calls[0][0];
    expect(arg.contractCode).toBe('CUSTOM');
  });

  test('updateContract', async () => {
    mockDDDContract.findByIdAndUpdate.mockReturnValue(mockDDDContract);
    mockDDDContract.lean.mockResolvedValueOnce({ _id: 'c1' });
    await svc.updateContract('c1', { status: 'expired' });
    expect(mockDDDContract.findByIdAndUpdate).toHaveBeenCalled();
  });
});

/* ─── templates ─── */
describe('dddContractManager – templates', () => {
  test('listTemplates with category filter', async () => {
    mockDDDContractTemplate.find.mockReturnValue(mockDDDContractTemplate);
    mockDDDContractTemplate.sort.mockReturnValue(mockDDDContractTemplate);
    mockDDDContractTemplate.lean.mockResolvedValueOnce([]);
    await svc.listTemplates({ category: 'standard' });
    expect(mockDDDContractTemplate.find).toHaveBeenCalledWith({ category: 'standard' });
  });

  test('createTemplate', async () => {
    mockDDDContractTemplate.create.mockResolvedValueOnce({ _id: 't1' });
    await svc.createTemplate({ name: 'New' });
    expect(mockDDDContractTemplate.create).toHaveBeenCalled();
  });
});

/* ─── amendments ─── */
describe('dddContractManager – amendments', () => {
  test('listAmendments by contractId', async () => {
    mockDDDContractAmendment.find.mockReturnValue(mockDDDContractAmendment);
    mockDDDContractAmendment.sort.mockReturnValue(mockDDDContractAmendment);
    mockDDDContractAmendment.lean.mockResolvedValueOnce([]);
    await svc.listAmendments('c1');
    expect(mockDDDContractAmendment.find).toHaveBeenCalledWith({ contractId: 'c1' });
  });

  test('createAmendment auto-generates amendmentCode', async () => {
    mockDDDContractAmendment.create.mockResolvedValueOnce({ amendmentCode: 'AMND-1' });
    await svc.createAmendment({ contractId: 'c1' });
    const arg = mockDDDContractAmendment.create.mock.calls[0][0];
    expect(arg.amendmentCode).toMatch(/^AMND-/);
  });
});

/* ─── obligations ─── */
describe('dddContractManager – obligations', () => {
  test('listObligations by contractId', async () => {
    mockDDDContractObligation.find.mockReturnValue(mockDDDContractObligation);
    mockDDDContractObligation.sort.mockReturnValue(mockDDDContractObligation);
    mockDDDContractObligation.lean.mockResolvedValueOnce([]);
    await svc.listObligations('c1');
    expect(mockDDDContractObligation.find).toHaveBeenCalledWith({ contractId: 'c1' });
  });

  test('createObligation auto-generates obligationCode', async () => {
    mockDDDContractObligation.create.mockResolvedValueOnce({ obligationCode: 'OBL-1' });
    await svc.createObligation({ contractId: 'c1' });
    const arg = mockDDDContractObligation.create.mock.calls[0][0];
    expect(arg.obligationCode).toMatch(/^OBL-/);
  });

  test('fulfillObligation sets status + completedAt', async () => {
    mockDDDContractObligation.findByIdAndUpdate.mockReturnValue(mockDDDContractObligation);
    mockDDDContractObligation.lean.mockResolvedValueOnce({ _id: 'o1', status: 'fulfilled' });
    await svc.fulfillObligation('o1');
    expect(mockDDDContractObligation.findByIdAndUpdate).toHaveBeenCalledWith(
      'o1',
      expect.objectContaining({ status: 'fulfilled', completedAt: expect.any(Date) }),
      { new: true }
    );
  });
});

/* ─── analytics ─── */
describe('dddContractManager – analytics', () => {
  test('getContractAnalytics returns aggregated counts', async () => {
    mockDDDContract.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(5);
    mockDDDContractTemplate.countDocuments.mockResolvedValueOnce(3);
    mockDDDContractAmendment.countDocuments.mockResolvedValueOnce(7);
    mockDDDContractObligation.countDocuments.mockResolvedValueOnce(15).mockResolvedValueOnce(2);
    const r = await svc.getContractAnalytics();
    expect(r.contracts).toBe(10);
    expect(r.active).toBe(5);
    expect(r.templates).toBe(3);
    expect(r.amendments).toBe(7);
    expect(r.obligations).toBe(15);
    expect(r.overdueObligations).toBe(2);
  });
});

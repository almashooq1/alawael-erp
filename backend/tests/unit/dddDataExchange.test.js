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

const mockDDDExchangeJob = makeModel();
const mockDDDTransformPipeline = makeModel();
const mockDDDValidationSchema = makeModel();
const mockDDDExchangeAgreement = makeModel();

jest.mock('../../models/DddDataExchange', () => ({
  DDDExchangeJob: mockDDDExchangeJob,
  DDDTransformPipeline: mockDDDTransformPipeline,
  DDDValidationSchema: mockDDDValidationSchema,
  DDDExchangeAgreement: mockDDDExchangeAgreement,
  EXCHANGE_FORMATS: ['json', 'csv'],
  JOB_TYPES: ['import', 'export'],
  JOB_STATUSES: ['pending', 'running', 'completed', 'failed'],
  TRANSFORM_OPERATIONS: ['map', 'filter'],
  VALIDATION_RULES: ['required', 'type'],
  EXCHANGE_PROTOCOLS: ['rest', 'sftp'],
  BUILTIN_EXCHANGE_CONFIGS: [],
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

const svc = require('../../services/dddDataExchange');

beforeEach(() => jest.clearAllMocks());

/* ─── singleton ─── */
describe('dddDataExchange – singleton', () => {
  test('exports instance with expected methods', () => {
    expect(svc).toBeDefined();
    expect(typeof svc.createJob).toBe('function');
    expect(typeof svc.getExchangeStats).toBe('function');
  });
});

/* ─── jobs ─── */
describe('dddDataExchange – jobs', () => {
  test('createJob', async () => {
    mockDDDExchangeJob.create.mockResolvedValueOnce({ _id: 'j1' });
    await svc.createJob({ type: 'import' });
    expect(mockDDDExchangeJob.create).toHaveBeenCalled();
  });

  test('listJobs', async () => {
    mockDDDExchangeJob.find.mockReturnValue(mockDDDExchangeJob);
    mockDDDExchangeJob.sort.mockReturnValue(mockDDDExchangeJob);
    mockDDDExchangeJob.lean.mockResolvedValueOnce([]);
    await svc.listJobs({});
    expect(mockDDDExchangeJob.find).toHaveBeenCalled();
  });

  test('updateJobStatus', async () => {
    mockDDDExchangeJob.findByIdAndUpdate.mockReturnValue(mockDDDExchangeJob);
    mockDDDExchangeJob.lean.mockResolvedValueOnce({ _id: 'j1', status: 'completed' });
    await svc.updateJobStatus('j1', 'completed', { completedAt: new Date() });
    expect(mockDDDExchangeJob.findByIdAndUpdate).toHaveBeenCalledWith(
      'j1',
      expect.objectContaining({ status: 'completed' }),
      { new: true }
    );
  });
});

/* ─── pipelines ─── */
describe('dddDataExchange – pipelines', () => {
  test('createPipeline', async () => {
    mockDDDTransformPipeline.create.mockResolvedValueOnce({ _id: 'p1' });
    await svc.createPipeline({ name: 'ETL' });
    expect(mockDDDTransformPipeline.create).toHaveBeenCalled();
  });

  test('listPipelines', async () => {
    mockDDDTransformPipeline.find.mockReturnValue(mockDDDTransformPipeline);
    mockDDDTransformPipeline.sort.mockReturnValue(mockDDDTransformPipeline);
    mockDDDTransformPipeline.lean.mockResolvedValueOnce([]);
    await svc.listPipelines({});
    expect(mockDDDTransformPipeline.find).toHaveBeenCalled();
  });

  test('updatePipeline', async () => {
    mockDDDTransformPipeline.findByIdAndUpdate.mockReturnValue(mockDDDTransformPipeline);
    mockDDDTransformPipeline.lean.mockResolvedValueOnce({ _id: 'p1' });
    await svc.updatePipeline('p1', { name: 'Updated' });
    expect(mockDDDTransformPipeline.findByIdAndUpdate).toHaveBeenCalled();
  });
});

/* ─── validations ─── */
describe('dddDataExchange – validations', () => {
  test('createValidation', async () => {
    mockDDDValidationSchema.create.mockResolvedValueOnce({ _id: 'v1' });
    await svc.createValidation({ name: 'Schema' });
    expect(mockDDDValidationSchema.create).toHaveBeenCalled();
  });

  test('listValidations', async () => {
    mockDDDValidationSchema.find.mockReturnValue(mockDDDValidationSchema);
    mockDDDValidationSchema.sort.mockReturnValue(mockDDDValidationSchema);
    mockDDDValidationSchema.lean.mockResolvedValueOnce([]);
    await svc.listValidations({});
    expect(mockDDDValidationSchema.find).toHaveBeenCalled();
  });
});

/* ─── agreements ─── */
describe('dddDataExchange – agreements', () => {
  test('createAgreement', async () => {
    mockDDDExchangeAgreement.create.mockResolvedValueOnce({ _id: 'a1' });
    await svc.createAgreement({ partner: 'Org' });
    expect(mockDDDExchangeAgreement.create).toHaveBeenCalled();
  });

  test('listAgreements', async () => {
    mockDDDExchangeAgreement.find.mockReturnValue(mockDDDExchangeAgreement);
    mockDDDExchangeAgreement.sort.mockReturnValue(mockDDDExchangeAgreement);
    mockDDDExchangeAgreement.lean.mockResolvedValueOnce([]);
    await svc.listAgreements({});
    expect(mockDDDExchangeAgreement.find).toHaveBeenCalled();
  });

  test('updateAgreement', async () => {
    mockDDDExchangeAgreement.findByIdAndUpdate.mockReturnValue(mockDDDExchangeAgreement);
    mockDDDExchangeAgreement.lean.mockResolvedValueOnce({ _id: 'a1' });
    await svc.updateAgreement('a1', { status: 'revoked' });
    expect(mockDDDExchangeAgreement.findByIdAndUpdate).toHaveBeenCalled();
  });
});

/* ─── analytics ─── */
describe('dddDataExchange – analytics', () => {
  test('getExchangeStats returns aggregated counts', async () => {
    mockDDDExchangeJob.countDocuments.mockResolvedValueOnce(50).mockResolvedValueOnce(3);
    mockDDDTransformPipeline.countDocuments.mockResolvedValueOnce(5);
    mockDDDExchangeAgreement.countDocuments.mockResolvedValueOnce(8);
    const r = await svc.getExchangeStats();
    expect(r.totalJobs).toBe(50);
    expect(r.activePipelines).toBe(5);
    expect(r.activeAgreements).toBe(8);
    expect(r.failedJobs).toBe(3);
  });
});

'use strict';

/* ── mock-prefixed variables ── */
const mockWorkflowDefinitionFind = jest.fn();
const mockWorkflowDefinitionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'workflowDefinition1', ...d }));
const mockWorkflowDefinitionCount = jest.fn().mockResolvedValue(0);
const mockWorkflowInstanceFind = jest.fn();
const mockWorkflowInstanceCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'workflowInstance1', ...d }));
const mockWorkflowInstanceCount = jest.fn().mockResolvedValue(0);
const mockWorkflowTaskFind = jest.fn();
const mockWorkflowTaskCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'workflowTask1', ...d }));
const mockWorkflowTaskCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddWorkflowEngine', () => ({
  DDDWorkflowDefinition: {
    find: mockWorkflowDefinitionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'workflowDefinition1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'workflowDefinition1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockWorkflowDefinitionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowDefinition1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowDefinition1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowDefinition1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowDefinition1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowDefinition1' }) }),
    countDocuments: mockWorkflowDefinitionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDWorkflowInstance: {
    find: mockWorkflowInstanceFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'workflowInstance1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'workflowInstance1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockWorkflowInstanceCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowInstance1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowInstance1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowInstance1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowInstance1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowInstance1' }) }),
    countDocuments: mockWorkflowInstanceCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDWorkflowTask: {
    find: mockWorkflowTaskFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'workflowTask1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'workflowTask1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockWorkflowTaskCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowTask1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowTask1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowTask1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowTask1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workflowTask1' }) }),
    countDocuments: mockWorkflowTaskCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  WORKFLOW_TYPES: ['item1', 'item2'],
  WORKFLOW_STATUSES: ['item1', 'item2'],
  TRIGGER_TYPES: ['item1', 'item2'],
  ACTION_TYPES: ['item1', 'item2'],
  SLA_PRIORITIES: ['item1', 'item2'],
  BUILTIN_WORKFLOWS: ['item1', 'item2'],

}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor(n, m, models) { this.name = n; this.meta = m; this.models = models; }
    log() {}
    _list(M, q, o) {
      const c = M.find(q || {});
      if (o && o.sort) {
        const s = c.sort(o.sort);
        return (o.limit && s.limit) ? s.limit(o.limit).lean() : s.lean();
      }
      return c.lean ? c.lean() : c;
    }
    _getById(M, id) {
      const r = M.findById(id);
      return r && r.lean ? r.lean() : r;
    }
    _create(M, d) { return M.create(d); }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...(o || {}) }).lean();
    }
    _delete(M, id) { return M.findByIdAndDelete(id); }
  };
});

const svc = require('../../services/dddWorkflowEngine');

describe('dddWorkflowEngine service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _workflowDefinitionL = jest.fn().mockResolvedValue([]);
    const _workflowDefinitionLim = jest.fn().mockReturnValue({ lean: _workflowDefinitionL });
    const _workflowDefinitionS = jest.fn().mockReturnValue({ limit: _workflowDefinitionLim, lean: _workflowDefinitionL, populate: jest.fn().mockReturnValue({ lean: _workflowDefinitionL }) });
    mockWorkflowDefinitionFind.mockReturnValue({ sort: _workflowDefinitionS, lean: _workflowDefinitionL, limit: _workflowDefinitionLim, populate: jest.fn().mockReturnValue({ lean: _workflowDefinitionL, sort: _workflowDefinitionS }) });
    const _workflowInstanceL = jest.fn().mockResolvedValue([]);
    const _workflowInstanceLim = jest.fn().mockReturnValue({ lean: _workflowInstanceL });
    const _workflowInstanceS = jest.fn().mockReturnValue({ limit: _workflowInstanceLim, lean: _workflowInstanceL, populate: jest.fn().mockReturnValue({ lean: _workflowInstanceL }) });
    mockWorkflowInstanceFind.mockReturnValue({ sort: _workflowInstanceS, lean: _workflowInstanceL, limit: _workflowInstanceLim, populate: jest.fn().mockReturnValue({ lean: _workflowInstanceL, sort: _workflowInstanceS }) });
    const _workflowTaskL = jest.fn().mockResolvedValue([]);
    const _workflowTaskLim = jest.fn().mockReturnValue({ lean: _workflowTaskL });
    const _workflowTaskS = jest.fn().mockReturnValue({ limit: _workflowTaskLim, lean: _workflowTaskL, populate: jest.fn().mockReturnValue({ lean: _workflowTaskL }) });
    mockWorkflowTaskFind.mockReturnValue({ sort: _workflowTaskS, lean: _workflowTaskL, limit: _workflowTaskLim, populate: jest.fn().mockReturnValue({ lean: _workflowTaskL, sort: _workflowTaskS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc).not.toBeNull();
  });


  test('listDefinitions is callable', () => {
    expect(typeof svc.listDefinitions).toBe('function');
  });

  test('getDefinition is callable', () => {
    expect(typeof svc.getDefinition).toBe('function');
  });

  test('createDefinition is callable', () => {
    expect(typeof svc.createDefinition).toBe('function');
  });

  test('updateDefinition is callable', () => {
    expect(typeof svc.updateDefinition).toBe('function');
  });

  test('publishDefinition is callable', () => {
    expect(typeof svc.publishDefinition).toBe('function');
  });

  test('startWorkflow is callable', () => {
    expect(typeof svc.startWorkflow).toBe('function');
  });

  test('advanceWorkflow is callable', () => {
    expect(typeof svc.advanceWorkflow).toBe('function');
  });

  test('cancelWorkflow is callable', () => {
    expect(typeof svc.cancelWorkflow).toBe('function');
  });

  test('listInstances is callable', () => {
    expect(typeof svc.listInstances).toBe('function');
  });

  test('getInstance is callable', () => {
    expect(typeof svc.getInstance).toBe('function');
  });

  test('listTasks is callable', () => {
    expect(typeof svc.listTasks).toBe('function');
  });

  test('claimTask is callable', () => {
    expect(typeof svc.claimTask).toBe('function');
  });

  test('checkSLABreaches is callable', () => {
    expect(typeof svc.checkSLABreaches).toBe('function');
  });

  test('getStats is callable', () => {
    expect(typeof svc.getStats).toBe('function');
  });
});

'use strict';

/* ── mock-prefixed variables ── */
const mockFormTemplateFind = jest.fn();
const mockFormTemplateCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'formTemplate1', ...d }));
const mockFormTemplateCount = jest.fn().mockResolvedValue(0);
const mockFormSubmissionFind = jest.fn();
const mockFormSubmissionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'formSubmission1', ...d }));
const mockFormSubmissionCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddFormBuilder', () => ({
  DDDFormTemplate: {
    find: mockFormTemplateFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'formTemplate1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'formTemplate1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFormTemplateCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'formTemplate1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'formTemplate1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'formTemplate1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'formTemplate1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'formTemplate1' }) }),
    countDocuments: mockFormTemplateCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDFormSubmission: {
    find: mockFormSubmissionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'formSubmission1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'formSubmission1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFormSubmissionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'formSubmission1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'formSubmission1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'formSubmission1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'formSubmission1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'formSubmission1' }) }),
    countDocuments: mockFormSubmissionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  FIELD_TYPES: ['item1', 'item2'],
  FORM_CATEGORIES: ['item1', 'item2'],
  VALIDATION_RULES: ['item1', 'item2'],
  BUILTIN_FORM_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddFormBuilder');

describe('dddFormBuilder service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _formTemplateL = jest.fn().mockResolvedValue([]);
    const _formTemplateLim = jest.fn().mockReturnValue({ lean: _formTemplateL });
    const _formTemplateS = jest.fn().mockReturnValue({ limit: _formTemplateLim, lean: _formTemplateL, populate: jest.fn().mockReturnValue({ lean: _formTemplateL }) });
    mockFormTemplateFind.mockReturnValue({ sort: _formTemplateS, lean: _formTemplateL, limit: _formTemplateLim, populate: jest.fn().mockReturnValue({ lean: _formTemplateL, sort: _formTemplateS }) });
    const _formSubmissionL = jest.fn().mockResolvedValue([]);
    const _formSubmissionLim = jest.fn().mockReturnValue({ lean: _formSubmissionL });
    const _formSubmissionS = jest.fn().mockReturnValue({ limit: _formSubmissionLim, lean: _formSubmissionL, populate: jest.fn().mockReturnValue({ lean: _formSubmissionL }) });
    mockFormSubmissionFind.mockReturnValue({ sort: _formSubmissionS, lean: _formSubmissionL, limit: _formSubmissionLim, populate: jest.fn().mockReturnValue({ lean: _formSubmissionL, sort: _formSubmissionS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc).not.toBeNull();
  });


  test('listTemplates is callable', () => {
    expect(typeof svc.listTemplates).toBe('function');
  });

  test('getTemplate is callable', () => {
    expect(typeof svc.getTemplate).toBe('function');
  });

  test('createTemplate is callable', () => {
    expect(typeof svc.createTemplate).toBe('function');
  });

  test('updateTemplate is callable', () => {
    expect(typeof svc.updateTemplate).toBe('function');
  });

  test('publishTemplate is callable', () => {
    expect(typeof svc.publishTemplate).toBe('function');
  });

  test('cloneTemplate is callable', () => {
    expect(typeof svc.cloneTemplate).toBe('function');
  });

  test('submitForm is callable', () => {
    expect(typeof svc.submitForm).toBe('function');
  });

  test('listSubmissions is callable', () => {
    expect(typeof svc.listSubmissions).toBe('function');
  });

  test('getSubmission is callable', () => {
    expect(typeof svc.getSubmission).toBe('function');
  });

  test('reviewSubmission is callable', () => {
    expect(typeof svc.reviewSubmission).toBe('function');
  });

  test('getStats is callable', () => {
    expect(typeof svc.getStats).toBe('function');
  });
});

'use strict';

/* ── mock-prefixed variables ── */
const mockDocumentTemplateFind = jest.fn();
const mockDocumentTemplateCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'documentTemplate1', ...d }));
const mockDocumentTemplateCount = jest.fn().mockResolvedValue(0);
const mockGeneratedDocumentFind = jest.fn();
const mockGeneratedDocumentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'generatedDocument1', ...d }));
const mockGeneratedDocumentCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddDocumentGenerator', () => ({
  DDDDocumentTemplate: {
    find: mockDocumentTemplateFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'documentTemplate1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'documentTemplate1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDocumentTemplateCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentTemplate1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentTemplate1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentTemplate1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentTemplate1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentTemplate1' }) }),
    countDocuments: mockDocumentTemplateCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDGeneratedDocument: {
    find: mockGeneratedDocumentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'generatedDocument1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'generatedDocument1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockGeneratedDocumentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'generatedDocument1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'generatedDocument1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'generatedDocument1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'generatedDocument1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'generatedDocument1' }) }),
    countDocuments: mockGeneratedDocumentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DOCUMENT_TYPES: ['item1', 'item2'],
  OUTPUT_FORMATS: ['item1', 'item2'],
  TEMPLATE_ENGINES: ['item1', 'item2'],
  PLACEHOLDER_CATEGORIES: ['item1', 'item2'],
  BUILTIN_DOC_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddDocumentGenerator');

describe('dddDocumentGenerator service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _documentTemplateL = jest.fn().mockResolvedValue([]);
    const _documentTemplateLim = jest.fn().mockReturnValue({ lean: _documentTemplateL });
    const _documentTemplateS = jest.fn().mockReturnValue({ limit: _documentTemplateLim, lean: _documentTemplateL, populate: jest.fn().mockReturnValue({ lean: _documentTemplateL }) });
    mockDocumentTemplateFind.mockReturnValue({ sort: _documentTemplateS, lean: _documentTemplateL, limit: _documentTemplateLim, populate: jest.fn().mockReturnValue({ lean: _documentTemplateL, sort: _documentTemplateS }) });
    const _generatedDocumentL = jest.fn().mockResolvedValue([]);
    const _generatedDocumentLim = jest.fn().mockReturnValue({ lean: _generatedDocumentL });
    const _generatedDocumentS = jest.fn().mockReturnValue({ limit: _generatedDocumentLim, lean: _generatedDocumentL, populate: jest.fn().mockReturnValue({ lean: _generatedDocumentL }) });
    mockGeneratedDocumentFind.mockReturnValue({ sort: _generatedDocumentS, lean: _generatedDocumentL, limit: _generatedDocumentLim, populate: jest.fn().mockReturnValue({ lean: _generatedDocumentL, sort: _generatedDocumentS }) });
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

  test('generateDocument is callable', () => {
    expect(typeof svc.generateDocument).toBe('function');
  });

  test('listGeneratedDocs is callable', () => {
    expect(typeof svc.listGeneratedDocs).toBe('function');
  });

  test('getGeneratedDoc is callable', () => {
    expect(typeof svc.getGeneratedDoc).toBe('function');
  });

  test('getRenderedHtml is callable', () => {
    expect(typeof svc.getRenderedHtml).toBe('function');
  });

  test('batchGenerate is callable', () => {
    expect(typeof svc.batchGenerate).toBe('function');
  });

  test('getStats is callable', () => {
    expect(typeof svc.getStats).toBe('function');
  });
});

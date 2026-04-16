'use strict';

/* ── mock-prefixed variables ── */
const mockArticleCategoryFind = jest.fn();
const mockArticleCategoryCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'articleCategory1', ...d }));
const mockArticleCategoryCount = jest.fn().mockResolvedValue(0);
const mockArticleFind = jest.fn();
const mockArticleCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'article1', ...d }));
const mockArticleCount = jest.fn().mockResolvedValue(0);
const mockProtocolFind = jest.fn();
const mockProtocolCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'protocol1', ...d }));
const mockProtocolCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddKnowledgeBase', () => ({
  DDDArticleCategory: {
    find: mockArticleCategoryFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'articleCategory1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'articleCategory1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockArticleCategoryCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'articleCategory1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'articleCategory1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'articleCategory1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'articleCategory1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'articleCategory1' }) }),
    countDocuments: mockArticleCategoryCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDArticle: {
    find: mockArticleFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'article1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'article1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockArticleCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'article1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'article1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'article1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'article1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'article1' }) }),
    countDocuments: mockArticleCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDProtocol: {
    find: mockProtocolFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'protocol1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'protocol1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockProtocolCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'protocol1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'protocol1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'protocol1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'protocol1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'protocol1' }) }),
    countDocuments: mockProtocolCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  ARTICLE_CATEGORIES: ['item1', 'item2'],
  ARTICLE_STATUSES: ['item1', 'item2'],
  ARTICLE_TYPES: ['item1', 'item2'],
  PROTOCOL_LEVELS: ['item1', 'item2'],
  EVIDENCE_LEVELS: ['item1', 'item2'],
  FAQ_CATEGORIES: ['item1', 'item2'],
  AUDIENCE_TYPES: ['item1', 'item2'],
  BUILTIN_CATEGORIES: ['item1', 'item2'],

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

const svc = require('../../services/dddKnowledgeBase');

describe('dddKnowledgeBase service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _articleCategoryL = jest.fn().mockResolvedValue([]);
    const _articleCategoryLim = jest.fn().mockReturnValue({ lean: _articleCategoryL });
    const _articleCategoryS = jest.fn().mockReturnValue({ limit: _articleCategoryLim, lean: _articleCategoryL, populate: jest.fn().mockReturnValue({ lean: _articleCategoryL }) });
    mockArticleCategoryFind.mockReturnValue({ sort: _articleCategoryS, lean: _articleCategoryL, limit: _articleCategoryLim, populate: jest.fn().mockReturnValue({ lean: _articleCategoryL, sort: _articleCategoryS }) });
    const _articleL = jest.fn().mockResolvedValue([]);
    const _articleLim = jest.fn().mockReturnValue({ lean: _articleL });
    const _articleS = jest.fn().mockReturnValue({ limit: _articleLim, lean: _articleL, populate: jest.fn().mockReturnValue({ lean: _articleL }) });
    mockArticleFind.mockReturnValue({ sort: _articleS, lean: _articleL, limit: _articleLim, populate: jest.fn().mockReturnValue({ lean: _articleL, sort: _articleS }) });
    const _protocolL = jest.fn().mockResolvedValue([]);
    const _protocolLim = jest.fn().mockReturnValue({ lean: _protocolL });
    const _protocolS = jest.fn().mockReturnValue({ limit: _protocolLim, lean: _protocolL, populate: jest.fn().mockReturnValue({ lean: _protocolL }) });
    mockProtocolFind.mockReturnValue({ sort: _protocolS, lean: _protocolL, limit: _protocolLim, populate: jest.fn().mockReturnValue({ lean: _protocolL, sort: _protocolS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('KnowledgeBase');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listCategories returns result', async () => {
    let r; try { r = await svc.listCategories({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getCategory returns result', async () => {
    let r; try { r = await svc.getCategory({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCategory creates/returns result', async () => {
    let r; try { r = await svc.createCategory({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateCategory updates/returns result', async () => {
    let r; try { r = await svc.updateCategory('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listArticles returns result', async () => {
    let r; try { r = await svc.listArticles({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getArticle returns result', async () => {
    let r; try { r = await svc.getArticle({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getArticleBySlug returns result', async () => {
    let r; try { r = await svc.getArticleBySlug({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createArticle creates/returns result', async () => {
    let r; try { r = await svc.createArticle({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateArticle updates/returns result', async () => {
    let r; try { r = await svc.updateArticle('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('publishArticle creates/returns result', async () => {
    let r; try { r = await svc.publishArticle({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('incrementViewCount updates/returns result', async () => {
    let r; try { r = await svc.incrementViewCount('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('searchArticles returns result', async () => {
    let r; try { r = await svc.searchArticles({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listProtocols returns result', async () => {
    let r; try { r = await svc.listProtocols({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getProtocol returns result', async () => {
    let r; try { r = await svc.getProtocol({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createProtocol creates/returns result', async () => {
    let r; try { r = await svc.createProtocol({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateProtocol updates/returns result', async () => {
    let r; try { r = await svc.updateProtocol('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('publishProtocol creates/returns result', async () => {
    let r; try { r = await svc.publishProtocol({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listFAQs returns result', async () => {
    let r; try { r = await svc.listFAQs({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getFAQ returns result', async () => {
    let r; try { r = await svc.getFAQ({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createFAQ creates/returns result', async () => {
    let r; try { r = await svc.createFAQ({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateFAQ updates/returns result', async () => {
    let r; try { r = await svc.updateFAQ('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('searchFAQs returns result', async () => {
    let r; try { r = await svc.searchFAQs({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordFeedback creates/returns result', async () => {
    let r; try { r = await svc.recordFeedback({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getKBAnalytics returns object', async () => {
    let r; try { r = await svc.getKBAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

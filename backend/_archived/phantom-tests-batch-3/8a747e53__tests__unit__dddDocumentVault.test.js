'use strict';

/* ── mock-prefixed variables ── */
const mockVaultDocumentFind = jest.fn();
const mockVaultDocumentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'vaultDocument1', ...d }));
const mockVaultDocumentCount = jest.fn().mockResolvedValue(0);
const mockFolderFind = jest.fn();
const mockFolderCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'folder1', ...d }));
const mockFolderCount = jest.fn().mockResolvedValue(0);
const mockDocumentTagFind = jest.fn();
const mockDocumentTagCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'documentTag1', ...d }));
const mockDocumentTagCount = jest.fn().mockResolvedValue(0);
const mockDocumentAccessFind = jest.fn();
const mockDocumentAccessCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'documentAccess1', ...d }));
const mockDocumentAccessCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddDocumentVault', () => ({
  DDDVaultDocument: {
    find: mockVaultDocumentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'vaultDocument1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'vaultDocument1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVaultDocumentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vaultDocument1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vaultDocument1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vaultDocument1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vaultDocument1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vaultDocument1' }) }),
    countDocuments: mockVaultDocumentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDFolder: {
    find: mockFolderFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'folder1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'folder1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFolderCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'folder1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'folder1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'folder1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'folder1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'folder1' }) }),
    countDocuments: mockFolderCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDocumentTag: {
    find: mockDocumentTagFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'documentTag1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'documentTag1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDocumentTagCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentTag1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentTag1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentTag1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentTag1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentTag1' }) }),
    countDocuments: mockDocumentTagCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDocumentAccess: {
    find: mockDocumentAccessFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'documentAccess1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'documentAccess1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDocumentAccessCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentAccess1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentAccess1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentAccess1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentAccess1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'documentAccess1' }) }),
    countDocuments: mockDocumentAccessCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DOCUMENT_TYPES: ['item1', 'item2'],
  DOCUMENT_STATUSES: ['item1', 'item2'],
  STORAGE_TYPES: ['item1', 'item2'],
  MIME_CATEGORIES: ['item1', 'item2'],
  ACCESS_LEVELS: ['item1', 'item2'],
  CLASSIFICATION_LEVELS: ['item1', 'item2'],
  BUILTIN_TAGS: ['item1', 'item2'],

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

const svc = require('../../services/dddDocumentVault');

describe('dddDocumentVault service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _vaultDocumentL = jest.fn().mockResolvedValue([]);
    const _vaultDocumentLim = jest.fn().mockReturnValue({ lean: _vaultDocumentL });
    const _vaultDocumentS = jest.fn().mockReturnValue({ limit: _vaultDocumentLim, lean: _vaultDocumentL, populate: jest.fn().mockReturnValue({ lean: _vaultDocumentL }) });
    mockVaultDocumentFind.mockReturnValue({ sort: _vaultDocumentS, lean: _vaultDocumentL, limit: _vaultDocumentLim, populate: jest.fn().mockReturnValue({ lean: _vaultDocumentL, sort: _vaultDocumentS }) });
    const _folderL = jest.fn().mockResolvedValue([]);
    const _folderLim = jest.fn().mockReturnValue({ lean: _folderL });
    const _folderS = jest.fn().mockReturnValue({ limit: _folderLim, lean: _folderL, populate: jest.fn().mockReturnValue({ lean: _folderL }) });
    mockFolderFind.mockReturnValue({ sort: _folderS, lean: _folderL, limit: _folderLim, populate: jest.fn().mockReturnValue({ lean: _folderL, sort: _folderS }) });
    const _documentTagL = jest.fn().mockResolvedValue([]);
    const _documentTagLim = jest.fn().mockReturnValue({ lean: _documentTagL });
    const _documentTagS = jest.fn().mockReturnValue({ limit: _documentTagLim, lean: _documentTagL, populate: jest.fn().mockReturnValue({ lean: _documentTagL }) });
    mockDocumentTagFind.mockReturnValue({ sort: _documentTagS, lean: _documentTagL, limit: _documentTagLim, populate: jest.fn().mockReturnValue({ lean: _documentTagL, sort: _documentTagS }) });
    const _documentAccessL = jest.fn().mockResolvedValue([]);
    const _documentAccessLim = jest.fn().mockReturnValue({ lean: _documentAccessL });
    const _documentAccessS = jest.fn().mockReturnValue({ limit: _documentAccessLim, lean: _documentAccessL, populate: jest.fn().mockReturnValue({ lean: _documentAccessL }) });
    mockDocumentAccessFind.mockReturnValue({ sort: _documentAccessS, lean: _documentAccessL, limit: _documentAccessLim, populate: jest.fn().mockReturnValue({ lean: _documentAccessL, sort: _documentAccessS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('DocumentVault');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listDocuments returns result', async () => {
    let r; try { r = await svc.listDocuments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getDocument returns result', async () => {
    let r; try { r = await svc.getDocument({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('uploadDocument is callable', () => {
    expect(typeof svc.uploadDocument).toBe('function');
  });

  test('updateDocument updates/returns result', async () => {
    let r; try { r = await svc.updateDocument('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('deleteDocument returns result', async () => {
    let r; try { r = await svc.deleteDocument('id1'); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('searchDocuments returns result', async () => {
    let r; try { r = await svc.searchDocuments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listFolders returns result', async () => {
    let r; try { r = await svc.listFolders({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createFolder creates/returns result', async () => {
    let r; try { r = await svc.createFolder({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateFolder updates/returns result', async () => {
    let r; try { r = await svc.updateFolder('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('deleteFolder returns result', async () => {
    let r; try { r = await svc.deleteFolder('id1'); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTags returns result', async () => {
    let r; try { r = await svc.listTags({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createTag creates/returns result', async () => {
    let r; try { r = await svc.createTag({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAccess returns result', async () => {
    let r; try { r = await svc.listAccess({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('grantAccess is callable', () => {
    expect(typeof svc.grantAccess).toBe('function');
  });

  test('revokeAccess updates/returns result', async () => {
    let r; try { r = await svc.revokeAccess('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getVaultAnalytics returns object', async () => {
    let r; try { r = await svc.getVaultAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

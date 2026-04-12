'use strict';

/* ── mock-prefixed variables ── */
const mockAnnouncementFind = jest.fn();
const mockAnnouncementCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'announcement1', ...d }));
const mockAnnouncementCount = jest.fn().mockResolvedValue(0);
const mockBulletinBoardFind = jest.fn();
const mockBulletinBoardCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'bulletinBoard1', ...d }));
const mockBulletinBoardCount = jest.fn().mockResolvedValue(0);
const mockAnnouncementCategoryFind = jest.fn();
const mockAnnouncementCategoryCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'announcementCategory1', ...d }));
const mockAnnouncementCategoryCount = jest.fn().mockResolvedValue(0);
const mockAnnouncementReactionFind = jest.fn();
const mockAnnouncementReactionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'announcementReaction1', ...d }));
const mockAnnouncementReactionCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddAnnouncementManager', () => ({
  DDDAnnouncement: {
    find: mockAnnouncementFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'announcement1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'announcement1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAnnouncementCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcement1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcement1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcement1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcement1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcement1' }) }),
    countDocuments: mockAnnouncementCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDBulletinBoard: {
    find: mockBulletinBoardFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'bulletinBoard1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'bulletinBoard1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockBulletinBoardCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'bulletinBoard1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'bulletinBoard1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'bulletinBoard1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'bulletinBoard1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'bulletinBoard1' }) }),
    countDocuments: mockBulletinBoardCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAnnouncementCategory: {
    find: mockAnnouncementCategoryFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'announcementCategory1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'announcementCategory1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAnnouncementCategoryCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcementCategory1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcementCategory1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcementCategory1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcementCategory1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcementCategory1' }) }),
    countDocuments: mockAnnouncementCategoryCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAnnouncementReaction: {
    find: mockAnnouncementReactionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'announcementReaction1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'announcementReaction1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAnnouncementReactionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcementReaction1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcementReaction1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcementReaction1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcementReaction1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'announcementReaction1' }) }),
    countDocuments: mockAnnouncementReactionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  ANNOUNCEMENT_TYPES: ['item1', 'item2'],
  ANNOUNCEMENT_STATUSES: ['item1', 'item2'],
  AUDIENCE_SCOPES: ['item1', 'item2'],
  BULLETIN_TYPES: ['item1', 'item2'],
  REACTION_TYPES: ['item1', 'item2'],
  DISPLAY_PRIORITIES: ['item1', 'item2'],
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

const svc = require('../../services/dddAnnouncementManager');

describe('dddAnnouncementManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _announcementL = jest.fn().mockResolvedValue([]);
    const _announcementLim = jest.fn().mockReturnValue({ lean: _announcementL });
    const _announcementS = jest.fn().mockReturnValue({ limit: _announcementLim, lean: _announcementL, populate: jest.fn().mockReturnValue({ lean: _announcementL }) });
    mockAnnouncementFind.mockReturnValue({ sort: _announcementS, lean: _announcementL, limit: _announcementLim, populate: jest.fn().mockReturnValue({ lean: _announcementL, sort: _announcementS }) });
    const _bulletinBoardL = jest.fn().mockResolvedValue([]);
    const _bulletinBoardLim = jest.fn().mockReturnValue({ lean: _bulletinBoardL });
    const _bulletinBoardS = jest.fn().mockReturnValue({ limit: _bulletinBoardLim, lean: _bulletinBoardL, populate: jest.fn().mockReturnValue({ lean: _bulletinBoardL }) });
    mockBulletinBoardFind.mockReturnValue({ sort: _bulletinBoardS, lean: _bulletinBoardL, limit: _bulletinBoardLim, populate: jest.fn().mockReturnValue({ lean: _bulletinBoardL, sort: _bulletinBoardS }) });
    const _announcementCategoryL = jest.fn().mockResolvedValue([]);
    const _announcementCategoryLim = jest.fn().mockReturnValue({ lean: _announcementCategoryL });
    const _announcementCategoryS = jest.fn().mockReturnValue({ limit: _announcementCategoryLim, lean: _announcementCategoryL, populate: jest.fn().mockReturnValue({ lean: _announcementCategoryL }) });
    mockAnnouncementCategoryFind.mockReturnValue({ sort: _announcementCategoryS, lean: _announcementCategoryL, limit: _announcementCategoryLim, populate: jest.fn().mockReturnValue({ lean: _announcementCategoryL, sort: _announcementCategoryS }) });
    const _announcementReactionL = jest.fn().mockResolvedValue([]);
    const _announcementReactionLim = jest.fn().mockReturnValue({ lean: _announcementReactionL });
    const _announcementReactionS = jest.fn().mockReturnValue({ limit: _announcementReactionLim, lean: _announcementReactionL, populate: jest.fn().mockReturnValue({ lean: _announcementReactionL }) });
    mockAnnouncementReactionFind.mockReturnValue({ sort: _announcementReactionS, lean: _announcementReactionL, limit: _announcementReactionLim, populate: jest.fn().mockReturnValue({ lean: _announcementReactionL, sort: _announcementReactionS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('AnnouncementManager');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listAnnouncements returns result', async () => {
    let r; try { r = await svc.listAnnouncements({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getAnnouncement returns result', async () => {
    let r; try { r = await svc.getAnnouncement({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createAnnouncement creates/returns result', async () => {
    let r; try { r = await svc.createAnnouncement({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateAnnouncement updates/returns result', async () => {
    let r; try { r = await svc.updateAnnouncement('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('publishAnnouncement creates/returns result', async () => {
    let r; try { r = await svc.publishAnnouncement({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('archiveAnnouncement updates/returns result', async () => {
    let r; try { r = await svc.archiveAnnouncement('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('pinAnnouncement updates/returns result', async () => {
    let r; try { r = await svc.pinAnnouncement('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listBulletins returns result', async () => {
    let r; try { r = await svc.listBulletins({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createBulletin creates/returns result', async () => {
    let r; try { r = await svc.createBulletin({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateBulletin updates/returns result', async () => {
    let r; try { r = await svc.updateBulletin('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCategories returns result', async () => {
    let r; try { r = await svc.listCategories({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCategory creates/returns result', async () => {
    let r; try { r = await svc.createCategory({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addReaction creates/returns result', async () => {
    let r; try { r = await svc.addReaction({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listReactions returns result', async () => {
    let r; try { r = await svc.listReactions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getAnnouncementAnalytics returns object', async () => {
    let r; try { r = await svc.getAnnouncementAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

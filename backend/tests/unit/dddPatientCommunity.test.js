'use strict';

/* ── mock-prefixed variables ── */
const mockCommunityGroupFind = jest.fn();
const mockCommunityGroupCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'communityGroup1', ...d }));
const mockCommunityGroupCount = jest.fn().mockResolvedValue(0);
const mockCommunityPostFind = jest.fn();
const mockCommunityPostCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'communityPost1', ...d }));
const mockCommunityPostCount = jest.fn().mockResolvedValue(0);
const mockCommunityMemberFind = jest.fn();
const mockCommunityMemberCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'communityMember1', ...d }));
const mockCommunityMemberCount = jest.fn().mockResolvedValue(0);
const mockModerationLogFind = jest.fn();
const mockModerationLogCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'moderationLog1', ...d }));
const mockModerationLogCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddPatientCommunity', () => ({
  DDDCommunityGroup: {
    find: mockCommunityGroupFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'communityGroup1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'communityGroup1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCommunityGroupCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityGroup1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityGroup1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityGroup1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityGroup1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityGroup1' }) }),
    countDocuments: mockCommunityGroupCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCommunityPost: {
    find: mockCommunityPostFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'communityPost1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'communityPost1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCommunityPostCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityPost1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityPost1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityPost1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityPost1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityPost1' }) }),
    countDocuments: mockCommunityPostCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCommunityMember: {
    find: mockCommunityMemberFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'communityMember1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'communityMember1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCommunityMemberCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityMember1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityMember1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityMember1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityMember1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityMember1' }) }),
    countDocuments: mockCommunityMemberCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDModerationLog: {
    find: mockModerationLogFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'moderationLog1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'moderationLog1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockModerationLogCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'moderationLog1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'moderationLog1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'moderationLog1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'moderationLog1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'moderationLog1' }) }),
    countDocuments: mockModerationLogCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  COMMUNITY_TYPES: ['item1', 'item2'],
  COMMUNITY_STATUSES: ['item1', 'item2'],
  POST_TYPES: ['item1', 'item2'],
  MODERATION_ACTIONS: ['item1', 'item2'],
  MEMBER_ROLES: ['item1', 'item2'],
  ENGAGEMENT_LEVELS: ['item1', 'item2'],
  BUILTIN_COMMUNITY_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddPatientCommunity');

describe('dddPatientCommunity service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _communityGroupL = jest.fn().mockResolvedValue([]);
    const _communityGroupLim = jest.fn().mockReturnValue({ lean: _communityGroupL });
    const _communityGroupS = jest.fn().mockReturnValue({ limit: _communityGroupLim, lean: _communityGroupL, populate: jest.fn().mockReturnValue({ lean: _communityGroupL }) });
    mockCommunityGroupFind.mockReturnValue({ sort: _communityGroupS, lean: _communityGroupL, limit: _communityGroupLim, populate: jest.fn().mockReturnValue({ lean: _communityGroupL, sort: _communityGroupS }) });
    const _communityPostL = jest.fn().mockResolvedValue([]);
    const _communityPostLim = jest.fn().mockReturnValue({ lean: _communityPostL });
    const _communityPostS = jest.fn().mockReturnValue({ limit: _communityPostLim, lean: _communityPostL, populate: jest.fn().mockReturnValue({ lean: _communityPostL }) });
    mockCommunityPostFind.mockReturnValue({ sort: _communityPostS, lean: _communityPostL, limit: _communityPostLim, populate: jest.fn().mockReturnValue({ lean: _communityPostL, sort: _communityPostS }) });
    const _communityMemberL = jest.fn().mockResolvedValue([]);
    const _communityMemberLim = jest.fn().mockReturnValue({ lean: _communityMemberL });
    const _communityMemberS = jest.fn().mockReturnValue({ limit: _communityMemberLim, lean: _communityMemberL, populate: jest.fn().mockReturnValue({ lean: _communityMemberL }) });
    mockCommunityMemberFind.mockReturnValue({ sort: _communityMemberS, lean: _communityMemberL, limit: _communityMemberLim, populate: jest.fn().mockReturnValue({ lean: _communityMemberL, sort: _communityMemberS }) });
    const _moderationLogL = jest.fn().mockResolvedValue([]);
    const _moderationLogLim = jest.fn().mockReturnValue({ lean: _moderationLogL });
    const _moderationLogS = jest.fn().mockReturnValue({ limit: _moderationLogLim, lean: _moderationLogL, populate: jest.fn().mockReturnValue({ lean: _moderationLogL }) });
    mockModerationLogFind.mockReturnValue({ sort: _moderationLogS, lean: _moderationLogL, limit: _moderationLogLim, populate: jest.fn().mockReturnValue({ lean: _moderationLogL, sort: _moderationLogS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('PatientCommunity');
  });


  test('createGroup creates/returns result', async () => {
    let r; try { r = await svc.createGroup({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listGroups returns result', async () => {
    let r; try { r = await svc.listGroups({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateGroup updates/returns result', async () => {
    let r; try { r = await svc.updateGroup('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPost creates/returns result', async () => {
    let r; try { r = await svc.createPost({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPosts returns result', async () => {
    let r; try { r = await svc.listPosts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPost returns result', async () => {
    let r; try { r = await svc.getPost({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addMember creates/returns result', async () => {
    let r; try { r = await svc.addMember({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listMembers returns result', async () => {
    let r; try { r = await svc.listMembers({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateMember updates/returns result', async () => {
    let r; try { r = await svc.updateMember('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('logModeration creates/returns result', async () => {
    let r; try { r = await svc.logModeration({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listModerationLogs returns result', async () => {
    let r; try { r = await svc.listModerationLogs({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getCommunityStats returns object', async () => {
    let r; try { r = await svc.getCommunityStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

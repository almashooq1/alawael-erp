'use strict';

/* ── helpers ── */
const chain = () => {
  const c = {};
  [
    'find',
    'findById',
    'findByIdAndUpdate',
    'findOneAndUpdate',
    'findOne',
    'sort',
    'skip',
    'limit',
    'lean',
    'populate',
    'countDocuments',
    'create',
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

const mockDDDAnnouncement = makeModel();
const mockDDDBulletinBoard = makeModel();
const mockDDDAnnouncementCategory = makeModel();
const mockDDDAnnouncementReaction = makeModel();

jest.mock('../../models/DddAnnouncementManager', () => ({
  DDDAnnouncement: mockDDDAnnouncement,
  DDDBulletinBoard: mockDDDBulletinBoard,
  DDDAnnouncementCategory: mockDDDAnnouncementCategory,
  DDDAnnouncementReaction: mockDDDAnnouncementReaction,
  ANNOUNCEMENT_TYPES: ['general', 'urgent', 'policy'],
  ANNOUNCEMENT_STATUSES: ['draft', 'published', 'archived', 'pinned'],
  AUDIENCE_SCOPES: ['all', 'department', 'role'],
  BULLETIN_TYPES: ['general', 'safety', 'health'],
  REACTION_TYPES: ['acknowledged', 'like', 'dislike'],
  DISPLAY_PRIORITIES: ['normal', 'high', 'pinned'],
  BUILTIN_CATEGORIES: [
    { code: 'general', name: 'General', sortOrder: 1 },
    { code: 'policy', name: 'Policy', sortOrder: 2 },
  ],
}));

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
        .sort(opts?.sort || {})
        .lean();
    }
  };
});

const service = require('../../services/dddAnnouncementManager');

// Convenience aliases
let DDDAnnouncement, DDDBulletinBoard, DDDAnnouncementCategory, DDDAnnouncementReaction;

beforeEach(() => {
  DDDAnnouncement = mockDDDAnnouncement;
  DDDBulletinBoard = mockDDDBulletinBoard;
  DDDAnnouncementCategory = mockDDDAnnouncementCategory;
  DDDAnnouncementReaction = mockDDDAnnouncementReaction;

  // Reset all mock call history
  [DDDAnnouncement, DDDBulletinBoard, DDDAnnouncementCategory, DDDAnnouncementReaction].forEach(
    M => {
      Object.values(M).forEach(v => {
        if (typeof v === 'function' && v.mockClear) v.mockClear();
      });
    }
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('dddAnnouncementManager', () => {
  /* ── initialize ── */
  describe('initialize', () => {
    it('seeds categories and returns true', async () => {
      DDDAnnouncementCategory.findOne.mockReturnThis();
      DDDAnnouncementCategory.lean.mockResolvedValue(null);
      DDDAnnouncementCategory.create.mockResolvedValue({});

      const r = await service.initialize();
      expect(r).toBe(true);
    });

    it('skips existing categories during seed', async () => {
      DDDAnnouncementCategory.findOne.mockReturnThis();
      DDDAnnouncementCategory.lean.mockResolvedValue({ _id: 'exists' });

      await service.initialize();
      expect(DDDAnnouncementCategory.create).not.toHaveBeenCalled();
    });
  });

  /* ── listAnnouncements ── */
  describe('listAnnouncements', () => {
    it('returns announcements sorted by publishDate', async () => {
      DDDAnnouncement.find.mockReturnThis();
      DDDAnnouncement.sort.mockReturnThis();
      DDDAnnouncement.lean.mockResolvedValue([{ _id: 'a1' }]);

      const r = await service.listAnnouncements({});
      expect(r).toHaveLength(1);
    });

    it('applies type filter', async () => {
      DDDAnnouncement.find.mockReturnThis();
      DDDAnnouncement.sort.mockReturnThis();
      DDDAnnouncement.lean.mockResolvedValue([]);

      await service.listAnnouncements({ type: 'urgent' });
      expect(DDDAnnouncement.find).toHaveBeenCalled();
    });

    it('applies status filter', async () => {
      DDDAnnouncement.find.mockReturnThis();
      DDDAnnouncement.sort.mockReturnThis();
      DDDAnnouncement.lean.mockResolvedValue([]);

      await service.listAnnouncements({ status: 'published' });
      expect(DDDAnnouncement.find).toHaveBeenCalled();
    });
  });

  /* ── getAnnouncement ── */
  describe('getAnnouncement', () => {
    it('increments viewCount and returns announcement', async () => {
      DDDAnnouncement.findByIdAndUpdate.mockResolvedValue({});
      DDDAnnouncement.findById.mockReturnThis();
      DDDAnnouncement.lean.mockResolvedValue({ _id: 'a1', title: 'Test' });

      const r = await service.getAnnouncement('a1');
      expect(DDDAnnouncement.findByIdAndUpdate).toHaveBeenCalledWith('a1', {
        $inc: { viewCount: 1 },
      });
      expect(r.title).toBe('Test');
    });
  });

  /* ── createAnnouncement ── */
  describe('createAnnouncement', () => {
    it('creates announcement with auto-code', async () => {
      DDDAnnouncement.create.mockResolvedValue({ _id: 'a1', announcementCode: 'ANN-123' });
      const r = await service.createAnnouncement({ title: 'Hello' });
      expect(DDDAnnouncement.create).toHaveBeenCalled();
      expect(r).toHaveProperty('announcementCode');
    });

    it('uses provided announcementCode if given', async () => {
      DDDAnnouncement.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createAnnouncement({ title: 'X', announcementCode: 'CUSTOM' });
      expect(r.announcementCode).toBe('CUSTOM');
    });
  });

  /* ── updateAnnouncement ── */
  describe('updateAnnouncement', () => {
    it('updates via _update', async () => {
      DDDAnnouncement.findByIdAndUpdate.mockReturnThis();
      DDDAnnouncement.lean.mockResolvedValue({ _id: 'a1', title: 'Updated' });
      const r = await service.updateAnnouncement('a1', { title: 'Updated' });
      expect(r.title).toBe('Updated');
    });
  });

  /* ── publishAnnouncement ── */
  describe('publishAnnouncement', () => {
    it('publishes an announcement', async () => {
      DDDAnnouncement.findByIdAndUpdate.mockReturnThis();
      DDDAnnouncement.lean.mockResolvedValue({ _id: 'a1', status: 'published' });
      const r = await service.publishAnnouncement('a1');
      expect(r.status).toBe('published');
    });
  });

  /* ── archiveAnnouncement ── */
  describe('archiveAnnouncement', () => {
    it('archives an announcement', async () => {
      DDDAnnouncement.findByIdAndUpdate.mockReturnThis();
      DDDAnnouncement.lean.mockResolvedValue({ _id: 'a1', status: 'archived' });
      const r = await service.archiveAnnouncement('a1');
      expect(r.status).toBe('archived');
    });
  });

  /* ── pinAnnouncement ── */
  describe('pinAnnouncement', () => {
    it('pins an announcement', async () => {
      DDDAnnouncement.findByIdAndUpdate.mockReturnThis();
      DDDAnnouncement.lean.mockResolvedValue({ _id: 'a1', status: 'pinned', priority: 'pinned' });
      const r = await service.pinAnnouncement('a1');
      expect(r.status).toBe('pinned');
    });
  });

  /* ── Bulletins ── */
  describe('bulletins', () => {
    it('lists bulletins', async () => {
      DDDBulletinBoard.find.mockReturnThis();
      DDDBulletinBoard.sort.mockReturnThis();
      DDDBulletinBoard.lean.mockResolvedValue([{ _id: 'bb1' }]);
      const r = await service.listBulletins({});
      expect(r).toHaveLength(1);
    });

    it('creates bulletin with auto-code', async () => {
      DDDBulletinBoard.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createBulletin({ name: 'Board 1' });
      expect(r.code).toMatch(/^BUL-/);
    });

    it('updates bulletin via _update', async () => {
      DDDBulletinBoard.findByIdAndUpdate.mockReturnThis();
      DDDBulletinBoard.lean.mockResolvedValue({ _id: 'bb1', name: 'Updated' });
      const r = await service.updateBulletin('bb1', { name: 'Updated' });
      expect(r.name).toBe('Updated');
    });
  });

  /* ── Categories ── */
  describe('categories', () => {
    it('lists categories via _list', async () => {
      DDDAnnouncementCategory.find.mockReturnThis();
      DDDAnnouncementCategory.sort.mockReturnThis();
      DDDAnnouncementCategory.lean.mockResolvedValue([{ code: 'general' }]);
      const r = await service.listCategories();
      expect(r).toHaveLength(1);
    });

    it('creates category via _create', async () => {
      DDDAnnouncementCategory.create.mockResolvedValue({ _id: 'c1' });
      const r = await service.createCategory({ code: 'new', name: 'New' });
      expect(r).toHaveProperty('_id');
    });
  });

  /* ── Reactions ── */
  describe('reactions', () => {
    it('adds or updates reaction (upsert)', async () => {
      DDDAnnouncementReaction.findOneAndUpdate.mockReturnThis();
      DDDAnnouncementReaction.lean.mockResolvedValue({ _id: 'rx1', type: 'like' });
      DDDAnnouncement.findByIdAndUpdate.mockResolvedValue({});

      const r = await service.addReaction({ announcementId: 'a1', userId: 'u1', type: 'like' });
      expect(r.type).toBe('like');
    });

    it('increments acknowledgedCount for acknowledged type', async () => {
      DDDAnnouncementReaction.findOneAndUpdate.mockReturnThis();
      DDDAnnouncementReaction.lean.mockResolvedValue({ _id: 'rx1', type: 'acknowledged' });
      DDDAnnouncement.findByIdAndUpdate.mockResolvedValue({});

      await service.addReaction({ announcementId: 'a1', userId: 'u1', type: 'acknowledged' });
      expect(DDDAnnouncement.findByIdAndUpdate).toHaveBeenCalledWith('a1', {
        $inc: { acknowledgedCount: 1 },
      });
    });

    it('lists reactions for an announcement', async () => {
      DDDAnnouncementReaction.find.mockReturnThis();
      DDDAnnouncementReaction.lean.mockResolvedValue([{ _id: 'rx1' }]);
      const r = await service.listReactions('a1');
      expect(r).toHaveLength(1);
    });
  });

  /* ── Analytics ── */
  describe('getAnnouncementAnalytics', () => {
    it('returns aggregate analytics', async () => {
      DDDAnnouncement.countDocuments
        .mockResolvedValueOnce(100) // total announcements
        .mockResolvedValueOnce(50) // published
        .mockResolvedValueOnce(5); // pinned
      DDDBulletinBoard.countDocuments.mockResolvedValue(10);
      DDDAnnouncementCategory.countDocuments.mockResolvedValue(8);
      DDDAnnouncementReaction.countDocuments.mockResolvedValue(200);

      const r = await service.getAnnouncementAnalytics();
      expect(r).toHaveProperty('announcements', 100);
      expect(r).toHaveProperty('published', 50);
      expect(r).toHaveProperty('pinned', 5);
      expect(r).toHaveProperty('bulletins', 10);
      expect(r).toHaveProperty('categories', 8);
      expect(r).toHaveProperty('reactions', 200);
    });
  });
});

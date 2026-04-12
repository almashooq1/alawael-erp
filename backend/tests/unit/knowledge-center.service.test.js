/**
 * Unit tests for knowledge-center.service.js (750L)
 * Mongoose-based — singleton class + KnowledgeBookmark model
 */

/* ── global helper for jest.mock scope ── */
global.__mkKCQ = () => {
  const q = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
    exec: jest.fn().mockResolvedValue([]),
  };
  return q;
};

/* ── Mock mongoose ── */
jest.mock('mongoose', () => {
  const Q = global.__mkKCQ;

  class FakeSchema {
    constructor() {}
    index() {
      return this;
    }
    pre() {
      return this;
    }
    post() {
      return this;
    }
    virtual() {
      return { get: jest.fn() };
    }
    static() {}
  }
  FakeSchema.Types = {
    ObjectId: 'ObjectId',
    String: 'String',
    Number: 'Number',
    Date: 'Date',
    Boolean: 'Boolean',
  };

  const mkModel = () => {
    const M = jest.fn(function (data) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
    });
    M.find = jest.fn().mockReturnValue(Q());
    M.findOne = jest.fn().mockResolvedValue(null);
    M.findById = jest.fn().mockResolvedValue(null);
    M.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
    M.findByIdAndDelete = jest.fn().mockResolvedValue(null);
    M.findOneAndUpdate = jest.fn().mockResolvedValue(null);
    M.countDocuments = jest.fn().mockResolvedValue(0);
    M.create = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'new1', ...d }));
    M.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
    M.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });
    M.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
    M.aggregate = jest.fn().mockResolvedValue([]);
    M.exists = jest.fn().mockResolvedValue(null);
    M.bulkWrite = jest.fn().mockResolvedValue({ matchedCount: 0, upsertedCount: 0 });
    M.collection = { createIndex: jest.fn() };
    return M;
  };

  return {
    Schema: FakeSchema,
    Types: { ObjectId: jest.fn(v => v) },
    models: {},
    model: jest.fn(() => mkModel()),
  };
});

jest.mock('../../models/KnowledgeBase', () => ({
  KnowledgeArticle: require('mongoose').model('KnowledgeArticle'),
  KnowledgeCategory: require('mongoose').model('KnowledgeCategory'),
  KnowledgeSearchLog: require('mongoose').model('KnowledgeSearchLog'),
  KnowledgeRating: require('mongoose').model('KnowledgeRating'),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../utils/sanitize', () => ({
  escapeRegex: jest.fn(s => s),
}));

const {
  knowledgeCenterService: svc,
  KnowledgeBookmark,
} = require('../../services/knowledge-center.service');
const {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeSearchLog,
  KnowledgeRating,
} = require('../../models/KnowledgeBase');

describe('KnowledgeCenterService', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ═══════════════ Articles — getArticles ═══════════════ */
  describe('getArticles', () => {
    it('returns paginated results', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue([{ title: 'Art1' }]);
      KnowledgeArticle.find.mockReturnValue(q);
      KnowledgeArticle.countDocuments.mockResolvedValue(1);

      const res = await svc.getArticles({ page: 1, limit: 20 });
      expect(res.data).toEqual([{ title: 'Art1' }]);
      expect(res.pagination.total).toBe(1);
    });

    it('applies category filter', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue([]);
      KnowledgeArticle.find.mockReturnValue(q);
      KnowledgeArticle.countDocuments.mockResolvedValue(0);

      await svc.getArticles({ category: 'research' });
      const filter = KnowledgeArticle.find.mock.calls[0][0];
      expect(filter.category).toBe('research');
    });

    it('applies search filter', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue([]);
      KnowledgeArticle.find.mockReturnValue(q);
      KnowledgeArticle.countDocuments.mockResolvedValue(0);

      await svc.getArticles({ search: 'therapy' });
      const filter = KnowledgeArticle.find.mock.calls[0][0];
      expect(filter.$or).toBeDefined();
    });

    it('applies tags filter', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue([]);
      KnowledgeArticle.find.mockReturnValue(q);
      KnowledgeArticle.countDocuments.mockResolvedValue(0);

      await svc.getArticles({ tags: 'tag1,tag2' });
      const filter = KnowledgeArticle.find.mock.calls[0][0];
      expect(filter.tags.$in).toEqual(['tag1', 'tag2']);
    });
  });

  /* ═══════════════ Articles — getArticleById ═══════════════ */
  describe('getArticleById', () => {
    it('returns article with user info', async () => {
      const q = global.__mkKCQ();
      const article = {
        _id: 'a1',
        title: 'Test',
        category: 'other',
        relatedArticles: [],
      };
      q.lean.mockResolvedValue(article);
      KnowledgeArticle.findByIdAndUpdate.mockReturnValue(q);
      KnowledgeRating.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      KnowledgeBookmark.exists.mockResolvedValue(null);

      // Related articles fallback
      const relQ = global.__mkKCQ();
      relQ.lean.mockResolvedValue([]);
      KnowledgeArticle.find.mockReturnValue(relQ);

      const res = await svc.getArticleById('a1', 'u1');
      expect(res.article.title).toBe('Test');
      expect(res.isBookmarked).toBe(false);
    });

    it('throws if article not found', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue(null);
      KnowledgeArticle.findByIdAndUpdate.mockReturnValue(q);

      await expect(svc.getArticleById('bad')).rejects.toThrow('المقالة غير موجودة');
    });
  });

  /* ═══════════════ Articles — createArticle ═══════════════ */
  describe('createArticle', () => {
    it('creates article with required fields', async () => {
      KnowledgeArticle.create.mockResolvedValue({ _id: 'new', title: 'New Art' });
      const res = await svc.createArticle({ title: 'New Art', content: 'Body text' }, 'u1');
      expect(res.title).toBe('New Art');
    });

    it('throws without title or content', async () => {
      await expect(svc.createArticle({}, 'u1')).rejects.toThrow('العنوان والمحتوى مطلوبان');
    });
  });

  /* ═══════════════ Articles — updateArticle ═══════════════ */
  describe('updateArticle', () => {
    it('updates allowed fields', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue({ _id: 'a1', title: 'Updated' });
      KnowledgeArticle.findByIdAndUpdate.mockReturnValue(q);

      const res = await svc.updateArticle('a1', { title: 'Updated' }, 'u1');
      expect(res.title).toBe('Updated');
    });

    it('throws if not found', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue(null);
      KnowledgeArticle.findByIdAndUpdate.mockReturnValue(q);

      await expect(svc.updateArticle('bad', {}, 'u1')).rejects.toThrow('المقالة غير موجودة');
    });
  });

  /* ═══════════════ Articles — deleteArticle ═══════════════ */
  describe('deleteArticle', () => {
    it('deletes article and cleans up', async () => {
      KnowledgeArticle.findByIdAndDelete.mockResolvedValue({ _id: 'a1' });
      KnowledgeRating.deleteMany.mockResolvedValue({});
      KnowledgeBookmark.deleteMany.mockResolvedValue({});
      KnowledgeSearchLog.updateMany.mockResolvedValue({});

      const res = await svc.deleteArticle('a1');
      expect(res.deleted).toBe(true);
    });

    it('throws if not found', async () => {
      KnowledgeArticle.findByIdAndDelete.mockResolvedValue(null);
      await expect(svc.deleteArticle('bad')).rejects.toThrow('المقالة غير موجودة');
    });
  });

  /* ═══════════════ changeStatus ═══════════════ */
  describe('changeStatus', () => {
    it('transitions draft to pending_review', async () => {
      const article = {
        _id: 'a1',
        status: 'draft',
        save: jest.fn().mockResolvedValue(true),
      };
      KnowledgeArticle.findById.mockResolvedValue(article);

      const res = await svc.changeStatus('a1', 'pending_review', 'u1');
      expect(res.status).toBe('pending_review');
    });

    it('sets approvedBy on approved transition', async () => {
      const article = {
        _id: 'a1',
        status: 'pending_review',
        save: jest.fn().mockResolvedValue(true),
      };
      KnowledgeArticle.findById.mockResolvedValue(article);

      await svc.changeStatus('a1', 'approved', 'u1');
      expect(article.approvedBy).toBe('u1');
    });

    it('rejects invalid transition', async () => {
      const article = { _id: 'a1', status: 'draft' };
      KnowledgeArticle.findById.mockResolvedValue(article);

      await expect(svc.changeStatus('a1', 'approved', 'u1')).rejects.toThrow(
        'لا يمكن تغيير الحالة'
      );
    });

    it('throws if article not found', async () => {
      KnowledgeArticle.findById.mockResolvedValue(null);
      await expect(svc.changeStatus('bad', 'published', 'u1')).rejects.toThrow(
        'المقالة غير موجودة'
      );
    });
  });

  /* ═══════════════ Comments ═══════════════ */
  describe('addComment', () => {
    it('adds comment to article', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue({ comments: [{ text: 'Nice' }] });
      KnowledgeArticle.findByIdAndUpdate.mockReturnValue(q);

      const res = await svc.addComment('a1', 'Nice article', 'u1');
      expect(res).toEqual([{ text: 'Nice' }]);
    });

    it('throws for short comment', async () => {
      await expect(svc.addComment('a1', 'x', 'u1')).rejects.toThrow('التعليق قصير جداً');
    });

    it('throws if article not found', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue(null);
      KnowledgeArticle.findByIdAndUpdate.mockReturnValue(q);

      await expect(svc.addComment('bad', 'Comment', 'u1')).rejects.toThrow('المقالة غير موجودة');
    });
  });

  describe('deleteComment', () => {
    it('removes comment', async () => {
      const article = {
        comments: {
          id: jest.fn().mockReturnValue({ _id: 'c1' }),
          pull: jest.fn(),
        },
        save: jest.fn().mockResolvedValue(true),
      };
      KnowledgeArticle.findById.mockResolvedValue(article);

      const res = await svc.deleteComment('a1', 'c1', 'u1');
      expect(article.comments.pull).toHaveBeenCalledWith('c1');
    });

    it('throws if comment not found', async () => {
      const article = {
        comments: { id: jest.fn().mockReturnValue(null) },
      };
      KnowledgeArticle.findById.mockResolvedValue(article);

      await expect(svc.deleteComment('a1', 'bad', 'u1')).rejects.toThrow('التعليق غير موجود');
    });
  });

  /* ═══════════════ Ratings ═══════════════ */
  describe('rateArticle', () => {
    it('upserts rating and recalculates aggregate', async () => {
      KnowledgeRating.findOneAndUpdate.mockResolvedValue({});
      KnowledgeRating.aggregate.mockResolvedValue([{ average: 4.5, count: 3 }]);
      KnowledgeArticle.findByIdAndUpdate.mockResolvedValue({});

      const res = await svc.rateArticle('a1', 'u1', 4, 'Good');
      expect(res.average).toBe(4.5);
      expect(res.count).toBe(3);
    });

    it('throws for invalid rating', async () => {
      await expect(svc.rateArticle('a1', 'u1', 0)).rejects.toThrow('التقييم يجب أن يكون بين 1 و 5');
      await expect(svc.rateArticle('a1', 'u1', 6)).rejects.toThrow('التقييم يجب أن يكون بين 1 و 5');
    });
  });

  /* ═══════════════ Bookmarks ═══════════════ */
  describe('toggleBookmark', () => {
    it('creates bookmark if not exists', async () => {
      KnowledgeBookmark.findOne.mockResolvedValue(null);
      KnowledgeBookmark.create.mockResolvedValue({});

      const res = await svc.toggleBookmark('a1', 'u1', 'My note');
      expect(res.bookmarked).toBe(true);
    });

    it('removes bookmark if exists', async () => {
      KnowledgeBookmark.findOne.mockResolvedValue({ _id: 'bk1' });
      KnowledgeBookmark.deleteOne.mockResolvedValue({});

      const res = await svc.toggleBookmark('a1', 'u1');
      expect(res.bookmarked).toBe(false);
    });
  });

  describe('getUserBookmarks', () => {
    it('returns bookmarks filtered by existing article', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue([{ article: { title: 'A' } }, { article: null }]);
      KnowledgeBookmark.find.mockReturnValue(q);

      const res = await svc.getUserBookmarks('u1');
      expect(res.length).toBe(1);
    });
  });

  /* ═══════════════ Categories ═══════════════ */
  describe('getCategories', () => {
    it('returns categories with article counts', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue([{ name: 'cat1', order: 1 }]);
      KnowledgeCategory.find.mockReturnValue(q);
      KnowledgeArticle.aggregate.mockResolvedValue([{ _id: 'cat1', count: 5 }]);

      const res = await svc.getCategories();
      expect(res[0].articleCount).toBe(5);
    });
  });

  describe('createCategory', () => {
    it('creates category', async () => {
      KnowledgeCategory.findOne.mockResolvedValue(null);
      KnowledgeCategory.create.mockResolvedValue({ name: 'newCat' });

      const res = await svc.createCategory({ name: 'newCat' });
      expect(res.name).toBe('newCat');
    });

    it('throws without name', async () => {
      await expect(svc.createCategory({})).rejects.toThrow('اسم التصنيف مطلوب');
    });

    it('throws if name exists', async () => {
      KnowledgeCategory.findOne.mockResolvedValue({ name: 'dup' });
      await expect(svc.createCategory({ name: 'dup' })).rejects.toThrow('التصنيف موجود بالفعل');
    });
  });

  describe('deleteCategory', () => {
    it('deletes empty category', async () => {
      KnowledgeCategory.findById.mockResolvedValue({ name: 'cat1' });
      KnowledgeArticle.countDocuments.mockResolvedValue(0);
      KnowledgeCategory.deleteOne.mockResolvedValue({});

      const res = await svc.deleteCategory('c1');
      expect(res.deleted).toBe(true);
    });

    it('throws if category has articles', async () => {
      KnowledgeCategory.findById.mockResolvedValue({ name: 'cat1' });
      KnowledgeArticle.countDocuments.mockResolvedValue(3);

      await expect(svc.deleteCategory('c1')).rejects.toThrow('لا يمكن حذف التصنيف');
    });
  });

  /* ═══════════════ Search ═══════════════ */
  describe('search', () => {
    it('returns empty for blank query', async () => {
      const res = await svc.search({}, 'u1');
      expect(res.data).toEqual([]);
    });

    it('searches articles with q param', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue([{ title: 'Result' }]);
      KnowledgeArticle.find.mockReturnValue(q);
      KnowledgeArticle.countDocuments.mockResolvedValue(1);
      KnowledgeSearchLog.create.mockResolvedValue({});

      const res = await svc.search({ q: 'therapy' }, 'u1');
      expect(res.data).toEqual([{ title: 'Result' }]);
      expect(res.pagination.total).toBe(1);
    });
  });

  /* ═══════════════ Trending / TopRated / Recent ═══════════════ */
  describe('getTrending', () => {
    it('returns trending articles', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue([{ title: 'Popular' }]);
      KnowledgeArticle.find.mockReturnValue(q);

      const res = await svc.getTrending(5);
      expect(res).toEqual([{ title: 'Popular' }]);
    });
  });

  describe('getTopRated', () => {
    it('returns top rated articles', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue([]);
      KnowledgeArticle.find.mockReturnValue(q);

      const res = await svc.getTopRated();
      expect(res).toEqual([]);
    });
  });

  describe('getRecent', () => {
    it('returns recent articles', async () => {
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue([]);
      KnowledgeArticle.find.mockReturnValue(q);

      const res = await svc.getRecent();
      expect(res).toEqual([]);
    });
  });

  /* ═══════════════ Analytics ═══════════════ */
  describe('getAnalytics', () => {
    it('returns analytics data', async () => {
      KnowledgeArticle.countDocuments
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(30) // published
        .mockResolvedValueOnce(10) // draft
        .mockResolvedValueOnce(5); // pending_review
      KnowledgeArticle.aggregate.mockResolvedValue([]);
      const q = global.__mkKCQ();
      q.lean.mockResolvedValue([]);
      KnowledgeArticle.find.mockReturnValue(q);
      KnowledgeSearchLog.find.mockReturnValue(q);
      KnowledgeSearchLog.aggregate.mockResolvedValue([]);
      KnowledgeRating.aggregate.mockResolvedValue([]);

      const res = await svc.getAnalytics({ period: '30d' });
      expect(res.totalArticles).toBe(50);
      expect(res.publishedCount).toBe(30);
    });
  });

  /* ═══════════════ Stats ═══════════════ */
  describe('getStats', () => {
    it('returns status counts', async () => {
      KnowledgeArticle.countDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60) // published
        .mockResolvedValueOnce(20) // draft
        .mockResolvedValueOnce(10) // pending_review
        .mockResolvedValueOnce(10); // archived

      const res = await svc.getStats();
      expect(res.total).toBe(100);
      expect(res.published).toBe(60);
    });
  });

  /* ═══════════════ Seed Demo Data ═══════════════ */
  describe('seedDemoData', () => {
    it('creates demo categories and articles', async () => {
      KnowledgeCategory.findOneAndUpdate.mockResolvedValue({});
      KnowledgeArticle.findOne.mockResolvedValue(null); // none exist
      KnowledgeArticle.create.mockResolvedValue({});

      const res = await svc.seedDemoData();
      expect(res.created).toBeGreaterThan(0);
      expect(res.message).toContain('تم إنشاء');
    });
  });
});

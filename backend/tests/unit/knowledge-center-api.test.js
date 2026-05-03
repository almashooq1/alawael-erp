'use strict';
/**
 * knowledge-center-api — route-level tests
 * Covers: GET /stats  GET /analytics  GET /search  GET /trending  GET /top-rated
 *         GET /categories  POST /categories  GET /articles  POST /articles  GET /articles/:id
 */
const express = require('express');
const request = require('supertest');

jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { _id: 'usr1', id: 'usr1', role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
jest.mock('../../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/validate', () => ({
  validate: () => (_req, _res, next) => next(),
}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('../../utils/safeError', () => jest.fn(() => 'Error'));

const mockGetStats = jest.fn().mockResolvedValue({ totalArticles: 10, totalCategories: 4 });
const mockGetAnalytics = jest.fn().mockResolvedValue({ views: 200, uniqueReaders: 50 });
const mockSearch = jest.fn().mockResolvedValue([]);
const mockGetTrending = jest.fn().mockResolvedValue([]);
const mockGetTopRated = jest.fn().mockResolvedValue([]);
const mockGetRecent = jest.fn().mockResolvedValue([]);
const mockGetCategories = jest.fn().mockResolvedValue([]);
const mockCreateCategory = jest.fn().mockResolvedValue({ _id: 'cat1', name: 'Technical' });
const mockUpdateCategory = jest.fn().mockResolvedValue({ _id: 'cat1', name: 'Updated' });
const mockDeleteCategory = jest.fn().mockResolvedValue({ deleted: true });
const mockGetArticles = jest.fn().mockResolvedValue({ articles: [], total: 0 });
const mockCreateArticle = jest.fn().mockResolvedValue({ _id: 'art1', title: 'New Article' });
const mockGetArticle = jest.fn().mockResolvedValue(null);
const mockUpdateArticle = jest.fn().mockResolvedValue(null);
const mockDeleteArticle = jest.fn().mockResolvedValue({ deleted: true });
const mockRateArticle = jest.fn().mockResolvedValue({ rated: true });
const mockCommentArticle = jest.fn().mockResolvedValue({ commented: true });
const mockUpdateStatus = jest.fn().mockResolvedValue({ _id: 'art1', status: 'published' });
const mockBookmarkArticle = jest.fn().mockResolvedValue({ bookmarked: true });

jest.mock('../../services/knowledge-center.service', () => ({
  knowledgeCenterService: {
    getStats: (...a) => mockGetStats(...a),
    getAnalytics: (...a) => mockGetAnalytics(...a),
    search: (...a) => mockSearch(...a),
    getTrending: (...a) => mockGetTrending(...a),
    getTopRated: (...a) => mockGetTopRated(...a),
    getRecent: (...a) => mockGetRecent(...a),
    getCategories: (...a) => mockGetCategories(...a),
    createCategory: (...a) => mockCreateCategory(...a),
    updateCategory: (...a) => mockUpdateCategory(...a),
    deleteCategory: (...a) => mockDeleteCategory(...a),
    getArticles: (...a) => mockGetArticles(...a),
    createArticle: (...a) => mockCreateArticle(...a),
    getArticle: (...a) => mockGetArticle(...a),
    updateArticle: (...a) => mockUpdateArticle(...a),
    deleteArticle: (...a) => mockDeleteArticle(...a),
    getArticleById: (...a) => mockGetArticle(...a),
    rateArticle: (...a) => mockRateArticle(...a),
    addComment: (...a) => mockCommentArticle(...a),
    updateArticleStatus: (...a) => mockUpdateStatus(...a),
    toggleBookmark: (...a) => mockBookmarkArticle(...a),
  },
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/knowledge-center', require('../../routes/knowledgeCenter.routes'));
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /knowledge-center/stats', () => {
  test('returns stats with success:true', async () => {
    const res = await request(makeApp()).get('/api/knowledge-center/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalArticles).toBe(10);
  });
});

describe('GET /knowledge-center/analytics', () => {
  test('returns analytics data', async () => {
    const res = await request(makeApp()).get('/api/knowledge-center/analytics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /knowledge-center/search', () => {
  test('returns search results', async () => {
    mockSearch.mockResolvedValue([{ _id: 'a1', title: 'Result' }]);
    const res = await request(makeApp()).get('/api/knowledge-center/search?q=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /knowledge-center/trending', () => {
  test('returns trending articles', async () => {
    const res = await request(makeApp()).get('/api/knowledge-center/trending');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /knowledge-center/categories', () => {
  test('returns category list', async () => {
    mockGetCategories.mockResolvedValue([{ _id: 'c1', name: 'General' }]);
    const res = await request(makeApp()).get('/api/knowledge-center/categories');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /knowledge-center/categories', () => {
  test('creates category', async () => {
    const res = await request(makeApp())
      .post('/api/knowledge-center/categories')
      .send({ name: 'Technical', description: 'Technical articles' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /knowledge-center/articles', () => {
  test('returns paginated article list', async () => {
    mockGetArticles.mockResolvedValue({ articles: [], total: 0 });
    const res = await request(makeApp()).get('/api/knowledge-center/articles');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /knowledge-center/articles', () => {
  test('creates article', async () => {
    const res = await request(makeApp())
      .post('/api/knowledge-center/articles')
      .send({ title: 'دليل التأهيل', content: 'محتوى المقال', categoryId: 'cat1' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(mockCreateArticle).toHaveBeenCalledTimes(1);
  });
});

describe('GET /knowledge-center/articles/:id', () => {
  test('returns 404 when article not found (غير موجود)', async () => {
    mockGetArticle.mockRejectedValue(new Error('المقال غير موجود'));
    const res = await request(makeApp()).get(
      '/api/knowledge-center/articles/507f1f77bcf86cd799439011'
    );
    expect(res.status).toBe(404);
  });

  test('returns article when found', async () => {
    mockGetArticle.mockResolvedValue({ _id: 'art1', title: 'دليل التأهيل' });
    const res = await request(makeApp()).get(
      '/api/knowledge-center/articles/507f1f77bcf86cd799439011'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('دليل التأهيل');
  });
});

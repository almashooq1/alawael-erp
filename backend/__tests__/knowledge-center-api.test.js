/**
 * Knowledge Center API — Integration Tests
 * Tests articles CRUD, categories, ratings, comments, status, bookmarks,
 * search, trending, top-rated, recent, stats, analytics
 */
jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const m1 = envContent.match(/^MONGO_URI\s*=\s*(.+)$/m);
  if (m1) process.env.MONGO_URI = m1[1].trim();
  const m2 = envContent.match(/^MONGODB_URI\s*=\s*(.+)$/m);
  if (m2) process.env.MONGODB_URI = m2[1].trim();
}

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

let app;
let KnowledgeArticle;
let KnowledgeCategory;
let articleId;
let categoryId;
const testUserId = new mongoose.Types.ObjectId();

const LONG_CONTENT =
  'هذا محتوى طويل لاختبار إنشاء المقالات في مركز المعرفة — يجب أن يتجاوز الحد الأدنى المئة حرف لنجاح العملية. ' +
  'نضيف المزيد من النص حتى نتأكد أن الطول كافٍ تماماً ويتخطى الحد الأدنى المطلوب بكثير.';

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) await mongoose.connect(uri);

  const models = require('../models/KnowledgeBase');
  KnowledgeArticle = models.KnowledgeArticle;
  KnowledgeCategory = models.KnowledgeCategory;
  require('../models/User');

  const routes = require('../routes/knowledgeCenter.routes');
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: testUserId, id: testUserId, role: 'admin', name: 'Test Admin' };
    req.userId = testUserId;
    next();
  });
  app.use('/api/knowledge-center', routes);
});

afterAll(async () => {
  try {
    if (KnowledgeArticle) {
      await KnowledgeArticle.deleteMany({ title: /^test-kc-/ }).catch(() => {});
    }
    if (KnowledgeCategory) {
      await KnowledgeCategory.deleteMany({ name: /^test-kc-/ }).catch(() => {});
    }
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
});

describe('Knowledge Center Routes', () => {
  // ═══════════════════════════════════════════════════════════════
  // STATS & ANALYTICS
  // ═══════════════════════════════════════════════════════════════
  test('GET /stats — returns dashboard stats', async () => {
    const res = await request(app).get('/api/knowledge-center/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /analytics — returns admin analytics', async () => {
    const res = await request(app).get('/api/knowledge-center/analytics');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════════════════════
  test('POST /categories — creates a category', async () => {
    const res = await request(app)
      .post('/api/knowledge-center/categories')
      .send({
        name: 'test-kc-cat-' + Date.now(),
        description: 'Test category',
        icon: '📚',
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    categoryId = res.body.data?._id;
  });

  test('GET /categories — lists categories', async () => {
    const res = await request(app).get('/api/knowledge-center/categories');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('DELETE /categories/:id — deletes a category', async () => {
    if (!categoryId) return;
    const res = await request(app).delete(`/api/knowledge-center/categories/${categoryId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('PUT /categories/:id — updates a category', async () => {
    // Create a fresh category to update
    const createRes = await request(app)
      .post('/api/knowledge-center/categories')
      .send({ name: 'test-kc-cat-update', description: 'To be updated' });
    const catId = createRes.body.data?._id;
    if (!catId) return;
    const res = await request(app)
      .put(`/api/knowledge-center/categories/${catId}`)
      .send({ name: 'test-kc-cat-updated', description: 'Updated description' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    // Cleanup
    await request(app).delete(`/api/knowledge-center/categories/${catId}`);
  });

  // ═══════════════════════════════════════════════════════════════
  // ARTICLES CRUD
  // ═══════════════════════════════════════════════════════════════
  test('POST /articles — creates an article', async () => {
    const res = await request(app)
      .post('/api/knowledge-center/articles')
      .send({
        title: 'test-kc-article-' + Date.now(),
        description: 'وصف تجريبي للمقالة يجب أن يكون عشرين حرفاً على الأقل',
        content: LONG_CONTENT,
        category: 'best_practices',
        tags: ['testing'],
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    articleId = res.body.data?._id;
    expect(articleId).toBeDefined();
  });

  test('GET /articles — lists articles with pagination', async () => {
    const res = await request(app).get('/api/knowledge-center/articles');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    // Service returns { data: [...], pagination: {...} }
    expect(res.body.data).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('pagination');
  });

  test('GET /articles/:id — returns single article', async () => {
    if (!articleId) return;
    const res = await request(app).get(`/api/knowledge-center/articles/${articleId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('article');
  });

  test('PUT /articles/:id — updates an article', async () => {
    if (!articleId) return;
    const res = await request(app).put(`/api/knowledge-center/articles/${articleId}`).send({
      title: 'test-kc-article-updated',
      description: 'وصف محدث للمقالة يجب أن يكون عشرين حرفاً على الأقل',
      content: LONG_CONTENT,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════
  // ARTICLE ACTIONS
  // ═══════════════════════════════════════════════════════════════
  test('POST /articles/:id/rate — rates an article', async () => {
    if (!articleId) return;
    const res = await request(app)
      .post(`/api/knowledge-center/articles/${articleId}/rate`)
      .send({ rating: 4, feedback: 'مفيد جداً' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /articles/:id/comment — adds a comment', async () => {
    if (!articleId) return;
    const res = await request(app)
      .post(`/api/knowledge-center/articles/${articleId}/comment`)
      .send({ text: 'تعليق تجريبي ممتاز' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /articles/:id/comment/:commentId — deletes a comment', async () => {
    if (!articleId) return;
    // Add a comment first, then delete it
    const _addRes = await request(app)
      .post(`/api/knowledge-center/articles/${articleId}/comment`)
      .send({ text: 'تعليق للحذف' });
    // Get the article to find comment id
    const getRes = await request(app).get(`/api/knowledge-center/articles/${articleId}`);
    const comments = getRes.body.data?.comments || [];
    const commentId = comments[comments.length - 1]?._id;
    if (!commentId) return;
    const res = await request(app).delete(
      `/api/knowledge-center/articles/${articleId}/comment/${commentId}`
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /articles/:id/status — changes article status', async () => {
    if (!articleId) return;
    // Article was created with status 'published' (service default)
    // Valid transition: published → archived
    const res = await request(app)
      .post(`/api/knowledge-center/articles/${articleId}/status`)
      .send({ status: 'archived' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /articles/:id/bookmark — toggles bookmark', async () => {
    if (!articleId) return;
    const res = await request(app)
      .post(`/api/knowledge-center/articles/${articleId}/bookmark`)
      .send({ note: 'للرجوع لاحقاً' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════
  // BOOKMARKS
  // ═══════════════════════════════════════════════════════════════
  test('GET /bookmarks — lists user bookmarks', async () => {
    const res = await request(app).get('/api/knowledge-center/bookmarks');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════
  // SEARCH & DISCOVERY
  // ═══════════════════════════════════════════════════════════════
  test('GET /search — searches articles', async () => {
    const res = await request(app).get('/api/knowledge-center/search?q=test');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /trending — returns trending articles', async () => {
    const res = await request(app).get('/api/knowledge-center/trending');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /top-rated — returns top rated articles', async () => {
    const res = await request(app).get('/api/knowledge-center/top-rated');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /recent — returns recent articles', async () => {
    const res = await request(app).get('/api/knowledge-center/recent');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE ARTICLE (last — cleanup)
  // ═══════════════════════════════════════════════════════════════
  test('DELETE /articles/:id — deletes an article', async () => {
    if (!articleId) return;
    const res = await request(app).delete(`/api/knowledge-center/articles/${articleId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

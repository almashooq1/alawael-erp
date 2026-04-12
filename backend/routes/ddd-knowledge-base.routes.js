'use strict';
/**
 * KnowledgeBase Routes
 * Auto-extracted from services/dddKnowledgeBase.js
 * 24 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddKnowledgeBase');
const { validate } = require('../middleware/validate');
const v = require('../validations/knowledge-base.validation');


  // Service imported as singleton above;

  /* ── Categories ── */
  router.get('/knowledge/categories', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCategories(req.query) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.get('/knowledge/categories/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getCategory(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.post('/knowledge/categories', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCategory(req.body) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.put('/knowledge/categories/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateCategory(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });

  /* ── Articles ── */
  router.get('/knowledge/articles', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listArticles(req.query) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.get('/knowledge/articles/search', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.searchArticles(req.query.q) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.get('/knowledge/articles/slug/:slug', authenticate, async (req, res) => {
    try {
      const d = await svc.getArticleBySlug(req.params.slug);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.get('/knowledge/articles/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getArticle(req.params.id);
      if (d) {
        await svc.incrementViewCount(req.params.id);
        res.json({ success: true, data: d });
      } else res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.post('/knowledge/articles', authenticate, validate(v.createArticle), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createArticle(req.body) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.put('/knowledge/articles/:id', authenticate, validate(v.updateArticle), async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updateArticle(req.params.id, req.body, req.body.userId),
      });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.post('/knowledge/articles/:id/publish', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.publishArticle(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });

  /* ── Protocols ── */
  router.get('/knowledge/protocols', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listProtocols(req.query) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.get('/knowledge/protocols/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getProtocol(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.post('/knowledge/protocols', authenticate, validate(v.createProtocol), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createProtocol(req.body) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.put('/knowledge/protocols/:id', authenticate, validate(v.updateProtocol), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateProtocol(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.post('/knowledge/protocols/:id/publish', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.publishProtocol(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });

  /* ── FAQs ── */
  router.get('/knowledge/faqs', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFAQs(req.query) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.get('/knowledge/faqs/search', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.searchFAQs(req.query.q) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.get('/knowledge/faqs/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getFAQ(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.post('/knowledge/faqs', authenticate, validate(v.createFAQ), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFAQ(req.body) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.put('/knowledge/faqs/:id', authenticate, validate(v.updateFAQ), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateFAQ(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });
  router.post('/knowledge/faqs/:id/feedback', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.recordFeedback(req.params.id, req.body.helpful) });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });

  /* ── Analytics ── */
  router.get('/knowledge/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getKBAnalytics() });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });

  /* ── Health ── */
  router.get('/knowledge/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'knowledge-base');
    }
  });


module.exports = router;

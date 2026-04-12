'use strict';
/**
 * AnnouncementManager Routes
 * Auto-extracted from services/dddAnnouncementManager.js
 * 16 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddAnnouncementManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/announcement-manager.validation');


  // Service imported as singleton above;

  /* Announcements */
  router.get('/announcements', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAnnouncements(req.query) });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });
  router.get('/announcements/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getAnnouncement(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });
  router.post('/announcements', authenticate, validate(v.createAnnouncement), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAnnouncement(req.body) });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });
  router.put('/announcements/:id', authenticate, validate(v.updateAnnouncement), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateAnnouncement(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });
  router.post('/announcements/:id/publish', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.publishAnnouncement(req.params.id) });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });
  router.post('/announcements/:id/archive', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.archiveAnnouncement(req.params.id) });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });
  router.post('/announcements/:id/pin', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.pinAnnouncement(req.params.id) });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });

  /* Reactions */
  router.post('/announcements/:id/reactions', authenticate, async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.addReaction({ ...req.body, announcementId: req.params.id }),
        });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });
  router.get('/announcements/:id/reactions', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReactions(req.params.id) });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });

  /* Bulletins */
  router.get('/bulletins', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listBulletins(req.query) });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });
  router.post('/bulletins', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBulletin(req.body) });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });
  router.put('/bulletins/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateBulletin(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });

  /* Categories */
  router.get('/announcement-categories', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listCategories() });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });
  router.post('/announcement-categories', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCategory(req.body) });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });

  /* Analytics & Health */
  router.get('/announcements/analytics/summary', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getAnnouncementAnalytics() });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });
  router.get('/announcements/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'announcement-manager');
    }
  });


module.exports = router;

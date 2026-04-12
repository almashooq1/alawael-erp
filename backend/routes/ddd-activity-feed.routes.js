'use strict';
/**
 * ActivityFeed Routes
 * Auto-extracted from services/dddActivityFeed.js
 * 11 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getActivityFeedDashboard, getFeed, getEntityTimeline, getDomainFeed, publishActivity, markActivityRead, getUnreadCount, getUserSubscriptions, subscribe, generateDigest, getActivityAnalytics } = require('../services/dddActivityFeed');
const { validate } = require('../middleware/validate');
const v = require('../validations/activity-feed.validation');

  router.get('/activity-feed', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await getActivityFeedDashboard() });
    } catch (e) {
      safeError(res, e, 'activity-feed');
    }
  });

  router.get('/activity-feed/user/:userId', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await getFeed(req.params.userId, req.query) });
    } catch (e) {
      safeError(res, e, 'activity-feed');
    }
  });

  router.get('/activity-feed/entity/:entityType/:entityId', authenticate, async (req, res) => {
    try {
    res.json({
    success: true,
    data: await getEntityTimeline(req.params.entityType, req.params.entityId, req.query),
    });
    } catch (e) {
      safeError(res, e, 'activity-feed');
    }
  });

  router.get('/activity-feed/domain/:domain', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await getDomainFeed(req.params.domain, req.query) });
    } catch (e) {
      safeError(res, e, 'activity-feed');
    }
  });

  router.post('/activity-feed', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await publishActivity(req.body) });
    } catch (e) {
      safeError(res, e, 'activity-feed');
    }
  });

  router.post('/activity-feed/:activityId/read', authenticate, async (req, res) => {
    try {
    res.json({
    success: true,
    data: await markActivityRead(req.params.activityId, req.body.userId),
    });
    } catch (e) {
      safeError(res, e, 'activity-feed');
    }
  });

  router.get('/activity-feed/unread/:userId', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: { unread: await getUnreadCount(req.params.userId) } });
    } catch (e) {
      safeError(res, e, 'activity-feed');
    }
  });

  router.get('/activity-feed/subscriptions/:userId', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await getUserSubscriptions(req.params.userId) });
    } catch (e) {
      safeError(res, e, 'activity-feed');
    }
  });

  router.post('/activity-feed/subscriptions', authenticate, validate(v.createSubscription), async (req, res) => {
    try {
    const { userId, ...data } = req.body;
    res.json({ success: true, data: await subscribe(userId, data) });
    } catch (e) {
      safeError(res, e, 'activity-feed');
    }
  });

  router.post('/activity-feed/digest/:userId', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await generateDigest(req.params.userId, req.body.period) });
    } catch (e) {
      safeError(res, e, 'activity-feed');
    }
  });

  router.get('/activity-feed/analytics', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await getActivityAnalytics(req.query) });
    } catch (e) {
      safeError(res, e, 'activity-feed');
    }
  });

module.exports = router;

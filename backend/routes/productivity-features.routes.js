'use strict';

/**
 * productivity-features.routes.js — Wave 25.
 *
 *   GET  /                                     — list catalog
 *   GET  /catalog/for-role/:groupKey           — features available to role
 *
 *   POST /annotations                          — { kpiId, branchId?, textAr|En, visibility?, visibilityRoles? }
 *   GET  /annotations?kpiId=...&branchId=...
 *   POST /annotations/:id/resolve
 *
 *   POST /handoffs                             — { subjectType, subjectId, branchId, toRoleGroup, toUserId?, textAr|En, priority? }
 *   GET  /handoffs/me?branchId=...
 *   POST /handoffs/:id/read
 *   POST /handoffs/:id/acknowledge
 *
 *   POST /follow-ups                           — { titleAr|En, dueByHours?, sourceType?, sourceId?, ownerUserId?, branchId? }
 *   GET  /follow-ups/me?status=open
 *   POST /follow-ups/:id/complete
 *   POST /follow-ups/:id/snooze                — { hours }
 *
 *   POST /watchlists                           — { nameAr|En, entityType, entityIds[] }
 *   GET  /watchlists/me
 *   POST /watchlists/:id/add                   — { entityId }
 *   POST /watchlists/:id/remove                — { entityId }
 *
 *   GET  /preferences/me                       — full preferences
 *   POST /preferences/me/pin                   — { dashboardKey, elementId }
 *   POST /preferences/me/unpin                 — { dashboardKey, elementId }
 *   POST /preferences/me/saved-views           — { dashboardKey, nameAr|En, filters, shareWithRole? }
 *   DELETE /preferences/me/saved-views/:viewId
 *   POST /preferences/me/presets/:dashboardKey — { preset }
 *
 * Authentication is enforced upstream (router mounted behind
 * `authenticate` in app.js). `req.user.id` carries the actor.
 */

const express = require('express');
const safeError = require('../utils/safeError');

const REASON_TO_STATUS = Object.freeze({
  KPI_ID_REQUIRED: 400,
  TEXT_REQUIRED: 400,
  TEXT_TOO_LONG: 413,
  ACTOR_REQUIRED: 401,
  NOT_FOUND: 404,
  SUBJECT_REQUIRED: 400,
  RECIPIENT_REQUIRED: 400,
  INVALID_PRIORITY: 400,
  OWNER_REQUIRED: 400,
  TITLE_REQUIRED: 400,
  ENTITY_TYPE_REQUIRED: 400,
  ENTITY_ID_REQUIRED: 400,
  NAME_REQUIRED: 400,
  USER_ID_REQUIRED: 401,
  INVALID_PIN_REQUEST: 400,
  INVALID_REQUEST: 400,
  PIN_LIMIT_EXCEEDED: 409,
  INVALID_SNOOZE_DURATION: 400,
});

function respond(res, result) {
  if (result && result.ok) {
    return res.json({ success: true, data: result });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'PRODUCTIVITY_REJECTED',
    reason: result?.reason,
  });
}

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
    ip: req.ip,
  };
}

function createProductivityFeaturesRouter({
  productivity,
  registry = null,
  logger = console,
} = {}) {
  if (!productivity || typeof productivity.createAnnotation !== 'function') {
    throw new Error('productivity-features.routes: productivity service is required');
  }
  void logger;
  const reg = registry || require('../intelligence/productivity-features.registry');

  const router = express.Router();

  // ─── Catalog ───────────────────────────────────────────────

  router.get('/', async (_req, res) => {
    try {
      const features = reg.listFeatureKeys().map(k => {
        const f = reg.getFeature(k);
        return {
          key: k,
          titleAr: f.titleAr,
          titleEn: f.titleEn,
          category: f.category,
          placement: f.placement,
          triggerType: f.triggerType,
          status: f.status,
          roleGroups: f.roleGroups,
        };
      });
      return res.json({ success: true, data: { features, count: features.length } });
    } catch (err) {
      return safeError(res, err, 'productivity.catalog');
    }
  });

  router.get('/catalog/for-role/:groupKey', async (req, res) => {
    try {
      const keys = reg.listForRoleGroup(req.params.groupKey);
      const features = keys.map(k => ({ key: k, ...reg.getFeature(k) }));
      return res.json({ success: true, data: { features, count: features.length } });
    } catch (err) {
      return safeError(res, err, 'productivity.catalog.forRole');
    }
  });

  // ─── Annotations ───────────────────────────────────────────

  router.post('/annotations', async (req, res) => {
    try {
      const body = req.body || {};
      const r = await productivity.createAnnotation({
        kpiId: body.kpiId,
        branchId: body.branchId,
        textAr: body.textAr,
        textEn: body.textEn,
        visibility: body.visibility,
        visibilityRoles: body.visibilityRoles,
        actor: actorFrom(req),
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.annotations.create');
    }
  });

  router.get('/annotations', async (req, res) => {
    try {
      const out = await productivity.listAnnotations({
        kpiId: req.query.kpiId,
        branchId: req.query.branchId || null,
      });
      return res.json({ success: true, data: { annotations: out, count: out.length } });
    } catch (err) {
      return safeError(res, err, 'productivity.annotations.list');
    }
  });

  router.post('/annotations/:id/resolve', async (req, res) => {
    try {
      const r = await productivity.resolveAnnotation({
        annotationId: req.params.id,
        actor: actorFrom(req),
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.annotations.resolve');
    }
  });

  // ─── Handoff notes ─────────────────────────────────────────

  router.post('/handoffs', async (req, res) => {
    try {
      const body = req.body || {};
      const r = await productivity.createHandoff({
        subjectType: body.subjectType,
        subjectId: body.subjectId,
        branchId: body.branchId,
        toRoleGroup: body.toRoleGroup,
        toUserId: body.toUserId,
        textAr: body.textAr,
        textEn: body.textEn,
        priority: body.priority,
        expiresAt: body.expiresAt,
        actor: actorFrom(req),
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.handoffs.create');
    }
  });

  router.get('/handoffs/me', async (req, res) => {
    try {
      const out = await productivity.listHandoffsForUser({
        userId: req.user?.id || req.user?._id || null,
        roleGroup: req.query.roleGroup || null,
        branchId: req.query.branchId || null,
        includeExpired: req.query.includeExpired === 'true',
      });
      return res.json({ success: true, data: { handoffs: out, count: out.length } });
    } catch (err) {
      return safeError(res, err, 'productivity.handoffs.listMe');
    }
  });

  router.post('/handoffs/:id/read', async (req, res) => {
    try {
      const r = await productivity.markHandoffRead({
        handoffId: req.params.id,
        actor: actorFrom(req),
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.handoffs.read');
    }
  });

  router.post('/handoffs/:id/acknowledge', async (req, res) => {
    try {
      const r = await productivity.acknowledgeHandoff({
        handoffId: req.params.id,
        actor: actorFrom(req),
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.handoffs.ack');
    }
  });

  // ─── Follow-ups ────────────────────────────────────────────

  router.post('/follow-ups', async (req, res) => {
    try {
      const body = req.body || {};
      const actor = actorFrom(req);
      const r = await productivity.createFollowUp({
        ownerUserId: body.ownerUserId || actor.userId,
        ownerRole: body.ownerRole || actor.role,
        branchId: body.branchId,
        sourceType: body.sourceType || 'manual',
        sourceId: body.sourceId,
        titleAr: body.titleAr,
        titleEn: body.titleEn,
        dueByHours: typeof body.dueByHours === 'number' ? body.dueByHours : undefined,
        actor,
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.followUps.create');
    }
  });

  router.get('/follow-ups/me', async (req, res) => {
    try {
      const out = await productivity.listFollowUpsForUser({
        ownerUserId: req.user?.id || req.user?._id || null,
        status: req.query.status || 'open',
      });
      return res.json({ success: true, data: { followUps: out, count: out.length } });
    } catch (err) {
      return safeError(res, err, 'productivity.followUps.listMe');
    }
  });

  router.post('/follow-ups/:id/complete', async (req, res) => {
    try {
      const r = await productivity.completeFollowUp({
        followUpId: req.params.id,
        actor: actorFrom(req),
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.followUps.complete');
    }
  });

  router.post('/follow-ups/:id/snooze', async (req, res) => {
    try {
      const { hours } = req.body || {};
      const r = await productivity.snoozeFollowUp({
        followUpId: req.params.id,
        hours: typeof hours === 'number' ? hours : 24,
        actor: actorFrom(req),
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.followUps.snooze');
    }
  });

  // ─── Watchlists ────────────────────────────────────────────

  router.post('/watchlists', async (req, res) => {
    try {
      const body = req.body || {};
      const actor = actorFrom(req);
      const r = await productivity.createWatchlist({
        ownerUserId: actor.userId,
        ownerRole: actor.role,
        nameAr: body.nameAr,
        nameEn: body.nameEn,
        entityType: body.entityType,
        entityIds: body.entityIds,
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.watchlists.create');
    }
  });

  router.get('/watchlists/me', async (req, res) => {
    try {
      const out = await productivity.listWatchlistsForUser({
        ownerUserId: req.user?.id || req.user?._id || null,
      });
      return res.json({ success: true, data: { watchlists: out, count: out.length } });
    } catch (err) {
      return safeError(res, err, 'productivity.watchlists.listMe');
    }
  });

  router.post('/watchlists/:id/add', async (req, res) => {
    try {
      const r = await productivity.addToWatchlist({
        watchlistId: req.params.id,
        entityId: req.body?.entityId,
        actor: actorFrom(req),
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.watchlists.add');
    }
  });

  router.post('/watchlists/:id/remove', async (req, res) => {
    try {
      const r = await productivity.removeFromWatchlist({
        watchlistId: req.params.id,
        entityId: req.body?.entityId,
        actor: actorFrom(req),
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.watchlists.remove');
    }
  });

  // ─── User preferences ──────────────────────────────────────

  router.get('/preferences/me', async (req, res) => {
    try {
      const r = await productivity.getUserPreferences({
        userId: req.user?.id || req.user?._id || null,
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.preferences.get');
    }
  });

  router.post('/preferences/me/pin', async (req, res) => {
    try {
      const { dashboardKey, elementId } = req.body || {};
      const r = await productivity.pinWidget({
        userId: req.user?.id || req.user?._id || null,
        dashboardKey,
        elementId,
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.preferences.pin');
    }
  });

  router.post('/preferences/me/unpin', async (req, res) => {
    try {
      const { dashboardKey, elementId } = req.body || {};
      const r = await productivity.unpinWidget({
        userId: req.user?.id || req.user?._id || null,
        dashboardKey,
        elementId,
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.preferences.unpin');
    }
  });

  router.post('/preferences/me/saved-views', async (req, res) => {
    try {
      const body = req.body || {};
      const r = await productivity.saveView({
        userId: req.user?.id || req.user?._id || null,
        dashboardKey: body.dashboardKey,
        nameAr: body.nameAr,
        nameEn: body.nameEn,
        filters: body.filters || {},
        shareWithRole: !!body.shareWithRole,
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.preferences.saveView');
    }
  });

  router.delete('/preferences/me/saved-views/:viewId', async (req, res) => {
    try {
      const r = await productivity.deleteSavedView({
        userId: req.user?.id || req.user?._id || null,
        viewId: req.params.viewId,
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.preferences.deleteView');
    }
  });

  router.post('/preferences/me/presets/:dashboardKey', async (req, res) => {
    try {
      const r = await productivity.upsertPreset({
        userId: req.user?.id || req.user?._id || null,
        dashboardKey: req.params.dashboardKey,
        preset: req.body?.preset || {},
      });
      return respond(res, r);
    } catch (err) {
      return safeError(res, err, 'productivity.preferences.preset');
    }
  });

  return router;
}

module.exports = { createProductivityFeaturesRouter };

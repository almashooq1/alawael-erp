'use strict';

/**
 * productivity-features.service.js — Wave 25.
 *
 * Factory holding CRUD for the 5 new persisted entities introduced
 * in Wave 25:
 *
 *   • Annotation     — comments on KPIs
 *   • HandoffNote    — team-to-team notes at shift change
 *   • FollowUp       — operational accountability queue
 *   • Watchlist      — user-owned list of entities
 *   • UserPreferences — pinned widgets + saved views + dashboard presets
 *
 * Mongo-free at this layer: the service holds an in-memory `stores`
 * map by default. The caller wires real Mongoose models via the
 * factory's `models` option once we add Mongo persistence (Wave 26+).
 * This keeps the service shape stable across the persistence cutover.
 */

const reviewerQueue = require('./reviewer-queue.lib');

const DEFAULT_FOLLOWUP_HOURS = 24;
const MAX_PINNED_WIDGETS = 6;

function nowDate() {
  return new Date();
}

function uid() {
  // Per-process counter — sufficient for in-memory store, and the
  // Mongo path will use _id from the driver.
  uid.n = (uid.n || 0) + 1;
  return `p-${Date.now()}-${uid.n}`;
}

function createProductivityFeaturesService({
  models = null,
  logger = console,
  now = nowDate,
} = {}) {
  void logger;

  // In-memory fallback stores (Maps keyed by id).
  const stores = {
    annotations: new Map(),
    handoffs: new Map(),
    followUps: new Map(),
    watchlists: new Map(),
    userPrefs: new Map(),
  };

  // ─── Annotations ───────────────────────────────────────────────

  async function createAnnotation({
    kpiId,
    branchId = null,
    textAr,
    textEn,
    actor = {},
    visibility = 'authenticated',
    visibilityRoles = [],
  }) {
    if (!kpiId) return { ok: false, reason: 'KPI_ID_REQUIRED' };
    const text = (textAr || textEn || '').trim();
    if (!text) return { ok: false, reason: 'TEXT_REQUIRED' };
    if (text.length > 2000) return { ok: false, reason: 'TEXT_TOO_LONG' };
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };

    const id = uid();
    const doc = {
      _id: id,
      kpiId,
      branchId,
      byUserId: actor.userId,
      byRole: actor.role || null,
      textAr: textAr || null,
      textEn: textEn || null,
      visibility,
      visibilityRoles: Array.isArray(visibilityRoles) ? visibilityRoles : [],
      at: now(),
      resolvedAt: null,
    };
    if (models?.Annotation) {
      const saved = await models.Annotation.create(doc);
      return { ok: true, annotation: saved };
    }
    stores.annotations.set(id, doc);
    return { ok: true, annotation: doc };
  }

  async function listAnnotations({ kpiId, branchId = null }) {
    if (!kpiId) return [];
    if (models?.Annotation) {
      const filter = { kpiId };
      if (branchId) filter.branchId = branchId;
      return models.Annotation.find(filter).sort({ at: -1 }).lean();
    }
    return Array.from(stores.annotations.values())
      .filter(a => a.kpiId === kpiId && (!branchId || a.branchId === branchId))
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  async function resolveAnnotation({ annotationId, actor = {} }) {
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };
    if (models?.Annotation) {
      const updated = await models.Annotation.findByIdAndUpdate(
        annotationId,
        { resolvedAt: now() },
        { returnDocument: 'after' }
      );
      if (!updated) return { ok: false, reason: 'NOT_FOUND' };
      return { ok: true, annotation: updated };
    }
    const a = stores.annotations.get(annotationId);
    if (!a) return { ok: false, reason: 'NOT_FOUND' };
    a.resolvedAt = now();
    return { ok: true, annotation: a };
  }

  // ─── Handoff notes ─────────────────────────────────────────────

  async function createHandoff({
    subjectType,
    subjectId,
    branchId,
    toRoleGroup,
    toUserId = null,
    textAr,
    textEn,
    priority = 'fyi',
    expiresAt = null,
    actor = {},
  }) {
    if (!subjectType || !subjectId) return { ok: false, reason: 'SUBJECT_REQUIRED' };
    if (!toRoleGroup && !toUserId) return { ok: false, reason: 'RECIPIENT_REQUIRED' };
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };
    const text = (textAr || textEn || '').trim();
    if (!text) return { ok: false, reason: 'TEXT_REQUIRED' };
    if (text.length > 2000) return { ok: false, reason: 'TEXT_TOO_LONG' };
    if (!['must-read', 'fyi'].includes(priority)) {
      return { ok: false, reason: 'INVALID_PRIORITY' };
    }

    const id = uid();
    const doc = {
      _id: id,
      byUserId: actor.userId,
      byRole: actor.role || null,
      branchId,
      subjectType,
      subjectId,
      toRoleGroup,
      toUserId,
      textAr: textAr || null,
      textEn: textEn || null,
      priority,
      at: now(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      readBy: [],
      acknowledgedAt: null,
    };
    if (models?.HandoffNote) {
      const saved = await models.HandoffNote.create(doc);
      return { ok: true, handoff: saved };
    }
    stores.handoffs.set(id, doc);
    return { ok: true, handoff: doc };
  }

  async function listHandoffsForUser({
    userId,
    roleGroup,
    branchId = null,
    includeExpired = false,
  }) {
    const cutoff = now();
    function matches(h) {
      if (h.toUserId && h.toUserId === userId) return true;
      if (h.toRoleGroup && h.toRoleGroup === roleGroup) {
        if (!branchId || h.branchId === branchId) return true;
      }
      return false;
    }
    function notExpired(h) {
      if (includeExpired) return true;
      return !h.expiresAt || new Date(h.expiresAt) > cutoff;
    }
    if (models?.HandoffNote) {
      const filter = {
        $or: [{ toUserId: userId }, { toRoleGroup: roleGroup }],
      };
      if (!includeExpired) {
        filter.$and = [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: cutoff } }] }];
      }
      return models.HandoffNote.find(filter).sort({ at: -1 }).lean();
    }
    return Array.from(stores.handoffs.values())
      .filter(h => matches(h) && notExpired(h))
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  async function markHandoffRead({ handoffId, actor = {} }) {
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };
    if (models?.HandoffNote) {
      const h = await models.HandoffNote.findById(handoffId);
      if (!h) return { ok: false, reason: 'NOT_FOUND' };
      if (!h.readBy.includes(actor.userId)) {
        h.readBy.push(actor.userId);
        await h.save();
      }
      return { ok: true, handoff: h };
    }
    const h = stores.handoffs.get(handoffId);
    if (!h) return { ok: false, reason: 'NOT_FOUND' };
    if (!h.readBy.includes(actor.userId)) h.readBy.push(actor.userId);
    return { ok: true, handoff: h };
  }

  async function acknowledgeHandoff({ handoffId, actor = {} }) {
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };
    if (models?.HandoffNote) {
      const h = await models.HandoffNote.findById(handoffId);
      if (!h) return { ok: false, reason: 'NOT_FOUND' };
      if (h.acknowledgedAt) return { ok: true, handoff: h, noop: true };
      h.acknowledgedAt = now();
      if (!h.readBy.includes(actor.userId)) h.readBy.push(actor.userId);
      await h.save();
      return { ok: true, handoff: h };
    }
    const h = stores.handoffs.get(handoffId);
    if (!h) return { ok: false, reason: 'NOT_FOUND' };
    if (h.acknowledgedAt) return { ok: true, handoff: h, noop: true };
    h.acknowledgedAt = now();
    if (!h.readBy.includes(actor.userId)) h.readBy.push(actor.userId);
    return { ok: true, handoff: h };
  }

  // ─── Follow-ups (operational queue) ───────────────────────────

  async function createFollowUp({
    ownerUserId,
    ownerRole = null,
    branchId = null,
    sourceType = 'manual',
    sourceId = null,
    titleAr,
    titleEn,
    dueByHours = DEFAULT_FOLLOWUP_HOURS,
    actor = {},
  }) {
    if (!ownerUserId) return { ok: false, reason: 'OWNER_REQUIRED' };
    if (!titleAr && !titleEn) return { ok: false, reason: 'TITLE_REQUIRED' };

    // Dedup: if a non-manual source already has an OPEN follow-up for
    // this owner, don't double-queue. Manual entries always create
    // fresh (operator may want multiple).
    //
    // Wave 92 — dedup logic delegated to reviewer-queue.lib.dedupBySource.
    // The Mongo path is left untouched (it's an indexed point-lookup —
    // the lib's in-memory walk would force loading every row).
    if (sourceType !== 'manual' && sourceId) {
      if (models?.FollowUp) {
        const existing = await models.FollowUp.findOne({
          ownerUserId,
          sourceType,
          sourceId,
          status: 'open',
        });
        if (existing) return { ok: true, followUp: existing, deduped: true, noop: true };
      } else {
        const { isDuplicate, match } = reviewerQueue.dedupBySource({
          existing: stores.followUps.values(),
          candidate: { ownerUserId, sourceType, sourceId },
        });
        if (isDuplicate) {
          return { ok: true, followUp: match, deduped: true, noop: true };
        }
      }
    }

    const id = uid();
    const doc = {
      _id: id,
      ownerUserId,
      ownerRole,
      branchId,
      sourceType,
      sourceId,
      titleAr: titleAr || null,
      titleEn: titleEn || null,
      dueBy: new Date(now().getTime() + dueByHours * 60 * 60 * 1000),
      status: 'open',
      createdAt: now(),
      doneAt: null,
      notes: [],
      createdBy: actor.userId || ownerUserId,
    };
    if (models?.FollowUp) {
      const saved = await models.FollowUp.create(doc);
      return { ok: true, followUp: saved };
    }
    stores.followUps.set(id, doc);
    return { ok: true, followUp: doc };
  }

  /**
   * Auto-create a follow-up from an event (alert.acknowledge,
   * insight.confirm). Wired by Wave 27 into the alerts/insights
   * service factories — they call this with the actor + source info.
   *
   * Dedup: if there's already an open follow-up for the same source,
   * we return that existing one (no double-queue).
   *
   * No-op if `ownerUserId` is missing (no actor → no accountability).
   */
  async function createFollowUpFromEvent({
    eventKind, // 'alert.acknowledge' | 'insight.confirm' | 'kpi.annotation' | ...
    ownerUserId,
    ownerRole = null,
    branchId = null,
    sourceType, // 'alert' | 'insight' | 'kpi-annotation'
    sourceId,
    titleAr,
    titleEn,
    dueByHours = DEFAULT_FOLLOWUP_HOURS,
  }) {
    if (!ownerUserId) {
      return { ok: false, reason: 'OWNER_REQUIRED', auto: true };
    }
    if (!sourceType || !sourceId) {
      return { ok: false, reason: 'SOURCE_REQUIRED', auto: true };
    }
    if (!titleAr && !titleEn) {
      // Default title if caller didn't supply one
      titleAr = titleAr || `متابعة ${eventKind || sourceType}`;
      titleEn = titleEn || `Follow-up: ${eventKind || sourceType}`;
    }
    return createFollowUp({
      ownerUserId,
      ownerRole,
      branchId,
      sourceType,
      sourceId,
      titleAr,
      titleEn,
      dueByHours,
      actor: { userId: ownerUserId, role: ownerRole },
    });
  }

  async function listFollowUpsForUser({ ownerUserId, status = 'open' }) {
    if (!ownerUserId) return [];
    if (models?.FollowUp) {
      const filter = { ownerUserId };
      if (status) filter.status = status;
      return models.FollowUp.find(filter).sort({ dueBy: 1 }).lean();
    }
    return Array.from(stores.followUps.values())
      .filter(f => f.ownerUserId === ownerUserId && (!status || f.status === status))
      .sort((a, b) => new Date(a.dueBy) - new Date(b.dueBy));
  }

  async function completeFollowUp({ followUpId, actor = {} }) {
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };
    if (models?.FollowUp) {
      const f = await models.FollowUp.findById(followUpId);
      if (!f) return { ok: false, reason: 'NOT_FOUND' };
      if (f.status === 'done') return { ok: true, followUp: f, noop: true };
      f.status = 'done';
      f.doneAt = now();
      await f.save();
      return { ok: true, followUp: f };
    }
    const f = stores.followUps.get(followUpId);
    if (!f) return { ok: false, reason: 'NOT_FOUND' };
    if (f.status === 'done') return { ok: true, followUp: f, noop: true };
    f.status = 'done';
    f.doneAt = now();
    return { ok: true, followUp: f };
  }

  async function snoozeFollowUp({ followUpId, hours = 24, actor = {} }) {
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };
    if (typeof hours !== 'number' || hours < 1 || hours > 168) {
      return { ok: false, reason: 'INVALID_SNOOZE_DURATION' };
    }
    if (models?.FollowUp) {
      const f = await models.FollowUp.findById(followUpId);
      if (!f) return { ok: false, reason: 'NOT_FOUND' };
      f.dueBy = new Date(now().getTime() + hours * 60 * 60 * 1000);
      await f.save();
      return { ok: true, followUp: f };
    }
    const f = stores.followUps.get(followUpId);
    if (!f) return { ok: false, reason: 'NOT_FOUND' };
    f.dueBy = new Date(now().getTime() + hours * 60 * 60 * 1000);
    return { ok: true, followUp: f };
  }

  // ─── Watchlists ───────────────────────────────────────────────

  async function createWatchlist({
    ownerUserId,
    ownerRole = null,
    nameAr,
    nameEn,
    entityType,
    entityIds = [],
  }) {
    if (!ownerUserId) return { ok: false, reason: 'OWNER_REQUIRED' };
    if (!nameAr && !nameEn) return { ok: false, reason: 'NAME_REQUIRED' };
    if (!entityType) return { ok: false, reason: 'ENTITY_TYPE_REQUIRED' };
    const id = uid();
    const doc = {
      _id: id,
      ownerUserId,
      ownerRole,
      nameAr: nameAr || null,
      nameEn: nameEn || null,
      entityType,
      entityIds: Array.isArray(entityIds) ? [...new Set(entityIds.map(String))] : [],
      createdAt: now(),
      updatedAt: now(),
    };
    if (models?.Watchlist) {
      const saved = await models.Watchlist.create(doc);
      return { ok: true, watchlist: saved };
    }
    stores.watchlists.set(id, doc);
    return { ok: true, watchlist: doc };
  }

  async function listWatchlistsForUser({ ownerUserId }) {
    if (!ownerUserId) return [];
    if (models?.Watchlist) {
      return models.Watchlist.find({ ownerUserId }).sort({ updatedAt: -1 }).lean();
    }
    return Array.from(stores.watchlists.values())
      .filter(w => w.ownerUserId === ownerUserId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  async function addToWatchlist({ watchlistId, entityId, actor = {} }) {
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };
    if (!entityId) return { ok: false, reason: 'ENTITY_ID_REQUIRED' };
    if (models?.Watchlist) {
      const w = await models.Watchlist.findById(watchlistId);
      if (!w) return { ok: false, reason: 'NOT_FOUND' };
      if (!w.entityIds.includes(String(entityId))) {
        w.entityIds.push(String(entityId));
        w.updatedAt = now();
        await w.save();
      }
      return { ok: true, watchlist: w };
    }
    const w = stores.watchlists.get(watchlistId);
    if (!w) return { ok: false, reason: 'NOT_FOUND' };
    if (!w.entityIds.includes(String(entityId))) {
      w.entityIds.push(String(entityId));
      w.updatedAt = now();
    }
    return { ok: true, watchlist: w };
  }

  async function removeFromWatchlist({ watchlistId, entityId, actor = {} }) {
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };
    if (!entityId) return { ok: false, reason: 'ENTITY_ID_REQUIRED' };
    if (models?.Watchlist) {
      const w = await models.Watchlist.findById(watchlistId);
      if (!w) return { ok: false, reason: 'NOT_FOUND' };
      w.entityIds = w.entityIds.filter(id => id !== String(entityId));
      w.updatedAt = now();
      await w.save();
      return { ok: true, watchlist: w };
    }
    const w = stores.watchlists.get(watchlistId);
    if (!w) return { ok: false, reason: 'NOT_FOUND' };
    w.entityIds = w.entityIds.filter(id => id !== String(entityId));
    w.updatedAt = now();
    return { ok: true, watchlist: w };
  }

  // ─── UserPreferences (pinned widgets + saved views + presets) ─

  function getOrCreatePrefs(userId) {
    if (stores.userPrefs.has(userId)) return stores.userPrefs.get(userId);
    const doc = {
      userId,
      dashboardPresets: {},
      pinnedWidgets: [],
      savedViews: [],
      updatedAt: now(),
    };
    stores.userPrefs.set(userId, doc);
    return doc;
  }

  async function getUserPreferences({ userId }) {
    if (!userId) return { ok: false, reason: 'USER_ID_REQUIRED' };
    if (models?.UserPreferences) {
      let doc = await models.UserPreferences.findOne({ userId });
      if (!doc) {
        doc = await models.UserPreferences.create({
          userId,
          dashboardPresets: {},
          pinnedWidgets: [],
          savedViews: [],
        });
      }
      return { ok: true, preferences: doc };
    }
    return { ok: true, preferences: getOrCreatePrefs(userId) };
  }

  async function pinWidget({ userId, dashboardKey, elementId }) {
    if (!userId || !dashboardKey || !elementId) return { ok: false, reason: 'INVALID_PIN_REQUEST' };
    const prefs = getOrCreatePrefs(userId);
    if (prefs.pinnedWidgets.length >= MAX_PINNED_WIDGETS) {
      return { ok: false, reason: 'PIN_LIMIT_EXCEEDED' };
    }
    const dup = prefs.pinnedWidgets.find(
      p => p.dashboardKey === dashboardKey && p.elementId === elementId
    );
    if (dup) return { ok: true, preferences: prefs, noop: true };
    prefs.pinnedWidgets.push({
      dashboardKey,
      elementId,
      pinnedAt: now(),
      order: prefs.pinnedWidgets.length,
    });
    prefs.updatedAt = now();
    return { ok: true, preferences: prefs };
  }

  async function unpinWidget({ userId, dashboardKey, elementId }) {
    if (!userId || !dashboardKey || !elementId) return { ok: false, reason: 'INVALID_PIN_REQUEST' };
    const prefs = getOrCreatePrefs(userId);
    prefs.pinnedWidgets = prefs.pinnedWidgets.filter(
      p => !(p.dashboardKey === dashboardKey && p.elementId === elementId)
    );
    prefs.updatedAt = now();
    return { ok: true, preferences: prefs };
  }

  async function saveView({
    userId,
    dashboardKey,
    nameAr,
    nameEn,
    filters = {},
    shareWithRole = false,
  }) {
    if (!userId || !dashboardKey) return { ok: false, reason: 'INVALID_REQUEST' };
    if (!nameAr && !nameEn) return { ok: false, reason: 'NAME_REQUIRED' };
    const prefs = getOrCreatePrefs(userId);
    const viewId = uid();
    prefs.savedViews.push({
      viewId,
      dashboardKey,
      nameAr: nameAr || null,
      nameEn: nameEn || null,
      filters,
      shareWithRole: !!shareWithRole,
      createdAt: now(),
    });
    prefs.updatedAt = now();
    return { ok: true, preferences: prefs, viewId };
  }

  async function deleteSavedView({ userId, viewId }) {
    if (!userId || !viewId) return { ok: false, reason: 'INVALID_REQUEST' };
    const prefs = getOrCreatePrefs(userId);
    const before = prefs.savedViews.length;
    prefs.savedViews = prefs.savedViews.filter(v => v.viewId !== viewId);
    if (prefs.savedViews.length === before) return { ok: false, reason: 'NOT_FOUND' };
    prefs.updatedAt = now();
    return { ok: true, preferences: prefs };
  }

  async function upsertPreset({ userId, dashboardKey, preset = {} }) {
    if (!userId || !dashboardKey) return { ok: false, reason: 'INVALID_REQUEST' };
    const prefs = getOrCreatePrefs(userId);
    prefs.dashboardPresets[dashboardKey] = { ...preset, updatedAt: now() };
    prefs.updatedAt = now();
    return { ok: true, preferences: prefs };
  }

  return {
    // Annotations
    createAnnotation,
    listAnnotations,
    resolveAnnotation,
    // Handoff
    createHandoff,
    listHandoffsForUser,
    markHandoffRead,
    acknowledgeHandoff,
    // Follow-ups
    createFollowUp,
    createFollowUpFromEvent,
    listFollowUpsForUser,
    completeFollowUp,
    snoozeFollowUp,
    // Watchlists
    createWatchlist,
    listWatchlistsForUser,
    addToWatchlist,
    removeFromWatchlist,
    // Preferences
    getUserPreferences,
    pinWidget,
    unpinWidget,
    saveView,
    deleteSavedView,
    upsertPreset,
    // Constants
    MAX_PINNED_WIDGETS,
    DEFAULT_FOLLOWUP_HOURS,
    // Test seam
    _stores: stores,
  };
}

module.exports = { createProductivityFeaturesService };

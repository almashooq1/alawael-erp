/**
 * savedViewStore.service.js — persistence for dashboard saved
 * views ("bookmarks") — Phase 18 Commit 9.
 *
 * A saved view captures a dashboard id + filter set + an optional
 * title, owned either by one user (private) or by the whole role
 * (shared). Operators re-open them to jump directly into a known
 * slice, share deep-links via the view id, or pin them to the
 * dashboards hub.
 *
 * The store ships an in-memory Map backend by default. Its public
 * shape is designed so a Mongo-backed or Redis-backed variant
 * drops in later without changing callers.
 */

'use strict';

const crypto = require('crypto');

const DEFAULT_MAX_VIEWS = 5000;

function newId() {
  return `sv_${crypto.randomBytes(10).toString('hex')}`;
}

function sanitiseFilters(filters) {
  if (!filters || typeof filters !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(filters)) {
    if (typeof k !== 'string' || !k) continue;
    if (v == null) continue;
    out[k] = String(v);
  }
  return out;
}

function createInMemorySavedViewStore({
  maxViews = DEFAULT_MAX_VIEWS,
  clock = { now: () => Date.now() },
} = {}) {
  const store = new Map();

  function sweepLru() {
    while (store.size > maxViews) {
      const oldest = store.keys().next().value;
      store.delete(oldest);
    }
  }

  function create({ dashboardId, title, filters, ownerUserId = null, sharedWithRoles = [] } = {}) {
    if (typeof dashboardId !== 'string' || !dashboardId) {
      throw Object.assign(new Error('dashboardId is required'), { code: 'SAVED_VIEW_INVALID' });
    }
    if (typeof title !== 'string' || !title.trim()) {
      throw Object.assign(new Error('title is required'), { code: 'SAVED_VIEW_INVALID' });
    }
    const id = newId();
    const now = clock.now();
    const view = {
      id,
      dashboardId,
      title: title.trim().slice(0, 200),
      filters: sanitiseFilters(filters),
      ownerUserId: ownerUserId || null,
      sharedWithRoles: Array.isArray(sharedWithRoles)
        ? sharedWithRoles.filter(r => typeof r === 'string' && r)
        : [],
      createdAt: now,
      updatedAt: now,
    };
    store.set(id, view);
    sweepLru();
    return view;
  }

  function get(id) {
    return store.get(id) || null;
  }

  function update(id, { title, filters, sharedWithRoles } = {}) {
    const existing = store.get(id);
    if (!existing) return null;
    const next = { ...existing };
    if (typeof title === 'string' && title.trim()) next.title = title.trim().slice(0, 200);
    if (filters && typeof filters === 'object') next.filters = sanitiseFilters(filters);
    if (Array.isArray(sharedWithRoles)) {
      next.sharedWithRoles = sharedWithRoles.filter(r => typeof r === 'string' && r);
    }
    next.updatedAt = clock.now();
    store.set(id, next);
    return next;
  }

  function remove(id) {
    return store.delete(id);
  }

  function listVisibleTo({ userId = null, role = null, dashboardId = null } = {}) {
    const views = [];
    for (const view of store.values()) {
      if (dashboardId && view.dashboardId !== dashboardId) continue;
      const isOwner = userId && view.ownerUserId === userId;
      const isShared = role && view.sharedWithRoles.includes(role);
      const isPublic = view.ownerUserId === null && view.sharedWithRoles.length === 0;
      if (isOwner || isShared || isPublic) views.push(view);
    }
    views.sort((a, b) => b.updatedAt - a.updatedAt);
    return views;
  }

  function list() {
    return Array.from(store.values());
  }

  function clear() {
    store.clear();
  }

  function size() {
    return store.size;
  }

  return { create, get, update, remove, listVisibleTo, list, clear, size };
}

module.exports = {
  createInMemorySavedViewStore,
  newId,
  sanitiseFilters,
  DEFAULT_MAX_VIEWS,
};

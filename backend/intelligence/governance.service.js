'use strict';

/**
 * governance.service.js — Wave 26.
 *
 *   • hasPermission(canonicalRole, code) → bool
 *   • hasPermissions(canonicalRole, codes[]) → bool (all required)
 *   • getUserPermissions(canonicalRole) → [code]
 *   • filterWidgetsByPermissions(elements, canonicalRole) → permitted elements
 *   • maskForCompliance(payload, canonicalRole, fieldKindMap) → masked payload
 *   • redactForLLM(payload, fieldKindMap) → strips ALL sensitive kinds
 *   • getBannersForDataKinds(kinds[]) → banner configs
 *   • recordAccess({ kind, viewer, entityType, entityId, auditLogger }) → audit emit
 *   • getAuditTrail({ entityType, entityId, viewer, auditModel, ... }) → merged timeline
 *
 * Composes [[role-profiles-2026-05-17]] (Wave 23) + [[data-quality-2026-05-17]]
 * (Wave 22) + governance.registry. Mongo-free at the resolution
 * layer; getAuditTrail accepts injected models.
 */

const DefaultGovRegistry = require('./governance.registry');
const DefaultRoleRegistry = require('./role-profiles.registry');

function createGovernanceService({
  govRegistry = DefaultGovRegistry,
  roleRegistry = DefaultRoleRegistry,
  logger = console,
} = {}) {
  void logger;

  // ─── Permission resolution ─────────────────────────────────

  function resolveRoleGroup(canonicalRole) {
    return roleRegistry.resolveRoleGroup(canonicalRole);
  }

  function hasPermission(canonicalRole, code) {
    const holders = govRegistry.getHoldersOf(code);
    if (!holders) return false;
    if (holders === 'all') return true;
    if (holders === 'all-authenticated') return !!canonicalRole;
    let groupKey = resolveRoleGroup(canonicalRole);
    // Wave 31 — the authz layer + tests pass role-group keys directly
    // (e.g. 'branch_manager', 'executive_leadership'). When the input
    // isn't a canonical role but IS a known group key, use it directly.
    if (!groupKey && canonicalRole && roleRegistry.getProfile(canonicalRole)) {
      groupKey = canonicalRole;
    }
    if (!groupKey) return false;
    return holders.includes(groupKey);
  }

  function hasPermissions(canonicalRole, codes = []) {
    if (!Array.isArray(codes) || codes.length === 0) return true;
    return codes.every(c => hasPermission(canonicalRole, c));
  }

  function getUserPermissions(canonicalRole) {
    const groupKey = resolveRoleGroup(canonicalRole);
    const out = [];
    for (const code of govRegistry.listPermissionCodes()) {
      const holders = govRegistry.getHoldersOf(code);
      if (holders === 'all') {
        out.push(code);
      } else if (holders === 'all-authenticated' && canonicalRole) {
        out.push(code);
      } else if (Array.isArray(holders) && groupKey && holders.includes(groupKey)) {
        out.push(code);
      }
    }
    return out;
  }

  // ─── Widget gating ─────────────────────────────────────────

  /**
   * Filter Wave-24 layout elements to those the role can see.
   * An element with `requiredPermissions: []` (or undefined) is
   * always permitted. With `requiredPermissions: [code,...]`, the
   * role must hold ALL of them.
   */
  function filterWidgetsByPermissions(elements, canonicalRole) {
    if (!Array.isArray(elements)) return [];
    return elements.filter(el => {
      const req = el?.requiredPermissions;
      if (!Array.isArray(req) || req.length === 0) return true;
      return hasPermissions(canonicalRole, req);
    });
  }

  // ─── Compliance masking ────────────────────────────────────

  /**
   * Strip fields from a payload whose `fieldKindMap` kind is in the
   * role's restrictedData set. Uses [[role-profiles-2026-05-17]]
   * registry for the role's restricted-data array.
   */
  function maskForCompliance(payload, canonicalRole, fieldKindMap = {}) {
    if (!payload || typeof payload !== 'object') return payload;
    const groupKey = resolveRoleGroup(canonicalRole);
    if (!groupKey) return payload;
    const profile = roleRegistry.getProfile(groupKey);
    const restricted = new Set(profile?.restrictedData || []);
    if (restricted.size === 0) return payload;
    if (Array.isArray(payload)) {
      return payload.map(item => maskForCompliance(item, canonicalRole, fieldKindMap));
    }
    const out = { ...payload };
    for (const [field, kind] of Object.entries(fieldKindMap)) {
      if (restricted.has(kind) && Object.prototype.hasOwnProperty.call(out, field)) {
        delete out[field];
      }
    }
    return out;
  }

  /**
   * Strip EVERY field whose kind is in SENSITIVE_FIELD_KINDS,
   * regardless of role. Used before sending payloads to a 3rd-party
   * LLM (Anthropic / OpenAI). Hard rule: no PHI/financial/HR/PII
   * data ever leaves the platform to an LLM context.
   *
   * Returns a deep-ish clone with offending fields removed.
   */
  function redactForLLM(payload, fieldKindMap = {}) {
    if (payload === null || typeof payload !== 'object') return payload;
    if (Array.isArray(payload)) return payload.map(p => redactForLLM(p, fieldKindMap));
    const out = {};
    for (const [k, v] of Object.entries(payload)) {
      const kind = fieldKindMap[k];
      if (kind && govRegistry.SENSITIVE_FIELD_KINDS.includes(kind)) {
        // skip — DO NOT include
        continue;
      }
      // Recurse into nested objects (use SAME fieldKindMap; nested
      // modules can pass their own map by calling redactForLLM on
      // the sub-tree directly with their map).
      out[k] = v && typeof v === 'object' ? redactForLLM(v, fieldKindMap) : v;
    }
    return out;
  }

  // ─── Compliance banners ────────────────────────────────────

  function getBannersForDataKinds(dataKinds = []) {
    if (!Array.isArray(dataKinds)) return [];
    return dataKinds
      .map(k => {
        const b = govRegistry.getBannerFor(k);
        return b ? { dataKind: k, ...b } : null;
      })
      .filter(Boolean);
  }

  /**
   * Determine if the viewer should trigger a compliance audit-log
   * write (e.g. accessing a clinical record while not being the
   * patient). Returns the auditAction string or null.
   */
  function shouldRecordAccess({ dataKinds = [] }) {
    const actions = [];
    for (const k of dataKinds) {
      const b = govRegistry.getBannerFor(k);
      if (b?.requiresAuditLog && b.auditAction) actions.push(b.auditAction);
    }
    return actions;
  }

  /**
   * Emit a compliance access record. Caller passes an auditLogger
   * (same `{log(entry)}` shape used by alerts + insights).
   */
  async function recordAccess({
    dataKinds = [],
    viewer = {},
    entityType,
    entityId,
    auditLogger = null,
  }) {
    if (!auditLogger || typeof auditLogger.log !== 'function') return { logged: 0 };
    const actions = shouldRecordAccess({ dataKinds });
    // Wave 84 — write the compound `resource` key the canonical
    // AuditLog model expects (String scalar, not nested object).
    // Same encoding the getAuditTrail filter reads: `entityType#entityId`.
    // entityType + entityId are also kept on the entry so audit
    // loggers that emit to other sinks (events, metrics, files)
    // can still pick them up by name.
    const resourceKey = entityType && entityId ? `${entityType}#${String(entityId)}` : null;
    for (const action of actions) {
      try {
        await auditLogger.log({
          action,
          actorUserId: viewer.userId || null,
          actorRole: viewer.role || null,
          entityType: entityType || null,
          entityId: entityId || null,
          resource: resourceKey,
          ipAddress: viewer.ip || null,
          metadata: { dataKinds, accessAt: new Date() },
        });
      } catch (err) {
        logger.warn && logger.warn(`[governance] audit ${action} failed: ${err.message}`);
      }
    }
    return { logged: actions.length };
  }

  // ─── Audit-trail unified timeline ──────────────────────────

  /**
   * Build a unified audit-trail for an entity. Reads from:
   *   • AuditLog collection (action history)
   *   • The entity itself for state.transitions / comments / feedback
   *     (passed in via `entityDoc`)
   *
   * The viewer must hold `governance.audit-trail.read`. If they
   * don't, they see only their own actions on the entity.
   *
   * Returns { events: [...], scoped: boolean }.
   */
  async function getAuditTrail({
    entityType,
    entityId,
    viewer = {},
    auditModel = null,
    entityDoc = null,
    limit = 100,
  }) {
    if (!entityType || !entityId) {
      return { ok: false, reason: 'ENTITY_REQUIRED' };
    }

    const viewerCanReadAll = hasPermission(viewer.role, 'governance.audit-trail.read');
    const events = [];

    // 1. AuditLog entries
    //
    // Wave 84 — schema-aligned compound key (closes critical-review
    // blocker B1). The canonical AuditLog model
    // (backend/models/auditLog.model.js) stores `resource` as a
    // String scalar — earlier versions of this filter queried
    // `'resource.type'` against a nested-object schema that doesn't
    // exist, so every AuditTrail UI surface returned 200 OK with
    // an empty events list. The convention is now to encode entity
    // identity as a compound `entityType#entityId` string, which
    // matches the wave-84 auditLogger bridge contract.
    if (auditModel && typeof auditModel.find === 'function') {
      try {
        const resourceKey = `${entityType}#${String(entityId)}`;
        const filter = { resource: resourceKey };
        if (!viewerCanReadAll) {
          filter.userId = viewer.userId;
        }
        const rows = await auditModel.find(filter).sort({ timestamp: -1 }).limit(limit).lean();
        const items = Array.isArray(rows) ? rows : [];
        for (const r of items) {
          events.push({
            kind: 'audit-log',
            at: r.timestamp || r.createdAt,
            actorUserId: r.userId,
            actorRole: r.actorRole || null,
            action: r.action || r.eventType,
            ipAddress: r.ipAddress || null,
            metadata: r.metadata || {},
          });
        }
      } catch (err) {
        logger.warn && logger.warn(`[governance] audit read failed: ${err.message}`);
      }
    }

    // 2. Entity-attached events (state.transitions / comments / feedback)
    if (entityDoc && typeof entityDoc === 'object') {
      const transitions = entityDoc?.state?.transitions || [];
      for (const t of transitions) {
        if (!viewerCanReadAll && String(t.byUserId) !== String(viewer.userId)) continue;
        events.push({
          kind: 'state-transition',
          at: t.at,
          actorUserId: t.byUserId,
          actorRole: t.byRole,
          field: 'state.current',
          from: t.from,
          to: t.to,
          reason: t.reason,
          ipAddress: t.ip || null,
        });
      }

      const comments = entityDoc.comments || [];
      for (const c of comments) {
        if (!viewerCanReadAll && String(c.byUserId) !== String(viewer.userId)) continue;
        events.push({
          kind: 'comment',
          at: c.at,
          actorUserId: c.byUserId,
          actorRole: c.byRole,
          text: c.text,
        });
      }

      const fb = entityDoc.feedback || {};
      if (Array.isArray(fb.confirmedBy)) {
        for (const uid of fb.confirmedBy) {
          if (!viewerCanReadAll && String(uid) !== String(viewer.userId)) continue;
          events.push({ kind: 'feedback', subKind: 'confirmed', actorUserId: uid });
        }
      }
      if (Array.isArray(fb.dismissReasons)) {
        for (const d of fb.dismissReasons) {
          if (!viewerCanReadAll && String(d.userId) !== String(viewer.userId)) continue;
          events.push({
            kind: 'feedback',
            subKind: 'dismissed',
            at: d.at,
            actorUserId: d.userId,
            reasonCode: d.reasonCode,
            note: d.note,
          });
        }
      }
    }

    // DESC by at (missing `at` sinks to bottom)
    events.sort((a, b) => {
      const ta = a.at ? new Date(a.at).getTime() : 0;
      const tb = b.at ? new Date(b.at).getTime() : 0;
      return tb - ta;
    });

    return {
      ok: true,
      entityType,
      entityId,
      events: events.slice(0, limit),
      scoped: !viewerCanReadAll,
    };
  }

  return {
    // Permissions
    hasPermission,
    hasPermissions,
    getUserPermissions,
    filterWidgetsByPermissions,
    // Masking
    maskForCompliance,
    redactForLLM,
    // Banners + access logging
    getBannersForDataKinds,
    shouldRecordAccess,
    recordAccess,
    // Audit trail
    getAuditTrail,
    // Constants surfaced
    listPermissionCodes: () => govRegistry.listPermissionCodes(),
    listBannerKinds: () => govRegistry.listBannerKinds(),
  };
}

module.exports = { createGovernanceService };

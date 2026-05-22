'use strict';

/**
 * hikvision-branch-config.service.js — Wave 110.
 *
 * Per-branch override layer for Hikvision operational thresholds.
 *
 * Public API:
 *
 *   list({ skip, limit })                           → { ok, items, total }
 *   get(branchId)                                   → { ok, config | null }
 *   upsert({ branchId, patch, actorId, notes })     → { ok, config }
 *   reset(branchId, actorId)                        → { ok, config }
 *   resolveEffective(branchId)                      → { ok, effective, source }
 *
 * resolveEffective(branchId) is the hot path called from the parser
 * for every event. It:
 *   1. Cache lookup (in-memory TTL 30s) by branchId
 *   2. DB lookup if cache miss
 *   3. Merge with global defaults via reg.mergeBranchConfig
 *   4. Frozen result returned
 *
 * source ∈ {'defaults', 'branch-override'} so the caller can audit
 * which knob is in play.
 */

const reg = require('./hikvision.registry');
const { checkMfaTier } = require('./mfa-tier-check.lib');

function createHikvisionBranchConfigService({
  configModel = null,
  globalConfidenceThresholds = reg.DEFAULT_CONFIDENCE_THRESHOLDS,
  globalFraudDefaults = reg.FRAUD_DEFAULTS,
  cacheTtlMs = 30_000,
  logger = console,
  now = () => new Date(),
  // ─── Wave 275f — Service-layer MFA tier enforcement ────────────
  // Default OFF (Wave 110 tests construct without mfaLevel). app.js
  // opts IN with `enforceMfa: true`. 5th service-layer adopter via
  // shared lib [[wave275c-extract-face-enrollment]]. branch-config
  // is HTTP-only (no cron callers for upsert/reset — confirmed via
  // grep; cron-driven services call `list`/`get`/`resolveEffective`
  // which are read-only and don't need MFA).
  enforceMfa = false,
} = {}) {
  if (!configModel) {
    throw new Error('hikvision-branch-config: configModel is required');
  }

  // Wave 275f — local wrapper binding factory enforceMfa + now;
  // delegates to shared lib (extracted W275c).
  function _checkMfaTier(actor, requiredTier, maxAgeMin) {
    return checkMfaTier(actor, requiredTier, maxAgeMin, { enforceMfa, now });
  }

  // ─── Cache (per-branch TTL) ───────────────────────────────────
  // resolveEffective is called from the parser hot path. A 30s
  // in-memory cache cuts per-event DB lookups while keeping changes
  // observable within a minute.

  const cache = new Map(); // branchId → { effective, source, expiresAt }

  function _cacheGet(branchId) {
    const k = String(branchId);
    const slot = cache.get(k);
    if (!slot) return null;
    if (now().getTime() > slot.expiresAt) {
      cache.delete(k);
      return null;
    }
    return slot;
  }

  function _cacheSet(branchId, value) {
    cache.set(String(branchId), {
      ...value,
      expiresAt: now().getTime() + cacheTtlMs,
    });
  }

  function _cacheInvalidate(branchId) {
    if (branchId) cache.delete(String(branchId));
  }

  // ─── CRUD ────────────────────────────────────────────────────

  async function list({ skip = 0, limit = 50 } = {}) {
    const cappedLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const cappedSkip = Math.max(0, Number(skip) || 0);
    let q = configModel.find({}).sort({ updatedAt: -1 }).skip(cappedSkip).limit(cappedLimit);
    if (typeof q.lean === 'function') q = q.lean();
    const items = await q;
    const total =
      typeof configModel.countDocuments === 'function'
        ? await configModel.countDocuments({})
        : (items || []).length;
    return { ok: true, items: items || [], total };
  }

  async function get(branchId) {
    if (!branchId) {
      return { ok: false, reason: reg.REASON.BRANCH_CONFIG_NO_BRANCH };
    }
    let q = configModel.findOne({ branchId });
    if (typeof q.lean === 'function') q = q.lean();
    const config = await q;
    return { ok: true, config: config || null };
  }

  async function upsert({ branchId, patch, actorId = null, notes = undefined, actor = null } = {}) {
    // Wave 275f — service-layer MFA tier 2 (15 min). Single guard at
    // upsert; reset() chains through here so it's auto-protected. Runs
    // BEFORE branchId / patch validation (fail-fast on heaviest gate).
    const mfa = _checkMfaTier(actor, 2, 15);
    if (!mfa.ok) return mfa;
    if (!branchId) {
      return { ok: false, reason: reg.REASON.BRANCH_CONFIG_NO_BRANCH };
    }
    const v = reg.validateBranchConfigPatch(patch || {});
    if (!v.ok) return v;

    // Load existing (or build new)
    const q = configModel.findOne({ branchId });
    if (typeof q.then === 'function' && typeof q.lean !== 'function') {
      // bare promise — chainable mock that resolves to doc-or-null
    }
    const existing = await q;
    const isNew = !existing;

    // For an update, an explicit actorId is REQUIRED — we can't
    // silently inherit the previous editor or the revision audit
    // becomes meaningless. Surface a structured rejection rather
    // than a Mongoose ValidationError.
    if (!isNew && !actorId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { lastEditedBy: 'required for revisions > 1' },
      };
    }

    // Build the doc — patch replaces whole subtree per category.
    // (A "merge" upsert would silently leave stale keys; clearer for
    // operators to send the full intended state per category.)
    const docData = {
      branchId,
      confidenceThresholds:
        v.normalized.confidenceThresholds !== undefined
          ? v.normalized.confidenceThresholds
          : isNew
            ? {}
            : existing.confidenceThresholds || {},
      fraudDefaults:
        v.normalized.fraudDefaults !== undefined
          ? v.normalized.fraudDefaults
          : isNew
            ? {}
            : existing.fraudDefaults || {},
      notes: notes !== undefined ? notes : existing ? existing.notes : null,
      revision: isNew ? 1 : (existing.revision || 1) + 1,
      lastEditedBy: actorId,
      lastEditedAt: now(),
    };

    let saved;
    if (isNew) {
      const inst = new configModel(docData);
      try {
        await inst.validate();
      } catch (err) {
        return _validationFail(err);
      }
      try {
        await inst.save();
      } catch (err) {
        if (err && err.code === 11000) {
          // Race: another writer created the row between findOne and save.
          // Recurse once — the new path will see the existing row and update.
          return upsert({ branchId, patch, actorId, notes });
        }
        logger.error('[branch-config] save failed:', err.message);
        return { ok: false, reason: reg.REASON.SAVE_FAILED };
      }
      saved = inst.toObject ? inst.toObject() : inst;
    } else {
      Object.assign(existing, docData);
      try {
        await existing.validate();
      } catch (err) {
        return _validationFail(err);
      }
      try {
        await existing.save();
      } catch (err) {
        logger.error('[branch-config] save failed:', err.message);
        return { ok: false, reason: reg.REASON.SAVE_FAILED };
      }
      saved = existing.toObject ? existing.toObject() : existing;
    }

    _cacheInvalidate(branchId);
    return { ok: true, config: saved };
  }

  async function reset(branchId, actorId, opts = {}) {
    if (!branchId) {
      return { ok: false, reason: reg.REASON.BRANCH_CONFIG_NO_BRANCH };
    }
    // Reset == clear both override buckets, keep revision history.
    // Wave 275f — `opts.actor` flows through to upsert's MFA guard.
    return upsert({
      branchId,
      patch: { confidenceThresholds: {}, fraudDefaults: {} },
      actorId,
      notes: null,
      actor: opts.actor || null,
    });
  }

  // ─── Hot path: resolveEffective ──────────────────────────────

  async function resolveEffective(branchId) {
    if (!branchId) {
      // No branch context → defaults. Don't treat as error.
      return {
        ok: true,
        effective: reg.mergeBranchConfig(globalConfidenceThresholds, globalFraudDefaults, null),
        source: 'defaults',
      };
    }
    const cached = _cacheGet(branchId);
    if (cached) {
      return { ok: true, effective: cached.effective, source: cached.source };
    }

    let q = configModel.findOne({ branchId });
    if (typeof q.lean === 'function') q = q.lean();
    let row = null;
    try {
      row = await q;
    } catch (err) {
      logger.warn(`[branch-config] resolveEffective db error: ${err.message}`);
      // Fail-open: parser shouldn't lose events because the override
      // store is briefly unavailable. Return defaults.
      return {
        ok: true,
        effective: reg.mergeBranchConfig(globalConfidenceThresholds, globalFraudDefaults, null),
        source: 'defaults',
      };
    }

    const effective = reg.mergeBranchConfig(globalConfidenceThresholds, globalFraudDefaults, row);
    const source = row ? 'branch-override' : 'defaults';
    _cacheSet(branchId, { effective, source });
    return { ok: true, effective, source };
  }

  function _validationFail(err) {
    const errors = {};
    if (err && err.errors) {
      for (const [k, v] of Object.entries(err.errors)) {
        errors[k] = (v && v.message) || String(v);
      }
    }
    return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
  }

  // ─── Introspection (for tests + UI) ───────────────────────────

  function getDefaults() {
    return {
      confidenceThresholds: { ...globalConfidenceThresholds },
      fraudDefaults: { ...globalFraudDefaults },
      overridableConfidenceKeys: reg.BRANCH_CONFIG_OVERRIDABLE_CONFIDENCE_KEYS,
      overridableFraudKeys: reg.BRANCH_CONFIG_OVERRIDABLE_FRAUD_KEYS,
      bounds: reg.BRANCH_CONFIG_BOUNDS,
    };
  }

  function _clearCache() {
    cache.clear();
  }

  return {
    list,
    get,
    upsert,
    reset,
    resolveEffective,
    getDefaults,
    _clearCache, // exposed for tests only
  };
}

module.exports = { createHikvisionBranchConfigService };

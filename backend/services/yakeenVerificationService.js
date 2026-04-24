/**
 * yakeenVerificationService — persists, caches, and links Yakeen identity
 * verifications. Sits between `absherAdapter` (the raw HTTP layer) and the
 * callers that need proof they checked a national ID against the civil
 * registry (guardian admission, employee onboarding, consent signing).
 *
 * Cache: a `match` result for the same (nationalIdHash, name, dob) inside
 * `cacheWindowMs` (default 24h) is reused without hitting the adapter.
 * Non-match results are NEVER cached — the state of "this person doesn't
 * exist" might legitimately change if the original query had a typo.
 */

'use strict';

const crypto = require('crypto');
const DefaultModel = require('../models/YakeenVerification.model');
const defaultAdapter = require('./absherAdapter');

const DEFAULT_CACHE_WINDOW_MS = 24 * 60 * 60 * 1000;
const SALT = process.env.JWT_SECRET || 'pdpl-yakeen-salt';

function _hashNid(nid) {
  return crypto.createHash('sha256').update(`${nid}:${SALT}`).digest('hex');
}

function _hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(`${ip}:${SALT}`).digest('hex').slice(0, 32);
}

function createService({
  model = DefaultModel,
  adapter = defaultAdapter,
  cacheWindowMs = DEFAULT_CACHE_WINDOW_MS,
} = {}) {
  async function verify({
    nationalId,
    firstName_ar = null,
    dateOfBirthHijri = null,
    context = 'adhoc',
    contextEntityType = null,
    contextEntityId = null,
    requestedBy = null,
    ip = null,
    userAgent = null,
    forceRefresh = false,
  }) {
    if (!adapter.validateNationalId(nationalId)) {
      throw Object.assign(new Error('رقم الهوية الوطنية غير صالح'), { code: 'INVALID_ID' });
    }
    const nationalIdHash = _hashNid(nationalId);
    const lastFour = String(nationalId).slice(-4);

    // Cache hit? Only for `match` — ambiguous answers should be re-asked.
    if (!forceRefresh) {
      const since = new Date(Date.now() - cacheWindowMs);
      const cached = await model
        .findOne({
          nationalIdHash,
          result: 'match',
          createdAt: { $gte: since },
          nameChecked: !!firstName_ar,
          dobChecked: !!dateOfBirthHijri,
        })
        .sort({ createdAt: -1 });
      if (cached) {
        return {
          cached: true,
          verificationId: String(cached._id),
          result: cached.result,
          attributes: cached.attributes,
          mode: cached.mode,
          age: Date.now() - cached.createdAt.getTime(),
        };
      }
    }

    const adapterResult = await adapter.verify({ nationalId, firstName_ar, dateOfBirthHijri });

    const doc = await model.create({
      nationalIdHash,
      lastFour,
      nameChecked: !!firstName_ar,
      dobChecked: !!dateOfBirthHijri,
      context,
      contextEntityType,
      contextEntityId: contextEntityId ? String(contextEntityId) : null,
      result: adapterResult.status,
      message: adapterResult.message || null,
      attributes: adapterResult.attributes || {},
      mode: adapterResult.mode || 'mock',
      latencyMs: adapterResult.latencyMs || null,
      circuitOpen: adapterResult.circuitOpen === true,
      requestedBy,
      ipHash: _hashIp(ip),
      userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
    });

    return {
      cached: false,
      verificationId: String(doc._id),
      result: doc.result,
      attributes: doc.attributes,
      mode: doc.mode,
      message: doc.message,
      circuitOpen: doc.circuitOpen,
    };
  }

  async function getHistory({ nationalId, context = null, limit = 20 } = {}) {
    const q = {};
    if (nationalId) q.nationalIdHash = _hashNid(nationalId);
    if (context) q.context = context;
    return model.find(q).sort({ createdAt: -1 }).limit(Math.min(200, limit)).lean();
  }

  async function getByContextEntity({ contextEntityType, contextEntityId }) {
    return model
      .findOne({ contextEntityType, contextEntityId: String(contextEntityId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  return { verify, getHistory, getByContextEntity };
}

module.exports = { createService };
module.exports.defaultService = createService();

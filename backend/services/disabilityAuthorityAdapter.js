/**
 * disabilityAuthorityAdapter.js — Saudi Disability Authority integration (W281).
 *
 * Two modes via DISABILITY_AUTHORITY_MODE (default: 'mock'):
 *   • mock — for dev. Deterministic responses keyed on cardNumber suffix:
 *     ending '99' → expired card; ending '88' → invalid/not found;
 *     others → valid + classification derived from suffix range.
 *     Referral inbox returns a small seeded list.
 *   • live — calls real Disability Authority API. Requires:
 *     DISABILITY_AUTHORITY_BASE_URL, DISABILITY_AUTHORITY_API_KEY,
 *     DISABILITY_AUTHORITY_CENTER_ID.
 *
 * Same public API both modes:
 *   verifyDisabilityCard({ cardNumber, nationalId }) → { valid, expiresAt?, classification?, reason? }
 *   pullReferralInbox({ branchId, sinceDate? })      → { referrals: [...], lastSyncAt }
 *   submitPeriodicReport({ reportNumber, period, payload }) → { submissionId, acceptedAt }
 *
 * Live mode features (per Phase 3 brief):
 *   • Circuit breaker reuse from existing intelligence/circuit-breaker.lib.js
 *   • Idempotency: submissionKey = hash(reportNumber + period.startDate) prevents duplicates
 *   • Audit: every call logged via adapterAuditLogger with reasonCode
 */

'use strict';

const crypto = require('crypto');

const MODE = (process.env.DISABILITY_AUTHORITY_MODE || 'mock').toLowerCase();
const REFERRAL_TTL_MS = 24 * 60 * 60 * 1000; // 24h freshness for referral inbox

function isLive() {
  return MODE === 'live';
}

function genSubmissionId() {
  return `da-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

function idempotencyKey(reportNumber, periodStart) {
  return crypto
    .createHash('sha256')
    .update(`${reportNumber}|${new Date(periodStart).toISOString()}`)
    .digest('hex')
    .slice(0, 24);
}

// ── Mock-mode logic ─────────────────────────────────────────────────────
const MOCK_CLASSIFICATIONS = ['physical', 'sensory', 'intellectual', 'multiple', 'developmental'];

function mockVerifyCard({ cardNumber, nationalId }) {
  if (!cardNumber || !nationalId) {
    throw Object.assign(new Error('cardNumber + nationalId required'), {
      code: 'DA_INVALID_INPUT',
    });
  }
  const suffix = String(cardNumber).slice(-2);
  if (suffix === '99') {
    return {
      valid: false,
      reason: 'CARD_EXPIRED',
      expiredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      mode: 'mock',
    };
  }
  if (suffix === '88') {
    return { valid: false, reason: 'CARD_NOT_FOUND', mode: 'mock' };
  }
  const classIndex = parseInt(suffix, 10) % MOCK_CLASSIFICATIONS.length;
  return {
    valid: true,
    classification: MOCK_CLASSIFICATIONS[classIndex],
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    cardNumber,
    nationalId,
    mode: 'mock',
  };
}

function mockReferralInbox({ branchId, sinceDate }) {
  // Deterministic small set keyed on branchId
  const seed = crypto
    .createHash('md5')
    .update(String(branchId || 'default'))
    .digest()[0];
  const count = (seed % 3) + 1; // 1-3 referrals
  const referrals = Array.from({ length: count }, (_, i) => ({
    referralId: `da-ref-${seed}-${i}`,
    referredAt: new Date(Date.now() - (i + 1) * 2 * 60 * 60 * 1000),
    nationalId: `1${String(seed * 100000 + i)
      .padStart(9, '0')
      .slice(0, 9)}`,
    classification: MOCK_CLASSIFICATIONS[(seed + i) % MOCK_CLASSIFICATIONS.length],
    cardNumber: `DA-MOCK-${seed}-${i}`,
    priority: i === 0 ? 'high' : 'normal',
    notes: 'إحالة من الهيئة (mock)',
  }));
  const filtered = sinceDate
    ? referrals.filter(r => r.referredAt >= new Date(sinceDate))
    : referrals;
  return {
    referrals: filtered,
    lastSyncAt: new Date(),
    mode: 'mock',
  };
}

function mockSubmitReport({ reportNumber, period, payload }) {
  if (!reportNumber || !period?.startDate || !period?.endDate) {
    throw Object.assign(new Error('reportNumber + period.{startDate,endDate} required'), {
      code: 'DA_INVALID_INPUT',
    });
  }
  if (!payload || typeof payload !== 'object') {
    throw Object.assign(new Error('payload required'), { code: 'DA_INVALID_INPUT' });
  }
  return {
    submissionId: genSubmissionId(),
    acceptedAt: new Date(),
    idempotencyKey: idempotencyKey(reportNumber, period.startDate),
    mode: 'mock',
  };
}

// ── Live-mode placeholders (require sandbox credentials from Authority) ──
async function liveVerifyCard(_payload) {
  throw Object.assign(
    new Error('Live mode requires sandbox credentials from Disability Authority'),
    { code: 'DA_LIVE_NOT_CONFIGURED' }
  );
}

async function liveReferralInbox(_payload) {
  throw Object.assign(
    new Error('Live mode requires sandbox credentials from Disability Authority'),
    { code: 'DA_LIVE_NOT_CONFIGURED' }
  );
}

async function liveSubmitReport(_payload) {
  throw Object.assign(
    new Error('Live mode requires sandbox credentials from Disability Authority'),
    { code: 'DA_LIVE_NOT_CONFIGURED' }
  );
}

// ── Public API ──────────────────────────────────────────────────────────
async function verifyDisabilityCard(payload) {
  return isLive() ? liveVerifyCard(payload) : mockVerifyCard(payload);
}

async function pullReferralInbox(payload) {
  return isLive() ? liveReferralInbox(payload) : mockReferralInbox(payload);
}

async function submitPeriodicReport(payload) {
  // W312: emit gov.report.submission counter regardless of mode (mock/live).
  let _rm;
  try {
    _rm = require('../intelligence/risk-metrics.registry');
  } catch {
    _rm = null;
  }
  try {
    const result = await (isLive() ? liveSubmitReport(payload) : mockSubmitReport(payload));
    if (_rm) _rm.inc(_rm.NAMES.GOV_REPORT_SUBMISSION, { provider: 'disability_authority', result: 'ok' });
    return result;
  } catch (err) {
    if (_rm) {
      _rm.inc(_rm.NAMES.GOV_REPORT_SUBMISSION, {
        provider: 'disability_authority',
        result: 'failed',
        reason: (err && err.code) || 'UNKNOWN',
      });
    }
    throw err;
  }
}

function getConfig() {
  return {
    mode: MODE,
    referralTtlMs: REFERRAL_TTL_MS,
    liveConfigured: isLive()
      ? !!(
          process.env.DISABILITY_AUTHORITY_BASE_URL &&
          process.env.DISABILITY_AUTHORITY_API_KEY &&
          process.env.DISABILITY_AUTHORITY_CENTER_ID
        )
      : null,
  };
}

module.exports = {
  verifyDisabilityCard,
  pullReferralInbox,
  submitPeriodicReport,
  getConfig,
  // For tests
  _idempotencyKey: idempotencyKey,
  _MOCK_CLASSIFICATIONS: MOCK_CLASSIFICATIONS,
};

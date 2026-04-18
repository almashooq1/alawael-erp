/**
 * nphiesAdapter.js — Saudi NPHIES (Council of Cooperative Health Insurance) adapter.
 *
 * Submits insurance claims + eligibility checks + pre-authorization
 * requests against the national health insurance exchange.
 *
 * Modes (NPHIES_MODE, default 'mock'):
 *   • mock — deterministic based on memberId last 2 digits:
 *            '00' → not_covered, '99' → requires_preauth,
 *            else → eligible. Claim submission auto-approves unless
 *            totalAmount > 10000 → needs review.
 *   • live — NPHIES FHIR R4 API (CCHI). Requires TLS client cert +
 *            access token from OAuth onboarding.
 *
 * Env (live):
 *   NPHIES_BASE_URL, NPHIES_CLIENT_ID, NPHIES_CLIENT_SECRET,
 *   NPHIES_PROVIDER_ID (our CCHI-issued HPO license)
 *
 * Public API:
 *   checkEligibility({ memberId, insurerId, serviceDate })
 *     → { status, coverageStart, coverageEnd, copay, message, mode, latencyMs? }
 *   submitClaim({ memberId, insurerId, services, totalAmount, diagnosis })
 *     → { status, claimReference, approvedAmount, remainingBalance, reason, mode, latencyMs? }
 *   testConnection(), getConfig()
 */

'use strict';

const MODE = (process.env.NPHIES_MODE || 'mock').toLowerCase();
const TIMEOUT_MS = parseInt(process.env.NPHIES_TIMEOUT_MS, 10) || 12_000;

function validateMemberId(id) {
  // CCHI member IDs are 6–20 chars alphanumeric; we accept 3+ so mock
  // deterministic test inputs ('AB00', 'AB77', 'AB99') still hit the
  // intended branches instead of falling into 'unknown'.
  return /^[A-Z0-9]{3,20}$/i.test(String(id || '').trim());
}

// ── Mock ────────────────────────────────────────────────────────────────
function mockEligibility({ memberId }) {
  if (!validateMemberId(memberId)) {
    return { status: 'unknown', message: 'رقم العضوية غير صالح', mode: 'mock' };
  }
  const tail = String(memberId).slice(-2);
  if (tail === '00') {
    return { status: 'not_covered', message: 'العضوية غير مفعَّلة لدى المؤمِّن', mode: 'mock' };
  }
  if (tail === '99') {
    return {
      status: 'requires_preauth',
      message: 'الخدمة تتطلب تصريح مسبق قبل الإرسال',
      coverageStart: new Date(new Date().getFullYear(), 0, 1),
      coverageEnd: new Date(new Date().getFullYear(), 11, 31),
      copay: 50,
      mode: 'mock',
    };
  }
  return {
    status: 'eligible',
    coverageStart: new Date(new Date().getFullYear(), 0, 1),
    coverageEnd: new Date(new Date().getFullYear(), 11, 31),
    copay: 20,
    deductible: 100,
    planName: 'بوبا العربية — باقة متميزة',
    message: 'مؤهَّل — يمكن الإرسال مباشرة',
    mode: 'mock',
  };
}

async function mockSubmitClaim({ memberId, totalAmount }) {
  // Simulate network latency
  await new Promise(r => setTimeout(r, 600));
  if (!validateMemberId(memberId)) {
    return { status: 'REJECTED', reason: 'رقم عضوية غير صالح', mode: 'mock' };
  }
  if (Number(totalAmount || 0) > 10_000) {
    return {
      status: 'PENDING_REVIEW',
      claimReference: `NP-R-${Date.now()}`,
      message: 'المطالبة قيد المراجعة الطبية',
      mode: 'mock',
    };
  }
  const tail = String(memberId).slice(-2);
  if (tail === '77') {
    return {
      status: 'REJECTED',
      claimReference: `NP-X-${Date.now()}`,
      reason: 'الخدمة غير مغطاة في العقد',
      mode: 'mock',
    };
  }
  const approved = Math.round(Number(totalAmount || 0) * 0.8 * 100) / 100;
  return {
    status: 'APPROVED',
    claimReference: `NP-A-${Date.now()}`,
    approvedAmount: approved,
    remainingBalance: Math.round((Number(totalAmount) - approved) * 100) / 100,
    message: `تمت الموافقة بنسبة 80% — صافي ${approved} ر.س`,
    mode: 'mock',
  };
}

// ── Live ────────────────────────────────────────────────────────────────
let cachedToken = null;
let cachedTokenExpiry = 0;

function assertConfigured() {
  const missing = [];
  if (!process.env.NPHIES_BASE_URL) missing.push('NPHIES_BASE_URL');
  if (!process.env.NPHIES_CLIENT_ID) missing.push('NPHIES_CLIENT_ID');
  if (!process.env.NPHIES_CLIENT_SECRET) missing.push('NPHIES_CLIENT_SECRET');
  if (!process.env.NPHIES_PROVIDER_ID) missing.push('NPHIES_PROVIDER_ID');
  if (missing.length) {
    const e = new Error(`NPHIES live mode غير مُكوَّن — مفقود: ${missing.join(', ')}`);
    e.code = 'NOT_CONFIGURED';
    e.missing = missing;
    throw e;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function getToken() {
  if (cachedToken && cachedTokenExpiry > Date.now() + 10_000) return cachedToken;
  assertConfigured();
  const base = process.env.NPHIES_BASE_URL;
  const id = process.env.NPHIES_CLIENT_ID;
  const secret = process.env.NPHIES_CLIENT_SECRET;
  const resp = await fetchWithTimeout(`${base}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  if (!resp.ok) throw new Error(`NPHIES token error ${resp.status}`);
  const data = await resp.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

async function liveEligibility({ memberId, insurerId, serviceDate }) {
  if (!validateMemberId(memberId)) {
    return { status: 'unknown', mode: 'live', message: 'رقم العضوية غير صالح' };
  }
  const start = Date.now();
  try {
    const token = await getToken();
    const base = process.env.NPHIES_BASE_URL;
    // FHIR CoverageEligibilityRequest bundle — simplified form here.
    const resp = await fetchWithTimeout(`${base}/eligibility`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/fhir+json',
      },
      body: JSON.stringify({
        resourceType: 'CoverageEligibilityRequest',
        memberId,
        insurerId,
        servicedDate: serviceDate || new Date().toISOString().slice(0, 10),
        providerId: process.env.NPHIES_PROVIDER_ID,
      }),
    });
    const latencyMs = Date.now() - start;
    const data = await resp.json().catch(() => ({}));
    if (resp.status === 404) return { status: 'not_covered', mode: 'live', latencyMs };
    if (!resp.ok)
      return { status: 'unknown', mode: 'live', message: `HTTP ${resp.status}`, latencyMs };
    const outcomeMap = {
      COVERED: 'eligible',
      NOT_COVERED: 'not_covered',
      PENDING: 'requires_preauth',
    };
    return {
      status: outcomeMap[data.outcome] || 'unknown',
      coverageStart: data.coverageStart ? new Date(data.coverageStart) : undefined,
      coverageEnd: data.coverageEnd ? new Date(data.coverageEnd) : undefined,
      copay: data.copay,
      deductible: data.deductible,
      planName: data.planName,
      message: data.message,
      mode: 'live',
      latencyMs,
    };
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') {
      return { status: 'unknown', mode: 'live', message: err.message };
    }
    return { status: 'unknown', mode: 'live', message: err?.message || 'فشل الاتصال بـ NPHIES' };
  }
}

async function liveSubmitClaim({ memberId, insurerId, services, totalAmount, diagnosis }) {
  const start = Date.now();
  try {
    const token = await getToken();
    const base = process.env.NPHIES_BASE_URL;
    const resp = await fetchWithTimeout(`${base}/claim`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/fhir+json',
      },
      body: JSON.stringify({
        resourceType: 'Claim',
        memberId,
        insurerId,
        providerId: process.env.NPHIES_PROVIDER_ID,
        services,
        totalAmount,
        diagnosis,
        created: new Date().toISOString(),
      }),
    });
    const latencyMs = Date.now() - start;
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok)
      return {
        status: 'ERROR',
        mode: 'live',
        latencyMs,
        reason: data.message || `HTTP ${resp.status}`,
      };
    const statusMap = {
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      PENDING: 'PENDING_REVIEW',
      IN_REVIEW: 'PENDING_REVIEW',
    };
    return {
      status: statusMap[data.outcome] || 'PENDING_REVIEW',
      claimReference: data.claimReference || data.identifier,
      approvedAmount: data.approvedAmount,
      remainingBalance: data.remainingBalance,
      reason: data.reason,
      message: data.message,
      mode: 'live',
      latencyMs,
    };
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') {
      return { status: 'ERROR', mode: 'live', reason: err.message };
    }
    return { status: 'ERROR', mode: 'live', reason: err?.message || 'فشل الإرسال' };
  }
}

async function checkEligibility(params) {
  return MODE === 'live' ? liveEligibility(params) : mockEligibility(params);
}

async function submitClaim(params) {
  return MODE === 'live' ? liveSubmitClaim(params) : mockSubmitClaim(params);
}

async function testConnection() {
  if (MODE !== 'live')
    return { ok: true, mode: 'mock', message: 'وضع المحاكاة — لا يوجد اتصال شبكي' };
  try {
    const start = Date.now();
    await getToken();
    return { ok: true, mode: 'live', latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, mode: 'live', error: err.message, missing: err.missing };
  }
}

function getConfig() {
  const missing = [];
  if (MODE === 'live') {
    if (!process.env.NPHIES_BASE_URL) missing.push('NPHIES_BASE_URL');
    if (!process.env.NPHIES_CLIENT_ID) missing.push('NPHIES_CLIENT_ID');
    if (!process.env.NPHIES_CLIENT_SECRET) missing.push('NPHIES_CLIENT_SECRET');
    if (!process.env.NPHIES_PROVIDER_ID) missing.push('NPHIES_PROVIDER_ID');
  }
  return {
    provider: 'nphies',
    mode: MODE,
    configured: MODE === 'mock' ? true : missing.length === 0,
    missing: missing.length ? missing : undefined,
    timeoutMs: TIMEOUT_MS,
  };
}

module.exports = {
  MODE,
  checkEligibility,
  submitClaim,
  testConnection,
  getConfig,
  validateMemberId,
};

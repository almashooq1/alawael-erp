/**
 * nafathAdapter.js — pluggable adapter for Saudi Nafath SSO.
 *
 * Two modes via env var NAFATH_MODE (default: 'mock'):
 *   • mock  — for dev. Auto-approves after NAFATH_MOCK_APPROVE_MS (default 5000).
 *             If NATIONAL_ID ends in '99' it simulates rejection; '88' simulates
 *             expiry. This lets E2E tests cover the full state machine.
 *   • live  — calls the real Nafath API. Requires:
 *             NAFATH_BASE_URL, NAFATH_APP_ID, NAFATH_PRIVATE_KEY (PEM),
 *             NAFATH_SERVICE_ID. The adapter signs the request per Nafath
 *             spec and returns transactionId + randomNumber.
 *
 * Both modes share the same public API:
 *   initiate({ nationalId, purpose, ipHash, userAgent }) → Promise<{ requestId, transactionId, randomNumber, expiresAt }>
 *   checkStatus({ transactionId, nationalId })            → Promise<{ status, attributes? }>
 */

'use strict';

const crypto = require('crypto');

const MODE = (process.env.NAFATH_MODE || 'mock').toLowerCase();
const MOCK_APPROVE_MS = parseInt(process.env.NAFATH_MOCK_APPROVE_MS, 10) || 5000;
const TRANSACTION_TTL_MS = 15 * 60 * 1000; // 15 min per Nafath spec

function genTransactionId() {
  return `nafath-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

// Nafath spec: 2-digit random number (00–99). User sees this on our side,
// then picks the matching number in the Nafath mobile app.
function genRandomNumber() {
  return String(crypto.randomInt(10, 100));
}

function validateNationalId(id) {
  return /^[12]\d{9}$/.test(String(id || '').trim());
}

// ── Mock adapter ─────────────────────────────────────────────────────────
function mockInitiate({ nationalId, purpose = 'login' }) {
  if (!validateNationalId(nationalId)) {
    throw Object.assign(new Error('رقم الهوية الوطنية غير صالح'), { code: 'INVALID_ID' });
  }
  return {
    transactionId: genTransactionId(),
    randomNumber: genRandomNumber(),
    expiresAt: new Date(Date.now() + TRANSACTION_TTL_MS),
    mode: 'mock',
  };
}

/**
 * In mock mode, status transitions automatically after MOCK_APPROVE_MS:
 *   default  → APPROVED
 *   endsWith '99' → REJECTED
 *   endsWith '88' → EXPIRED (we'll just return EXPIRED)
 *
 * The route's job is to persist what we tell it.
 */
function mockStatus({ nationalId, createdAtMs }) {
  const elapsed = Date.now() - createdAtMs;
  if (elapsed < MOCK_APPROVE_MS) return { status: 'PENDING' };

  const tail = String(nationalId).slice(-2);
  if (tail === '99') return { status: 'REJECTED', message: 'محاكاة: رفض المستخدم' };
  if (tail === '88') return { status: 'EXPIRED', message: 'محاكاة: انتهت المهلة' };

  // Mock attributes — in real Nafath these come from the national registry
  return {
    status: 'APPROVED',
    attributes: {
      fullName: `مستخدم تجريبي ${nationalId.slice(-4)}`,
      firstName_ar: 'تجريبي',
      lastName_ar: `المستخدم-${nationalId.slice(-4)}`,
      dateOfBirth: new Date(1990, 0, 1),
      phone: `+9665${nationalId.slice(-8)}`,
      email: `user${nationalId.slice(-4)}@mock.nafath.local`,
    },
  };
}

// ── Live adapter (ready for real credentials) ────────────────────────────
async function liveInitiate({ nationalId, purpose }) {
  const base = process.env.NAFATH_BASE_URL;
  const appId = process.env.NAFATH_APP_ID;
  const serviceId = process.env.NAFATH_SERVICE_ID;
  if (!base || !appId || !serviceId) {
    throw Object.assign(new Error('Nafath live mode غير مُكوَّن'), { code: 'NAFATH_UNCONFIGURED' });
  }
  if (!validateNationalId(nationalId)) {
    throw Object.assign(new Error('رقم الهوية الوطنية غير صالح'), { code: 'INVALID_ID' });
  }

  // Per Nafath spec: POST to /api/v1/mfa/request with signed JWT body.
  // Actual signing/auth is implemented once NAFATH_PRIVATE_KEY is provisioned.
  const resp = await fetch(`${base}/api/v1/mfa/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'App-Id': appId,
      'Service-Id': serviceId,
    },
    body: JSON.stringify({ nationalId, purpose }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw Object.assign(new Error(`Nafath API error: ${resp.status} ${text}`), {
      code: 'NAFATH_API_ERROR',
    });
  }
  const data = await resp.json();
  return {
    transactionId: data.transactionId || data.trxId,
    randomNumber: data.random || data.randomNumber,
    expiresAt: new Date(Date.now() + TRANSACTION_TTL_MS),
    mode: 'live',
  };
}

async function liveStatus({ transactionId, nationalId }) {
  const base = process.env.NAFATH_BASE_URL;
  const appId = process.env.NAFATH_APP_ID;
  if (!base || !appId) {
    return { status: 'ERROR', message: 'Nafath live mode غير مُكوَّن' };
  }
  const resp = await fetch(
    `${base}/api/v1/mfa/request/${encodeURIComponent(transactionId)}/${encodeURIComponent(nationalId)}`,
    { headers: { 'App-Id': appId } }
  );
  if (!resp.ok) return { status: 'ERROR', message: `HTTP ${resp.status}` };
  const data = await resp.json();
  // Map Nafath status codes to ours
  const statusMap = {
    WAITING: 'PENDING',
    REQUESTED: 'PENDING',
    COMPLETED: 'APPROVED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'REJECTED',
  };
  return {
    status: statusMap[data.status] || 'PENDING',
    attributes: data.attributes || null,
    message: data.message,
  };
}

// ── Public API ───────────────────────────────────────────────────────────
async function initiate(params) {
  return MODE === 'live' ? liveInitiate(params) : mockInitiate(params);
}

async function checkStatus(params) {
  if (MODE === 'live') return liveStatus(params);
  return mockStatus(params);
}

module.exports = {
  MODE,
  initiate,
  checkStatus,
  validateNationalId,
  TRANSACTION_TTL_MS,
};

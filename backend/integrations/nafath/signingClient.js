/**
 * Nafath Signing Client — the HTTP surface used by the signing service.
 *
 * Two modes, selected by NAFATH_MODE env (default 'mock'):
 *   • mock — no network calls. Returns deterministic transactionId +
 *            randomNumber; `pollStatus` transitions to APPROVED after
 *            NAFATH_MOCK_APPROVE_MS (default 5000). National IDs ending in
 *            '99' simulate REJECTED, '88' simulate EXPIRED. In mock mode
 *            the "signature" is an HS256 JWS signed with
 *            NAFATH_JWS_HS_SECRET (or a default dev secret) so the
 *            verifier path exercises the same code as live.
 *   • live — uses AclClient (inherits retry + circuit breaker + DLQ + PII
 *            redaction) to call the real Nafath endpoints for
 *            e-signature. Request body is a JWT signed with the merchant
 *            private key (NAFATH_PRIVATE_KEY_PEM); response contains a
 *            JWS that the jwsVerifier validates against Nafath's public
 *            key (NAFATH_PUBLIC_KEY_PEM).
 *
 * Public shape (identical in both modes):
 *   requestSignature({ documentHash, signerNationalId, purpose })
 *     → { transactionId, randomNumber, expiresAt, mode }
 *   pollStatus({ transactionId, signerNationalId, createdAtMs, documentHash })
 *     → { status, signatureJws?, signerAttributes?, message? }
 */

'use strict';

const crypto = require('crypto');
const { AclClient } = require('../_common/acl-client');
const { InMemoryIntegrationLog } = require('../_common/integration-log');
const { _signHs256 } = require('./jwsVerifier');

const MODE = (process.env.NAFATH_MODE || 'mock').toLowerCase();
const MOCK_APPROVE_MS = parseInt(process.env.NAFATH_MOCK_APPROVE_MS, 10) || 5000;
const REQUEST_TTL_MS = 15 * 60 * 1000;
const MOCK_SECRET =
  process.env.NAFATH_JWS_HS_SECRET || 'alawael-nafath-mock-secret-do-not-use-in-prod';

const integrationLog = new InMemoryIntegrationLog();
const client = new AclClient({
  name: 'nafath-signing',
  baseUrl: process.env.NAFATH_BASE_URL || 'https://nafath.sa/api',
  integrationLog,
  retries: 2,
  timeoutMs: 10_000,
});

function _genTransactionId() {
  return `nafath-sign-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

function _genRandomNumber() {
  return String(crypto.randomInt(10, 100));
}

function validateNationalId(id) {
  return /^[12]\d{9}$/.test(String(id || '').trim());
}

// ── Mock implementation ─────────────────────────────────────────────────
function _mockRequest({ documentHash, signerNationalId, purpose }) {
  if (!validateNationalId(signerNationalId)) {
    throw Object.assign(new Error('رقم الهوية الوطنية غير صالح'), { code: 'INVALID_ID' });
  }
  if (!documentHash || typeof documentHash !== 'string' || documentHash.length < 32) {
    throw Object.assign(new Error('هاش المستند مطلوب ويجب ألا يقل عن 32 حرفاً'), {
      code: 'INVALID_DOCUMENT_HASH',
    });
  }
  return {
    transactionId: _genTransactionId(),
    randomNumber: _genRandomNumber(),
    expiresAt: new Date(Date.now() + REQUEST_TTL_MS).toISOString(),
    mode: 'mock',
    purpose: purpose || 'sign',
  };
}

function _mockPoll({ signerNationalId, createdAtMs, documentHash, transactionId }) {
  const elapsed = Date.now() - (createdAtMs || 0);
  if (elapsed < MOCK_APPROVE_MS) return { status: 'PENDING', mode: 'mock' };

  const tail = String(signerNationalId).slice(-2);
  if (tail === '99') return { status: 'REJECTED', message: 'محاكاة: رفض المستخدم', mode: 'mock' };
  if (tail === '88') return { status: 'EXPIRED', message: 'محاكاة: انتهت المهلة', mode: 'mock' };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'nafath-mock.local',
    sub: signerNationalId,
    iat: now,
    exp: now + 365 * 24 * 60 * 60,
    transactionId,
    documentHash,
    fullName: `مستخدم تجريبي ${signerNationalId.slice(-4)}`,
    dateOfBirth: '1990-01-01',
    nationality: 'SAU',
    signedAt: new Date().toISOString(),
  };
  const jws = _signHs256(payload, MOCK_SECRET);
  return {
    status: 'APPROVED',
    signatureJws: jws,
    signatureAlgo: 'HS256',
    signerAttributes: {
      fullName: payload.fullName,
      dateOfBirth: new Date(payload.dateOfBirth),
      nationality: payload.nationality,
    },
    signedAt: payload.signedAt,
    mode: 'mock',
  };
}

// ── Live implementation ────────────────────────────────────────────────
async function _liveRequest({ documentHash, signerNationalId, purpose }) {
  if (!process.env.NAFATH_APP_ID || !process.env.NAFATH_SERVICE_ID) {
    throw Object.assign(new Error('Nafath live mode غير مُكوَّن'), { code: 'NAFATH_UNCONFIGURED' });
  }
  if (!validateNationalId(signerNationalId)) {
    throw Object.assign(new Error('رقم الهوية الوطنية غير صالح'), { code: 'INVALID_ID' });
  }

  const res = await client.request({
    method: 'POST',
    path: '/api/v1/mfa/request',
    headers: {
      'Content-Type': 'application/json',
      'App-Id': process.env.NAFATH_APP_ID,
      'Service-Id': process.env.NAFATH_SERVICE_ID,
    },
    body: {
      nationalId: signerNationalId,
      purpose: purpose || 'sign',
      documentHash,
    },
    idempotencyKey: `nafath-sign-${signerNationalId}-${documentHash.slice(0, 16)}`,
    meta: { operation: 'requestSignature' },
  });

  if (res.status < 200 || res.status >= 300) {
    throw Object.assign(new Error(`Nafath HTTP ${res.status}`), {
      code: 'NAFATH_API_ERROR',
      status: res.status,
    });
  }
  const data = JSON.parse(res.body || '{}');
  return {
    transactionId: data.transactionId || data.trxId,
    randomNumber: data.random || data.randomNumber,
    expiresAt: new Date(Date.now() + REQUEST_TTL_MS).toISOString(),
    mode: 'live',
    purpose: purpose || 'sign',
  };
}

async function _livePoll({ transactionId, signerNationalId }) {
  const res = await client.request({
    method: 'GET',
    path: `/api/v1/mfa/request/${encodeURIComponent(transactionId)}/${encodeURIComponent(signerNationalId)}`,
    headers: { 'App-Id': process.env.NAFATH_APP_ID || '' },
    meta: { operation: 'pollSignature' },
  });
  if (res.status < 200 || res.status >= 300) {
    return { status: 'ERROR', message: `HTTP ${res.status}`, mode: 'live' };
  }
  const data = JSON.parse(res.body || '{}');
  const statusMap = {
    WAITING: 'PENDING',
    REQUESTED: 'PENDING',
    COMPLETED: 'APPROVED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
  };
  return {
    status: statusMap[data.status] || 'PENDING',
    signatureJws: data.signatureJws || data.token || null,
    signatureAlgo: data.signatureAlgo || 'RS256',
    signerAttributes: data.attributes || null,
    signedAt: data.signedAt || null,
    message: data.message,
    mode: 'live',
  };
}

// ── Public API ──────────────────────────────────────────────────────────
async function requestSignature(params) {
  return MODE === 'live' ? _liveRequest(params) : _mockRequest(params);
}

async function pollStatus(params) {
  return MODE === 'live' ? _livePoll(params) : _mockPoll(params);
}

module.exports = {
  MODE,
  MOCK_SECRET, // exposed so the verifier in mock mode can use the same secret
  REQUEST_TTL_MS,
  requestSignature,
  pollStatus,
  validateNationalId,
  _internals: { client, integrationLog },
};

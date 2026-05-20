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
function mockInitiate({ nationalId, _purpose = 'login' }) {
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

// ── Live adapter (W205f: JWS-signed requests) ────────────────────────────

let _jwt = null;
function getJwt() {
  if (!_jwt) _jwt = require('jsonwebtoken');
  return _jwt;
}

function normalizePrivateKey(pem) {
  if (!pem) return null;
  return pem.replace(/\\n/g, '\n').trim();
}

function normalizePublicKey(pem) {
  if (!pem) return null;
  return pem.replace(/\\n/g, '\n').trim();
}

/**
 * Verify a JWS signature Nafath places on its response payload.
 * Returns the decoded claims on success; throws on failure.
 *
 * Inputs:
 *   - response.signedPayload — compact JWS string (Nafath returns this in
 *     `signedResponse` or `data.signed` depending on endpoint)
 *   - process.env.NAFATH_RESPONSE_PUBLIC_KEY — PEM, accepts \n-escaped.
 *
 * If NAFATH_RESPONSE_PUBLIC_KEY is not configured, returns null (caller
 * decides whether to treat that as an error). This keeps mock-mode tests
 * green without needing key material.
 */
function verifyNafathResponseJws(signedPayload) {
  if (!signedPayload || typeof signedPayload !== 'string') {
    throw Object.assign(new Error('signedPayload missing or not a string'), {
      code: 'NAFATH_BAD_RESPONSE',
    });
  }
  const publicKeyPem = normalizePublicKey(process.env.NAFATH_RESPONSE_PUBLIC_KEY);
  if (!publicKeyPem) {
    return null; // unconfigured — caller decides
  }
  try {
    const opts = { algorithms: ['RS256'] };
    if (process.env.NAFATH_APP_ID) opts.audience = process.env.NAFATH_APP_ID;
    return getJwt().verify(signedPayload, publicKeyPem, opts);
  } catch (err) {
    throw Object.assign(new Error(`Nafath response signature invalid: ${err.message}`), {
      code: 'NAFATH_BAD_SIGNATURE',
    });
  }
}

/**
 * Build a JWS-signed bearer token per Nafath spec — RS256, short TTL,
 * iss=appId, aud=serviceId. The body is a JSON object the server hashes
 * to bind the token to the request payload.
 *
 * Returns the compact JWS string. Throws if NAFATH_PRIVATE_KEY is unset
 * (callers that opt into live mode without the key get NAFATH_UNCONFIGURED).
 */
function signNafathJws(payload, { appId, serviceId, audience }) {
  const privateKeyPem = normalizePrivateKey(process.env.NAFATH_PRIVATE_KEY);
  if (!privateKeyPem) {
    throw Object.assign(new Error('NAFATH_PRIVATE_KEY غير مُكوَّن'), {
      code: 'NAFATH_UNCONFIGURED',
    });
  }
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: appId,
    aud: audience || `${process.env.NAFATH_BASE_URL || ''}/api/v1/mfa/request`,
    sub: serviceId,
    iat: now,
    exp: now + 60, // 60-second window
    jti: crypto.randomBytes(16).toString('hex'),
    body: payload,
  };
  const kid = process.env.NAFATH_KID || undefined;
  const options = {
    algorithm: 'RS256',
  };
  if (kid) options.keyid = kid;
  return getJwt().sign(claims, privateKeyPem, options);
}

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

  const body = { nationalId, purpose };
  const jws = signNafathJws(body, {
    appId,
    serviceId,
    audience: `${base}/api/v1/mfa/request`,
  });

  const resp = await fetch(`${base}/api/v1/mfa/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jws}`,
      'App-Id': appId,
      'Service-Id': serviceId,
    },
    body: JSON.stringify(body),
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
  const serviceId = process.env.NAFATH_SERVICE_ID;
  if (!base || !appId || !serviceId) {
    return { status: 'ERROR', message: 'Nafath live mode غير مُكوَّن' };
  }
  // Status endpoint also requires a fresh JWS bearer (per Nafath spec)
  let authHeader = {};
  try {
    const jws = signNafathJws(
      { transactionId, nationalId },
      {
        appId,
        serviceId,
        audience: `${base}/api/v1/mfa/request/${transactionId}/${nationalId}`,
      }
    );
    authHeader = { Authorization: `Bearer ${jws}` };
  } catch (err) {
    // No private key — fall back to header-only auth (some sandbox setups allow this)
    if (err.code !== 'NAFATH_UNCONFIGURED') throw err;
  }

  const resp = await fetch(
    `${base}/api/v1/mfa/request/${encodeURIComponent(transactionId)}/${encodeURIComponent(nationalId)}`,
    {
      headers: {
        ...authHeader,
        'App-Id': appId,
        'Service-Id': serviceId,
      },
    }
  );
  if (!resp.ok) return { status: 'ERROR', message: `HTTP ${resp.status}` };
  let data = await resp.json();

  // W205i: if the response carries a signed payload, verify it BEFORE
  // trusting any field. The signed payload supersedes the unsigned fields.
  const signedPayload = data.signedResponse || data.signed || data.signedToken;
  if (signedPayload) {
    try {
      const verified = verifyNafathResponseJws(signedPayload);
      if (verified) {
        // Verified payload wins. Some integrations nest under `data`/`body`.
        data = verified.body || verified.data || verified;
      }
    } catch (err) {
      // Treat signature failure as a hard ERROR — never fall back to the
      // unsigned fields if Nafath claimed to sign and the signature is bad.
      return { status: 'ERROR', message: err.message };
    }
  }

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
  signNafathJws,
  verifyNafathResponseJws,
  TRANSACTION_TTL_MS,
};

/**
 * baladyAdapter.js — Saudi Balady (Ministry of Municipal, Rural Affairs & Housing) adapter.
 *
 * Verifies municipal (commercial) license for branches:
 *   - Active / expired / suspended / not_found
 *   - License type (health care facility, education, etc.)
 *   - Issue + expiry dates, governorate, activity codes
 *
 * Critical for rehab centers since the Ministry requires all health-care
 * establishments to hold a valid Balady license + display it at the branch.
 *
 * Modes (BALADY_MODE, default 'mock'):
 *   • mock — license ending '0' → expired, '9' → suspended, '999' →
 *            not_found, else → active with deterministic expiry.
 *   • live — Balady open API via integration gateway.
 *
 * Env (live): BALADY_BASE_URL, BALADY_CLIENT_ID, BALADY_CLIENT_SECRET
 *
 * Public API:
 *   verify({ licenseNumber, cr? })  // cr = commercial registration
 *     → { status, licenseType, activityName, issueDate, expiryDate,
 *         governorate, city, remainingDays, message, mode, latencyMs? }
 *   testConnection(), getConfig()
 */

'use strict';

const MODE = (process.env.BALADY_MODE || 'mock').toLowerCase();
const TIMEOUT_MS = parseInt(process.env.BALADY_TIMEOUT_MS, 10) || 8000;

// Balady license numbers are 10–15 digits
function validateLicense(n) {
  return /^\d{8,15}$/.test(String(n || '').trim());
}

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function mockVerify({ licenseNumber }) {
  if (!validateLicense(licenseNumber)) {
    return { status: 'unknown', message: 'رقم ترخيص غير صالح', mode: 'mock' };
  }
  const s = String(licenseNumber);
  const now = new Date();
  if (s.endsWith('999')) {
    return {
      status: 'not_found',
      message: 'الترخيص غير موجود في سجلات البلدية',
      mode: 'mock',
    };
  }
  if (s.endsWith('9')) {
    return {
      status: 'suspended',
      licenseType: 'ترخيص منشأة صحية',
      activityName: 'مركز تأهيل',
      issueDate: new Date(2020, 0, 1),
      expiryDate: new Date(now.getFullYear() + 1, 0, 1),
      governorate: 'الرياض',
      city: 'الرياض',
      remainingDays: daysBetween(new Date(now.getFullYear() + 1, 0, 1), now),
      message: 'الترخيص موقوف — راجع البلدية',
      mode: 'mock',
    };
  }
  if (s.endsWith('0')) {
    const expired = new Date(now);
    expired.setDate(expired.getDate() - 60);
    return {
      status: 'expired',
      licenseType: 'ترخيص منشأة صحية',
      activityName: 'مركز تأهيل',
      issueDate: new Date(2019, 0, 1),
      expiryDate: expired,
      governorate: 'الرياض',
      city: 'الرياض',
      remainingDays: -60,
      message: 'الترخيص منتهٍ — يتطلب التجديد العاجل',
      mode: 'mock',
    };
  }
  // Active
  const seed = parseInt(s.slice(-3), 10) || 1;
  const daysAhead = 120 + (seed % 24) * 30;
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + daysAhead);
  const governorates = [
    { gov: 'الرياض', city: 'الرياض' },
    { gov: 'مكة المكرمة', city: 'جدة' },
    { gov: 'المنطقة الشرقية', city: 'الدمام' },
    { gov: 'عسير', city: 'أبها' },
  ];
  const loc = governorates[seed % governorates.length];
  return {
    status: 'active',
    licenseType: 'ترخيص منشأة صحية',
    activityName: 'مركز تأهيل ذوي الاحتياجات الخاصة',
    issueDate: new Date(now.getFullYear() - 2, 0, 1),
    expiryDate: expiry,
    governorate: loc.gov,
    city: loc.city,
    remainingDays: daysAhead,
    message: daysAhead < 90 ? 'الترخيص قاربت فترة تجديده' : 'ترخيص ساري المفعول',
    mode: 'mock',
  };
}

// ── Live ────────────────────────────────────────────────────────────────
let cachedToken = null;
let cachedTokenExpiry = 0;

function assertConfigured() {
  const missing = [];
  if (!process.env.BALADY_BASE_URL) missing.push('BALADY_BASE_URL');
  if (!process.env.BALADY_CLIENT_ID) missing.push('BALADY_CLIENT_ID');
  if (!process.env.BALADY_CLIENT_SECRET) missing.push('BALADY_CLIENT_SECRET');
  if (missing.length) {
    const e = new Error(`Balady live mode غير مُكوَّن — مفقود: ${missing.join(', ')}`);
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
  const base = process.env.BALADY_BASE_URL;
  const id = process.env.BALADY_CLIENT_ID;
  const secret = process.env.BALADY_CLIENT_SECRET;
  const resp = await fetchWithTimeout(`${base}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials&scope=balady',
  });
  if (!resp.ok) throw new Error(`Balady token error ${resp.status}`);
  const data = await resp.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

async function liveVerify({ licenseNumber }) {
  if (!validateLicense(licenseNumber)) {
    return { status: 'unknown', message: 'رقم ترخيص غير صالح', mode: 'live' };
  }
  const start = Date.now();
  try {
    const token = await getToken();
    const base = process.env.BALADY_BASE_URL;
    const resp = await fetchWithTimeout(
      `${base}/license/v1/status?licenseNumber=${encodeURIComponent(licenseNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const latencyMs = Date.now() - start;
    if (resp.status === 404) return { status: 'not_found', mode: 'live', latencyMs };
    if (!resp.ok)
      return { status: 'unknown', mode: 'live', message: `HTTP ${resp.status}`, latencyMs };
    const data = await resp.json();
    const map = { ACTIVE: 'active', EXPIRED: 'expired', SUSPENDED: 'suspended' };
    const expiry = data.expiryDate ? new Date(data.expiryDate) : undefined;
    return {
      status: map[data.status] || 'unknown',
      licenseType: data.licenseType,
      activityName: data.activityName,
      issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
      expiryDate: expiry,
      governorate: data.governorate,
      city: data.city,
      remainingDays: expiry ? daysBetween(expiry, new Date()) : undefined,
      message: data.message,
      mode: 'live',
      latencyMs,
    };
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') {
      return { status: 'unknown', mode: 'live', message: err.message };
    }
    return { status: 'unknown', mode: 'live', message: err?.message || 'فشل الاتصال بـ Balady' };
  }
}

async function verify(params) {
  return MODE === 'live' ? liveVerify(params) : mockVerify(params);
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
    if (!process.env.BALADY_BASE_URL) missing.push('BALADY_BASE_URL');
    if (!process.env.BALADY_CLIENT_ID) missing.push('BALADY_CLIENT_ID');
    if (!process.env.BALADY_CLIENT_SECRET) missing.push('BALADY_CLIENT_SECRET');
  }
  return {
    provider: 'balady',
    mode: MODE,
    configured: MODE === 'mock' ? true : missing.length === 0,
    missing: missing.length ? missing : undefined,
    timeoutMs: TIMEOUT_MS,
  };
}

module.exports = { MODE, verify, validateLicense, testConnection, getConfig };

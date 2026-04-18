/**
 * muqeemAdapter.js — Saudi Muqeem (Ministry of Interior) adapter.
 *
 * Verifies iqama (residence permit) status for non-Saudi employees:
 *   - Active / expired / cancelled / not_found
 *   - Sponsor info, profession, nationality, DoB
 *   - Remaining validity days (for renewal alerts)
 *
 * Modes (MUQEEM_MODE, default 'mock'):
 *   • mock — deterministic based on last 2 digits of iqama:
 *            '00' → not_found, '11' → cancelled,
 *            '22' → expired, else → active.
 *   • live — Muqeem/Absher business API (requires onboarding +
 *            client credentials + establishment agreement).
 *
 * Env (live):
 *   MUQEEM_BASE_URL, MUQEEM_CLIENT_ID, MUQEEM_CLIENT_SECRET,
 *   MUQEEM_ESTABLISHMENT_ID
 *
 * Public API:
 *   verify({ iqamaNumber })
 *     → { status, sponsor, profession, nationality, expiryDate,
 *         remainingDays, message, mode, latencyMs? }
 *   testConnection(), getConfig()
 */

'use strict';

const MODE = (process.env.MUQEEM_MODE || 'mock').toLowerCase();
const TIMEOUT_MS = parseInt(process.env.MUQEEM_TIMEOUT_MS, 10) || 8000;

// Iqama numbers are 10 digits, typically starting with 2
function validateIqama(n) {
  return /^\d{10}$/.test(String(n || '').trim());
}

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function mockVerify({ iqamaNumber }) {
  if (!validateIqama(iqamaNumber)) {
    return { status: 'unknown', message: 'رقم إقامة غير صالح', mode: 'mock' };
  }
  const tail = String(iqamaNumber).slice(-2);
  const now = new Date();
  if (tail === '00') {
    return { status: 'not_found', message: 'رقم الإقامة غير موجود', mode: 'mock' };
  }
  if (tail === '11') {
    return {
      status: 'cancelled',
      message: 'الإقامة مُلغاة',
      sponsor: 'صاحب عمل سابق',
      mode: 'mock',
    };
  }
  if (tail === '22') {
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() - 30);
    return {
      status: 'expired',
      message: 'الإقامة منتهية — يتطلب التجديد العاجل',
      sponsor: 'مراكز الأوائل للتأهيل',
      profession: 'أخصائي علاج وظيفي',
      nationality: 'الفلبين',
      expiryDate: expiry,
      remainingDays: -30,
      mode: 'mock',
    };
  }
  // Active — deterministic expiry 90–720 days out
  const daysAhead = 90 + (parseInt(iqamaNumber.slice(-3), 10) % 20) * 30;
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + daysAhead);
  const nationalities = ['الفلبين', 'الهند', 'مصر', 'باكستان', 'إندونيسيا', 'سوريا'];
  const professions = ['أخصائي علاج طبيعي', 'أخصائي نطق', 'ممرض', 'فني مختبر', 'محاسب'];
  return {
    status: 'active',
    sponsor: 'مراكز الأوائل للتأهيل',
    profession: professions[parseInt(iqamaNumber[3], 10) % professions.length],
    nationality: nationalities[parseInt(iqamaNumber[2], 10) % nationalities.length],
    expiryDate: expiry,
    remainingDays: daysAhead,
    message: daysAhead < 90 ? 'الإقامة قاربت على الانتهاء' : 'إقامة سارية',
    mode: 'mock',
  };
}

let cachedToken = null;
let cachedTokenExpiry = 0;

function assertConfigured() {
  const missing = [];
  if (!process.env.MUQEEM_BASE_URL) missing.push('MUQEEM_BASE_URL');
  if (!process.env.MUQEEM_CLIENT_ID) missing.push('MUQEEM_CLIENT_ID');
  if (!process.env.MUQEEM_CLIENT_SECRET) missing.push('MUQEEM_CLIENT_SECRET');
  if (!process.env.MUQEEM_ESTABLISHMENT_ID) missing.push('MUQEEM_ESTABLISHMENT_ID');
  if (missing.length) {
    const e = new Error(`Muqeem live mode غير مُكوَّن — مفقود: ${missing.join(', ')}`);
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
  const base = process.env.MUQEEM_BASE_URL;
  const id = process.env.MUQEEM_CLIENT_ID;
  const secret = process.env.MUQEEM_CLIENT_SECRET;
  const resp = await fetchWithTimeout(`${base}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials&scope=muqeem',
  });
  if (!resp.ok) throw new Error(`Muqeem token error ${resp.status}`);
  const data = await resp.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

async function liveVerify({ iqamaNumber }) {
  if (!validateIqama(iqamaNumber)) {
    return { status: 'unknown', message: 'رقم إقامة غير صالح', mode: 'live' };
  }
  const start = Date.now();
  try {
    const token = await getToken();
    const base = process.env.MUQEEM_BASE_URL;
    const estId = process.env.MUQEEM_ESTABLISHMENT_ID;
    const resp = await fetchWithTimeout(
      `${base}/v1/iqama/status?establishmentId=${encodeURIComponent(
        estId
      )}&iqamaNumber=${encodeURIComponent(iqamaNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const latencyMs = Date.now() - start;
    if (resp.status === 404) return { status: 'not_found', mode: 'live', latencyMs };
    if (!resp.ok)
      return { status: 'unknown', mode: 'live', message: `HTTP ${resp.status}`, latencyMs };
    const data = await resp.json();
    const map = {
      ACTIVE: 'active',
      VALID: 'active',
      EXPIRED: 'expired',
      CANCELLED: 'cancelled',
      TERMINATED: 'cancelled',
    };
    const expiry = data.expiryDate ? new Date(data.expiryDate) : undefined;
    return {
      status: map[data.status] || 'unknown',
      sponsor: data.sponsorName || data.establishmentName,
      profession: data.profession,
      nationality: data.nationality,
      expiryDate: expiry,
      remainingDays: expiry ? daysBetween(expiry, new Date()) : undefined,
      message: data.message,
      mode: 'live',
      latencyMs,
    };
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') {
      return { status: 'unknown', mode: 'live', message: err.message };
    }
    return { status: 'unknown', mode: 'live', message: err?.message || 'فشل الاتصال بـ Muqeem' };
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
    if (!process.env.MUQEEM_BASE_URL) missing.push('MUQEEM_BASE_URL');
    if (!process.env.MUQEEM_CLIENT_ID) missing.push('MUQEEM_CLIENT_ID');
    if (!process.env.MUQEEM_CLIENT_SECRET) missing.push('MUQEEM_CLIENT_SECRET');
    if (!process.env.MUQEEM_ESTABLISHMENT_ID) missing.push('MUQEEM_ESTABLISHMENT_ID');
  }
  return {
    provider: 'muqeem',
    mode: MODE,
    configured: MODE === 'mock' ? true : missing.length === 0,
    missing: missing.length ? missing : undefined,
    timeoutMs: TIMEOUT_MS,
  };
}

module.exports = { MODE, verify, validateIqama, testConnection, getConfig };

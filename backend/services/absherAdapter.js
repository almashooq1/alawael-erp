/**
 * absherAdapter.js — Saudi Absher / Yakeen adapter for citizen identity verification.
 *
 * Used for:
 *   - Validating guardian national ID + name against civil registry
 *   - Optional: date-of-birth, family hierarchy (father/mother)
 *
 * Modes (ABSHER_MODE, default 'mock'):
 *   • mock — deterministic based on last 2 digits:
 *            '77' → mismatch, '00' → not_found, else match with synthesized data.
 *   • live — calls real Yakeen verify API (Absher-backed).
 *
 * Env (live): ABSHER_BASE_URL, ABSHER_CLIENT_ID, ABSHER_CLIENT_SECRET
 *
 * Public API:
 *   verify({ nationalId, dateOfBirthHijri?, firstName_ar? })
 *     → { status: 'match'|'mismatch'|'not_found'|'unknown', attributes?, message, mode, latencyMs? }
 *   testConnection(), getConfig()
 */

'use strict';

const MODE = (process.env.ABSHER_MODE || 'mock').toLowerCase();
const TIMEOUT_MS = parseInt(process.env.ABSHER_TIMEOUT_MS, 10) || 8000;

function validateNationalId(id) {
  return /^[12]\d{9}$/.test(String(id || '').trim());
}

function mockVerify({ nationalId, firstName_ar }) {
  if (!validateNationalId(nationalId)) {
    return { status: 'unknown', message: 'رقم هوية غير صالح', mode: 'mock' };
  }
  const tail = String(nationalId).slice(-2);
  if (tail === '00') return { status: 'not_found', message: 'غير موجود في الأحوال', mode: 'mock' };
  if (tail === '77' && firstName_ar) {
    return {
      status: 'mismatch',
      message: 'الاسم لا يطابق السجل المدني',
      mode: 'mock',
    };
  }
  return {
    status: 'match',
    attributes: {
      fullName_ar: `مستخدم تجريبي ${nationalId.slice(-4)}`,
      firstName_ar: 'تجريبي',
      lastName_ar: `المستخدم-${nationalId.slice(-4)}`,
      gender: parseInt(nationalId[0], 10) === 1 ? 'M' : 'F',
      dateOfBirthHijri: '1410/01/01',
      dateOfBirthGregorian: new Date('1990-01-01'),
      nationality: 'SAU',
      isAlive: true,
    },
    mode: 'mock',
  };
}

let cachedToken = null;
let cachedTokenExpiry = 0;

function assertConfigured() {
  const missing = [];
  if (!process.env.ABSHER_BASE_URL) missing.push('ABSHER_BASE_URL');
  if (!process.env.ABSHER_CLIENT_ID) missing.push('ABSHER_CLIENT_ID');
  if (!process.env.ABSHER_CLIENT_SECRET) missing.push('ABSHER_CLIENT_SECRET');
  if (missing.length) {
    const e = new Error(`Absher live mode غير مُكوَّن — مفقود: ${missing.join(', ')}`);
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
  const base = process.env.ABSHER_BASE_URL;
  const id = process.env.ABSHER_CLIENT_ID;
  const secret = process.env.ABSHER_CLIENT_SECRET;
  const resp = await fetchWithTimeout(`${base}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials&scope=yakeen',
  });
  if (!resp.ok) throw new Error(`Absher token error ${resp.status}`);
  const data = await resp.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

async function liveVerify({ nationalId, dateOfBirthHijri, firstName_ar }) {
  if (!validateNationalId(nationalId)) {
    return { status: 'unknown', message: 'رقم هوية غير صالح', mode: 'live' };
  }
  const start = Date.now();
  try {
    const token = await getToken();
    const base = process.env.ABSHER_BASE_URL;
    const params = new URLSearchParams({ nationalId });
    if (dateOfBirthHijri) params.set('dobHijri', dateOfBirthHijri);
    const resp = await fetchWithTimeout(`${base}/yakeen/v1/citizen/verify?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const latencyMs = Date.now() - start;
    if (resp.status === 404) return { status: 'not_found', mode: 'live', latencyMs };
    if (!resp.ok)
      return { status: 'unknown', mode: 'live', message: `HTTP ${resp.status}`, latencyMs };
    const data = await resp.json();
    const nameMatch =
      !firstName_ar || String(data.firstName_ar || '').trim() === String(firstName_ar).trim();
    return {
      status: nameMatch ? 'match' : 'mismatch',
      attributes: data,
      mode: 'live',
      latencyMs,
    };
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') {
      return { status: 'unknown', mode: 'live', message: err.message };
    }
    return { status: 'unknown', mode: 'live', message: err?.message || 'فشل الاتصال بـ Absher' };
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
    if (!process.env.ABSHER_BASE_URL) missing.push('ABSHER_BASE_URL');
    if (!process.env.ABSHER_CLIENT_ID) missing.push('ABSHER_CLIENT_ID');
    if (!process.env.ABSHER_CLIENT_SECRET) missing.push('ABSHER_CLIENT_SECRET');
  }
  return {
    provider: 'absher',
    mode: MODE,
    configured: MODE === 'mock' ? true : missing.length === 0,
    missing: missing.length ? missing : undefined,
    timeoutMs: TIMEOUT_MS,
  };
}

module.exports = { MODE, verify, validateNationalId, testConnection, getConfig };

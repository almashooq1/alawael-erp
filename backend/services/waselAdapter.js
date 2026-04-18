/**
 * waselAdapter.js — Saudi Post (SPL / Wasel) National Address adapter.
 *
 * The Saudi National Address is a mandatory structured address (short
 * code + 4-4 additional number + building + district + city + postal).
 * Wasel validates that an address exists and is registered under a
 * given national ID, plus enriches it with geo + deliverability.
 *
 * Modes (WASEL_MODE, default 'mock'):
 *   • mock — deterministic:
 *            short codes ending '00' → not_found,
 *            '99' → invalid_format,
 *            else → match with synthesized Riyadh-based address.
 *   • live — Wasel REST API (OAuth2 client-credentials).
 *
 * Env (live): WASEL_BASE_URL, WASEL_API_KEY (or OAuth creds)
 *
 * Public API:
 *   verifyShortCode({ shortCode, nationalId? })
 *     → { status, address, city, district, postalCode, buildingNumber,
 *         additionalNumber, geo, isDeliverable, message, mode, latencyMs? }
 *   searchByNationalId({ nationalId })
 *     → { status, addresses: [...], mode }
 *   testConnection(), getConfig()
 */

'use strict';

const MODE = (process.env.WASEL_MODE || 'mock').toLowerCase();
const TIMEOUT_MS = parseInt(process.env.WASEL_TIMEOUT_MS, 10) || 8000;

// Saudi short address code format: 4 letters + 4 digits (e.g. RFYA1234)
function validateShortCode(c) {
  return /^[A-Z]{4}\d{4}$/i.test(String(c || '').trim());
}
function validateNationalId(id) {
  return /^[12]\d{9}$/.test(String(id || '').trim());
}

function mockVerifyShortCode({ shortCode }) {
  if (!validateShortCode(shortCode)) {
    return { status: 'invalid_format', message: 'تنسيق الرمز البريدي غير صالح', mode: 'mock' };
  }
  const tail = String(shortCode).slice(-2);
  if (tail === '00') {
    return { status: 'not_found', message: 'الرمز غير مسجَّل في العنوان الوطني', mode: 'mock' };
  }
  if (tail === '99') {
    return {
      status: 'invalid_format',
      message: 'الرمز صحيح التنسيق لكن غير معتمد',
      mode: 'mock',
    };
  }
  const seed = parseInt(shortCode.slice(-3), 10) || 1;
  const cities = ['الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة', 'الطائف'];
  const districts = ['النخيل', 'الملز', 'المروج', 'الروابي', 'العليا', 'الياسمين'];
  return {
    status: 'match',
    address: `حي ${districts[seed % districts.length]}, ${cities[seed % cities.length]}`,
    city: cities[seed % cities.length],
    district: districts[seed % districts.length],
    postalCode: String(10000 + ((seed * 137) % 90000)),
    buildingNumber: String(1000 + ((seed * 73) % 8999)),
    additionalNumber: String(1000 + ((seed * 41) % 8999)),
    geo: {
      lat: 24.7136 + (seed % 100) / 1000,
      lng: 46.6753 + (seed % 100) / 1000,
    },
    isDeliverable: true,
    message: 'عنوان صالح ومسجَّل',
    mode: 'mock',
  };
}

function mockSearchByNationalId({ nationalId }) {
  if (!validateNationalId(nationalId)) {
    return { status: 'invalid_id', addresses: [], mode: 'mock' };
  }
  const tail = String(nationalId).slice(-2);
  if (tail === '00') return { status: 'no_addresses', addresses: [], mode: 'mock' };
  // Usually 1–2 addresses per national ID
  const prefixes = ['RFYA', 'KRMZ', 'JZBA'];
  const count = (parseInt(tail, 10) % 2) + 1;
  const addresses = Array.from({ length: count }, (_, i) => {
    const sc = `${prefixes[i]}${String(1000 + (parseInt(nationalId.slice(-3), 10) % 8999))}`;
    return mockVerifyShortCode({ shortCode: sc });
  });
  return { status: 'found', addresses, mode: 'mock' };
}

// ── Live ────────────────────────────────────────────────────────────────
function assertConfigured() {
  const missing = [];
  if (!process.env.WASEL_BASE_URL) missing.push('WASEL_BASE_URL');
  if (!process.env.WASEL_API_KEY) missing.push('WASEL_API_KEY');
  if (missing.length) {
    const e = new Error(`Wasel live mode غير مُكوَّن — مفقود: ${missing.join(', ')}`);
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

async function liveVerifyShortCode({ shortCode, nationalId }) {
  if (!validateShortCode(shortCode)) {
    return { status: 'invalid_format', mode: 'live' };
  }
  const start = Date.now();
  try {
    assertConfigured();
    const base = process.env.WASEL_BASE_URL;
    const params = new URLSearchParams({ shortCode });
    if (nationalId) params.set('nationalId', nationalId);
    const resp = await fetchWithTimeout(`${base}/address/v1/lookup?${params}`, {
      headers: { 'X-Api-Key': process.env.WASEL_API_KEY },
    });
    const latencyMs = Date.now() - start;
    if (resp.status === 404) return { status: 'not_found', mode: 'live', latencyMs };
    if (!resp.ok)
      return { status: 'unknown', mode: 'live', message: `HTTP ${resp.status}`, latencyMs };
    const data = await resp.json();
    return {
      status: 'match',
      address: data.fullAddress,
      city: data.city,
      district: data.district,
      postalCode: data.postalCode,
      buildingNumber: data.buildingNumber,
      additionalNumber: data.additionalNumber,
      geo: data.lat && data.lng ? { lat: data.lat, lng: data.lng } : undefined,
      isDeliverable: Boolean(data.isDeliverable),
      message: data.message,
      mode: 'live',
      latencyMs,
    };
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') {
      return { status: 'unknown', mode: 'live', message: err.message };
    }
    return { status: 'unknown', mode: 'live', message: err?.message || 'فشل الاتصال' };
  }
}

async function liveSearchByNationalId({ nationalId }) {
  if (!validateNationalId(nationalId)) {
    return { status: 'invalid_id', addresses: [], mode: 'live' };
  }
  try {
    assertConfigured();
    const base = process.env.WASEL_BASE_URL;
    const resp = await fetchWithTimeout(
      `${base}/address/v1/by-national-id?nationalId=${encodeURIComponent(nationalId)}`,
      { headers: { 'X-Api-Key': process.env.WASEL_API_KEY } }
    );
    if (resp.status === 404) return { status: 'no_addresses', addresses: [], mode: 'live' };
    if (!resp.ok)
      return { status: 'unknown', addresses: [], mode: 'live', message: `HTTP ${resp.status}` };
    const data = await resp.json();
    return {
      status: 'found',
      addresses: Array.isArray(data.addresses) ? data.addresses : [],
      mode: 'live',
    };
  } catch (err) {
    return {
      status: 'unknown',
      addresses: [],
      mode: 'live',
      message: err?.message,
    };
  }
}

async function verifyShortCode(params) {
  return MODE === 'live' ? liveVerifyShortCode(params) : mockVerifyShortCode(params);
}
async function searchByNationalId(params) {
  return MODE === 'live' ? liveSearchByNationalId(params) : mockSearchByNationalId(params);
}

async function testConnection() {
  if (MODE !== 'live')
    return { ok: true, mode: 'mock', message: 'وضع المحاكاة — لا يوجد اتصال شبكي' };
  try {
    assertConfigured();
    // Use a known test short code if configured
    const test = process.env.WASEL_TEST_CODE || 'RFYA1234';
    const start = Date.now();
    const r = await liveVerifyShortCode({ shortCode: test });
    return {
      ok: r.status !== 'unknown',
      mode: 'live',
      latencyMs: Date.now() - start,
      message: r.message,
    };
  } catch (err) {
    return { ok: false, mode: 'live', error: err.message, missing: err.missing };
  }
}

function getConfig() {
  const missing = [];
  if (MODE === 'live') {
    if (!process.env.WASEL_BASE_URL) missing.push('WASEL_BASE_URL');
    if (!process.env.WASEL_API_KEY) missing.push('WASEL_API_KEY');
  }
  return {
    provider: 'wasel',
    mode: MODE,
    configured: MODE === 'mock' ? true : missing.length === 0,
    missing: missing.length ? missing : undefined,
    timeoutMs: TIMEOUT_MS,
  };
}

module.exports = {
  MODE,
  verifyShortCode,
  searchByNationalId,
  validateShortCode,
  validateNationalId,
  testConnection,
  getConfig,
  // Generic verify wrapper so gov-integrations dashboard works uniformly
  verify: verifyShortCode,
};

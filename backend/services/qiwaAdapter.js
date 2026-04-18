/**
 * qiwaAdapter.js — Saudi Qiwa (Ministry of Labor) adapter.
 *
 * Verifies employment contract status:
 *   - Contract registered/unregistered
 *   - Contract type (saudi/non-saudi) alignment
 *   - Wage Protection (WPS) compliance
 *
 * Modes (QIWA_MODE, default 'mock'):
 *   • mock — deterministic: national IDs ending '55' → no_contract,
 *            '66' → wps_violation, else → compliant.
 *   • live — calls real Qiwa API.
 *
 * Env (live): QIWA_BASE_URL, QIWA_CLIENT_ID, QIWA_CLIENT_SECRET,
 *             QIWA_ESTABLISHMENT_ID
 *
 * Public API:
 *   verify({ nationalId, iqamaNumber? })
 *     → { status, contractType, contractStartDate, contractEndDate,
 *         wpsCompliant, message, mode, latencyMs? }
 *   testConnection(), getConfig()
 */

'use strict';

const MODE = (process.env.QIWA_MODE || 'mock').toLowerCase();
const TIMEOUT_MS = parseInt(process.env.QIWA_TIMEOUT_MS, 10) || 8000;

function validateId(id) {
  return /^[12]\d{9}$/.test(String(id || '').trim());
}

function mockVerify({ nationalId }) {
  if (!validateId(nationalId)) {
    return { status: 'unknown', message: 'رقم غير صالح', mode: 'mock' };
  }
  const tail = String(nationalId).slice(-2);
  if (tail === '55') {
    return {
      status: 'no_contract',
      message: 'لا يوجد عقد مسجَّل في قوى',
      wpsCompliant: false,
      mode: 'mock',
    };
  }
  if (tail === '66') {
    return {
      status: 'wps_violation',
      message: 'مخالفة حماية الأجور — الأجر لم يُصرَف الشهرين السابقين',
      contractType: 'full_time',
      contractStartDate: new Date('2022-03-15'),
      wpsCompliant: false,
      mode: 'mock',
    };
  }
  return {
    status: 'compliant',
    contractType: parseInt(nationalId[0], 10) === 1 ? 'full_time' : 'full_time_non_saudi',
    contractStartDate: new Date('2022-01-01'),
    contractEndDate: new Date('2026-12-31'),
    wpsCompliant: true,
    message: 'عقد نشط ومطابق لنظام حماية الأجور',
    mode: 'mock',
  };
}

let cachedToken = null;
let cachedTokenExpiry = 0;

function assertConfigured() {
  const missing = [];
  if (!process.env.QIWA_BASE_URL) missing.push('QIWA_BASE_URL');
  if (!process.env.QIWA_CLIENT_ID) missing.push('QIWA_CLIENT_ID');
  if (!process.env.QIWA_CLIENT_SECRET) missing.push('QIWA_CLIENT_SECRET');
  if (!process.env.QIWA_ESTABLISHMENT_ID) missing.push('QIWA_ESTABLISHMENT_ID');
  if (missing.length) {
    const e = new Error(`Qiwa live mode غير مُكوَّن — مفقود: ${missing.join(', ')}`);
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
  const base = process.env.QIWA_BASE_URL;
  const id = process.env.QIWA_CLIENT_ID;
  const secret = process.env.QIWA_CLIENT_SECRET;
  const resp = await fetchWithTimeout(`${base}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  if (!resp.ok) throw new Error(`Qiwa token error ${resp.status}`);
  const data = await resp.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

async function liveVerify({ nationalId }) {
  if (!validateId(nationalId)) {
    return { status: 'unknown', message: 'رقم غير صالح', mode: 'live' };
  }
  const start = Date.now();
  try {
    const token = await getToken();
    const base = process.env.QIWA_BASE_URL;
    const estId = process.env.QIWA_ESTABLISHMENT_ID;
    const resp = await fetchWithTimeout(
      `${base}/labor/v1/contracts/verify?establishmentId=${encodeURIComponent(
        estId
      )}&nationalId=${encodeURIComponent(nationalId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const latencyMs = Date.now() - start;
    if (resp.status === 404)
      return { status: 'no_contract', mode: 'live', latencyMs, wpsCompliant: false };
    if (!resp.ok)
      return { status: 'unknown', mode: 'live', message: `HTTP ${resp.status}`, latencyMs };
    const data = await resp.json();
    return {
      status:
        data.wpsCompliant === false
          ? 'wps_violation'
          : data.contractStatus === 'ACTIVE'
            ? 'compliant'
            : 'unknown',
      contractType: data.contractType,
      contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : undefined,
      contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
      wpsCompliant: Boolean(data.wpsCompliant),
      message: data.message,
      mode: 'live',
      latencyMs,
    };
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') {
      return { status: 'unknown', mode: 'live', message: err.message };
    }
    return { status: 'unknown', mode: 'live', message: err?.message || 'فشل الاتصال بـ Qiwa' };
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
    if (!process.env.QIWA_BASE_URL) missing.push('QIWA_BASE_URL');
    if (!process.env.QIWA_CLIENT_ID) missing.push('QIWA_CLIENT_ID');
    if (!process.env.QIWA_CLIENT_SECRET) missing.push('QIWA_CLIENT_SECRET');
    if (!process.env.QIWA_ESTABLISHMENT_ID) missing.push('QIWA_ESTABLISHMENT_ID');
  }
  return {
    provider: 'qiwa',
    mode: MODE,
    configured: MODE === 'mock' ? true : missing.length === 0,
    missing: missing.length ? missing : undefined,
    timeoutMs: TIMEOUT_MS,
  };
}

module.exports = { MODE, verify, testConnection, getConfig };

/**
 * gosiAdapter.js — Saudi GOSI (General Organization for Social Insurance) adapter.
 *
 * Two modes via GOSI_MODE env (default 'mock'):
 *   • mock — dev. Deterministic responses keyed off the national ID:
 *            ends with '00' → not_found, '11' → inactive, else → active.
 *   • live — calls real GOSI Sandhouse API (requires GOSI_BASE_URL,
 *            GOSI_CLIENT_ID, GOSI_CLIENT_SECRET). The adapter performs
 *            OAuth2 client-credentials grant, then GETs the insurance
 *            status endpoint.
 *
 * Public API:
 *   verify({ nationalId, gosiNumber? }) →
 *     { status, employerName, monthlyWage, registrationDate, message }
 */

'use strict';

const MODE = (process.env.GOSI_MODE || 'mock').toLowerCase();

function validateNationalId(id) {
  return /^[12]\d{9}$/.test(String(id || '').trim());
}

function mockVerify({ nationalId }) {
  if (!validateNationalId(nationalId)) {
    return { status: 'unknown', message: 'رقم هوية غير صالح', mode: 'mock' };
  }
  const tail = String(nationalId).slice(-2);
  if (tail === '00') {
    return { status: 'not_found', message: 'غير مسجَّل في التأمينات', mode: 'mock' };
  }
  if (tail === '11') {
    return {
      status: 'inactive',
      employerName: 'صاحب عمل سابق',
      monthlyWage: 0,
      registrationDate: new Date('2019-01-01'),
      message: 'اشتراك موقوف',
      mode: 'mock',
    };
  }
  return {
    status: 'active',
    employerName: 'مراكز الأوائل للتأهيل',
    monthlyWage: 8000 + (parseInt(nationalId.slice(-3), 10) % 20) * 500,
    registrationDate: new Date(2021, parseInt(nationalId.slice(-1), 10) % 12, 1),
    message: 'اشتراك نشط',
    mode: 'mock',
  };
}

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getGosiToken() {
  if (cachedToken && cachedTokenExpiry > Date.now() + 10_000) return cachedToken;
  const id = process.env.GOSI_CLIENT_ID;
  const secret = process.env.GOSI_CLIENT_SECRET;
  const base = process.env.GOSI_BASE_URL;
  if (!id || !secret || !base) throw new Error('GOSI live mode غير مُكوَّن');
  const r = await fetch(`${base}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`GOSI token error: ${r.status}`);
  const data = await r.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

async function liveVerify({ nationalId }) {
  if (!validateNationalId(nationalId)) {
    return { status: 'unknown', message: 'رقم هوية غير صالح', mode: 'live' };
  }
  const base = process.env.GOSI_BASE_URL;
  const token = await getGosiToken();
  const r = await fetch(
    `${base}/insurance/v1/status?nationalId=${encodeURIComponent(nationalId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (r.status === 404) return { status: 'not_found', mode: 'live', message: 'غير مسجَّل' };
  if (!r.ok) return { status: 'unknown', mode: 'live', message: `HTTP ${r.status}` };
  const data = await r.json();
  const map = { ACTIVE: 'active', INACTIVE: 'inactive', TERMINATED: 'inactive' };
  return {
    status: map[data.status] || 'unknown',
    employerName: data.employerName,
    monthlyWage: data.monthlyWage,
    registrationDate: data.registrationDate ? new Date(data.registrationDate) : undefined,
    message: data.message,
    mode: 'live',
  };
}

async function verify(params) {
  return MODE === 'live' ? liveVerify(params) : mockVerify(params);
}

module.exports = { MODE, verify, validateNationalId };

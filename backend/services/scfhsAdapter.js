/**
 * scfhsAdapter.js — Saudi Commission for Health Specialties adapter.
 *
 * Two modes via SCFHS_MODE (default 'mock'):
 *   • mock — dev. License numbers ending in '0' → expired, '9' → suspended,
 *            '999' → not_found. Others → active with deterministic
 *            classification derived from number length.
 *   • live — calls real SCFHS verification API. Requires
 *            SCFHS_BASE_URL + SCFHS_API_KEY.
 *
 * Public API:
 *   verify({ licenseNumber, nationalId? }) →
 *     { status, classification, specialty, expiryDate, message }
 */

'use strict';

const MODE = (process.env.SCFHS_MODE || 'mock').toLowerCase();

const CLASSIFICATIONS = ['استشاري', 'أخصائي أول', 'أخصائي', 'فني أول', 'فني', 'طبيب عام'];
const SPECIALTIES = [
  'علاج طبيعي',
  'علاج وظيفي',
  'نطق وتخاطب',
  'علاج نفسي',
  'تحليل سلوكي',
  'تخاطب',
  'تمريض',
];

function validateLicense(n) {
  return /^\d{5,10}$/.test(String(n || '').trim());
}

function mockVerify({ licenseNumber }) {
  if (!validateLicense(licenseNumber)) {
    return { status: 'unknown', message: 'رقم ترخيص غير صالح', mode: 'mock' };
  }
  const s = String(licenseNumber);
  if (s.endsWith('999')) {
    return { status: 'not_found', message: 'الرقم غير موجود في سجلات الهيئة', mode: 'mock' };
  }
  if (s.endsWith('9')) {
    return {
      status: 'suspended',
      classification: 'أخصائي',
      specialty: 'علاج طبيعي',
      expiryDate: new Date(Date.now() + 180 * 86400000),
      message: 'التصنيف موقوف — راجع الهيئة',
      mode: 'mock',
    };
  }
  if (s.endsWith('0')) {
    return {
      status: 'expired',
      classification: CLASSIFICATIONS[s.length % CLASSIFICATIONS.length],
      specialty: SPECIALTIES[parseInt(s[0], 10) % SPECIALTIES.length],
      expiryDate: new Date(Date.now() - 30 * 86400000),
      message: 'الترخيص منتهٍ — يتطلب التجديد',
      mode: 'mock',
    };
  }
  return {
    status: 'active',
    classification: CLASSIFICATIONS[s.length % CLASSIFICATIONS.length],
    specialty: SPECIALTIES[parseInt(s[0], 10) % SPECIALTIES.length],
    expiryDate: new Date(Date.now() + 365 * 86400000),
    message: 'ترخيص ساري المفعول',
    mode: 'mock',
  };
}

async function liveVerify({ licenseNumber, nationalId }) {
  if (!validateLicense(licenseNumber)) {
    return { status: 'unknown', message: 'رقم ترخيص غير صالح', mode: 'live' };
  }
  const base = process.env.SCFHS_BASE_URL;
  const apiKey = process.env.SCFHS_API_KEY;
  if (!base || !apiKey) {
    return { status: 'unknown', message: 'SCFHS live mode غير مُكوَّن', mode: 'live' };
  }
  const params = new URLSearchParams({ license: licenseNumber });
  if (nationalId) params.set('nationalId', nationalId);
  const r = await fetch(`${base}/verification/v1/practitioner?${params}`, {
    headers: { 'X-Api-Key': apiKey },
  });
  if (r.status === 404) return { status: 'not_found', mode: 'live' };
  if (!r.ok) return { status: 'unknown', mode: 'live', message: `HTTP ${r.status}` };
  const data = await r.json();
  const map = {
    ACTIVE: 'active',
    VALID: 'active',
    EXPIRED: 'expired',
    SUSPENDED: 'suspended',
  };
  return {
    status: map[data.status] || 'unknown',
    classification: data.classification,
    specialty: data.specialty,
    expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    message: data.message,
    mode: 'live',
  };
}

async function verify(params) {
  return MODE === 'live' ? liveVerify(params) : mockVerify(params);
}

module.exports = { MODE, verify, validateLicense };

'use strict';

/**
 * mawidAdapter.js — Wave 687.
 *
 * Mawid (موعد) is the Saudi MoH national appointment platform. This is a
 * mock-first transport adapter (same pattern as sehhatyAdapter W280 /
 * disabilityAuthorityAdapter W281): deterministic mock by default; live
 * mode is gated behind env + throws MAWID_LIVE_NOT_CONFIGURED until creds
 * are provisioned.
 *
 * Mock determinism (keyed on the national-ID suffix, like the W280 family):
 *   • suffix '99' → no upcoming appointments (empty list)
 *   • suffix '88' → patient-not-found (throws MAWID_PATIENT_NOT_FOUND)
 *   • otherwise   → 2 deterministic upcoming appointments
 *
 * No PII is persisted here — the adapter only transports. The route/service
 * layer is responsible for consent + branch scope + any persistence.
 */

const MODE = () => String(process.env.MAWID_MODE || 'mock').toLowerCase();

function assertLiveConfigured() {
  const ok =
    process.env.MAWID_BASE_URL && process.env.MAWID_CLIENT_ID && process.env.MAWID_CLIENT_SECRET;
  if (!ok) {
    const err = new Error('MAWID_LIVE_NOT_CONFIGURED');
    err.code = 'MAWID_LIVE_NOT_CONFIGURED';
    throw err;
  }
}

function suffix(nationalId) {
  return String(nationalId || '').slice(-2);
}

/**
 * Fetch upcoming Mawid appointments for a national ID.
 * @returns {Promise<{ source:string, nationalId:string, appointments:Array }>}
 */
async function getAppointments(nationalId) {
  if (!nationalId || !/^\d{10}$/.test(String(nationalId))) {
    const err = new Error('MAWID_INVALID_NATIONAL_ID');
    err.code = 'MAWID_INVALID_NATIONAL_ID';
    throw err;
  }
  if (MODE() === 'live') {
    assertLiveConfigured();
    // Live HTTP integration is provisioned per-tenant; intentionally not
    // implemented until sandbox credentials exist.
    const err = new Error('MAWID_LIVE_NOT_CONFIGURED');
    err.code = 'MAWID_LIVE_NOT_CONFIGURED';
    throw err;
  }

  const s = suffix(nationalId);
  if (s === '88') {
    const err = new Error('MAWID_PATIENT_NOT_FOUND');
    err.code = 'MAWID_PATIENT_NOT_FOUND';
    throw err;
  }
  if (s === '99') {
    return { source: 'mock', nationalId: String(nationalId), appointments: [] };
  }
  // Deterministic mock appointments (no Date.now — fixed offsets resolved
  // by the caller against a passed reference if needed).
  return {
    source: 'mock',
    nationalId: String(nationalId),
    appointments: [
      {
        mawidReferenceId: `MWD-${s}-001`,
        facilityName: 'مركز صحي حكومي',
        specialty: 'general_practice',
        status: 'booked',
        slotOffsetDays: 7,
        slotTime: '09:30',
      },
      {
        mawidReferenceId: `MWD-${s}-002`,
        facilityName: 'مستشفى الإحالة',
        specialty: 'rehabilitation',
        status: 'booked',
        slotOffsetDays: 21,
        slotTime: '11:00',
      },
    ],
  };
}

/** Connectivity / mode probe for the /status route. */
async function getStatus() {
  const mode = MODE();
  const liveConfigured =
    !!process.env.MAWID_BASE_URL &&
    !!process.env.MAWID_CLIENT_ID &&
    !!process.env.MAWID_CLIENT_SECRET;
  return {
    integration: 'mawid',
    mode,
    liveConfigured,
    ready: mode === 'mock' || liveConfigured,
  };
}

module.exports = { getAppointments, getStatus };

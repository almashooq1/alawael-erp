/**
 * sehhatyAdapter.js — Saudi Sehhaty / Tawakkalna health summary integration (W280).
 *
 * Two modes via SEHHATY_MODE (default: 'mock'):
 *   • mock — for dev. Deterministic summary keyed on nationalId suffix:
 *     ending '99' → consent_revoked at source; ending '88' → no records.
 *   • live — calls real Sehhaty API. Requires:
 *     SEHHATY_BASE_URL, SEHHATY_CLIENT_ID, SEHHATY_CLIENT_SECRET,
 *     SEHHATY_CENTER_ID.
 *
 * CRITICAL PHI / PDPL CONTROLS (per Phase 3 brief):
 *   • EVERY call requires a valid `ConsentRecord` with type='health_summary_import'
 *     and `grantedAt <= now < (revokedAt || expiresAt || ∞)`. The adapter is
 *     PURE — it does NOT check consent itself; the SERVICE that wraps it
 *     (sehhatyService.js — to be added in a follow-up commit) is responsible
 *     for the consent check. This keeps the adapter mockable/testable.
 *   • Summaries are RECEIVED — they enter the system as `BeneficiaryFile.externalRecords`
 *     with `source: 'sehhaty'`, `importedAt`, `consentRecordId`.
 *   • TTL: per healthcare retention, summary is retained = episode_end + 90d.
 *     (Implemented by the service layer when persisting; not the adapter's job.)
 *
 * Public API (same shape both modes):
 *   importHealthSummary({ nationalId, consentRecordId }) → { summary, importedAt, source }
 *   pullVaccinationRecords({ nationalId, consentRecordId }) → { vaccinations[], lastUpdatedAt }
 *   linkTawakkalna({ nationalId, guardianTawakkalnaToken }) → { linkId, linkedAt }
 */

'use strict';

const crypto = require('crypto');

const MODE = (process.env.SEHHATY_MODE || 'mock').toLowerCase();

function isLive() {
  return MODE === 'live';
}

function genImportId() {
  return `seh-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

// ── Mock data shapes (representative, not exhaustive) ──────────────────
function mockSummaryFor(nationalId) {
  const suffix = String(nationalId).slice(-2);
  if (suffix === '99') {
    throw Object.assign(new Error('Consent revoked at Sehhaty (mock)'), {
      code: 'SEHHATY_CONSENT_REVOKED_AT_SOURCE',
    });
  }
  if (suffix === '88') {
    return {
      summary: null,
      reason: 'NO_RECORDS_AT_SOURCE',
      importedAt: new Date(),
      source: 'sehhaty',
      mode: 'mock',
    };
  }
  // Synthetic but plausible health summary
  return {
    summary: {
      demographics: {
        nationalId,
        ageRange: '6-12',
        gender: parseInt(suffix, 10) % 2 === 0 ? 'M' : 'F',
      },
      activeConditions: [{ code: 'F84.0', label: 'Autism spectrum disorder', onsetYear: 2022 }],
      medications: [{ name: 'Risperidone 0.5mg', dosage: 'twice daily', prescribedAt: '2024-09' }],
      allergies: [{ substance: 'Penicillin', severity: 'mild' }],
      recentEncounters: [
        {
          provider: 'King Faisal Specialist Hospital',
          date: '2026-03-10',
          summary: 'Routine follow-up. Stable.',
        },
      ],
      lastUpdatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
    importedAt: new Date(),
    source: 'sehhaty',
    mode: 'mock',
  };
}

function mockVaccinations(nationalId) {
  const suffix = String(nationalId).slice(-2);
  if (suffix === '99') {
    throw Object.assign(new Error('Consent revoked at Sehhaty (mock)'), {
      code: 'SEHHATY_CONSENT_REVOKED_AT_SOURCE',
    });
  }
  const base = parseInt(suffix, 10) || 0;
  return {
    vaccinations: [
      { vaccine: 'BCG', date: '2018-03-15', batch: `MOCK-${base}-A` },
      { vaccine: 'DPT-1', date: '2018-05-20', batch: `MOCK-${base}-B` },
      { vaccine: 'MMR', date: '2019-04-10', batch: `MOCK-${base}-C` },
      { vaccine: 'COVID-19 mRNA', date: '2022-08-22', batch: `MOCK-${base}-D` },
    ],
    lastUpdatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    mode: 'mock',
  };
}

function mockLinkTawakkalna({ nationalId, guardianTawakkalnaToken }) {
  if (!guardianTawakkalnaToken || guardianTawakkalnaToken.length < 16) {
    throw Object.assign(new Error('Invalid Tawakkalna token'), {
      code: 'SEHHATY_INVALID_TAWAKKALNA_TOKEN',
    });
  }
  return {
    linkId: `twk-${genImportId()}`,
    nationalId,
    linkedAt: new Date(),
    mode: 'mock',
  };
}

// ── Live-mode placeholders ─────────────────────────────────────────────
async function liveImportSummary(_payload) {
  throw Object.assign(new Error('Live mode requires Sehhaty sandbox credentials'), {
    code: 'SEHHATY_LIVE_NOT_CONFIGURED',
  });
}

async function liveVaccinations(_payload) {
  throw Object.assign(new Error('Live mode requires Sehhaty sandbox credentials'), {
    code: 'SEHHATY_LIVE_NOT_CONFIGURED',
  });
}

async function liveLinkTawakkalna(_payload) {
  throw Object.assign(new Error('Live mode requires Sehhaty sandbox credentials'), {
    code: 'SEHHATY_LIVE_NOT_CONFIGURED',
  });
}

// ── Public API ──────────────────────────────────────────────────────────
async function importHealthSummary(payload) {
  if (!payload?.nationalId || !payload?.consentRecordId) {
    throw Object.assign(new Error('nationalId + consentRecordId required'), {
      code: 'SEHHATY_INVALID_INPUT',
    });
  }
  return isLive() ? liveImportSummary(payload) : mockSummaryFor(payload.nationalId);
}

async function pullVaccinationRecords(payload) {
  if (!payload?.nationalId || !payload?.consentRecordId) {
    throw Object.assign(new Error('nationalId + consentRecordId required'), {
      code: 'SEHHATY_INVALID_INPUT',
    });
  }
  return isLive() ? liveVaccinations(payload) : mockVaccinations(payload.nationalId);
}

async function linkTawakkalna(payload) {
  if (!payload?.nationalId) {
    throw Object.assign(new Error('nationalId required'), {
      code: 'SEHHATY_INVALID_INPUT',
    });
  }
  return isLive() ? liveLinkTawakkalna(payload) : mockLinkTawakkalna(payload);
}

function getConfig() {
  // Compute missing env vars for live mode (preflight-compatible shape).
  const missing = [];
  if (isLive()) {
    if (!process.env.SEHHATY_BASE_URL) missing.push('SEHHATY_BASE_URL');
    if (!process.env.SEHHATY_CLIENT_ID) missing.push('SEHHATY_CLIENT_ID');
    if (!process.env.SEHHATY_CLIENT_SECRET) missing.push('SEHHATY_CLIENT_SECRET');
    if (!process.env.SEHHATY_CENTER_ID) missing.push('SEHHATY_CENTER_ID');
  }
  return {
    provider: 'sehhaty',
    mode: MODE,
    configured: isLive() ? missing.length === 0 : true,
    missing: missing.length ? missing : undefined,
    // Retained for backward compatibility with existing callers.
    liveConfigured: isLive() ? missing.length === 0 : null,
    // CRITICAL: consent check is the SERVICE layer's responsibility, not adapter's.
    // The adapter trusts that the caller has validated consent before invoking.
    consentRequirement: 'health_summary_import (enforced at service layer)',
  };
}

module.exports = {
  importHealthSummary,
  pullVaccinationRecords,
  linkTawakkalna,
  getConfig,
};

/**
 * referralTrackingService — pure math over ReferralTracking records.
 *
 * Distinct from services/referralService.js (FHIR R4 medical-referral
 * lifecycle with auto-assignment + MOH sync). This one is simpler and
 * orthogonal: incoming/outgoing referral network analytics for the
 * business side — who sends us families, conversion funnel, close-loop
 * gaps for outgoing referrals.
 */

'use strict';

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const THRESHOLDS = {
  get closeLoopDays() {
    return envInt('REFERRAL_CLOSE_LOOP_DAYS', 30);
  },
  get minReferralsForRanking() {
    return envInt('REFERRAL_RANK_MIN', 2);
  },
};

function isWin(status) {
  return status === 'accepted' || status === 'converted';
}

function summarize(records, direction = null) {
  const scoped = direction ? records.filter(r => r.direction === direction) : records;
  const counts = {
    pending: 0,
    accepted: 0,
    declined: 0,
    converted: 0,
    withdrawn: 0,
  };
  for (const r of scoped) {
    if (r.status in counts) counts[r.status] += 1;
  }
  const total = scoped.length;
  const wins = counts.accepted + counts.converted;
  const settled = total - counts.pending;
  const conversionRate = settled > 0 ? Math.round((wins / settled) * 1000) / 10 : null;
  return {
    direction: direction || 'both',
    total,
    ...counts,
    wins,
    settled,
    conversionRate,
  };
}

function topReferrers(records, n = 10) {
  const incoming = records.filter(
    r => r.direction === 'incoming' && (r.referralSource || r.sourceOrgSlug)
  );
  const bySource = new Map();
  for (const r of incoming) {
    const key = r.sourceOrgSlug || (r.referralSource || '').toLowerCase().trim();
    if (!key) continue;
    if (!bySource.has(key)) {
      bySource.set(key, {
        sourceOrgSlug: key,
        displayName: r.referralSource || key,
        total: 0,
        wins: 0,
        pending: 0,
      });
    }
    const row = bySource.get(key);
    row.total += 1;
    if (isWin(r.status)) row.wins += 1;
    if (r.status === 'pending') row.pending += 1;
  }
  return [...bySource.values()]
    .filter(row => row.total >= THRESHOLDS.minReferralsForRanking)
    .map(row => ({
      ...row,
      conversionRate:
        row.total - row.pending > 0
          ? Math.round((row.wins / (row.total - row.pending)) * 1000) / 10
          : null,
    }))
    .sort((a, b) => b.wins - a.wins || b.total - a.total)
    .slice(0, n);
}

function closeLoopGaps(records, now = new Date()) {
  const cutoff = new Date(now.getTime() - THRESHOLDS.closeLoopDays * 86400000);
  return records
    .filter(
      r => r.direction === 'outgoing' && r.status === 'pending' && new Date(r.receivedAt) <= cutoff
    )
    .map(r => ({
      _id: r._id,
      destinationOrg: r.destinationOrg,
      beneficiaryId: r.beneficiaryId ? String(r.beneficiaryId) : null,
      prospectName: r.prospectName,
      daysOpen: Math.round((now - new Date(r.receivedAt)) / 86400000),
    }))
    .sort((a, b) => b.daysOpen - a.daysOpen);
}

function trendByMonth(records) {
  const byMonth = new Map();
  for (const r of records) {
    if (!r.receivedAt) continue;
    const key = new Date(r.receivedAt).toISOString().slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(r);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, items]) => ({ month, ...summarize(items) }));
}

module.exports = {
  THRESHOLDS,
  summarize,
  topReferrers,
  closeLoopGaps,
  trendByMonth,
};

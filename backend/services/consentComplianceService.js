/**
 * consentComplianceService — consent completion analytics for compliance KPIs.
 */

'use strict';

/**
 * Compute consent completion rate from a list of consent records.
 * `consents` = [{ status: 'signed' | 'pending' | 'expired' | 'withdrawn', ... }].
 */
function completionSummary(consents = []) {
  const total = consents.length;
  const completed = consents.filter(c => c && c.status === 'signed').length;
  return {
    completedPct: total > 0 ? Math.round((completed / total) * 1000) / 10 : null,
    total,
    completed,
    pending: consents.filter(c => c && c.status === 'pending').length,
    expired: consents.filter(c => c && c.status === 'expired').length,
  };
}

module.exports = {
  completionSummary,
};

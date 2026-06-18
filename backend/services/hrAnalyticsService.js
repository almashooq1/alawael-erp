/**
 * hrAnalyticsService — lightweight HR analytics surface for KPI resolution.
 */

'use strict';

function monthsBetween(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
}

function buildAttritionRolling(employees = [], _opts = {}) {
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const active = employees.filter(e => {
    if (!e) return false;
    const hired = e.hiredAt || e.joinDate || e.createdAt;
    return hired && new Date(hired) <= now && (!e.terminatedAt || new Date(e.terminatedAt) > now);
  });

  const terminated = employees.filter(e => {
    if (!e || !e.terminatedAt) return false;
    const t = new Date(e.terminatedAt);
    return t >= twelveMonthsAgo && t <= now;
  });

  const denominator = active.length + terminated.length;
  const rate = denominator > 0 ? Math.round((terminated.length / denominator) * 1000) / 10 : null;

  return {
    rolling12m: {
      rate,
      activeCount: active.length,
      terminatedCount: terminated.length,
      windowStart: twelveMonthsAgo.toISOString(),
      windowEnd: now.toISOString(),
    },
  };
}

/**
 * SCFHS licensure compliance: % of clinical staff with a valid SCFHS license.
 */
function scfhsLicensureCompliance(employees = []) {
  const clinical = employees.filter(e => {
    if (!e) return false;
    const role = (e.role || e.jobTitle || '').toLowerCase();
    return /(doctor|therapist|nurse|specialist|psych|slp|ot|pt)/.test(role);
  });
  if (clinical.length === 0) {
    return { compliancePct: null, clinicalStaff: 0, licensed: 0 };
  }
  const licensed = clinical.filter(e => {
    const lic = e.scfhsLicense || e.license;
    if (!lic) return false;
    if (lic.status && lic.status !== 'active') return false;
    if (lic.expiryDate && new Date(lic.expiryDate) < new Date()) return false;
    return true;
  }).length;
  return {
    compliancePct: Math.round((licensed / clinical.length) * 1000) / 10,
    clinicalStaff: clinical.length,
    licensed,
  };
}

module.exports = {
  buildAttritionRolling,
  scfhsLicensureCompliance,
};

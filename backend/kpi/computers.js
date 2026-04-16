/**
 * KPI Computers — pluggable functions that compute each KPI value.
 *
 * Design:
 *   - Each computer is pure over its dependencies (models injected).
 *   - All computers accept the same ctx shape: { branchId?, period: {from, to} }.
 *   - Returns a number or null. Errors bubble up — the engine catches them.
 *
 * Organized by category to mirror definitions.js.
 * Only a subset is implemented now; the rest are stubbed in a TODO list.
 */

'use strict';

/**
 * Build the map of KPI id → compute function, given dependencies.
 *
 * @param {Object} deps Mongoose models (may be partial during setup)
 * @returns {Record<string, (ctx: {branchId?: string, period?: {from: Date, to: Date}}) => Promise<number | null>>}
 */
function buildComputers(deps = {}) {
  const { Beneficiary, Session, Invoice, Employee, Appointment, Incident, Complaint, Credential } =
    deps;

  const scopeBranch = (branchId, base = {}) => (branchId ? { ...base, branchId } : base);

  const inPeriod = (field, period) =>
    period && period.from && period.to ? { [field]: { $gte: period.from, $lte: period.to } } : {};

  const computers = {
    // ─────── CLINICAL ───────
    'active-beneficiaries': async ({ branchId } = {}) => {
      if (!Beneficiary) return null;
      return Beneficiary.countDocuments(scopeBranch(branchId, { admissionStatus: 'active' }));
    },

    'new-admissions-month': async ({ branchId, period } = {}) => {
      if (!Beneficiary || !period) return null;
      return Beneficiary.countDocuments({
        ...scopeBranch(branchId),
        ...inPeriod('admissionDate', period),
      });
    },

    'sessions-completed': async ({ branchId, period } = {}) => {
      if (!Session) return null;
      return Session.countDocuments({
        ...scopeBranch(branchId, { status: 'completed' }),
        ...inPeriod('endedAt', period),
      });
    },

    'no-show-rate': async ({ branchId, period } = {}) => {
      if (!Session) return null;
      const [ns, total] = await Promise.all([
        Session.countDocuments({
          ...scopeBranch(branchId, { status: 'no_show' }),
          ...inPeriod('scheduledFor', period),
        }),
        Session.countDocuments({ ...scopeBranch(branchId), ...inPeriod('scheduledFor', period) }),
      ]);
      return total === 0 ? 0 : Number(((ns / total) * 100).toFixed(2));
    },

    'caseload-per-therapist': async ({ branchId } = {}) => {
      if (!Beneficiary || !Employee) return null;
      const [beneficiaries, therapists] = await Promise.all([
        Beneficiary.countDocuments(scopeBranch(branchId, { admissionStatus: 'active' })),
        Employee.countDocuments(
          scopeBranch(branchId, { status: 'active', specializations: { $exists: true, $ne: [] } })
        ),
      ]);
      return therapists === 0 ? 0 : Number((beneficiaries / therapists).toFixed(2));
    },

    // ─────── FINANCIAL ───────
    'revenue-month': async ({ branchId, period } = {}) => {
      if (!Invoice) return null;
      const match = {
        ...scopeBranch(branchId, { status: 'paid' }),
        ...inPeriod('paidAt', period),
      };
      const agg = await Invoice.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]);
      return agg[0] ? Number(agg[0].total) : 0;
    },

    'outstanding-ar': async ({ branchId } = {}) => {
      if (!Invoice) return null;
      const match = scopeBranch(branchId, {
        status: { $in: ['issued', 'sent', 'partially_paid', 'overdue'] },
      });
      const agg = await Invoice.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
      ]);
      return agg[0] ? Number(agg[0].total) : 0;
    },

    'zatca-acceptance-rate': async ({ branchId, period } = {}) => {
      if (!Invoice) return null;
      const [accepted, submitted] = await Promise.all([
        Invoice.countDocuments({
          ...scopeBranch(branchId, { 'zatcaSubmission.status': 'accepted' }),
          ...inPeriod('zatcaSubmission.submittedAt', period),
        }),
        Invoice.countDocuments({
          ...scopeBranch(branchId, { 'zatcaSubmission.status': { $in: ['accepted', 'rejected'] } }),
          ...inPeriod('zatcaSubmission.submittedAt', period),
        }),
      ]);
      return submitted === 0 ? 100 : Number(((accepted / submitted) * 100).toFixed(2));
    },

    // ─────── OPERATIONAL ───────
    'appointment-confirm-rate': async ({ branchId, period } = {}) => {
      if (!Appointment) return null;
      const [confirmed, booked] = await Promise.all([
        Appointment.countDocuments({
          ...scopeBranch(branchId, { status: 'confirmed' }),
          ...inPeriod('scheduledFor', period),
        }),
        Appointment.countDocuments({
          ...scopeBranch(branchId),
          ...inPeriod('scheduledFor', period),
        }),
      ]);
      return booked === 0 ? 0 : Number(((confirmed / booked) * 100).toFixed(2));
    },

    // ─────── QUALITY ───────
    'incidents-open': async ({ branchId } = {}) => {
      if (!Incident) return null;
      return Incident.countDocuments(
        scopeBranch(branchId, {
          status: { $in: ['open', 'under_investigation', 'pending_action'] },
        })
      );
    },

    'complaints-open': async ({ branchId } = {}) => {
      if (!Complaint) return null;
      return Complaint.countDocuments(
        scopeBranch(branchId, { status: { $nin: ['resolved', 'closed'] } })
      );
    },

    // ─────── HR ───────
    headcount: async ({ branchId } = {}) => {
      if (!Employee) return null;
      return Employee.countDocuments(scopeBranch(branchId, { status: 'active' }));
    },

    'credential-expiring-30d': async ({ branchId } = {}) => {
      if (!Credential) return null;
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return Credential.countDocuments({
        ...scopeBranch(branchId, { verificationStatus: 'verified' }),
        expiryDate: { $lte: thirtyDays, $gte: new Date() },
      });
    },
  };

  return computers;
}

module.exports = { buildComputers };

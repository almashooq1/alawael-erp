'use strict';

/**
 * parent-chatbot-context.service.js — Wave 122 / P3.6 Phase 2a.
 *
 * Context resolver for the Parent Chatbot. Maps a classified intent
 * (Wave 120 registry) to the DB lookups that fill the `{TOKEN}`
 * placeholders in the canned response templates.
 *
 * Phase 2a deliberately stays heuristic + deterministic — no LLM,
 * no prompt construction. The resolver fans out to existing models
 * (Appointment / AccountingInvoice / Beneficiary / CarePlan /
 * Branch / Employee) and returns a token map. The chatbot service
 * substitutes tokens into the template via `fillTemplate`.
 *
 * Each resolver method:
 *   - is async + isolated (one query graph per intent)
 *   - returns `{ ok: true, tokens: {...} }` on success
 *   - returns `{ ok: false, reason, partialTokens? }` on degraded paths
 *   - **never throws** — caller is `generateResponse`, which must
 *     stay infallible. Internal errors are swallowed + logged.
 *
 * Public API:
 *   resolveContext({intent, userId, beneficiaryId?, branchId?})
 *     → { ok, tokens, reason? }
 *
 *   fillTemplate(template, tokens)        pure; exposed for testing
 */

const reg = require('./parent-chatbot.registry');

const DAY_MS = 24 * 3600 * 1000;
const PROGRESS_WINDOW_DAYS = 90;

function createParentChatbotContextService({
  appointmentModel = null,
  invoiceModel = null,
  beneficiaryModel = null,
  carePlanModel = null,
  branchModel = null,
  employeeModel = null,
  fallbackClinicPhone = '+966-XX-XXXX-XXXX',
  fallbackPaymentLink = 'https://portal.example.com/pay',
  fallbackEtaMinutes = 15,
  logger = console,
  now = () => new Date(),
} = {}) {
  // ─── Pure helpers ────────────────────────────────────────────────

  /**
   * Substitutes `{TOKEN}` placeholders in a template with values from
   * a token map. Missing tokens are left as-is so reviewers can spot
   * unfilled placeholders during QA. Token names are matched
   * case-sensitively against the registry's template syntax.
   */
  function fillTemplate(template, tokens = {}) {
    if (!template || typeof template !== 'string') return '';
    if (!tokens || typeof tokens !== 'object') return template;
    return template.replace(/\{([A-Z_][A-Z0-9_]*)\}/g, (match, name) => {
      if (Object.prototype.hasOwnProperty.call(tokens, name)) {
        const val = tokens[name];
        if (val === null || val === undefined) return match;
        return String(val);
      }
      return match;
    });
  }

  // ─── Internal model adapters (tolerant of mock + real) ──────────

  async function _safeLean(query) {
    if (query == null) return null;
    if (Array.isArray(query)) return query;
    try {
      if (typeof query.lean === 'function') return await query.lean();
      if (typeof query.then === 'function') return await query;
      return query;
    } catch (err) {
      logger.warn(`[chatbot-context] query failed: ${err.message}`);
      return null;
    }
  }

  async function _findOne(model, q, sort = null) {
    if (!model) return null;
    try {
      let cursor = model.findOne ? model.findOne(q) : model.find(q);
      if (sort && cursor && typeof cursor.sort === 'function') cursor = cursor.sort(sort);
      const r = await _safeLean(cursor);
      return Array.isArray(r) ? r[0] || null : r || null;
    } catch (err) {
      logger.warn(`[chatbot-context] findOne failed: ${err.message}`);
      return null;
    }
  }

  async function _findMany(model, q, sort = null, limit = null) {
    if (!model) return [];
    try {
      let cursor = model.find(q);
      if (sort && cursor && typeof cursor.sort === 'function') cursor = cursor.sort(sort);
      if (limit && cursor && typeof cursor.limit === 'function') cursor = cursor.limit(limit);
      const r = await _safeLean(cursor);
      return Array.isArray(r) ? r : [];
    } catch (err) {
      logger.warn(`[chatbot-context] findMany failed: ${err.message}`);
      return [];
    }
  }

  // ─── Per-intent resolvers ────────────────────────────────────────

  async function _appointmentNext({ beneficiaryId }) {
    if (!appointmentModel) return { ok: false, reason: 'APPOINTMENT_MODEL_UNAVAILABLE' };
    if (!beneficiaryId) return { ok: false, reason: 'BENEFICIARY_REQUIRED' };
    const ap = await _findOne(
      appointmentModel,
      {
        beneficiary: beneficiaryId,
        date: { $gte: now() },
        status: { $in: ['PENDING', 'CONFIRMED'] },
      },
      { date: 1 }
    );
    if (!ap) return { ok: false, reason: 'NO_UPCOMING_APPOINTMENT' };
    const dateStr = ap.date ? new Date(ap.date).toISOString().slice(0, 10) : 'غير محدد';
    const timeStr = ap.startTime || 'غير محدد';
    const therapist = ap.therapistName || (await _resolveTherapistName(ap.therapist)) || 'غير محدد';
    return {
      ok: true,
      tokens: {
        APPOINTMENT_DATE: dateStr,
        APPOINTMENT_TIME: timeStr,
        THERAPIST_NAME: therapist,
      },
    };
  }

  async function _appointmentHistory({ beneficiaryId }) {
    if (!appointmentModel) return { ok: false, reason: 'APPOINTMENT_MODEL_UNAVAILABLE' };
    if (!beneficiaryId) return { ok: false, reason: 'BENEFICIARY_REQUIRED' };
    const since = new Date(now().getTime() - PROGRESS_WINDOW_DAYS * DAY_MS);
    const items = await _findMany(
      appointmentModel,
      {
        beneficiary: beneficiaryId,
        date: { $gte: since, $lt: now() },
        status: { $in: ['COMPLETED', 'CHECKED_IN', 'IN_PROGRESS', 'NO_SHOW', 'CANCELLED'] },
      },
      { date: -1 },
      100
    );
    if (items.length === 0) {
      return {
        ok: true,
        tokens: { APPOINTMENT_COUNT: 0, LAST_APPOINTMENT_DATE: 'لا يوجد' },
      };
    }
    const last = items[0];
    const lastDate =
      last && last.date ? new Date(last.date).toISOString().slice(0, 10) : 'غير محدد';
    return {
      ok: true,
      tokens: {
        APPOINTMENT_COUNT: items.length,
        LAST_APPOINTMENT_DATE: lastDate,
      },
    };
  }

  async function _appointmentCancel({ branchId }) {
    const phone = await _resolveClinicPhone(branchId);
    return { ok: true, tokens: { CLINIC_PHONE: phone || fallbackClinicPhone } };
  }

  async function _invoiceBalance({ userId, beneficiaryId }) {
    if (!invoiceModel) return { ok: false, reason: 'INVOICE_MODEL_UNAVAILABLE' };
    // Sum unpaid balances for the guardian OR the beneficiary.
    // Schema variance across the codebase — be defensive and union
    // common fields.
    const orFilters = [];
    if (userId) orFilters.push({ guardianId: userId }, { userId });
    if (beneficiaryId) orFilters.push({ beneficiary: beneficiaryId }, { beneficiaryId });
    if (orFilters.length === 0) return { ok: false, reason: 'INVOICE_TARGET_REQUIRED' };
    const items = await _findMany(invoiceModel, {
      $or: orFilters,
      status: { $in: ['UNPAID', 'PARTIAL', 'OVERDUE', 'PENDING'] },
    });
    const balance = items.reduce((sum, inv) => {
      const total = Number(inv.total || inv.amount || 0);
      const paid = Number(inv.paid || inv.amountPaid || 0);
      return sum + Math.max(0, total - paid);
    }, 0);
    return {
      ok: true,
      tokens: {
        BALANCE_SAR: Number(balance.toFixed(2)),
        PAYMENT_LINK: fallbackPaymentLink,
      },
    };
  }

  async function _invoiceHistory({ userId, beneficiaryId }) {
    if (!invoiceModel) return { ok: false, reason: 'INVOICE_MODEL_UNAVAILABLE' };
    const orFilters = [];
    if (userId) orFilters.push({ guardianId: userId }, { userId });
    if (beneficiaryId) orFilters.push({ beneficiary: beneficiaryId }, { beneficiaryId });
    if (orFilters.length === 0) return { ok: false, reason: 'INVOICE_TARGET_REQUIRED' };
    const items = await _findMany(invoiceModel, { $or: orFilters }, null, 200);
    return { ok: true, tokens: { INVOICE_COUNT: items.length } };
  }

  async function _progressSummary({ beneficiaryId }) {
    if (!beneficiaryModel) return { ok: false, reason: 'BENEFICIARY_MODEL_UNAVAILABLE' };
    if (!beneficiaryId) return { ok: false, reason: 'BENEFICIARY_REQUIRED' };
    const ben = await _findOne(beneficiaryModel, { _id: beneficiaryId });
    const childName = (ben && (ben.name_ar || ben.full_name || ben.firstName_ar)) || 'ابنكم';

    // Sessions in the last 30 days (approximation of "monthly").
    let sessionCount = 0;
    if (appointmentModel) {
      const since30 = new Date(now().getTime() - 30 * DAY_MS);
      const sessions = await _findMany(
        appointmentModel,
        {
          beneficiary: beneficiaryId,
          date: { $gte: since30, $lt: now() },
          status: { $in: ['COMPLETED', 'CHECKED_IN', 'IN_PROGRESS'] },
        },
        null,
        200
      );
      sessionCount = sessions.length;
    }

    // Goals — pull from the latest care plan version, if available.
    let goalsCompleted = 0;
    let goalsTotal = 0;
    if (carePlanModel) {
      const plan = await _findOne(
        carePlanModel,
        { beneficiary_id: beneficiaryId, status: { $in: ['APPROVED', 'ACTIVE'] } },
        { updated_at: -1 }
      );
      const goals = (plan && (plan.goals || plan.smartGoals)) || [];
      goalsTotal = goals.length;
      goalsCompleted = goals.filter(
        g => g && (g.status === 'achieved' || g.status === 'completed' || g.completed === true)
      ).length;
    }

    return {
      ok: true,
      tokens: {
        CHILD_NAME: childName,
        SESSION_COUNT: sessionCount,
        GOALS_COMPLETED: goalsCompleted,
        GOALS_TOTAL: goalsTotal,
      },
    };
  }

  async function _teamTherapist({ beneficiaryId }) {
    if (!beneficiaryId) return { ok: false, reason: 'BENEFICIARY_REQUIRED' };
    let childName = 'ابنكم';
    let therapistName = 'غير معيَّن';
    let specialty = 'تأهيل';

    if (beneficiaryModel) {
      const ben = await _findOne(beneficiaryModel, { _id: beneficiaryId });
      if (ben) {
        childName = ben.name_ar || ben.full_name || ben.firstName_ar || childName;
      }
    }
    if (appointmentModel) {
      const last = await _findOne(
        appointmentModel,
        { beneficiary: beneficiaryId, therapist: { $ne: null } },
        { date: -1 }
      );
      if (last) {
        therapistName =
          last.therapistName || (await _resolveTherapistName(last.therapist)) || therapistName;
        specialty = last.department || last.type || specialty;
      }
    }
    return {
      ok: true,
      tokens: {
        CHILD_NAME: childName,
        THERAPIST_NAME: therapistName,
        SPECIALTY: specialty,
      },
    };
  }

  async function _clinicHours({ branchId }) {
    if (!branchModel) {
      return { ok: true, tokens: { CLINIC_HOURS: '7:00 ص — 5:00 م، الأحد إلى الخميس' } };
    }
    const branch = branchId ? await _findOne(branchModel, { _id: branchId }) : null;
    const hours =
      (branch && (branch.workingHours || branch.operatingHours)) ||
      '7:00 ص — 5:00 م، الأحد إلى الخميس';
    return { ok: true, tokens: { CLINIC_HOURS: String(hours) } };
  }

  async function _clinicAddress({ branchId }) {
    if (!branchModel) {
      return { ok: true, tokens: { CLINIC_ADDRESS: 'يرجى الاتصال بالاستقبال لمعرفة العنوان' } };
    }
    const branch = branchId ? await _findOne(branchModel, { _id: branchId }) : null;
    const address =
      (branch && (branch.address_ar || branch.address || branch.fullAddress)) ||
      'يرجى الاتصال بالاستقبال لمعرفة العنوان';
    return { ok: true, tokens: { CLINIC_ADDRESS: String(address) } };
  }

  async function _escalateHuman() {
    return { ok: true, tokens: { ETA_MINUTES: fallbackEtaMinutes } };
  }

  // ─── Tiny helpers ────────────────────────────────────────────────

  async function _resolveTherapistName(therapistId) {
    if (!therapistId || !employeeModel) return null;
    const emp = await _findOne(employeeModel, { _id: therapistId });
    if (!emp) return null;
    return emp.name_ar || emp.fullName || emp.name || null;
  }

  async function _resolveClinicPhone(branchId) {
    if (!branchModel || !branchId) return null;
    const branch = await _findOne(branchModel, { _id: branchId });
    return (branch && (branch.phone || branch.contactPhone)) || null;
  }

  // ─── Public dispatcher ──────────────────────────────────────────

  async function resolveContext({
    intent = null,
    userId = null,
    beneficiaryId = null,
    branchId = null,
  } = {}) {
    if (!intent) return { ok: true, tokens: {} };
    try {
      switch (intent) {
        case reg.INTENT.APPOINTMENT_NEXT:
          return _appointmentNext({ beneficiaryId });
        case reg.INTENT.APPOINTMENT_HISTORY:
          return _appointmentHistory({ beneficiaryId });
        case reg.INTENT.APPOINTMENT_CANCEL:
          return _appointmentCancel({ branchId });
        case reg.INTENT.INVOICE_BALANCE:
          return _invoiceBalance({ userId, beneficiaryId });
        case reg.INTENT.INVOICE_HISTORY:
          return _invoiceHistory({ userId, beneficiaryId });
        case reg.INTENT.PROGRESS_SUMMARY:
          return _progressSummary({ beneficiaryId });
        case reg.INTENT.TEAM_THERAPIST:
          return _teamTherapist({ beneficiaryId });
        case reg.INTENT.CLINIC_HOURS:
          return _clinicHours({ branchId });
        case reg.INTENT.CLINIC_ADDRESS:
          return _clinicAddress({ branchId });
        case reg.INTENT.ESCALATE_HUMAN:
          return _escalateHuman();
        // GREETING / UNKNOWN / unknown-intent → no tokens required
        default:
          return { ok: true, tokens: {} };
      }
    } catch (err) {
      logger.warn(`[chatbot-context] resolveContext threw: ${err.message}`);
      return { ok: false, reason: 'CONTEXT_RESOLVE_FAILED', message: err.message };
    }
  }

  return {
    resolveContext,
    fillTemplate,
    // Exposed for tests:
    _appointmentNext,
    _appointmentHistory,
    _invoiceBalance,
    _progressSummary,
    _teamTherapist,
    _clinicHours,
  };
}

module.exports = { createParentChatbotContextService };

'use strict';

/**
 * hr-modules.routes.js — Round 10 mega-router for the new HR modules.
 *
 * Adds endpoints for: onboarding/offboarding, loans, travel, health
 * insurance, compensation bands, workforce positions, surveys, asset
 * assignments, kudos, policies, shift swaps, visa requests, plus
 * org-chart + time-off-calendar read endpoints, plus WPS export.
 *
 * Mounted at /api/v1/hr — paths:
 *   /onboarding   /loans  /travel  /health-insurance  /comp-bands
 *   /positions    /surveys  /assets  /kudos  /policies  /shift-swaps
 *   /visas        /org-chart  /time-off-calendar  /wps/export
 *
 * Each sub-module is a thin CRUD with safe fallback when its model
 * isn't available. Adding a new module = +20 lines.
 */

const express = require('express');
const { authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const { stripUpdateMeta } = require('../../utils/sanitize');
const { requireBranchAccess, branchFilter } = require('../../middleware/branchScope.middleware');
const { assertBranchMatch } = require('../../middleware/assertBranchMatch');

const ADMIN = ['admin', 'super_admin', 'hr_manager'];
const MANAGER = [...ADMIN, 'manager'];

// ─── W1133 cross-branch isolation helpers (W269 doctrine) ──────────────────────
// These modules carry a denormalized `branchId` (derived from the employee by
// models/HR/hrBranchScope.plugin.js), so the standard branch filter +
// per-doc assertion apply. `scope` is `null` for org-wide modules (comp-bands,
// policies, surveys, kudos, positions) which are intentionally NOT branch-gated.

/**
 * MongoDB filter clause that restricts a list query to the caller's branch.
 * No-op (`{}`) for cross-branch/HQ roles. When `allowNullBranch` is set
 * (candidate-keyed modules like visas), unassigned (null-branch) rows stay
 * visible alongside the caller's own branch.
 */
function listScopeFilter(req, scope) {
  if (!scope) return {};
  const bf = branchFilter(req); // {} | {branchId: X} | {branchId: {$in:[...]}}
  if (bf.branchId === undefined) return {}; // unrestricted / no scope populated
  if (scope.allowNullBranch) {
    return { $or: [{ branchId: bf.branchId }, { branchId: null }] };
  }
  return bf;
}

/**
 * Enforce W269 ownership on a single loaded doc. Returns `true` when it has
 * already sent a 403 (caller must `return`), `false` when access is allowed.
 * `allowNullBranch` lets unassigned (null-branch) docs through.
 */
function guardDocBranch(req, res, docBranchId, label, allowNullBranch) {
  if (allowNullBranch && (docBranchId === null || docBranchId === undefined)) return false;
  try {
    assertBranchMatch(req, docBranchId, label);
    return false;
  } catch (err) {
    res.status(err.status || 403).json({ success: false, message: err.message });
    return true;
  }
}

function createHrModulesRouter({ logger } = {}) {
  const router = express.Router();

  // W1133 — populate req.branchScope for every HR-module route so branchFilter /
  // assertBranchMatch enforce cross-branch isolation. Mounted after `authenticate`
  // (app.js), so req.user is present; cross-branch/HQ roles get allBranches.
  router.use(requireBranchAccess);

  function tryLoad(key, path) {
    try {
      return require(path);
    } catch (err) {
      logger?.warn?.(`[hr-modules] ${key} unavailable: ${err.message}`);
      return null;
    }
  }

  // ─── Generic helpers: tiny CRUD factory to keep this file scan-friendly ────
  function attachCrud(prefix, modelPath, opts = {}) {
    const {
      readRoles = MANAGER,
      writeRoles = ADMIN,
      // W1133 — when set (`{ allowNullBranch? }`), this module is branch-isolated:
      // lists are branch-filtered and id/PATCH paths assert per-doc ownership.
      scope = null,
      indexQuery = req => {
        const f = {};
        for (const k of ['status', 'employeeId']) {
          if (req.query[k]) f[k] = req.query[k];
        }
        return f;
      },
    } = opts;

    router.get(prefix, authorize(readRoles), async (req, res) => {
      try {
        const M = tryLoad(prefix, modelPath);
        if (!M) return res.json({ success: true, data: { items: [], total: 0, available: false } });
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const filter = { ...indexQuery(req), ...listScopeFilter(req, scope) };
        const [items, total] = await Promise.all([
          M.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean({ virtuals: true }),
          M.countDocuments(filter),
        ]);
        res.json({
          success: true,
          data: { items, total, pagination: { page, pages: Math.ceil(total / limit), limit } },
        });
      } catch (err) {
        safeError(res, err, `hr-modules ${prefix}`);
      }
    });

    router.post(prefix, authorize(writeRoles), async (req, res) => {
      try {
        const M = tryLoad(prefix, modelPath);
        if (!M) return res.status(503).json({ success: false, message: 'model unavailable' });
        const doc = await M.create({ ...req.body });
        res.status(201).json({ success: true, data: doc });
      } catch (err) {
        safeError(res, err, `hr-modules ${prefix}.create`);
      }
    });

    router.get(`${prefix}/:id`, authorize(readRoles), async (req, res) => {
      try {
        const M = tryLoad(prefix, modelPath);
        if (!M) return res.status(503).json({ success: false, message: 'model unavailable' });
        const doc = await M.findById(req.params.id).lean({ virtuals: true });
        if (!doc) return res.status(404).json({ success: false, message: 'not found' });
        if (
          scope &&
          guardDocBranch(req, res, doc.branchId, `hr ${prefix}`, scope.allowNullBranch)
        ) {
          return;
        }
        res.json({ success: true, data: doc });
      } catch (err) {
        safeError(res, err, `hr-modules ${prefix}.get`);
      }
    });

    router.patch(`${prefix}/:id`, authorize(writeRoles), async (req, res) => {
      try {
        const M = tryLoad(prefix, modelPath);
        if (!M) return res.status(503).json({ success: false, message: 'model unavailable' });
        // W1133 — verify branch ownership BEFORE mutating (cross-branch write block).
        if (scope) {
          const existing = await M.findById(req.params.id).select('branchId').lean();
          if (!existing) return res.status(404).json({ success: false, message: 'not found' });
          if (guardDocBranch(req, res, existing.branchId, `hr ${prefix}`, scope.allowNullBranch)) {
            return;
          }
        }
        const doc = await M.findByIdAndUpdate(
          req.params.id,
          { $set: stripUpdateMeta(req.body) },
          // W1448: runValidators so a bad enum / negative-money update is rejected (400)
          // instead of silently persisting invalid data across the generic HR CRUD modules.
          { returnDocument: 'after', runValidators: true }
        );
        if (!doc) return res.status(404).json({ success: false, message: 'not found' });
        res.json({ success: true, data: doc });
      } catch (err) {
        safeError(res, err, `hr-modules ${prefix}.update`);
      }
    });
  }

  // ─── Attach the 11 CRUD modules ────────────────────────────────────────────
  // W1133 — `scope` marks the employee-private modules (financial / PII) that are
  // branch-isolated (branchId denormalized from the employee). The org-wide
  // modules below (comp-bands, positions, surveys, kudos, policies) are
  // intentionally NOT branch-gated: they are shared configuration / recognition.
  attachCrud('/onboarding', '../../models/HR/OnboardingChecklist', { scope: {} });
  attachCrud('/loans', '../../models/HR/Loan', { scope: {} });
  attachCrud('/travel', '../../models/HR/TravelRequest', { scope: {} });
  attachCrud('/health-insurance', '../../models/HR/HealthInsurance', { scope: {} });
  attachCrud('/comp-bands', '../../models/HR/CompensationBand', { readRoles: ADMIN });
  attachCrud('/positions', '../../models/HR/WorkforcePosition', { readRoles: ADMIN });
  attachCrud('/surveys', '../../models/HR/Survey');
  attachCrud('/assets', '../../models/HR/AssetAssignment', { scope: {} });
  attachCrud('/kudos', '../../models/HR/Kudos', {
    readRoles: ['admin', 'super_admin', 'hr_manager', 'manager', 'employee'],
    writeRoles: ['admin', 'super_admin', 'hr_manager', 'manager', 'employee'],
    indexQuery: req => {
      const f = { publicVisible: true };
      if (req.query.toEmployeeId) f.toEmployeeId = req.query.toEmployeeId;
      if (req.query.fromEmployeeId) f.fromEmployeeId = req.query.fromEmployeeId;
      return f;
    },
  });
  attachCrud('/policies', '../../models/HR/Policy', { readRoles: MANAGER });
  attachCrud('/shift-swaps', '../../models/HR/ShiftSwap', { scope: {} });
  // Visas allow null-branch rows (candidate visas have no employee yet).
  attachCrud('/visas', '../../models/HR/VisaRequest', { scope: { allowNullBranch: true } });

  // ─── Special actions ────────────────────────────────────────────────────────

  // POST /onboarding/:id/items/:itemKey/complete — tick a checklist item
  router.post('/onboarding/:id/items/:itemKey/complete', authorize(MANAGER), async (req, res) => {
    try {
      const M = tryLoad('OnboardingChecklist', '../../models/HR/OnboardingChecklist');
      if (!M) return res.status(503).json({ success: false, message: 'model unavailable' });
      const doc = await M.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'not found' });
      if (guardDocBranch(req, res, doc.branchId, 'hr /onboarding')) return; // W1133
      const item = doc.items.find(i => i.key === req.params.itemKey);
      if (!item) return res.status(404).json({ success: false, message: 'item not found' });
      item.completedAt = new Date();
      item.completedByUserId = req.user?._id || null;
      item.completedByName = req.user?.name || req.user?.email || null;
      if (req.body?.notes) item.notes = String(req.body.notes).slice(0, 500);
      // Auto-complete the flow when every required item is done
      const allRequiredDone = doc.items.filter(i => i.required).every(i => i.completedAt);
      if (allRequiredDone && doc.status === 'active') {
        doc.status = 'completed';
        doc.completedAt = new Date();
      }
      await doc.save();
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'hr-modules onboarding.complete');
    }
  });

  // POST /onboarding/start — bootstrap from a default template
  router.post('/onboarding/start', authorize(ADMIN), async (req, res) => {
    try {
      const M = tryLoad('OnboardingChecklist', '../../models/HR/OnboardingChecklist');
      if (!M) return res.status(503).json({ success: false, message: 'model unavailable' });
      const { employeeId, flow = 'onboarding', targetCompletionDate } = req.body || {};
      if (!employeeId)
        return res.status(400).json({ success: false, message: 'employeeId required' });
      const template =
        flow === 'offboarding' ? M.DEFAULT_OFFBOARDING_ITEMS : M.DEFAULT_ONBOARDING_ITEMS;
      const doc = await M.create({
        employeeId,
        flow,
        targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : null,
        items: template,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'hr-modules onboarding.start');
    }
  });

  // POST /surveys/:id/respond — submit a survey response (employee-side)
  router.post('/surveys/:id/respond', async (req, res) => {
    try {
      const M = tryLoad('Survey', '../../models/HR/Survey');
      if (!M) return res.status(503).json({ success: false, message: 'model unavailable' });
      const survey = await M.findById(req.params.id);
      if (!survey) return res.status(404).json({ success: false, message: 'not found' });
      if (survey.status !== 'active')
        return res.status(400).json({ success: false, message: 'survey not active' });
      survey.responses.push({
        employeeId: survey.anonymous ? null : req.user?._id || null,
        answers: req.body?.answers || {},
      });
      await survey.save();
      res.json({ success: true, data: { responseCount: survey.responses.length } });
    } catch (err) {
      safeError(res, err, 'hr-modules survey.respond');
    }
  });

  // POST /policies/:id/acknowledge — employee acknowledges a policy
  router.post('/policies/:id/acknowledge', async (req, res) => {
    try {
      const M = tryLoad('Policy', '../../models/HR/Policy');
      if (!M) return res.status(503).json({ success: false, message: 'model unavailable' });
      const policy = await M.findById(req.params.id);
      if (!policy) return res.status(404).json({ success: false, message: 'not found' });
      if (policy.status !== 'published') {
        return res.status(400).json({ success: false, message: 'policy not published' });
      }
      const employeeId = req.user?._id;
      if (!employeeId) return res.status(401).json({ success: false, message: 'auth required' });
      const already = policy.acknowledgements.find(
        a => String(a.employeeId) === String(employeeId)
      );
      if (already) return res.json({ success: true, data: { alreadyAcknowledged: true } });
      policy.acknowledgements.push({
        employeeId,
        acknowledgedAt: new Date(),
        ipAddress: req.ip,
        policyVersion: policy.version,
      });
      await policy.save();
      res.json({ success: true, data: { acknowledgedCount: policy.acknowledgements.length } });
    } catch (err) {
      safeError(res, err, 'hr-modules policy.ack');
    }
  });

  // POST /assets/:id/return — mark an asset returned
  router.post('/assets/:id/return', authorize(ADMIN), async (req, res) => {
    try {
      const M = tryLoad('AssetAssignment', '../../models/HR/AssetAssignment');
      if (!M) return res.status(503).json({ success: false, message: 'model unavailable' });
      const a = await M.findById(req.params.id);
      if (!a) return res.status(404).json({ success: false, message: 'not found' });
      if (guardDocBranch(req, res, a.branchId, 'hr /assets')) return; // W1133
      a.status = 'returned';
      a.returnedAt = new Date();
      if (req.body?.conditionOnReturn) a.conditionOnReturn = req.body.conditionOnReturn;
      if (req.body?.notes) a.notes = req.body.notes;
      await a.save();
      res.json({ success: true, data: a });
    } catch (err) {
      safeError(res, err, 'hr-modules asset.return');
    }
  });

  // POST /loans/:id/approve | reject
  router.post('/loans/:id/approve', authorize(ADMIN), async (req, res) => {
    try {
      const M = tryLoad('Loan', '../../models/HR/Loan');
      if (!M) return res.status(503).json({ success: false, message: 'model unavailable' });
      const loan = await M.findById(req.params.id);
      if (!loan) return res.status(404).json({ success: false, message: 'not found' });
      if (guardDocBranch(req, res, loan.branchId, 'hr /loans')) return; // W1133
      loan.status = 'approved';
      loan.approvedByUserId = req.user?._id;
      loan.approvedAt = new Date();
      loan.outstandingAmount = loan.principalAmount;
      // Auto-generate schedule
      const months = Math.max(1, loan.installments || 1);
      const monthlyDeduction = Math.ceil(loan.principalAmount / months);
      loan.monthlyDeduction = monthlyDeduction;
      const startDate = loan.startDate ? new Date(loan.startDate) : new Date();
      loan.schedule = [];
      for (let i = 1; i <= months; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        loan.schedule.push({
          installmentNumber: i,
          dueDate,
          amount:
            i === months
              ? loan.principalAmount - monthlyDeduction * (months - 1)
              : monthlyDeduction,
          status: 'scheduled',
        });
      }
      await loan.save();
      res.json({ success: true, data: loan });
    } catch (err) {
      safeError(res, err, 'hr-modules loan.approve');
    }
  });

  // ─── Org Chart ──────────────────────────────────────────────────────────────
  router.get('/org-chart', authorize(MANAGER), async (_req, res) => {
    try {
      const Employee = tryLoad('Employee', '../../models/HR/Employee');
      if (!Employee)
        return res.status(503).json({ success: false, message: 'Employee model unavailable' });
      const employees = await Employee.find({ status: 'active' })
        .select('fullName name nameAr employeeNumber managerId jobTitle department avatar')
        .limit(5000)
        .lean();
      // Build adjacency: parent → [children]
      const byId = new Map(employees.map(e => [String(e._id), { ...e, _children: [] }]));
      const roots = [];
      for (const node of byId.values()) {
        const parentId = node.managerId ? String(node.managerId) : null;
        if (parentId && byId.has(parentId)) {
          byId.get(parentId)._children.push(node);
        } else {
          roots.push(node);
        }
      }
      res.json({ success: true, data: { roots, total: employees.length } });
    } catch (err) {
      safeError(res, err, 'hr-modules org-chart');
    }
  });

  // ─── Time-off calendar ──────────────────────────────────────────────────────
  router.get('/time-off-calendar', authorize(MANAGER), async (req, res) => {
    try {
      const LeaveRequest = tryLoad('LeaveRequest', '../../models/LeaveRequest');
      if (!LeaveRequest) return res.json({ success: true, data: { items: [] } });
      const now = new Date();
      const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
      const year = parseInt(req.query.year, 10) || now.getFullYear();
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      const leaves = await LeaveRequest.find({
        status: 'approved',
        $or: [
          { startDate: { $gte: start, $lte: end } },
          { endDate: { $gte: start, $lte: end } },
          { $and: [{ startDate: { $lte: start } }, { endDate: { $gte: end } }] },
        ],
      })
        .populate('employeeId', 'fullName name nameAr employeeNumber department')
        .limit(500)
        .lean();
      res.json({
        success: true,
        data: {
          month,
          year,
          items: leaves.map(l => ({
            _id: String(l._id),
            employeeId: l.employeeId,
            startDate: l.startDate,
            endDate: l.endDate,
            leaveType: l.leaveType,
            totalDays: l.totalDays,
          })),
        },
      });
    } catch (err) {
      safeError(res, err, 'hr-modules time-off-calendar');
    }
  });

  // ─── WPS / Wage Protection Export ──────────────────────────────────────────
  // Generates a JSON-shaped representation of monthly salaries in the
  // shape required by Saudi MoL WPS. The actual SAMA-formatted file
  // is converted by a separate offline tool.
  router.get('/wps/export', authorize(ADMIN), async (req, res) => {
    try {
      const Payroll = tryLoad('Payroll', '../../models/payroll.model');
      const Employee = tryLoad('Employee', '../../models/HR/Employee');
      if (!Payroll || !Employee)
        return res.status(503).json({ success: false, message: 'models unavailable' });
      const now = new Date();
      const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
      const year = parseInt(req.query.year, 10) || now.getFullYear();
      const payrolls = await Payroll.find({ month, year, 'payment.status': 'paid' })
        .lean()
        .catch(() => []);
      const empIds = [...new Set(payrolls.map(p => String(p.employeeId)).filter(Boolean))];
      const employees = await Employee.find({ _id: { $in: empIds } })
        .select(
          'fullName name nameAr employeeNumber nationality iqamaNumber gosiNumber iban bankName'
        )
        .lean();
      const empById = new Map(employees.map(e => [String(e._id), e]));

      const rows = payrolls.map(p => {
        const emp = empById.get(String(p.employeeId)) || {};
        return {
          employeeId: String(p.employeeId),
          employeeNumber: emp.employeeNumber,
          fullName: emp.fullName || emp.nameAr || emp.name,
          nationality: emp.nationality,
          iqamaNumber: emp.iqamaNumber || null,
          gosiNumber: emp.gosiNumber || null,
          iban: emp.iban || null,
          bankName: emp.bankName || null,
          month,
          year,
          basicSalary: p.baseSalary ?? 0,
          allowances: p.calculations?.totalAllowances ?? 0,
          deductions: p.calculations?.totalDeductions ?? 0,
          netSalary: p.calculations?.totalNet ?? 0,
          paidAt: p.payment?.paidAt,
        };
      });

      res.json({
        success: true,
        data: {
          period: { month, year },
          generatedAt: new Date().toISOString(),
          rowCount: rows.length,
          totals: {
            basic: rows.reduce((s, r) => s + (r.basicSalary || 0), 0),
            net: rows.reduce((s, r) => s + (r.netSalary || 0), 0),
          },
          missingIban: rows.filter(r => !r.iban).length,
          rows,
        },
      });
    } catch (err) {
      safeError(res, err, 'hr-modules wps.export');
    }
  });

  return router;
}

module.exports = { createHrModulesRouter };

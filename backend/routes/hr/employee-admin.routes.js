/**
 * employee-admin.routes.js — Phase 11 Commit 8 (4.0.25).
 *
 * HR-admin employee directory + detail endpoints.
 *
 *   GET /api/v1/hr/employees
 *        ?branchId=  status=  department=  q=  page=  perPage=
 *
 *   GET /api/v1/hr/employees/:id
 *
 * Role-gated at the service layer (`employeeAdminService`). A caller
 * below INTERNAL tier gets 403 with audit trail; HQ roles are
 * cross-branch; sub-HQ roles are scoped to their own branch.
 *
 * Auth is applied by the caller when mounting (see app.js).
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');

function createEmployeeAdminRouter({
  service,
  auditService = null,
  dataExportService = null,
  logger = console,
} = {}) {
  if (
    service == null ||
    typeof service.listEmployees !== 'function' ||
    typeof service.getEmployeeById !== 'function'
  ) {
    throw new Error(
      'createEmployeeAdminRouter: service with listEmployees + getEmployeeById required'
    );
  }

  const router = express.Router();

  function resolveCallerContext(req) {
    return {
      role: req.user && req.user.role ? req.user.role : null,
      callerUserId: req.user ? req.user.id || req.user._id : null,
      callerBranchId:
        req.user && (req.user.branchId || req.user.branch_id)
          ? req.user.branchId || req.user.branch_id
          : null,
      selfEmployeeId:
        req.user && (req.user.employeeId || req.user.employee_id)
          ? req.user.employeeId || req.user.employee_id
          : null,
      ipAddress: req.ip,
    };
  }

  router.get('/employees', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'auth required' });
      const ctx = resolveCallerContext(req);

      const { branchId, status, department, q, page, perPage } = req.query;

      if (branchId != null && !mongoose.Types.ObjectId.isValid(String(branchId))) {
        return res.status(400).json({ error: 'invalid branchId' });
      }

      const result = await service.listEmployees({
        filters: {
          branchId: branchId ? new mongoose.Types.ObjectId(String(branchId)) : null,
          status: status || null,
          department: department || null,
          q: q || null,
          page,
          perPage,
        },
        ...ctx,
      });

      if (result.access === 'denied') {
        return res.status(403).json({ error: result.reason });
      }
      return res.json(result);
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[HrEmployeeList]', err.message || err);
      }
      return res.status(500).json({ error: 'list failed' });
    }
  });

  router.patch('/employees/:id', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'auth required' });
      if (typeof service.updateEmployee !== 'function') {
        return res.status(500).json({ error: 'update not supported' });
      }
      const ctx = resolveCallerContext(req);

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'invalid employee id' });
      }

      const result = await service.updateEmployee({
        employeeId: new mongoose.Types.ObjectId(id),
        role: ctx.role,
        callerUserId: ctx.callerUserId,
        callerBranchId: ctx.callerBranchId,
        patch: req.body,
        ipAddress: ctx.ipAddress,
      });

      if (result.result === 'denied') {
        return res.status(403).json({ error: result.reason });
      }
      if (result.result === 'out_of_branch_scope') {
        return res.status(403).json({ error: 'out_of_branch_scope' });
      }
      if (result.result === 'not_found') {
        return res.status(404).json({ error: 'employee not found' });
      }
      if (result.result === 'invalid') {
        return res.status(400).json({ error: 'validation failed', fields: result.errors });
      }
      if (result.result === 'no_changes') {
        return res.status(409).json({ error: 'no authorized changes in patch' });
      }
      return res.json({
        employee: result.employee,
        changedFields: result.changedFields,
      });
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[HrEmployeePatch]', err.message || err);
      }
      return res.status(500).json({ error: 'update failed' });
    }
  });

  router.get('/employees/:id', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'auth required' });
      const ctx = resolveCallerContext(req);

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'invalid employee id' });
      }

      const result = await service.getEmployeeById({
        employeeId: new mongoose.Types.ObjectId(id),
        ...ctx,
      });

      if (result.access === 'denied') {
        return res.status(403).json({ error: result.reason });
      }
      if (result.access === 'not_found') {
        return res.status(404).json({ error: result.reason });
      }
      return res.json({ employee: result.employee });
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[HrEmployeeDetail]', err.message || err);
      }
      return res.status(500).json({ error: 'detail failed' });
    }
  });

  /**
   * GET /api/v1/hr/employees/:id/access-log
   *
   * Admin counterpart to `/me/access-log` (C15). Lets an HR manager
   * fulfil a DSAR on behalf of a departed employee or one who can't
   * self-serve. Authorization matches the detail view:
   *
   *   • sub-INTERNAL callers are rejected (403 insufficient_privilege)
   *   • sub-HQ callers are scoped to their branch (403 out_of_branch_scope)
   *   • self-access elevation does NOT upgrade tier for this path
   *     (the /me/access-log surface is the self-serve equivalent).
   *
   * Query params: windowDays (1-365, default 90), limit (1-500, default 200).
   */
  router.get('/employees/:id/access-log', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'auth required' });
      if (!auditService || typeof auditService.recentAccessesFor !== 'function') {
        return res.status(503).json({ error: 'access log not available' });
      }
      const ctx = resolveCallerContext(req);

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'invalid employee id' });
      }

      // Delegate the tier + branch-scope check to the admin service's
      // `getEmployeeById` — same authorization envelope as the detail
      // endpoint. We discard the masked record; we only need the
      // auth verdict + the confirmed record existence.
      const gate = await service.getEmployeeById({
        employeeId: new mongoose.Types.ObjectId(id),
        ...ctx,
      });
      if (gate.access === 'denied') {
        return res.status(403).json({ error: gate.reason });
      }
      if (gate.access === 'not_found') {
        return res.status(404).json({ error: gate.reason });
      }

      // Phase 11 C28 — retention-aware DSAR. Admin can request
      // archived rows for formal DSAR fulfilment spanning the
      // archive tier (365-1095 days). Window max stretches to 1095
      // when includeArchived=true.
      const includeArchived = String(req.query.includeArchived || '') === 'true';
      const windowDays = Math.max(
        1,
        Math.min(
          Number.parseInt(String(req.query.windowDays || '90'), 10) || 90,
          includeArchived ? 1095 : 365
        )
      );
      const limit = Math.max(
        1,
        Math.min(Number.parseInt(String(req.query.limit || '200'), 10) || 200, 500)
      );

      const events = await auditService.recentAccessesFor({
        employeeId: id,
        windowDays,
        limit,
        includeArchived,
      });

      const projected = events.map(e => {
        const custom = (e.metadata && e.metadata.custom) || {};
        return {
          at: e.createdAt,
          actor_user_id: e.userId ? String(e.userId) : null,
          actor_role: e.userRole || null,
          action: custom.action || null,
          event_type: e.eventType,
          resource: e.resource,
          is_self_access: Boolean(custom.isSelfAccess),
          ip_address: e.ipAddress || null,
        };
      });

      const now = new Date();
      const since = new Date(now.getTime() - windowDays * 24 * 3600 * 1000);

      // Audit the admin DSAR fulfilment itself — critical for chain-
      // of-custody evidence. `isSelfAccess: false` distinguishes
      // this from /me/access-log self-views.
      if (auditService.logHrAccess) {
        auditService
          .logHrAccess({
            actorUserId: ctx.callerUserId,
            actorRole: ctx.role,
            entityType: 'employee',
            entityId: id,
            action: 'view_access_log_admin',
            isSelfAccess: false,
            ipAddress: ctx.ipAddress,
            metadata: { windowDays, returned: projected.length },
          })
          .catch(() => {});
      }

      return res.json({
        subject: { employee_id: id, access_mode: 'admin_view' },
        window: {
          days: windowDays,
          since: since.toISOString(),
          until: now.toISOString(),
          archived_included: includeArchived,
        },
        events: projected,
        total: projected.length,
      });
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[HrEmployeeAccessLog]', err.message || err);
      }
      return res.status(500).json({ error: 'access log build failed' });
    }
  });

  /**
   * GET /api/v1/hr/employees/:id/data-export
   *
   * Admin counterpart to `/me/data-export` (C17). Lets an HR manager
   * fulfil a PDPL Art. 18 data-portability request on behalf of an
   * employee who can't self-serve (departed, on unpaid leave, legal
   * proceeding, etc.). Auth envelope mirrors `/employees/:id/access-log`:
   *
   *   • sub-INTERNAL callers → 403 insufficient_privilege
   *   • sub-HQ callers scoped to branch → 403 out_of_branch_scope
   *   • HQ tiers see cross-branch
   *   • self-access elevation NOT honored — /me/data-export is the
   *     self-serve path
   *
   * Fires a high-severity `data.exported` audit event with
   * `action: 'data_export_admin'` + `isSelfAccess: false` so the
   * subject sees the export in their own access-log (transparency).
   *
   * 200 — JSON body + Content-Disposition header
   * 400 — invalid ObjectId
   * 401 — auth missing
   * 403 — denied / out_of_branch_scope
   * 404 — employee not found
   * 503 — data export service not wired
   * 500 — unexpected
   */
  router.get('/employees/:id/data-export', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'auth required' });
      if (!dataExportService || typeof dataExportService.buildExport !== 'function') {
        return res.status(503).json({ error: 'data export service not available' });
      }
      const ctx = resolveCallerContext(req);
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'invalid employee id' });
      }

      // Reuse the admin service's gate — same tier + branch check as
      // the detail + access-log endpoints.
      const gate = await service.getEmployeeById({
        employeeId: new mongoose.Types.ObjectId(id),
        ...ctx,
      });
      if (gate.access === 'denied') {
        return res.status(403).json({ error: gate.reason });
      }
      if (gate.access === 'not_found') {
        return res.status(404).json({ error: gate.reason });
      }

      const payload = await dataExportService.buildExport({
        employeeId: new mongoose.Types.ObjectId(id),
      });
      if (payload == null) {
        return res.status(404).json({ error: 'employee not found' });
      }

      if (auditService && auditService.logHrExport) {
        const sections = payload.sections || {};
        const recordCount =
          (Array.isArray(sections.contracts) ? sections.contracts.length : 0) +
          (Array.isArray(sections.certifications) ? sections.certifications.length : 0) +
          (Array.isArray(sections.leaves) ? sections.leaves.length : 0) +
          (Array.isArray(sections.leave_balances) ? sections.leave_balances.length : 0) +
          (Array.isArray(sections.performance_reviews) ? sections.performance_reviews.length : 0) +
          (Array.isArray(sections.change_requests) ? sections.change_requests.length : 0) +
          (Array.isArray(sections.access_log) ? sections.access_log.length : 0) +
          1;
        auditService
          .logHrExport({
            actorUserId: ctx.callerUserId,
            actorRole: ctx.role,
            entityType: 'employee',
            entityId: payload.subject.employee_id,
            action: 'data_export_admin',
            recordCount,
            format: 'json',
            ipAddress: ctx.ipAddress,
            metadata: {
              isSelfAccess: false,
              formatVersion: payload.export_metadata.format_version,
            },
          })
          .catch(() => {});
      }

      const filename = `employee-data-export-admin-${payload.subject.employee_id}-${payload.export_metadata.generated_at.replace(
        /[:.]/g,
        '-'
      )}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(JSON.stringify(payload, null, 2));
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[HrEmployeeAdminExport]', err.message || err);
      }
      return res.status(500).json({ error: 'export failed' });
    }
  });

  return router;
}

module.exports = { createEmployeeAdminRouter };

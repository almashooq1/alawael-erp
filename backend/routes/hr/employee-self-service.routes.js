/**
 * employee-self-service.routes.js — Phase 11 Commit 7 (4.0.24).
 *
 * GET /api/v1/hr/me
 *
 * Employee self-service snapshot: profile + current contract +
 * certifications + leave balance + recent leaves + last review +
 * active red-flags. Every record is masked through the self-access
 * path (PDPL Art. 18 — right to access own data) and every request
 * fires a DATA_READ audit event (PDPL Art. 30 — record of processing).
 *
 * Auth is applied by the caller when mounting (see app.js mount block).
 *
 * Responses:
 *   200 — payload as returned by employeeSelfServiceService.buildSnapshot
 *   401 — req.user missing (should not happen post-authenticate middleware)
 *   404 — no Employee is linked to the authenticated user account
 *   500 — unexpected error
 */

'use strict';

const express = require('express');

function createEmployeeSelfServiceRouter({
  service,
  auditService = null,
  dataExportService = null,
  logger = console,
} = {}) {
  if (service == null || typeof service.buildSnapshot !== 'function') {
    throw new Error('createEmployeeSelfServiceRouter: service with buildSnapshot() is required');
  }

  const router = express.Router();

  router.get('/me', async (req, res) => {
    try {
      if (!req.user || !(req.user.id || req.user._id)) {
        return res.status(401).json({ error: 'authenticated user required' });
      }
      const userId = req.user.id || req.user._id;
      const role = req.user.role || null;

      const snapshot = await service.buildSnapshot({ userId, role });

      if (snapshot == null) {
        // Audit the denied/unavailable access: the caller is authenticated
        // but no HR record is attached to their user account.
        if (auditService) {
          auditService
            .logHrAccessDenied({
              actorUserId: userId,
              actorRole: role,
              entityType: 'self',
              action: 'view',
              reason: 'no_linked_employee',
              ipAddress: req.ip,
            })
            .catch(() => {});
        }
        return res.status(404).json({ error: 'no Employee record linked to this user' });
      }

      // PDPL Art. 30 — record the self-service access. Fire-and-forget.
      if (auditService) {
        auditService
          .logHrAccess({
            actorUserId: userId,
            actorRole: role,
            entityType: 'employee',
            entityId: snapshot.subject.employee_id,
            action: 'self_service_view',
            isSelfAccess: true,
            ipAddress: req.ip,
            metadata: {
              sections: Object.keys(snapshot.sections || {}).length,
            },
          })
          .catch(() => {});
      }

      return res.json(snapshot);
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[HrSelfService]', err.message || err);
      }
      return res.status(500).json({ error: 'self-service snapshot failed' });
    }
  });

  /**
   * PATCH /api/v1/hr/me
   *
   * Self-update contact fields. Accepts ONLY whitelisted paths (see
   * config/hr-self-editable-fields.js). Returns updated masked record.
   *
   * 200 — updated
   * 400 — validation errors (per-field messages)
   * 401 — auth missing
   * 404 — no Employee linked to this user
   * 409 — empty patch (no-op)
   * 500 — unexpected
   */
  /**
   * GET /api/v1/hr/me/access-log
   *
   * PDPL Art. 18 Data Subject Access Request surface. Returns every
   * HR DATA_READ + DATA_EXPORTED audit event targeting the caller's
   * Employee record in the last N days (default 90). Employees get
   * a self-serve answer to "who has looked at my data?"
   *
   * Query parameters:
   *   windowDays  (optional, default 90, capped at 365)
   *   limit       (optional, default 200, capped at 500)
   *
   * Response:
   *   {
   *     subject: { user_id, employee_id, access_mode: 'self' },
   *     window: { days: 90, since: '2026-01-22T...', until: '2026-04-22T...' },
   *     events: [ { at, actorUserId, actorRole, action, resource, isSelfAccess, ipAddress } ],
   *     total: <events.length>
   *   }
   *
   * 200 — payload returned
   * 401 — auth missing
   * 404 — no Employee linked
   * 500 — unexpected
   */
  router.get('/me/access-log', async (req, res) => {
    try {
      if (!req.user || !(req.user.id || req.user._id)) {
        return res.status(401).json({ error: 'authenticated user required' });
      }
      const userId = req.user.id || req.user._id;
      const role = req.user.role || null;

      if (!auditService || typeof auditService.recentAccessesFor !== 'function') {
        return res.status(503).json({ error: 'access log not available' });
      }
      if (typeof service.buildSnapshot !== 'function') {
        return res.status(500).json({ error: 'self-service not supported' });
      }

      // Reuse the snapshot pathway to resolve user → employee id.
      // Only the subject field is needed; the full snapshot is
      // wasted work but it's the canonical resolver.
      const snapshot = await service.buildSnapshot({ userId, role });
      if (snapshot == null) {
        if (auditService.logHrAccessDenied) {
          auditService
            .logHrAccessDenied({
              actorUserId: userId,
              actorRole: role,
              entityType: 'self',
              action: 'view_access_log',
              reason: 'no_linked_employee',
              ipAddress: req.ip,
            })
            .catch(() => {});
        }
        return res.status(404).json({ error: 'no Employee record linked to this user' });
      }

      const employeeId = snapshot.subject.employee_id;

      // Phase 11 C28 — retention-aware DSAR. Employee can request
      // their own archived events by passing includeArchived=true.
      // PDPL Art. 18 grants unlimited access to own data, so the
      // window max stretches from 365 → 1095 when archived is in scope.
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
        employeeId,
        windowDays,
        limit,
        includeArchived,
      });

      // Project only the fields the employee needs to see. Keep it
      // narrow — this is a PDPL disclosure surface, not a full
      // audit-log dump. Internal IDs + resource strings are fine,
      // but we omit request/response bodies, geolocation, and
      // device fingerprints here to avoid confusing the employee
      // with operational chrome.
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

      if (auditService.logHrAccess) {
        auditService
          .logHrAccess({
            actorUserId: userId,
            actorRole: role,
            entityType: 'employee',
            entityId: employeeId,
            action: 'view_access_log',
            isSelfAccess: true,
            ipAddress: req.ip,
            metadata: { windowDays, returned: projected.length },
          })
          .catch(() => {});
      }

      return res.json({
        subject: {
          user_id: String(userId),
          employee_id: employeeId,
          access_mode: 'self',
        },
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
        logger.error('[HrSelfServiceAccessLog]', err.message || err);
      }
      return res.status(500).json({ error: 'access log build failed' });
    }
  });

  /**
   * GET /api/v1/hr/me/data-export
   *
   * PDPL Art. 18 Data Portability. Returns a comprehensive JSON
   * document with every HR record about the calling employee +
   * their 365-day access log. Streams with
   * `Content-Disposition: attachment` so browsers trigger download.
   *
   * 200 — JSON body + download header
   * 401 — auth missing
   * 404 — no Employee linked to user
   * 503 — data export service not wired
   * 500 — unexpected
   */
  router.get('/me/data-export', async (req, res) => {
    try {
      if (!req.user || !(req.user.id || req.user._id)) {
        return res.status(401).json({ error: 'authenticated user required' });
      }
      if (!dataExportService || typeof dataExportService.buildExport !== 'function') {
        return res.status(503).json({ error: 'data export service not available' });
      }
      const userId = req.user.id || req.user._id;
      const role = req.user.role || null;

      const payload = await dataExportService.buildExport({ userId });
      if (payload == null) {
        if (auditService && auditService.logHrAccessDenied) {
          auditService
            .logHrAccessDenied({
              actorUserId: userId,
              actorRole: role,
              entityType: 'self',
              action: 'data_export',
              reason: 'no_linked_employee',
              ipAddress: req.ip,
            })
            .catch(() => {});
        }
        return res.status(404).json({ error: 'no Employee record linked to this user' });
      }

      // Fire a high-severity data.exported audit event — exports are
      // the loudest event type in the audit vocabulary. Records counts
      // per section so auditors can see the scope of the dump.
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
          1; // profile
        auditService
          .logHrExport({
            actorUserId: userId,
            actorRole: role,
            entityType: 'employee',
            entityId: payload.subject.employee_id,
            action: 'data_export_self',
            recordCount,
            format: 'json',
            ipAddress: req.ip,
            metadata: {
              isSelfAccess: true,
              formatVersion: payload.export_metadata.format_version,
            },
          })
          .catch(() => {});
      }

      const filename = `employee-data-export-${payload.subject.employee_id}-${payload.export_metadata.generated_at.replace(
        /[:.]/g,
        '-'
      )}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(JSON.stringify(payload, null, 2));
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[HrSelfServiceExport]', err.message || err);
      }
      return res.status(500).json({ error: 'export failed' });
    }
  });

  router.patch('/me', async (req, res) => {
    try {
      if (!req.user || !(req.user.id || req.user._id)) {
        return res.status(401).json({ error: 'authenticated user required' });
      }
      const userId = req.user.id || req.user._id;
      const role = req.user.role || null;

      if (typeof service.updateSelfProfile !== 'function') {
        return res.status(500).json({ error: 'update not supported' });
      }

      const result = await service.updateSelfProfile({
        userId,
        role,
        patch: req.body,
      });

      if (result.result === 'not_linked') {
        if (auditService) {
          auditService
            .logHrAccessDenied({
              actorUserId: userId,
              actorRole: role,
              entityType: 'self',
              action: 'update',
              reason: 'no_linked_employee',
              ipAddress: req.ip,
            })
            .catch(() => {});
        }
        return res.status(404).json({ error: 'no Employee record linked to this user' });
      }

      if (result.result === 'invalid') {
        return res.status(400).json({ error: 'validation failed', fields: result.errors });
      }

      if (result.result === 'no_changes') {
        return res.status(409).json({ error: 'no editable changes in patch' });
      }

      // Success path: fire a data.updated audit with changed-field list.
      // The service returns before/after so the log has evidence of
      // exactly what changed (trimmed to updated fields only — no
      // full-record dump).
      if (auditService && auditService.logHrAccess) {
        auditService
          .logHrAccess({
            actorUserId: userId,
            actorRole: role,
            entityType: 'employee',
            entityId: result.employee && result.employee._id,
            action: 'self_update',
            isSelfAccess: true,
            ipAddress: req.ip,
            metadata: {
              changedFields: result.changedFields,
              changeCount: result.changedFields.length,
            },
          })
          .catch(() => {});
      }

      return res.json({
        employee: result.employee,
        changedFields: result.changedFields,
      });
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[HrSelfServicePatch]', err.message || err);
      }
      return res.status(500).json({ error: 'self-update failed' });
    }
  });

  return router;
}

module.exports = { createEmployeeSelfServiceRouter };

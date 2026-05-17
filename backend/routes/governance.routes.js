'use strict';

/**
 * governance.routes.js — Wave 26.
 *
 *   GET  /permissions/me                              — effective permissions for current user
 *   GET  /permissions/check?codes=...                 — pass/fail for a CSV of codes
 *   GET  /permissions/holders/:code                   — who holds this permission?
 *   GET  /banners?dataKinds=clinical_phi,financial    — banner configs to render
 *   GET  /audit-trail/:entityType/:entityId           — unified timeline
 *   GET  /audit-trail/:entityType/:entityId/export    — sealed export (CSV/JSON)
 *
 * Authentication is enforced upstream (router mounted behind
 * `authenticate` in app.js).
 */

const express = require('express');
const safeError = require('../utils/safeError');

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
    ip: req.ip,
  };
}

function createGovernanceRouter({ governance, auditModel = null, logger = console } = {}) {
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('governance.routes: governance service is required');
  }
  void logger;

  const router = express.Router();

  // GET /permissions/me
  router.get('/permissions/me', async (req, res) => {
    try {
      const actor = actorFrom(req);
      const codes = governance.getUserPermissions(actor.role);
      return res.json({
        success: true,
        data: {
          canonicalRole: actor.role,
          permissions: codes,
          count: codes.length,
        },
      });
    } catch (err) {
      return safeError(res, err, 'governance.permissions.me');
    }
  });

  // GET /permissions/check?codes=a,b,c
  router.get('/permissions/check', async (req, res) => {
    try {
      const actor = actorFrom(req);
      const codes = String(req.query.codes || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (codes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'CODES_REQUIRED',
          reason: 'CODES_REQUIRED',
        });
      }
      const results = {};
      for (const c of codes) {
        results[c] = governance.hasPermission(actor.role, c);
      }
      const all = codes.every(c => results[c]);
      return res.json({ success: true, data: { results, allHeld: all } });
    } catch (err) {
      return safeError(res, err, 'governance.permissions.check');
    }
  });

  // GET /permissions/holders/:code
  router.get('/permissions/holders/:code', async (req, res) => {
    try {
      const reg = require('../intelligence/governance.registry');
      const holders = reg.getHoldersOf(req.params.code);
      if (!holders) {
        return res
          .status(404)
          .json({
            success: false,
            message: 'PERMISSION_NOT_FOUND',
            reason: 'PERMISSION_NOT_FOUND',
          });
      }
      return res.json({
        success: true,
        data: { code: req.params.code, holders },
      });
    } catch (err) {
      return safeError(res, err, 'governance.permissions.holders');
    }
  });

  // GET /banners?dataKinds=a,b
  router.get('/banners', async (req, res) => {
    try {
      const kinds = String(req.query.dataKinds || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const banners = governance.getBannersForDataKinds(kinds);
      return res.json({ success: true, data: { banners, count: banners.length } });
    } catch (err) {
      return safeError(res, err, 'governance.banners');
    }
  });

  // GET /audit-trail/:entityType/:entityId
  router.get('/audit-trail/:entityType/:entityId', async (req, res) => {
    try {
      const viewer = actorFrom(req);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
      const result = await governance.getAuditTrail({
        entityType: req.params.entityType,
        entityId: req.params.entityId,
        viewer,
        auditModel,
        limit,
        // entityDoc would be provided by the upstream caller in production;
        // this endpoint reads from AuditLog only by default.
        entityDoc: null,
      });
      if (!result.ok) {
        return res
          .status(400)
          .json({ success: false, message: result.reason, reason: result.reason });
      }
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'governance.auditTrail.read');
    }
  });

  // GET /audit-trail/:entityType/:entityId/export?format=csv
  router.get('/audit-trail/:entityType/:entityId/export', async (req, res) => {
    try {
      const viewer = actorFrom(req);
      if (!governance.hasPermission(viewer.role, 'governance.audit-trail.export')) {
        return res
          .status(403)
          .json({
            success: false,
            message: 'EXPORT_NOT_PERMITTED',
            reason: 'EXPORT_NOT_PERMITTED',
          });
      }
      const format = String(req.query.format || 'json').toLowerCase();
      if (!['csv', 'json'].includes(format)) {
        return res
          .status(400)
          .json({ success: false, message: 'INVALID_FORMAT', reason: 'INVALID_FORMAT' });
      }
      const result = await governance.getAuditTrail({
        entityType: req.params.entityType,
        entityId: req.params.entityId,
        viewer,
        auditModel,
        limit: 500,
        entityDoc: null,
      });
      if (!result.ok) {
        return res
          .status(400)
          .json({ success: false, message: result.reason, reason: result.reason });
      }
      if (format === 'csv') {
        const header = 'at,kind,actorUserId,actorRole,action,from,to,reason\n';
        const rows = (result.events || [])
          .map(e =>
            [
              e.at ? new Date(e.at).toISOString() : '',
              e.kind || '',
              e.actorUserId || '',
              e.actorRole || '',
              e.action || e.subKind || '',
              e.from || '',
              e.to || '',
              (e.reason || '').replace(/[,\n]/g, ' '),
            ].join(',')
          )
          .join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="audit-${req.params.entityType}-${req.params.entityId}.csv"`
        );
        return res.send(header + rows);
      }
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'governance.auditTrail.export');
    }
  });

  return router;
}

module.exports = { createGovernanceRouter };

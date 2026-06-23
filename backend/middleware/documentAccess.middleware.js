'use strict';

/**
 * Document Access Middleware
 * ═══════════════════════════
 * التحقق من صلاحيات الوصول إلى المستندات.
 */

const mongoose = require('mongoose');
const Document = require('../models/Document');
const documentACLService = require('../services/documents/documentACL.service');
const { DocumentShareAccessLog } = require('../services/documents/documentSharing.service');

const ACTIONS = ['view', 'download', 'edit', 'share', 'delete'];

/**
 * Middleware factory: checks document access permission.
 * @param {string} action - one of view/download/edit/share/delete
 * @param {Object} options - { paramName: 'id', allowOwner: true, allowPublic: false }
 */
function requireDocumentAccess(action = 'view', options = {}) {
  const { paramName = 'id', allowOwner = true, allowPublic = false } = options;

  return async (req, res, next) => {
    try {
      const docId = req.params[paramName];
      if (!mongoose.isValidObjectId(docId)) {
        return res.status(400).json({ success: false, message: 'معرّف المستند غير صالح' });
      }

      const doc = await Document.findById(docId);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'المستند غير موجود' });
      }

      // Public documents allow view only
      if (allowPublic && doc.isPublic && action === 'view') {
        req.document = doc;
        return next();
      }

      const userId = req.user?.id || req.user?._id;

      // Owner bypass
      if (allowOwner && String(doc.uploadedBy) === String(userId)) {
        req.document = doc;
        return next();
      }

      // ACL check
      const aclCheck = await documentACLService.checkPermission(userId, docId, action);
      if (aclCheck.allowed) {
        req.document = doc;
        // Log access
        try {
          await new DocumentShareAccessLog({
            documentId: docId,
            userId,
            userName: req.user?.name || '',
            action,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          }).save();
        } catch {
          // ignore logging errors
        }
        return next();
      }

      // Entity-linked documents: basic ownership check via entity (if caller owns entity)
      // This is a fallback; modules should enforce their own entity-level ACLs.
      if (doc.entityType && doc.entityId) {
        // For now, allow if user has a relevant role (modules can refine)
        const allowedRoles = ['admin', 'superadmin', 'super_admin', 'manager'];
        if (allowedRoles.includes(req.user?.role)) {
          req.document = doc;
          return next();
        }
      }

      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول إلى هذا المستند' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };
}

module.exports = {
  requireDocumentAccess,
  ACTIONS,
};

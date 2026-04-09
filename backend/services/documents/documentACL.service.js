'use strict';

/**
 * Document ACL (Access Control List) Service — خدمة صلاحيات المستندات
 * ═════════════════════════════════════════════════════════════════
 * صلاحيات متقدمة: وراثة، قوالب، طلبات وصول، تقارير امتثال
 *
 * @module documentACL.service
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ─── الإجراءات المتاحة ──────────────────────────────
const ACTIONS = {
  view: { labelAr: 'عرض', labelEn: 'View', level: 1 },
  download: { labelAr: 'تحميل', labelEn: 'Download', level: 2 },
  comment: { labelAr: 'تعليق', labelEn: 'Comment', level: 3 },
  edit: { labelAr: 'تعديل', labelEn: 'Edit', level: 4 },
  share: { labelAr: 'مشاركة', labelEn: 'Share', level: 5 },
  delete: { labelAr: 'حذف', labelEn: 'Delete', level: 6 },
  manage_permissions: { labelAr: 'إدارة الصلاحيات', labelEn: 'Manage Permissions', level: 7 },
  admin: { labelAr: 'إدارة كاملة', labelEn: 'Full Admin', level: 8 },
};

// ─── نموذج ACL ──────────────────────────────
const aclSchema = new mongoose.Schema(
  {
    resource: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    resourceType: { type: String, enum: ['document', 'folder', 'collection'], default: 'document' },
    principal: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    principalType: { type: String, enum: ['user', 'group', 'department', 'role'], required: true },
    principalName: String,
    permissions: [{ type: String, enum: Object.keys(ACTIONS) }],
    inherited: { type: Boolean, default: false },
    inheritedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentACL' },
    templateUsed: { type: mongoose.Schema.Types.ObjectId, ref: 'ACLTemplate' },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    grantedByName: String,
    expiresAt: Date,
    conditions: {
      ipWhitelist: [String],
      timeRestriction: { start: String, end: String },
      requireMFA: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    reason: String,
  },
  { timestamps: true, collection: 'document_acl' }
);

aclSchema.index({ resource: 1, principal: 1, principalType: 1 }, { unique: true });
aclSchema.index({ principal: 1, isActive: 1 });
aclSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const DocumentACL = mongoose.models.DocumentACL || mongoose.model('DocumentACL', aclSchema);

// ─── نموذج قالب الصلاحيات ──────────────────
const aclTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: String,
    permissions: [{ type: String, enum: Object.keys(ACTIONS) }],
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_acl_templates' }
);

const ACLTemplate = mongoose.models.ACLTemplate || mongoose.model('ACLTemplate', aclTemplateSchema);

// ─── نموذج طلب الوصول ──────────────────────
const accessRequestSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterName: String,
    requestedPermissions: [{ type: String, enum: Object.keys(ACTIONS) }],
    justification: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedByName: String,
    reviewedAt: Date,
    reviewNote: String,
    expiresAt: Date,
  },
  { timestamps: true, collection: 'document_access_requests' }
);

accessRequestSchema.index({ document: 1, status: 1 });
accessRequestSchema.index({ requester: 1, status: 1 });

const AccessRequest =
  mongoose.models.AccessRequest || mongoose.model('AccessRequest', accessRequestSchema);

// ─── القوالب الافتراضية ──────────────────────
const DEFAULT_TEMPLATES = [
  { name: 'Viewer', nameAr: 'مُطّلع', permissions: ['view'], description: 'عرض فقط' },
  {
    name: 'Commenter',
    nameAr: 'مُعلّق',
    permissions: ['view', 'download', 'comment'],
    description: 'عرض وتعليق',
  },
  {
    name: 'Editor',
    nameAr: 'مُحرّر',
    permissions: ['view', 'download', 'comment', 'edit'],
    description: 'عرض وتعديل',
  },
  {
    name: 'Manager',
    nameAr: 'مُدير',
    permissions: ['view', 'download', 'comment', 'edit', 'share', 'delete'],
    description: 'إدارة',
  },
  {
    name: 'Admin',
    nameAr: 'مُشرف',
    permissions: Object.keys(ACTIONS),
    description: 'صلاحيات كاملة',
  },
  {
    name: 'External Auditor',
    nameAr: 'مُدقّق خارجي',
    permissions: ['view', 'download'],
    description: 'عرض وتحميل فقط',
  },
];

class DocumentACLService {
  // ══════════════════════════════════════════
  //  تهيئة القوالب الافتراضية
  // ══════════════════════════════════════════
  async initializeTemplates(userId) {
    try {
      let created = 0;
      for (const tpl of DEFAULT_TEMPLATES) {
        const exists = await ACLTemplate.findOne({ name: tpl.name });
        if (!exists) {
          await ACLTemplate.create({ ...tpl, isDefault: true, createdBy: userId });
          created++;
        }
      }
      return { success: true, templatesCreated: created };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  تعيين صلاحيات
  // ══════════════════════════════════════════
  async setACL(
    resourceId,
    resourceType,
    principalId,
    principalType,
    permissions,
    grantedBy,
    options = {}
  ) {
    try {
      const existing = await DocumentACL.findOne({
        resource: resourceId,
        principal: principalId,
        principalType,
      });

      if (existing) {
        existing.permissions = permissions;
        existing.grantedBy = grantedBy;
        existing.grantedByName = options.grantedByName;
        existing.expiresAt = options.expiresAt;
        existing.conditions = options.conditions || existing.conditions;
        existing.reason = options.reason;
        existing.isActive = true;
        await existing.save();
        logger.info(
          `[ACL] Updated: ${principalType}:${principalId} on ${resourceType}:${resourceId}`
        );
        return { success: true, acl: existing, action: 'updated' };
      }

      const acl = await DocumentACL.create({
        resource: resourceId,
        resourceType,
        principal: principalId,
        principalType,
        principalName: options.principalName,
        permissions,
        grantedBy,
        grantedByName: options.grantedByName,
        expiresAt: options.expiresAt,
        conditions: options.conditions,
        reason: options.reason,
        templateUsed: options.templateId,
      });

      logger.info(
        `[ACL] Created: ${principalType}:${principalId} on ${resourceType}:${resourceId} [${permissions.join(',')}]`
      );
      return { success: true, acl, action: 'created' };
    } catch (err) {
      logger.error('[ACL] setACL error:', err);
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  تطبيق قالب صلاحيات
  // ══════════════════════════════════════════
  async applyTemplate(templateId, resourceId, principalId, principalType, grantedBy, options = {}) {
    try {
      const template = await ACLTemplate.findById(templateId);
      if (!template) return { success: false, error: 'القالب غير موجود' };

      return this.setACL(
        resourceId,
        'document',
        principalId,
        principalType,
        template.permissions,
        grantedBy,
        {
          ...options,
          templateId,
        }
      );
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  التحقق من صلاحية
  // ══════════════════════════════════════════
  async checkPermission(userId, documentId, action) {
    try {
      // فحص مباشر
      const directACL = await DocumentACL.findOne({
        resource: documentId,
        principal: userId,
        principalType: 'user',
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      });

      if (directACL && directACL.permissions.includes(action)) {
        return { allowed: true, source: 'direct', acl: directACL };
      }

      // فحص admin (يملك كل الصلاحيات)
      if (directACL && directACL.permissions.includes('admin')) {
        return { allowed: true, source: 'admin' };
      }

      // فحص عبر المجموعة/القسم/الدور
      const groupACLs = await DocumentACL.find({
        resource: documentId,
        principalType: { $in: ['group', 'department', 'role'] },
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      });

      for (const acl of groupACLs) {
        if (acl.permissions.includes(action) || acl.permissions.includes('admin')) {
          return { allowed: true, source: acl.principalType, acl };
        }
      }

      // فحص الوراثة
      const inheritedACLs = await DocumentACL.find({
        principal: userId,
        inherited: true,
        isActive: true,
      });

      for (const acl of inheritedACLs) {
        if (acl.permissions.includes(action)) {
          return { allowed: true, source: 'inherited', inheritedFrom: acl.inheritedFrom };
        }
      }

      // فحص مالك المستند
      try {
        const Document = mongoose.model('Document');
        const doc = await Document.findById(documentId).select('createdBy uploadedBy owner');
        const ownerId = String(doc?.createdBy || doc?.uploadedBy || doc?.owner);
        if (ownerId === String(userId)) {
          return { allowed: true, source: 'owner' };
        }
      } catch (e) {
        // ignore
      }

      return { allowed: false, source: 'none' };
    } catch (err) {
      logger.error('[ACL] checkPermission error:', err);
      return { allowed: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  الصلاحيات الفعلية (كل الصلاحيات المجمعة)
  // ══════════════════════════════════════════
  async getEffectivePermissions(userId, documentId) {
    try {
      const allPerms = new Set();
      const sources = [];

      // مالك المستند → كل الصلاحيات
      try {
        const Document = mongoose.model('Document');
        const doc = await Document.findById(documentId).select('createdBy uploadedBy owner');
        const ownerId = String(doc?.createdBy || doc?.uploadedBy || doc?.owner);
        if (ownerId === String(userId)) {
          Object.keys(ACTIONS).forEach(a => allPerms.add(a));
          sources.push({ type: 'owner', permissions: Object.keys(ACTIONS) });
          return { success: true, permissions: [...allPerms], sources, isOwner: true };
        }
      } catch (e) {
        /* ignore */
      }

      // صلاحيات مباشرة
      const directACL = await DocumentACL.findOne({
        resource: documentId,
        principal: userId,
        principalType: 'user',
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      });

      if (directACL) {
        directACL.permissions.forEach(p => allPerms.add(p));
        sources.push({ type: 'direct', permissions: directACL.permissions });
      }

      // صلاحيات المجموعة
      const groupACLs = await DocumentACL.find({
        resource: documentId,
        principalType: { $in: ['group', 'department', 'role'] },
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      });

      for (const acl of groupACLs) {
        acl.permissions.forEach(p => allPerms.add(p));
        sources.push({
          type: acl.principalType,
          name: acl.principalName,
          permissions: acl.permissions,
        });
      }

      // إذا لديه admin → كل الصلاحيات
      if (allPerms.has('admin')) {
        Object.keys(ACTIONS).forEach(a => allPerms.add(a));
      }

      return { success: true, permissions: [...allPerms], sources, isOwner: false };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  جلب صلاحيات المستند
  // ══════════════════════════════════════════
  async getDocumentACL(documentId) {
    try {
      const acls = await DocumentACL.find({
        resource: documentId,
        isActive: true,
      })
        .populate('grantedBy', 'name email')
        .sort({ principalType: 1, createdAt: -1 })
        .lean();

      const byType = { user: [], group: [], department: [], role: [] };
      acls.forEach(acl => {
        if (byType[acl.principalType]) {
          byType[acl.principalType].push({
            ...acl,
            permissionLabels: acl.permissions.map(p => ACTIONS[p]?.labelAr || p),
          });
        }
      });

      return { success: true, documentId, total: acls.length, acls, byType };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  إلغاء صلاحية
  // ══════════════════════════════════════════
  async revokeACL(aclId, revokedBy) {
    try {
      const acl = await DocumentACL.findByIdAndUpdate(aclId, { isActive: false }, { new: true });
      if (!acl) return { success: false, error: 'الصلاحية غير موجودة' };
      logger.info(`[ACL] Revoked: ${aclId} by ${revokedBy}`);
      return { success: true, revoked: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  إلغاء جميع الصلاحيات (طوارئ)
  // ══════════════════════════════════════════
  async revokeAll(documentId, revokedBy, reason) {
    try {
      const result = await DocumentACL.updateMany(
        { resource: documentId, isActive: true },
        { isActive: false }
      );
      logger.warn(`[ACL] EMERGENCY REVOKE ALL: ${documentId} by ${revokedBy} — reason: ${reason}`);
      return { success: true, revoked: result.modifiedCount };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  طلب وصول
  // ══════════════════════════════════════════
  async requestAccess(userId, documentId, data) {
    try {
      const existing = await AccessRequest.findOne({
        document: documentId,
        requester: userId,
        status: 'pending',
      });
      if (existing) return { success: false, error: 'يوجد طلب معلق بالفعل' };

      const request = await AccessRequest.create({
        document: documentId,
        requester: userId,
        requesterName: data.requesterName,
        requestedPermissions: data.permissions || ['view'],
        justification: data.justification,
        expiresAt: data.expiresAt,
      });

      return { success: true, request };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  مراجعة طلب وصول
  // ══════════════════════════════════════════
  async reviewAccessRequest(requestId, reviewerId, decision, reviewNote) {
    try {
      const request = await AccessRequest.findById(requestId);
      if (!request) return { success: false, error: 'الطلب غير موجود' };
      if (request.status !== 'pending') return { success: false, error: 'الطلب ليس معلقاً' };

      request.status = decision; // 'approved' or 'rejected'
      request.reviewedBy = reviewerId;
      request.reviewedAt = new Date();
      request.reviewNote = reviewNote;
      await request.save();

      // إذا وافق → إنشاء ACL
      if (decision === 'approved') {
        await this.setACL(
          request.document,
          'document',
          request.requester,
          'user',
          request.requestedPermissions,
          reviewerId,
          {
            principalName: request.requesterName,
            expiresAt: request.expiresAt,
            reason: `طلب وصول #${request._id}`,
          }
        );
      }

      return { success: true, request, aclCreated: decision === 'approved' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  جلب طلبات الوصول
  // ══════════════════════════════════════════
  async getAccessRequests(options = {}) {
    try {
      const { documentId, status = 'pending', limit = 50 } = options;
      const filter = {};
      if (documentId) filter.document = documentId;
      if (status) filter.status = status;

      const requests = await AccessRequest.find(filter)
        .populate('document', 'title name')
        .populate('requester', 'name email')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return { success: true, count: requests.length, requests };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  القوالب
  // ══════════════════════════════════════════
  async getTemplates() {
    try {
      const templates = await ACLTemplate.find().sort({ name: 1 }).lean();
      return {
        success: true,
        templates: templates.map(t => ({
          ...t,
          permissionLabels: t.permissions.map(p => ACTIONS[p]?.labelAr || p),
        })),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async createTemplate(data, userId) {
    try {
      const template = await ACLTemplate.create({ ...data, createdBy: userId });
      return { success: true, template };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  تقرير الامتثال
  // ══════════════════════════════════════════
  async getComplianceReport(documentId) {
    try {
      const acls = await DocumentACL.find({ resource: documentId, isActive: true }).lean();
      const requests = await AccessRequest.find({ document: documentId }).lean();

      const report = {
        documentId,
        timestamp: new Date(),
        totalACLEntries: acls.length,
        byPrincipalType: {},
        expiringSoon: [],
        noExpiry: [],
        requestHistory: {
          total: requests.length,
          approved: requests.filter(r => r.status === 'approved').length,
          rejected: requests.filter(r => r.status === 'rejected').length,
          pending: requests.filter(r => r.status === 'pending').length,
        },
      };

      const now = new Date();
      const week = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      for (const acl of acls) {
        report.byPrincipalType[acl.principalType] =
          (report.byPrincipalType[acl.principalType] || 0) + 1;
        if (!acl.expiresAt) {
          report.noExpiry.push({
            principal: acl.principalName || acl.principal,
            type: acl.principalType,
            permissions: acl.permissions,
          });
        } else if (acl.expiresAt <= week && acl.expiresAt > now) {
          report.expiringSoon.push({
            principal: acl.principalName || acl.principal,
            expiresAt: acl.expiresAt,
          });
        }
      }

      return { success: true, report };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  الإجراءات المتاحة
  // ══════════════════════════════════════════
  getAvailableActions() {
    return {
      success: true,
      actions: Object.entries(ACTIONS).map(([key, val]) => ({ key, ...val })),
    };
  }

  // ══════════════════════════════════════════
  //  إحصائيات
  // ══════════════════════════════════════════
  async getStats() {
    try {
      const [totalACLs, activeACLs, pendingRequests, byType] = await Promise.all([
        DocumentACL.countDocuments(),
        DocumentACL.countDocuments({ isActive: true }),
        AccessRequest.countDocuments({ status: 'pending' }),
        DocumentACL.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$principalType', count: { $sum: 1 } } },
        ]),
      ]);

      return {
        success: true,
        stats: {
          totalACLs,
          activeACLs,
          pendingRequests,
          byPrincipalType: Object.fromEntries(byType.map(b => [b._id, b.count])),
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new DocumentACLService();

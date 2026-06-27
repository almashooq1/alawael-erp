/**
 * Compliance Service — خدمة ضمان الجودة والاعتماد
 * ══════════════════════════════════════════════════════════
 * Business logic for accreditation tracking, audit management,
 * evidence registry, corrective actions, and review scheduling.
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/* ─── Lazy model getters (avoid circular deps) ─────────────────────────── */
function getModels() {
  try {
    return {
      ComplianceAudit:
        mongoose.models.ComplianceAudit || require('../models/compliance/ComplianceAudit'),
      User: mongoose.models.User || require('../models/User'),
      Branch: mongoose.models.Branch || require('../models/Branch'),
    };
  } catch (err) {
    logger.warn('[Compliance] Model load warning:', err.message);
    return {};
  }
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function formatDateAr(date) {
  if (!date) return 'غير محدد';
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function calculateCompliancePercentage(stats) {
  const applicable = stats.total - stats.notApplicable;
  if (applicable === 0) return 0;
  return Math.round((stats.compliant / applicable) * 100);
}

/* ─── 1. Dashboard Overview ─────────────────────────────────────────── */

async function getComplianceDashboard(branchId, standard) {
  const { ComplianceAudit } = getModels();
  if (!ComplianceAudit) throw new Error('ComplianceAudit model unavailable');

  const filters = {};
  if (branchId) filters.branchId = branchId;
  if (standard) filters.standard = standard;

  const stats = await ComplianceAudit.getDashboardStats(filters);

  const applicable = stats.total - stats.notApplicable;
  const percentage = applicable > 0 ? Math.round((stats.compliant / applicable) * 100) : 0;

  const pendingActions = await ComplianceAudit.countDocuments({
    ...filters,
    'correctiveActions.completed': false,
  });

  const upcomingReviews = await ComplianceAudit.countDocuments({
    ...filters,
    nextReviewDate: {
      $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      $gte: new Date(),
    },
  });

  return {
    summary: {
      total: stats.total,
      compliant: stats.compliant,
      partiallyCompliant: stats.partiallyCompliant,
      nonCompliant: stats.nonCompliant,
      notApplicable: stats.notApplicable,
      pending: stats.pending,
      applicable,
      compliancePercentage: percentage,
      averageScore: Math.round(stats.avgScore || 0),
    },
    kpis: {
      pendingCorrectiveActions: pendingActions,
      upcomingReviews,
      overdueReviews: stats.pending,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/* ─── 2. Audit Trail (Immutable) ────────────────────────────────────── */

async function getAuditTrail(standard, startDate, endDate) {
  const { ComplianceAudit } = getModels();
  if (!ComplianceAudit) throw new Error('ComplianceAudit model unavailable');

  const query = {};
  if (standard) query.standard = standard;
  if (startDate || endDate) {
    query['auditTrail.changedAt'] = {};
    if (startDate) query['auditTrail.changedAt'].$gte = new Date(startDate);
    if (endDate) query['auditTrail.changedAt'].$lte = new Date(endDate);
  }

  const audits = await ComplianceAudit.find(query)
    .select('auditNumber standard criteria status auditTrail createdAt updatedAt')
    .populate('auditTrail.changedBy', 'fullName email')
    .sort({ updatedAt: -1 })
    .lean();

  // Flatten audit trail entries with audit context
  const trail = [];
  for (const audit of audits) {
    if (audit.auditTrail && audit.auditTrail.length > 0) {
      for (const entry of audit.auditTrail) {
        trail.push({
          auditId: audit._id,
          auditNumber: audit.auditNumber,
          standard: audit.standard,
          criteria: audit.criteria,
          status: audit.status,
          ...entry,
        });
      }
    }
  }

  return {
    totalAudits: audits.length,
    totalEntries: trail.length,
    entries: trail.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt)),
  };
}

/* ─── 3. Pending Corrective Actions ─────────────────────────────────── */

async function getPendingCorrectiveActions(branchId) {
  const { ComplianceAudit } = getModels();
  if (!ComplianceAudit) throw new Error('ComplianceAudit model unavailable');

  const raw = await ComplianceAudit.getPendingActions(branchId);

  const actions = [];
  for (const audit of raw) {
    for (const action of audit.correctiveActions || []) {
      if (!action.completed) {
        actions.push({
          auditId: audit._id,
          auditNumber: audit.auditNumber,
          standard: audit.standard,
          criteria: audit.criteria,
          status: audit.status,
          actionId: action._id,
          action: action.action,
          dueDate: action.dueDate,
          responsible: action.responsible,
          overdue: action.dueDate ? new Date(action.dueDate) < new Date() : false,
          daysLeft: action.dueDate
            ? Math.ceil((new Date(action.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null,
        });
      }
    }
  }

  return actions.sort((a, b) => {
    if (a.overdue && !b.overdue) return -1;
    if (!a.overdue && b.overdue) return 1;
    return (a.dueDate || Infinity) - (b.dueDate || Infinity);
  });
}

/* ─── 4. Upcoming Reviews ─────────────────────────────────────────────── */

async function getUpcomingReviews(branchId, days = 30) {
  const { ComplianceAudit } = getModels();
  if (!ComplianceAudit) throw new Error('ComplianceAudit model unavailable');

  return ComplianceAudit.getUpcomingReviews(branchId, days);
}

/* ─── 5. Evidence Registry ──────────────────────────────────────────── */

async function getEvidenceRegistry(auditId) {
  const { ComplianceAudit } = getModels();
  if (!ComplianceAudit) throw new Error('ComplianceAudit model unavailable');

  const audit = await ComplianceAudit.findById(auditId)
    .select('auditNumber standard criteria evidence')
    .populate('evidence.documentId')
    .lean();

  if (!audit) throw new Error('Audit not found');

  return {
    auditId: audit._id,
    auditNumber: audit.auditNumber,
    standard: audit.standard,
    criteria: audit.criteria,
    evidenceCount: audit.evidence?.length || 0,
    evidence: audit.evidence || [],
  };
}

/* ─── 6. Create Compliance Audit ────────────────────────────────────── */

async function createComplianceAudit(data) {
  const { ComplianceAudit } = getModels();
  if (!ComplianceAudit) throw new Error('ComplianceAudit model unavailable');

  const audit = new ComplianceAudit({
    auditNumber: data.auditNumber,
    standard: data.standard,
    category: data.category,
    criteria: data.criteria,
    description: data.description,
    status: data.status || 'pending',
    responsiblePerson: data.responsiblePerson,
    reviewDate: data.reviewDate,
    nextReviewDate: data.nextReviewDate,
    findings: data.findings,
    score: data.score,
    branchId: data.branchId,
    correctiveActions: data.correctiveActions || [],
    evidence: data.evidence || [],
  });

  await audit.save();
  return audit.toObject();
}

/* ─── 7. Update Compliance Status ─────────────────────────────────────── */

async function updateComplianceStatus(auditId, status, evidence, changedBy) {
  const { ComplianceAudit } = getModels();
  if (!ComplianceAudit) throw new Error('ComplianceAudit model unavailable');

  const audit = await ComplianceAudit.findById(auditId);
  if (!audit) throw new Error('Audit not found');

  const oldStatus = audit.status;

  // Add immutable audit trail entry
  audit.addAuditTrailEntry({
    changedBy,
    field: 'status',
    oldValue: oldStatus,
    newValue: status,
    note: `Status changed from ${oldStatus} to ${status}`,
  });

  audit.status = status;

  if (evidence) {
    if (evidence.documentId) {
      audit.addEvidence(evidence.documentId, evidence.fileName || 'document');
      audit.addAuditTrailEntry({
        changedBy,
        field: 'evidence',
        oldValue: null,
        newValue: evidence.fileName,
        note: 'Evidence uploaded',
      });
    }
  }

  await audit.save();
  return audit.toObject();
}

/* ─── 8. Complete Corrective Action ─────────────────────────────────── */

async function completeCorrectiveAction(auditId, actionId, completedBy) {
  const { ComplianceAudit } = getModels();
  if (!ComplianceAudit) throw new Error('ComplianceAudit model unavailable');

  const audit = await ComplianceAudit.findById(auditId);
  if (!audit) throw new Error('Audit not found');

  audit.completeCorrectiveAction(actionId, completedBy);
  await audit.save();
  return audit.toObject();
}

/* ─── 9. List Audits (with filters) ─────────────────────────────────── */

async function listAudits(filters = {}, pagination = {}) {
  const { ComplianceAudit } = getModels();
  if (!ComplianceAudit) throw new Error('ComplianceAudit model unavailable');

  const query = {};
  if (filters.standard) query.standard = filters.standard;
  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.search) {
    query.$or = [
      { criteria: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { auditNumber: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    ComplianceAudit.find(query)
      .populate('responsiblePerson', 'fullName email')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ComplianceAudit.countDocuments(query),
  ]);

  return {
    data: docs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/* ─── 10. Get Single Audit ────────────────────────────────────────────── */

async function getAuditById(auditId) {
  const { ComplianceAudit } = getModels();
  if (!ComplianceAudit) throw new Error('ComplianceAudit model unavailable');

  const audit = await ComplianceAudit.findById(auditId)
    .populate('responsiblePerson', 'fullName email phone')
    .populate('branchId', 'name code')
    .populate('correctiveActions.responsible', 'fullName email')
    .populate('auditTrail.changedBy', 'fullName email')
    .lean();

  if (!audit) throw new Error('Audit not found');
  return audit;
}

/* ─── Exports ─────────────────────────────────────────────────────────── */

module.exports = {
  getComplianceDashboard,
  getAuditTrail,
  getPendingCorrectiveActions,
  getUpcomingReviews,
  getEvidenceRegistry,
  createComplianceAudit,
  updateComplianceStatus,
  completeCorrectiveAction,
  listAudits,
  getAuditById,
};

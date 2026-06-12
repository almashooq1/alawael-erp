'use strict';

/**
 * Document Center Service — خدمة مركز إدارة الوثائق الموحد
 * ══════════════════════════════════════════════════════════════════
 * Facade يجمع كل عمليات إدارة المستندات في واجهة موحدة:
 *  - لوحة التحكم الذكية
 *  - مكتبة المستندات (بحث، فلترة، تصفح هيكلي)
 *  - دورة الحياة (رفع، تحديث، أرشفة، حذف ناعم)
 *  - سير العمل والموافقات
 *  - الذكاء الاصطناعي (تصنيف، OCR، تكرار، تلخيص)
 *  - التقارير والتحليلات
 *  - ربط بالمستفيد / الحلقة العلاجية
 * ══════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const _path = require('path');
const _fs = require('fs');
const crypto = require('crypto');
const _logger = require('../utils/logger');

// ── Lazy model loaders ────────────────────────────────────────────
const Doc = () => mongoose.model('Document');
const _User = () => {
  try {
    return mongoose.model('User');
  } catch {
    return null;
  }
};
const _Beneficiary = () => {
  try {
    return mongoose.model('Beneficiary');
  } catch {
    return null;
  }
};

// ── Sub-services (best-effort, graceful fallback) ─────────────────
function loadService(rel) {
  try {
    return require(rel);
  } catch {
    return null;
  }
}

const intelligenceSvc = loadService('./documents/documentIntelligence.service');
const _workflowEngine = loadService('./documents/documentWorkflow.engine');
const searchEngine = loadService('./documents/documentSearch.engine');
const _ocrSvc = loadService('./documents/documentOCR.service');
const _versioningSvc = loadService('./documents/documentVersioning.service');
const _notifSvc = loadService('./documents/documentNotification.service');
const _auditSvc = loadService('./documents/documentAudit.service');

// ── Constants ──────────────────────────────────────────────────────
const CATEGORIES = ['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'شهادات', 'مراسلات', 'أخرى'];
const WORKFLOW_STATUSES = [
  'draft',
  'pending_review',
  'reviewed',
  'revision_required',
  'pending_approval',
  'approved',
  'rejected',
  'published',
  'archived',
  'cancelled',
];
const SECURITY_LEVELS = ['public', 'internal', 'confidential', 'secret'];
const DOC_STATUSES = ['نشط', 'مؤرشف', 'محذوف', 'قيد المراجعة'];

// ─────────────────────────────────────────────────────────────────
// Helper: format bytes
// ─────────────────────────────────────────────────────────────────
function fmtBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024,
    sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ─────────────────────────────────────────────────────────────────
// Helper: content fingerprint (SHA-256 of file path + size)
// ─────────────────────────────────────────────────────────────────
function _makeFingerprint(filePath, fileSize) {
  return crypto.createHash('sha256').update(`${filePath}:${fileSize}`).digest('hex');
}

// ─────────────────────────────────────────────────────────────────
// Helper: log activity
// ─────────────────────────────────────────────────────────────────
async function logActivity(doc, action, userId, userName, details = '') {
  doc.activityLog = doc.activityLog || [];
  doc.activityLog.push({
    action,
    performedBy: userId,
    performedByName: userName || 'النظام',
    performedAt: new Date(),
    details,
  });
  // cap log at 200 entries
  if (doc.activityLog.length > 200) doc.activityLog = doc.activityLog.slice(-200);
}

// ═════════════════════════════════════════════════════════════════
// § 1 — DASHBOARD
// ═════════════════════════════════════════════════════════════════
async function getDashboard(userId, _options = {}) {
  const Document = Doc();
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── Parallel aggregations ─────────────────────────────────────
  const [
    totalCount,
    archivedCount,
    expiringSoon,
    pendingWorkflow,
    recentUploads,
    categoryStats,
    typeStats,
    monthlyTrend,
    storageStats,
    highPriority,
    ocrPending,
    workflowQueue,
  ] = await Promise.all([
    Document.countDocuments({ status: { $ne: 'محذوف' } }),
    Document.countDocuments({ status: 'مؤرشف' }),
    Document.countDocuments({ expiryDate: { $gte: now, $lte: thirtyDays }, status: 'نشط' }),
    Document.countDocuments({ workflowStatus: { $in: ['pending_review', 'pending_approval'] } }),
    Document.find({ status: 'نشط' })
      .sort({ createdAt: -1 })
      .limit(8)
      .select(
        'title category fileType fileSize createdAt uploadedByName workflowStatus smartClassification.priority'
      )
      .lean(),
    Document.aggregate([
      { $match: { status: { $ne: 'محذوف' } } },
      { $group: { _id: '$category', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } },
      { $sort: { count: -1 } },
    ]),
    Document.aggregate([
      { $match: { status: 'نشط' } },
      { $group: { _id: '$fileType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Document.aggregate([
      { $match: { createdAt: { $gte: thirtyAgo }, status: { $ne: 'محذوف' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Document.aggregate([
      { $match: { status: { $ne: 'محذوف' } } },
      { $group: { _id: null, total: { $sum: '$fileSize' }, count: { $sum: 1 } } },
    ]),
    Document.countDocuments({ 'smartClassification.priority': 'urgent', status: 'نشط' }),
    Document.countDocuments({ ocrStatus: 'pending' }),
    Document.find({ workflowStatus: { $in: ['pending_review', 'pending_approval'] } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title category workflowStatus uploadedByName updatedAt')
      .lean(),
  ]);

  // ── Expiring items list ──────────────────────────────────────
  const expiringList = await Document.find({
    expiryDate: { $gte: now, $lte: thirtyDays },
    status: 'نشط',
  })
    .sort({ expiryDate: 1 })
    .limit(10)
    .select('title category expiryDate uploadedByName smartClassification.priority')
    .lean();

  // ── Critical (7 days) ────────────────────────────────────────
  const criticalExpiry = await Document.countDocuments({
    expiryDate: { $gte: now, $lte: sevenDays },
    status: 'نشط',
  });

  // ── Health score ─────────────────────────────────────────────
  const total = totalCount || 1;
  const healthScore = Math.max(
    0,
    Math.round(
      100 - (expiringSoon / total) * 30 - (pendingWorkflow / total) * 20 - (ocrPending / total) * 10
    )
  );

  const storageTotal = storageStats[0]?.total || 0;

  return {
    kpis: {
      total: totalCount,
      active: totalCount - archivedCount,
      archived: archivedCount,
      expiringSoon,
      criticalExpiry,
      pendingWorkflow,
      highPriority,
      ocrPending,
      storageBytes: storageTotal,
      storageFormatted: fmtBytes(storageTotal),
      healthScore,
    },
    categoryStats: categoryStats.map(c => ({
      name: c._id || 'أخرى',
      count: c.count,
      sizeFormatted: fmtBytes(c.totalSize),
    })),
    typeStats: typeStats.map(t => ({ type: t._id || 'other', count: t.count })),
    monthlyTrend,
    recentDocuments: recentUploads,
    expiringDocuments: expiringList.map(d => ({
      ...d,
      daysLeft: Math.ceil((new Date(d.expiryDate) - now) / 86400000),
    })),
    workflowQueue,
  };
}

// ═════════════════════════════════════════════════════════════════
// § 2 — LIBRARY (paginated list)
// ═════════════════════════════════════════════════════════════════
async function listDocuments(filters = {}, pagination = {}) {
  const Document = Doc();
  const {
    search,
    category,
    status,
    fileType,
    workflowStatus,
    securityLevel,
    priority,
    folder,
    tags,
    uploadedBy,
    expiryFrom,
    expiryTo,
    createdFrom,
    createdTo,
    isFavorite,
    linkedBeneficiary,
  } = filters;

  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

  const query = {};

  // Status filter — default exclude deleted
  if (status) {
    query.status = status;
  } else {
    query.status = { $ne: 'محذوف' };
  }

  if (category) query.category = category;
  if (fileType) query.fileType = fileType;
  if (workflowStatus) query.workflowStatus = workflowStatus;
  if (securityLevel) query['smartClassification.securityLevel'] = securityLevel;
  if (priority) query['smartClassification.priority'] = priority;
  if (folder) query.folder = folder;
  if (uploadedBy) query.uploadedBy = uploadedBy;
  if (linkedBeneficiary) query['linkedBeneficiary.beneficiaryId'] = linkedBeneficiary;

  if (tags && tags.length) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };

  if (expiryFrom || expiryTo) {
    query.expiryDate = {};
    if (expiryFrom) query.expiryDate.$gte = new Date(expiryFrom);
    if (expiryTo) query.expiryDate.$lte = new Date(expiryTo);
  }

  if (createdFrom || createdTo) {
    query.createdAt = {};
    if (createdFrom) query.createdAt.$gte = new Date(createdFrom);
    if (createdTo) query.createdAt.$lte = new Date(createdTo);
  }

  // Full-text search
  if (search && search.trim()) {
    if (searchEngine && typeof searchEngine.buildQuery === 'function') {
      Object.assign(query, searchEngine.buildQuery(search.trim()));
    } else {
      query.$text = { $search: search.trim() };
    }
  }

  // Favorites
  if (isFavorite && filters.userId) {
    query.isFavoriteOf = filters.userId;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const total = await Document.countDocuments(query);

  const docs = await Document.find(query)
    .sort(sort)
    .skip(skip)
    .limit(Math.min(limit, 100))
    .select(
      'title fileName originalFileName fileType mimeType fileSize category tags ' +
        'folder status workflowStatus isArchived expiryDate createdAt updatedAt ' +
        'uploadedBy uploadedByName version viewCount downloadCount ' +
        'smartClassification.category smartClassification.confidence ' +
        'smartClassification.securityLevel smartClassification.priority ' +
        'ocrStatus isFavoriteOf linkedBeneficiary'
    )
    .lean();

  return {
    documents: docs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

// ═════════════════════════════════════════════════════════════════
// § 3 — GET SINGLE DOCUMENT
// ═════════════════════════════════════════════════════════════════
async function getDocument(id, _userId) {
  const Document = Doc();
  const doc = await Document.findById(id).lean();
  if (!doc) throw Object.assign(new Error('المستند غير موجود'), { status: 404 });
  if (doc.status === 'محذوف') throw Object.assign(new Error('هذا المستند محذوف'), { status: 410 });

  // increment view count (fire and forget)
  Document.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();

  return doc;
}

// ═════════════════════════════════════════════════════════════════
// § 4 — UPDATE DOCUMENT METADATA
// ═════════════════════════════════════════════════════════════════
async function updateDocument(id, updates, userId, userName) {
  const Document = Doc();
  const doc = await Document.findById(id);
  if (!doc) throw Object.assign(new Error('المستند غير موجود'), { status: 404 });

  const allowed = [
    'title',
    'description',
    'category',
    'tags',
    'folder',
    'expiryDate',
    'metadata',
    'isPublic',
    'requiresApproval',
  ];
  allowed.forEach(field => {
    if (updates[field] !== undefined) doc[field] = updates[field];
  });

  doc.lastModified = new Date();
  doc.lastModifiedBy = userId;

  await logActivity(doc, 'تعديل', userId, userName, 'تحديث بيانات المستند');
  await doc.save();
  return doc.toObject();
}

// ═════════════════════════════════════════════════════════════════
// § 5 — SOFT DELETE
// ═════════════════════════════════════════════════════════════════
async function softDelete(id, userId, userName) {
  const Document = Doc();
  const doc = await Document.findById(id);
  if (!doc) throw Object.assign(new Error('المستند غير موجود'), { status: 404 });

  doc.status = 'محذوف';
  doc.isArchived = false;
  await logActivity(doc, 'حذف', userId, userName, 'حذف ناعم');
  await doc.save();
  return { success: true, id };
}

// ═════════════════════════════════════════════════════════════════
// § 6 — ARCHIVE / RESTORE
// ═════════════════════════════════════════════════════════════════
async function archiveDocument(id, userId, userName) {
  const Document = Doc();
  const doc = await Document.findById(id);
  if (!doc) throw Object.assign(new Error('المستند غير موجود'), { status: 404 });

  doc.status = 'مؤرشف';
  doc.isArchived = true;
  doc.archivedAt = new Date();
  doc.archivedBy = userId;
  await logActivity(doc, 'أرشفة', userId, userName, '');
  await doc.save();
  return { success: true };
}

async function restoreDocument(id, userId, userName) {
  const Document = Doc();
  const doc = await Document.findById(id);
  if (!doc) throw Object.assign(new Error('المستند غير موجود'), { status: 404 });

  doc.status = 'نشط';
  doc.isArchived = false;
  doc.archivedAt = undefined;
  doc.archivedBy = undefined;
  await logActivity(doc, 'استرجاع', userId, userName, 'استرجاع من الأرشيف أو سلة المحذوفات');
  await doc.save();
  return { success: true };
}

// ═════════════════════════════════════════════════════════════════
// § 7 — BULK OPERATIONS
// ═════════════════════════════════════════════════════════════════
async function bulkOperation(ids, operation, userId, userName) {
  const Document = Doc();
  if (!Array.isArray(ids) || !ids.length) throw new Error('لا توجد مستندات محددة');

  const ops = {
    archive: d => {
      d.status = 'مؤرشف';
      d.isArchived = true;
      d.archivedAt = new Date();
      d.archivedBy = userId;
    },
    restore: d => {
      d.status = 'نشط';
      d.isArchived = false;
    },
    delete: d => {
      d.status = 'محذوف';
    },
    publish: d => {
      d.workflowStatus = 'published';
    },
  };

  if (!Object.hasOwn(ops, operation)) throw new Error(`عملية غير صالحة: ${operation}`);

  const docs = await Document.find({ _id: { $in: ids } });
  let processed = 0;

  for (const doc of docs) {
    ops[operation](doc);
    await logActivity(
      doc,
      operation === 'delete' ? 'حذف' : 'تعديل',
      userId,
      userName,
      `عملية جماعية: ${operation}`
    );
    await doc.save();
    processed++;
  }

  return { success: true, processed, total: ids.length };
}

// ═════════════════════════════════════════════════════════════════
// § 8 — SMART SEARCH
// ═════════════════════════════════════════════════════════════════
async function smartSearch(query, filters = {}, pagination = {}) {
  const Document = Doc();
  if (!query || !query.trim()) return listDocuments(filters, pagination);

  const q = query.trim();
  const { page = 1, limit = 20 } = pagination;
  const skip = (page - 1) * limit;

  // Full-text index search
  const textQuery = {
    $text: { $search: q },
    status: { $ne: 'محذوف' },
    ...buildFilterQuery(filters),
  };

  const [docs, total] = await Promise.all([
    Document.find(textQuery, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip(skip)
      .limit(Math.min(limit, 50))
      .select(
        'title fileName originalFileName fileType fileSize category tags status ' +
          'createdAt uploadedByName workflowStatus smartClassification.priority'
      )
      .lean(),
    Document.countDocuments(textQuery),
  ]);

  // Enrich with snippet highlighting
  const results = docs.map(d => ({
    ...d,
    matchScore: d.score,
    snippet: buildSnippet(d, q),
  }));

  return { results, total, page, limit, pages: Math.ceil(total / limit) };
}

function buildFilterQuery(filters) {
  const q = {};
  if (filters.category) q.category = filters.category;
  if (filters.fileType) q.fileType = filters.fileType;
  if (filters.status) q.status = filters.status;
  return q;
}

function buildSnippet(doc, query) {
  const text = [doc.title, doc.description, ...(doc.tags || [])].filter(Boolean).join(' ');
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text.slice(0, 120);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

// ═════════════════════════════════════════════════════════════════
// § 9 — WORKFLOW
// ═════════════════════════════════════════════════════════════════
async function getWorkflowQueue(userId, options = {}) {
  const Document = Doc();
  const { status = null, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const q = {
    workflowStatus: { $in: ['pending_review', 'pending_approval', 'revision_required'] },
  };
  if (status) q.workflowStatus = status;

  const [docs, total] = await Promise.all([
    Document.find(q)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        'title category fileType workflowStatus uploadedBy uploadedByName updatedAt expiryDate smartClassification.priority'
      )
      .lean(),
    Document.countDocuments(q),
  ]);

  const stats = await Document.aggregate([
    { $group: { _id: '$workflowStatus', count: { $sum: 1 } } },
  ]);

  return {
    documents: docs,
    stats: Object.fromEntries(stats.map(s => [s._id, s.count])),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

async function processWorkflowAction(id, action, userId, userName, comment = '') {
  const Document = Doc();
  const doc = await Document.findById(id);
  if (!doc) throw Object.assign(new Error('المستند غير موجود'), { status: 404 });

  const TRANSITIONS = {
    submit_review: { from: 'draft', to: 'pending_review' },
    approve_review: { from: 'pending_review', to: 'reviewed' },
    request_revision: { from: 'pending_review', to: 'revision_required' },
    resubmit: { from: 'revision_required', to: 'pending_review' },
    submit_approval: { from: 'reviewed', to: 'pending_approval' },
    approve: { from: 'pending_approval', to: 'approved' },
    reject: { from: 'pending_approval', to: 'rejected' },
    publish: { from: 'approved', to: 'published' },
    cancel: { from: null, to: 'cancelled' }, // any
  };

  const t = TRANSITIONS[action];
  if (!t) throw new Error(`إجراء سير عمل غير صالح: ${action}`);
  if (t.from && doc.workflowStatus !== t.from) {
    throw Object.assign(new Error(`لا يمكن تنفيذ "${action}" من الحالة "${doc.workflowStatus}"`), {
      status: 422,
    });
  }

  doc.workflowStatus = t.to;
  await logActivity(
    doc,
    'تعديل',
    userId,
    userName,
    `سير العمل: ${action}${comment ? ' — ' + comment : ''}`
  );
  await doc.save();

  return { success: true, newStatus: t.to, documentId: id };
}

// ═════════════════════════════════════════════════════════════════
// § 10 — AI INTELLIGENCE
// ═════════════════════════════════════════════════════════════════
async function classifyDocument(id, userId, userName) {
  const Document = Doc();
  const doc = await Document.findById(id);
  if (!doc) throw Object.assign(new Error('المستند غير موجود'), { status: 404 });

  let classification = null;

  if (intelligenceSvc && typeof intelligenceSvc.classifyDocument === 'function') {
    classification = await intelligenceSvc.classifyDocument(doc.toObject());
  } else {
    // Fallback: rule-based classification from title + tags
    classification = ruleBasedClassify(doc);
  }

  if (classification) {
    doc.smartClassification = {
      ...doc.smartClassification,
      ...classification,
      classifiedAt: new Date(),
      classifiedBy: 'auto',
    };
    await logActivity(doc, 'تعديل', userId, userName, 'تصنيف ذكي تلقائي');
    await doc.save();
  }

  return { success: true, classification: doc.smartClassification };
}

function ruleBasedClassify(doc) {
  const text = [doc.title, doc.description, ...(doc.tags || [])].join(' ').toLowerCase();

  let category = 'أخرى',
    priority = 'medium',
    securityLevel = 'internal';

  if (/تقرير|إحصاء|بيانات|نتائج|تحليل/.test(text)) category = 'تقارير';
  else if (/عقد|اتفاقية|بنود/.test(text)) {
    category = 'عقود';
    securityLevel = 'confidential';
  } else if (/سياسة|إجراء|دليل/.test(text)) category = 'سياسات';
  else if (/مالي|ميزانية|صرف|فاتورة/.test(text)) {
    category = 'مالي';
    securityLevel = 'confidential';
  } else if (/شهادة|ترخيص|اعتماد/.test(text)) {
    category = 'شهادات';
    priority = 'high';
  } else if (/تدريب|برنامج|ورشة/.test(text)) category = 'تدريب';
  else if (/مراسلة|خطاب|بريد/.test(text)) category = 'مراسلات';

  if (/عاجل|urgent|critical|طارئ/.test(text)) priority = 'urgent';
  else if (/مهم|important|high/.test(text)) priority = 'high';

  return { category, priority, securityLevel, confidence: 0.7 };
}

async function checkDuplicates(id) {
  const Document = Doc();
  const doc = await Document.findById(id).lean();
  if (!doc) throw Object.assign(new Error('المستند غير موجود'), { status: 404 });

  const query = {
    _id: { $ne: doc._id },
    status: { $ne: 'محذوف' },
    $or: [
      { contentFingerprint: { $eq: doc.contentFingerprint, $ne: null } },
      { originalFileName: doc.originalFileName, fileSize: doc.fileSize },
    ],
  };

  const duplicates = await Document.find(query)
    .select('title fileName originalFileName fileSize createdAt uploadedByName category')
    .limit(10)
    .lean();

  return {
    hasDuplicates: duplicates.length > 0,
    count: duplicates.length,
    duplicates,
  };
}

async function getAIInsights(_filters = {}) {
  const Document = Doc();
  const q = { status: { $ne: 'محذوف' } };

  const [allDocs, classified, unclassified, ocrStats, priorityStats] = await Promise.all([
    Document.countDocuments(q),
    Document.countDocuments({ ...q, 'smartClassification.classifiedAt': { $exists: true } }),
    Document.countDocuments({ ...q, 'smartClassification.classifiedAt': { $exists: false } }),
    Document.aggregate([{ $match: q }, { $group: { _id: '$ocrStatus', count: { $sum: 1 } } }]),
    Document.aggregate([
      { $match: q },
      { $group: { _id: '$smartClassification.priority', count: { $sum: 1 } } },
    ]),
  ]);

  const classificationRate = allDocs ? Math.round((classified / allDocs) * 100) : 0;

  // Documents needing classification
  const needsClassification = await Document.find({
    status: 'نشط',
    'smartClassification.classifiedAt': { $exists: false },
  })
    .select('title fileName category createdAt uploadedByName')
    .limit(20)
    .lean();

  return {
    overview: {
      total: allDocs,
      classified,
      unclassified,
      classificationRate,
    },
    ocrStats: Object.fromEntries(ocrStats.map(s => [s._id || 'none', s.count])),
    priorityStats: Object.fromEntries(priorityStats.map(s => [s._id || 'medium', s.count])),
    needsClassification,
  };
}

// ═════════════════════════════════════════════════════════════════
// § 11 — REPORTS & ANALYTICS
// ═════════════════════════════════════════════════════════════════
async function getAnalyticsReport(options = {}) {
  const Document = Doc();
  const { months = 6 } = options;
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const [
    uploadTrend,
    categoryBreakdown,
    userActivity,
    workflowFunnel,
    storageByType,
    topViewed,
    topDownloaded,
    expiryForecast,
  ] = await Promise.all([
    // Upload trend by month
    Document.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $ne: 'محذوف' } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          size: { $sum: '$fileSize' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    // Category breakdown
    Document.aggregate([
      { $match: { status: { $ne: 'محذوف' } } },
      { $group: { _id: '$category', count: { $sum: 1 }, size: { $sum: '$fileSize' } } },
      { $sort: { count: -1 } },
    ]),
    // Top uploaders
    Document.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $ne: 'محذوف' } } },
      { $group: { _id: '$uploadedByName', count: { $sum: 1 }, size: { $sum: '$fileSize' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    // Workflow funnel
    Document.aggregate([{ $group: { _id: '$workflowStatus', count: { $sum: 1 } } }]),
    // Storage by file type
    Document.aggregate([
      { $match: { status: { $ne: 'محذوف' } } },
      { $group: { _id: '$fileType', count: { $sum: 1 }, size: { $sum: '$fileSize' } } },
      { $sort: { size: -1 } },
      { $limit: 10 },
    ]),
    // Top viewed
    Document.find({ status: 'نشط', viewCount: { $gt: 0 } })
      .sort({ viewCount: -1 })
      .limit(10)
      .select('title category fileType viewCount downloadCount createdAt')
      .lean(),
    // Top downloaded
    Document.find({ status: 'نشط', downloadCount: { $gt: 0 } })
      .sort({ downloadCount: -1 })
      .limit(10)
      .select('title category fileType viewCount downloadCount createdAt')
      .lean(),
    // Expiry forecast per month
    Document.aggregate([
      { $match: { expiryDate: { $gte: new Date() }, status: 'نشط' } },
      {
        $group: {
          _id: { year: { $year: '$expiryDate' }, month: { $month: '$expiryDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]),
  ]);

  return {
    uploadTrend: uploadTrend.map(u => ({
      label: `${u._id.year}-${String(u._id.month).padStart(2, '0')}`,
      count: u.count,
      sizeFormatted: fmtBytes(u.size),
    })),
    categoryBreakdown: categoryBreakdown.map(c => ({
      name: c._id || 'أخرى',
      count: c.count,
      sizeFormatted: fmtBytes(c.size),
    })),
    userActivity: userActivity.map(u => ({
      name: u._id || 'مجهول',
      count: u.count,
      sizeFormatted: fmtBytes(u.size),
    })),
    workflowFunnel: Object.fromEntries(workflowFunnel.map(w => [w._id || 'draft', w.count])),
    storageByType: storageByType.map(s => ({
      type: s._id || 'other',
      count: s.count,
      sizeFormatted: fmtBytes(s.size),
    })),
    topViewed,
    topDownloaded,
    expiryForecast: expiryForecast.map(e => ({
      label: `${e._id.year}-${String(e._id.month).padStart(2, '0')}`,
      count: e.count,
    })),
  };
}

// ═════════════════════════════════════════════════════════════════
// § 12 — EXPIRY RADAR
// ═════════════════════════════════════════════════════════════════
async function getExpiryRadar(daysAhead = 60) {
  const Document = Doc();
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const docs = await Document.find({
    expiryDate: { $gte: now, $lte: future },
    status: 'نشط',
  })
    .sort({ expiryDate: 1 })
    .select(
      'title category fileType expiryDate uploadedByName smartClassification.priority smartClassification.securityLevel'
    )
    .lean();

  return docs.map(d => ({
    ...d,
    daysLeft: Math.ceil((new Date(d.expiryDate) - now) / 86400000),
    urgency: computeUrgency(d, now),
  }));
}

function computeUrgency(doc, now) {
  const days = Math.ceil((new Date(doc.expiryDate) - now) / 86400000);
  if (days <= 3) return 'critical';
  if (days <= 7) return 'high';
  if (days <= 14) return 'medium';
  return 'low';
}

// ═════════════════════════════════════════════════════════════════
// § 13 — BENEFICIARY DOCUMENT LINKING
// ═════════════════════════════════════════════════════════════════
async function linkToBeneficiary(docId, beneficiaryId, episodeId, userId, userName) {
  const Document = Doc();
  const doc = await Document.findById(docId);
  if (!doc) throw Object.assign(new Error('المستند غير موجود'), { status: 404 });

  doc.linkedBeneficiary = { beneficiaryId, episodeId: episodeId || null };
  await logActivity(
    doc,
    'تعديل',
    userId,
    userName,
    `ربط بالمستفيد ${beneficiaryId}${episodeId ? ' / الحلقة ' + episodeId : ''}`
  );
  await doc.save();
  return { success: true };
}

async function getBeneficiaryDocuments(beneficiaryId, filters = {}) {
  const Document = Doc();
  const q = {
    'linkedBeneficiary.beneficiaryId': beneficiaryId,
    status: { $ne: 'محذوف' },
  };
  if (filters.episodeId) q['linkedBeneficiary.episodeId'] = filters.episodeId;
  if (filters.category) q.category = filters.category;

  return Document.find(q)
    .sort({ createdAt: -1 })
    .select(
      'title category fileType fileSize status workflowStatus createdAt uploadedByName expiryDate linkedBeneficiary'
    )
    .lean();
}

// ═════════════════════════════════════════════════════════════════
// § 14 — FAVORITES
// ═════════════════════════════════════════════════════════════════
async function toggleFavorite(id, userId) {
  const Document = Doc();
  const doc = await Document.findById(id);
  if (!doc) throw Object.assign(new Error('المستند غير موجود'), { status: 404 });

  const idx = (doc.isFavoriteOf || []).findIndex(u => u.toString() === userId.toString());
  if (idx >= 0) {
    doc.isFavoriteOf.splice(idx, 1);
  } else {
    doc.isFavoriteOf = doc.isFavoriteOf || [];
    doc.isFavoriteOf.push(userId);
  }

  await doc.save();
  return { isFavorite: idx < 0 };
}

// ═════════════════════════════════════════════════════════════════
// § 15 — METADATA
// ═════════════════════════════════════════════════════════════════
function getMetadata() {
  return {
    categories: CATEGORIES,
    workflowStatuses: WORKFLOW_STATUSES,
    securityLevels: SECURITY_LEVELS,
    docStatuses: DOC_STATUSES,
    priorities: ['low', 'medium', 'high', 'urgent'],
    fileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'png', 'zip', 'other'],
  };
}

// ═════════════════════════════════════════════════════════════════
// Exports
// ═════════════════════════════════════════════════════════════════
module.exports = {
  // Dashboard
  getDashboard,
  // Library
  listDocuments,
  getDocument,
  updateDocument,
  softDelete,
  archiveDocument,
  restoreDocument,
  bulkOperation,
  // Search
  smartSearch,
  // Workflow
  getWorkflowQueue,
  processWorkflowAction,
  // AI
  classifyDocument,
  checkDuplicates,
  getAIInsights,
  // Reports
  getAnalyticsReport,
  getExpiryRadar,
  // Beneficiary
  linkToBeneficiary,
  getBeneficiaryDocuments,
  // Favorites
  toggleFavorite,
  // Meta
  getMetadata,
};

/**
 * DDD Document Collaboration — Phase 13c
 * التعاون على المستندات والتعليقات
 *
 * Collaborative document editing, inline comments,
 * annotations, review workflows, and version tracking.
 */

'use strict';

const mongoose = require('mongoose');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════
   Mongoose Models
   ═══════════════════════════════════════════════════════════════ */

const dddCollabDocumentSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    type: {
      type: String,
      enum: [
        'clinical-note',
        'care-plan-draft',
        'assessment-report',
        'progress-note',
        'discharge-summary',
        'policy',
        'protocol',
        'guideline',
        'form-template',
        'research-paper',
        'meeting-minutes',
        'general',
      ],
      default: 'general',
    },
    domain: { type: String },
    content: { type: String, default: '' },
    format: {
      type: String,
      enum: ['markdown', 'rich-text', 'plain', 'html'],
      default: 'rich-text',
    },
    entityRef: {
      entityType: String,
      entityId: { type: mongoose.Schema.Types.ObjectId },
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collaborators: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        permission: { type: String, enum: ['view', 'comment', 'edit', 'admin'], default: 'edit' },
        addedAt: { type: Date, default: Date.now },
        lastAccessedAt: Date,
      },
    ],
    reviewStatus: {
      type: String,
      enum: ['draft', 'in-review', 'approved', 'rejected', 'archived'],
      default: 'draft',
    },
    reviewers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['pending', 'approved', 'changes-requested', 'rejected'],
          default: 'pending',
        },
        reviewedAt: Date,
        feedback: String,
      },
    ],
    version: { type: Number, default: 1 },
    versions: [
      {
        version: Number,
        content: String,
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        editedAt: { type: Date, default: Date.now },
        changeDescription: String,
      },
    ],
    tags: [String],
    isLocked: { type: Boolean, default: false },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dddCollabDocumentSchema.index({ owner: 1, createdAt: -1 });
dddCollabDocumentSchema.index({ 'collaborators.userId': 1 });
dddCollabDocumentSchema.index({ type: 1, domain: 1 });
dddCollabDocumentSchema.index({ reviewStatus: 1 });
dddCollabDocumentSchema.index({ tags: 1 });

const DDDCollabDocument =
  mongoose.models.DDDCollabDocument || mongoose.model('DDDCollabDocument', dddCollabDocumentSchema);

const dddCommentSchema = new mongoose.Schema(
  {
    commentId: { type: String, required: true, unique: true },
    documentId: { type: String, required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['comment', 'suggestion', 'question', 'approval', 'concern', 'annotation'],
      default: 'comment',
    },
    anchor: {
      startOffset: Number,
      endOffset: Number,
      selectedText: String,
      sectionId: String,
    },
    parentId: { type: String },
    replies: [
      {
        replyId: String,
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['open', 'resolved', 'accepted', 'rejected', 'deferred'],
      default: 'open',
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dddCommentSchema.index({ documentId: 1, createdAt: -1 });
dddCommentSchema.index({ author: 1 });

const DDDComment = mongoose.models.DDDComment || mongoose.model('DDDComment', dddCommentSchema);

/* ═══════════════════════════════════════════════════════════════
   Document Types & Templates
   ═══════════════════════════════════════════════════════════════ */

const DOCUMENT_TYPES = {
  'clinical-note': { label: 'Clinical Note', labelAr: 'ملاحظة سريرية', icon: 'medical_services' },
  'care-plan-draft': { label: 'Care Plan Draft', labelAr: 'مسودة خطة الرعاية', icon: 'assignment' },
  'assessment-report': { label: 'Assessment Report', labelAr: 'تقرير التقييم', icon: 'assessment' },
  'progress-note': { label: 'Progress Note', labelAr: 'ملاحظة التقدم', icon: 'trending_up' },
  'discharge-summary': { label: 'Discharge Summary', labelAr: 'ملخص الخروج', icon: 'exit_to_app' },
  policy: { label: 'Policy Document', labelAr: 'وثيقة سياسة', icon: 'policy' },
  protocol: { label: 'Clinical Protocol', labelAr: 'بروتوكول سريري', icon: 'rule' },
  guideline: { label: 'Practice Guideline', labelAr: 'دليل الممارسة', icon: 'menu_book' },
  'form-template': { label: 'Form Template', labelAr: 'قالب نموذج', icon: 'description' },
  'research-paper': { label: 'Research Paper', labelAr: 'ورقة بحثية', icon: 'science' },
  'meeting-minutes': { label: 'Meeting Minutes', labelAr: 'محضر اجتماع', icon: 'summarize' },
  general: { label: 'General Document', labelAr: 'مستند عام', icon: 'article' },
};

const REVIEW_WORKFLOWS = {
  'single-approver': { label: 'Single Approver', labelAr: 'موافق واحد', minReviewers: 1 },
  'dual-approval': { label: 'Dual Approval', labelAr: 'موافقة مزدوجة', minReviewers: 2 },
  'committee-review': { label: 'Committee Review', labelAr: 'مراجعة اللجنة', minReviewers: 3 },
  'peer-review': { label: 'Peer Review', labelAr: 'مراجعة الأقران', minReviewers: 1 },
  hierarchical: { label: 'Hierarchical Review', labelAr: 'مراجعة تسلسلية', minReviewers: 2 },
};

/* ═══════════════════════════════════════════════════════════════
   Core Functions
   ═══════════════════════════════════════════════════════════════ */

async function createDocument(data) {
  const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  return DDDCollabDocument.create({ ...data, documentId, version: 1 });
}

async function updateDocument(documentId, userId, content, changeDescription) {
  const doc = await DDDCollabDocument.findOne({ documentId });
  if (!doc) throw new Error(`Document not found: ${documentId}`);
  if (doc.isLocked && doc.lockedBy?.toString() !== userId?.toString()) {
    throw new Error('Document is locked by another user');
  }

  // Save current version to history
  doc.versions.push({
    version: doc.version,
    content: doc.content,
    editedBy: userId,
    editedAt: new Date(),
    changeDescription: changeDescription || `Version ${doc.version}`,
  });

  doc.content = content;
  doc.version += 1;
  await doc.save();
  return doc;
}

async function lockDocument(documentId, userId) {
  return DDDCollabDocument.findOneAndUpdate(
    { documentId, isLocked: false },
    { $set: { isLocked: true, lockedBy: userId, lockedAt: new Date() } },
    { new: true }
  );
}

async function unlockDocument(documentId, userId) {
  return DDDCollabDocument.findOneAndUpdate(
    { documentId, lockedBy: userId },
    { $set: { isLocked: false, lockedBy: null, lockedAt: null } },
    { new: true }
  );
}

async function addComment(documentId, authorId, content, options = {}) {
  const commentId = `cmt-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  return DDDComment.create({
    commentId,
    documentId,
    author: authorId,
    content,
    type: options.type || 'comment',
    anchor: options.anchor,
    parentId: options.parentId,
    priority: options.priority || 'medium',
  });
}

async function resolveComment(commentId, userId) {
  return DDDComment.findOneAndUpdate(
    { commentId },
    { $set: { status: 'resolved', resolvedBy: userId, resolvedAt: new Date() } },
    { new: true }
  );
}

async function getDocumentComments(documentId, options = {}) {
  const query = { documentId, isActive: true };
  if (options.status) query.status = options.status;
  if (options.type) query.type = options.type;
  return DDDComment.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .lean();
}

async function submitForReview(documentId, reviewerIds) {
  const reviewers = reviewerIds.map(id => ({
    userId: id,
    status: 'pending',
  }));
  return DDDCollabDocument.findOneAndUpdate(
    { documentId },
    { $set: { reviewStatus: 'in-review', reviewers } },
    { new: true }
  );
}

async function submitReview(documentId, userId, status, feedback) {
  const doc = await DDDCollabDocument.findOne({ documentId });
  if (!doc) throw new Error(`Document not found: ${documentId}`);

  const reviewer = doc.reviewers.find(r => r.userId?.toString() === userId?.toString());
  if (reviewer) {
    reviewer.status = status;
    reviewer.reviewedAt = new Date();
    reviewer.feedback = feedback;
  }

  // Check if all reviews are complete
  const allReviewed = doc.reviewers.every(r => r.status !== 'pending');
  if (allReviewed) {
    const allApproved = doc.reviewers.every(r => r.status === 'approved');
    doc.reviewStatus = allApproved ? 'approved' : 'rejected';
  }

  await doc.save();
  return doc;
}

async function getDocumentVersions(documentId) {
  const doc = await DDDCollabDocument.findOne({ documentId }).lean();
  if (!doc) return [];
  return doc.versions.sort((a, b) => b.version - a.version);
}

async function getDocumentCollabDashboard() {
  const [docCount, commentCount, pendingReviews, openComments] = await Promise.all([
    DDDCollabDocument.countDocuments({ isActive: true }),
    DDDComment.countDocuments({ isActive: true }),
    DDDCollabDocument.countDocuments({ reviewStatus: 'in-review' }),
    DDDComment.countDocuments({ status: 'open' }),
  ]);

  return {
    service: 'DocumentCollaboration',
    documents: { total: docCount, pendingReviews },
    comments: { total: commentCount, open: openComments },
    documentTypes: Object.keys(DOCUMENT_TYPES).length,
    reviewWorkflows: Object.keys(REVIEW_WORKFLOWS).length,
  };
}

/* ═══════════════════════════════════════════════════════════════
   Router
   ═══════════════════════════════════════════════════════════════ */

function createDocumentCollaborationRouter() {
  const r = Router();

  r.get('/document-collaboration', async (_req, res) => {
    try {
      res.json({ success: true, data: await getDocumentCollabDashboard() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/document-collaboration/documents', async (req, res) => {
    try {
      const query = { isActive: true };
      if (req.query.type) query.type = req.query.type;
      if (req.query.reviewStatus) query.reviewStatus = req.query.reviewStatus;
      const docs = await DDDCollabDocument.find(query)
        .sort({ updatedAt: -1 })
        .limit(parseInt(req.query.limit) || 50)
        .lean();
      res.json({ success: true, data: docs });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/document-collaboration/documents', async (req, res) => {
    try {
      res.json({ success: true, data: await createDocument(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.put('/document-collaboration/documents/:documentId', async (req, res) => {
    try {
      const { userId, content, changeDescription } = req.body;
      res.json({
        success: true,
        data: await updateDocument(req.params.documentId, userId, content, changeDescription),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/document-collaboration/documents/:documentId/lock', async (req, res) => {
    try {
      res.json({ success: true, data: await lockDocument(req.params.documentId, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/document-collaboration/documents/:documentId/unlock', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await unlockDocument(req.params.documentId, req.body.userId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/document-collaboration/documents/:documentId/comments', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await getDocumentComments(req.params.documentId, req.query),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/document-collaboration/documents/:documentId/comments', async (req, res) => {
    try {
      const { authorId, content, ...opts } = req.body;
      res.json({
        success: true,
        data: await addComment(req.params.documentId, authorId, content, opts),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/document-collaboration/comments/:commentId/resolve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await resolveComment(req.params.commentId, req.body.userId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/document-collaboration/documents/:documentId/review/submit', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await submitForReview(req.params.documentId, req.body.reviewerIds),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/document-collaboration/documents/:documentId/review/respond', async (req, res) => {
    try {
      const { userId, status, feedback } = req.body;
      res.json({
        success: true,
        data: await submitReview(req.params.documentId, userId, status, feedback),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/document-collaboration/documents/:documentId/versions', async (req, res) => {
    try {
      res.json({ success: true, data: await getDocumentVersions(req.params.documentId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return r;
}

/* ═══════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDCollabDocument,
  DDDComment,
  DOCUMENT_TYPES,
  REVIEW_WORKFLOWS,
  createDocument,
  updateDocument,
  lockDocument,
  unlockDocument,
  addComment,
  resolveComment,
  getDocumentComments,
  submitForReview,
  submitReview,
  getDocumentVersions,
  getDocumentCollabDashboard,
  createDocumentCollaborationRouter,
};

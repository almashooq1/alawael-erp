/**
 * Document Lifecycle Management - إدارة دورة حياة المستندات
 * Complete Document Management System with AI-Powered Features
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

/**
 * Document Lifecycle Configuration
 */
const lifecycleConfig = {
  // Document statuses
  statuses: {
    draft: { label: 'مسودة', color: 'gray', order: 1 },
    pending_review: { label: 'قيد المراجعة', color: 'yellow', order: 2 },
    approved: { label: 'معتمد', color: 'green', order: 3 },
    published: { label: 'منشور', color: 'blue', order: 4 },
    archived: { label: 'مؤرشف', color: 'purple', order: 5 },
    expired: { label: 'منتهي', color: 'red', order: 6 },
    deleted: { label: 'محذوف', color: 'black', order: 7 },
  },
  
  // Retention policies
  retention: {
    default: { years: 7, description: '7 سنوات افتراضياً' },
    financial: { years: 10, description: '10 سنوات للمالية' },
    legal: { years: 15, description: '15 سنة للقانونية' },
    hr: { years: 5, description: '5 سنوات للموارد البشرية' },
    contracts: { years: 10, description: '10 سنوات للعقود' },
  },
  
  // Lifecycle transitions
  transitions: {
    draft: ['pending_review', 'deleted'],
    pending_review: ['approved', 'draft', 'deleted'],
    approved: ['published', 'archived', 'deleted'],
    published: ['archived', 'expired', 'deleted'],
    archived: ['published', 'deleted'],
    expired: ['archived', 'deleted'],
    deleted: [],
  },
};

/**
 * Document Schema
 */
const DocumentSchema = new mongoose.Schema({
  // Basic info
  title: { type: String, required: true },
  description: String,
  documentNumber: { type: String, unique: true, sparse: true },
  
  // Content
  content: {
    text: String,
    html: String,
    summary: String,
  },
  
  // File info
  file: {
    originalName: String,
    fileName: String,
    filePath: String,
    fileType: String,
    mimeType: String,
    fileSize: Number,
    checksum: String,
    pageCount: Number,
  },
  
  // Classification
  classification: {
    category: { type: String, required: true },
    subcategory: String,
    tags: [String],
    keywords: [String],
    securityLevel: { 
      type: String, 
      enum: ['public', 'internal', 'confidential', 'secret'], 
      default: 'internal' 
    },
  },
  
  // Lifecycle
  lifecycle: {
    status: { type: String, enum: Object.keys(lifecycleConfig.statuses), default: 'draft' },
    version: { type: Number, default: 1 },
    stage: String,
    transitionHistory: [{
      from: String,
      to: String,
      timestamp: { type: Date, default: Date.now },
      userId: String,
      notes: String,
    }],
  },
  
  // Retention
  retention: {
    policy: { type: String, default: 'default' },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    destroyDate: Date,
    legalHold: { type: Boolean, default: false },
  },
  
  // Ownership
  ownership: {
    createdBy: { type: String, required: true },
    ownedBy: { type: String, required: true },
    department: String,
    team: String,
  },
  
  // Access control
  access: {
    readers: [String],
    writers: [String],
    approvers: [String],
    publicAccess: { type: Boolean, default: false },
  },
  
  // Metadata
  metadata: {
    language: { type: String, default: 'ar' },
    source: String,
    relatedDocuments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    parentDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    customFields: mongoose.Schema.Types.Mixed,
  },
  
  // AI-generated fields
  ai: {
    summary: String,
    keywords: [String],
    entities: [{
      type: String,
      value: String,
      confidence: Number,
    }],
    sentiment: String,
    category: String,
    processedAt: Date,
  },
  
  // Statistics
  statistics: {
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    lastViewedAt: Date,
    lastDownloadedAt: Date,
  },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  publishedAt: Date,
  archivedAt: Date,
}, {
  collection: 'documents',
});

// Indexes
DocumentSchema.index({ title: 'text', 'content.text': 'text', 'classification.tags': 'text' });
DocumentSchema.index({ 'lifecycle.status': 1 });
DocumentSchema.index({ 'ownership.ownedBy': 1 });
DocumentSchema.index({ 'retention.endDate': 1 });

/**
 * Document Version Schema
 */
const DocumentVersionSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  version: { type: Number, required: true },
  
  // Snapshot of document at this version
  snapshot: {
    title: String,
    content: mongoose.Schema.Types.Mixed,
    file: mongoose.Schema.Types.Mixed,
    classification: mongoose.Schema.Types.Mixed,
  },
  
  // Change info
  changeSummary: String,
  changeType: { type: String, enum: ['create', 'update', 'major_update', 'restore'] },
  
  // Author
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  
  // Tenant
  tenantId: String,
}, {
  collection: 'document_versions',
});

// Compound index
DocumentVersionSchema.index({ documentId: 1, version: 1 }, { unique: true });

/**
 * Document Lifecycle Service Class
 */
class DocumentLifecycleService extends EventEmitter {
  constructor() {
    super();
    this.Document = null;
    this.DocumentVersion = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.Document = connection.model('Document', DocumentSchema);
    this.DocumentVersion = connection.model('DocumentVersion', DocumentVersionSchema);
    
    console.log('✅ Document Lifecycle Service initialized');
  }
  
  /**
   * Create document
   */
  async createDocument(data) {
    // Generate document number
    const documentNumber = await this.generateDocumentNumber(data.category);
    
    // Calculate retention end date
    const retentionPolicy = lifecycleConfig.retention[data.retentionPolicy] || lifecycleConfig.retention.default;
    const retentionEnd = new Date();
    retentionEnd.setFullYear(retentionEnd.getFullYear() + retentionPolicy.years);
    
    const document = await this.Document.create({
      ...data,
      documentNumber,
      lifecycle: {
        status: 'draft',
        version: 1,
      },
      retention: {
        policy: data.retentionPolicy || 'default',
        startDate: new Date(),
        endDate: retentionEnd,
      },
    });
    
    // Create initial version
    await this.createVersion(document._id, 1, 'create', 'إنشاء المستند', data.createdBy);
    
    // Emit event
    this.emit('document:created', document);
    
    return document;
  }
  
  /**
   * Generate document number
   */
  async generateDocumentNumber(category) {
    const prefix = category.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const count = await this.Document.countDocuments({ 
      category, 
      createdAt: { $gte: new Date(year, 0, 1) } 
    });
    const sequence = (count + 1).toString().padStart(6, '0');
    return `${prefix}-${year}-${sequence}`;
  }
  
  /**
   * Transition document status
   */
  async transitionStatus(documentId, newStatus, userId, options = {}) {
    const document = await this.Document.findById(documentId);
    if (!document) throw new Error('Document not found');
    
    const currentStatus = document.lifecycle.status;
    
    // Validate transition
    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw new Error(`Invalid transition from ${currentStatus} to ${newStatus}`);
    }
    
    // Record transition
    document.lifecycle.transitionHistory.push({
      from: currentStatus,
      to: newStatus,
      timestamp: new Date(),
      userId,
      notes: options.notes,
    });
    
    // Update status
    document.lifecycle.status = newStatus;
    
    // Update specific timestamps
    if (newStatus === 'published') {
      document.publishedAt = new Date();
    } else if (newStatus === 'archived') {
      document.archivedAt = new Date();
    }
    
    await document.save();
    
    // Emit event
    this.emit('document:transition', { document, from: currentStatus, to: newStatus, userId });
    
    return document;
  }
  
  /**
   * Check if transition is valid
   */
  isValidTransition(from, to) {
    const allowedTransitions = lifecycleConfig.transitions[from];
    return allowedTransitions && allowedTransitions.includes(to);
  }
  
  /**
   * Update document content
   */
  async updateDocument(documentId, updates, userId, options = {}) {
    const document = await this.Document.findById(documentId);
    if (!document) throw new Error('Document not found');
    
    // Create new version
    const newVersion = document.lifecycle.version + (options.majorUpdate ? 1 : 0);
    
    // Apply updates
    Object.assign(document, updates);
    document.updatedAt = new Date();
    
    if (options.majorUpdate) {
      document.lifecycle.version = newVersion;
      await this.createVersion(
        documentId, 
        newVersion, 
        'major_update', 
        updates.changeSummary || 'تحديث رئيسي', 
        userId
      );
    }
    
    await document.save();
    
    this.emit('document:updated', document);
    
    return document;
  }
  
  /**
   * Create document version
   */
  async createVersion(documentId, version, changeType, summary, userId) {
    const document = await this.Document.findById(documentId);
    
    return this.DocumentVersion.create({
      documentId,
      version,
      snapshot: {
        title: document.title,
        content: document.content,
        file: document.file,
        classification: document.classification,
      },
      changeType,
      changeSummary: summary,
      createdBy: userId,
      tenantId: document.tenantId,
    });
  }
  
  /**
   * Get document versions
   */
  async getVersions(documentId) {
    return this.DocumentVersion.find({ documentId })
      .sort({ version: -1 });
  }
  
  /**
   * Restore document to version
   */
  async restoreVersion(documentId, version, userId) {
    const docVersion = await this.DocumentVersion.findOne({ documentId, version });
    if (!docVersion) throw new Error('Version not found');
    
    const document = await this.Document.findById(documentId);
    
    // Restore from snapshot
    document.title = docVersion.snapshot.title;
    document.content = docVersion.snapshot.content;
    document.file = docVersion.snapshot.file;
    document.classification = docVersion.snapshot.classification;
    document.lifecycle.version += 1;
    document.updatedAt = new Date();
    
    await document.save();
    
    // Create restore version
    await this.createVersion(
      documentId, 
      document.lifecycle.version, 
      'restore', 
      `استعادة النسخة ${version}`, 
      userId
    );
    
    return document;
  }
  
  /**
   * Search documents
   */
  async search(query, options = {}) {
    const filter = { 'lifecycle.status': { $ne: 'deleted' } };
    
    if (options.category) filter['classification.category'] = options.category;
    if (options.status) filter['lifecycle.status'] = options.status;
    if (options.ownedBy) filter['ownership.ownedBy'] = options.ownedBy;
    if (options.tags) filter['classification.tags'] = { $in: options.tags };
    if (options.tenantId) filter.tenantId = options.tenantId;
    
    // Text search
    if (query) {
      filter.$text = { $search: query };
    }
    
    // Date range
    if (options.fromDate || options.toDate) {
      filter.createdAt = {};
      if (options.fromDate) filter.createdAt.$gte = new Date(options.fromDate);
      if (options.toDate) filter.createdAt.$lte = new Date(options.toDate);
    }
    
    const results = await this.Document.find(filter)
      .sort(options.sort || { createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0);
    
    const total = await this.Document.countDocuments(filter);
    
    return { results, total };
  }
  
  /**
   * Get document by ID
   */
  async getDocument(documentId) {
    return this.Document.findById(documentId)
      .populate('metadata.relatedDocuments')
      .populate('metadata.parentDocument');
  }
  
  /**
   * Get document by number
   */
  async getDocumentByNumber(documentNumber) {
    return this.Document.findOne({ documentNumber });
  }
  
  /**
   * Delete document (soft delete)
   */
  async deleteDocument(documentId, userId, reason = '') {
    const document = await this.Document.findById(documentId);
    if (!document) throw new Error('Document not found');
    
    // Soft delete
    document.lifecycle.status = 'deleted';
    document.lifecycle.transitionHistory.push({
      from: document.lifecycle.status,
      to: 'deleted',
      timestamp: new Date(),
      userId,
      notes: reason,
    });
    
    await document.save();
    
    this.emit('document:deleted', { document, userId, reason });
    
    return document;
  }
  
  /**
   * Permanently delete document
   */
  async permanentDelete(documentId) {
    const document = await this.Document.findById(documentId);
    if (!document) throw new Error('Document not found');
    
    // Check retention policy
    if (document.retention.legalHold) {
      throw new Error('Document is on legal hold and cannot be deleted');
    }
    
    if (document.retention.destroyDate && new Date() < document.retention.destroyDate) {
      throw new Error('Retention period has not expired');
    }
    
    // Delete versions
    await this.DocumentVersion.deleteMany({ documentId });
    
    // Delete document
    await this.Document.findByIdAndDelete(documentId);
    
    this.emit('document:permanently_deleted', { documentId });
    
    return { success: true };
  }
  
  /**
   * Add legal hold
   */
  async addLegalHold(documentId, reason) {
    const document = await this.Document.findById(documentId);
    if (!document) throw new Error('Document not found');
    
    document.retention.legalHold = true;
    await document.save();
    
    return document;
  }
  
  /**
   * Remove legal hold
   */
  async removeLegalHold(documentId) {
    const document = await this.Document.findById(documentId);
    if (!document) throw new Error('Document not found');
    
    document.retention.legalHold = false;
    await document.save();
    
    return document;
  }
  
  /**
   * Share document
   */
  async shareDocument(documentId, userIds, permission = 'read') {
    const document = await this.Document.findById(documentId);
    if (!document) throw new Error('Document not found');
    
    for (const userId of userIds) {
      if (permission === 'read' && !document.access.readers.includes(userId)) {
        document.access.readers.push(userId);
      } else if (permission === 'write' && !document.access.writers.includes(userId)) {
        document.access.writers.push(userId);
      }
    }
    
    document.statistics.shares += 1;
    await document.save();
    
    return document;
  }
  
  /**
   * Record view
   */
  async recordView(documentId) {
    const document = await this.Document.findById(documentId);
    if (!document) return;
    
    document.statistics.views += 1;
    document.statistics.lastViewedAt = new Date();
    await document.save();
  }
  
  /**
   * Record download
   */
  async recordDownload(documentId) {
    const document = await this.Document.findById(documentId);
    if (!document) return;
    
    document.statistics.downloads += 1;
    document.statistics.lastDownloadedAt = new Date();
    await document.save();
  }
  
  /**
   * Get documents expiring soon
   */
  async getExpiringDocuments(days = 30) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    
    return this.Document.find({
      'lifecycle.status': { $nin: ['archived', 'deleted'] },
      'retention.endDate': { $lte: targetDate },
    });
  }
  
  /**
   * Get statistics
   */
  async getStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [
      total,
      byStatus,
      byCategory,
      recent,
    ] = await Promise.all([
      this.Document.countDocuments({ ...filter, 'lifecycle.status': { $ne: 'deleted' } }),
      this.Document.aggregate([
        { $match: { ...filter, 'lifecycle.status': { $ne: 'deleted' } } },
        { $group: { _id: '$lifecycle.status', count: { $sum: 1 } } },
      ]),
      this.Document.aggregate([
        { $match: { ...filter, 'lifecycle.status': { $ne: 'deleted' } } },
        { $group: { _id: '$classification.category', count: { $sum: 1 } } },
      ]),
      this.Document.find(filter)
        .sort({ createdAt: -1 })
        .limit(5),
    ]);
    
    return {
      total,
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byCategory: byCategory.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      recent,
    };
  }
}

// Singleton instance
const documentLifecycleService = new DocumentLifecycleService();

/**
 * Status labels (Arabic)
 */
const statusLabels = {
  draft: { label: 'مسودة', description: 'المستند في مرحلة الإنشاء' },
  pending_review: { label: 'قيد المراجعة', description: 'في انتظار المراجعة والاعتماد' },
  approved: { label: 'معتمد', description: 'تم اعتماد المستند' },
  published: { label: 'منشور', description: 'المستند منشور ومتاح' },
  archived: { label: 'مؤرشف', description: 'تم أرشفة المستند' },
  expired: { label: 'منتهي', description: 'انتهت صلاحية المستند' },
  deleted: { label: 'محذوف', description: 'تم حذف المستند' },
};

module.exports = {
  DocumentLifecycleService,
  documentLifecycleService,
  lifecycleConfig,
  statusLabels,
};
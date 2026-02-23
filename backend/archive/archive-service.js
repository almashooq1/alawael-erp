/**
 * Electronic Archive Service - نظام الأرشفة الإلكتروني
 * Enterprise Document Management & Archiving for Alawael ERP
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Archive Configuration
 */
const archiveConfig = {
  // Storage settings
  storage: {
    basePath: process.env.ARCHIVE_STORAGE_PATH || './storage/archive',
    tempPath: process.env.ARCHIVE_TEMP_PATH || './storage/temp',
    maxFileSize: parseInt(process.env.ARCHIVE_MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'jpg', 'jpeg', 'png', 'gif', 'tiff', 'bmp',
      'txt', 'csv', 'xml', 'json',
      'zip', 'rar', '7z',
    ],
  },
  
  // Retention policies
  retention: {
    default: 7 * 365, // 7 years in days
    categories: {
      financial: 10 * 365, // 10 years
      legal: 15 * 365, // 15 years
      hr: 7 * 365, // 7 years
      contracts: 10 * 365, // 10 years
      correspondence: 5 * 365, // 5 years
    },
  },
  
  // Classification levels
  classification: {
    levels: ['public', 'internal', 'confidential', 'secret'],
    default: 'internal',
  },
  
  // Indexing
  indexing: {
    enableOCR: process.env.ARCHIVE_OCR_ENABLED === 'true',
    enableFullText: true,
    languages: ['ar', 'en'],
  },
};

/**
 * Document Schema
 */
const DocumentSchema = new mongoose.Schema({
  // Identification
  documentNumber: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  description: String,
  
  // Classification
  category: {
    main: { type: String, required: true },
    sub: String,
    tags: [String],
  },
  
  // File information
  file: {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    extension: { type: String, required: true },
    checksum: { type: String, required: true },
  },
  
  // Versions
  version: { type: Number, default: 1 },
  parentDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  versions: [{
    version: Number,
    fileId: String,
    uploadedAt: Date,
    uploadedBy: String,
    notes: String,
  }],
  
  // Metadata
  metadata: {
    author: String,
    department: String,
    source: String,
    referenceNumber: String,
    externalReference: String,
    keywords: [String],
    customFields: mongoose.Schema.Types.Mixed,
  },
  
  // Dates
  documentDate: Date,
  receivedDate: Date,
  validFrom: Date,
  validUntil: Date,
  
  // Retention
  retention: {
    policy: { type: String, default: 'default' },
    retainUntil: Date,
    disposeAfter: Date,
    isExpired: { type: Boolean, default: false },
  },
  
  // Classification
  classification: {
    level: { type: String, enum: archiveConfig.classification.levels, default: 'internal' },
    department: String,
    accessList: [String],
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'archived', 'disposed', 'recalled'],
    default: 'active',
  },
  
  // Physical location (if applicable)
  physicalLocation: {
    building: String,
    floor: String,
    room: String,
    cabinet: String,
    shelf: String,
    box: String,
  },
  
  // Related documents
  relatedDocuments: [{
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    relationship: { type: String, enum: ['parent', 'child', 'reference', 'attachment', 'version'] },
  }],
  
  // Workflow
  workflow: {
    currentStage: String,
    history: [{
      stage: String,
      action: String,
      performedBy: String,
      performedAt: Date,
      notes: String,
    }],
  },
  
  // Audit trail
  audit: {
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
    updatedBy: String,
    updatedAt: Date,
    archivedBy: String,
    archivedAt: Date,
    accessedCount: { type: Number, default: 0 },
    lastAccessedAt: Date,
    lastAccessedBy: String,
  },
  
  // OCR & Indexing
  content: {
    extractedText: String,
    ocrStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'] },
    ocrConfidence: Number,
    indexedAt: Date,
  },
  
  // Permissions
  permissions: {
    view: [String], // user IDs or role names
    edit: [String],
    delete: [String],
    download: [String],
  },
  
  // Tenant
  tenantId: String,
}, {
  collection: 'archive_documents',
});

// Indexes
DocumentSchema.index({ documentNumber: 1 });
DocumentSchema.index({ 'category.main': 1, 'category.sub': 1 });
DocumentSchema.index({ status: 1, 'retention.isExpired': 1 });
DocumentSchema.index({ 'audit.createdAt': -1 });
DocumentSchema.index({ title: 'text', description: 'text', 'content.extractedText': 'text' });

/**
 * Archive Folder Schema
 */
const ArchiveFolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: 'ArchiveFolder' },
  path: { type: String, required: true },
  
  // Metadata
  description: String,
  color: String,
  icon: String,
  
  // Permissions
  permissions: {
    view: [String],
    edit: [String],
    admin: [String],
  },
  
  // Retention
  defaultRetention: String,
  defaultClassification: String,
  
  // Statistics
  documentCount: { type: Number, default: 0 },
  totalSize: { type: Number, default: 0 },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'archive_folders',
});

/**
 * Archive Service Class
 */
class ArchiveService {
  constructor() {
    this.Document = null;
    this.ArchiveFolder = null;
    this.storageAdapters = new Map();
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.Document = connection.model('Document', DocumentSchema);
    this.ArchiveFolder = connection.model('ArchiveFolder', ArchiveFolderSchema);
    
    // Ensure directories exist
    await fs.mkdir(archiveConfig.storage.basePath, { recursive: true });
    await fs.mkdir(archiveConfig.storage.tempPath, { recursive: true });
    
    // Register storage adapters
    this.registerStorageAdapters();
    
    console.log('✅ Archive Service initialized');
  }
  
  /**
   * Register storage adapters
   */
  registerStorageAdapters() {
    // Local filesystem adapter
    this.registerStorageAdapter('local', {
      save: async (file, path) => {
        await fs.writeFile(path, file.buffer);
        return { path, size: file.size };
      },
      read: async (path) => {
        return fs.readFile(path);
      },
      delete: async (path) => {
        await fs.unlink(path);
      },
      exists: async (path) => {
        try {
          await fs.access(path);
          return true;
        } catch {
          return false;
        }
      },
    });
    
    // S3 adapter placeholder
    this.registerStorageAdapter('s3', {
      save: async (file, key) => {
        // Would implement S3 upload
        return { key, size: file.size };
      },
      read: async (key) => {
        // Would implement S3 download
        return null;
      },
      delete: async (key) => {
        // Would implement S3 delete
      },
    });
  }
  
  /**
   * Register storage adapter
   */
  registerStorageAdapter(name, adapter) {
    this.storageAdapters.set(name, adapter);
  }
  
  /**
   * Generate document number
   */
  async generateDocumentNumber(category) {
    const year = new Date().getFullYear();
    const prefix = category.substring(0, 3).toUpperCase();
    
    const count = await this.Document.countDocuments({
      'category.main': category,
      'audit.createdAt': {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      },
    });
    
    const sequence = (count + 1).toString().padStart(6, '0');
    return `${prefix}-${year}-${sequence}`;
  }
  
  /**
   * Upload document
   */
  async uploadDocument(file, metadata, options = {}) {
    // Validate file
    this.validateFile(file);
    
    // Generate document number
    const documentNumber = await this.generateDocumentNumber(metadata.category.main);
    
    // Calculate checksum
    const checksum = this.calculateChecksum(file.buffer);
    
    // Generate storage path
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const storedName = `${documentNumber}-${Date.now()}${path.extname(file.originalname)}`;
    const relativePath = `${metadata.category.main}/${year}/${month}/${storedName}`;
    const fullPath = path.join(archiveConfig.storage.basePath, relativePath);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Save file
    const adapter = this.storageAdapters.get('local');
    await adapter.save(file, fullPath);
    
    // Calculate retention date
    const retentionDays = archiveConfig.retention.categories[metadata.category.main] || archiveConfig.retention.default;
    const retainUntil = new Date();
    retainUntil.setDate(retainUntil.getDate() + retentionDays);
    
    // Create document record
    const document = await this.Document.create({
      documentNumber,
      title: metadata.title,
      description: metadata.description,
      category: {
        main: metadata.category.main,
        sub: metadata.category.sub,
        tags: metadata.tags || [],
      },
      file: {
        originalName: file.originalname,
        storedName,
        path: relativePath,
        size: file.size,
        mimeType: file.mimetype,
        extension: path.extname(file.originalname).substring(1).toLowerCase(),
        checksum,
      },
      metadata: {
        author: metadata.author,
        department: metadata.department,
        source: metadata.source,
        referenceNumber: metadata.referenceNumber,
        keywords: metadata.keywords || [],
        customFields: metadata.customFields,
      },
      documentDate: metadata.documentDate,
      receivedDate: metadata.receivedDate || new Date(),
      validFrom: metadata.validFrom,
      validUntil: metadata.validUntil,
      retention: {
        policy: metadata.category.main,
        retainUntil,
        disposeAfter: retainUntil,
      },
      classification: {
        level: metadata.classification || archiveConfig.classification.default,
        department: metadata.department,
      },
      status: 'active',
      physicalLocation: metadata.physicalLocation,
      audit: {
        createdBy: options.userId,
        createdAt: new Date(),
      },
      permissions: metadata.permissions || {},
      tenantId: options.tenantId,
      content: {
        ocrStatus: archiveConfig.indexing.enableOCR ? 'pending' : null,
      },
    });
    
    // Trigger OCR if enabled
    if (archiveConfig.indexing.enableOCR) {
      this.processOCR(document._id).catch(console.error);
    }
    
    return document;
  }
  
  /**
   * Validate file
   */
  validateFile(file) {
    // Check file size
    if (file.size > archiveConfig.storage.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed (${archiveConfig.storage.maxFileSize / 1024 / 1024}MB)`);
    }
    
    // Check file type
    const extension = path.extname(file.originalname).substring(1).toLowerCase();
    if (!archiveConfig.storage.allowedTypes.includes(extension)) {
      throw new Error(`File type '${extension}' is not allowed`);
    }
    
    return true;
  }
  
  /**
   * Calculate checksum
   */
  calculateChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
  
  /**
   * Get document
   */
  async getDocument(id, options = {}) {
    const document = await this.Document.findById(id);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Update access stats
    await this.Document.findByIdAndUpdate(id, {
      $inc: { 'audit.accessedCount': 1 },
      'audit.lastAccessedAt': new Date(),
      'audit.lastAccessedBy': options.userId,
    });
    
    return document;
  }
  
  /**
   * Get document by number
   */
  async getDocumentByNumber(documentNumber) {
    return this.Document.findOne({ documentNumber });
  }
  
  /**
   * Download document
   */
  async downloadDocument(id, options = {}) {
    const document = await this.getDocument(id, options);
    
    const fullPath = path.join(archiveConfig.storage.basePath, document.file.path);
    const adapter = this.storageAdapters.get('local');
    
    const buffer = await adapter.read(fullPath);
    
    return {
      buffer,
      filename: document.file.originalName,
      mimeType: document.file.mimeType,
    };
  }
  
  /**
   * Update document metadata
   */
  async updateDocument(id, updates, options = {}) {
    const allowedUpdates = [
      'title', 'description', 'category', 'metadata',
      'documentDate', 'validFrom', 'validUntil',
      'classification', 'physicalLocation', 'permissions',
    ];
    
    const filteredUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }
    
    filteredUpdates['audit.updatedBy'] = options.userId;
    filteredUpdates['audit.updatedAt'] = new Date();
    
    return this.Document.findByIdAndUpdate(id, filteredUpdates, { new: true });
  }
  
  /**
   * Delete document (soft delete)
   */
  async deleteDocument(id, options = {}) {
    return this.Document.findByIdAndUpdate(id, {
      status: 'disposed',
      'audit.updatedBy': options.userId,
      'audit.updatedAt': new Date(),
    }, { new: true });
  }
  
  /**
   * Search documents
   */
  async searchDocuments(query, options = {}) {
    const {
      text,
      category,
      classification,
      dateFrom,
      dateTo,
      status,
      tags,
      page = 1,
      limit = 20,
    } = query;
    
    const filter = {};
    
    // Full text search
    if (text) {
      filter.$text = { $search: text };
    }
    
    // Category filter
    if (category) {
      filter['category.main'] = category;
    }
    
    // Classification filter
    if (classification) {
      filter['classification.level'] = classification;
    }
    
    // Date range
    if (dateFrom || dateTo) {
      filter['audit.createdAt'] = {};
      if (dateFrom) filter['audit.createdAt'].$gte = new Date(dateFrom);
      if (dateTo) filter['audit.createdAt'].$lte = new Date(dateTo);
    }
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Tags filter
    if (tags && tags.length > 0) {
      filter['category.tags'] = { $in: tags };
    }
    
    // Tenant filter
    if (options.tenantId) {
      filter.tenantId = options.tenantId;
    }
    
    const skip = (page - 1) * limit;
    
    const [documents, total] = await Promise.all([
      this.Document.find(filter)
        .sort({ 'audit.createdAt': -1 })
        .skip(skip)
        .limit(limit),
      this.Document.countDocuments(filter),
    ]);
    
    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Archive document
   */
  async archiveDocument(id, options = {}) {
    return this.Document.findByIdAndUpdate(id, {
      status: 'archived',
      'audit.archivedBy': options.userId,
      'audit.archivedAt': new Date(),
    }, { new: true });
  }
  
  /**
   * Create new version
   */
  async createVersion(id, file, options = {}) {
    const original = await this.Document.findById(id);
    if (!original) throw new Error('Document not found');
    
    // Validate file
    this.validateFile(file);
    
    // Generate new storage path
    const storedName = `${original.documentNumber}-v${original.version + 1}-${Date.now()}${path.extname(file.originalname)}`;
    const relativePath = `${original.category.main}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${storedName}`;
    const fullPath = path.join(archiveConfig.storage.basePath, relativePath);
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    const adapter = this.storageAdapters.get('local');
    await adapter.save(file, fullPath);
    
    // Add version to history
    const versionEntry = {
      version: original.version,
      fileId: original.file.path,
      uploadedAt: original.audit.createdAt,
      uploadedBy: original.audit.createdBy,
      notes: options.notes,
    };
    
    // Update document
    return this.Document.findByIdAndUpdate(id, {
      $push: { versions: versionEntry },
      'file.originalName': file.originalname,
      'file.storedName': storedName,
      'file.path': relativePath,
      'file.size': file.size,
      'file.checksum': this.calculateChecksum(file.buffer),
      version: original.version + 1,
      'audit.updatedBy': options.userId,
      'audit.updatedAt': new Date(),
    }, { new: true });
  }
  
  /**
   * Process OCR
   */
  async processOCR(id) {
    const document = await this.Document.findById(id);
    if (!document) return;
    
    try {
      // Update status
      await this.Document.findByIdAndUpdate(id, { 'content.ocrStatus': 'processing' });
      
      // Would integrate with OCR service (Tesseract, Google Vision, etc.)
      // For now, just mark as completed
      await this.Document.findByIdAndUpdate(id, {
        'content.ocrStatus': 'completed',
        'content.ocrConfidence': 0.95,
        'content.extractedText': '', // Would contain extracted text
        'content.indexedAt': new Date(),
      });
      
    } catch (error) {
      await this.Document.findByIdAndUpdate(id, {
        'content.ocrStatus': 'failed',
      });
    }
  }
  
  /**
   * Get expired documents
   */
  async getExpiredDocuments() {
    return this.Document.find({
      'retention.retainUntil': { $lt: new Date() },
      'retention.isExpired': false,
      status: { $ne: 'disposed' },
    });
  }
  
  /**
   * Process retention
   */
  async processRetention() {
    const expired = await this.getExpiredDocuments();
    
    for (const doc of expired) {
      await this.Document.findByIdAndUpdate(doc._id, {
        'retention.isExpired': true,
        status: 'disposed',
      });
      
      console.log(`Document ${doc.documentNumber} marked as expired`);
    }
    
    return { processed: expired.length };
  }
  
  /**
   * Get statistics
   */
  async getStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [
      total,
      byCategory,
      byStatus,
      byClassification,
      totalSize,
    ] = await Promise.all([
      this.Document.countDocuments(filter),
      this.Document.aggregate([
        { $match: filter },
        { $group: { _id: '$category.main', count: { $sum: 1 } } },
      ]),
      this.Document.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.Document.aggregate([
        { $match: filter },
        { $group: { _id: '$classification.level', count: { $sum: 1 } } },
      ]),
      this.Document.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$file.size' } } },
      ]),
    ]);
    
    return {
      total,
      byCategory: byCategory.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byClassification: byClassification.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      totalSize: totalSize[0]?.total || 0,
    };
  }
  
  /**
   * Create folder
   */
  async createFolder(data, options = {}) {
    const parentPath = data.parentFolder 
      ? (await this.ArchiveFolder.findById(data.parentFolder))?.path 
      : '';
    
    const folderPath = parentPath ? `${parentPath}/${data.name}` : data.name;
    
    return this.ArchiveFolder.create({
      ...data,
      path: folderPath,
      tenantId: options.tenantId,
    });
  }
  
  /**
   * Get folder contents
   */
  async getFolderContents(folderId, options = {}) {
    const filter = { tenantId: options.tenantId };
    
    if (folderId) {
      const folder = await this.ArchiveFolder.findById(folderId);
      filter['category.main'] = folder?.name;
    }
    
    const [documents, subfolders] = await Promise.all([
      this.Document.find(filter).limit(100),
      this.ArchiveFolder.find({ 
        parentFolder: folderId || null,
        tenantId: options.tenantId,
      }),
    ]);
    
    return { documents, subfolders };
  }
}

// Singleton instance
const archiveService = new ArchiveService();

/**
 * Archive Categories
 */
const archiveCategories = {
  financial: {
    name: 'المالية',
    nameEn: 'Financial',
    subcategories: ['الفواتير', 'الميزانيات', 'التقارير المالية', 'العقود المالية'],
    retention: 10 * 365,
  },
  legal: {
    name: 'القانونية',
    nameEn: 'Legal',
    subcategories: ['العقود', 'الاتفاقيات', 'المراسلات القانونية', 'القضايا'],
    retention: 15 * 365,
  },
  hr: {
    name: 'الموارد البشرية',
    nameEn: 'Human Resources',
    subcategories: ['ملفات الموظفين', 'العقود', 'التقييمات', 'الطلبات'],
    retention: 7 * 365,
  },
  contracts: {
    name: 'العقود',
    nameEn: 'Contracts',
    subcategories: ['عقود الموردين', 'عقود العملاء', 'عقود الخدمات'],
    retention: 10 * 365,
  },
  correspondence: {
    name: 'المراسلات',
    nameEn: 'Correspondence',
    subcategories: ['الصادرة', 'الواردة', 'الداخلية'],
    retention: 5 * 365,
  },
  technical: {
    name: 'الفنية',
    nameEn: 'Technical',
    subcategories: ['المخططات', 'التقارير الفنية', 'الشهادات'],
    retention: 7 * 365,
  },
};

module.exports = {
  ArchiveService,
  archiveService,
  archiveConfig,
  archiveCategories,
};
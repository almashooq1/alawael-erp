/**
 * File Storage Service - خدمة تخزين الملفات
 * Enterprise File Storage for Alawael ERP
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { Readable } = require('stream');

/**
 * Storage Configuration
 */
const storageConfig = {
  // Default provider
  provider: process.env.STORAGE_PROVIDER || 'local', // local, s3, azure, gcs
  
  // Local storage
  local: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    tempDir: process.env.TEMP_DIR || './uploads/temp',
  },
  
  // AWS S3
  s3: {
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_REGION || 'me-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  
  // Azure Blob Storage
  azure: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    containerName: process.env.AZURE_CONTAINER_NAME || 'alawael-files',
  },
  
  // File constraints
  constraints: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
    ],
    imageMaxSize: 10 * 1024 * 1024, // 10MB
  },
};

/**
 * File Metadata Schema
 */
const FileMetadataSchema = {
  fileId: { type: String, required: true, unique: true },
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  hash: { type: String, required: true },
  
  // Storage info
  provider: { type: String, required: true },
  path: { type: String, required: true },
  bucket: String,
  
  // Ownership
  uploadedBy: { type: String, required: true },
  tenantId: String,
  organizationId: String,
  
  // Access control
  access: {
    type: { type: String, enum: ['private', 'public', 'restricted'], default: 'private' },
    allowedRoles: [String],
    allowedUsers: [String],
  },
  
  // Metadata
  metadata: {
    title: String,
    description: String,
    tags: [String],
    category: String,
  },
  
  // Image specific
  image: {
    width: Number,
    height: Number,
    format: String,
  },
  
  // Versions
  versions: [{
    versionId: String,
    size: Number,
    uploadedAt: Date,
    uploadedBy: String,
  }],
  
  // Timestamps
  uploadedAt: { type: Date, default: Date.now },
  updatedAt: Date,
  expiresAt: Date,
  
  // Status
  status: {
    type: String,
    enum: ['active', 'deleted', 'archived'],
    default: 'active',
  },
};

/**
 * Storage Provider Interface
 */
class StorageProvider {
  constructor(config) {
    this.config = config;
  }
  
  async upload(key, data, options) {
    throw new Error('Method not implemented');
  }
  
  async download(key) {
    throw new Error('Method not implemented');
  }
  
  async delete(key) {
    throw new Error('Method not implemented');
  }
  
  async getSignedUrl(key, expiresIn) {
    throw new Error('Method not implemented');
  }
  
  async exists(key) {
    throw new Error('Method not implemented');
  }
  
  async getMetadata(key) {
    throw new Error('Method not implemented');
  }
}

/**
 * Local Storage Provider
 */
class LocalStorageProvider extends StorageProvider {
  constructor(config) {
    super(config);
    this.uploadDir = config.uploadDir;
    this.tempDir = config.tempDir;
  }
  
  async initialize() {
    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.mkdir(this.tempDir, { recursive: true });
    console.log('✅ Local storage initialized');
  }
  
  async upload(key, data, options = {}) {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);
    
    await fs.mkdir(dir, { recursive: true });
    
    if (Buffer.isBuffer(data)) {
      await fs.writeFile(filePath, data);
    } else if (data instanceof Readable) {
      const chunks = [];
      for await (const chunk of data) {
        chunks.push(chunk);
      }
      await fs.writeFile(filePath, Buffer.concat(chunks));
    } else {
      await fs.writeFile(filePath, data);
    }
    
    return { key, path: filePath };
  }
  
  async download(key) {
    const filePath = path.join(this.uploadDir, key);
    return fs.readFile(filePath);
  }
  
  async delete(key) {
    const filePath = path.join(this.uploadDir, key);
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async getSignedUrl(key, expiresIn = 3600) {
    // For local storage, return a simple API endpoint
    return `/api/files/download/${key}?expires=${Date.now() + expiresIn * 1000}`;
  }
  
  async exists(key) {
    const filePath = path.join(this.uploadDir, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async getMetadata(key) {
    const filePath = path.join(this.uploadDir, key);
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime,
    };
  }
  
  async createReadStream(key) {
    const filePath = path.join(this.uploadDir, key);
    const { createReadStream } = require('fs');
    return createReadStream(filePath);
  }
}

/**
 * AWS S3 Storage Provider
 */
class S3StorageProvider extends StorageProvider {
  constructor(config) {
    super(config);
    this.s3 = null;
  }
  
  async initialize() {
    const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    
    this.s3 = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
    
    this.PutObjectCommand = PutObjectCommand;
    this.GetObjectCommand = GetObjectCommand;
    this.DeleteObjectCommand = DeleteObjectCommand;
    this.getSignedUrl = getSignedUrl;
    
    console.log('✅ S3 storage initialized');
  }
  
  async upload(key, data, options = {}) {
    const command = new this.PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: data,
      ContentType: options.contentType,
      Metadata: options.metadata,
    });
    
    await this.s3.send(command);
    
    return { key, bucket: this.config.bucket };
  }
  
  async download(key) {
    const command = new this.GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });
    
    const response = await this.s3.send(command);
    
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }
  
  async delete(key) {
    const command = new this.DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });
    
    await this.s3.send(command);
    return true;
  }
  
  async getSignedUrl(key, expiresIn = 3600) {
    const command = new this.GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });
    
    return this.getSignedUrl(this.s3, command, { expiresIn });
  }
  
  async exists(key) {
    try {
      await this.getMetadata(key);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Azure Blob Storage Provider
 */
class AzureStorageProvider extends StorageProvider {
  constructor(config) {
    super(config);
    this.containerClient = null;
  }
  
  async initialize() {
    const { BlobServiceClient } = require('@azure/storage-blob');
    
    const blobServiceClient = BlobServiceClient.fromConnectionString(this.config.connectionString);
    this.containerClient = blobServiceClient.getContainerClient(this.config.containerName);
    
    await this.containerClient.createIfNotExists();
    
    console.log('✅ Azure Blob storage initialized');
  }
  
  async upload(key, data, options = {}) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    
    await blockBlobClient.uploadData(data, {
      blobHTTPHeaders: { blobContentType: options.contentType },
      metadata: options.metadata,
    });
    
    return { key, container: this.config.containerName };
  }
  
  async download(key) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    const response = await blockBlobClient.download(0);
    
    const chunks = [];
    for await (const chunk of response.readableStreamBody) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }
  
  async delete(key) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    await blockBlobClient.delete();
    return true;
  }
  
  async getSignedUrl(key, expiresIn = 3600) {
    const { generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');
    
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    
    const sasOptions = {
      containerName: this.config.containerName,
      blobName: key,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + expiresIn * 1000),
    };
    
    // Generate SAS token
    const sasToken = generateBlobSASQueryParameters(
      sasOptions,
      this.containerClient.credential
    ).toString();
    
    return `${blockBlobClient.url}?${sasToken}`;
  }
  
  async exists(key) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    return blockBlobClient.exists();
  }
}

/**
 * File Storage Manager
 */
class FileStorageManager {
  constructor() {
    this.provider = null;
    this.File = null;
  }
  
  /**
   * Initialize storage manager
   */
  async initialize(connection, providerType = storageConfig.provider) {
    // Initialize provider
    switch (providerType) {
      case 's3':
        this.provider = new S3StorageProvider(storageConfig.s3);
        break;
      case 'azure':
        this.provider = new AzureStorageProvider(storageConfig.azure);
        break;
      default:
        this.provider = new LocalStorageProvider(storageConfig.local);
    }
    
    await this.provider.initialize();
    
    // Initialize File model
    if (connection) {
      const mongoose = require('mongoose');
      const schema = new mongoose.Schema(FileMetadataSchema);
      this.File = connection.model('File', schema);
    }
    
    console.log(`✅ File storage manager initialized (${providerType})`);
  }
  
  /**
   * Upload file
   */
  async upload(file, options = {}) {
    const {
      userId,
      tenantId,
      organizationId,
      access = 'private',
      metadata = {},
      folder = '',
    } = options;
    
    // Validate file
    this.validateFile(file);
    
    // Generate file ID and key
    const fileId = this.generateFileId();
    const ext = path.extname(file.originalname);
    const fileName = `${fileId}${ext}`;
    const key = folder ? `${folder}/${fileName}` : fileName;
    
    // Calculate hash
    const hash = this.calculateHash(file.buffer || file.data);
    
    // Upload to provider
    await this.provider.upload(key, file.buffer || file.data, {
      contentType: file.mimetype,
      metadata: {
        userId,
        originalName: file.originalname,
      },
    });
    
    // Get image dimensions if applicable
    let imageData = null;
    if (file.mimetype.startsWith('image/')) {
      imageData = await this.getImageDimensions(file.buffer || file.data);
    }
    
    // Save metadata
    const fileDoc = new this.File({
      fileId,
      originalName: file.originalname,
      fileName,
      mimeType: file.mimetype,
      size: file.size,
      hash,
      provider: storageConfig.provider,
      path: key,
      uploadedBy: userId,
      tenantId,
      organizationId,
      access: { type: access },
      metadata,
      image: imageData,
    });
    
    await fileDoc.save();
    
    return {
      fileId,
      fileName,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      url: await this.getUrl(fileId),
    };
  }
  
  /**
   * Download file
   */
  async download(fileId, userId) {
    const fileDoc = await this.getFile(fileId);
    
    if (!fileDoc) {
      throw new Error('File not found');
    }
    
    // Check access
    if (!this.canAccess(fileDoc, userId)) {
      throw new Error('Access denied');
    }
    
    const data = await this.provider.download(fileDoc.path);
    
    return {
      data,
      fileName: fileDoc.originalName,
      mimeType: fileDoc.mimeType,
    };
  }
  
  /**
   * Get file stream
   */
  async getStream(fileId, userId) {
    const fileDoc = await this.getFile(fileId);
    
    if (!fileDoc) {
      throw new Error('File not found');
    }
    
    if (!this.canAccess(fileDoc, userId)) {
      throw new Error('Access denied');
    }
    
    if (this.provider.createReadStream) {
      return this.provider.createReadStream(fileDoc.path);
    }
    
    const data = await this.provider.download(fileDoc.path);
    return Readable.from(data);
  }
  
  /**
   * Get signed URL
   */
  async getUrl(fileId, expiresIn = 3600) {
    const fileDoc = await this.getFile(fileId);
    
    if (!fileDoc) {
      throw new Error('File not found');
    }
    
    if (fileDoc.access.type === 'public') {
      return `/api/files/public/${fileId}`;
    }
    
    return this.provider.getSignedUrl(fileDoc.path, expiresIn);
  }
  
  /**
   * Delete file
   */
  async delete(fileId, userId) {
    const fileDoc = await this.getFile(fileId);
    
    if (!fileDoc) {
      throw new Error('File not found');
    }
    
    // Check ownership
    if (fileDoc.uploadedBy !== userId) {
      throw new Error('Only owner can delete file');
    }
    
    await this.provider.delete(fileDoc.path);
    
    fileDoc.status = 'deleted';
    await fileDoc.save();
    
    return true;
  }
  
  /**
   * Get file metadata
   */
  async getFile(fileId) {
    return this.File.findOne({ fileId, status: 'active' });
  }
  
  /**
   * List files
   */
  async list(options = {}) {
    const {
      userId,
      tenantId,
      mimeType,
      category,
      limit = 50,
      skip = 0,
    } = options;
    
    const query = { status: 'active' };
    
    if (userId) query.uploadedBy = userId;
    if (tenantId) query.tenantId = tenantId;
    if (mimeType) query.mimeType = new RegExp(mimeType);
    if (category) query['metadata.category'] = category;
    
    return this.File.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);
  }
  
  /**
   * Validate file
   */
  validateFile(file) {
    const { constraints } = storageConfig;
    
    // Check size
    const maxSize = file.mimetype.startsWith('image/')
      ? constraints.imageMaxSize
      : constraints.maxFileSize;
    
    if (file.size > maxSize) {
      throw new Error(`File size exceeds limit (${maxSize / 1024 / 1024}MB)`);
    }
    
    // Check mime type
    if (!constraints.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('File type not allowed');
    }
  }
  
  /**
   * Check file access
   */
  canAccess(fileDoc, userId) {
    if (fileDoc.access.type === 'public') return true;
    if (fileDoc.uploadedBy === userId) return true;
    if (fileDoc.access.allowedUsers?.includes(userId)) return true;
    
    // Add role check if needed
    
    return false;
  }
  
  /**
   * Generate file ID
   */
  generateFileId() {
    return `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
  
  /**
   * Calculate file hash
   */
  calculateHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Get image dimensions
   */
  async getImageDimensions(data) {
    try {
      const sharp = require('sharp');
      const metadata = await sharp(data).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Get storage statistics
   */
  async getStats(tenantId) {
    const query = { status: 'active' };
    if (tenantId) query.tenantId = tenantId;
    
    const [total, byType, totalSize] = await Promise.all([
      this.File.countDocuments(query),
      this.File.aggregate([
        { $match: query },
        { $group: { _id: '$mimeType', count: { $sum: 1 }, size: { $sum: '$size' } } },
      ]),
      this.File.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$size' } } },
      ]),
    ]);
    
    return {
      total,
      byType,
      totalSize: totalSize[0]?.total || 0,
    };
  }
}

// Singleton instance
const fileStorageManager = new FileStorageManager();

/**
 * File Upload Middleware
 */
const uploadMiddleware = (options = {}) => {
  const multer = require('multer');
  
  const storage = multer.memoryStorage();
  
  const upload = multer({
    storage,
    limits: {
      fileSize: options.maxSize || storageConfig.constraints.maxFileSize,
    },
    fileFilter: (req, file, cb) => {
      if (storageConfig.constraints.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed'));
      }
    },
  });
  
  return upload;
};

module.exports = {
  FileStorageManager,
  fileStorageManager,
  FileMetadataSchema,
  LocalStorageProvider,
  S3StorageProvider,
  AzureStorageProvider,
  uploadMiddleware,
  storageConfig,
};
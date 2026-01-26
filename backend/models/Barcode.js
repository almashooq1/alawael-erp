/**
 * Barcode Model
 * Handles barcode generation, storage, and management
 */

const mongoose = require('mongoose');

const BarcodeSchema = new mongoose.Schema({
  // Basic barcode information
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },

  barcodeType: {
    type: String,
    enum: ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC', 'QR', 'DATAMATRIX'],
    default: 'CODE128',
    required: true,
  },

  // Associated data
  entityType: {
    type: String,
    enum: [
      'PRODUCT',
      'VEHICLE',
      'ASSET',
      'EMPLOYEE',
      'STUDENT',
      'PATIENT',
      'INVOICE',
      'SHIPMENT',
      'PACKAGE',
      'CUSTOM',
    ],
    required: true,
    index: true,
  },

  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  entityName: {
    type: String,
    required: true,
  },

  // Barcode content/data
  barcodeData: {
    type: String,
    required: true,
  },

  // SVG/Image representation
  barcodeImage: {
    type: String,
    // Base64 encoded SVG or image
  },

  // Metadata
  format: {
    type: String,
    enum: ['SVG', 'PNG', 'JPEG', 'PDF'],
    default: 'SVG',
  },

  displayFormat: {
    showText: {
      type: Boolean,
      default: true,
    },
    width: {
      type: Number,
      default: 2,
    },
    height: {
      type: Number,
      default: 100,
    },
    margin: {
      type: Number,
      default: 10,
    },
  },

  // Status and lifecycle
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED', 'REVOKED'],
    default: 'ACTIVE',
    index: true,
  },

  // Scan tracking
  scanHistory: [
    {
      scannedAt: {
        type: Date,
        default: Date.now,
      },
      scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      location: String,
      device: String,
      action: {
        type: String,
        enum: ['SCAN', 'VERIFY', 'UPDATE', 'TRANSFER'],
      },
      details: mongoose.Schema.Types.Mixed,
    },
  ],

  // Usage statistics
  totalScans: {
    type: Number,
    default: 0,
    index: true,
  },

  lastScannedAt: {
    type: Date,
  },

  lastScannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Expiration and validity
  expiresAt: {
    type: Date,
    index: true,
  },

  isExpired: {
    type: Boolean,
    default: false,
    index: true,
  },

  // Batch information
  batchId: {
    type: String,
    index: true,
  },

  batchNumber: Number,
  totalInBatch: Number,

  // Tags and categorization
  tags: [String],

  category: String,

  // Additional metadata
  description: String,

  customFields: mongoose.Schema.Types.Mixed,

  // Workflow status
  workflowStatus: {
    type: String,
    enum: ['PENDING', 'GENERATED', 'PRINTED', 'DISTRIBUTED', 'IN_USE', 'DEACTIVATED'],
    default: 'GENERATED',
  },

  // Permissions
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Audit trail
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  deletedAt: {
    type: Date,
  },

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

// Indexes
// Note: code field has unique:true (creates automatic index), so no need for compound index with code
BarcodeSchema.index({ status: 1 });
BarcodeSchema.index({ entityType: 1, entityId: 1 });
BarcodeSchema.index({ createdAt: -1 });
BarcodeSchema.index({ lastScannedAt: -1 });
BarcodeSchema.index({ batchId: 1 });
BarcodeSchema.index({ tags: 1 });

// Methods
BarcodeSchema.methods.recordScan = async function (userId, action, details = {}) {
  this.scanHistory.push({
    scannedAt: new Date(),
    scannedBy: userId,
    action,
    details,
  });

  this.totalScans = (this.totalScans || 0) + 1;
  this.lastScannedAt = new Date();
  this.lastScannedBy = userId;

  return this.save();
};

BarcodeSchema.methods.isValid = function () {
  if (this.status !== 'ACTIVE') return false;
  if (this.isExpired) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

BarcodeSchema.methods.deactivate = function (userId, reason = '') {
  this.status = 'INACTIVE';
  this.updatedBy = userId;
  this.updatedAt = new Date();

  if (reason) {
    this.customFields = this.customFields || {};
    this.customFields.deactivationReason = reason;
  }

  return this.save();
};

BarcodeSchema.methods.archive = function (userId) {
  this.status = 'ARCHIVED';
  this.updatedBy = userId;
  this.updatedAt = new Date();
  return this.save();
};

// Statics
BarcodeSchema.statics.generateCode = function (prefix = '', length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix || '';

  for (let i = 0; i < length - prefix.length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
};

BarcodeSchema.statics.findByCode = function (code) {
  return this.findOne({ code, status: 'ACTIVE' });
};

BarcodeSchema.statics.getScanHistory = function (barcodeId) {
  return this.findById(barcodeId, 'scanHistory');
};

module.exports = mongoose.model('Barcode', BarcodeSchema);

const mongoose = require('mongoose');

const barcodeLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['QR', 'BARCODE', 'BATCH'],
      required: true
    },
    data: {
      type: String,
      required: function () {
        return this.type !== 'BATCH';
      },
    },
    format: {
      type: String,
      enum: ['CODE128', 'CODE39', 'EAN13', 'UPC'],
      default: 'CODE128',
    },
    errorCorrection: {
      type: String,
      enum: ['L', 'M', 'Q', 'H'],
      default: 'M',
    },
    batchSize: Number,
    successCount: Number,
    errorCount: Number,
    duration: Number,
    status: {
      type: String,
      enum: ['success', 'error', 'pending', 'completed'],
      default: 'success'
    },
    generatedBy: {
      type: String,
      default: 'system',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ipAddress: String,
    userAgent: String,
    errorMessage: String,
  },
  {
    timestamps: true,
    collection: 'barcode_logs',
  }
);

// TTL Index - Auto delete logs older than 30 days
barcodeLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// Compound indexes for common queries
barcodeLogSchema.index({ type: 1, status: 1 });
barcodeLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('BarcodeLog', barcodeLogSchema);

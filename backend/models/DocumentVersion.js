'use strict';

const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    versionNumber: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filePath: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileHash: { type: String, required: true }, // SHA-256
    changeNotes: { type: String, default: null },
    diffSummary: { type: mongoose.Schema.Types.Mixed, default: null },
    isEncrypted: { type: Boolean, default: false },
    encryptionKeyId: { type: String, default: null },
  },
  { timestamps: true }
);

documentVersionSchema.index({ documentId: 1, versionNumber: 1 }, { unique: true });

module.exports = mongoose.model('DocumentVersion', documentVersionSchema);

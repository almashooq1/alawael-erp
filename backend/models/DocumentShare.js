'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

const documentShareSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sharedWithEmail: { type: String, default: null }, // مشاركة خارجية
    shareToken: {
      type: String,
      unique: true,
      sparse: true,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    permission: {
      type: String,
      enum: ['view', 'download', 'edit'],
      default: 'view',
    },
    shareType: {
      type: String,
      enum: ['internal', 'external_link', 'email'],
      default: 'internal',
    },
    expiresAt: { type: Date, default: null },
    maxDownloads: { type: Number, default: null },
    downloadCount: { type: Number, default: 0 },
    passwordHash: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

documentShareSchema.index({ shareToken: 1 });
documentShareSchema.index({ documentId: 1 });
documentShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports =
  mongoose.models.DocumentShare || mongoose.model('DocumentShare', documentShareSchema);

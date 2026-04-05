'use strict';

const mongoose = require('mongoose');

const documentSignatureSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    signerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    signerName: { type: String, required: true },
    signerRole: { type: String, required: true },
    signerEmail: { type: String, required: true },
    signatureType: {
      type: String,
      enum: ['electronic', 'digital', 'drawn'],
      default: 'electronic',
    },
    signatureData: { type: String, default: null }, // Base64 للتوقيع المرسوم
    certificateThumbprint: { type: String, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    otpCode: { type: String, default: null }, // مشفر bcrypt
    otpVerified: { type: Boolean, default: false },
    signOrder: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['pending', 'signed', 'rejected', 'expired'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: null },
    signedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

documentSignatureSchema.index({ documentId: 1, signOrder: 1 });
documentSignatureSchema.index({ signerId: 1, status: 1 });

module.exports =
  mongoose.models.DocumentSignature || mongoose.model('DocumentSignature', documentSignatureSchema);

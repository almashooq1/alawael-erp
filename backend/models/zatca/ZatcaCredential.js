/**
 * ZatcaCredential Model — نموذج بيانات اعتماد ZATCA
 * يخزن شهادات CSID والمفاتيح التشفيرية لكل فرع
 */
'use strict';

const mongoose = require('mongoose');

const zatcaCredentialSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      unique: true,
      index: true,
    },
    branchCode: { type: String, required: true },

    // CSR & Keys
    csr: { type: String, default: null }, // Certificate Signing Request
    privateKey: { type: String, default: null }, // ECDSA Private Key PEM
    publicKey: { type: String, default: null }, // ECDSA Public Key PEM
    certificate: { type: String, default: null }, // X.509 Certificate PEM

    // CSID Tokens
    complianceCsid: { type: String, default: null }, // Compliance CSID (Base64)
    productionCsid: { type: String, default: null }, // Production CSID (Base64)
    binarySecurityToken: { type: String, default: null }, // BST (Base64 encoded cert)
    secret: { type: String, default: null }, // API Secret from ZATCA
    apiSecretHash: { type: String, default: null }, // Hashed secret

    // Request IDs
    complianceRequestId: { type: String, default: null },
    productionRequestId: { type: String, default: null },

    // Environment
    isProduction: { type: Boolean, default: false },
    apiBaseUrl: {
      type: String,
      default: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal',
    },

    // Invoice Counter (ICV)
    invoiceCounter: { type: Number, default: 0 }, // آخر رقم عداد للفاتورة
    lastInvoiceHash: { type: String, default: null }, // آخر hash لفاتورة ناجحة (PIH)

    // Timestamps
    csidExpiresAt: { type: Date, default: null },
    onboardedAt: { type: Date, default: null },
    lastSyncAt: { type: Date, default: null },

    // Organization info for CSR
    organizationName: { type: String, default: null },
    organizationNameAr: { type: String, default: null },
    vatNumber: { type: String, default: null }, // رقم الضريبة (15 رقم)
    crNumber: { type: String, default: null }, // رقم السجل التجاري
    egsSerialNumber: { type: String, default: null }, // رقم تسلسل وحدة EGS

    // Address
    street: { type: String, default: null },
    buildingNumber: { type: String, default: null },
    city: { type: String, default: null },
    district: { type: String, default: null },
    postalCode: { type: String, default: null },

    isActive: { type: Boolean, default: true },
    notes: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'zatca_credentials',
  }
);

// Virtual: هل بيانات الاعتماد مكتملة؟
zatcaCredentialSchema.virtual('isConfigured').get(function () {
  return !!(this.binarySecurityToken && this.secret);
});

// Method: الحصول على رقم الفاتورة التالي (ICV)
zatcaCredentialSchema.methods.getNextIcv = async function () {
  this.invoiceCounter += 1;
  await this.save();
  return this.invoiceCounter;
};

// Method: تحديث آخر hash للفاتورة
zatcaCredentialSchema.methods.updateLastHash = async function (hash) {
  this.lastInvoiceHash = hash;
  this.lastSyncAt = new Date();
  await this.save();
};

// Method: الحصول على PIH (Previous Invoice Hash)
zatcaCredentialSchema.methods.getPreviousInvoiceHash = function () {
  if (!this.lastInvoiceHash) {
    // أول فاتورة: PIH = SHA-256("0")
    const crypto = require('crypto');
    return Buffer.from(crypto.createHash('sha256').update('0').digest()).toString('base64');
  }
  return this.lastInvoiceHash;
};

const ZatcaCredential = mongoose.model('ZatcaCredential', zatcaCredentialSchema);

module.exports = ZatcaCredential;

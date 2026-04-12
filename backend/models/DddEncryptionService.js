'use strict';
/**
 * DddEncryptionService Model
 * Auto-extracted from services/dddEncryptionService.js
 */
const crypto = require('crypto');
const mongoose = require('mongoose');

const encryptionKeySchema = new mongoose.Schema(
  {
    keyId: { type: String, required: true, unique: true, index: true },
    algorithm: { type: String, default: 'aes-256-gcm' },
    encryptedKey: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'rotated', 'revoked', 'expired'],
      default: 'active',
    },
    version: { type: Number, default: 1 },
    purpose: {
      type: String,
      enum: ['field-encryption', 'token-encryption', 'backup-encryption', 'transport'],
      default: 'field-encryption',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId },
    rotatedAt: Date,
    expiresAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const DDDEncryptionKey =
  mongoose.models.DDDEncryptionKey || mongoose.model('DDDEncryptionKey', encryptionKeySchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Encryption Configuration
   ═══════════════════════════════════════════════════════════════════════ */
const ENCRYPTION_DEFAULTS = {
  algorithm: 'aes-256-gcm',
  ivLength: 16,
  tagLength: 16,
  keyLength: 32,
  encoding: 'hex',
};

const DATA_CLASSIFICATIONS = [
  { level: 'public', label: 'Public', labelAr: 'عام', encryption: false, masking: false },
  { level: 'internal', label: 'Internal', labelAr: 'داخلي', encryption: false, masking: false },
  { level: 'confidential', label: 'Confidential', labelAr: 'سري', encryption: true, masking: true },
  { level: 'restricted', label: 'Restricted', labelAr: 'مقيد', encryption: true, masking: true },
];

const PII_FIELDS = [
  {
    field: 'nationalId',
    label: 'National ID',
    labelAr: 'الهوية الوطنية',
    classification: 'restricted',
    maskPattern: '****{last4}',
  },
  {
    field: 'phone',
    label: 'Phone',
    labelAr: 'الهاتف',
    classification: 'confidential',
    maskPattern: '****{last4}',
  },
  {
    field: 'email',
    label: 'Email',
    labelAr: 'البريد',
    classification: 'confidential',
    maskPattern: '{first2}***@***',
  },
  {
    field: 'dateOfBirth',
    label: 'Date of Birth',
    labelAr: 'تاريخ الميلاد',
    classification: 'confidential',
    maskPattern: '****-**-**',
  },
  {
    field: 'address',
    label: 'Address',
    labelAr: 'العنوان',
    classification: 'confidential',
    maskPattern: '***',
  },
  {
    field: 'medicalRecordNumber',
    label: 'Medical Record #',
    labelAr: 'رقم السجل الطبي',
    classification: 'restricted',
    maskPattern: '****{last4}',
  },
  {
    field: 'insuranceNumber',
    label: 'Insurance #',
    labelAr: 'رقم التأمين',
    classification: 'restricted',
    maskPattern: '****{last4}',
  },
  {
    field: 'bankAccount',
    label: 'Bank Account',
    labelAr: 'الحساب البنكي',
    classification: 'restricted',
    maskPattern: '****{last4}',
  },
  {
    field: 'diagnosis',
    label: 'Diagnosis',
    labelAr: 'التشخيص',
    classification: 'confidential',
    maskPattern: '[REDACTED]',
  },
  {
    field: 'medications',
    label: 'Medications',
    labelAr: 'الأدوية',
    classification: 'confidential',
    maskPattern: '[REDACTED]',
  },
];

const PII_FIELD_NAMES = PII_FIELDS.map(f => f.field);

/* ═══════════════════════════════════════════════════════════════════════
   3. Core Encryption Functions
   ═══════════════════════════════════════════════════════════════════════ */
const MASTER_KEY = process.env.DDD_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

module.exports = {
  DDDEncryptionKey,
};

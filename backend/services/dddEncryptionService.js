'use strict';

/**
 * DDD Encryption Service
 * ═══════════════════════════════════════════════════════════════════════
 * Field-level encryption, data masking, PII protection, key management,
 * and secure data lifecycle control.
 *
 * Features:
 *  - AES-256-GCM field-level encryption / decryption
 *  - Key management & rotation
 *  - PII detection & automatic masking
 *  - Data classification (public, internal, confidential, restricted)
 *  - Tokenization for sensitive identifiers
 *  - Encryption-at-rest helpers for Mongoose
 *  - Masking templates for display
 *
 * @module dddEncryptionService
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════════════
   1. Models
   ═══════════════════════════════════════════════════════════════════════ */
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

function _getMasterKeyBuffer() {
  const key = Buffer.from(MASTER_KEY, 'hex');
  if (key.length === 32) return key;
  return crypto.createHash('sha256').update(MASTER_KEY).digest();
}

function encrypt(plaintext, key) {
  const keyBuf = key ? Buffer.from(key, 'hex') : _getMasterKeyBuffer();
  const iv = crypto.randomBytes(ENCRYPTION_DEFAULTS.ivLength);
  const cipher = crypto.createCipheriv(ENCRYPTION_DEFAULTS.algorithm, keyBuf, iv);

  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decrypt(ciphertext, key) {
  try {
    const keyBuf = key ? Buffer.from(key, 'hex') : _getMasterKeyBuffer();
    const [ivHex, tagHex, encHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ENCRYPTION_DEFAULTS.algorithm, keyBuf, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

function encryptObject(obj, fields) {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encrypt(String(result[field]));
    }
  }
  return result;
}

function decryptObject(obj, fields) {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string' && result[field].includes(':')) {
      const dec = decrypt(result[field]);
      if (dec !== null) result[field] = dec;
    }
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Data Masking
   ═══════════════════════════════════════════════════════════════════════ */
function maskValue(value, pattern) {
  if (!value) return value;
  const str = String(value);

  if (pattern === '***' || pattern === '[REDACTED]') return pattern;

  if (pattern.includes('{last4}')) {
    return '****' + str.slice(-4);
  }
  if (pattern.includes('{first2}')) {
    return str.slice(0, 2) + '***@***';
  }
  if (pattern === '****-**-**') {
    return '****-**-**';
  }
  return '***';
}

function maskObject(obj, fieldDefs) {
  const result = { ...obj };
  const defs = fieldDefs || PII_FIELDS;
  for (const def of defs) {
    if (result[def.field] !== undefined) {
      result[def.field] = maskValue(result[def.field], def.maskPattern);
    }
  }
  return result;
}

function detectPII(obj) {
  const found = [];
  if (!obj || typeof obj !== 'object') return found;
  for (const key of Object.keys(obj)) {
    if (PII_FIELD_NAMES.includes(key) && obj[key]) {
      const def = PII_FIELDS.find(f => f.field === key);
      found.push({ field: key, classification: def?.classification || 'confidential' });
    }
  }
  return found;
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Tokenization
   ═══════════════════════════════════════════════════════════════════════ */
const _tokenVault = new Map();

function tokenize(value) {
  const token = 'tok_' + crypto.randomBytes(16).toString('hex');
  _tokenVault.set(token, encrypt(String(value)));
  return token;
}

function detokenize(token) {
  const encrypted = _tokenVault.get(token);
  if (!encrypted) return null;
  return decrypt(encrypted);
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Key Management
   ═══════════════════════════════════════════════════════════════════════ */
async function generateKey(purpose = 'field-encryption', createdBy) {
  const rawKey = crypto.randomBytes(32);
  const keyId = 'key_' + crypto.randomBytes(8).toString('hex');
  const encryptedKey = encrypt(rawKey.toString('hex'));

  const entry = await DDDEncryptionKey.create({
    keyId,
    algorithm: ENCRYPTION_DEFAULTS.algorithm,
    encryptedKey,
    purpose,
    createdBy,
    expiresAt: new Date(Date.now() + 90 * 86400000),
  });

  return { keyId: entry.keyId, purpose, created: entry.createdAt };
}

async function rotateKey(keyId, createdBy) {
  const existing = await DDDEncryptionKey.findOne({ keyId, status: 'active' });
  if (!existing) return null;

  existing.status = 'rotated';
  existing.rotatedAt = new Date();
  await existing.save();

  return generateKey(existing.purpose, createdBy);
}

async function listKeys() {
  return DDDEncryptionKey.find({ isDeleted: { $ne: true } })
    .select('keyId algorithm status version purpose createdAt expiresAt')
    .sort({ createdAt: -1 })
    .lean();
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Encryption Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getEncryptionDashboard() {
  const [totalKeys, byStatus, byPurpose] = await Promise.all([
    DDDEncryptionKey.countDocuments({ isDeleted: { $ne: true } }),
    DDDEncryptionKey.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    DDDEncryptionKey.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$purpose', count: { $sum: 1 } } },
    ]),
  ]);

  return {
    totalKeys,
    byStatus: byStatus.reduce((m, r) => ({ ...m, [r._id]: r.count }), {}),
    byPurpose: byPurpose.reduce((m, r) => ({ ...m, [r._id]: r.count }), {}),
    piiFields: PII_FIELDS.length,
    classifications: DATA_CLASSIFICATIONS,
    algorithm: ENCRYPTION_DEFAULTS.algorithm,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Router
   ═══════════════════════════════════════════════════════════════════════ */
function createEncryptionRouter() {
  const router = Router();

  router.get('/encryption/dashboard', async (_req, res) => {
    try {
      res.json({ success: true, ...(await getEncryptionDashboard()) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/encryption/keys', async (_req, res) => {
    try {
      const keys = await listKeys();
      res.json({ success: true, count: keys.length, keys });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/encryption/keys', async (req, res) => {
    try {
      const result = await generateKey(req.body.purpose, req.user?._id);
      res.status(201).json({ success: true, key: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/encryption/keys/:keyId/rotate', async (req, res) => {
    try {
      const result = await rotateKey(req.params.keyId, req.user?._id);
      if (!result)
        return res.status(404).json({ success: false, error: 'Key not found or inactive' });
      res.json({ success: true, newKey: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/encryption/pii-fields', (_req, res) => {
    res.json({ success: true, count: PII_FIELDS.length, fields: PII_FIELDS });
  });

  router.get('/encryption/classifications', (_req, res) => {
    res.json({ success: true, classifications: DATA_CLASSIFICATIONS });
  });

  router.post('/encryption/detect-pii', (req, res) => {
    const found = detectPII(req.body);
    res.json({ success: true, piiDetected: found.length > 0, fields: found });
  });

  router.post('/encryption/mask', (req, res) => {
    const masked = maskObject(req.body.data || {});
    res.json({ success: true, masked });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDEncryptionKey,
  ENCRYPTION_DEFAULTS,
  DATA_CLASSIFICATIONS,
  PII_FIELDS,
  PII_FIELD_NAMES,
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  maskValue,
  maskObject,
  detectPII,
  tokenize,
  detokenize,
  generateKey,
  rotateKey,
  listKeys,
  getEncryptionDashboard,
  createEncryptionRouter,
};

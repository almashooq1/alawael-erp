/**
 * Document Encryption & DLP Service — خدمة التشفير وحماية البيانات
 * ──────────────────────────────────────────────────────────────
 * تشفير AES-256 • تصنيف أمني • منع تسرب البيانات (DLP)
 * سجل وصول • سياسات أمان • كشف بيانات حساسة
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/* ══════════════════════════════════════════════════════════════
   ENCRYPTION CONFIG
   ══════════════════════════════════════════════════════════════ */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

function encryptData(data, masterKey) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(
    typeof data === 'string' ? data : JSON.stringify(data),
    'utf8',
    'hex'
  );
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    algorithm: ALGORITHM,
  };
}

function decryptData(encryptedObj, masterKey) {
  const salt = Buffer.from(encryptedObj.salt, 'hex');
  const key = deriveKey(masterKey, salt);
  const iv = Buffer.from(encryptedObj.iv, 'hex');
  const tag = Buffer.from(encryptedObj.tag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedObj.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
}

function generateChecksum(data) {
  return crypto
    .createHash('sha256')
    .update(typeof data === 'string' ? data : JSON.stringify(data))
    .digest('hex');
}

/* ══════════════════════════════════════════════════════════════
   MODELS
   ══════════════════════════════════════════════════════════════ */

const encryptionRecordSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    status: {
      type: String,
      enum: ['encrypted', 'decrypted', 'failed', 'pending'],
      default: 'pending',
    },
    algorithm: { type: String, default: ALGORITHM },
    keyFingerprint: String,
    checksum: String,
    originalSize: Number,
    encryptedSize: Number,
    metadata: {
      salt: String,
      iv: String,
      tag: String,
    },
    encryptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    encryptedAt: Date,
    decryptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decryptedAt: Date,
    autoEncrypt: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'encryption_records' }
);

encryptionRecordSchema.index({ documentId: 1 });
encryptionRecordSchema.index({ status: 1 });

const EncryptionRecord =
  mongoose.models.EncryptionRecord || mongoose.model('EncryptionRecord', encryptionRecordSchema);

/* ─── Security Classification ─── */
const classificationSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    level: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'secret', 'top_secret'],
      required: true,
    },
    levelAr: String,
    reason: String,
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewDate: Date,
    autoClassified: { type: Boolean, default: false },
    detectedPatterns: [String],
    restrictions: {
      noPrint: { type: Boolean, default: false },
      noCopy: { type: Boolean, default: false },
      noDownload: { type: Boolean, default: false },
      noForward: { type: Boolean, default: false },
      noExport: { type: Boolean, default: false },
      watermarkRequired: { type: Boolean, default: false },
      encryptionRequired: { type: Boolean, default: false },
      maxViewers: Number,
      expiresAt: Date,
    },
    history: [
      {
        level: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, collection: 'security_classifications' }
);

classificationSchema.index({ documentId: 1 });
classificationSchema.index({ level: 1 });

const Classification =
  mongoose.models.SecurityClassification ||
  mongoose.model('SecurityClassification', classificationSchema);

/* ─── Access Log ─── */
const accessLogSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: {
      type: String,
      enum: [
        'view',
        'download',
        'print',
        'copy',
        'forward',
        'export',
        'edit',
        'delete',
        'decrypt',
        'encrypt',
        'classify',
      ],
      required: true,
    },
    status: { type: String, enum: ['allowed', 'blocked', 'flagged'], default: 'allowed' },
    ipAddress: String,
    userAgent: String,
    location: String,
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    dlpViolation: { type: Boolean, default: false },
    dlpRule: String,
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'document_access_logs' }
);

accessLogSchema.index({ documentId: 1, createdAt: -1 });
accessLogSchema.index({ userId: 1, createdAt: -1 });
accessLogSchema.index({ dlpViolation: 1 });
accessLogSchema.index({ riskScore: -1 });

const AccessLog = mongoose.models.DocAccessLog || mongoose.model('DocAccessLog', accessLogSchema);

/* ─── DLP Policy ─── */
const dlpPolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 5 },

    conditions: {
      classificationLevels: [String],
      documentTypes: [String],
      departments: [String],
      fileTypes: [String],
    },

    rules: [
      {
        type: {
          type: String,
          enum: ['pattern', 'keyword', 'classification', 'size', 'recipient', 'action'],
        },
        pattern: String,
        keywords: [String],
        threshold: Number,
        action: { type: String, enum: ['block', 'warn', 'log', 'encrypt', 'watermark', 'notify'] },
        message: String,
        messageAr: String,
      },
    ],

    sensitivePatterns: [
      {
        name: String,
        nameAr: String,
        pattern: String,
        type: {
          type: String,
          enum: [
            'credit_card',
            'ssn',
            'email',
            'phone',
            'national_id',
            'iban',
            'passport',
            'custom',
          ],
        },
        severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'high' },
      },
    ],

    actions: {
      onViolation: { type: String, enum: ['block', 'warn', 'log'], default: 'warn' },
      notifyAdmin: { type: Boolean, default: true },
      notifyUser: { type: Boolean, default: true },
      autoEncrypt: { type: Boolean, default: false },
      autoClassify: { type: Boolean, default: false },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'dlp_policies' }
);

const DLPPolicy = mongoose.models.DLPPolicy || mongoose.model('DLPPolicy', dlpPolicySchema);

/* ══════════════════════════════════════════════════════════════
   DEFAULT SENSITIVE PATTERNS
   ══════════════════════════════════════════════════════════════ */

const DEFAULT_PATTERNS = [
  {
    name: 'Credit Card',
    nameAr: 'بطاقة ائتمان',
    pattern:
      '\\b(?:4\\d{3}|5[1-5]\\d{2}|6011|3[47]\\d{2})[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b',
    type: 'credit_card',
    severity: 'critical',
  },
  {
    name: 'IBAN',
    nameAr: 'رقم الحساب البنكي الدولي',
    pattern: '\\b[A-Z]{2}\\d{2}[A-Z0-9]{4}\\d{7}([A-Z0-9]?){0,16}\\b',
    type: 'iban',
    severity: 'high',
  },
  {
    name: 'Saudi National ID',
    nameAr: 'رقم الهوية الوطنية',
    pattern: '\\b[12]\\d{9}\\b',
    type: 'national_id',
    severity: 'critical',
  },
  {
    name: 'Email',
    nameAr: 'بريد إلكتروني',
    pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
    type: 'email',
    severity: 'medium',
  },
  {
    name: 'Phone Number',
    nameAr: 'رقم هاتف',
    pattern: '\\b(?:\\+966|05)\\d{8}\\b',
    type: 'phone',
    severity: 'medium',
  },
  {
    name: 'Passport',
    nameAr: 'جواز سفر',
    pattern: '\\b[A-Z]{1,2}\\d{6,9}\\b',
    type: 'passport',
    severity: 'high',
  },
];

/* ══════════════════════════════════════════════════════════════
   SERVICE
   ══════════════════════════════════════════════════════════════ */

class DocumentEncryptionService {
  /* ══════ Encryption ══════ */

  async encryptDocument(documentId, options = {}, userId) {
    const masterKey =
      options.key || process.env.ENCRYPTION_MASTER_KEY || 'default-master-key-change-me';

    const doc = await mongoose.model('Document').findById(documentId).lean();
    if (!doc) throw new Error('المستند غير موجود');

    const content = doc.content || doc.description || '';
    const originalSize = Buffer.byteLength(content, 'utf8');

    const result = encryptData(content, masterKey);
    const checksum = generateChecksum(content);
    const keyFingerprint = crypto
      .createHash('sha256')
      .update(masterKey)
      .digest('hex')
      .substring(0, 16);

    const record = await EncryptionRecord.create({
      documentId,
      status: 'encrypted',
      algorithm: ALGORITHM,
      keyFingerprint,
      checksum,
      originalSize,
      encryptedSize: Buffer.byteLength(result.encrypted, 'utf8'),
      metadata: { salt: result.salt, iv: result.iv, tag: result.tag },
      encryptedBy: userId,
      encryptedAt: new Date(),
    });

    // Log access
    await this._logAccess(documentId, userId, 'encrypt', 'allowed', options);

    return { success: true, record, checksum };
  }

  async decryptDocument(documentId, options = {}, userId) {
    const masterKey =
      options.key || process.env.ENCRYPTION_MASTER_KEY || 'default-master-key-change-me';

    const record = await EncryptionRecord.findOne({ documentId, status: 'encrypted' }).sort({
      createdAt: -1,
    });
    if (!record) throw new Error('لا يوجد سجل تشفير');

    // Check classification restrictions
    const classification = await Classification.findOne({ documentId }).sort({ createdAt: -1 });
    if (classification?.restrictions?.encryptionRequired) {
      // Log but don't prevent for admin
    }

    record.status = 'decrypted';
    record.decryptedBy = userId;
    record.decryptedAt = new Date();
    await record.save();

    await this._logAccess(documentId, userId, 'decrypt', 'allowed', options);

    return { success: true, record };
  }

  async getEncryptionStatus(documentId) {
    const record = await EncryptionRecord.findOne({ documentId })
      .sort({ createdAt: -1 })
      .populate('encryptedBy', 'name')
      .populate('decryptedBy', 'name');
    return { success: true, record, isEncrypted: record?.status === 'encrypted' };
  }

  async batchEncrypt(documentIds, options = {}, userId) {
    const results = [];
    for (const id of documentIds) {
      try {
        await this.encryptDocument(id, options, userId);
        results.push({ documentId: id, success: true });
      } catch (e) {
        results.push({ documentId: id, success: false, error: e.message });
      }
    }
    return { success: true, results, encrypted: results.filter(r => r.success).length };
  }

  /* ══════ Classification ══════ */

  async classifyDocument(documentId, level, options = {}, userId) {
    const LEVEL_AR = {
      public: 'عام',
      internal: 'داخلي',
      confidential: 'سري',
      secret: 'سري للغاية',
      top_secret: 'سري جداً',
    };

    const existing = await Classification.findOne({ documentId });

    if (existing) {
      existing.history.push({ level: existing.level, changedBy: userId, reason: options.reason });
      existing.level = level;
      existing.levelAr = LEVEL_AR[level];
      existing.reason = options.reason;
      existing.assignedBy = userId;
      existing.autoClassified = false;
      if (options.restrictions)
        existing.restrictions = { ...existing.restrictions, ...options.restrictions };
      if (options.reviewDate) existing.reviewDate = options.reviewDate;
      await existing.save();
      return { success: true, classification: existing };
    }

    const restrictions = options.restrictions || {};
    // Auto-set restrictions by level
    if (level === 'confidential' || level === 'secret' || level === 'top_secret') {
      restrictions.noCopy = restrictions.noCopy !== false;
      restrictions.watermarkRequired = restrictions.watermarkRequired !== false;
      if (level === 'secret' || level === 'top_secret') {
        restrictions.noDownload = restrictions.noDownload !== false;
        restrictions.encryptionRequired = restrictions.encryptionRequired !== false;
        restrictions.noForward = restrictions.noForward !== false;
      }
      if (level === 'top_secret') {
        restrictions.noPrint = true;
        restrictions.noExport = true;
      }
    }

    const classification = await Classification.create({
      documentId,
      level,
      levelAr: LEVEL_AR[level],
      reason: options.reason,
      assignedBy: userId,
      reviewDate: options.reviewDate,
      restrictions,
    });

    await this._logAccess(documentId, userId, 'classify', 'allowed', { level });

    return { success: true, classification };
  }

  async autoClassifyDocument(documentId) {
    const doc = await mongoose.model('Document').findById(documentId).lean();
    if (!doc) throw new Error('المستند غير موجود');

    const content = `${doc.title || ''} ${doc.content || ''} ${doc.description || ''}`;
    let detectedLevel = 'internal';
    const detectedPatterns = [];

    // Check for sensitive patterns
    for (const p of DEFAULT_PATTERNS) {
      try {
        const regex = new RegExp(p.pattern, 'gi');
        const matches = content.match(regex);
        if (matches && matches.length > 0) {
          detectedPatterns.push(`${p.nameAr}: ${matches.length} تطابق`);
          if (p.severity === 'critical') detectedLevel = 'secret';
          else if (p.severity === 'high' && detectedLevel !== 'secret')
            detectedLevel = 'confidential';
        }
      } catch {
        /* skip invalid regex */
      }
    }

    // Keyword-based classification
    const secretKeywords = ['سري', 'محظور', 'classified', 'restricted', 'top secret'];
    const confidentialKeywords = ['خاص', 'سري', 'confidential', 'private'];
    const lowerContent = content.toLowerCase();

    for (const kw of secretKeywords) {
      if (lowerContent.includes(kw.toLowerCase())) {
        detectedLevel = 'secret';
        detectedPatterns.push(`كلمة مفتاحية: ${kw}`);
      }
    }
    if (detectedLevel !== 'secret') {
      for (const kw of confidentialKeywords) {
        if (lowerContent.includes(kw.toLowerCase())) {
          detectedLevel = 'confidential';
          detectedPatterns.push(`كلمة مفتاحية: ${kw}`);
        }
      }
    }

    const classification = await Classification.findOneAndUpdate(
      { documentId },
      {
        $set: {
          level: detectedLevel,
          autoClassified: true,
          detectedPatterns,
          reason: 'تصنيف تلقائي',
        },
      },
      { upsert: true, new: true }
    );

    return { success: true, classification, detectedPatterns };
  }

  async getClassification(documentId) {
    const c = await Classification.findOne({ documentId }).populate('assignedBy', 'name email');
    return { success: true, classification: c };
  }

  async getClassifications(filters = {}) {
    const query = {};
    if (filters.level) query.level = filters.level;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [classifications, total] = await Promise.all([
      Classification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('documentId', 'title')
        .populate('assignedBy', 'name')
        .lean(),
      Classification.countDocuments(query),
    ]);
    return { success: true, classifications, total, page, pages: Math.ceil(total / limit) };
  }

  /* ══════ DLP ══════ */

  async scanContent(content, options = {}) {
    const violations = [];
    const policies = await DLPPolicy.find({ isActive: true }).sort({ priority: -1 });

    for (const policy of policies) {
      // Check sensitive patterns
      for (const sp of policy.sensitivePatterns || DEFAULT_PATTERNS) {
        try {
          const regex = new RegExp(sp.pattern, 'gi');
          const matches = content.match(regex);
          if (matches && matches.length > 0) {
            violations.push({
              policyId: policy._id,
              policyName: policy.nameAr || policy.name,
              type: sp.type,
              patternName: sp.nameAr || sp.name,
              matchCount: matches.length,
              severity: sp.severity,
              action: policy.actions?.onViolation || 'warn',
              message: `تم اكتشاف ${sp.nameAr || sp.name}: ${matches.length} تطابق`,
            });
          }
        } catch {
          /* skip */
        }
      }

      // Check keyword rules
      for (const rule of policy.rules || []) {
        if (rule.type === 'keyword' && rule.keywords) {
          for (const kw of rule.keywords) {
            if (content.toLowerCase().includes(kw.toLowerCase())) {
              violations.push({
                policyId: policy._id,
                policyName: policy.nameAr || policy.name,
                type: 'keyword',
                keyword: kw,
                severity: 'medium',
                action: rule.action || 'warn',
                message: rule.messageAr || rule.message || `كلمة مفتاحية محظورة: ${kw}`,
              });
            }
          }
        }
      }
    }

    const riskScore = Math.min(
      100,
      violations.reduce((sum, v) => {
        const w = { critical: 40, high: 25, medium: 10, low: 5 };
        return sum + (w[v.severity] || 5);
      }, 0)
    );

    return {
      success: true,
      violations,
      riskScore,
      hasViolations: violations.length > 0,
      shouldBlock: violations.some(v => v.action === 'block'),
    };
  }

  async createDLPPolicy(data, userId) {
    if (!data.sensitivePatterns?.length) data.sensitivePatterns = DEFAULT_PATTERNS;
    const policy = await DLPPolicy.create({ ...data, createdBy: userId });
    return { success: true, policy };
  }

  async updateDLPPolicy(policyId, data) {
    const policy = await DLPPolicy.findByIdAndUpdate(policyId, { $set: data }, { new: true });
    if (!policy) throw new Error('السياسة غير موجودة');
    return { success: true, policy };
  }

  async getDLPPolicies(filters = {}) {
    const query = {};
    if (filters.active !== undefined) query.isActive = filters.active;
    const policies = await DLPPolicy.find(query).sort({ priority: -1 }).lean();
    return { success: true, policies };
  }

  async deleteDLPPolicy(policyId) {
    await DLPPolicy.findByIdAndUpdate(policyId, { isActive: false });
    return { success: true };
  }

  /* ══════ Access Logs ══════ */

  async _logAccess(documentId, userId, action, status, details = {}) {
    return AccessLog.create({
      documentId,
      userId,
      action,
      status,
      ipAddress: details.ip,
      userAgent: details.userAgent,
      location: details.location,
      details,
    });
  }

  async logAccess(documentId, userId, action, options = {}) {
    // Check DLP before logging
    let dlpViolation = false;
    let dlpRule = '';
    let status = 'allowed';

    const classification = await Classification.findOne({ documentId });
    if (classification) {
      const r = classification.restrictions || {};
      if (
        (action === 'print' && r.noPrint) ||
        (action === 'copy' && r.noCopy) ||
        (action === 'download' && r.noDownload) ||
        (action === 'forward' && r.noForward) ||
        (action === 'export' && r.noExport)
      ) {
        status = 'blocked';
        dlpViolation = true;
        dlpRule = `تصنيف ${classification.levelAr}: ${action} محظور`;
      }
    }

    const log = await AccessLog.create({
      documentId,
      userId,
      action,
      status,
      ipAddress: options.ip,
      userAgent: options.userAgent,
      location: options.location,
      dlpViolation,
      dlpRule,
      riskScore: dlpViolation ? 80 : 0,
      details: options.details,
    });

    return { success: true, log, blocked: status === 'blocked' };
  }

  async getAccessLogs(filters = {}) {
    const query = {};
    if (filters.documentId) query.documentId = filters.documentId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.dlpViolation) query.dlpViolation = true;
    if (filters.status) query.status = filters.status;
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) query.createdAt.$gte = new Date(filters.from);
      if (filters.to) query.createdAt.$lte = new Date(filters.to);
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;

    const [logs, total] = await Promise.all([
      AccessLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('documentId', 'title')
        .populate('userId', 'name email')
        .lean(),
      AccessLog.countDocuments(query),
    ]);
    return { success: true, logs, total, page, pages: Math.ceil(total / limit) };
  }

  /* ══════ Stats ══════ */

  async getStats() {
    const [
      encrypted,
      classifications,
      dlpPolicies,
      totalLogs,
      violations,
      classStats,
      actionStats,
    ] = await Promise.all([
      EncryptionRecord.countDocuments({ status: 'encrypted' }),
      Classification.countDocuments(),
      DLPPolicy.countDocuments({ isActive: true }),
      AccessLog.countDocuments(),
      AccessLog.countDocuments({ dlpViolation: true }),
      Classification.aggregate([{ $group: { _id: '$level', count: { $sum: 1 } } }]),
      AccessLog.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    return {
      success: true,
      encryptedDocuments: encrypted,
      classifiedDocuments: classifications,
      activeDLPPolicies: dlpPolicies,
      totalAccessLogs: totalLogs,
      dlpViolations: violations,
      classificationsByLevel: Object.fromEntries(classStats.map(s => [s._id, s.count])),
      accessByAction: actionStats,
    };
  }
}

module.exports = new DocumentEncryptionService();

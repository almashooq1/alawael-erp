/**
 * Document Archiving & Compliance Service — خدمة الأرشفة والامتثال
 * ──────────────────────────────────────────────────────────────
 * أرشفة رقمية طويلة المدى، امتثال تنظيمي، سياسات احتفاظ،
 * تدقيق الامتثال، تصنيف السرية، حماية البيانات
 *
 * @module documentArchiving.service
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const EventEmitter = require('events');

/* ─── Archive Record Model ───────────────────────────────────── */
const archiveRecordSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    archiveId: { type: String, unique: true, required: true },
    category: {
      type: String,
      enum: [
        'legal',
        'financial',
        'hr',
        'contracts',
        'correspondence',
        'technical',
        'regulatory',
        'general',
      ],
      default: 'general',
    },
    classification: {
      level: {
        type: String,
        enum: ['public', 'internal', 'confidential', 'secret', 'top_secret'],
        default: 'internal',
      },
      labelAr: String,
      reason: String,
      classifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      classifiedAt: Date,
      reviewDate: Date,
    },
    retention: {
      policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'RetentionPolicy' },
      startDate: Date,
      endDate: Date,
      action: {
        type: String,
        enum: ['destroy', 'review', 'permanent', 'transfer', 'anonymize'],
        default: 'review',
      },
      isLegalHold: { type: Boolean, default: false },
      legalHoldReason: String,
      legalHoldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    compliance: {
      frameworks: [
        {
          name: String,
          nameAr: String,
          status: {
            type: String,
            enum: ['compliant', 'non_compliant', 'pending_review', 'exempt'],
            default: 'pending_review',
          },
          lastAudit: Date,
          nextAudit: Date,
          notes: String,
        },
      ],
      dataClassification: {
        containsPII: { type: Boolean, default: false },
        containsFinancial: { type: Boolean, default: false },
        containsHealth: { type: Boolean, default: false },
        containsLegal: { type: Boolean, default: false },
      },
      gdprApplicable: { type: Boolean, default: false },
      saudiNCA: { type: Boolean, default: false },
    },
    storage: {
      location: {
        type: String,
        enum: ['primary', 'cold', 'glacier', 'offsite', 'tape'],
        default: 'primary',
      },
      tier: {
        type: String,
        enum: ['hot', 'warm', 'cold', 'archive'],
        default: 'hot',
      },
      redundancy: {
        type: String,
        enum: ['local', 'geo', 'multi_region'],
        default: 'local',
      },
      checksum: String,
      encryptionType: {
        type: String,
        enum: ['none', 'aes256', 'rsa2048'],
        default: 'aes256',
      },
      lastIntegrityCheck: Date,
      integrityStatus: {
        type: String,
        enum: ['valid', 'corrupted', 'unchecked'],
        default: 'unchecked',
      },
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'on_hold', 'pending_destruction', 'destroyed', 'transferred'],
      default: 'active',
    },
    history: [
      {
        action: String,
        actionAr: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        details: mongoose.Schema.Types.Mixed,
      },
    ],
    metadata: mongoose.Schema.Types.Mixed,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_archive_records' }
);

archiveRecordSchema.index({ archiveId: 1 });
archiveRecordSchema.index({ category: 1, status: 1 });
archiveRecordSchema.index({ 'classification.level': 1 });
archiveRecordSchema.index({ 'retention.endDate': 1 });

const ArchiveRecord =
  mongoose.models.ArchiveRecord || mongoose.model('ArchiveRecord', archiveRecordSchema);

/* ─── Compliance Framework Presets ───────────────────────────── */
const COMPLIANCE_FRAMEWORKS = [
  { key: 'saudi_nca', name: 'Saudi NCA', nameAr: 'هيئة الأمن السيبراني السعودية' },
  { key: 'gdpr', name: 'GDPR', nameAr: 'النظام الأوروبي لحماية البيانات' },
  { key: 'iso27001', name: 'ISO 27001', nameAr: 'معيار أمن المعلومات' },
  { key: 'iso15489', name: 'ISO 15489', nameAr: 'معيار إدارة الوثائق' },
  { key: 'hipaa', name: 'HIPAA', nameAr: 'قانون حماية البيانات الصحية' },
  { key: 'sox', name: 'SOX', nameAr: 'قانون ساربينز أوكسلي' },
  { key: 'pcidss', name: 'PCI DSS', nameAr: 'معيار أمان بيانات صناعة بطاقات الدفع' },
];

const CLASSIFICATION_LABELS = {
  public: { ar: 'عام', color: '#22c55e' },
  internal: { ar: 'داخلي', color: '#3b82f6' },
  confidential: { ar: 'سري', color: '#f59e0b' },
  secret: { ar: 'سري للغاية', color: '#ef4444' },
  top_secret: { ar: 'بالغ السرية', color: '#7c2d12' },
};

/* ─── Service ────────────────────────────────────────────────── */
class DocumentArchivingService extends EventEmitter {
  constructor() {
    super();
  }

  _generateArchiveId(category) {
    const prefix = category.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const seq = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `ARC-${prefix}-${year}-${seq}`;
  }

  _computeChecksum(content) {
    return crypto
      .createHash('sha256')
      .update(content || 'empty')
      .digest('hex');
  }

  /* ─── Archive Document ────────────────────────────────────── */
  async archive(documentId, options = {}) {
    const {
      category = 'general',
      classification = { level: 'internal' },
      retention = {},
      compliance = {},
      storage = {},
      userId,
    } = options;

    const existing = await ArchiveRecord.findOne({ documentId });
    if (existing) return { success: false, error: 'المستند مؤرشف بالفعل', record: existing };

    const archiveId = this._generateArchiveId(category);

    const record = new ArchiveRecord({
      documentId,
      archiveId,
      category,
      classification: {
        level: classification.level || 'internal',
        labelAr: CLASSIFICATION_LABELS[classification.level || 'internal']?.ar,
        reason: classification.reason,
        classifiedBy: userId,
        classifiedAt: new Date(),
        reviewDate: classification.reviewDate || new Date(Date.now() + 365 * 86400000),
      },
      retention: {
        startDate: new Date(),
        endDate: retention.endDate
          ? new Date(retention.endDate)
          : new Date(Date.now() + 7 * 365 * 86400000),
        action: retention.action || 'review',
        isLegalHold: retention.isLegalHold || false,
        legalHoldReason: retention.legalHoldReason,
        legalHoldBy: retention.isLegalHold ? userId : undefined,
      },
      compliance: {
        frameworks: (compliance.frameworks || ['iso15489']).map(fw => {
          const preset = COMPLIANCE_FRAMEWORKS.find(f => f.key === fw);
          return {
            name: preset?.name || fw,
            nameAr: preset?.nameAr || fw,
            status: 'pending_review',
          };
        }),
        dataClassification: compliance.dataClassification || {},
        gdprApplicable: compliance.gdprApplicable || false,
        saudiNCA: compliance.saudiNCA || false,
      },
      storage: {
        location: storage.location || 'primary',
        tier: storage.tier || 'warm',
        redundancy: storage.redundancy || 'local',
        checksum: this._computeChecksum(documentId.toString()),
        encryptionType: storage.encryptionType || 'aes256',
      },
      status: 'archived',
      history: [
        {
          action: 'archived',
          actionAr: 'تمت الأرشفة',
          performedBy: userId,
          details: { category, classification: classification.level },
        },
      ],
      createdBy: userId,
    });

    await record.save();
    this.emit('archived', { archiveId, documentId, category });
    return { success: true, record };
  }

  /* ─── Update Classification ───────────────────────────────── */
  async updateClassification(archiveId, classification, userId) {
    const record = await ArchiveRecord.findOne({ archiveId });
    if (!record) return { success: false, error: 'سجل الأرشيف غير موجود' };

    record.classification = {
      ...record.classification,
      ...classification,
      labelAr: CLASSIFICATION_LABELS[classification.level]?.ar || record.classification.labelAr,
      classifiedBy: userId,
      classifiedAt: new Date(),
    };

    record.history.push({
      action: 'classification_changed',
      actionAr: 'تم تغيير التصنيف',
      performedBy: userId,
      details: classification,
    });

    await record.save();
    return { success: true, record };
  }

  /* ─── Set Legal Hold ──────────────────────────────────────── */
  async setLegalHold(archiveId, hold, userId) {
    const record = await ArchiveRecord.findOne({ archiveId });
    if (!record) return { success: false, error: 'سجل الأرشيف غير موجود' };

    record.retention.isLegalHold = hold.enabled;
    record.retention.legalHoldReason = hold.reason || '';
    record.retention.legalHoldBy = hold.enabled ? userId : undefined;
    record.status = hold.enabled ? 'on_hold' : 'archived';

    record.history.push({
      action: hold.enabled ? 'legal_hold_set' : 'legal_hold_released',
      actionAr: hold.enabled ? 'تم وضع حجز قانوني' : 'تم رفع الحجز القانوني',
      performedBy: userId,
      details: hold,
    });

    await record.save();
    this.emit('legalHoldChanged', { archiveId, enabled: hold.enabled });
    return { success: true, record };
  }

  /* ─── Run Compliance Audit ────────────────────────────────── */
  async runComplianceAudit(archiveId, frameworkKey, userId) {
    const record = await ArchiveRecord.findOne({ archiveId });
    if (!record) return { success: false, error: 'السجل غير موجود' };

    const framework = record.compliance.frameworks.find(
      f =>
        f.name.toLowerCase().replace(/\s/g, '') === frameworkKey.toLowerCase().replace(/\s/g, '') ||
        COMPLIANCE_FRAMEWORKS.find(cf => cf.key === frameworkKey)?.name === f.name
    );
    if (!framework) return { success: false, error: 'إطار الامتثال غير موجود' };

    // Simulate audit
    const checks = this._runAuditChecks(record, frameworkKey);
    const allPassed = checks.every(c => c.passed);

    framework.status = allPassed ? 'compliant' : 'non_compliant';
    framework.lastAudit = new Date();
    framework.nextAudit = new Date(Date.now() + 90 * 86400000);
    framework.notes = `${checks.filter(c => c.passed).length}/${checks.length} فحوصات ناجحة`;

    record.history.push({
      action: 'compliance_audit',
      actionAr: 'تدقيق امتثال',
      performedBy: userId,
      details: { framework: frameworkKey, result: framework.status, checks },
    });

    await record.save();
    return {
      success: true,
      record,
      auditResult: { framework: frameworkKey, checks, overallStatus: framework.status },
    };
  }

  _runAuditChecks(record, frameworkKey) {
    const checks = [
      {
        name: 'تصنيف سري',
        nameEn: 'Classification',
        passed: !!record.classification.level,
        detail: record.classification.level,
      },
      {
        name: 'تشفير البيانات',
        nameEn: 'Encryption',
        passed: record.storage.encryptionType !== 'none',
        detail: record.storage.encryptionType,
      },
      {
        name: 'سياسة احتفاظ',
        nameEn: 'Retention Policy',
        passed: !!record.retention.endDate,
        detail: record.retention.endDate?.toISOString(),
      },
      {
        name: 'سلامة البيانات',
        nameEn: 'Data Integrity',
        passed: record.storage.integrityStatus !== 'corrupted',
        detail: record.storage.integrityStatus,
      },
      {
        name: 'سجل التدقيق',
        nameEn: 'Audit Trail',
        passed: record.history.length > 0,
        detail: `${record.history.length} إدخال`,
      },
    ];

    if (frameworkKey === 'gdpr' || frameworkKey === 'saudi_nca') {
      checks.push({
        name: 'تصنيف البيانات الشخصية',
        nameEn: 'PII Classification',
        passed: record.compliance.dataClassification.containsPII !== undefined,
        detail: record.compliance.dataClassification.containsPII ? 'يحتوي' : 'لا يحتوي',
      });
    }

    return checks;
  }

  /* ─── Check Integrity ─────────────────────────────────────── */
  async checkIntegrity(archiveId) {
    const record = await ArchiveRecord.findOne({ archiveId });
    if (!record) return { success: false, error: 'السجل غير موجود' };

    const currentChecksum = this._computeChecksum(record.documentId.toString());
    const isValid = currentChecksum === record.storage.checksum;

    record.storage.lastIntegrityCheck = new Date();
    record.storage.integrityStatus = isValid ? 'valid' : 'corrupted';
    await record.save();

    return { success: true, isValid, checksum: currentChecksum, stored: record.storage.checksum };
  }

  /* ─── Get Archive Record ──────────────────────────────────── */
  async getRecord(archiveId) {
    const record = await ArchiveRecord.findOne({ archiveId })
      .populate('documentId', 'title name')
      .populate('createdBy', 'name')
      .lean();
    if (!record) return { success: false, error: 'السجل غير موجود' };
    return { success: true, record };
  }

  /* ─── List Archives ───────────────────────────────────────── */
  async list(options = {}) {
    const { category, status, classification, page = 1, limit = 20 } = options;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (classification) filter['classification.level'] = classification;

    const [records, total] = await Promise.all([
      ArchiveRecord.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('documentId', 'title name')
        .lean(),
      ArchiveRecord.countDocuments(filter),
    ]);

    return { success: true, records, total, page, limit };
  }

  /* ─── Get Expiring Records ────────────────────────────────── */
  async getExpiring(days = 30) {
    const endDate = new Date(Date.now() + days * 86400000);
    const records = await ArchiveRecord.find({
      'retention.endDate': { $lte: endDate, $gte: new Date() },
      status: { $in: ['archived', 'active'] },
      'retention.isLegalHold': { $ne: true },
    })
      .sort({ 'retention.endDate': 1 })
      .populate('documentId', 'title name')
      .lean();
    return { success: true, records, count: records.length, daysAhead: days };
  }

  /* ─── Destroy Record ──────────────────────────────────────── */
  async destroy(archiveId, userId, reason) {
    const record = await ArchiveRecord.findOne({ archiveId });
    if (!record) return { success: false, error: 'السجل غير موجود' };
    if (record.retention.isLegalHold)
      return { success: false, error: 'لا يمكن تدمير سجل تحت حجز قانوني' };

    record.status = 'destroyed';
    record.history.push({
      action: 'destroyed',
      actionAr: 'تم التدمير',
      performedBy: userId,
      details: { reason },
    });
    await record.save();
    this.emit('destroyed', { archiveId });
    return { success: true };
  }

  /* ─── Get Frameworks ──────────────────────────────────────── */
  getFrameworks() {
    return COMPLIANCE_FRAMEWORKS;
  }

  /* ─── Get Classification Levels ───────────────────────────── */
  getClassificationLevels() {
    return Object.entries(CLASSIFICATION_LABELS).map(([key, val]) => ({
      key,
      labelAr: val.ar,
      color: val.color,
    }));
  }

  /* ─── Statistics ──────────────────────────────────────────── */
  async getStats() {
    const [total, byCategory, byClassification, byStatus, onHold, expiringSoon] = await Promise.all(
      [
        ArchiveRecord.countDocuments(),
        ArchiveRecord.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
        ArchiveRecord.aggregate([{ $group: { _id: '$classification.level', count: { $sum: 1 } } }]),
        ArchiveRecord.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        ArchiveRecord.countDocuments({ 'retention.isLegalHold': true }),
        ArchiveRecord.countDocuments({
          'retention.endDate': {
            $lte: new Date(Date.now() + 30 * 86400000),
            $gte: new Date(),
          },
        }),
      ]
    );

    return {
      success: true,
      stats: {
        total,
        byCategory: byCategory.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
        byClassification: byClassification.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
        byStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
        onLegalHold: onHold,
        expiringSoon,
      },
    };
  }
}

module.exports = new DocumentArchivingService();

/**
 * Document Compliance Monitor Service — خدمة مراقبة الامتثال المستمر
 * ──────────────────────────────────────────────────────────────
 * فحص تلقائي للامتثال، تنبيهات المخالفات، لوحة مراقبة الصحة،
 * معايير متعددة (ISO, GDPR, NCA, SOX, HIPAA)، تقارير دورية
 *
 * @module documentComplianceMonitor.service
 */

const mongoose = require('mongoose');

/* ─── Compliance Rule Model ──────────────────────────────────── */
const complianceRuleSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    name: String,
    nameAr: String,
    standard: {
      type: String,
      enum: ['ISO_15489', 'GDPR', 'NCA', 'SOX', 'HIPAA', 'PDPL', 'INTERNAL', 'CUSTOM'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'retention',
        'access',
        'classification',
        'encryption',
        'audit',
        'disposal',
        'privacy',
        'integrity',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
      default: 'medium',
    },
    description: String,
    descriptionAr: String,
    check: {
      type: {
        type: String,
        enum: [
          'field_required',
          'field_value',
          'expiry',
          'access_count',
          'retention',
          'classification',
          'encryption',
          'custom',
        ],
      },
      field: String,
      operator: {
        type: String,
        enum: [
          'exists',
          'not_exists',
          'equals',
          'not_equals',
          'gt',
          'lt',
          'contains',
          'before',
          'after',
          'within_days',
        ],
      },
      value: mongoose.Schema.Types.Mixed,
      customFn: String,
    },
    remediation: String,
    remediationAr: String,
    autoFix: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'compliance_rules' }
);

complianceRuleSchema.index({ standard: 1, category: 1 });

const ComplianceRule =
  mongoose.models.ComplianceRule || mongoose.model('ComplianceRule', complianceRuleSchema);

/* ─── Compliance Scan Result Model ───────────────────────────── */
const complianceScanSchema = new mongoose.Schema(
  {
    scanType: {
      type: String,
      enum: ['full', 'incremental', 'targeted', 'scheduled'],
      default: 'full',
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
    },
    scope: {
      documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
      standards: [String],
      departments: [String],
    },
    results: {
      totalDocuments: { type: Number, default: 0 },
      compliant: { type: Number, default: 0 },
      nonCompliant: { type: Number, default: 0 },
      warnings: { type: Number, default: 0 },
      score: { type: Number, default: 0, min: 0, max: 100 },
    },
    violations: [
      {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        documentTitle: String,
        ruleCode: String,
        ruleName: String,
        severity: String,
        description: String,
        remediation: String,
        autoFixed: { type: Boolean, default: false },
      },
    ],
    startedAt: Date,
    completedAt: Date,
    duration: Number, // ms
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'compliance_scans' }
);

complianceScanSchema.index({ status: 1, createdAt: -1 });

const ComplianceScan =
  mongoose.models.ComplianceScan || mongoose.model('ComplianceScan', complianceScanSchema);

/* ─── Compliance Alert Model ─────────────────────────────────── */
const complianceAlertSchema = new mongoose.Schema(
  {
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ComplianceScan' },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    ruleCode: String,
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'] },
    message: String,
    messageAr: String,
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved', 'dismissed'],
      default: 'open',
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    notes: String,
  },
  { timestamps: true, collection: 'compliance_alerts' }
);

complianceAlertSchema.index({ status: 1, severity: 1 });
complianceAlertSchema.index({ documentId: 1 });

const ComplianceAlert =
  mongoose.models.ComplianceAlert || mongoose.model('ComplianceAlert', complianceAlertSchema);

/* ─── Default Rules ──────────────────────────────────────────── */
const DEFAULT_RULES = [
  {
    code: 'RET-001',
    name: 'Retention Policy Required',
    nameAr: 'سياسة الاحتفاظ مطلوبة',
    standard: 'ISO_15489',
    category: 'retention',
    severity: 'high',
    descriptionAr: 'كل مستند يجب أن يكون مرتبطاً بسياسة احتفاظ',
    check: { type: 'field_required', field: 'retentionPolicy', operator: 'exists' },
    remediationAr: 'قم بتعيين سياسة احتفاظ للمستند',
  },
  {
    code: 'CLS-001',
    name: 'Classification Required',
    nameAr: 'التصنيف مطلوب',
    standard: 'NCA',
    category: 'classification',
    severity: 'high',
    descriptionAr: 'كل مستند يجب أن يحمل تصنيفاً أمنياً واضحاً',
    check: { type: 'field_required', field: 'classification', operator: 'exists' },
    remediationAr: 'قم بتعيين تصنيف أمني للمستند (عام/داخلي/سري/سري للغاية)',
  },
  {
    code: 'ACC-001',
    name: 'Access Control Required',
    nameAr: 'التحكم بالوصول مطلوب',
    standard: 'NCA',
    category: 'access',
    severity: 'critical',
    descriptionAr: 'المستندات السرية يجب أن تحتوي على قوائم تحكم بالوصول',
    check: {
      type: 'field_value',
      field: 'classification',
      operator: 'equals',
      value: 'confidential',
    },
    remediationAr: 'قم بتعيين قوائم التحكم بالوصول (ACL) للمستند',
  },
  {
    code: 'AUD-001',
    name: 'Audit Trail Active',
    nameAr: 'سجل المراجعة نشط',
    standard: 'SOX',
    category: 'audit',
    severity: 'critical',
    descriptionAr: 'المستندات المالية يجب أن يكون لها سجل مراجعة كامل',
    check: { type: 'field_required', field: 'auditTrail', operator: 'exists' },
    remediationAr: 'تأكد من تفعيل سجل المراجعة للمستندات المالية',
  },
  {
    code: 'PRV-001',
    name: 'Personal Data Protection',
    nameAr: 'حماية البيانات الشخصية',
    standard: 'PDPL',
    category: 'privacy',
    severity: 'critical',
    descriptionAr: 'المستندات المحتوية على بيانات شخصية يجب تشفيرها',
    check: { type: 'field_value', field: 'containsPersonalData', operator: 'equals', value: true },
    remediationAr: 'قم بتشفير المستند وتطبيق سياسة حماية البيانات الشخصية',
  },
  {
    code: 'EXP-001',
    name: 'Document Expiry Check',
    nameAr: 'فحص انتهاء صلاحية المستند',
    standard: 'INTERNAL',
    category: 'retention',
    severity: 'medium',
    descriptionAr: 'المستندات المنتهية الصلاحية يجب مراجعتها أو تجديدها',
    check: { type: 'expiry', field: 'expiresAt', operator: 'before', value: 'now' },
    remediationAr: 'قم بمراجعة المستند وتجديده أو أرشفته',
  },
  {
    code: 'INT-001',
    name: 'Integrity Verification',
    nameAr: 'التحقق من السلامة',
    standard: 'ISO_15489',
    category: 'integrity',
    severity: 'high',
    descriptionAr: 'يجب التحقق من سلامة المستندات الحرجة بشكل دوري',
    check: { type: 'field_required', field: 'checksum', operator: 'exists' },
    remediationAr: 'قم بإنشاء بصمة رقمية (checksum) للمستند',
  },
  {
    code: 'DSP-001',
    name: 'Secure Disposal Required',
    nameAr: 'الإتلاف الآمن مطلوب',
    standard: 'GDPR',
    category: 'disposal',
    severity: 'high',
    descriptionAr: 'المستندات المحذوفة المحتوية على بيانات شخصية تتطلب إتلافاً آمناً',
    check: { type: 'field_value', field: 'status', operator: 'equals', value: 'deleted' },
    remediationAr: 'استخدم عملية الإتلاف الآمن مع شهادة إتلاف موثقة',
  },
];

/* ─── Service ────────────────────────────────────────────────── */
class DocumentComplianceMonitorService {
  constructor() {
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    for (const rule of DEFAULT_RULES) {
      await ComplianceRule.findOneAndUpdate(
        { code: rule.code },
        { $setOnInsert: rule },
        { upsert: true }
      );
    }
    this._initialized = true;
  }

  /* ─── Run Full Scan ───────────────────────────────────────── */
  async runScan(options = {}) {
    await this.init();
    const start = Date.now();
    const { documentIds, standards, departments, userId, scanType = 'full' } = options;

    const scan = new ComplianceScan({
      scanType,
      status: 'running',
      scope: { documentIds, standards, departments },
      startedAt: new Date(),
      triggeredBy: userId,
    });
    await scan.save();

    try {
      const rules = await ComplianceRule.find({
        isActive: true,
        ...(standards?.length ? { standard: { $in: standards } } : {}),
      }).lean();

      const Document = mongoose.models.Document || mongoose.model('Document');
      const docFilter = {};
      if (documentIds?.length) docFilter._id = { $in: documentIds };
      if (departments?.length) docFilter.department = { $in: departments };
      const docs = await Document.find(docFilter).lean();

      scan.results.totalDocuments = docs.length;
      const violations = [];

      for (const doc of docs) {
        let isCompliant = true;
        for (const rule of rules) {
          const violation = this._checkRule(doc, rule);
          if (violation) {
            isCompliant = false;
            violations.push({
              documentId: doc._id,
              documentTitle: doc.title,
              ruleCode: rule.code,
              ruleName: rule.nameAr || rule.name,
              severity: rule.severity,
              description: rule.descriptionAr || rule.description,
              remediation: rule.remediationAr || rule.remediation,
            });
          }
        }
        if (isCompliant) scan.results.compliant++;
        else scan.results.nonCompliant++;
      }

      scan.violations = violations;
      scan.results.warnings = violations.filter(
        v => v.severity === 'medium' || v.severity === 'low'
      ).length;
      scan.results.score = docs.length
        ? Math.round((scan.results.compliant / docs.length) * 100)
        : 100;
      scan.status = 'completed';
      scan.completedAt = new Date();
      scan.duration = Date.now() - start;
      await scan.save();

      // Create alerts for critical/high violations
      const criticalViolations = violations.filter(
        v => v.severity === 'critical' || v.severity === 'high'
      );
      for (const v of criticalViolations) {
        await ComplianceAlert.create({
          scanId: scan._id,
          documentId: v.documentId,
          ruleCode: v.ruleCode,
          severity: v.severity,
          message: `Violation: ${v.ruleName}`,
          messageAr: `مخالفة: ${v.ruleName} — ${v.description}`,
          status: 'open',
        });
      }

      return {
        success: true,
        scanId: scan._id,
        results: scan.results,
        violationCount: violations.length,
        criticalCount: criticalViolations.length,
        duration: scan.duration,
      };
    } catch (err) {
      scan.status = 'failed';
      await scan.save();
      return { success: false, error: err.message, scanId: scan._id };
    }
  }

  _checkRule(doc, rule) {
    const { check } = rule;
    if (!check?.type) return null;

    const fieldValue = this._getNestedField(doc, check.field);

    switch (check.type) {
      case 'field_required':
        if (
          check.operator === 'exists' &&
          (fieldValue === undefined || fieldValue === null || fieldValue === '')
        )
          return true;
        if (check.operator === 'not_exists' && fieldValue !== undefined && fieldValue !== null)
          return true;
        break;

      case 'field_value':
        if (check.operator === 'equals' && fieldValue === check.value) {
          // This is a condition — check if dependent field is missing
          if (rule.category === 'access' && !doc.acl?.length) return true;
          if (rule.category === 'privacy' && !doc.isEncrypted) return true;
          if (rule.category === 'disposal' && !doc.destructionCertificate) return true;
        }
        break;

      case 'expiry':
        if (fieldValue && new Date(fieldValue) < new Date()) return true;
        break;
    }
    return null;
  }

  _getNestedField(obj, path) {
    if (!path) return undefined;
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  /* ─── Get Scans ───────────────────────────────────────────── */
  async getScans(options = {}) {
    const { status, page = 1, limit = 20 } = options;
    const filter = {};
    if (status) filter.status = status;

    const [scans, total] = await Promise.all([
      ComplianceScan.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-violations')
        .lean(),
      ComplianceScan.countDocuments(filter),
    ]);

    return { success: true, scans, total, page, limit };
  }

  async getScan(scanId) {
    const scan = await ComplianceScan.findById(scanId)
      .populate('violations.documentId', 'title name')
      .lean();
    if (!scan) return { success: false, error: 'الفحص غير موجود' };
    return { success: true, scan };
  }

  /* ─── Alerts ──────────────────────────────────────────────── */
  async getAlerts(options = {}) {
    const { status, severity, page = 1, limit = 20 } = options;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const [alerts, total] = await Promise.all([
      ComplianceAlert.find(filter)
        .sort({ severity: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('documentId', 'title name')
        .lean(),
      ComplianceAlert.countDocuments(filter),
    ]);

    return { success: true, alerts, total, page, limit };
  }

  async resolveAlert(alertId, data = {}) {
    const alert = await ComplianceAlert.findByIdAndUpdate(
      alertId,
      {
        $set: {
          status: 'resolved',
          resolvedBy: data.userId,
          resolvedAt: new Date(),
          notes: data.notes,
        },
      },
      { new: true }
    );
    if (!alert) return { success: false, error: 'التنبيه غير موجود' };
    return { success: true, alert };
  }

  async dismissAlert(alertId, data = {}) {
    const alert = await ComplianceAlert.findByIdAndUpdate(
      alertId,
      { $set: { status: 'dismissed', notes: data.notes } },
      { new: true }
    );
    if (!alert) return { success: false, error: 'التنبيه غير موجود' };
    return { success: true, alert };
  }

  /* ─── Rules CRUD ──────────────────────────────────────────── */
  async getRules(options = {}) {
    await this.init();
    const { standard, category } = options;
    const filter = {};
    if (standard) filter.standard = standard;
    if (category) filter.category = category;

    const rules = await ComplianceRule.find(filter).sort({ severity: 1 }).lean();
    return { success: true, rules };
  }

  async createRule(data) {
    const rule = new ComplianceRule({
      ...data,
      code: data.code || `CUSTOM-${Date.now().toString(36).toUpperCase()}`,
    });
    await rule.save();
    return { success: true, rule };
  }

  async updateRule(ruleId, updates) {
    const rule = await ComplianceRule.findByIdAndUpdate(
      ruleId,
      { $set: updates },
      { new: true }
    ).lean();
    if (!rule) return { success: false, error: 'القاعدة غير موجودة' };
    return { success: true, rule };
  }

  async toggleRule(ruleId) {
    const rule = await ComplianceRule.findById(ruleId);
    if (!rule) return { success: false, error: 'القاعدة غير موجودة' };
    rule.isActive = !rule.isActive;
    await rule.save();
    return { success: true, rule };
  }

  /* ─── Health Dashboard ────────────────────────────────────── */
  async getHealthDashboard() {
    await this.init();
    const [latestScan, openAlerts, alertsBySeverity, scanHistory] = await Promise.all([
      ComplianceScan.findOne({ status: 'completed' }).sort({ createdAt: -1 }).lean(),
      ComplianceAlert.countDocuments({ status: 'open' }),
      ComplianceAlert.aggregate([
        { $match: { status: 'open' } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      ComplianceScan.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('results.score createdAt duration')
        .lean(),
    ]);

    const healthScore = latestScan?.results?.score || 0;
    const healthStatus =
      healthScore >= 90
        ? 'excellent'
        : healthScore >= 75
          ? 'good'
          : healthScore >= 50
            ? 'needs_attention'
            : 'critical';

    return {
      success: true,
      health: {
        score: healthScore,
        status: healthStatus,
        statusAr:
          healthStatus === 'excellent'
            ? 'ممتاز'
            : healthStatus === 'good'
              ? 'جيد'
              : healthStatus === 'needs_attention'
                ? 'يحتاج انتباه'
                : 'حرج',
        openAlerts,
        alertsBySeverity: alertsBySeverity.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
        lastScan: latestScan
          ? {
              id: latestScan._id,
              score: latestScan.results?.score,
              date: latestScan.createdAt,
              totalDocuments: latestScan.results?.totalDocuments,
              compliant: latestScan.results?.compliant,
              nonCompliant: latestScan.results?.nonCompliant,
            }
          : null,
        scoreTrend: scanHistory.map(s => ({
          score: s.results?.score,
          date: s.createdAt,
        })),
      },
    };
  }

  /* ─── Stats ───────────────────────────────────────────────── */
  async getStats() {
    const health = await this.getHealthDashboard();
    const totalRules = await ComplianceRule.countDocuments({ isActive: true });
    const totalScans = await ComplianceScan.countDocuments();

    return {
      success: true,
      stats: {
        healthScore: health.health?.score || 0,
        totalRules,
        totalScans,
        openAlerts: health.health?.openAlerts || 0,
      },
    };
  }
}

module.exports = new DocumentComplianceMonitorService();

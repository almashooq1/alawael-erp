/**
 * Audit Forensics Service — خدمة التحليل الجنائي والتدقيق العميق
 * Phase 9 — كشف التلاعب، سلسلة الحفظ، تحليل الأنماط، البصمات الرقمية
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/* ─── Schemas ────────────────────────────────────────────── */
const forensicRecordSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    type: {
      type: String,
      enum: [
        'integrity_check',
        'tamper_detection',
        'access_analysis',
        'chain_of_custody',
        'metadata_extraction',
        'timeline_reconstruction',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'alert'],
      default: 'pending',
    },
    findings: [
      {
        category: {
          type: String,
          enum: ['integrity', 'access', 'modification', 'suspicious', 'anomaly', 'compliance'],
        },
        severity: { type: String, enum: ['info', 'low', 'medium', 'high', 'critical'] },
        title: String,
        titleAr: String,
        description: String,
        evidence: { type: Map, of: mongoose.Schema.Types.Mixed },
        timestamp: Date,
      },
    ],
    hashes: {
      md5: String,
      sha1: String,
      sha256: String,
      sha512: String,
    },
    integrityStatus: {
      type: String,
      enum: ['verified', 'tampered', 'unknown', 'not_checked'],
      default: 'not_checked',
    },
    chainOfCustody: [
      {
        action: {
          type: String,
          enum: [
            'created',
            'accessed',
            'modified',
            'transferred',
            'signed',
            'printed',
            'exported',
            'shared',
            'archived',
            'deleted',
          ],
        },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: Date,
        ipAddress: String,
        userAgent: String,
        location: String,
        details: { type: Map, of: mongoose.Schema.Types.Mixed },
        hash: String, // hash of the entry for tamper detection
      },
    ],
    metadata: {
      fileSize: Number,
      mimeType: String,
      createdAt: Date,
      modifiedAt: Date,
      accessCount: Number,
      lastAccessAt: Date,
      geoLocations: [{ lat: Number, lng: Number, timestamp: Date, action: String }],
      devices: [{ deviceType: String, os: String, browser: String, ip: String }],
      networkInfo: [{ ip: String, location: String, timestamp: Date }],
    },
    riskScore: { type: Number, default: 0 },
    alerts: [{ type: String, timestamp: Date, acknowledged: { type: Boolean, default: false } }],
    processedAt: Date,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'forensic_records' }
);

const tamperAlertSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    alertType: {
      type: String,
      enum: [
        'hash_mismatch',
        'unauthorized_access',
        'suspicious_modification',
        'unusual_pattern',
        'location_anomaly',
        'time_anomaly',
        'bulk_operation',
        'privilege_escalation',
      ],
      required: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    description: String,
    descriptionAr: String,
    evidence: {
      expectedHash: String,
      actualHash: String,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      ipAddress: String,
      timestamp: Date,
      details: { type: Map, of: mongoose.Schema.Types.Mixed },
    },
    status: {
      type: String,
      enum: ['new', 'investigating', 'confirmed', 'false_positive', 'resolved'],
      default: 'new',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolution: String,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'tamper_alerts' }
);

const auditPolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    description: String,
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    rules: [
      {
        ruleId: String,
        name: String,
        condition: {
          eventType: String,
          frequency: { count: Number, periodMinutes: Number },
          ipPattern: String,
          timeWindow: { startHour: Number, endHour: Number },
          userPattern: String,
        },
        action: { type: String, enum: ['alert', 'block', 'log', 'notify'] },
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      },
    ],
    notificationChannels: [{ type: String, enum: ['email', 'sms', 'webhook', 'in_app'] }],
    retentionDays: { type: Number, default: 365 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'audit_policies' }
);

forensicRecordSchema.index({ documentId: 1, type: 1 });
forensicRecordSchema.index({ riskScore: -1 });
tamperAlertSchema.index({ documentId: 1, status: 1 });
tamperAlertSchema.index({ severity: 1, status: 1 });
auditPolicySchema.index({ status: 1 });

const ForensicRecord =
  mongoose.models.ForensicRecord || mongoose.model('ForensicRecord', forensicRecordSchema);
const TamperAlert = mongoose.models.TamperAlert || mongoose.model('TamperAlert', tamperAlertSchema);
const AuditPolicy = mongoose.models.AuditPolicy || mongoose.model('AuditPolicy', auditPolicySchema);

/* ─── Service ────────────────────────────────────────────── */
class AuditForensicsService {
  /* ── Integrity ────────────────────── */
  async computeHashes(content) {
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content));
    return {
      md5: crypto.createHash('md5').update(buf).digest('hex'),
      sha1: crypto.createHash('sha1').update(buf).digest('hex'),
      sha256: crypto.createHash('sha256').update(buf).digest('hex'),
      sha512: crypto.createHash('sha512').update(buf).digest('hex'),
    };
  }

  async checkIntegrity(documentId, currentContent, userId) {
    const hashes = await this.computeHashes(currentContent);

    // find previous record
    const prev = await ForensicRecord.findOne({ documentId, integrityStatus: 'verified' }).sort(
      '-createdAt'
    );
    let integrityStatus = 'verified';
    const findings = [];

    if (prev && prev.hashes?.sha256 && prev.hashes.sha256 !== hashes.sha256) {
      integrityStatus = 'tampered';
      findings.push({
        category: 'integrity',
        severity: 'critical',
        title: 'Hash Mismatch',
        titleAr: 'عدم تطابق البصمة',
        description: `SHA-256 المتوقع: ${prev.hashes.sha256.substring(0, 16)}... | الفعلي: ${hashes.sha256.substring(0, 16)}...`,
        evidence: new Map([
          ['expectedHash', prev.hashes.sha256],
          ['actualHash', hashes.sha256],
        ]),
        timestamp: new Date(),
      });

      // create tamper alert
      await this.createAlert(
        documentId,
        'hash_mismatch',
        'critical',
        'تم اكتشاف تغيير في بصمة المستند',
        { expectedHash: prev.hashes.sha256, actualHash: hashes.sha256, userId }
      );
    }

    const record = new ForensicRecord({
      documentId,
      type: 'integrity_check',
      status: 'completed',
      hashes,
      integrityStatus,
      findings,
      riskScore: integrityStatus === 'tampered' ? 90 : 0,
      processedAt: new Date(),
      processedBy: userId,
    });
    await record.save();
    return record;
  }

  /* ── Chain of Custody ─────────────── */
  async addCustodyEntry(documentId, action, userId, details = {}) {
    let record = await ForensicRecord.findOne({ documentId, type: 'chain_of_custody' });
    if (!record) {
      record = new ForensicRecord({
        documentId,
        type: 'chain_of_custody',
        status: 'completed',
        integrityStatus: 'not_checked',
      });
    }

    const entryData = {
      action,
      userId,
      timestamp: new Date(),
      ipAddress: details.ipAddress || '',
      userAgent: details.userAgent || '',
      location: details.location || '',
      details: details.extra ? new Map(Object.entries(details.extra)) : new Map(),
    };
    // hash of entry for tamper-proof chain
    entryData.hash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({ ...entryData, prevHash: record.chainOfCustody.at(-1)?.hash || 'genesis' })
      )
      .digest('hex');

    record.chainOfCustody.push(entryData);
    await record.save();
    return record;
  }

  async getChainOfCustody(documentId) {
    const record = await ForensicRecord.findOne({ documentId, type: 'chain_of_custody' })
      .populate('chainOfCustody.userId', 'name email')
      .lean();
    if (!record) return { documentId, chain: [], verified: false };

    // verify chain integrity
    let verified = true;
    for (let i = 1; i < record.chainOfCustody.length; i++) {
      const entry = record.chainOfCustody[i];
      const prevHash = record.chainOfCustody[i - 1]?.hash || 'genesis';
      const expectedHash = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            action: entry.action,
            userId: entry.userId,
            timestamp: entry.timestamp,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
            location: entry.location,
            details: entry.details,
            prevHash,
          })
        )
        .digest('hex');
      if (expectedHash !== entry.hash) {
        verified = false;
        break;
      }
    }

    return {
      documentId,
      chain: record.chainOfCustody,
      totalEntries: record.chainOfCustody.length,
      verified,
    };
  }

  async verifyChainIntegrity(documentId) {
    const result = await this.getChainOfCustody(documentId);
    return { documentId, verified: result.verified, entries: result.totalEntries };
  }

  /* ── Tamper Alerts ────────────────── */
  async createAlert(documentId, alertType, severity, description, evidence) {
    const alert = new TamperAlert({
      documentId,
      alertType,
      severity,
      description,
      descriptionAr: description,
      evidence: { ...evidence, timestamp: new Date() },
    });
    await alert.save();
    return alert;
  }

  async getAlerts(filters = {}) {
    const query = {};
    if (filters.documentId) query.documentId = filters.documentId;
    if (filters.status) query.status = filters.status;
    if (filters.severity) query.severity = filters.severity;
    return TamperAlert.find(query)
      .populate('evidence.userId', 'name')
      .sort('-createdAt')
      .limit(filters.limit || 50)
      .lean();
  }

  async updateAlertStatus(alertId, status, resolution, userId) {
    const alert = await TamperAlert.findById(alertId);
    if (!alert) throw new Error('التنبيه غير موجود');
    alert.status = status;
    if (resolution) alert.resolution = resolution;
    if (['confirmed', 'false_positive', 'resolved'].includes(status)) {
      alert.resolvedAt = new Date();
      alert.resolvedBy = userId;
    }
    await alert.save();
    return alert;
  }

  async acknowledgeAlert(alertId) {
    return TamperAlert.findByIdAndUpdate(
      alertId,
      { 'alerts.$[].acknowledged': true },
      { new: true }
    );
  }

  /* ── Forensic Analysis ────────────── */
  async runForensicAnalysis(documentId, userId) {
    const record = new ForensicRecord({
      documentId,
      type: 'tamper_detection',
      status: 'processing',
      processedBy: userId,
    });

    const findings = [];
    const custodyRecord = await ForensicRecord.findOne({
      documentId,
      type: 'chain_of_custody',
    }).lean();

    if (custodyRecord?.chainOfCustody?.length) {
      const chain = custodyRecord.chainOfCustody;

      // access pattern analysis
      const accessByHour = {};
      chain.forEach(e => {
        const hour = new Date(e.timestamp).getHours();
        accessByHour[hour] = (accessByHour[hour] || 0) + 1;
      });

      // unusual hours (before 6am or after 11pm)
      const unusualAccess = chain.filter(e => {
        const h = new Date(e.timestamp).getHours();
        return h < 6 || h > 23;
      });
      if (unusualAccess.length > 0) {
        findings.push({
          category: 'suspicious',
          severity: 'medium',
          title: 'Unusual Access Hours',
          titleAr: 'أوقات وصول غير عادية',
          description: `${unusualAccess.length} عمليات وصول في أوقات غير عادية`,
          timestamp: new Date(),
        });
      }

      // rapid modifications
      for (let i = 1; i < chain.length; i++) {
        const diff = new Date(chain[i].timestamp) - new Date(chain[i - 1].timestamp);
        if (diff < 60000 && chain[i].action === 'modified' && chain[i - 1].action === 'modified') {
          findings.push({
            category: 'anomaly',
            severity: 'low',
            title: 'Rapid Modifications',
            titleAr: 'تعديلات سريعة متتالية',
            description: `تعديلان في أقل من دقيقة`,
            timestamp: new Date(chain[i].timestamp),
          });
        }
      }

      // IP analysis
      const ips = [...new Set(chain.map(e => e.ipAddress).filter(Boolean))];
      if (ips.length > 5) {
        findings.push({
          category: 'access',
          severity: 'medium',
          title: 'Multiple IP Addresses',
          titleAr: 'عناوين IP متعددة',
          description: `تم الوصول من ${ips.length} عناوين مختلفة`,
          timestamp: new Date(),
        });
      }
    }

    const riskScore = findings.reduce((acc, f) => {
      const w = { critical: 40, high: 25, medium: 15, low: 5, info: 1 };
      return acc + (w[f.severity] || 0);
    }, 0);

    record.findings = findings;
    record.riskScore = Math.min(riskScore, 100);
    record.status = riskScore > 60 ? 'alert' : 'completed';
    record.processedAt = new Date();
    await record.save();
    return record;
  }

  async getForensicHistory(documentId) {
    return ForensicRecord.find({ documentId }).sort('-createdAt').lean();
  }

  async reconstructTimeline(documentId) {
    const records = await ForensicRecord.find({ documentId }).lean();
    const events = [];

    for (const r of records) {
      if (r.chainOfCustody?.length) {
        for (const c of r.chainOfCustody) {
          events.push({
            timestamp: c.timestamp,
            type: 'custody',
            action: c.action,
            userId: c.userId,
            ip: c.ipAddress,
            source: 'chain_of_custody',
          });
        }
      }
      if (r.findings?.length) {
        for (const f of r.findings) {
          events.push({
            timestamp: f.timestamp || r.processedAt,
            type: 'finding',
            category: f.category,
            severity: f.severity,
            title: f.titleAr || f.title,
            source: r.type,
          });
        }
      }
    }

    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return { documentId, eventCount: events.length, events };
  }

  /* ── Audit Policies ───────────────── */
  async createPolicy(data, userId) {
    const policy = new AuditPolicy({ ...data, createdBy: userId });
    await policy.save();
    return policy;
  }

  async updatePolicy(policyId, data) {
    return AuditPolicy.findByIdAndUpdate(policyId, data, { new: true });
  }

  async getPolicies() {
    return AuditPolicy.find().sort('-createdAt').lean();
  }

  async deletePolicy(policyId) {
    return AuditPolicy.findByIdAndDelete(policyId);
  }

  /* ── Stats ────────────────────────── */
  async getStats() {
    const [records, alerts, critical, policies] = await Promise.all([
      ForensicRecord.countDocuments(),
      TamperAlert.countDocuments(),
      TamperAlert.countDocuments({
        severity: 'critical',
        status: { $in: ['new', 'investigating'] },
      }),
      AuditPolicy.countDocuments({ status: 'active' }),
    ]);

    const avgRisk = await ForensicRecord.aggregate([
      { $match: { riskScore: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$riskScore' } } },
    ]);

    const alertsBySeverity = await TamperAlert.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    const alertsByStatus = await TamperAlert.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return {
      totalRecords: records,
      totalAlerts: alerts,
      criticalAlerts: critical,
      activePolicies: policies,
      averageRiskScore: avgRisk[0]?.avg ? Math.round(avgRisk[0].avg) : 0,
      alertsBySeverity,
      alertsByStatus,
    };
  }
}

module.exports = new AuditForensicsService();

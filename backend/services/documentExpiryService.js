/**
 * Document Expiry & Retention Service — خدمة إدارة انتهاء الصلاحية والاحتفاظ
 *
 * Features:
 * - Expiry date tracking and alerts
 * - Automated archiving of expired documents
 * - Retention policy management
 * - Renewal workflow triggers
 * - Compliance reporting
 */

const EventEmitter = require('events');

const RETENTION_POLICIES = {
  FINANCIAL: {
    id: 'financial',
    nameAr: 'مالي',
    nameEn: 'Financial',
    retentionYears: 10,
    autoArchive: true,
  },
  LEGAL: { id: 'legal', nameAr: 'قانوني', nameEn: 'Legal', retentionYears: 15, autoArchive: false },
  HR: { id: 'hr', nameAr: 'موارد بشرية', nameEn: 'HR', retentionYears: 7, autoArchive: true },
  CONTRACTS: {
    id: 'contracts',
    nameAr: 'عقود',
    nameEn: 'Contracts',
    retentionYears: 10,
    autoArchive: true,
  },
  CORRESPONDENCE: {
    id: 'correspondence',
    nameAr: 'مراسلات',
    nameEn: 'Correspondence',
    retentionYears: 5,
    autoArchive: true,
  },
  TRAINING: {
    id: 'training',
    nameAr: 'تدريب',
    nameEn: 'Training',
    retentionYears: 3,
    autoArchive: true,
  },
  CERTIFICATES: {
    id: 'certificates',
    nameAr: 'شهادات',
    nameEn: 'Certificates',
    retentionYears: 0,
    autoArchive: false,
  },
  GENERAL: {
    id: 'general',
    nameAr: 'عام',
    nameEn: 'General',
    retentionYears: 5,
    autoArchive: true,
  },
};

const ALERT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  URGENT: 'urgent',
  EXPIRED: 'expired',
};

class DocumentExpiryService extends EventEmitter {
  constructor() {
    super();
    this.trackedDocuments = new Map(); // docId -> tracking info
    this.alerts = []; // expiry alerts
    this.renewalRequests = []; // renewal requests
    this.retentionPolicies = new Map();

    // Initialize default retention policies
    Object.values(RETENTION_POLICIES).forEach(p => this.retentionPolicies.set(p.id, p));
  }

  /**
   * Track document expiry — تتبع انتهاء صلاحية المستند
   */
  async trackExpiry(documentId, data) {
    const tracking = {
      documentId,
      documentTitle: data.documentTitle || '',
      category: data.category || 'general',
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      retentionPolicyId: data.retentionPolicyId || 'general',
      createdDate: data.createdDate ? new Date(data.createdDate) : new Date(),
      ownerId: data.ownerId,
      ownerName: data.ownerName || '',
      notifyBefore: data.notifyBefore || [90, 60, 30, 14, 7, 1], // days before expiry
      autoRenew: data.autoRenew || false,
      renewalCount: 0,
      maxRenewals: data.maxRenewals || 3,
      status: 'active', // active, expiring_soon, expired, renewed, archived
      alerts: [],
      renewalHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Calculate retention end date
    const policy = this.retentionPolicies.get(tracking.retentionPolicyId);
    if (policy && policy.retentionYears > 0) {
      tracking.retentionEndDate = new Date(tracking.createdDate);
      tracking.retentionEndDate.setFullYear(
        tracking.retentionEndDate.getFullYear() + policy.retentionYears
      );
    }

    this.trackedDocuments.set(documentId, tracking);

    // Check initial status
    this._updateExpiryStatus(tracking);

    this.emit('expiryTracked', tracking);

    return {
      success: true,
      data: tracking,
      message: 'تم تفعيل تتبع انتهاء الصلاحية',
    };
  }

  /**
   * Update expiry status based on current date
   */
  _updateExpiryStatus(tracking) {
    if (!tracking.expiryDate) {
      tracking.status = 'active';
      return;
    }

    const now = new Date();
    const expiryDate = new Date(tracking.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      tracking.status = 'expired';
      tracking.daysUntilExpiry = daysUntilExpiry;
    } else if (daysUntilExpiry <= 30) {
      tracking.status = 'expiring_soon';
      tracking.daysUntilExpiry = daysUntilExpiry;
    } else {
      tracking.status = 'active';
      tracking.daysUntilExpiry = daysUntilExpiry;
    }
  }

  /**
   * Check all documents for expiry — فحص جميع المستندات للانتهاء
   */
  async checkExpiry() {
    const results = {
      expired: [],
      expiringSoon: [],
      alerts: [],
    };

    const now = new Date();

    for (const [docId, tracking] of this.trackedDocuments) {
      if (!tracking.expiryDate) continue;

      const expiryDate = new Date(tracking.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      this._updateExpiryStatus(tracking);

      if (daysUntilExpiry < 0) {
        results.expired.push({
          documentId: docId,
          ...tracking,
          daysOverdue: Math.abs(daysUntilExpiry),
        });

        // Auto-renew if configured
        if (tracking.autoRenew && tracking.renewalCount < tracking.maxRenewals) {
          await this.renewDocument(docId, { renewedBy: 'system', reason: 'تجديد تلقائي' });
        }
      } else if (tracking.notifyBefore.includes(daysUntilExpiry)) {
        const alertLevel =
          daysUntilExpiry <= 7
            ? ALERT_LEVELS.URGENT
            : daysUntilExpiry <= 30
              ? ALERT_LEVELS.WARNING
              : ALERT_LEVELS.INFO;

        const alert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          documentId: docId,
          documentTitle: tracking.documentTitle,
          ownerId: tracking.ownerId,
          ownerName: tracking.ownerName,
          expiryDate: tracking.expiryDate,
          daysUntilExpiry,
          level: alertLevel,
          message: `المستند "${tracking.documentTitle}" سينتهي خلال ${daysUntilExpiry} يوم`,
          createdAt: new Date(),
          read: false,
        };

        results.alerts.push(alert);
        this.alerts.push(alert);
        tracking.alerts.push(alert.id);
        this.emit('expiryAlert', alert);
      }

      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        results.expiringSoon.push({ documentId: docId, ...tracking });
      }
    }

    return {
      success: true,
      data: results,
      summary: {
        totalTracked: this.trackedDocuments.size,
        expired: results.expired.length,
        expiringSoon: results.expiringSoon.length,
        alertsSent: results.alerts.length,
      },
    };
  }

  /**
   * Renew document — تجديد المستند
   */
  async renewDocument(documentId, data = {}) {
    const tracking = this.trackedDocuments.get(documentId);
    if (!tracking) return { success: false, message: 'المستند غير مُتتبع' };

    if (tracking.renewalCount >= tracking.maxRenewals) {
      return { success: false, message: 'تم الوصول للحد الأقصى من التجديدات' };
    }

    const oldExpiry = tracking.expiryDate;
    const newExpiry = data.newExpiryDate
      ? new Date(data.newExpiryDate)
      : new Date(new Date(tracking.expiryDate).getTime() + 365 * 24 * 60 * 60 * 1000);

    tracking.expiryDate = newExpiry;
    tracking.renewalCount++;
    tracking.status = 'renewed';
    tracking.updatedAt = new Date();

    const renewal = {
      id: `rnw_${Date.now()}`,
      oldExpiryDate: oldExpiry,
      newExpiryDate: newExpiry,
      renewedBy: data.renewedBy || 'system',
      reason: data.reason || '',
      renewedAt: new Date(),
    };

    tracking.renewalHistory.push(renewal);
    this._updateExpiryStatus(tracking);

    this.emit('documentRenewed', { documentId, tracking, renewal });

    return {
      success: true,
      data: tracking,
      message: 'تم تجديد المستند بنجاح',
    };
  }

  /**
   * Get expiring documents — المستندات التي ستنتهي قريباً
   */
  async getExpiringDocuments(options = {}) {
    const withinDays = options.days || 30;
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    const expiring = [];

    for (const [docId, tracking] of this.trackedDocuments) {
      if (!tracking.expiryDate) continue;
      const expiryDate = new Date(tracking.expiryDate);
      if (expiryDate <= cutoff && expiryDate > now) {
        this._updateExpiryStatus(tracking);
        expiring.push({ documentId: docId, ...tracking });
      }
    }

    expiring.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    return {
      success: true,
      data: expiring,
      total: expiring.length,
    };
  }

  /**
   * Get expired documents — المستندات المنتهية
   */
  async getExpiredDocuments() {
    const now = new Date();
    const expired = [];

    for (const [docId, tracking] of this.trackedDocuments) {
      if (!tracking.expiryDate) continue;
      if (new Date(tracking.expiryDate) < now) {
        this._updateExpiryStatus(tracking);
        expired.push({ documentId: docId, ...tracking });
      }
    }

    expired.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    return { success: true, data: expired, total: expired.length };
  }

  /**
   * Get alerts — جلب التنبيهات
   */
  async getAlerts(userId, options = {}) {
    let alerts = [...this.alerts];

    if (userId) {
      alerts = alerts.filter(a => a.ownerId === userId);
    }

    if (options.unreadOnly) {
      alerts = alerts.filter(a => !a.read);
    }

    if (options.level) {
      alerts = alerts.filter(a => a.level === options.level);
    }

    alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      success: true,
      data: alerts,
      total: alerts.length,
      unread: alerts.filter(a => !a.read).length,
    };
  }

  /**
   * Mark alert as read — تحديد التنبيه كمقروء
   */
  async markAlertRead(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) alert.read = true;
    return { success: true };
  }

  /**
   * Get retention policies — سياسات الاحتفاظ
   */
  async getRetentionPolicies() {
    return {
      success: true,
      data: Array.from(this.retentionPolicies.values()),
    };
  }

  /**
   * Create/update retention policy — إنشاء/تحديث سياسة احتفاظ
   */
  async upsertRetentionPolicy(policyData) {
    const policy = {
      id: policyData.id || `policy_${Date.now()}`,
      nameAr: policyData.nameAr,
      nameEn: policyData.nameEn,
      retentionYears: policyData.retentionYears || 5,
      autoArchive: policyData.autoArchive || false,
      description: policyData.description || '',
      updatedAt: new Date(),
    };

    this.retentionPolicies.set(policy.id, policy);

    return { success: true, data: policy, message: 'تم حفظ سياسة الاحتفاظ' };
  }

  /**
   * Get expiry statistics — إحصائيات الانتهاء
   */
  async getStatistics() {
    const total = this.trackedDocuments.size;
    const _now = new Date();
    let active = 0,
      expiringSoon = 0,
      expired = 0,
      noExpiry = 0;
    const byCategory = {};

    for (const [, tracking] of this.trackedDocuments) {
      this._updateExpiryStatus(tracking);

      if (!tracking.expiryDate) {
        noExpiry++;
      } else if (tracking.status === 'expired') {
        expired++;
      } else if (tracking.status === 'expiring_soon') {
        expiringSoon++;
      } else {
        active++;
      }

      byCategory[tracking.category] = (byCategory[tracking.category] || 0) + 1;
    }

    return {
      success: true,
      data: {
        total,
        active,
        expiringSoon,
        expired,
        noExpiry,
        byCategory,
        totalAlerts: this.alerts.length,
        unreadAlerts: this.alerts.filter(a => !a.read).length,
        totalRenewals: this.renewalRequests.length,
      },
    };
  }
}

const expiryService = new DocumentExpiryService();
expiryService.RETENTION_POLICIES = RETENTION_POLICIES;
expiryService.ALERT_LEVELS = ALERT_LEVELS;
module.exports = expiryService;

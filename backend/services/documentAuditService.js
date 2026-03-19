/**
 * Document Audit Trail Service — خدمة سجل المراجعة والتدقيق
 *
 * Features:
 * - Comprehensive activity logging for all document operations
 * - Audit reports generation
 * - Compliance tracking
 * - Tamper-proof audit entries with hash chains
 * - Export audit logs for regulatory compliance
 */

const crypto = require('crypto');
const EventEmitter = require('events');

// Event types for document audit
const AUDIT_EVENTS = {
  CREATED: 'document.created',
  VIEWED: 'document.viewed',
  DOWNLOADED: 'document.downloaded',
  UPDATED: 'document.updated',
  DELETED: 'document.deleted',
  RESTORED: 'document.restored',
  SHARED: 'document.shared',
  UNSHARED: 'document.unshared',
  PERMISSION_CHANGED: 'document.permission_changed',
  SIGNED: 'document.signed',
  APPROVED: 'document.approved',
  REJECTED: 'document.rejected',
  ARCHIVED: 'document.archived',
  PRINTED: 'document.printed',
  EXPORTED: 'document.exported',
  MOVED: 'document.moved',
  COPIED: 'document.copied',
  RENAMED: 'document.renamed',
  VERSION_CREATED: 'document.version_created',
  VERSION_RESTORED: 'document.version_restored',
  COMMENT_ADDED: 'document.comment_added',
  TAG_MODIFIED: 'document.tag_modified',
  CATEGORY_CHANGED: 'document.category_changed',
  WATERMARK_APPLIED: 'document.watermark_applied',
  OCR_PROCESSED: 'document.ocr_processed',
  EXPIRED: 'document.expired',
  LOCKED: 'document.locked',
  UNLOCKED: 'document.unlocked',
  ACCESS_DENIED: 'document.access_denied',
  BULK_OPERATION: 'document.bulk_operation',
};

class DocumentAuditService extends EventEmitter {
  constructor() {
    super();
    this.auditLog = []; // In-memory (production: MongoDB collection)
    this.lastHash = null;
    this.retentionDays = 365 * 3; // 3 years
  }

  /**
   * Generate hash for audit entry (tamper-proof chain)
   */
  _generateHash(entry, previousHash) {
    const data = JSON.stringify({
      ...entry,
      previousHash: previousHash || 'GENESIS',
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Log an audit event — تسجيل حدث مراجعة
   */
  async logEvent(eventData) {
    const {
      eventType,
      documentId,
      documentTitle,
      userId,
      userName,
      userEmail,
      userRole,
      details = {},
      ipAddress,
      userAgent,
      sessionId,
    } = eventData;

    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      eventType,
      documentId,
      documentTitle: documentTitle || '',
      userId,
      userName: userName || 'مستخدم غير معروف',
      userEmail: userEmail || '',
      userRole: userRole || 'user',
      details,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      sessionId: sessionId || null,
      timestamp: new Date(),
      severity: this._getEventSeverity(eventType),
      category: this._getEventCategory(eventType),
    };

    // Create hash chain
    entry.hash = this._generateHash(entry, this.lastHash);
    entry.previousHash = this.lastHash || 'GENESIS';
    this.lastHash = entry.hash;

    this.auditLog.push(entry);
    this.emit('auditEvent', entry);

    // Check for suspicious activity
    this._checkSuspiciousActivity(entry);

    return { success: true, data: entry };
  }

  /**
   * Get event severity — مستوى خطورة الحدث
   */
  _getEventSeverity(eventType) {
    const critical = ['document.deleted', 'document.permission_changed', 'document.access_denied'];
    const high = ['document.shared', 'document.unshared', 'document.signed', 'document.exported'];
    const medium = [
      'document.updated',
      'document.approved',
      'document.rejected',
      'document.archived',
    ];

    if (critical.includes(eventType)) return 'critical';
    if (high.includes(eventType)) return 'high';
    if (medium.includes(eventType)) return 'medium';
    return 'low';
  }

  /**
   * Get event category — تصنيف الحدث
   */
  _getEventCategory(eventType) {
    if (
      eventType.includes('permission') ||
      eventType.includes('shared') ||
      eventType.includes('access')
    ) {
      return 'security';
    }
    if (eventType.includes('version') || eventType.includes('updated')) return 'modification';
    if (eventType.includes('viewed') || eventType.includes('downloaded')) return 'access';
    if (
      eventType.includes('approved') ||
      eventType.includes('rejected') ||
      eventType.includes('signed')
    ) {
      return 'workflow';
    }
    return 'general';
  }

  /**
   * Check for suspicious activity — كشف النشاط المشبوه
   */
  _checkSuspiciousActivity(entry) {
    const recentEntries = this.auditLog.filter(
      e => e.userId === entry.userId && Date.now() - new Date(e.timestamp).getTime() < 5 * 60 * 1000
    );

    // Too many downloads in 5 minutes
    const downloads = recentEntries.filter(e => e.eventType === AUDIT_EVENTS.DOWNLOADED);
    if (downloads.length > 20) {
      this.emit('suspiciousActivity', {
        type: 'excessive_downloads',
        userId: entry.userId,
        userName: entry.userName,
        count: downloads.length,
        timeWindow: '5 minutes',
        severity: 'critical',
      });
    }

    // Too many access denied
    const denials = recentEntries.filter(e => e.eventType === AUDIT_EVENTS.ACCESS_DENIED);
    if (denials.length > 5) {
      this.emit('suspiciousActivity', {
        type: 'repeated_access_denied',
        userId: entry.userId,
        userName: entry.userName,
        count: denials.length,
        timeWindow: '5 minutes',
        severity: 'high',
      });
    }

    // Too many deletions in 5 minutes
    const deletions = recentEntries.filter(e => e.eventType === AUDIT_EVENTS.DELETED);
    if (deletions.length > 10) {
      this.emit('suspiciousActivity', {
        type: 'mass_deletion',
        userId: entry.userId,
        userName: entry.userName,
        count: deletions.length,
        timeWindow: '5 minutes',
        severity: 'critical',
      });
    }
  }

  /**
   * Get audit log — جلب سجل المراجعة
   */
  async getAuditLog(filters = {}) {
    let logs = [...this.auditLog];

    // Filter by document
    if (filters.documentId) {
      logs = logs.filter(e => e.documentId === filters.documentId);
    }

    // Filter by user
    if (filters.userId) {
      logs = logs.filter(e => e.userId === filters.userId);
    }

    // Filter by event type
    if (filters.eventType) {
      logs = logs.filter(e => e.eventType === filters.eventType);
    }

    // Filter by severity
    if (filters.severity) {
      logs = logs.filter(e => e.severity === filters.severity);
    }

    // Filter by category
    if (filters.category) {
      logs = logs.filter(e => e.category === filters.category);
    }

    // Filter by date range
    if (filters.fromDate) {
      logs = logs.filter(e => new Date(e.timestamp) >= new Date(filters.fromDate));
    }
    if (filters.toDate) {
      logs = logs.filter(e => new Date(e.timestamp) <= new Date(filters.toDate));
    }

    // Search in details
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      logs = logs.filter(
        e =>
          e.documentTitle.toLowerCase().includes(searchLower) ||
          e.userName.toLowerCase().includes(searchLower) ||
          e.eventType.toLowerCase().includes(searchLower)
      );
    }

    // Sort (newest first by default)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const start = (page - 1) * limit;
    const paginated = logs.slice(start, start + limit);

    return {
      success: true,
      data: paginated,
      total: logs.length,
      page,
      pages: Math.ceil(logs.length / limit),
    };
  }

  /**
   * Get document audit trail — سجل مراجعة مستند محدد
   */
  async getDocumentAuditTrail(documentId) {
    const logs = this.auditLog
      .filter(e => e.documentId === documentId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      success: true,
      data: logs,
      total: logs.length,
      summary: {
        totalEvents: logs.length,
        uniqueUsers: [...new Set(logs.map(l => l.userId))].length,
        eventTypes: [...new Set(logs.map(l => l.eventType))],
        firstEvent: logs[logs.length - 1]?.timestamp || null,
        lastEvent: logs[0]?.timestamp || null,
      },
    };
  }

  /**
   * Get user activity report — تقرير نشاط المستخدم
   */
  async getUserActivityReport(userId, options = {}) {
    const days = options.days || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = this.auditLog.filter(e => e.userId === userId && new Date(e.timestamp) >= since);

    const eventCounts = {};
    const dailyActivity = {};

    logs.forEach(log => {
      eventCounts[log.eventType] = (eventCounts[log.eventType] || 0) + 1;
      const day = new Date(log.timestamp).toISOString().split('T')[0];
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    });

    return {
      success: true,
      data: {
        userId,
        period: `${days} days`,
        totalActions: logs.length,
        eventCounts,
        dailyActivity,
        mostActiveDay: Object.entries(dailyActivity).sort(([, a], [, b]) => b - a)[0] || null,
        recentActions: logs.slice(0, 20),
      },
    };
  }

  /**
   * Generate compliance report — تقرير الامتثال
   */
  async generateComplianceReport(options = {}) {
    const days = options.days || 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = this.auditLog.filter(e => new Date(e.timestamp) >= since);

    const securityEvents = logs.filter(e => e.category === 'security');
    const criticalEvents = logs.filter(e => e.severity === 'critical');
    const accessDenied = logs.filter(e => e.eventType === AUDIT_EVENTS.ACCESS_DENIED);
    const deletions = logs.filter(e => e.eventType === AUDIT_EVENTS.DELETED);
    const shares = logs.filter(e => e.eventType === AUDIT_EVENTS.SHARED);

    return {
      success: true,
      data: {
        reportDate: new Date(),
        period: `${days} days`,
        summary: {
          totalEvents: logs.length,
          securityEvents: securityEvents.length,
          criticalEvents: criticalEvents.length,
          accessDenied: accessDenied.length,
          deletions: deletions.length,
          shares: shares.length,
        },
        riskAssessment: {
          level:
            criticalEvents.length > 10 ? 'مرتفع' : criticalEvents.length > 3 ? 'متوسط' : 'منخفض',
          flaggedUsers: this._getFlaggedUsers(logs),
          recommendations: this._getComplianceRecommendations(logs),
        },
        chainIntegrity: this.verifyChainIntegrity(),
      },
    };
  }

  /**
   * Get flagged users — المستخدمين المشبوهين
   */
  _getFlaggedUsers(logs) {
    const userActivity = {};
    logs.forEach(log => {
      if (!userActivity[log.userId]) {
        userActivity[log.userId] = { name: log.userName, events: 0, critical: 0, denied: 0 };
      }
      userActivity[log.userId].events++;
      if (log.severity === 'critical') userActivity[log.userId].critical++;
      if (log.eventType === AUDIT_EVENTS.ACCESS_DENIED) userActivity[log.userId].denied++;
    });

    return Object.entries(userActivity)
      .filter(([, u]) => u.critical > 3 || u.denied > 5)
      .map(([id, u]) => ({ userId: id, ...u }));
  }

  /**
   * Get compliance recommendations — توصيات الامتثال
   */
  _getComplianceRecommendations(logs) {
    const recommendations = [];

    const accessDenied = logs.filter(e => e.eventType === AUDIT_EVENTS.ACCESS_DENIED);
    if (accessDenied.length > 20) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        message: 'عدد كبير من محاولات الوصول المرفوضة - يرجى مراجعة صلاحيات المستخدمين',
      });
    }

    const deletions = logs.filter(e => e.eventType === AUDIT_EVENTS.DELETED);
    if (deletions.length > 50) {
      recommendations.push({
        type: 'data',
        priority: 'medium',
        message: 'عدد كبير من عمليات الحذف - يرجى مراجعة سياسة الاحتفاظ بالمستندات',
      });
    }

    return recommendations;
  }

  /**
   * Verify chain integrity — التحقق من سلامة السلسلة
   */
  verifyChainIntegrity() {
    if (this.auditLog.length === 0) return { valid: true, entries: 0 };

    let valid = true;
    let brokenAt = null;

    for (let i = 1; i < this.auditLog.length; i++) {
      if (this.auditLog[i].previousHash !== this.auditLog[i - 1].hash) {
        valid = false;
        brokenAt = i;
        break;
      }
    }

    return {
      valid,
      entries: this.auditLog.length,
      brokenAt,
      message: valid ? 'سلسلة التدقيق سليمة' : `تم اكتشاف تلاعب عند السجل رقم ${brokenAt}`,
    };
  }

  /**
   * Export audit log — تصدير سجل المراجعة
   */
  async exportAuditLog(format = 'json', filters = {}) {
    const result = await this.getAuditLog({ ...filters, limit: 999999 });
    const logs = result.data;

    if (format === 'csv') {
      const headers = [
        'التاريخ',
        'نوع الحدث',
        'المستند',
        'المستخدم',
        'الخطورة',
        'التصنيف',
        'التفاصيل',
      ];
      const rows = logs.map(l => [
        new Date(l.timestamp).toLocaleString('ar-SA'),
        l.eventType,
        l.documentTitle,
        l.userName,
        l.severity,
        l.category,
        JSON.stringify(l.details),
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      return { success: true, data: csv, format: 'csv', mimeType: 'text/csv' };
    }

    return {
      success: true,
      data: JSON.stringify(logs, null, 2),
      format: 'json',
      mimeType: 'application/json',
    };
  }

  /**
   * Get audit statistics — إحصائيات المراجعة
   */
  async getStatistics(options = {}) {
    const days = options.days || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = this.auditLog.filter(e => new Date(e.timestamp) >= since);

    const byEventType = {};
    const bySeverity = {};
    const byCategory = {};
    const byDay = {};

    logs.forEach(log => {
      byEventType[log.eventType] = (byEventType[log.eventType] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
      const day = new Date(log.timestamp).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return {
      success: true,
      data: {
        period: `${days} days`,
        totalEvents: logs.length,
        byEventType,
        bySeverity,
        byCategory,
        byDay,
        averagePerDay: Math.round(logs.length / days),
      },
    };
  }
}

// Export singleton with event types
const auditService = new DocumentAuditService();
auditService.AUDIT_EVENTS = AUDIT_EVENTS;
module.exports = auditService;

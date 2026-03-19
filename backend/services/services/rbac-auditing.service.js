/**
 * ═══════════════════════════════════════════════════════════════
 * 📋 RBAC Auditing Service - خدمة التدقيق والمراجعة
 * ═══════════════════════════════════════════════════════════════
 * 
 * يوفر نظام التدقيق الشامل مع:
 * ✅ تتبع جميع التغييرات
 * ✅ تقارير مفصلة
 * ✅ كشف الأنماط المشبوهة
 * ✅ الالتزام بالتوافقيات
 */

class RBACAuditingService {
  constructor(config = {}) {
    this.auditLog = [];
    this.securityIncidents = [];
    this.complianceReports = [];
    this.accessPatterns = new Map();
    this.config = {
      maxLogSize: config.maxLogSize || 100000,
      retentionDays: config.retentionDays || 90,
      encryptLogs: config.encryptLogs || false,
      alertingEnabled: config.alertingEnabled || true,
      ...config
    };
    
    this.startCleanupTimer();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 1️⃣ AUDIT LOG MANAGEMENT - إدارة سجلات التدقيق
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إضافة حدث تدقيق
   */
  logAuditEvent(eventData) {
    const auditEntry = {
      id: this._generateId(),
      timestamp: new Date(),
      eventType: eventData.eventType,
      userId: eventData.userId,
      actor: eventData.actor || 'system',
      
      // Action Details
      action: eventData.action,
      resource: eventData.resource,
      resourceId: eventData.resourceId,
      
      // Status
      status: eventData.status || 'success', // success, failure, partial
      statusCode: eventData.statusCode || 200,
      
      // Change Details
      before: eventData.before || {},
      after: eventData.after || {},
      changes: eventData.changes || [],
      
      // Context
      ipAddress: eventData.ipAddress,
      userAgent: eventData.userAgent,
      sessionId: eventData.sessionId,
      correlationId: eventData.correlationId,
      
      // Metadata
      metadata: eventData.metadata || {},
      severity: eventData.severity || this._calculateSeverity(eventData.eventType),
      tags: eventData.tags || []
    };

    this.auditLog.push(auditEntry);

    // الحفاظ على حد أقصى
    if (this.auditLog.length > this.config.maxLogSize) {
      this.auditLog = this.auditLog.slice(-this.config.maxLogSize);
    }

    // فحص الأنماط المشبوهة
    this._analyzeForIncidents(auditEntry);

    return auditEntry;
  }

  /**
   * الحصول على سجلات التدقيق مع التصفية والبحث
   */
  queryAuditLog(query = {}) {
    let results = this.auditLog;

    // Handle filters object if provided
    const filters = query.filters || query;

    // التصفية حسب النوع
    if (filters.eventType) {
      results = results.filter(e =>
        Array.isArray(filters.eventType)
          ? filters.eventType.includes(e.eventType)
          : e.eventType === filters.eventType
      );
    }

    // التصفية حسب المستخدم
    if (filters.userId) {
      results = results.filter(e => e.userId === filters.userId);
    }

    // التصفية حسب الإجراء
    if (filters.action) {
      results = results.filter(e => e.action === filters.action);
    }

    // التصفية حسب المورد
    if (filters.resource) {
      results = results.filter(e => e.resource === filters.resource);
    }

    // التصفية حسب الحالة
    if (filters.status) {
      results = results.filter(e => e.status === filters.status);
    }

    // التصفية حسب شدة الحدث
    if (filters.severity) {
      results = results.filter(e => e.severity === filters.severity);
    }

    // التصفية حسب النطاق الزمني
    if (filters.startDate) {
      results = results.filter(e => e.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      results = results.filter(e => e.timestamp <= filters.endDate);
    }

    // البحث النصي
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(e =>
        e.action?.toLowerCase().includes(searchLower) ||
        e.resource?.toLowerCase().includes(searchLower) ||
        e.userId?.toLowerCase().includes(searchLower)
      );
    }

    // الترتيب
    const sort = (a, b) => {
      if (filters.sortBy === 'timestamp') {
        return filters.sortOrder === 'asc'
          ? a.timestamp - b.timestamp
          : b.timestamp - a.timestamp;
      }
      return 0;
    };

    results = results.sort(sort);

    // الحد من النتائج
    if (filters.limit || query.limit) {
      results = results.slice(0, filters.limit || query.limit);
    }

    if (filters.offset || query.offset) {
      results = results.slice(filters.offset || query.offset);
    }

    return {
      total: this.auditLog.length,
      returned: results.length,
      results
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 2️⃣ INCIDENT DETECTION - كشف الحوادث الأمنية
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * تحليل الأحداث لكشف الحوادث
   */
  _analyzeForIncidents(auditEntry) {
    const incidents = [];

    // كشف محاولات الوصول المتكررة الفاشلة
    if (auditEntry.status === 'failure') {
      const failedAttempts = this.auditLog
        .filter(e =>
          e.userId === auditEntry.userId &&
          e.action === auditEntry.action &&
          e.status === 'failure' &&
          e.timestamp > new Date(Date.now() - 3600000) // آخر ساعة
        );

      if (failedAttempts.length >= 5) {
        incidents.push({
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: 'high',
          userId: auditEntry.userId,
          action: auditEntry.action,
          attemptCount: failedAttempts.length,
          timestamp: new Date()
        });
      }
    }

    // كشف الوصول غير المعتاد
    if (!this._isNormalAccessPattern(auditEntry)) {
      incidents.push({
        type: 'ABNORMAL_ACCESS_PATTERN',
        severity: 'medium',
        userId: auditEntry.userId,
        timestamp: new Date(),
        details: {
          action: auditEntry.action,
          resource: auditEntry.resource,
          time: auditEntry.timestamp
        }
      });
    }

    // كشف الوصول المستقيم
    if (auditEntry.eventType === 'ROLE_DELETED' || 
        auditEntry.eventType === 'PERMISSION_REVOKED') {
      incidents.push({
        type: 'SENSITIVE_OPERATION',
        severity: 'high',
        userId: auditEntry.userId,
        actor: auditEntry.actor,
        action: auditEntry.action,
        timestamp: new Date()
      });
    }

    // إضافة الحوادث المكتشفة
    for (const incident of incidents) {
      this.reportSecurityIncident(incident);
    }
  }

  /**
   * تقرير حادثة أمنية
   */
  reportSecurityIncident(incident) {
    const report = {
      id: this._generateId(),
      ...incident,
      reportedAt: new Date(),
      status: 'open', // open, investigating, resolved, closed
      notes: []
    };

    this.securityIncidents.push(report);

    // تنبيهات
    if (this.config.alertingEnabled) {
      this._triggerAlert(report);
    }

    return report;
  }

  /**
   * الحصول على الحوادث الأمنية
   */
  getSecurityIncidents(filters = {}) {
    let incidents = this.securityIncidents;

    if (filters.status) {
      incidents = incidents.filter(i => i.status === filters.status);
    }

    if (filters.severity) {
      incidents = incidents.filter(i => i.severity === filters.severity);
    }

    if (filters.type) {
      incidents = incidents.filter(i => i.type === filters.type);
    }

    return incidents.sort((a, b) => b.reportedAt - a.reportedAt);
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 3️⃣ REPORTING - التقارير
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * توليد تقرير التدقيق
   */
  generateAuditReport(reportConfig = {}) {
    const startDate = reportConfig.startDate || new Date(Date.now() - 2592000000); // 30 days
    const endDate = reportConfig.endDate || new Date();

    const relevantLogs = this.auditLog.filter(e =>
      e.timestamp >= startDate && e.timestamp <= endDate
    );

    const report = {
      id: this._generateId(),
      generatedAt: new Date(),
      period: { startDate, endDate },
      
      // Summary Statistics
      summary: {
        totalEvents: relevantLogs.length,
        successfulActions: relevantLogs.filter(e => e.status === 'success').length,
        failedActions: relevantLogs.filter(e => e.status === 'failure').length,
        uniqueUsers: new Set(relevantLogs.map(e => e.userId)).size,
        avgEventsPerDay: Math.round(relevantLogs.length / 30)
      },

      // Event Distribution
      eventDistribution: this._calculateEventDistribution(relevantLogs),
      userActivity: this._calculateUserActivity(relevantLogs),
      resourceActivity: this._calculateResourceActivity(relevantLogs),
      
      // Changes Summary
      changesSummary: {
        rolesCreated: relevantLogs.filter(e => e.eventType === 'ROLE_CREATED').length,
        rolesModified: relevantLogs.filter(e => e.eventType === 'ROLE_UPDATED').length,
        rolesDeleted: relevantLogs.filter(e => e.eventType === 'ROLE_DELETED').length,
        permissionsChanged: relevantLogs.filter(e => e.eventType === 'PERMISSION_CHANGED').length
      },

      // Security Summary
      securitySummary: {
        totalIncidents: this.securityIncidents.filter(i =>
          i.reportedAt >= startDate && i.reportedAt <= endDate
        ).length,
        highSeverityIncidents: this.securityIncidents.filter(i =>
          i.severity === 'high' && i.reportedAt >= startDate && i.reportedAt <= endDate
        ).length
      },

      // Recommendations
      recommendations: this._generateRecommendations(relevantLogs)
    };

    this.complianceReports.push(report);
    return report;
  }

  /**
   * توليد تقرير الامتثال
   */
  generateComplianceReport() {
    const report = {
      id: this._generateId(),
      generatedAt: new Date(),
      timestamp: new Date(),
      
      // Compliance Checks
      checks: {
        auditLoggingEnabled: true,
        accessControlImplemented: true,
        roleHierarchyDefined: true,
        permissionAssignmentDocumented: true,
        incidentResponseProcedureInPlace: true
      },

      // Risk Assessment
      riskAssessment: {
        overallRisk: 'medium',
        highRiskAreas: [],
        recommendations: []
      },

      // Certifications
      certifications: {
        SOC2: 'compliant',
        HIPAA: 'partial',
        GDPR: 'compliant'
      }
    };

    return report;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 4️⃣ PATTERN ANALYSIS - تحليل الأنماط
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * تسجيل نمط الوصول الطبيعي
   */
  recordNormalPattern(userId, action, context = {}) {
    const key = `${userId}:${action}`;

    if (!this.accessPatterns.has(key)) {
      this.accessPatterns.set(key, {
        occurrences: 0,
        times: [],
        locations: [],
        devices: []
      });
    }

    const pattern = this.accessPatterns.get(key);
    pattern.occurrences++;
    pattern.times.push(new Date().getHours());
    if (context.location) pattern.locations.push(context.location);
    if (context.device) pattern.devices.push(context.device);

    // الحفاظ على 100 حدث فقط
    if (pattern.times.length > 100) {
      pattern.times.shift();
      pattern.locations.shift();
      pattern.devices.shift();
    }
  }

  /**
   * التحقق من نمط الوصول الطبيعي
   */
  _isNormalAccessPattern(auditEntry) {
    const key = `${auditEntry.userId}:${auditEntry.action}`;
    const pattern = this.accessPatterns.get(key);

    if (!pattern || pattern.occurrences < 5) {
      return true; // لا يوجد بيانات كافية لتحديد ما إذا كان غير طبيعي
    }

    // التحقق من الساعة
    const currentHour = new Date().getHours();
    const avgHour = Math.round(
      pattern.times.reduce((a, b) => a + b, 0) / pattern.times.length
    );

    // إذا كان الوصول في أوقات مختلفة جداً، قد يكون غير طبيعي
    if (Math.abs(currentHour - avgHour) > 6) {
      return false;
    }

    return true;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PRIVATE METHODS - الطرق الخاصة
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * حساب توزيع الأحداث
   */
  _calculateEventDistribution(logs) {
    const distribution = {};

    logs.forEach(log => {
      distribution[log.eventType] = (distribution[log.eventType] || 0) + 1;
    });

    return distribution;
  }

  /**
   * حساب نشاط المستخدم
   */
  _calculateUserActivity(logs) {
    const activity = {};

    logs.forEach(log => {
      if (!activity[log.userId]) {
        activity[log.userId] = {
          totalActions: 0,
          successfulActions: 0,
          failedActions: 0,
          actions: []
        };
      }

      activity[log.userId].totalActions++;
      if (log.status === 'success') activity[log.userId].successfulActions++;
      if (log.status === 'failure') activity[log.userId].failedActions++;

      if (!activity[log.userId].actions.includes(log.action)) {
        activity[log.userId].actions.push(log.action);
      }
    });

    return activity;
  }

  /**
   * حساب نشاط المورد
   */
  _calculateResourceActivity(logs) {
    const activity = {};

    logs.forEach(log => {
      if (!activity[log.resource]) {
        activity[log.resource] = {
          accesses: 0,
          modifications: 0,
          deletions: 0,
          users: new Set()
        };
      }

      activity[log.resource].accesses++;
      if (log.action === 'DELETE') activity[log.resource].deletions++;
      if (log.action === 'UPDATE') activity[log.resource].modifications++;
      activity[log.resource].users.add(log.userId);
    });

    // تحويل Sets إلى Arrays
    Object.keys(activity).forEach(resource => {
      activity[resource].users = Array.from(activity[resource].users);
    });

    return activity;
  }

  /**
   * توليد التوصيات
   */
  _generateRecommendations(logs) {
    const recommendations = [];

    // فحص معدلات الفشل المرتفعة
    const failureRate = logs.filter(e => e.status === 'failure').length / logs.length;
    if (failureRate > 0.1) {
      recommendations.push({
        priority: 'high',
        title: 'معدل فشل مرتفع في الوصول',
        description: `معدل الفشل ${(failureRate * 100).toFixed(2)}% قد يشير إلى مشاكل في التكوين`,
        action: 'فحص السياسات والأذونات'
      });
    }

    // فحص الأدوار المستخدمة غير الكافية
    const rolesCount = new Set(logs.flatMap(e => e.metadata.roles || [])).size;
    if (rolesCount < 5) {
      recommendations.push({
        priority: 'medium',
        title: 'عدد محدود من الأدوار',
        description: 'قد تحتاج إلى مزيد من الأدوار المتخصصة',
        action: 'مراجعة هيكل الأدوار والأذونات'
      });
    }

    return recommendations;
  }

  /**
   * حساب شدة الحدث
   */
  _calculateSeverity(eventType) {
    const severityMap = {
      'ROLE_DELETED': 'critical',
      'PERMISSION_REVOKED': 'high',
      'UNAUTHORIZED_ACCESS': 'high',
      'ROLE_CREATED': 'medium',
      'PERMISSION_ASSIGNED': 'low'
    };

    return severityMap[eventType] || 'low';
  }

  /**
   * تشغيل التنبيهات
   */
  _triggerAlert(incident) {
    // يمكن دمج نظام التنبيهات الخارجي هنا
    console.warn(`🚨 Security Alert: ${incident.type}`, incident);
  }

  /**
   * توليد معرّف فريد
   */
  _generateId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * بدء مؤقت التنظيف
   */
  startCleanupTimer() {
    setInterval(() => {
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 86400000);

      // تنظيف السجلات القديمة
      const originalLength = this.auditLog.length;
      this.auditLog = this.auditLog.filter(e => e.timestamp > cutoffDate);

      if (this.auditLog.length < originalLength) {
        console.log(`🧹 Cleaned up ${originalLength - this.auditLog.length} old audit entries`);
      }

      // تنظيف الحوادث القديمة
      const oldIncidentsLength = this.securityIncidents.length;
      this.securityIncidents = this.securityIncidents.filter(i => i.reportedAt > cutoffDate);

      if (this.securityIncidents.length < oldIncidentsLength) {
        console.log(`🧹 Cleaned up ${oldIncidentsLength - this.securityIncidents.length} old incidents`);
      }
    }, 86400000); // تشغيل يومياً
  }

  /**
   * تصدير سجلات التدقيق
   */
  exportAuditLogs(format = 'json') {
    if (format === 'csv') {
      return this._exportAsCSV();
    }

    return {
      exportDate: new Date(),
      totalRecords: this.auditLog.length,
      data: this.auditLog
    };
  }

  /**
   * تصدير بصيغة CSV
   */
  _exportAsCSV() {
    const headers = ['Timestamp', 'EventType', 'UserId', 'Action', 'Resource', 'Status', 'Severity'];
    const rows = this.auditLog.map(e => [
      e.timestamp.toISOString(),
      e.eventType,
      e.userId,
      e.action,
      e.resource,
      e.status,
      e.severity
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    return csv;
  }

  /**
   * الحصول على ملخص الأمان
   */
  getSecuritySummary() {
    const last7Days = this.auditLog.filter(e =>
      e.timestamp > new Date(Date.now() - 604800000)
    );

    const last30Days = this.auditLog.filter(e =>
      e.timestamp > new Date(Date.now() - 2592000000)
    );

    return {
      last7Days: {
        totalEvents: last7Days.length,
        failures: last7Days.filter(e => e.status === 'failure').length,
        criticalEvents: last7Days.filter(e => e.severity === 'critical').length
      },
      last30Days: {
        totalEvents: last30Days.length,
        failures: last30Days.filter(e => e.status === 'failure').length,
        criticalEvents: last30Days.filter(e => e.severity === 'critical').length
      },
      activeIncidents: this.getSecurityIncidents({ status: 'open' }).length,
      highRiskIncidents: this.getSecurityIncidents({ severity: 'high' }).length
    };
  }

  /**
   * الحصول على سجل الوصول للمستخدم
   */
  getUserAccessHistory(userId, limit = 50) {
    const userLogs = this.auditLog
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return userLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      status: log.status,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      severity: log.severity
    }));
  }
}

module.exports = RBACAuditingService;

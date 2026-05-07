'use strict';

/**
 * documentAuditService — in-memory singleton (EventEmitter)
 * Flat-path barrel for audit-log operations.
 */

const EventEmitter = require('events');
const { createHash, randomUUID } = require('crypto');

const AUDIT_EVENTS = {
  CREATED: 'document.created',
  VIEWED: 'document.viewed',
  DELETED: 'document.deleted',
  SHARED: 'document.shared',
  ACCESS_DENIED: 'document.access_denied',
  SIGNED: 'document.signed',
  BULK_OPERATION: 'document.bulk_operation',
  LOCKED: 'document.locked',
  DOWNLOADED: 'document.downloaded',
  UPDATED: 'document.updated',
};

class DocumentAuditService extends EventEmitter {
  constructor() {
    super();
    this.auditLog = [];
    this.lastHash = null;
  }

  // ── logEvent ─────────────────────────────────────────────────────────────
  async logEvent({
    eventType,
    documentId,
    documentTitle = '',
    userId,
    userName = 'مستخدم غير معروف',
    ipAddress = 'unknown',
    userAgent = 'unknown',
  } = {}) {
    const previousHash = this.lastHash || 'GENESIS';
    const timestamp = new Date();
    const severity = this._getEventSeverity(eventType);
    const category = this._getEventCategory(eventType);

    const hashInput = JSON.stringify({ eventType, documentId, userId, timestamp, previousHash });
    const hash = createHash('sha256').update(hashInput).digest('hex');

    const entry = {
      id: randomUUID(),
      eventType,
      documentId,
      documentTitle,
      userId,
      userName,
      ipAddress,
      userAgent,
      timestamp,
      hash,
      previousHash,
      severity,
      category,
    };

    this.auditLog.push(entry);
    this.lastHash = hash;

    this.emit('auditEvent', entry);
    this._checkSuspiciousActivity(userId, eventType);

    return { success: true, data: entry };
  }

  // ── _getEventSeverity ─────────────────────────────────────────────────────
  _getEventSeverity(eventType) {
    if (!eventType) return 'low';
    if (
      eventType.includes('deleted') ||
      eventType.includes('access_denied') ||
      eventType.includes('permission')
    ) {
      return 'critical';
    }
    if (
      eventType.includes('shared') ||
      eventType.includes('signed') ||
      eventType.includes('exported')
    ) {
      return 'high';
    }
    if (
      eventType.includes('updated') ||
      eventType.includes('approved') ||
      eventType.includes('rejected')
    ) {
      return 'medium';
    }
    return 'low';
  }

  // ── _getEventCategory ─────────────────────────────────────────────────────
  _getEventCategory(eventType) {
    if (!eventType) return 'general';
    if (
      eventType.includes('permission') ||
      eventType.includes('shared') ||
      eventType.includes('access_denied')
    ) {
      return 'security';
    }
    if (eventType.includes('version') || eventType.includes('updated')) {
      return 'modification';
    }
    if (eventType.includes('viewed') || eventType.includes('downloaded')) {
      return 'access';
    }
    if (
      eventType.includes('approved') ||
      eventType.includes('rejected') ||
      eventType.includes('signed')
    ) {
      return 'workflow';
    }
    return 'general';
  }

  // ── _checkSuspiciousActivity ──────────────────────────────────────────────
  _checkSuspiciousActivity(userId, eventType) {
    if (!userId || !eventType) return;

    const userEvents = this.auditLog.filter(e => e.userId === userId);

    if (eventType.includes('downloaded')) {
      const count = userEvents.filter(e => e.eventType.includes('downloaded')).length;
      if (count > 20) {
        this.emit('suspiciousActivity', { userId, type: 'excessive_downloads', count });
      }
    }

    if (eventType.includes('access_denied')) {
      const count = userEvents.filter(e => e.eventType.includes('access_denied')).length;
      if (count > 5) {
        this.emit('suspiciousActivity', { userId, type: 'repeated_access_denied', count });
      }
    }

    if (eventType.includes('deleted')) {
      const count = userEvents.filter(e => e.eventType.includes('deleted')).length;
      if (count > 10) {
        this.emit('suspiciousActivity', { userId, type: 'mass_deletion', count });
      }
    }
  }

  // ── getAuditLog ────────────────────────────────────────────────────────────
  async getAuditLog({
    documentId,
    userId,
    eventType,
    severity,
    search,
    page = 1,
    limit = 10,
  } = {}) {
    let filtered = [...this.auditLog];

    if (documentId) filtered = filtered.filter(e => e.documentId === documentId);
    if (userId) filtered = filtered.filter(e => e.userId === userId);
    if (eventType) filtered = filtered.filter(e => e.eventType === eventType);
    if (severity) filtered = filtered.filter(e => e.severity === severity);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        e =>
          (e.userName && e.userName.toLowerCase().includes(s)) ||
          (e.documentTitle && e.documentTitle.toLowerCase().includes(s)) ||
          (e.documentId && e.documentId.toLowerCase().includes(s))
      );
    }

    const total = filtered.length;
    const pages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return { success: true, total, pages, data };
  }

  // ── getDocumentAuditTrail ──────────────────────────────────────────────────
  async getDocumentAuditTrail(docId) {
    const entries = this.auditLog.filter(e => e.documentId === docId);
    const total = entries.length;

    const uniqueUsers = [...new Set(entries.map(e => e.userId))].length;
    const eventTypes = [...new Set(entries.map(e => e.eventType))];
    const firstEvent = entries.length ? entries[0].timestamp : null;
    const lastEvent = entries.length ? entries[entries.length - 1].timestamp : null;

    return {
      success: true,
      total,
      data: entries,
      summary: { uniqueUsers, eventTypes, firstEvent, lastEvent, totalEvents: total },
    };
  }

  // ── getUserActivityReport ─────────────────────────────────────────────────
  async getUserActivityReport(userId) {
    const entries = this.auditLog.filter(e => e.userId === userId);
    const totalActions = entries.length;

    const eventCounts = {};
    const dailyActivity = {};

    for (const e of entries) {
      eventCounts[e.eventType] = (eventCounts[e.eventType] || 0) + 1;
      const day = e.timestamp.toISOString().slice(0, 10);
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    }

    const recentActions = entries.slice(-20);

    return {
      success: true,
      data: { totalActions, eventCounts, dailyActivity, recentActions },
    };
  }

  // ── generateComplianceReport ──────────────────────────────────────────────
  async generateComplianceReport() {
    const totalEvents = this.auditLog.length;
    const criticalEvents = this.auditLog.filter(e => e.severity === 'critical').length;
    const chainIntegrity = this.verifyChainIntegrity();

    let level = 'منخفض';
    if (criticalEvents > 10) level = 'عالٍ';
    else if (criticalEvents > 0) level = 'متوسط';

    return {
      success: true,
      data: {
        summary: { totalEvents, criticalEvents },
        riskAssessment: { level },
        chainIntegrity,
      },
    };
  }

  // ── verifyChainIntegrity ──────────────────────────────────────────────────
  verifyChainIntegrity() {
    const log = this.auditLog;
    if (log.length === 0) {
      return { valid: true, entries: 0, message: 'سلسلة التدقيق سليمة (فارغة)' };
    }

    for (let i = 1; i < log.length; i++) {
      if (log[i].previousHash !== log[i - 1].hash) {
        return {
          valid: false,
          entries: log.length,
          brokenAt: i,
          message: 'تم اكتشاف تلاعب في سلسلة التدقيق',
        };
      }
    }

    return { valid: true, entries: log.length, message: 'سلسلة التدقيق سليمة' };
  }

  // ── exportAuditLog ────────────────────────────────────────────────────────
  async exportAuditLog(format = 'json') {
    if (format === 'csv') {
      const headers = ['التاريخ', 'نوع الحدث', 'معرف الوثيقة', 'المستخدم', 'عنوان IP', 'الخطورة'];
      const rows = this.auditLog.map(e => [
        e.timestamp.toISOString(),
        e.eventType,
        e.documentId || '',
        e.userName,
        e.ipAddress,
        e.severity,
      ]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      return { success: true, format: 'csv', mimeType: 'text/csv', data: csv };
    }

    return {
      success: true,
      format: 'json',
      mimeType: 'application/json',
      data: JSON.stringify(this.auditLog, null, 2),
    };
  }

  // ── getStatistics ─────────────────────────────────────────────────────────
  async getStatistics() {
    const totalEvents = this.auditLog.length;
    if (totalEvents === 0) {
      return {
        success: true,
        data: { totalEvents: 0, averagePerDay: 0, byEventType: {}, bySeverity: {} },
      };
    }

    const byEventType = {};
    const bySeverity = {};
    const days = new Set();

    for (const e of this.auditLog) {
      byEventType[e.eventType] = (byEventType[e.eventType] || 0) + 1;
      bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
      days.add(e.timestamp.toISOString().slice(0, 10));
    }

    const averagePerDay = days.size > 0 ? Math.round(totalEvents / days.size) : 0;

    return { success: true, data: { totalEvents, averagePerDay, byEventType, bySeverity } };
  }
}

const instance = new DocumentAuditService();
instance.AUDIT_EVENTS = AUDIT_EVENTS;
module.exports = instance;
module.exports.AUDIT_EVENTS = AUDIT_EVENTS;

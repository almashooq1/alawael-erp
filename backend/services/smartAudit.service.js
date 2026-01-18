/**
 * Smart Audit & Data Privacy Service (Phase 67)
 *
 * Handles compliance, immutable logging, and data protection (DLP).
 * Ensures the system meets HIPAA/GDPR/National Cybersecurity standards.
 */

class SmartAuditService {
  constructor() {
    // In-memory mock for audit logs (In production, use Elasticsearch or specific encrypted DB)
    this.auditTrail = [];
  }

  /**
   * Log a Sensitive Action (The "Black Box" of the system)
   * @param {string} userId - Who performed the action
   * @param {string} action - READ, WRITE, DELETE, EXPORT
   * @param {string} resource - e.g., 'PatientRecord:123'
   * @param {object} metadata - content changed, IP address, etc.
   */
  async logAction(userId, action, resource, metadata = {}) {
    const entry = {
      id: 'AUD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date(),
      userId,
      action, // e.g., 'ACCESS_R_MEDICAL'
      resource,
      severity: this._getSeverity(action),
      metadata: JSON.stringify(metadata),
      hash: 'SHA256-SIMULATION', // In real app, hash previous entry + current for blockchain-like integrity
    };

    this.auditTrail.push(entry);
    console.log(`[AUDIT] User ${userId} performed ${action} on ${resource}`);

    return entry;
  }

  /**
   * Retrieve Audit Logs for an entity (Compliance Review)
   */
  async getLogs(resourceId, filters = {}) {
    return this.auditTrail.filter(log => log.resource.includes(resourceId)).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Smart Data Masking (DLP)
   * dynamically masks PII (Personally Identifiable Information) based on viewer role
   */
  maskData(data, viewerRole) {
    if (viewerRole === 'ADMIN' || viewerRole === 'DOCTOR') {
      return data; // Full access
    }

    // Deep clone to avoid mutating original
    const masked = JSON.parse(JSON.stringify(data));

    // Mask National ID
    if (masked.nationalId) masked.nationalId = '***-**-' + masked.nationalId.slice(-4);

    // Mask Phone
    if (masked.phone) masked.phone = '******' + masked.phone.slice(-3);

    // Hide sensitive diagnoses for non-clinical staff
    if (viewerRole !== 'NURSE' && masked.medicalHistory) {
      masked.medicalHistory = '[REDACTED - CLINICAL ONLY]';
    }

    return masked;
  }

  /**
   * Track Patient Consent for Data Sharing
   */
  async checkConsent(patientId, purpose) {
    // Mock consent database
    // Purposes: 'RESEARCH', 'MARKETING', 'EXTERNAL_PROVIDER'
    const consents = {
      RESEARCH: true,
      MARKETING: false,
      EXTERNAL_PROVIDER: true,
    };

    return {
      patientId,
      purpose,
      allowed: consents[purpose] || false,
      timestamp: new Date(),
    };
  }

  _getSeverity(action) {
    if (action.includes('DELETE') || action.includes('EXPORT')) return 'CRITICAL';
    if (action.includes('WRITE')) return 'MEDIUM';
    return 'LOW';
  }
}

module.exports = SmartAuditService;

// Mock Models
const User = require('../models/User');

/**
 * PHASE 57: Smart Legal Sentinel & Ethics Watchdog
 * Ensures compliance with HIPAA/GDPR and monitors for internal threats.
 */
class SmartLegalService {
  /**
   * Anomaly Detection for Data Access
   * "Why is the accountant opening clinical notes at 3 AM?"
   */
  static async detectAccessAnomaly(userId, resourceAccessed, time) {
    // Mock User Profile
    const user = { id: userId, role: 'ACCOUNTANT', shift: '09:00-17:00' };

    const hour = new Date(time).getHours();
    const alerts = [];

    // Rule 1: Time Violation
    if (hour < 8 || hour > 18) {
      alerts.push({ type: 'AFTER_HOURS_ACCESS', risk: 'MEDIUM', details: `Access at ${hour}:00` });
    }

    // Rule 2: Role Scope Violation
    if (user.role === 'ACCOUNTANT' && resourceAccessed.includes('CLINICAL_NOTES')) {
      alerts.push({ type: 'SCOPE_VIOLATION', risk: 'HIGH', details: 'Accountant accessing medical EMR.' });
    }

    if (alerts.length > 0) {
      return { allowed: false, flags: alerts, action: 'BLOCK_AND_LOG' };
    }
    return { allowed: true };
  }

  /**
   * Consent Blockchain Ledger (Simulated)
   * Ensures every treatment has a valid, unexpired consent form.
   */
  static async verifyProcedureConsent(patientId, procedureCode) {
    // Mock Consent Database
    const activeConsents = [
      { patientId: 'P001', procedure: 'GENERAL_THERAPY', expires: '2026-12-31' },
      { patientId: 'P001', procedure: 'PHOTOGRAPHY', expires: '2025-01-01' }, // Expired
    ];

    const consent = activeConsents.find(c => c.patientId === patientId && c.procedure === procedureCode);

    if (!consent) {
      return { valid: false, reason: 'NO_CONSENT_ON_FILE' };
    }

    if (new Date(consent.expires) < new Date()) {
      return { valid: false, reason: 'CONSENT_EXPIRED' };
    }

    return { valid: true, transactionId: 'BLK-CHAIN-HASH-123' };
  }

  /**
   * PII Redaction for External Export
   * Removes Names, IDs, Phones before data leaves the system.
   */
  static sanitizeForExport(jsonData) {
    const sanitized = JSON.parse(JSON.stringify(jsonData));

    const masker = obj => {
      for (let k in obj) {
        if (typeof obj[k] === 'object') masker(obj[k]);
        else {
          if (['name', 'phone', 'ssn', 'iqama'].includes(k.toLowerCase())) obj[k] = 'REDACTED';
          if (k === 'email') obj[k] = 'REDACTED@PRIVACY.COM';
        }
      }
    };

    masker(sanitized);
    return sanitized;
  }
}

module.exports = SmartLegalService;

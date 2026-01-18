const User = require('../models/User');

class SmartSecurityService {
  /**
   * Behavioral Anomaly Detection
   * Flags suspicious access even if credentials are correct
   */
  static async detectAccessAnomaly(userId, resourceAccessed) {
    const user = await User.findById(userId);
    if (!user) return null;

    const currentHour = new Date().getHours();
    const alerts = [];

    // Rule 1: Time-based Anomaly (Accessing Medical Records at 3 AM)
    if (currentHour >= 2 && currentHour <= 5) {
      alerts.push({ level: 'HIGH', msg: 'After-hours access detected' });
    }

    // Rule 2: Role-based Anomaly (Nurse accessing Financial Reports)
    if (user.role === 'NURSE' && resourceAccessed.includes('FINANCE')) {
      alerts.push({ level: 'CRITICAL', msg: 'Unauthorized Role Access Attempt' });
    }

    // Rule 3: Volume Anomaly (Opening 50 records in 1 minute) -> *Requires tracking counter*

    if (alerts.length > 0) {
      await this.logSecurityEvent(userId, alerts);
      return { status: 'SUSPICIOUS', alerts };
    }

    return { status: 'CLEAN' };
  }

  static async logSecurityEvent(userId, alerts) {
    console.warn(`[SECURITY ALERT] User ${userId}:`, alerts);
    // Save to specialized AuditLog model
  }
}

module.exports = SmartSecurityService;
module.exports.instance = new SmartSecurityService();

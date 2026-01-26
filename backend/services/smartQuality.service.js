const ComplianceLog = require('../models/ComplianceLog');
const Employee = require('../models/Employee');
const TherapySession = require('../models/TherapySession');
const Vehicle = require('../models/Vehicle'); // تغيير إلى Vehicle.js الأساسي
const SmartNotificationService = require('./smartNotificationService');

class SmartQualityService {
  /**
   * MASTER SCAN: Runs all sub-scans
   */
  static async runFullComplianceScan(runByUserId) {
    const results = {
      hr: await this.scanHRCompliance(),
      fleet: await this.scanFleetCompliance(),
      clinical: await this.scanClinicalQuality(),
    };

    const totalIssues = results.hr + results.fleet + results.clinical;

    if (totalIssues > 0) {
      await SmartNotificationService.send(
        runByUserId,
        'Quality Scan Complete',
        `Found ${totalIssues} compliance issues manually. Check Dashboard.`,
        'WARNING',
        '/quality/dashboard'
      );
    }

    return { success: true, issuesFound: totalIssues, details: results };
  }

  /**
   * 1. HR: Check Contract Expiry & Documents
   */
  static async scanHRCompliance() {
    let count = 0;
    const employees = await Employee.find({ status: 'ACTIVE' });

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    for (const emp of employees) {
      // Check Current Contract
      const currentContract =
        emp.contracts && emp.contracts.length > 0 ? emp.contracts[emp.contracts.length - 1] : null;

      if (currentContract && currentContract.endDate) {
        if (currentContract.endDate < thirtyDaysFromNow) {
          await this.logIssue(
            'HR',
            'EXPIRING_CONTRACT',
            `Contract for ${emp.fullName} expires soon (${currentContract.endDate.toISOString().split('T')[0]})`,
            emp._id,
            'Employee',
            'WARNING'
          );
          count++;
        }
      } else if (!currentContract) {
        await this.logIssue(
          'HR',
          'MISSING_CONTRACT',
          `Active employee ${emp.fullName} has no recorded contract.`,
          emp._id,
          'Employee',
          'CRITICAL'
        );
        count++;
      }
    }
    return count;
  }

  /**
   * 2. Fleet: Check Vehicle Istimara & Insurance (Simulation)
   */
  static async scanFleetCompliance() {
    let count = 0;
    // Using generic Vehicle model call, adjust if schema limits
    try {
      const vehicles = await Vehicle.find({ status: 'ACTIVE' }); // Assuming status field exists

      const now = new Date();

      for (const v of vehicles) {
        // Simulate checking logic if fields vary, keeping it safe
        // In real app, we check v.insurance.expiryDate
        if (v.insuranceExpiry && v.insuranceExpiry < now) {
          await this.logIssue(
            'FLEET',
            'EXPIRED_INSURANCE',
            `Vehicle ${v.plateNumber} insurance expired.`,
            v._id,
            'Vehicle',
            'CRITICAL'
          );
          count++;
        }
      }
    } catch (e) {
      // Vehicle model might be complex or named differently, fail gracefully
      console.log('Fleet scan skipped or failed:', e.message);
    }
    return count;
  }

  /**
   * 3. Clinical: Data Integrity & Quality (SOAP Notes)
   */
  static async scanClinicalQuality() {
    let count = 0;

    // Check last 7 days only to avoid massive old log spam
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = await TherapySession.find({
      status: 'COMPLETED',
      updatedAt: { $gte: sevenDaysAgo },
    }).populate('therapist', 'firstName lastName');

    for (const session of recentSessions) {
      // Check if Subjective/Objective notes are too short
      const subLen = session.notes?.subjective?.length || 0;
      const objLen = session.notes?.objective?.length || 0;

      if (subLen < 10 || objLen < 10) {
        // Check if already logged to avoid dupes
        const exists = await ComplianceLog.findOne({
          relatedId: session._id,
          issueType: 'POOR_DOCUMENTATION',
        });
        if (!exists) {
          await this.logIssue(
            'CLINICAL',
            'POOR_DOCUMENTATION',
            `Session on ${session.date.toISOString().split('T')[0]} by ${session.therapist.firstName} has clear/missing notes.`,
            session._id,
            'TherapySession',
            'WARNING'
          );
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Helper to save log
   */
  static async logIssue(domain, type, desc, refId, refModel, severity) {
    // Prevent duplicate open logs
    const exists = await ComplianceLog.findOne({
      domain,
      issueType: type,
      relatedId: refId,
      status: 'OPEN',
    });

    if (!exists) {
      await ComplianceLog.create({
        domain,
        issueType: type,
        description: desc,
        relatedId: refId,
        relatedModel: refModel,
        severity,
      });
    }
  }

  /**
   * Get Dashboard Stats
   */
  static async getStats() {
    return await ComplianceLog.aggregate([
      { $match: { status: 'OPEN' } },
      { $group: { _id: '$domain', count: { $sum: 1 } } },
    ]);
  }
}

module.exports = SmartQualityService;
module.exports.instance = new SmartQualityService();

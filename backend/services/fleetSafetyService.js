/**
 * Fleet Safety Service - خدمة السلامة والحوادث
 *
 * إدارة حوادث السلامة والتحقيقات والإجراءات التصحيحية
 */

const FleetSafetyIncident = require('../models/FleetSafetyIncident');
const Driver = require('../models/Driver');
const logger = require('../utils/logger');

class FleetSafetyService {
  /**
   * تسجيل حادث جديد
   */
  static async reportIncident(data) {
    const incident = new FleetSafetyIncident(data);
    incident.timeline.push({
      event: 'reported',
      timestamp: new Date(),
      userId: data.reportedBy || data.createdBy,
      details: 'تم الإبلاغ عن الحادث',
    });
    await incident.save();
    logger.info(`Safety incident reported: ${incident.incidentNumber} (${incident.type})`);
    return incident;
  }

  /**
   * جلب جميع الحوادث
   */
  static async getAll(filters = {}, page = 1, limit = 20) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;
    if (filters.status) query.status = filters.status;
    if (filters.vehicle) query.vehicle = filters.vehicle;
    if (filters.driver) query.driver = filters.driver;
    if (filters.organization) query.organization = filters.organization;
    if (filters.dateFrom || filters.dateTo) {
      query['details.date'] = {};
      if (filters.dateFrom) query['details.date'].$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query['details.date'].$lte = new Date(filters.dateTo);
    }

    const [incidents, total] = await Promise.all([
      FleetSafetyIncident.find(query)
        .populate('vehicle', 'plateNumber type')
        .populate('driver', 'name phone')
        .populate('reportedBy', 'name email')
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ 'details.date': -1 }),
      FleetSafetyIncident.countDocuments(query),
    ]);

    return { incidents, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * جلب حادث بالـ ID
   */
  static async getById(id) {
    return FleetSafetyIncident.findById(id)
      .populate('vehicle', 'plateNumber type model year')
      .populate('driver', 'name phone licenseNumber')
      .populate('reportedBy', 'name email')
      .populate('investigation.investigator', 'name email')
      .populate('correctiveActions.assignedTo', 'name email');
  }

  /**
   * تحديث حادث
   */
  static async update(id, data, userId) {
    const incident = await FleetSafetyIncident.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (incident) {
      incident.timeline.push({ event: 'updated', userId, details: 'تم تحديث بيانات الحادث' });
      await incident.save();
    }
    return incident;
  }

  /**
   * بدء التحقيق
   */
  static async startInvestigation(incidentId, investigatorId) {
    const incident = await FleetSafetyIncident.findById(incidentId);
    if (!incident) return null;

    incident.status = 'under_investigation';
    incident.investigation.investigator = investigatorId;
    incident.investigation.startDate = new Date();
    incident.timeline.push({
      event: 'investigation_started',
      userId: investigatorId,
      details: 'بدأ التحقيق في الحادث',
    });

    await incident.save();
    return incident;
  }

  /**
   * إكمال التحقيق
   */
  static async completeInvestigation(incidentId, findings, userId) {
    const incident = await FleetSafetyIncident.findById(incidentId);
    if (!incident) return null;

    incident.investigation.completionDate = new Date();
    incident.investigation.findings = findings.findings;
    incident.investigation.rootCause = findings.rootCause;
    incident.investigation.driverAtFault = findings.driverAtFault;
    incident.investigation.faultPercentage = findings.faultPercentage;
    if (findings.witnesses) incident.investigation.witnesses = findings.witnesses;
    if (findings.policeReportNumber)
      incident.investigation.policeReportNumber = findings.policeReportNumber;

    incident.status = 'action_required';
    incident.timeline.push({
      event: 'investigation_completed',
      userId,
      details: `النتيجة: ${findings.findings?.substring(0, 100) || ''}`,
    });

    await incident.save();
    return incident;
  }

  /**
   * إضافة إجراء تصحيحي
   */
  static async addCorrectiveAction(incidentId, action, userId) {
    const incident = await FleetSafetyIncident.findById(incidentId);
    if (!incident) return null;

    incident.correctiveActions.push(action);
    incident.timeline.push({
      event: 'corrective_action_added',
      userId,
      details: `إجراء: ${action.description}`,
    });

    await incident.save();
    return incident;
  }

  /**
   * تحديث حالة إجراء تصحيحي
   */
  static async updateCorrectiveAction(incidentId, actionId, status, userId) {
    const incident = await FleetSafetyIncident.findById(incidentId);
    if (!incident) return null;

    const action = incident.correctiveActions.id(actionId);
    if (!action) return null;

    action.status = status;
    if (status === 'completed') action.completedDate = new Date();

    incident.timeline.push({
      event: `action_${status}`,
      userId,
      details: `الإجراء: ${action.description} — ${status}`,
    });

    // التحقق من اكتمال جميع الإجراءات
    const allDone = incident.correctiveActions.every(a => a.status === 'completed');
    if (allDone && incident.status === 'action_required') {
      incident.status = 'resolved';
    }

    await incident.save();
    return incident;
  }

  /**
   * إغلاق حادث
   */
  static async closeIncident(incidentId, userId) {
    const incident = await FleetSafetyIncident.findById(incidentId);
    if (!incident) return null;

    incident.status = 'closed';
    incident.timeline.push({
      event: 'closed',
      userId,
      details: 'تم إغلاق الحادث',
    });

    await incident.save();
    return incident;
  }

  /**
   * إضافة مطالبة تأمينية
   */
  static async fileInsuranceClaim(incidentId, claimData, userId) {
    const incident = await FleetSafetyIncident.findById(incidentId);
    if (!incident) return null;

    incident.insurance = {
      claimFiled: true,
      claimNumber: claimData.claimNumber,
      claimDate: new Date(),
      claimStatus: 'pending',
      deductible: claimData.deductible,
    };

    incident.timeline.push({
      event: 'insurance_claim_filed',
      userId,
      details: `رقم المطالبة: ${claimData.claimNumber}`,
    });

    await incident.save();
    return incident;
  }

  /**
   * رفع وثيقة
   */
  static async addDocument(incidentId, doc) {
    const incident = await FleetSafetyIncident.findById(incidentId);
    if (!incident) return null;

    incident.documents.push({ ...doc, uploadedAt: new Date() });
    await incident.save();
    return incident;
  }

  /**
   * حوادث السائق
   */
  static async getDriverIncidents(driverId) {
    return FleetSafetyIncident.find({ driver: driverId })
      .populate('vehicle', 'plateNumber')
      .sort({ 'details.date': -1 });
  }

  /**
   * حوادث المركبة
   */
  static async getVehicleIncidents(vehicleId) {
    return FleetSafetyIncident.find({ vehicle: vehicleId })
      .populate('driver', 'name')
      .sort({ 'details.date': -1 });
  }

  /**
   * تقييم سلامة السائق
   */
  static async getDriverSafetyScore(driverId) {
    const incidents = await FleetSafetyIncident.find({ driver: driverId });

    let score = 100;
    const severityDeductions = { minor: 5, moderate: 10, major: 20, severe: 35, fatal: 50 };
    const faultDeductions = { true: 1.5, false: 0.5 }; // مضاعف

    incidents.forEach(inc => {
      const deduction = severityDeductions[inc.severity] || 5;
      const multiplier = faultDeductions[String(inc.investigation?.driverAtFault)] || 1;
      score -= deduction * multiplier;
    });

    score = Math.max(0, Math.min(100, score));

    return {
      driverId,
      safetyScore: Math.round(score),
      totalIncidents: incidents.length,
      bySeverity: {
        minor: incidents.filter(i => i.severity === 'minor').length,
        moderate: incidents.filter(i => i.severity === 'moderate').length,
        major: incidents.filter(i => i.severity === 'major').length,
        severe: incidents.filter(i => i.severity === 'severe').length,
        fatal: incidents.filter(i => i.severity === 'fatal').length,
      },
      atFault: incidents.filter(i => i.investigation?.driverAtFault).length,
      riskLevel: score >= 80 ? 'low' : score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical',
    };
  }

  /**
   * إحصائيات السلامة
   */
  static async getStatistics(filters = {}) {
    const match = {};
    if (filters.organization) match.organization = filters.organization;
    if (filters.dateFrom) match['details.date'] = { $gte: new Date(filters.dateFrom) };

    const stats = await FleetSafetyIncident.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalIncidents: { $sum: 1 },
          reportedCount: { $sum: { $cond: [{ $eq: ['$status', 'reported'] }, 1, 0] } },
          investigatingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'under_investigation'] }, 1, 0] },
          },
          resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          closedCount: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          totalDamageCost: { $sum: '$damages.totalActualCost' },
          totalInsurancePayout: { $sum: '$insurance.payout' },
          avgResolutionDays: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } },
        },
      },
    ]);

    const bySeverity = await FleetSafetyIncident.aggregate([
      { $match: match },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    const byType = await FleetSafetyIncident.aggregate([
      { $match: match },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const monthlyTrend = await FleetSafetyIncident.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$details.date' } },
          count: { $sum: 1 },
          damageCost: { $sum: '$damages.totalActualCost' },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]);

    return {
      summary: stats[0] || {},
      bySeverity,
      byType,
      monthlyTrend,
    };
  }

  /**
   * أعلى السائقين خطورة
   */
  static async getHighRiskDrivers(organizationId, limit = 10) {
    const match = {};
    if (organizationId) match.organization = organizationId;

    const drivers = await FleetSafetyIncident.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$driver',
          incidentCount: { $sum: 1 },
          severeCount: {
            $sum: { $cond: [{ $in: ['$severity', ['major', 'severe', 'fatal']] }, 1, 0] },
          },
          totalDamage: { $sum: '$damages.totalActualCost' },
        },
      },
      { $sort: { incidentCount: -1 } },
      { $limit: limit },
    ]);

    // Populate driver info
    const driverIds = drivers.map(d => d._id).filter(Boolean);
    const driverDocs = await Driver.find({ _id: { $in: driverIds } }).select('name phone');
    const driverMap = {};
    driverDocs.forEach(d => {
      driverMap[d._id.toString()] = d;
    });

    return drivers.map(d => ({
      ...d,
      driver: driverMap[d._id?.toString()] || null,
    }));
  }
}

module.exports = FleetSafetyService;

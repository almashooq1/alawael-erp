'use strict';

const {
  Incident,
  Complaint,
  SatisfactionSurvey,
  Checklist,
  ChecklistSubmission,
  Audit,
  ImprovementProject,
  Risk,
  QualityStandard,
} = require('../../models/QualityModels');
const logger = require('../../utils/logger');

/**
 * خدمة الجودة والامتثال المحسّنة
 * Enhanced Quality & Compliance Service — Prompt 12
 */
class QualityEnhancedService {
  // ============================================================
  // الحوادث (Incidents)
  // ============================================================

  async reportIncident(data, reportedBy) {
    const year = new Date().getFullYear();
    const count = await Incident.countDocuments({ incidentNumber: { $regex: `^INC-${year}` } });
    const incidentNumber = `INC-${year}-${String(count + 1).padStart(4, '0')}`;

    const incident = await Incident.create({
      ...data,
      incidentNumber,
      reportedBy,
      status: 'reported',
    });

    // تصعيد تلقائي للحوادث الخطيرة
    if (['major', 'catastrophic'].includes(data.severity)) {
      try {
        const notifService = require('../notifications/notification-enhanced.service');
        await notifService.createEscalation(
          'Incident',
          incident._id,
          'incident',
          `حادثة ${data.severity === 'catastrophic' ? 'كارثية' : 'كبيرة'}: ${data.description}`,
          data.branchId,
          'critical',
          reportedBy
        );
      } catch (err) {
        logger.warn(`[Quality] فشل التصعيد التلقائي: ${err.message}`);
      }

      if (data.severity === 'catastrophic') {
        await Incident.findByIdAndUpdate(incident._id, { reportedToMoh: true });
      }
    }

    logger.info(`[Quality] حادثة جديدة: ${incidentNumber} — شدة: ${data.severity}`);
    return Incident.findById(incident._id);
  }

  async submitRca(incidentId, method, details, userId) {
    const rootCause =
      method === 'five_why' ? details.whys?.[details.whys.length - 1]?.answer : details.rootCause;

    return Incident.findByIdAndUpdate(
      incidentId,
      {
        rcaMethod: method,
        rcaDetails: { method, ...details, performedBy: userId, performedAt: new Date() },
        rootCause,
        status: 'action_plan',
      },
      { new: true }
    );
  }

  async closeIncident(incidentId, notes, closedBy) {
    return Incident.findByIdAndUpdate(
      incidentId,
      { status: 'closed', closureNotes: notes, closedBy, closedAt: new Date() },
      { new: true }
    );
  }

  // ============================================================
  // الشكاوى (Complaints)
  // ============================================================

  async createComplaint(data) {
    const year = new Date().getFullYear();
    const count = await Complaint.countDocuments({ complaintNumber: { $regex: `^CMP-${year}` } });
    const complaintNumber = `CMP-${year}-${String(count + 1).padStart(4, '0')}`;

    const slaDeadlines = {
      high: {
        responseDue: new Date(Date.now() + 4 * 60 * 60 * 1000),
        resolutionDue: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      medium: {
        responseDue: new Date(Date.now() + 24 * 60 * 60 * 1000),
        resolutionDue: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
      low: {
        responseDue: new Date(Date.now() + 48 * 60 * 60 * 1000),
        resolutionDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    };

    return Complaint.create({
      ...data,
      complaintNumber,
      status: 'open',
      slaTracking: slaDeadlines[data.priority || 'medium'],
    });
  }

  async resolveComplaint(complaintId, resolution, resolvedBy, satisfactionRating = null) {
    return Complaint.findByIdAndUpdate(
      complaintId,
      {
        resolution,
        status: 'resolved',
        resolvedBy,
        resolvedAt: new Date(),
        satisfactionRating,
        'slaTracking.resolvedAt': new Date(),
      },
      { new: true }
    );
  }

  // ============================================================
  // استبيانات الرضا + NPS
  // ============================================================

  async submitSurvey(data) {
    return SatisfactionSurvey.create(data);
  }

  async calculateNps(branchId, fromDate = null, toDate = null) {
    const query = { branchId };
    if (fromDate) query.createdAt = { $gte: new Date(fromDate) };
    if (toDate) query.createdAt = { ...query.createdAt, $lte: new Date(toDate) };

    const surveys = await SatisfactionSurvey.find(query);
    const total = surveys.length;
    if (total === 0) return { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };

    const promoters = surveys.filter(s => s.npsScore >= 9).length;
    const passives = surveys.filter(s => s.npsScore >= 7 && s.npsScore <= 8).length;
    const detractors = surveys.filter(s => s.npsScore <= 6).length;
    const nps = Math.round(((promoters - detractors) / total) * 100 * 10) / 10;
    const avg = surveys.reduce((sum, s) => sum + s.npsScore, 0) / total;

    return {
      nps,
      promoters,
      promotersPct: Math.round((promoters / total) * 100 * 10) / 10,
      passives,
      passivesPct: Math.round((passives / total) * 100 * 10) / 10,
      detractors,
      detractorsPct: Math.round((detractors / total) * 100 * 10) / 10,
      total,
      averageScore: Math.round(avg * 10) / 10,
    };
  }

  // ============================================================
  // قوائم الفحص
  // ============================================================

  async submitChecklist(checklistId, branchId, responses, submittedBy) {
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) throw new Error('قائمة الفحص غير موجودة');

    const totalItems = checklist.items.length;
    const compliantItems = responses.filter(r => r.compliant).length;
    const nonCompliantItems = totalItems - compliantItems;
    const complianceRate =
      totalItems > 0 ? Math.round((compliantItems / totalItems) * 100 * 10) / 10 : 0;

    return ChecklistSubmission.create({
      checklistId,
      branchId,
      submittedBy,
      submissionDate: new Date(),
      responses,
      totalItems,
      compliantItems,
      nonCompliantItems,
      complianceRate,
    });
  }

  // ============================================================
  // التدقيق (Audits)
  // ============================================================

  async createAudit(data) {
    const year = new Date().getFullYear();
    const count = await Audit.countDocuments();
    const auditNumber = `AUD-${year}-${String(count + 1).padStart(3, '0')}`;
    return Audit.create({ ...data, auditNumber });
  }

  async updateAuditFindings(auditId, findings) {
    const conformities = findings.filter(f => f.type === 'conformity').length;
    const minorNc = findings.filter(f => f.type === 'minor_nc').length;
    const majorNc = findings.filter(f => f.type === 'major_nc').length;
    const observations = findings.filter(f => f.type === 'observation').length;
    const total = findings.length;
    const complianceRate = total > 0 ? Math.round((conformities / total) * 100 * 10) / 10 : 0;

    return Audit.findByIdAndUpdate(
      auditId,
      {
        findings,
        totalStandardsChecked: total,
        conformities,
        minorNonconformities: minorNc,
        majorNonconformities: majorNc,
        observations,
        overallComplianceRate: complianceRate,
        status: 'completed',
        actualDate: new Date(),
      },
      { new: true }
    );
  }

  // ============================================================
  // إدارة المخاطر
  // ============================================================

  async createRisk(data, ownerId) {
    const year = new Date().getFullYear();
    const count = await Risk.countDocuments();
    const riskNumber = `RSK-${year}-${String(count + 1).padStart(4, '0')}`;
    return Risk.create({ ...data, riskNumber, ownerId });
  }

  assessRiskLevel(likelihood, impact) {
    const score = likelihood * impact;
    if (score >= 17) return 'critical';
    if (score >= 10) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  }

  async getRiskMatrix(branchId) {
    const risks = await Risk.find({ branchId, status: { $ne: 'closed' } }).populate(
      'ownerId',
      'name'
    );

    const matrix = { critical: [], high: [], medium: [], low: [] };
    for (const risk of risks) {
      matrix[risk.riskLevel || 'low'].push({
        id: risk._id,
        title: risk.titleAr,
        score: risk.riskScore,
        category: risk.category,
        owner: risk.ownerId?.name,
      });
    }

    return matrix;
  }

  // ============================================================
  // مشاريع التحسين PDCA
  // ============================================================

  async createImprovementProject(data, ownerId) {
    const year = new Date().getFullYear();
    const count = await ImprovementProject.countDocuments();
    const projectNumber = `IMP-${year}-${String(count + 1).padStart(3, '0')}`;
    return ImprovementProject.create({ ...data, projectNumber, ownerId });
  }

  async updateProjectPhase(projectId, phase, phaseData) {
    const phaseKey = `${phase}Phase`;
    const update = { [phaseKey]: phaseData, currentPhase: phase };
    if (phase === 'act') {
      update.status = 'completed';
      update.actualEndDate = new Date();
    }
    return ImprovementProject.findByIdAndUpdate(projectId, update, { new: true });
  }

  // ============================================================
  // لوحة مؤشرات الجودة الشاملة
  // ============================================================

  async getQualityDashboard(branchId, period = 'month') {
    const startDate = this._getPeriodStart(period);

    const [npsData, incidentStats, complaintStats, complianceStats, riskStats, improvStats] =
      await Promise.allSettled([
        this.calculateNps(branchId, startDate.toISOString()),
        this._getIncidentStats(branchId, startDate),
        this._getComplaintStats(branchId, startDate),
        this._getComplianceStats(branchId, startDate),
        this._getRiskStats(branchId),
        this._getImprovementStats(branchId, startDate),
      ]);

    return {
      nps: npsData.value || {},
      incidents: incidentStats.value || {},
      complaints: complaintStats.value || {},
      compliance: complianceStats.value || {},
      risks: riskStats.value || {},
      improvements: improvStats.value || {},
      generatedAt: new Date(),
    };
  }

  async _getIncidentStats(branchId, startDate) {
    const [total, open, bySeverity] = await Promise.all([
      Incident.countDocuments({ branchId, createdAt: { $gte: startDate } }),
      Incident.countDocuments({ branchId, status: { $nin: ['closed'] } }),
      Incident.aggregate([
        {
          $match: {
            branchId: require('mongoose').Types.ObjectId(branchId),
            createdAt: { $gte: startDate },
          },
        },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
    ]);
    return {
      total,
      open,
      bySeverity: bySeverity.reduce((acc, b) => ({ ...acc, [b._id]: b.count }), {}),
    };
  }

  async _getComplaintStats(branchId, startDate) {
    const [total, open, avgRes] = await Promise.all([
      Complaint.countDocuments({ branchId, createdAt: { $gte: startDate } }),
      Complaint.countDocuments({ branchId, status: { $nin: ['resolved', 'closed'] } }),
      Complaint.aggregate([
        {
          $match: {
            branchId: require('mongoose').Types.ObjectId(branchId),
            resolvedAt: { $ne: null },
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            avgHours: {
              $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] },
            },
          },
        },
      ]),
    ]);
    return { total, open, avgResolutionHours: Math.round((avgRes[0]?.avgHours || 0) * 10) / 10 };
  }

  async _getComplianceStats(branchId, startDate) {
    const submissions = await ChecklistSubmission.find({
      branchId,
      createdAt: { $gte: startDate },
    });
    const avgRate =
      submissions.length > 0
        ? submissions.reduce((sum, s) => sum + s.complianceRate, 0) / submissions.length
        : 0;
    return { overallRate: Math.round(avgRate * 10) / 10, totalSubmissions: submissions.length };
  }

  async _getRiskStats(branchId) {
    const [total, critical, high] = await Promise.all([
      Risk.countDocuments({ branchId, status: { $ne: 'closed' } }),
      Risk.countDocuments({ branchId, status: { $ne: 'closed' }, riskLevel: 'critical' }),
      Risk.countDocuments({ branchId, status: { $ne: 'closed' }, riskLevel: 'high' }),
    ]);
    return { total, critical, high };
  }

  async _getImprovementStats(branchId, startDate) {
    const [active, completed] = await Promise.all([
      ImprovementProject.countDocuments({ branchId, status: 'active' }),
      ImprovementProject.countDocuments({
        branchId,
        status: 'completed',
        actualEndDate: { $gte: startDate },
      }),
    ]);
    return { active, completed };
  }

  _getPeriodStart(period) {
    const now = new Date();
    switch (period) {
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        now.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        now.setFullYear(now.getFullYear() - 1);
        break;
    }
    return now;
  }
}

module.exports = new QualityEnhancedService();

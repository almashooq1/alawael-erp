'use strict';

/**
 * خدمة الكراسي المتحركة والتنقل
 * Wheelchair & Mobility Service
 *
 * تقييم احتياجات التنقل وتوفير الكراسي المتحركة والأجهزة المساعدة
 * وتدريب المستفيدين على استخدامها وصيانتها
 */

class WheelchairMobilityService {
  constructor() {
    this.assessments = new Map();
    this.prescriptions = new Map();
    this.trainingSessions = new Map();
    this.maintenanceLogs = new Map();
    this.devices = new Map();
    this.counter = { assess: 0, prescribe: 0, train: 0, maintain: 0, device: 0 };
  }

  /** تقييم احتياجات التنقل */
  async assessMobilityNeeds(beneficiaryId, data) {
    const id = `MOB-ASSESS-${++this.counter.assess}`;
    const assessment = {
      id,
      beneficiaryId,
      mobilityLevel: data.mobilityLevel || 'غير محدد',
      currentDevice: data.currentDevice || null,
      environment: data.environment || 'منزلي',
      physicalCapabilities: {
        upperBodyStrength: data.upperBodyStrength || 0,
        trunkStability: data.trunkStability || 0,
        grip: data.grip || 0,
        endurance: data.endurance || 0,
      },
      terrainNeeds: data.terrainNeeds || ['داخلي'],
      goals: data.goals || [],
      recommendation: this._generateRecommendation(data),
      assessedBy: data.therapistId,
      date: new Date(),
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  /** وصف جهاز تنقل */
  async prescribeDevice(beneficiaryId, data) {
    const id = `MOB-RX-${++this.counter.prescribe}`;
    const prescription = {
      id,
      beneficiaryId,
      assessmentId: data.assessmentId,
      deviceType: data.deviceType || 'كرسي متحرك يدوي',
      specifications: {
        seatWidth: data.seatWidth || 0,
        seatDepth: data.seatDepth || 0,
        backrestHeight: data.backrestHeight || 0,
        footrestType: data.footrestType || 'قياسي',
        cushionType: data.cushionType || 'ضغط منخفض',
        specialFeatures: data.specialFeatures || [],
      },
      status: 'قيد_الطلب',
      prescribedBy: data.therapistId,
      date: new Date(),
    };
    this.prescriptions.set(id, prescription);
    return prescription;
  }

  /** تسجيل جلسة تدريب على التنقل */
  async recordTrainingSession(beneficiaryId, data) {
    const id = `MOB-TRAIN-${++this.counter.train}`;
    const session = {
      id,
      beneficiaryId,
      prescriptionId: data.prescriptionId,
      skills: data.skills || [],
      performance: {
        propulsion: data.propulsion || 0,
        transfers: data.transfers || 0,
        obstacles: data.obstacles || 0,
        outdoorNavigation: data.outdoorNavigation || 0,
      },
      duration: data.duration || 45,
      notes: data.notes || '',
      therapistId: data.therapistId,
      date: new Date(),
    };
    this.trainingSessions.set(id, session);
    return session;
  }

  /** تسجيل صيانة الجهاز */
  async logMaintenance(deviceId, data) {
    const id = `MOB-MNT-${++this.counter.maintain}`;
    const log = {
      id,
      deviceId,
      type: data.type || 'صيانة_دورية',
      issues: data.issues || [],
      partsReplaced: data.partsReplaced || [],
      cost: data.cost || 0,
      nextMaintenanceDate: data.nextMaintenanceDate || null,
      performedBy: data.technicianId,
      date: new Date(),
    };
    this.maintenanceLogs.set(id, log);
    return log;
  }

  /** تقرير تقدم التنقل */
  async getMobilityReport(beneficiaryId) {
    const assessments = [...this.assessments.values()].filter(
      a => a.beneficiaryId === beneficiaryId
    );
    const prescriptions = [...this.prescriptions.values()].filter(
      p => p.beneficiaryId === beneficiaryId
    );
    const sessions = [...this.trainingSessions.values()].filter(
      s => s.beneficiaryId === beneficiaryId
    );
    return {
      beneficiaryId,
      totalAssessments: assessments.length,
      totalPrescriptions: prescriptions.length,
      totalTrainingSessions: sessions.length,
      latestAssessment: assessments[assessments.length - 1] || null,
      overallProgress:
        sessions.length > 0
          ? Math.round(
              sessions.reduce(
                (s, t) =>
                  s +
                  (t.performance.propulsion +
                    t.performance.transfers +
                    t.performance.obstacles +
                    t.performance.outdoorNavigation) /
                    4,
                0
              ) / sessions.length
            )
          : 0,
      reportDate: new Date(),
    };
  }

  _generateRecommendation(data) {
    const level = data.mobilityLevel || '';
    if (level === 'مستقل_جزئياً') return 'كرسي متحرك يدوي خفيف';
    if (level === 'معتمد_كلياً') return 'كرسي متحرك كهربائي';
    return 'تقييم إضافي مطلوب';
  }
}

module.exports = { WheelchairMobilityService };

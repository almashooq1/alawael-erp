'use strict';

/**
 * خدمة التأهيل البصري
 * Visual Rehabilitation Service
 *
 * تقييم البصر وتوفير المعينات البصرية والتدريب على التوجه والتنقل
 * وتقنيات المعيشة اليومية لذوي الإعاقة البصرية
 */

class VisualRehabilitationService {
  constructor() {
    this.assessments = new Map();
    this.aids = new Map();
    this.orientationSessions = new Map();
    this.dailyLivingSessions = new Map();
    this.counter = { assess: 0, aid: 0, orient: 0, daily: 0 };
  }

  /** تقييم بصري شامل */
  async assessVision(beneficiaryId, data) {
    const id = `VIS-ASSESS-${++this.counter.assess}`;
    const assessment = {
      id,
      beneficiaryId,
      visualAcuity: {
        rightEye: data.rightEyeAcuity || 'غير محدد',
        leftEye: data.leftEyeAcuity || 'غير محدد',
        binocular: data.binocularAcuity || 'غير محدد',
      },
      visualField: data.visualField || 'طبيعي',
      contrastSensitivity: data.contrastSensitivity || 0,
      colorVision: data.colorVision || 'طبيعي',
      diagnosis: data.diagnosis || '',
      functionalVision: {
        reading: data.readingAbility || 0,
        mobility: data.mobilityVision || 0,
        faceRecognition: data.faceRecognition || 0,
        dailyTasks: data.dailyTasks || 0,
      },
      recommendation: this._getRecommendation(data),
      assessedBy: data.ophthalmologistId,
      date: new Date(),
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  /** وصف معين بصري */
  async prescribeVisualAid(beneficiaryId, data) {
    const id = `VIS-AID-${++this.counter.aid}`;
    const aid = {
      id,
      beneficiaryId,
      assessmentId: data.assessmentId,
      type: data.type || 'نظارات',
      specifications: {
        magnification: data.magnification || null,
        lens: data.lens || 'قياسي',
        filter: data.filter || null,
        illumination: data.illumination || false,
      },
      electronicAids: data.electronicAids || [],
      status: 'قيد_التجهيز',
      prescribedBy: data.ophthalmologistId,
      date: new Date(),
    };
    this.aids.set(id, aid);
    return aid;
  }

  /** تسجيل جلسة توجيه وتنقل */
  async recordOrientationSession(beneficiaryId, data) {
    const id = `VIS-ORIENT-${++this.counter.orient}`;
    const session = {
      id,
      beneficiaryId,
      skills: data.skills || [],
      environment: data.environment || 'داخلي',
      performance: {
        whiteCaneTechnique: data.whiteCaneTechnique || 0,
        environmentalAwareness: data.environmentalAwareness || 0,
        routePlanning: data.routePlanning || 0,
        publicTransport: data.publicTransport || 0,
        safetyAwareness: data.safetyAwareness || 0,
      },
      duration: data.duration || 60,
      notes: data.notes || '',
      therapistId: data.therapistId,
      date: new Date(),
    };
    this.orientationSessions.set(id, session);
    return session;
  }

  /** تسجيل جلسة مهارات الحياة اليومية */
  async recordDailyLivingSession(beneficiaryId, data) {
    const id = `VIS-DAILY-${++this.counter.daily}`;
    const session = {
      id,
      beneficiaryId,
      area: data.area || 'مطبخ',
      skills: data.skills || [],
      performance: {
        taskCompletion: data.taskCompletion || 0,
        safety: data.safety || 0,
        independence: data.independence || 0,
        adaptiveTechniques: data.adaptiveTechniques || 0,
      },
      duration: data.duration || 45,
      notes: data.notes || '',
      therapistId: data.therapistId,
      date: new Date(),
    };
    this.dailyLivingSessions.set(id, session);
    return session;
  }

  /** تقرير التأهيل البصري */
  async getVisionReport(beneficiaryId) {
    const assessments = [...this.assessments.values()].filter(
      a => a.beneficiaryId === beneficiaryId
    );
    const aids = [...this.aids.values()].filter(a => a.beneficiaryId === beneficiaryId);
    const orient = [...this.orientationSessions.values()].filter(
      s => s.beneficiaryId === beneficiaryId
    );
    const daily = [...this.dailyLivingSessions.values()].filter(
      s => s.beneficiaryId === beneficiaryId
    );
    const allSessions = [...orient, ...daily];
    return {
      beneficiaryId,
      totalAssessments: assessments.length,
      visualAids: aids.length,
      orientationSessions: orient.length,
      dailyLivingSessions: daily.length,
      latestAssessment: assessments[assessments.length - 1] || null,
      overallProgress:
        allSessions.length > 0
          ? Math.round(
              allSessions.reduce((s, t) => {
                const perf = t.performance;
                const vals = Object.values(perf).filter(v => typeof v === 'number');
                return s + vals.reduce((a, b) => a + b, 0) / vals.length;
              }, 0) / allSessions.length
            )
          : 0,
      reportDate: new Date(),
    };
  }

  _getRecommendation(data) {
    const reading = data.readingAbility || 0;
    if (reading >= 70) return 'معينات بصرية بسيطة';
    if (reading >= 40) return 'معينات بصرية مكبرة وتدريب';
    return 'تدريب توجيه وتنقل شامل';
  }
}

module.exports = { VisualRehabilitationService };

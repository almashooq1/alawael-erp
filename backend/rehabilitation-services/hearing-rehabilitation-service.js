'use strict';

/**
 * خدمة التأهيل السمعي
 * Hearing Rehabilitation Service
 *
 * تقييم السمع وتوفير المعينات السمعية والتدريب السمعي
 * وبرامج التواصل للمستفيدين من ذوي الإعاقة السمعية
 */

class HearingRehabilitationService {
  constructor() {
    this.assessments = new Map();
    this.hearingAids = new Map();
    this.trainingSessions = new Map();
    this.communicationPlans = new Map();
    this.counter = { assess: 0, aid: 0, train: 0, plan: 0 };
  }

  /** تقييم سمعي شامل */
  async assessHearing(beneficiaryId, data) {
    const id = `HEAR-ASSESS-${++this.counter.assess}`;
    const assessment = {
      id,
      beneficiaryId,
      audiometryResults: {
        rightEar: data.rightEar || { mild: 0, moderate: 0, severe: 0 },
        leftEar: data.leftEar || { mild: 0, moderate: 0, severe: 0 },
        speechRecognition: data.speechRecognition || 0,
      },
      hearingLossType: data.hearingLossType || 'غير محدد',
      severity: data.severity || 'متوسط',
      onsetAge: data.onsetAge || null,
      currentCommunicationMethod: data.communicationMethod || 'شفهي',
      recommendation: this._getRecommendation(data),
      assessedBy: data.audiologistId,
      date: new Date(),
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  /** وصف معين سمعي */
  async prescribeHearingAid(beneficiaryId, data) {
    const id = `HEAR-AID-${++this.counter.aid}`;
    const aid = {
      id,
      beneficiaryId,
      assessmentId: data.assessmentId,
      type: data.type || 'خلف_الأذن',
      brand: data.brand || '',
      model: data.model || '',
      ear: data.ear || 'كلاهما',
      settings: {
        gain: data.gain || 0,
        compression: data.compression || 'تلقائي',
        noiseCancellation: data.noiseCancellation !== false,
        feedbackControl: data.feedbackControl !== false,
      },
      fittingDate: new Date(),
      followUpDate: data.followUpDate || null,
      status: 'مُركّب',
      audiologistId: data.audiologistId,
    };
    this.hearingAids.set(id, aid);
    return aid;
  }

  /** تسجيل جلسة تدريب سمعي */
  async recordSession(beneficiaryId, data) {
    const id = `HEAR-TRAIN-${++this.counter.train}`;
    const session = {
      id,
      beneficiaryId,
      type: data.type || 'تدريب_سمعي',
      focus: data.focus || 'تمييز الأصوات',
      activities: data.activities || [],
      performance: {
        soundDetection: data.soundDetection || 0,
        soundDiscrimination: data.soundDiscrimination || 0,
        speechRecognition: data.speechRecognition || 0,
        comprehension: data.comprehension || 0,
      },
      duration: data.duration || 45,
      notes: data.notes || '',
      therapistId: data.therapistId,
      date: new Date(),
    };
    this.trainingSessions.set(id, session);
    return session;
  }

  /** إنشاء خطة تواصل */
  async createCommunicationPlan(beneficiaryId, data) {
    const id = `HEAR-COMM-${++this.counter.plan}`;
    const plan = {
      id,
      beneficiaryId,
      primaryMethod: data.primaryMethod || 'شفهي',
      secondaryMethods: data.secondaryMethods || [],
      goals: data.goals || [],
      familyTraining: data.familyTraining !== false,
      environmentalModifications: data.environmentalModifications || [],
      technologySupport: data.technologySupport || [],
      createdBy: data.therapistId,
      date: new Date(),
    };
    this.communicationPlans.set(id, plan);
    return plan;
  }

  /** تقرير التأهيل السمعي */
  async getHearingReport(beneficiaryId) {
    const assessments = [...this.assessments.values()].filter(
      a => a.beneficiaryId === beneficiaryId
    );
    const aids = [...this.hearingAids.values()].filter(a => a.beneficiaryId === beneficiaryId);
    const sessions = [...this.trainingSessions.values()].filter(
      s => s.beneficiaryId === beneficiaryId
    );
    const plans = [...this.communicationPlans.values()].filter(
      p => p.beneficiaryId === beneficiaryId
    );
    return {
      beneficiaryId,
      totalAssessments: assessments.length,
      hearingAids: aids.length,
      totalSessions: sessions.length,
      communicationPlans: plans.length,
      latestAssessment: assessments[assessments.length - 1] || null,
      overallProgress:
        sessions.length > 0
          ? Math.round(
              sessions.reduce(
                (s, t) =>
                  s +
                  (t.performance.soundDetection +
                    t.performance.soundDiscrimination +
                    t.performance.speechRecognition +
                    t.performance.comprehension) /
                    4,
                0
              ) / sessions.length
            )
          : 0,
      reportDate: new Date(),
    };
  }

  _getRecommendation(data) {
    const severity = data.severity || '';
    if (severity === 'خفيف') return 'متابعة دورية';
    if (severity === 'متوسط') return 'معين سمعي';
    if (severity === 'شديد') return 'زراعة قوقعة';
    return 'تقييم إضافي';
  }
}

module.exports = { HearingRehabilitationService };

'use strict';

/**
 * خدمة التأهيل الطارئ
 * Emergency Rehabilitation Service
 *
 * استجابة سريعة للحالات الطارئة والإصابات المفاجئة
 * وبروتوكولات التدخل العاجل والتقييم الفوري
 */

class EmergencyRehabService {
  constructor() {
    this.triages = new Map();
    this.emergencySessions = new Map();
    this.protocols = new Map();
    this.referrals = new Map();
    this.counter = { triage: 0, session: 0, protocol: 0, referral: 0 };

    // بروتوكولات افتراضية
    this.defaultProtocols = [
      {
        code: 'FALL',
        nameAr: 'بروتوكول السقوط',
        priority: 'عالي',
        steps: ['تقييم الإصابات', 'فحص عصبي', 'تصوير إشعاعي', 'خطة تأهيل فورية'],
      },
      {
        code: 'SPASM',
        nameAr: 'بروتوكول التشنج الحاد',
        priority: 'عالي',
        steps: ['تقييم مستوى التشنج', 'تدخل دوائي', 'علاج طبيعي عاجل'],
      },
      {
        code: 'PAIN_ACUTE',
        nameAr: 'بروتوكول الألم الحاد',
        priority: 'متوسط',
        steps: ['تقييم شدة الألم', 'تدخل دوائي', 'تقنيات تخفيف الألم'],
      },
      {
        code: 'DEVICE_FAIL',
        nameAr: 'بروتوكول عطل الجهاز المساعد',
        priority: 'عالي',
        steps: ['توفير بديل مؤقت', 'إصلاح عاجل', 'تقييم السلامة'],
      },
      {
        code: 'PSYCH_CRISIS',
        nameAr: 'بروتوكول الأزمة النفسية',
        priority: 'حرج',
        steps: ['تقييم المخاطر', 'تدخل نفسي فوري', 'خطة أمان'],
      },
    ];
  }

  /** فرز طوارئ التأهيل */
  async triageEmergency(beneficiaryId, data) {
    const id = `EMRG-TRIAGE-${++this.counter.triage}`;
    const triage = {
      id,
      beneficiaryId,
      chiefComplaint: data.chiefComplaint || '',
      emergencyType: data.emergencyType || 'غير محدد',
      severity: data.severity || 'متوسط',
      vitalSigns: {
        bloodPressure: data.bloodPressure || null,
        heartRate: data.heartRate || null,
        painLevel: data.painLevel || 0,
        consciousnessLevel: data.consciousnessLevel || 'واعي',
      },
      currentDisability: data.currentDisability || '',
      protocol: this._matchProtocol(data.emergencyType),
      priorityLevel: this._calculatePriority(data),
      actionsTaken: data.actionsTaken || [],
      triageBy: data.triageNurseId,
      date: new Date(),
    };
    this.triages.set(id, triage);
    return triage;
  }

  /** تسجيل جلسة تأهيل طارئة */
  async recordEmergencySession(beneficiaryId, data) {
    const id = `EMRG-SESS-${++this.counter.session}`;
    const session = {
      id,
      beneficiaryId,
      triageId: data.triageId,
      type: data.type || 'تدخل_فوري',
      interventions: data.interventions || [],
      medicationsGiven: data.medicationsGiven || [],
      deviceAdjustments: data.deviceAdjustments || [],
      outcome: {
        painReduction: data.painReduction || 0,
        mobilityRestored: data.mobilityRestored || false,
        stabilized: data.stabilized || false,
        furtherActionNeeded: data.furtherActionNeeded || false,
      },
      duration: data.duration || 30,
      therapistId: data.therapistId,
      date: new Date(),
    };
    this.emergencySessions.set(id, session);
    return session;
  }

  /** جلب البروتوكولات */
  async getProtocols(type) {
    if (type) {
      return this.defaultProtocols.filter(p => p.code === type.toUpperCase());
    }
    return this.defaultProtocols;
  }

  /** إحالة طوارئ */
  async createReferral(beneficiaryId, data) {
    const id = `EMRG-REF-${++this.counter.referral}`;
    const referral = {
      id,
      beneficiaryId,
      triageId: data.triageId,
      referTo: data.referTo || 'طوارئ المستشفى',
      reason: data.reason || '',
      urgency: data.urgency || 'عاجل',
      clinicalSummary: data.clinicalSummary || '',
      accompanyingDocuments: data.documents || [],
      status: 'قيد_الإحالة',
      referredBy: data.referredBy,
      date: new Date(),
    };
    this.referrals.set(id, referral);
    return referral;
  }

  /** تقرير طوارئ التأهيل */
  async getEmergencyReport(beneficiaryId) {
    const triages = [...this.triages.values()].filter(t => t.beneficiaryId === beneficiaryId);
    const sessions = [...this.emergencySessions.values()].filter(
      s => s.beneficiaryId === beneficiaryId
    );
    const referrals = [...this.referrals.values()].filter(r => r.beneficiaryId === beneficiaryId);
    return {
      beneficiaryId,
      totalTriages: triages.length,
      totalEmergencySessions: sessions.length,
      totalReferrals: referrals.length,
      latestTriage: triages[triages.length - 1] || null,
      stabilizedCases: sessions.filter(s => s.outcome.stabilized).length,
      overallProgress:
        sessions.length > 0
          ? Math.round((sessions.filter(s => s.outcome.stabilized).length / sessions.length) * 100)
          : 0,
      reportDate: new Date(),
    };
  }

  _matchProtocol(emergencyType) {
    const type = (emergencyType || '').toUpperCase();
    return this.defaultProtocols.find(p => p.code === type) || null;
  }

  _calculatePriority(data) {
    const pain = data.painLevel || 0;
    const consciousness = data.consciousnessLevel || 'واعي';
    if (consciousness !== 'واعي' || pain >= 9) return 'حرج';
    if (pain >= 7) return 'عالي';
    if (pain >= 4) return 'متوسط';
    return 'منخفض';
  }
}

module.exports = { EmergencyRehabService };

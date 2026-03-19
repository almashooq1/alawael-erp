/**
 * خدمة العلاج السلوكي
 * Behavioral Therapy Service
 * Phase 8 — برامج تعديل السلوك وإدارة السلوكيات التحدية
 */

class BehavioralTherapyService {
  constructor() {
    this.assessments = new Map();
    this.plans = new Map();
    this.sessions = new Map();
    this.incidents = new Map();
    this.rewards = new Map();
  }

  /**
   * تقييم سلوكي شامل — Functional Behavior Assessment (FBA)
   */
  async conductFBA(beneficiaryId, assessmentData) {
    const id = `fba-${Date.now()}`;
    const assessment = {
      id,
      beneficiaryId,
      type: 'functional-behavior-assessment',
      date: new Date().toISOString(),
      referralReason: assessmentData.referralReason || '',
      targetBehaviors: (assessmentData.targetBehaviors || []).map((b, i) => ({
        id: `tb-${id}-${i + 1}`,
        behavior: b.behavior,
        definition: b.definition || '',
        frequency: b.frequency || 'غير محدد',
        intensity: b.intensity || 'متوسطة',
        duration: b.duration || 'غير محدد',
        antecedents: b.antecedents || [],
        consequences: b.consequences || [],
        functionHypothesis: b.functionHypothesis || '',
      })),
      settings: assessmentData.settings || ['المنزل', 'المدرسة', 'المركز'],
      observations: assessmentData.observations || '',
      strengthsAndPreferences: assessmentData.strengths || [],
      communicationLevel: assessmentData.communicationLevel || 'لفظي',
      medicalConsiderations: assessmentData.medicalConsiderations || [],
      recommendations: this._generateFBARec(assessmentData),
      assessor: assessmentData.assessorId || 'system',
      status: 'مكتمل',
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة تدخل سلوكي — Behavior Intervention Plan (BIP)
   */
  async createBIP(beneficiaryId, planData) {
    const id = `bip-${Date.now()}`;
    const plan = {
      id,
      beneficiaryId,
      fbaId: planData.fbaId || null,
      type: 'behavior-intervention-plan',
      createdAt: new Date().toISOString(),
      targetBehaviors: (planData.targetBehaviors || []).map((b, i) => ({
        id: `bip-tb-${id}-${i + 1}`,
        behavior: b.behavior,
        replacementBehavior: b.replacementBehavior || '',
        preventionStrategies: b.preventionStrategies || [],
        teachingStrategies: b.teachingStrategies || [],
        reinforcementSchedule: b.reinforcementSchedule || 'متقطع',
        responseToTarget: b.responseToTarget || '',
        crisisPlan: b.crisisPlan || '',
        baselineRate: b.baselineRate || 0,
        goalRate: b.goalRate || 0,
      })),
      reinforcers: planData.reinforcers || [],
      reinforcementSystem: planData.reinforcementSystem || 'نظام النقاط',
      environmentalModifications: planData.environmentalModifications || [],
      staffTrainingNeeded: planData.staffTrainingNeeded || [],
      dataCollectionMethods: planData.dataCollectionMethods || ['تسجيل تكرار', 'تسجيل فترات'],
      reviewSchedule: planData.reviewSchedule || 'كل أسبوعين',
      teamMembers: planData.teamMembers || [],
      parentInvolvement: planData.parentInvolvement || '',
      status: 'نشطة',
    };
    this.plans.set(id, plan);
    return plan;
  }

  /**
   * تسجيل جلسة علاج سلوكي
   */
  async recordSession(beneficiaryId, sessionData) {
    const id = `bs-${Date.now()}`;
    const session = {
      id,
      beneficiaryId,
      bipId: sessionData.bipId || null,
      date: new Date().toISOString(),
      duration: sessionData.duration || 30,
      setting: sessionData.setting || 'فردي',
      sessionType: sessionData.sessionType || 'تدخل مباشر',
      targetBehaviorData: (sessionData.behaviors || []).map(b => ({
        behaviorId: b.behaviorId,
        occurrences: b.occurrences || 0,
        duration: b.duration || 0,
        intensity: b.intensity || 'متوسطة',
        antecedent: b.antecedent || '',
        consequence: b.consequence || '',
        replacementUsed: b.replacementUsed || false,
      })),
      reinforcersUsed: sessionData.reinforcersUsed || [],
      strategiesApplied: sessionData.strategiesApplied || [],
      compliance: sessionData.compliance || 'جيد',
      mood: sessionData.mood || 'مستقر',
      parentFeedback: sessionData.parentFeedback || '',
      therapistNotes: sessionData.notes || '',
      nextSessionPlan: sessionData.nextSessionPlan || '',
      therapistId: sessionData.therapistId || 'system',
    };
    this.sessions.set(id, session);
    return session;
  }

  /**
   * تسجيل حادثة سلوكية
   */
  async recordIncident(beneficiaryId, incidentData) {
    const id = `bi-${Date.now()}`;
    const incident = {
      id,
      beneficiaryId,
      date: new Date().toISOString(),
      time: incidentData.time || new Date().toLocaleTimeString('ar-SA'),
      location: incidentData.location || '',
      behavior: incidentData.behavior || '',
      antecedent: incidentData.antecedent || '',
      consequence: incidentData.consequence || '',
      intensity: incidentData.intensity || 'متوسطة',
      duration: incidentData.duration || 0,
      witnesses: incidentData.witnesses || [],
      interventionUsed: incidentData.interventionUsed || '',
      outcome: incidentData.outcome || '',
      injuryOccurred: incidentData.injuryOccurred || false,
      injuryDetails: incidentData.injuryDetails || '',
      reportedBy: incidentData.reportedBy || 'system',
      followUpNeeded: incidentData.followUpNeeded || false,
      status: 'مسجّل',
    };
    this.incidents.set(id, incident);
    return incident;
  }

  /**
   * إدارة نظام المكافآت
   */
  async manageRewards(beneficiaryId, rewardData) {
    const id = `rw-${Date.now()}`;
    const existing = [...this.rewards.values()].filter(r => r.beneficiaryId === beneficiaryId);
    const totalPoints = existing.reduce((sum, r) => sum + (r.points || 0), 0);
    const reward = {
      id,
      beneficiaryId,
      action: rewardData.action || 'earn', // earn | redeem
      points: rewardData.action === 'redeem' ? -(rewardData.points || 0) : rewardData.points || 0,
      reason: rewardData.reason || '',
      rewardItem: rewardData.rewardItem || null,
      date: new Date().toISOString(),
      balanceBefore: totalPoints,
      balanceAfter:
        totalPoints +
        (rewardData.action === 'redeem' ? -(rewardData.points || 0) : rewardData.points || 0),
      awardedBy: rewardData.awardedBy || 'system',
    };
    this.rewards.set(id, reward);
    return reward;
  }

  /**
   * تقرير تقدم سلوكي
   */
  async getProgressReport(beneficiaryId) {
    const assessments = [...this.assessments.values()].filter(
      a => a.beneficiaryId === beneficiaryId
    );
    const plans = [...this.plans.values()].filter(p => p.beneficiaryId === beneficiaryId);
    const sessions = [...this.sessions.values()].filter(s => s.beneficiaryId === beneficiaryId);
    const incidents = [...this.incidents.values()].filter(i => i.beneficiaryId === beneficiaryId);
    const rewards = [...this.rewards.values()].filter(r => r.beneficiaryId === beneficiaryId);
    const totalPoints = rewards.reduce((sum, r) => sum + (r.points || 0), 0);

    return {
      beneficiaryId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalAssessments: assessments.length,
        activePlans: plans.filter(p => p.status === 'نشطة').length,
        totalSessions: sessions.length,
        totalIncidents: incidents.length,
        rewardBalance: totalPoints,
        lastSessionDate: sessions.length > 0 ? sessions[sessions.length - 1].date : null,
      },
      recentSessions: sessions.slice(-5),
      recentIncidents: incidents.slice(-5),
      activePlans: plans.filter(p => p.status === 'نشطة'),
    };
  }

  _generateFBARec(data) {
    const recs = ['إعداد خطة تدخل سلوكي (BIP)'];
    if (data.communicationLevel === 'غير لفظي') recs.push('تدريب على التواصل الوظيفي (FCT)');
    if ((data.targetBehaviors || []).length > 2)
      recs.push('التركيز على أولوية السلوكيات الأخطر أولاً');
    if ((data.settings || []).includes('المدرسة')) recs.push('تنسيق مع الفريق المدرسي');
    recs.push('مراجعة دورية للخطة كل أسبوعين');
    return recs;
  }
}

module.exports = { BehavioralTherapyService };

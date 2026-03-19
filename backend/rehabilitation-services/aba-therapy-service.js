/* eslint-disable no-unused-vars */
/**
 * Applied Behavior Analysis (ABA) Therapy Service
 * خدمة تحليل السلوك التطبيقي (ABA) لتأهيل ذوي الإعاقة
 *
 * يشمل تقنيات تعديل السلوك، التعزيز الإيجابي، اكتساب المهارات،
 * والتدخلات السلوكية المبنية على الأدلة العلمية
 */

class ABATherapyService {
  constructor() {
    this.sessions = new Map();
    this.plans = new Map();
    this.assessments = new Map();
    this.behaviorRecords = new Map();
    this.skillPrograms = new Map();
    this.progressReports = new Map();
    this.reinforcers = new Map();
  }

  /**
   * تقييم سلوكي وظيفي شامل (FBA)
   */
  async conductFunctionalAssessment(beneficiaryId, assessmentData = {}) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      assessorId: assessmentData.assessorId || 'system',
      type: 'FBA',

      // السلوكيات المستهدفة
      targetBehaviors: (assessmentData.targetBehaviors || []).map(b => ({
        name: b.name,
        operationalDefinition: b.definition || '',
        frequency: b.frequency || 0,
        duration: b.duration || 0,
        intensity: b.intensity || 'moderate',
        interfereWithLearning: b.interfereWithLearning || false,
      })),

      // تحليل ABC (Antecedent-Behavior-Consequence)
      abcAnalysis: (assessmentData.abcAnalysis || []).map(abc => ({
        antecedent: abc.antecedent || '',
        behavior: abc.behavior || '',
        consequence: abc.consequence || '',
        function: abc.function || 'unknown',
        setting: abc.setting || '',
        time: abc.time || '',
      })),

      // وظائف السلوك المحددة
      behaviorFunctions: {
        attention: assessmentData.attentionSeeking || 0,
        escape: assessmentData.escapeAvoidance || 0,
        tangible: assessmentData.tangibleAccess || 0,
        sensory: assessmentData.sensoryStimulation || 0,
        primaryFunction: assessmentData.primaryFunction || 'undetermined',
      },

      // المهارات الحالية
      currentSkills: {
        communication: assessmentData.communicationSkills || 0,
        socialSkills: assessmentData.socialSkills || 0,
        dailyLiving: assessmentData.dailyLivingSkills || 0,
        academic: assessmentData.academicSkills || 0,
        play: assessmentData.playSkills || 0,
        motor: assessmentData.motorSkills || 0,
      },

      // المعززات المفضلة
      preferredReinforcers: assessmentData.reinforcers || {
        social: [],
        tangible: [],
        activity: [],
        sensory: [],
      },

      // ملخص وتوصيات
      summary: assessmentData.summary || '',
      recommendations: assessmentData.recommendations || [],

      status: 'completed',
    };

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة تدخل سلوكي (BIP)
   */
  async createBehaviorInterventionPlan(beneficiaryId, assessmentData = {}) {
    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',
      type: 'BIP',

      // السلوكيات المستهدفة للتقليل
      behaviorsToReduce: (assessmentData.behaviorsToReduce || []).map(b => ({
        name: b.name,
        definition: b.definition || '',
        baseline: b.baseline || 0,
        target: b.target || 0,
        function: b.function || '',
        replacementBehavior: b.replacementBehavior || '',
        interventionStrategies: b.strategies || [],
      })),

      // المهارات المستهدفة للاكتساب
      skillAcquisitionPrograms: (assessmentData.programs || []).map(p => ({
        skillArea: p.area || '',
        targetSkill: p.skill || '',
        currentLevel: p.currentLevel || 'not_acquired',
        teachingMethod: p.method || 'DTT',
        promptingHierarchy: p.prompting || [
          'physical',
          'model',
          'gestural',
          'verbal',
          'independent',
        ],
        criteria: p.criteria || '80% لمدة 3 جلسات متتالية',
        generalizationPlan: p.generalization || '',
      })),

      // استراتيجيات الوقاية
      preventionStrategies: assessmentData.prevention || [
        'تعديل البيئة لتقليل المحفزات',
        'تقديم خيارات متعددة',
        'استخدام الجدول المرئي',
        'تقديم فترات راحة منتظمة',
      ],

      // نظام التعزيز
      reinforcementSystem: {
        type: assessmentData.reinforcementType || 'token_economy',
        schedule: assessmentData.reinforcementSchedule || 'FR5',
        reinforcers: assessmentData.reinforcers || [],
        backupReinforcer: assessmentData.backupReinforcer || '',
      },

      // إجراءات الأزمات
      crisisProtocol: {
        deEscalationSteps: assessmentData.deEscalation || [
          'إعطاء مساحة شخصية',
          'استخدام لغة هادئة',
          'تقديم نشاط تهدئة مفضل',
          'طلب المساعدة إذا لزم الأمر',
        ],
        emergencyProcedures: assessmentData.emergency || [],
      },

      schedule: {
        frequency: assessmentData.frequency || '5 مرات أسبوعياً',
        duration: assessmentData.sessionDuration || '2-3 ساعات',
        totalWeeks: assessmentData.totalWeeks || 24,
        supervisionSchedule: assessmentData.supervision || 'شهري',
      },

      notes: assessmentData.notes || '',
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * تسجيل جلسة ABA
   */
  async recordSession(beneficiaryId, sessionData = {}) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      therapistId: sessionData.therapistId,
      supervisorId: sessionData.supervisorId || null,
      duration: sessionData.duration || 120,
      sessionType: sessionData.type || 'one_on_one',

      // بيانات السلوك
      behaviorData: (sessionData.behaviorData || []).map(b => ({
        behaviorName: b.name,
        frequency: b.frequency || 0,
        duration: b.duration || 0,
        intensity: b.intensity || 'moderate',
        antecedent: b.antecedent || '',
        consequence: b.consequence || '',
        responses: b.responses || [],
      })),

      // بيانات اكتساب المهارات
      skillTrials: (sessionData.skillTrials || []).map(t => ({
        program: t.program || '',
        skill: t.skill || '',
        trialsTotal: t.total || 0,
        trialsCorrect: t.correct || 0,
        promptLevel: t.promptLevel || 'independent',
        mastered: t.mastered || false,
      })),

      // التعزيزات المستخدمة
      reinforcersUsed: sessionData.reinforcersUsed || [],

      // تقييم الجلسة
      evaluation: {
        behaviorReduction: sessionData.behaviorReduction || 0,
        skillAcquisition: sessionData.skillAcquisition || 0,
        compliance: sessionData.compliance || 0,
        engagement: sessionData.engagement || 0,
        generalization: sessionData.generalization || 0,
        communication: sessionData.communication || 0,
      },

      // ملاحظات
      therapistNotes: sessionData.therapistNotes || '',
      parentFeedback: sessionData.parentFeedback || '',
      nextSessionPlan: sessionData.nextSessionPlan || '',
    };

    this.sessions.set(session.id, session);
    this._updateProgress(beneficiaryId, session);
    return session;
  }

  /**
   * تسجيل سجل سلوكي يومي
   */
  async recordDailyBehavior(beneficiaryId, data = {}) {
    const record = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      recordedBy: data.recordedBy || 'therapist',
      setting: data.setting || 'clinic',

      behaviors: (data.behaviors || []).map(b => ({
        name: b.name,
        occurrences: b.occurrences || 0,
        totalDuration: b.totalDuration || 0,
        antecedents: b.antecedents || [],
        consequences: b.consequences || [],
        function: b.function || 'unknown',
      })),

      replacementBehaviors: (data.replacementBehaviors || []).map(r => ({
        name: r.name,
        occurrences: r.occurrences || 0,
        prompted: r.prompted || false,
        independent: r.independent || false,
      })),

      overallBehaviorRating: data.overallRating || 5,
      environmentalFactors: data.environmentalFactors || [],
      notes: data.notes || '',
    };

    this.behaviorRecords.set(record.id, record);
    return record;
  }

  /**
   * الحصول على تقرير التقدم
   */
  async getProgressReport(beneficiaryId) {
    const sessions = Array.from(this.sessions.values()).filter(
      s => s.beneficiaryId === beneficiaryId
    );
    const behaviorRecords = Array.from(this.behaviorRecords.values()).filter(
      r => r.beneficiaryId === beneficiaryId
    );

    const report = {
      beneficiaryId,
      reportDate: new Date(),
      totalSessions: sessions.length,
      totalBehaviorRecords: behaviorRecords.length,

      // تقدم المهارات
      skillProgress: {
        behaviorReduction: this._calcProgress(sessions, 'behaviorReduction'),
        skillAcquisition: this._calcProgress(sessions, 'skillAcquisition'),
        compliance: this._calcProgress(sessions, 'compliance'),
        engagement: this._calcProgress(sessions, 'engagement'),
        generalization: this._calcProgress(sessions, 'generalization'),
        communication: this._calcProgress(sessions, 'communication'),
      },

      // تحليل السلوك
      behaviorAnalysis: this._analyzeBehaviorTrend(behaviorRecords),

      // بيانات اكتساب المهارات
      skillMastery: this._analyzeSkillMastery(sessions),

      // فعالية التعزيز
      reinforcerEffectiveness: this._analyzeReinforcers(sessions),

      recommendations: this._generateRecommendations(sessions, behaviorRecords),
      overallProgress: 0,
    };

    const scores = Object.values(report.skillProgress).map(s => s.average || 0);
    report.overallProgress =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return report;
  }

  // ==================== أساليب مساعدة ====================

  _avg(values) {
    const valid = values.filter(v => v > 0);
    return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  }

  _calcProgress(sessions, field) {
    const values = sessions.map(s => s.evaluation[field] || 0).filter(v => v > 0);
    return {
      average:
        values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
      trend:
        values.length >= 2
          ? values[values.length - 1] > values[0]
            ? 'improving'
            : 'stable'
          : 'insufficient_data',
      dataPoints: values.length,
    };
  }

  _analyzeBehaviorTrend(records) {
    if (records.length === 0) return { trend: 'no_data', behaviors: [] };
    const behaviorMap = {};
    records.forEach(r => {
      r.behaviors.forEach(b => {
        if (!behaviorMap[b.name]) behaviorMap[b.name] = [];
        behaviorMap[b.name].push(b.occurrences);
      });
    });
    return {
      trend: 'analyzed',
      behaviors: Object.entries(behaviorMap).map(([name, values]) => ({
        name,
        averageOccurrences: +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
        trend:
          values.length >= 2
            ? values[values.length - 1] < values[0]
              ? 'decreasing'
              : 'stable'
            : 'insufficient_data',
        dataPoints: values.length,
      })),
    };
  }

  _analyzeSkillMastery(sessions) {
    const skillMap = {};
    sessions.forEach(s => {
      (s.skillTrials || []).forEach(t => {
        if (!skillMap[t.program]) skillMap[t.program] = [];
        skillMap[t.program].push({
          accuracy: t.trialsTotal > 0 ? Math.round((t.trialsCorrect / t.trialsTotal) * 100) : 0,
          mastered: t.mastered,
        });
      });
    });
    return Object.entries(skillMap).map(([program, trials]) => ({
      program,
      averageAccuracy:
        trials.length > 0
          ? Math.round(trials.reduce((a, t) => a + t.accuracy, 0) / trials.length)
          : 0,
      mastered: trials.some(t => t.mastered),
      totalTrials: trials.length,
    }));
  }

  _analyzeReinforcers(sessions) {
    const reinforcerCount = {};
    sessions.forEach(s => {
      (s.reinforcersUsed || []).forEach(r => {
        reinforcerCount[r] = (reinforcerCount[r] || 0) + 1;
      });
    });
    return Object.entries(reinforcerCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, usageCount: count }));
  }

  _generateRecommendations(sessions, records) {
    if (sessions.length === 0) return ['إجراء تقييم سلوكي وظيفي شامل أولاً'];
    const recommendations = [];
    const avgCompliance = this._calcProgress(sessions, 'compliance').average;
    if (avgCompliance < 50) recommendations.push('مراجعة نظام التعزيز وتكثيف التعزيز الإيجابي');
    const avgSkill = this._calcProgress(sessions, 'skillAcquisition').average;
    if (avgSkill >= 70) recommendations.push('البدء في برامج تعميم المهارات المكتسبة');
    const avgGeneralization = this._calcProgress(sessions, 'generalization').average;
    if (avgGeneralization < 40)
      recommendations.push('تدريب الأسرة على تطبيق الاستراتيجيات في المنزل');
    if (records.length > 0) {
      const analysis = this._analyzeBehaviorTrend(records);
      const increasing = analysis.behaviors.filter(b => b.trend !== 'decreasing');
      if (increasing.length > 0)
        recommendations.push('مراجعة خطة التدخل السلوكي للسلوكيات التي لم تنخفض');
    }
    return recommendations.length > 0
      ? recommendations
      : ['الاستمرار في البرنامج الحالي مع مراقبة التقدم'];
  }

  _updateProgress(beneficiaryId, session) {
    const current = this.progressReports.get(beneficiaryId) || { sessions: [], lastUpdated: null };
    current.sessions.push(session.id);
    current.lastUpdated = new Date();
    this.progressReports.set(beneficiaryId, current);
  }
}

module.exports = { ABATherapyService };

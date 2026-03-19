/* eslint-disable no-unused-vars */
/**
 * Early Intervention Service for Disability Rehabilitation
 * خدمة التدخل المبكر لتأهيل ذوي الإعاقة
 */

class EarlyInterventionService {
  constructor() {
    this.cases = new Map();
    this.screenings = new Map();
    this.plans = new Map();
    this.sessions = new Map();
  }

  /**
   * تسجيل حالة للتدخل المبكر
   */
  async registerCase(caseData) {
    const case_ = {
      id: Date.now().toString(),
      childName: caseData.childName,
      childId: caseData.childId,
      dateOfBirth: caseData.dateOfBirth,
      gender: caseData.gender,
      registrationDate: new Date(),
      referralSource: caseData.referralSource, // hospital, family, nursery, screening
      referralReason: caseData.referralReason,
      riskFactors: caseData.riskFactors || [],
      parentInfo: {
        fatherName: caseData.fatherName,
        motherName: caseData.motherName,
        phone: caseData.phone,
        email: caseData.email,
        address: caseData.address,
      },
      prenatalHistory: caseData.prenatalHistory || {},
      birthHistory: caseData.birthHistory || {},
      developmentalHistory: caseData.developmentalHistory || {},
      medicalHistory: caseData.medicalHistory || [],
      status: 'registered',
      priority: 'normal',
      assignedTeam: [],
      screenings: [],
      interventionPlan: null,
      createdAt: new Date(),
    };

    // تقييم الأولوية بناءً على عوامل الخطر
    case_.priority = this._assessPriority(case_.riskFactors);

    this.cases.set(case_.id, case_);
    return case_;
  }

  /**
   * تقييم الأولوية
   */
  _assessPriority(riskFactors) {
    const highRiskFactors = [
      'premature_birth',
      'low_birth_weight',
      'birth_asphyxia',
      'genetic_disorder',
      'severe_infection',
    ];

    const hasHighRisk = riskFactors.some(r => highRiskFactors.includes(r.type));
    if (hasHighRisk) return 'urgent';
    if (riskFactors.length >= 3) return 'high';
    if (riskFactors.length >= 1) return 'moderate';
    return 'normal';
  }

  /**
   * فحص مسحي للنمو
   */
  async conductScreening(caseId, screeningData) {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('الحالة غير موجودة');

    const screening = {
      id: Date.now().toString(),
      caseId,
      screeningDate: new Date(),
      screener: screeningData.screener,
      type: screeningData.type, // developmental, behavioral, sensory, motor
      tool: screeningData.tool, // denver, ages_stages, etc.
      domains: {
        grossMotor: {
          score: screeningData.grossMotorScore || 0,
          status: this._getDomainStatus(screeningData.grossMotorScore),
          observations: screeningData.grossMotorObs || [],
        },
        fineMotor: {
          score: screeningData.fineMotorScore || 0,
          status: this._getDomainStatus(screeningData.fineMotorScore),
          observations: screeningData.fineMotorObs || [],
        },
        language: {
          score: screeningData.languageScore || 0,
          status: this._getDomainStatus(screeningData.languageScore),
          observations: screeningData.languageObs || [],
        },
        cognitive: {
          score: screeningData.cognitiveScore || 0,
          status: this._getDomainStatus(screeningData.cognitiveScore),
          observations: screeningData.cognitiveObs || [],
        },
        socialEmotional: {
          score: screeningData.socialEmotionalScore || 0,
          status: this._getDomainStatus(screeningData.socialEmotionalScore),
          observations: screeningData.socialEmotionalObs || [],
        },
        selfCare: {
          score: screeningData.selfCareScore || 0,
          status: this._getDomainStatus(screeningData.selfCareScore),
          observations: screeningData.selfCareObs || [],
        },
      },
      overallStatus: 'on_track',
      concerns: [],
      recommendations: [],
      referralNeeded: false,
    };

    // تحديد الحالة العامة
    const domains = Object.values(screening.domains);
    const concerningDomains = domains.filter(d => d.status === 'concern' || d.status === 'delay');

    if (concerningDomains.length > 0) {
      screening.overallStatus = concerningDomains.length > 2 ? 'significant_concern' : 'monitoring';
      screening.referralNeeded = concerningDomains.length > 1;

      // إضافة التوصيات
      concerningDomains.forEach(domain => {
        screening.recommendations.push({
          domain: domain,
          action: 'تقييم متخصص مطلوب',
          urgency: domain.status === 'delay' ? 'عاجل' : 'عادي',
        });
      });
    }

    case_.screenings.push(screening.id);
    this.screenings.set(screening.id, screening);
    return screening;
  }

  /**
   * تحديد حالة المجال
   */
  _getDomainStatus(score) {
    if (score >= 80) return 'on_track';
    if (score >= 60) return 'monitoring';
    if (score >= 40) return 'concern';
    return 'delay';
  }

  /**
   * إنشاء خطة التدخل المبكر
   */
  async createInterventionPlan(caseId, planData) {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('الحالة غير موجودة');

    const plan = {
      id: Date.now().toString(),
      caseId,
      childId: case_.childId,
      createdAt: new Date(),
      team: {
        coordinator: planData.coordinator,
        specialEducator: planData.specialEducator,
        speechTherapist: planData.speechTherapist,
        occupationalTherapist: planData.occupationalTherapist,
        physicalTherapist: planData.physicalTherapist,
        psychologist: planData.psychologist,
        socialWorker: planData.socialWorker,
      },
      goals: [],
      outcomes: [],
      services: [],
      schedule: {
        frequency: planData.frequency || 'weekly',
        duration: planData.duration || 60,
        location: planData.location || 'center',
      },
      familyInvolvement: {
        level: 'moderate',
        activities: [],
        training: [],
      },
      reviewDates: [],
      status: 'active',
      progress: 0,
    };

    case_.interventionPlan = plan.id;
    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * إضافة هدف للخطة
   */
  async addGoal(planId, goalData) {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error('الخطة غير موجودة');

    const goal = {
      id: Date.now().toString(),
      domain: goalData.domain, // motor, communication, cognitive, social, selfCare
      area: goalData.area,
      description: goalData.description,
      measurable: goalData.measurable,
      baseline: goalData.baseline,
      target: goalData.target,
      timeframe: goalData.timeframe,
      strategies: goalData.strategies || [],
      activities: goalData.activities || [],
      materials: goalData.materials || [],
      responsible: goalData.responsible,
      progressRecords: [],
      status: 'active',
    };

    plan.goals.push(goal);
    return goal;
  }

  /**
   * تسجيل جلسة تدخل
   */
  async recordSession(planId, sessionData) {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error('الخطة غير موجودة');

    const session = {
      id: Date.now().toString(),
      planId,
      date: sessionData.date || new Date(),
      type: sessionData.type, // individual, group, family
      therapist: sessionData.therapist,
      duration: sessionData.duration,
      goalsAddressed: sessionData.goalsAddressed || [],
      activities: sessionData.activities || [],
      childResponse: sessionData.childResponse,
      progressNotes: sessionData.progressNotes,
      challenges: sessionData.challenges || [],
      recommendations: sessionData.recommendations || [],
      parentInvolvement: sessionData.parentInvolvement || 'present',
      homework: sessionData.homework || [],
      nextSessionPlan: sessionData.nextSessionPlan,
      status: 'completed',
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * تتبع تقدم الهدف
   */
  async recordGoalProgress(goalId, progressData) {
    const record = {
      date: new Date(),
      measurement: progressData.measurement,
      value: progressData.value,
      method: progressData.method,
      notes: progressData.notes,
      recordedBy: progressData.recordedBy,
    };

    return record;
  }

  /**
   * تقييم العائلة
   */
  async assessFamilyNeeds(caseId, assessmentData) {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('الحالة غير موجودة');

    const assessment = {
      id: Date.now().toString(),
      caseId,
      date: new Date(),
      assessor: assessmentData.assessor,
      familyStrengths: assessmentData.strengths || [],
      familyNeeds: {
        information: assessmentData.informationNeeds || [],
        emotional: assessmentData.emotionalNeeds || [],
        practical: assessmentData.practicalNeeds || [],
        social: assessmentData.socialNeeds || [],
      },
      resources: {
        available: assessmentData.availableResources || [],
        needed: assessmentData.neededResources || [],
      },
      supportNetwork: assessmentData.supportNetwork || {},
      recommendations: [],
      actionPlan: [],
    };

    // توليد التوصيات
    if (assessment.familyNeeds.information.length > 0) {
      assessment.recommendations.push({
        type: 'education',
        description: 'توفير معلومات حول إعاقة الطفل وحقوقه',
      });
    }

    if (assessment.familyNeeds.emotional.length > 0) {
      assessment.recommendations.push({
        type: 'counseling',
        description: 'توفير دعم نفسي للأسرة',
      });
    }

    return assessment;
  }

  /**
   * تقرير التدخل المبكر
   */
  async generateProgressReport(caseId) {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('الحالة غير موجودة');

    const plan = this.plans.get(case_.interventionPlan);
    const caseScreenings = case_.screenings.map(sId => this.screenings.get(sId)).filter(Boolean);

    const report = {
      caseId,
      childInfo: {
        name: case_.childName,
        dateOfBirth: case_.dateOfBirth,
        age: this._calculateAge(case_.dateOfBirth),
      },
      reportDate: new Date(),
      enrollmentDate: case_.registrationDate,
      reportPeriod: {
        start: case_.registrationDate,
        end: new Date(),
      },
      screeningResults: caseScreenings.map(s => ({
        date: s.screeningDate,
        type: s.type,
        overallStatus: s.overallStatus,
      })),
      interventionSummary: plan
        ? {
            goalsCount: plan.goals.length,
            goalsAchieved: plan.goals.filter(g => g.status === 'achieved').length,
            goalsInProgress: plan.goals.filter(g => g.status === 'active').length,
            overallProgress: plan.progress,
          }
        : null,
      goalsProgress: plan
        ? plan.goals.map(g => ({
            domain: g.domain,
            description: g.description,
            baseline: g.baseline,
            target: g.target,
            currentProgress:
              g.progressRecords.length > 0
                ? g.progressRecords[g.progressRecords.length - 1].value
                : g.baseline,
            status: g.status,
          }))
        : [],
      recommendations: [],
      nextSteps: [],
    };

    return report;
  }

  /**
   * حساب العمر
   */
  _calculateAge(dateOfBirth) {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    const months =
      (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    return {
      years: Math.floor(months / 12),
      months: months % 12,
      totalMonths: months,
    };
  }

  /**
   * انتقال للخدمات المدرسية
   */
  async planTransition(caseId, transitionData) {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('الحالة غير موجودة');

    const plan = {
      id: Date.now().toString(),
      caseId,
      transitionDate: transitionData.targetDate,
      createdAt: new Date(),
      currentServices: transitionData.currentServices || [],
      recommendedSchoolServices: transitionData.schoolServices || [],
      preparationActivities: [
        {
          activity: 'زيارة المدرسة',
          timeline: 'قبل 3 أشهر',
          completed: false,
        },
        {
          activity: 'اجتماع مع فريق المدرسة',
          timeline: 'قبل شهرين',
          completed: false,
        },
        {
          activity: 'تدريب الطفل على روتين المدرسة',
          timeline: 'قبل شهر',
          completed: false,
        },
      ],
      documents: [],
      meetings: [],
      status: 'planning',
    };

    return plan;
  }
}

module.exports = { EarlyInterventionService };

/**
 * خدمة التخطيط الانتقالي
 * Transition Planning Service
 * Phase 8 — التخطيط للانتقال بين المراحل الحياتية
 * (من التدخل المبكر → المدرسة → التأهيل المهني → الحياة المستقلة)
 */

class TransitionPlanningService {
  constructor() {
    this.plans = new Map();
    this.assessments = new Map();
    this.milestones = new Map();
    this.reviews = new Map();
  }

  /**
   * تقييم الجاهزية الانتقالية
   */
  async assessReadiness(beneficiaryId, data) {
    const id = `tp-a-${Date.now()}`;
    const assessment = {
      id,
      beneficiaryId,
      date: new Date().toISOString(),
      transitionType: data.transitionType || 'school-to-work',
      // أنواع الانتقال:
      // early-to-school: من التدخل المبكر إلى المدرسة
      // school-to-secondary: من المدرسة الابتدائية إلى الثانوية
      // school-to-work: من المدرسة إلى العمل
      // rehab-to-community: من التأهيل إلى المجتمع
      // dependent-to-independent: من الإعاشة إلى الحياة المستقلة
      currentAge: data.age || null,
      currentPlacement: data.currentPlacement || '',
      targetPlacement: data.targetPlacement || '',
      targetDate: data.targetDate || null,
      domains: {
        selfCare: {
          personalHygiene: data.hygiene ?? 3,
          dressing: data.dressing ?? 3,
          feeding: data.feeding ?? 3,
          healthManagement: data.healthMgmt ?? 3,
          score: 0,
        },
        communication: {
          expressiveLanguage: data.expressiveLang ?? 3,
          receptiveLanguage: data.receptiveLang ?? 3,
          socialCommunication: data.socialComm ?? 3,
          technologyUse: data.techUse ?? 3,
          score: 0,
        },
        dailyLiving: {
          homeManagement: data.homeMgmt ?? 3,
          mealPreparation: data.mealPrep ?? 3,
          moneyManagement: data.moneyMgmt ?? 3,
          timeManagement: data.timeMgmt ?? 3,
          transportation: data.transportation ?? 3,
          score: 0,
        },
        socialAndLeisure: {
          friendships: data.friendships ?? 3,
          communityParticipation: data.communityPart ?? 3,
          leisureActivities: data.leisure ?? 3,
          selfAdvocacy: data.selfAdvocacy ?? 3,
          score: 0,
        },
        vocational: {
          workReadiness: data.workReadiness ?? 3,
          jobSkills: data.jobSkills ?? 3,
          workBehavior: data.workBehavior ?? 3,
          interviewSkills: data.interviewSkills ?? 3,
          score: 0,
        },
        academic: {
          reading: data.reading ?? 3,
          writing: data.writing ?? 3,
          math: data.math ?? 3,
          computerSkills: data.computerSkills ?? 3,
          score: 0,
        },
      },
      overallReadiness: 0,
      readinessLevel: '',
      barriers: data.barriers || [],
      supports: data.supports || [],
      recommendations: [],
      assessor: data.assessorId || 'system',
    };

    // حساب الدرجات
    for (const [key, domain] of Object.entries(assessment.domains)) {
      const vals = Object.entries(domain)
        .filter(([k]) => k !== 'score')
        .map(([, v]) => v);
      assessment.domains[key].score = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    }
    const domainScores = Object.values(assessment.domains).map(d => Number(d.score));
    assessment.overallReadiness = (
      domainScores.reduce((a, b) => a + b, 0) / domainScores.length
    ).toFixed(1);
    assessment.readinessLevel =
      assessment.overallReadiness >= 4
        ? 'جاهز'
        : assessment.overallReadiness >= 3
          ? 'جاهز جزئياً'
          : 'غير جاهز بعد';
    assessment.recommendations = this._generateTransitionRec(assessment);

    this.assessments.set(id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة انتقالية
   */
  async createTransitionPlan(beneficiaryId, planData) {
    const id = `tp-p-${Date.now()}`;
    const plan = {
      id,
      beneficiaryId,
      assessmentId: planData.assessmentId || null,
      createdAt: new Date().toISOString(),
      transitionType: planData.transitionType || 'school-to-work',
      currentPlacement: planData.currentPlacement || '',
      targetPlacement: planData.targetPlacement || '',
      startDate: planData.startDate || new Date().toISOString(),
      targetDate: planData.targetDate || null,
      vision: planData.vision || '', // رؤية المستفيد لمستقبله
      goals: (planData.goals || []).map((g, i) => ({
        id: `tp-g-${id}-${i + 1}`,
        domain: g.domain || '',
        goal: g.goal || '',
        strategies: g.strategies || [],
        responsibleParty: g.responsibleParty || '',
        timeline: g.timeline || '',
        measureOfSuccess: g.measureOfSuccess || '',
        status: 'قيد التنفيذ',
        progress: 0,
      })),
      supportServices: planData.supportServices || [],
      accommodations: planData.accommodations || [],
      familyRole: planData.familyRole || '',
      communityResources: planData.communityResources || [],
      agencyInvolvement: planData.agencies || [],
      riskFactors: planData.riskFactors || [],
      contingencyPlan: planData.contingencyPlan || '',
      reviewSchedule: planData.reviewSchedule || 'كل شهر',
      teamMembers: planData.teamMembers || [],
      status: 'نشطة',
    };
    this.plans.set(id, plan);
    return plan;
  }

  /**
   * تسجيل إنجاز مرحلة
   */
  async recordMilestone(planId, milestoneData) {
    const id = `tp-m-${Date.now()}`;
    const plan = this.plans.get(planId);
    const milestone = {
      id,
      planId,
      beneficiaryId: plan ? plan.beneficiaryId : milestoneData.beneficiaryId,
      date: new Date().toISOString(),
      title: milestoneData.title || '',
      description: milestoneData.description || '',
      domain: milestoneData.domain || '',
      goalId: milestoneData.goalId || null,
      evidence: milestoneData.evidence || '',
      achievementLevel: milestoneData.level || 'مكتمل', // مكتمل | جزئي | متفوق
      celebratedWith: milestoneData.celebratedWith || [],
      nextStep: milestoneData.nextStep || '',
      recordedBy: milestoneData.recordedBy || 'system',
    };
    this.milestones.set(id, milestone);

    // تحديث تقدم الهدف في الخطة
    if (plan && milestoneData.goalId) {
      const goal = plan.goals.find(g => g.id === milestoneData.goalId);
      if (goal) {
        goal.progress = Math.min(
          (goal.progress || 0) + (milestoneData.progressIncrement || 20),
          100
        );
        if (goal.progress >= 100) goal.status = 'مكتمل';
      }
    }

    return milestone;
  }

  /**
   * مراجعة الخطة الانتقالية
   */
  async reviewPlan(planId, reviewData) {
    const id = `tp-r-${Date.now()}`;
    const plan = this.plans.get(planId);
    const review = {
      id,
      planId,
      beneficiaryId: plan ? plan.beneficiaryId : reviewData.beneficiaryId,
      date: new Date().toISOString(),
      reviewType: reviewData.reviewType || 'دوري', // دوري | طارئ | نهائي
      attendees: reviewData.attendees || [],
      overallProgress: reviewData.progress || 'على المسار',
      goalUpdates: reviewData.goalUpdates || [],
      barriers: reviewData.barriers || [],
      adjustments: reviewData.adjustments || [],
      nextReviewDate: reviewData.nextReviewDate || null,
      recommendations: reviewData.recommendations || [],
      parentFeedback: reviewData.parentFeedback || '',
      beneficiaryFeedback: reviewData.beneficiaryFeedback || '',
      notes: reviewData.notes || '',
      reviewer: reviewData.reviewerId || 'system',
    };
    this.reviews.set(id, review);
    return review;
  }

  /**
   * تقرير الانتقال
   */
  async getTransitionReport(beneficiaryId) {
    const assessments = [...this.assessments.values()].filter(
      a => a.beneficiaryId === beneficiaryId
    );
    const plans = [...this.plans.values()].filter(p => p.beneficiaryId === beneficiaryId);
    const milestones = [...this.milestones.values()].filter(m => m.beneficiaryId === beneficiaryId);
    const reviews = [...this.reviews.values()].filter(r => r.beneficiaryId === beneficiaryId);

    const activePlan = plans.find(p => p.status === 'نشطة');
    const goalProgress = activePlan
      ? activePlan.goals.map(g => ({
          goal: g.goal,
          domain: g.domain,
          progress: g.progress,
          status: g.status,
        }))
      : [];

    return {
      beneficiaryId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalAssessments: assessments.length,
        activePlans: plans.filter(p => p.status === 'نشطة').length,
        totalMilestones: milestones.length,
        totalReviews: reviews.length,
        currentReadiness:
          assessments.length > 0 ? assessments[assessments.length - 1].readinessLevel : null,
        overallGoalProgress:
          goalProgress.length > 0
            ? (goalProgress.reduce((s, g) => s + g.progress, 0) / goalProgress.length).toFixed(1)
            : null,
      },
      activePlan: activePlan || null,
      goalProgress,
      recentMilestones: milestones.slice(-5),
      recentReviews: reviews.slice(-3),
    };
  }

  _generateTransitionRec(assessment) {
    const recs = [];
    const domains = assessment.domains;
    if (Number(domains.selfCare.score) < 3) recs.push('تدريب مكثف على مهارات الرعاية الذاتية');
    if (Number(domains.communication.score) < 3) recs.push('تعزيز مهارات التواصل قبل الانتقال');
    if (Number(domains.dailyLiving.score) < 3) recs.push('برنامج مهارات حياتية يومية');
    if (Number(domains.vocational.score) < 3 && assessment.transitionType.includes('work'))
      recs.push('تدريب تأهيلي مهني مكثف');
    if (Number(domains.socialAndLeisure.score) < 3) recs.push('تدريب مهارات اجتماعية');
    if (assessment.barriers.length > 0) recs.push('معالجة العوائق المحددة قبل الانتقال');
    recs.push('مراجعة دورية شهرية لخطة الانتقال');
    return recs;
  }
}

module.exports = { TransitionPlanningService };

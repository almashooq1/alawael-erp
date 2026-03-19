/**
 * خدمة تدريب الوالدين
 * Parental Training Service
 * Phase 8 — برامج تدريب وتأهيل الوالدين ومقدمي الرعاية
 */

class ParentalTrainingService {
  constructor() {
    this.enrollments = new Map();
    this.modules = new Map();
    this.sessions = new Map();
    this.assessments = new Map();
    this.certificates = new Map();
    this._initModules();
  }

  _initModules() {
    const defaultModules = [
      { id: 'mod-1', title: 'فهم الإعاقة وأنواعها', category: 'تأسيسي', duration: 120, order: 1 },
      { id: 'mod-2', title: 'حقوق الطفل ذي الإعاقة', category: 'تأسيسي', duration: 90, order: 2 },
      {
        id: 'mod-3',
        title: 'التواصل الفعّال مع الطفل',
        category: 'مهارات التواصل',
        duration: 120,
        order: 3,
      },
      {
        id: 'mod-4',
        title: 'إدارة السلوكيات التحدية',
        category: 'إدارة سلوك',
        duration: 150,
        order: 4,
      },
      {
        id: 'mod-5',
        title: 'التحفيز والتعزيز الإيجابي',
        category: 'إدارة سلوك',
        duration: 90,
        order: 5,
      },
      {
        id: 'mod-6',
        title: 'أنشطة اللعب العلاجي في المنزل',
        category: 'تطبيقي',
        duration: 120,
        order: 6,
      },
      {
        id: 'mod-7',
        title: 'تمارين العلاج الطبيعي المنزلية',
        category: 'تطبيقي',
        duration: 120,
        order: 7,
      },
      {
        id: 'mod-8',
        title: 'تدريب المهارات الحياتية',
        category: 'تطبيقي',
        duration: 120,
        order: 8,
      },
      {
        id: 'mod-9',
        title: 'الرعاية الذاتية لمقدم الرعاية',
        category: 'دعم نفسي',
        duration: 90,
        order: 9,
      },
      {
        id: 'mod-10',
        title: 'بناء شبكة الدعم المجتمعي',
        category: 'مجتمعي',
        duration: 90,
        order: 10,
      },
      {
        id: 'mod-11',
        title: 'التخطيط للمستقبل والانتقال',
        category: 'تخطيط',
        duration: 120,
        order: 11,
      },
      {
        id: 'mod-12',
        title: 'استخدام التكنولوجيا المساعدة',
        category: 'تقنية',
        duration: 90,
        order: 12,
      },
    ];
    defaultModules.forEach(m => this.modules.set(m.id, m));
  }

  /**
   * تسجيل ولي الأمر في برنامج التدريب
   */
  async enrollParent(beneficiaryId, enrollData) {
    const id = `pt-e-${Date.now()}`;
    const enrollment = {
      id,
      beneficiaryId,
      parentName: enrollData.parentName || '',
      parentRelation: enrollData.relation || 'ولي أمر', // أب | أم | جد | جدة | أخ | أخت | ولي أمر
      parentPhone: enrollData.phone || '',
      parentEmail: enrollData.email || '',
      childAge: enrollData.childAge || null,
      childDisabilityType: enrollData.disabilityType || '',
      enrollmentDate: new Date().toISOString(),
      programType: enrollData.programType || 'شامل', // شامل | مخصص | مكثف
      deliveryMode: enrollData.deliveryMode || 'حضوري', // حضوري | عن بُعد | مختلط
      assignedModules: enrollData.modules || [...this.modules.keys()],
      completedModules: [],
      preAssessmentScore: null,
      postAssessmentScore: null,
      certificateIssued: false,
      status: 'نشط',
    };
    this.enrollments.set(id, enrollment);
    return enrollment;
  }

  /**
   * تسجيل جلسة تدريب
   */
  async recordSession(enrollmentId, sessionData) {
    const id = `pt-s-${Date.now()}`;
    const enrollment = this.enrollments.get(enrollmentId);
    const session = {
      id,
      enrollmentId,
      beneficiaryId: enrollment ? enrollment.beneficiaryId : sessionData.beneficiaryId,
      moduleId: sessionData.moduleId || null,
      date: new Date().toISOString(),
      duration: sessionData.duration || 90,
      format: sessionData.format || 'حضوري', // حضوري | عن بُعد | ورشة عمل
      topicsCovered: sessionData.topics || [],
      practicalExercises: sessionData.exercises || [],
      parentEngagement: sessionData.engagement || 'جيد', // ممتاز | جيد | متوسط | ضعيف
      questionsAsked: sessionData.questions || [],
      homeworkAssigned: sessionData.homework || [],
      previousHomeworkReview: sessionData.homeworkReview || '',
      parentFeedback: sessionData.feedback || '',
      trainerNotes: sessionData.notes || '',
      attendanceStatus: sessionData.attendance || 'حاضر',
      trainerId: sessionData.trainerId || 'system',
    };
    this.sessions.set(id, session);

    // تحديث الوحدات المكتملة
    if (enrollment && sessionData.moduleId && sessionData.completed) {
      if (!enrollment.completedModules.includes(sessionData.moduleId)) {
        enrollment.completedModules.push(sessionData.moduleId);
      }
    }

    return session;
  }

  /**
   * تقييم معرفة ولي الأمر (قبل/بعد)
   */
  async assessParent(enrollmentId, assessmentData) {
    const id = `pt-a-${Date.now()}`;
    const enrollment = this.enrollments.get(enrollmentId);
    const assessment = {
      id,
      enrollmentId,
      beneficiaryId: enrollment ? enrollment.beneficiaryId : assessmentData.beneficiaryId,
      type: assessmentData.type || 'pre', // pre | post | follow-up
      date: new Date().toISOString(),
      domains: {
        disabilityKnowledge: assessmentData.knowledge ?? 0,
        behaviorManagement: assessmentData.behaviorMgmt ?? 0,
        communicationSkills: assessmentData.communication ?? 0,
        therapeuticActivities: assessmentData.activities ?? 0,
        selfCare: assessmentData.selfCare ?? 0,
        communityResources: assessmentData.resources ?? 0,
        futurePhanning: assessmentData.planning ?? 0,
      },
      totalScore: 0, // سيُحسب
      maxScore: 70,
      percentage: 0,
      confidenceLevel: assessmentData.confidenceLevel ?? 0, // 1-10
      stressLevel: assessmentData.stressLevel ?? 0, // 1-10
      satisfactionWithTraining: assessmentData.satisfaction ?? 0, // 1-10
      openFeedback: assessmentData.feedback || '',
      assessor: assessmentData.assessorId || 'system',
    };

    const scores = Object.values(assessment.domains);
    assessment.totalScore = scores.reduce((a, b) => a + b, 0);
    assessment.percentage = ((assessment.totalScore / assessment.maxScore) * 100).toFixed(1);

    this.assessments.set(id, assessment);

    // تحديث التسجيل
    if (enrollment) {
      if (assessmentData.type === 'pre') enrollment.preAssessmentScore = assessment.percentage;
      if (assessmentData.type === 'post') enrollment.postAssessmentScore = assessment.percentage;
    }

    return assessment;
  }

  /**
   * إصدار شهادة إتمام
   */
  async issueCertificate(enrollmentId) {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) throw new Error('التسجيل غير موجود');

    const totalModules = enrollment.assignedModules.length;
    const completedModules = enrollment.completedModules.length;
    const completionRate = ((completedModules / totalModules) * 100).toFixed(1);

    if (completionRate < 80) {
      return {
        issued: false,
        message: `نسبة الإنجاز ${completionRate}% - يجب إكمال 80% على الأقل`,
        completedModules,
        totalModules,
      };
    }

    const id = `pt-c-${Date.now()}`;
    const cert = {
      id,
      enrollmentId,
      beneficiaryId: enrollment.beneficiaryId,
      parentName: enrollment.parentName,
      issueDate: new Date().toISOString(),
      programType: enrollment.programType,
      completedModules,
      totalModules,
      completionRate,
      preScore: enrollment.preAssessmentScore,
      postScore: enrollment.postAssessmentScore,
      improvement:
        enrollment.preAssessmentScore && enrollment.postAssessmentScore
          ? (enrollment.postAssessmentScore - enrollment.preAssessmentScore).toFixed(1)
          : null,
      certificateNumber: `PTC-${Date.now().toString(36).toUpperCase()}`,
      status: 'صادرة',
    };
    this.certificates.set(id, cert);
    enrollment.certificateIssued = true;
    return cert;
  }

  /**
   * الحصول على الوحدات التدريبية المتاحة
   */
  async getModules(category) {
    let modules = [...this.modules.values()];
    if (category) modules = modules.filter(m => m.category === category);
    return {
      total: modules.length,
      categories: [...new Set(modules.map(m => m.category))],
      modules: modules.sort((a, b) => a.order - b.order),
    };
  }

  /**
   * تقرير تقدم ولي الأمر
   */
  async getProgressReport(enrollmentId) {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) throw new Error('التسجيل غير موجود');

    const sessions = [...this.sessions.values()].filter(s => s.enrollmentId === enrollmentId);
    const assessments = [...this.assessments.values()].filter(a => a.enrollmentId === enrollmentId);
    const totalModules = enrollment.assignedModules.length;
    const completedModules = enrollment.completedModules.length;

    return {
      enrollmentId,
      beneficiaryId: enrollment.beneficiaryId,
      generatedAt: new Date().toISOString(),
      parentName: enrollment.parentName,
      programType: enrollment.programType,
      summary: {
        completedModules,
        totalModules,
        completionRate: ((completedModules / totalModules) * 100).toFixed(1),
        totalSessions: sessions.length,
        totalAssessments: assessments.length,
        preScore: enrollment.preAssessmentScore,
        postScore: enrollment.postAssessmentScore,
        certificateIssued: enrollment.certificateIssued,
      },
      recentSessions: sessions.slice(-5),
      assessments,
      remainingModules: enrollment.assignedModules.filter(
        m => !enrollment.completedModules.includes(m)
      ),
    };
  }
}

module.exports = { ParentalTrainingService };

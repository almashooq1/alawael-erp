/* eslint-disable no-unused-vars */
/**
 * Vocational Rehabilitation Service for Disability Rehabilitation
 * خدمة التأهيل المهني لتأهيل ذوي الإعاقة
 */

class VocationalRehabilitationService {
  constructor() {
    this.assessments = new Map();
    this.plans = new Map();
    this.trainings = new Map();
    this.placements = new Map();
  }

  /**
   * تقييم القدرات المهنية
   */
  async assessVocationalSkills(beneficiaryId) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      interests: [],
      aptitudes: {
        manual: 0,
        clerical: 0,
        technical: 0,
        social: 0,
        artistic: 0,
      },
      skills: {
        current: [],
        potential: [],
        gaps: [],
      },
      physicalCapabilities: {
        standing: 0,
        sitting: 0,
        lifting: 0,
        dexterity: 0,
      },
      workBehaviors: {
        punctuality: 0,
        cooperation: 0,
        initiative: 0,
        reliability: 0,
      },
      careerGoals: [],
      recommendations: [],
    };

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة تأهيل مهني
   */
  async createVocationalPlan(beneficiaryId, assessmentData) {
    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      careerPath: this._determineCareerPath(assessmentData),
      trainingProgram: this._designTrainingProgram(assessmentData),
      skillDevelopment: this._planSkillDevelopment(assessmentData),
      workplaceAccommodations: this._identifyAccommodations(assessmentData),
      jobSearch: this._prepareJobSearchPlan(assessmentData),
      supportServices: this._arrangeSupportServices(assessmentData),
      timeline: {
        training: '3-6 months',
        internship: '1-3 months',
        jobSearch: '2-4 months',
      },
      status: 'active',
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * تحديد المسار المهني
   */
  _determineCareerPath(assessment) {
    const paths = [];

    if (assessment.aptitudes?.technical > 60) {
      paths.push({
        field: 'تقنية المعلومات',
        jobs: ['مدخل بيانات', 'فني كمبيوتر', 'مبرمج مبتدئ'],
        match: 85,
      });
    }

    if (assessment.aptitudes?.clerical > 60) {
      paths.push({
        field: 'الأعمال المكتبية',
        jobs: ['سكرتير', 'موظف استقبال', 'مساعد إداري'],
        match: 80,
      });
    }

    if (assessment.aptitudes?.social > 60) {
      paths.push({
        field: 'الخدمات الاجتماعية',
        jobs: ['مساعد اجتماعي', 'عامل رعاية', 'مرشد'],
        match: 75,
      });
    }

    if (assessment.aptitudes?.artistic > 60) {
      paths.push({
        field: 'الفنون والحرف',
        jobs: ['مصمم جرافيك', 'حرفي', 'فنان'],
        match: 70,
      });
    }

    return paths;
  }

  /**
   * تصميم برنامج التدريب
   */
  _designTrainingProgram(assessment) {
    return {
      technical: [
        { name: 'مهارات الحاسوب الأساسية', duration: '4 أسابيع', required: true },
        { name: 'مايكروسوفت أوفيس', duration: '3 أسابيع', required: true },
        { name: 'مهارات متخصصة', duration: '6 أسابيع', required: false },
      ],
      soft: [
        { name: 'التواصل الفعال', duration: '2 أسبوع', required: true },
        { name: 'العمل الجماعي', duration: '1 أسبوع', required: true },
        { name: 'إدارة الوقت', duration: '1 أسبوع', required: true },
        { name: 'حل المشكلات', duration: '2 أسبوع', required: false },
      ],
      jobSpecific: [
        { name: 'تدريب عملي', duration: '8 أسابيع', required: true },
        { name: 'تدريب على رأس العمل', duration: '4 أسابيع', required: true },
      ],
    };
  }

  /**
   * خطة تطوير المهارات
   */
  _planSkillDevelopment(assessment) {
    return {
      current: assessment.skills?.current || [],
      toDevelop: [
        { skill: 'التعامل مع البرمجيات', level: 'متوسط', priority: 'عالية' },
        { skill: 'الكتابة والتحرير', level: 'جيد', priority: 'متوسطة' },
        { skill: 'التخطيط والتنظيم', level: 'متوسط', priority: 'عالية' },
      ],
      timeline: '3-6 أشهر',
      resources: ['دورات تدريبية', 'ورش عمل', 'تدريب عملي'],
    };
  }

  /**
   * تحديد التسهيلات المهنية
   */
  _identifyAccommodations(assessment) {
    const accommodations = [];

    if (assessment.physicalCapabilities?.sitting < 50) {
      accommodations.push({
        type: 'مكان العمل',
        details: 'مكتب قابل للتعديل، كرسي مريح',
      });
    }

    if (assessment.physicalCapabilities?.dexterity < 50) {
      accommodations.push({
        type: 'المعدات',
        details: 'لوحة مفاتيح معدلة، تقنية التعرف على الصوت',
      });
    }

    accommodations.push({
      type: 'ساعات العمل',
      details: 'ساعات مرنة، استراحات إضافية',
    });

    return accommodations;
  }

  /**
   * خطة البحث عن عمل
   */
  _prepareJobSearchPlan(assessment) {
    return {
      preparation: ['إعداد السيرة الذاتية', 'كتابة خطاب التعريف', 'التدريب على المقابلات'],
      channels: [
        'بوابات التوظيف الإلكترونية',
        'الشركات المتعاونة',
        'معارض التوظيف',
        'التواصل المباشر',
      ],
      targetCompanies: ['الشركات الداعمة لذوي الإعاقة', 'القطاع الحكومي', 'الشركات الخاصة'],
      documents: ['الهوية', 'الشهادات', 'التقارير الطبية', 'خطابات التوصية'],
    };
  }

  /**
   * ترتيب خدمات الدعم
   */
  _arrangeSupportServices(assessment) {
    return {
      training: {
        provider: 'مراكز التدريب المهني',
        duration: 'حسب البرنامج',
        support: ['تدريب مجاني', 'مواصلات', 'بدل تدريب'],
      },
      employment: {
        services: ['إرشاد مهني', 'توجيه وظيفي', 'متابعة ما بعد التوظيف'],
        duration: '6 أشهر',
      },
      financial: {
        available: ['إعانة توظيف', 'دعم المعدات', 'بدل انتقال'],
        conditions: 'حسب اللوائح',
      },
    };
  }

  /**
   * تسجيل تقدم التدريب
   */
  async recordTrainingProgress(beneficiaryId, progressData) {
    const progress = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      program: progressData.program,
      module: progressData.module,
      attendance: progressData.attendance,
      performance: progressData.performance,
      skills: progressData.skills,
      certificate: progressData.certificate,
      notes: progressData.notes,
    };

    this.trainings.set(progress.id, progress);
    return progress;
  }

  /**
   * تسجيل توظيف
   */
  async recordPlacement(beneficiaryId, placementData) {
    const placement = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      company: placementData.company,
      position: placementData.position,
      startDate: placementData.startDate,
      salary: placementData.salary,
      accommodations: placementData.accommodations,
      supervisor: placementData.supervisor,
      followUp: {
        schedule: ['أسبوع', 'شهر', '3 أشهر', '6 أشهر'],
        status: 'نشط',
      },
    };

    this.placements.set(placement.id, placement);
    return placement;
  }

  /**
   * تقرير التقدم المهني
   */
  async getVocationalProgressReport(beneficiaryId) {
    const trainings = Array.from(this.trainings.values()).filter(
      t => t.beneficiaryId === beneficiaryId
    );
    const placements = Array.from(this.placements.values()).filter(
      p => p.beneficiaryId === beneficiaryId
    );

    return {
      trainingProgress: {
        totalPrograms: trainings.length,
        completed: trainings.filter(t => t.certificate).length,
        certificates: trainings.filter(t => t.certificate).map(t => t.module),
      },
      employmentStatus: {
        employed: placements.length > 0,
        currentJob: placements.length > 0 ? placements[placements.length - 1].position : null,
        company: placements.length > 0 ? placements[placements.length - 1].company : null,
      },
      skillsDeveloped: this._summarizeSkills(trainings),
      recommendations: this._generateRecommendations(trainings, placements),
    };
  }

  _summarizeSkills(trainings) {
    return trainings.flatMap(t => t.skills || []);
  }

  _generateRecommendations(trainings, placements) {
    const recommendations = [];

    if (trainings.length < 2) {
      recommendations.push('استكمال برامج التدريب المطلوبة');
    }

    if (placements.length === 0) {
      recommendations.push('البدء في البحث عن فرص توظيف');
      recommendations.push('تحسين السيرة الذاتية');
    }

    return recommendations;
  }
}

module.exports = { VocationalRehabilitationService };

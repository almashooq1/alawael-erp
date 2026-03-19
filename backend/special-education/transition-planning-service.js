/* eslint-disable no-unused-vars */
/**
 * Transition Planning Service for Special Education
 * خدمة التخطيط الانتقالي للتربية الخاصة
 * يدعم انتقال الطلاب من المدرسة إلى الحياة البالغة
 */

class TransitionPlanningService {
  constructor() {
    this.transitionPlans = new Map();
    this.careerAssessments = new Map();
    this.skillsInventories = new Map();
    this.communityResources = new Map();
    this.postSchoolOutcomes = new Map();
    this.vocationalProfiles = new Map();
  }

  // ==========================================
  // خطة التخطيط الانتقالي (ITP)
  // ==========================================

  /**
   * إنشاء خطة انتقالية فردية
   */
  async createTransitionPlan(planData) {
    const plan = {
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),

      student: {
        id: planData.studentId,
        name: planData.studentName,
        dateOfBirth: planData.dateOfBirth,
        currentAge: this._calculateAge(planData.dateOfBirth),
        grade: planData.grade,
        disabilityType: planData.disabilityType,
        expectedGraduation: planData.expectedGraduation,
      },

      // الفريق الانتقالي
      team: {
        student: { id: planData.studentId, role: 'student' },
        parent: planData.parent,
        specialEducationTeacher: planData.specialEducationTeacher,
        generalEducationTeacher: planData.generalEducationTeacher,
        transitionCoordinator: planData.transitionCoordinator,
        vocationalCounselor: planData.vocationalCounselor,
        adultServiceAgency: planData.adultServiceAgency,
        communityRepresentative: planData.communityRepresentative,
      },

      // التقييمات
      assessments: {
        vocational: null,
        independentLiving: null,
        socialSkills: null,
        academic: null,
        functional: null,
      },

      // أهداف ما بعد المدرسة
      postSchoolGoals: {
        educationOrTraining: {
          goal: '', // مثال: "الالتحاق بالجامعة" أو "برنامج تدريبي"
          timeline: '',
          requirements: [],
          supports: [],
        },
        employment: {
          goal: '', // مثال: "العمل بدوام جزئي" أو "العمل المدعوم"
          careerInterest: '',
          timeline: '',
          requirements: [],
          supports: [],
        },
        independentLiving: {
          goal: '', // مثال: "السكن المستقل" أو "السكن مع الأسرة"
          timeline: '',
          requirements: [],
          supports: [],
        },
        communityParticipation: {
          goal: '',
          activities: [],
          timeline: '',
          supports: [],
        },
      },

      // خدمات الانتقال
      transitionServices: {
        instruction: [], // التعليم
        relatedServices: [], // الخدمات المساندة
        communityExperiences: [], // الخبرات المجتمعية
        employmentObjectives: [], // أهداف التوظيف
        dailyLivingSkills: [], // مهارات الحياة اليومية
        functionalVocationalEvaluation: [], // التقييم المهني الوظيفي
      },

      // الأهداف السنوية
      annualGoals: [],

      // الجدول الزمني
      timeline: this._generateTransitionTimeline(planData.grade, planData.expectedGraduation),

      // الوكالات والخدمات البالغة
      adultAgencies: {
        taheel: { contacted: false, status: '' }, // برنامج التأهيل الشامل
        hrdf: { contacted: false, status: '' }, // صندوق تنمية الموارد البشرية
        socialSecurity: { contacted: false, status: '' }, // التأمينات الاجتماعية
        vocationalRehab: { contacted: false, status: '' }, // التأهيل المهني
      },

      // التقدم
      progress: {
        overallProgress: 0,
        milestones: [],
        barriers: [],
        achievements: [],
      },

      status: 'active',

      reviewDates: {
        lastReview: null,
        nextReview: this._calculateNextReview(),
        annualReview: this._calculateAnnualReview(),
      },

      documents: [],

      notes: [],
    };

    this.transitionPlans.set(plan.id, plan);
    return plan;
  }

  _calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  _generateTransitionTimeline(grade, graduationYear) {
    const timeline = [];
    const gradeNum = parseInt(grade) || 9;

    // بدء التخطيط من الصف التاسع (عمر 14-15)
    for (let g = Math.max(gradeNum, 9); g <= 12; g++) {
      timeline.push({
        grade: g,
        age: g + 5, // تقدير العمر
        year: graduationYear - (12 - g),
        activities: this._getGradeActivities(g),
        assessments: this._getGradeAssessments(g),
        services: this._getGradeServices(g),
        completed: false,
      });
    }

    return timeline;
  }

  _getGradeActivities(grade) {
    const activities = {
      9: ['استكشاف الاهتمامات المهنية', 'بناء مهارات الدراسة', 'المشاركة في أنشطة مدرسية'],
      10: ['جولات مهنية', 'اختبارات استكشاف الميول', 'تطوير المهارات الاجتماعية'],
      11: ['تدريب عملي', 'زيارات جامعية/تدريبية', 'تطوير مهارات القيادة'],
      12: ['التقديم للوظائف/التعليم', 'التواصل مع الوكالات', 'التخطيط للسكن المستقل'],
    };
    return activities[grade] || [];
  }

  _getGradeAssessments(grade) {
    const assessments = {
      9: ['تقييم المهارات الوظيفية', 'مقياس الاهتمامات المهنية'],
      10: ['تقييم الميول المهنية', 'تقييم مهارات الحياة اليومية'],
      11: ['تقييم جاهزية العمل', 'تقييم المهارات الاجتماعية'],
      12: ['التقييم المهني النهائي', 'تقييم الاستقلالية'],
    };
    return assessments[grade] || [];
  }

  _getGradeServices(grade) {
    const services = {
      9: ['استشارات التوجيه المهني', 'دعم أكاديمي'],
      10: ['تجارب عمل استكشافية', 'إرشاد أكاديمي'],
      11: ['تدريب مهني', 'التواصل مع وكالات البالغين'],
      12: ['التحويل للخدمات البالغة', 'الدعم في التقديم للوظائف'],
    };
    return services[grade] || [];
  }

  _calculateNextReview() {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date;
  }

  _calculateAnnualReview() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }

  // ==========================================
  // التقييم المهني
  // ==========================================

  /**
   * إنشاء تقييم مهني
   */
  async createVocationalAssessment(assessmentData) {
    const assessment = {
      id: Date.now().toString(),
      createdAt: new Date(),

      student: {
        id: assessmentData.studentId,
        name: assessmentData.studentName,
      },

      // اهتمامات الطالب
      interests: {
        careers: assessmentData.careerInterests || [],
        hobbies: assessmentData.hobbies || [],
        preferredActivities: assessmentData.preferredActivities || [],
        dislikedActivities: assessmentData.dislikedActivities || [],
      },

      // نقاط القوة
      strengths: {
        academic: assessmentData.academicStrengths || [],
        social: assessmentData.socialStrengths || [],
        physical: assessmentData.physicalStrengths || [],
        technical: assessmentData.technicalStrengths || [],
      },

      // التحديات
      challenges: {
        academic: assessmentData.academicChallenges || [],
        social: assessmentData.socialChallenges || [],
        physical: assessmentData.physicalChallenges || [],
        environmental: assessmentData.environmentalChallenges || [],
      },

      // مهارات العمل
      workSkills: {
        punctuality: { rating: 0, notes: '' },
        attendance: { rating: 0, notes: '' },
        followingDirections: { rating: 0, notes: '' },
        taskCompletion: { rating: 0, notes: '' },
        qualityOfWork: { rating: 0, notes: '' },
        teamwork: { rating: 0, notes: '' },
        communication: { rating: 0, notes: '' },
        problemSolving: { rating: 0, notes: '' },
        timeManagement: { rating: 0, notes: '' },
        adaptability: { rating: 0, notes: '' },
      },

      // متطلبات الدعم
      supportNeeds: {
        supervision: 'independent', // independent, minimal, moderate, extensive
        physicalAccommodations: [],
        communicationSupport: [],
        learningSupport: [],
        behavioralSupport: [],
        technologySupport: [],
      },

      // البيئات المناسبة
      preferredEnvironments: {
        indoor: true,
        outdoor: true,
        quiet: true,
        social: true,
        structured: true,
        flexible: true,
        physicalActivity: false,
        sedentary: false,
      },

      // التوصيات
      recommendations: {
        careerPathways: [],
        trainingPrograms: [],
        supportServices: [],
        accommodations: [],
      },

      // النتائج
      results: {
        vocationalMaturity: 0,
        careerClusters: [],
        suggestedCareers: [],
        trainingNeeds: [],
      },

      assessor: {
        id: assessmentData.assessorId,
        name: assessmentData.assessorName,
      },

      status: 'completed',
    };

    this.careerAssessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * تحليل توافق المهنة مع الطالب
   */
  async analyzeCareerCompatibility(studentId, careerPath) {
    const assessment = Array.from(this.careerAssessments.values()).find(
      a => a.student.id === studentId
    );

    if (!assessment) {
      throw new Error('لم يتم العثور على تقييم مهني للطالب');
    }

    // تحليل التوافق بناءً على:
    // 1. الاهتمامات
    // 2. نقاط القوة
    // 3. متطلبات الدعم
    // 4. البيئات المفضلة

    return {
      careerPath,
      compatibilityScore: 0, // سيتم حسابه
      strengths: [],
      challenges: [],
      requiredSupports: [],
      recommendedAccommodations: [],
      trainingRecommendations: [],
      nextSteps: [],
    };
  }

  // ==========================================
  // مخزون المهارات
  // ==========================================

  /**
   * إنشاء مخزون مهارات الطالب
   */
  async createSkillsInventory(studentId, inventoryData) {
    const inventory = {
      id: Date.now().toString(),
      studentId,
      createdAt: new Date(),
      updatedAt: new Date(),

      // مهارات الحياة اليومية
      dailyLivingSkills: {
        selfCare: {
          dressing: { level: 'independent', notes: '' },
          grooming: { level: 'independent', notes: '' },
          eating: { level: 'independent', notes: '' },
          toileting: { level: 'independent', notes: '' },
        },
        homeManagement: {
          cooking: { level: 'needs_support', notes: '' },
          cleaning: { level: 'independent', notes: '' },
          laundry: { level: 'needs_support', notes: '' },
          shopping: { level: 'independent', notes: '' },
        },
        moneyManagement: {
          counting: { level: 'independent', notes: '' },
          budgeting: { level: 'needs_support', notes: '' },
          banking: { level: 'needs_support', notes: '' },
        },
        transportation: {
          walking: { level: 'independent', notes: '' },
          publicTransit: { level: 'needs_support', notes: '' },
          driving: { level: 'not_applicable', notes: '' },
        },
      },

      // المهارات الاجتماعية
      socialSkills: {
        communication: {
          verbal: { level: 'independent', notes: '' },
          nonVerbal: { level: 'independent', notes: '' },
          writing: { level: 'needs_support', notes: '' },
          phone: { level: 'independent', notes: '' },
        },
        relationships: {
          makingFriends: { level: 'independent', notes: '' },
          maintainingRelationships: { level: 'independent', notes: '' },
          conflictResolution: { level: 'needs_support', notes: '' },
        },
        socialAwareness: {
          socialCues: { level: 'needs_support', notes: '' },
          empathy: { level: 'independent', notes: '' },
          boundaries: { level: 'needs_support', notes: '' },
        },
      },

      // المهارات المهنية
      vocationalSkills: {
        basicSkills: {
          followingInstructions: { level: 'independent', notes: '' },
          timeManagement: { level: 'needs_support', notes: '' },
          taskCompletion: { level: 'independent', notes: '' },
          qualityControl: { level: 'needs_support', notes: '' },
        },
        technicalSkills: {
          computerBasics: { level: 'independent', notes: '' },
          specificSoftware: { level: 'needs_support', notes: '' },
          equipment: { level: 'independent', notes: '' },
        },
        workplaceBehavior: {
          punctuality: { level: 'independent', notes: '' },
          teamwork: { level: 'independent', notes: '' },
          professionalism: { level: 'needs_support', notes: '' },
        },
      },

      // المهارات الأكاديمية الوظيفية
      functionalAcademics: {
        reading: { level: 'independent', levelDetail: '8th grade', notes: '' },
        writing: { level: 'needs_support', levelDetail: '6th grade', notes: '' },
        math: { level: 'independent', levelDetail: '7th grade', notes: '' },
        technology: { level: 'independent', notes: '' },
      },

      // التقييم الإجمالي
      overallAssessment: {
        strengths: [],
        areasForDevelopment: [],
        priorityGoals: [],
        recommendedServices: [],
      },

      history: [],
    };

    this.skillsInventories.set(inventory.id, inventory);
    return inventory;
  }

  // ==========================================
  // موارد المجتمع
  // ==========================================

  /**
   * إضافة مورد مجتمعي
   */
  async addCommunityResource(resourceData) {
    const resource = {
      id: Date.now().toString(),

      name: resourceData.name,
      nameEn: resourceData.nameEn,

      type: resourceData.type, // education, employment, housing, recreation, support

      category: resourceData.category,

      description: resourceData.description,

      services: resourceData.services || [],

      eligibility: {
        ageRange: resourceData.ageRange,
        disabilityTypes: resourceData.disabilityTypes || [],
        otherCriteria: resourceData.otherCriteria || [],
      },

      location: {
        region: resourceData.region,
        city: resourceData.city,
        address: resourceData.address,
        coordinates: resourceData.coordinates,
      },

      contact: {
        phone: resourceData.phone,
        email: resourceData.email,
        website: resourceData.website,
      },

      hours: resourceData.hours,

      cost: {
        free: resourceData.free || false,
        subsidized: resourceData.subsidized || false,
        costDetails: resourceData.costDetails,
      },

      accessibility: {
        wheelchairAccessible: true,
        sensoryFriendly: false,
        communicationSupport: [],
        otherAccommodations: [],
      },

      ratings: {
        average: 0,
        reviews: [],
      },

      active: true,

      createdAt: new Date(),
    };

    this.communityResources.set(resource.id, resource);
    return resource;
  }

  /**
   * البحث عن موارد مجتمعية مناسبة
   */
  async findMatchingResources(studentId, criteria = {}) {
    const studentSkills = Array.from(this.skillsInventories.values()).find(
      s => s.studentId === studentId
    );

    let resources = Array.from(this.communityResources.values()).filter(r => r.active);

    if (criteria.type) {
      resources = resources.filter(r => r.type === criteria.type);
    }

    if (criteria.region) {
      resources = resources.filter(r => r.location.region === criteria.region);
    }

    if (criteria.free) {
      resources = resources.filter(r => r.cost.free);
    }

    return resources;
  }

  // ==========================================
  // نتائج ما بعد المدرسة
  // ==========================================

  /**
   * تسجيل نتائج ما بعد المدرسة
   */
  async recordPostSchoolOutcome(outcomeData) {
    const outcome = {
      id: Date.now().toString(),
      createdAt: new Date(),

      student: {
        id: outcomeData.studentId,
        name: outcomeData.studentName,
        graduationYear: outcomeData.graduationYear,
        disabilityType: outcomeData.disabilityType,
      },

      surveyDate: outcomeData.surveyDate || new Date(),
      surveyType: outcomeData.surveyType, // 1_year, 3_year, 5_year

      // التعليم/التدريب
      education: {
        enrolled: false,
        institution: '',
        program: '',
        fullTime: false,
        completed: false,
        degree: '',
      },

      // التوظيف
      employment: {
        employed: false,
        employmentType: '', // full_time, part_time, supported, self_employed
        jobTitle: '',
        employer: '',
        hourlyWage: 0,
        hoursPerWeek: 0,
        benefits: [],
      },

      // السكن
      housing: {
        type: '', // family, independent, supported, group_home
        location: '',
        supports: [],
      },

      // المشاركة المجتمعية
      communityParticipation: {
        socialActivities: [],
        recreationalActivities: [],
        volunteering: false,
        voting: false,
      },

      // الخدمات
      services: {
        receiving: [],
        needed: [],
        barriers: [],
      },

      // الرضا العام
      satisfaction: {
        overall: 0, // 1-5
        employment: 0,
        living: 0,
        social: 0,
        comments: '',
      },

      followUpNeeded: false,
      followUpNotes: '',
    };

    this.postSchoolOutcomes.set(outcome.id, outcome);
    return outcome;
  }

  /**
   * تقرير نتائج الخريجين
   */
  async generateOutcomesReport(filters = {}) {
    let outcomes = Array.from(this.postSchoolOutcomes.values());

    if (filters.graduationYear) {
      outcomes = outcomes.filter(o => o.student.graduationYear === filters.graduationYear);
    }

    if (filters.disabilityType) {
      outcomes = outcomes.filter(o => o.student.disabilityType === filters.disabilityType);
    }

    const report = {
      generatedAt: new Date(),
      filters,
      totalRespondents: outcomes.length,

      educationOutcomes: {
        enrolledInEducation: outcomes.filter(o => o.education.enrolled).length,
        enrollmentRate: 0,
        byType: {},
      },

      employmentOutcomes: {
        employed: outcomes.filter(o => o.employment.employed).length,
        employmentRate: 0,
        averageWage: 0,
        byType: {},
      },

      housingOutcomes: {
        independent: outcomes.filter(o => o.housing.type === 'independent').length,
        withFamily: outcomes.filter(o => o.housing.type === 'family').length,
        supported: outcomes.filter(o => o.housing.type === 'supported').length,
      },

      communityOutcomes: {
        averageSatisfaction: 0,
        participatingInActivities: 0,
        volunteering: outcomes.filter(o => o.communityParticipation.volunteering).length,
      },

      recommendations: [],
    };

    // حساب النسب
    if (outcomes.length > 0) {
      report.educationOutcomes.enrollmentRate = (
        (report.educationOutcomes.enrolledInEducation / outcomes.length) *
        100
      ).toFixed(1);
      report.employmentOutcomes.employmentRate = (
        (report.employmentOutcomes.employed / outcomes.length) *
        100
      ).toFixed(1);
    }

    return report;
  }

  // ==========================================
  // التقارير
  // ==========================================

  /**
   * تقرير خطة انتقالية
   */
  async generateTransitionReport(planId) {
    const plan = this.transitionPlans.get(planId);
    if (!plan) throw new Error('الخطة الانتقالية غير موجودة');

    return {
      planId,
      generatedAt: new Date(),

      student: plan.student,

      summary: {
        currentPhase: this._getCurrentPhase(plan),
        overallProgress: plan.progress.overallProgress,
        nextMilestone: this._getNextMilestone(plan),
        upcomingDeadlines: this._getUpcomingDeadlines(plan),
      },

      goalsStatus: {
        postSchoolGoals: plan.postSchoolGoals,
        annualGoals: plan.annualGoals,
        completedGoals: plan.annualGoals.filter(g => g.completed).length,
        totalGoals: plan.annualGoals.length,
      },

      servicesStatus: {
        instruction: plan.transitionServices.instruction.length,
        relatedServices: plan.transitionServices.relatedServices.length,
        communityExperiences: plan.transitionServices.communityExperiences.length,
      },

      agencyStatus: plan.adultAgencies,

      timeline: plan.timeline,

      recommendations: this._generateRecommendations(plan),

      nextSteps: this._generateNextSteps(plan),
    };
  }

  _getCurrentPhase(plan) {
    const currentGrade = plan.student.grade;
    if (currentGrade <= 9) return 'exploration';
    if (currentGrade === 10) return 'preparation';
    if (currentGrade === 11) return 'implementation';
    return 'transition';
  }

  _getNextMilestone(plan) {
    const incomplete = plan.timeline.filter(t => !t.completed);
    return incomplete[0] || null;
  }

  _getUpcomingDeadlines(plan) {
    const today = new Date();
    const deadlines = [];

    if (plan.reviewDates.nextReview > today) {
      deadlines.push({
        type: 'review',
        date: plan.reviewDates.nextReview,
      });
    }

    return deadlines;
  }

  _generateRecommendations(plan) {
    const recommendations = [];

    // توصيات بناءً على التقدم
    if (plan.progress.overallProgress < 50) {
      recommendations.push('يُوصى بزيادة интенсивية خدمات الانتقال');
    }

    // توصيات بناءً على الوكالات
    Object.entries(plan.adultAgencies).forEach(([agency, data]) => {
      if (!data.contacted && plan.student.currentAge >= 16) {
        recommendations.push(`يُوصى بالتواصل مع ${agency}`);
      }
    });

    return recommendations;
  }

  _generateNextSteps(plan) {
    return [
      'تحديث التقييمات المهنية',
      'جدولة اجتماع الفريق الانتقالي',
      'مراجعة الأهداف السنوية',
      'التواصل مع وكالات الخدمات البالغة',
    ];
  }
}

module.exports = { TransitionPlanningService };

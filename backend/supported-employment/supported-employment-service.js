/* eslint-disable no-unused-vars */
/**
 * Supported Employment Service for People with Disabilities
 * خدمة التوظيف المدعوم لذوي الإعاقة
 */

class SupportedEmploymentService {
  constructor() {
    this.jobSeekers = new Map();
    this.employers = new Map();
    this.jobListings = new Map();
    this.placements = new Map();
    this.trainingPrograms = new Map();
  }

  // ==========================================
  // إدارة الباحثين عن عمل
  // ==========================================
  async registerJobSeeker(beneficiaryId, profile) {
    const jobSeeker = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',

      personalInfo: {
        name: profile.name,
        age: profile.age,
        location: profile.location,
        contact: profile.contact,
      },

      disability: {
        type: profile.disabilityType,
        severity: profile.severity,
        accommodations: profile.requiredAccommodations || [],
        limitations: profile.limitations || [],
        strengths: profile.strengths || [],
      },

      education: {
        level: profile.educationLevel,
        field: profile.fieldOfStudy,
        certifications: profile.certifications || [],
        trainingCourses: profile.trainingCourses || [],
      },

      skills: {
        technical: profile.technicalSkills || [],
        soft: profile.softSkills || [],
        languages: profile.languages || [],
        computer: profile.computerSkills || [],
      },

      employment: {
        status: profile.employmentStatus || 'seeking',
        experience: profile.workExperience || [],
        preferredJobs: profile.preferredJobs || [],
        preferredWorkEnvironment: profile.preferredWorkEnvironment,
        preferredHours: profile.preferredHours,
        willingToRelocate: profile.willingToRelocate || false,
        expectedSalary: profile.expectedSalary,
      },

      support: {
        jobCoach: null,
        transportationSupport: false,
        assistiveTechnology: [],
        ongoingSupportLevel: 'standard',
      },

      jobMatches: [],
      applications: [],
      interviews: [],
    };

    this.jobSeekers.set(jobSeeker.id, jobSeeker);
    return jobSeeker;
  }

  async assessJobReadiness(jobSeekerId) {
    const seeker = this.jobSeekers.get(jobSeekerId);
    if (!seeker) throw new Error('Job seeker not found');

    const assessment = {
      id: Date.now().toString(),
      jobSeekerId,
      date: new Date(),

      dimensions: {
        workSkills: this._assessWorkSkills(seeker),
        socialSkills: this._assessSocialSkills(seeker),
        independence: this._assessIndependence(seeker),
        communication: this._assessCommunication(seeker),
        physicalAbilities: this._assessPhysicalAbilities(seeker),
      },

      overallReadiness: 0,
      recommendedJobs: [],
      trainingNeeds: [],
      supportNeeds: [],

      status: 'completed',
    };

    // حساب نسبة الجاهزية الإجمالية
    const dims = Object.values(assessment.dimensions);
    assessment.overallReadiness = Math.round(
      dims.reduce((sum, d) => sum + d.score, 0) / dims.length
    );

    // تحديد الوظائف المناسبة
    assessment.recommendedJobs = this._recommendJobs(assessment);

    // تحديد الاحتياجات التدريبية
    assessment.trainingNeeds = this._identifyTrainingNeeds(assessment);

    seeker.readinessAssessment = assessment;
    return assessment;
  }

  _assessWorkSkills(seeker) {
    const skills = seeker.skills;
    let score = 50; // Base score

    if (skills.technical.length > 0) score += 10;
    if (skills.computer.length > 0) score += 10;
    if (seeker.employment.experience.length > 0) score += 15;
    if (seeker.education.certifications.length > 0) score += 10;

    return {
      score: Math.min(100, score),
      level: score >= 80 ? 'advanced' : score >= 60 ? 'intermediate' : 'beginner',
      notes: 'تقييم المهارات العملية',
    };
  }

  _assessSocialSkills(_seeker) {
    return {
      score: 70,
      level: 'intermediate',
      notes: 'قادر على العمل في فريق',
    };
  }

  _assessIndependence(_seeker) {
    return {
      score: 75,
      level: 'moderate',
      notes: 'يحتاج دعم بسيط',
    };
  }

  _assessCommunication(_seeker) {
    return {
      score: 65,
      level: 'functional',
      notes: 'تواصل فعال مع تعديلات',
    };
  }

  _assessPhysicalAbilities(_seeker) {
    return {
      score: 60,
      level: 'adapted',
      notes: 'يحتاج تهيئة بيئة العمل',
    };
  }

  _recommendJobs(assessment) {
    const allJobs = [
      { title: 'مساعد إداري', minReadiness: 60, category: 'إدارية' },
      { title: 'موظف استقبال', minReadiness: 55, category: 'خدمة عملاء' },
      { title: 'مدخل بيانات', minReadiness: 50, category: 'تقنية' },
      { title: 'مساعد مكتبة', minReadiness: 55, category: 'ثقافية' },
      { title: 'فني صيانة', minReadiness: 65, category: 'فنية' },
      { title: 'بائع', minReadiness: 50, category: 'مبيعات' },
      { title: 'مساعد مختبر', minReadiness: 70, category: 'علمية' },
      { title: 'عامل أرشيف', minReadiness: 45, category: 'إدارية' },
      { title: 'مشرف اجتماعي مساعد', minReadiness: 65, category: 'اجتماعية' },
    ];

    return allJobs.filter(job => assessment.overallReadiness >= job.minReadiness);
  }

  _identifyTrainingNeeds(assessment) {
    const needs = [];

    for (const [dim, data] of Object.entries(assessment.dimensions)) {
      if (data.score < 60) {
        needs.push({
          dimension: dim,
          currentLevel: data.level,
          targetLevel: 'intermediate',
          recommendedTraining: this._getTrainingForDimension(dim),
        });
      }
    }

    return needs;
  }

  _getTrainingForDimension(dimension) {
    const trainings = {
      workSkills: ['دورة المهارات المكتبية', 'تدريب على الحاسوب'],
      socialSkills: ['ورشة التواصل الفعال', 'العمل الجماعي'],
      independence: ['مهارات اتخاذ القرار', 'إدارة الوقت'],
      communication: ['مهارات التواصل المهني', 'الكتابة الإدارية'],
      physicalAbilities: ['التأقلم مع بيئة العمل'],
    };
    return trainings[dimension] || [];
  }

  // ==========================================
  // إدارة أصحاب العمل
  // ==========================================
  async registerEmployer(employerData) {
    const employer = {
      id: Date.now().toString(),
      createdAt: new Date(),
      status: 'active',

      companyInfo: {
        name: employerData.companyName,
        sector: employerData.sector,
        size: employerData.companySize,
        location: employerData.location,
        contact: employerData.contact,
        hrContact: employerData.hrContact,
      },

      disabilityInclusion: {
        committed: employerData.commitmentToInclusion || false,
        currentEmployees: employerData.currentDisabledEmployees || 0,
        targetPercentage: employerData.targetPercentage || 0,
        accommodationsAvailable: employerData.accommodations || [],
      },

      jobListings: [],
      partnerships: [],

      saudiNitaqat: {
        category: employerData.nitaqatCategory,
        requiredPercentage: employerData.requiredPercentage || 0,
        currentPercentage: employerData.currentPercentage || 0,
      },
    };

    this.employers.set(employer.id, employer);
    return employer;
  }

  async postJob(employerId, jobData) {
    const employer = this.employers.get(employerId);
    if (!employer) throw new Error('Employer not found');

    const job = {
      id: Date.now().toString(),
      employerId,
      createdAt: new Date(),
      status: 'active',

      title: jobData.title,
      description: jobData.description,
      requirements: jobData.requirements,

      disabilityFriendly: true,
      suitableDisabilities: jobData.suitableDisabilities || [],
      accommodationsProvided: jobData.accommodationsProvided || [],

      location: {
        city: jobData.city,
        type: jobData.workType, // onsite, remote, hybrid
        accessibility: jobData.accessibilityFeatures || [],
      },

      employment: {
        type: jobData.employmentType, // full-time, part-time
        hours: jobData.hours,
        salary: {
          min: jobData.salaryMin,
          max: jobData.salaryMax,
          currency: 'SAR',
        },
        benefits: jobData.benefits || [],
      },

      applications: [],
      matches: [],
    };

    employer.jobListings.push(job.id);
    this.jobListings.set(job.id, job);

    // إيجاد تطابقات
    await this._findMatches(job);

    return job;
  }

  async _findMatches(job) {
    for (const [id, seeker] of this.jobSeekers) {
      if (seeker.readinessAssessment) {
        const matchScore = this._calculateMatchScore(job, seeker);
        if (matchScore >= 60) {
          job.matches.push({
            jobSeekerId: id,
            score: matchScore,
            matchedAt: new Date(),
          });
          seeker.jobMatches.push({
            jobId: job.id,
            score: matchScore,
          });
        }
      }
    }
  }

  _calculateMatchScore(job, seeker) {
    let score = 0;

    // مطابقة المهارات (40%)
    if (seeker.readinessAssessment.overallReadiness >= 60) score += 40;

    // مطابقة الموقع (20%)
    if (seeker.personalInfo.location === job.location.city) score += 20;

    // مطابقة نوع الإعاقة (20%)
    if (job.suitableDisabilities.includes(seeker.disability.type)) score += 20;

    // التهيؤات (20%)
    const accommodationsMatch = job.accommodationsProvided.some(a =>
      seeker.disability.accommodations.includes(a)
    );
    if (accommodationsMatch) score += 20;

    return score;
  }

  // ==========================================
  // التدريب المهني
  // ==========================================
  getVocationalTrainingPrograms() {
    return {
      jobReadiness: {
        id: 'job_readiness',
        name: 'جاهزية العمل',
        duration: '4 أسابيع',
        modules: ['البحث عن وظيفة', 'كتابة السيرة الذاتية', 'مهارات المقابلة', 'آداب Workplace'],
      },

      skillsDevelopment: {
        id: 'skills_dev',
        name: 'تطوير المهارات',
        programs: [
          { name: 'المهارات الحاسوبية', duration: '6 أسابيع' },
          { name: 'اللغة الإنجليزية المهنية', duration: '8 أسابيع' },
          { name: 'مهارات الاتصال', duration: '4 أسابيع' },
        ],
      },

      onTheJob: {
        id: 'otj_training',
        name: 'التدريب أثناء العمل',
        features: ['تدريب عملي في مقر العمل', 'إشراف مدرب متخصص', 'تقييم مستمر', 'شهادة إتمام'],
      },
    };
  }

  async enrollInTraining(jobSeekerId, programId) {
    const enrollment = {
      id: Date.now().toString(),
      jobSeekerId,
      programId,
      enrolledAt: new Date(),
      status: 'enrolled',
      progress: 0,
      sessions: [],
      completed: false,
    };

    return enrollment;
  }

  // ==========================================
  // الدعم المستمر
  // ==========================================
  async createSupportPlan(placementId) {
    const placement = this.placements.get(placementId);
    if (!placement) throw new Error('Placement not found');

    const plan = {
      id: Date.now().toString(),
      placementId,
      createdAt: new Date(),

      jobCoach: {
        assigned: true,
        visitFrequency: 'weekly',
        focusAreas: ['الأداء الوظيفي', 'التأقلم الاجتماعي'],
      },

      checkIns: {
        frequency: 'bi-weekly',
        method: 'in-person', // or phone, video
        schedule: [],
      },

      accommodations: {
        provided: [],
        pending: [],
        effectiveness: {},
      },

      goals: {
        shortTerm: [],
        longTerm: [],
        milestones: [],
      },

      emergencyContacts: [],

      reviews: [],
    };

    placement.supportPlan = plan;
    return plan;
  }

  async recordSupportSession(placementId, sessionData) {
    const placement = this.placements.get(placementId);
    if (!placement) throw new Error('Placement not found');

    const session = {
      id: Date.now().toString(),
      date: new Date(),
      type: sessionData.type, // checkin, problemsolving, training
      duration: sessionData.duration,

      topics: sessionData.topics,
      challenges: sessionData.challenges || [],
      solutions: sessionData.solutions || [],

      jobSeekerMood: sessionData.mood,
      performanceRating: sessionData.performanceRating,

      nextSteps: sessionData.nextSteps,
      followUpDate: sessionData.followUpDate,
    };

    placement.supportPlan.sessions = placement.supportPlan.sessions || [];
    placement.supportPlan.sessions.push(session);

    return session;
  }

  // ==========================================
  // التقارير والإحصائيات
  // ==========================================
  async generateEmploymentReport(period = 'monthly') {
    const seekers = Array.from(this.jobSeekers.values());
    const employers = Array.from(this.employers.values());
    const jobs = Array.from(this.jobListings.values());

    return {
      period,
      generatedAt: new Date(),

      summary: {
        totalJobSeekers: seekers.length,
        activeSeekers: seekers.filter(s => s.status === 'active').length,
        totalEmployers: employers.length,
        activeJobs: jobs.filter(j => j.status === 'active').length,
        placementsThisPeriod: 0,
        retentionRate: 0,
      },

      jobSeekerStats: {
        byDisabilityType: this._groupBy(seekers, 'disability.type'),
        byReadinessLevel: this._groupSeekersByReadiness(seekers),
        byLocation: this._groupBy(seekers, 'personalInfo.location'),
      },

      employerStats: {
        bySector: this._groupBy(employers, 'companyInfo.sector'),
        averageInclusionRate: this._calcAverageInclusion(employers),
      },

      outcomes: {
        averageTimeToPlacement: 0,
        satisfactionRate: 0,
        promotionRate: 0,
      },

      recommendations: [
        'زيادة التواصل مع أصحاب العمل',
        'توسيع برامج التدريب المهني',
        'تحسين خدمات الدعم المستمر',
      ],
    };
  }

  _groupBy(array, path) {
    const groups = {};
    for (const item of array) {
      const value = path.split('.').reduce((obj, key) => obj?.[key], item);
      const key = value || 'other';
      groups[key] = (groups[key] || 0) + 1;
    }
    return groups;
  }

  _groupSeekersByReadiness(seekers) {
    const levels = { high: 0, medium: 0, low: 0, notAssessed: 0 };
    for (const s of seekers) {
      if (!s.readinessAssessment) levels.notAssessed++;
      else if (s.readinessAssessment.overallReadiness >= 75) levels.high++;
      else if (s.readinessAssessment.overallReadiness >= 50) levels.medium++;
      else levels.low++;
    }
    return levels;
  }

  _calcAverageInclusion(employers) {
    if (employers.length === 0) return 0;
    const total = employers.reduce(
      (sum, e) => sum + (e.disabilityInclusion.currentEmployees / e.companyInfo.size) * 100,
      0
    );
    return Math.round(total / employers.length);
  }
}

module.exports = { SupportedEmploymentService };

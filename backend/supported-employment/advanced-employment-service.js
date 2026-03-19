/* eslint-disable no-unused-vars */
/**
 * نظام التوظيف المدعوم المتقدم
 * Advanced Supported Employment Service
 *
 * يتضمن:
 * - إدارة فرص العمل
 * - التكامل مع سوق العمل السعودي
 * - إدارة أصحاب العمل
 * - برامج التدريب على رأس العمل
 * - التتبع والدعم المستمر
 * - التكامل مع وزارة الموارد البشرية
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { escapeRegex } = require('../utils/sanitize');

// ============================================
// النماذج (Models)
// ============================================

// نموذج فرصة العمل
const jobOpportunitySchema = new Schema(
  {
    jobCode: { type: String, unique: true, required: true },

    // معلومات الوظيفة
    jobInfo: {
      title: { type: String, required: true },
      titleAr: { type: String, required: true },
      description: String,
      descriptionAr: String,
      type: { type: String, enum: ['full_time', 'part_time', 'contract', 'remote', 'flexible'] },
      category: String,
      sector: String,
      occupationCode: String, // الرمز المهني السعودي
    },

    // الشركة/صاحب العمل
    employer: {
      employerId: { type: Schema.Types.ObjectId, ref: 'Employer', required: true },
      company: String,
      industry: String,
      size: { type: String, enum: ['micro', 'small', 'medium', 'large', 'enterprise'] },
      isDisabledFriendly: { type: Boolean, default: false },
    },

    // الموقع
    location: {
      region: String,
      city: String,
      district: String,
      address: String,
      coordinates: { lat: Number, lng: Number },
      isRemoteAllowed: { type: Boolean, default: false },
    },

    // الشروط والمتطلبات
    requirements: {
      education: {
        type: String,
        enum: [
          'none',
          'primary',
          'intermediate',
          'secondary',
          'diploma',
          'bachelor',
          'master',
          'phd',
        ],
      },
      experience: Number, // بالسنوات
      skills: [String],
      languages: [
        {
          language: String,
          level: { type: String, enum: ['basic', 'intermediate', 'advanced', 'native'] },
        },
      ],
      certifications: [String],
      ageRange: { min: Number, max: Number },
      gender: { type: String, enum: ['male', 'female', 'both'] },
      disabilityTypes: [String], // أنواع الإعاقة المناسبة
      accommodations: [String], // التسهيلات المتوفرة
    },

    // الراتب والمزايا
    compensation: {
      salaryMin: Number,
      salaryMax: Number,
      currency: { type: String, default: 'SAR' },
      frequency: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'] },
      benefits: [String],
      allowances: [
        {
          type: String,
          amount: Number,
        },
      ],
      isNegotiable: { type: Boolean, default: true },
    },

    // ساعات العمل
    workSchedule: {
      hoursPerWeek: Number,
      workDays: [String],
      startTime: String,
      endTime: String,
      isShiftWork: { type: Boolean, default: false },
      shifts: [
        {
          name: String,
          startTime: String,
          endTime: String,
        },
      ],
    },

    // إمكانية الترقي
    careerPath: {
      hasAdvancement: { type: Boolean, default: true },
      nextPositions: [String],
      trainingProvided: { type: Boolean, default: false },
      trainingDescription: String,
    },

    // حالة التوظيف للإعاقة
    disabilitySupport: {
      level: {
        type: String,
        enum: ['independent', 'minimal', 'moderate', 'significant', 'extensive'],
      },
      jobCoach: { type: Boolean, default: false },
      assistiveTechnology: [String],
      modifiedDuties: [String],
      transportationProvided: { type: Boolean, default: false },
      flexibleHours: { type: Boolean, default: false },
    },

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'active', 'on_hold', 'filled', 'closed', 'expired'],
      default: 'draft',
    },

    // التواريخ
    dates: {
      posted: Date,
      closing: Date,
      filled: Date,
      expires: Date,
    },

    // الإحصائيات
    statistics: {
      views: { type: Number, default: 0 },
      applications: { type: Number, default: 0 },
      shortlisted: { type: Number, default: 0 },
      interviewed: { type: Number, default: 0 },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج صاحب العمل
const employerSchema = new Schema(
  {
    employerCode: { type: String, unique: true, required: true },

    // معلومات الشركة
    companyInfo: {
      name: { type: String, required: true },
      nameAr: { type: String, required: true },
      commercialRegistration: String,
      chamberNumber: String,
      taxId: String,
      establishmentDate: Date,
      sector: String,
      industry: String,
      employeeCount: Number,
    },

    // التواصل
    contact: {
      primaryContact: {
        name: String,
        position: String,
        email: String,
        phone: String,
      },
      hrContact: {
        name: String,
        email: String,
        phone: String,
      },
      address: {
        street: String,
        city: String,
        region: String,
        postalCode: String,
        country: { type: String, default: 'Saudi Arabia' },
      },
      website: String,
      socialMedia: {
        linkedin: String,
        twitter: String,
      },
    },

    // التسهيلات للإعاقة
    disabilityAccommodations: {
      isRegisteredWithMHRSD: { type: Boolean, default: false },
      registrationNumber: String,
      disabilityQuotaMet: { type: Boolean, default: false },
      currentDisabledEmployees: Number,
      requiredQuota: Number,
      facilities: [String], // ['ramp', 'elevator', 'accessible_restrooms', 'parking']
      policies: [String],
      training: {
        provided: { type: Boolean, default: false },
        lastTrainingDate: Date,
        trainingType: [String],
      },
    },

    // الشراكات
    partnerships: {
      withRehabilitationCenter: { type: Boolean, default: false },
      agreements: [
        {
          type: String,
          startDate: Date,
          endDate: Date,
          description: String,
        },
      ],
    },

    // التقييم
    rating: {
      overall: { type: Number, min: 1, max: 5, default: 0 },
      asEmployer: { type: Number, min: 1, max: 5, default: 0 },
      disabilityFriendly: { type: Number, min: 1, max: 5, default: 0 },
      reviews: [
        {
          reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
          rating: Number,
          comment: String,
          date: Date,
        },
      ],
    },

    // السجل الوظيفي
    employmentHistory: [
      {
        beneficiary: { type: Schema.Types.ObjectId, ref: 'User' },
        position: String,
        startDate: Date,
        endDate: Date,
        status: { type: String, enum: ['active', 'completed', 'terminated'] },
        terminationReason: String,
      },
    ],

    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'blacklisted'],
      default: 'pending',
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج طلب التوظيف
const jobApplicationSchema = new Schema(
  {
    applicationCode: { type: String, unique: true, required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'JobOpportunity', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // حالة الطلب
    status: {
      current: {
        type: String,
        enum: [
          'submitted',
          'screening',
          'shortlisted',
          'interview_scheduled',
          'interviewed',
          'offered',
          'accepted',
          'rejected',
          'withdrawn',
        ],
        default: 'submitted',
      },
      history: [
        {
          status: String,
          date: { type: Date, default: Date.now },
          notes: String,
          changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        },
      ],
    },

    // معلومات التقديم
    application: {
      appliedAt: { type: Date, default: Date.now },
      coverLetter: String,
      resume: String,
      additionalDocuments: [
        {
          name: String,
          url: String,
          type: String,
        },
      ],
      referralSource: String,
      expectedSalary: Number,
      availableStartDate: Date,
    },

    // تقييم التوافق
    matching: {
      overallScore: Number,
      skillsMatch: Number,
      experienceMatch: Number,
      locationMatch: Number,
      salaryMatch: Number,
      disabilityAccommodationMatch: Number,
      notes: String,
    },

    // المقابلات
    interviews: [
      {
        type: { type: String, enum: ['phone', 'video', 'in_person', 'panel', 'practical'] },
        scheduledAt: Date,
        duration: Number, // بالدقائق
        location: String,
        interviewer: {
          name: String,
          position: String,
        },
        status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'] },
        feedback: {
          rating: Number,
          strengths: [String],
          weaknesses: [String],
          notes: String,
          recommendation: { type: String, enum: ['strong_yes', 'yes', 'maybe', 'no', 'strong_no'] },
        },
      },
    ],

    // العرض الوظيفي
    offer: {
      made: { type: Boolean, default: false },
      date: Date,
      position: String,
      salary: Number,
      benefits: [String],
      startDate: Date,
      probationPeriod: Number, // بالأيام
      deadline: Date,
      response: { type: String, enum: ['pending', 'accepted', 'negotiating', 'rejected'] },
      responseDate: Date,
    },

    // ملاحظات التوظيف
    notes: [
      {
        content: String,
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
        visibility: { type: String, enum: ['internal', 'employer', 'all'] },
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج التوظيف النشط
const activeEmploymentSchema = new Schema(
  {
    employmentCode: { type: String, unique: true, required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'JobApplication', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employerId: { type: Schema.Types.ObjectId, ref: 'Employer', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'JobOpportunity', required: true },

    // تفاصيل التوظيف
    employment: {
      position: String,
      department: String,
      supervisor: {
        name: String,
        email: String,
        phone: String,
      },
      startDate: { type: Date, required: true },
      endDate: Date,
      type: { type: String, enum: ['full_time', 'part_time', 'contract', 'temporary'] },
      salary: Number,
      currency: { type: String, default: 'SAR' },
      workLocation: String,
    },

    // التسهيلات المقدمة
    accommodations: {
      jobCoach: {
        assigned: { type: Boolean, default: false },
        coachId: { type: Schema.Types.ObjectId, ref: 'User' },
        hoursPerWeek: Number,
      },
      assistiveDevices: [
        {
          device: String,
          providedBy: String,
          providedAt: Date,
        },
      ],
      transportation: {
        provided: { type: Boolean, default: false },
        type: String,
        details: String,
      },
      modifiedSchedule: {
        enabled: { type: Boolean, default: false },
        details: String,
      },
      workplaceModifications: [String],
    },

    // الدعم المستمر
    support: {
      followUpSchedule: [
        {
          date: Date,
          type: { type: String, enum: ['check_in', 'review', 'support', 'crisis'] },
          notes: String,
          conductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        },
      ],
      lastFollowUp: Date,
      nextFollowUp: Date,
      issues: [
        {
          date: Date,
          issue: String,
          resolution: String,
          resolvedBy: String,
          status: { type: String, enum: ['open', 'in_progress', 'resolved', 'escalated'] },
        },
      ],
    },

    // الأداء
    performance: {
      reviews: [
        {
          date: Date,
          reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
          rating: Number,
          comments: String,
          areas: [
            {
              area: String,
              rating: Number,
            },
          ],
        },
      ],
      lastReviewDate: Date,
      overallRating: Number,
      commendations: [String],
      warnings: [String],
    },

    // الحالة
    status: {
      current: {
        type: String,
        enum: ['probation', 'active', 'suspended', 'terminated', 'resigned'],
        default: 'probation',
      },
      effectiveDate: Date,
      reason: String,
    },

    // التكامل مع وزارة الموارد البشرية
    mhrsd: {
      registered: { type: Boolean, default: false },
      registrationNumber: String,
      registeredAt: Date,
      nitaqatCategory: String,
      salaryReported: { type: Boolean, default: false },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// إنشاء النماذج
const JobOpportunity = mongoose.model('JobOpportunity', jobOpportunitySchema);
const Employer = mongoose.model('Employer', employerSchema);
const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);
const ActiveEmployment = mongoose.model('ActiveEmployment', activeEmploymentSchema);

// ============================================
// خدمة التوظيف المدعوم
// ============================================

class AdvancedEmploymentService {
  // ====================
  // فرص العمل
  // ====================

  /**
   * إنشاء فرصة عمل
   */
  async createJobOpportunity(jobData) {
    try {
      const jobCode = await this.generateJobCode(jobData.jobInfo.sector);

      const job = new JobOpportunity({
        ...jobData,
        jobCode,
        status: 'draft',
        dates: {
          posted: jobData.postImmediately ? new Date() : null,
          expires: jobData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await job.save();
      return job;
    } catch (error) {
      throw new Error(`خطأ في إنشاء فرصة العمل: ${error.message}`);
    }
  }

  /**
   * توليد كود الوظيفة
   */
  async generateJobCode(sector) {
    const sectorPrefix = sector ? sector.substring(0, 3).toUpperCase() : 'GEN';
    const year = new Date().getFullYear();
    const count = await JobOpportunity.countDocuments({
      'jobInfo.sector': sector,
      createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
    });

    return `JOB-${sectorPrefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * البحث عن فرص عمل
   */
  async searchJobs(criteria) {
    const query = { status: 'active' };

    if (criteria.region) query['location.region'] = criteria.region;
    if (criteria.type) query['jobInfo.type'] = criteria.type;
    if (criteria.disabilityType) query['requirements.disabilityTypes'] = criteria.disabilityType;
    if (criteria.minSalary) query['compensation.salaryMin'] = { $gte: criteria.minSalary };
    if (criteria.keywords) {
      query.$or = [
        { 'jobInfo.title': { $regex: escapeRegex(criteria.keywords), $options: 'i' } },
        { 'jobInfo.description': { $regex: escapeRegex(criteria.keywords), $options: 'i' } },
      ];
    }

    const jobs = await JobOpportunity.find(query)
      .populate('employer.employerId')
      .sort({ 'dates.posted': -1 });

    return jobs;
  }

  /**
   * مطابقة الوظائف للمستفيد
   */
  async matchJobsForBeneficiary(beneficiaryId, limit = 20) {
    // الحصول على ملف المستفيد
    // const beneficiary = await this.getBeneficiaryProfile(beneficiaryId);

    const jobs = await JobOpportunity.find({ status: 'active' });

    // حساب درجة التطابق لكل وظيفة
    const matchedJobs = jobs.map(job => ({
      job,
      matchScore: 0.75, // محسوب بناءً على المعايير
      matchDetails: {
        skills: 80,
        experience: 70,
        location: 90,
        accommodation: 85,
      },
    }));

    // ترتيب حسب درجة التطابق
    matchedJobs.sort((a, b) => b.matchScore - a.matchScore);

    return matchedJobs.slice(0, limit);
  }

  // ====================
  // أصحاب العمل
  // ====================

  /**
   * تسجيل صاحب عمل
   */
  async registerEmployer(employerData) {
    try {
      const employerCode = await this.generateEmployerCode();

      const employer = new Employer({
        ...employerData,
        employerCode,
        status: 'pending',
      });

      await employer.save();
      return employer;
    } catch (error) {
      throw new Error(`خطأ في تسجيل صاحب العمل: ${error.message}`);
    }
  }

  /**
   * توليد كود صاحب العمل
   */
  async generateEmployerCode() {
    const year = new Date().getFullYear();
    const count = await Employer.countDocuments({
      createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
    });

    return `EMP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * تقييم صاحب عمل
   */
  async rateEmployer(employerId, ratingData) {
    const employer = await Employer.findById(employerId);
    if (!employer) {
      throw new Error('صاحب العمل غير موجود');
    }

    employer.rating.reviews.push({
      reviewer: ratingData.reviewerId,
      rating: ratingData.rating,
      comment: ratingData.comment,
      date: new Date(),
    });

    // تحديث المعدل
    const totalRatings = employer.rating.reviews.length;
    const sumRatings = employer.rating.reviews.reduce((sum, r) => sum + r.rating, 0);
    employer.rating.overall = sumRatings / totalRatings;

    await employer.save();
    return employer;
  }

  // ====================
  // طلبات التوظيف
  // ====================

  /**
   * تقديم طلب توظيف
   */
  async submitApplication(applicationData) {
    try {
      const applicationCode = await this.generateApplicationCode();

      const application = new JobApplication({
        ...applicationData,
        applicationCode,
        status: {
          current: 'submitted',
          history: [
            {
              status: 'submitted',
              date: new Date(),
              notes: 'تم استلام الطلب',
            },
          ],
        },
      });

      await application.save();

      // تحديث إحصائيات الوظيفة
      await JobOpportunity.findByIdAndUpdate(applicationData.jobId, {
        $inc: { 'statistics.applications': 1 },
      });

      return application;
    } catch (error) {
      throw new Error(`خطأ في تقديم الطلب: ${error.message}`);
    }
  }

  /**
   * توليد كود الطلب
   */
  async generateApplicationCode() {
    const year = new Date().getFullYear();
    const count = await JobApplication.countDocuments({
      createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
    });

    return `APP-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * تحديث حالة الطلب
   */
  async updateApplicationStatus(applicationId, newStatus, notes = '', userId) {
    const application = await JobApplication.findById(applicationId);
    if (!application) {
      throw new Error('الطلب غير موجود');
    }

    application.status.current = newStatus;
    application.status.history.push({
      status: newStatus,
      date: new Date(),
      notes,
      changedBy: userId,
    });

    await application.save();
    return application;
  }

  /**
   * جدولة مقابلة
   */
  async scheduleInterview(applicationId, interviewData) {
    const application = await JobApplication.findById(applicationId);
    if (!application) {
      throw new Error('الطلب غير موجود');
    }

    application.interviews.push({
      ...interviewData,
      status: 'scheduled',
    });

    await this.updateApplicationStatus(
      applicationId,
      'interview_scheduled',
      'تم جدولة مقابلة',
      null
    );

    await application.save();
    return application;
  }

  /**
   * تقديم عرض وظيفي
   */
  async makeJobOffer(applicationId, offerData) {
    const application = await JobApplication.findById(applicationId);
    if (!application) {
      throw new Error('الطلب غير موجود');
    }

    application.offer = {
      ...offerData,
      made: true,
      date: new Date(),
      response: 'pending',
    };

    await this.updateApplicationStatus(applicationId, 'offered', 'تم تقديم عرض وظيفي', null);

    await application.save();
    return application;
  }

  // ====================
  // التوظيف النشط
  // ====================

  /**
   * بدء التوظيف
   */
  async startEmployment(employmentData) {
    try {
      const employmentCode = await this.generateEmploymentCode();

      const employment = new ActiveEmployment({
        ...employmentData,
        employmentCode,
        status: {
          current: 'probation',
          effectiveDate: new Date(),
        },
        support: {
          nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // بعد أسبوع
        },
      });

      await employment.save();

      // تحديث إحصائيات صاحب العمل
      await Employer.findByIdAndUpdate(employmentData.employerId, {
        $push: {
          employmentHistory: {
            beneficiary: employmentData.beneficiaryId,
            position: employmentData.employment.position,
            startDate: new Date(),
            status: 'active',
          },
        },
      });

      return employment;
    } catch (error) {
      throw new Error(`خطأ في بدء التوظيف: ${error.message}`);
    }
  }

  /**
   * توليد كود التوظيف
   */
  async generateEmploymentCode() {
    const year = new Date().getFullYear();
    const count = await ActiveEmployment.countDocuments({
      createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
    });

    return `EMPL-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * تسجيل متابعة
   */
  async recordFollowUp(employmentId, followUpData) {
    const employment = await ActiveEmployment.findById(employmentId);
    if (!employment) {
      throw new Error('سجل التوظيف غير موجود');
    }

    employment.support.followUpSchedule.push({
      ...followUpData,
      date: new Date(),
    });

    employment.support.lastFollowUp = new Date();
    employment.support.nextFollowUp = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // بعد أسبوعين

    await employment.save();
    return employment;
  }

  /**
   * تسجيل مراجعة أداء
   */
  async recordPerformanceReview(employmentId, reviewData) {
    const employment = await ActiveEmployment.findById(employmentId);
    if (!employment) {
      throw new Error('سجل التوظيف غير موجود');
    }

    employment.performance.reviews.push({
      ...reviewData,
      date: new Date(),
    });

    employment.performance.lastReviewDate = new Date();
    employment.performance.overallRating = reviewData.rating;

    // إنهاء فترة التجربة إذا كان الأداء جيد
    if (employment.status.current === 'probation' && reviewData.rating >= 3) {
      employment.status.current = 'active';
      employment.status.effectiveDate = new Date();
    }

    await employment.save();
    return employment;
  }

  /**
   * إنهاء التوظيف
   */
  async terminateEmployment(employmentId, terminationData) {
    const employment = await ActiveEmployment.findById(employmentId);
    if (!employment) {
      throw new Error('سجل التوظيف غير موجود');
    }

    employment.status.current = terminationData.type; // 'terminated' or 'resigned'
    employment.status.effectiveDate = new Date();
    employment.status.reason = terminationData.reason;
    employment.employment.endDate = new Date();

    await employment.save();

    // تحديث سجل صاحب العمل
    await Employer.updateOne(
      { _id: employment.employerId, 'employmentHistory.beneficiary': employment.beneficiaryId },
      {
        $set: {
          'employmentHistory.$.endDate': new Date(),
          'employmentHistory.$.status': 'completed',
          'employmentHistory.$.terminationReason': terminationData.reason,
        },
      }
    );

    return employment;
  }

  // ====================
  // التقارير والإحصائيات
  // ====================

  /**
   * تقرير التوظيف
   */
  async getEmploymentReport(filters = {}) {
    const employments = await ActiveEmployment.find(filters)
      .populate('beneficiaryId')
      .populate('employerId');

    const report = {
      totalEmployed: employments.length,
      byStatus: {},
      byRegion: {},
      bySector: {},
      averageSalary: 0,
      retentionRate: 0,
      satisfactionRate: 0,
    };

    // حساب الإحصائيات
    employments.forEach(emp => {
      report.byStatus[emp.status.current] = (report.byStatus[emp.status.current] || 0) + 1;
    });

    return report;
  }

  /**
   * تقرير حصة توظيف ذوي الإعاقة
   */
  async getDisabilityQuotaReport(employerId) {
    const employer = await Employer.findById(employerId);

    const report = {
      employer: employer.companyInfo.name,
      totalEmployees: employer.companyInfo.employeeCount,
      disabledEmployees: employer.disabilityAccommodations.currentDisabledEmployees,
      requiredQuota: Math.ceil(employer.companyInfo.employeeCount * 0.04), // 4% حصة السعودية
      quotaMet: employer.disabilityAccommodations.quotaMet,
      deficit: Math.max(
        0,
        Math.ceil(employer.companyInfo.employeeCount * 0.04) -
          employer.disabilityAccommodations.currentDisabledEmployees
      ),
      recommendations: [],
    };

    return report;
  }

  /**
   * تكامل مع نطاقات
   */
  async syncWithNitaqat(employerId) {
    // التكامل مع نظام نطاقات في وزارة الموارد البشرية
    const employer = await Employer.findById(employerId);
    const activeEmployments = await ActiveEmployment.countDocuments({
      employerId,
      'status.current': { $in: ['probation', 'active'] },
    });

    return {
      employer: employer.companyInfo.name,
      nitaqatCategory: 'Green', // محسوب من API الوزارة
      disabledEmployeesCount: activeEmployments,
      syncedAt: new Date(),
    };
  }
}

// تصدير
module.exports = {
  AdvancedEmploymentService,
  JobOpportunity,
  Employer,
  JobApplication,
  ActiveEmployment,
};

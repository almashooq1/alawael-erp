/**
 * نماذج منصة طاقات - توظيف ذوي الإعاقة
 * Taqat Platform Models - Employment for People with Disabilities
 *
 * التكامل مع منصة طاقات التابعة لصندوق تنمية الموارد البشرية (هدف)
 * Integration with Taqat platform under HRDF (Hadaf)
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ============================================================
// أنواع الإعاقة المعتمدة في طاقات
// ============================================================
const DISABILITY_TYPES = [
  'physical', // حركية
  'visual', // بصرية
  'hearing', // سمعية
  'intellectual', // ذهنية
  'autism', // توحد
  'learning', // صعوبات تعلم
  'speech', // نطق وتخاطب
  'multiple', // متعددة
  'psychiatric', // نفسية
  'other', // أخرى
];

// ============================================================
// نموذج المستفيد الباحث عن عمل
// Job Seeker (Beneficiary) Schema
// ============================================================
const TaqatJobSeekerSchema = new Schema(
  {
    // ربط بالمستفيد في النظام
    beneficiary: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      index: true,
    },

    // المعلومات الشخصية
    nationalId: { type: String, required: true, unique: true },
    fullName: {
      ar: { type: String, required: true },
      en: { type: String },
    },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female'] },
    nationality: { type: String, default: 'Saudi' },
    city: { type: String },
    region: { type: String },

    // معلومات الإعاقة
    disabilityType: {
      type: String,
      enum: DISABILITY_TYPES,
      required: true,
    },
    disabilityDegree: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'profound'],
      required: true,
    },
    disabilityCardNumber: { type: String },
    disabilityCardExpiry: { type: Date },
    functionalCapabilities: {
      mobility: { type: Number, min: 0, max: 100, default: 100 },
      vision: { type: Number, min: 0, max: 100, default: 100 },
      hearing: { type: Number, min: 0, max: 100, default: 100 },
      communication: { type: Number, min: 0, max: 100, default: 100 },
      cognitive: { type: Number, min: 0, max: 100, default: 100 },
      finemotor: { type: Number, min: 0, max: 100, default: 100 },
    },
    assistiveDevices: [{ type: String }],
    workplaceAccommodations: [{ type: String }],

    // المؤهلات
    education: {
      level: {
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
      specialization: String,
      institution: String,
      graduationYear: Number,
    },
    skills: [
      {
        name: { type: String, required: true },
        level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
        certified: { type: Boolean, default: false },
      },
    ],
    certifications: [
      {
        name: String,
        issuer: String,
        issueDate: Date,
        expiryDate: Date,
      },
    ],
    languages: [
      {
        language: String,
        proficiency: { type: String, enum: ['basic', 'intermediate', 'fluent', 'native'] },
      },
    ],
    trainingPrograms: [
      {
        name: String,
        provider: String,
        duration: String,
        completedAt: Date,
        certificate: Boolean,
      },
    ],

    // تفضيلات العمل
    preferredJobTypes: [{ type: String }],
    preferredSectors: [{ type: String }],
    preferredWorkHours: {
      type: String,
      enum: ['full_time', 'part_time', 'flexible', 'remote', 'hybrid'],
    },
    preferredCities: [{ type: String }],
    expectedSalary: {
      min: { type: Number },
      max: { type: Number },
    },
    willingToRelocate: { type: Boolean, default: false },
    needsTransportation: { type: Boolean, default: false },

    // حالة التسجيل في طاقات
    taqatRegistrationId: { type: String },
    taqatProfileStatus: {
      type: String,
      enum: ['draft', 'submitted', 'active', 'suspended', 'employed', 'withdrawn'],
      default: 'draft',
      index: true,
    },
    taqatLastSync: { type: Date },
    registeredAt: { type: Date },

    // تقييم الجاهزية الوظيفية
    employmentReadiness: {
      score: { type: Number, min: 0, max: 100 },
      assessedAt: { type: Date },
      assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      strengths: [String],
      areasForImprovement: [String],
      recommendedTraining: [String],
    },

    // حقول نظام
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'taqat_job_seekers',
  }
);

TaqatJobSeekerSchema.index({ disabilityType: 1, taqatProfileStatus: 1 });
TaqatJobSeekerSchema.index({ 'education.level': 1, city: 1 });

// ============================================================
// نموذج الفرصة الوظيفية
// Job Opportunity Schema
// ============================================================
const TaqatJobOpportunitySchema = new Schema(
  {
    // معلومات الوظيفة
    title: {
      ar: { type: String, required: true },
      en: { type: String },
    },
    description: {
      ar: { type: String, required: true },
      en: { type: String },
    },
    employer: {
      name: { type: String, required: true },
      commercialRegistration: String,
      sector: String,
      city: String,
      contactPerson: String,
      contactEmail: String,
      contactPhone: String,
    },

    // تفاصيل الوظيفة
    jobType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'internship', 'remote', 'cooperative'],
      required: true,
    },
    sector: { type: String },
    location: { type: String },
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'SAR' },
    },
    benefits: [{ type: String }],
    workHours: { type: String },
    contractDuration: { type: String },

    // متطلبات الوظيفة
    requiredEducation: {
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
    requiredExperience: { type: Number, min: 0, default: 0 },
    requiredSkills: [{ type: String }],
    requiredCertifications: [{ type: String }],

    // إمكانية الوصول والتكيف
    suitableDisabilityTypes: [{ type: String, enum: DISABILITY_TYPES }],
    accessibilityFeatures: [
      {
        type: String,
        enum: [
          'wheelchair_accessible',
          'elevator',
          'accessible_parking',
          'screen_reader_compatible',
          'sign_language_interpreter',
          'flexible_schedule',
          'remote_work_option',
          'assistive_technology',
          'accessible_restroom',
          'quiet_workspace',
          'ergonomic_furniture',
          'buddy_system',
          'job_coach',
          'modified_duties',
          'braille_materials',
        ],
      },
    ],
    accommodationsProvided: { type: String },
    supportServices: [{ type: String }],

    // دعم صندوق هدف
    hadafSupported: { type: Boolean, default: false },
    hadafSupportType: {
      type: String,
      enum: [
        'salary_support',
        'training_support',
        'accommodation_support',
        'transportation_support',
        'none',
      ],
    },
    hadafSupportPercentage: { type: Number, min: 0, max: 100 },
    hadafSupportDuration: { type: Number }, // بالأشهر

    // حالة الفرصة
    status: {
      type: String,
      enum: ['draft', 'published', 'closed', 'filled', 'cancelled', 'expired'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
    closingDate: { type: Date },
    vacancies: { type: Number, default: 1, min: 1 },
    applicationsCount: { type: Number, default: 0 },
    hiredCount: { type: Number, default: 0 },

    taqatJobId: { type: String },
    taqatSyncStatus: {
      type: String,
      enum: ['not_synced', 'synced', 'sync_error'],
      default: 'not_synced',
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'taqat_job_opportunities',
  }
);

TaqatJobOpportunitySchema.index({ status: 1, suitableDisabilityTypes: 1 });

// ============================================================
// نموذج التقديم على الوظيفة
// Job Application Schema
// ============================================================
const TaqatJobApplicationSchema = new Schema(
  {
    jobSeeker: {
      type: Schema.Types.ObjectId,
      ref: 'TaqatJobSeeker',
      required: true,
      index: true,
    },
    jobOpportunity: {
      type: Schema.Types.ObjectId,
      ref: 'TaqatJobOpportunity',
      required: true,
      index: true,
    },

    // حالة التقديم
    status: {
      type: String,
      enum: [
        'submitted',
        'under_review',
        'shortlisted',
        'interview_scheduled',
        'interviewed',
        'assessment',
        'offered',
        'accepted',
        'rejected',
        'withdrawn',
        'hired',
      ],
      default: 'submitted',
      index: true,
    },

    // ملاحظات المراجعة
    coverLetter: { type: String },
    matchScore: { type: Number, min: 0, max: 100 },
    reviewNotes: { type: String },
    rejectionReason: { type: String },

    // المقابلة
    interview: {
      scheduledDate: Date,
      type: { type: String, enum: ['in_person', 'phone', 'video'] },
      location: String,
      interviewerNotes: String,
      rating: { type: Number, min: 1, max: 5 },
      accommodationsNeeded: [String],
    },

    // العرض الوظيفي
    offer: {
      salary: Number,
      startDate: Date,
      contractType: String,
      benefits: [String],
      offerDate: Date,
      responseDeadline: Date,
      accepted: Boolean,
      responseDate: Date,
    },

    // المتابعة بعد التوظيف
    postHiring: {
      actualStartDate: Date,
      probationEndDate: Date,
      followUpDates: [Date],
      satisfactionRating: { type: Number, min: 1, max: 5 },
      retentionStatus: {
        type: String,
        enum: ['active', 'probation', 'confirmed', 'resigned', 'terminated'],
      },
      notes: String,
    },

    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'taqat_applications',
  }
);

TaqatJobApplicationSchema.index({ jobSeeker: 1, jobOpportunity: 1 }, { unique: true });

// ============================================================
// نموذج برنامج التدريب المنتهي بالتوظيف
// Training-to-Employment Program Schema
// ============================================================
const TaqatTrainingProgramSchema = new Schema(
  {
    name: {
      ar: { type: String, required: true },
      en: { type: String },
    },
    description: { type: String },
    provider: {
      name: String,
      licenseNumber: String,
      contactInfo: String,
    },

    // تفاصيل البرنامج
    programType: {
      type: String,
      enum: [
        'on_job_training',
        'classroom_training',
        'online_training',
        'blended',
        'cooperative',
        'vocational_rehab',
      ],
      required: true,
    },
    duration: { type: Number, required: true }, // بالأسابيع
    totalHours: { type: Number },
    targetDisabilityTypes: [{ type: String, enum: DISABILITY_TYPES }],
    prerequisites: [String],
    objectives: [String],
    skills: [String],

    // دعم هدف
    hadafFunded: { type: Boolean, default: false },
    fundingAmount: { type: Number },
    stipend: { type: Number }, // مكافأة شهرية للمتدرب

    // التسجيل
    maxParticipants: { type: Number },
    enrolledCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    employedAfterCount: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },

    status: {
      type: String,
      enum: ['planning', 'open', 'in_progress', 'completed', 'cancelled'],
      default: 'planning',
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'taqat_training_programs',
  }
);

// ============================================================
// نموذج إحصائيات التوظيف
// Employment Statistics Schema
// ============================================================
const TaqatEmploymentStatsSchema = new Schema(
  {
    period: { type: String, required: true }, // YYYY-MM or YYYY-Q1
    periodType: { type: String, enum: ['monthly', 'quarterly', 'annual'], required: true },
    establishmentId: { type: String },

    // إحصائيات عامة
    totalJobSeekers: { type: Number, default: 0 },
    activeJobSeekers: { type: Number, default: 0 },
    newRegistrations: { type: Number, default: 0 },
    totalApplications: { type: Number, default: 0 },
    totalInterviews: { type: Number, default: 0 },
    totalHired: { type: Number, default: 0 },
    employmentRate: { type: Number, min: 0, max: 100 },

    // تفصيل حسب نوع الإعاقة
    byDisabilityType: [
      {
        type: { type: String, enum: DISABILITY_TYPES },
        seekers: Number,
        applications: Number,
        hired: Number,
        rate: Number,
      },
    ],

    // تفصيل حسب القطاع
    bySector: [
      {
        sector: String,
        opportunities: Number,
        applications: Number,
        hired: Number,
      },
    ],

    // معدلات النجاح
    retentionRate3Months: { type: Number, min: 0, max: 100 },
    retentionRate6Months: { type: Number, min: 0, max: 100 },
    retentionRate12Months: { type: Number, min: 0, max: 100 },
    averageSalary: { type: Number },
    satisfactionScore: { type: Number, min: 0, max: 5 },

    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'taqat_employment_stats',
  }
);

TaqatEmploymentStatsSchema.index({ period: 1, periodType: 1 }, { unique: true });

// ============================================================
// التصدير
// ============================================================
const TaqatJobSeeker = mongoose.models.TaqatJobSeeker || mongoose.model('TaqatJobSeeker', TaqatJobSeekerSchema);
const TaqatJobOpportunity = mongoose.models.TaqatJobOpportunity || mongoose.model('TaqatJobOpportunity', TaqatJobOpportunitySchema);
const TaqatJobApplication = mongoose.models.TaqatJobApplication || mongoose.model('TaqatJobApplication', TaqatJobApplicationSchema);
const TaqatTrainingProgram = mongoose.models.TaqatTrainingProgram || mongoose.model('TaqatTrainingProgram', TaqatTrainingProgramSchema);
const TaqatEmploymentStats = mongoose.models.TaqatEmploymentStats || mongoose.model('TaqatEmploymentStats', TaqatEmploymentStatsSchema);

module.exports = {
  TaqatJobSeeker,
  TaqatJobOpportunity,
  TaqatJobApplication,
  TaqatTrainingProgram,
  TaqatEmploymentStats,
  DISABILITY_TYPES,
};

/**
 * Disability Rehabilitation Program Model
 * نموذج برنامج تأهيل ذوي الإعاقة
 *
 * @module models/disability-rehabilitation
 * @description نظام شامل لإدارة برامج تأهيل ذوي الإعاقة
 * @version 1.0.0
 * @date 2026-01-19
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Disability Types Schema
 * أنواع الإعاقة
 */
const disabilityTypes = {
  PHYSICAL: 'physical', // إعاقة حركية
  VISUAL: 'visual', // إعاقة بصرية
  HEARING: 'hearing', // إعاقة سمعية
  INTELLECTUAL: 'intellectual', // إعاقة ذهنية
  AUTISM: 'autism', // اضطراب طيف التوحد
  LEARNING: 'learning', // صعوبات تعلم
  MULTIPLE: 'multiple', // إعاقة متعددة
  SPEECH: 'speech', // إعاقة نطق ولغة
  BEHAVIORAL: 'behavioral', // اضطرابات سلوكية
  DEVELOPMENTAL: 'developmental', // تأخر نمائي
};

/**
 * Rehabilitation Program Schema
 * مخطط برنامج التأهيل
 */
const rehabilitationProgramSchema = new Schema(
  {
    // معلومات البرنامج الأساسية
    program_id: {
      type: String,
      required: true,
      unique: true,
      default: () => `REHAB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },

    program_name_ar: {
      type: String,
      required: true,
    },

    program_name_en: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    // معلومات المستفيد
    beneficiary: {
      beneficiary_id: {
        type: Schema.Types.ObjectId,
        ref: 'Beneficiary',
        required: true,
      },
      national_id: { type: String, required: true },
      full_name_ar: { type: String, required: true },
      full_name_en: { type: String },
      date_of_birth: { type: Date, required: true },
      age: { type: Number },
      gender: { type: String, enum: ['male', 'female'], required: true },
      contact_number: { type: String },
      guardian_name: { type: String },
      guardian_phone: { type: String },
    },

    // نوع الإعاقة وتفاصيلها
    disability_info: {
      primary_disability: {
        type: String,
        enum: Object.values(disabilityTypes),
        required: true,
      },
      secondary_disabilities: [
        {
          type: String,
          enum: Object.values(disabilityTypes),
        },
      ],
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'profound'],
        required: true,
        default: 'moderate',
      },
      diagnosis_date: { type: Date },
      diagnosis_details: { type: String },
      medical_reports: [
        {
          report_date: Date,
          report_type: String,
          summary: String,
          file_url: String,
        },
      ],
    },

    // أهداف التأهيل
    rehabilitation_goals: [
      {
        goal_id: { type: String, default: () => `GOAL-${Date.now()}` },
        goal_type: {
          type: String,
          enum: ['short_term', 'long_term', 'immediate'],
          required: true,
        },
        category: {
          type: String,
          enum: [
            'mobility', // الحركة
            'self_care', // العناية الذاتية
            'communication', // التواصل
            'social_skills', // المهارات الاجتماعية
            'academic', // أكاديمي
            'vocational', // مهني
            'behavioral', // سلوكي
            'cognitive', // معرفي
            'sensory', // حسي
            'independence', // الاستقلالية
          ],
          required: true,
        },
        description_ar: { type: String, required: true },
        description_en: { type: String },
        target_date: { type: Date, required: true },
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          default: 'medium',
        },
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'achieved', 'partially_achieved', 'not_achieved'],
          default: 'not_started',
        },
        progress_percentage: { type: Number, default: 0, min: 0, max: 100 },
        evaluation_notes: [{ note: String, date: Date, evaluator: String }],
      },
    ],

    // الخدمات التأهيلية
    rehabilitation_services: [
      {
        service_id: { type: String, default: () => `SRV-${Date.now()}` },
        service_type: {
          type: String,
          enum: [
            'physical_therapy', // علاج طبيعي
            'occupational_therapy', // علاج وظيفي
            'speech_therapy', // علاج نطق ولغة
            'behavioral_therapy', // علاج سلوكي
            'special_education', // تربية خاصة
            'psychological_support', // دعم نفسي
            'social_work', // خدمة اجتماعية
            'vocational_training', // تدريب مهني
            'assistive_technology', // تقنيات مساعدة
            'family_counseling', // إرشاد أسري
          ],
          required: true,
        },
        service_name_ar: { type: String, required: true },
        service_name_en: { type: String },
        provider: {
          therapist_id: { type: Schema.Types.ObjectId, ref: 'User' },
          therapist_name: String,
          specialization: String,
          license_number: String,
        },
        schedule: {
          frequency: { type: String, enum: ['daily', 'weekly', 'bi-weekly', 'monthly'] },
          sessions_per_week: Number,
          session_duration: Number, // بالدقائق
          start_date: Date,
          end_date: Date,
          days_of_week: [
            {
              type: String,
              enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            },
          ],
          time_slots: [{ start_time: String, end_time: String }],
        },
        sessions_completed: { type: Number, default: 0 },
        total_sessions_planned: { type: Number },
        status: {
          type: String,
          enum: ['active', 'completed', 'suspended', 'cancelled'],
          default: 'active',
        },
      },
    ],

    // جلسات التأهيل
    sessions: [
      {
        session_id: { type: String, default: () => `SES-${Date.now()}` },
        service_id: String,
        session_number: Number,
        session_date: { type: Date, required: true },
        duration: Number, // بالدقائق
        therapist: {
          therapist_id: { type: Schema.Types.ObjectId, ref: 'User' },
          name: String,
        },
        attendance_status: {
          type: String,
          enum: ['attended', 'absent', 'cancelled', 'rescheduled'],
          default: 'attended',
        },
        session_goals: [String],
        activities_performed: [String],
        progress_notes: String,
        behavioral_observations: String,
        family_involvement: {
          family_present: Boolean,
          family_participation: String,
        },
        home_exercises_assigned: [String],
        next_session_plan: String,
        therapist_signature: String,
        attachments: [
          {
            type: String,
            url: String,
            description: String,
          },
        ],
      },
    ],

    // التقييمات الدورية
    assessments: [
      {
        assessment_id: { type: String, default: () => `ASSESS-${Date.now()}` },
        assessment_type: {
          type: String,
          enum: ['initial', 'progress', 'mid_term', 'final', 're_assessment'],
        },
        assessment_date: { type: Date, required: true },
        assessor: {
          assessor_id: { type: Schema.Types.ObjectId, ref: 'User' },
          name: String,
          title: String,
        },
        assessment_tools: [String],
        domains_assessed: [
          {
            domain: String,
            score: Number,
            interpretation: String,
          },
        ],
        overall_score: Number,
        strengths: [String],
        areas_of_concern: [String],
        recommendations: [String],
        comparison_with_previous: String,
        report_url: String,
      },
    ],

    // التقدم والإنجازات
    progress_tracking: {
      overall_progress: { type: Number, default: 0, min: 0, max: 100 },
      last_evaluation_date: Date,
      milestones_achieved: [
        {
          milestone: String,
          date_achieved: Date,
          description: String,
        },
      ],
      challenges_faced: [
        {
          challenge: String,
          date_identified: Date,
          resolution: String,
          status: { type: String, enum: ['ongoing', 'resolved', 'escalated'] },
        },
      ],
    },

    // إشراك الأسرة
    family_involvement: {
      primary_contact: {
        name: String,
        relationship: String,
        phone: String,
        email: String,
      },
      family_training_sessions: [
        {
          session_date: Date,
          topics_covered: [String],
          attendees: [String],
          feedback: String,
        },
      ],
      home_program_compliance: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'not_applicable'],
      },
      family_satisfaction: {
        rating: { type: Number, min: 1, max: 5 },
        comments: String,
        date: Date,
      },
    },

    // الأجهزة والمعدات المساعدة
    assistive_devices: [
      {
        device_name: String,
        device_type: String,
        date_provided: Date,
        provider: String,
        training_provided: Boolean,
        effectiveness: {
          type: String,
          enum: ['very_effective', 'effective', 'somewhat_effective', 'not_effective'],
        },
        maintenance_schedule: [Date],
        notes: String,
      },
    ],

    // التعديلات البيئية
    environmental_modifications: [
      {
        modification_type: String,
        location: String,
        date_implemented: Date,
        description: String,
        effectiveness: String,
      },
    ],

    // حالة البرنامج
    program_status: {
      type: String,
      enum: ['active', 'completed', 'suspended', 'discontinued', 'transferred'],
      default: 'active',
      required: true,
    },

    start_date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expected_end_date: Date,
    actual_end_date: Date,

    // التحويلات
    referrals: [
      {
        referral_date: Date,
        referred_to: String,
        service_type: String,
        reason: String,
        status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'] },
      },
    ],

    // الملاحظات والتوصيات
    notes: [
      {
        note_date: { type: Date, default: Date.now },
        note_type: { type: String, enum: ['general', 'medical', 'behavioral', 'administrative'] },
        content: String,
        author: {
          user_id: { type: Schema.Types.ObjectId, ref: 'User' },
          name: String,
        },
        is_confidential: { type: Boolean, default: false },
      },
    ],

    // معلومات مالية
    financial_info: {
      funding_source: {
        type: String,
        enum: ['government', 'insurance', 'private', 'charity', 'mixed'],
      },
      total_cost: Number,
      amount_covered: Number,
      amount_paid: Number,
      outstanding_balance: Number,
      payment_status: { type: String, enum: ['paid', 'partially_paid', 'unpaid', 'waived'] },
    },

    // معلومات التدقيق
    audit_trail: [
      {
        action: String,
        performed_by: {
          user_id: { type: Schema.Types.ObjectId, ref: 'User' },
          name: String,
        },
        timestamp: { type: Date, default: Date.now },
        changes: Schema.Types.Mixed,
      },
    ],

    // الحالة النشطة
    is_active: {
      type: Boolean,
      default: true,
    },

    created_by: {
      user_id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
    },

    updated_by: {
      user_id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
    },
  },
  {
    timestamps: true,
    collection: 'disability_rehabilitation_programs',
  }
);

// ============================================
// INDEXES للأداء
// ============================================
// Note: program_id already has unique:true (creates automatic index)
rehabilitationProgramSchema.index({ 'beneficiary.beneficiary_id': 1 });
rehabilitationProgramSchema.index({ 'beneficiary.national_id': 1 });
rehabilitationProgramSchema.index({ 'disability_info.primary_disability': 1 });
rehabilitationProgramSchema.index({ program_status: 1 });
rehabilitationProgramSchema.index({ start_date: -1 });
rehabilitationProgramSchema.index({ is_active: 1 });
rehabilitationProgramSchema.index({ createdAt: -1 });

// Compound indexes
rehabilitationProgramSchema.index({ program_status: 1, is_active: 1 });
rehabilitationProgramSchema.index({ 'disability_info.primary_disability': 1, program_status: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================
rehabilitationProgramSchema.virtual('duration_in_days').get(function () {
  if (this.actual_end_date) {
    return Math.floor((this.actual_end_date - this.start_date) / (1000 * 60 * 60 * 24));
  }
  return Math.floor((Date.now() - this.start_date) / (1000 * 60 * 60 * 24));
});

rehabilitationProgramSchema.virtual('completion_rate').get(function () {
  const totalGoals = this.rehabilitation_goals.length;
  if (totalGoals === 0) return 0;

  const achievedGoals = this.rehabilitation_goals.filter(
    goal => goal.status === 'achieved' || goal.status === 'partially_achieved'
  ).length;

  return Math.round((achievedGoals / totalGoals) * 100);
});

// ============================================
// METHODS
// ============================================

/**
 * حساب معدل الحضور
 */
rehabilitationProgramSchema.methods.calculateAttendanceRate = function () {
  const totalSessions = this.sessions.length;
  if (totalSessions === 0) return 0;

  const attendedSessions = this.sessions.filter(
    session => session.attendance_status === 'attended'
  ).length;

  return Math.round((attendedSessions / totalSessions) * 100);
};

/**
 * الحصول على الخدمات النشطة
 */
rehabilitationProgramSchema.methods.getActiveServices = function () {
  return this.rehabilitation_services.filter(service => service.status === 'active');
};

/**
 * إضافة جلسة جديدة
 */
rehabilitationProgramSchema.methods.addSession = async function (sessionData) {
  this.sessions.push(sessionData);

  // تحديث عدد الجلسات المكتملة
  const service = this.rehabilitation_services.find(s => s.service_id === sessionData.service_id);
  if (service && sessionData.attendance_status === 'attended') {
    service.sessions_completed += 1;
  }

  return this.save();
};

/**
 * تحديث حالة الهدف
 */
rehabilitationProgramSchema.methods.updateGoalStatus = async function (goalId, status, progress) {
  const goal = this.rehabilitation_goals.find(g => g.goal_id === goalId);
  if (goal) {
    goal.status = status;
    if (progress !== undefined) {
      goal.progress_percentage = progress;
    }
    return this.save();
  }
  throw new Error('Goal not found');
};

/**
 * إضافة تقييم
 */
rehabilitationProgramSchema.methods.addAssessment = async function (assessmentData) {
  this.assessments.push(assessmentData);
  this.progress_tracking.last_evaluation_date = assessmentData.assessment_date;

  return this.save();
};

/**
 * إنهاء البرنامج
 */
rehabilitationProgramSchema.methods.completeProgram = async function (completionNotes) {
  this.program_status = 'completed';
  this.actual_end_date = new Date();
  this.is_active = false;

  if (completionNotes) {
    this.notes.push({
      note_type: 'general',
      content: `Program completed: ${completionNotes}`,
      note_date: new Date(),
    });
  }

  return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * إحصائيات البرامج حسب نوع الإعاقة
 */
rehabilitationProgramSchema.statics.getStatsByDisability = async function () {
  return this.aggregate([
    { $match: { is_active: true } },
    {
      $group: {
        _id: '$disability_info.primary_disability',
        count: { $sum: 1 },
        active_programs: {
          $sum: { $cond: [{ $eq: ['$program_status', 'active'] }, 1, 0] },
        },
        completed_programs: {
          $sum: { $cond: [{ $eq: ['$program_status', 'completed'] }, 1, 0] },
        },
        avg_progress: { $avg: '$progress_tracking.overall_progress' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

/**
 * البرامج النشطة للمستفيد
 */
rehabilitationProgramSchema.statics.getActiveProgramsForBeneficiary = async function (
  beneficiaryId
) {
  return this.find({
    'beneficiary.beneficiary_id': beneficiaryId,
    program_status: 'active',
    is_active: true,
  }).sort({ createdAt: -1 });
};

/**
 * تقرير الأداء الشهري
 */
rehabilitationProgramSchema.statics.getMonthlyPerformanceReport = async function (year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        is_active: true,
      },
    },
    {
      $group: {
        _id: null,
        total_programs: { $sum: 1 },
        new_programs: { $sum: 1 },
        completed_programs: {
          $sum: { $cond: [{ $eq: ['$program_status', 'completed'] }, 1, 0] },
        },
        avg_progress: { $avg: '$progress_tracking.overall_progress' },
        total_sessions: { $sum: { $size: '$sessions' } },
      },
    },
  ]);
};

// ============================================
// MIDDLEWARE
// ============================================

// Before save
rehabilitationProgramSchema.pre('save', function (next) {
  // حساب العمر من تاريخ الميلاد
  if (this.beneficiary.date_of_birth) {
    const ageDiff = Date.now() - this.beneficiary.date_of_birth.getTime();
    this.beneficiary.age = Math.floor(ageDiff / (365.25 * 24 * 60 * 60 * 1000));
  }

  // حساب التقدم الكلي
  if (this.rehabilitation_goals.length > 0) {
    const totalProgress = this.rehabilitation_goals.reduce(
      (sum, goal) => sum + (goal.progress_percentage || 0),
      0
    );
    this.progress_tracking.overall_progress = Math.round(
      totalProgress / this.rehabilitation_goals.length
    );
  }

  next();
});

// ============================================
// MODEL EXPORT
// ============================================
const DisabilityRehabilitation = mongoose.model(
  'DisabilityRehabilitation',
  rehabilitationProgramSchema
);

module.exports = DisabilityRehabilitation;

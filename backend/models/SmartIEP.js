/**
 * SmartIEP.js
 * نموذج الخطة التعليمية الفردية الذكية (IEP/IFSP)
 * مع بنك الأهداف الذكي ومحرك SMART Goals
 */

'use strict';

const mongoose = require('mongoose');

// ══════════════════════════════════════════════════════════════
// 1. بنك الأهداف التأهيلية (Goals Bank)
// ══════════════════════════════════════════════════════════════
const goalsBankSchema = new mongoose.Schema(
  {
    goal_code: { type: String, unique: true, required: true }, // e.g. "COMM-EXP-001"
    domain: {
      type: String,
      enum: [
        'communication',
        'daily_living',
        'socialization',
        'motor_gross',
        'motor_fine',
        'cognitive',
        'behavioral',
        'self_care',
        'vocational',
        'academic',
        'sensory',
        'play',
        'emotional',
      ],
      required: true,
    },
    subdomain: { type: String }, // e.g. "expressive_language", "receptive_language"
    disability_types: [
      {
        type: String,
        enum: [
          'autism',
          'intellectual_disability',
          'cerebral_palsy',
          'down_syndrome',
          'speech_language',
          'hearing_impairment',
          'visual_impairment',
          'learning_disability',
          'adhd',
          'multiple_disabilities',
          'all',
        ],
      },
    ],
    performance_level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
    },
    age_range: {
      min_months: { type: Number, default: 0 },
      max_months: { type: Number, default: 216 }, // 18 years
    },

    // ── الهدف بصياغة SMART
    goal_ar: { type: String, required: true }, // الهدف الكامل بالعربية
    goal_short_ar: { type: String }, // صياغة مختصرة
    goal_en: { type: String },

    // ── مكونات SMART
    smart_components: {
      specific: { type: String }, // محدد
      measurable: { type: String }, // قابل للقياس
      achievable: { type: String }, // قابل للتحقيق
      relevant: { type: String }, // ذو صلة
      time_bound: { type: String }, // محدد زمنياً
    },

    // ── معايير الإتقان
    mastery_criteria: {
      accuracy_percentage: { type: Number, default: 80 }, // نسبة الدقة المطلوبة
      consecutive_sessions: { type: Number, default: 3 }, // عدد الجلسات المتتالية
      measurement_method: { type: String }, // طريقة القياس
      measurement_tool: { type: String }, // أداة القياس
    },

    // ── الاستراتيجيات والأنشطة المقترحة
    intervention_strategies: [
      {
        strategy_name_ar: String,
        approach: {
          type: String,
          enum: [
            'ABA',
            'PECS',
            'TEACCH',
            'DIR_Floortime',
            'PRT',
            'SI',
            'CBT',
            'NATURALISTIC',
            'OTHER',
          ],
        },
        description_ar: String,
        materials: [String],
        steps: [String],
      },
    ],

    // ── أنشطة منزلية للأسرة
    home_activities: [
      {
        activity_ar: String,
        frequency: String, // e.g. "مرتين يومياً"
        materials_needed: [String],
        instructions_ar: String,
      },
    ],

    // ── الأهداف الفرعية (Objectives/Short-term goals)
    sub_objectives: [
      {
        objective_ar: String,
        sequence_order: Number,
        mastery_criteria: String,
      },
    ],

    // ── الصلة بـ ICF
    icf_codes: [{ type: String }], // e.g. ["d330", "d335"]

    // ── مصدر الهدف
    source: {
      type: String,
      enum: ['evidence_based', 'clinical', 'adapted', 'custom'],
      default: 'evidence_based',
    },
    evidence_reference: { type: String }, // المرجع العلمي

    // ── إحصائيات الاستخدام
    usage_count: { type: Number, default: 0 },
    success_rate: { type: Number, default: 0 }, // نسبة المستفيدين الذين حققوا الهدف
    average_weeks_to_achieve: { type: Number }, // متوسط الأسابيع للتحقيق

    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
    collection: 'goals_bank',
  }
);

goalsBankSchema.index({ domain: 1, disability_types: 1, performance_level: 1 });
goalsBankSchema.index({ goal_code: 1 }, { unique: true });
goalsBankSchema.index({ tags: 1 });

// ══════════════════════════════════════════════════════════════
// 2. الخطة التعليمية الفردية الذكية (Smart IEP)
// ══════════════════════════════════════════════════════════════

// هدف IEP (SMART Goal)
const iepGoalSchema = new mongoose.Schema(
  {
    goal_bank_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'GoalsBank' },
    goal_code: { type: String }, // للمرجعية
    domain: {
      type: String,
      enum: [
        'communication',
        'daily_living',
        'socialization',
        'motor_gross',
        'motor_fine',
        'cognitive',
        'behavioral',
        'self_care',
        'vocational',
        'academic',
        'sensory',
        'play',
        'emotional',
      ],
      required: true,
    },
    goal_ar: { type: String, required: true },
    icf_codes: [{ type: String }],

    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    priority_rationale_ar: { type: String }, // سبب الأولوية

    // ── الأهداف الفرعية
    objectives: [
      {
        objective_ar: { type: String, required: true },
        sequence_order: { type: Number },
        target_date: { type: Date },
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'achieved', 'discontinued'],
          default: 'not_started',
        },
        mastery_criteria: {
          accuracy_percentage: { type: Number, default: 80 },
          consecutive_sessions: { type: Number, default: 3 },
        },
        achievement_date: { type: Date },
        achievement_notes: { type: String },
      },
    ],

    // ── الجدول الزمني
    start_date: { type: Date, required: true },
    target_date: { type: Date, required: true }, // تاريخ التحقيق المستهدف
    review_date: { type: Date }, // تاريخ المراجعة الدورية

    // ── المعالج المسؤول
    responsible_therapist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responsible_therapist_type: {
      type: String,
      enum: ['special_ed', 'speech', 'ot', 'pt', 'psychology', 'social_work', 'behavior_analyst'],
    },

    // ── التقدم والقياس
    current_status: {
      type: String,
      enum: ['not_started', 'in_progress', 'achieved', 'discontinued', 'on_hold'],
      default: 'not_started',
    },
    progress_percentage: { type: Number, default: 0, min: 0, max: 100 },
    baseline_data: { type: String }, // بيانات خط الأساس
    current_performance: { type: String }, // الأداء الحالي

    // ── سجل التقدم
    progress_log: [
      {
        log_date: { type: Date, default: Date.now },
        session_number: { type: Number },
        performance_data: { type: String }, // e.g. "4/5 محاولات صحيحة"
        accuracy_percentage: { type: Number },
        therapist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: { type: String },
        next_session_plan: { type: String },
      },
    ],

    // ── نظام الإنذار المبكر للهدف
    alerts: {
      plateau_detected: { type: Boolean, default: false }, // ثبات بدون تحسن
      plateau_weeks: { type: Number, default: 0 },
      regression_detected: { type: Boolean, default: false }, // تراجع
      last_alert_date: { type: Date },
      alert_message_ar: { type: String },
    },

    // ── تعديل الهدف
    modifications_history: [
      {
        modification_date: { type: Date },
        modified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        original_goal: { type: String },
        new_goal: { type: String },
        reason_ar: { type: String },
      },
    ],

    // ── استراتيجيات التدخل المستخدمة فعلياً
    strategies_used: [
      {
        strategy_name_ar: String,
        approach: String,
        effectiveness_rating: { type: Number, min: 1, max: 5 },
      },
    ],
  },
  { _id: true }
);

// الخطة التعليمية الفردية الرئيسية
const smartIEPSchema = new mongoose.Schema(
  {
    iep_number: { type: String, unique: true }, // رقم تسلسلي
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    // ── معلومات الخطة
    plan_type: {
      type: String,
      enum: ['IEP', 'IFSP', 'transition', 'behavior_support'],
      default: 'IEP',
    },
    plan_period: {
      start_date: { type: Date, required: true },
      end_date: { type: Date, required: true }, // عادةً سنة
    },
    review_schedule: {
      quarterly_review_1: { type: Date },
      quarterly_review_2: { type: Date },
      quarterly_review_3: { type: Date },
      annual_review: { type: Date },
    },

    // ── ملخص الوضع الحالي (Present Level of Performance - PLOP)
    present_level: {
      academic_performance_ar: { type: String },
      functional_performance_ar: { type: String },
      strengths_ar: [{ type: String }],
      areas_of_need_ar: [{ type: String }],
      impact_of_disability_ar: { type: String },
      assessment_summary_ar: { type: String },
    },

    // ── بيانات التقييم المرتبطة
    linked_assessments: {
      vabs3_id: { type: mongoose.Schema.Types.ObjectId, ref: 'VABSAssessment' },
      cars2_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CARS2Assessment' },
      pep3_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PEP3Assessment' },
      icf_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ICFAssessment' },
    },

    // ── الأهداف السنوية
    annual_goals: [iepGoalSchema],

    // ── تحليل الذكاء الاصطناعي للخطة
    ai_analysis: {
      goals_alignment_score: { type: Number, min: 0, max: 100 }, // تناسق الأهداف مع التقييم
      suggested_adjustments: [{ type: String }],
      predicted_success_rate: { type: Number }, // احتمالية النجاح المتوقعة
      risk_factors: [{ type: String }],
      last_analysis_date: { type: Date },
    },

    // ── الخدمات التأهيلية
    services: [
      {
        service_type: {
          type: String,
          enum: [
            'special_education',
            'speech_therapy',
            'ot',
            'pt',
            'psychology',
            'social_work',
            'behavior_analysis',
            'aac',
            'feeding_therapy',
          ],
        },
        service_name_ar: { type: String },
        frequency: { type: String }, // e.g. "3 مرات/أسبوع"
        duration_minutes: { type: Number }, // مدة كل جلسة
        setting: {
          type: String,
          enum: ['individual', 'small_group', 'large_group', 'home', 'community'],
          default: 'individual',
        },
        provider_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        start_date: { type: Date },
        end_date: { type: Date },
      },
    ],

    // ── مشاركة الأسرة
    family_involvement: {
      parent_concerns_ar: [{ type: String }],
      parent_strengths_identified_ar: [{ type: String }],
      parent_participation_level: {
        type: String,
        enum: ['full', 'partial', 'minimal', 'declined'],
        default: 'partial',
      },
      home_program_agreed: { type: Boolean, default: false },
      family_training_needed: [{ type: String }],
    },

    // ── موافقة ولي الأمر
    parent_consent: {
      consent_given: { type: Boolean, default: false },
      consent_date: { type: Date },
      guardian_name: { type: String },
      guardian_signature_id: { type: String }, // رابط التوقيع الرقمي
      consent_notes: { type: String },
    },

    // ── فريق الـ IEP
    iep_team: [
      {
        member_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: [
            'special_ed_teacher',
            'speech_therapist',
            'ot',
            'pt',
            'psychologist',
            'social_worker',
            'parent',
            'admin',
            'behavior_analyst',
            'other',
          ],
        },
        role_ar: { type: String },
        attended_meeting: { type: Boolean, default: false },
      },
    ],

    // ── اجتماعات IEP
    meetings: [
      {
        meeting_date: { type: Date },
        meeting_type: {
          type: String,
          enum: ['initial', 'quarterly_review', 'annual_review', 'emergency', 'transition'],
        },
        attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        decisions_made_ar: [{ type: String }],
        next_meeting_date: { type: Date },
        minutes_doc_url: { type: String },
      },
    ],

    // ── الحالة والموافقة
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'active', 'under_review', 'completed', 'discontinued'],
      default: 'draft',
    },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approval_date: { type: Date },

    // ── ملخص التقدم الإجمالي
    overall_progress: {
      goals_total: { type: Number, default: 0 },
      goals_achieved: { type: Number, default: 0 },
      goals_in_progress: { type: Number, default: 0 },
      overall_percentage: { type: Number, default: 0 },
      last_review_date: { type: Date },
      next_review_date: { type: Date },
    },

    notes: { type: String },
    version: { type: Number, default: 1 },
    previous_iep_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SmartIEP' },
  },
  {
    timestamps: true,
    collection: 'smart_ieps',
  }
);

// Indexes
smartIEPSchema.index({ beneficiary_id: 1, 'plan_period.start_date': -1 });
smartIEPSchema.index({ branch_id: 1, status: 1 });
smartIEPSchema.index({ 'annual_goals.current_status': 1 });
smartIEPSchema.pre('save', async function (next) {
  if (!this.iep_number) {
    const count = await this.constructor.countDocuments();
    this.iep_number = `IEP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ══════════════════════════════════════════════════════════════
// 3. سجل جلسات التأهيل الذكي (Smart Session Log)
// ══════════════════════════════════════════════════════════════
const sessionLogSchema = new mongoose.Schema(
  {
    iep_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SmartIEP', required: true },
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    therapist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    session_date: { type: Date, default: Date.now },
    session_number: { type: Number },
    duration_minutes: { type: Number },
    session_type: {
      type: String,
      enum: ['individual', 'small_group', 'large_group', 'home_visit', 'tele_therapy'],
      default: 'individual',
    },

    // ── الأهداف العاملة في هذه الجلسة
    goals_worked: [
      {
        goal_id: { type: mongoose.Schema.Types.ObjectId },
        goal_ar: { type: String },
        trials_correct: { type: Number, default: 0 },
        trials_total: { type: Number, default: 0 },
        accuracy_percentage: { type: Number },
        prompt_level: {
          type: String,
          enum: ['independent', 'gestural', 'verbal', 'partial_physical', 'full_physical'],
        },
        reinforcement_used: { type: String },
        observations: { type: String },
      },
    ],

    // ── سجل ABC للسلوك (Antecedent-Behavior-Consequence)
    abc_records: [
      {
        time: { type: String },
        antecedent_ar: { type: String }, // ما حدث قبل السلوك
        behavior_ar: { type: String }, // وصف السلوك
        behavior_type: {
          type: String,
          enum: [
            'aggression',
            'self_injury',
            'tantrum',
            'elopement',
            'stereotypy',
            'refusal',
            'positive',
            'other',
          ],
        },
        consequence_ar: { type: String }, // ما حدث بعد السلوك
        frequency: { type: Number, default: 1 },
        duration_seconds: { type: Number },
        intensity: { type: String, enum: ['mild', 'moderate', 'severe'] },
      },
    ],

    // ── الحالة العامة للمستفيد في الجلسة
    beneficiary_state: {
      attention_level: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      mood: { type: String, enum: ['happy', 'calm', 'anxious', 'irritable', 'sad', 'hyperactive'] },
      cooperation: { type: String, enum: ['full', 'partial', 'minimal', 'refused'] },
      fatigue_level: { type: String, enum: ['energetic', 'normal', 'tired', 'very_tired'] },
      health_notes: { type: String },
    },

    // ── ملاحظات الجلسة
    session_summary_ar: { type: String },
    next_session_plan_ar: { type: String },
    family_communication_ar: { type: String }, // رسالة لولي الأمر

    // ── إرفاق الوسائط
    attachments: [
      {
        type: { type: String, enum: ['image', 'video', 'audio', 'document'] },
        url: { type: String },
        description_ar: { type: String },
      },
    ],

    status: { type: String, enum: ['draft', 'completed'], default: 'completed' },
  },
  {
    timestamps: true,
    collection: 'session_logs',
  }
);

sessionLogSchema.index({ beneficiary_id: 1, session_date: -1 });
sessionLogSchema.index({ iep_id: 1, session_date: -1 });
sessionLogSchema.index({ therapist_id: 1, session_date: -1 });

// ══════════════════════════════════════════════════════════════
// Exports
// ══════════════════════════════════════════════════════════════
const GoalsBank = mongoose.model('GoalsBank', goalsBankSchema);
const SmartIEP = mongoose.model('SmartIEP', smartIEPSchema);
const SessionLog = mongoose.model('SessionLog', sessionLogSchema);

module.exports = { GoalsBank, SmartIEP, SessionLog };

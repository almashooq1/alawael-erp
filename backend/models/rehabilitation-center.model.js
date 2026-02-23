/**
 * Rehabilitation Center Comprehensive Management System
 * نظام إدارة مراكز التأهيل الشامل
 *
 * @module models/rehabilitation-center
 * @description أنظمة متكاملة لمراكز تأهيل ذوي الإعاقة
 * @version 2.0.0
 * @date 2026-02-21
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============================================
// 1. نظام التقييم والتشخيص المتقدم
// Advanced Assessment and Diagnosis System
// ============================================

const assessmentToolSchema = new Schema({
  tool_id: {
    type: String,
    unique: true,
    default: () => `TOOL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  name_ar: { type: String, required: true },
  name_en: { type: String },
  description: { type: String },
  category: {
    type: String,
    enum: [
      'cognitive',      // معرفي
      'behavioral',     // سلوكي
      'motor',          // حركي
      'sensory',        // حسي
      'communication',  // تواصلي
      'social',         // اجتماعي
      'adaptive',       // تكيفي
      'academic',       // أكاديمي
      'vocational',     // مهني
      'developmental'   // نمائي
    ],
    required: true
  },
  target_disabilities: [{
    type: String,
    enum: ['physical', 'visual', 'hearing', 'intellectual', 'autism', 'learning', 'multiple', 'speech', 'behavioral', 'developmental']
  }],
  age_range: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 99 }
  },
  administration_time: { type: Number }, // بالدقائق
  materials_needed: [String],
  scoring_method: {
    type: String,
    enum: ['standardized', 'criterion_referenced', 'norm_referenced', 'curriculum_based', 'observational']
  },
  standardization_info: {
    standardized: { type: Boolean, default: false },
    population: String,
    sample_size: Number,
    reliability: Number,
    validity: Number
  },
  domains: [{
    domain_name_ar: String,
    domain_name_en: String,
    subdomains: [String],
    max_score: Number,
    weight: { type: Number, default: 1 }
  }],
  interpretation_guide: [{
    score_range: { min: Number, max: Number },
    interpretation_ar: String,
    interpretation_en: String,
    recommendation: String
  }],
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const beneficiaryAssessmentSchema = new Schema({
  assessment_id: {
    type: String,
    unique: true,
    default: () => `ASSESS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // معلومات التقييم
  assessment_type: {
    type: String,
    enum: ['initial', 'periodic', 'progress', 'discharge', 're_evaluation', 'follow_up'],
    required: true
  },
  assessment_date: { type: Date, default: Date.now },

  // أداة التقييم المستخدمة
  assessment_tool: {
    tool_id: { type: Schema.Types.ObjectId, ref: 'AssessmentTool' },
    tool_name: String,
    version: String
  },

  // الفريق المقيّم
  assessment_team: [{
    evaluator_id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: String,
    specialization: String
  }],

  // نتائج التقييم حسب المجالات
  domain_scores: [{
    domain_name: String,
    subdomain: String,
    raw_score: Number,
    standard_score: Number,
    percentile: Number,
    age_equivalent: String,
    grade_equivalent: String,
    interpretation: String,
    observations: String
  }],

  // النتائج الإجمالية
  overall_results: {
    total_raw_score: Number,
    total_standard_score: Number,
    overall_percentile: Number,
    functional_level: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'profound', 'within_normal_limits', 'borderline']
    },
    summary_ar: String,
    summary_en: String
  },

  // نقاط القوة
  strengths: [{
    area: String,
    description: String,
    evidence: String
  }],

  // نقاط الاحتياج
  needs: [{
    area: String,
    description: String,
    priority: { type: String, enum: ['high', 'medium', 'low'] },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] }
  }],

  // التوصيات
  recommendations: [{
    category: String,
    recommendation_text: String,
    responsible_party: String,
    timeframe: String,
    priority: { type: String, enum: ['high', 'medium', 'low'] }
  }],

  // الأهداف المقترحة
  suggested_goals: [{
    goal_area: String,
    goal_description: String,
    measurable_criteria: String,
    suggested_timeline: String
  }],

  // التشخيص
  diagnosis: {
    primary_diagnosis: {
      code: String, // ICD-10 or DSM-5 code
      name_ar: String,
      name_en: String,
      description: String
    },
    secondary_diagnoses: [{
      code: String,
      name_ar: String,
      name_en: String,
      description: String
    }],
    differential_diagnosis: [String],
    diagnostic_confidence: { type: String, enum: ['confirmed', 'probable', 'suspected'] }
  },

  // محاضر الاجتماع
  meeting_minutes: {
    meeting_date: Date,
    attendees: [String],
    discussion_summary: String,
    decisions_made: [String],
    action_items: [{
      action: String,
      responsible: String,
      deadline: Date
    }]
  },

  // المرفقات
  attachments: [{
    file_name: String,
    file_url: String,
    file_type: String,
    upload_date: { type: Date, default: Date.now },
    uploaded_by: { type: Schema.Types.ObjectId, ref: 'User' }
  }],

  // الموافقات
  approvals: {
    guardian_approval: {
      approved: { type: Boolean, default: false },
      approval_date: Date,
      guardian_name: String,
      signature_url: String
    },
    supervisor_approval: {
      approved: { type: Boolean, default: false },
      approval_date: Date,
      supervisor_id: { type: Schema.Types.ObjectId, ref: 'User' },
      comments: String
    }
  },

  // حالة التقييم
  status: {
    type: String,
    enum: ['draft', 'in_review', 'approved', 'finalized', 'archived'],
    default: 'draft'
  },

  notes: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 2. نظام الخطط العلاجية الفردية (ITP)
// Individualized Treatment Plans System
// ============================================

const individualizedPlanSchema = new Schema({
  plan_id: {
    type: String,
    unique: true,
    default: () => `ITP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // معلومات الخطة الأساسية
  plan_name: { type: String, required: true },
  plan_type: {
    type: String,
    enum: ['individualized_education', 'individualized_service', 'individualized_family', 'transition', 'behavior_intervention'],
    required: true
  },

  // الفترة الزمنية
  plan_period: {
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    review_dates: [Date]
  },

  // الفريق متعدد التخصصات
  team_members: [{
    member_id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: String,
    specialization: String,
    responsibilities: [String],
    contact_info: String,
    is_primary: { type: Boolean, default: false }
  }],

  // الأهداف طويلة المدى
  long_term_goals: [{
    goal_id: { type: String, default: () => `LTG-${Date.now()}` },
    domain: String,
    goal_statement: String,
    measurable_criteria: String,
    baseline_performance: String,
    target_performance: String,
    target_date: Date,
    priority: { type: String, enum: ['high', 'medium', 'low'] },
    strategies: [String],
    resources_needed: [String],
    responsible_team_member: { type: Schema.Types.ObjectId, ref: 'User' }
  }],

  // الأهداف قصيرة المدى
  short_term_goals: [{
    goal_id: { type: String, default: () => `STG-${Date.now()}` },
    parent_goal_id: String, // يربط بهدف طويل المدى
    domain: String,
    goal_statement: String,
    measurable_criteria: String,
    baseline_performance: String,
    target_performance: String,
    start_date: Date,
    target_date: Date,
    mastery_criteria: String,
    teaching_procedures: [String],
    materials: [String],
    reinforcement_schedule: String,
    data_collection_method: String,
    progress_updates: [{
      date: Date,
      progress_percentage: Number,
      performance_level: String,
      notes: String,
      data_collector: { type: Schema.Types.ObjectId, ref: 'User' }
    }],
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'mastered', 'discontinued', 'revised'],
      default: 'not_started'
    }
  }],

  // خدمات الدعم
  support_services: [{
    service_type: {
      type: String,
      enum: [
        'physical_therapy',
        'occupational_therapy',
        'speech_therapy',
        'behavioral_therapy',
        'special_education',
        'psychological_services',
        'counseling',
        'social_work',
        'assistive_technology',
        'transportation',
        'nursing',
        'nutrition',
        'music_therapy',
        'art_therapy',
        'hydro_therapy',
        'vocational_training'
      ]
    },
    service_name: String,
    frequency: String,
    duration: String,
    location: String,
    provider: {
      provider_id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String
    },
    start_date: Date,
    end_date: Date
  }],

  // التعديلات والتكييفات
  accommodations: [{
    category: {
      type: String,
      enum: ['instructional', 'environmental', 'assessment', 'assistive_technology', 'communication', 'behavioral']
    },
    accommodation_type: String,
    description: String,
    implementation_notes: String
  }],

  // خطة الطوارئ
  crisis_plan: {
    triggers: [String],
    warning_signs: [String],
    intervention_strategies: [String],
    emergency_contacts: [{
      name: String,
      relationship: String,
      phone: String
    }],
    safety_protocols: [String]
  },

  // مشاركة الأسرة
  family_involvement: {
    family_priorities: [String],
    home_activities: [{
      activity: String,
      frequency: String,
      materials: [String],
      instructions: String
    }],
    training_needs: [String],
    communication_preferences: {
      method: { type: String, enum: ['phone', 'email', 'app', 'in_person', 'notebook'] },
      frequency: String
    },
    family_support_services: [String]
  },

  // خطة الانتقال
  transition_plan: {
    current_setting: String,
    target_setting: String,
    transition_goals: [String],
    skills_needed: [String],
    timeline: Date,
    receiving_agency: String,
    support_services: [String]
  },

  // مراجعات الخطة
  plan_reviews: [{
    review_date: Date,
    review_type: { type: String, enum: ['annual', 'periodic', 'requested', 'transition'] },
    attendees: [String],
    progress_summary: String,
    goal_modifications: [{
      goal_id: String,
      modification: String,
      reason: String
    }],
    new_goals: [Schema.Types.Mixed],
    recommendations: [String],
    next_review_date: Date
  }],

  // حالة الخطة
  status: {
    type: String,
    enum: ['draft', 'active', 'under_review', 'suspended', 'completed', 'discontinued'],
    default: 'draft'
  },

  approvals: {
    team_leader_approval: {
      approved: { type: Boolean, default: false },
      approver_id: { type: Schema.Types.ObjectId, ref: 'User' },
      approval_date: Date,
      comments: String
    },
    guardian_approval: {
      approved: { type: Boolean, default: false },
      guardian_name: String,
      approval_date: Date,
      signature_url: String
    },
    administration_approval: {
      approved: { type: Boolean, default: false },
      approver_id: { type: Schema.Types.ObjectId, ref: 'User' },
      approval_date: Date
    }
  },

  notes: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 3. نظام الجلسات الجماعية
// Group Sessions Management System
// ============================================

const groupSessionSchema = new Schema({
  group_id: {
    type: String,
    unique: true,
    default: () => `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  group_name: { type: String, required: true },
  group_type: {
    type: String,
    enum: [
      'social_skills',     // مهارات اجتماعية
      'communication',     // تواصل
      'motor_skills',      // مهارات حركية
      'behavioral',        // سلوكية
      'academic',          // أكاديمية
      'pre_vocational',    // ما قبل مهني
      'recreational',      // ترفيهية
      'support_group',     // مجموعة دعم
      'therapy_group',     // مجموعة علاجية
      'training_workshop'  // ورشة تدريب
    ],
    required: true
  },

  // وصف المجموعة
  description: String,
  target_population: {
    age_range: { min: Number, max: Number },
    disability_types: [String],
    functional_level: [String],
    prerequisites: [String]
  },

  // معلومات المجموعة
  capacity: {
    min_participants: { type: Number, default: 2 },
    max_participants: { type: Number, default: 8 },
    current_enrollment: { type: Number, default: 0 }
  },

  // أعضاء المجموعة
  participants: [{
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    name: String,
    enrollment_date: Date,
    status: { type: String, enum: ['active', 'inactive', 'completed', 'withdrawn'] },
    individualized_goals: [String],
    participation_notes: String
  }],

  // قائمة الانتظار
  waitlist: [{
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    name: String,
    request_date: { type: Date, default: Date.now },
    priority: { type: String, enum: ['high', 'medium', 'low'] },
    notes: String
  }],

  // جدولة المجموعة
  schedule: {
    frequency: { type: String, enum: ['daily', 'weekly', 'bi_weekly', 'monthly'] },
    days: [{
      type: String,
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    }],
    time: {
      start_time: String,
      end_time: String
    },
    room: String,
    start_date: Date,
    end_date: Date
  },

  // facilitators
  facilitators: [{
    facilitator_id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: { type: String, enum: ['primary', 'co_facilitator', 'assistant', 'observer'] },
    specialization: String
  }],

  // أهداف المجموعة
  group_goals: [{
    goal_id: String,
    description: String,
    measurable_outcomes: String,
    evaluation_criteria: String
  }],

  // المنهج والأنشطة
  curriculum: [{
    session_number: Number,
    topic: String,
    objectives: [String],
    activities: [{
      activity_name: String,
      description: String,
      duration: Number,
      materials: [String]
    }],
    group_rules: [String]
  }],

  // جلسات المجموعة الفعلية
  sessions: [{
    session_id: { type: String, default: () => `SESS-${Date.now()}` },
    session_date: Date,
    session_number: Number,
    topic: String,

    attendance: [{
      beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
      name: String,
      status: { type: String, enum: ['present', 'absent', 'late', 'excused'] }
    }],

    session_content: {
      activities_completed: [String],
      materials_used: [String],
      modifications_made: String
    },

    observations: {
      group_dynamics: String,
      participation_levels: String,
      behavioral_observations: String,
      peer_interactions: String
    },

    participant_progress: [{
      beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
      progress_notes: String,
      goals_addressed: [String],
      next_steps: String
    }],

    facilitator_notes: String,
    next_session_plan: String
  }],

  // تقييم فعالية المجموعة
  effectiveness_evaluation: [{
    evaluation_date: Date,
    evaluator: { type: Schema.Types.ObjectId, ref: 'User' },
    group_cohesion_rating: { type: Number, min: 1, max: 5 },
    goal_achievement_rating: { type: Number, min: 1, max: 5 },
    participant_engagement_rating: { type: Number, min: 1, max: 5 },
    facilitator_effectiveness_rating: { type: Number, min: 1, max: 5 },
    recommendations: String
  }],

  status: {
    type: String,
    enum: ['forming', 'active', 'paused', 'completed', 'discontinued'],
    default: 'forming'
  },

  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 4. نظام رضا المستفيدين
// Beneficiary Satisfaction System
// ============================================

const satisfactionSurveySchema = new Schema({
  survey_id: {
    type: String,
    unique: true,
    default: () => `SURV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  survey_name: { type: String, required: true },
  survey_type: {
    type: String,
    enum: ['service_satisfaction', 'program_evaluation', 'feedback', 'complaint', 'suggestion', 'exit_survey']
  },

  // الأسئلة
  questions: [{
    question_id: String,
    question_text_ar: String,
    question_text_en: String,
    question_type: {
      type: String,
      enum: ['rating_5', 'rating_10', 'yes_no', 'multiple_choice', 'open_ended', 'likert_scale']
    },
    category: String,
    options: [String],
    is_required: { type: Boolean, default: true }
  }],

  target_audience: {
    type: String,
    enum: ['beneficiary', 'guardian', 'family', 'all'],
    default: 'all'
  },

  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const surveyResponseSchema = new Schema({
  response_id: {
    type: String,
    unique: true,
    default: () => `RESP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  survey_id: { type: Schema.Types.ObjectId, ref: 'SatisfactionSurvey', required: true },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
  program_id: { type: Schema.Types.ObjectId, ref: 'DisabilityRehabilitation' },

  respondent_type: {
    type: String,
    enum: ['beneficiary', 'guardian', 'family_member']
  },
  respondent_name: String,

  // الإجابات
  responses: [{
    question_id: String,
    question_text: String,
    response_type: String,
    response_value: Schema.Types.Mixed,
    score: Number
  }],

  // النتائج
  results: {
    total_score: Number,
    max_possible_score: Number,
    percentage_score: Number,
    category_scores: [{
      category: String,
      score: Number,
      percentage: Number
    }]
  },

  // التعليقات المفتوحة
  comments: {
    positive_feedback: String,
    areas_for_improvement: String,
    suggestions: String,
    additional_comments: String
  },

  // الشكاوى
  complaints: [{
    complaint_type: String,
    complaint_details: String,
    severity: { type: String, enum: ['minor', 'moderate', 'serious'] },
    action_required: { type: Boolean, default: false },
    resolution: String,
    resolved: { type: Boolean, default: false },
    resolution_date: Date
  }],

  response_date: { type: Date, default: Date.now },
  is_anonymous: { type: Boolean, default: false }
}, { timestamps: true });

// ============================================
// 5. نظام التحويلات والتوجيه
// Referral and Routing System
// ============================================

const referralSchema = new Schema({
  referral_id: {
    type: String,
    unique: true,
    default: () => `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات المحول
  referral_source: {
    source_type: {
      type: String,
      enum: ['self', 'family', 'hospital', 'school', 'social_services', 'physician', 'internal', 'other_center', 'insurance']
    },
    organization_name: String,
    contact_person: String,
    contact_phone: String,
    contact_email: String,
    referral_reason: String
  },

  // معلومات المستفيد
  beneficiary: {
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    national_id: String,
    name: String,
    date_of_birth: Date,
    disability_type: String,
    contact_phone: String
  },

  // تفاصيل التحويل
  referral_details: {
    referral_type: {
      type: String,
      enum: ['new_intake', 'transfer', 'consultation', 'specialized_service', 'external_specialist', 'equipment', 're_evaluation']
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine'
    },
    requested_services: [String],
    medical_history_summary: String,
    current_medications: [String],
    previous_interventions: String,
    attachments: [{
      file_name: String,
      file_url: String,
      document_type: String
    }]
  },

  // التقييم الأولي
  initial_screening: {
    screening_date: Date,
    screener: { type: Schema.Types.ObjectId, ref: 'User' },
    eligibility_status: {
      type: String,
      enum: ['eligible', 'conditionally_eligible', 'ineligible', 'needs_assessment']
    },
    recommended_program: String,
    estimated_service_intensity: String,
    screening_notes: String
  },

  // قبول التحويل
  acceptance: {
    status: {
      type: String,
      enum: ['pending', 'under_review', 'accepted', 'conditionally_accepted', 'rejected', 'waitlisted'],
      default: 'pending'
    },
    decision_date: Date,
    decision_maker: { type: Schema.Types.ObjectId, ref: 'User' },
    assigned_program: String,
    assigned_case_manager: { type: Schema.Types.ObjectId, ref: 'User' },
    start_date: Date,
    rejection_reason: String,
    alternative_recommendations: String
  },

  // التحويلات الخارجية
  external_referrals: [{
    referred_to_organization: String,
    referred_to_service: String,
    referral_date: Date,
    reason_for_referral: String,
    contact_person: String,
    follow_up_date: Date,
    response_received: { type: Boolean, default: false },
    outcome: String
  }],

  // المتابعة
  follow_up: [{
    follow_up_date: Date,
    contact_method: String,
    contact_person: String,
    notes: String,
    next_action: String,
    responsible_staff: { type: Schema.Types.ObjectId, ref: 'User' }
  }],

  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 6. نظام الجدولة الذكية
// Smart Scheduling System
// ============================================

const scheduleSchema = new Schema({
  schedule_id: {
    type: String,
    unique: true,
    default: () => `SCH-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // نوع الجدولة
  schedule_type: {
    type: String,
    enum: ['individual_session', 'group_session', 'assessment', 'meeting', 'home_visit', 'follow_up', 'transportation']
  },

  // المستفيد
  beneficiary: {
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    name: String
  },

  // مقدم الخدمة
  provider: {
    provider_id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    specialization: String
  },

  // تفاصيل الموعد
  appointment: {
    title: String,
    description: String,
    date: Date,
    start_time: String,
    end_time: String,
    duration_minutes: Number,
    location: {
      type: String,
      enum: ['center', 'home', 'school', 'community', 'online']
    },
    room: String
  },

  // التكرار
  recurrence: {
    is_recurring: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'bi_weekly', 'monthly'] },
    days_of_week: [String],
    end_date: Date,
    recurrence_pattern: String
  },

  // حالة الموعد
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show'],
    default: 'scheduled'
  },

  // التنبيهات
  reminders: [{
    reminder_type: { type: String, enum: ['email', 'sms', 'app_notification', 'phone_call'] },
    timing: Number, // دقائق قبل الموعد
    sent: { type: Boolean, default: false },
    sent_at: Date
  }],

  // التعارضات
  conflicts: [{
    conflict_type: String,
    conflict_description: String,
    resolution: String,
    resolved: { type: Boolean, default: false }
  }],

  // إعادة الجدولة
  reschedule_history: [{
    previous_date: Date,
    previous_time: String,
    new_date: Date,
    new_time: String,
    reason: String,
    rescheduled_by: { type: Schema.Types.ObjectId, ref: 'User' },
    rescheduled_at: { type: Date, default: Date.now }
  }],

  // الحضور
  attendance: {
    checked_in: { type: Boolean, default: false },
    check_in_time: String,
    checked_out: { type: Boolean, default: false },
    check_out_time: String,
    actual_duration: Number,
    attendance_notes: String
  },

  notes: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 7. نظام إدارة الأجهزة والمعدات المساعدة
// Assistive Equipment Management System
// ============================================

const assistiveEquipmentSchema = new Schema({
  equipment_id: {
    type: String,
    unique: true,
    default: () => `EQP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات المعدات
  name_ar: { type: String, required: true },
  name_en: String,
  description: String,
  category: {
    type: String,
    enum: [
      'mobility_aids',      // وسائل المساعدة على الحركة
      'communication_aids', // وسائل التواصل
      'sensory_aids',       // الوسائل الحسية
      'daily_living_aids',  // وسائل الحياة اليومية
      'computer_access',    // الوصول للكمبيوتر
      'environmental_control', // التحكم البيئي
      'recreational',       // ترفيهية
      'therapeutic',        // علاجية
      'educational',        // تعليمية
      'safety_equipment'    // معدات السلامة
    ]
  },

  // المواصفات
  specifications: {
    brand: String,
    model: String,
    serial_number: String,
    manufacturer: String,
    year_of_manufacture: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: 'cm' }
    },
    weight: Number,
    color: String,
    material: String
  },

  // حالة المعدات
  condition: {
    status: {
      type: String,
      enum: ['new', 'excellent', 'good', 'fair', 'poor', 'needs_repair', 'out_of_service'],
      default: 'new'
    },
    last_inspection_date: Date,
    next_inspection_date: Date,
    inspection_notes: String
  },

  // الموقع
  location: {
    building: String,
    floor: String,
    room: String,
    storage_location: String
  },

  // الملكية والإعارة
  ownership: {
    type: { type: String, enum: ['owned', 'rented', 'donated', 'loaned', 'government_provided'] },
    purchase_date: Date,
    purchase_price: Number,
    warranty_expiry: Date,
    funding_source: String
  },

  // إسناد المعدات لمستفيد
  assignment: {
    is_assigned: { type: Boolean, default: false },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    beneficiary_name: String,
    assignment_date: Date,
    expected_return_date: Date,
    actual_return_date: Date,
    assignment_purpose: String,
    training_provided: { type: Boolean, default: false },
    training_date: Date,
    trainer: { type: Schema.Types.ObjectId, ref: 'User' }
  },

  // سجل الإعارة
  loan_history: [{
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    beneficiary_name: String,
    loan_start_date: Date,
    expected_return_date: Date,
    actual_return_date: Date,
    condition_at_checkout: String,
    condition_at_return: String,
    notes: String
  }],

  // الصيانة
  maintenance_records: [{
    maintenance_id: String,
    maintenance_type: { type: String, enum: ['preventive', 'corrective', 'emergency', 'upgrade'] },
    maintenance_date: Date,
    performed_by: String,
    description: String,
    parts_replaced: [String],
    cost: Number,
    next_maintenance_date: Date,
    maintenance_notes: String
  }],

  // فاتورة المعدات
  availability: {
    is_available: { type: Boolean, default: true },
    unavailable_reason: String,
    reservation: [{
      reserved_by: { type: Schema.Types.ObjectId, ref: 'User' },
      reservation_date: Date,
      start_date: Date,
      end_date: Date,
      purpose: String
    }]
  },

  // صور المعدات
  images: [{
    image_url: String,
    image_type: String,
    upload_date: { type: Date, default: Date.now }
  }],

  // دليل الاستخدام
  user_manual: {
    manual_url: String,
    training_video_url: String,
    quick_start_guide: String
  },

  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 8. نظام التواصل مع الأسرة
// Family Communication Portal System
// ============================================

const familyCommunicationSchema = new Schema({
  communication_id: {
    type: String,
    unique: true,
    default: () => `COM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // معلومات التواصل
  communication_type: {
    type: String,
    enum: ['message', 'announcement', 'progress_report', 'appointment_reminder', 'home_program', 'feedback_request', 'meeting_invitation', 'alert']
  },

  // المرسل والمستقبل
  sender: {
    sender_id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: String
  },

  recipients: [{
    recipient_id: { type: Schema.Types.ObjectId, ref: 'Guardian' },
    name: String,
    relationship: String,
    contact_method: { type: String, enum: ['email', 'sms', 'app_notification', 'phone'] }
  }],

  // المحتوى
  subject: { type: String, required: true },
  message: { type: String, required: true },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // المرفقات
  attachments: [{
    file_name: String,
    file_url: String,
    file_type: String
  }],

  // حالة الإرسال
  delivery_status: [{
    recipient_id: { type: Schema.Types.ObjectId },
    status: { type: String, enum: ['pending', 'sent', 'delivered', 'failed', 'read'] },
    sent_at: Date,
    delivered_at: Date,
    read_at: Date,
    failure_reason: String
  }],

  // الردود
  responses: [{
    responder_id: { type: Schema.Types.ObjectId, ref: 'Guardian' },
    responder_name: String,
    response_date: { type: Date, default: Date.now },
    response_content: String,
    response_type: { type: String, enum: ['text', 'voice', 'attachment'] },
    attachment_url: String
  }],

  // المتابعة
  follow_up: {
    requires_follow_up: { type: Boolean, default: false },
    follow_up_date: Date,
    follow_up_notes: String,
    is_resolved: { type: Boolean, default: false }
  },

  // العلامات
  tags: [String],

  is_archived: { type: Boolean, default: false }
}, { timestamps: true });

// ============================================
// 9. نظام إدارة الانتظار
// Waitlist Management System
// ============================================

const waitlistSchema = new Schema({
  waitlist_id: {
    type: String,
    unique: true,
    default: () => `WAIT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
  beneficiary_name: String,

  // نوع الخدمة المطلوبة
  requested_service: {
    service_type: String,
    program_name: String,
    preferred_schedule: {
      days: [String],
      time_preference: String
    },
    preferred_therapist: String
  },

  // معلومات الانتظار
  waitlist_info: {
    registration_date: { type: Date, default: Date.now },
    priority_score: { type: Number, default: 0 },
    priority_factors: [{
      factor: String,
      score: Number
    }],
    estimated_wait_time: Number, // بالأيام
    position: Number
  },

  // الحالة
  status: {
    type: String,
    enum: ['waiting', 'contacted', 'offer_made', 'accepted', 'declined', 'removed', 'transferred'],
    default: 'waiting'
  },

  // جهات الاتصال
  contact_attempts: [{
    contact_date: Date,
    contact_method: String,
    contact_result: String,
    notes: String,
    contacted_by: { type: Schema.Types.ObjectId, ref: 'User' }
  }],

  // العروض
  service_offers: [{
    offer_date: Date,
    offered_service: String,
    offered_schedule: String,
    response_deadline: Date,
    response: { type: String, enum: ['pending', 'accepted', 'declined'] },
    response_date: Date,
    response_reason: String
  }],

  // سبب الإزالة
  removal_info: {
    removal_date: Date,
    removal_reason: String,
    removed_by: { type: Schema.Types.ObjectId, ref: 'User' }
  },

  notes: String,
  assigned_to: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 10. نظام التقارير المتقدم
// Advanced Reporting System
// ============================================

const reportTemplateSchema = new Schema({
  template_id: {
    type: String,
    unique: true,
    default: () => `TPL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  template_name: { type: String, required: true },
  template_type: {
    type: String,
    enum: ['progress_report', 'assessment_report', 'program_evaluation', 'statistical_report', 'compliance_report', 'financial_report', 'performance_report', 'custom']
  },

  description: String,
  sections: [{
    section_id: String,
    section_title: String,
    section_type: { type: String, enum: ['text', 'table', 'chart', 'metrics', 'list'] },
    data_source: String,
    fields: [String],
    formatting: Schema.Types.Mixed
  }],

  parameters: [{
    parameter_name: String,
    parameter_type: String,
    default_value: Schema.Types.Mixed,
    is_required: { type: Boolean, default: true }
  }],

  // الصلاحيات
  permissions: {
    roles_allowed: [String],
    requires_approval: { type: Boolean, default: false }
  },

  // التنسيق
  format_options: {
    header_template: String,
    footer_template: String,
    logo_url: String,
    paper_size: { type: String, default: 'A4' },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' }
  },

  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const generatedReportSchema = new Schema({
  report_id: {
    type: String,
    unique: true,
    default: () => `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  template_id: { type: Schema.Types.ObjectId, ref: 'ReportTemplate' },
  report_title: String,
  report_type: String,

  // معايير التقرير
  criteria: {
    date_range: {
      start_date: Date,
      end_date: Date
    },
    filters: Schema.Types.Mixed,
    parameters_used: Schema.Types.Mixed
  },

  // البيانات
  data: Schema.Types.Mixed,

  // الملخص التنفيذي
  executive_summary: String,

  // النتائج الرئيسية
  key_findings: [String],

  // التوصيات
  recommendations: [String],

  // حالة التقرير
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed', 'archived'],
    default: 'generating'
  },

  // ملف التقرير
  file: {
    file_name: String,
    file_url: String,
    file_format: { type: String, enum: ['pdf', 'excel', 'word', 'html'] },
    file_size: Number
  },

  // المشاركة
  sharing: {
    is_shared: { type: Boolean, default: false },
    shared_with: [{
      user_id: { type: Schema.Types.ObjectId, ref: 'User' },
      shared_at: Date,
      permission: { type: String, enum: ['view', 'download', 'edit'] }
    }],
    public_link: String,
    link_expiry: Date
  },

  generated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  generated_at: { type: Date, default: Date.now }
}, { timestamps: true });

// ============================================
// إنشاء الفهارس
// ============================================

// فهارس نظام التقييم
beneficiaryAssessmentSchema.index({ beneficiary_id: 1, assessment_date: -1 });
beneficiaryAssessmentSchema.index({ assessment_type: 1, status: 1 });

// فهارات الخطة الفردية
individualizedPlanSchema.index({ beneficiary_id: 1, status: 1 });
individualizedPlanSchema.index({ 'plan_period.start_date': 1, 'plan_period.end_date': 1 });

// فهارس الجلسات الجماعية
groupSessionSchema.index({ group_type: 1, status: 1 });
groupSessionSchema.index({ 'facilitators.facilitator_id': 1 });

// فهارس الجدولة
scheduleSchema.index({ 'provider.provider_id': 1, 'appointment.date': 1 });
scheduleSchema.index({ 'beneficiary.beneficiary_id': 1, 'appointment.date': 1 });
scheduleSchema.index({ status: 1, 'appointment.date': 1 });

// فهارس التحويلات
referralSchema.index({ 'acceptance.status': 1, createdAt: 1 });
referralSchema.index({ 'beneficiary.beneficiary_id': 1 });

// فهارس قائمة الانتظار
waitlistSchema.index({ status: 1, 'waitlist_info.priority_score': -1 });
waitlistSchema.index({ requested_service: 1 });

// ============================================
// تصدير النماذج
// ============================================

module.exports = {
  // نظام التقييم
  AssessmentTool: mongoose.model('AssessmentTool', assessmentToolSchema),
  BeneficiaryAssessment: mongoose.model('BeneficiaryAssessment', beneficiaryAssessmentSchema),

  // الخطط العلاجية
  IndividualizedPlan: mongoose.model('IndividualizedPlan', individualizedPlanSchema),

  // الجلسات الجماعية
  GroupSession: mongoose.model('GroupSession', groupSessionSchema),

  // رضا المستفيدين
  SatisfactionSurvey: mongoose.model('SatisfactionSurvey', satisfactionSurveySchema),
  SurveyResponse: mongoose.model('SurveyResponse', surveyResponseSchema),

  // التحويلات
  Referral: mongoose.model('Referral', referralSchema),

  // الجدولة
  Schedule: mongoose.model('Schedule', scheduleSchema),

  // المعدات
  AssistiveEquipment: mongoose.model('AssistiveEquipment', assistiveEquipmentSchema),

  // التواصل مع الأسرة
  FamilyCommunication: mongoose.model('FamilyCommunication', familyCommunicationSchema),

  // قائمة الانتظار
  Waitlist: mongoose.model('Waitlist', waitlistSchema),

  // التقارير
  ReportTemplate: mongoose.model('ReportTemplate', reportTemplateSchema),
  GeneratedReport: mongoose.model('GeneratedReport', generatedReportSchema)
};

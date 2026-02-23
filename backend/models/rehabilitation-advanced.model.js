/**
 * Advanced Rehabilitation Center Systems
 * أنظمة متقدمة لمراكز تأهيل ذوي الإعاقة
 *
 * @module models/rehabilitation-advanced
 * @description أنظمة إضافية متكاملة للتأهيل الشامل
 * @version 2.0.0
 * @date 2026-02-21
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============================================
// 1. نظام إدارة السلوك والتدخل السلوكي
// Behavior Management and Intervention System
// ============================================

const behaviorIncidentSchema = new Schema({
  incident_id: {
    type: String,
    unique: true,
    default: () => `BHV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // معلومات الحادثة
  incident_info: {
    date: { type: Date, required: true },
    time: String,
    location: String,
    duration: Number, // بالدقائق
    intensity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'crisis'],
      required: true
    }
  },

  // نوع السلوك
  behavior_type: {
    category: {
      type: String,
      enum: [
        'aggression',        // عدوان
        'self_injury',       // إيذاء ذاتي
        'property_destruction', // تخريب ممتلكات
        'disruption',        // تعطيل
        'non_compliance',    // عدم امتثال
        'elopement',         // هروب
        'stereotypy',        // نمطية
        'verbal_aggression', // عدوان لفظي
        'tantrum',           // نوبة غضب
        'other'
      ]
    },
    description: String,
    antecedent: String, // ما حدث قبل السلوك
    consequence: String  // ما حدث بعد السلوك
  },

  // التدخلات المستخدمة
  interventions_used: [{
    intervention_type: String,
    description: String,
    effectiveness: {
      type: String,
      enum: ['very_effective', 'effective', 'somewhat_effective', 'not_effective']
    },
    staff_involved: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  }],

  // الإصابات أو الأضرار
  injuries_or_damages: [{
    type: { type: String, enum: ['injury', 'property_damage'] },
    description: String,
    severity: String,
    action_taken: String
  }],

  // إخطار ولي الأمر
  guardian_notification: {
    notified: { type: Boolean, default: false },
    notification_date: Date,
    method: { type: String, enum: ['phone', 'email', 'in_person', 'app'] },
    guardian_name: String,
    response: String
  },

  // خطوات المتابعة
  follow_up_actions: [{
    action: String,
    responsible: { type: Schema.Types.ObjectId, ref: 'User' },
    due_date: Date,
    completed: { type: Boolean, default: false },
    completed_date: Date
  }],

  // المرفقات
  attachments: [{
    file_name: String,
    file_url: String,
    file_type: String
  }],

  reported_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: String
}, { timestamps: true });

const behaviorPlanSchema = new Schema({
  plan_id: {
    type: String,
    unique: true,
    default: () => `BIP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  plan_name: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: Date,

  // تحليل السلوك الوظيفي (FBA)
  functional_behavior_analysis: {
    target_behaviors: [{
      behavior_name: String,
      operational_definition: String,
      baseline_frequency: Number,
      baseline_duration: Number,
      baseline_intensity: String
    }],

    antecedent_analysis: {
      setting_events: [String], // أحداث ممهدة
      triggers: [String],       // محفزات
      common_antecedents: [String]
    },

    consequence_analysis: {
      maintaining_consequences: [String],
      perceived_function: [{
        behavior: String,
        function: {
          type: String,
          enum: ['attention', 'escape', 'tangible', 'sensory', 'multiple']
        },
        evidence: String
      }]
    },

    hypothesis: String
  },

  // استراتيجيات التدخل
  intervention_strategies: {
    // استراتيجيات وقائية
    antecedent_strategies: [{
      strategy: String,
      description: String,
      implementation_guidelines: String,
      frequency: String
    }],

    // استراتيجيات التدريس
    teaching_strategies: [{
      skill_to_teach: String,
      teaching_method: String,
      materials_needed: [String],
      schedule: String
    }],

    // استراتيجيات العواقب
    consequence_strategies: [{
      situation: String,
      response: String,
      reinforcement: String
    }],

    // استراتيجيات الأزمات
    crisis_intervention: {
      escalation_stages: [{
        stage: String,
        indicators: [String],
        recommended_response: String
      }],
      emergency_protocols: [String],
      emergency_contacts: [{
        name: String,
        role: String,
        phone: String
      }]
    }
  },

  // التعزيز
  reinforcement_plan: {
    primary_reinforcers: [String],
    secondary_reinforcers: [String],
    reinforcement_schedule: {
      type: String,
      enum: ['continuous', 'fixed_ratio', 'variable_ratio', 'fixed_interval', 'variable_interval']
    },
    token_system: {
      enabled: { type: Boolean, default: false },
      tokens_for_behavior: Number,
      exchange_rate: Number,
      backup_reinforcers: [String]
    }
  },

  // جمع البيانات
  data_collection: {
    method: {
      type: String,
      enum: ['frequency', 'duration', 'latency', 'inter_response_time', 'momentary_time_sampling', 'partial_interval', 'whole_interval']
    },
    recording_schedule: String,
    data_collectors: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },

  // معايير النجاح
  success_criteria: [{
    behavior: String,
    baseline: Number,
    target: Number,
    measurement_unit: String,
    timeline: Date
  }],

  // مراجعات الخطة
  plan_reviews: [{
    review_date: Date,
    reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
    progress_summary: String,
    data_summary: Schema.Types.Mixed,
    modifications: [String],
    recommendations: String
  }],

  // حالة الخطة
  status: {
    type: String,
    enum: ['draft', 'active', 'under_review', 'suspended', 'completed', 'discontinued'],
    default: 'draft'
  },

  approvals: {
    bcba_approval: {
      approved: { type: Boolean, default: false },
      approver_id: { type: Schema.Types.ObjectId, ref: 'User' },
      approval_date: Date,
      license_number: String
    },
    guardian_approval: {
      approved: { type: Boolean, default: false },
      guardian_name: String,
      approval_date: Date,
      signature_url: String
    }
  },

  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 2. نظام التدريب المهني والتوظيف
// Vocational Training and Employment System
// ============================================

const vocationalProfileSchema = new Schema({
  profile_id: {
    type: String,
    unique: true,
    default: () => `VOC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // تقييم المهارات المهنية
  skills_assessment: {
    // المهارات الوظيفية
    work_skills: [{
      skill_category: String,
      skill_name: String,
      proficiency_level: {
        type: String,
        enum: ['novice', 'beginner', 'intermediate', 'advanced', 'expert']
      },
      evidence: String,
      assessment_date: Date
    }],

    // المهارات الحركية
    motor_skills: {
      fine_motor: {
        level: String,
        notes: String
      },
      gross_motor: {
        level: String,
        notes: String
      },
      endurance: {
        level: String,
        notes: String
      }
    },

    // المهارات المعرفية
    cognitive_skills: {
      attention_span: Number, // بالدقائق
      following_instructions: {
        type: String,
        enum: ['simple', 'moderate', 'complex', 'needs_support']
      },
      problem_solving: String,
      memory: String
    },

    // المهارات الاجتماعية
    social_skills: {
      communication: String,
      teamwork: String,
      customer_interaction: String,
      conflict_resolution: String
    },

    // الاهتمامات المهنية
    vocational_interests: [String],

    // التفضيلات البيئية
    environmental_preferences: {
      indoor_outdoor: String,
      noise_level: { type: String, enum: ['quiet', 'moderate', 'busy', 'no_preference'] },
      social_interaction: { type: String, enum: ['solitary', 'small_group', 'large_group', 'varied'] },
      physical_demands: String
    }
  },

  // التدريبات المهنية
  training_programs: [{
    program_id: String,
    program_name: String,
    type: {
      type: String,
      enum: ['pre_vocational', 'vocational', 'on_the_job', 'internship', 'apprenticeship']
    },
    start_date: Date,
    end_date: Date,
    skills_targeted: [String],
    trainer: { type: Schema.Types.ObjectId, ref: 'User' },
    progress: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'discontinued']
    },
    competencies_achieved: [String],
    evaluation: {
      score: Number,
      feedback: String
    }
  }],

  // شهادات العمل
  work_certificates: [{
    certificate_name: String,
    issuing_organization: String,
    issue_date: Date,
    expiry_date: Date,
    certificate_url: String,
    skills_certified: [String]
  }],

  // الخبرات العملية
  work_experiences: [{
    position: String,
    employer: String,
    employment_type: { type: String, enum: ['full_time', 'part_time', 'supported', 'volunteer', 'internship'] },
    start_date: Date,
    end_date: Date,
    responsibilities: [String],
    accommodations_provided: [String],
    supervisor_feedback: String,
    reason_for_leaving: String
  }],

  // خطة التوظيف
  employment_plan: {
    career_goal: String,
    short_term_goals: [String],
    long_term_goals: [String],
    job_preferences: {
      industries: [String],
      positions: [String],
      work_schedule: String,
      location_preferences: [String]
    },
    support_needed: [String],
    job_coach: {
      assigned: { type: Boolean, default: false },
      coach_id: { type: Schema.Types.ObjectId, ref: 'User' },
      support_level: String
    }
  },

  // حالات التوظيف
  employment_applications: [{
    employer: String,
    position: String,
    application_date: Date,
    status: { type: String, enum: ['submitted', 'under_review', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn'] },
    interview_date: Date,
    notes: String
  }],

  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const jobCoachLogSchema = new Schema({
  log_id: {
    type: String,
    unique: true,
    default: () => `JCL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
  job_coach_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  work_site: {
    employer_name: String,
    address: String,
    supervisor_name: String,
    supervisor_phone: String
  },

  session_date: { type: Date, required: true },
  hours_worked: Number,

  tasks_performed: [{
    task: String,
    independence_level: {
      type: String,
      enum: ['full_support', 'partial_support', 'minimal_support', 'independent']
    },
    quality_rating: { type: Number, min: 1, max: 5 },
    notes: String
  }],

  skills_observed: [{
    skill: String,
    observation: String,
    rating: { type: Number, min: 1, max: 5 }
  }],

  challenges_faced: [{
    challenge: String,
    intervention_used: String,
    outcome: String
  }],

  accommodations_used: [String],

  productivity: {
    tasks_completed: Number,
    tasks_assigned: Number,
    productivity_rate: Number
  },

  social_interactions: {
    positive_interactions: [String],
    areas_for_improvement: [String]
  },

  recommendations: {
    for_employee: [String],
    for_employer: [String],
    for_next_session: [String]
  },

  employer_feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comments: String
  },

  notes: String
}, { timestamps: true });

// ============================================
// 3. نظام المتابعة المنزلية
// Home Follow-up System
// ============================================

const homeProgramSchema = new Schema({
  program_id: {
    type: String,
    unique: true,
    default: () => `HMP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  program_name: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: Date,

  // الأنشطة المنزلية
  activities: [{
    activity_id: String,
    domain: {
      type: String,
      enum: ['self_care', 'communication', 'motor', 'academic', 'behavioral', 'social', 'vocational']
    },
    activity_name: String,
    description: String,
    materials_needed: [String],
    instructions: String,
    frequency: String, // مرات في اليوم/الأسبوع
    duration: Number, // بالدقائق
    demonstration_video_url: String,
    visual_aids: [String],
    target_skills: [String]
  }],

  // جدول الأنشطة
  schedule: {
    sunday: [{ activity_id: String, time: String, notes: String }],
    monday: [{ activity_id: String, time: String, notes: String }],
    tuesday: [{ activity_id: String, time: String, notes: String }],
    wednesday: [{ activity_id: String, time: String, notes: String }],
    thursday: [{ activity_id: String, time: String, notes: String }],
    friday: [{ activity_id: String, time: String, notes: String }],
    saturday: [{ activity_id: String, time: String, notes: String }]
  },

  // سجل التنفيذ المنزلي
  execution_log: [{
    date: Date,
    activities_completed: [{
      activity_id: String,
      completed: Boolean,
      duration: Number,
      performance_notes: String,
      difficulties: String,
      parent_rating: { type: Number, min: 1, max: 5 }
    }],
    total_time_spent: Number,
    general_notes: String,
    logged_by: { type: String, enum: ['parent', 'guardian', 'caregiver'] }
  }],

  // زيارات المتابعة المنزلية
  home_visits: [{
    visit_date: Date,
    visitor: { type: Schema.Types.ObjectId, ref: 'User' },
    purpose: String,
    observations: String,
    recommendations: [String],
    family_concerns: [String],
    next_visit_date: Date
  }],

  // تدريب الأسرة
  family_training: [{
    training_date: Date,
    topic: String,
    trainer: { type: Schema.Types.ObjectId, ref: 'User' },
    attendees: [String],
    materials_provided: [String],
    competency_achieved: { type: Boolean, default: false }
  }],

  // تقييم الالتزام
  compliance_assessment: {
    overall_compliance_rate: Number,
    strengths: [String],
    challenges: [String],
    recommendations: [String],
    last_assessment_date: Date
  },

  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'discontinued'],
    default: 'active'
  },

  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 4. نظام إدارة الأدوية
// Medication Management System
// ============================================

const medicationRecordSchema = new Schema({
  record_id: {
    type: String,
    unique: true,
    default: () => `MED-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // معلومات الدواء
  medication_info: {
    medication_name: { type: String, required: true },
    generic_name: String,
    dosage: { type: String, required: true },
    unit: String, // mg, ml, etc.
    form: {
      type: String,
      enum: ['tablet', 'capsule', 'liquid', 'injection', 'patch', 'inhaler', 'drops', 'other']
    },
    route: {
      type: String,
      enum: ['oral', 'injection', 'topical', 'inhalation', 'nasal', 'rectal', 'other']
    },
    frequency: String,
    times: [String], // أوقات الجرعات
    instructions: String,
    purpose: String,
    prescriber: {
      name: String,
      specialization: String,
      phone: String
    }
  },

  // تواريخ العلاج
  treatment_period: {
    start_date: { type: Date, required: true },
    end_date: Date,
    is_ongoing: { type: Boolean, default: true }
  },

  // الجرد
  inventory: {
    current_stock: Number,
    unit_of_measure: String,
    reorder_level: Number,
    storage_instructions: String,
    location: String,
    expiry_date: Date,
    last_restock_date: Date,
    batch_number: String
  },

  // سجل الإعطاء
  administration_log: [{
    date: { type: Date, required: true },
    time: { type: String, required: true },
    dosage_given: String,
    administered_by: { type: Schema.Types.ObjectId, ref: 'User' },
    route: String,
    site: String, // للحقن
    notes: String,
    refused: { type: Boolean, default: false },
    refusal_reason: String,
    witness: { type: Schema.Types.ObjectId, ref: 'User' }
  }],

  // الآثار الجانبية
  side_effects: [{
    date: Date,
    effect: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    action_taken: String,
    reported_to_physician: { type: Boolean, default: false },
    physician_response: String
  }],

  // التفاعلات الدوائية
  drug_interactions: [{
    interacting_medication: String,
    interaction_type: String,
    severity: String,
    recommendation: String
  }],

  // التوقف عن الدواء
  discontinuation: {
    discontinued: { type: Boolean, default: false },
    date: Date,
    reason: String,
    tapering_schedule: String,
    discontinued_by: { type: Schema.Types.ObjectId, ref: 'User' }
  },

  status: {
    type: String,
    enum: ['active', 'on_hold', 'discontinued', 'completed'],
    default: 'active'
  },

  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 5. نظام التوحد المتكامل
// Comprehensive Autism Management System
// ============================================

const autismProfileSchema = new Schema({
  profile_id: {
    type: String,
    unique: true,
    default: () => `AUT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // معلومات التشخيص
  diagnosis_info: {
    diagnosis_date: Date,
    diagnosing_professional: {
      name: String,
      specialization: String,
      license: String
    },
    diagnosis_criteria: {
      dsm5_level: { type: String, enum: ['level1', 'level2', 'level3'] },
      severity: String
    },
    diagnostic_tools_used: [String],
    age_at_diagnosis: Number,
    co_occurring_conditions: [String]
  },

  // ملف التواصل
  communication_profile: {
    verbal_ability: {
      type: String,
      enum: ['non_verbal', 'minimally_verbal', 'verbal_with_difficulties', 'fluent']
    },
    receptive_language: {
      level: String,
      notes: String
    },
    expressive_language: {
      level: String,
      notes: String
    },
    communication_methods: [String], // verbal, PECS, sign, AAC, etc.
    pragmatics: {
      eye_contact: String,
      joint_attention: String,
      turn_taking: String,
      social_reciprocity: String
    },
    augmentative_devices: [{
      device_type: String,
      proficiency: String
    }]
  },

  // ملف الحسية
  sensory_profile: {
    hypersensitivities: [{
      sense: { type: String, enum: ['visual', 'auditory', 'tactile', 'olfactory', 'gustatory', 'vestibular', 'proprioceptive'] },
      triggers: [String],
      responses: [String],
      accommodations: [String]
    }],
    hyposensitivities: [{
      sense: String,
      seeking_behaviors: [String],
      interventions: [String]
    }],
    sensory_diet: [{
      activity: String,
      purpose: String,
      frequency: String,
      duration: Number
    }]
  },

  // السلوكيات النمطية
  stereotypic_behaviors: [{
    behavior: String,
    frequency: String,
    intensity: String,
    triggers: [String],
    management_strategies: [String],
    interfering_with_learning: { type: Boolean, default: false }
  }],

  // الاهتمامات الخاصة
  special_interests: [{
    interest: String,
    intensity: { type: String, enum: ['mild', 'moderate', 'intense', 'obsessive'] },
    use_in_teaching: { type: Boolean, default: false },
    notes: String
  }],

  // المهارات المعرفية
  cognitive_profile: {
    iq_score: Number,
    iq_test_used: String,
    verbal_iq: Number,
    non_verbal_iq: Number,
    adaptive_functioning: {
      composite_score: Number,
      communication: Number,
      daily_living: Number,
      socialization: Number
    },
    executive_function: {
      attention: String,
      flexibility: String,
      planning: String,
      working_memory: String
    },
    theory_of_mind: String,
    central_coherence: String
  },

  // برنامج التدخل
  intervention_program: {
    primary_approach: {
      type: String,
      enum: ['ABA', 'TEACCH', 'DIR_Floortime', 'PECS', 'ESDM', 'SCERTS', 'eclectic']
    },
    secondary_approaches: [String],
    hours_per_week: Number,
    settings: [String]
  },

  // التقدم والنتائج
  outcomes_tracking: {
    vineland_scores: [{
      date: Date,
      composite: Number,
      communication: Number,
      daily_living: Number,
      socialization: Number,
      motor: Number
    }],
    goal_achievement: [{
      period: String,
      goals_set: Number,
      goals_achieved: Number,
      goals_partially_achieved: Number,
      percentage: Number
    }]
  },

  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 6. نظام العلاج الطبيعي والوظيفي
// Physical and Occupational Therapy System
// ============================================

const therapySessionSchema = new Schema({
  session_id: {
    type: String,
    unique: true,
    default: () => `THS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  therapy_type: {
    type: String,
    enum: ['physical_therapy', 'occupational_therapy', 'speech_therapy', 'hydro_therapy', 'music_therapy', 'art_therapy'],
    required: true
  },

  session_info: {
    date: { type: Date, required: true },
    start_time: String,
    end_time: String,
    duration: Number,
    therapist: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location: String,
    session_number: Number
  },

  // أهداف الجلسة
  session_goals: [{
    goal: String,
    target: String,
    achieved: { type: Boolean, default: false }
  }],

  // الأنشطة المُنفذة
  activities: [{
    activity_name: String,
    description: String,
    repetitions: Number,
    performance_level: { type: String, enum: ['independent', 'minimal_assist', 'moderate_assist', 'maximal_assist', 'dependent'] },
    notes: String
  }],

  // القياسات (للعلاج الطبيعي)
  measurements: {
    range_of_motion: [{
      joint: String,
      movement: String,
      active: Number,
      passive: Number
    }],
    strength: [{
      muscle_group: String,
      grade: Number // 0-5 scale
    }],
    pain_level: { type: Number, min: 0, max: 10 },
    functional_mobility: String
  },

  // المهارات الحركية الدقيقة (للعلاج الوظيفي)
  fine_motor_skills: [{
    skill: String,
    assessment: String,
    progress: String
  }],

  // المهارات الحركية gross motor
  gross_motor_skills: [{
    skill: String,
    assessment: String,
    progress: String
  }],

  // التوصيات
  recommendations: {
    home_exercises: [String],
    modifications: [String],
    equipment_needed: [String],
    next_session_focus: [String]
  },

  // ملاحظات
  notes: {
    subjective: String, // what patient/caregiver reported
    objective: String,  // what therapist observed
    assessment: String, // therapist's analysis
    plan: String        // next steps
  },

  attendance: {
    status: { type: String, enum: ['attended', 'absent', 'cancelled', 'rescheduled'], default: 'attended' },
    cancellation_reason: String
  },

  signature: {
    therapist_signature: String,
    supervisor_signature: String,
    signature_date: Date
  }
}, { timestamps: true });

// ============================================
// 7. نظام التغذية والعلاج الغذائي
// Nutrition and Dietary Therapy System
// ============================================

const nutritionPlanSchema = new Schema({
  plan_id: {
    type: String,
    unique: true,
    default: () => `NUT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // التقييم الغذائي
  nutritional_assessment: {
    assessment_date: Date,
    assessor: { type: Schema.Types.ObjectId, ref: 'User' },

    anthropometrics: {
      height: Number,
      weight: Number,
      bmi: Number,
      head_circumference: Number,
      growth_percentile: Number
    },

    dietary_intake: {
      typical_meals: [String],
      food_preferences: [String],
      food_aversions: [String],
      texture_issues: [String],
      feeding_behaviors: [String]
    },

    feeding_ability: {
      self_feeding: { type: String, enum: ['independent', 'needs_assist', 'dependent'] },
      utensil_use: String,
      chewing: String,
      swallowing: String,
      aspiration_risk: { type: Boolean, default: false }
    },

    nutritional_deficiencies: [String],
    allergies: [String],
    intolerances: [String]
  },

  // الخطة الغذائية
  meal_plan: {
    meals_per_day: Number,
    snacks_per_day: Number,

    meals: [{
      meal_name: String,
      time: String,
      foods: [{
        food_item: String,
        portion: String,
        calories: Number,
        protein: Number,
        carbs: Number,
        fat: Number
      }],
      texture_modification: String,
      notes: String
    }],

    total_daily_nutrients: {
      calories: Number,
      protein: Number,
      carbohydrates: Number,
      fat: Number,
      fiber: Number,
      vitamins: Schema.Types.Mixed,
      minerals: Schema.Types.Mixed
    },

    fluid_requirements: {
      daily_amount: Number,
      fluid_type: [String],
      thickening_required: { type: Boolean, default: false },
      thickening_level: String
    }
  },

  // المكملات الغذائية
  supplements: [{
    supplement_name: String,
    dosage: String,
    frequency: String,
    purpose: String,
    start_date: Date
  }],

  // التعديلات الخاصة
  special_modifications: {
    diet_type: {
      type: String,
      enum: ['regular', 'pureed', 'mechanical_soft', 'soft', 'liquid', 'gf_cf', 'ketogenic', 'other']
    },
    texture_modifications: [String],
    feeding_position: String,
    special_equipment: [String]
  },

  // متابعة الوزن
  weight_monitoring: [{
    date: Date,
    weight: Number,
    bmi: Number,
    notes: String
  }],

  // أهداف التغذية
  nutrition_goals: [{
    goal: String,
    target: String,
    timeline: Date,
    status: { type: String, enum: ['not_started', 'in_progress', 'achieved', 'not_achieved'] }
  }],

  effective_date: { type: Date, default: Date.now },
  end_date: Date,

  dietitian: { type: Schema.Types.ObjectId, ref: 'User' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 8. نظام إدارة غرف الموارد
// Resource Room Management System
// ============================================

const resourceRoomSchema = new Schema({
  room_id: {
    type: String,
    unique: true,
    default: () => `ROM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  room_info: {
    name: { type: String, required: true },
    code: String,
    building: String,
    floor: String,
    capacity: Number,
    area: Number, // بالمتر المربع
    room_type: {
      type: String,
      enum: ['therapy_room', 'assessment_room', 'group_room', 'sensory_room', 'gym', 'pool', 'classroom', 'office', 'conference']
    }
  },

  // المعدات المتوفرة
  equipment: [{
    equipment_id: { type: Schema.Types.ObjectId, ref: 'AssistiveEquipment' },
    name: String,
    quantity: Number,
    condition: String
  }],

  // الميزات الخاصة
  features: {
    wheelchair_accessible: { type: Boolean, default: true },
    sensory_equipment: { type: Boolean, default: false },
    sound_proofing: { type: Boolean, default: false },
    adjustable_lighting: { type: Boolean, default: false },
    ac: { type: Boolean, default: true },
    projector: { type: Boolean, default: false },
    whiteboard: { type: Boolean, default: true },
    computer: { type: Boolean, default: false },
    bathroom_attached: { type: Boolean, default: false }
  },

  // الجدول الزمني
  schedule: [{
    day: {
      type: String,
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    time_slots: [{
      start_time: String,
      end_time: String,
      is_available: { type: Boolean, default: true },
      booking_id: String,
      purpose: String
    }]
  }],

  // الحجوزات
  bookings: [{
    booking_id: String,
    date: Date,
    start_time: String,
    end_time: String,
    booked_by: { type: Schema.Types.ObjectId, ref: 'User' },
    purpose: String,
    beneficiaries_count: Number,
    status: { type: String, enum: ['booked', 'confirmed', 'cancelled', 'completed'] }
  }],

  // الصيانة
  maintenance: [{
    date: Date,
    type: { type: String, enum: ['routine', 'repair', 'deep_clean', 'renovation'] },
    description: String,
    cost: Number,
    performed_by: String,
    next_maintenance: Date
  }],

  is_available: { type: Boolean, default: true },
  notes: String
}, { timestamps: true });

// ============================================
// 9. نظام الشهادات والاعتمادات
// Certifications and Accreditation System
// ============================================

const staffCertificationSchema = new Schema({
  certification_id: {
    type: String,
    unique: true,
    default: () => `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  staff_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // معلومات الشهادة
  certification_info: {
    certification_name: { type: String, required: true },
    issuing_organization: { type: String, required: true },
    certification_type: {
      type: String,
      enum: ['professional', 'specialty', 'continuing_education', 'license', 'accreditation']
    },
    category: String,
    level: String
  },

  // التواريخ
  dates: {
    issue_date: { type: Date, required: true },
    expiry_date: Date,
    is_lifetime: { type: Boolean, default: false },
    renewal_due_date: Date
  },

  // رقم الشهادة
  credential_number: String,

  // الحالة
  status: {
    type: String,
    enum: ['active', 'expired', 'pending_renewal', 'revoked', 'inactive'],
    default: 'active'
  },

  // التجديد
  renewals: [{
    renewal_date: Date,
    renewed_by: String,
    new_expiry_date: Date,
    ce_hours: Number,
    notes: String
  }],

  // ساعات التعليم المستمر
  continuing_education: {
    total_hours_required: Number,
    hours_completed: Number,
    courses: [{
      course_name: String,
      provider: String,
      date: Date,
      hours: Number,
      certificate_url: String
    }]
  },

  // المرفقات
  documents: [{
    document_type: String,
    file_name: String,
    file_url: String,
    upload_date: { type: Date, default: Date.now }
  }],

  // التحقق
  verification: {
    verified: { type: Boolean, default: false },
    verified_by: { type: Schema.Types.ObjectId, ref: 'User' },
    verification_date: Date,
    verification_method: String
  },

  notes: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 10. نظام التقييم الدوري والخروج
// Periodic Review and Discharge System
// ============================================

const dischargePlanSchema = new Schema({
  discharge_id: {
    type: String,
    unique: true,
    default: () => `DIS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // معلومات الخروج
  discharge_info: {
    discharge_type: {
      type: String,
      enum: ['completed_program', 'transferred', 'aging_out', 'family_request', 'insurance', 'other'],
      required: true
    },
    planned_discharge_date: Date,
    actual_discharge_date: Date,
    reason: String
  },

  // ملخص التقدم
  progress_summary: {
    goals_achieved: [{
      goal: String,
      achievement_date: Date,
      evidence: String
    }],
    goals_partially_achieved: [{
      goal: String,
      progress_percentage: Number,
      remaining_steps: String
    }],
    skills_acquired: [String],
    behavioral_improvements: [String],
    areas_needing_continued_support: [String]
  },

  // التقييم النهائي
  final_assessment: {
    assessment_date: Date,
    assessor: { type: Schema.Types.ObjectId, ref: 'User' },
    overall_progress_rating: { type: Number, min: 1, max: 5 },
    functional_improvement: String,
    comparison_with_baseline: String,
    assessment_tools_used: [String]
  },

  // خطة ما بعد الخروج
  post_discharge_plan: {
    recommended_services: [{
      service_type: String,
      frequency: String,
      provider_recommendation: String,
      urgency: { type: String, enum: ['immediate', 'within_month', 'within_3_months', 'not_urgent'] }
    }],

    referral_to_external: [{
      organization: String,
      service: String,
      contact_person: String,
      contact_info: String,
      referral_date: Date,
      referral_status: String
    }],

    home_program: {
      activities: [String],
      frequency: String,
      family_training_provided: { type: Boolean, default: false }
    },

    follow_up_schedule: [{
      follow_up_date: Date,
      follow_up_type: String,
      responsible_staff: { type: Schema.Types.ObjectId, ref: 'User' }
    }]
  },

  // تعليمات للأسرة
  family_instructions: {
    home_activities: [String],
    warning_signs_to_monitor: [String],
    emergency_contacts: [{
      name: String,
      role: String,
      phone: String
    }],
    resources_provided: [String]
  },

  // إمدادات المعدات
  equipment_provided: [{
    equipment_name: String,
    purpose: String,
    training_provided: { type: Boolean, default: false }
  }],

  // تقييم رضا الأسرة
  family_satisfaction: {
    survey_date: Date,
    overall_satisfaction: { type: Number, min: 1, max: 5 },
    quality_of_service: Number,
    communication: Number,
    would_recommend: { type: Boolean },
    feedback: String,
    suggestions: String
  },

  // اجتماع الخروج
  discharge_meeting: {
    meeting_date: Date,
    attendees: [String],
    summary: String,
    decisions_made: [String],
    action_items: [{
      action: String,
      responsible: String,
      deadline: Date
    }]
  },

  // الموافقات
  approvals: {
    case_manager_approval: {
      approved: { type: Boolean, default: false },
      approver_id: { type: Schema.Types.ObjectId, ref: 'User' },
      approval_date: Date,
      comments: String
    },
    guardian_acknowledgment: {
      acknowledged: { type: Boolean, default: false },
      guardian_name: String,
      acknowledgment_date: Date,
      signature_url: String
    }
  },

  status: {
    type: String,
    enum: ['planning', 'in_progress', 'completed', 'cancelled'],
    default: 'planning'
  },

  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// إنشاء الفهارس
// ============================================

behaviorIncidentSchema.index({ beneficiary_id: 1, 'incident_info.date': -1 });
behaviorPlanSchema.index({ beneficiary_id: 1, status: 1 });
vocationalProfileSchema.index({ beneficiary_id: 1 });
homeProgramSchema.index({ beneficiary_id: 1, status: 1 });
medicationRecordSchema.index({ beneficiary_id: 1, status: 1 });
autismProfileSchema.index({ beneficiary_id: 1 });
therapySessionSchema.index({ beneficiary_id: 1, 'session_info.date': -1 });
nutritionPlanSchema.index({ beneficiary_id: 1 });
resourceRoomSchema.index({ 'room_info.room_type': 1, is_available: 1 });
staffCertificationSchema.index({ staff_id: 1, status: 1 });
dischargePlanSchema.index({ beneficiary_id: 1, status: 1 });

// ============================================
// تصدير النماذج
// ============================================

module.exports = {
  // نظام السلوك
  BehaviorIncident: mongoose.model('BehaviorIncident', behaviorIncidentSchema),
  BehaviorPlan: mongoose.model('BehaviorPlan', behaviorPlanSchema),

  // نظام التدريب المهني
  VocationalProfile: mongoose.model('VocationalProfile', vocationalProfileSchema),
  JobCoachLog: mongoose.model('JobCoachLog', jobCoachLogSchema),

  // نظام المتابعة المنزلية
  HomeProgram: mongoose.model('HomeProgram', homeProgramSchema),

  // نظام الأدوية
  MedicationRecord: mongoose.model('MedicationRecord', medicationRecordSchema),

  // نظام التوحد
  AutismProfile: mongoose.model('AutismProfile', autismProfileSchema),

  // نظام العلاج
  TherapySession: mongoose.model('TherapySession', therapySessionSchema),

  // نظام التغذية
  NutritionPlan: mongoose.model('NutritionPlan', nutritionPlanSchema),

  // نظام غرف الموارد
  ResourceRoom: mongoose.model('ResourceRoom', resourceRoomSchema),

  // نظام الشهادات
  StaffCertification: mongoose.model('StaffCertification', staffCertificationSchema),

  // نظام الخروج
  DischargePlan: mongoose.model('DischargePlan', dischargePlanSchema)
};

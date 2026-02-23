/**
 * Intelligent Rehabilitation Center Systems
 * أنظمة ذكية ومتقدمة لمراكز تأهيل ذوي الإعاقة
 *
 * @module models/rehabilitation-intelligent
 * @description أنظمة ذكية تستخدم الذكاء الاصطناعي والتحليلات المتقدمة
 * @version 3.0.0
 * @date 2026-02-21
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============================================
// 1. نظام الذكاء الاصطناعي للتوصيات
// AI Recommendations System
// ============================================

const aiRecommendationSchema = new Schema({
  recommendation_id: {
    type: String,
    unique: true,
    default: () => `REC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // نوع التوصية
  recommendation_type: {
    type: String,
    enum: [
      'intervention',      // تدخل علاجي
      'goal_adjustment',   // تعديل الهدف
      'resource',          // مورد
      'service',           // خدمة
      'behavior_strategy', // استراتيجية سلوكية
      'equipment',         // معدات
      'referral',          // تحويل
      'training',          // تدريب
      'accommodation',     // تكييف
      'risk_alert'         // تنبيه مخاطر
    ]
  },

  // محتوى التوصية
  content: {
    title: { type: String, required: true },
    description: String,
    rationale: String, // السبب المنطقي
    evidence_base: [String], // الأدلة العلمية
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
    confidence_score: { type: Number, min: 0, max: 100 } // درجة الثقة
  },

  // مصدر التوصية
  source: {
    algorithm: String,
    data_sources: [String],
    model_version: String,
    generated_at: { type: Date, default: Date.now }
  },

  // البيانات المستخدمة
  input_data: {
    assessment_scores: Schema.Types.Mixed,
    behavioral_data: Schema.Types.Mixed,
    progress_metrics: Schema.Types.Mixed,
    demographic_factors: Schema.Types.Mixed,
    historical_data: Schema.Types.Mixed
  },

  // التوصيات التفصيلية
  detailed_recommendations: [{
    category: String,
    recommendation: String,
    expected_outcome: String,
    implementation_steps: [String],
    timeline: String,
    required_resources: [String]
  }],

  // ملاحظات الخبراء
  expert_feedback: [{
    expert_id: { type: Schema.Types.ObjectId, ref: 'User' },
    feedback_type: { type: String, enum: ['approved', 'modified', 'rejected', 'needs_discussion'] },
    comments: String,
    suggested_modifications: String,
    feedback_date: { type: Date, default: Date.now }
  }],

  // حالة التنفيذ
  implementation_status: {
    status: { type: String, enum: ['pending', 'approved', 'in_progress', 'completed', 'rejected'], default: 'pending' },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
    approved_date: Date,
    implemented_by: { type: Schema.Types.ObjectId, ref: 'User' },
    implemented_date: Date,
    outcome_evaluation: String
  },

  // فعالية التوصية
  effectiveness: {
    measured: { type: Boolean, default: false },
    measurement_date: Date,
    outcome_score: Number,
    beneficiary_improvement: String,
    notes: String
  },

  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 2. نظام التحليلات التنبؤية
// Predictive Analytics System
// ============================================

const predictiveModelSchema = new Schema({
  model_id: {
    type: String,
    unique: true,
    default: () => `PRED-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  model_name: { type: String, required: true },
  model_type: {
    type: String,
    enum: [
      'progress_prediction',     // توقع التقدم
      'behavior_prediction',     // توقع السلوك
      'risk_assessment',         // تقييم المخاطر
      'outcome_prediction',      // توقع النتائج
      'resource_optimization',   // تحسين الموارد
      'dropout_prediction',      // توقع الانسحاب
      'length_of_stay',          // مدة البقاء
      'goal_achievement'         // تحقيق الأهداف
    ]
  },

  // معلمات النموذج
  model_parameters: {
    algorithm: { type: String, enum: ['random_forest', 'neural_network', 'gradient_boosting', 'logistic_regression', 'xgboost', 'lstm'] },
    features: [String],
    hyperparameters: Schema.Types.Mixed,
    training_data_size: Number,
    validation_metrics: {
      accuracy: Number,
      precision: Number,
      recall: Number,
      f1_score: Number,
      auc_roc: Number
    }
  },

  // حالة النموذج
  status: {
    type: String,
    enum: ['development', 'testing', 'production', 'deprecated'],
    default: 'development'
  },

  // آخر تدريب
  last_training: {
    date: Date,
    data_range: { start: Date, end: Date },
    improvement_from_previous: Number
  },

  // الاستخدام
  usage_stats: {
    total_predictions: { type: Number, default: 0 },
    successful_predictions: { type: Number, default: 0 },
    average_confidence: Number,
    last_used: Date
  },

  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const predictionResultSchema = new Schema({
  prediction_id: {
    type: String,
    unique: true,
    default: () => `PRD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
  model_id: { type: Schema.Types.ObjectId, ref: 'PredictiveModel', required: true },

  // المدخلات
  input_features: Schema.Types.Mixed,

  // النتائج
  prediction_result: {
    predicted_value: Schema.Types.Mixed,
    confidence_interval: {
      lower: Number,
      upper: Number
    },
    probability: Number,
    category: String,
    timeline: String
  },

  // العوامل المؤثرة
  contributing_factors: [{
    factor: String,
    importance: Number,
    direction: { type: String, enum: ['positive', 'negative', 'neutral'] }
  }],

  // التحقق
  validation: {
    actual_outcome: Schema.Types.Mixed,
    validated: { type: Boolean, default: false },
    validation_date: Date,
    accuracy_score: Number,
    validated_by: { type: Schema.Types.ObjectId, ref: 'User' }
  },

  // الإجراءات المتخذة
  actions_taken: [{
    action: String,
    taken_by: { type: Schema.Types.ObjectId, ref: 'User' },
    date: Date,
    outcome: String
  }],

  generated_at: { type: Date, default: Date.now }
}, { timestamps: true });

// ============================================
// 3. نظام إدارة المخاطر
// Risk Management System
// ============================================

const riskAssessmentSchema = new Schema({
  assessment_id: {
    type: String,
    unique: true,
    default: () => `RSK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // تقييم المخاطر
  risk_categories: {
    physical_safety: {
      score: { type: Number, min: 1, max: 10 },
      factors: [String],
      mitigation_strategies: [String]
    },
    behavioral_risk: {
      score: { type: Number, min: 1, max: 10 },
      factors: [String],
      mitigation_strategies: [String]
    },
    medical_risk: {
      score: { type: Number, min: 1, max: 10 },
      factors: [String],
      mitigation_strategies: [String]
    },
    environmental_risk: {
      score: { type: Number, min: 1, max: 10 },
      factors: [String],
      mitigation_strategies: [String]
    },
    safeguarding: {
      score: { type: Number, min: 1, max: 10 },
      factors: [String],
      mitigation_strategies: [String]
    }
  },

  // المخاطر المحددة
  identified_risks: [{
    risk_id: String,
    risk_type: String,
    description: String,
    likelihood: { type: String, enum: ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'] },
    impact: { type: String, enum: ['negligible', 'minor', 'moderate', 'major', 'catastrophic'] },
    risk_score: Number,
    risk_level: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    mitigation_plan: String,
    contingency_plan: String,
    responsible_person: { type: Schema.Types.ObjectId, ref: 'User' },
    review_date: Date,
    status: { type: String, enum: ['active', 'mitigated', 'resolved', 'accepted'] }
  }],

  // خطة إدارة المخاطر
  risk_management_plan: {
    prevention_strategies: [String],
    response_protocols: [{
      scenario: String,
      immediate_actions: [String],
      escalation_procedure: String,
      contact_persons: [String]
    }],
    monitoring_schedule: String,
    review_frequency: String
  },

  // التاريخ
  assessment_history: [{
    date: Date,
    assessor: { type: Schema.Types.ObjectId, ref: 'User' },
    overall_risk_level: String,
    changes_from_previous: [String]
  }],

  // التنبيهات
  alerts: [{
    alert_type: String,
    trigger_condition: String,
    alert_message: String,
    recipients: [String],
    is_active: { type: Boolean, default: true }
  }],

  overall_risk_level: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },

  next_review_date: Date,
  assessor: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 4. نظام الجودة والاعتماد
// Quality and Accreditation System
// ============================================

const qualityIndicatorSchema = new Schema({
  indicator_id: {
    type: String,
    unique: true,
    default: () => `QI-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  indicator_name: { type: String, required: true },
  indicator_code: String,
  category: {
    type: String,
    enum: [
      'clinical_outcomes',    // النتائج العلاجية
      'safety',               // السلامة
      'beneficiary_experience', // تجربة المستفيد
      'staff_competency',     // كفاءة الموظفين
      'operational',          // التشغيلية
      'compliance'            // الامتثال
    ]
  },

  // التعريف
  definition: {
    description: String,
    numerator: String,
    denominator: String,
    calculation_method: String,
    data_sources: [String]
  },

  // المعايير
  benchmarks: {
    internal_target: Number,
    external_benchmark: Number,
    national_standard: Number,
    international_standard: Number
  },

  // التجميع
  data_collection: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'] },
    responsible: { type: Schema.Types.ObjectId, ref: 'User' },
    data_collection_method: String,
    validation_process: String
  },

  // النتائج
  measurements: [{
    period: { start: Date, end: Date },
    value: Number,
    target_achieved: Boolean,
    variance: Number,
    trend: { type: String, enum: ['improving', 'stable', 'declining'] },
    notes: String,
    collected_by: { type: Schema.Types.ObjectId, ref: 'User' },
    collected_at: { type: Date, default: Date.now }
  }],

  // تحسين الأداء
  improvement_actions: [{
    action: String,
    responsible: { type: Schema.Types.ObjectId, ref: 'User' },
    target_date: Date,
    status: String,
    impact: String
  }],

  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const accreditationStandardSchema = new Schema({
  standard_id: {
    type: String,
    unique: true,
    default: () => `ACC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات المعيار
  standard_info: {
    name: { type: String, required: true },
    code: String,
    description: String,
    accreditation_body: String, // CBAHI, JCI, CARF, etc.
    version: String,
    effective_date: Date
  },

  // المتطلبات
  requirements: [{
    requirement_code: String,
    requirement_text: String,
    requirement_type: { type: String, enum: ['mandatory', 'recommended'] },
    evidence_required: [String],
    scoring_method: String
  }],

  // التقييم
  compliance_assessment: [{
    requirement_code: String,
    current_status: { type: String, enum: ['compliant', 'partial', 'non_compliant', 'not_applicable'] },
    evidence: [String],
    gaps: [String],
    corrective_actions: [String],
    target_date: Date,
    responsible: { type: Schema.Types.ObjectId, ref: 'User' },
    assessment_date: Date,
    assessor: { type: Schema.Types.ObjectId, ref: 'User' }
  }],

  // حالة الاعتماد
  accreditation_status: {
    status: { type: String, enum: ['preparing', 'ready', 'submitted', 'survey_scheduled', 'surveyed', 'accredited', 'conditional', 'denied'] },
    current_score: Number,
    target_score: Number,
    validity_period: { start: Date, end: Date },
    last_survey_date: Date,
    next_survey_date: Date
  },

  // خطة التحضير
  preparation_plan: {
    milestones: [{
      milestone: String,
      target_date: Date,
      responsible: { type: Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'in_progress', 'completed', 'delayed'] }
    }],
    training_required: [String],
    resources_needed: [String]
  },

  is_active: { type: Boolean, default: true }
}, { timestamps: true });

// ============================================
// 5. نظام الأبحاث والدراسات
// Research and Studies System
// ============================================

const researchProjectSchema = new Schema({
  project_id: {
    type: String,
    unique: true,
    default: () => `RES-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات البحث
  project_info: {
    title: { type: String, required: true },
    abstract: String,
    research_questions: [String],
    hypotheses: [String],
    objectives: [String],
    keywords: [String]
  },

  // المنهجية
  methodology: {
    study_type: {
      type: String,
      enum: ['quantitative', 'qualitative', 'mixed_methods', 'case_study', 'longitudinal', 'experimental']
    },
    design: String,
    sample_size: Number,
    inclusion_criteria: [String],
    exclusion_criteria: [String],
    data_collection_methods: [String],
    instruments: [String],
    statistical_methods: [String]
  },

  // الفريق
  research_team: {
    principal_investigator: { type: Schema.Types.ObjectId, ref: 'User' },
    co_investigators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    research_assistants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    external_collaborators: [String]
  },

  // الموافقات الأخلاقية
  ethics: {
    irb_approval: {
      approved: { type: Boolean, default: false },
      approval_number: String,
      approval_date: Date,
      expiry_date: Date
    },
    consent_forms: [{
      type: String,
      version: String,
      approval_date: Date,
      file_url: String
    }],
    data_protection_measures: [String]
  },

  // المشاركون
  participants: [{
    participant_id: String,
    enrollment_date: Date,
    group_assignment: String,
    status: { type: String, enum: ['enrolled', 'active', 'withdrawn', 'completed'] },
    withdrawal_reason: String
  }],

  // جمع البيانات
  data_collection: [{
    collection_point: String,
    target_date: Date,
    actual_date: Date,
    participants_targeted: Number,
    participants_completed: Number,
    data_quality_notes: String,
    collected_by: { type: Schema.Types.ObjectId, ref: 'User' }
  }],

  // الجدول الزمني
  timeline: {
    start_date: Date,
    end_date: Date,
    phases: [{
      phase_name: String,
      start_date: Date,
      end_date: Date,
      status: String
    }]
  },

  // الميزانية
  budget: {
    total_budget: Number,
    sources: [String],
    expenditures: [{
      category: String,
      amount: Number,
      date: Date,
      notes: String
    }]
  },

  // النتائج
  findings: {
    preliminary_results: String,
    final_results: String,
    statistical_significance: Schema.Types.Mixed,
    limitations: [String],
    recommendations: [String]
  },

  // المنشورات
  publications: [{
    type: { type: String, enum: ['journal', 'conference', 'thesis', 'report'] },
    title: String,
    publication_date: Date,
    venue: String,
    doi: String,
    file_url: String
  }],

  status: {
    type: String,
    enum: ['proposal', 'irb_review', 'data_collection', 'analysis', 'writing', 'completed', 'published', 'suspended'],
    default: 'proposal'
  }
}, { timestamps: true });

// ============================================
// 6. نظام التطوير المهني للموظفين
// Professional Development System
// ============================================

const trainingProgramSchema = new Schema({
  program_id: {
    type: String,
    unique: true,
    default: () => `TRN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  program_name: { type: String, required: true },
  program_type: {
    type: String,
    enum: ['onboarding', 'mandatory', 'specialty', 'leadership', 'soft_skills', 'technical', 'safety']
  },

  // المحتوى
  content: {
    description: String,
    learning_objectives: [String],
    competencies_addressed: [String],
    duration_hours: Number,
    delivery_method: { type: String, enum: ['in_person', 'online', 'blended', 'self_paced'] },
    materials: [{
      title: String,
      type: String,
      url: String
    }]
  },

  // المدربون
  instructors: [{
    instructor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    qualification: String,
    role: String
  }],

  // الجلسات
  sessions: [{
    session_number: Number,
    title: String,
    date: Date,
    start_time: String,
    end_time: String,
    location: String,
    topics: [String]
  }],

  // التقييم
  assessment: {
    pre_test: { enabled: Boolean, passing_score: Number },
    post_test: { enabled: Boolean, passing_score: Number },
    practical_assessment: { enabled: Boolean, criteria: [String] },
    certificate_issued: { type: Boolean, default: false }
  },

  // الجمهور المستهدف
  target_audience: {
    roles: [String],
    departments: [String],
    experience_level: { type: String, enum: ['entry', 'intermediate', 'advanced', 'all'] },
    prerequisites: [String]
  },

  // التسجيل
  enrollments: [{
    staff_id: { type: Schema.Types.ObjectId, ref: 'User' },
    enrollment_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['enrolled', 'in_progress', 'completed', 'failed', 'withdrawn'] },
    completion_date: Date,
    score: Number,
    certificate_url: String,
    feedback: String
  }],

  // فعاليات البرنامج
  effectiveness: {
    average_rating: Number,
    completion_rate: Number,
    pass_rate: Number,
    participant_feedback: [{
      staff_id: { type: Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
      comments: String,
      date: Date
    }],
    improvement_suggestions: [String]
  },

  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const competencyAssessmentSchema = new Schema({
  assessment_id: {
    type: String,
    unique: true,
    default: () => `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  staff_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  assessment_type: {
    type: String,
    enum: ['initial', 'periodic', 'promotion', 'remediation', 'annual']
  },
  assessment_date: { type: Date, default: Date.now },

  // الكفاءات المُقيمة
  competencies: [{
    competency_name: String,
    category: String,
    expected_level: { type: String, enum: ['novice', 'competent', 'proficient', 'expert'] },
    actual_level: { type: String, enum: ['novice', 'competent', 'proficient', 'expert'] },
    score: { type: Number, min: 0, max: 100 },
    evidence: [String],
    gaps_identified: [String],
    development_actions: [String]
  }],

  // التقييم الشامل
  overall_assessment: {
    total_score: Number,
    competency_level: String,
    strengths: [String],
    areas_for_development: [String],
    recommendations: [String]
  },

  // خطة التطوير
  development_plan: {
    goals: [{
      goal: String,
      target_date: Date,
      activities: [String],
      resources: [String],
      status: String
    }],
    training_needed: [String],
    mentoring_assigned: { type: Schema.Types.ObjectId, ref: 'User' },
    review_schedule: String
  },

  assessor: { type: Schema.Types.ObjectId, ref: 'User' },
  acknowledged_by_staff: { type: Boolean, default: false },
  acknowledgment_date: Date
}, { timestamps: true });

// ============================================
// 7. نظام إدارة الطوارئ والأزمات
// Emergency and Crisis Management System
// ============================================

const emergencyProtocolSchema = new Schema({
  protocol_id: {
    type: String,
    unique: true,
    default: () => `EMG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  protocol_name: { type: String, required: true },
  emergency_type: {
    type: String,
    enum: [
      'medical_emergency',     // طوارئ طبية
      'behavioral_crisis',     // أزمة سلوكية
      'fire',                  // حريق
      'natural_disaster',      // كارثة طبيعية
      'security_threat',       // تهديد أمني
      'evacuation',            // إخلاء
      'lockdown',              // إغلاق
      'missing_person',        // شخص مفقود
      'medical_outbreak',      // تفشي مرض
      'utility_failure'        // انقطاع خدمات
    ]
  },

  // بروتوكول الاستجابة
  response_protocol: {
    immediate_actions: [String],
    notification_sequence: [{
      position: Number,
      role: String,
      contact_method: String,
      timeframe: String
    }],
    roles_responsibilities: [{
      role: String,
      responsibilities: [String]
    }],
    required_resources: [String],
    evacuation_routes: [String],
    assembly_points: [String]
  },

  // جهات الاتصال الطارئة
  emergency_contacts: [{
    name: String,
    role: String,
    phone: String,
    alternative_phone: String,
    priority: Number
  }],

  // الموارد
  resources: {
    first_aid_kits: [{ location: String, last_check: Date }],
    aed_locations: [{ location: String, last_check: Date }],
    emergency_exits: [String],
    fire_extinguishers: [{ location: String, type: String, last_inspection: Date }],
    emergency_supplies: [{ item: String, location: String, quantity: Number }]
  },

  // التدريبات
  drills: [{
    drill_date: Date,
    drill_type: String,
    participants_count: Number,
    duration_minutes: Number,
    findings: [String],
    recommendations: [String],
    conducted_by: { type: Schema.Types.ObjectId, ref: 'User' }
  }],

  // التدريب المطلوب
  training_requirements: [{
    training_type: String,
    target_roles: [String],
    frequency: String,
    last_training: Date
  }],

  is_active: { type: Boolean, default: true },
  last_reviewed: Date,
  next_review: Date
}, { timestamps: true });

const emergencyIncidentSchema = new Schema({
  incident_id: {
    type: String,
    unique: true,
    default: () => `INC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات الحادث
  incident_info: {
    type: { type: String, required: true },
    date: { type: Date, required: true },
    time: String,
    location: String,
    reported_by: { type: Schema.Types.ObjectId, ref: 'User' }
  },

  // التفاصيل
  details: {
    description: String,
    beneficiaries_involved: [{ type: Schema.Types.ObjectId, ref: 'Beneficiary' }],
    staff_involved: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    injuries: [{
      person_type: { type: String, enum: ['beneficiary', 'staff', 'visitor'] },
      person_id: Schema.Types.ObjectId,
      injury_type: String,
      severity: String,
      treatment_provided: String
    }],
    property_damage: [{
      item: String,
      damage_description: String,
      estimated_cost: Number
    }]
  },

  // الاستجابة
  response: {
    response_time: Number, // بالدقائق
    protocols_activated: [String],
    actions_taken: [String],
    external_services_contacted: [String],
    responders: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },

  // الحل
  resolution: {
    resolved: { type: Boolean, default: false },
    resolution_date: Date,
    resolution_details: String,
    follow_up_required: { type: Boolean, default: false },
    follow_up_actions: [String]
  },

  // التحليل
  analysis: {
    root_cause: String,
    contributing_factors: [String],
    preventive_measures: [String],
    lessons_learned: String
  },

  // المراجعة
  review: {
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    review_date: Date,
    policy_changes_needed: [String],
    training_needs_identified: [String]
  },

  status: {
    type: String,
    enum: ['active', 'contained', 'resolved', 'under_review', 'closed'],
    default: 'active'
  }
}, { timestamps: true });

// ============================================
// 8. نظام التكامل مع الجهات الحكومية
// Government Integration System
// ============================================

const governmentIntegrationSchema = new Schema({
  integration_id: {
    type: String,
    unique: true,
    default: () => `GOV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات الجهة
  entity_info: {
    entity_name: { type: String, required: true },
    entity_type: {
      type: String,
      enum: [
        'ministry_of_health',      // وزارة الصحة
        'ministry_of_education',   // وزارة التعليم
        'ministry_of_labor',       // وزارة العمل
        'social_development',      // التنمية الاجتماعية
        'disability_authority',    // هيئة ذوي الإعاقة
        'insurance',               // التأمينات
        'municipality',            // البلدية
        'civil_defense',           // الدفاع المدني
        'other'
      ]
    },
    api_endpoint: String,
    authentication_method: { type: String, enum: ['oauth2', 'api_key', 'certificate', 'basic'] },
    credentials: {
      encrypted_key: String,
      expiry_date: Date
    }
  },

  // أنواع البيانات المتزامنة
  data_sync: {
    sync_types: [{
      type: String,
      frequency: { type: String, enum: ['real_time', 'hourly', 'daily', 'weekly', 'on_demand'] },
      direction: { type: String, enum: ['push', 'pull', 'bidirectional'] },
      last_sync: Date,
      last_status: String
    }],
    field_mappings: [{
      local_field: String,
      remote_field: String,
      transformation: String
    }]
  },

  // سجل التزامن
  sync_log: [{
    sync_date: { type: Date, default: Date.now },
    sync_type: String,
    records_processed: Number,
    records_successful: Number,
    records_failed: Number,
    errors: [String],
    duration_ms: Number
  }],

  // التقارير المطلوبة
  required_reports: [{
    report_name: String,
    frequency: String,
    format: { type: String, enum: ['xml', 'json', 'csv', 'pdf'] },
    last_submitted: Date,
    next_due: Date
  }],

  is_active: { type: Boolean, default: true }
}, { timestamps: true });

// ============================================
// إنشاء الفهارس
// ============================================

aiRecommendationSchema.index({ beneficiary_id: 1, 'implementation_status.status': 1 });
predictiveModelSchema.index({ model_type: 1, status: 1 });
predictionResultSchema.index({ beneficiary_id: 1, generated_at: -1 });
riskAssessmentSchema.index({ beneficiary_id: 1, next_review_date: 1 });
qualityIndicatorSchema.index({ category: 1, is_active: 1 });
accreditationStandardSchema.index({ 'standard_info.accreditation_body': 1 });
researchProjectSchema.index({ status: 1, 'research_team.principal_investigator': 1 });
trainingProgramSchema.index({ program_type: 1, is_active: 1 });
competencyAssessmentSchema.index({ staff_id: 1, assessment_date: -1 });
emergencyProtocolSchema.index({ emergency_type: 1, is_active: 1 });
emergencyIncidentSchema.index({ 'incident_info.date': -1, status: 1 });
governmentIntegrationSchema.index({ 'entity_info.entity_type': 1, is_active: 1 });

// ============================================
// تصدير النماذج
// ============================================

module.exports = {
  // الذكاء الاصطناعي
  AIRecommendation: mongoose.model('AIRecommendation', aiRecommendationSchema),
  PredictiveModel: mongoose.model('PredictiveModel', predictiveModelSchema),
  PredictionResult: mongoose.model('PredictionResult', predictionResultSchema),

  // إدارة المخاطر
  RiskAssessment: mongoose.model('RiskAssessment', riskAssessmentSchema),

  // الجودة والاعتماد
  QualityIndicator: mongoose.model('QualityIndicator', qualityIndicatorSchema),
  AccreditationStandard: mongoose.model('AccreditationStandard', accreditationStandardSchema),

  // الأبحاث
  ResearchProject: mongoose.model('ResearchProject', researchProjectSchema),

  // التطوير المهني
  TrainingProgram: mongoose.model('TrainingProgram', trainingProgramSchema),
  CompetencyAssessment: mongoose.model('CompetencyAssessment', competencyAssessmentSchema),

  // الطوارئ
  EmergencyProtocol: mongoose.model('EmergencyProtocol', emergencyProtocolSchema),
  EmergencyIncident: mongoose.model('EmergencyIncident', emergencyIncidentSchema),

  // التكامل الحكومي
  GovernmentIntegration: mongoose.model('GovernmentIntegration', governmentIntegrationSchema)
};

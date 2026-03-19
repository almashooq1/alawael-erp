/* eslint-disable no-unused-vars */
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
  CEREBRAL_PALSY: 'cerebral_palsy', // شلل دماغي
  DOWN_SYNDROME: 'down_syndrome', // متلازمة داون
  ADHD: 'adhd', // اضطراب فرط الحركة وتشتت الانتباه
  EPILEPSY: 'epilepsy', // الصرع
  SPINAL_CORD_INJURY: 'spinal_cord_injury', // إصابة الحبل الشوكي
  CHRONIC_ILLNESS: 'chronic_illness', // أمراض مزمنة
  GENETIC_DISORDER: 'genetic_disorder', // اضطراب وراثي
  TRAUMATIC_BRAIN_INJURY: 'traumatic_brain_injury', // إصابة دماغية رضحية
  MUSCULAR_DYSTROPHY: 'muscular_dystrophy', // ضمور عضلي
  RARE_DISEASE: 'rare_disease', // أمراض نادرة
};

/**
 * Service Types Schema
 * أنواع الخدمات التأهيلية
 */
const serviceTypes = {
  PHYSICAL_THERAPY: 'physical_therapy', // علاج طبيعي
  OCCUPATIONAL_THERAPY: 'occupational_therapy', // علاج وظيفي
  SPEECH_THERAPY: 'speech_therapy', // علاج نطق ولغة
  BEHAVIORAL_THERAPY: 'behavioral_therapy', // علاج سلوكي
  SPECIAL_EDUCATION: 'special_education', // تربية خاصة
  PSYCHOLOGICAL_SUPPORT: 'psychological_support', // دعم نفسي
  SOCIAL_WORK: 'social_work', // خدمة اجتماعية
  VOCATIONAL_TRAINING: 'vocational_training', // تدريب مهني
  ASSISTIVE_TECHNOLOGY: 'assistive_technology', // تقنيات مساعدة
  FAMILY_COUNSELING: 'family_counseling', // إرشاد أسري
  HYDROTHERAPY: 'hydrotherapy', // علاج مائي
  MUSIC_THERAPY: 'music_therapy', // علاج بالموسيقى
  ART_THERAPY: 'art_therapy', // علاج بالفن
  HIPPOTHERAPY: 'hippotherapy', // علاج بركوب الخيل
  SENSORY_INTEGRATION: 'sensory_integration', // تكامل حسي
  EARLY_INTERVENTION: 'early_intervention', // تدخل مبكر
  GROUP_THERAPY: 'group_therapy', // علاج جماعي
  TELEREHABILITATION: 'telerehabilitation', // تأهيل عن بعد
  RECREATIONAL_THERAPY: 'recreational_therapy', // علاج ترفيهي
  NUTRITION_COUNSELING: 'nutrition_counseling', // إرشاد غذائي
  COGNITIVE_THERAPY: 'cognitive_therapy', // علاج معرفي
  PLAY_THERAPY: 'play_therapy', // علاج باللعب
  AQUATIC_THERAPY: 'aquatic_therapy', // علاج مائي متخصص
  ROBOTIC_THERAPY: 'robotic_therapy', // علاج بالروبوت
  VIRTUAL_REALITY_THERAPY: 'virtual_reality_therapy', // علاج بالواقع الافتراضي
};

/**
 * Goal Categories Schema
 * فئات أهداف التأهيل
 */
const goalCategories = [
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
  'emotional_regulation', // التنظيم العاطفي
  'life_skills', // مهارات حياتية
  'daily_living', // الأنشطة اليومية
  'community_integration', // الدمج المجتمعي
  'recreation', // الترفيه والتسلية
  'health_management', // إدارة الصحة
  'safety_awareness', // الوعي بالسلامة
  'fine_motor', // المهارات الحركية الدقيقة
  'gross_motor', // المهارات الحركية الكبرى
  'feeding_nutrition', // التغذية والأكل
  'toileting', // استخدام دورة المياه
  'dressing', // ارتداء الملابس
  'executive_function', // الوظائف التنفيذية
  'technology_use', // استخدام التكنولوجيا
];

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
          enum: goalCategories,
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
          enum: Object.values(serviceTypes),
          required: true,
        },
        // نوع الجلسة
        session_mode: {
          type: String,
          enum: ['in_person', 'telehealth', 'home_visit', 'community_based', 'hybrid'],
          default: 'in_person',
        },
        // مستوى الخدمة
        service_level: {
          type: String,
          enum: ['basic', 'intermediate', 'advanced', 'intensive', 'maintenance'],
          default: 'basic',
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

    // ═══════════════════════════════════════
    // ميزات جديدة - New Features
    // ═══════════════════════════════════════

    // خطة الانتقال - Transition Planning
    transition_plan: {
      transition_type: {
        type: String,
        enum: [
          'school_to_work', // من المدرسة إلى العمل
          'pediatric_to_adult', // من الأطفال إلى البالغين
          'inpatient_to_outpatient', // من داخلي إلى خارجي
          'program_to_community', // من البرنامج إلى المجتمع
          'early_intervention_to_school', // من التدخل المبكر إلى المدرسة
          'none', // لا يوجد
        ],
        default: 'none',
      },
      target_date: Date,
      readiness_score: { type: Number, min: 0, max: 100 },
      transition_goals: [
        {
          goal: String,
          status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending',
          },
          completion_date: Date,
        },
      ],
      receiving_organization: {
        name: String,
        contact_person: String,
        phone: String,
        email: String,
      },
      transition_meetings: [
        {
          date: Date,
          attendees: [String],
          summary: String,
          action_items: [String],
        },
      ],
      supports_needed_after: [String],
      status: {
        type: String,
        enum: ['not_started', 'planning', 'in_progress', 'completed'],
        default: 'not_started',
      },
    },

    // جلسات العلاج عن بعد - Telehealth Sessions
    telehealth_info: {
      enabled: { type: Boolean, default: false },
      platform: {
        type: String,
        enum: ['zoom', 'teams', 'google_meet', 'custom', 'other'],
      },
      total_telehealth_sessions: { type: Number, default: 0 },
      telehealth_effectiveness: {
        type: String,
        enum: ['very_effective', 'effective', 'neutral', 'less_effective', 'not_suitable'],
      },
      technical_requirements: [String],
      connectivity_issues: [
        {
          date: Date,
          issue: String,
          resolution: String,
        },
      ],
    },

    // تتبع الأدوية - Medication Tracking
    medications: [
      {
        medication_name: String,
        dosage: String,
        frequency: String,
        prescribing_doctor: String,
        start_date: Date,
        end_date: Date,
        purpose: String,
        side_effects_observed: [String],
        effectiveness: {
          type: String,
          enum: ['very_effective', 'effective', 'moderate', 'minimal', 'not_effective'],
        },
        status: {
          type: String,
          enum: ['active', 'discontinued', 'changed', 'completed'],
          default: 'active',
        },
        notes: String,
      },
    ],

    // قائمة الانتظار - Waiting List Info
    waiting_list_info: {
      was_on_waiting_list: { type: Boolean, default: false },
      date_added_to_waitlist: Date,
      date_removed_from_waitlist: Date,
      waiting_days: { type: Number, default: 0 },
      priority_level: {
        type: String,
        enum: ['urgent', 'high', 'normal', 'low'],
        default: 'normal',
      },
      priority_reason: String,
    },

    // تقييم المخاطر - Risk Assessment
    risk_assessment: {
      fall_risk: {
        level: { type: String, enum: ['none', 'low', 'moderate', 'high'], default: 'none' },
        precautions: [String],
        last_assessed: Date,
      },
      behavioral_risk: {
        level: { type: String, enum: ['none', 'low', 'moderate', 'high'], default: 'none' },
        triggers: [String],
        de_escalation_strategies: [String],
        last_assessed: Date,
      },
      medical_risk: {
        level: { type: String, enum: ['none', 'low', 'moderate', 'high'], default: 'none' },
        conditions: [String],
        emergency_protocols: [String],
        last_assessed: Date,
      },
      elopement_risk: {
        level: { type: String, enum: ['none', 'low', 'moderate', 'high'], default: 'none' },
        precautions: [String],
      },
      overall_risk_level: {
        type: String,
        enum: ['none', 'low', 'moderate', 'high', 'critical'],
        default: 'none',
      },
    },

    // جودة الحياة - Quality of Life Assessment
    quality_of_life: {
      physical_wellbeing: { type: Number, min: 1, max: 10 },
      emotional_wellbeing: { type: Number, min: 1, max: 10 },
      social_relationships: { type: Number, min: 1, max: 10 },
      personal_development: { type: Number, min: 1, max: 10 },
      self_determination: { type: Number, min: 1, max: 10 },
      social_inclusion: { type: Number, min: 1, max: 10 },
      rights_dignity: { type: Number, min: 1, max: 10 },
      material_wellbeing: { type: Number, min: 1, max: 10 },
      overall_score: { type: Number, min: 1, max: 10 },
      assessment_date: Date,
      assessor: String,
      history: [
        {
          date: Date,
          overall_score: Number,
          notes: String,
        },
      ],
    },

    // الخطة التعليمية الفردية - IEP Integration
    iep_plan: {
      has_iep: { type: Boolean, default: false },
      iep_start_date: Date,
      iep_end_date: Date,
      school_name: String,
      grade_level: String,
      special_education_teacher: String,
      iep_goals: [
        {
          area: {
            type: String,
            enum: [
              'reading',
              'writing',
              'math',
              'language',
              'social_emotional',
              'behavior',
              'adaptive',
              'motor',
              'transition',
              'other',
            ],
          },
          goal_description: String,
          baseline: String,
          target: String,
          progress: { type: Number, min: 0, max: 100, default: 0 },
          accommodations: [String],
          modifications: [String],
          measurement_method: String,
          review_dates: [Date],
        },
      ],
      related_services: [String],
      placement_type: {
        type: String,
        enum: [
          'general_education',
          'resource_room',
          'self_contained',
          'home_instruction',
          'residential',
          'specialized_school',
        ],
      },
    },

    // النقل والمواصلات - Transportation
    transportation: {
      needs_transportation: { type: Boolean, default: false },
      transportation_type: {
        type: String,
        enum: ['self', 'family', 'center_provided', 'public_transport', 'specialized_transport'],
      },
      wheelchair_accessible: { type: Boolean, default: false },
      escort_required: { type: Boolean, default: false },
      distance_km: Number,
      estimated_travel_time: Number, // بالدقائق
      special_requirements: [String],
    },

    // التأمين والتغطية - Insurance & Coverage
    insurance_info: {
      has_insurance: { type: Boolean, default: false },
      insurance_provider: String,
      policy_number: String,
      coverage_type: {
        type: String,
        enum: ['full', 'partial', 'specific_services', 'none'],
      },
      coverage_percentage: { type: Number, min: 0, max: 100 },
      covered_services: [String],
      excluded_services: [String],
      authorization_required: { type: Boolean, default: false },
      authorization_number: String,
      authorization_expiry: Date,
      annual_limit: Number,
      amount_used: { type: Number, default: 0 },
      remaining_balance: Number,
    },

    // خطة التخريج - Discharge Planning
    discharge_plan: {
      planned_discharge_date: Date,
      discharge_criteria: [
        {
          criterion: String,
          met: { type: Boolean, default: false },
          date_met: Date,
        },
      ],
      discharge_disposition: {
        type: String,
        enum: [
          'home_with_no_services',
          'home_with_outpatient',
          'home_with_home_health',
          'another_facility',
          'community_program',
          'school_based_services',
          'vocational_program',
          'independent_living',
        ],
      },
      follow_up_plan: {
        follow_up_date: Date,
        follow_up_provider: String,
        follow_up_services: [String],
        frequency: String,
      },
      recommendations: [String],
      home_modifications_needed: [String],
      equipment_to_continue: [String],
      family_training_completed: { type: Boolean, default: false },
      discharge_summary: String,
    },

    // البرنامج المنزلي - Home Program
    home_program: {
      has_home_program: { type: Boolean, default: false },
      exercises: [
        {
          exercise_name: String,
          description: String,
          frequency: String,
          duration: String,
          video_url: String,
          image_url: String,
          difficulty_level: {
            type: String,
            enum: ['easy', 'moderate', 'challenging'],
          },
          compliance_tracking: [
            {
              date: Date,
              completed: Boolean,
              notes: String,
            },
          ],
        },
      ],
      overall_compliance_rate: { type: Number, min: 0, max: 100 },
      last_updated: Date,
      family_feedback: [String],
    },

    // المؤشرات الحيوية والقياسات - Vitals & Measurements
    vitals_tracking: [
      {
        date: Date,
        weight_kg: Number,
        height_cm: Number,
        bmi: Number,
        blood_pressure: String,
        heart_rate: Number,
        pain_level: { type: Number, min: 0, max: 10 },
        range_of_motion: Schema.Types.Mixed,
        grip_strength: Number,
        notes: String,
      },
    ],

    // التواصل بين الفريق - Team Communication
    team_communications: [
      {
        date: { type: Date, default: Date.now },
        from: { name: String, role: String },
        to: [{ name: String, role: String }],
        message_type: {
          type: String,
          enum: ['update', 'concern', 'recommendation', 'urgent', 'meeting_notes'],
        },
        subject: String,
        content: String,
        acknowledged: { type: Boolean, default: false },
        acknowledged_by: [String],
      },
    ],

    // رضا المستفيد - Beneficiary Satisfaction
    satisfaction_surveys: [
      {
        survey_date: Date,
        overall_satisfaction: { type: Number, min: 1, max: 5 },
        service_quality: { type: Number, min: 1, max: 5 },
        staff_responsiveness: { type: Number, min: 1, max: 5 },
        facility_cleanliness: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },
        would_recommend: { type: Boolean },
        improvement_suggestions: String,
        compliments: String,
        complaints: String,
      },
    ],

    // ═══════════════════════════════════════
    // ميزات إضافية متقدمة - Phase 3 Features
    // ═══════════════════════════════════════

    // خطط التدخل السلوكي - Behavioral Intervention Plans (BIP)
    behavioral_intervention_plans: [
      {
        bip_id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        target_behavior: String,
        behavior_description: String,
        behavior_function: {
          type: String,
          enum: [
            'attention_seeking', // طلب انتباه
            'escape_avoidance', // هروب/تجنب
            'sensory_stimulation', // تحفيز حسي
            'tangible_reinforcement', // تعزيز مادي
            'communication', // تواصل
            'self_regulation', // تنظيم ذاتي
            'unknown', // غير محدد
          ],
        },
        antecedents: [String], // المحفزات
        consequences: [String], // النتائج
        replacement_behaviors: [String], // السلوكيات البديلة
        intervention_strategies: [
          {
            strategy_name: String,
            strategy_type: {
              type: String,
              enum: [
                'prevention', // وقائية
                'teaching', // تعليمية
                'reinforcement', // تعزيزية
                'crisis_management', // إدارة أزمات
                'environmental_modification', // تعديل بيئي
                'sensory_diet', // حمية حسية
              ],
            },
            description: String,
            implementation_steps: [String],
          },
        ],
        data_collection_method: {
          type: String,
          enum: ['frequency', 'duration', 'interval', 'latency', 'abc_recording', 'scatterplot'],
        },
        baseline_data: { frequency: Number, duration_minutes: Number, severity: Number },
        current_data: { frequency: Number, duration_minutes: Number, severity: Number },
        effectiveness: {
          type: String,
          enum: [
            'highly_effective',
            'effective',
            'partially_effective',
            'not_effective',
            'pending',
          ],
          default: 'pending',
        },
        review_date: Date,
        created_date: { type: Date, default: Date.now },
        created_by: { name: String, role: String },
        status: {
          type: String,
          enum: ['draft', 'active', 'under_review', 'revised', 'discontinued'],
          default: 'draft',
        },
      },
    ],

    // تقارير الحوادث - Incident Reports
    incident_reports: [
      {
        incident_id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        incident_date: { type: Date, required: true },
        incident_time: String,
        location: String,
        incident_type: {
          type: String,
          enum: [
            'fall', // سقوط
            'injury', // إصابة
            'behavioral_crisis', // أزمة سلوكية
            'elopement', // هروب
            'medication_error', // خطأ دوائي
            'equipment_malfunction', // عطل معدات
            'aggression', // عدوان
            'self_injury', // إيذاء ذاتي
            'seizure', // نوبة صرع
            'allergic_reaction', // تفاعل تحسسي
            'choking', // اختناق
            'property_damage', // تلف ممتلكات
            'verbal_threat', // تهديد لفظي
            'other', // أخرى
          ],
        },
        severity: {
          type: String,
          enum: ['minor', 'moderate', 'major', 'critical'],
          default: 'minor',
        },
        description: String,
        witnesses: [{ name: String, role: String }],
        immediate_actions_taken: [String],
        injuries_sustained: {
          has_injury: { type: Boolean, default: false },
          injury_description: String,
          first_aid_provided: { type: Boolean, default: false },
          medical_attention_needed: { type: Boolean, default: false },
          hospital_visit: { type: Boolean, default: false },
        },
        parent_guardian_notified: { type: Boolean, default: false },
        notification_date: Date,
        follow_up_actions: [
          {
            action: String,
            responsible_person: String,
            due_date: Date,
            completed: { type: Boolean, default: false },
            completion_date: Date,
          },
        ],
        preventive_measures: [String],
        reported_by: { name: String, role: String },
        reviewed_by: { name: String, role: String, date: Date },
        status: {
          type: String,
          enum: ['reported', 'under_investigation', 'resolved', 'closed'],
          default: 'reported',
        },
      },
    ],

    // جدولة المواعيد - Appointment Scheduling
    appointments: [
      {
        appointment_id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        appointment_type: {
          type: String,
          enum: [
            'therapy_session', // جلسة علاجية
            'assessment', // تقييم
            'medical_checkup', // فحص طبي
            'team_meeting', // اجتماع فريق
            'parent_conference', // مؤتمر أولياء
            'iep_meeting', // اجتماع IEP
            'transition_meeting', // اجتماع انتقال
            'intake', // قبول
            'discharge_planning', // تخطيط تخريج
            'follow_up', // متابعة
            'consultation', // استشارة
            'home_visit', // زيارة منزلية
          ],
        },
        title: String,
        date: { type: Date, required: true },
        start_time: String,
        end_time: String,
        duration_minutes: { type: Number, default: 60 },
        location: String,
        provider: { name: String, role: String, id: { type: Schema.Types.ObjectId, ref: 'User' } },
        attendees: [{ name: String, role: String }],
        recurring: {
          is_recurring: { type: Boolean, default: false },
          frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly'] },
          end_date: Date,
        },
        reminder_sent: { type: Boolean, default: false },
        status: {
          type: String,
          enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show'],
          default: 'scheduled',
        },
        cancellation_reason: String,
        notes: String,
        outcome: String,
      },
    ],

    // إدارة المستندات - Document Management
    documents: [
      {
        document_id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        document_type: {
          type: String,
          enum: [
            'medical_report', // تقرير طبي
            'assessment_report', // تقرير تقييم
            'iep_document', // وثيقة IEP
            'consent_form', // نموذج موافقة
            'referral_letter', // خطاب تحويل
            'progress_report', // تقرير تقدم
            'discharge_summary', // ملخص تخريج
            'insurance_form', // نموذج تأمين
            'photo', // صورة
            'identification', // هوية
            'prescription', // وصفة طبية
            'therapy_plan', // خطة علاجية
            'behavioral_report', // تقرير سلوكي
            'legal_document', // مستند قانوني
            'other', // أخرى
          ],
        },
        title: String,
        description: String,
        file_name: String,
        file_url: String,
        file_size: Number,
        mime_type: String,
        uploaded_by: { name: String, user_id: { type: Schema.Types.ObjectId, ref: 'User' } },
        upload_date: { type: Date, default: Date.now },
        expiry_date: Date,
        is_confidential: { type: Boolean, default: false },
        tags: [String],
        version: { type: Number, default: 1 },
        status: {
          type: String,
          enum: ['active', 'archived', 'expired', 'pending_review'],
          default: 'active',
        },
      },
    ],

    // جهات اتصال الطوارئ - Emergency Contacts
    emergency_contacts: [
      {
        contact_name: String,
        relationship: {
          type: String,
          enum: [
            'parent', // والد/والدة
            'spouse', // زوج/زوجة
            'sibling', // أخ/أخت
            'grandparent', // جد/جدة
            'uncle_aunt', // عم/خال/عمة/خالة
            'guardian', // ولي أمر
            'neighbor', // جار
            'friend', // صديق
            'caregiver', // مقدم رعاية
            'other', // أخرى
          ],
        },
        phone_primary: String,
        phone_secondary: String,
        email: String,
        address: String,
        is_primary: { type: Boolean, default: false },
        can_make_decisions: { type: Boolean, default: false },
        notes: String,
      },
    ],

    // التفضيلات الثقافية واللغوية - Cultural/Language Preferences
    cultural_preferences: {
      primary_language: {
        type: String,
        enum: ['arabic', 'english', 'urdu', 'hindi', 'tagalog', 'french', 'other'],
        default: 'arabic',
      },
      secondary_language: String,
      interpreter_needed: { type: Boolean, default: false },
      preferred_communication: {
        type: String,
        enum: [
          'verbal',
          'written',
          'sign_language',
          'augmentative_device',
          'visual_supports',
          'combination',
        ],
        default: 'verbal',
      },
      cultural_considerations: [String],
      dietary_restrictions: [String],
      religious_considerations: String,
      preferred_gender_therapist: {
        type: String,
        enum: ['male', 'female', 'no_preference'],
        default: 'no_preference',
      },
      family_involvement_level: {
        type: String,
        enum: ['minimal', 'moderate', 'high', 'very_high'],
        default: 'moderate',
      },
    },

    // أنشطة المجموعات - Peer Group Activities
    group_activities: [
      {
        activity_id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        group_name: String,
        activity_type: {
          type: String,
          enum: [
            'social_skills', // مهارات اجتماعية
            'recreational', // ترفيهية
            'educational', // تعليمية
            'therapeutic', // علاجية
            'vocational', // مهنية
            'life_skills', // مهارات حياتية
            'art_therapy', // علاج بالفن
            'music_therapy', // علاج بالموسيقى
            'sports', // رياضة
            'community_outing', // نزهة مجتمعية
          ],
        },
        date: Date,
        duration_minutes: Number,
        facilitator: { name: String, role: String },
        participants_count: Number,
        objectives: [String],
        activities_description: String,
        beneficiary_participation: {
          type: String,
          enum: ['active', 'passive', 'minimal', 'refused', 'absent'],
        },
        social_interaction_rating: { type: Number, min: 1, max: 5 },
        notes: String,
      },
    ],

    // تتبع حضور الجلسات - Session Attendance Tracking
    attendance_summary: {
      total_scheduled: { type: Number, default: 0 },
      total_attended: { type: Number, default: 0 },
      total_missed: { type: Number, default: 0 },
      total_cancelled: { type: Number, default: 0 },
      total_late: { type: Number, default: 0 },
      attendance_rate: { type: Number, default: 0, min: 0, max: 100 },
      consecutive_absences: { type: Number, default: 0 },
      last_attendance_date: Date,
      attendance_trend: {
        type: String,
        enum: ['improving', 'stable', 'declining', 'new'],
        default: 'new',
      },
      monthly_attendance: [
        {
          month: String, // 'YYYY-MM'
          scheduled: Number,
          attended: Number,
          rate: Number,
        },
      ],
    },

    // الإنذارات والتنبيهات - Alerts & Notifications
    alerts: [
      {
        alert_id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        alert_type: {
          type: String,
          enum: [
            'missed_sessions', // جلسات فائتة
            'goal_deadline', // موعد هدف
            'assessment_due', // تقييم مستحق
            'medication_reminder', // تذكير دواء
            'document_expiry', // انتهاء مستند
            'high_risk', // خطر عالي
            'behavior_escalation', // تصعيد سلوكي
            'appointment_reminder', // تذكير موعد
            'iep_review', // مراجعة IEP
            'insurance_expiry', // انتهاء تأمين
            'waitlist_update', // تحديث قائمة انتظار
            'discharge_approaching', // اقتراب التخريج
            'custom', // مخصص
          ],
        },
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'urgent'],
          default: 'medium',
        },
        title: String,
        message: String,
        created_date: { type: Date, default: Date.now },
        due_date: Date,
        is_read: { type: Boolean, default: false },
        is_dismissed: { type: Boolean, default: false },
        action_url: String,
        created_by: String,
        assigned_to: [String],
      },
    ],

    // حالة البرنامج
    program_status: {
      type: String,
      enum: [
        'active',
        'completed',
        'suspended',
        'discontinued',
        'transferred',
        'on_hold',
        'awaiting_assessment',
        'awaiting_approval',
        'graduated',
        'discharged',
        'pending_transfer',
      ],
      default: 'active',
      required: true,
    },

    // نوع البرنامج
    program_type: {
      type: String,
      enum: [
        'comprehensive', // شامل
        'intensive', // مكثف
        'standard', // عادي
        'early_intervention', // تدخل مبكر
        'maintenance', // صيانة/متابعة
        'transition', // انتقالي
        'community_based', // مجتمعي
        'home_based', // منزلي
        'day_program', // برنامج نهاري
        'residential', // سكني
        'outpatient', // خارجي
        'telerehab', // تأهيل عن بعد
      ],
      default: 'standard',
    },

    // مستوى الأولوية
    priority_level: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },

    // الفريق المعالج
    treatment_team: [
      {
        member_id: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        role: {
          type: String,
          enum: [
            'lead_therapist',
            'physical_therapist',
            'occupational_therapist',
            'speech_pathologist',
            'psychologist',
            'counselor',
            'social_worker',
            'case_manager',
            'physician',
            'nurse',
            'educator',
            'nutritionist',
            'recreational_therapist',
            'music_therapist',
            'art_therapist',
            'behavior_analyst',
            'coordinator',
          ],
        },
        specialization: String,
        assigned_date: Date,
        is_primary: { type: Boolean, default: false },
        contact_number: String,
      },
    ],

    // الأدوات والمقاييس المستخدمة
    assessment_tools_used: [
      {
        tool_name: String,
        tool_name_ar: String,
        category: {
          type: String,
          enum: [
            'functional',
            'cognitive',
            'behavioral',
            'developmental',
            'motor',
            'language',
            'social',
            'adaptive',
            'sensory',
            'quality_of_life',
            'mental_health',
            'pain',
          ],
        },
        administered_date: Date,
        score: Number,
        interpretation: String,
        administered_by: String,
      },
    ],

    // العلامات/التصنيفات
    tags: [{ type: String }],

    // حالة الموافقة
    approval_status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revision_needed'],
      default: 'approved',
    },
    approved_by: {
      user_id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      date: Date,
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
        note_type: {
          type: String,
          enum: [
            'general',
            'medical',
            'behavioral',
            'administrative',
            'clinical',
            'progress',
            'incident',
            'family_contact',
            'team_meeting',
            'supervision',
            'discharge',
          ],
        },
        content: String,
        author: {
          user_id: { type: Schema.Types.ObjectId, ref: 'User' },
          name: String,
        },
        is_confidential: { type: Boolean, default: false },
        priority: {
          type: String,
          enum: ['normal', 'important', 'urgent'],
          default: 'normal',
        },
        follow_up_required: { type: Boolean, default: false },
        follow_up_date: Date,
        follow_up_status: {
          type: String,
          enum: ['pending', 'completed', 'overdue'],
        },
        attachments: [{ name: String, url: String }],
      },
    ],

    // معلومات مالية
    financial_info: {
      funding_source: {
        type: String,
        enum: [
          'government',
          'insurance',
          'private',
          'charity',
          'mixed',
          'self_pay',
          'scholarship',
          'employer',
          'ngo',
        ],
      },
      total_cost: Number,
      amount_covered: Number,
      amount_paid: Number,
      outstanding_balance: Number,
      payment_status: {
        type: String,
        enum: ['paid', 'partially_paid', 'unpaid', 'waived', 'pending_approval', 'in_review'],
      },
      payment_plan: {
        has_plan: { type: Boolean, default: false },
        installments: { type: Number },
        monthly_amount: Number,
        next_due_date: Date,
      },
      invoices: [
        {
          invoice_number: String,
          date: Date,
          amount: Number,
          status: {
            type: String,
            enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
          },
        },
      ],
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

// Phase 3 indexes
rehabilitationProgramSchema.index({ 'appointments.date': 1, 'appointments.status': 1 });
rehabilitationProgramSchema.index({ 'incident_reports.incident_date': -1 });
rehabilitationProgramSchema.index({ 'alerts.is_read': 1, 'alerts.priority': 1 });
rehabilitationProgramSchema.index({ 'attendance_summary.attendance_rate': 1 });

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

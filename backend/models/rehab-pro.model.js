/**
 * Rehabilitation Professional Systems — الأنظمة الاحترافية لتأهيل ذوي الإعاقة
 *
 * 12 نظام احترافي جديد بدون تكرار مع الأنظمة القائمة
 * ─────────────────────────────────────────────────────
 *  1. إعادة التأهيل القلبي والرئوي   CardiacPulmonaryRehab
 *  2. إعادة تأهيل السكتة الدماغية    StrokeRehab
 *  3. إعادة تأهيل إصابات الحبل الشوكي SpinalCordRehab
 *  4. إعادة التأهيل بعد الجراحة       PostSurgicalRehab
 *  5. رعاية المسنين وكبار السن        GeriatricRehab
 *  6. الصحة النفسية المتقدمة          AdvancedMentalHealth
 *  7. الوراثة والاستشارات الجينية     GeneticCounseling
 *  8. الألعاب العلاجية (Gamification)  TherapyGamification
 *  9. المعدات الطبية IoT              MedicalDeviceIoT
 * 10. التعاون بين المراكز             InterCenterCollab
 * 11. متابعة ما بعد التخرج            PostDischargeTracking
 * 12. العلاج بالواقع المعزز AR        ARTherapy
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. إعادة التأهيل القلبي والرئوي — Cardiac & Pulmonary Rehabilitation
// ═══════════════════════════════════════════════════════════════════════════════
const CardiacPulmonaryRehabSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    programType: { type: String, enum: ['cardiac', 'pulmonary', 'combined'], required: true },
    phase: {
      type: String,
      enum: [
        'phase_1_inpatient',
        'phase_2_outpatient',
        'phase_3_maintenance',
        'phase_4_independent',
      ],
      default: 'phase_1_inpatient',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'on_hold', 'discharged', 'referred'],
      default: 'active',
    },

    // التشخيص الأساسي
    diagnosis: {
      primary: String,
      icd10Code: String,
      surgicalHistory: [{ procedure: String, date: Date, hospital: String }],
      mainCondition: {
        type: String,
        enum: [
          'mi',
          'cabg',
          'pci',
          'heart_failure',
          'valve_surgery',
          'copd',
          'asthma',
          'pulmonary_fibrosis',
          'post_covid',
          'other',
        ],
      },
      comorbiditiesCount: { type: Number, default: 0 },
      comorbidities: [String],
    },

    // التقييم القلبي الرئوي
    baselineAssessment: {
      vo2Max: Number, // ml/kg/min
      ejectionFraction: Number, // %
      sixMinWalkTest: Number, // meters
      fev1: Number, // L — forced expiratory volume
      fvc: Number, // L — forced vital capacity
      mipMep: { mip: Number, mep: Number }, // cmH2O
      borgScale: Number, // 0–10
      nyhaClass: { type: String, enum: ['I', 'II', 'III', 'IV'] },
      mrcDyspneaScale: { type: Number, min: 0, max: 5 },
      balkeProtocol: { time: Number, mets: Number },
      riskStratification: { type: String, enum: ['low', 'moderate', 'high'] },
      assessmentDate: Date,
      assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    // بروتوكول التمارين
    exercisePrescription: {
      aerobic: {
        mode: {
          type: String,
          enum: ['treadmill', 'stationary_bike', 'arm_ergometer', 'rowing', 'walking', 'swimming'],
        },
        frequency: { type: Number, default: 3 }, // days/week
        intensity: { targetHR: Number, hrReservePercent: Number, rpe: Number },
        duration: Number, // minutes
        progression: String,
      },
      resistance: {
        exercises: [{ name: String, sets: Number, reps: Number, weight: Number, bodyPart: String }],
        frequency: Number,
      },
      flexibility: {
        exercises: [String],
        frequency: Number,
        duration: Number,
      },
      breathingExercises: {
        pursedLip: Boolean,
        diaphragmatic: Boolean,
        incentiveSpirometry: Boolean,
        frequency: Number,
        notes: String,
      },
    },

    // جلسات التمارين
    exerciseSessions: [
      {
        date: Date,
        phase: String,
        duration: Number,
        heartRateRest: Number,
        heartRatePeak: Number,
        bloodPressurePre: { systolic: Number, diastolic: Number },
        bloodPressurePost: { systolic: Number, diastolic: Number },
        spo2Pre: Number,
        spo2Post: Number,
        borgPre: Number,
        borgPost: Number,
        exercisesCompleted: [{ name: String, sets: Number, reps: Number, notes: String }],
        adverseEvents: [String],
        ecgFindings: String,
        supervisedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
      },
    ],

    // إدارة عوامل الخطر
    riskFactorManagement: {
      smoking: { status: String, cessation: { startDate: Date, method: String, progress: String } },
      diabetes: { hba1c: Number, managedWith: String },
      hypertension: { controlled: Boolean, medication: String },
      lipids: { totalCholesterol: Number, ldl: Number, hdl: Number, triglycerides: Number },
      bmi: Number,
      weightManagement: { targetWeight: Number, currentWeight: Number, plan: String },
      stressManagement: { method: String, referral: Boolean },
      dietaryPlan: { type: String, restrictions: [String], referralToDietitian: Boolean },
    },

    // التثقيف الصحي
    patientEducation: [
      {
        topic: {
          type: String,
          enum: [
            'disease_understanding',
            'medication_management',
            'nutrition',
            'exercise_safety',
            'stress_management',
            'smoking_cessation',
            'emergency_signs',
            'lifestyle_modification',
            'self_monitoring',
          ],
        },
        date: Date,
        method: { type: String, enum: ['individual', 'group', 'video', 'brochure', 'online'] },
        educator: { type: Schema.Types.ObjectId, ref: 'User' },
        comprehensionLevel: { type: String, enum: ['excellent', 'good', 'fair', 'needs_revisit'] },
        notes: String,
      },
    ],

    // التقييمات الدورية
    progressAssessments: [
      {
        date: Date,
        vo2Max: Number,
        sixMinWalkTest: Number,
        ejectionFraction: Number,
        fev1: Number,
        borgScale: Number,
        qualityOfLife: Number, // 0–100
        phq9Score: Number, // depression screening
        functionalCapacity: Number, // METS
        assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
      },
    ],

    // خطة الخروج
    dischargePlan: {
      date: Date,
      maintenancePlan: String,
      homeExerciseProgram: [{ exercise: String, frequency: String, duration: String }],
      followUpSchedule: [{ date: Date, type: String }],
      emergencyPlan: String,
      referrals: [String],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

CardiacPulmonaryRehabSchema.index({ beneficiary: 1 });
CardiacPulmonaryRehabSchema.index({ programType: 1, status: 1 });
CardiacPulmonaryRehabSchema.index({ phase: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 2. إعادة تأهيل السكتة الدماغية — Stroke Rehabilitation
// ═══════════════════════════════════════════════════════════════════════════════
const StrokeRehabSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    status: {
      type: String,
      enum: ['acute', 'subacute', 'chronic', 'maintenance', 'discharged'],
      default: 'acute',
    },

    // بيانات السكتة
    strokeData: {
      type: { type: String, enum: ['ischemic', 'hemorrhagic', 'tia', 'unknown'] },
      location: {
        type: String,
        enum: ['left_hemisphere', 'right_hemisphere', 'brainstem', 'cerebellum', 'multiple'],
      },
      onsetDate: Date,
      nihssScore: Number, // 0–42
      modifiedRankin: Number, // 0–6
      barthelIndex: Number, // 0–100
      admissionDate: Date,
      thrombolysis: Boolean,
      thrombectomy: Boolean,
      complications: [String],
    },

    // التقييم العصبي
    neurologicalAssessment: {
      motorFunction: {
        upperExtremity: {
          right: { type: Number, min: 0, max: 5 },
          left: { type: Number, min: 0, max: 5 },
          fuglMeyerUE: Number, // 0–66
        },
        lowerExtremity: {
          right: { type: Number, min: 0, max: 5 },
          left: { type: Number, min: 0, max: 5 },
          fuglMeyerLE: Number, // 0–34
        },
        spasticity: { ashworthScale: Number, location: [String] },
      },
      sensoryFunction: {
        lightTouch: String,
        proprioception: String,
        stereognosis: String,
        visualFields: String,
      },
      cognition: {
        moCA: Number, // 0–30
        attention: String,
        memory: String,
        executiveFunction: String,
        neglect: { type: Boolean, default: false },
        neglectSide: String,
      },
      language: {
        aphasia: { type: Boolean, default: false },
        aphasiaType: {
          type: String,
          enum: ['broca', 'wernicke', 'global', 'anomic', 'conduction', 'none'],
        },
        dysarthria: Boolean,
        westernAphasiaBattery: Number,
      },
      swallowing: {
        dysphagia: Boolean,
        dietLevel: {
          type: String,
          enum: ['npo', 'puree', 'mechanically_altered', 'advanced', 'regular'],
        },
        fibreoscopy: String,
        videofluoroscopy: String,
      },
      assessmentDate: Date,
      assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    // خطة التأهيل
    rehabPlan: {
      goals: [
        {
          domain: {
            type: String,
            enum: [
              'mobility',
              'upper_limb',
              'communication',
              'cognition',
              'swallowing',
              'adl',
              'psychosocial',
              'driving',
            ],
          },
          shortTerm: String,
          longTerm: String,
          targetDate: Date,
          status: {
            type: String,
            enum: ['not_started', 'in_progress', 'achieved', 'modified', 'discontinued'],
            default: 'not_started',
          },
          progress: Number, // %
        },
      ],
      therapySessions: [
        {
          type: {
            type: String,
            enum: [
              'physiotherapy',
              'occupational_therapy',
              'speech_therapy',
              'neuropsychology',
              'recreation_therapy',
              'social_work',
            ],
          },
          frequency: String,
          duration: Number,
          therapist: { type: Schema.Types.ObjectId, ref: 'User' },
        },
      ],
      constraintInducedTherapy: { applicable: Boolean, schedule: String },
      roboticAssistedTherapy: { applicable: Boolean, device: String },
      electricalStimulation: { nmes: Boolean, fes: Boolean, tdcs: Boolean, protocol: String },
      mirrorTherapy: { applicable: Boolean, frequency: String },
      virtualRealityTherapy: { applicable: Boolean, system: String },
    },

    // الجلسات والتقدم
    sessionLogs: [
      {
        date: Date,
        therapyType: String,
        therapist: { type: Schema.Types.ObjectId, ref: 'User' },
        activities: [{ name: String, duration: Number, performance: String }],
        vitalSigns: { bp: String, hr: Number, spo2: Number },
        functionalGains: String,
        barriers: String,
        patientMood: {
          type: String,
          enum: ['cooperative', 'fatigued', 'frustrated', 'motivated', 'anxious', 'depressed'],
        },
        notes: String,
      },
    ],

    // التقييمات الدورية
    progressReports: [
      {
        date: Date,
        nihss: Number,
        modifiedRankin: Number,
        barthelIndex: Number,
        fuglMeyerTotal: Number,
        sixMinWalkTest: Number,
        tenMeterWalkTest: Number,
        bergBalance: Number,
        phq9: Number,
        functionalStatus: String,
        assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        recommendations: String,
      },
    ],

    // الأجهزة المساعدة
    assistiveDevices: [
      {
        device: String,
        purpose: String,
        dateProvided: Date,
        training: Boolean,
        effectiveness: {
          type: String,
          enum: ['very_effective', 'effective', 'moderate', 'minimal', 'not_effective'],
        },
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

StrokeRehabSchema.index({ beneficiary: 1 });
StrokeRehabSchema.index({ status: 1, 'strokeData.type': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 3. إعادة تأهيل إصابات الحبل الشوكي — Spinal Cord Injury Rehab
// ═══════════════════════════════════════════════════════════════════════════════
const SpinalCordRehabSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    status: {
      type: String,
      enum: ['acute', 'inpatient_rehab', 'outpatient', 'community', 'lifelong_management'],
      default: 'acute',
    },

    injuryProfile: {
      level: String, // C1-C8, T1-T12, L1-L5, S1-S5
      asia: { type: String, enum: ['A', 'B', 'C', 'D', 'E'] }, // ASIA Impairment Scale
      mechanism: {
        type: String,
        enum: [
          'traumatic_vehicle',
          'traumatic_fall',
          'traumatic_sports',
          'traumatic_violence',
          'non_traumatic_disease',
          'non_traumatic_tumor',
          'non_traumatic_vascular',
          'other',
        ],
      },
      completeness: { type: String, enum: ['complete', 'incomplete'] },
      dateOfInjury: Date,
      associatedInjuries: [String],
      spinalSurgery: { performed: Boolean, type: String, date: Date },
    },

    // ASIA Assessment
    asiaAssessment: {
      motorScoreRight: Number, // 0–50
      motorScoreLeft: Number,
      sensoryLightTouchRight: Number, // 0–56
      sensoryLightTouchLeft: Number,
      sensoryPinPrickRight: Number,
      sensoryPinPrickLeft: Number,
      neurologicalLevel: String,
      zoneOfPartialPreservation: String,
      assessmentDate: Date,
    },

    // الاستقلال الوظيفي
    functionalGoals: {
      mobilityLevel: {
        type: String,
        enum: [
          'bed_mobility',
          'wheelchair_dependent',
          'standing_frame',
          'assisted_ambulation',
          'independent_ambulation',
        ],
      },
      wheelchairSkills: { type: Number, min: 0, max: 100 }, // % proficiency
      transferSkills: {
        type: String,
        enum: ['dependent', 'max_assist', 'mod_assist', 'min_assist', 'supervised', 'independent'],
      },
      selfCare: {
        feeding: String,
        grooming: String,
        dressing_upper: String,
        dressing_lower: String,
        bathing: String,
        toileting: String,
      },
      spinalCordIndependenceMeasure: Number, // SCIM 0–100
      bladder: { type: String, management: String, program: String },
      bowel: { type: String, management: String, program: String },
    },

    // المضاعفات الطبية
    medicalComplications: {
      pressureInjuries: [{ location: String, stage: Number, status: String, treatment: String }],
      autonomicDysreflexia: { history: Boolean, triggers: [String], plan: String },
      deepVeinThrombosis: { prophylaxis: String, history: Boolean },
      spasticity: { severity: String, management: [String] },
      pain: {
        neuropathic: Boolean,
        musculoskeletal: Boolean,
        location: [String],
        vas: Number,
        management: String,
      },
      respiratoryComplications: [String],
      uti: { frequency: String, management: String },
      heterotopicOssification: Boolean,
      shoulderPain: Boolean,
      depression: { phq9: Number, treatment: String },
    },

    // جلسات التأهيل
    rehabSessions: [
      {
        date: Date,
        type: {
          type: String,
          enum: [
            'physiotherapy',
            'occupational_therapy',
            'recreational_therapy',
            'pool_therapy',
            'fes_cycling',
            'gait_training',
            'wheelchair_skills',
          ],
        },
        therapist: { type: Schema.Types.ObjectId, ref: 'User' },
        activities: [String],
        duration: Number,
        progress: String,
        notes: String,
      },
    ],

    // المعدات
    equipment: [
      {
        type: {
          type: String,
          enum: [
            'manual_wheelchair',
            'power_wheelchair',
            'standing_frame',
            'orthosis',
            'fes_system',
            'pressure_relief',
            'adaptive_equipment',
            'bathroom_equipment',
            'vehicle_modification',
          ],
        },
        name: String,
        specifications: String,
        dateProvided: Date,
        fundingSource: String,
        status: String,
      },
    ],

    // خطة التأهيل المجتمعي
    communityReintegration: {
      drivingAssessment: { status: String, adaptations: [String], licensingStatus: String },
      returnToWork: { status: String, accommodations: [String], employer: String },
      homeModifications: [{ area: String, modification: String, status: String }],
      sports: [{ sport: String, level: String, adaptations: String }],
      peerSupport: { connected: Boolean, group: String },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

SpinalCordRehabSchema.index({ beneficiary: 1 });
SpinalCordRehabSchema.index({ 'injuryProfile.level': 1, 'injuryProfile.asia': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 4. إعادة التأهيل بعد الجراحة — Post-Surgical Rehabilitation
// ═══════════════════════════════════════════════════════════════════════════════
const PostSurgicalRehabSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    status: {
      type: String,
      enum: [
        'pre_operative',
        'immediate_post_op',
        'early_rehab',
        'intermediate',
        'advanced',
        'return_to_function',
        'discharged',
      ],
      default: 'pre_operative',
    },

    surgicalInfo: {
      procedure: String,
      procedureCode: String,
      category: {
        type: String,
        enum: [
          'orthopedic_joint_replacement',
          'orthopedic_fracture',
          'orthopedic_spine',
          'orthopedic_ligament',
          'cardiac',
          'thoracic',
          'abdominal',
          'neurosurgery',
          'amputation',
          'transplant',
          'bariatric',
          'other',
        ],
      },
      surgeon: String,
      hospital: String,
      surgeryDate: Date,
      complications: [String],
      anesthesia: { type: String, enum: ['general', 'regional', 'local', 'spinal'] },
      prosthesisUsed: { type: Boolean, brand: String, model: String },
    },

    // التقييم قبل الجراحة
    preOpAssessment: {
      functionalLevel: String,
      painScore: Number,
      rangeOfMotion: [{ joint: String, movement: String, degrees: Number }],
      muscleStrength: [{ muscle: String, grade: Number }],
      cardiacClearance: Boolean,
      labResults: String,
      riskScore: { type: String, enum: ['low', 'moderate', 'high'] },
      assessmentDate: Date,
    },

    // بروتوكول التأهيل
    rehabProtocol: {
      protocolName: String,
      phases: [
        {
          name: String,
          weekStart: Number,
          weekEnd: Number,
          goals: [String],
          precautions: [String],
          allowedActivities: [String],
          restrictions: [String],
          exercises: [{ name: String, sets: Number, reps: Number, frequency: String }],
        },
      ],
      weightBearingStatus: { type: String, enum: ['nwb', 'tdwb', 'pwb', 'wbat', 'fwb'] },
      braceOrSplint: { required: Boolean, type: String, duration: String },
      cryotherapy: Boolean,
      cpMotionMachine: { required: Boolean, settings: String },
    },

    // جلسات التأهيل
    sessions: [
      {
        date: Date,
        phase: String,
        therapist: { type: Schema.Types.ObjectId, ref: 'User' },
        painBefore: Number,
        painAfter: Number,
        exercises: [
          { name: String, sets: Number, reps: Number, resistance: String, notes: String },
        ],
        rom: [{ joint: String, movement: String, degrees: Number }],
        functionalActivities: [String],
        modalities: [{ type: String, duration: Number }],
        patientCompliance: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
        homeExerciseAdherence: Number, // %
        notes: String,
      },
    ],

    // مقاييس النتائج
    outcomeScores: [
      {
        date: Date,
        painVAS: Number,
        romTotal: Number,
        strengthTotal: Number,
        functionalScore: Number,
        patientSatisfaction: Number,
        specificMeasure: { name: String, score: Number }, // e.g., Harris Hip Score, KOOS, DASH
        assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // مضاعفات
    complications: [
      {
        type: {
          type: String,
          enum: [
            'infection',
            'dvt',
            'pe',
            'delayed_healing',
            'stiffness',
            'instability',
            'hardware_failure',
            'crps',
            'other',
          ],
        },
        dateDetected: Date,
        severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
        management: String,
        resolved: Boolean,
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

PostSurgicalRehabSchema.index({ beneficiary: 1 });
PostSurgicalRehabSchema.index({ 'surgicalInfo.category': 1, status: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 5. رعاية المسنين وكبار السن — Geriatric Rehabilitation
// ═══════════════════════════════════════════════════════════════════════════════
const GeriatricRehabSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    age: Number,
    status: {
      type: String,
      enum: ['active', 'maintenance', 'palliative', 'discharged', 'deceased'],
      default: 'active',
    },

    // التقييم الشامل للمسنين
    comprehensiveGeriatricAssessment: {
      functional: {
        adlKatz: Number, // 0–6
        iadlLawton: Number, // 0–8
        tinettiBalance: Number, // 0–28
        tugTest: Number, // seconds
        gripStrength: Number, // kg
        gaitSpeed: Number, // m/s
        fallRisk: { type: String, enum: ['low', 'moderate', 'high'] },
        fallHistory: [{ date: Date, circumstances: String, injuries: String }],
      },
      cognitive: {
        mmse: Number, // 0–30
        moCA: Number, // 0–30
        clockDrawingTest: Number, // 0–6
        geriatricDepressionScale: Number, // GDS 0–15
        diagnosis: {
          type: String,
          enum: [
            'normal',
            'mci',
            'mild_dementia',
            'moderate_dementia',
            'severe_dementia',
            'delirium',
          ],
        },
        wanderingRisk: Boolean,
      },
      nutritional: {
        mna: Number, // Mini Nutritional Assessment 0–30
        bmi: Number,
        unintentionalWeightLoss: Boolean,
        swallowingDifficulty: Boolean,
        dentures: Boolean,
        supplements: [String],
      },
      sensory: {
        vision: { status: String, aids: String, lastExam: Date },
        hearing: { status: String, aids: String, lastExam: Date },
      },
      social: {
        livingArrangement: {
          type: String,
          enum: ['alone', 'with_spouse', 'with_family', 'assisted_living', 'nursing_home'],
        },
        socialSupport: { type: String, enum: ['strong', 'adequate', 'limited', 'isolated'] },
        caregiver: { name: String, relationship: String, burden: String },
      },
      assessmentDate: Date,
      assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    // إدارة الأدوية المتعددة
    polypharmacy: {
      medications: [
        {
          name: String,
          dose: String,
          frequency: String,
          indication: String,
          prescriber: String,
          beersListCriteria: Boolean, // Beers criteria for inappropriate meds
        },
      ],
      potentialInteractions: [String],
      deprescribingPlan: [{ medication: String, reason: String, timeline: String, status: String }],
      medicationReconciliationDate: Date,
    },

    // برنامج الوقاية من السقوط
    fallPreventionProgram: {
      riskFactors: [String],
      interventions: [
        {
          type: {
            type: String,
            enum: [
              'exercise',
              'balance_training',
              'strength_training',
              'home_modification',
              'vision_correction',
              'medication_review',
              'footwear',
              'assistive_device',
              'vitamin_d',
            ],
          },
          details: String,
          startDate: Date,
          status: String,
        },
      ],
      environmentalAssessment: { completed: Boolean, modifications: [String] },
      educationProvided: Boolean,
    },

    // الجلسات
    sessions: [
      {
        date: Date,
        type: {
          type: String,
          enum: [
            'physiotherapy',
            'occupational_therapy',
            'cognitive_stimulation',
            'group_exercise',
            'balance_class',
            'aquatic_therapy',
            'tai_chi',
            'music_therapy',
          ],
        },
        therapist: { type: Schema.Types.ObjectId, ref: 'User' },
        duration: Number,
        vitalSigns: { bp: String, hr: Number, spo2: Number },
        activities: [String],
        response: String,
        notes: String,
      },
    ],

    // التقييمات الدورية
    progressReports: [
      {
        date: Date,
        adlKatz: Number,
        iadlLawton: Number,
        tinettiBalance: Number,
        tugTest: Number,
        mmse: Number,
        gds: Number,
        mna: Number,
        qualityOfLife: Number,
        caregiversBurden: Number,
        assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        plan: String,
      },
    ],

    // الرعاية التلطيفية
    palliativeCare: {
      advanceDirective: Boolean,
      dnrStatus: Boolean,
      palliativeGoals: String,
      painManagement: String,
      symptomControl: [{ symptom: String, management: String }],
      familyMeetings: [{ date: Date, attendees: [String], decisions: String }],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

GeriatricRehabSchema.index({ beneficiary: 1 });
GeriatricRehabSchema.index({ status: 1, age: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 6. الصحة النفسية المتقدمة — Advanced Mental Health
// ═══════════════════════════════════════════════════════════════════════════════
const AdvancedMentalHealthSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    status: {
      type: String,
      enum: ['active', 'crisis', 'stable', 'remission', 'discharged', 'follow_up'],
      default: 'active',
    },

    // التشخيص النفسي
    psychiatricDiagnosis: {
      primary: { code: String, name: String, nameAr: String },
      secondary: [{ code: String, name: String }],
      dsmCategory: {
        type: String,
        enum: [
          'anxiety_disorders',
          'mood_disorders',
          'ptsd_trauma',
          'psychotic_disorders',
          'personality_disorders',
          'neurodevelopmental',
          'substance_use',
          'eating_disorders',
          'sleep_disorders',
          'adjustment_disorders',
          'other',
        ],
      },
      severityLevel: { type: String, enum: ['mild', 'moderate', 'severe', 'extreme'] },
      onsetDate: Date,
      chronicity: { type: String, enum: ['acute', 'subacute', 'chronic', 'recurrent'] },
    },

    // التقييمات النفسية
    psychologicalAssessments: [
      {
        date: Date,
        tool: {
          type: String,
          enum: [
            'phq9',
            'gad7',
            'pcl5',
            'bdi2',
            'bai',
            'dass21',
            'whoqol',
            'psqi',
            'audit',
            'cage',
            'ymrs',
            'panss',
            'madrs',
            'cgis',
            'gaf',
            'whodas',
            'cdrisc',
            'ies_r',
          ],
        },
        score: Number,
        interpretation: String,
        administeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
      },
    ],

    // العلاج النفسي
    psychotherapy: {
      modality: {
        type: String,
        enum: [
          'cbt',
          'dbt',
          'emdr',
          'act',
          'psychodynamic',
          'interpersonal',
          'family_therapy',
          'group_therapy',
          'art_therapy',
          'mindfulness',
          'schema_therapy',
          'motivational_interviewing',
          'narrative_therapy',
          'solution_focused',
        ],
      },
      therapist: { type: Schema.Types.ObjectId, ref: 'User' },
      frequency: String,
      startDate: Date,
      goals: [{ goal: String, status: String, progress: Number }],
      sessions: [
        {
          date: Date,
          sessionNumber: Number,
          focus: String,
          interventions: [String],
          homework: String,
          clientResponse: String,
          suicidalIdeation: {
            present: Boolean,
            plan: Boolean,
            intent: Boolean,
            safetyPlan: Boolean,
          },
          moodRating: Number, // 0–10
          notes: String,
        },
      ],
    },

    // إدارة الأدوية النفسية
    psychiatricMedications: [
      {
        medication: String,
        class: {
          type: String,
          enum: [
            'ssri',
            'snri',
            'tca',
            'maoi',
            'benzodiazepine',
            'antipsychotic_typical',
            'antipsychotic_atypical',
            'mood_stabilizer',
            'stimulant',
            'anxiolytic',
            'hypnotic',
            'other',
          ],
        },
        dose: String,
        frequency: String,
        startDate: Date,
        endDate: Date,
        prescriber: { type: Schema.Types.ObjectId, ref: 'User' },
        sideEffects: [String],
        effectiveness: {
          type: String,
          enum: ['very_effective', 'effective', 'partial', 'ineffective', 'worsened'],
        },
        adherence: { type: String, enum: ['full', 'mostly', 'partial', 'poor', 'non_adherent'] },
        notes: String,
      },
    ],

    // خطة السلامة
    safetyPlan: {
      warningSignals: [String],
      copingStrategies: [String],
      socialSupports: [{ name: String, phone: String }],
      professionals: [{ name: String, phone: String }],
      emergencyContacts: [{ name: String, phone: String }],
      environmentSafety: { lethalMeansRestriction: Boolean, actions: [String] },
      reasonsForLiving: [String],
      lastUpdated: Date,
    },

    // إدارة الأزمات
    crisisHistory: [
      {
        date: Date,
        type: {
          type: String,
          enum: [
            'suicidal_ideation',
            'suicide_attempt',
            'self_harm',
            'psychotic_episode',
            'panic_attack',
            'dissociative_episode',
            'substance_relapse',
            'violence_risk',
            'other',
          ],
        },
        severity: { type: String, enum: ['low', 'moderate', 'high', 'imminent'] },
        intervention: String,
        outcome: String,
        hospitalization: Boolean,
        followUp: String,
      },
    ],

    // البرامج العلاجية الخاصة
    specializedPrograms: [
      {
        program: {
          type: String,
          enum: [
            'ptsd_recovery',
            'substance_abuse',
            'eating_disorder_recovery',
            'anger_management',
            'grief_counseling',
            'social_skills',
            'stress_inoculation',
            'chronic_pain_management',
            'insomnia_treatment',
            'resilience_building',
          ],
        },
        startDate: Date,
        endDate: Date,
        status: { type: String, enum: ['enrolled', 'active', 'completed', 'withdrawn'] },
        outcomes: String,
      },
    ],

    // التقدم
    progressNotes: [
      {
        date: Date,
        clinician: { type: Schema.Types.ObjectId, ref: 'User' },
        soap: { subjective: String, objective: String, assessment: String, plan: String },
        riskLevel: { type: String, enum: ['none', 'low', 'moderate', 'high', 'imminent'] },
        functionalImprovement: Number, // -5 to +5
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

AdvancedMentalHealthSchema.index({ beneficiary: 1 });
AdvancedMentalHealthSchema.index({ status: 1, 'psychiatricDiagnosis.dsmCategory': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 7. الوراثة والاستشارات الجينية — Genetic Counseling
// ═══════════════════════════════════════════════════════════════════════════════
const GeneticCounselingSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    status: {
      type: String,
      enum: [
        'referred',
        'pre_test_counseling',
        'testing',
        'awaiting_results',
        'post_test_counseling',
        'follow_up',
        'closed',
      ],
      default: 'referred',
    },

    referralInfo: {
      referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: {
        type: String,
        enum: [
          'prenatal_screening',
          'newborn_screening',
          'family_history',
          'consanguinity',
          'developmental_delay',
          'intellectual_disability',
          'congenital_anomaly',
          'metabolic_disorder',
          'carrier_testing',
          'predictive_testing',
          'pharmacogenomics',
          'other',
        ],
      },
      urgency: { type: String, enum: ['routine', 'urgent', 'emergent'] },
      referralDate: Date,
    },

    // التاريخ العائلي
    familyHistory: {
      pedigree: String, // encoded pedigree data
      consanguinity: Boolean,
      consanguinityDegree: String,
      affectedRelatives: [
        {
          relationship: String,
          condition: String,
          ageOfOnset: Number,
          alive: Boolean,
          geneticTestResult: String,
        },
      ],
      ethnicBackground: String,
      maternalAge: Number,
      paternalAge: Number,
      previousPregnancies: [{ outcome: String, geneticCondition: String }],
    },

    // الاختبارات الجينية
    geneticTests: [
      {
        testType: {
          type: String,
          enum: [
            'karyotype',
            'fish',
            'microarray',
            'whole_exome_sequencing',
            'whole_genome_sequencing',
            'targeted_panel',
            'single_gene',
            'mtdna',
            'methylation',
            'biochemical',
            'newborn_screening',
            'carrier_screening',
            'prenatal_cfDNA',
            'amniocentesis',
            'cvs',
          ],
        },
        testName: String,
        lab: String,
        sampleCollectedDate: Date,
        resultDate: Date,
        result: {
          type: String,
          enum: [
            'normal',
            'abnormal',
            'variant_of_uncertain_significance',
            'pathogenic',
            'likely_pathogenic',
            'benign',
            'likely_benign',
            'pending',
          ],
        },
        findings: String,
        genes: [{ gene: String, variant: String, classification: String, inheritance: String }],
        reportUrl: String,
        orderedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // جلسات الاستشارة
    counselingSessions: [
      {
        date: Date,
        type: {
          type: String,
          enum: [
            'pre_test',
            'results_disclosure',
            'follow_up',
            'reproductive_counseling',
            'predictive_counseling',
            'family_session',
          ],
        },
        counselor: { type: Schema.Types.ObjectId, ref: 'User' },
        duration: Number,
        topicsCovered: [String],
        riskAssessment: { recurrenceRisk: String, explanation: String },
        psychosocialAssessment: String,
        decisionsReached: String,
        resourcesProvided: [String],
        notes: String,
      },
    ],

    // التشخيص الجيني
    geneticDiagnosis: {
      condition: String,
      conditionAr: String,
      omimNumber: String,
      inheritancePattern: {
        type: String,
        enum: [
          'autosomal_dominant',
          'autosomal_recessive',
          'x_linked_dominant',
          'x_linked_recessive',
          'mitochondrial',
          'multifactorial',
          'chromosomal',
          'de_novo',
          'unknown',
        ],
      },
      prognosis: String,
      managementGuidelines: String,
      specialistReferrals: [{ specialty: String, reason: String }],
    },

    // المتابعة
    followUpPlan: {
      medicalSurveillance: [{ test: String, frequency: String, nextDue: Date }],
      reproductiveOptions: [String],
      supportGroups: [String],
      researchOpportunities: [{ study: String, eligibility: Boolean }],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

GeneticCounselingSchema.index({ beneficiary: 1 });
GeneticCounselingSchema.index({ status: 1, 'referralInfo.reason': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 8. الألعاب العلاجية — Therapy Gamification
// ═══════════════════════════════════════════════════════════════════════════════
const TherapyGamificationSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'graduated'],
      default: 'active',
    },

    // ملف اللاعب
    playerProfile: {
      avatar: String,
      displayName: String,
      level: { type: Number, default: 1 },
      totalXP: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      rank: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion'],
        default: 'bronze',
      },
      preferredRewards: [String],
      difficultyLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'adaptive'],
        default: 'adaptive',
      },
    },

    // الإنجازات
    achievements: [
      {
        badgeId: String,
        name: String,
        nameAr: String,
        description: String,
        category: {
          type: String,
          enum: ['consistency', 'skill_mastery', 'social', 'milestone', 'challenge', 'special'],
        },
        icon: String,
        unlockedDate: Date,
        xpAwarded: Number,
      },
    ],

    // التحديات العلاجية
    challenges: [
      {
        name: String,
        nameAr: String,
        therapyArea: {
          type: String,
          enum: [
            'motor_skills',
            'cognitive',
            'speech',
            'social',
            'daily_living',
            'emotional',
            'physical_fitness',
            'balance',
            'fine_motor',
            'gross_motor',
          ],
        },
        difficulty: Number, // 1–10
        startDate: Date,
        endDate: Date,
        targetMetric: { name: String, target: Number, unit: String },
        currentProgress: Number,
        status: { type: String, enum: ['available', 'active', 'completed', 'failed', 'expired'] },
        xpReward: Number,
        completedDate: Date,
      },
    ],

    // سجل الألعاب
    gameSessions: [
      {
        date: Date,
        game: { name: String, category: String, therapyGoal: String },
        duration: Number, // minutes
        score: Number,
        accuracy: Number, // %
        level: Number,
        metrics: [{ name: String, value: Number, unit: String }],
        therapistNotes: String,
        enjoymentRating: { type: Number, min: 1, max: 5 },
        difficultyFeedback: {
          type: String,
          enum: ['too_easy', 'just_right', 'challenging', 'too_hard'],
        },
      },
    ],

    // المكافآت
    rewards: {
      points: { type: Number, default: 0 },
      redeemable: [
        {
          name: String,
          nameAr: String,
          pointsCost: Number,
          category: {
            type: String,
            enum: ['virtual_item', 'real_prize', 'privilege', 'experience', 'donation'],
          },
          image: String,
          available: Boolean,
        },
      ],
      history: [
        {
          reward: String,
          pointsSpent: Number,
          date: Date,
          fulfilledBy: { type: Schema.Types.ObjectId, ref: 'User' },
        },
      ],
    },

    // لوحة المتصدرين
    leaderboardData: {
      weeklyRank: Number,
      monthlyRank: Number,
      categoryRanks: [{ category: String, rank: Number }],
      personalBests: [{ metric: String, value: Number, date: Date }],
    },

    // تحليلات المشاركة
    engagementAnalytics: {
      totalSessions: { type: Number, default: 0 },
      totalPlayTime: { type: Number, default: 0 }, // minutes
      averageSessionDuration: Number,
      lastActiveDate: Date,
      motivationTrend: [{ date: Date, score: Number }],
      preferredGames: [String],
      peakPlayTime: String,
      therapyCompliance: Number, // %
    },

    // ─── NEW: المهام اليومية والأسبوعية — Daily & Weekly Quests ───
    quests: [
      {
        questId: String,
        name: String,
        nameAr: String,
        description: String,
        type: {
          type: String,
          enum: ['daily', 'weekly', 'monthly', 'story', 'bonus', 'seasonal', 'event'],
        },
        category: {
          type: String,
          enum: [
            'exercise',
            'cognitive',
            'social',
            'self_care',
            'therapy_attendance',
            'nutrition',
            'sleep',
            'mindfulness',
            'creativity',
            'communication',
          ],
        },
        requirements: [
          {
            action: String,
            target: Number,
            current: { type: Number, default: 0 },
            unit: String,
          },
        ],
        xpReward: Number,
        pointsReward: Number,
        bonusReward: { type: String },
        status: {
          type: String,
          enum: ['available', 'accepted', 'in_progress', 'completed', 'expired', 'failed'],
          default: 'available',
        },
        acceptedDate: Date,
        completedDate: Date,
        expiresAt: Date,
        difficulty: { type: Number, min: 1, max: 10 },
        isRepeatable: { type: Boolean, default: false },
        timesCompleted: { type: Number, default: 0 },
      },
    ],

    // ─── NEW: شجرة المهارات — Skill Tree ───
    skillTree: [
      {
        skillId: String,
        name: String,
        nameAr: String,
        category: {
          type: String,
          enum: [
            'physical',
            'cognitive',
            'emotional',
            'social',
            'independence',
            'creative',
            'academic',
            'vocational',
          ],
        },
        tier: { type: Number, min: 1, max: 5 },
        currentLevel: { type: Number, default: 0 },
        maxLevel: { type: Number, default: 5 },
        xpInvested: { type: Number, default: 0 },
        xpToNextLevel: Number,
        unlockedDate: Date,
        prerequisites: [String], // skillIds
        bonuses: [{ type: String, value: Number, description: String }],
        icon: String,
        isUnlocked: { type: Boolean, default: false },
        isMastered: { type: Boolean, default: false },
      },
    ],

    // ─── NEW: المتجر الافتراضي — Virtual Shop ───
    virtualShop: {
      coins: { type: Number, default: 0 },
      gems: { type: Number, default: 0 },
      inventory: [
        {
          itemId: String,
          name: String,
          nameAr: String,
          type: {
            type: String,
            enum: [
              'avatar_skin',
              'avatar_accessory',
              'background',
              'frame',
              'title',
              'emote',
              'power_up',
              'xp_boost',
              'streak_shield',
              'theme',
              'pet',
              'decoration',
            ],
          },
          rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'] },
          equipped: { type: Boolean, default: false },
          acquiredDate: Date,
          acquiredBy: {
            type: String,
            enum: ['purchase', 'achievement', 'quest', 'gift', 'event', 'level_up'],
          },
        },
      ],
      purchaseHistory: [
        {
          itemId: String,
          itemName: String,
          currency: { type: String, enum: ['coins', 'gems', 'points'] },
          amount: Number,
          date: Date,
        },
      ],
      wishlist: [{ itemId: String, name: String, addedDate: Date }],
    },

    // ─── NEW: الفرق والتعاون — Teams & Social ───
    social: {
      teamId: String,
      teamName: String,
      teamRole: { type: String, enum: ['member', 'captain', 'co_captain'] },
      friends: [
        {
          beneficiary: { type: Schema.Types.ObjectId, ref: 'User' },
          displayName: String,
          addedDate: Date,
        },
      ],
      friendRequests: [
        {
          from: { type: Schema.Types.ObjectId, ref: 'User' },
          displayName: String,
          date: Date,
          status: { type: String, enum: ['pending', 'accepted', 'declined'] },
        },
      ],
      giftsGiven: { type: Number, default: 0 },
      giftsReceived: { type: Number, default: 0 },
      giftHistory: [
        {
          type: { type: String, enum: ['sent', 'received'] },
          otherUser: { type: Schema.Types.ObjectId, ref: 'User' },
          item: String,
          date: Date,
        },
      ],
      teamChallenges: [
        {
          challengeId: String,
          name: String,
          teamContribution: Number,
          totalRequired: Number,
          status: { type: String, enum: ['active', 'completed', 'failed'] },
          startDate: Date,
          endDate: Date,
        },
      ],
      socialXP: { type: Number, default: 0 },
    },

    // ─── NEW: القصص والمغامرات — Story Mode / Adventures ───
    storyMode: {
      currentChapter: { type: Number, default: 1 },
      currentEpisode: { type: Number, default: 1 },
      totalChaptersCompleted: { type: Number, default: 0 },
      stories: [
        {
          storyId: String,
          title: String,
          titleAr: String,
          theme: {
            type: String,
            enum: [
              'space_explorer',
              'ocean_adventure',
              'jungle_quest',
              'city_builder',
              'time_traveler',
              'superhero',
              'animal_rescue',
              'treasure_hunt',
              'science_lab',
              'art_gallery',
              'sports_champion',
              'music_journey',
            ],
          },
          chapters: [
            {
              chapterNumber: Number,
              title: String,
              titleAr: String,
              episodes: [
                {
                  episodeNumber: Number,
                  title: String,
                  therapyTask: {
                    type: String,
                    description: String,
                    targetMetric: String,
                    targetValue: Number,
                  },
                  status: {
                    type: String,
                    enum: ['locked', 'available', 'in_progress', 'completed'],
                    default: 'locked',
                  },
                  stars: { type: Number, min: 0, max: 3, default: 0 },
                  completedDate: Date,
                  attempts: { type: Number, default: 0 },
                  bestScore: Number,
                },
              ],
              status: {
                type: String,
                enum: ['locked', 'available', 'in_progress', 'completed'],
                default: 'locked',
              },
              rewardOnComplete: { xp: Number, coins: Number, item: String },
            },
          ],
          status: {
            type: String,
            enum: ['locked', 'available', 'in_progress', 'completed'],
            default: 'available',
          },
          startDate: Date,
          completedDate: Date,
          totalStars: { type: Number, default: 0 },
          maxStars: Number,
        },
      ],
    },

    // ─── NEW: الأحداث الموسمية — Seasonal Events ───
    seasonalEvents: [
      {
        eventId: String,
        name: String,
        nameAr: String,
        season: {
          type: String,
          enum: [
            'spring',
            'summer',
            'autumn',
            'winter',
            'ramadan',
            'national_day',
            'disability_day',
            'custom',
          ],
        },
        startDate: Date,
        endDate: Date,
        progress: { type: Number, default: 0 },
        maxProgress: Number,
        milestones: [
          {
            threshold: Number,
            reward: { type: String, xp: Number, coins: Number, item: String },
            claimed: { type: Boolean, default: false },
          },
        ],
        specialChallenges: [
          {
            name: String,
            description: String,
            target: Number,
            current: { type: Number, default: 0 },
            completed: { type: Boolean, default: false },
            reward: String,
          },
        ],
        eventCurrency: { type: Number, default: 0 },
        exclusiveItems: [
          { name: String, cost: Number, purchased: { type: Boolean, default: false } },
        ],
        participationStatus: {
          type: String,
          enum: ['not_joined', 'active', 'completed'],
          default: 'not_joined',
        },
      },
    ],

    // ─── NEW: نظام الحيوانات الأليفة الافتراضية — Virtual Pets ───
    virtualPet: {
      active: { type: Boolean, default: false },
      pet: {
        petId: String,
        name: String,
        species: {
          type: String,
          enum: [
            'dog',
            'cat',
            'rabbit',
            'bird',
            'fish',
            'turtle',
            'hamster',
            'panda',
            'dragon',
            'unicorn',
            'phoenix',
            'robot',
          ],
        },
        level: { type: Number, default: 1 },
        xp: { type: Number, default: 0 },
        happiness: { type: Number, default: 100, min: 0, max: 100 },
        energy: { type: Number, default: 100, min: 0, max: 100 },
        hunger: { type: Number, default: 0, min: 0, max: 100 },
        appearance: { color: String, accessories: [String], outfit: String },
        skills: [{ name: String, level: Number }],
        adoptedDate: Date,
      },
      petCollection: [
        {
          petId: String,
          species: String,
          name: String,
          level: Number,
          adoptedDate: Date,
          isActive: { type: Boolean, default: false },
        },
      ],
      interactionLog: [
        {
          action: {
            type: String,
            enum: ['feed', 'play', 'train', 'groom', 'rest', 'treat', 'adventure'],
          },
          date: Date,
          happinessChange: Number,
          xpEarned: Number,
        },
      ],
    },

    // ─── NEW: التقدم والإحصائيات المتقدمة — Advanced Progress & Analytics ───
    advancedAnalytics: {
      dailyGoals: {
        exerciseMinutes: {
          target: { type: Number, default: 30 },
          current: { type: Number, default: 0 },
        },
        therapySessions: {
          target: { type: Number, default: 1 },
          current: { type: Number, default: 0 },
        },
        socialInteractions: {
          target: { type: Number, default: 2 },
          current: { type: Number, default: 0 },
        },
        questsCompleted: {
          target: { type: Number, default: 3 },
          current: { type: Number, default: 0 },
        },
        lastReset: Date,
      },
      weeklyReport: [
        {
          weekStart: Date,
          weekEnd: Date,
          totalXP: Number,
          sessionsCompleted: Number,
          questsCompleted: Number,
          challengesCompleted: Number,
          streakDays: Number,
          topGame: String,
          improvementAreas: [String],
          therapistFeedback: String,
          overallRating: { type: Number, min: 1, max: 5 },
        },
      ],
      monthlyMilestones: [
        {
          month: String,
          year: Number,
          xpEarned: Number,
          levelsGained: Number,
          achievementsUnlocked: Number,
          questsCompleted: Number,
          storyProgress: Number,
          skillsImproved: [{ skill: String, improvement: Number }],
          therapistNotes: String,
        },
      ],
      heatmap: [
        {
          date: Date,
          activityLevel: { type: Number, min: 0, max: 4 }, // 0=none, 4=very active
          minutesActive: Number,
          sessionsCount: Number,
        },
      ],
      improvementGraph: [
        {
          date: Date,
          domain: {
            type: String,
            enum: [
              'motor',
              'cognitive',
              'speech',
              'social',
              'emotional',
              'independence',
              'overall',
            ],
          },
          score: Number,
          previousScore: Number,
        },
      ],
    },

    // ─── NEW: الإشعارات والتذكيرات — Notifications & Reminders ───
    notifications: [
      {
        notifId: String,
        type: {
          type: String,
          enum: [
            'quest_available',
            'quest_expiring',
            'challenge_invite',
            'achievement_near',
            'streak_warning',
            'level_up',
            'reward_available',
            'friend_request',
            'team_update',
            'event_start',
            'pet_hungry',
            'daily_reminder',
            'weekly_summary',
            'therapist_message',
            'leaderboard_change',
          ],
        },
        title: String,
        titleAr: String,
        message: String,
        messageAr: String,
        date: Date,
        read: { type: Boolean, default: false },
        actionUrl: String,
        priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
      },
    ],

    // ─── NEW: إعدادات التخصيص — Customization Settings ───
    customization: {
      theme: {
        type: String,
        enum: [
          'default',
          'dark',
          'ocean',
          'forest',
          'space',
          'candy',
          'desert',
          'arctic',
          'sunset',
          'neon',
        ],
        default: 'default',
      },
      language: { type: String, enum: ['ar', 'en', 'ar_en'], default: 'ar' },
      soundEffects: { type: Boolean, default: true },
      music: { type: Boolean, default: true },
      musicVolume: { type: Number, default: 70, min: 0, max: 100 },
      sfxVolume: { type: Number, default: 80, min: 0, max: 100 },
      hapticFeedback: { type: Boolean, default: true },
      fontSize: {
        type: String,
        enum: ['small', 'medium', 'large', 'extra_large'],
        default: 'medium',
      },
      colorBlindMode: {
        type: String,
        enum: ['none', 'deuteranopia', 'protanopia', 'tritanopia'],
        default: 'none',
      },
      highContrast: { type: Boolean, default: false },
      reducedMotion: { type: Boolean, default: false },
      notificationPreferences: {
        pushEnabled: { type: Boolean, default: true },
        emailDigest: { type: String, enum: ['none', 'daily', 'weekly'], default: 'weekly' },
        quietHoursStart: String,
        quietHoursEnd: String,
      },
      dashboardLayout: {
        type: String,
        enum: ['compact', 'standard', 'detailed'],
        default: 'standard',
      },
      profileVisibility: {
        type: String,
        enum: ['public', 'friends_only', 'private'],
        default: 'friends_only',
      },
    },

    // ─── NEW: سجل التحويلات / المعاملات — Transaction Log ───
    transactionLog: [
      {
        transactionId: String,
        type: {
          type: String,
          enum: [
            'xp_earned',
            'xp_spent',
            'coins_earned',
            'coins_spent',
            'gems_earned',
            'gems_spent',
            'points_earned',
            'points_redeemed',
            'level_up',
            'rank_up',
            'item_acquired',
            'item_gifted',
            'streak_bonus',
            'quest_reward',
            'challenge_reward',
            'event_reward',
            'achievement_reward',
          ],
        },
        amount: Number,
        currency: { type: String, enum: ['xp', 'coins', 'gems', 'points'] },
        source: String,
        description: String,
        date: { type: Date, default: Date.now },
        balance: { xp: Number, coins: Number, gems: Number, points: Number },
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

TherapyGamificationSchema.index({ beneficiary: 1 });
TherapyGamificationSchema.index({ 'playerProfile.rank': 1, 'playerProfile.level': -1 });
TherapyGamificationSchema.index({ 'quests.status': 1, 'quests.type': 1 });
TherapyGamificationSchema.index({ 'social.teamId': 1 });
TherapyGamificationSchema.index({ 'seasonalEvents.eventId': 1 });
TherapyGamificationSchema.index({ 'storyMode.stories.storyId': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 9. المعدات الطبية IoT — Medical Device IoT Monitoring
// ═══════════════════════════════════════════════════════════════════════════════
const MedicalDeviceIoTSchema = new Schema(
  {
    deviceId: { type: String, unique: true, required: true },
    deviceName: String,
    deviceNameAr: String,
    category: {
      type: String,
      enum: [
        'wheelchair_sensor',
        'prosthetic_sensor',
        'wearable_monitor',
        'smart_orthosis',
        'exoskeleton',
        'environmental_sensor',
        'fall_detector',
        'gait_analyzer',
        'emg_sensor',
        'eeg_device',
        'spo2_monitor',
        'smart_mattress',
        'medication_dispenser',
        'smart_inhaler',
      ],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'alert', 'offline', 'decommissioned'],
      default: 'active',
    },

    // الارتباط بالمستفيد
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedDate: Date,
    location: { facility: String, room: String, gps: { lat: Number, lng: Number } },

    // مواصفات الجهاز
    specifications: {
      manufacturer: String,
      model: String,
      serialNumber: String,
      firmwareVersion: String,
      connectivity: { type: String, enum: ['bluetooth', 'wifi', 'cellular', 'zigbee', 'lorawan'] },
      batteryLevel: Number,
      batteryType: String,
      lastBatteryChange: Date,
      sensorTypes: [String],
      dataFrequency: Number, // readings per minute
      lastCalibration: Date,
      nextCalibration: Date,
    },

    // البيانات الحيوية الأخيرة
    latestReadings: {
      timestamp: Date,
      readings: [{ sensor: String, value: Number, unit: String, normal: Boolean }],
      alerts: [{ type: String, severity: String, message: String }],
    },

    // قواعد التنبيهات
    alertRules: [
      {
        sensor: String,
        condition: { type: String, enum: ['above', 'below', 'equals', 'change_rate', 'absence'] },
        threshold: Number,
        duration: Number, // seconds
        severity: { type: String, enum: ['info', 'warning', 'critical', 'emergency'] },
        notifyCaregiver: Boolean,
        notifyClinician: Boolean,
        autoAction: String,
        enabled: { type: Boolean, default: true },
      },
    ],

    // سجل التنبيهات
    alertHistory: [
      {
        timestamp: Date,
        rule: String,
        sensor: String,
        value: Number,
        severity: String,
        message: String,
        acknowledged: Boolean,
        acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        acknowledgedAt: Date,
        resolution: String,
      },
    ],

    // بيانات التحليل
    analyticsData: {
      dailyUsageHours: Number,
      weeklyUsagePattern: [{ day: String, hours: Number }],
      complianceRate: Number, // %
      dataTrends: [
        {
          metric: String,
          period: String,
          trend: { type: String, enum: ['improving', 'stable', 'declining'] },
          avgValue: Number,
          minValue: Number,
          maxValue: Number,
        },
      ],
    },

    // الصيانة
    maintenance: {
      schedule: { type: String, enum: ['weekly', 'biweekly', 'monthly', 'quarterly'] },
      lastMaintenance: Date,
      nextMaintenance: Date,
      history: [
        {
          date: Date,
          type: {
            type: String,
            enum: [
              'preventive',
              'corrective',
              'calibration',
              'firmware_update',
              'battery_replacement',
            ],
          },
          technician: String,
          description: String,
          partsReplaced: [String],
          cost: Number,
        },
      ],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MedicalDeviceIoTSchema.index({ assignedTo: 1 });
MedicalDeviceIoTSchema.index({ category: 1, status: 1 });
MedicalDeviceIoTSchema.index({ 'specifications.nextCalibration': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 10. التعاون بين المراكز — Inter-Center Collaboration
// ═══════════════════════════════════════════════════════════════════════════════
const InterCenterCollabSchema = new Schema(
  {
    referenceNumber: { type: String, unique: true },
    type: {
      type: String,
      enum: [
        'patient_transfer',
        'consultation',
        'resource_sharing',
        'joint_program',
        'training_exchange',
        'research_collaboration',
        'emergency_support',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'approved',
        'in_progress',
        'completed',
        'cancelled',
        'rejected',
      ],
      default: 'draft',
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },

    // المراكز المشاركة
    initiatingCenter: {
      name: String,
      nameAr: String,
      contactPerson: { type: Schema.Types.ObjectId, ref: 'User' },
      contactEmail: String,
      phone: String,
    },
    receivingCenter: {
      name: String,
      nameAr: String,
      contactPerson: { type: Schema.Types.ObjectId, ref: 'User' },
      contactEmail: String,
      phone: String,
    },

    // تحويل المرضى
    patientTransfer: {
      beneficiary: { type: Schema.Types.ObjectId, ref: 'User' },
      transferReason: String,
      clinicalSummary: String,
      currentDiagnosis: [String],
      currentMedications: [String],
      specialRequirements: [String],
      transportArrangement: {
        type: String,
        enum: ['ambulance', 'family', 'center_vehicle', 'specialized_transport'],
      },
      transferDate: Date,
      medicalRecordsSent: Boolean,
      consentObtained: Boolean,
      receivingPhysician: String,
    },

    // الاستشارة
    consultation: {
      specialty: String,
      question: String,
      urgency: { type: String, enum: ['routine', 'urgent', 'emergent'] },
      patientData: String,
      response: String,
      respondedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      respondedDate: Date,
      followUpRequired: Boolean,
    },

    // مشاركة الموارد
    resourceSharing: {
      resourceType: {
        type: String,
        enum: ['equipment', 'specialist', 'facility', 'training_material', 'technology'],
      },
      description: String,
      quantity: Number,
      startDate: Date,
      endDate: Date,
      terms: String,
      cost: { amount: Number, currency: { type: String, default: 'SAR' }, paidBy: String },
    },

    // البرامج المشتركة
    jointProgram: {
      programName: String,
      programNameAr: String,
      objectives: [String],
      duration: { startDate: Date, endDate: Date },
      budget: { total: Number, contributions: [{ center: String, amount: Number }] },
      milestones: [{ name: String, targetDate: Date, status: String }],
      outcomes: [{ metric: String, target: Number, actual: Number }],
    },

    // سجل الاتصالات
    communications: [
      {
        date: Date,
        from: { type: Schema.Types.ObjectId, ref: 'User' },
        fromCenter: String,
        message: String,
        attachments: [String],
        readBy: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, readAt: Date }],
      },
    ],

    // الموافقات
    approvals: [
      {
        approver: { type: Schema.Types.ObjectId, ref: 'User' },
        center: String,
        status: { type: String, enum: ['pending', 'approved', 'rejected'] },
        date: Date,
        comments: String,
      },
    ],

    // التقييم
    evaluation: {
      rating: Number, // 1–5
      feedback: String,
      lessonsLearned: String,
      futureRecommendations: String,
      evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      evaluationDate: Date,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

InterCenterCollabSchema.index({ type: 1, status: 1 });
InterCenterCollabSchema.index({ 'initiatingCenter.name': 1 });
InterCenterCollabSchema.index({ 'receivingCenter.name': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 11. متابعة ما بعد التخرج — Post-Discharge Tracking
// ═══════════════════════════════════════════════════════════════════════════════
const PostDischargeTrackingSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    status: {
      type: String,
      enum: [
        'active_followup',
        'periodic_check',
        'annual_review',
        'self_monitoring',
        're_enrolled',
        'lost_to_followup',
        'closed',
      ],
      default: 'active_followup',
    },

    // بيانات التخرج
    dischargeInfo: {
      dischargeDate: Date,
      program: String,
      dischargingCenter: String,
      dischargeReason: {
        type: String,
        enum: ['goals_met', 'plateau', 'patient_request', 'insurance', 'transfer', 'other'],
      },
      dischargeSummary: String,
      finalAssessmentScores: [{ measure: String, score: Number }],
      homeExerciseProgram: [{ exercise: String, frequency: String, sets: Number, reps: Number }],
      equipmentProvided: [String],
      referrals: [{ specialist: String, reason: String, date: Date }],
      dischargedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    // خطة المتابعة
    followUpSchedule: [
      {
        scheduledDate: Date,
        type: { type: String, enum: ['phone', 'video', 'in_person', 'survey', 'home_visit'] },
        intervalMonths: Number,
        status: {
          type: String,
          enum: ['scheduled', 'completed', 'missed', 'rescheduled', 'cancelled'],
        },
        completedDate: Date,
        completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // المكالمات والزيارات
    contactLogs: [
      {
        date: Date,
        type: {
          type: String,
          enum: ['phone', 'video', 'in_person', 'email', 'sms', 'whatsapp', 'home_visit'],
        },
        initiatedBy: { type: String, enum: ['center', 'beneficiary', 'caregiver'] },
        contactPerson: { type: Schema.Types.ObjectId, ref: 'User' },
        duration: Number,
        topics: [String],
        concerns: [String],
        adviceGiven: String,
        needsReassessment: Boolean,
        notes: String,
      },
    ],

    // التقييمات الطولية
    longitudinalOutcomes: [
      {
        date: Date,
        monthsPostDischarge: Number,
        assessments: [{ measure: String, score: Number, changeFromBaseline: Number }],
        functionalStatus: { type: String, enum: ['improved', 'maintained', 'declined'] },
        qualityOfLife: Number, // 0–100
        employmentStatus: {
          type: String,
          enum: ['employed', 'seeking', 'training', 'unable', 'retired', 'student'],
        },
        independenceLevel: {
          type: String,
          enum: ['fully_independent', 'mostly_independent', 'needs_assistance', 'dependent'],
        },
        socialParticipation: Number, // 0–10
        healthStatus: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
        hospitalizationsSinceDischarge: Number,
        erVisits: Number,
        fallsReported: Number,
        pain: Number, // 0–10
        satisfaction: Number, // 1–5
        assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // إعادة التسجيل
    readmissions: [
      {
        date: Date,
        reason: String,
        program: String,
        center: String,
        outcome: String,
        dischargeDate: Date,
      },
    ],

    // دعم الأقران
    peerSupport: {
      mentor: Boolean,
      mentee: Boolean,
      groupMembership: [String],
      communityEvents: [{ name: String, date: Date, role: String }],
      testimonial: String,
      willingToShare: Boolean,
    },

    // تنبيهات المتابعة
    alerts: [
      {
        type: {
          type: String,
          enum: [
            'missed_followup',
            'declining_function',
            'readmission_risk',
            'medication_concern',
            'caregiver_burnout',
            'safety_concern',
          ],
        },
        date: Date,
        details: String,
        severity: { type: String, enum: ['low', 'moderate', 'high'] },
        resolved: Boolean,
        resolvedDate: Date,
        action: String,
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

PostDischargeTrackingSchema.index({ beneficiary: 1 });
PostDischargeTrackingSchema.index({ status: 1, 'dischargeInfo.dischargeDate': -1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 12. العلاج بالواقع المعزز — AR Therapy
// ═══════════════════════════════════════════════════════════════════════════════
const ARTherapySchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    status: {
      type: String,
      enum: ['enrolled', 'active', 'paused', 'completed', 'withdrawn'],
      default: 'enrolled',
    },

    // بروتوكول العلاج
    protocol: {
      therapyGoal: {
        type: String,
        enum: [
          'motor_rehab',
          'cognitive_training',
          'speech_therapy',
          'pain_management',
          'phobia_treatment',
          'social_skills',
          'daily_living_skills',
          'sensory_integration',
          'balance_training',
          'gait_training',
        ],
      },
      targetDisability: String,
      prescribedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      frequency: { sessionsPerWeek: Number, sessionDuration: Number },
      totalSessions: Number,
      difficultyProgression: { type: String, enum: ['fixed', 'adaptive', 'therapist_controlled'] },
      startDate: Date,
      endDate: Date,
    },

    // الأجهزة المستخدمة
    equipment: {
      headset: {
        type: String,
        enum: ['hololens', 'magic_leap', 'nreal', 'tablet_ar', 'phone_ar', 'custom_ar'],
      },
      controllers: [String],
      sensors: [String],
      softwarePlatform: String,
      applications: [{ name: String, version: String, therapeuticArea: String }],
      calibrationDate: Date,
    },

    // الجلسات
    sessions: [
      {
        date: Date,
        sessionNumber: Number,
        therapist: { type: Schema.Types.ObjectId, ref: 'User' },
        duration: Number,
        application: String,
        scenario: String,
        difficulty: Number, // 1–10

        // مقاييس الأداء
        performance: {
          accuracy: Number, // %
          reactionTime: Number, // ms
          completionRate: Number, // %
          errorsCount: Number,
          score: Number,
          movementRange: { type: Number, unit: String },
          repetitions: Number,
          holdTime: Number, // seconds
        },

        // بيانات الحركة
        motionData: {
          handsTracking: { leftRange: Number, rightRange: Number },
          headMovement: { yaw: Number, pitch: Number, roll: Number },
          bodyPosture: String,
          gazePattern: String,
          spatialAccuracy: Number, // mm
        },

        // ردود الفعل
        physiological: {
          heartRateBefore: Number,
          heartRateAfter: Number,
          skinConductance: Number,
          eyeTracking: { gazeDuration: Number, saccades: Number },
          cyberSickness: { nausea: Number, disorientation: Number, oculomotor: Number }, // SSQ
        },

        // تقييم المعالج
        therapistAssessment: {
          engagement: { type: Number, min: 1, max: 5 },
          taskComprehension: { type: Number, min: 1, max: 5 },
          frustrationLevel: { type: String, enum: ['none', 'mild', 'moderate', 'high'] },
          transferToRealWorld: { type: String, enum: ['evident', 'emerging', 'not_observed'] },
          adjustmentsMade: [String],
          notes: String,
        },

        sideEffects: [
          {
            type: String,
            enum: [
              'nausea',
              'dizziness',
              'headache',
              'eye_strain',
              'fatigue',
              'motion_sickness',
              'none',
            ],
          },
        ],
      },
    ],

    // تقييمات التقدم
    progressAssessments: [
      {
        date: Date,
        assessmentNumber: Number,
        motorImprovement: Number, // %
        cognitiveImprovement: Number,
        functionalTransfer: { type: String, enum: ['high', 'moderate', 'low', 'none'] },
        standardizedMeasures: [{ name: String, score: Number, changeFromBaseline: Number }],
        patientSatisfaction: Number,
        continuationRecommended: Boolean,
        assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
      },
    ],

    // ملخص التحليلات
    analytics: {
      totalSessions: { type: Number, default: 0 },
      totalPlayTime: { type: Number, default: 0 },
      averageAccuracy: Number,
      averageEngagement: Number,
      improvementRate: Number,
      bestPerformance: { date: Date, score: Number, scenario: String },
      complianceRate: Number, // %
      preferredApplications: [String],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

ARTherapySchema.index({ beneficiary: 1 });
ARTherapySchema.index({ status: 1, 'protocol.therapyGoal': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  CardiacPulmonaryRehab: mongoose.model('CardiacPulmonaryRehab', CardiacPulmonaryRehabSchema),
  StrokeRehab: mongoose.model('StrokeRehab', StrokeRehabSchema),
  SpinalCordRehab: mongoose.model('SpinalCordRehab', SpinalCordRehabSchema),
  PostSurgicalRehab: mongoose.model('PostSurgicalRehab', PostSurgicalRehabSchema),
  GeriatricRehab: mongoose.model('GeriatricRehab', GeriatricRehabSchema),
  AdvancedMentalHealth: mongoose.model('AdvancedMentalHealth', AdvancedMentalHealthSchema),
  GeneticCounseling: mongoose.model('GeneticCounseling', GeneticCounselingSchema),
  TherapyGamification: mongoose.model('TherapyGamification', TherapyGamificationSchema),
  MedicalDeviceIoT: mongoose.model('MedicalDeviceIoT', MedicalDeviceIoTSchema),
  InterCenterCollab: mongoose.model('InterCenterCollab', InterCenterCollabSchema),
  PostDischargeTracking: mongoose.model('PostDischargeTracking', PostDischargeTrackingSchema),
  ARTherapy: mongoose.model('ARTherapy', ARTherapySchema),
};

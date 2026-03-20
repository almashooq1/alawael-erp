/**
 * Rehabilitation Expansion Models — نماذج التوسعة في خدمات تأهيل ذوي الإعاقة
 *
 * 10 أنظمة جديدة شاملة:
 *  1. الأجهزة التعويضية والمساعدة (Prosthetics & Assistive Devices)
 *  2. التأهيل المهني والتوظيف (Vocational Rehab & Employment)
 *  3. حقوق ذوي الإعاقة والمناصرة (Disability Rights & Advocacy)
 *  4. الرعاية الصحية التكاملية (Integrative Healthcare)
 *  5. الدمج المجتمعي والحياة المستقلة (Community Integration & Independent Living)
 *  6. دعم مقدمي الرعاية والأسر (Caregiver & Family Support)
 *  7. الوصول الشامل والبيئة التكيفية (Accessibility & Adaptive Environment)
 *  8. الكشف والتدخل المبكر المتقدم (Advanced Early Detection & Screening)
 *  9. قياس النتائج والأثر (Outcome & Impact Measurement)
 * 10. الإسكان التكيفي وتعديل المنازل (Adaptive Housing & Home Modification)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. نظام الأجهزة التعويضية والمساعدة — Prosthetics & Assistive Devices
// ═══════════════════════════════════════════════════════════════════════════════

const AssistiveDeviceSchema = new Schema(
  {
    // Basic Info
    deviceName: { type: String, required: true },
    deviceNameAr: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'prosthetic_upper', // أطراف صناعية علوية
        'prosthetic_lower', // أطراف صناعية سفلية
        'orthotic', // أجهزة تقويمية
        'wheelchair_manual', // كرسي متحرك يدوي
        'wheelchair_electric', // كرسي متحرك كهربائي
        'hearing_aid', // سماعة أذن
        'cochlear_implant', // زراعة قوقعة
        'visual_aid', // أجهزة بصرية مساعدة
        'communication_device', // أجهزة تواصل AAC
        'mobility_aid', // أجهزة مساعدة على الحركة
        'standing_frame', // إطار وقوف
        'walker', // مشاية
        'crutches', // عكازات
        'braille_device', // أجهزة بريل
        'adaptive_technology', // تقنيات تكيفية
        'sensory_aid', // أجهزة حسية
        'splint_brace', // جبائر ودعامات
        'pressure_garment', // ملابس ضغط
        'seating_positioning', // أجهزة جلوس ووضعية
        'environmental_control', // أجهزة تحكم بيئي
        'other',
      ],
      required: true,
    },
    subcategory: String,

    // Beneficiary
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    disabilityType: {
      type: String,
      enum: [
        'physical',
        'visual',
        'hearing',
        'intellectual',
        'multiple',
        'neurological',
        'speech',
        'other',
      ],
    },

    // Device Details
    manufacturer: String,
    model: String,
    serialNumber: { type: String, unique: true, sparse: true },
    specifications: {
      size: String,
      weight: String,
      material: String,
      powerSource: { type: String, enum: ['none', 'battery', 'rechargeable', 'electric', 'solar'] },
      batteryLife: String,
      waterResistance: {
        type: String,
        enum: ['none', 'splash_proof', 'water_resistant', 'waterproof'],
      },
      connectivity: [{ type: String, enum: ['bluetooth', 'wifi', 'usb', 'nfc', 'none'] }],
      color: String,
      customFeatures: [String],
    },

    // Fitting & Measurement
    fitting: {
      date: Date,
      fittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      measurements: [
        {
          type: { type: String },
          value: Number,
          unit: String,
          side: { type: String, enum: ['left', 'right', 'bilateral', 'na'] },
        },
      ],
      adjustments: [
        {
          date: Date,
          description: String,
          performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        },
      ],
      satisfactionScore: { type: Number, min: 1, max: 10 },
      comfortLevel: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      notes: String,
    },

    // Prescription
    prescription: {
      prescribedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      prescriptionDate: Date,
      prescriptionNumber: String,
      diagnosis: String,
      medicalJustification: String,
      priority: { type: String, enum: ['urgent', 'high', 'medium', 'low'], default: 'medium' },
      approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired'],
        default: 'pending',
      },
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      approvalDate: Date,
      insuranceCoverage: {
        provider: String,
        policyNumber: String,
        coveragePercentage: Number,
        preAuthorizationCode: String,
        maxCoverage: Number,
      },
    },

    // Training
    training: {
      required: { type: Boolean, default: true },
      sessions: [
        {
          date: Date,
          duration: Number, // minutes
          trainer: { type: Schema.Types.ObjectId, ref: 'User' },
          topics: [String],
          competencyAchieved: Boolean,
          notes: String,
        },
      ],
      trainingCompleted: { type: Boolean, default: false },
      completionDate: Date,
      independenceLevel: {
        type: String,
        enum: ['independent', 'minimal_assistance', 'moderate_assistance', 'full_assistance'],
      },
    },

    // Maintenance & Warranty
    maintenance: {
      lastServiceDate: Date,
      nextServiceDate: Date,
      serviceInterval: { type: Number, default: 180 }, // days
      history: [
        {
          date: Date,
          type: {
            type: String,
            enum: ['routine', 'repair', 'replacement', 'calibration', 'cleaning'],
          },
          description: String,
          cost: Number,
          performedBy: String,
          partsReplaced: [String],
          status: { type: String, enum: ['completed', 'pending', 'in_progress'] },
        },
      ],
    },
    warranty: {
      startDate: Date,
      endDate: Date,
      provider: String,
      coverageType: { type: String, enum: ['full', 'limited', 'parts_only', 'labor_only'] },
      warrantyNumber: String,
      terms: String,
    },

    // Financial
    cost: {
      purchasePrice: Number,
      insuranceCovered: Number,
      governmentSubsidy: Number,
      beneficiaryPortion: Number,
      currency: { type: String, default: 'SAR' },
      fundingSource: {
        type: String,
        enum: ['insurance', 'government', 'charity', 'self_pay', 'mixed'],
      },
    },

    // Status
    status: {
      type: String,
      enum: [
        'prescribed',
        'ordered',
        'fitting',
        'delivered',
        'active',
        'needs_repair',
        'under_repair',
        'replaced',
        'returned',
        'decommissioned',
      ],
      default: 'prescribed',
    },
    condition: {
      type: String,
      enum: ['new', 'excellent', 'good', 'fair', 'poor', 'damaged'],
      default: 'new',
    },
    issuedDate: Date,
    expectedLifespan: Number, // months
    replacementDue: Date,

    // Usage Tracking
    usageTracking: {
      dailyUsageHours: Number,
      usageFrequency: {
        type: String,
        enum: ['daily', 'several_times_week', 'weekly', 'occasionally', 'rarely'],
      },
      usageSatisfaction: { type: Number, min: 1, max: 10 },
      challenges: [String],
      improvements: [String],
    },

    // Documents
    documents: [
      {
        name: String,
        type: {
          type: String,
          enum: [
            'prescription',
            'invoice',
            'warranty',
            'manual',
            'photo',
            'report',
            'insurance_claim',
          ],
        },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

AssistiveDeviceSchema.index({ beneficiary: 1, status: 1 });
AssistiveDeviceSchema.index({ category: 1, status: 1 });
AssistiveDeviceSchema.index({ 'warranty.endDate': 1 });
AssistiveDeviceSchema.index({ 'maintenance.nextServiceDate': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 2. نظام التأهيل المهني والتوظيف — Vocational Rehabilitation & Employment
// ═══════════════════════════════════════════════════════════════════════════════

const VocationalRehabSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,

    // Vocational Assessment
    vocationalAssessment: {
      date: Date,
      assessor: { type: Schema.Types.ObjectId, ref: 'User' },
      interestsInventory: [
        {
          area: String,
          score: Number,
          rank: Number,
        },
      ],
      aptitudeTests: [
        {
          testName: String,
          score: Number,
          percentile: Number,
          interpretation: String,
        },
      ],
      workSamples: [
        {
          task: String,
          performance: {
            type: String,
            enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'unable'],
          },
          timeToComplete: Number,
          accommodationsUsed: [String],
          notes: String,
        },
      ],
      functionalCapacity: {
        lifting: { type: String, enum: ['sedentary', 'light', 'medium', 'heavy', 'very_heavy'] },
        sitting: Number, // hours
        standing: Number,
        walking: Number,
        cognitiveLevel: { type: String, enum: ['high', 'moderate', 'low', 'variable'] },
        socialSkills: { type: String, enum: ['excellent', 'good', 'fair', 'limited'] },
        communicationAbility: {
          type: String,
          enum: ['independent', 'needs_support', 'significant_support', 'alternative_methods'],
        },
      },
      recommendedFields: [String],
      barriers: [String],
      strengths: [String],
    },

    // Skills Training
    skillsTraining: [
      {
        programName: String,
        programNameAr: String,
        type: {
          type: String,
          enum: [
            'computer_skills', // مهارات حاسوبية
            'office_skills', // مهارات مكتبية
            'technical_trade', // حرف تقنية
            'food_service', // خدمات غذائية
            'retail', // تجارة التجزئة
            'customer_service', // خدمة العملاء
            'data_entry', // إدخال بيانات
            'graphic_design', // تصميم جرافيك
            'digital_marketing', // تسويق رقمي
            'crafts_handwork', // أشغال يدوية وحرف
            'agriculture', // زراعة
            'soft_skills', // مهارات شخصية
            'entrepreneurship', // ريادة أعمال
            'language_skills', // مهارات لغوية
            'other',
          ],
        },
        startDate: Date,
        endDate: Date,
        status: {
          type: String,
          enum: ['enrolled', 'in_progress', 'completed', 'dropped', 'on_hold'],
        },
        progress: { type: Number, min: 0, max: 100 },
        instructor: String,
        location: String,
        accommodationsProvided: [String],
        certificationObtained: Boolean,
        certificationName: String,
        evaluation: {
          score: Number,
          feedback: String,
          competenciesAchieved: [String],
        },
      },
    ],

    // Job Placement
    jobPlacement: {
      status: {
        type: String,
        enum: [
          'seeking',
          'interviewing',
          'placed',
          'employed',
          'self_employed',
          'not_ready',
          'on_hold',
        ],
        default: 'not_ready',
      },
      jobGoal: String,
      targetIndustry: String,
      preferredWorkType: {
        type: String,
        enum: ['full_time', 'part_time', 'remote', 'hybrid', 'freelance', 'sheltered_workshop'],
      },
      preferredLocation: String,
      salaryExpectation: { min: Number, max: Number, currency: { type: String, default: 'SAR' } },
      resume: { url: String, lastUpdated: Date },
      portfolio: { url: String, description: String },

      applications: [
        {
          employer: String,
          position: String,
          applicationDate: Date,
          status: {
            type: String,
            enum: [
              'applied',
              'interview_scheduled',
              'interviewed',
              'offered',
              'accepted',
              'rejected',
              'withdrawn',
            ],
          },
          interviewDate: Date,
          interviewNotes: String,
          accommodationsRequested: [String],
          result: String,
          feedback: String,
        },
      ],

      currentEmployment: {
        employer: String,
        position: String,
        startDate: Date,
        salary: Number,
        workHours: Number,
        supervisor: String,
        accommodationsProvided: [String],
        jobSatisfaction: { type: Number, min: 1, max: 10 },
        performanceRating: {
          type: String,
          enum: ['excellent', 'good', 'satisfactory', 'needs_improvement'],
        },
      },
    },

    // Employer Partnerships
    employerPartnership: {
      partnerId: { type: Schema.Types.ObjectId, ref: 'Organization' },
      companyName: String,
      contactPerson: String,
      contactEmail: String,
      contactPhone: String,
      industryType: String,
      availablePositions: [
        {
          title: String,
          description: String,
          requirements: [String],
          accommodationsAvailable: [String],
          salary: Number,
          type: {
            type: String,
            enum: ['full_time', 'part_time', 'internship', 'supported_employment'],
          },
        },
      ],
      partnershipStatus: { type: String, enum: ['active', 'pending', 'inactive'] },
      startDate: Date,
      mou: { url: String, expiryDate: Date },
    },

    // Workplace Accommodations
    workplaceAccommodations: [
      {
        type: {
          type: String,
          enum: [
            'physical_modification', // تعديلات مادية
            'assistive_technology', // تقنيات مساعدة
            'flexible_schedule', // جدول مرن
            'remote_work', // عمل عن بعد
            'job_restructuring', // إعادة هيكلة المهام
            'sign_interpreter', // مترجم إشارة
            'reader_service', // خدمة قارئ
            'transportation', // نقل
            'personal_assistant', // مساعد شخصي
            'modified_equipment', // معدات معدلة
            'other',
          ],
        },
        description: String,
        status: { type: String, enum: ['requested', 'approved', 'implemented', 'denied'] },
        cost: Number,
        fundingSource: String,
        implementedDate: Date,
        effectivenessRating: { type: Number, min: 1, max: 5 },
      },
    ],

    // Follow-up
    followUps: [
      {
        date: Date,
        conductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        type: { type: String, enum: ['phone', 'site_visit', 'video_call', 'in_person'] },
        employerFeedback: String,
        beneficiaryFeedback: String,
        issuesIdentified: [String],
        actionsPlanned: [String],
        jobRetentionStatus: { type: String, enum: ['stable', 'at_risk', 'terminated', 'promoted'] },
      },
    ],

    // Entrepreneurship Support
    entrepreneurship: {
      interested: { type: Boolean, default: false },
      businessIdea: String,
      businessPlan: {
        url: String,
        status: { type: String, enum: ['draft', 'reviewed', 'approved'] },
      },
      funding: {
        source: String,
        amount: Number,
        status: { type: String, enum: ['applied', 'approved', 'disbursed', 'rejected'] },
      },
      mentors: [
        {
          name: String,
          expertise: String,
          contact: String,
          sessions: Number,
        },
      ],
      businessLicense: { number: String, issueDate: Date, expiryDate: Date },
      revenue: { monthly: Number, currency: { type: String, default: 'SAR' } },
    },

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

VocationalRehabSchema.index({ beneficiary: 1 });
VocationalRehabSchema.index({ 'jobPlacement.status': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 3. نظام حقوق ذوي الإعاقة والمناصرة — Disability Rights & Advocacy
// ═══════════════════════════════════════════════════════════════════════════════

const DisabilityRightsSchema = new Schema(
  {
    // Case Info
    caseNumber: { type: String, unique: true },
    caseType: {
      type: String,
      enum: [
        'discrimination', // تمييز
        'accessibility_violation', // انتهاك إمكانية الوصول
        'employment_rights', // حقوق العمل
        'education_rights', // حقوق التعليم
        'healthcare_rights', // حقوق الرعاية الصحية
        'housing_rights', // حقوق السكن
        'transportation_rights', // حقوق النقل
        'financial_rights', // حقوق مالية
        'social_benefits', // مستحقات اجتماعية
        'guardianship', // وصاية
        'abuse_neglect', // إساءة أو إهمال
        'insurance_dispute', // نزاع تأميني
        'government_services', // خدمات حكومية
        'legal_capacity', // أهلية قانونية
        'other',
      ],
      required: true,
    },

    // Complainant
    complainant: {
      beneficiary: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      nationalId: String,
      disabilityCard: String,
      disabilityType: String,
      phone: String,
      email: String,
      relationship: {
        type: String,
        enum: ['self', 'parent', 'guardian', 'sibling', 'spouse', 'advocate', 'other'],
      },
    },

    // Respondent
    respondent: {
      name: String,
      type: {
        type: String,
        enum: [
          'individual',
          'organization',
          'government',
          'employer',
          'school',
          'hospital',
          'other',
        ],
      },
      contact: String,
      address: String,
    },

    // Case Details
    description: { type: String, required: true },
    descriptionAr: String,
    incidentDate: Date,
    location: String,
    witnesses: [
      {
        name: String,
        contact: String,
        statement: String,
      },
    ],
    evidence: [
      {
        type: {
          type: String,
          enum: ['document', 'photo', 'video', 'audio', 'testimony', 'medical_report', 'other'],
        },
        description: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Legal Reference
    legalReference: {
      saudiDisabilityLaw: [String], // مواد نظام رعاية المعوقين
      unConvention: [String], // اتفاقية حقوق ذوي الإعاقة
      laborLaw: [String], // نظام العمل
      otherLaws: [String],
      precedents: [String],
    },

    // Case Processing
    status: {
      type: String,
      enum: [
        'submitted',
        'under_review',
        'investigation',
        'mediation',
        'legal_action',
        'resolved',
        'closed',
        'appealed',
        'escalated',
      ],
      default: 'submitted',
    },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedLawyer: {
      name: String,
      licenseNumber: String,
      firm: String,
      phone: String,
      email: String,
      specialization: String,
    },

    // Timeline
    timeline: [
      {
        date: { type: Date, default: Date.now },
        action: String,
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
        outcome: String,
      },
    ],

    // Resolution
    resolution: {
      date: Date,
      type: {
        type: String,
        enum: ['settled', 'court_ruling', 'mediation', 'withdrawn', 'dismissed'],
      },
      outcome: String,
      compensationAwarded: Number,
      correctiveActions: [String],
      complianceDeadline: Date,
      satisfactionRating: { type: Number, min: 1, max: 5 },
      followUpRequired: Boolean,
    },

    // Awareness Campaigns
    awarenessCampaign: {
      linked: Boolean,
      campaignId: String,
      topic: String,
      targetAudience: String,
    },

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

DisabilityRightsSchema.index({ status: 1, priority: 1 });
DisabilityRightsSchema.index({ 'complainant.beneficiary': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 4. نظام الرعاية الصحية التكاملية — Integrative Healthcare
// ═══════════════════════════════════════════════════════════════════════════════

const IntegrativeHealthcareSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,

    // Health Profile
    healthProfile: {
      bloodType: String,
      allergies: [{ allergen: String, severity: String, reaction: String }],
      chronicConditions: [
        {
          condition: String,
          diagnosedDate: Date,
          managedBy: String,
          medications: [String],
          status: { type: String, enum: ['controlled', 'uncontrolled', 'monitoring', 'resolved'] },
        },
      ],
      primaryDisability: String,
      secondaryConditions: [String],
      height: Number,
      weight: Number,
      bmi: Number,
    },

    // Dental Care
    dentalCare: [
      {
        date: Date,
        dentist: String,
        procedure: {
          type: String,
          enum: [
            'checkup',
            'cleaning',
            'filling',
            'extraction',
            'crown',
            'root_canal',
            'orthodontics',
            'sedation_dentistry',
            'special_needs_dental',
            'preventive',
          ],
        },
        findings: String,
        specialAccommodations: [String],
        nextVisit: Date,
        notes: String,
      },
    ],

    // Nutritional Plans
    nutritionPlan: {
      dietitian: { type: Schema.Types.ObjectId, ref: 'User' },
      dietType: {
        type: String,
        enum: [
          'regular',
          'modified_texture',
          'tube_feeding',
          'ketogenic',
          'gluten_free',
          'dairy_free',
          'diabetic',
          'renal',
          'high_calorie',
          'dysphagia_diet',
          'custom',
        ],
      },
      caloricIntake: Number,
      restrictions: [String],
      supplements: [
        {
          name: String,
          dosage: String,
          frequency: String,
          reason: String,
        },
      ],
      feedingSupport: {
        required: Boolean,
        type: {
          type: String,
          enum: ['independent', 'verbal_prompts', 'physical_assist', 'full_assist', 'tube'],
        },
        equipment: [String],
      },
      mealPlans: [
        {
          day: String,
          meals: [
            {
              type: {
                type: String,
                enum: ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner', 'snack_evening'],
              },
              items: [String],
              calories: Number,
              notes: String,
            },
          ],
        },
      ],
      weightGoal: { target: Number, timeline: String },
      lastReviewDate: Date,
      nextReviewDate: Date,
    },

    // Preventive Care
    preventiveCare: {
      immunizations: [
        {
          vaccine: String,
          date: Date,
          dueDate: Date,
          provider: String,
          batchNumber: String,
          status: {
            type: String,
            enum: ['completed', 'due', 'overdue', 'contraindicated', 'declined'],
          },
        },
      ],
      screenings: [
        {
          type: { type: String },
          date: Date,
          result: String,
          nextDue: Date,
          provider: String,
          notes: String,
        },
      ],
      annualCheckups: [
        {
          date: Date,
          provider: String,
          findings: [String],
          recommendations: [String],
          referrals: [String],
        },
      ],
    },

    // Medication Management
    medications: [
      {
        name: String,
        genericName: String,
        dosage: String,
        frequency: String,
        route: {
          type: String,
          enum: ['oral', 'injection', 'topical', 'inhalation', 'rectal', 'transdermal', 'other'],
        },
        prescribedBy: String,
        prescribedDate: Date,
        purpose: String,
        sideEffects: [String],
        interactions: [String],
        status: { type: String, enum: ['active', 'discontinued', 'on_hold', 'completed'] },
        adherence: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
        pharmacyInfo: { name: String, phone: String },
      },
    ],

    // Specialist Visits
    specialistVisits: [
      {
        specialty: {
          type: String,
          enum: [
            'neurologist',
            'orthopedist',
            'ophthalmologist',
            'audiologist',
            'cardiologist',
            'pulmonologist',
            'endocrinologist',
            'psychiatrist',
            'geneticist',
            'urologist',
            'gastroenterologist',
            'dermatologist',
            'rheumatologist',
            'other',
          ],
        },
        doctorName: String,
        facility: String,
        date: Date,
        reason: String,
        findings: String,
        recommendations: [String],
        followUpDate: Date,
        referralSource: String,
      },
    ],

    // Mental Health Integration
    mentalHealth: {
      currentStatus: {
        type: String,
        enum: ['stable', 'mild_concerns', 'moderate_concerns', 'significant_concerns', 'crisis'],
      },
      diagnoses: [String],
      therapist: String,
      sessionFrequency: String,
      medications: [String],
      crisisContacts: [
        {
          name: String,
          relationship: String,
          phone: String,
        },
      ],
      selfHarmRisk: { type: String, enum: ['none', 'low', 'moderate', 'high'] },
      lastAssessmentDate: Date,
    },

    // Emergency Info
    emergencyInfo: {
      contacts: [
        {
          name: String,
          relationship: String,
          phone: String,
          isAlternateDecisionMaker: Boolean,
        },
      ],
      medicalAlertInfo: String,
      preferredHospital: String,
      advanceDirective: Boolean,
      dnrStatus: Boolean,
      specialInstructions: String,
    },

    // Care Coordination
    careTeam: [
      {
        provider: String,
        role: String,
        facility: String,
        phone: String,
        email: String,
        lastContactDate: Date,
        isPrimary: Boolean,
      },
    ],

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

IntegrativeHealthcareSchema.index({ beneficiary: 1 });
IntegrativeHealthcareSchema.index({ 'preventiveCare.immunizations.dueDate': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 5. نظام الدمج المجتمعي والحياة المستقلة — Community Integration & Independent Living
// ═══════════════════════════════════════════════════════════════════════════════

const CommunityIntegrationSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,

    // Independent Living Skills Assessment
    independentLivingAssessment: {
      date: Date,
      assessor: { type: Schema.Types.ObjectId, ref: 'User' },
      domains: [
        {
          domain: {
            type: String,
            enum: [
              'personal_hygiene', // النظافة الشخصية
              'dressing', // ارتداء الملابس
              'meal_preparation', // إعداد الوجبات
              'money_management', // إدارة المال
              'time_management', // إدارة الوقت
              'transportation_use', // استخدام المواصلات
              'shopping', // التسوق
              'household_cleaning', // تنظيف المنزل
              'laundry', // الغسيل
              'communication', // التواصل
              'safety_awareness', // الوعي بالسلامة
              'health_management', // إدارة الصحة
              'social_interaction', // التفاعل الاجتماعي
              'decision_making', // اتخاذ القرار
              'problem_solving', // حل المشكلات
              'technology_use', // استخدام التكنولوجيا
              'leisure_recreation', // الترفيه والاستجمام
            ],
          },
          currentLevel: {
            type: String,
            enum: ['independent', 'supervision', 'verbal_prompts', 'physical_assist', 'dependent'],
          },
          targetLevel: String,
          priority: { type: String, enum: ['high', 'medium', 'low'] },
          notes: String,
        },
      ],
      overallScore: Number,
      recommendations: [String],
    },

    // Life Skills Training
    lifeSkillsTraining: [
      {
        skill: String,
        skillAr: String,
        startDate: Date,
        endDate: Date,
        trainer: { type: Schema.Types.ObjectId, ref: 'User' },
        method: {
          type: String,
          enum: [
            'one_on_one',
            'group',
            'community_based',
            'video_modeling',
            'task_analysis',
            'simulation',
          ],
        },
        sessions: [
          {
            date: Date,
            duration: Number,
            objectives: [String],
            activitiesPerformed: [String],
            progress: {
              type: String,
              enum: ['mastered', 'improving', 'emerging', 'no_change', 'regression'],
            },
            notes: String,
          },
        ],
        mastered: { type: Boolean, default: false },
        masteredDate: Date,
      },
    ],

    // Community Activities
    communityActivities: [
      {
        activityName: String,
        activityNameAr: String,
        category: {
          type: String,
          enum: [
            'sports_fitness', // رياضة ولياقة
            'arts_culture', // فنون وثقافة
            'religious', // دينية
            'educational', // تعليمية
            'social_club', // نادي اجتماعي
            'volunteering', // تطوع
            'recreation', // ترفيه
            'special_olympics', // أولمبياد خاص
            'adaptive_sports', // رياضة تكيفية
            'music', // موسيقى
            'theater', // مسرح
            'nature_outdoor', // أنشطة خارجية
            'technology', // تقنية
            'cooking', // طبخ
            'peer_support', // دعم الأقران
            'other',
          ],
        },
        location: String,
        schedule: { day: String, time: String, frequency: String },
        supportNeeded: {
          type: { type: String, enum: ['none', 'companion', 'aide', 'interpreter', 'transport'] },
          details: String,
        },
        startDate: Date,
        status: { type: String, enum: ['active', 'paused', 'completed', 'dropped'] },
        satisfaction: { type: Number, min: 1, max: 5 },
        socialBenefits: [String],
        notes: String,
      },
    ],

    // Social Network
    socialNetwork: {
      friendships: [
        {
          name: String,
          howMet: String,
          frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'occasionally'] },
          quality: { type: String, enum: ['strong', 'moderate', 'developing', 'acquaintance'] },
        },
      ],
      supportGroups: [
        {
          name: String,
          focus: String,
          frequency: String,
          location: String,
          isOnline: Boolean,
        },
      ],
      socialMediaPresence: [
        {
          platform: String,
          usage: { type: String, enum: ['active', 'occasional', 'inactive'] },
          safetyMeasures: [String],
        },
      ],
      loneliness: { type: String, enum: ['not_lonely', 'sometimes', 'often', 'severely_lonely'] },
      socialSatisfaction: { type: Number, min: 1, max: 10 },
    },

    // Transportation Independence
    transportationIndependence: {
      currentMode: [
        {
          type: String,
          enum: [
            'private_car',
            'family_transport',
            'public_bus',
            'metro',
            'taxi',
            'ride_hailing',
            'specialized_transport',
            'walking',
            'wheelchair',
            'other',
          ],
        },
      ],
      drivingLicense: { has: Boolean, type: String, restrictions: [String] },
      publicTransportSkills: {
        type: String,
        enum: ['independent', 'with_training', 'with_assistance', 'unable'],
      },
      travelTraining: [
        {
          route: String,
          startDate: Date,
          masteredDate: Date,
          trainer: String,
          status: { type: String, enum: ['in_training', 'mastered', 'unable'] },
        },
      ],
      barriers: [String],
      needs: [String],
    },

    // Self-Advocacy
    selfAdvocacy: {
      level: { type: String, enum: ['self_directed', 'developing', 'emerging', 'supported'] },
      skills: [
        {
          skill: String,
          status: { type: String, enum: ['mastered', 'developing', 'needs_support'] },
        },
      ],
      goals: [String],
      achievements: [
        {
          description: String,
          date: Date,
          impact: String,
        },
      ],
    },

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

CommunityIntegrationSchema.index({ beneficiary: 1 });
CommunityIntegrationSchema.index({ 'communityActivities.status': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 6. نظام دعم مقدمي الرعاية والأسر — Caregiver & Family Support
// ═══════════════════════════════════════════════════════════════════════════════

const CaregiverSupportSchema = new Schema(
  {
    // Caregiver Info
    caregiver: { type: Schema.Types.ObjectId, ref: 'User' },
    caregiverName: { type: String, required: true },
    caregiverNameAr: String,
    relationship: {
      type: String,
      enum: [
        'mother',
        'father',
        'sibling',
        'spouse',
        'grandparent',
        'aunt_uncle',
        'professional',
        'other',
      ],
      required: true,
    },
    phone: String,
    email: String,
    age: Number,
    occupation: String,
    isMainCaregiver: { type: Boolean, default: true },

    // Beneficiary
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,

    // Caregiver Assessment
    caregiverAssessment: {
      date: Date,
      assessor: { type: Schema.Types.ObjectId, ref: 'User' },
      burdenScale: {
        // Zarit Burden Interview
        score: Number,
        level: { type: String, enum: ['no_burden', 'mild', 'moderate', 'severe'] },
      },
      physicalHealth: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      mentalHealth: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      stressLevel: { type: Number, min: 1, max: 10 },
      sleepQuality: { type: String, enum: ['good', 'fair', 'poor', 'very_poor'] },
      socialIsolation: { type: String, enum: ['none', 'mild', 'moderate', 'severe'] },
      financialStress: { type: String, enum: ['none', 'mild', 'moderate', 'severe'] },
      copingMechanisms: [String],
      supportNeeds: [String],
      strengths: [String],
    },

    // Training Programs
    trainingPrograms: [
      {
        name: String,
        nameAr: String,
        category: {
          type: String,
          enum: [
            'disability_understanding', // فهم الإعاقة
            'behavior_management', // إدارة السلوك
            'medical_care', // رعاية طبية
            'communication_techniques', // تقنيات التواصل
            'assistive_tech', // تقنيات مساعدة
            'first_aid', // الإسعافات الأولية
            'feeding_nutrition', // التغذية والإطعام
            'sensory_strategies', // استراتيجيات حسية
            'stress_management', // إدارة الإجهاد
            'self_care', // الرعاية الذاتية
            'legal_rights', // الحقوق القانونية
            'financial_planning', // التخطيط المالي
            'transition_planning', // تخطيط الانتقال
            'sibling_support', // دعم الأشقاء
            'other',
          ],
        },
        startDate: Date,
        completedDate: Date,
        status: { type: String, enum: ['enrolled', 'in_progress', 'completed', 'cancelled'] },
        provider: String,
        location: String,
        isOnline: Boolean,
        certificateIssued: Boolean,
        feedback: { rating: Number, comments: String },
      },
    ],

    // Respite Care
    respiteCare: [
      {
        type: {
          type: String,
          enum: [
            'in_home', // رعاية منزلية
            'center_based', // رعاية بمركز
            'overnight', // رعاية ليلية
            'weekend', // عطلة نهاية الأسبوع
            'emergency', // طوارئ
            'planned_holiday', // إجازة مخططة
            'after_school', // بعد المدرسة
            'summer_camp', // مخيم صيفي
          ],
        },
        startDate: Date,
        endDate: Date,
        duration: Number, // hours
        provider: String,
        providerContact: String,
        cost: Number,
        fundingSource: {
          type: String,
          enum: ['government', 'insurance', 'charity', 'self_pay', 'free'],
        },
        qualityRating: { type: Number, min: 1, max: 5 },
        beneficiarySatisfaction: { type: Number, min: 1, max: 5 },
        notes: String,
      },
    ],

    // Support Groups
    supportGroups: [
      {
        name: String,
        type: {
          type: String,
          enum: [
            'parent_group',
            'sibling_group',
            'spouse_group',
            'mixed',
            'online',
            'condition_specific',
          ],
        },
        facilitator: String,
        meetingSchedule: String,
        location: String,
        isActive: Boolean,
        joinDate: Date,
        benefitsNoted: [String],
      },
    ],

    // Counseling
    counseling: [
      {
        counselor: String,
        type: { type: String, enum: ['individual', 'couple', 'family', 'group', 'online'] },
        focus: String,
        startDate: Date,
        frequency: String,
        status: { type: String, enum: ['active', 'completed', 'on_hold', 'discontinued'] },
        sessionsCompleted: Number,
        progress: String,
      },
    ],

    // Financial Support
    financialSupport: {
      monthlyCareCost: Number,
      incomeImpact: {
        type: String,
        enum: ['no_impact', 'reduced_hours', 'left_job', 'changed_job'],
      },
      benefits: [
        {
          type: {
            type: String,
            enum: [
              'government_stipend',
              'disability_allowance',
              'tax_benefit',
              'charity_aid',
              'insurance',
              'other',
            ],
          },
          amount: Number,
          frequency: { type: String, enum: ['monthly', 'quarterly', 'annual', 'one_time'] },
          status: { type: String, enum: ['receiving', 'applied', 'denied', 'expired'] },
        },
      ],
      emergencyFund: Boolean,
      financialPlanningDone: Boolean,
    },

    // Sibling Support
    siblingSupport: [
      {
        siblingName: String,
        age: Number,
        supportNeeds: [String],
        programsEnrolled: [String],
        counselingProvided: Boolean,
        adjustmentLevel: {
          type: String,
          enum: ['well_adjusted', 'some_concerns', 'significant_concerns'],
        },
        notes: String,
      },
    ],

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

CaregiverSupportSchema.index({ beneficiary: 1 });
CaregiverSupportSchema.index({ caregiver: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 7. نظام الوصول الشامل والبيئة التكيفية — Accessibility & Adaptive Environment
// ═══════════════════════════════════════════════════════════════════════════════

const AccessibilityAuditSchema = new Schema(
  {
    // Facility Info
    facilityName: { type: String, required: true },
    facilityNameAr: String,
    facilityType: {
      type: String,
      enum: [
        'rehab_center', // مركز تأهيل
        'school', // مدرسة
        'hospital', // مستشفى
        'government_building', // مبنى حكومي
        'commercial', // تجاري
        'residential', // سكني
        'public_space', // مساحة عامة
        'mosque', // مسجد
        'park', // حديقة
        'transportation_hub', // محطة نقل
        'workplace', // مكان عمل
        'sports_facility', // منشأة رياضية
        'other',
      ],
      required: true,
    },
    address: { street: String, city: String, region: String, postalCode: String },
    contactPerson: { name: String, phone: String, email: String },

    // Audit Info
    auditDate: { type: Date, required: true },
    auditor: { type: Schema.Types.ObjectId, ref: 'User' },
    auditorName: String,
    auditType: {
      type: String,
      enum: ['initial', 'follow_up', 'complaint_based', 'routine', 'certification'],
      default: 'initial',
    },

    // Accessibility Domains
    physicalAccessibility: {
      entrances: {
        rampAvailable: Boolean,
        rampSlope: String,
        automaticDoors: Boolean,
        doorWidth: Number, // cm
        threshold: Boolean,
        signage: Boolean,
        score: { type: Number, min: 0, max: 100 },
      },
      corridors: {
        width: Number, // cm
        obstaclesFree: Boolean,
        handrails: Boolean,
        floorSurface: { type: String, enum: ['smooth', 'textured', 'carpeted', 'mixed'] },
        score: { type: Number, min: 0, max: 100 },
      },
      elevators: {
        available: Boolean,
        brailleButtons: Boolean,
        audioAnnouncement: Boolean,
        wheelchairAccessible: Boolean,
        emergencyPhone: Boolean,
        score: { type: Number, min: 0, max: 100 },
      },
      restrooms: {
        accessibleAvailable: Boolean,
        grabBars: Boolean,
        adequateSpace: Boolean,
        emergencyButton: Boolean,
        changingTable: Boolean,
        score: { type: Number, min: 0, max: 100 },
      },
      parking: {
        accessibleSpaces: Number,
        closeToEntrance: Boolean,
        properSignage: Boolean,
        adequateWidth: Boolean,
        score: { type: Number, min: 0, max: 100 },
      },
    },

    sensoryAccessibility: {
      visual: {
        brailleSignage: Boolean,
        tactileGuideways: Boolean,
        highContrastSignage: Boolean,
        largePrintAvailable: Boolean,
        audioDescriptions: Boolean,
        guideDogFriendly: Boolean,
        score: { type: Number, min: 0, max: 100 },
      },
      hearing: {
        hearingLoopSystem: Boolean,
        visualAlarms: Boolean,
        signLanguageService: Boolean,
        captioning: Boolean,
        quietRooms: Boolean,
        score: { type: Number, min: 0, max: 100 },
      },
    },

    digitalAccessibility: {
      websiteWCAG: { level: { type: String, enum: ['none', 'A', 'AA', 'AAA'] }, tested: Boolean },
      mobileApp: { accessible: Boolean, screenReaderCompatible: Boolean },
      documents: { accessible: Boolean, alternateFormats: Boolean },
      kiosk: { accessible: Boolean, screenReader: Boolean, heightAdjustable: Boolean },
      score: { type: Number, min: 0, max: 100 },
    },

    serviceAccessibility: {
      staffTraining: { completed: Boolean, lastTrainingDate: Date },
      communicationAids: Boolean,
      priorityService: Boolean,
      homeServiceAvailable: Boolean,
      onlineServiceAvailable: Boolean,
      signLanguageInterpreter: Boolean,
      assistedTechnology: Boolean,
      score: { type: Number, min: 0, max: 100 },
    },

    // Overall Scoring
    overallScore: { type: Number, min: 0, max: 100 },
    grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },
    complianceLevel: {
      type: String,
      enum: ['fully_compliant', 'mostly_compliant', 'partially_compliant', 'non_compliant'],
    },

    // Findings & Recommendations
    findings: [
      {
        domain: String,
        issue: String,
        severity: { type: String, enum: ['critical', 'major', 'minor', 'observation'] },
        photo: String,
        recommendation: String,
        estimatedCost: Number,
        deadline: Date,
        status: { type: String, enum: ['open', 'in_progress', 'resolved', 'deferred'] },
      },
    ],

    // Certification
    certification: {
      eligible: Boolean,
      certificationLevel: { type: String, enum: ['gold', 'silver', 'bronze', 'none'] },
      issuedDate: Date,
      expiryDate: Date,
      certificateNumber: String,
    },

    documents: [
      {
        name: String,
        type: { type: String },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

AccessibilityAuditSchema.index({ facilityType: 1, overallScore: 1 });
AccessibilityAuditSchema.index({ 'certification.expiryDate': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 8. نظام الكشف والتدخل المبكر المتقدم — Advanced Early Detection & Screening
// ═══════════════════════════════════════════════════════════════════════════════

const EarlyDetectionSchema = new Schema(
  {
    // Child Info
    child: {
      name: String,
      nameAr: String,
      dateOfBirth: Date,
      gender: { type: String, enum: ['male', 'female'] },
      nationalId: String,
      parent: { type: Schema.Types.ObjectId, ref: 'User' },
      parentName: String,
      parentPhone: String,
      parentEmail: String,
      city: String,
      region: String,
    },

    // Referral Source
    referral: {
      source: {
        type: String,
        enum: [
          'pediatrician',
          'parent',
          'school',
          'nursery',
          'self_referral',
          'government_screening',
          'hospital',
          'other',
        ],
      },
      referredBy: String,
      referralDate: Date,
      referralReason: String,
      urgency: { type: String, enum: ['routine', 'priority', 'urgent'], default: 'routine' },
    },

    // Developmental Screening
    developmentalScreening: [
      {
        tool: {
          type: String,
          enum: [
            'ASQ_3', // Ages and Stages Questionnaire
            'ASQ_SE', // ASQ Social-Emotional
            'M_CHAT_R', // Modified Checklist for Autism
            'PEDS', // Parents Evaluation of Dev Status
            'DENVER_II', // Denver Developmental Screening
            'BAYLEY_III', // Bayley Scales
            'BRIGANCE', // Brigance Screens
            'CDC_MILESTONES', // CDC Learn the Signs
            'CARS_2', // Childhood Autism Rating Scale
            'ADOS_2', // Autism Diagnostic Observation Schedule
            'VINELAND_3', // Vineland Adaptive Behavior
            'CUSTOM_ARABIC', // مقياس عربي مخصص
            'other',
          ],
        },
        administeredDate: Date,
        administeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
        ageAtScreening: { months: Number },
        domains: [
          {
            domain: {
              type: String,
              enum: [
                'communication',
                'gross_motor',
                'fine_motor',
                'problem_solving',
                'personal_social',
                'adaptive',
                'cognitive',
                'language_receptive',
                'language_expressive',
                'social_emotional',
                'sensory',
              ],
            },
            rawScore: Number,
            standardScore: Number,
            percentile: Number,
            ageEquivalent: String,
            result: {
              type: String,
              enum: ['typical', 'monitoring', 'at_risk', 'delayed', 'advanced'],
            },
          },
        ],
        overallResult: {
          type: String,
          enum: ['typical', 'monitoring', 'at_risk', 'referral_needed'],
        },
        recommendations: [String],
        nextScreeningDate: Date,
        notes: String,
      },
    ],

    // Risk Factors
    riskFactors: {
      prenatal: [
        {
          factor: String,
          details: String,
          severity: { type: String, enum: ['high', 'moderate', 'low'] },
        },
      ],
      perinatal: [
        {
          factor: String,
          details: String,
        },
      ],
      postnatal: [
        {
          factor: String,
          details: String,
        },
      ],
      familyHistory: [
        {
          condition: String,
          relationship: String,
          details: String,
        },
      ],
      environmentalRisks: [
        {
          factor: String,
          details: String,
        },
      ],
      overallRiskLevel: { type: String, enum: ['high', 'moderate', 'low', 'minimal'] },
    },

    // Developmental Milestones
    milestones: [
      {
        milestone: String,
        category: { type: String, enum: ['motor', 'language', 'cognitive', 'social', 'self_help'] },
        expectedAge: Number, // months
        achievedAge: Number, // months
        status: {
          type: String,
          enum: ['achieved', 'delayed', 'not_achieved', 'emerging', 'regressed'],
        },
        notes: String,
        dateRecorded: Date,
      },
    ],

    // Diagnostic Evaluation
    diagnosticEvaluation: {
      recommendedEvaluations: [
        {
          type: {
            type: String,
            enum: [
              'developmental_pediatrician',
              'neurologist',
              'audiologist',
              'ophthalmologist',
              'geneticist',
              'psychologist',
              'speech_pathologist',
              'occupational_therapist',
              'physical_therapist',
            ],
          },
          status: { type: String, enum: ['recommended', 'scheduled', 'completed', 'declined'] },
          scheduledDate: Date,
          completedDate: Date,
          findings: String,
          provider: String,
        },
      ],
      diagnosis: [
        {
          condition: String,
          icdCode: String,
          diagnosedDate: Date,
          diagnosedBy: String,
          severity: { type: String, enum: ['mild', 'moderate', 'severe', 'profound'] },
          confidence: { type: String, enum: ['confirmed', 'provisional', 'suspected'] },
        },
      ],
      overallNeeds: {
        type: String,
        enum: ['no_services', 'monitoring', 'early_intervention', 'intensive_intervention'],
      },
    },

    // Early Intervention Plan
    earlyInterventionPlan: {
      startDate: Date,
      reviewDate: Date,
      coordinator: { type: Schema.Types.ObjectId, ref: 'User' },
      familyGoals: [
        {
          goal: String,
          priority: { type: String, enum: ['high', 'medium', 'low'] },
          strategies: [String],
          progress: {
            type: String,
            enum: ['met', 'progressing', 'no_change', 'regressed', 'not_started'],
          },
          targetDate: Date,
          notes: String,
        },
      ],
      services: [
        {
          serviceType: {
            type: String,
            enum: [
              'speech_therapy',
              'occupational_therapy',
              'physical_therapy',
              'developmental_therapy',
              'behavioral_therapy',
              'family_education',
              'home_visiting',
              'nutrition',
              'social_work',
              'psychology',
              'audiology',
              'vision',
            ],
          },
          frequency: String,
          duration: String,
          provider: String,
          setting: { type: String, enum: ['home', 'center', 'community', 'telehealth'] },
          startDate: Date,
          status: { type: String, enum: ['active', 'completed', 'on_hold', 'discontinued'] },
        },
      ],
      transitionPlan: {
        transitionAge: Number,
        toService: String,
        planDate: Date,
        steps: [String],
        status: { type: String, enum: ['not_started', 'in_progress', 'completed'] },
      },
    },

    // Status
    status: {
      type: String,
      enum: [
        'screening',
        'evaluation',
        'intervention',
        'monitoring',
        'graduated',
        'closed',
        'referred',
      ],
      default: 'screening',
    },

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

EarlyDetectionSchema.index({ 'child.parent': 1 });
EarlyDetectionSchema.index({ status: 1 });
EarlyDetectionSchema.index({ 'child.dateOfBirth': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 9. نظام قياس النتائج والأثر — Outcome & Impact Measurement
// ═══════════════════════════════════════════════════════════════════════════════

const OutcomeMeasurementSchema = new Schema(
  {
    // Program Reference
    program: { type: Schema.Types.ObjectId, ref: 'DisabilityRehabilitation' },
    programName: String,
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,

    // Measurement Period
    period: {
      startDate: { type: Date, required: true },
      endDate: Date,
      type: {
        type: String,
        enum: ['baseline', 'quarterly', 'semi_annual', 'annual', 'discharge', 'follow_up'],
      },
    },

    // Quality of Life (WHO QoL)
    qualityOfLife: {
      physicalHealth: {
        score: Number,
        items: [{ question: String, score: { type: Number, min: 1, max: 5 } }],
      },
      psychological: {
        score: Number,
        items: [{ question: String, score: { type: Number, min: 1, max: 5 } }],
      },
      socialRelationships: {
        score: Number,
        items: [{ question: String, score: { type: Number, min: 1, max: 5 } }],
      },
      environment: {
        score: Number,
        items: [{ question: String, score: { type: Number, min: 1, max: 5 } }],
      },
      overallQoL: Number,
      overallHealth: Number,
    },

    // Functional Independence (FIM)
    functionalIndependence: {
      selfCare: {
        eating: Number,
        grooming: Number,
        bathing: Number,
        dressing: Number,
        toileting: Number,
      },
      mobility: { transfer: Number, locomotion: Number, stairs: Number },
      communication: { comprehension: Number, expression: Number },
      socialCognition: { interaction: Number, problemSolving: Number, memory: Number },
      totalScore: Number,
      motorSubtotal: Number,
      cognitiveSubtotal: Number,
      level: {
        type: String,
        enum: [
          'complete_independence',
          'modified_independence',
          'supervision',
          'minimal_assist',
          'moderate_assist',
          'maximal_assist',
          'total_assist',
        ],
      },
    },

    // Goal Attainment Scaling (GAS)
    goalAttainment: [
      {
        goal: String,
        goalAr: String,
        weight: { type: Number, default: 1 },
        baseline: String,
        levels: {
          much_less_than_expected: String, // -2
          less_than_expected: String, // -1
          expected_level: String, // 0
          more_than_expected: String, // +1
          much_more_than_expected: String, // +2
        },
        achievedLevel: { type: Number, min: -2, max: 2, default: 0 },
        notes: String,
      },
    ],
    gasScore: Number,

    // Participation (CHART/CIQ)
    participation: {
      homeIntegration: { score: Number, activities: [String] },
      socialIntegration: { score: Number, activities: [String] },
      productiveActivity: { score: Number, activities: [String] },
      mobilityLevel: { score: Number, description: String },
      totalScore: Number,
    },

    // Satisfaction
    satisfaction: {
      overallSatisfaction: { type: Number, min: 1, max: 10 },
      staffQuality: { type: Number, min: 1, max: 10 },
      facilitiesQuality: { type: Number, min: 1, max: 10 },
      progressSatisfaction: { type: Number, min: 1, max: 10 },
      communicationQuality: { type: Number, min: 1, max: 10 },
      accessibilityRating: { type: Number, min: 1, max: 10 },
      wouldRecommend: Boolean,
      openFeedback: String,
      improvementSuggestions: [String],
    },

    // Cost-Effectiveness
    costEffectiveness: {
      totalServiceCost: Number,
      costPerSession: Number,
      costPerOutcomePoint: Number,
      savingsGenerated: Number,
      returnOnInvestment: Number,
      comparedToBenchmark: { type: String, enum: ['above', 'at', 'below'] },
      currency: { type: String, default: 'SAR' },
    },

    // Benchmarking
    benchmarking: {
      nationalAverage: Number,
      regionalAverage: Number,
      organizationAverage: Number,
      percentileRank: Number,
      improvementRate: Number,
      comparisonPeriod: String,
    },

    // Impact Indicators
    impactIndicators: {
      hospitalizations: { before: Number, after: Number },
      emergencyVisits: { before: Number, after: Number },
      medicationChanges: { before: Number, after: Number },
      employmentStatus: { before: String, after: String },
      educationLevel: { before: String, after: String },
      independenceLevel: { before: String, after: String },
      caregiverBurden: { before: Number, after: Number },
      socialParticipation: { before: Number, after: Number },
    },

    // Clinical Outcomes
    clinicalOutcomes: [
      {
        measure: String,
        baselineValue: Number,
        currentValue: Number,
        targetValue: Number,
        unit: String,
        changePercentage: Number,
        clinicallySignificant: Boolean,
        notes: String,
      },
    ],

    // Summary
    overallProgress: {
      type: String,
      enum: [
        'significant_improvement',
        'moderate_improvement',
        'minimal_improvement',
        'no_change',
        'decline',
      ],
    },
    recommendedActions: [String],
    assessor: { type: Schema.Types.ObjectId, ref: 'User' },

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

OutcomeMeasurementSchema.index({ beneficiary: 1, 'period.startDate': -1 });
OutcomeMeasurementSchema.index({ program: 1, 'period.type': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 10. نظام الإسكان التكيفي وتعديل المنازل — Adaptive Housing & Home Modification
// ═══════════════════════════════════════════════════════════════════════════════

const AdaptiveHousingSchema = new Schema(
  {
    // Beneficiary
    beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryName: String,
    disabilityType: String,
    mobilityAids: [String],

    // Current Housing
    currentHousing: {
      type: {
        type: String,
        enum: [
          'apartment',
          'villa',
          'traditional_house',
          'duplex',
          'studio',
          'shared',
          'facility',
          'other',
        ],
      },
      ownership: {
        type: String,
        enum: ['owned', 'rented', 'family_owned', 'government_provided', 'charity_provided'],
      },
      floors: Number,
      bedrooms: Number,
      bathrooms: Number,
      area: Number, // sqm
      address: { street: String, city: String, region: String, postalCode: String },
      landlordConsent: Boolean, // for modifications
      structuralCondition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
    },

    // Home Assessment
    homeAssessment: {
      date: Date,
      assessor: { type: Schema.Types.ObjectId, ref: 'User' },
      assessorName: String,
      areas: [
        {
          area: {
            type: String,
            enum: [
              'entrance', // مدخل المنزل
              'living_room', // غرفة المعيشة
              'bedroom', // غرفة النوم
              'bathroom', // الحمام
              'kitchen', // المطبخ
              'hallways', // الممرات
              'stairs', // الدرج
              'outdoor', // المساحة الخارجية
              'garage', // المرآب
              'laundry', // الغسيل
              'dining', // غرفة الطعام
              'other',
            ],
          },
          currentAccessibility: { type: Number, min: 0, max: 100 },
          barriers: [String],
          risks: [String],
          recommendations: [String],
          photos: [String],
          priority: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
        },
      ],
      overallAccessibilityScore: { type: Number, min: 0, max: 100 },
      safetyRating: { type: String, enum: ['safe', 'mostly_safe', 'some_risks', 'unsafe'] },
      fallRiskAssessment: { type: String, enum: ['low', 'moderate', 'high'] },
    },

    // Recommended Modifications
    modifications: [
      {
        category: {
          type: String,
          enum: [
            'ramp_installation', // تركيب منحدر
            'door_widening', // توسيع الأبواب
            'grab_bars', // مقابض إمساك
            'roll_in_shower', // دش بدون عتبة
            'stair_lift', // مصعد درج
            'home_elevator', // مصعد منزلي
            'kitchen_modification', // تعديل المطبخ
            'bathroom_modification', // تعديل الحمام
            'floor_leveling', // تسوية الأرضيات
            'lighting_improvement', // تحسين الإضاءة
            'smart_home_tech', // تقنيات المنزل الذكي
            'voice_control_system', // نظام التحكم الصوتي
            'automatic_doors', // أبواب تلقائية
            'adjustable_counters', // أسطح قابلة للتعديل
            'threshold_removal', // إزالة العتبات
            'non_slip_flooring', // أرضيات مانعة للانزلاق
            'visual_aids', // مساعدات بصرية
            'auditory_aids', // مساعدات سمعية
            'emergency_alert_system', // نظام إنذار طوارئ
            'bedroom_modification', // تعديل غرفة النوم
            'other',
          ],
        },
        description: String,
        descriptionAr: String,
        specifications: String,
        estimatedCost: Number,
        actualCost: Number,
        currency: { type: String, default: 'SAR' },
        priority: { type: String, enum: ['emergency', 'high', 'medium', 'low'] },
        status: {
          type: String,
          enum: [
            'recommended',
            'approved',
            'quoted',
            'funded',
            'scheduled',
            'in_progress',
            'completed',
            'inspected',
            'rejected',
            'deferred',
          ],
          default: 'recommended',
        },
        contractor: {
          name: String,
          phone: String,
          license: String,
          quote: Number,
          startDate: Date,
          completionDate: Date,
        },
        inspection: {
          date: Date,
          inspector: String,
          passed: Boolean,
          findings: String,
        },
        beforePhotos: [String],
        afterPhotos: [String],
        beneficiaryFeedback: { satisfaction: { type: Number, min: 1, max: 5 }, comments: String },
        warrantyPeriod: Number, // months
      },
    ],

    // Smart Home Integration
    smartHome: {
      enabled: Boolean,
      features: [
        {
          feature: {
            type: String,
            enum: [
              'voice_assistant', // مساعد صوتي
              'automated_lighting', // إضاءة تلقائية
              'automated_curtains', // ستائر تلقائية
              'smart_locks', // أقفال ذكية
              'smart_thermostat', // ثرموستات ذكي
              'video_doorbell', // جرس فيديو
              'fall_detection', // كشف السقوط
              'medication_reminder', // تذكير بالأدوية
              'remote_monitoring', // مراقبة عن بعد
              'emergency_button', // زر طوارئ
              'automated_appliances', // أجهزة تلقائية
              'environment_sensors', // مستشعرات بيئية
              'gps_tracking', // تتبع GPS
              'other',
            ],
          },
          installed: Boolean,
          installDate: Date,
          provider: String,
          cost: Number,
          status: {
            type: String,
            enum: ['planned', 'installed', 'active', 'maintenance_needed', 'replaced'],
          },
          notes: String,
        },
      ],
      hub: { brand: String, model: String, connectivity: String },
      monthlyServiceCost: Number,
    },

    // Funding
    funding: {
      totalEstimate: Number,
      sources: [
        {
          source: {
            type: String,
            enum: [
              'government_program',
              'ministry_housing',
              'charity',
              'insurance',
              'self_funded',
              'ngo',
              'municipal',
              'donation',
              'other',
            ],
          },
          organization: String,
          amount: Number,
          applicationDate: Date,
          status: {
            type: String,
            enum: ['applied', 'approved', 'partially_approved', 'disbursed', 'rejected', 'pending'],
          },
          applicationRef: String,
          notes: String,
        },
      ],
      totalFunded: Number,
      gap: Number,
      currency: { type: String, default: 'SAR' },
    },

    // Documents
    documents: [
      {
        name: String,
        type: {
          type: String,
          enum: [
            'assessment_report',
            'quote',
            'invoice',
            'photo',
            'approval',
            'contract',
            'inspection',
            'other',
          ],
        },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Overall Status
    status: {
      type: String,
      enum: [
        'assessment_pending',
        'assessed',
        'planning',
        'funding_applied',
        'funded',
        'in_progress',
        'completed',
        'follow_up',
        'closed',
      ],
      default: 'assessment_pending',
    },

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

AdaptiveHousingSchema.index({ beneficiary: 1, status: 1 });
AdaptiveHousingSchema.index({ 'modifications.status': 1, 'modifications.priority': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// Export All Models
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  AssistiveDevice: mongoose.model('AssistiveDevice', AssistiveDeviceSchema),
  VocationalRehab: mongoose.model('VocationalRehab', VocationalRehabSchema),
  DisabilityRights: mongoose.model('DisabilityRights', DisabilityRightsSchema),
  IntegrativeHealthcare: mongoose.model('IntegrativeHealthcare', IntegrativeHealthcareSchema),
  CommunityIntegration: mongoose.model('CommunityIntegration', CommunityIntegrationSchema),
  CaregiverSupport: mongoose.model('CaregiverSupport', CaregiverSupportSchema),
  AccessibilityAudit: mongoose.model('AccessibilityAudit', AccessibilityAuditSchema),
  EarlyDetection: mongoose.model('EarlyDetection', EarlyDetectionSchema),
  OutcomeMeasurement: mongoose.model('OutcomeMeasurement', OutcomeMeasurementSchema),
  AdaptiveHousing: mongoose.model('AdaptiveHousing', AdaptiveHousingSchema),
};

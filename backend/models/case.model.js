/**
 * Case Management Model
 * نموذج إدارة الحالات لمراكز تأهيل ذوي الإعاقة
 *
 * @description نموذج شامل لإدارة حالات المستفيدين مع جميع البيانات الطبية والاجتماعية
 * @version 1.0.0
 * @date 2026-01-30
 */

const mongoose = require('mongoose');

// تعريف Schema الفرعي للتاريخ الطبي
const medicalHistorySchema = new mongoose.Schema(
  {
    condition: {
      type: String,
      required: true,
      trim: true,
    },
    diagnosisDate: {
      type: Date,
      required: true,
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'moderate',
    },
    currentStatus: {
      type: String,
      enum: ['active', 'resolved', 'under_treatment', 'chronic'],
      default: 'active',
    },
    notes: String,
    attachments: [
      {
        filename: String,
        url: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { _id: false }
);

// تعريف Schema الفرعي للأدوية
const medicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      required: true,
    },
    frequency: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: Date,
    prescribedBy: String,
    sideEffects: [String],
    active: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

// تعريف Schema الفرعي لفريق العمل
const teamMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: [
        'case_manager',
        'physical_therapist',
        'occupational_therapist',
        'speech_therapist',
        'psychologist',
        'social_worker',
        'special_educator',
        'nurse',
        'physician',
        'consultant',
      ],
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    responsibilities: [String],
    notes: String,
  },
  { _id: false }
);

// تعريف Schema الفرعي للخطة التربوية الفردية (IEP)
const iepSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      default: 1,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    goals: [
      {
        domain: {
          type: String,
          required: true,
          enum: [
            'cognitive',
            'physical',
            'communication',
            'social_emotional',
            'adaptive_behavior',
            'academic',
          ],
        },
        description: {
          type: String,
          required: true,
        },
        measurableCriteria: {
          type: String,
          required: true,
        },
        targetDate: Date,
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'achieved', 'modified', 'discontinued'],
          default: 'not_started',
        },
        progress: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        notes: String,
      },
    ],
    accommodations: [String],
    modifications: [String],
    services: [
      {
        type: {
          type: String,
          required: true,
        },
        frequency: String,
        duration: String,
        provider: String,
      },
    ],
    reviewDate: Date,
    reviewNotes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: Date,
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'active', 'completed', 'archived'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

// تعريف Schema الفرعي لملاحظات الفريق
const teamNoteSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'general',
        'medical',
        'behavioral',
        'progress',
        'incident',
        'communication',
        'family_contact',
      ],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    attachments: [
      {
        filename: String,
        url: String,
        type: String,
      },
    ],
  },
  { timestamps: true }
);

// تعريف Schema الفرعي للتقييمات السريعة
const quickAssessmentSchema = new mongoose.Schema(
  {
    assessmentType: {
      type: String,
      required: true,
    },
    score: Number,
    maxScore: Number,
    percentage: Number,
    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: String,
  },
  { _id: false }
);

// تعريف Schema الرئيسي للحالة
const caseSchema = new mongoose.Schema(
  {
    // معلومات أساسية
    caseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },

    // معلومات الإعاقة
    disabilityInfo: {
      primaryDisability: {
        type: String,
        required: true,
        enum: [
          'physical', // إعاقة حركية
          'intellectual', // إعاقة ذهنية
          'sensory_visual', // إعاقة بصرية
          'sensory_hearing', // إعاقة سمعية
          'speech_language', // إعاقة النطق واللغة
          'autism_spectrum', // اضطراب طيف التوحد
          'learning_disability', // صعوبات التعلم
          'behavioral', // اضطرابات سلوكية
          'multiple', // إعاقات متعددة
          'other',
        ],
      },
      secondaryDisabilities: [
        {
          type: String,
          enum: [
            'physical',
            'intellectual',
            'sensory_visual',
            'sensory_hearing',
            'speech_language',
            'autism_spectrum',
            'learning_disability',
            'behavioral',
            'other',
          ],
        },
      ],
      severity: {
        type: String,
        required: true,
        enum: ['mild', 'moderate', 'severe', 'profound'],
        default: 'moderate',
      },
      diagnosisDate: Date,
      diagnosedBy: String,
      icdCode: String, // International Classification of Diseases
      description: String,
      functionalLimitations: [String],
      assistiveDevices: [String],
    },

    // حالة القبول
    admissionInfo: {
      status: {
        type: String,
        required: true,
        enum: [
          'pending_review', // قيد المراجعة
          'under_assessment', // تحت التقييم
          'approved', // مقبول
          'rejected', // مرفوض
          'waitlist', // قائمة انتظار
          'active', // نشط
          'on_hold', // معلق
          'completed', // مكتمل
          'transferred', // منقول
          'discontinued', // متوقف
        ],
        default: 'pending_review',
        index: true,
      },
      applicationDate: {
        type: Date,
        default: Date.now,
      },
      reviewDate: Date,
      admissionDate: Date,
      expectedCompletionDate: Date,
      actualCompletionDate: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      rejectionReason: String,
      waitlistPosition: Number,
      priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent', 'critical'],
        default: 'normal',
        index: true,
      },
    },

    // التاريخ الطبي
    medicalHistory: [medicalHistorySchema],

    // الأدوية الحالية
    currentMedications: [medicationSchema],

    // الحساسية
    allergies: [
      {
        allergen: {
          type: String,
          required: true,
        },
        reaction: String,
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe', 'life_threatening'],
          default: 'moderate',
        },
      },
    ],

    // معلومات الطوارئ
    emergencyInfo: {
      emergencyProtocol: String,
      medicalAlerts: [String],
      specialInstructions: String,
      hospitalPreference: String,
    },

    // فريق العمل المعين
    assignedTeam: [teamMemberSchema],

    // الخطة التربوية الفردية (IEP)
    currentIEP: iepSchema,
    previousIEPs: [iepSchema],

    // الأهداف قصيرة المدى
    shortTermGoals: [
      {
        description: String,
        targetDate: Date,
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'achieved', 'not_achieved'],
          default: 'not_started',
        },
        progress: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
      },
    ],

    // ملاحظات الفريق
    teamNotes: [teamNoteSchema],

    // التقييمات السريعة
    quickAssessments: [quickAssessmentSchema],

    // الجلسات
    sessionsSummary: {
      totalScheduled: {
        type: Number,
        default: 0,
      },
      totalAttended: {
        type: Number,
        default: 0,
      },
      totalMissed: {
        type: Number,
        default: 0,
      },
      totalCanceled: {
        type: Number,
        default: 0,
      },
      attendanceRate: {
        type: Number,
        default: 0,
      },
      lastSessionDate: Date,
      nextSessionDate: Date,
    },

    // معلومات التواصل مع الأسرة
    familyCommunication: {
      preferredMethod: {
        type: String,
        enum: ['phone', 'email', 'sms', 'whatsapp', 'in_person'],
        default: 'phone',
      },
      preferredLanguage: {
        type: String,
        default: 'ar',
      },
      bestTimeToContact: String,
      lastContactDate: Date,
      lastContactNotes: String,
      communicationFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'as_needed'],
        default: 'weekly',
      },
    },

    // معلومات مالية
    financialInfo: {
      fundingSource: {
        type: String,
        enum: ['government', 'insurance', 'private', 'charity', 'mixed'],
        default: 'private',
      },
      insuranceProvider: String,
      insurancePolicyNumber: String,
      copayAmount: Number,
      hasFinancialAssistance: {
        type: Boolean,
        default: false,
      },
      assistanceDetails: String,
    },

    // المرفقات والوثائق
    documents: [
      {
        title: {
          type: String,
          required: true,
        },
        category: {
          type: String,
          enum: [
            'medical_report',
            'assessment',
            'diagnosis',
            'consent_form',
            'insurance',
            'identification',
            'court_order',
            'other',
          ],
          required: true,
        },
        filename: String,
        url: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        expiryDate: Date,
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // العلامات والتصنيفات
    tags: [String],

    // الإحصائيات والمؤشرات
    statistics: {
      overallProgress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low',
      },
      engagementScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 50,
      },
      satisfactionScore: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      lastUpdated: Date,
    },

    // الحالة النشطة
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // الأرشفة
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedDate: Date,
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    archivedReason: String,

    // معلومات النظام
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true, // يضيف createdAt و updatedAt تلقائياً
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes (single field indexes are defined with index: true in schema)
caseSchema.index({ isActive: 1, 'admissionInfo.status': 1 });
caseSchema.index({ beneficiaryId: 1, isActive: 1 });

// Virtual للحصول على عمر الحالة بالأيام
caseSchema.virtual('ageInDays').get(function () {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual للحصول على مدة العلاج
caseSchema.virtual('treatmentDuration').get(function () {
  if (!this.admissionInfo.admissionDate) return 0;
  const endDate = this.admissionInfo.actualCompletionDate || new Date();
  const diffTime = Math.abs(endDate - this.admissionInfo.admissionDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual للحصول على عدد أعضاء الفريق النشطين
caseSchema.virtual('activeTeamMembersCount').get(function () {
  return this.assignedTeam ? this.assignedTeam.length : 0;
});

// Pre-save middleware لتوليد رقم الحالة تلقائياً
caseSchema.pre('save', async function () {
  if (this.isNew && !this.caseNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.caseNumber = `CASE-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  // تحديث معدل الحضور
  if (this.sessionsSummary && this.sessionsSummary.totalScheduled > 0) {
    this.sessionsSummary.attendanceRate = Math.round(
      (this.sessionsSummary.totalAttended / this.sessionsSummary.totalScheduled) * 100
    );
  }

  // تحديث آخر تاريخ تعديل للإحصائيات
  if (this.isModified('statistics')) {
    this.statistics.lastUpdated = new Date();
  }

  next();
});

// Static method للبحث المتقدم
caseSchema.statics.advancedSearch = function (filters) {
  const query = {};

  if (filters.status) {
    query['admissionInfo.status'] = filters.status;
  }

  if (filters.priority) {
    query['admissionInfo.priority'] = filters.priority;
  }

  if (filters.disabilityType) {
    query['disabilityInfo.primaryDisability'] = filters.disabilityType;
  }

  if (filters.severity) {
    query['disabilityInfo.severity'] = filters.severity;
  }

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  if (filters.isArchived !== undefined) {
    query.isArchived = filters.isArchived;
  }

  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  if (filters.riskLevel) {
    query['statistics.riskLevel'] = filters.riskLevel;
  }

  if (filters.teamMember) {
    query['assignedTeam.userId'] = filters.teamMember;
  }

  return this.find(query)
    .populate('beneficiaryId', 'firstName lastName dateOfBirth gender')
    .populate('assignedTeam.userId', 'firstName lastName email role')
    .populate('createdBy', 'firstName lastName')
    .sort(filters.sort || { createdAt: -1 })
    .limit(filters.limit || 50);
};

// Instance method للحصول على ملخص الحالة
caseSchema.methods.getSummary = function () {
  return {
    caseNumber: this.caseNumber,
    beneficiaryId: this.beneficiaryId,
    status: this.admissionInfo.status,
    priority: this.admissionInfo.priority,
    primaryDisability: this.disabilityInfo.primaryDisability,
    severity: this.disabilityInfo.severity,
    teamSize: this.assignedTeam.length,
    progress: this.statistics.overallProgress,
    riskLevel: this.statistics.riskLevel,
    ageInDays: this.ageInDays,
    isActive: this.isActive,
  };
};

// Instance method لإضافة ملاحظة
caseSchema.methods.addNote = function (noteData) {
  this.teamNotes.push(noteData);
  return this.save();
};

// Instance method لتحديث الحالة
caseSchema.methods.updateStatus = function (newStatus, userId) {
  this.admissionInfo.status = newStatus;
  this.lastModifiedBy = userId;

  if (newStatus === 'active' && !this.admissionInfo.admissionDate) {
    this.admissionInfo.admissionDate = new Date();
  }

  if (newStatus === 'completed' && !this.admissionInfo.actualCompletionDate) {
    this.admissionInfo.actualCompletionDate = new Date();
  }

  return this.save();
};

// Instance method لتعيين عضو فريق
caseSchema.methods.assignTeamMember = function (memberData) {
  // إزالة أي عضو سابق بنفس الدور إذا كان primary
  if (memberData.isPrimary) {
    this.assignedTeam = this.assignedTeam.filter(
      member => member.role !== memberData.role || !member.isPrimary
    );
  }

  this.assignedTeam.push(memberData);
  return this.save();
};

// Instance method لإزالة عضو فريق
caseSchema.methods.removeTeamMember = function (userId) {
  this.assignedTeam = this.assignedTeam.filter(
    member => member.userId.toString() !== userId.toString()
  );
  return this.save();
};

// Instance method لأرشفة الحالة
caseSchema.methods.archive = function (userId, reason) {
  this.isArchived = true;
  this.archivedDate = new Date();
  this.archivedBy = userId;
  this.archivedReason = reason;
  this.isActive = false;
  return this.save();
};

// Instance method لاستعادة من الأرشيف
caseSchema.methods.unarchive = function () {
  this.isArchived = false;
  this.archivedDate = null;
  this.archivedBy = null;
  this.archivedReason = null;
  this.isActive = true;
  return this.save();
};

const Case = mongoose.model('Case', caseSchema);

module.exports = Case;

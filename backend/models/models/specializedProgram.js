/**
 * نموذج البرامج المتخصصة - Specialized Programs Model
 * يدير البرامج المختلفة حسب نوع الإعاقة والخدمات المقدمة
 */

const mongoose = require('mongoose');

// أنواع الإعاقات المدعومة
const DISABILITY_TYPES = {
  MOTOR: 'إعاقة حركية',
  VISUAL: 'إعاقة بصرية',
  HEARING: 'إعاقة سمعية',
  INTELLECTUAL: 'إعاقة ذهنية',
  DEVELOPMENTAL: 'اضطراب تطوري',
  COMMUNICATION: 'اضطراب التواصل',
  MULTIPLE: 'إعاقات متعددة',
};

// مستويات شدة الإعاقة
const SEVERITY_LEVELS = {
  MILD: 'خفيفة',
  MODERATE: 'متوسطة',
  SEVERE: 'شديدة',
  PROFOUND: 'عميقة',
};

const specializedProgramSchema = new mongoose.Schema(
  {
    // المعلومات الأساسية
    name: {
      type: String,
      required: true,
      trim: true,
      example: 'برنامج العلاج الطبيعي للإعاقة الحركية',
    },

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      example: 'PROG-MOTOR-001',
    },

    description: String,

    // تصنيف الإعاقة
    disabilityType: {
      type: String,
      enum: Object.values(DISABILITY_TYPES),
      required: true,
    },

    // مستويات الشدة المدعومة
    supportedSeverityLevels: [
      {
        type: String,
        enum: Object.values(SEVERITY_LEVELS),
      },
    ],

    // الفئة العمرية
    ageGroup: {
      min: Number,
      max: Number,
    },

    // معلومات الجلسات
    sessionConfig: {
      standardDuration: {
        type: Number,
        default: 60, // بالدقائق
        description: 'مدة الجلسة القياسية',
      },

      minDuration: {
        type: Number,
        default: 30,
      },

      maxDuration: {
        type: Number,
        default: 120,
      },

      frequencyPerWeek: {
        type: Number,
        default: 2,
        description: 'عدد الجلسات الأسبوعية الموصى به',
      },

      maxConcurrentParticipants: {
        type: Number,
        default: 1,
      },

      isGroupSession: {
        type: Boolean,
        default: false,
      },
    },

    // الأهداف العامة للبرنامج
    programGoals: [
      {
        goalId: mongoose.Schema.Types.ObjectId,
        title: String,
        description: String,
        category: {
          type: String,
          enum: ['physical', 'cognitive', 'behavioral', 'communication', 'social'],
        },
        measurable: Boolean,
        timeline: Number, // بالأسابيع
      },
    ],

    // الأنشطة والتمارين المرتبطة بالبرنامج
    activities: [
      {
        activityId: mongoose.Schema.Types.ObjectId,
        name: String,
        description: String,
        difficulty: {
          type: String,
          enum: ['easy', 'medium', 'hard'],
        },
        targetAreas: [String],
        equipment: [String],
        instructions: String,
        estimatedDuration: Number, // بالدقائق
        variations: [String], // اختلافات التمرين
      },
    ],

    // المعدات والأدوات المطلوبة
    requiredEquipment: [
      {
        equipmentName: String,
        quantity: Number,
        description: String,
        alternatives: [String],
      },
    ],

    // المواد التعليمية والمراجع
    materials: [
      {
        materialId: mongoose.Schema.Types.ObjectId,
        title: String,
        type: {
          type: String,
          enum: ['document', 'video', 'audio', 'image', 'interactive'],
        },
        url: String,
        description: String,
        language: String,
      },
    ],

    // الأخصائيون المؤهلون
    qualifiedSpecialists: [
      {
        specialtyId: mongoose.Schema.Types.ObjectId,
        title: String,
        certifications: [String],
        minExperience: Number, // بالسنوات
      },
    ],

    // معايير الأهلية والقبول
    eligibilityCriteria: {
      minAge: Number,
      maxAge: Number,
      prerequisites: [String],
      contraindicators: [String],
      assessmentRequired: Boolean,
      assessmentType: String,
    },

    // الملاحظات والنتائج المتوقعة
    expectedOutcomes: [String],

    // الحالة والتفعيل
    isActive: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ['draft', 'review', 'active', 'archived'],
      default: 'active',
    },

    // التكاليف (إذا كانت مطلوبة)
    pricing: {
      costPerSession: Number,
      currency: String,
      discountForPackage: {
        type: Number, // نسبة الخصم %
        min: 0,
        max: 100,
      },
      packagePrice: Number,
      packageSessions: Number,
    },

    // البيانات الإحصائية
    statistics: {
      totalBeneficiaries: {
        type: Number,
        default: 0,
      },
      totalSessions: {
        type: Number,
        default: 0,
      },
      successRate: {
        type: Number, // نسبة النجاح %
        default: 0,
      },
      averageOutcomeImprovement: Number,
    },

    // الملاحظات والمتطلبات الخاصة
    specialNotes: String,

    createdBy: mongoose.Schema.Types.ObjectId,
    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedBy: mongoose.Schema.Types.ObjectId,
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'specializedPrograms',
  }
);

// الفهارس لتحسين الأداء
specializedProgramSchema.index({ disabilityType: 1 });
specializedProgramSchema.index({ isActive: 1 });
specializedProgramSchema.index({ 'sessionConfig.frequencyPerWeek': 1 });

module.exports = {
  model: mongoose.model('SpecializedProgram', specializedProgramSchema),
  schema: specializedProgramSchema,
  DISABILITY_TYPES,
  SEVERITY_LEVELS,
};

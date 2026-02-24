/**
 * نموذج جدولة ذكية - Smart Scheduler Model
 * يدير الجدولة الذكية تعتمد على التوفر والاحتياجات
 */

const mongoose = require('mongoose');

const smartSchedulerSchema = new mongoose.Schema({
  // معرفات المورد
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'SpecializedProgram'
  },
  
  // معايير الجدولة
  schedulingCriteria: {
    // توفر الأخصائيين
    availableSpecialists: [{
      specialistId: mongoose.Schema.Types.ObjectId,
      name: String,
      specialty: String,
      preferenceLevel: {
        type: String,
        enum: ['primary', 'secondary', 'tertiary']
      },
      availabilitySlots: [{
        dayOfWeek: Number, // 0-6
        startTime: String, // HH:mm
        endTime: String,
        isAvailable: Boolean
      }]
    }],
    
    // احتياجات المستفيد
    beneficiaryNeeds: {
      preferredTimeOfDay: {
        type: String,
        enum: ['morning', 'afternoon', 'evening']
      },
      preferredDays: [Number], // أيام الأسبوع
      avoidTimes: [{
        dayOfWeek: Number,
        startTime: String,
        endTime: String,
        reason: String
      }],
      transportationNeeds: Boolean,
      specialRequirements: [String]
    },
    
    // توفر الموارد
    availableResources: {
      rooms: [{
        roomId: mongoose.Schema.Types.ObjectId,
        roomName: String,
        capacity: Number,
        equipment: [String],
        availabilitySchedule: [{
          dayOfWeek: Number,
          startTime: String,
          endTime: String,
          isAvailable: Boolean
        }]
      }],
      
      equipment: [{
        equipmentId: mongoose.Schema.Types.ObjectId,
        name: String,
        quantity: Number,
        location: String,
        maintenanceSchedule: [{
          date: Date,
          duration: Number
        }]
      }]
    },
    
    // تجنب التعارضات
    conflictAvoidance: {
      minGapBetweenSessions: {
        type: Number,
        default: 15, // بالدقائق
        description: 'الحد الأدنى للفجوة بين الجلسات'
      },
      maxSessionsPerDay: {
        type: Number,
        default: 3
      },
      maxSessionsPerSpecialist: {
        type: Number,
        default: 6
      },
      preventConsecutiveIntensiveSessions: Boolean
    },
    
    // أولويات الجدولة
    schedulingPriorities: [{
      priority: Number,
      criterion: String,
      weight: Number // وزن المعيار في الحساب
    }]
  },
  
  // خطة الجدولة
  schedulingPlan: {
    frequency: {
      type: String,
      enum: ['daily', 'biweekly', 'weekly', 'twice-weekly', 'monthly'],
      default: 'weekly'
    },
    
    sessionsPerWeek: Number,
    
    totalPlannedSessions: Number,
    
    planStartDate: Date,
    planEndDate: Date,
    
    suggestedSchedule: [{
      scheduledDateTime: Date,
      recommendedSpecialist: {
        specialistId: mongoose.Schema.Types.ObjectId,
        name: String
      },
      preferredRoom: {
        roomId: mongoose.Schema.Types.ObjectId,
        roomName: String
      },
      estimatedDuration: Number,
      confidenceScore: Number, // نسبة الثقة بهذه الجدولة 0-100
      explanation: String,
      alternativeOptions: [{
        dateTime: Date,
        specialist: String,
        room: String,
        reason: String
      }]
    }],
    
    confirmedSchedule: [{
      sessionId: mongoose.Schema.Types.ObjectId,
      scheduledDateTime: Date,
      specialist: mongoose.Schema.Types.ObjectId,
      room: mongoose.Schema.Types.ObjectId,
      duration: Number,
      status: {
        type: String,
        enum: ['confirmed', 'pending', 'tentative']
      }
    }]
  },
  
  // تخصيص مدة الجلسات
  sessionDurationCustomization: {
    baseSessionDuration: {
      type: Number,
      default: 60 // بالدقائق
    },
    
    adjustmentFactors: [{
      factor: String,
      adjustment: Number, // الزيادة أو الانخفاض بالدقائق
      reason: String,
      appliedDate: Date
    }],
    
    customDurationPerSession: [{
      sessionDate: Date,
      customDuration: Number,
      reason: String,
      approvedBy: mongoose.Schema.Types.ObjectId
    }],
    
    historicalAverageDuration: Number,
    
    recommendedDurationAdjustment: {
      suggestedDuration: Number,
      reason: String,
      basedOn: [String], // الأسباب: fatigue, progress, intensity, etc.
      confidence: Number
    }
  },
  
  // الإحصائيات والتحليلات
  analytics: {
    schedulingEfficiency: {
      type: Number, // نسبة استخدام الموارد
      min: 0,
      max: 100
    },
    
    conflictRatio: {
      type: Number,
      description: 'نسبة التعارضات التي تم حلها'
    },
    
    adherenceRate: {
      type: Number,
      description: 'نسبة الالتزام بالجدولة المقترحة'
    },
    
    beneficiaryPreferenceAlignment: {
      type: Number,
      description: 'مدى توافق الجدولة مع تفضيلات المستفيد'
    },
    
    specialist_utilization: {
      type: Number,
      description: 'معدل استخدام الأخصائيين'
    },
    
    resourceUtilization: {
      type: Number,
      description: 'معدل استخدام الموارد'
    }
  },
  
  // القيود والاستثناءات
  constraints: {
    hardConstraints: [{
      description: String,
      type: {
        type: String,
        enum: ['no-conflict', 'specialist-availability', 'resource-availability', 'beneficiary-constraint']
      },
      isPriority: Boolean
    }],
    
    softConstraints: [{
      description: String,
      weight: Number,
      preferenceLevel: String
    }],
    
    exceptions: [{
      date: Date,
      reason: String,
      description: String,
      affectedSessions: [mongoose.Schema.Types.ObjectId],
      alternativeSchedule: [{
        sessionId: mongoose.Schema.Types.ObjectId,
        newDateTime: Date
      }]
    }]
  },
  
  // الحالة والموافقة
  status: {
    type: String,
    enum: ['draft', 'pending-review', 'approved', 'active', 'completed', 'archived'],
    default: 'draft'
  },
  
  approvals: {
    specialistApproval: {
      approved: Boolean,
      approvedAt: Date,
      approvedBy: mongoose.Schema.Types.ObjectId,
      notes: String
    },
    
    supervisorApproval: {
      approved: Boolean,
      approvedAt: Date,
      approvedBy: mongoose.Schema.Types.ObjectId,
      notes: String
    },
    
    beneficiaryApproval: {
      approved: Boolean,
      approvedAt: Date,
      approvedBy: mongoose.Schema.Types.ObjectId,
      notes: String
    }
  },
  
  // الملاحظات والتحسينات
  notes: String,
  
  improvementSuggestions: [{
    suggestion: String,
    basedOn: String,
    potentialImpact: String,
    implementationDate: Date
  }],
  
  // البيانات الإدارية
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedBy: mongoose.Schema.Types.ObjectId,
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  nextReviewDate: Date
}, {
  timestamps: true,
  collection: 'smartSchedulers'
});

// الفهارس
smartSchedulerSchema.index({ beneficiaryId: 1, programId: 1 });
smartSchedulerSchema.index({ status: 1 });
smartSchedulerSchema.index({ 'planStartDate': 1, 'planEndDate': 1 });

module.exports = {
  model: mongoose.model('SmartScheduler', smartSchedulerSchema),
  schema: smartSchedulerSchema
};

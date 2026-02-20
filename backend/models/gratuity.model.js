/**
 * Gratuity Record Model - نموذج سجل مكافأة نهاية الخدمة
 * 
 * يحتفظ بجميع تفاصيل حساب مكافأة نهاية الخدمة مع سجل تدقيق شامل
 */

const mongoose = require('mongoose');

const gratuitySchema = new mongoose.Schema({
  // معلومات الموظف
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  position: String,
  department: String,

  // معلومات الإنهاء
  terminationDate: {
    type: Date,
    required: true
  },
  terminationScenario: {
    type: String,
    enum: [
      'RESIGNATION',              // استقالة
      'DISMISSAL_WITHOUT_CAUSE',  // فصل بدون مبرر
      'DISMISSAL_WITH_FAULT',     // فصل بسبب خطأ
      'RETIREMENT',               // تقاعد
      'DEATH',                    // وفاة
      'CONTRACT_END'              // انتهاء العقد
    ],
    required: true
  },

  // تفاصيل الحساب
  calculation: {
    baseGratuity: {
      amount: {
        type: Number,
        required: true
      },
      details: {
        yearsBreakdown: [{
          period: String,
          years: Number,
          rate: Number,
          calculation: String,
          amount: Number
        }],
        totalYears: Number,
        lastSalary: Number,
        scenario: String,
        reason: String
      },
      serviceDetails: {
        totalDays: Number,
        totalMonths: Number,
        totalYears: Number,
        years: Number,
        remainingMonths: Number
      }
    },
    additions: {
      items: [{
        type: String,
        description: String,
        amount: Number,
        details: mongoose.Schema.Types.Mixed
      }],
      total: Number
    },
    deductions: {
      items: [{
        type: String,
        description: String,
        amount: Number,
        details: mongoose.Schema.Types.Mixed
      }],
      total: Number
    }
  },

  // الملخص المالي
  summary: {
    baseGratuity: {
      type: Number,
      required: true
    },
    totalAdditions: {
      type: Number,
      default: 0
    },
    totalDeductions: {
      type: Number,
      default: 0
    },
    grossSettlement: {
      type: Number,
      required: true
    },
    netSettlement: {
      type: Number,
      required: true
    }
  },

  // معلومات الدفع
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  paymentCompletedAt: Date,
  lastSalary: Number,
  yearsOfService: Number,

  // الحالة والموافقات
  status: {
    type: String,
    enum: [
      'DRAFT',                    // مسودة
      'SUBMITTED',                // مقدمة
      'PENDING_APPROVAL',         // في انتظار الموافقة
      'APPROVED',                 // موافق عليها
      'PAYMENT_PROCESSING',       // قيد معالجة الدفع
      'COMPLETED',                // مكتملة
      'REJECTED',                 // مرفوضة
      'CANCELLED'                 // ملغاة
    ],
    default: 'DRAFT'
  },

  // سلسلة الموافقات
  approvals: [{
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approverName: String,
    approverRole: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    remarks: String,
    status: {
      type: String,
      enum: ['APPROVED', 'REJECTED', 'PENDING'],
      default: 'APPROVED'
    }
  }],

  // سجل التدقيق
  auditTrail: [{
    action: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: mongoose.Schema.Types.ObjectId,
    userName: String
  }],

  // معلومات تكاملية
  integrations: {
    qiwaSubmitted: {
      type: Boolean,
      default: false
    },
    qiwaSubmissionDate: Date,
    qiwaReference: String,
    gosiNotified: {
      type: Boolean,
      default: false
    },
    gosiNotificationDate: Date,
    bankTransferReference: String
  },

  // ملاحظات إضافية
  remarks: String,
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: Date,
    uploadedBy: mongoose.Schema.Types.ObjectId
  }],

  // معلومات الإنشاء والتحديث
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'gratuities',
  indexes: [
    { employeeId: 1, terminationDate: -1 },
    { status: 1, createdAt: -1 },
    { 'summary.netSettlement': -1 }
  ]
});

// تحديث updatedAt قبل الحفظ
gratuitySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// الفهرس المركب للبحث السريع
gratuitySchema.index({
  employeeId: 1,
  status: 1,
  createdAt: -1
});

module.exports = mongoose.model('Gratuity', gratuitySchema);

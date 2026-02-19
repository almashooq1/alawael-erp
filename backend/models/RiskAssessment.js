/**
 * RiskAssessment Model
 * تقييم وإدارة المخاطر المالية والتشغيلية
 */

const mongoose = require('mongoose');

const riskAssessmentSchema = new mongoose.Schema(
  {
    // معرفات أساسية
    riskId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
      index: true
    },
    
    // تفاصيل المخاطرة
    riskName: {
      type: String,
      required: true,
    },
    
    riskType: {
      type: String,
      enum: ['operational', 'financial', 'credit', 'market', 'liquidity', 'regulatory', 'fraud', 'reputational'],
      required: true,
    },
    
    riskDescription: {
      type: String,
      required: true,
    },
    
    // تقييم المخاطرة
    assessment: {
      probability: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
      impact: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
      },
      exposureAmount: {
        type: Number,
      }
    },
    
    // المعايير الحضر
    indicators: {
      type: [{
        name: String,
        value: Number,
        threshold: Number,
        status: {
          type: String,
          enum: ['normal', 'warning', 'critical'],
        }
      }],
      default: [],
    },
    
    // التخفيف والتحكم
    mitigation: {
      strategy: String,
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      status: {
        type: String,
        enum: ['planned', 'in_progress', 'monitoring', 'completed'],
        default: 'planned',
      },
      startDate: Date,
      targetDate: Date,
      completionDate: Date,
      estimatedCost: Number,
      actualCost: Number,
      effectiveness: {
        type: Number,
        min: 0,
        max: 100,
      }
    },
    
    // الاتجاهات التاريخية
    trends: {
      type: [{
        period: {
          month: Number,
          year: Number
        },
        probability: Number,
        impact: Number,
        severity: String,
        exposureAmount: Number,
        note: String
      }],
      default: [],
    },
    
    // الحالة والتتبع
    status: {
      type: String,
      enum: ['identified', 'assessed', 'mitigated', 'closed', 'monitoring'],
      default: 'identified',
      index: true,
    },
    
    // المراجع والوثائق
    attachments: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Attachment',
      default: [],
    },
    
    // معلومات الإنشاء والتعديل
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    lastReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    lastReviewDate: {
      type: Date,
    },
    
    // التعليقات والتحديثات
    updates: [{
      date: { type: Date, default: Date.now },
      user: mongoose.Schema.Types.ObjectId,
      message: String,
      attachment: mongoose.Schema.Types.ObjectId
    }]
  },
  {
    timestamps: true,
    collection: 'risk_assessments',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ===== INDEXES =====
riskAssessmentSchema.index({ organizationId: 1, status: 1 });
riskAssessmentSchema.index({ riskType: 1 });
riskAssessmentSchema.index({ 'assessment.severity': 1 });
riskAssessmentSchema.index({ assignedTo: 1 });

// ===== VIRTUALS =====
riskAssessmentSchema.virtual('riskScore').get(function() {
  const score = this.assessment.probability * this.assessment.impact * 100;
  return Math.round(score * 100) / 100;
});

riskAssessmentSchema.virtual('riskLevel').get(function() {
  const score = this.riskScore;
  if (score >= 0.75) return 'critical';
  if (score >= 0.50) return 'high';
  if (score >= 0.25) return 'medium';
  return 'low';
});

// ===== HOOKS =====
riskAssessmentSchema.pre('save', function(next) {
  // تحديد درجة الخطورة بناءً على الاحتمالية والتأثير
  const severity = this.riskScore;
  if (severity >= 0.75) {
    this.assessment.severity = 'critical';
  } else if (severity >= 0.5) {
    this.assessment.severity = 'high';
  } else if (severity >= 0.25) {
    this.assessment.severity = 'medium';
  } else {
    this.assessment.severity = 'low';
  }
  
  next();
});

// ===== METHODS =====
riskAssessmentSchema.methods.updateAssessment = function(probability, impact, exposureAmount) {
  this.assessment.probability = probability;
  this.assessment.impact = impact;
  this.assessment.exposureAmount = exposureAmount;
  return this.save();
};

riskAssessmentSchema.methods.addTrendPoint = function(month, year) {
  this.trends.push({
    period: { month, year },
    probability: this.assessment.probability,
    impact: this.assessment.impact,
    severity: this.assessment.severity,
    exposureAmount: this.assessment.exposureAmount,
    note: `تحديث دوري - ${new Date().toLocaleDateString('ar-SA')}`
  });
  return this.save();
};

riskAssessmentSchema.methods.addUpdate = function(userId, message) {
  this.updates.push({
    date: new Date(),
    user: userId,
    message
  });
  this.lastReviewDate = new Date();
  this.lastReviewedBy = userId;
  return this.save();
};

riskAssessmentSchema.methods.close = function(userId) {
  this.status = 'closed';
  this.updates.push({
    date: new Date(),
    user: userId,
    message: 'تم إغلاق المخاطرة'
  });
  return this.save();
};

// ===== STATICS =====
riskAssessmentSchema.statics.getCriticalRisks = function(organizationId) {
  return this.find({
    organizationId,
    'assessment.severity': 'critical',
    status: { $ne: 'closed' }
  }).sort({ createdAt: -1 });
};

riskAssessmentSchema.statics.getRisksByType = function(organizationId, riskType) {
  return this.find({
    organizationId,
    riskType,
    status: { $ne: 'closed' }
  }).sort({ 'assessment.severity': -1 });
};

riskAssessmentSchema.statics.getTotalExposure = async function(organizationId) {
  const result = await this.aggregate([
    { $match: { organizationId, status: { $ne: 'closed' } } },
    { $group: { _id: null, total: { $sum: '$assessment.exposureAmount' } } }
  ]);
  return result[0]?.total || 0;
};

module.exports = mongoose.model('RiskAssessment', riskAssessmentSchema);

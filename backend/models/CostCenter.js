/**
 * ===================================================================
 * COST CENTER MODEL - نموذج مراكز التكلفة
 * ===================================================================
 * النسخة: 1.0.0
 * التاريخ: 30 يناير 2026
 * الوصف: نموذج شامل لإدارة مراكز التكلفة والتحليل المالي
 * ===================================================================
 */

const mongoose = require('mongoose');

const costCenterSchema = new mongoose.Schema(
  {
    // معلومات المركز الأساسية
    code: {
      type: String,
      required: [true, 'كود مركز التكلفة مطلوب'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^CC-\d{3,}$/, 'صيغة الكود يجب أن تكون CC-XXX'],
    },
    name: {
      type: String,
      required: [true, 'اسم مركز التكلفة مطلوب'],
      trim: true,
      minlength: [3, 'الاسم يجب أن يكون 3 أحرف على الأقل'],
    },
    nameEn: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // التصنيف والتبعية
    type: {
      type: String,
      required: [true, 'نوع المركز مطلوب'],
      enum: {
        values: [
          'revenue', // مركز إيراد
          'cost', // مركز تكلفة
          'profit', // مركز ربح
          'investment', // مركز استثمار
        ],
        message: 'نوع المركز غير صالح',
      },
    },
    category: {
      type: String,
      enum: [
        'production', // إنتاج
        'service', // خدمي
        'administrative', // إداري
        'marketing', // تسويق
        'research', // بحث وتطوير
        'support', // دعم
      ],
    },

    // الهيكل التنظيمي
    parentCostCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },

    // المسؤولون
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'مدير المركز مطلوب'],
    },
    accountant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    alternateManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },

    // الميزانية السنوية
    budget: {
      year: {
        type: Number,
        default: () => new Date().getFullYear(),
      },
      totalBudget: {
        type: Number,
        default: 0,
        min: [0, 'الميزانية يجب أن تكون قيمة موجبة'],
      },
      allocatedBudget: {
        type: Number,
        default: 0,
      },
      spentBudget: {
        type: Number,
        default: 0,
      },
      remainingBudget: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: 'SAR',
      },
    },

    // الميزانية الشهرية المفصلة
    monthlyBudgets: [
      {
        month: {
          type: Number,
          required: true,
          min: 1,
          max: 12,
        },
        year: {
          type: Number,
          required: true,
        },
        budgetAmount: {
          type: Number,
          default: 0,
        },
        actualAmount: {
          type: Number,
          default: 0,
        },
        variance: {
          type: Number,
          default: 0,
        },
        variancePercentage: {
          type: Number,
          default: 0,
        },
      },
    ],

    // تفصيل التكاليف حسب النوع
    costBreakdown: {
      directCosts: {
        materials: { type: Number, default: 0 },
        labor: { type: Number, default: 0 },
        equipment: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
      },
      indirectCosts: {
        overhead: { type: Number, default: 0 },
        utilities: { type: Number, default: 0 },
        rent: { type: Number, default: 0 },
        depreciation: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
      },
      fixedCosts: { type: Number, default: 0 },
      variableCosts: { type: Number, default: 0 },
    },

    // الإيرادات (لمراكز الإيراد والربح)
    revenue: {
      totalRevenue: { type: Number, default: 0 },
      targetRevenue: { type: Number, default: 0 },
      actualRevenue: { type: Number, default: 0 },
      revenueBySource: {
        type: Map,
        of: Number,
      },
    },

    // مؤشرات الأداء KPIs
    kpis: [
      {
        name: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['financial', 'operational', 'quality', 'efficiency'],
        },
        target: Number,
        actual: Number,
        unit: String,
        period: {
          type: String,
          enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'],
        },
        lastUpdated: Date,
      },
    ],

    // الحسابات المرتبطة
    linkedAccounts: [
      {
        account: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Account',
        },
        accountType: {
          type: String,
          enum: ['expense', 'revenue', 'asset', 'liability'],
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // القواعد التلقائية لتوزيع التكاليف
    allocationRules: [
      {
        name: String,
        method: {
          type: String,
          enum: ['percentage', 'equal', 'activity-based', 'custom'],
        },
        percentage: Number,
        targetCostCenters: [
          {
            costCenter: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'CostCenter',
            },
            allocationPercentage: Number,
          },
        ],
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // الأهداف المالية
    financialGoals: [
      {
        year: Number,
        quarter: Number,
        type: {
          type: String,
          enum: ['cost-reduction', 'revenue-increase', 'profit-margin', 'roi'],
        },
        target: Number,
        actual: Number,
        status: {
          type: String,
          enum: ['not-started', 'in-progress', 'achieved', 'failed'],
          default: 'in-progress',
        },
      },
    ],

    // حدود الصلاحيات والموافقات
    approvalLimits: {
      purchaseLimit: {
        type: Number,
        default: 0,
      },
      expenseLimit: {
        type: Number,
        default: 0,
      },
      requiresApproval: {
        type: Boolean,
        default: true,
      },
      approvers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },

    // الموظفون والموارد
    employees: [
      {
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee',
        },
        role: String,
        allocationPercentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 100,
        },
        startDate: Date,
        endDate: Date,
      },
    ],
    assets: [
      {
        asset: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FixedAsset',
        },
        allocationPercentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 100,
        },
      },
    ],

    // سجل التكاليف الشهرية
    costHistory: [
      {
        month: Number,
        year: Number,
        totalCost: Number,
        directCosts: Number,
        indirectCosts: Number,
        variance: Number,
        notes: String,
      },
    ],

    // التنبيهات والإشعارات
    alerts: {
      budgetThreshold: {
        type: Number,
        default: 90, // نسبة مئوية
      },
      sendAlerts: {
        type: Boolean,
        default: true,
      },
      alertRecipients: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },

    // الحالة والتفعيل
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'closed'],
      default: 'active',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: Date,

    // ملاحظات وتعليقات
    notes: {
      type: String,
      trim: true,
    },
    tags: [String],

    // معلومات النظام
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ===================================================================
// INDEXES
// ===================================================================

costCenterSchema.index({ code: 1 });
costCenterSchema.index({ type: 1, status: 1 });
costCenterSchema.index({ department: 1 });
costCenterSchema.index({ branch: 1 });
costCenterSchema.index({ manager: 1 });
costCenterSchema.index({ parentCostCenter: 1 });
costCenterSchema.index({ 'budget.year': -1 });

// ===================================================================
// VIRTUALS
// ===================================================================

// نسبة استهلاك الميزانية
costCenterSchema.virtual('budgetUtilization').get(function () {
  if (!this.budget.totalBudget || this.budget.totalBudget === 0) return 0;
  return ((this.budget.spentBudget / this.budget.totalBudget) * 100).toFixed(2);
});

// حالة الميزانية
costCenterSchema.virtual('budgetStatus').get(function () {
  const utilization = this.budgetUtilization;
  if (utilization < 50) return 'under-budget';
  if (utilization < 90) return 'on-track';
  if (utilization < 100) return 'warning';
  return 'over-budget';
});

// إجمالي التكاليف
costCenterSchema.virtual('totalCosts').get(function () {
  const direct =
    this.costBreakdown.directCosts.materials +
    this.costBreakdown.directCosts.labor +
    this.costBreakdown.directCosts.equipment +
    this.costBreakdown.directCosts.other;

  const indirect =
    this.costBreakdown.indirectCosts.overhead +
    this.costBreakdown.indirectCosts.utilities +
    this.costBreakdown.indirectCosts.rent +
    this.costBreakdown.indirectCosts.depreciation +
    this.costBreakdown.indirectCosts.other;

  return direct + indirect;
});

// هامش الربح (لمراكز الربح)
costCenterSchema.virtual('profitMargin').get(function () {
  if (this.type !== 'profit' || !this.revenue.actualRevenue) return null;
  const profit = this.revenue.actualRevenue - this.totalCosts;
  return ((profit / this.revenue.actualRevenue) * 100).toFixed(2);
});

// العائد على الاستثمار ROI (لمراكز الاستثمار)
costCenterSchema.virtual('roi').get(function () {
  if (this.type !== 'investment' || !this.budget.totalBudget) return null;
  const gain = this.revenue.actualRevenue - this.totalCosts;
  return ((gain / this.budget.totalBudget) * 100).toFixed(2);
});

// ===================================================================
// METHODS
// ===================================================================

// تحديث الميزانية المستخدمة
costCenterSchema.methods.updateBudgetSpent = async function (amount) {
  this.budget.spentBudget += amount;
  this.budget.remainingBudget = this.budget.totalBudget - this.budget.spentBudget;

  // إرسال تنبيه إذا تجاوزت النسبة المحددة
  if (this.budgetUtilization >= this.alerts.budgetThreshold && this.alerts.sendAlerts) {
    await this.sendBudgetAlert();
  }

  await this.save();
  return this;
};

// تسجيل تكلفة
costCenterSchema.methods.recordCost = async function (costData) {
  const { amount, type, category, month, year, description } = costData;

  // تحديث التكاليف حسب النوع
  if (type === 'direct') {
    this.costBreakdown.directCosts[category] =
      (this.costBreakdown.directCosts[category] || 0) + amount;
  } else if (type === 'indirect') {
    this.costBreakdown.indirectCosts[category] =
      (this.costBreakdown.indirectCosts[category] || 0) + amount;
  }

  // تحديث الميزانية الشهرية
  const monthlyBudget = this.monthlyBudgets.find(mb => mb.month === month && mb.year === year);

  if (monthlyBudget) {
    monthlyBudget.actualAmount += amount;
    monthlyBudget.variance = monthlyBudget.budgetAmount - monthlyBudget.actualAmount;
    monthlyBudget.variancePercentage =
      monthlyBudget.budgetAmount > 0
        ? ((monthlyBudget.variance / monthlyBudget.budgetAmount) * 100).toFixed(2)
        : 0;
  }

  // تحديث الميزانية الإجمالية
  await this.updateBudgetSpent(amount);

  return this;
};

// تسجيل إيراد
costCenterSchema.methods.recordRevenue = async function (amount, source = 'general') {
  if (this.type !== 'revenue' && this.type !== 'profit') {
    throw new Error('هذا المركز لا يقبل تسجيل الإيرادات');
  }

  this.revenue.actualRevenue += amount;

  // تحديث الإيراد حسب المصدر
  if (!this.revenue.revenueBySource) {
    this.revenue.revenueBySource = new Map();
  }
  const currentSourceRevenue = this.revenue.revenueBySource.get(source) || 0;
  this.revenue.revenueBySource.set(source, currentSourceRevenue + amount);

  await this.save();
  return this;
};

// تحديث مؤشر أداء
costCenterSchema.methods.updateKPI = async function (kpiName, actualValue) {
  const kpi = this.kpis.find(k => k.name === kpiName);

  if (kpi) {
    kpi.actual = actualValue;
    kpi.lastUpdated = new Date();
  } else {
    this.kpis.push({
      name: kpiName,
      actual: actualValue,
      lastUpdated: new Date(),
    });
  }

  await this.save();
  return this;
};

// توزيع التكاليف على مراكز أخرى
costCenterSchema.methods.allocateCosts = async function (amount, rule) {
  const CostCenter = mongoose.model('CostCenter');
  const allocations = [];

  for (const target of rule.targetCostCenters) {
    const allocatedAmount = (amount * target.allocationPercentage) / 100;
    const targetCenter = await CostCenter.findById(target.costCenter);

    if (targetCenter) {
      await targetCenter.recordCost({
        amount: allocatedAmount,
        type: 'indirect',
        category: 'overhead',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        description: `تحميل من ${this.name}`,
      });

      allocations.push({
        costCenter: targetCenter._id,
        amount: allocatedAmount,
      });
    }
  }

  return allocations;
};

// إرسال تنبيه الميزانية
costCenterSchema.methods.sendBudgetAlert = async function () {
  const Notification = mongoose.model('Notification');

  const message = `تحذير: مركز التكلفة "${this.name}" وصل إلى ${this.budgetUtilization}% من الميزانية`;

  const recipients = [
    this.manager,
    ...this.alerts.alertRecipients,
    ...(this.approvalLimits.approvers || []),
  ].filter(Boolean);

  for (const recipient of recipients) {
    await Notification.create({
      user: recipient,
      type: 'budget-alert',
      title: 'تنبيه ميزانية',
      message,
      priority: 'high',
      relatedModel: 'CostCenter',
      relatedId: this._id,
    });
  }

  return true;
};

// ===================================================================
// STATICS
// ===================================================================

// الحصول على مراكز التكلفة حسب النوع
costCenterSchema.statics.getByType = function (type) {
  return this.find({ type, isActive: true }).populate('manager department branch').sort('code');
};

// مراكز التكلفة المتجاوزة للميزانية
costCenterSchema.statics.getOverBudget = function () {
  return this.find({
    isActive: true,
    $expr: { $gt: ['$budget.spentBudget', '$budget.totalBudget'] },
  }).populate('manager department');
};

// تقرير الأداء الشامل
costCenterSchema.statics.getPerformanceReport = async function (year, quarter = null) {
  const match = { isActive: true, 'budget.year': year };

  return this.aggregate([
    { $match: match },
    {
      $project: {
        code: 1,
        name: 1,
        type: 1,
        totalBudget: '$budget.totalBudget',
        spentBudget: '$budget.spentBudget',
        remainingBudget: '$budget.remainingBudget',
        utilizationRate: {
          $multiply: [{ $divide: ['$budget.spentBudget', '$budget.totalBudget'] }, 100],
        },
        totalCosts: { $add: ['$costBreakdown.fixedCosts', '$costBreakdown.variableCosts'] },
        actualRevenue: '$revenue.actualRevenue',
      },
    },
    {
      $group: {
        _id: '$type',
        centers: { $push: '$$ROOT' },
        totalBudget: { $sum: '$totalBudget' },
        totalSpent: { $sum: '$spentBudget' },
        avgUtilization: { $avg: '$utilizationRate' },
        count: { $sum: 1 },
      },
    },
  ]);
};

// المراكز التي تحتاج مراجعة
costCenterSchema.statics.getNeedingReview = function () {
  return this.find({
    isActive: true,
    $or: [
      { $expr: { $gte: ['$budget.spentBudget', { $multiply: ['$budget.totalBudget', 0.9] }] } },
      { status: 'suspended' },
      { 'alerts.budgetThreshold': { $lte: 85 } },
    ],
  })
    .populate('manager accountant')
    .sort('-budget.spentBudget');
};

// ===================================================================
// MIDDLEWARE
// ===================================================================

// قبل الحفظ
costCenterSchema.pre('save', function (next) {
  // حساب الميزانية المتبقية
  this.budget.remainingBudget = this.budget.totalBudget - this.budget.spentBudget;

  // حساب إجمالي التكاليف الثابتة والمتغيرة
  const directTotal = Object.values(this.costBreakdown.directCosts).reduce(
    (sum, val) => sum + (val || 0),
    0
  );
  const indirectTotal = Object.values(this.costBreakdown.indirectCosts).reduce(
    (sum, val) => sum + (val || 0),
    0
  );

  this.costBreakdown.fixedCosts = indirectTotal;
  this.costBreakdown.variableCosts = directTotal;

  next();
});

// بعد الحفظ - تحديث المراكز الفرعية
costCenterSchema.post('save', async function (doc) {
  if (doc.parentCostCenter) {
    const CostCenter = mongoose.model('CostCenter');
    const parent = await CostCenter.findById(doc.parentCostCenter);

    if (parent) {
      // يمكن إضافة منطق تحديث المركز الأب هنا
    }
  }
});

// ===================================================================
// MODEL CREATION
// ===================================================================

module.exports = mongoose.model('CostCenter', costCenterSchema);

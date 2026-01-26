/**
 * ===================================================================
 * ACCOUNTING EXPENSE MODEL - نموذج المصروفات المحاسبية
 * ===================================================================
 */

const mongoose = require('mongoose');

const accountingExpenseSchema = new mongoose.Schema(
  {
    // التاريخ
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // فئة المصروف
    category: {
      type: String,
      required: true,
      enum: [
        'salaries', // الرواتب والأجور
        'rent', // الإيجار
        'utilities', // المرافق (كهرباء، ماء، إنترنت)
        'supplies', // المستلزمات المكتبية
        'marketing', // التسويق والإعلان
        'transportation', // المواصلات
        'maintenance', // الصيانة
        'insurance', // التأمينات
        'professional', // الخدمات المهنية
        'training', // التدريب والتطوير
        'travel', // السفر والتنقل
        'meals', // وجبات العمل
        'depreciation', // الاستهلاك
        'other', // أخرى
      ],
    },

    // الوصف
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // المبلغ
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // طريقة الدفع
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash', 'bank', 'credit', 'cheque'],
      default: 'cash',
    },

    // رقم المرجع
    reference: {
      type: String,
      trim: true,
    },

    // المورد/البائع
    vendor: {
      type: String,
      trim: true,
    },

    // حالة المصروف
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    // معلومات الموافقة
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: {
      type: Date,
    },

    // معلومات الرفض
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },

    // رابط الإيصال/الفاتورة
    receiptUrl: {
      type: String,
      trim: true,
    },

    // ملاحظات
    notes: {
      type: String,
      trim: true,
    },

    // القيد المحاسبي المرتبط
    journalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },

    // معلومات النظام
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

// Indexes للأداء
accountingExpenseSchema.index({ date: -1 });
accountingExpenseSchema.index({ category: 1 });
accountingExpenseSchema.index({ status: 1 });
accountingExpenseSchema.index({ vendor: 1 });
accountingExpenseSchema.index({ createdBy: 1 });

// Virtual للحصول على اسم الفئة بالعربية
accountingExpenseSchema.virtual('categoryNameAr').get(function () {
  const categories = {
    salaries: 'الرواتب والأجور',
    rent: 'الإيجار',
    utilities: 'المرافق (كهرباء، ماء، إنترنت)',
    supplies: 'المستلزمات المكتبية',
    marketing: 'التسويق والإعلان',
    transportation: 'المواصلات',
    maintenance: 'الصيانة',
    insurance: 'التأمينات',
    professional: 'الخدمات المهنية',
    training: 'التدريب والتطوير',
    travel: 'السفر والتنقل',
    meals: 'وجبات العمل',
    depreciation: 'الاستهلاك',
    other: 'أخرى',
  };
  return categories[this.category] || this.category;
});

// Method للموافقة على المصروف
accountingExpenseSchema.methods.approve = function (userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvalDate = new Date();
  return this.save();
};

// Method لرفض المصروف
accountingExpenseSchema.methods.reject = function (userId, reason) {
  this.status = 'rejected';
  this.rejectedBy = userId;
  this.rejectionDate = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Pre-save middleware للتحقق
accountingExpenseSchema.pre('save', function (next) {
  // التحقق من وجود سبب الرفض عند الرفض
  if (this.status === 'rejected' && !this.rejectionReason) {
    return next(new Error('يجب تحديد سبب الرفض'));
  }

  // تحديث updatedBy
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.createdBy; // يمكن تحسينه للحصول على المستخدم الحالي
  }

  next();
});

// Static method للحصول على إحصائيات المصروفات
accountingExpenseSchema.statics.getStats = async function (startDate, endDate) {
  const match = {};

  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  const categoryStats = await this.aggregate([
    { $match: { ...match, status: 'approved' } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  return {
    byStatus: stats,
    byCategory: categoryStats,
  };
};

const AccountingExpense = mongoose.model('AccountingExpense', accountingExpenseSchema);

module.exports = AccountingExpense;

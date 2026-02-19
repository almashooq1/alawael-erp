/**
 * ===================================================================
 * FIXED ASSETS MODEL - نموذج الأصول الثابتة
 * ===================================================================
 * النسخة: 1.0.0
 * التاريخ: 30 يناير 2026
 * الوصف: نموذج شامل لإدارة الأصول الثابتة والإهلاك
 * ===================================================================
 */

const mongoose = require('mongoose');

const fixedAssetSchema = new mongoose.Schema(
  {
    // معلومات الأصل الأساسية
    code: {
      type: String,
      required: [true, 'كود الأصل مطلوب'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^FA-\d{4,}$/, 'صيغة الكود يجب أن تكون FA-XXXX'],
    },
    name: {
      type: String,
      required: [true, 'اسم الأصل مطلوب'],
      trim: true,
      minlength: [3, 'اسم الأصل يجب أن يكون 3 أحرف على الأقل'],
    },
    nameEn: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // تصنيف الأصل
    category: {
      type: String,
      required: [true, 'فئة الأصل مطلوبة'],
      enum: {
        values: [
          'land', // أراضي
          'buildings', // مباني
          'vehicles', // مركبات
          'equipment', // معدات
          'furniture', // أثاث
          'computers', // أجهزة حاسوب
          'software', // برمجيات
          'tools', // أدوات
          'machinery', // آلات
          'other', // أخرى
        ],
        message: 'فئة الأصل غير صالحة',
      },
    },
    subCategory: {
      type: String,
      trim: true,
    },

    // الموقع والمسؤول
    location: {
      type: String,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    responsiblePerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },

    // التفاصيل المالية
    purchaseDate: {
      type: Date,
      required: [true, 'تاريخ الشراء مطلوب'],
    },
    purchaseCost: {
      type: Number,
      required: [true, 'تكلفة الشراء مطلوبة'],
      min: [0, 'التكلفة يجب أن تكون قيمة موجبة'],
    },
    salvageValue: {
      type: Number,
      default: 0,
      min: [0, 'القيمة المتبقية يجب أن تكون قيمة موجبة'],
    },
    currency: {
      type: String,
      default: 'SAR',
      enum: ['SAR', 'USD', 'EUR', 'GBP'],
    },

    // معلومات المورد
    supplier: {
      name: String,
      phone: String,
      email: String,
      address: String,
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    warrantyExpiry: {
      type: Date,
    },

    // معلومات الإهلاك
    depreciationMethod: {
      type: String,
      required: [true, 'طريقة الإهلاك مطلوبة'],
      enum: {
        values: [
          'straight-line', // القسط الثابت
          'declining-balance', // الرصيد المتناقص
          'sum-of-years', // مجموع أرقام السنين
          'units-of-production', // وحدات الإنتاج
          'none', // لا يوجد إهلاك
        ],
        message: 'طريقة الإهلاك غير صالحة',
      },
      default: 'straight-line',
    },
    usefulLife: {
      type: Number,
      required: [true, 'العمر الإنتاجي مطلوب'],
      min: [1, 'العمر الإنتاجي يجب أن يكون سنة واحدة على الأقل'],
      max: [100, 'العمر الإنتاجي يجب ألا يتجاوز 100 سنة'],
    },
    depreciationRate: {
      type: Number,
      min: [0, 'معدل الإهلاك يجب أن يكون قيمة موجبة'],
      max: [100, 'معدل الإهلاك يجب ألا يتجاوز 100%'],
    },
    accumulatedDepreciation: {
      type: Number,
      default: 0,
      min: [0, 'الإهلاك المتراكم يجب أن يكون قيمة موجبة'],
    },
    lastDepreciationDate: {
      type: Date,
    },

    // سجل الإهلاك
    depreciationSchedule: [
      {
        year: Number,
        date: Date,
        amount: Number,
        accumulatedDepreciation: Number,
        bookValue: Number,
        journalEntry: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'JournalEntry',
        },
      },
    ],

    // الحالة والصيانة
    status: {
      type: String,
      enum: {
        values: [
          'active', // نشط
          'under-maintenance', // تحت الصيانة
          'disposed', // تم التخلص منه
          'sold', // تم بيعه
          'retired', // متقاعد
          'lost', // مفقود
        ],
        message: 'حالة الأصل غير صالحة',
      },
      default: 'active',
    },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good',
    },
    maintenanceSchedule: {
      frequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'semi-annual', 'annual', 'none'],
        default: 'annual',
      },
      lastMaintenanceDate: Date,
      nextMaintenanceDate: Date,
      maintenanceCost: {
        type: Number,
        default: 0,
      },
    },

    // سجل الصيانة
    maintenanceHistory: [
      {
        date: {
          type: Date,
          required: true,
        },
        type: {
          type: String,
          enum: ['preventive', 'corrective', 'breakdown'],
        },
        description: String,
        cost: Number,
        performedBy: String,
        parts: [
          {
            name: String,
            quantity: Number,
            cost: Number,
          },
        ],
        nextServiceDate: Date,
      },
    ],

    // معلومات التأمين
    insurance: {
      provider: String,
      policyNumber: String,
      coverage: Number,
      premium: Number,
      startDate: Date,
      expiryDate: Date,
      isActive: {
        type: Boolean,
        default: false,
      },
    },

    // الحسابات المرتبطة
    accounts: {
      assetAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      depreciationExpenseAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      accumulatedDepreciationAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
    },

    // المرفقات والوثائق
    attachments: [
      {
        name: String,
        type: String,
        url: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // معلومات البيع/التخلص
    disposal: {
      date: Date,
      method: {
        type: String,
        enum: ['sale', 'scrap', 'donation', 'trade-in', 'lost', 'other'],
      },
      amount: Number,
      buyer: String,
      reason: String,
      journalEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JournalEntry',
      },
    },

    // الرقم التسلسلي والمواصفات
    serialNumber: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    specifications: {
      type: Map,
      of: String,
    },

    // الباركود و RFID
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    rfidTag: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    // ملاحظات
    notes: {
      type: String,
      trim: true,
    },

    // معلومات النظام
    isActive: {
      type: Boolean,
      default: true,
    },
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
// INDEXES - لتحسين الأداء
// ===================================================================

fixedAssetSchema.index({ code: 1 });
fixedAssetSchema.index({ category: 1, status: 1 });
fixedAssetSchema.index({ department: 1 });
fixedAssetSchema.index({ branch: 1 });
fixedAssetSchema.index({ responsiblePerson: 1 });
fixedAssetSchema.index({ purchaseDate: -1 });
fixedAssetSchema.index({ barcode: 1 }, { sparse: true });
fixedAssetSchema.index({ rfidTag: 1 }, { sparse: true });
fixedAssetSchema.index({ 'insurance.expiryDate': 1 });
fixedAssetSchema.index({ 'maintenanceSchedule.nextMaintenanceDate': 1 });

// ===================================================================
// VIRTUALS - الحقول المحسوبة
// ===================================================================

// القيمة الدفترية الحالية
fixedAssetSchema.virtual('bookValue').get(function () {
  return this.purchaseCost - this.accumulatedDepreciation;
});

// نسبة الإهلاك
fixedAssetSchema.virtual('depreciationPercentage').get(function () {
  if (this.purchaseCost === 0) return 0;
  return ((this.accumulatedDepreciation / this.purchaseCost) * 100).toFixed(2);
});

// العمر الحالي بالسنوات
fixedAssetSchema.virtual('ageInYears').get(function () {
  if (!this.purchaseDate) return 0;
  const diff = Date.now() - this.purchaseDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
});

// العمر المتبقي
fixedAssetSchema.virtual('remainingLife').get(function () {
  return Math.max(0, this.usefulLife - this.ageInYears);
});

// حالة الضمان
fixedAssetSchema.virtual('warrantyStatus').get(function () {
  if (!this.warrantyExpiry) return 'no-warranty';
  return this.warrantyExpiry > Date.now() ? 'valid' : 'expired';
});

// حالة التأمين
fixedAssetSchema.virtual('insuranceStatus').get(function () {
  if (!this.insurance?.isActive || !this.insurance?.expiryDate) {
    return 'not-insured';
  }
  return this.insurance.expiryDate > Date.now() ? 'active' : 'expired';
});

// ===================================================================
// METHODS - الوظائف
// ===================================================================

// حساب الإهلاك السنوي
fixedAssetSchema.methods.calculateAnnualDepreciation = function () {
  if (this.depreciationMethod === 'none') return 0;

  const depreciableAmount = this.purchaseCost - this.salvageValue;

  switch (this.depreciationMethod) {
    case 'straight-line':
      return depreciableAmount / this.usefulLife;

    case 'declining-balance':
      const rate = this.depreciationRate || 200 / this.usefulLife;
      return this.bookValue * (rate / 100);

    case 'sum-of-years':
      const remainingLife = this.usefulLife - this.ageInYears;
      const sumOfYears = (this.usefulLife * (this.usefulLife + 1)) / 2;
      return (depreciableAmount * remainingLife) / sumOfYears;

    default:
      return depreciableAmount / this.usefulLife;
  }
};

// تسجيل الإهلاك
fixedAssetSchema.methods.recordDepreciation = async function (amount, date = new Date()) {
  const JournalEntry = mongoose.model('JournalEntry');

  // إنشاء قيد محاسبي
  const journalEntry = await JournalEntry.create({
    date,
    type: 'depreciation',
    description: `إهلاك ${this.name} - ${date.getFullYear()}`,
    lines: [
      {
        account: this.accounts.depreciationExpenseAccount,
        debit: amount,
        credit: 0,
        description: 'مصروف إهلاك',
      },
      {
        account: this.accounts.accumulatedDepreciationAccount,
        debit: 0,
        credit: amount,
        description: 'مجمع إهلاك',
      },
    ],
    reference: this._id,
    referenceModel: 'FixedAsset',
  });

  // تحديث الأصل
  this.accumulatedDepreciation += amount;
  this.lastDepreciationDate = date;

  // إضافة للجدول
  this.depreciationSchedule.push({
    year: date.getFullYear(),
    date,
    amount,
    accumulatedDepreciation: this.accumulatedDepreciation,
    bookValue: this.bookValue,
    journalEntry: journalEntry._id,
  });

  await this.save();
  return journalEntry;
};

// تسجيل صيانة
fixedAssetSchema.methods.recordMaintenance = async function (maintenanceData) {
  this.maintenanceHistory.push({
    date: maintenanceData.date || new Date(),
    type: maintenanceData.type,
    description: maintenanceData.description,
    cost: maintenanceData.cost || 0,
    performedBy: maintenanceData.performedBy,
    parts: maintenanceData.parts || [],
    nextServiceDate: maintenanceData.nextServiceDate,
  });

  // تحديث معلومات الصيانة
  this.maintenanceSchedule.lastMaintenanceDate = maintenanceData.date || new Date();
  this.maintenanceSchedule.maintenanceCost += maintenanceData.cost || 0;

  if (maintenanceData.nextServiceDate) {
    this.maintenanceSchedule.nextMaintenanceDate = maintenanceData.nextServiceDate;
  }

  await this.save();
  return this;
};

// التخلص من الأصل
fixedAssetSchema.methods.dispose = async function (disposalData) {
  const JournalEntry = mongoose.model('JournalEntry');

  const saleProceeds = disposalData.amount || 0;
  const gainLoss = saleProceeds - this.bookValue;

  // إنشاء قيد محاسبي للتخلص
  const lines = [
    {
      account: this.accounts.accumulatedDepreciationAccount,
      debit: this.accumulatedDepreciation,
      credit: 0,
      description: 'إقفال مجمع الإهلاك',
    },
    {
      account: this.accounts.assetAccount,
      debit: 0,
      credit: this.purchaseCost,
      description: 'إقفال تكلفة الأصل',
    },
  ];

  if (saleProceeds > 0) {
    lines.push({
      account: 'cash-or-bank-account', // يجب تحديد الحساب المناسب
      debit: saleProceeds,
      credit: 0,
      description: 'حصيلة البيع',
    });
  }

  if (gainLoss !== 0) {
    lines.push({
      account: gainLoss > 0 ? 'gain-on-disposal-account' : 'loss-on-disposal-account',
      debit: gainLoss < 0 ? Math.abs(gainLoss) : 0,
      credit: gainLoss > 0 ? gainLoss : 0,
      description: gainLoss > 0 ? 'ربح بيع أصل' : 'خسارة بيع أصل',
    });
  }

  const journalEntry = await JournalEntry.create({
    date: disposalData.date || new Date(),
    type: 'disposal',
    description: `التخلص من ${this.name}`,
    lines,
    reference: this._id,
    referenceModel: 'FixedAsset',
  });

  // تحديث الأصل
  this.status = 'disposed';
  this.disposal = {
    date: disposalData.date || new Date(),
    method: disposalData.method,
    amount: saleProceeds,
    buyer: disposalData.buyer,
    reason: disposalData.reason,
    journalEntry: journalEntry._id,
  };
  this.isActive = false;

  await this.save();
  return { asset: this, journalEntry, gainLoss };
};

// ===================================================================
// STATICS - الدوال الثابتة
// ===================================================================

// الحصول على الأصول حسب الفئة
fixedAssetSchema.statics.getByCategory = function (category) {
  return this.find({ category, isActive: true }).populate('department branch responsiblePerson');
};

// الأصول المستحقة للصيانة
fixedAssetSchema.statics.getDueForMaintenance = function (daysAhead = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return this.find({
    isActive: true,
    status: { $nin: ['disposed', 'sold', 'lost'] },
    'maintenanceSchedule.nextMaintenanceDate': {
      $lte: futureDate,
      $gte: new Date(),
    },
  }).populate('responsiblePerson department');
};

// الأصول منتهية الضمان
fixedAssetSchema.statics.getExpiredWarranties = function () {
  return this.find({
    isActive: true,
    warrantyExpiry: { $lte: new Date() },
  }).populate('department');
};

// تقرير الإهلاك الشهري
fixedAssetSchema.statics.getMonthlyDepreciationReport = async function (year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.aggregate([
    {
      $match: {
        isActive: true,
        status: { $nin: ['disposed', 'sold'] },
      },
    },
    {
      $project: {
        name: 1,
        category: 1,
        purchaseCost: 1,
        accumulatedDepreciation: 1,
        bookValue: { $subtract: ['$purchaseCost', '$accumulatedDepreciation'] },
        monthlyDepreciation: {
          $divide: [
            { $subtract: ['$purchaseCost', '$salvageValue'] },
            { $multiply: ['$usefulLife', 12] },
          ],
        },
      },
    },
    {
      $group: {
        _id: '$category',
        totalCost: { $sum: '$purchaseCost' },
        totalDepreciation: { $sum: '$accumulatedDepreciation' },
        totalBookValue: { $sum: '$bookValue' },
        monthlyDepreciation: { $sum: '$monthlyDepreciation' },
        count: { $sum: 1 },
      },
    },
  ]);
};

// ===================================================================
// MIDDLEWARE
// ===================================================================

// قبل الحفظ - التحقق من صحة البيانات
fixedAssetSchema.pre('save', function (next) {
  // التحقق من أن القيمة المتبقية أقل من تكلفة الشراء
  if (this.salvageValue >= this.purchaseCost) {
    return next(new Error('القيمة المتبقية يجب أن تكون أقل من تكلفة الشراء'));
  }

  // حساب معدل الإهلاك إذا لم يكن محددًا
  if (!this.depreciationRate && this.usefulLife) {
    this.depreciationRate = (100 / this.usefulLife).toFixed(2);
  }

  // توليد الباركود إذا لم يكن موجودًا
  if (!this.barcode) {
    this.barcode = `FA${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  next();
});

// ===================================================================
// MODEL CREATION
// ===================================================================

module.exports = mongoose.model('FixedAsset', fixedAssetSchema);

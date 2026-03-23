/* eslint-disable no-unused-vars */
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    🕌 INTELLIGENT ZAKAT CALCULATOR SYSTEM                      ║
 * ║                    نظام حساب الزكاة الذكي والاحترافي                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * نظام شامل ومتقدم لحساب الزكاة وفق الشريعة الإسلامية
 * Comprehensive Zakat Calculation System per Islamic Law
 *
 * FEATURES:
 * ✅ جميع أنواع الزكاة (Cash, Gold, Silver, Livestock, Crops, Business, etc)
 * ✅ حسابات متقدمة وذكية مع معادلات شرعية دقيقة
 * ✅ نظام إخطارات ذكي للمبالغ المستحقة
 * ✅ تقارير شاملة وتحليلات متعمقة
 * ✅ دعم العملات المتعددة
 * ✅ حفظ التاريخ والسجلات
 */

const mongoose = require('mongoose');
const validator = require('validator');

// ============================================================================
// 🔐 ZAKAT THRESHOLDS (النصب الشرعية) - سعر الذهب والفضة
// ============================================================================

const ZAKAT_CONFIG = {
  // النصاب (المبلغ الحد الأدنى للزكاة)
  THRESHOLDS: {
    // نصاب الذهب والفضة (آخر تحديث 2026)
    GOLD: {
      grams: 85, // 85 جرام ذهب
      nisab_2024: 5360, // سعر النصاب بالريال السعودي (تقريبي)
      nisab_2025: 5890, // آخر سعر
      current: 5890,
    },
    SILVER: {
      grams: 595, // 595 جرام فضة
      nisab_2024: 1250, // سعر النصاب
      current: 1250,
    },
    // نصاب النقود = نصاب الذهب
    CASH_NISAB: 5890,

    // نصاب المرعى والحبوب (الخيول والإبل والماشية)
    LIVESTOCK: {
      CAMELS: 5, // 5 إبل
      CATTLE_BUFFALO: 30, // 30 بقرة
      SHEEP_GOATS: 40, // 40 من الغنم والماعز
    },

    // نصاب الحبوب والمحاصيل الزراعية
    CROPS: {
      wasq: 60040, // وسق واحد = 60.040 كغ تقريباً (حد أدنى)
    },
  },

  // معدل الزكاة (2.5% للنقود والذهب والفضة)
  RATES: {
    CASH: 0.025, // 2.5%
    GOLD: 0.025, // 2.5%
    SILVER: 0.025, // 2.5%
    BUSINESS_INVENTORY: 0.025,
    CROPS_IRRIGATED: 0.05, // 5% (محاصيل مروية)
    CROPS_RAINFALL: 0.1, // 10% (محاصيل مطرية)
    LIVESTOCK: 'GRADUATED', // معدل متدرج حسب العدد
  },

  // معايير الاستحقاق (Nisab Year)
  NISAB_PERIOD_DAYS: 365, // سنة قمرية حوالي 354 يوم، لكننا نستخدم 365
  HIJRI_YEAR_DAYS: 354, // السنة الهجرية

  // فئات الزاكية
  ZAKAT_TYPES: [
    'CASH',
    'GOLD',
    'SILVER',
    'BUSINESS_INVENTORY',
    'LIVESTOCK_CAMELS',
    'LIVESTOCK_CATTLE',
    'LIVESTOCK_SHEEP_GOATS',
    'CROPS_GRAINS',
    'CROPS_FRUITS',
    'RENTAL_PROPERTY',
    'FINANCIAL_ASSETS',
  ],
};

// ============================================================================
// 📊 DATABASE SCHEMAS
// ============================================================================

/**
 * نموذج الأصول والموارد (Assets Schema)
 * Schema for tracking all personal assets
 */
const assetSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ZAKAT_CONFIG.ZAKAT_TYPES,
      required: true,
    },
    name: {
      type: String,
      required: true, // e.g., "الذهب الشخصي"، "حسابي البنكي"
      trim: true,
    },
    description: String,

    // القيمة والكمية
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'SAR', // ريال سعودي
      enum: ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR'],
    },
    quantity: {
      // للذهب والفضة والماشية
      type: Number,
      min: 0,
    },
    unit: String, // 'grams', 'kg', 'pieces', etc

    // التفاصيل الإضافية
    purchasePrice: Number, // سعر الشراء
    currentPrice: Number, // السعر الحالي

    // الصورة والمستند
    attachments: [String], // URLs للصور والمستندات

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

/**
 * نموذج حساب الزكاة (Zakat Calculation Schema)
 * تخزين حسابات الزكاة المفصلة
 */
const zakatCalculationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // معلومات الحساب الأساسية
    hijriYear: {
      type: Number,
      required: true, // السنة الهجرية
    },
    gregorianYear: {
      type: Number,
      required: true,
    },
    zakatDueDate: {
      type: Date,
      required: true, // تاريخ استحقاق الزكاة
    },

    // الأصول والموارد
    assets: [assetSchema],

    // حسابات الزكاة بالتفصيل
    calculations: {
      // زكاة النقود
      cash: {
        totalAmount: { type: Number, default: 0 },
        nisab: { type: Number, default: ZAKAT_CONFIG.THRESHOLDS.CASH_NISAB },
        isAboveNisab: { type: Boolean, default: false },
        zakatAmount: { type: Number, default: 0 },
        rate: { type: Number, default: ZAKAT_CONFIG.RATES.CASH },
      },

      // زكاة الذهب
      gold: {
        grams: { type: Number, default: 0 },
        pricePerGram: { type: Number, default: 0 },
        totalValue: { type: Number, default: 0 },
        nisab: { type: Number, default: ZAKAT_CONFIG.THRESHOLDS.GOLD.current },
        isAboveNisab: { type: Boolean, default: false },
        zakatAmount: { type: Number, default: 0 },
        rate: { type: Number, default: ZAKAT_CONFIG.RATES.GOLD },
      },

      // زكاة الفضة
      silver: {
        grams: { type: Number, default: 0 },
        pricePerGram: { type: Number, default: 0 },
        totalValue: { type: Number, default: 0 },
        nisab: { type: Number, default: ZAKAT_CONFIG.THRESHOLDS.SILVER.current },
        isAboveNisab: { type: Boolean, default: false },
        zakatAmount: { type: Number, default: 0 },
        rate: { type: Number, default: ZAKAT_CONFIG.RATES.SILVER },
      },

      // زكاة الماشية
      livestock: {
        camels: {
          count: { type: Number, default: 0 },
          zakatAmount: { type: Number, default: 0 },
          zakatType: String, // e.g., 'sheep', 'young_camel'
        },
        cattle: {
          count: { type: Number, default: 0 },
          zakatAmount: { type: Number, default: 0 },
        },
        sheepGoats: {
          count: { type: Number, default: 0 },
          zakatAmount: { type: Number, default: 0 },
        },
      },

      // زكاة المحاصيل والثمار
      crops: {
        type: {
          grains: {
            tons: { type: Number, default: 0 },
            irrigationType: String, // 'irrigated', 'rainfall'
            rate: Number,
            zakatAmount: { type: Number, default: 0 },
          },
          fruits: {
            tons: { type: Number, default: 0 },
            irrigationType: String,
            rate: Number,
            zakatAmount: { type: Number, default: 0 },
          },
        },
      },

      // زكاة الأصول التجارية
      businessInventory: {
        totalValue: { type: Number, default: 0 },
        nisab: { type: Number, default: ZAKAT_CONFIG.THRESHOLDS.CASH_NISAB },
        isAboveNisab: { type: Boolean, default: false },
        zakatAmount: { type: Number, default: 0 },
        rate: { type: Number, default: ZAKAT_CONFIG.RATES.BUSINESS_INVENTORY },
      },

      // زكاة العقارات والإيجارات
      rentalProperty: {
        totalValue: { type: Number, default: 0 },
        annualRentalIncome: { type: Number, default: 0 },
        zakatAmount: { type: Number, default: 0 },
      },

      // الأصول المالية (أسهم، سندات، إلخ)
      financialAssets: {
        totalValue: { type: Number, default: 0 },
        nisab: { type: Number, default: ZAKAT_CONFIG.THRESHOLDS.CASH_NISAB },
        zakatAmount: { type: Number, default: 0 },
      },
    },

    // الخصومات والاستثناءات
    deductions: {
      debts: { type: Number, default: 0 }, // الديون
      mortgages: { type: Number, default: 0 }, // الرهونات
      necessaryExpenses: { type: Number, default: 0 }, // نفقات ضرورية
    },

    // الملخص النهائي
    summary: {
      totalAssetsValue: { type: Number, default: 0 },
      totalZakatDue: { type: Number, default: 0 },
      totalZakatPaid: { type: Number, default: 0 },
      zakatBalance: { type: Number, default: 0 }, // remaining zakat due
      percentage: { type: Number, default: 0 }, // percentage paid
    },

    // حالة الزكاة
    status: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_PAID', 'FULLY_PAID', 'OVERDUE'],
      default: 'PENDING',
    },

    // ملاحظات وتعليقات
    notes: String,

    // معلومات إضافية
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: Date,

    timestamps: true,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'zakat_calculations', timestamps: true }
);

/**
 * نموذج دفعات الزكاة (Zakat Payments)
 * تتبع تفاصيل الدفعات
 */
const zakatPaymentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    calculation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ZakatCalculation',
      required: true,
    },

    // معلومات الدفع
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },

    // طريقة الدفع
    paymentMethod: {
      type: String,
      enum: ['BANK_TRANSFER', 'CASH', 'CHECK', 'ONLINE', 'CREDIT_CARD'],
      required: true,
    },

    // جهة استقبال الزكاة
    recipientType: {
      type: String,
      enum: ['CHARITY_ORG', 'MOSQUE', 'SCHOOL', 'HOSPITAL', 'INDIVIDUAL', 'GOVERNMENT'],
      required: true,
    },
    recipientName: String,
    recipientContact: String,

    // المرجع والتوثيق
    referenceNumber: String,
    receipt: String, // URL للإيصال
    attachments: [String], // صور ووثائق إضافية

    // ملاحظات
    notes: String,

    // معلومات إضافية
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verificationDate: Date,

    timestamps: true,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'zakat_payments', timestamps: true }
);

/**
 * نموذج التنبيهات والتذكيرات (Zakat Reminders)
 * نظام إخطارات ذكي للزكاة
 */
const zakatReminderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    calculation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ZakatCalculation',
    },

    // نوع التذكير
    reminderType: {
      type: String,
      enum: ['NISAB_REACHED', 'YEAR_APPROACHING', 'OVERDUE', 'FIRST_REMINDER', 'FINAL_REMINDER'],
      required: true,
    },

    // معلومات التذكير
    title: String,
    message: String,
    zakatAmount: Number,
    daysUntilDue: Number,

    // حالة التذكير
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },

    // معلومات الإرسال
    sentDate: {
      type: Date,
      default: Date.now,
    },
    sentVia: {
      type: [String],
      enum: ['EMAIL', 'SMS', 'IN_APP', 'PUSH_NOTIFICATION'],
      default: ['IN_APP'],
    },

    timestamps: true,
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'zakat_reminders', timestamps: true }
);

/**
 * نموذج التقارير الزكاة (Zakat Reports)
 * تقارير تفصيلية وإحصائيات
 */
const zakatReportSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // فترة التقرير
    fromYear: Number,
    toYear: Number,
    reportType: {
      type: String,
      enum: ['ANNUAL', 'MULTI_YEAR', 'SUMMARY', 'DETAILED'],
      default: 'ANNUAL',
    },

    // إحصائيات
    statistics: {
      totalZakatDue: { type: Number, default: 0 },
      totalZakatPaid: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
      compliancePercentage: { type: Number, default: 0 },
      assetsValue: { type: Number, default: 0 },
    },

    // الملخص
    summary: String,

    // الملفات
    documentUrl: String, // URL لملف PDF
    generatedAt: { type: Date, default: Date.now },
  },
  { collection: 'zakat_reports', timestamps: true }
);

// ============================================================================
// 🎯 INDEXES FOR PERFORMANCE
// ============================================================================

zakatCalculationSchema.index({ user_id: 1, hijriYear: 1 });
zakatCalculationSchema.index({ user_id: 1, status: 1 });
zakatCalculationSchema.index({ zakatDueDate: 1 });

zakatPaymentSchema.index({ user_id: 1, paymentDate: 1 });
zakatPaymentSchema.index({ calculation_id: 1 });

zakatReminderSchema.index({ user_id: 1, isRead: 1 });
zakatReminderSchema.index({ user_id: 1, sentDate: 1 });

// ============================================================================
// 📤 EXPORT MODELS AND CONFIG
// ============================================================================

module.exports = {
  // Models
  ZakatCalculation: mongoose.models.ZakatCalculation || mongoose.model('ZakatCalculation', zakatCalculationSchema),
  ZakatPayment: mongoose.models.ZakatPayment || mongoose.model('ZakatPayment', zakatPaymentSchema),
  ZakatReminder: mongoose.models.ZakatReminder || mongoose.model('ZakatReminder', zakatReminderSchema),
  ZakatReport: mongoose.models.ZakatReport || mongoose.model('ZakatReport', zakatReportSchema),

  // Configuration
  ZAKAT_CONFIG,

  // Schemas
  assetSchema,
  zakatCalculationSchema,
  zakatPaymentSchema,
  zakatReminderSchema,
  zakatReportSchema,
};

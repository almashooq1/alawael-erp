/**
 * ===================================================================
 * ACCOUNTING SETTINGS MODEL - نموذج إعدادات النظام المحاسبي
 * ===================================================================
 */

const mongoose = require('mongoose');

const accountingSettingsSchema = new mongoose.Schema(
  {
    // معلومات الشركة
    companyInfo: {
      name: {
        type: String,
        required: true,
      },
      nameEn: String,
      taxNumber: {
        type: String,
        required: true,
      },
      commercialRegistration: String,
      address: String,
      phone: String,
      email: String,
      website: String,
      logo: String,
    },

    // العملة الأساسية
    baseCurrency: {
      type: String,
      default: 'SAR',
    },

    // السنة المالية
    fiscalYear: {
      startMonth: {
        type: Number,
        default: 1,
        min: 1,
        max: 12,
      },
      endMonth: {
        type: Number,
        default: 12,
        min: 1,
        max: 12,
      },
    },

    // الحسابات الافتراضية
    defaultAccounts: {
      cashAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      bankAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      accountsReceivableAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      accountsPayableAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      salesRevenueAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      purchaseExpenseAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      vatPayableAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      vatReceivableAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      retainedEarningsAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
    },

    // معدل الضريبة الافتراضي
    defaultTaxRate: {
      type: Number,
      default: 0.15,
    },

    // إعدادات الفواتير
    invoiceSettings: {
      prefix: {
        sales: { type: String, default: 'INV' },
        purchase: { type: String, default: 'PINV' },
      },
      dueDays: {
        type: Number,
        default: 30,
      },
      terms: String,
      footer: String,
    },

    // إعدادات الترقيم
    numberingSettings: {
      journalEntry: {
        prefix: { type: String, default: 'JE' },
        startFrom: { type: Number, default: 1 },
        padding: { type: Number, default: 6 },
      },
      payment: {
        prefix: { type: String, default: 'PAY' },
        startFrom: { type: Number, default: 1 },
        padding: { type: Number, default: 6 },
      },
      expense: {
        prefix: { type: String, default: 'EXP' },
        startFrom: { type: Number, default: 1 },
        padding: { type: Number, default: 6 },
      },
    },

    // إعدادات التقارير
    reportSettings: {
      dateFormat: {
        type: String,
        default: 'DD/MM/YYYY',
      },
      language: {
        type: String,
        enum: ['ar', 'en'],
        default: 'ar',
      },
      showZeroBalances: {
        type: Boolean,
        default: false,
      },
    },

    // إعدادات الأمان
    securitySettings: {
      requireApprovalForJournalEntries: {
        type: Boolean,
        default: false,
      },
      allowEditPostedEntries: {
        type: Boolean,
        default: false,
      },
      requireTwoFactorAuth: {
        type: Boolean,
        default: false,
      },
    },

    // معلومات التتبع
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AccountingSettings', accountingSettingsSchema);

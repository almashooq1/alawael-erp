/**
 * ChartOfAccounts Model — دليل الحسابات
 * Based on: chart_of_accounts table (prompt_02 §5.6)
 */
const mongoose = require('mongoose');

const ChartOfAccountsSchema = new mongoose.Schema(
  {
    // الحساب الأب (للشجرة الهرمية)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      default: null,
    },
    // رمز الحساب: 1000, 1100, 1110
    code: { type: String, required: true, unique: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, trim: true },
    // نوع الحساب
    type: {
      type: String,
      required: true,
      enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    },
    // طبيعة الحساب
    nature: {
      type: String,
      required: true,
      enum: ['debit', 'credit'],
    },
    // المستوى في الشجرة
    level: { type: Number, default: 1, min: 1 },
    // حساب رئيسي (له أبناء) أم ختامي (يقبل قيوداً)
    isParent: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    // حساب نظامي لا يمكن حذفه
    isSystem: { type: Boolean, default: false },
    // الرصيد الافتتاحي
    openingBalance: { type: Number, default: 0 },
    // الرصيد الحالي (يُحدَّث عند ترحيل القيود)
    currentBalance: { type: Number, default: 0 },
    // مركز التكلفة الافتراضي
    defaultCostCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
    description: { type: String },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    // كود VAT إذا وجد
    vatCode: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

ChartOfAccountsSchema.index({ type: 1 });
ChartOfAccountsSchema.index({ parent: 1 });
ChartOfAccountsSchema.index({ isActive: 1 });
ChartOfAccountsSchema.index({ branch: 1, type: 1 });

// جلب مسار الحساب الكامل (breadcrumb)
ChartOfAccountsSchema.methods.getPath = async function () {
  const path = [this.code + ' - ' + this.nameAr];
  let current = this;
  while (current.parent) {
    current = await mongoose.model('ChartOfAccounts').findById(current.parent).lean();
    if (!current) break;
    path.unshift(current.code + ' - ' + current.nameAr);
  }
  return path.join(' > ');
};

module.exports = mongoose.model('ChartOfAccounts', ChartOfAccountsSchema);

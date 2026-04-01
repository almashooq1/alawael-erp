/**
 * Nitaqat Models — نماذج نطاقات (وزارة الموارد البشرية)
 *
 * Schemas:
 * - NitaqatCalculation   — سجل حساب نطاقات لكل منشأة
 * - WpsRecord            — سجل حماية الأجور (WPS / مُدد)
 * - EmploymentContract   — عقود العمل الإلكترونية (قوى)
 * - NitaqatActivityParam — معاملات المعادلة اللوغاريتمية لكل نشاط
 */
const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════════════════════════════════════════
 * 1) NitaqatCalculation — حساب نطاقات
 * ═══════════════════════════════════════════════════════ */
const nitaqatCalculationSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    calculationDate: { type: Date, default: Date.now, index: true },
    economicActivityCode: { type: String, required: true, comment: 'رمز النشاط الاقتصادي' },
    economicActivityName: { type: String },
    subActivityCode: { type: String },

    // أعداد الموظفين
    totalEmployees: { type: Number, default: 0 },
    saudiEmployees: { type: Number, default: 0 },
    expatEmployees: { type: Number, default: 0 },
    saudiDisabled: { type: Number, default: 0, comment: 'سعوديون ذوو إعاقة' },
    saudiStudents: { type: Number, default: 0, comment: 'سعوديون طلاب (عمل جزئي)' },
    saudiRemote: { type: Number, default: 0, comment: 'سعوديون عمل عن بعد' },
    saudiBelow3000: { type: Number, default: 0, comment: 'راتب أقل من 3000' },
    saudi3000To4000: { type: Number, default: 0, comment: 'راتب 3000-4000' },
    saudiProbation: { type: Number, default: 0, comment: 'فترة تجربة (أول 3 أشهر)' },

    // الأوزان والنسب
    weightedSaudiCount: { type: Number, default: 0, comment: 'العدد المرجح للسعوديين' },
    saudizationPercentage: { type: Number, default: 0, comment: 'نسبة التوطين %' },

    // حدود النطاقات
    redMax: { type: Number, default: 0 },
    lowGreenMax: { type: Number, default: 0 },
    midGreenMax: { type: Number, default: 0 },
    highGreenMax: { type: Number, default: 0 },

    // النتيجة
    nitaqatBand: {
      type: String,
      enum: ['platinum', 'high_green', 'mid_green', 'low_green', 'red'],
      required: true,
      index: true,
    },
    previousBand: {
      type: String,
      enum: ['platinum', 'high_green', 'mid_green', 'low_green', 'red', null],
      default: null,
    },
    bandChanged: { type: Boolean, default: false },

    // التوصيات
    saudisNeededForNextBand: { type: Number, default: 0 },
    maxExpatsAllowed: { type: Number, default: 0 },
    recommendations: { type: Schema.Types.Mixed },

    calculatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

nitaqatCalculationSchema.index({ organization: 1, calculationDate: -1 });
nitaqatCalculationSchema.index({ nitaqatBand: 1, organization: 1 });

const NitaqatCalculation =
  mongoose.models.NitaqatCalculation ||
  mongoose.model('NitaqatCalculation', nitaqatCalculationSchema);

/* ═══════════════════════════════════════════════════════
 * 2) WpsRecord — سجل حماية الأجور (مُدد / WPS)
 * ═══════════════════════════════════════════════════════ */
const wpsRecordSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    period: { type: String, required: true, comment: 'YYYY-MM' }, // YYYY-MM
    totalEmployees: { type: Number, default: 0 },
    paidEmployees: { type: Number, default: 0 },
    unpaidEmployees: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    compliancePercentage: { type: Number, default: 0 },

    // ملف SIF
    bankFileReference: { type: String },
    sifFileContent: { type: String }, // محتوى الملف CSV
    uploadDate: { type: Date, comment: 'تاريخ الرفع على مُدد' },
    bankTransferDate: { type: Date },

    // حالة السجل
    status: {
      type: String,
      enum: [
        'pending',
        'file_generated',
        'uploaded',
        'processing',
        'compliant',
        'non_compliant',
        'discrepancy',
        'resolved',
      ],
      default: 'pending',
      index: true,
    },

    // التباينات والمبررات
    discrepancies: { type: Schema.Types.Mixed },
    justifications: { type: Schema.Types.Mixed },
    mudadNotes: { type: String },

    // إنشاء الملف
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

wpsRecordSchema.index({ organization: 1, period: 1 }, { unique: true });
wpsRecordSchema.index({ status: 1 });

const WpsRecord = mongoose.models.WpsRecord || mongoose.model('WpsRecord', wpsRecordSchema);

/* ═══════════════════════════════════════════════════════
 * 3) EmploymentContract — عقود العمل الإلكترونية (قوى)
 * ═══════════════════════════════════════════════════════ */
const employmentContractSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    contractNumber: { type: String, unique: true },
    qiwaContractId: { type: String, index: true, comment: 'معرف العقد في قوى' },

    // نوع العقد
    contractType: {
      type: String,
      enum: ['definite', 'indefinite', 'part_time', 'temporary', 'seasonal', 'remote'],
      required: true,
    },

    // التواريخ
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null, comment: 'null لغير محدد المدة' },
    probationEndDate: { type: Date },

    // بيانات الوظيفة
    jobTitleAr: { type: String, required: true },
    jobTitleEn: { type: String },
    occupationCode: { type: String },

    // الراتب والبدلات
    basicSalary: { type: Number, required: true },
    housingAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    totalSalary: { type: Number, required: true },

    // شروط العمل
    workingHoursPerWeek: { type: Number, default: 48 },
    annualLeaveDays: { type: Number, default: 21 },
    workLocation: { type: String },
    additionalTerms: { type: String },

    // حالة العقد
    status: {
      type: String,
      enum: [
        'draft',
        'pending_employee',
        'pending_employer',
        'active',
        'expired',
        'terminated',
        'cancelled',
        'pending_qiwa',
        'authenticated',
      ],
      default: 'draft',
      index: true,
    },

    // التواريخ والتوقيعات
    qiwaAuthenticationDate: { type: Date },
    employeeSignedDate: { type: Date },
    employerSignedDate: { type: Date },

    // بيانات إضافية
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

employmentContractSchema.index({ employee: 1, status: 1 });
employmentContractSchema.index({ organization: 1, status: 1 });

const EmploymentContract =
  mongoose.models.EmploymentContract ||
  mongoose.model('EmploymentContract', employmentContractSchema);

/* ═══════════════════════════════════════════════════════
 * 4) NitaqatActivityParam — معاملات المعادلة اللوغاريتمية
 * ═══════════════════════════════════════════════════════ */
const nitaqatActivityParamSchema = new Schema(
  {
    activityCode: { type: String, required: true, index: true },
    subActivityCode: { type: String, default: 'default' },
    activityName: { type: String },
    year: { type: Number, default: () => new Date().getFullYear() },
    // معاملات y = m * ln(x) + c لكل حد
    red: {
      m: { type: Number, default: 0 },
      c: { type: Number, default: 0 },
    },
    lowGreen: {
      m: { type: Number, default: 2.5 },
      c: { type: Number, default: 5 },
    },
    midGreen: {
      m: { type: Number, default: 2.5 },
      c: { type: Number, default: 15 },
    },
    highGreen: {
      m: { type: Number, default: 2.5 },
      c: { type: Number, default: 25 },
    },
    isActive: { type: Boolean, default: true },
    source: { type: String, default: 'MHRSD', comment: 'وزارة الموارد البشرية' },
  },
  { timestamps: true }
);

nitaqatActivityParamSchema.index(
  { activityCode: 1, subActivityCode: 1, year: 1 },
  { unique: true }
);

const NitaqatActivityParam =
  mongoose.models.NitaqatActivityParam ||
  mongoose.model('NitaqatActivityParam', nitaqatActivityParamSchema);

/* ═══════════════════════════════════════════════════════
 * Exports
 * ═══════════════════════════════════════════════════════ */
module.exports = {
  NitaqatCalculation,
  WpsRecord,
  EmploymentContract,
  NitaqatActivityParam,
};

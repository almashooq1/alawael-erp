/**
 * Employee Benefits & Allowances Model — إدارة المزايا والبدلات
 * Comprehensive benefits management: allowances, GOSI, insurance tiers,
 * air tickets for expats, and custom packages per grade
 */
const mongoose = require('mongoose');

// ── Benefit Package Definition ──
const BenefitPackageSchema = new mongoose.Schema(
  {
    packageCode: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    nameEn: { type: String },
    grade: { type: String }, // linked to employee grade/level
    description: { type: String },
    // ── Standard Allowances (% of basic or fixed) ──
    allowances: {
      housingAllowance: {
        type: { type: String, enum: ['نسبة', 'مبلغ ثابت'], default: 'نسبة' },
        value: { type: Number, default: 25 }, // 25% of basic or fixed amount
      },
      transportAllowance: {
        type: { type: String, enum: ['نسبة', 'مبلغ ثابت'], default: 'مبلغ ثابت' },
        value: { type: Number, default: 0 },
      },
      phoneAllowance: {
        type: { type: String, enum: ['نسبة', 'مبلغ ثابت'], default: 'مبلغ ثابت' },
        value: { type: Number, default: 0 },
      },
      foodAllowance: {
        type: { type: String, enum: ['نسبة', 'مبلغ ثابت'], default: 'مبلغ ثابت' },
        value: { type: Number, default: 0 },
      },
      natureOfWorkAllowance: {
        type: { type: String, enum: ['نسبة', 'مبلغ ثابت'], default: 'مبلغ ثابت' },
        value: { type: Number, default: 0 },
      },
      otherAllowances: [
        {
          name: { type: String },
          type: { type: String, enum: ['نسبة', 'مبلغ ثابت'] },
          value: { type: Number },
        },
      ],
    },
    // ── Insurance Tier ──
    medicalInsurance: {
      tier: {
        type: String,
        enum: ['أساسي', 'VIP', 'VVIP', 'بدون'],
        default: 'أساسي',
      },
      includesFamily: { type: Boolean, default: false },
      maxFamilyMembers: { type: Number, default: 0 },
      annualLimit: { type: Number },
      provider: { type: String },
    },
    // ── Air Tickets (Expat benefit) ──
    airTickets: {
      eligible: { type: Boolean, default: false },
      ticketsPerYear: { type: Number, default: 0 },
      class: {
        type: String,
        enum: ['اقتصادي', 'رجال أعمال', 'أولى'],
        default: 'اقتصادي',
      },
      includesFamily: { type: Boolean, default: false },
      maxAmount: { type: Number, default: 0 },
      destination: { type: String, default: 'بلد المنشأ' },
    },
    // ── Education Support ──
    educationSupport: {
      eligible: { type: Boolean, default: false },
      maxChildrenCount: { type: Number, default: 0 },
      maxAmountPerChild: { type: Number, default: 0 },
      annualLimit: { type: Number, default: 0 },
    },
    // ── Other Benefits ──
    annualLeave: { type: Number, default: 21 },
    sickLeave: { type: Number, default: 120 },
    endOfServiceBenefit: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Employee Benefit Assignment ──
const EmployeeBenefitSchema = new mongoose.Schema(
  {
    benefitNumber: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BenefitPackage',
    },
    // ── Effective Period ──
    effectiveDate: { type: Date, required: true },
    endDate: { type: Date },
    // ── Individual Allowances (override package if set) ──
    allowances: {
      housingAllowance: { type: Number },
      transportAllowance: { type: Number },
      phoneAllowance: { type: Number },
      foodAllowance: { type: Number },
      natureOfWorkAllowance: { type: Number },
      otherAllowances: [
        {
          name: { type: String },
          amount: { type: Number },
        },
      ],
      totalMonthlyAllowances: { type: Number },
    },
    // ── GOSI ──
    gosi: {
      registered: { type: Boolean, default: false },
      gosiNumber: { type: String },
      employeeContribution: { type: Number }, // 9.75% for Saudi
      employerContribution: { type: Number }, // 11.75% for Saudi, 2% for non-Saudi
      contributionBase: { type: Number }, // salary base for GOSI
      isSaudi: { type: Boolean },
    },
    // ── Medical Insurance ──
    medicalInsurance: {
      tier: { type: String },
      policyNumber: { type: String },
      provider: { type: String },
      startDate: { type: Date },
      endDate: { type: Date },
      dependents: [
        {
          name: { type: String },
          relationship: {
            type: String,
            enum: ['زوج/زوجة', 'ابن', 'ابنة', 'أب', 'أم'],
          },
          dateOfBirth: { type: Date },
          iqamaNumber: { type: String },
        },
      ],
    },
    // ── Air Tickets Usage ──
    airTicketUsage: [
      {
        year: { type: Number },
        usedTickets: { type: Number, default: 0 },
        remainingTickets: { type: Number },
        claims: [
          {
            destination: { type: String },
            travelDate: { type: Date },
            amount: { type: Number },
            status: {
              type: String,
              enum: ['مقدم', 'معتمد', 'صرف', 'مرفوض'],
            },
          },
        ],
      },
    ],
    // ── Education Claims ──
    educationClaims: [
      {
        year: { type: Number },
        childName: { type: String },
        schoolName: { type: String },
        amount: { type: Number },
        receiptUrl: { type: String },
        status: {
          type: String,
          enum: ['مقدم', 'معتمد', 'صرف', 'مرفوض'],
        },
      },
    ],
    // ── Adjustments History ──
    adjustmentHistory: [
      {
        type: { type: String },
        field: { type: String },
        previousValue: { type: Number },
        newValue: { type: Number },
        reason: { type: String },
        adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
      },
    ],
    // ── Status ──
    status: {
      type: String,
      enum: ['نشط', 'معلّق', 'منتهي'],
      default: 'نشط',
    },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Pre-save: calc total allowances ──
EmployeeBenefitSchema.pre('save', function (next) {
  const a = this.allowances;
  if (a) {
    const otherTotal = (a.otherAllowances || []).reduce((sum, o) => sum + (o.amount || 0), 0);
    a.totalMonthlyAllowances =
      (a.housingAllowance || 0) +
      (a.transportAllowance || 0) +
      (a.phoneAllowance || 0) +
      (a.foodAllowance || 0) +
      (a.natureOfWorkAllowance || 0) +
      otherTotal;
  }

  // Auto GOSI calc
  if (this.gosi?.contributionBase) {
    if (this.gosi.isSaudi) {
      this.gosi.employeeContribution = this.gosi.contributionBase * 0.0975;
      this.gosi.employerContribution = this.gosi.contributionBase * 0.1175;
    } else {
      this.gosi.employeeContribution = 0;
      this.gosi.employerContribution = this.gosi.contributionBase * 0.02;
    }
  }

  // Auto-generate number
  if (!this.benefitNumber) {
    const y = new Date().getFullYear();
    const r = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    this.benefitNumber = `BNF-${y}-${r}`;
  }
  next();
});

// ── Indexes ──
EmployeeBenefitSchema.index({ employeeId: 1, status: 1 });
EmployeeBenefitSchema.index({ packageId: 1 });

const BenefitPackage = mongoose.models.BenefitPackage || mongoose.model('BenefitPackage', BenefitPackageSchema);
const EmployeeBenefit = mongoose.models.EmployeeBenefit || mongoose.model('EmployeeBenefit', EmployeeBenefitSchema);

module.exports = { BenefitPackage, EmployeeBenefit };

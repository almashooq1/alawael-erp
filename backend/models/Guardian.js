/**
 * Guardian Model
 * نموذج ولي الأمر في بوابة المستفيد/ولي الأمر
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const GuardianSchema = new Schema(
  {
    // Basic Information المعلومات الأساسية
    firstName_ar: {
      type: String,
      required: [true, 'الاسم الأول (عربي) مطلوب'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    firstName_en: {
      type: String,
      required: [true, 'First Name (English) is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    lastName_ar: {
      type: String,
      required: [true, 'الاسم الأخير (عربي) مطلوب'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    lastName_en: {
      type: String,
      required: [true, 'Last Name (English) is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'البريد الإلكتروني مطلوب'],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'صيغة البريد غير صحيحة'],
    },
    phone: {
      type: String,
      required: [true, 'رقم الهاتف مطلوب'],
      match: [/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'صيغة الهاتف غير صحيحة'],
    },
    alternatePhone: String,
    profilePhoto: {
      type: String,
      default: null,
    },

    // Relationship معلومات العلاقة
    relationship: {
      type: String,
      enum: ['father', 'mother', 'grandfather', 'grandmother', 'uncle', 'aunt', 'brother', 'sister', 'cousin', 'legal_guardian', 'other'],
      required: [true, 'العلاقة مطلوبة'],
    },
    beneficiaries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Beneficiary',
      },
    ],

    // Address Information معلومات العنوان
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    homePhone: String,

    // Identity معلومات الهوية
    idNumber: {
      type: String,
      required: [true, 'رقم الهوية مطلوب'],
      unique: true,
    },
    idType: {
      type: String,
      enum: ['national_id', 'passport', 'driver_license', 'other'],
      default: 'national_id',
    },
    idExpiryDate: Date,

    // Occupation المهنة
    occupation: String,
    company: String,
    workPhone: String,
    workEmail: String,

    // Emergency Contact معلومات الاتصال الطارئ
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },

    // Account Information معلومات الحساب
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    accountStatus: {
      type: String,
      enum: ['verified', 'unverified', 'blocked'],
      default: 'unverified',
    },
    accountType: {
      type: String,
      enum: ['primary', 'secondary'],
      default: 'primary',
    },
    lastLoginAt: Date,

    // Notification Preferences تفضيلات الإشعارات
    notificationPreference: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly',
      },
      notificationTypes: {
        attendance: { type: Boolean, default: true },
        grades: { type: Boolean, default: true },
        payment: { type: Boolean, default: true },
        behavior: { type: Boolean, default: true },
        events: { type: Boolean, default: true },
        general: { type: Boolean, default: true },
      },
    },

    // Payment Information معلومات الدفع
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash'],
      default: null,
    },
    bankAccount: {
      accountHolder: String,
      accountNumber: String,
      bankName: String,
      IBAN: String,
    },

    // Preferences التفضيلات
    language: {
      type: String,
      enum: ['ar', 'en'],
      default: 'ar',
    },
    timezone: {
      type: String,
      default: 'Asia/Dubai',
    },

    // Status الحالة
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: String,
    verificationCodeExpiresAt: Date,

    // Financial Summary ملخص مالي
    totalPaid: {
      type: Number,
      default: 0,
    },
    totalDue: {
      type: Number,
      default: 0,
    },
    totalOverdue: {
      type: Number,
      default: 0,
    },

    // Audit Trail
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    collection: 'guardians',
  }
);

// Indexes
GuardianSchema.index({ email: 1 });
GuardianSchema.index({ idNumber: 1 });
GuardianSchema.index({ beneficiaries: 1 });
GuardianSchema.index({ accountStatus: 1 });
GuardianSchema.index({ createdAt: -1 });

// Virtuals
GuardianSchema.virtual('fullName_ar').get(function () {
  return `${this.firstName_ar} ${this.lastName_ar}`;
});

GuardianSchema.virtual('fullName_en').get(function () {
  return `${this.firstName_en} ${this.lastName_en}`;
});

GuardianSchema.virtual('beneficiaryCount').get(function () {
  return this.beneficiaries ? this.beneficiaries.length : 0;
});

GuardianSchema.virtual('outstandingBalance').get(function () {
  return (this.totalDue || 0) + (this.totalOverdue || 0);
});

GuardianSchema.virtual('financialStatus').get(function () {
  if (this.totalOverdue > 0) return 'overdue';
  if (this.totalDue > 0) return 'pending';
  return 'clear';
});

// Static Methods
GuardianSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

GuardianSchema.statics.getActiveGuardians = function () {
  return this.find({
    isActive: true,
    accountStatus: 'verified',
    deletedAt: null,
  }).populate('beneficiaries');
};

GuardianSchema.statics.getVerifiedGuardians = function () {
  return this.find({
    isVerified: true,
    isActive: true,
    deletedAt: null,
  }).sort({ createdAt: -1 });
};

GuardianSchema.statics.getByRelationship = function (relationship) {
  return this.find({
    relationship,
    isActive: true,
    deletedAt: null,
  });
};

GuardianSchema.statics.searchByName = function (name) {
  return this.find({
    $or: [
      { firstName_ar: new RegExp(name, 'i') },
      { lastName_ar: new RegExp(name, 'i') },
      { firstName_en: new RegExp(name, 'i') },
      { lastName_en: new RegExp(name, 'i') },
    ],
    isActive: true,
  });
};

GuardianSchema.statics.getByPrimaryContact = function (email) {
  return this.findOne({
    email,
    accountType: 'primary',
  }).populate('beneficiaries');
};

GuardianSchema.statics.getUnverified = function () {
  return this.find({
    isVerified: false,
    isActive: true,
  }).sort({ createdAt: -1 });
};

// Instance Methods
GuardianSchema.methods.addBeneficiary = async function (beneficiaryId) {
  if (!this.beneficiaries.includes(beneficiaryId)) {
    this.beneficiaries.push(beneficiaryId);
    return this.save();
  }
  return this;
};

GuardianSchema.methods.removeBeneficiary = async function (beneficiaryId) {
  this.beneficiaries = this.beneficiaries.filter((id) => !id.equals(beneficiaryId));
  return this.save();
};

GuardianSchema.methods.linkBeneficiary = async function (beneficiaryId) {
  const Beneficiary = mongoose.model('Beneficiary');
  const beneficiary = await Beneficiary.findById(beneficiaryId);

  if (!beneficiary) {
    throw new Error('المستفيد غير موجود');
  }

  await this.addBeneficiary(beneficiaryId);
  if (!beneficiary.guardians.includes(this._id)) {
    beneficiary.guardians.push(this._id);
    await beneficiary.save();
  }

  return this;
};

GuardianSchema.methods.unlinkBeneficiary = async function (beneficiaryId) {
  const Beneficiary = mongoose.model('Beneficiary');
  const beneficiary = await Beneficiary.findById(beneficiaryId);

  await this.removeBeneficiary(beneficiaryId);
  if (beneficiary && beneficiary.guardians.includes(this._id)) {
    beneficiary.guardians = beneficiary.guardians.filter((id) => !id.equals(this._id));
    await beneficiary.save();
  }

  return this;
};

GuardianSchema.methods.getBeneficiaries = function () {
  return this.populate({
    path: 'beneficiaries',
    select: 'firstName_ar lastName_ar email academicScore attendanceRate status profilePhoto',
  });
};

GuardianSchema.methods.verifyEmail = async function (code) {
  if (this.verificationCode !== code) {
    throw new Error('الرمز غير صحيح');
  }

  if (new Date() > this.verificationCodeExpiresAt) {
    throw new Error('انتهت صلاحية الرمز');
  }

  this.isVerified = true;
  this.accountStatus = 'verified';
  this.verificationCode = null;
  this.verificationCodeExpiresAt = null;

  return this.save();
};

GuardianSchema.methods.generateVerificationCode = async function () {
  this.verificationCode = Math.random().toString().substring(2, 8);
  this.verificationCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return this.save();
};

GuardianSchema.methods.updateFinancialSummary = async function () {
  const Payment = mongoose.model('Payment');

  const payments = await Payment.aggregate([
    { $match: { guardianId: this._id } },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
        totalDue: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
        totalOverdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$amount', 0] } },
      },
    },
  ]);

  if (payments.length > 0) {
    this.totalPaid = payments[0].totalPaid || 0;
    this.totalDue = payments[0].totalDue || 0;
    this.totalOverdue = payments[0].totalOverdue || 0;
  }

  return this.save();
};

GuardianSchema.methods.deactivateAccount = async function () {
  this.isActive = false;
  this.accountStatus = 'blocked';
  this.deletedAt = new Date();
  return this.save();
};

GuardianSchema.methods.activateAccount = async function () {
  this.isActive = true;
  this.accountStatus = 'verified';
  this.deletedAt = null;
  return this.save();
};

// Middleware
GuardianSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Guardian', GuardianSchema);

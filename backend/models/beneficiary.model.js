/**
 * Beneficiary Model
 * نموذج المستفيدين لمراكز تأهيل ذوي الإعاقة
 *
 * @description نموذج شامل لإدارة بيانات المستفيدين الشخصية والعائلية
 * @version 1.0.0
 * @date 2026-01-30
 */

const mongoose = require('mongoose');

// تعريف Schema الفرعي لبيانات العائلة
const familyMemberSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      required: true,
      enum: [
        'father',
        'mother',
        'brother',
        'sister',
        'grandfather',
        'grandmother',
        'uncle',
        'aunt',
        'guardian',
        'spouse',
        'other',
      ],
    },
    dateOfBirth: Date,
    nationalId: String,
    occupation: String,
    education: String,
    phone: String,
    email: String,
    isEmergencyContact: {
      type: Boolean,
      default: false,
    },
    isPrimaryCaregiver: {
      type: Boolean,
      default: false,
    },
    hasLegalGuardianship: {
      type: Boolean,
      default: false,
    },
    notes: String,
  },
  { _id: false }
);

// تعريف Schema الفرعي لجهات الاتصال في حالات الطوارئ
const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    alternatePhone: String,
    email: String,
    address: String,
    priority: {
      type: Number,
      default: 1,
    },
    isAvailable24_7: {
      type: Boolean,
      default: true,
    },
    notes: String,
  },
  { _id: false }
);

// تعريف Schema الفرعي للعنوان
const addressSchema = new mongoose.Schema(
  {
    street: String,
    district: String,
    city: {
      type: String,
      required: true,
    },
    state: String,
    country: {
      type: String,
      default: 'Saudi Arabia',
    },
    postalCode: String,
    buildingNumber: String,
    additionalInfo: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  { _id: false }
);

// تعريف Schema الرئيسي للمستفيد
const beneficiarySchema = new mongoose.Schema(
  {
    // معلومات شخصية أساسية
    firstName: {
      type: String,
      required: [true, 'الاسم الأول مطلوب'],
      trim: true,
      index: true,
    },

    middleName: {
      type: String,
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, 'اسم العائلة مطلوب'],
      trim: true,
      index: true,
    },

    fullNameArabic: {
      type: String,
      trim: true,
    },

    fullNameEnglish: {
      type: String,
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      required: [true, 'تاريخ الميلاد مطلوب'],
      index: true,
    },

    gender: {
      type: String,
      required: true,
      enum: ['male', 'female'],
      index: true,
    },

    nationalId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    passportNumber: {
      type: String,
      sparse: true,
      trim: true,
    },

    nationality: {
      type: String,
      default: 'Saudi',
    },

    religion: {
      type: String,
      enum: ['Muslim', 'Christian', 'Jewish', 'Other', 'Prefer not to say'],
      default: 'Muslim',
    },

    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },

    // معلومات الاتصال
    contactInfo: {
      primaryPhone: {
        type: String,
        required: true,
        trim: true,
      },
      alternatePhone: String,
      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
      preferredContactMethod: {
        type: String,
        enum: ['phone', 'email', 'sms', 'whatsapp'],
        default: 'phone',
      },
    },

    // العنوان
    address: addressSchema,

    // معلومات العائلة
    familyMembers: [familyMemberSchema],

    // جهات الاتصال في حالات الطوارئ
    emergencyContacts: {
      type: [emergencyContactSchema],
      validate: [arr => arr.length >= 1, 'يجب إضافة جهة اتصال واحدة على الأقل للطوارئ'],
    },

    // معلومات السكن
    housingInfo: {
      type: {
        type: String,
        enum: ['own', 'rent', 'family_owned', 'government_housing', 'other'],
        default: 'own',
      },
      hasSpecialAccommodations: {
        type: Boolean,
        default: false,
      },
      accommodationDetails: String,
      transportationMethod: {
        type: String,
        enum: ['private_car', 'public_transport', 'special_needs_transport', 'walking', 'other'],
        default: 'private_car',
      },
      needsTransportationAssistance: {
        type: Boolean,
        default: false,
      },
    },

    // معلومات اجتماعية واقتصادية
    socialEconomicInfo: {
      familyIncome: {
        type: String,
        enum: ['very_low', 'low', 'medium', 'high', 'prefer_not_to_say'],
        default: 'prefer_not_to_say',
      },
      numberOfFamilyMembers: Number,
      numberOfDependents: Number,
      primaryCaregiverEmploymentStatus: {
        type: String,
        enum: ['employed', 'unemployed', 'self_employed', 'retired', 'homemaker', 'student'],
        default: 'employed',
      },
      receivesGovernmentAssistance: {
        type: Boolean,
        default: false,
      },
      assistanceDetails: String,
    },

    // التأمين الصحي
    insuranceInfo: {
      hasInsurance: {
        type: Boolean,
        default: false,
      },
      provider: String,
      policyNumber: String,
      groupNumber: String,
      policyHolderName: String,
      policyHolderRelationship: String,
      coverageStartDate: Date,
      coverageEndDate: Date,
      coverageType: {
        type: String,
        enum: ['full', 'partial', 'basic'],
        default: 'basic',
      },
      copayAmount: Number,
      deductible: Number,
      notes: String,
    },

    // الصورة الشخصية
    profilePhoto: {
      url: String,
      filename: String,
      uploadDate: Date,
    },

    // المستندات المرفقة
    documents: [
      {
        title: String,
        category: {
          type: String,
          enum: ['identification', 'medical', 'legal', 'financial', 'other'],
        },
        filename: String,
        url: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
        expiryDate: Date,
      },
    ],

    // حالة المستفيد
    status: {
      type: String,
      enum: ['active', 'inactive', 'transferred', 'deceased', 'graduated'],
      default: 'active',
      index: true,
    },

    // تاريخ التسجيل
    registrationDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // معلومات التفضيلات
    preferences: {
      language: {
        type: String,
        enum: ['ar', 'en', 'both'],
        default: 'ar',
      },
      communicationPreference: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'as_needed'],
        default: 'weekly',
      },
      notificationPreferences: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        whatsapp: {
          type: Boolean,
          default: false,
        },
      },
      culturalConsiderations: String,
      dietaryRestrictions: [String],
      allergies: [String],
    },

    // معلومات النظام
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // ملاحظات عامة
    generalNotes: String,

    // الحالات المرتبطة (للربط)
    casesCount: {
      type: Number,
      default: 0,
    },

    // الأرشفة
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedDate: Date,
    archivedReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes لتحسين الأداء (single field indexes are defined with index: true in schema)
beneficiarySchema.index({ firstName: 1, lastName: 1 });
beneficiarySchema.index({ 'contactInfo.primaryPhone': 1 });
beneficiarySchema.index({ registrationDate: -1 });

// Virtual للحصول على الاسم الكامل
beneficiarySchema.virtual('fullName').get(function () {
  const parts = [this.firstName];
  if (this.middleName) parts.push(this.middleName);
  parts.push(this.lastName);
  return parts.join(' ');
});

// Virtual للحصول على العمر
beneficiarySchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual للحصول على العمر بالأشهر (للأطفال)
beneficiarySchema.virtual('ageInMonths').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  const months =
    (today.getFullYear() - birthDate.getFullYear()) * 12 +
    (today.getMonth() - birthDate.getMonth());
  return months;
});

// Virtual للحصول على جهة الاتصال الأساسية للطوارئ
beneficiarySchema.virtual('primaryEmergencyContact').get(function () {
  if (!this.emergencyContacts || this.emergencyContacts.length === 0) return null;
  return this.emergencyContacts.sort((a, b) => a.priority - b.priority)[0];
});

// Virtual للحصول على ولي الأمر الأساسي
beneficiarySchema.virtual('primaryGuardian').get(function () {
  if (!this.familyMembers || this.familyMembers.length === 0) return null;
  return (
    this.familyMembers.find(member => member.hasLegalGuardianship) ||
    this.familyMembers.find(member => member.isPrimaryCaregiver)
  );
});

// Pre-save middleware للتحقق من البيانات
beneficiarySchema.pre('save', function (next) {
  // إنشاء الاسم الكامل بالعربية والإنجليزية إذا لم يكن موجوداً
  if (!this.fullNameArabic) {
    this.fullNameArabic = this.fullName;
  }

  // ترتيب جهات الاتصال حسب الأولوية
  if (this.emergencyContacts && this.emergencyContacts.length > 1) {
    this.emergencyContacts.sort((a, b) => a.priority - b.priority);
  }

  next();
});

// Static method للبحث المتقدم
beneficiarySchema.statics.advancedSearch = function (filters) {
  const query = {};

  if (filters.name) {
    query.$or = [
      { firstName: new RegExp(filters.name, 'i') },
      { lastName: new RegExp(filters.name, 'i') },
      { fullNameArabic: new RegExp(filters.name, 'i') },
    ];
  }

  if (filters.nationalId) {
    query.nationalId = filters.nationalId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.gender) {
    query.gender = filters.gender;
  }

  if (filters.minAge || filters.maxAge) {
    const now = new Date();
    if (filters.maxAge) {
      const minDate = new Date(
        now.getFullYear() - filters.maxAge - 1,
        now.getMonth(),
        now.getDate()
      );
      query.dateOfBirth = { $gte: minDate };
    }
    if (filters.minAge) {
      const maxDate = new Date(now.getFullYear() - filters.minAge, now.getMonth(), now.getDate());
      query.dateOfBirth = { ...query.dateOfBirth, $lte: maxDate };
    }
  }

  if (filters.city) {
    query['address.city'] = new RegExp(filters.city, 'i');
  }

  if (filters.isArchived !== undefined) {
    query.isArchived = filters.isArchived;
  }

  return this.find(query)
    .populate('createdBy', 'firstName lastName')
    .sort(filters.sort || { registrationDate: -1 })
    .limit(filters.limit || 50);
};

// Instance method للحصول على ملخص المستفيد
beneficiarySchema.methods.getSummary = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    age: this.age,
    gender: this.gender,
    nationalId: this.nationalId,
    status: this.status,
    primaryPhone: this.contactInfo.primaryPhone,
    city: this.address.city,
    registrationDate: this.registrationDate,
    casesCount: this.casesCount,
  };
};

// Instance method للتحقق من صلاحية التأمين
beneficiarySchema.methods.isInsuranceValid = function () {
  if (!this.insuranceInfo.hasInsurance) return false;
  if (!this.insuranceInfo.coverageEndDate) return true;
  return new Date(this.insuranceInfo.coverageEndDate) > new Date();
};

// Instance method لأرشفة المستفيد
beneficiarySchema.methods.archive = function (reason) {
  this.isArchived = true;
  this.archivedDate = new Date();
  this.archivedReason = reason;
  this.status = 'inactive';
  return this.save();
};

// Instance method لاستعادة من الأرشيف
beneficiarySchema.methods.unarchive = function () {
  this.isArchived = false;
  this.archivedDate = null;
  this.archivedReason = null;
  this.status = 'active';
  return this.save();
};

const Beneficiary = mongoose.model('Beneficiary', beneficiarySchema);

module.exports = Beneficiary;

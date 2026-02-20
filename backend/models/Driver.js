/**
 * Driver Model - نموذج السائق الشامل
 * يتضمن جميع المعلومات الشخصية والقانونية والأداء
 */

const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    // ===== معلومات شخصية =====
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: [true, 'الاسم الأول مطلوب'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'الاسم الأخير مطلوب'],
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    personalPhone: {
      type: String,
      required: true,
    },
    alternatePhone: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    nationality: String,
    identityNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    identityExpiry: Date,

    // ===== معلومات العمل =====
    employeeId: {
      type: String,
      unique: true,
      required: true,
      sparse: true,
    },
    hireDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'on_leave', 'suspended', 'inactive', 'retired'],
      default: 'active',
    },
    department: {
      type: String,
      default: 'Transportation',
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // ===== معلومات الرخصة القيادة =====
    licenseDetails: {
      licenseNumber: {
        type: String,
        required: true,
        unique: true,
      },
      licenseType: {
        type: String,
        enum: ['B', 'C', 'D', 'E', 'BE', 'CE', 'DE'],
        required: true,
      },
      issueDate: Date,
      expiryDate: {
        type: Date,
        required: true,
      },
      issuingAuthority: String,
      country: String,
      // التحقق من صلاحية الرخصة
      isValid: {
        type: Boolean,
        default: true,
      },
    },

    // ===== شهادات وتدريبات =====
    certifications: [
      {
        name: {
          type: String,
          enum: [
            'Basic Driver Training',
            'Advanced Driving',
            'Defensive Driving',
            'Passenger Safety',
            'Cargo Handling',
            'Hazmat Transport',
            'CPR/First Aid',
            'Vehicle Maintenance',
            'GPS Navigation',
            'Customer Service',
          ],
        },
        issueDate: Date,
        expiryDate: Date,
        certificateNumber: String,
        provider: String,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // ===== معلومات عن السيارات المخصصة =====
    assignedVehicles: [
      {
        vehicle: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vehicle',
        },
        assignmentDate: Date,
        unassignmentDate: Date,
        status: {
          type: String,
          enum: ['active', 'inactive'],
          default: 'active',
        },
      },
    ],

    // ===== معلومات العنوان =====
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      nearbyLandmark: String,
    },

    // ===== البيانات المصرفية =====
    bankDetails: {
      bankName: String,
      accountNumber: {
        type: String,
        // تشفير بيانات الحساب البنكي
      },
      iban: String,
      accountHolderName: String,
    },

    // ===== معلومات الطوارئ =====
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      email: String,
    },

    // ===== تقييم الأداء =====
    performance: {
      overallRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      safetyScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      reliabilityScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      customerServiceScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      fuelEfficiencyScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      maintenanceScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      attendanceScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      lastAssessmentDate: Date,
    },

    // ===== تتبع السلوك والانتهاكات =====
    violations: {
      speedingIncidents: {
        type: Number,
        default: 0,
      },
      harshBraking: {
        type: Number,
        default: 0,
      },
      harshAcceleration: {
        type: Number,
        default: 0,
      },
      distraction: {
        type: Number,
        default: 0,
      },
      seatbeltViolations: {
        type: Number,
        default: 0,
      },
      trafficViolations: {
        type: Number,
        default: 0,
      },
      accidents: {
        type: Number,
        default: 0,
      },
      unauthorizedStops: {
        type: Number,
        default: 0,
      },
      totalViolations: {
        type: Number,
        default: 0,
      },
      lastViolationDate: Date,
    },

    // ===== إحصائيات العمل =====
    statistics: {
      totalTrips: {
        type: Number,
        default: 0,
      },
      completedTrips: {
        type: Number,
        default: 0,
      },
      cancelledTrips: {
        type: Number,
        default: 0,
      },
      totalHoursWorked: {
        type: Number,
        default: 0,
      },
      totalKilometersDriven: {
        type: Number,
        default: 0,
      },
      averagePassengerRating: {
        type: Number,
        default: 0,
      },
      onTimePercentage: {
        type: Number,
        default: 0,
      },
      lastTripDate: Date,
    },

    // ===== الحالة الصحية والعافية =====
    health: {
      medicalCheckup: {
        lastDate: Date,
        nextDate: Date,
        status: {
          type: String,
          enum: ['cleared', 'restricted', 'pending', 'failed'],
          default: 'pending',
        },
      },
      drinkingDriving: {
        lastTest: Date,
        result: String,
      },
      blindspotCheck: {
        lastTest: Date,
        result: String,
      },
      visionTest: {
        lastTest: Date,
        result: String,
        correction: String, // نوع التصحيح إن وجد
      },
      drugTest: {
        lastTest: Date,
        result: String,
      },
    },

    // ===== التدريب والتطوير =====
    training: {
      lastTrainingDate: Date,
      trainingType: String,
      trainingDueDate: Date,
      currentLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'beginner',
      },
    },

    // ===== أيام الراحة والطلبات =====
    schedule: {
      workingDays: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      offDays: [String],
      preferredShift: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'night', 'flexible'],
        default: 'flexible',
      },
      maxHoursPerDay: {
        type: Number,
        default: 10,
      },
    },

    // ===== الإجازات والعطل =====
    leaves: {
      totalAnnualLeave: {
        type: Number,
        default: 20,
      },
      usedLeave: {
        type: Number,
        default: 0,
      },
      remainingLeave: {
        type: Number,
        default: 20,
      },
      sickLeave: {
        type: Number,
        default: 0,
      },
      emergencyLeave: {
        type: Number,
        default: 0,
      },
    },

    // ===== السلامة والتأمين =====
    insurance: {
      policyNumber: String,
      provider: String,
      expiryDate: Date,
      coverageAmount: Number,
      policyDocument: String, // رابط المستند
    },

    safetyCompliance: {
      safetyBriefingDate: Date,
      safetyTrainingDate: Date,
      vehicleInspectionStatus: String,
    },

    // ===== الملاحظات والتقارير =====
    notes: String,
    reportHistory: [
      {
        date: Date,
        reportType: String,
        content: String,
        reportedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // ===== البيانات الذكية =====
    aiMetrics: {
      predictedAbsenceRate: {
        type: Number,
        default: 0,
      },
      predictedPerformanceTrend: {
        type: String,
        enum: ['improving', 'stable', 'declining'],
        default: 'stable',
      },
      trainingRecommendations: [String],
      riskFactors: [String],
      strengths: [String],
    },

    // ===== حالة النظام =====
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActivityDate: Date,
    deactivationReason: String,
    deactivationDate: Date,

    // ===== البيانات الوصفية =====
    metadata: {
      document1: String,
      document2: String,
      document3: String,
      notes: String,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ===== Virtuals =====
driverSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

driverSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - this.dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())) {
    age--;
  }
  return age;
});

driverSchema.virtual('experienceInYears').get(function () {
  if (!this.hireDate) return 0;
  const today = new Date();
  let years = today.getFullYear() - this.hireDate.getFullYear();
  const monthDiff = today.getMonth() - this.hireDate.getMonth();
  if (monthDiff < 0) {
    years--;
  }
  return years;
});

driverSchema.virtual('daysUntilLicenseExpiry').get(function () {
  if (!this.licenseDetails || !this.licenseDetails.expiryDate) return null;
  const today = new Date();
  const diffTime = this.licenseDetails.expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// ===== Indexes =====
driverSchema.index({ userId: 1 });
driverSchema.index({ employeeId: 1 });
driverSchema.index({ 'licenseDetails.licenseNumber': 1 });
driverSchema.index({ status: 1 });
driverSchema.index({ 'performance.overallRating': 1 });
driverSchema.index({ createdAt: -1 });

// ===== Methods =====

/**
 * حساب درجة الأداء الكلية
 */
driverSchema.methods.calculateOverallRating = function () {
  const {
    safetyScore = 0,
    reliabilityScore = 0,
    customerServiceScore = 0,
    fuelEfficiencyScore = 0,
    maintenanceScore = 0,
    attendanceScore = 0,
  } = this.performance;

  // الأوزان
  const weights = {
    safety: 0.3,
    reliability: 0.2,
    customerService: 0.2,
    fuelEfficiency: 0.1,
    maintenance: 0.1,
    attendance: 0.1,
  };

  const overall =
    (safetyScore * weights.safety +
      reliabilityScore * weights.reliability +
      customerServiceScore * weights.customerService +
      fuelEfficiencyScore * weights.fuelEfficiency +
      maintenanceScore * weights.maintenance +
      attendanceScore * weights.attendance) /
    100;

  this.performance.overallRating = Math.round(overall * 10) / 10;
  return this.performance.overallRating;
};

/**
 * التحقق من صلاحية الرخصة
 */
driverSchema.methods.isLicenseValid = function () {
  if (!this.licenseDetails || !this.licenseDetails.expiryDate) {
    return false;
  }
  return this.licenseDetails.expiryDate > new Date();
};

/**
 * الحصول على كل الشهادات الصالحة
 */
driverSchema.methods.getActiveCertifications = function () {
  const today = new Date();
  return this.certifications.filter(
    (cert) => cert.isActive && (!cert.expiryDate || cert.expiryDate > today)
  );
};

/**
 * تحديث إحصائيات العمل
 */
driverSchema.methods.updateStatistics = async function (tripData) {
  this.statistics.totalTrips += 1;
  if (tripData.status === 'completed') {
    this.statistics.completedTrips += 1;
  }
  if (tripData.duration) {
    this.statistics.totalHoursWorked += tripData.duration;
  }
  if (tripData.distance) {
    this.statistics.totalKilometersDriven += tripData.distance;
  }
  this.statistics.lastTripDate = new Date();
  await this.save();
};

/**
 * إضافة انتهاك
 */
driverSchema.methods.addViolation = async function (violationType) {
  if (this.violations[violationType] !== undefined) {
    this.violations[violationType] += 1;
  }
  this.violations.totalViolations += 1;
  this.violations.lastViolationDate = new Date();
  await this.save();
};

module.exports = mongoose.model('Driver', driverSchema);

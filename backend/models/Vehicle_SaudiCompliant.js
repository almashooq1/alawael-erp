/**
 * Vehicle Model - السعودي المحدّث
 * نموذج بيانات المركبة مع معايير التوافق السعودية
 *
 * يتضمن:
 * ✅ معايير المرور السعودية
 * ✅ فئات الرخص السعودية
 * ✅ معايير الفحص الدوري
 * ✅ معايير البيانات السعودية
 * ✅ الامتثال الضريبي والمالي
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const vehicleSchema = new mongoose.Schema(
  {
    // ====== معلومات أساسية ======
    registrationNumber: {
      type: String,
      required: [true, 'رقم التسجيل مطلوب'],
      unique: true,
      uppercase: true,
      match: [/^[ض-ي]{2}\d{4}[ض-ي]{2}$/, 'صيغة رقم التسجيل غير صحيحة'],
      index: true,
      comment: 'رقم التسجيل بالصيغة السعودية (مثال: ض م 4567 ض س)',
    },

    plateNumber: {
      type: String,
      required: true,
      unique: true,
      comment: 'رقم اللوحة المعدنية',
    },

    // ====== بيانات المركبة ======
    basicInfo: {
      make: {
        type: String,
        required: [true, 'صانع المركبة مطلوب'],
        comment: 'الماركة (مثال: تويوتا، نيسان)',
      },
      model: {
        type: String,
        required: [true, 'موديل المركبة مطلوب'],
        comment: 'الموديل (مثال: كامري، ألتيما)',
      },
      year: {
        type: Number,
        required: [true, 'سنة الصنع مطلوبة'],
        min: [1990, 'السنة لا يمكن أن تكون قبل 1990'],
        max: [new Date().getFullYear() + 1, 'السنة لا يمكن أن تكون في المستقبل'],
      },
      vin: {
        type: String,
        required: [true, 'رقم الهيكل VIN مطلوب'],
        unique: true,
        length: 17,
        comment: 'رقم الهيكل الدولي (17 حرف)',
      },
      engineNumber: {
        type: String,
        required: true,
        unique: true,
        comment: 'رقم المحرك',
      },
      color: {
        type: String,
        required: true,
        enum: ['أبيض', 'أسود', 'فضي', 'رمادي', 'بني', 'أحمر', 'أزرق', 'أخضر', 'ذهبي'],
        comment: 'لون المركبة',
      },
      type: {
        type: String,
        required: true,
        enum: ['سيارة خاصة', 'سيارة تجارية', 'حافلة', 'شاحنة', 'دراجة نارية', 'أخرى'],
        comment: 'نوع المركبة',
      },
      category: {
        type: String,
        required: true,
        enum: ['A', 'B', 'C', 'D', 'E', 'M'],
        comment: 'فئة الرخصة المطلوبة',
      },
      bodyType: {
        type: String,
        enum: ['سيدان', 'SUV', 'كوبيه', 'هاتشباك', 'ستيشن وغن', 'بيك أب', 'حافلة', 'شاحنة'],
        comment: 'نوع الهيكل',
      },
      transmission: {
        type: String,
        enum: ['يدوي', 'أوتوماتيك'],
        comment: 'نوع ناقل الحركة',
      },
      fuelType: {
        type: String,
        enum: ['بنزين', 'ديزل', 'كهربائي', 'هجين'],
        required: true,
        comment: 'نوع الوقود',
      },
      engineCapacity: {
        type: Number,
        comment: 'سعة المحرك بالـ CC',
      },
      seatingCapacity: {
        type: Number,
        required: true,
        min: 1,
        max: 100,
        comment: 'عدد مقاعد الركاب (شامل السائق)',
      },
      cargoCapacity: {
        type: Number,
        comment: 'سعة الحمولة بالكيلوجرام',
      },
      weight: {
        type: Number,
        comment: 'وزن المركبة بالكيلوجرام',
      },
    },

    // ====== معلومات التسجيل السعودي ======
    registration: {
      expiryDate: {
        type: Date,
        required: [true, 'تاريخ انتهاء التسجيل مطلوب'],
        // index: true - removed to avoid duplicate
        comment: 'تاريخ انتهاء التسجيل في المرور',
      },
      officeCode: {
        type: String,
        required: true,
        enum: ['الرياض', 'جدة', 'الدمام', 'الأحساء', 'مكة', 'المدينة', 'الطائف', 'أخرى'],
        comment: 'إدارة المرور المسجلة بها المركبة',
      },
      registrationStatus: {
        type: String,
        enum: ['ساري', 'منتهي', 'مركقوف', 'مرفوع'],
        default: 'ساري',
        comment: 'حالة التسجيل',
      },
      registrationCategory: {
        type: String,
        enum: ['سيارة خاصة', 'تأجير', 'نقل', 'خدمات عامة', 'حكومية', 'دبلوماسية'],
        comment: 'فئة التسجيل',
      },
      registrationFees: {
        amount: {
          type: Number,
          required: true,
          comment: 'المبلغ المدفوع',
        },
        lastPaidDate: {
          type: Date,
          required: true,
          comment: 'تاريخ آخر دفعة',
        },
        paidTo: {
          type: Date,
          comment: 'مدفوع حتى تاريخ',
        },
      },
    },

    // ====== معلومات المالك ======
    owner: {
      name: {
        type: String,
        required: [true, 'اسم المالك مطلوب'],
        comment: 'اسم صاحب المركبة',
      },
      nationalId: {
        type: String,
        required: [true, 'رقم الهوية مطلوب'],
        unique: true,
        match: [/^\d{10}$/, 'رقم الهوية يجب أن يكون 10 أرقام'],
        comment: 'رقم الهوية الوطنية السعودية',
        // index removed to avoid duplicate with schema.index
      },
      phone: {
        type: String,
        required: true,
        match: [/^(?:\+966|0)(?:5[0-5]|5[1-3]|5[4-6]|5[7-9]|9[2-9])\d{7}$/, 'رقم الهاتف غير صحيح'],
        comment: 'رقم الهاتف بالصيغة السعودية',
      },
      email: {
        type: String,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'البريد الإلكتروني غير صحيح'],
      },
      address: {
        street: String,
        city: {
          type: String,
          enum: [
            'الرياض',
            'جدة',
            'الدمام',
            'الأحساء',
            'مكة',
            'المدينة',
            'الطائف',
            'أبها',
            'الخبر',
            'أخرى',
          ],
          required: true,
        },
        postalCode: {
          type: String,
          match: [/^\d{5}$/, 'الرمز البريدي يجب أن يكون 5 أرقام'],
        },
        region: {
          type: String,
          enum: [
            'منطقة الرياض',
            'منطقة مكة',
            'منطقة المدينة',
            'منطقة القصيم',
            'منطقة حائل',
            'منطقة الشرقية',
            'منطقة عسير',
            'منطقة تبوك',
            'منطقة جازان',
            'منطقة نجران',
            'منطقة الباحة',
            'منطقة الجوف',
          ],
          required: true,
        },
      },
      ownershipType: {
        type: String,
        enum: ['فردي', 'شركة', 'حكومي', 'تأجير'],
        comment: 'نوع الملكية',
      },
    },

    // ====== معلومات السائق المعين ======
    assignedDriver: {
      driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        comment: 'معرف السائق من نموذج السائق',
      },
      driverName: String,
      driverNationalId: String,
      assignmentDate: Date,
      assignmentStatus: {
        type: String,
        enum: ['مرخص', 'مؤقت', 'معلق'],
        comment: 'حالة التعيين',
      },
    },

    // ====== معلومات التأمين ======
    insurance: {
      provider: {
        type: String,
        required: [true, 'اسم شركة التأمين مطلوب'],
        enum: ['الأهلية', 'صقر', 'تكافل الراجحي', 'الإمارات دبي', 'ملاذ', 'أخرى'],
        comment: 'شركة التأمين',
      },
      policyNumber: {
        type: String,
        required: [true, 'رقم البوليصة مطلوب'],
        unique: true,
        comment: 'رقم وثيقة التأمين',
      },
      policyType: {
        type: String,
        enum: ['الحد الأدنى الإجباري', 'شامل', 'تجميعي'],
        required: true,
        comment: 'نوع التأمين',
      },
      expiryDate: {
        type: Date,
        required: [true, 'تاريخ انتهاء التأمين مطلوب'],
        // index: true - removed to avoid duplicate
        comment: 'تاريخ انتهاء التأمين',
      },
      coverageAmount: {
        type: Number,
        comment: 'مبلغ التغطية (SAR)',
      },
      premium: {
        annualAmount: {
          type: Number,
          comment: 'القسط السنوي (SAR)',
        },
        lastPaidDate: Date,
        paymentMethod: {
          type: String,
          enum: ['شيك', 'تحويل بنكي', 'SADAD', 'بطاقة ائتمان'],
          comment: 'وسيلة الدفع',
        },
      },
      documentUrl: {
        type: String,
        comment: 'رابط وثيقة التأمين المسحوبة ضوئياً',
      },
      claimsHistory: [
        {
          claimNumber: String,
          date: Date,
          description: String,
          amount: Number,
          status: {
            type: String,
            enum: ['مرفوع', 'قيد الدراسة', 'موافق', 'مرفوض'],
          },
        },
      ],
    },

    // ====== الفحص الدوري ======
    inspection: {
      nextInspectionDate: {
        type: Date,
        // index: true - removed to avoid duplicate
        comment: 'موعد الفحص الدوري القادم',
      },
      lastInspectionDate: Date,
      inspectionOffice: {
        type: String,
        enum: ['الأحساء', 'الرياض', 'جدة', 'الدمام', 'الخبر', 'أخرى'],
        comment: 'مكان الفحص',
      },
      inspectionStatus: {
        type: String,
        enum: ['ساري', 'منتهي', 'قيد الفحص'],
        default: 'ساري',
        comment: 'حالة الفحص الدوري',
      },
      certificateNumber: {
        type: String,
        unique: true,
        sparse: true,
        comment: 'رقم شهادة الفحص',
      },
      emissionStatus: {
        type: String,
        enum: ['جيد', 'مقبول', 'غير صالح'],
        comment: 'حالة الانبعاثات',
      },
      safetyStatus: {
        type: String,
        enum: ['جيد', 'مقبول', 'غير صالح'],
        comment: 'حالة السلامة',
      },
      inspectionHistory: [
        {
          date: Date,
          result: {
            type: String,
            enum: ['نجح', 'رسب'],
          },
          emissionResult: String,
          safetyResult: String,
          inspector: String,
          notes: String,
        },
      ],
    },

    // ====== الصيانة والخدمة ======
    maintenance: {
      schedules: [
        {
          type: {
            type: String,
            enum: [
              'تغيير الزيت',
              'تغيير المرشحات',
              'فحص الفرامل',
              'دوران الإطارات',
              'فحص البطارية',
              'صيانة دورية',
            ],
            required: true,
          },
          interval: {
            kilometers: Number,
            months: Number,
          },
          lastServiceDate: Date,
          lastServiceMileage: Number,
          nextServiceDate: Date,
          nextServiceMileage: Number,
          notes: String,
        },
      ],

      history: [
        {
          date: {
            type: Date,
            required: true,
            index: true,
          },
          mileage: Number,
          serviceType: String,
          description: String,
          cost: {
            type: Number,
            comment: 'التكلفة (SAR)',
          },
          provider: {
            type: String,
            comment: 'مقدم الخدمة',
          },
          invoiceNumber: String,
          warranty: {
            period: String,
            expiryDate: Date,
          },
        },
      ],

      totalMaintenanceCost: {
        type: Number,
        default: 0,
        comment: 'إجمالي تكاليف الصيانة (SAR)',
      },
    },

    // ====== الأداء والإحصائيات ======
    performance: {
      odometer: {
        type: Number,
        default: 0,
        comment: 'عداد المسافات الحالي (كم)',
      },
      totalDistance: {
        type: Number,
        default: 0,
        comment: 'المسافة الإجمالية (كم)',
      },
      totalTrips: {
        type: Number,
        default: 0,
        comment: 'عدد الرحلات الإجمالي',
      },
      fuelConsumption: {
        averagePerKm: {
          type: Number,
          comment: 'متوسط الاستهلاك (لتر/كم)',
        },
        monthlyUsage: Number,
        yearlyUsage: Number,
      },
      engineHours: {
        type: Number,
        default: 0,
        comment: 'عدد ساعات تشغيل المحرك',
      },
      lastServiceCost: Number,
      averageMonthlyMaintenance: Number,
      condition: {
        type: String,
        enum: ['ممتاز', 'جيد', 'مقبول', 'يحتاج صيانة', 'معطوب'],
        default: 'جيد',
      },
    },

    // ====== التتبع بالـ GPS ======
    gpsTracking: {
      isActive: {
        type: Boolean,
        default: true,
      },
      deviceId: String,
      currentLocation: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
          index: '2dsphere',
        },
      },
      currentAddress: String,
      currentSpeed: {
        type: Number,
        min: 0,
        comment: 'السرعة الحالية (كم/س)',
      },
      lastUpdateTime: Date,
      engineStatus: {
        type: String,
        enum: ['مشغل', 'مطفأ'],
        comment: 'حالة المحرك',
      },
      locationHistory: [
        {
          timestamp: Date,
          location: {
            type: {
              type: String,
              enum: ['Point'],
              default: 'Point',
            },
            coordinates: [Number],
          },
          speed: Number,
          address: String,
          _id: false,
        },
      ],
    },

    // ====== المخالفات والانتهاكات ======
    violations: [
      {
        date: {
          type: Date,
          required: true,
          index: true,
        },
        violationCode: {
          type: String,
          required: true,
          comment: 'كود المخالفة من نظام المرور',
        },
        description: {
          type: String,
          required: true,
          comment: 'وصف المخالفة',
        },
        severity: {
          type: String,
          enum: ['بسيطة (غرامة فقط)', 'متوسطة (1-3 نقاط)', 'خطيرة (4-6 نقاط)', 'شديدة (7+ نقاط)'],
          comment: 'درجة خطورة المخالفة',
        },
        fine: {
          type: Number,
          comment: 'قيمة الغرامة (SAR)',
        },
        demeritPoints: {
          type: Number,
          default: 0,
          comment: 'النقاط المخصومة من الرخصة',
        },
        location: {
          latitude: Number,
          longitude: Number,
          address: String,
        },
        officer: {
          name: String,
          badge: String,
          office: String,
        },
        status: {
          type: String,
          enum: ['مسجلة', 'معترضة', 'مسددة', 'معلقة'],
          default: 'مسجلة',
        },
        paymentStatus: {
          type: String,
          enum: ['لم تسدد', 'مسددة جزئياً', 'مسددة كاملاً'],
          default: 'لم تسدد',
        },
        paymentDate: Date,
        notes: String,
      },
    ],

    // ====== المستندات المرفقة ======
    documents: {
      registrationCertificate: {
        fileUrl: String,
        uploadDate: Date,
        expiryDate: Date,
      },
      ownershipProof: {
        fileUrl: String,
        uploadDate: Date,
      },
      insuranceCertificate: {
        fileUrl: String,
        uploadDate: Date,
        expiryDate: Date,
      },
      inspectionCertificate: {
        fileUrl: String,
        uploadDate: Date,
        expiryDate: Date,
      },
      maintenanceRecords: [
        {
          description: String,
          fileUrl: String,
          uploadDate: Date,
        },
      ],
      images: [
        {
          description: String,
          fileUrl: String,
          uploadDate: Date,
          tags: [String],
        },
      ],
    },

    // ====== المعلومات المالية ======
    financial: {
      estimatedValue: {
        type: Number,
        comment: 'القيمة المقدرة للمركبة (SAR)',
      },
      mortgageStatus: {
        type: String,
        enum: ['خالي من الرهن', 'مرهون'],
        default: 'خالي من الرهن',
      },
      totalOperatingCost: {
        type: Number,
        default: 0,
        comment: 'إجمالي تكاليف التشغيل (SAR)',
      },
      totalRevenue: {
        type: Number,
        default: 0,
        comment: 'إجمالي الإيرادات (SAR)',
      },
      netProfit: {
        type: Number,
        default: 0,
        comment: 'صافي الربح (SAR)',
      },
      taxableIncome: {
        type: Number,
        comment: 'الدخل الخاضع للضريبة (SAR)',
      },
      zakeableSavings: {
        type: Number,
        comment: 'المبلغ الخاضع للزكاة (SAR)',
      },
    },

    // ====== الحالة والحالات الخاصة ======
    status: {
      type: String,
      enum: ['نشطة', 'معطلة', 'مباعة', 'مسروقة', 'ملغاة', 'قيد الصيانة'],
      default: 'نشطة',
      index: true,
    },

    specialStatus: [
      {
        type: String,
        enum: ['دبلوماسية', 'حكومية', 'حائزة على جوائز', 'معارضة', 'نادرة'],
        comment: 'حالات خاصة',
      },
    ],

    // ====== البيانات الوصفية ======
    metadata: {
      createdAt: {
        type: Date,
        default: Date.now,
        comment: 'تاريخ الإضافة',
      },
      updatedAt: {
        type: Date,
        default: Date.now,
        comment: 'آخر تحديث',
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        comment: 'من أضاف السجل',
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        comment: 'من حدّث السجل',
      },
      notes: String,
      tags: [String],
      attachments: [
        {
          name: String,
          url: String,
          uploadDate: Date,
        },
      ],
      auditLog: [
        {
          timestamp: Date,
          action: String,
          changedFields: [String],
          changedBy: String,
          ipAddress: String,
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ====== الفهارس ======
// owner.nationalId already has unique: true which creates an index
vehicleSchema.index({ 'gpsTracking.currentLocation': '2dsphere' });
vehicleSchema.index({ 'registration.expiryDate': 1 });
vehicleSchema.index({ 'insurance.expiryDate': 1 });
vehicleSchema.index({ 'inspection.nextInspectionDate': 1 });
vehicleSchema.index({ status: 1, createdAt: -1 });

// ====== الحقول الافتراضية ======
vehicleSchema.virtual('age').get(function () {
  return new Date().getFullYear() - this.basicInfo.year;
});

vehicleSchema.virtual('isRegistrationExpired').get(function () {
  return new Date() > this.registration.expiryDate;
});

vehicleSchema.virtual('isInsuranceExpired').get(function () {
  return new Date() > this.insurance.expiryDate;
});

vehicleSchema.virtual('isInspectionOverdue').get(function () {
  return this.inspection.nextInspectionDate && new Date() > this.inspection.nextInspectionDate;
});

vehicleSchema.virtual('daysUntilRegistrationExpiry').get(function () {
  const today = new Date();
  const timeDiff = this.registration.expiryDate - today;
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

vehicleSchema.virtual('daysUntilInsuranceExpiry').get(function () {
  const today = new Date();
  const timeDiff = this.insurance.expiryDate - today;
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

vehicleSchema.virtual('isCompliant').get(function () {
  return (
    !this.isRegistrationExpired &&
    !this.isInsuranceExpired &&
    !this.isInspectionOverdue &&
    this.status === 'نشطة'
  );
});

vehicleSchema.virtual('complianceStatus').get(function () {
  const issues = [];

  if (this.isRegistrationExpired) issues.push('التسجيل منتهي');
  if (this.isInsuranceExpired) issues.push('التأمين منتهي');
  if (this.isInspectionOverdue) issues.push('الفحص الدوري مستحق');
  if (this.status !== 'نشطة') issues.push(`الحالة: ${this.status}`);

  return {
    isCompliant: issues.length === 0,
    issues: issues,
    percentage: ((4 - issues.length) / 4) * 100,
  };
});

// ====== الوسائط ======
vehicleSchema.pre('save', function (next) {
  this.metadata.updatedAt = new Date();

  // حساب إجمالي تكاليف الصيانة
  if (this.maintenance.history && this.maintenance.history.length > 0) {
    this.maintenance.totalMaintenanceCost = this.maintenance.history.reduce((total, record) => {
      return total + (record.cost || 0);
    }, 0);
  }

  next();
});

vehicleSchema.post('save', function (doc) {
  logger.info(
    `Vehicle updated: ${doc.registrationNumber} (${doc.basicInfo.make} ${doc.basicInfo.model})`
  );
});

// ====== الطرق المخصصة ======
vehicleSchema.methods.addViolation = function (violationData) {
  this.violations.push(violationData);
  return this.save();
};

vehicleSchema.methods.recordMaintenance = function (maintenanceData) {
  this.maintenance.history.push(maintenanceData);
  return this.save();
};

vehicleSchema.methods.updateLocation = function (locationData) {
  this.gpsTracking.currentLocation = {
    type: 'Point',
    coordinates: [locationData.longitude, locationData.latitude],
  };
  this.gpsTracking.currentSpeed = locationData.speed;
  this.gpsTracking.lastUpdateTime = new Date();
  this.gpsTracking.currentAddress = locationData.address;

  // إضافة إلى السجل
  if (this.gpsTracking.locationHistory.length >= 1000) {
    this.gpsTracking.locationHistory.shift(); // احذف الأقدم
  }

  this.gpsTracking.locationHistory.push({
    timestamp: new Date(),
    location: {
      type: 'Point',
      coordinates: [locationData.longitude, locationData.latitude],
    },
    speed: locationData.speed,
    address: locationData.address,
  });

  return this.save();
};

vehicleSchema.methods.getDaysUntilExpiry = function (fieldPath) {
  const expiryDate = this.constructor.findById(this._id).select(fieldPath).lean();
  const today = new Date();
  const timeDiff = expiryDate - today;
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

vehicleSchema.methods.getComplianceReport = function () {
  return {
    vehicle: {
      registration: this.registrationNumber,
      make: this.basicInfo.make,
      model: this.basicInfo.model,
    },
    compliance: this.complianceStatus,
    registration: {
      status: this.registration.registrationStatus,
      expiryDate: this.registration.expiryDate,
      daysRemaining: this.daysUntilRegistrationExpiry,
    },
    insurance: {
      provider: this.insurance.provider,
      expiryDate: this.insurance.expiryDate,
      daysRemaining: this.daysUntilInsuranceExpiry,
    },
    inspection: {
      status: this.inspection.inspectionStatus,
      nextDueDate: this.inspection.nextInspectionDate,
      overdue: this.isInspectionOverdue,
    },
    violations: {
      total: this.violations.length,
      unpaid: this.violations.filter(v => v.paymentStatus !== 'مسددة كاملاً').length,
      totalFines: this.violations.reduce((sum, v) => sum + (v.fine || 0), 0),
    },
  };
};

module.exports = mongoose.models.VehicleSaudi || mongoose.model('VehicleSaudi', vehicleSchema);

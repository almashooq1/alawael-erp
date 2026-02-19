/**
 * Maintenance Provider Model - نموذج مراكز ومزودي الصيانة
 *
 * إدارة مراكز الصيانة والمورضين والعاملين
 * ✅ Provider Management
 * ✅ Performance Tracking
 * ✅ Cost Management
 * ✅ Quality Assessment
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MaintenanceProviderSchema = new Schema(
  {
    // معلومات المركز
    providerId: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
    },
    providerType: {
      type: String,
      enum: ['مركز معتمد', 'مركز خاص', 'ورشة صغيرة', 'عامل مستقل'],
      required: true,
    },

    // معلومات الاتصال
    contactInfo: {
      phone: [String],
      email: [String],
      website: String,
      address: {
        street: String,
        city: String,
        region: String,
        country: String,
        postalCode: String,
        coordinates: {
          latitude: Number,
          longitude: Number,
        },
      },
    },

    // معلومات الاعتماد
    credentials: {
      licenseNumber: String,
      licenseExpiryDate: Date,
      certifications: [
        {
          certName: String,
          certNumber: String,
          issueDate: Date,
          expiryDate: Date,
          authority: String,
        },
      ],
      insurancePolicy: String,
      insuranceExpiryDate: Date,
      taxId: String,
    },

    // الخدمات المقدمة
    services: [
      {
        serviceName: String,
        description: String,
        category: {
          type: String,
          enum: [
            'روتينية',
            'وقائية',
            'تصحيحية',
            'متخصصة',
            'فحص',
            'استبدال',
          ],
        },
        availability: Boolean,
      },
    ],

    // الأسعار والتعاقدات
    pricing: {
      laborRatePerHour: Number,
      standardCharges: [
        {
          serviceName: String,
          cost: Number,
          estimates: [
            {
              vehicleType: String,
              estimatedCost: Number,
            },
          ],
        },
      ],
      contractTerms: String,
      discountAvailable: Boolean,
      discountPercentage: Number,
    },

    // طاقم العمل
    staff: [
      {
        staffName: String,
        staffId: String,
        role: {
          type: String,
          enum: ['مدير', 'تقني رئيسي', 'تقني', 'مساعد'],
        },
        specialization: [String],
        certification: String,
        experience: Number, // بالسنوات
        contactNumber: String,
      },
    ],

    // الأداء والتقييم
    performance: {
      totalServices: { type: Number, default: 0 },
      completedServices: { type: Number, default: 0 },
      averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      reviews: [
        {
          reviewer: String,
          rating: Number,
          comment: String,
          date: Date,
        },
      ],
      onTimeCompletionRate: Number,
      qualityScore: Number,
      customerSatisfactionScore: Number,
    },

    // الموارد والمعدات
    resources: {
      equipmentList: [
        {
          equipmentName: String,
          model: String,
          quantity: Number,
          condition: {
            type: String,
            enum: ['ممتاز', 'جيد', 'مقبول', 'يحتاج صيانة'],
          },
        },
      ],
      capacity: {
        vehiclesPerMonth: Number,
        hoursPerDay: Number,
        workingDays: [String],
      },
    },

    // المخزون والمواد
    inventory: {
      commonParts: [
        {
          partName: String,
          partNumber: String,
          quantity: Number,
          reorderLevel: Number,
          supplier: String,
        },
      ],
      lastInventoryUpdate: Date,
    },

    // السجلات والتاريخ
    serviceHistory: [
      {
        date: Date,
        vehicleId: Schema.Types.ObjectId,
        serviceType: String,
        cost: Number,
        duration: Number,
        technician: String,
        rating: Number,
        notes: String,
      },
    ],

    // الشراكات والعقود
    partnerships: [
      {
        partnerName: String,
        partnerType: String,
        startDate: Date,
        endDate: Date,
        terms: String,
      },
    ],

    // الحالة والإحصائيات
    status: {
      type: String,
      enum: ['نشط', 'معطل', 'مراقب', 'غير مفعل'],
      default: 'نشط',
    },
    preferredProvider: {
      type: Boolean,
      default: false,
    },

    // الملاحظات والتحقق
    notes: String,
    verifiedAt: Date,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // الامتثال والسلامة
    complianceStatus: {
      lastAuditDate: Date,
      auditResult: {
        type: String,
        enum: ['ممتاز', 'جيد', 'مقبول', 'ضعيف'],
      },
      issues: [String],
      correctiveActions: [
        {
          issue: String,
          action: String,
          dueDate: Date,
          completionDate: Date,
        },
      ],
    },

    // الإحصائيات المتقدمة
    analytics: {
      averageCostPerService: Number,
      costTrend: {
        month: String,
        cost: Number,
      },
      serviceBreakdown: {
        category: String,
        percentage: Number,
      },
    },

    // البيانات الوصفية
    createdFrom: String, // source like 'API', 'Manual Entry'
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

// الفهارس
MaintenanceProviderSchema.index({ providerName: 'text', 'contactInfo.city': 1 });
MaintenanceProviderSchema.index({ status: 1, 'performance.averageRating': -1 });
MaintenanceProviderSchema.index({ providerType: 1 });
MaintenanceProviderSchema.index({ 'credentials.licenseExpiryDate': 1 });

// الحقول الحسابية
MaintenanceProviderSchema.virtual('completionRate').get(function () {
  if (this.performance.totalServices > 0) {
    return (
      (
        (this.performance.completedServices / this.performance.totalServices) *
        100
      ).toFixed(2) + '%'
    );
  }
  return '0%';
});

MaintenanceProviderSchema.virtual('isLicenseValid').get(function () {
  if (this.credentials.licenseExpiryDate) {
    return this.credentials.licenseExpiryDate > new Date();
  }
  return false;
});

MaintenanceProviderSchema.virtual('isInsuranceActive').get(function () {
  if (this.credentials.insuranceExpiryDate) {
    return this.credentials.insuranceExpiryDate > new Date();
  }
  return false;
});

MaintenanceProviderSchema.virtual('overallScore').get(function () {
  return (
    (
      (this.performance.qualityScore || 0) * 0.4 +
      (this.performance.customerSatisfactionScore || 0) * 0.4 +
      (this.performance.onTimeCompletionRate || 0) * 0.2
    ).toFixed(2) + '%'
  );
});

module.exports = mongoose.model('MaintenanceProvider', MaintenanceProviderSchema);

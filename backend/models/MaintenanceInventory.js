/**
 * Maintenance Inventory Model - نموذج مخزون الأجزاء والمواد
 *
 * إدارة مخزون قطع الغيار والمواد والزيوت
 * ✅ Inventory Management
 * ✅ Stock Tracking
 * ✅ Supplier Management
 * ✅ Cost Control
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MaintenanceInventorySchema = new Schema(
  {
    // معلومات المخزون
    inventoryId: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
    },

    // بيانات المنتج
    partName: {
      type: String,
      required: true,
      trim: true,
    },
    partNumber: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    description: String,

    // التصنيف والفئات
    category: {
      type: String,
      enum: [
        'محرك',
        'فرامل',
        'إطارات',
        'بطارية',
        'مولد',
        'فلاتر',
        'زيوت',
        'سوائل',
        'حزام',
        'مشع',
        'مقاعد',
        'أضواء',
        'أجهزة استشعار',
        'أخرى',
      ],
      required: true,
    },
    subcategory: String,

    // التفاصيل التقنية
    specifications: {
      make: String, // الماركة الأصلية
      model: [String], // موديلات السيارات المتوافقة
      year: [Number], // السنوات المتوافقة
      condition: {
        type: String,
        enum: ['جديد', 'مستعمل', 'معاد تصنيع'],
        default: 'جديد',
      },
      weight: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
    },

    // الكمية والتتبع
    currentStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minimumStock: {
      type: Number,
      required: true,
      default: 5,
    },
    maximumStock: {
      type: Number,
      default: 50,
    },
    reorderLevel: {
      type: Number,
      required: true,
      default: 10,
    },
    safetyStock: {
      type: Number,
      default: 3,
    },

    // الموقع والتخزين
    location: {
      warehouse: String,
      aisle: String,
      shelf: String,
      bin: String,
      coordinates: {
        x: Number,
        y: Number,
        z: Number,
      },
    },

    // التسعير والتكاليف
    pricing: {
      unitCost: {
        type: Number,
        required: true,
      },
      sellingPrice: Number,
      margin: Number,
      lastPriceUpdate: Date,
      priceHistory: [
        {
          date: Date,
          cost: Number,
          supplier: String,
        },
      ],
    },

    // الموردون والعلاقات
    suppliers: [
      {
        supplierId: {
          type: Schema.Types.ObjectId,
          ref: 'MaintenanceProvider',
        },
        supplierName: String,
        partNumber: String, // رقم الجزء عند المورد
        leadTime: Number, // بالأيام
        minimumOrderQuantity: Number,
        quantity: Number, // آخر كمية مطلوبة
        unitCost: Number,
        reliability: {
          type: Number,
          min: 0,
          max: 100,
        },
      },
    ],
    preferredSupplier: {
      type: Schema.Types.ObjectId,
      ref: 'MaintenanceProvider',
    },

    // السجلات والحركات
    stockMovements: [
      {
        date: Date,
        type: {
          type: String,
          enum: ['ورود', 'صرف', 'تحويل', 'تسوية', 'تلف'],
        },
        quantity: Number,
        reference: String, // رقم PO أو Task ID
        reason: String,
        performedBy: String,
        notes: String,
      },
    ],

    // الطلبات والتوريد
    purchaseOrders: [
      {
        poNumber: String,
        supplierId: {
          type: Schema.Types.ObjectId,
          ref: 'MaintenanceProvider',
        },
        quantityOrdered: Number,
        quantityReceived: Number,
        quantityInvoiced: Number,
        orderDate: Date,
        expectedDeliveryDate: Date,
        actualDeliveryDate: Date,
        unitCost: Number,
        totalCost: Number,
        status: {
          type: String,
          enum: ['مسودة', 'مرسلة', 'مؤكدة', 'شحنت', 'وصلت', 'ملغاة'],
        },
        paymentStatus: {
          type: String,
          enum: ['غير مدفوعة', 'مدفوعة جزئياً', 'مدفوعة كاملاً'],
        },
      },
    ],

    // الاستخدام والإحصائيات
    usage: {
      totalIssued: { type: Number, default: 0 },
      totalUsed: { type: Number, default: 0 },
      averageMonthlyConsumption: Number,
      lastUsedDate: Date,
      lastIssuedDate: Date,
      usageHistory: [
        {
          date: Date,
          quantity: Number,
          vehicleId: {
            type: Schema.Types.ObjectId,
            ref: 'Vehicle',
          },
          taskId: {
            type: Schema.Types.ObjectId,
            ref: 'MaintenanceTask',
          },
        },
      ],
    },

    // الصلاحية والجودة
    warranty: {
      manufacturerWarranty: String,
      warrantyPeriod: Number, // بالأشهر
      warrantyStartDate: Date,
      warrantyEndDate: Date,
    },
    quality: {
      qualityRating: {
        type: Number,
        min: 0,
        max: 5,
      },
      defectRate: Number, // النسبة المئوية
      returnRate: Number,
      reviews: [String],
    },

    // الانتهاء الصلاحية والتحذيرات
    lifecycle: {
      manufacturingDate: Date,
      expiryDate: Date,
      isExpired: { type: Boolean, default: false },
      shelfLife: String,
    },

    // الحالة والأرشفة
    status: {
      type: String,
      enum: ['نشط', 'غير مستخدم', 'معطوب', 'منتهي الصلاحية', 'مسحوب'],
      default: 'نشط',
    },
    isObsolete: {
      type: Boolean,
      default: false,
    },

    // الملاحظات والمعلومات الإضافية
    notes: String,
    alternativeParts: [
      {
        partNumber: String,
        partName: String,
      },
    ],
    relatedParts: [
      {
        partNumber: String,
        partName: String,
        relationship: String, // مثل "يستخدم مع"، "يستبدل"
      },
    ],

    // الإحصائيات المتقدمة
    analytics: {
      annualConsumption: Number,
      annualCost: Number,
      costPerVehicle: Number,
      ROI: Number,
      criticalityScore: { type: Number, min: 0, max: 100 },
    },

    // البيانات الوصفية
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastUpdatedBy: {
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
MaintenanceInventorySchema.index({ partNumber: 1, category: 1 });
MaintenanceInventorySchema.index({ currentStock: 1 });
MaintenanceInventorySchema.index({ 'lifecycle.expiryDate': 1 });
MaintenanceInventorySchema.index({ status: 1 });
MaintenanceInventorySchema.index({ category: 1, subcategory: 1 });

// الحقول الحسابية
MaintenanceInventorySchema.virtual('needsReorder').get(function () {
  return this.currentStock <= this.reorderLevel;
});

MaintenanceInventorySchema.virtual('isLowStock').get(function () {
  return this.currentStock < this.minimumStock;
});

MaintenanceInventorySchema.virtual('isOverstock').get(function () {
  return this.currentStock > this.maximumStock;
});

MaintenanceInventorySchema.virtual('daysUntilExpiry').get(function () {
  if (this.lifecycle.expiryDate) {
    const diff = this.lifecycle.expiryDate.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

MaintenanceInventorySchema.virtual('inventoryValue').get(function () {
  return (this.currentStock * this.pricing.unitCost).toFixed(2);
});

MaintenanceInventorySchema.virtual('turnoverRatio').get(function () {
  if (this.usage.totalUsed > 0 && this.averageStock) {
    return (this.usage.totalUsed / this.averageStock).toFixed(2);
  }
  return 0;
});

module.exports = mongoose.model('MaintenanceInventory', MaintenanceInventorySchema);

/**
 * Fleet Dispatch Model - نموذج التوزيع والشحن
 *
 * إدارة أوامر التوزيع والشحنات والتسليم
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// عنصر شحنة فردي
const cargoItemSchema = new Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  weight: { type: Number }, // كجم
  volume: { type: Number }, // متر مكعب
  category: {
    type: String,
    enum: [
      'general',
      'fragile',
      'perishable',
      'hazardous',
      'heavy',
      'documents',
      'medical',
      'equipment',
      'furniture',
      'electronics',
    ],
    default: 'general',
  },
  specialInstructions: String,
  value: { type: Number }, // القيمة بالريال
  barcode: String,
  photos: [String],
});

// نقطة توقف/تسليم
const deliveryStopSchema = new Schema({
  order: { type: Number, required: true },
  type: { type: String, enum: ['pickup', 'delivery', 'waypoint'], required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }, // [lng, lat]
  },
  address: { type: String, required: true },
  addressAr: String,
  contactName: String,
  contactPhone: String,
  estimatedArrival: Date,
  actualArrival: Date,
  estimatedDeparture: Date,
  actualDeparture: Date,
  status: {
    type: String,
    enum: [
      'pending',
      'en_route',
      'arrived',
      'loading',
      'unloading',
      'completed',
      'skipped',
      'failed',
    ],
    default: 'pending',
  },
  cargoItems: [{ type: Schema.Types.ObjectId }], // IDs ضمن مصفوفة الشحنات
  signature: {
    image: String,
    signedBy: String,
    signedAt: Date,
  },
  proofOfDelivery: [String], // صور
  notes: String,
  failureReason: String,
});

const dispatchOrderSchema = new Schema(
  {
    // معرف الطلب
    orderNumber: { type: String, unique: true, required: true },

    // النوع
    type: {
      type: String,
      enum: ['delivery', 'pickup', 'transfer', 'return', 'emergency', 'scheduled', 'express'],
      required: true,
    },

    // الأولوية
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent', 'critical'],
      default: 'normal',
    },

    // الحالة
    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'assigned',
        'dispatched',
        'in_transit',
        'at_stop',
        'completed',
        'cancelled',
        'failed',
        'returned',
      ],
      default: 'draft',
    },

    // التخصيص
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: Schema.Types.ObjectId, ref: 'Driver' },
    assignedAt: Date,

    // العميل / الجهة الطالبة
    client: {
      name: String,
      nameAr: String,
      phone: String,
      email: String,
      company: String,
      reference: String, // رقم مرجعي
    },

    // الشحنات
    cargo: {
      items: [cargoItemSchema],
      totalWeight: { type: Number, default: 0 },
      totalVolume: { type: Number, default: 0 },
      totalValue: { type: Number, default: 0 },
      requiresRefrigeration: { type: Boolean, default: false },
      requiresInsurance: { type: Boolean, default: false },
      insuranceAmount: Number,
      temperatureRange: {
        min: Number,
        max: Number,
      },
    },

    // نقاط التوقف
    stops: [deliveryStopSchema],

    // المسار المخطط
    plannedRoute: {
      totalDistance: Number, // كم
      estimatedDuration: Number, // دقيقة
      optimized: { type: Boolean, default: false },
      waypoints: [
        {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: [Number],
        },
      ],
    },

    // المسار الفعلي
    actualRoute: {
      totalDistance: Number,
      actualDuration: Number,
      startedAt: Date,
      completedAt: Date,
      deviations: [
        {
          location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: [Number],
          },
          deviationDistance: Number,
          timestamp: Date,
          reason: String,
        },
      ],
    },

    // التكاليف
    costs: {
      fuelCost: { type: Number, default: 0 },
      tollCost: { type: Number, default: 0 },
      laborCost: { type: Number, default: 0 },
      insuranceCost: { type: Number, default: 0 },
      otherCosts: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      customerCharge: { type: Number, default: 0 },
      profit: { type: Number, default: 0 },
    },

    // الجدولة
    scheduling: {
      requestedDate: Date,
      scheduledDate: Date,
      timeWindow: {
        start: String, // "HH:mm"
        end: String,
      },
      isRecurring: { type: Boolean, default: false },
      recurringPattern: {
        frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly'] },
        daysOfWeek: [Number],
        endDate: Date,
      },
    },

    // التقييم
    rating: {
      score: { type: Number, min: 1, max: 5 },
      comment: String,
      ratedBy: String,
      ratedAt: Date,
    },

    // الملاحظات والمرفقات
    notes: String,
    internalNotes: String,
    attachments: [{ name: String, url: String, type: String }],

    // سجل الأحداث
    timeline: [
      {
        event: String,
        timestamp: { type: Date, default: Date.now },
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        details: String,
        location: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: [Number],
        },
      },
    ],

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

dispatchOrderSchema.index({ status: 1, priority: 1 });
dispatchOrderSchema.index({ vehicle: 1, status: 1 });
dispatchOrderSchema.index({ driver: 1, status: 1 });
dispatchOrderSchema.index({ 'scheduling.scheduledDate': 1 });
dispatchOrderSchema.index({ organization: 1, createdAt: -1 });

// أرقام تلقائية
dispatchOrderSchema.pre('validate', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('DispatchOrder').countDocuments();
    this.orderNumber = `DSP-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// حساب التكلفة الإجمالية
dispatchOrderSchema.pre('save', function (next) {
  if (this.cargo && this.cargo.items) {
    this.cargo.totalWeight = this.cargo.items.reduce(
      (sum, item) => sum + (item.weight || 0) * (item.quantity || 1),
      0
    );
    this.cargo.totalVolume = this.cargo.items.reduce(
      (sum, item) => sum + (item.volume || 0) * (item.quantity || 1),
      0
    );
    this.cargo.totalValue = this.cargo.items.reduce(
      (sum, item) => sum + (item.value || 0) * (item.quantity || 1),
      0
    );
  }
  if (this.costs) {
    this.costs.totalCost =
      (this.costs.fuelCost || 0) +
      (this.costs.tollCost || 0) +
      (this.costs.laborCost || 0) +
      (this.costs.insuranceCost || 0) +
      (this.costs.otherCosts || 0);
    this.costs.profit = (this.costs.customerCharge || 0) - this.costs.totalCost;
  }
  next();
});

module.exports = mongoose.model('DispatchOrder', dispatchOrderSchema);

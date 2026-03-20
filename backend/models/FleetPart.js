/**
 * Fleet Spare Parts Model - نموذج قطع غيار الأسطول
 * Parts inventory, stock tracking, reorder management
 */

const mongoose = require('mongoose');

const fleetPartSchema = new mongoose.Schema(
  {
    partNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    sku: { type: String },
    barcode: { type: String },

    category: {
      type: String,
      enum: [
        'engine',
        'brakes',
        'tires',
        'filters',
        'electrical',
        'suspension',
        'transmission',
        'body',
        'interior',
        'exhaust',
        'cooling',
        'fuel_system',
        'steering',
        'lighting',
        'hvac',
        'fluids',
        'belts_hoses',
        'battery',
        'safety',
        'other',
      ],
      required: true,
    },

    brand: { type: String },
    manufacturer: { type: String },
    partOrigin: {
      type: String,
      enum: ['oem', 'aftermarket', 'refurbished', 'generic'],
      default: 'oem',
    },

    compatibleVehicles: [
      {
        make: { type: String },
        model: { type: String },
        yearFrom: { type: Number },
        yearTo: { type: Number },
      },
    ],

    // Inventory
    quantityInStock: { type: Number, default: 0, min: 0 },
    minimumStock: { type: Number, default: 5 },
    maximumStock: { type: Number, default: 100 },
    reorderPoint: { type: Number, default: 10 },
    reorderQuantity: { type: Number, default: 20 },

    warehouseLocation: { type: String },
    binNumber: { type: String },

    // Pricing
    unitCost: { type: Number, required: true },
    sellingPrice: { type: Number },
    currency: { type: String, default: 'SAR' },
    lastPurchasePrice: { type: Number },
    lastPurchaseDate: { type: Date },

    // Supplier
    supplier: {
      name: { type: String },
      contactPerson: { type: String },
      phone: { type: String },
      email: { type: String },
      leadTimeDays: { type: Number, default: 7 },
    },

    // Usage tracking
    totalUsed: { type: Number, default: 0 },
    lastUsedDate: { type: Date },
    averageMonthlyUsage: { type: Number, default: 0 },

    // Warranty
    warrantyMonths: { type: Number },
    warrantyDetails: { type: String },

    status: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock', 'on_order', 'discontinued'],
      default: 'in_stock',
    },

    photo: { type: String },
    notes: { type: String },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

fleetPartSchema.pre('save', async function (next) {
  if (!this.partNumber) {
    const count = await mongoose.model('FleetPart').countDocuments();
    this.partNumber = `PRT-${String(count + 1).padStart(6, '0')}`;
  }
  // Auto-set stock status
  if (this.quantityInStock <= 0) this.status = 'out_of_stock';
  else if (this.quantityInStock <= this.minimumStock) this.status = 'low_stock';
  else this.status = 'in_stock';
  next();
});

fleetPartSchema.index({ organization: 1, category: 1 });
fleetPartSchema.index({ sku: 1 });
fleetPartSchema.index({ status: 1, quantityInStock: 1 });

module.exports = mongoose.model('FleetPart', fleetPartSchema);

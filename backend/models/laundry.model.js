/**
 * Laundry Model — نموذج المغسلة
 *
 * Manages:
 *  - Laundry orders (طلبات الغسيل)
 *  - Item tracking (تتبع العناصر)
 *  - Equipment/machine management (إدارة المعدات)
 *  - Schedules per beneficiary/department
 *  - Inventory (supplies: detergent, softener, etc.)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Laundry Order ───────────────────────────────────────────────────────────

const laundryOrderSchema = new Schema(
  {
    orderNumber: { type: String, unique: true },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    department: { type: String }, // if bulk from a department
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    type: {
      type: String,
      enum: ['personal', 'bedding', 'towels', 'uniforms', 'curtains', 'bulk', 'special'],
      default: 'personal',
    },
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        category: {
          type: String,
          enum: ['clothing', 'bedding', 'towels', 'uniforms', 'curtains', 'other'],
        },
        specialInstructions: String,
        condition: {
          type: String,
          enum: ['clean', 'stained', 'damaged', 'needs-repair'],
          default: 'stained',
        },
      },
    ],
    priority: {
      type: String,
      enum: ['normal', 'urgent', 'express'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: [
        'pending',
        'collected',
        'sorting',
        'washing',
        'drying',
        'ironing',
        'folding',
        'ready',
        'delivered',
        'cancelled',
      ],
      default: 'pending',
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
      },
    ],
    washSettings: {
      temperature: { type: String, enum: ['cold', 'warm', 'hot'], default: 'warm' },
      cycle: { type: String, enum: ['normal', 'delicate', 'heavy', 'quick'], default: 'normal' },
      dryMethod: { type: String, enum: ['machine', 'air-dry', 'hang-dry'], default: 'machine' },
      ironRequired: { type: Boolean, default: false },
    },
    machine: { type: Schema.Types.ObjectId, ref: 'LaundryMachine' },
    scheduledDate: Date,
    collectedAt: Date,
    completedAt: Date,
    deliveredAt: Date,
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

laundryOrderSchema.index({ status: 1, scheduledDate: 1 });
laundryOrderSchema.index({ beneficiary: 1, createdAt: -1 });
laundryOrderSchema.index({ center: 1, status: 1 });

// Auto-generate order number
laundryOrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('LaundryOrder').countDocuments();
    this.orderNumber = `LND-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// ─── Laundry Machine ─────────────────────────────────────────────────────────

const laundryMachineSchema = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['washer', 'dryer', 'washer-dryer', 'ironer', 'folder'],
      required: true,
    },
    brand: String,
    model: String,
    serialNumber: String,
    capacity: { type: Number }, // kg
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    location: String, // room/area
    status: {
      type: String,
      enum: ['available', 'in-use', 'maintenance', 'out-of-order'],
      default: 'available',
    },
    currentOrder: { type: Schema.Types.ObjectId, ref: 'LaundryOrder' },
    cyclesCompleted: { type: Number, default: 0 },
    lastMaintenance: Date,
    nextMaintenance: Date,
    installedDate: Date,
  },
  { timestamps: true }
);

laundryMachineSchema.index({ center: 1, status: 1, type: 1 });

// ─── Laundry Schedule ────────────────────────────────────────────────────────

const laundryScheduleSchema = new Schema(
  {
    dayOfWeek: {
      type: Number, // 0=Sunday ... 6=Saturday
      required: true,
      min: 0,
      max: 6,
    },
    department: String,
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    timeSlot: {
      start: { type: String, required: true }, // "08:00"
      end: { type: String, required: true }, // "10:00"
    },
    type: {
      type: String,
      enum: ['personal', 'bedding', 'towels', 'uniforms', 'bulk'],
      required: true,
    },
    assignedMachines: [{ type: Schema.Types.ObjectId, ref: 'LaundryMachine' }],
    isActive: { type: Boolean, default: true },
    notes: String,
  },
  { timestamps: true }
);

laundryScheduleSchema.index({ dayOfWeek: 1, center: 1 });

// ─── Exports ─────────────────────────────────────────────────────────────────

const LaundryOrder =
  mongoose.models.LaundryOrder || mongoose.model('LaundryOrder', laundryOrderSchema);
const LaundryMachine =
  mongoose.models.LaundryMachine || mongoose.model('LaundryMachine', laundryMachineSchema);
const LaundrySchedule =
  mongoose.models.LaundrySchedule || mongoose.model('LaundrySchedule', laundryScheduleSchema);

module.exports = { LaundryOrder, LaundryMachine, LaundrySchedule };

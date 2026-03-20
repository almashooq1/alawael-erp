/**
 * Housing & Transportation Model — نموذج السكن والمواصلات
 *
 * Manages employee housing units and transportation assignments.
 */
const mongoose = require('mongoose');

/* ── Housing Unit ── */
const HousingUnitSchema = new mongoose.Schema(
  {
    unitNumber: { type: String, unique: true, required: true },
    building: { type: String, required: true },
    type: {
      type: String,
      enum: ['شقة', 'غرفة مشتركة', 'فيلا', 'سكن عمال', 'استوديو'],
      required: true,
    },
    capacity: { type: Number, required: true, min: 1 },
    currentOccupants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    status: {
      type: String,
      enum: ['متاح', 'مشغول', 'صيانة', 'محجوز'],
      default: 'متاح',
    },
    address: { city: String, district: String, street: String, postalCode: String },
    monthlyRent: { type: Number, default: 0 },
    amenities: [String], // ['مكيف', 'مطبخ', 'واي فاي', 'مواقف']
    maintenanceHistory: [
      {
        issue: String,
        reportedDate: { type: Date, default: Date.now },
        resolvedDate: Date,
        cost: Number,
        status: {
          type: String,
          enum: ['مبلغ عنها', 'قيد الإصلاح', 'تم الإصلاح'],
          default: 'مبلغ عنها',
        },
      },
    ],
  },
  { timestamps: true }
);

HousingUnitSchema.index({ status: 1 });
HousingUnitSchema.index({ building: 1, unitNumber: 1 });

/* ── Housing Assignment ── */
const HousingAssignmentSchema = new mongoose.Schema(
  {
    assignmentNumber: { type: String, unique: true, required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'HousingUnit', required: true },
    type: { type: String, enum: ['سكن شركة', 'بدل سكن', 'سكن مؤقت'], default: 'سكن شركة' },
    startDate: { type: Date, required: true },
    endDate: Date,
    status: {
      type: String,
      enum: ['نشط', 'منتهي', 'ملغي', 'معلق'],
      default: 'نشط',
    },
    monthlyDeduction: { type: Number, default: 0 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    notes: String,
  },
  { timestamps: true }
);

HousingAssignmentSchema.index({ employeeId: 1, status: 1 });

/* ── Transportation Route ── */
const TransportationRouteSchema = new mongoose.Schema(
  {
    routeNumber: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['باص', 'ميكروباص', 'سيارة خاصة', 'خدمة نقل'], default: 'باص' },
    vehiclePlate: String,
    driverName: String,
    driverPhone: String,
    capacity: { type: Number, default: 20 },
    stops: [
      {
        name: String,
        time: String,
        lat: Number,
        lng: Number,
      },
    ],
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    status: { type: String, enum: ['نشط', 'متوقف', 'صيانة'], default: 'نشط' },
    schedule: {
      departureTime: String,
      returnTime: String,
      workingDays: [String], // ['الأحد', 'الاثنين', ...]
    },
    monthlyCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TransportationRouteSchema.index({ status: 1 });

const HousingUnit = mongoose.models.HousingUnit || mongoose.model('HousingUnit', HousingUnitSchema);
const HousingAssignment =
  mongoose.models.HousingAssignment || mongoose.model('HousingAssignment', HousingAssignmentSchema);
const TransportationRoute =
  mongoose.models.TransportationRoute ||
  mongoose.model('TransportationRoute', TransportationRouteSchema);

module.exports = { HousingUnit, HousingAssignment, TransportationRoute };

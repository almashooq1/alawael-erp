/**
 * Branch Model - نموذج الفرع
 * Al-Awael Rehabilitation Centers Network
 * 12 Branches + HQ Riyadh
 */
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    city_ar: { type: String },
    city_en: { type: String },
    address_ar: { type: String },
    address_en: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    region: {
      type: String,
      enum: ['riyadh', 'makkah', 'eastern', 'madinah', 'qassim', 'hail', 'aseer', 'tabuk'],
    },
  },
  { _id: false }
);

const operatingHoursSchema = new mongoose.Schema(
  {
    day: { type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
    open: { type: String }, // '07:30'
    close: { type: String }, // '22:00'
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const branchSchema = new mongoose.Schema(
  {
    // ─── Identity ──────────────────────────────────────────────────────────
    code: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      required: true,
      // e.g. RY-MAIN, RY-NORTH, JD-MAIN, JD-SOUTH, DM, KH, TF, TB, MD, QS, HL, AB
    },
    name_ar: { type: String, required: true },
    name_en: { type: String, required: true },
    short_name: { type: String }, // For display in charts

    // ─── Type & Status ─────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['hq', 'main', 'branch', 'satellite'],
      default: 'branch',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'opening_soon'],
      default: 'active',
    },
    is_hq: { type: Boolean, default: false },

    // ─── Location ──────────────────────────────────────────────────────────
    location: { type: locationSchema },

    // ─── Capacity & Staffing ───────────────────────────────────────────────
    capacity: {
      total_rooms: { type: Number, default: 0 },
      therapy_rooms: { type: Number, default: 0 },
      consultation_rooms: { type: Number, default: 0 },
      max_daily_sessions: { type: Number, default: 0 },
      max_patients: { type: Number, default: 0 },
    },

    // ─── Staff ─────────────────────────────────────────────────────────────
    staff_count: { type: Number, default: 0 },
    manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    manager_name: { type: String },

    // ─── Contact ───────────────────────────────────────────────────────────
    phone: { type: String },
    mobile: { type: String },
    email: { type: String },
    whatsapp: { type: String },

    // ─── Operating Hours ───────────────────────────────────────────────────
    operating_hours: [operatingHoursSchema],

    // ─── Financial ─────────────────────────────────────────────────────────
    cost_center: { type: String },
    monthly_target: { type: Number, default: 0 },

    // ─── Settings ──────────────────────────────────────────────────────────
    settings: {
      allow_online_booking: { type: Boolean, default: true },
      allow_home_visits: { type: Boolean, default: false },
      has_transport: { type: Boolean, default: true },
      language: { type: String, default: 'ar' },
      timezone: { type: String, default: 'Asia/Riyadh' },
      notification_emails: [{ type: String }],
    },

    // ─── Metadata ──────────────────────────────────────────────────────────
    established_date: { type: Date },
    logo_url: { type: String },
    notes: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
// NOTE: code index is already created by unique:true in field definition
branchSchema.index({ status: 1 });
branchSchema.index({ 'location.region': 1 });
branchSchema.index({ type: 1 });

// ─── Virtuals ────────────────────────────────────────────────────────────────
branchSchema.virtual('display_name').get(function () {
  return `${this.name_ar} (${this.code})`;
});

// ─── Statics ─────────────────────────────────────────────────────────────────
branchSchema.statics.getAllActiveCodes = async function () {
  const branches = await this.find({ status: 'active' }).select('code name_ar name_en');
  return branches;
};

branchSchema.statics.findByCode = async function (code) {
  return this.findOne({ code: code.toUpperCase() });
};

module.exports = mongoose.models.Branch || mongoose.model('Branch', branchSchema);

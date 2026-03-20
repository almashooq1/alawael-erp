/**
 * Volunteer Management Model — نموذج إدارة المتطوعين
 *
 * Standalone volunteer module (extracted from guardian portal):
 *  - Volunteer profiles & registration
 *  - Program management
 *  - Shift scheduling & attendance
 *  - Hours tracking & certificates
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Volunteer Profile ───────────────────────────────────────────────────────

const volunteerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { ar: { type: String, required: true }, en: String },
    nationalId: { type: String },
    email: String,
    phone: { type: String, required: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female'] },
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    // Skills & Interests
    skills: [String],
    interests: [String],
    languages: [String],
    education: String,
    occupation: String,
    // Availability
    availability: {
      days: [{ type: Number, min: 0, max: 6 }], // 0=Sun..6=Sat
      preferredShift: { type: String, enum: ['morning', 'afternoon', 'evening', 'flexible'] },
      hoursPerWeek: Number,
    },
    // Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'active', 'inactive', 'suspended', 'alumni'],
      default: 'pending',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    // Records
    totalHours: { type: Number, default: 0 },
    programs: [{ type: Schema.Types.ObjectId, ref: 'VolunteerProgram' }],
    backgroundCheck: {
      status: { type: String, enum: ['pending', 'passed', 'failed', 'waived'], default: 'pending' },
      checkedAt: Date,
      notes: String,
    },
    // Emergency contact
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    notes: String,
  },
  { timestamps: true }
);

volunteerSchema.index({ status: 1, center: 1 });
volunteerSchema.index({ nationalId: 1 }, { sparse: true });
volunteerSchema.index({ phone: 1 });

// ─── Volunteer Program ───────────────────────────────────────────────────────

const volunteerProgramSchema = new Schema(
  {
    name: { ar: { type: String, required: true }, en: String },
    description: { ar: String, en: String },
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    category: {
      type: String,
      enum: [
        'education',
        'therapy',
        'recreation',
        'administrative',
        'events',
        'fundraising',
        'mentoring',
        'transport',
        'meals',
        'other',
      ],
    },
    startDate: Date,
    endDate: Date,
    maxVolunteers: Number,
    currentVolunteers: { type: Number, default: 0 },
    requirements: [String], // Skills/certifications needed
    schedule: {
      recurring: { type: Boolean, default: false },
      days: [{ type: Number, min: 0, max: 6 }],
      timeSlot: { start: String, end: String },
    },
    status: {
      type: String,
      enum: ['draft', 'open', 'full', 'in-progress', 'completed', 'cancelled'],
      default: 'draft',
    },
    coordinator: { type: Schema.Types.ObjectId, ref: 'User' },
    enrolledVolunteers: [
      {
        volunteer: { type: Schema.Types.ObjectId, ref: 'Volunteer' },
        enrolledAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['enrolled', 'active', 'completed', 'dropped'],
          default: 'enrolled',
        },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

volunteerProgramSchema.index({ status: 1, center: 1 });
volunteerProgramSchema.index({ startDate: 1, endDate: 1 });

// ─── Volunteer Shift / Attendance ────────────────────────────────────────────

const volunteerShiftSchema = new Schema(
  {
    volunteer: { type: Schema.Types.ObjectId, ref: 'Volunteer', required: true },
    program: { type: Schema.Types.ObjectId, ref: 'VolunteerProgram' },
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    date: { type: Date, required: true },
    checkIn: Date,
    checkOut: Date,
    hoursWorked: { type: Number, default: 0 },
    tasks: [String],
    status: {
      type: String,
      enum: ['scheduled', 'checked-in', 'completed', 'no-show', 'cancelled'],
      default: 'scheduled',
    },
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    supervisorNotes: String,
    supervisor: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

volunteerShiftSchema.index({ volunteer: 1, date: -1 });
volunteerShiftSchema.index({ program: 1, date: 1 });
volunteerShiftSchema.index({ status: 1, date: 1 });

// ─── Exports ─────────────────────────────────────────────────────────────────

const Volunteer = mongoose.models.Volunteer || mongoose.model('Volunteer', volunteerSchema);
const VolunteerProgram =
  mongoose.models.VolunteerProgram || mongoose.model('VolunteerProgram', volunteerProgramSchema);
const VolunteerShift =
  mongoose.models.VolunteerShift || mongoose.model('VolunteerShift', volunteerShiftSchema);

module.exports = { Volunteer, VolunteerProgram, VolunteerShift };

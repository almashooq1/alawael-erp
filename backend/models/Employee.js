const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  type: { type: String, enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  basicSalary: { type: Number, required: true },
  allowances: {
    housing: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  status: { type: String, enum: ['ACTIVE', 'TERMINATED', 'EXPIRED'], default: 'ACTIVE' },
  documentUrl: String, // Link to uploaded PDF
});

const employeeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to auth user
    employeeId: { type: String, required: true, unique: true }, // e.g. EMP-2024-001

    // Personal Data
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    nationalId: { type: String },

    // Job Data
    department: { type: String, required: true, index: true }, // HR, Medical, Rehab
    position: { type: String, required: true }, // e.g. Senior Therapist
    role: { type: String, enum: ['ADMIN', 'DOCTOR', 'THERAPIST', 'NURSE', 'HR', 'ACCOUNTANT'], default: 'THERAPIST' },

    // Schedule
    currentShift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },

    // Contracts History
    contracts: [contractSchema],

    // Status
    status: { type: String, enum: ['ACTIVE', 'ON_LEAVE', 'TERMINATED'], default: 'ACTIVE' },
    statusNote: String,

    joinDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Virtual for Full Name
employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);

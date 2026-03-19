/**
 * Employee Model (HR)
 * Modular, extensible employee profile for HR system
 */
const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  personalInfo: {
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    nationality: String,
    nationalId: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
  },
  jobInfo: {
    department: String,
    position: String,
    employmentType: { type: String, enum: ['دائم', 'عقد', 'متدرب', 'جزئي'] },
    joinDate: Date,
    reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    salary: Number,
    salaryGrade: String,
    workLocation: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave', 'terminated'],
    default: 'active',
  },
  terminationReason: String,
  terminationDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: mongoose.Schema.Types.ObjectId,
  updatedBy: mongoose.Schema.Types.ObjectId,
});

EmployeeSchema.index({ 'personalInfo.email': 1 });
EmployeeSchema.index({ 'jobInfo.department': 1 });
EmployeeSchema.index({ 'jobInfo.position': 1 });
EmployeeSchema.index({ status: 1 });

module.exports = mongoose.model('Employee', EmployeeSchema);

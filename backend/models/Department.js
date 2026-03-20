/**
 * نموذج الأقسام / الإدارات
 * Department Model — Hierarchical organization departments
 */
const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    nameEn: { type: String, trim: true, maxlength: 100 },
    code: { type: String, unique: true, sparse: true, maxlength: 20 },
    description: { type: String, maxlength: 500 },
    type: {
      type: String,
      enum: ['department', 'division', 'unit', 'section', 'branch'],
      default: 'department',
    },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    managerName: { type: String },
    level: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    employeeCount: { type: Number, default: 0 },
    budget: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'merged'],
      default: 'active',
    },
    location: { type: String },
    phone: { type: String },
    email: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

departmentSchema.index({ parent: 1 });
departmentSchema.index({ status: 1, level: 1 });

module.exports = mongoose.models.Department || mongoose.model('Department', departmentSchema);

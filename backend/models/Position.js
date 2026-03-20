/**
 * نموذج المناصب الوظيفية
 * Position Model — Job positions within departments
 */
const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    titleEn: { type: String, trim: true, maxlength: 150 },
    code: { type: String, unique: true, sparse: true, maxlength: 20 },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    level: {
      type: String,
      enum: [
        'executive',
        'senior_management',
        'middle_management',
        'supervisor',
        'staff',
        'intern',
      ],
      default: 'staff',
    },
    type: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'temporary'],
      default: 'full_time',
    },
    status: {
      type: String,
      enum: ['active', 'vacant', 'frozen', 'cancelled'],
      default: 'active',
    },
    headcount: { type: Number, default: 1 },
    filledCount: { type: Number, default: 0 },
    minSalary: { type: Number },
    maxSalary: { type: Number },
    requiredQualification: { type: String },
    requiredExperience: { type: Number },
    responsibilities: [{ type: String }],
    skills: [{ type: String }],
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Position' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

positionSchema.index({ department: 1, status: 1 });
positionSchema.index({ level: 1 });

module.exports = mongoose.models.Position || mongoose.model('Position', positionSchema);

'use strict';

const mongoose = require('mongoose');

// ─── BranchSetting (per-branch override) ────────────────────────────────────
const branchSettingSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    key: { type: String, required: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    type: {
      type: String,
      enum: ['string', 'integer', 'float', 'boolean', 'json', 'array', 'date'],
      default: 'string',
    },
    group: {
      type: String,
      enum: [
        'general',
        'appointments',
        'scheduling',
        'billing',
        'transport',
        'notifications',
        'integrations',
        'security',
        'appearance',
        'clinical',
        'hr',
      ],
      default: 'general',
    },
    description: { type: String, default: null },
  },
  { timestamps: true }
);

branchSettingSchema.index({ branchId: 1, key: 1 }, { unique: true });
branchSettingSchema.index({ branchId: 1, group: 1 });

branchSettingSchema.methods.getParsedValue = function () {
  switch (this.type) {
    case 'integer':
      return parseInt(this.value, 10);
    case 'float':
      return parseFloat(this.value);
    case 'boolean':
      return this.value === 'true' || this.value === '1' || this.value === true;
    case 'json':
    case 'array':
      try {
        return typeof this.value === 'string' ? JSON.parse(this.value) : this.value;
      } catch {
        return null;
      }
    default:
      return this.value;
  }
};

// ─── GlobalSetting (tenant-wide defaults, branch can override) ──────────────
const globalSettingSchema = new mongoose.Schema(
  {
    group: {
      type: String,
      required: true,
      enum: [
        'general',
        'appointments',
        'billing',
        'transport',
        'notifications',
        'integrations',
        'security',
        'appearance',
        'clinical',
        'hr',
      ],
    },
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    type: {
      type: String,
      enum: [
        'string',
        'integer',
        'float',
        'boolean',
        'json',
        'array',
        'date',
        'time',
        'image',
        'file',
        'color',
        'html',
      ],
      default: 'string',
    },
    labelAr: { type: String, default: null },
    labelEn: { type: String, default: null },
    descriptionAr: { type: String, default: null },
    descriptionEn: { type: String, default: null },
    validationRules: { type: String, default: null },
    options: [{ value: mongoose.Schema.Types.Mixed, labelAr: String, labelEn: String }],
    isPublic: { type: Boolean, default: false },
    isEncrypted: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

globalSettingSchema.index({ group: 1, sortOrder: 1 });

const BranchSetting =
  mongoose.models.BranchSetting || mongoose.model('BranchSetting', branchSettingSchema);
const GlobalSetting =
  mongoose.models.GlobalSetting || mongoose.model('GlobalSetting', globalSettingSchema);

// Default export is the BranchSetting model so legacy callers keep working
// (`const BranchSetting = require('./models/BranchSetting')`); both models
// are also attached as named properties for destructuring callers
// (`const { GlobalSetting, BranchSetting } = require('./models/BranchSetting')`).
BranchSetting.BranchSetting = BranchSetting;
BranchSetting.GlobalSetting = GlobalSetting;

module.exports = BranchSetting;
module.exports.BranchSetting = BranchSetting;
module.exports.GlobalSetting = GlobalSetting;

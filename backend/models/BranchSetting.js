'use strict';

const mongoose = require('mongoose');

const branchSettingSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    key: { type: String, required: true, trim: true },
    value: { type: String, default: null },
    type: {
      type: String,
      enum: ['string', 'integer', 'boolean', 'json', 'date'],
      default: 'string',
    },
    group: {
      type: String,
      enum: ['general', 'scheduling', 'billing', 'notifications', 'hr'],
      default: 'general',
    },
    description: { type: String, default: null },
  },
  { timestamps: true }
);

branchSettingSchema.index({ branchId: 1, key: 1 }, { unique: true });
branchSettingSchema.index({ branchId: 1, group: 1 });

/**
 * الحصول على القيمة بالنوع الصحيح
 */
branchSettingSchema.methods.getParsedValue = function () {
  switch (this.type) {
    case 'integer':
      return parseInt(this.value, 10);
    case 'boolean':
      return this.value === 'true' || this.value === '1';
    case 'json':
      try {
        return JSON.parse(this.value);
      } catch {
        return null;
      }
    default:
      return this.value;
  }
};

module.exports =
  mongoose.models.BranchSetting || mongoose.model('BranchSetting', branchSettingSchema);

const mongoose = require('mongoose');

const chartOfAccountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // 1000-5400
    name_ar: { type: String, required: true },
    name_en: { type: String },
    account_type: {
      type: String,
      enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
      required: true,
    },
    account_subtype: { type: String }, // current_asset, fixed_asset, current_liability, etc.
    parent_code: { type: String },
    level: { type: Number, default: 1 }, // 1=رئيسي، 2=فرعي، 3=تفصيلي
    normal_balance: { type: String, enum: ['debit', 'credit'], required: true },
    is_active: { type: Boolean, default: true },
    is_control_account: { type: Boolean, default: false },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }, // null = مشترك
    current_balance: { type: Number, default: 0 },
    opening_balance: { type: Number, default: 0 },
    notes: { type: String },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

// REMOVED DUPLICATE: chartOfAccountSchema.index({ code: 1 }); — field already has index:true
chartOfAccountSchema.index({ account_type: 1 });
chartOfAccountSchema.index({ parent_code: 1 });
chartOfAccountSchema.index({ is_active: 1 });
chartOfAccountSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.ChartOfAccount || mongoose.model('ChartOfAccount', chartOfAccountSchema);

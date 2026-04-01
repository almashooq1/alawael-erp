/**
 * InventoryTransaction Model — نموذج حركات المخزون
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema(
  {
    transaction_number: { type: String, unique: true }, // TXN-YYYY-XXXXXXX
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },

    transaction_type: {
      type: String,
      enum: [
        'receipt', // استلام من مورد
        'issue', // صرف للاستخدام
        'return', // إرجاع للمخزون
        'transfer', // نقل بين فروع
        'adjustment_add', // تسوية زيادة
        'adjustment_sub', // تسوية نقص
        'disposal', // إتلاف
        'purchase_return', // إرجاع للمورد
      ],
      required: true,
    },

    quantity: { type: Number, required: true },
    unit_cost: { type: Number, default: 0 },
    total_cost: { type: Number, default: 0 },

    // الرصيد قبل وبعد
    quantity_before: { type: Number, required: true },
    quantity_after: { type: Number, required: true },

    // المرجع
    reference_type: { type: String }, // 'PurchaseOrder', 'ServiceRequest', 'StockAdjustment'
    reference_id: { type: mongoose.Schema.Types.ObjectId },
    reference_number: { type: String },

    // للتحويل بين الفروع
    from_branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    to_branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    // الصرف
    issued_to_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issued_to_department: { type: String },
    purpose: { type: String }, // الغرض من الصرف

    // انتهاء الصلاحية
    expiry_date: { type: Date },
    batch_number: { type: String },

    notes: { type: String },
    attachment: { type: String },

    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transaction_date: { type: Date, default: Date.now },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

inventoryTransactionSchema.pre('save', async function (next) {
  if (!this.transaction_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('InventoryTransaction').countDocuments();
    this.transaction_number = `TXN-${year}-${String(count + 1).padStart(7, '0')}`;
  }
  this.total_cost = this.quantity * (this.unit_cost || 0);
  next();
});

inventoryTransactionSchema.index({ item_id: 1, transaction_date: -1 });
inventoryTransactionSchema.index({ transaction_type: 1, transaction_date: -1 });
inventoryTransactionSchema.index({ branch_id: 1, transaction_date: -1 });
inventoryTransactionSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.InventoryTransaction ||
  mongoose.model('InventoryTransaction', inventoryTransactionSchema);

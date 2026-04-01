/**
 * InventoryItem Model — نموذج عناصر المخزون
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    item_code: { type: String, unique: true }, // ITM-YYYY-XXXXX
    barcode: { type: String, unique: true, sparse: true },
    name_ar: { type: String, required: true, trim: true },
    name_en: { type: String, trim: true },
    description: { type: String },

    category: {
      type: String,
      enum: [
        'medical_supplies', // مستلزمات طبية
        'therapy_equipment', // معدات علاجية
        'office_supplies', // مستلزمات مكتبية
        'cleaning_supplies', // مستلزمات تنظيف
        'spare_parts', // قطع غيار
        'assistive_devices', // أجهزة مساعدة
        'educational_materials', // مواد تعليمية
        'personal_protective', // معدات حماية شخصية
        'food_nutrition', // غذاء وتغذية
        'other',
      ],
      required: true,
    },

    sub_category: { type: String },
    unit_of_measure: { type: String, default: 'piece', required: true }, // piece, box, kg, liter...

    // الأسعار
    unit_cost: { type: Number, default: 0 },
    unit_price: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },

    // المخزون
    quantity_on_hand: { type: Number, default: 0 },
    quantity_reserved: { type: Number, default: 0 }, // محجوز
    quantity_on_order: { type: Number, default: 0 }, // في طلبيات مفتوحة
    quantity_available: { type: Number, default: 0 }, // متاح = on_hand - reserved

    // الحدود
    minimum_stock: { type: Number, default: 0 }, // الحد الأدنى (تنبيه عند الوصول)
    maximum_stock: { type: Number, default: 0 }, // الحد الأقصى
    reorder_point: { type: Number, default: 0 }, // نقطة إعادة الطلب
    reorder_quantity: { type: Number, default: 0 }, // كمية إعادة الطلب

    // الموقع في المستودع
    location: {
      warehouse: { type: String },
      aisle: { type: String },
      shelf: { type: String },
      bin: { type: String },
    },

    // المورد
    preferred_supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    supplier_item_code: { type: String }, // كود العنصر عند المورد

    // انتهاء الصلاحية
    has_expiry: { type: Boolean, default: false },
    expiry_warning_days: { type: Number, default: 30 },

    // الصور
    images: [{ type: String }],

    is_active: { type: Boolean, default: true },
    is_consumable: { type: Boolean, default: true }, // مستهلك أم ثابت
    requires_maintenance: { type: Boolean, default: false },

    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

inventoryItemSchema.pre('save', async function (next) {
  if (!this.item_code) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('InventoryItem').countDocuments();
    this.item_code = `ITM-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  // حساب الكمية المتاحة
  this.quantity_available = Math.max(0, this.quantity_on_hand - this.quantity_reserved);
  next();
});

inventoryItemSchema.index({ category: 1, is_active: 1 });
inventoryItemSchema.index({ quantity_on_hand: 1, minimum_stock: 1 });
inventoryItemSchema.index({ name_ar: 'text', name_en: 'text', barcode: 'text', item_code: 'text' });
inventoryItemSchema.index({ branch_id: 1, category: 1 });
inventoryItemSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);

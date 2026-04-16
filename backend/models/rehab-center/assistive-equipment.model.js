'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const assistiveEquipmentSchema = new Schema(
  {
    equipment_id: {
      type: String,
      unique: true,
      default: () => `EQP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },

    // معلومات المعدات
    name_ar: { type: String, required: true },
    name_en: String,
    description: String,
    category: {
      type: String,
      enum: [
        'mobility_aids', // وسائل المساعدة على الحركة
        'communication_aids', // وسائل التواصل
        'sensory_aids', // الوسائل الحسية
        'daily_living_aids', // وسائل الحياة اليومية
        'computer_access', // الوصول للكمبيوتر
        'environmental_control', // التحكم البيئي
        'recreational', // ترفيهية
        'therapeutic', // علاجية
        'educational', // تعليمية
        'safety_equipment', // معدات السلامة
      ],
    },

    // المواصفات
    specifications: {
      brand: String,
      model: String,
      serial_number: String,
      manufacturer: String,
      year_of_manufacture: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: { type: String, default: 'cm' },
      },
      weight: Number,
      color: String,
      material: String,
    },

    // حالة المعدات
    condition: {
      status: {
        type: String,
        enum: ['new', 'excellent', 'good', 'fair', 'poor', 'needs_repair', 'out_of_service'],
        default: 'new',
      },
      last_inspection_date: Date,
      next_inspection_date: Date,
      inspection_notes: String,
    },

    // الموقع
    location: {
      building: String,
      floor: String,
      room: String,
      storage_location: String,
    },

    // الملكية والإعارة
    ownership: {
      type: { type: String, enum: ['owned', 'rented', 'donated', 'loaned', 'government_provided'] },
      purchase_date: Date,
      purchase_price: Number,
      warranty_expiry: Date,
      funding_source: String,
    },

    // إسناد المعدات لمستفيد
    assignment: {
      is_assigned: { type: Boolean, default: false },
      beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
      beneficiary_name: String,
      assignment_date: Date,
      expected_return_date: Date,
      actual_return_date: Date,
      assignment_purpose: String,
      training_provided: { type: Boolean, default: false },
      training_date: Date,
      trainer: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    // سجل الإعارة
    loan_history: [
      {
        beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
        beneficiary_name: String,
        loan_start_date: Date,
        expected_return_date: Date,
        actual_return_date: Date,
        condition_at_checkout: String,
        condition_at_return: String,
        notes: String,
      },
    ],

    // الصيانة
    maintenance_records: [
      {
        maintenance_id: String,
        maintenance_type: {
          type: String,
          enum: ['preventive', 'corrective', 'emergency', 'upgrade'],
        },
        maintenance_date: Date,
        performed_by: String,
        description: String,
        parts_replaced: [String],
        cost: Number,
        next_maintenance_date: Date,
        maintenance_notes: String,
      },
    ],

    // فاتورة المعدات
    availability: {
      is_available: { type: Boolean, default: true },
      unavailable_reason: String,
      reservation: [
        {
          reserved_by: { type: Schema.Types.ObjectId, ref: 'User' },
          reservation_date: Date,
          start_date: Date,
          end_date: Date,
          purpose: String,
        },
      ],
    },

    // صور المعدات
    images: [
      {
        image_url: String,
        image_type: String,
        upload_date: { type: Date, default: Date.now },
      },
    ],

    // دليل الاستخدام
    user_manual: {
      manual_url: String,
      training_video_url: String,
      quick_start_guide: String,
    },

    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const AssistiveEquipment =
  mongoose.models.AssistiveEquipment ||
  mongoose.model('AssistiveEquipment', assistiveEquipmentSchema);

module.exports = AssistiveEquipment;

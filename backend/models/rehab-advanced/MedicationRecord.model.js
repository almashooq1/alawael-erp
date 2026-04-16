'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const medicationRecordSchema = new Schema(
  {
    record_id: {
      type: String,
      unique: true,
      default: () => `MED-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // معلومات الدواء
    medication_info: {
      medication_name: { type: String, required: true },
      generic_name: String,
      dosage: { type: String, required: true },
      unit: String, // mg, ml, etc.
      form: {
        type: String,
        enum: ['tablet', 'capsule', 'liquid', 'injection', 'patch', 'inhaler', 'drops', 'other'],
      },
      route: {
        type: String,
        enum: ['oral', 'injection', 'topical', 'inhalation', 'nasal', 'rectal', 'other'],
      },
      frequency: String,
      times: [String], // أوقات الجرعات
      instructions: String,
      purpose: String,
      prescriber: {
        name: String,
        specialization: String,
        phone: String,
      },
    },

    // تواريخ العلاج
    treatment_period: {
      start_date: { type: Date, required: true },
      end_date: Date,
      is_ongoing: { type: Boolean, default: true },
    },

    // الجرد
    inventory: {
      current_stock: Number,
      unit_of_measure: String,
      reorder_level: Number,
      storage_instructions: String,
      location: String,
      expiry_date: Date,
      last_restock_date: Date,
      batch_number: String,
    },

    // سجل الإعطاء
    administration_log: [
      {
        date: { type: Date, required: true },
        time: { type: String, required: true },
        dosage_given: String,
        administered_by: { type: Schema.Types.ObjectId, ref: 'User' },
        route: String,
        site: String, // للحقن
        notes: String,
        refused: { type: Boolean, default: false },
        refusal_reason: String,
        witness: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // الآثار الجانبية
    side_effects: [
      {
        date: Date,
        effect: String,
        severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
        action_taken: String,
        reported_to_physician: { type: Boolean, default: false },
        physician_response: String,
      },
    ],

    // التفاعلات الدوائية
    drug_interactions: [
      {
        interacting_medication: String,
        interaction_type: String,
        severity: String,
        recommendation: String,
      },
    ],

    // التوقف عن الدواء
    discontinuation: {
      discontinued: { type: Boolean, default: false },
      date: Date,
      reason: String,
      tapering_schedule: String,
      discontinued_by: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    status: {
      type: String,
      enum: ['active', 'on_hold', 'discontinued', 'completed'],
      default: 'active',
    },

    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

medicationRecordSchema.index({ beneficiary_id: 1, status: 1 });

const MedicationRecord =
  mongoose.models.MedicationRecord || mongoose.model('MedicationRecord', medicationRecordSchema);

module.exports = MedicationRecord;

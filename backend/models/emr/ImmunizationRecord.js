/**
 * ImmunizationRecord.js — نموذج التطعيمات
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImmunizationRecordSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    medicalRecord: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    vaccine: {
      name: { ar: { type: String, required: true }, en: String },
      code: String,
      type: {
        type: String,
        enum: ['routine', 'travel', 'occupational', 'catch_up', 'booster', 'other'],
        default: 'routine',
      },
    },
    doseNumber: { type: Number, default: 1 },
    totalDoses: Number,
    dateAdministered: { type: Date, required: true },
    expirationDate: Date,
    lotNumber: String,
    manufacturer: String,
    site: {
      type: String,
      enum: ['left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'oral', 'nasal', 'other'],
    },
    route: {
      type: String,
      enum: ['im', 'sc', 'oral', 'id', 'nasal', 'other'],
      default: 'im',
    },
    administeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    administeredAt: String,
    nextDoseDue: Date,
    status: {
      type: String,
      enum: ['completed', 'pending', 'overdue', 'contraindicated', 'not_indicated'],
      default: 'completed',
    },
    reactions: [
      {
        description: String,
        severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
        date: Date,
      },
    ],
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ImmunizationRecordSchema.index({ beneficiary: 1, dateAdministered: -1 });
ImmunizationRecordSchema.index({ 'vaccine.name.ar': 'text' });
ImmunizationRecordSchema.index({ status: 1, nextDoseDue: 1 });

module.exports =
  mongoose.models.EmrImmunizationRecord ||
  mongoose.model('EmrImmunizationRecord', ImmunizationRecordSchema);

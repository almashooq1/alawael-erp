/**
 * VitalSigns.js — نموذج العلامات الحيوية
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VitalSignsSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    medicalRecord: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    recordedAt: { type: Date, default: Date.now, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    encounter: { type: Schema.Types.ObjectId },
    temperature: {
      value: Number,
      unit: { type: String, enum: ['celsius', 'fahrenheit'], default: 'celsius' },
      method: { type: String, enum: ['oral', 'axillary', 'rectal', 'tympanic', 'temporal'] },
    },
    bloodPressure: {
      systolic: Number,
      diastolic: Number,
      position: { type: String, enum: ['sitting', 'standing', 'supine'] },
      arm: { type: String, enum: ['left', 'right'] },
    },
    heartRate: {
      value: Number,
      rhythm: { type: String, enum: ['regular', 'irregular'], default: 'regular' },
    },
    respiratoryRate: Number,
    oxygenSaturation: {
      value: Number,
      onOxygen: { type: Boolean, default: false },
      oxygenFlow: Number,
    },
    weight: {
      value: Number,
      unit: { type: String, enum: ['kg', 'lb'], default: 'kg' },
      method: { type: String, enum: ['standing', 'wheelchair', 'bed', 'estimated'] },
    },
    height: {
      value: Number,
      unit: { type: String, enum: ['cm', 'inch'], default: 'cm' },
    },
    bmi: Number,
    painLevel: {
      score: { type: Number, min: 0, max: 10 },
      location: String,
      type: { type: String, enum: ['sharp', 'dull', 'throbbing', 'burning', 'aching', 'other'] },
    },
    bloodGlucose: {
      value: Number,
      timing: { type: String, enum: ['fasting', 'random', 'pre_meal', 'post_meal', 'bedtime'] },
    },
    headCircumference: Number,
    notes: String,
    abnormalFlags: [String],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

VitalSignsSchema.index({ beneficiary: 1, recordedAt: -1 });
VitalSignsSchema.index({ recordedAt: -1 });

VitalSignsSchema.pre('save', async function () {
  if (this.weight?.value && this.height?.value) {
    const weightKg = this.weight.unit === 'lb' ? this.weight.value * 0.453592 : this.weight.value;
    const heightM = this.height.unit === 'inch' ? this.height.value * 0.0254 : this.height.value / 100;
    if (heightM > 0) {
      this.bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
    }
  }
});

module.exports =
  mongoose.models.EmrVitalSigns ||
  mongoose.model('EmrVitalSigns', VitalSignsSchema);

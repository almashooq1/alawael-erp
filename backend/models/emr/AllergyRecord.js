/**
 * AllergyRecord.js — نموذج سجل الحساسية
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AllergyRecordSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    medicalRecord: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    allergen: {
      name: { ar: { type: String, required: true }, en: String },
      code: String,
      type: {
        type: String,
        enum: ['medication', 'food', 'environmental', 'biological', 'chemical', 'latex', 'other'],
        required: true,
      },
    },
    reaction: {
      description: { ar: String, en: String },
      manifestation: {
        type: String,
        enum: [
          'rash',
          'hives',
          'itching',
          'swelling',
          'anaphylaxis',
          'respiratory',
          'gastrointestinal',
          'cardiovascular',
          'neurological',
          'other',
        ],
      },
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'life_threatening'],
        required: true,
      },
    },
    clinicalStatus: {
      type: String,
      enum: ['active', 'inactive', 'resolved'],
      default: 'active',
    },
    verificationStatus: {
      type: String,
      enum: ['unconfirmed', 'confirmed', 'refuted', 'entered_in_error'],
      default: 'unconfirmed',
    },
    onsetDate: Date,
    recordedDate: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastOccurrence: Date,
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AllergyRecordSchema.index({ beneficiary: 1, clinicalStatus: 1 });
AllergyRecordSchema.index({ 'allergen.type': 1 });
AllergyRecordSchema.index({ 'allergen.name.ar': 'text', 'allergen.name.en': 'text' });

module.exports =
  mongoose.models.EmrAllergyRecord ||
  mongoose.model('EmrAllergyRecord', AllergyRecordSchema);

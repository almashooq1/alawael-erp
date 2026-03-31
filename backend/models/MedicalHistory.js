/**
 * MedicalHistory Model — التاريخ الطبي للمستفيد
 * Based on: medical_histories table (prompt_02 §5.2)
 */
const mongoose = require('mongoose');

const MedicalHistorySchema = new mongoose.Schema(
  {
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true,
    },
    // أمراض مزمنة
    chronicConditions: [{ type: String, trim: true }],
    // حساسيات
    allergies: [{ type: String, trim: true }],
    // أدوية حالية
    currentMedications: [
      {
        name: String,
        dose: String,
        frequency: String,
        startDate: Date,
        prescribedBy: String,
      },
    ],
    // عمليات سابقة
    previousSurgeries: [
      {
        name: String,
        date: Date,
        hospital: String,
        notes: String,
      },
    ],
    // التاريخ العائلي المرضي
    familyHistory: [
      {
        condition: String,
        relation: String,
        notes: String,
      },
    ],
    // تاريخ الولادة والحمل
    birthHistory: { type: String },
    birthWeightKg: { type: Number, min: 0.5, max: 10 },
    birthType: {
      type: String,
      enum: ['normal', 'cesarean', 'premature'],
    },
    gestationalAgeWeeks: { type: Number, min: 20, max: 45 },
    neonatalComplications: { type: String },
    // المراحل التطورية
    developmentalMilestones: {
      sittingAge: Number, // بالأشهر
      standingAge: Number,
      walkingAge: Number,
      firstWordsAge: Number,
      phrases2WordsAge: Number,
      toiletTrainedAge: Number,
    },
    // تطعيمات
    immunizations: [
      {
        vaccine: String,
        date: Date,
        doseNumber: Number,
        administeredBy: String,
      },
    ],
    // قيود غذائية
    dietaryRestrictions: { type: String },
    // احتياطات خاصة
    specialPrecautions: { type: String },
    notes: { type: String },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

MedicalHistorySchema.index({ beneficiary: 1 });

module.exports = mongoose.model('MedicalHistory', MedicalHistorySchema);

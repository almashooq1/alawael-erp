'use strict';

const mongoose = require('mongoose');

// ============================
// 1. أنواع المقاييس (Measurement Types)
// ============================
const MeasurementTypeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      example: 'INTEL_008',
    },

    nameAr: {
      type: String,
      required: true,
      trim: true,
      example: 'مقياس الذكاء',
    },

    nameEn: {
      type: String,
      required: true,
      trim: true,
      example: 'Intelligence Scale',
    },

    category: {
      type: String,
      required: true,
      enum: [
        'GENERAL', // مقاييس عامة أساسية
        'EDUCATIONAL', // مقاييس تربوية وتعليمية
        'BEHAVIORAL', // مقاييس سلوكية ونفسية
        'AUTISM_SPECTRUM', // مقاييس خاصة بالتوحد
        'DAILY_LIVING', // مقاييس مهارات الحياة اليومية
        'VOCATIONAL', // مقاييس التأهيل المهني
        'LANGUAGE_COMMUNICATION', // مقاييس اللغة والتواصل
        'MOTOR_SKILLS', // مقاييس المهارات الحركية
        'SOCIAL_EMOTIONAL', // مقاييس اجتماعية عاطفية
      ],
    },

    description: String,

    targetDisabilities: [
      {
        type: String,
        enum: [
          'INTELLECTUAL',
          'MOTOR',
          'VISUAL',
          'HEARING',
          'AUTISM',
          'SPEECH_LANGUAGE',
          'LEARNING_DISABILITY',
          'DEVELOPMENTAL',
          'MULTIPLE',
          'OTHER',
        ],
      },
    ],

    ageRange: {
      minAge: Number,
      maxAge: Number,
      description: String,
    },

    estimatedTime: {
      type: Number,
      description: 'المدة التقريبية بالدقائق',
    },

    isStandardized: {
      type: Boolean,
      default: false,
      description: 'متقارن/معياري؟',
    },

    normSource: {
      type: String,
      description: 'مصدر المعايير (وكسلر، ستانفورد بينيه، إلخ)',
    },

    scoringMethod: {
      type: String,
      enum: ['LIKERT', 'RAW_SCORE', 'STANDARD_SCORE', 'PERCENTILE', 'QUALITATIVE', 'CHECKLIST'],
      required: true,
    },

    scoreRange: {
      min: Number,
      max: Number,
      description: String,
    },

    interpretationLevels: [
      {
        level: String, // مثل: شديد، متوسط، طبيعي
        minScore: Number,
        maxScore: Number,
        description: String,
        recommendations: [String],
      },
    ],

    domains: [
      {
        code: String,
        name: String,
        description: String,
        weight: Number, // النسبة في الدرجة الكلية
      },
    ],

    administratedBy: {
      type: String,
      enum: ['PSYCHOLOGIST', 'EDUCATOR', 'SPEECH_THERAPIST', 'PHYSIOTHERAPIST', 'GENERAL_STAFF'],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'measurement_types' }
);

// ============================
// Indexes
// ============================
MeasurementTypeSchema.index({ category: 1, isActive: 1 });
MeasurementTypeSchema.index({ targetDisabilities: 1 });
MeasurementTypeSchema.index({ scoringMethod: 1 });

const MeasurementType =
  mongoose.models.MeasurementType || mongoose.model('MeasurementType', MeasurementTypeSchema);

module.exports = MeasurementType;

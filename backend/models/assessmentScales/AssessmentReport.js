/**
 * AssessmentReport.js — تقارير التقييم المُولَّدة
 * Generated Assessment Reports (PDF/DOCX)
 */

'use strict';

const mongoose = require('mongoose');

const assessmentReportSchema = new mongoose.Schema(
  {
    // ── الارتباط ──────────────────────────────────────────────
    assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalAssessment',
      required: [true, 'التقييم مطلوب'],
      index: true,
    },

    // ── رقم التقرير ──────────────────────────────────────────
    report_number: {
      type: String,
      unique: true,
      sparse: true,
      // RPT-ASMT-2026-00001
    },

    // ── معلومات التقرير ───────────────────────────────────────
    template_name: { type: String, trim: true }, // اسم القالب
    title_ar: { type: String, required: [true, 'عنوان التقرير بالعربية مطلوب'], trim: true },
    title_en: { type: String, trim: true },

    // ── أقسام التقرير ─────────────────────────────────────────
    sections: {
      type: [
        {
          title: String,
          content: String,
          order: Number,
        },
      ],
      default: [],
    },

    // ── الملف المُولَّد ───────────────────────────────────────
    file_path: { type: String, trim: true }, // المسار النسبي في التخزين
    file_format: {
      type: String,
      enum: ['pdf', 'docx', 'html'],
      default: 'pdf',
    },
    file_size_bytes: { type: Number, default: null },

    // ── الحالة والتوقيع ───────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'final', 'signed'],
      default: 'draft',
    },
    signed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    signed_at: { type: Date, default: null },
    signature_image_path: { type: String, trim: true },

    // ── الإنشاء ───────────────────────────────────────────────
    generated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'assessment_reports',
  }
);

// ── Pre-save: توليد رقم التقرير ─────────────────────────────────
assessmentReportSchema.pre('save', async function (next) {
  if (this.isNew && !this.report_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    });
    this.report_number = `RPT-ASMT-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── Virtuals ────────────────────────────────────────────────────
assessmentReportSchema.virtual('is_signed').get(function () {
  return this.status === 'signed' && !!this.signed_by;
});

module.exports =
  mongoose.models.AssessmentReport || mongoose.model('AssessmentReport', assessmentReportSchema);

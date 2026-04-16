'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const generatedReportSchema = new Schema(
  {
    report_id: {
      type: String,
      unique: true,
      default: () => `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },

    template_id: { type: Schema.Types.ObjectId, ref: 'ReportTemplate' },
    report_title: String,
    report_type: String,

    // معايير التقرير
    criteria: {
      date_range: {
        start_date: Date,
        end_date: Date,
      },
      filters: Schema.Types.Mixed,
      parameters_used: Schema.Types.Mixed,
    },

    // البيانات
    data: Schema.Types.Mixed,

    // الملخص التنفيذي
    executive_summary: String,

    // النتائج الرئيسية
    key_findings: [String],

    // التوصيات
    recommendations: [String],

    // حالة التقرير
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed', 'archived'],
      default: 'generating',
    },

    // ملف التقرير
    file: {
      file_name: String,
      file_url: String,
      file_format: { type: String, enum: ['pdf', 'excel', 'word', 'html'] },
      file_size: Number,
    },

    // المشاركة
    sharing: {
      is_shared: { type: Boolean, default: false },
      shared_with: [
        {
          user_id: { type: Schema.Types.ObjectId, ref: 'User' },
          shared_at: Date,
          permission: { type: String, enum: ['view', 'download', 'edit'] },
        },
      ],
      public_link: String,
      link_expiry: Date,
    },

    generated_by: { type: Schema.Types.ObjectId, ref: 'User' },
    generated_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const GeneratedReport =
  mongoose.models.GeneratedReport || mongoose.model('GeneratedReport', generatedReportSchema);

module.exports = GeneratedReport;

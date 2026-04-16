'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const reportTemplateSchema = new Schema(
  {
    template_id: {
      type: String,
      unique: true,
      default: () => `TPL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },

    template_name: { type: String, required: true },
    template_type: {
      type: String,
      enum: [
        'progress_report',
        'assessment_report',
        'program_evaluation',
        'statistical_report',
        'compliance_report',
        'financial_report',
        'performance_report',
        'custom',
      ],
    },

    description: String,
    sections: [
      {
        section_id: String,
        section_title: String,
        section_type: { type: String, enum: ['text', 'table', 'chart', 'metrics', 'list'] },
        data_source: String,
        fields: [String],
        formatting: Schema.Types.Mixed,
      },
    ],

    parameters: [
      {
        parameter_name: String,
        parameter_type: String,
        default_value: Schema.Types.Mixed,
        is_required: { type: Boolean, default: true },
      },
    ],

    // الصلاحيات
    permissions: {
      roles_allowed: [String],
      requires_approval: { type: Boolean, default: false },
    },

    // التنسيق
    format_options: {
      header_template: String,
      footer_template: String,
      logo_url: String,
      paper_size: { type: String, default: 'A4' },
      orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    },

    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const ReportTemplate =
  mongoose.models.ReportTemplate || mongoose.model('ReportTemplate', reportTemplateSchema);

module.exports = ReportTemplate;

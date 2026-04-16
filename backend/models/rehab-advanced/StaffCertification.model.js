'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const staffCertificationSchema = new Schema(
  {
    certification_id: {
      type: String,
      unique: true,
      default: () => `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    staff_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // معلومات الشهادة
    certification_info: {
      certification_name: { type: String, required: true },
      issuing_organization: { type: String, required: true },
      certification_type: {
        type: String,
        enum: ['professional', 'specialty', 'continuing_education', 'license', 'accreditation'],
      },
      category: String,
      level: String,
    },

    // التواريخ
    dates: {
      issue_date: { type: Date, required: true },
      expiry_date: Date,
      is_lifetime: { type: Boolean, default: false },
      renewal_due_date: Date,
    },

    // رقم الشهادة
    credential_number: String,

    // الحالة
    status: {
      type: String,
      enum: ['active', 'expired', 'pending_renewal', 'revoked', 'inactive'],
      default: 'active',
    },

    // التجديد
    renewals: [
      {
        renewal_date: Date,
        renewed_by: String,
        new_expiry_date: Date,
        ce_hours: Number,
        notes: String,
      },
    ],

    // ساعات التعليم المستمر
    continuing_education: {
      total_hours_required: Number,
      hours_completed: Number,
      courses: [
        {
          course_name: String,
          provider: String,
          date: Date,
          hours: Number,
          certificate_url: String,
        },
      ],
    },

    // المرفقات
    documents: [
      {
        document_type: String,
        file_name: String,
        file_url: String,
        upload_date: { type: Date, default: Date.now },
      },
    ],

    // التحقق
    verification: {
      verified: { type: Boolean, default: false },
      verified_by: { type: Schema.Types.ObjectId, ref: 'User' },
      verification_date: Date,
      verification_method: String,
    },

    notes: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

staffCertificationSchema.index({ staff_id: 1, status: 1 });

const StaffCertification =
  mongoose.models.StaffCertification ||
  mongoose.model('StaffCertification', staffCertificationSchema);

module.exports = StaffCertification;

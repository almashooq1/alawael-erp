'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const referralSchema = new Schema(
  {
    referral_id: {
      type: String,
      unique: true,
      default: () => `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },

    // معلومات المحول
    referral_source: {
      source_type: {
        type: String,
        enum: [
          'self',
          'family',
          'hospital',
          'school',
          'social_services',
          'physician',
          'internal',
          'other_center',
          'insurance',
        ],
      },
      organization_name: String,
      contact_person: String,
      contact_phone: String,
      contact_email: String,
      referral_reason: String,
    },

    // معلومات المستفيد
    beneficiary: {
      beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
      national_id: String,
      name: String,
      date_of_birth: Date,
      disability_type: String,
      contact_phone: String,
    },

    // تفاصيل التحويل
    referral_details: {
      referral_type: {
        type: String,
        enum: [
          'new_intake',
          'transfer',
          'consultation',
          'specialized_service',
          'external_specialist',
          'equipment',
          're_evaluation',
        ],
      },
      priority: {
        type: String,
        enum: ['routine', 'urgent', 'emergency'],
        default: 'routine',
      },
      requested_services: [String],
      medical_history_summary: String,
      current_medications: [String],
      previous_interventions: String,
      attachments: [
        {
          file_name: String,
          file_url: String,
          document_type: String,
        },
      ],
    },

    // التقييم الأولي
    initial_screening: {
      screening_date: Date,
      screener: { type: Schema.Types.ObjectId, ref: 'User' },
      eligibility_status: {
        type: String,
        enum: ['eligible', 'conditionally_eligible', 'ineligible', 'needs_assessment'],
      },
      recommended_program: String,
      estimated_service_intensity: String,
      screening_notes: String,
    },

    // قبول التحويل
    acceptance: {
      status: {
        type: String,
        enum: [
          'pending',
          'under_review',
          'accepted',
          'conditionally_accepted',
          'rejected',
          'waitlisted',
        ],
        default: 'pending',
      },
      decision_date: Date,
      decision_maker: { type: Schema.Types.ObjectId, ref: 'User' },
      assigned_program: String,
      assigned_case_manager: { type: Schema.Types.ObjectId, ref: 'User' },
      start_date: Date,
      rejection_reason: String,
      alternative_recommendations: String,
    },

    // التحويلات الخارجية
    external_referrals: [
      {
        referred_to_organization: String,
        referred_to_service: String,
        referral_date: Date,
        reason_for_referral: String,
        contact_person: String,
        follow_up_date: Date,
        response_received: { type: Boolean, default: false },
        outcome: String,
      },
    ],

    // المتابعة
    follow_up: [
      {
        follow_up_date: Date,
        contact_method: String,
        contact_person: String,
        notes: String,
        next_action: String,
        responsible_staff: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

referralSchema.index({ 'acceptance.status': 1, createdAt: 1 });
referralSchema.index({ 'beneficiary.beneficiary_id': 1 });

const Referral = mongoose.models.Referral || mongoose.model('Referral', referralSchema);

module.exports = Referral;

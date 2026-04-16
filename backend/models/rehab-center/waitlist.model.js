'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const waitlistSchema = new Schema(
  {
    waitlist_id: {
      type: String,
      unique: true,
      default: () => `WAIT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },

    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    beneficiary_name: String,

    // نوع الخدمة المطلوبة
    requested_service: {
      service_type: String,
      program_name: String,
      preferred_schedule: {
        days: [String],
        time_preference: String,
      },
      preferred_therapist: String,
    },

    // معلومات الانتظار
    waitlist_info: {
      registration_date: { type: Date, default: Date.now },
      priority_score: { type: Number, default: 0 },
      priority_factors: [
        {
          factor: String,
          score: Number,
        },
      ],
      estimated_wait_time: Number, // بالأيام
      position: Number,
    },

    // الحالة
    status: {
      type: String,
      enum: [
        'waiting',
        'contacted',
        'offer_made',
        'accepted',
        'declined',
        'removed',
        'transferred',
      ],
      default: 'waiting',
    },

    // جهات الاتصال
    contact_attempts: [
      {
        contact_date: Date,
        contact_method: String,
        contact_result: String,
        notes: String,
        contacted_by: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // العروض
    service_offers: [
      {
        offer_date: Date,
        offered_service: String,
        offered_schedule: String,
        response_deadline: Date,
        response: { type: String, enum: ['pending', 'accepted', 'declined'] },
        response_date: Date,
        response_reason: String,
      },
    ],

    // سبب الإزالة
    removal_info: {
      removal_date: Date,
      removal_reason: String,
      removed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    notes: String,
    assigned_to: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

waitlistSchema.index({ status: 1, 'waitlist_info.priority_score': -1 });
waitlistSchema.index({ requested_service: 1 });

const Waitlist = mongoose.models.Waitlist || mongoose.model('Waitlist', waitlistSchema);

module.exports = Waitlist;

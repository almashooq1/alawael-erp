const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,

    // Status Logic
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'ASSESSMENT_BOOKED', 'CONVERTED', 'LOST'],
      default: 'NEW',
    },

    // Referral Source (Where did they come from?)
    source: { type: String, enum: ['WEBSITE', 'REFERRAL', 'WALK_IN', 'SOCIAL_MEDIA'], default: 'WALK_IN' },

    // What are they interested in?
    interest: [{ type: String }], // 'Speech Therapy', 'Autism Program'

    // AI Scoring
    leadScore: { type: Number, default: 0 }, // 0-100
    conversionProbability: { type: String, default: 'LOW' }, // LOW, MEDIUM, HIGH

    // Follow up
    lastContactDate: Date,
    nextFollowUpDate: Date,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Employee handling this lead

    notes: [{ body: String, date: Date, by: String }],
  },
  { timestamps: true },
);

module.exports = mongoose.model('Lead', leadSchema);

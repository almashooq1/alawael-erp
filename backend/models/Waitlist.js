const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryFile', required: true },

    // Preferences
    department: { type: String, required: true }, // SPEECH, OT, etc.
    preferredTherapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional

    preferredDays: [{ type: String, enum: ['SUN', 'MON', 'TUE', 'WED', 'THU'] }],
    preferredTimeRange: {
      start: String, // "14:00"
      end: String, // "18:00"
    },

    priority: { type: String, enum: ['HIGH', 'NORMAL', 'LOW'], default: 'NORMAL' },
    notes: String,

    status: { type: String, enum: ['WAITING', 'OFFERED', 'BOOKED', 'EXPIRED'], default: 'WAITING' },
    expertiryDate: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Waitlist', waitlistSchema);

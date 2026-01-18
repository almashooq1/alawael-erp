const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['DONE', 'PARTIAL', 'SKIPPED'], required: true },
  parentNote: String,
  mediaUrl: String, // Video/Photo proof
  feedbackFromTherapist: String,
});

const homeAssignmentSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryFile', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Therapist

    title: { type: String, required: true }, // e.g., "Daily Stretching"
    description: { type: String, required: true }, // Instructions
    videoUrl: String, // Tutorial link

    frequency: { type: String, enum: ['DAILY', 'WEEKLY', 'ALTERNATE_DAYS'], default: 'DAILY' },

    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },

    submissions: [submissionSchema],

    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'], default: 'ACTIVE' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('HomeAssignment', homeAssignmentSchema);

const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  label: String, // e.g. "Fine Motor Skills"
  score: Number, // Raw score
  maxScore: Number,
  notes: String,
});

const standardizedAssessmentSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryFile', required: true },
    evaluator: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

    // Test Details
    name: { type: String, required: true }, // e.g. "GMFM-88", "CARS", "Vineland-3"
    date: { type: Date, default: Date.now },

    // Scoring
    totalScore: { type: Number, required: true },
    interpretation: { type: String }, // e.g. "Moderate Delay"
    sections: [sectionSchema], // Breakdown

    attachments: [String], // Scan of the paper form
    recommendations: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model('StandardizedAssessment', standardizedAssessmentSchema);

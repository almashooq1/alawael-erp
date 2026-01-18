const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  description: { type: String, required: true },
  targetDate: Date,
  status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'ACHIEVED', 'CANCELLED'], default: 'PENDING' },
  progress: { type: Number, default: 0 }, // 0-100%
});

const therapeuticPlanSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryFile', required: true },
    program: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapyProgram', required: true },

    // The team assigned to this specific patient's plan
    careManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Supervisor
    assignedTherapists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],

    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },

    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'], default: 'ACTIVE' },

    // Goals (Individualized Education Plan - IEP)
    goals: [goalSchema],

    initialAssessment: { type: String }, // Summary or Link to assessment ID

    // Financial
    paymentMethod: { type: String, enum: ['SELF_PAY', 'INSURANCE', 'SPONSORED'], default: 'SELF_PAY' },
    insuranceApprovalCode: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model('TherapeuticPlan', therapeuticPlanSchema);

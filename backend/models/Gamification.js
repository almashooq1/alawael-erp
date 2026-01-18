const mongoose = require('mongoose');

// Badge Definition (Admin Configured)
const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Homework Hero"
  description: { type: String },
  icon: { type: String }, // URL or icon key

  // Automatic Awarding Rules
  actionType: { type: String, enum: ['SESSION_ATTENDANCE', 'HOMEWORK_SUBMISSION', 'EARLY_ARRIVAL'] },
  threshold: { type: Number, default: 1 }, // e.g., 5 sessions
  pointsValue: { type: Number, default: 50 }, // Points given when earned
});

// Patient Reward Wallet
const beneficiaryWalletSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryFile', required: true, unique: true },

    totalPoints: { type: Number, default: 0 },
    currentLevel: { type: Number, default: 1 }, // Level 1, 2, 3...

    badges: [
      {
        badgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge' },
        earnedAt: { type: Date, default: Date.now },
      },
    ],

    history: [
      {
        action: String, // "Attended Session"
        points: Number,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

module.exports = {
  Badge: mongoose.model('Badge', badgeSchema),
  BeneficiaryWallet: mongoose.model('BeneficiaryWallet', beneficiaryWalletSchema),
};

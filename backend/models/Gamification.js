const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

// ───────────────────────────────────────────────────────────────
// Gamification Profile — Unified schema for children motivation
// ───────────────────────────────────────────────────────────────

const GamificationSchema = new Schema({
  beneficiaryId: { type: ObjectId, ref: 'Beneficiary', required: true, index: true },
  totalPoints: { type: Number, default: 0 },
  level: { type: Number, default: 1 },

  badges: [{
    badgeId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    earnedAt: { type: Date, default: Date.now },
    category: {
      type: String,
      enum: ['session_attendance', 'goal_achievement', 'icf_improvement', 'streak', 'special_milestone'],
    },
  }],

  challenges: [{
    challengeId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    target: { type: Number, default: 1 },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    rewardPoints: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    type: {
      type: String,
      enum: ['attend_sessions', 'achieve_goals', 'improve_icf', 'maintain_streak'],
    },
  }],

  streaks: {
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date },
  },

  achievements: [{
    type: { type: String },
    description: { type: String },
    earnedAt: { type: Date, default: Date.now },
    points: { type: Number, default: 0 },
  }],

  leaderboardRank: { type: Number, default: null },
}, { timestamps: true });

// ─── Compound Index ───────────────────────────────────────────
GamificationSchema.index({ beneficiaryId: 1, totalPoints: -1 });
GamificationSchema.index({ 'badges.category': 1, 'badges.earnedAt': -1 });
GamificationSchema.index({ 'challenges.completed': 1, 'challenges.startedAt': -1 });

// ─── Static Methods ───────────────────────────────────────────

GamificationSchema.statics.findOrCreate = async function (beneficiaryId) {
  let profile = await this.findOne({ beneficiaryId });
  if (!profile) {
    profile = await this.create({ beneficiaryId });
  }
  return profile;
};

GamificationSchema.methods.pointsToNextLevel = function () {
  const nextLevel = this.level + 1;
  return nextLevel * 100 - this.totalPoints;
};

GamificationSchema.methods.progressToNextLevel = function () {
  const prev = this.level * 100;
  const next = (this.level + 1) * 100;
  const range = next - prev;
  const current = this.totalPoints - prev;
  return Math.min(100, Math.max(0, Math.round((current / range) * 100)));
};

const Gamification = mongoose.model('Gamification', GamificationSchema);

// ───────────────────────────────────────────────────────────────
// Legacy Exports (Backward Compatibility)
// ───────────────────────────────────────────────────────────────

// Badge Definition (Admin Configured)
const badgeSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  actionType: {
    type: String,
    enum: ['SESSION_ATTENDANCE', 'HOMEWORK_SUBMISSION', 'EARLY_ARRIVAL'],
  },
  threshold: { type: Number, default: 1 },
  pointsValue: { type: Number, default: 50 },
});

// Patient Reward Wallet
const beneficiaryWalletSchema = new Schema(
  {
    beneficiary: {
      type: ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true,
    },
    totalPoints: { type: Number, default: 0 },
    currentLevel: { type: Number, default: 1 },
    badges: [
      {
        badgeId: { type: ObjectId, ref: 'Badge' },
        earnedAt: { type: Date, default: Date.now },
      },
    ],
    history: [
      {
        action: String,
        points: Number,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Badge = mongoose.models.Badge || mongoose.model('Badge', badgeSchema);
const BeneficiaryWallet =
  mongoose.models.BeneficiaryWallet || mongoose.model('BeneficiaryWallet', beneficiaryWalletSchema);

module.exports = {
  Gamification,
  Badge,
  BeneficiaryWallet,
};

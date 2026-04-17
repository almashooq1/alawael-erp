/**
 * Gamification Enhanced Service — البرومبت 29
 * نظام التأهيل بالألعاب المحسّن
 *
 * @module rehabilitation-gamification/gamification-enhanced-service
 * @description نظام Gamification متقدم: نقاط XP، شارات، مستويات، تحديات، ألعاب تأهيلية، مكافآت، لوحة متصدرين
 * @version 2.0.0
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─────────────────────────────────────────────────────────────────
// نموذج الملف التعريفي لنظام Gamification
// ─────────────────────────────────────────────────────────────────

const gamificationProfileSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    beneficiary_id: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true,
    },
    total_xp: { type: Number, default: 0 },
    current_level: { type: Number, default: 1 },
    total_points: { type: Number, default: 0 },
    available_points: { type: Number, default: 0 },
    streak_days: { type: Number, default: 0 },
    longest_streak: { type: Number, default: 0 },
    last_activity_date: Date,
    total_challenges_completed: { type: Number, default: 0 },
    total_badges_earned: { type: Number, default: 0 },
    total_games_played: { type: Number, default: 0 },
    preferences: Schema.Types.Mixed,
    show_on_leaderboard: { type: Boolean, default: true },
    is_child_mode: { type: Boolean, default: false },
    avatar_path: String,
    display_name: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

gamificationProfileSchema.index({ total_xp: -1 });
gamificationProfileSchema.index({ current_level: -1 });

// ─────────────────────────────────────────────────────────────────
// نموذج مستويات نظام Gamification
// ─────────────────────────────────────────────────────────────────

const gamificationLevelSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    level_number: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    name_ar: { type: String, required: true },
    xp_required: { type: Number, required: true },
    badge_icon: String,
    color: String,
    rewards: Schema.Types.Mixed,
    description: String,
    description_ar: String,
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────
// نموذج الشارات
// ─────────────────────────────────────────────────────────────────

const badgeSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    name_ar: { type: String, required: true },
    description: String,
    description_ar: String,
    icon_path: String,
    category: {
      type: String,
      enum: ['clinical', 'attendance', 'social', 'achievement', 'special', 'milestone'],
      required: true,
    },
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    criteria: [Schema.Types.Mixed],
    xp_reward: { type: Number, default: 0 },
    points_reward: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    is_secret: { type: Boolean, default: false },
    sort_order: { type: Number, default: 0 },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────
// نموذج شارات المستفيدين
// ─────────────────────────────────────────────────────────────────

const beneficiaryBadgeSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    badge_id: { type: Schema.Types.ObjectId, ref: 'Badge2', required: true },
    earned_at: { type: Date, default: Date.now },
    context: Schema.Types.Mixed,
    is_seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

beneficiaryBadgeSchema.index({ beneficiary_id: 1, badge_id: 1 }, { unique: true });

// ─────────────────────────────────────────────────────────────────
// نموذج التحديات
// ─────────────────────────────────────────────────────────────────

const challengeSchema2 = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    title: { type: String, required: true },
    title_ar: { type: String, required: true },
    description: String,
    description_ar: String,
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'special', 'event'],
      required: true,
    },
    category: {
      type: String,
      enum: ['exercise', 'attendance', 'assessment', 'social'],
      required: true,
    },
    requirements: [Schema.Types.Mixed],
    xp_reward: { type: Number, default: 0 },
    points_reward: { type: Number, default: 0 },
    badge_reward_id: { type: Schema.Types.ObjectId, ref: 'Badge2' },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    max_participants: Number,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'extreme'],
      default: 'medium',
    },
    icon: String,
    is_active: { type: Boolean, default: true },
    is_repeatable: { type: Boolean, default: false },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

challengeSchema2.index({ type: 1, is_active: 1 });
challengeSchema2.index({ start_date: 1, end_date: 1 });

// ─────────────────────────────────────────────────────────────────
// نموذج مشاركات التحديات
// ─────────────────────────────────────────────────────────────────

const challengeParticipantSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    challenge_id: { type: Schema.Types.ObjectId, ref: 'Challenge2', required: true },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    progress: Schema.Types.Mixed,
    completion_percentage: { type: Number, default: 0 },
    started_at: { type: Date, default: Date.now },
    completed_at: Date,
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'failed', 'abandoned'],
      default: 'in_progress',
    },
    rewards_claimed: { type: Boolean, default: false },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

challengeParticipantSchema.index({ challenge_id: 1, beneficiary_id: 1 }, { unique: true });

// ─────────────────────────────────────────────────────────────────
// نموذج معاملات النقاط
// ─────────────────────────────────────────────────────────────────

const pointTransactionSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    type: {
      type: String,
      enum: ['earned', 'spent', 'bonus', 'penalty', 'expired'],
      required: true,
    },
    amount: { type: Number, required: true },
    balance_after: { type: Number, required: true },
    source: {
      type: String,
      enum: ['session', 'challenge', 'badge', 'game', 'admin', 'redemption', 'level_up', 'streak'],
      required: true,
    },
    source_ref_id: Schema.Types.ObjectId,
    source_ref_type: String,
    description: String,
    description_ar: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

pointTransactionSchema.index({ beneficiary_id: 1, type: 1 });
pointTransactionSchema.index({ source: 1 });

// ─────────────────────────────────────────────────────────────────
// نموذج الألعاب التأهيلية
// ─────────────────────────────────────────────────────────────────

const rehabGameSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    name_ar: { type: String, required: true },
    description: String,
    description_ar: String,
    instructions: String,
    instructions_ar: String,
    category: {
      type: String,
      enum: [
        'motor_skills',
        'cognitive',
        'balance',
        'coordination',
        'memory',
        'speech',
        'fine_motorics',
      ],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'adaptive'],
      default: 'adaptive',
    },
    target_disabilities: [String],
    target_age_groups: [String],
    min_age: Number,
    max_age: Number,
    estimated_duration_minutes: { type: Number, default: 10 },
    xp_per_play: { type: Number, default: 10 },
    max_daily_xp: { type: Number, default: 50 },
    game_url: String,
    thumbnail_path: String,
    settings_schema: Schema.Types.Mixed,
    is_active: { type: Boolean, default: true },
    requires_supervision: { type: Boolean, default: false },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────
// نموذج جلسات الألعاب
// ─────────────────────────────────────────────────────────────────

const gameSessionSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    game_id: { type: Schema.Types.ObjectId, ref: 'RehabGame2', required: true },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    rehabilitation_session_id: { type: Schema.Types.ObjectId, ref: 'RehabSession' },
    supervised_by: { type: Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, default: 0 },
    max_score: { type: Number, default: 100 },
    accuracy_percentage: Number,
    duration_seconds: { type: Number, default: 0 },
    difficulty_level: { type: Number, default: 1 },
    performance_data: Schema.Types.Mixed,
    settings_used: Schema.Types.Mixed,
    xp_earned: { type: Number, default: 0 },
    points_earned: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'completed',
    },
    started_at: { type: Date, required: true },
    ended_at: Date,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

gameSessionSchema.index({ beneficiary_id: 1, game_id: 1 });
gameSessionSchema.index({ started_at: -1 });

// ─────────────────────────────────────────────────────────────────
// نموذج المكافآت
// ─────────────────────────────────────────────────────────────────

const rewardSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    name: { type: String, required: true },
    name_ar: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ['coupon', 'gift', 'certificate', 'digital', 'experience', 'discount'],
      required: true,
    },
    points_cost: { type: Number, required: true },
    stock: { type: Number, default: -1 },
    image_path: String,
    metadata: Schema.Types.Mixed,
    valid_from: Date,
    valid_until: Date,
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────
// نموذج استبدال المكافآت
// ─────────────────────────────────────────────────────────────────

const rewardRedemptionSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    reward_id: { type: Schema.Types.ObjectId, ref: 'GamificationReward', required: true },
    points_spent: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'delivered', 'cancelled'],
      default: 'pending',
    },
    redemption_code: String,
    approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
    approved_at: Date,
    delivered_at: Date,
    notes: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────
// نموذج لوحة المتصدرين
// ─────────────────────────────────────────────────────────────────

const leaderboardSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'all_time'], required: true },
    category: { type: String, default: 'overall' },
    period_start: { type: Date, required: true },
    period_end: { type: Date, required: true },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    score: { type: Number, default: 0 },
    rank: Number,
    breakdown: Schema.Types.Mixed,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

leaderboardSchema.index({ type: 1, category: 1, period_start: 1 });
leaderboardSchema.index({ type: 1, period_start: 1, score: -1 });

// ─────────────────────────────────────────────────────────────────
// تسجيل النماذج
// ─────────────────────────────────────────────────────────────────

const GamificationProfile =
  mongoose.models.GamificationProfile ||
  mongoose.model('GamificationProfile', gamificationProfileSchema);
const GamificationLevel =
  mongoose.models.GamificationLevel || mongoose.model('GamificationLevel', gamificationLevelSchema);
const Badge2 = mongoose.models.Badge2 || mongoose.model('Badge2', badgeSchema);
const BeneficiaryBadge =
  mongoose.models.BeneficiaryBadge || mongoose.model('BeneficiaryBadge', beneficiaryBadgeSchema);
const Challenge2 = mongoose.models.Challenge2 || mongoose.model('Challenge2', challengeSchema2);
const ChallengeParticipant =
  mongoose.models.ChallengeParticipant ||
  mongoose.model('ChallengeParticipant', challengeParticipantSchema);
const PointTransaction =
  mongoose.models.PointTransaction || mongoose.model('PointTransaction', pointTransactionSchema);
const RehabGame2 = mongoose.models.RehabGame2 || mongoose.model('RehabGame2', rehabGameSchema);
const GameSession2 =
  mongoose.models.GameSession2 || mongoose.model('GameSession2', gameSessionSchema);
const GamificationReward =
  mongoose.models.GamificationReward || mongoose.model('GamificationReward', rewardSchema);
const RewardRedemption =
  mongoose.models.RewardRedemption || mongoose.model('RewardRedemption', rewardRedemptionSchema);
const Leaderboard = mongoose.models.Leaderboard || mongoose.model('Leaderboard', leaderboardSchema);

// ─────────────────────────────────────────────────────────────────
// خدمة Gamification المحسّنة
// ─────────────────────────────────────────────────────────────────

class GamificationEnhancedService {
  constructor() {
    this._defaultLevels = [
      { level_number: 1, name: 'Beginner', name_ar: 'البداية', xp_required: 0, color: '#9E9E9E' },
      { level_number: 2, name: 'Learner', name_ar: 'المبتدئ', xp_required: 100, color: '#4CAF50' },
      { level_number: 3, name: 'Improver', name_ar: 'المتعلم', xp_required: 250, color: '#2196F3' },
      { level_number: 4, name: 'Achiever', name_ar: 'المثابر', xp_required: 500, color: '#9C27B0' },
      { level_number: 5, name: 'Expert', name_ar: 'المتميز', xp_required: 1000, color: '#FF9800' },
      { level_number: 6, name: 'Star', name_ar: 'النجم', xp_required: 2000, color: '#FFC107' },
      { level_number: 7, name: 'Champion', name_ar: 'البطل', xp_required: 3500, color: '#FF5722' },
      { level_number: 8, name: 'Legend', name_ar: 'الأسطورة', xp_required: 5000, color: '#E91E63' },
      { level_number: 9, name: 'Master', name_ar: 'الخبير', xp_required: 7500, color: '#3F51B5' },
      {
        level_number: 10,
        name: 'Grandmaster',
        name_ar: 'المعلم',
        xp_required: 10000,
        color: '#F44336',
      },
    ];
  }

  /**
   * الحصول على الملف الشخصي أو إنشائه
   */
  async getOrCreateProfile(beneficiaryId, branchId) {
    let profile = await GamificationProfile.findOne({ beneficiary_id: beneficiaryId });
    if (!profile) {
      profile = await GamificationProfile.create({
        uuid: require('crypto').randomUUID(),
        beneficiary_id: beneficiaryId,
        branch_id: branchId,
      });
    }
    return profile;
  }

  /**
   * منح نقاط XP
   */
  async awardXP(
    beneficiaryId,
    xp,
    source,
    sourceRefId = null,
    sourceRefType = null,
    descriptionAr = null,
    branchId = null
  ) {
    const profile = await this.getOrCreateProfile(beneficiaryId, branchId);
    profile.total_xp += xp;
    await profile.save();

    // تسجيل المعاملة
    await PointTransaction.create({
      uuid: require('crypto').randomUUID(),
      beneficiary_id: beneficiaryId,
      type: 'earned',
      amount: xp,
      balance_after: profile.total_xp,
      source,
      source_ref_id: sourceRefId,
      source_ref_type: sourceRefType,
      description_ar: descriptionAr || `حصل على ${xp} نقطة XP من ${source}`,
      branch_id: profile.branch_id,
    });

    // فحص ترقية المستوى
    const levelUp = await this._checkLevelUp(profile);

    // تحديث الـ streak
    await this._updateStreak(profile);

    // فحص الشارات
    await this._checkBadges(beneficiaryId);

    return { profile: await GamificationProfile.findById(profile._id).lean(), level_up: levelUp };
  }

  /**
   * منح نقاط قابلة للاستبدال
   */
  async awardPoints(
    beneficiaryId,
    points,
    source,
    sourceRefId = null,
    descriptionAr = null,
    branchId = null
  ) {
    const profile = await this.getOrCreateProfile(beneficiaryId, branchId);
    profile.total_points += points;
    profile.available_points += points;
    await profile.save();

    await PointTransaction.create({
      uuid: require('crypto').randomUUID(),
      beneficiary_id: beneficiaryId,
      type: 'earned',
      amount: points,
      balance_after: profile.available_points,
      source,
      source_ref_id: sourceRefId,
      description_ar: descriptionAr || `حصل على ${points} نقطة من ${source}`,
      branch_id: profile.branch_id,
    });

    return profile;
  }

  /**
   * فحص ترقية المستوى
   */
  async _checkLevelUp(profile) {
    const levels = await GamificationLevel.find({ xp_required: { $lte: profile.total_xp } })
      .sort({ level_number: -1 })
      .limit(1)
      .lean();

    if (!levels.length) return null;
    const targetLevel = levels[0];

    if (targetLevel.level_number > profile.current_level) {
      const oldLevel = profile.current_level;
      profile.current_level = targetLevel.level_number;
      await profile.save();

      // منح مكافآت المستوى
      if (targetLevel.rewards) {
        await this._processLevelReward(
          profile.beneficiary_id,
          targetLevel.rewards,
          profile.branch_id
        );
      }

      return { old_level: oldLevel, new_level: targetLevel.level_number, level_data: targetLevel };
    }

    return null;
  }

  /**
   * تحديث سلسلة الأيام المتتالية
   */
  async _updateStreak(profile) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!profile.last_activity_date) {
      profile.streak_days = 1;
      profile.last_activity_date = today;
    } else {
      const lastDate = new Date(profile.last_activity_date);
      lastDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        profile.streak_days += 1;
        profile.longest_streak = Math.max(profile.longest_streak, profile.streak_days);
        profile.last_activity_date = today;
      } else if (diffDays > 1) {
        profile.streak_days = 1;
        profile.last_activity_date = today;
      }
      // diffDays === 0 → نفس اليوم، لا تغيير
    }

    await profile.save();
  }

  /**
   * منح شارة
   */
  async awardBadge(beneficiaryId, badgeCode, context = {}, branchId = null) {
    const badge = await Badge2.findOne({ code: badgeCode, is_active: true });
    if (!badge) return false;

    const exists = await BeneficiaryBadge.findOne({
      beneficiary_id: beneficiaryId,
      badge_id: badge._id,
    });
    if (exists) return false;

    await BeneficiaryBadge.create({
      uuid: require('crypto').randomUUID(),
      beneficiary_id: beneficiaryId,
      badge_id: badge._id,
      earned_at: new Date(),
      context,
      branch_id: branchId,
    });

    const profile = await this.getOrCreateProfile(beneficiaryId, branchId);
    profile.total_badges_earned += 1;
    await profile.save();

    if (badge.xp_reward > 0) {
      await this.awardXP(
        beneficiaryId,
        badge.xp_reward,
        'badge',
        badge._id,
        'Badge2',
        `شارة: ${badge.name_ar}`,
        branchId
      );
    }
    if (badge.points_reward > 0) {
      await this.awardPoints(
        beneficiaryId,
        badge.points_reward,
        'badge',
        badge._id,
        `شارة: ${badge.name_ar}`,
        branchId
      );
    }

    return true;
  }

  /**
   * فحص استحقاق الشارات
   */
  async _checkBadges(beneficiaryId) {
    const profile = await GamificationProfile.findOne({ beneficiary_id: beneficiaryId }).lean();
    if (!profile) return;

    const earnedBadgeIds = (
      await BeneficiaryBadge.find({ beneficiary_id: beneficiaryId }).select('badge_id').lean()
    ).map(b => b.badge_id.toString());

    const badges = await Badge2.find({
      is_active: true,
      _id: { $nin: earnedBadgeIds },
      is_secret: false,
    }).lean();

    for (const badge of badges) {
      if (badge.criteria && badge.criteria.length > 0) {
        const allMet = await this._evaluateCriteria(beneficiaryId, badge.criteria, profile);
        if (allMet) {
          await this.awardBadge(beneficiaryId, badge.code, {}, profile.branch_id?.toString());
        }
      }
    }
  }

  /**
   * تقييم شروط الشارة
   */
  async _evaluateCriteria(beneficiaryId, criteria, profile) {
    for (const c of criteria) {
      let met = false;
      switch (c.type) {
        case 'xp_total':
          met = profile.total_xp >= (c.value || 0);
          break;
        case 'level':
          met = profile.current_level >= (c.value || 0);
          break;
        case 'streak':
          met = profile.streak_days >= (c.value || 0);
          break;
        case 'games_played':
          met = profile.total_games_played >= (c.value || 0);
          break;
        case 'challenges_completed':
          met = profile.total_challenges_completed >= (c.value || 0);
          break;
        case 'badges_count':
          met = profile.total_badges_earned >= (c.value || 0);
          break;
        default:
          met = false;
      }
      if (!met) return false;
    }
    return true;
  }

  /**
   * معالجة مكافأة المستوى
   */
  async _processLevelReward(beneficiaryId, rewards, branchId) {
    if (!rewards) return;
    if (rewards.type === 'points') {
      await this.awardPoints(
        beneficiaryId,
        rewards.amount,
        'level_up',
        null,
        'مكافأة المستوى',
        branchId
      );
    } else if (rewards.type === 'badge' && rewards.badge_code) {
      await this.awardBadge(beneficiaryId, rewards.badge_code, {}, branchId);
    }
  }

  /**
   * الانضمام لتحدي
   */
  async joinChallenge(beneficiaryId, challengeId, branchId = null) {
    const challenge = await Challenge2.findById(challengeId);
    if (!challenge || !challenge.is_active) throw new Error('التحدي غير متاح');
    if (challenge.end_date < new Date()) throw new Error('انتهى وقت التحدي');

    if (challenge.max_participants) {
      const count = await ChallengeParticipant.countDocuments({ challenge_id: challengeId });
      if (count >= challenge.max_participants) throw new Error('التحدي اكتمل');
    }

    const existing = await ChallengeParticipant.findOne({
      challenge_id: challengeId,
      beneficiary_id: beneficiaryId,
    });
    if (existing) return existing;

    return ChallengeParticipant.create({
      uuid: require('crypto').randomUUID(),
      challenge_id: challengeId,
      beneficiary_id: beneficiaryId,
      started_at: new Date(),
      status: 'in_progress',
      progress: {},
      branch_id: branchId,
    });
  }

  /**
   * تسجيل جلسة لعب
   */
  async recordGameSession(data) {
    const game = await RehabGame2.findById(data.game_id);
    if (!game) throw new Error('اللعبة غير موجودة');

    const profile = await this.getOrCreateProfile(data.beneficiary_id, data.branch_id);

    // حساب XP اليوم لهذه اللعبة
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailyXpEarned = await GameSession2.aggregate([
      {
        $match: {
          beneficiary_id: require('mongoose').Types.ObjectId(data.beneficiary_id),
          game_id: game._id,
          started_at: { $gte: todayStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$xp_earned' } } },
    ]);
    const earnedToday = dailyXpEarned[0]?.total || 0;
    const xpToAward = Math.max(0, Math.min(game.xp_per_play, game.max_daily_xp - earnedToday));

    // نقاط الأداء (بناءً على النتيجة)
    const performancePoints = Math.round(
      ((data.score || 0) / Math.max(1, data.max_score || 100)) * 10
    );

    const session = await GameSession2.create({
      uuid: require('crypto').randomUUID(),
      ...data,
      xp_earned: xpToAward,
      points_earned: performancePoints,
      branch_id: profile.branch_id,
    });

    if (xpToAward > 0) {
      await this.awardXP(
        data.beneficiary_id,
        xpToAward,
        'game',
        session._id,
        'GameSession2',
        `لعبة: ${game.name_ar}`,
        profile.branch_id
      );
    }
    if (performancePoints > 0) {
      await this.awardPoints(
        data.beneficiary_id,
        performancePoints,
        'game',
        session._id,
        null,
        profile.branch_id
      );
    }

    profile.total_games_played += 1;
    await profile.save();

    return session;
  }

  /**
   * استبدال مكافأة
   */
  async redeemReward(beneficiaryId, rewardId, branchId = null) {
    const reward = await GamificationReward.findById(rewardId);
    if (!reward || !reward.is_active) throw new Error('المكافأة غير متاحة');
    if (reward.valid_until && reward.valid_until < new Date())
      throw new Error('انتهت صلاحية المكافأة');
    if (reward.stock === 0) throw new Error('نفذت الكمية');

    const profile = await this.getOrCreateProfile(beneficiaryId, branchId);
    if (profile.available_points < reward.points_cost) throw new Error('نقاط غير كافية');

    profile.available_points -= reward.points_cost;
    await profile.save();

    await PointTransaction.create({
      uuid: require('crypto').randomUUID(),
      beneficiary_id: beneficiaryId,
      type: 'spent',
      amount: -reward.points_cost,
      balance_after: profile.available_points,
      source: 'redemption',
      description_ar: `استبدال: ${reward.name_ar}`,
      branch_id: profile.branch_id,
    });

    if (reward.stock > 0) {
      reward.stock -= 1;
      await reward.save();
    }

    return RewardRedemption.create({
      uuid: require('crypto').randomUUID(),
      beneficiary_id: beneficiaryId,
      reward_id: rewardId,
      points_spent: reward.points_cost,
      status: 'pending',
      redemption_code: require('crypto').randomBytes(4).toString('hex').toUpperCase(),
      branch_id: profile.branch_id,
    });
  }

  /**
   * لوحة المتصدرين
   */
  async getLeaderboard(type = 'weekly', category = 'overall', branchId = null, limit = 20) {
    const now = new Date();
    const query = {
      type,
      category,
      $or: [{ period_end: { $gte: now } }, { type: 'all_time' }],
    };
    if (branchId) query.branch_id = branchId;

    return Leaderboard.find(query)
      .populate('beneficiary_id', 'full_name')
      .sort({ score: -1, rank: 1 })
      .limit(limit)
      .lean();
  }

  /**
   * الإحصائيات العامة
   */
  async getStats(branchId = null) {
    const filter = branchId ? { branch_id: branchId } : {};
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalProfiles, totalXp, totalBadges, activeChallenges, gamesToday, avgStreak] =
      await Promise.all([
        GamificationProfile.countDocuments(filter),
        GamificationProfile.aggregate([
          { $match: filter },
          { $group: { _id: null, total: { $sum: '$total_xp' } } },
        ]),
        BeneficiaryBadge.countDocuments(branchId ? { branch_id: branchId } : {}),
        Challenge2.countDocuments({
          ...filter,
          is_active: true,
          start_date: { $lte: new Date() },
          end_date: { $gte: new Date() },
        }),
        GameSession2.countDocuments({ ...filter, started_at: { $gte: todayStart } }),
        GamificationProfile.aggregate([
          { $match: filter },
          { $group: { _id: null, avg: { $avg: '$streak_days' } } },
        ]),
      ]);

    return {
      total_profiles: totalProfiles,
      total_xp_awarded: totalXp[0]?.total || 0,
      total_badges_awarded: totalBadges,
      active_challenges: activeChallenges,
      games_played_today: gamesToday,
      avg_streak: Math.round((avgStreak[0]?.avg || 0) * 10) / 10,
    };
  }

  /**
   * الملف الشخصي الكامل للمستفيد
   */
  async getFullProfile(beneficiaryId) {
    const profile = await GamificationProfile.findOne({ beneficiary_id: beneficiaryId }).lean();
    if (!profile) return null;

    const [badges, recentGames, activeParticipations, recentTransactions] = await Promise.all([
      BeneficiaryBadge.find({ beneficiary_id: beneficiaryId })
        .populate('badge_id', 'name name_ar icon_path category rarity')
        .sort({ earned_at: -1 })
        .lean(),
      GameSession2.find({ beneficiary_id: beneficiaryId })
        .populate('game_id', 'name name_ar category')
        .sort({ started_at: -1 })
        .limit(10)
        .lean(),
      ChallengeParticipant.find({ beneficiary_id: beneficiaryId, status: 'in_progress' })
        .populate('challenge_id', 'title title_ar type difficulty')
        .lean(),
      PointTransaction.find({ beneficiary_id: beneficiaryId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    // حساب نسبة التقدم نحو المستوى التالي
    const currentLevelData = await GamificationLevel.findOne({
      level_number: profile.current_level,
    }).lean();
    const nextLevelData = await GamificationLevel.findOne({
      level_number: profile.current_level + 1,
    }).lean();
    let levelProgress = 100;
    if (nextLevelData && currentLevelData) {
      const range = nextLevelData.xp_required - currentLevelData.xp_required;
      levelProgress =
        range > 0
          ? Math.round(((profile.total_xp - currentLevelData.xp_required) / range) * 100)
          : 100;
    }

    return {
      ...profile,
      current_level_data: currentLevelData,
      next_level_data: nextLevelData,
      level_progress: Math.min(100, Math.max(0, levelProgress)),
      badges,
      recent_games: recentGames,
      active_challenges: activeParticipations,
      recent_transactions: recentTransactions,
    };
  }

  /**
   * تهيئة المستويات الافتراضية
   */
  async seedDefaultLevels(branchId) {
    for (const lvl of this._defaultLevels) {
      await GamificationLevel.findOneAndUpdate(
        { level_number: lvl.level_number },
        { ...lvl, branch_id: branchId, uuid: require('crypto').randomUUID() },
        { upsert: true }
      );
    }
  }

  /**
   * خيارات النماذج
   */
  getFormOptions() {
    return {
      badge_categories: [
        { value: 'clinical', label: 'سريري' },
        { value: 'attendance', label: 'حضور' },
        { value: 'social', label: 'اجتماعي' },
        { value: 'achievement', label: 'إنجاز' },
        { value: 'special', label: 'خاص' },
        { value: 'milestone', label: 'معلم' },
      ],
      badge_rarities: [
        { value: 'common', label: 'شائع' },
        { value: 'uncommon', label: 'غير شائع' },
        { value: 'rare', label: 'نادر' },
        { value: 'epic', label: 'ملحمي' },
        { value: 'legendary', label: 'أسطوري' },
      ],
      challenge_types: [
        { value: 'daily', label: 'يومي' },
        { value: 'weekly', label: 'أسبوعي' },
        { value: 'monthly', label: 'شهري' },
        { value: 'special', label: 'خاص' },
        { value: 'event', label: 'فعالية' },
      ],
      game_categories: [
        { value: 'motor_skills', label: 'المهارات الحركية' },
        { value: 'cognitive', label: 'المعرفية' },
        { value: 'balance', label: 'التوازن' },
        { value: 'coordination', label: 'التنسيق' },
        { value: 'memory', label: 'الذاكرة' },
        { value: 'speech', label: 'النطق' },
        { value: 'fine_motorics', label: 'المهارات الحركية الدقيقة' },
      ],
      reward_types: [
        { value: 'coupon', label: 'كوبون' },
        { value: 'gift', label: 'هدية' },
        { value: 'certificate', label: 'شهادة' },
        { value: 'digital', label: 'رقمي' },
        { value: 'experience', label: 'تجربة' },
        { value: 'discount', label: 'خصم' },
      ],
      difficulties: [
        { value: 'easy', label: 'سهل' },
        { value: 'medium', label: 'متوسط' },
        { value: 'hard', label: 'صعب' },
        { value: 'extreme', label: 'صعب جداً' },
      ],
    };
  }
}

module.exports = {
  GamificationEnhancedService,
  GamificationProfile,
  GamificationLevel,
  Badge2,
  BeneficiaryBadge,
  Challenge2,
  ChallengeParticipant,
  PointTransaction,
  RehabGame2,
  GameSession2,
  GamificationReward,
  RewardRedemption,
  Leaderboard,
};

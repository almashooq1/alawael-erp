/* eslint-disable no-unused-vars */
/**
 * Gamification Service for Disability Rehabilitation
 * نظام الغمرة والتحفيز للتأهيل
 *
 * @module rehabilitation-gamification/gamification-service
 * @description نظام تحفيزي لزيادة مشاركة والتزام المستفيدين
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const logger = require('../utils/logger');

// ============================================
// نماذج البيانات
// ============================================

// نموذج النقاط
const pointsSchema = new Schema({
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
  total_points: { type: Number, default: 0 },
  points_this_month: { type: Number, default: 0 },
  points_this_week: { type: Number, default: 0 },
  points_today: { type: Number, default: 0 },

  // سجل النقاط
  points_history: [
    {
      points: { type: Number, required: true },
      action_type: {
        type: String,
        enum: [
          'session_attendance',
          'goal_completion',
          'home_exercise',
          'family_participation',
          'assessment_completion',
          'streak_bonus',
          'milestone_achievement',
          'challenge_completion',
          'referral',
          'feedback_submitted',
        ],
      },
      description: String,
      earned_at: { type: Date, default: Date.now },
    },
  ],

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// نموذج الشارات
const badgeSchema = new Schema({
  badge_id: {
    type: String,
    unique: true,
    default: () => `BDG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },

  name_ar: { type: String, required: true },
  name_en: String,

  description_ar: { type: String, required: true },
  description_en: String,

  // متطلبات الحصول على الشارة
  requirements: {
    type: { type: String, enum: ['points', 'sessions', 'goals', 'streak', 'special'] },
    value: Number,
    time_frame: { type: String, enum: ['all_time', 'monthly', 'weekly'] },
  },

  // صورة الشارة
  icon: String,
  color: { type: String, default: '#4CAF50' },

  // مستوى الشارة
  level: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },

  // فئة الشارة
  category: {
    type: String,
    enum: ['attendance', 'achievement', 'engagement', 'social', 'special'],
    default: 'achievement',
  },

  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

// نموذج شارات المستخدم
const userBadgeSchema = new Schema({
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
  badge_id: { type: Schema.Types.ObjectId, ref: 'Badge', required: true },

  earned_at: { type: Date, default: Date.now },
  is_displayed: { type: Boolean, default: true },
  display_order: { type: Number, default: 0 },
});

// نموذج التحديات
const challengeSchema = new Schema({
  challenge_id: {
    type: String,
    unique: true,
    default: () => `CHL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },

  title_ar: { type: String, required: true },
  title_en: String,

  description_ar: { type: String, required: true },
  description_en: String,

  // نوع التحدي
  challenge_type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'special'],
    default: 'daily',
  },

  // متطلبات التحدي
  requirements: {
    action_type: String,
    target_count: Number,
    time_limit_days: Number,
  },

  // المكافآت
  rewards: {
    points: { type: Number, default: 0 },
    badge_id: { type: Schema.Types.ObjectId, ref: 'Badge' },
    bonus_features: [String],
  },

  // فترة التحدي
  start_date: { type: Date, default: Date.now },
  end_date: Date,

  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

// نموذج تقدم التحدي
const challengeProgressSchema = new Schema({
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
  challenge_id: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },

  current_progress: { type: Number, default: 0 },
  target_progress: { type: Number, required: true },

  is_completed: { type: Boolean, default: false },
  completed_at: Date,

  rewards_claimed: { type: Boolean, default: false },
  claimed_at: Date,

  started_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// نموذج المستويات
const levelSchema = new Schema({
  level_number: { type: Number, required: true },
  name_ar: { type: String, required: true },
  name_en: String,

  points_required: { type: Number, required: true },

  // مكافآت المستوى
  rewards: {
    title: String,
    icon: String,
    color: String,
    special_features: [String],
  },

  created_at: { type: Date, default: Date.now },
});

// نموذج مستوى المستخدم
const userLevelSchema = new Schema({
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
  current_level: { type: Number, default: 1 },
  current_points: { type: Number, default: 0 },
  points_to_next_level: { type: Number, default: 100 },

  level_history: [
    {
      level: Number,
      achieved_at: { type: Date, default: Date.now },
    },
  ],

  updated_at: { type: Date, default: Date.now },
});

// ============================================
// خدمة الغمرة
// ============================================

class GamificationService {
  constructor() {
    this.pointsConfig = {
      sessionAttendance: 10,
      goalCompletion: 50,
      homeExercise: 5,
      familyParticipation: 15,
      assessmentCompletion: 20,
      streakBonus: 25,
      milestoneAchievement: 100,
      challengeCompletion: 30,
      feedbackSubmitted: 5,
    };

    this.levels = this.initializeLevels();
    this.defaultBadges = this.initializeDefaultBadges();
  }

  /**
   * منح نقاط للمستفيد
   */
  async awardPoints(beneficiaryId, actionType, options = {}) {
    try {
      const points = this.calculatePoints(actionType, options);

      // تحديث نقاط المستفيد
      const userPoints = await this.updateUserPoints(beneficiaryId, points, actionType, options);

      // التحقق من الشارات الجديدة
      const newBadges = await this.checkForNewBadges(beneficiaryId, actionType);

      // التحقق من ارتفاع المستوى
      const levelUp = await this.checkForLevelUp(beneficiaryId);

      // التحقق من اكتمال التحديات
      const completedChallenges = await this.checkChallengeCompletion(beneficiaryId, actionType);

      return {
        success: true,
        points_awarded: points,
        total_points: userPoints.total_points,
        new_badges: newBadges,
        level_up: levelUp,
        completed_challenges: completedChallenges,
      };
    } catch (error) {
      logger.error('Error awarding points:', error);
      return { success: false, error: 'حدث خطأ داخلي' };
    }
  }

  /**
   * حساب النقاط
   */
  calculatePoints(actionType, options = {}) {
    let basePoints = this.pointsConfig[actionType] || 0;

    // مكافآت إضافية
    if (options.streakDays && options.streakDays >= 7) {
      basePoints += this.pointsConfig.streakBonus;
    }

    if (options.bonusMultiplier) {
      basePoints *= options.bonusMultiplier;
    }

    return Math.round(basePoints);
  }

  /**
   * تحديث نقاط المستخدم
   */
  async updateUserPoints(beneficiaryId, points, actionType, options) {
    // في الإصدار الفعلي، ستتصل بقاعدة البيانات
    return {
      beneficiary_id: beneficiaryId,
      total_points: points,
      points_this_month: points,
      points_this_week: points,
      points_today: points,
    };
  }

  /**
   * التحقق من الشارات الجديدة
   */
  async checkForNewBadges(beneficiaryId, actionType) {
    const newBadges = [];

    // التحقق من شارات الحضور
    // في الإصدار الفعلي، سيتم التحقق من قاعدة البيانات

    return newBadges;
  }

  /**
   * التحقق من ارتفاع المستوى
   */
  async checkForLevelUp(beneficiaryId) {
    return null;
  }

  /**
   * التحقق من اكتمال التحديات
   */
  async checkChallengeCompletion(beneficiaryId, actionType) {
    return [];
  }

  /**
   * الحصول على ملف المستفيد
   */
  async getUserProfile(beneficiaryId) {
    return {
      beneficiary_id: beneficiaryId,
      points: {
        total: 0,
        this_month: 0,
        this_week: 0,
        today: 0,
      },
      level: {
        current: 1,
        name: 'البداية',
        progress: 0,
        points_to_next: 100,
      },
      badges: [],
      challenges: {
        active: 0,
        completed: 0,
      },
      streak: {
        current: 0,
        best: 0,
      },
    };
  }

  /**
   * الحصول على لوحة المتصدرين (شخصية)
   */
  async getPersonalLeaderboard(beneficiaryId) {
    return {
      beneficiary_id: beneficiaryId,
      personal_best: {
        points: 0,
        date: null,
      },
      progress_this_month: {
        start: 0,
        current: 0,
        improvement: 0,
      },
      goals_progress: {
        completed: 0,
        total: 0,
        percentage: 0,
      },
    };
  }

  /**
   * إنشاء تحدي جديد
   */
  async createChallenge(challengeData) {
    return {
      success: true,
      challenge_id: `CHL-${Date.now()}`,
      ...challengeData,
    };
  }

  /**
   * الانضمام إلى تحدي
   */
  async joinChallenge(beneficiaryId, challengeId) {
    return {
      success: true,
      message: 'تم الانضمام إلى التحدي بنجاح',
    };
  }

  /**
   * تهيئة المستويات
   */
  initializeLevels() {
    return [
      { level: 1, name: 'البداية', points: 0 },
      { level: 2, name: 'المبتدئ', points: 100 },
      { level: 3, name: 'المتعلم', points: 250 },
      { level: 4, name: 'المثابر', points: 500 },
      { level: 5, name: 'المتميز', points: 1000 },
      { level: 6, name: 'النجم', points: 2000 },
      { level: 7, name: 'البطل', points: 3500 },
      { level: 8, name: 'الأسطورة', points: 5000 },
      { level: 9, name: 'الخبير', points: 7500 },
      { level: 10, name: 'المعلم', points: 10000 },
    ];
  }

  /**
   * تهيئة الشارات الافتراضية
   */
  initializeDefaultBadges() {
    return [
      { name: 'البداية القوية', requirement: 'حضور أول 5 جلسات', category: 'attendance' },
      { name: 'المثابر', requirement: 'شهر كامل بدون غياب', category: 'attendance' },
      { name: 'النجم الصاعد', requirement: 'تحقيق 3 أهداف', category: 'achievement' },
      { name: 'البطل', requirement: 'إكمال برنامج التأهيل', category: 'achievement' },
      { name: 'المشارك', requirement: 'مشاركة الأسرة في 10 جلسات', category: 'social' },
      { name: 'المحفز', requirement: 'تقديم 5 تغذية راجعة', category: 'engagement' },
    ];
  }
}

// ============================================
// تصدير النماذج والخدمة
// ============================================

const Points = mongoose.model('GamificationPoints', pointsSchema);
const Badge = mongoose.model('GamificationBadge', badgeSchema);
const UserBadge = mongoose.model('UserBadge', userBadgeSchema);
const Challenge = mongoose.model('GamificationChallenge', challengeSchema);
const ChallengeProgress = mongoose.model('ChallengeProgress', challengeProgressSchema);
const Level = mongoose.model('GamificationLevel', levelSchema);
const UserLevel = mongoose.model('UserLevel', userLevelSchema);

module.exports = {
  GamificationService,
  Points,
  Badge,
  UserBadge,
  Challenge,
  ChallengeProgress,
  Level,
  UserLevel,
  pointsSchema,
  badgeSchema,
  challengeSchema,
};

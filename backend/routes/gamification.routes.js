/**
 * Gamification Service - Badges, Points, Leaderboards
 * Achievement system and user engagement
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');

// Achievement Schema
const AchievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  badgeName: String,
  badgeType: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'] },
  points: Number,
  level: Number,
  title: String,
  description: String,
  icon: String,
  unlockedAt: { type: Date, default: Date.now },
  progress: {
    current: Number,
    required: Number,
  },
});

const Achievement = mongoose.model('Achievement', AchievementSchema);

// Leaderboard Schema
const LeaderboardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  totalPoints: { type: Number, default: 0, index: true },
  rank: { type: Number, index: true },
  level: { type: Number, default: 1 },
  badges: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
  lastActive: Date,
  updatedAt: { type: Date, default: Date.now },
});

LeaderboardSchema.index({ totalPoints: -1, rank: 1 });
const Leaderboard = mongoose.model('Leaderboard', LeaderboardSchema);

// User Points Schema
const UserPointsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  points: { type: Number, default: 0 },
  pointsHistory: [
    {
      action: String,
      points: Number,
      description: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const UserPoints = mongoose.model('UserPoints', UserPointsSchema);

class GamificationService {
  /**
   * Award points for action
   */
  async awardPoints(userId, points, action, description) {
    try {
      let userPoints = await UserPoints.findOne({ userId });

      if (!userPoints) {
        userPoints = new UserPoints({ userId, points: 0, pointsHistory: [] });
      }

      userPoints.points += points;
      userPoints.pointsHistory.push({
        action,
        points,
        description,
        timestamp: new Date(),
      });

      await userPoints.save();

      // Update leaderboard
      await this.updateLeaderboard(userId);

      // Check for badges
      await this.checkAndAwardBadges(userId);

      return userPoints;
    } catch (error) {
      console.error('Points award error:', error);
      throw error;
    }
  }

  /**
   * Award badges based on progress
   */
  async checkAndAwardBadges(userId) {
    try {
      const userPoints = await UserPoints.findOne({ userId });
      const existingAchievements = await Achievement.find({ userId });

      const badges = [
        {
          name: 'المبتدئ',
          type: 'bronze',
          condition: userPoints.points >= 100,
          points: 100,
          description: 'اجمع 100 نقطة',
        },
        {
          name: 'النشط',
          type: 'silver',
          condition: userPoints.points >= 500,
          points: 500,
          description: 'اجمع 500 نقطة',
        },
        {
          name: 'الخبير',
          type: 'gold',
          condition: userPoints.points >= 1000,
          points: 1000,
          description: 'اجمع 1000 نقطة',
        },
        {
          name: 'الأسطورة',
          type: 'platinum',
          condition: userPoints.points >= 5000,
          points: 5000,
          description: 'اجمع 5000 نقطة',
        },
      ];

      for (const badge of badges) {
        const exists = existingAchievements.some(a => a.title === badge.name);

        if (badge.condition && !exists) {
          const achievement = new Achievement({
            userId,
            badgeName: badge.name,
            badgeType: badge.type,
            title: badge.name,
            description: badge.description,
            points: badge.points,
            level: this.getBadgeLevel(badge.type),
          });

          await achievement.save();
        }
      }
    } catch (error) {
      console.error('Badge check error:', error);
    }
  }

  /**
   * Update leaderboard
   */
  async updateLeaderboard(userId) {
    try {
      const userPoints = await UserPoints.findOne({ userId });

      let leaderboardEntry = await Leaderboard.findOne({ userId });

      if (!leaderboardEntry) {
        leaderboardEntry = new Leaderboard({ userId });
      }

      leaderboardEntry.totalPoints = userPoints.points;
      leaderboardEntry.level = Math.floor(userPoints.points / 500) + 1;
      leaderboardEntry.lastActive = new Date();

      // Count badges
      const badges = await Achievement.countDocuments({ userId });
      leaderboardEntry.badges = badges;

      await leaderboardEntry.save();

      // Update ranks
      await this.updateRanks();

      return leaderboardEntry;
    } catch (error) {
      console.error('Leaderboard update error:', error);
    }
  }

  /**
   * Update all ranks
   */
  async updateRanks() {
    try {
      const leaderboards = await Leaderboard.find().sort({ totalPoints: -1 });

      for (let i = 0; i < leaderboards.length; i++) {
        leaderboards[i].rank = i + 1;
        await leaderboards[i].save();
      }
    } catch (error) {
      console.error('Rank update error:', error);
    }
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(userId) {
    try {
      return await Achievement.find({ userId }).sort({ unlockedAt: -1 });
    } catch (error) {
      console.error('Get achievements error:', error);
      return [];
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit = 100, page = 1) {
    try {
      const skip = (page - 1) * limit;

      const leaderboard = await Leaderboard.find()
        .populate('userId', 'firstName lastName avatar')
        .sort({ totalPoints: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Leaderboard.countDocuments();

      return {
        leaderboard,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get leaderboard error:', error);
      throw error;
    }
  }

  /**
   * Get user rank
   */
  async getUserRank(userId) {
    try {
      const userLeaderboard = await Leaderboard.findOne({ userId });

      if (!userLeaderboard) {
        return null;
      }

      return {
        rank: userLeaderboard.rank,
        points: userLeaderboard.totalPoints,
        level: userLeaderboard.level,
        badges: userLeaderboard.badges,
        percentile: await this.calculatePercentile(userLeaderboard.totalPoints),
      };
    } catch (error) {
      console.error('Get user rank error:', error);
      return null;
    }
  }

  /**
   * Calculate percentile
   */
  async calculatePercentile(points) {
    try {
      const usersBelow = await Leaderboard.countDocuments({
        totalPoints: { $lt: points },
      });

      const total = await Leaderboard.countDocuments();
      return ((usersBelow / total) * 100).toFixed(2);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get daily challenge
   */
  getDailyChallenge(dayOfWeek) {
    const challenges = [
      {
        title: 'تحدي الاثنين',
        description: 'أكمل برنامجاً واحداً',
        reward: 50,
      },
      {
        title: 'تحدي الثلاثاء',
        description: 'سجل 5 جلسات',
        reward: 75,
      },
      {
        title: 'تحدي الأربعاء',
        description: 'اقرأ مقالة من المعرفة',
        reward: 25,
      },
      {
        title: 'تحدي الخميس',
        description: 'حدث ملفك الشخصي',
        reward: 30,
      },
      {
        title: 'تحدي الجمعة',
        description: 'استخدم جميع الميزات',
        reward: 100,
      },
      {
        title: 'تحدي السبت',
        description: 'اكسب 200 نقطة',
        reward: 50,
      },
      {
        title: 'تحدي الأحد',
        description: 'ساعد مستخدماً آخر',
        reward: 50,
      },
    ];

    return challenges[dayOfWeek % 7];
  }

  /**
   * Get user stats for dashboard
   */
  async getUserStats(userId) {
    try {
      const points = await UserPoints.findOne({ userId });
      const rank = await this.getUserRank(userId);
      const achievements = await this.getUserAchievements(userId);

      return {
        points: points?.points || 0,
        rank: rank?.rank || 0,
        level: rank?.level || 1,
        badges: achievements.length,
        streak: rank?.streakDays || 0,
        percentile: rank?.percentile || 0,
        recentPoints: points?.pointsHistory.slice(-5) || [],
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      return null;
    }
  }

  /**
   * Get badge level
   */
  getBadgeLevel(type) {
    const levels = {
      bronze: 1,
      silver: 2,
      gold: 3,
      platinum: 4,
      diamond: 5,
    };
    return levels[type] || 1;
  }
}

// Routes
const gamificationService = new GamificationService();

/**
 * Get user stats
 * GET /api/gamification/stats
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await gamificationService.getUserStats(req.user.id);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get leaderboard
 * GET /api/gamification/leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const data = await gamificationService.getLeaderboard(parseInt(limit), parseInt(page));

    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user rank
 * GET /api/gamification/rank
 */
router.get('/rank', authenticate, async (req, res) => {
  try {
    const rank = await gamificationService.getUserRank(req.user.id);
    res.json({ success: true, rank });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user achievements
 * GET /api/gamification/achievements
 */
router.get('/achievements', authenticate, async (req, res) => {
  try {
    const achievements = await gamificationService.getUserAchievements(req.user.id);
    res.json({ success: true, achievements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get daily challenge
 * GET /api/gamification/daily-challenge
 */
router.get('/daily-challenge', (req, res) => {
  try {
    const dayOfWeek = new Date().getDay();
    const challenge = gamificationService.getDailyChallenge(dayOfWeek);

    res.json({ success: true, challenge });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Award points (Admin only)
 * POST /api/gamification/award-points
 */
router.post('/award-points', authenticate, async (req, res) => {
  try {
    // Only admin or system can award points
    if (req.user.role !== 'admin' && req.body.userId !== req.user.id) {
      return res.status(403).json({ error: 'غير مصرح' });
    }

    const { userId, points, action, description } = req.body;
    const result = await gamificationService.awardPoints(userId, points, action, description);

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.GamificationService = GamificationService;


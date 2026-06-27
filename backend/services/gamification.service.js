const { Gamification } = require('../models/Gamification');
const logger = require('../utils/logger');

// ───────────────────────────────────────────────────────────────
// Gamification Service — Core business logic for motivation system
// ───────────────────────────────────────────────────────────────

class GamificationService {
  // ─── 1. Get Full Profile ─────────────────────────────────────
  async getGamificationProfile(beneficiaryId) {
    const profile = await Gamification.findOrCreate(beneficiaryId);
    return profile;
  }

  // ─── 2. Award Points ─────────────────────────────────────────
  async awardPoints(beneficiaryId, points, reason = '') {
    const profile = await Gamification.findOrCreate(beneficiaryId);
    profile.totalPoints += points;

    // Record achievement
    profile.achievements.push({
      type: 'points_awarded',
      description: reason || `Awarded ${points} points`,
      points,
      earnedAt: new Date(),
    });

    // Level up check
    const newLevel = Math.floor(profile.totalPoints / 100) + 1;
    if (newLevel > profile.level) {
      profile.level = newLevel;
      profile.achievements.push({
        type: 'level_up',
        description: `Level up to ${newLevel}`,
        points: 0,
        earnedAt: new Date(),
      });
    }

    // Update streak
    await this._updateStreak(profile);

    await profile.save();
    logger.info(`[Gamification] Awarded ${points} points to ${beneficiaryId}: ${reason}`);
    return profile;
  }

  // ─── 3. Check & Award Badges ─────────────────────────────────
  async checkAndAwardBadges(beneficiaryId) {
    const profile = await Gamification.findOrCreate(beneficiaryId);
    const newBadges = [];
    const badgeDefinitions = this._getBadgeDefinitions();

    for (const def of badgeDefinitions) {
      const alreadyEarned = profile.badges.some(
        (b) => b.badgeId === def.badgeId
      );
      if (alreadyEarned) continue;

      let shouldAward = false;
      switch (def.category) {
        case 'session_attendance':
          shouldAward = this._checkSessionAttendance(profile, def);
          break;
        case 'goal_achievement':
          shouldAward = this._checkGoalAchievement(profile, def);
          break;
        case 'icf_improvement':
          shouldAward = this._checkICFImprovement(profile, def);
          break;
        case 'streak':
          shouldAward = this._checkStreak(profile, def);
          break;
        case 'special_milestone':
          shouldAward = this._checkSpecialMilestone(profile, def);
          break;
      }

      if (shouldAward) {
        profile.badges.push({
          badgeId: def.badgeId,
          name: def.name,
          description: def.description,
          icon: def.icon,
          earnedAt: new Date(),
          category: def.category,
        });
        profile.totalPoints += def.points || 0;
        newBadges.push(def);
      }
    }

    await profile.save();
    return { profile, newBadges };
  }

  // ─── 4. Get Leaderboard ──────────────────────────────────────
  async getLeaderboard(branchId = null, limit = 20) {
    const query = {};
    if (branchId) {
      // If branchId is provided, filter by beneficiaries in that branch
      // This requires a lookup or pre-filtering by beneficiary branch
      query.branchId = branchId; // Assumes Gamification schema is extended or populated
    }

    const leaders = await Gamification.find(query)
      .sort({ totalPoints: -1 })
      .limit(+limit)
      .populate('beneficiaryId', 'name fileNumber avatar branchId')
      .lean();

    // Assign ranks
    leaders.forEach((l, i) => {
      l.rank = i + 1;
    });

    return leaders;
  }

  // ─── 5. Create Challenge ─────────────────────────────────────
  async createChallenge(beneficiaryId, challengeData) {
    const profile = await Gamification.findOrCreate(beneficiaryId);
    const challenge = {
      challengeId: `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: challengeData.name,
      description: challengeData.description || '',
      target: challengeData.target || 1,
      progress: 0,
      completed: false,
      rewardPoints: challengeData.rewardPoints || 10,
      startedAt: new Date(),
      type: challengeData.type || 'attend_sessions',
    };
    profile.challenges.push(challenge);
    await profile.save();
    return { profile, challenge };
  }

  // ─── 6. Update Challenge Progress ────────────────────────────
  async updateChallengeProgress(beneficiaryId, challengeId, progress) {
    const profile = await Gamification.findOrCreate(beneficiaryId);
    const challenge = profile.challenges.find(
      (c) => c.challengeId === challengeId
    );
    if (!challenge) {
      throw new Error(`Challenge ${challengeId} not found for beneficiary ${beneficiaryId}`);
    }

    challenge.progress = Math.min(progress, challenge.target);
    if (challenge.progress >= challenge.target && !challenge.completed) {
      challenge.completed = true;
      challenge.completedAt = new Date();
      profile.totalPoints += challenge.rewardPoints;
      profile.achievements.push({
        type: 'challenge_completed',
        description: `Completed challenge: ${challenge.name}`,
        points: challenge.rewardPoints,
        earnedAt: new Date(),
      });
    }

    await profile.save();
    return { profile, challenge };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  async _updateStreak(profile) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last = profile.streaks.lastActivityDate
      ? new Date(profile.streaks.lastActivityDate)
      : null;

    if (last) {
      last.setHours(0, 0, 0, 0);
      const diffDays = (today - last) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        profile.streaks.currentStreak += 1;
      } else if (diffDays > 1) {
        profile.streaks.currentStreak = 1;
      }
      // diffDays === 0 means same day, do nothing
    } else {
      profile.streaks.currentStreak = 1;
    }

    if (profile.streaks.currentStreak > profile.streaks.longestStreak) {
      profile.streaks.longestStreak = profile.streaks.currentStreak;
    }
    profile.streaks.lastActivityDate = new Date();
  }

  _getBadgeDefinitions() {
    return [
      {
        badgeId: 'first_session',
        name: 'الخطوة الأولى',
        description: 'حضور أول جلسة علاجية',
        icon: 'star',
        category: 'session_attendance',
        points: 50,
        condition: (p) => p.achievements.filter((a) => a.type === 'session_attended').length >= 1,
      },
      {
        badgeId: 'regular_attendee',
        name: 'المحاضر المنتظم',
        description: 'حضور 10 جلسات علاجية',
        icon: 'calendar_check',
        category: 'session_attendance',
        points: 200,
        condition: (p) => p.achievements.filter((a) => a.type === 'session_attended').length >= 10,
      },
      {
        badgeId: 'goal_achiever',
        name: 'محقق الأهداف',
        description: 'إنجاز 5 أهداف علاجية',
        icon: 'target',
        category: 'goal_achievement',
        points: 300,
        condition: (p) => p.achievements.filter((a) => a.type === 'goal_achieved').length >= 5,
      },
      {
        badgeId: 'icf_improver',
        name: 'التقدم الملحوظ',
        description: 'تحسن في تقييم ICF',
        icon: 'trending_up',
        category: 'icf_improvement',
        points: 250,
        condition: (p) => p.achievements.filter((a) => a.type === 'icf_improved').length >= 1,
      },
      {
        badgeId: 'streak_7',
        name: 'سلسلة 7 أيام',
        description: 'نشاط متواصل لمدة 7 أيام',
        icon: 'fire',
        category: 'streak',
        points: 150,
        condition: (p) => p.streaks.currentStreak >= 7,
      },
      {
        badgeId: 'streak_30',
        name: 'الشهر الذهبي',
        description: 'نشاط متواصل لمدة 30 يوماً',
        icon: 'crown',
        category: 'streak',
        points: 500,
        condition: (p) => p.streaks.currentStreak >= 30,
      },
      {
        badgeId: 'level_5',
        name: 'النجم الصاعد',
        description: 'الوصول إلى المستوى 5',
        icon: 'rocket',
        category: 'special_milestone',
        points: 1000,
        condition: (p) => p.level >= 5,
      },
      {
        badgeId: 'level_10',
        name: 'بطل التأهيل',
        description: 'الوصول إلى المستوى 10',
        icon: 'trophy',
        category: 'special_milestone',
        points: 5000,
        condition: (p) => p.level >= 10,
      },
    ];
  }

  _checkSessionAttendance(profile, def) {
    return def.condition ? def.condition(profile) : false;
  }

  _checkGoalAchievement(profile, def) {
    return def.condition ? def.condition(profile) : false;
  }

  _checkICFImprovement(profile, def) {
    return def.condition ? def.condition(profile) : false;
  }

  _checkStreak(profile, def) {
    return def.condition ? def.condition(profile) : false;
  }

  _checkSpecialMilestone(profile, def) {
    return def.condition ? def.condition(profile) : false;
  }
}

module.exports = new GamificationService();

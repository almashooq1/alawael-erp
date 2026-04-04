/**
 * Gamification Enhanced Routes — البرومبت 29
 * مسارات نظام التأهيل بالألعاب المحسّن
 *
 * @module routes/gamification-enhanced.routes
 * @description نظام Gamification متكامل: XP، شارات، مستويات، تحديات، ألعاب، مكافآت، لوحة متصدرين
 * Base paths:
 *   /api/gamification-v2
 *   /api/v1/gamification-v2
 */

const express = require('express');
const router = express.Router();

const {
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
} = require('../rehabilitation-gamification/gamification-enhanced-service');

const service = new GamificationEnhancedService();

const ok = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const fail = (res, msg, status = 500) => res.status(status).json({ success: false, error: msg });

// ═══════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات العامة — Stats & Dashboard
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/gamification-v2/stats
 * @desc   إحصائيات نظام Gamification
 */
router.get('/stats', async (req, res) => {
  try {
    const branchId = req.query.branch_id || req.headers['x-branch-id'];
    const stats = await service.getStats(branchId);
    ok(res, { data: stats });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/gamification-v2/form-options
 * @desc   خيارات النماذج
 */
router.get('/form-options', (req, res) => {
  ok(res, { data: service.getFormOptions() });
});

// ═══════════════════════════════════════════════════════════════════════════
// 👤 ملفات المستفيدين — Profiles
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/gamification-v2/profiles
 * @desc   قائمة الملفات الشخصية مع الفلترة
 */
router.get('/profiles', async (req, res) => {
  try {
    const { branch_id, page = 1, limit = 15, search } = req.query;
    const query = {};
    if (branch_id) query.branch_id = branch_id;

    let profilesQuery = GamificationProfile.find(query).populate('beneficiary_id', 'full_name');

    if (search) {
      const beneficiaryIds = await require('mongoose')
        .model('Beneficiary')
        .find({ full_name: { $regex: search, $options: 'i' } })
        .select('_id')
        .lean();
      query.beneficiary_id = { $in: beneficiaryIds.map(b => b._id) };
      profilesQuery = GamificationProfile.find(query).populate('beneficiary_id', 'full_name');
    }

    const total = await GamificationProfile.countDocuments(query);
    const profiles = await profilesQuery
      .sort({ total_xp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: profiles, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/gamification-v2/profiles/beneficiary/:id
 * @desc   الملف الشخصي الكامل لمستفيد
 */
router.get('/profiles/beneficiary/:id', async (req, res) => {
  try {
    const profile = await service.getFullProfile(req.params.id);
    if (!profile) return ok(res, { data: null, message: 'لا يوجد ملف شخصي بعد' });
    ok(res, { data: profile });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/gamification-v2/profiles/beneficiary/:id
 * @desc   تحديث إعدادات الملف الشخصي
 */
router.put('/profiles/beneficiary/:id', async (req, res) => {
  try {
    const profile = await GamificationProfile.findOneAndUpdate(
      { beneficiary_id: req.params.id },
      {
        display_name: req.body.display_name,
        avatar_path: req.body.avatar_path,
        show_on_leaderboard: req.body.show_on_leaderboard,
        is_child_mode: req.body.is_child_mode,
        preferences: req.body.preferences,
        updated_by: req.user?.id,
      },
      { new: true, upsert: false }
    );
    if (!profile) return fail(res, 'الملف الشخصي غير موجود', 404);
    ok(res, { data: profile, message: 'تم التحديث بنجاح' });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ النقاط والـ XP — Points & XP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @route  POST /api/gamification-v2/xp/award
 * @desc   منح نقاط XP لمستفيد
 */
router.post('/xp/award', async (req, res) => {
  try {
    const { beneficiary_id, xp, source, description_ar } = req.body;
    if (!beneficiary_id || !xp || !source) {
      return fail(res, 'الحقول المطلوبة: beneficiary_id, xp, source', 400);
    }

    const result = await service.awardXP(
      beneficiary_id,
      parseInt(xp),
      source,
      null,
      null,
      description_ar,
      req.body.branch_id || req.headers['x-branch-id']
    );

    ok(res, { data: result, message: `تم منح ${xp} نقطة XP` });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/points/award
 * @desc   منح نقاط قابلة للاستبدال
 */
router.post('/points/award', async (req, res) => {
  try {
    const { beneficiary_id, points, source, description_ar } = req.body;
    if (!beneficiary_id || !points || !source) {
      return fail(res, 'الحقول المطلوبة: beneficiary_id, points, source', 400);
    }

    const profile = await service.awardPoints(
      beneficiary_id,
      parseInt(points),
      source,
      null,
      description_ar,
      req.body.branch_id || req.headers['x-branch-id']
    );

    ok(res, { data: profile, message: `تم منح ${points} نقطة` });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/gamification-v2/points/transactions/:beneficiaryId
 * @desc   سجل معاملات النقاط لمستفيد
 */
router.get('/points/transactions/:beneficiaryId', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = { beneficiary_id: req.params.beneficiaryId };
    if (type) query.type = type;

    const total = await PointTransaction.countDocuments(query);
    const transactions = await PointTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: transactions, total, page: parseInt(page) });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏆 الشارات — Badges
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/gamification-v2/badges
 * @desc   قائمة الشارات المتاحة
 */
router.get('/badges', async (req, res) => {
  try {
    const { category, rarity, branch_id, is_active, page = 1, limit = 20 } = req.query;
    const query = {};
    if (branch_id) query.branch_id = branch_id;
    if (category) query.category = category;
    if (rarity) query.rarity = rarity;
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const total = await Badge2.countDocuments(query);
    const badges = await Badge2.find(query)
      .sort({ sort_order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: badges, total, page: parseInt(page) });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/badges
 * @desc   إنشاء شارة جديدة
 */
router.post('/badges', async (req, res) => {
  try {
    const { code, name, name_ar, category } = req.body;
    if (!code || !name || !name_ar || !category) {
      return fail(res, 'الحقول المطلوبة: code, name, name_ar, category', 400);
    }

    const badge = await Badge2.create({
      ...req.body,
      uuid: require('crypto').randomUUID(),
      branch_id: req.body.branch_id || req.headers['x-branch-id'],
      created_by: req.user?.id,
    });

    ok(res, { data: badge, message: 'تم إنشاء الشارة بنجاح' }, 201);
  } catch (e) {
    if (e.code === 11000) return fail(res, 'الكود مستخدم مسبقاً', 422);
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/gamification-v2/badges/:id
 * @desc   تحديث شارة
 */
router.put('/badges/:id', async (req, res) => {
  try {
    const badge = await Badge2.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_by: req.user?.id },
      { new: true }
    );
    if (!badge) return fail(res, 'الشارة غير موجودة', 404);
    ok(res, { data: badge, message: 'تم التحديث' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  DELETE /api/gamification-v2/badges/:id
 * @desc   حذف شارة
 */
router.delete('/badges/:id', async (req, res) => {
  try {
    await Badge2.findByIdAndDelete(req.params.id);
    ok(res, { message: 'تم الحذف' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/badges/award
 * @desc   منح شارة لمستفيد يدوياً
 */
router.post('/badges/award', async (req, res) => {
  try {
    const { beneficiary_id, badge_code, context } = req.body;
    if (!beneficiary_id || !badge_code) {
      return fail(res, 'الحقول المطلوبة: beneficiary_id, badge_code', 400);
    }
    const awarded = await service.awardBadge(
      beneficiary_id,
      badge_code,
      context || {},
      req.body.branch_id || req.headers['x-branch-id']
    );
    ok(res, { data: { awarded }, message: awarded ? 'تم منح الشارة' : 'الشارة ممنوحة مسبقاً' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/gamification-v2/badges/beneficiary/:id
 * @desc   شارات مستفيد محدد
 */
router.get('/badges/beneficiary/:id', async (req, res) => {
  try {
    const badges = await BeneficiaryBadge.find({ beneficiary_id: req.params.id })
      .populate('badge_id', 'name name_ar icon_path category rarity xp_reward points_reward')
      .sort({ earned_at: -1 })
      .lean();
    ok(res, { data: badges });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/badges/seen/:beneficiaryId
 * @desc   تعليم الشارات كمشاهَدة
 */
router.post('/badges/seen/:beneficiaryId', async (req, res) => {
  try {
    await BeneficiaryBadge.updateMany(
      { beneficiary_id: req.params.beneficiaryId, is_seen: false },
      { is_seen: true }
    );
    ok(res, { message: 'تم تعليم الشارات كمشاهَدة' });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📈 المستويات — Levels
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/gamification-v2/levels
 * @desc   قائمة مستويات Gamification
 */
router.get('/levels', async (req, res) => {
  try {
    const levels = await GamificationLevel.find().sort({ level_number: 1 }).lean();
    ok(res, { data: levels });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/levels/seed
 * @desc   تهيئة المستويات الافتراضية
 */
router.post('/levels/seed', async (req, res) => {
  try {
    const branchId = req.body.branch_id || req.headers['x-branch-id'];
    await service.seedDefaultLevels(branchId);
    ok(res, { message: 'تم تهيئة المستويات الافتراضية بنجاح' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/levels
 * @desc   إنشاء مستوى
 */
router.post('/levels', async (req, res) => {
  try {
    const { level_number, name, name_ar, xp_required } = req.body;
    if (!level_number || !name || !name_ar || xp_required === undefined) {
      return fail(res, 'الحقول المطلوبة: level_number, name, name_ar, xp_required', 400);
    }
    const level = await GamificationLevel.create({
      ...req.body,
      uuid: require('crypto').randomUUID(),
      branch_id: req.body.branch_id || req.headers['x-branch-id'],
    });
    ok(res, { data: level, message: 'تم إنشاء المستوى' }, 201);
  } catch (e) {
    if (e.code === 11000) return fail(res, 'رقم المستوى مستخدم مسبقاً', 422);
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/gamification-v2/levels/:id
 * @desc   تحديث مستوى
 */
router.put('/levels/:id', async (req, res) => {
  try {
    const level = await GamificationLevel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!level) return fail(res, 'المستوى غير موجود', 404);
    ok(res, { data: level, message: 'تم التحديث' });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 التحديات — Challenges
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/gamification-v2/challenges
 * @desc   قائمة التحديات مع الفلترة
 */
router.get('/challenges', async (req, res) => {
  try {
    const { type, category, branch_id, active_only, page = 1, limit = 15 } = req.query;
    const query = {};
    if (branch_id) query.branch_id = branch_id;
    if (type) query.type = type;
    if (category) query.category = category;
    if (active_only === 'true') {
      query.is_active = true;
      query.start_date = { $lte: new Date() };
      query.end_date = { $gte: new Date() };
    }

    const total = await Challenge2.countDocuments(query);
    const challenges = await Challenge2.find(query)
      .populate('badge_reward_id', 'name name_ar icon_path')
      .sort({ start_date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: challenges, total, page: parseInt(page) });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/challenges
 * @desc   إنشاء تحدي جديد
 */
router.post('/challenges', async (req, res) => {
  try {
    const { title, title_ar, type, category, requirements, start_date, end_date, difficulty } =
      req.body;
    if (!title || !title_ar || !type || !category || !requirements || !start_date || !end_date) {
      return fail(res, 'الحقول المطلوبة ناقصة', 400);
    }

    const challenge = await Challenge2.create({
      ...req.body,
      uuid: require('crypto').randomUUID(),
      branch_id: req.body.branch_id || req.headers['x-branch-id'],
      created_by: req.user?.id,
    });

    ok(res, { data: challenge, message: 'تم إنشاء التحدي بنجاح' }, 201);
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/gamification-v2/challenges/:id
 * @desc   تفاصيل تحدي
 */
router.get('/challenges/:id', async (req, res) => {
  try {
    const challenge = await Challenge2.findById(req.params.id)
      .populate('badge_reward_id', 'name name_ar icon_path rarity')
      .lean();
    if (!challenge) return fail(res, 'التحدي غير موجود', 404);

    const participantCount = await ChallengeParticipant.countDocuments({
      challenge_id: req.params.id,
    });
    const completedCount = await ChallengeParticipant.countDocuments({
      challenge_id: req.params.id,
      status: 'completed',
    });

    ok(res, {
      data: { ...challenge, participant_count: participantCount, completed_count: completedCount },
    });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/gamification-v2/challenges/:id
 * @desc   تحديث تحدي
 */
router.put('/challenges/:id', async (req, res) => {
  try {
    const challenge = await Challenge2.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_by: req.user?.id },
      { new: true }
    );
    if (!challenge) return fail(res, 'التحدي غير موجود', 404);
    ok(res, { data: challenge, message: 'تم التحديث' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  DELETE /api/gamification-v2/challenges/:id
 * @desc   حذف تحدي
 */
router.delete('/challenges/:id', async (req, res) => {
  try {
    await Challenge2.findByIdAndDelete(req.params.id);
    ok(res, { message: 'تم الحذف' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/challenges/join
 * @desc   الانضمام لتحدي
 */
router.post('/challenges/join', async (req, res) => {
  try {
    const { beneficiary_id, challenge_id } = req.body;
    if (!beneficiary_id || !challenge_id) {
      return fail(res, 'الحقول المطلوبة: beneficiary_id, challenge_id', 400);
    }

    const participant = await service.joinChallenge(
      beneficiary_id,
      challenge_id,
      req.body.branch_id || req.headers['x-branch-id']
    );

    ok(res, { data: participant, message: 'تم الانضمام للتحدي بنجاح' });
  } catch (e) {
    if (
      e.message.includes('غير متاح') ||
      e.message.includes('اكتمل') ||
      e.message.includes('انتهى')
    ) {
      return fail(res, e.message, 422);
    }
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/challenges/:id/update-progress
 * @desc   تحديث تقدم مستفيد في تحدي
 */
router.post('/challenges/:id/update-progress', async (req, res) => {
  try {
    const { beneficiary_id, progress, completion_percentage } = req.body;
    if (!beneficiary_id) return fail(res, 'beneficiary_id مطلوب', 400);

    const participant = await ChallengeParticipant.findOneAndUpdate(
      { challenge_id: req.params.id, beneficiary_id, status: 'in_progress' },
      {
        progress,
        completion_percentage: Math.min(100, completion_percentage || 0),
        ...(completion_percentage >= 100 ? { status: 'completed', completed_at: new Date() } : {}),
      },
      { new: true }
    );

    if (!participant) return fail(res, 'لم يتم العثور على مشاركة نشطة', 404);

    // منح مكافآت إن اكتمل
    if (completion_percentage >= 100 && !participant.rewards_claimed) {
      const challenge = await Challenge2.findById(req.params.id);
      if (challenge) {
        if (challenge.xp_reward > 0) {
          await service.awardXP(
            beneficiary_id,
            challenge.xp_reward,
            'challenge',
            req.params.id,
            'Challenge2',
            `تحدي: ${challenge.title_ar}`
          );
        }
        if (challenge.points_reward > 0) {
          await service.awardPoints(
            beneficiary_id,
            challenge.points_reward,
            'challenge',
            req.params.id,
            `تحدي: ${challenge.title_ar}`
          );
        }
        if (challenge.badge_reward_id) {
          const badge = await Badge2.findById(challenge.badge_reward_id);
          if (badge)
            await service.awardBadge(beneficiary_id, badge.code, { challenge_id: req.params.id });
        }
        participant.rewards_claimed = true;
        await participant.save();

        const profile = await GamificationProfile.findOne({ beneficiary_id });
        if (profile) {
          profile.total_challenges_completed += 1;
          await profile.save();
        }
      }
    }

    ok(res, { data: participant, message: 'تم تحديث التقدم' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/gamification-v2/challenges/beneficiary/:id
 * @desc   تحديات مستفيد محدد
 */
router.get('/challenges/beneficiary/:id', async (req, res) => {
  try {
    const { status } = req.query;
    const query = { beneficiary_id: req.params.id };
    if (status) query.status = status;

    const participations = await ChallengeParticipant.find(query)
      .populate(
        'challenge_id',
        'title title_ar type category difficulty xp_reward points_reward start_date end_date icon'
      )
      .sort({ started_at: -1 })
      .lean();

    ok(res, { data: participations });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🎮 الألعاب التأهيلية — Rehab Games
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/gamification-v2/games
 * @desc   قائمة الألعاب التأهيلية
 */
router.get('/games', async (req, res) => {
  try {
    const { category, difficulty, branch_id, min_age, max_age, page = 1, limit = 20 } = req.query;
    const query = { is_active: true };
    if (branch_id) query.branch_id = branch_id;
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (min_age) query.$or = [{ min_age: { $lte: parseInt(min_age) } }, { min_age: null }];

    const total = await RehabGame2.countDocuments(query);
    const games = await RehabGame2.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: games, total, page: parseInt(page) });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/games
 * @desc   إنشاء لعبة تأهيلية
 */
router.post('/games', async (req, res) => {
  try {
    const { code, name, name_ar, category } = req.body;
    if (!code || !name || !name_ar || !category) {
      return fail(res, 'الحقول المطلوبة: code, name, name_ar, category', 400);
    }
    const game = await RehabGame2.create({
      ...req.body,
      uuid: require('crypto').randomUUID(),
      branch_id: req.body.branch_id || req.headers['x-branch-id'],
      created_by: req.user?.id,
    });
    ok(res, { data: game, message: 'تم إنشاء اللعبة بنجاح' }, 201);
  } catch (e) {
    if (e.code === 11000) return fail(res, 'الكود مستخدم مسبقاً', 422);
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/gamification-v2/games/:id
 * @desc   تفاصيل لعبة
 */
router.get('/games/:id', async (req, res) => {
  try {
    const game = await RehabGame2.findById(req.params.id).lean();
    if (!game) return fail(res, 'اللعبة غير موجودة', 404);
    ok(res, { data: game });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/gamification-v2/games/:id
 * @desc   تحديث لعبة
 */
router.put('/games/:id', async (req, res) => {
  try {
    const game = await RehabGame2.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_by: req.user?.id },
      { new: true }
    );
    if (!game) return fail(res, 'اللعبة غير موجودة', 404);
    ok(res, { data: game, message: 'تم التحديث' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  DELETE /api/gamification-v2/games/:id
 * @desc   حذف لعبة
 */
router.delete('/games/:id', async (req, res) => {
  try {
    await RehabGame2.findByIdAndDelete(req.params.id);
    ok(res, { message: 'تم الحذف' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/games/record-session
 * @desc   تسجيل نتيجة جلسة لعب
 */
router.post('/games/record-session', async (req, res) => {
  try {
    const { game_id, beneficiary_id, score, max_score, duration_seconds, started_at } = req.body;
    if (!game_id || !beneficiary_id || score === undefined || !started_at) {
      return fail(res, 'الحقول المطلوبة: game_id, beneficiary_id, score, started_at', 400);
    }

    const session = await service.recordGameSession({
      ...req.body,
      branch_id: req.body.branch_id || req.headers['x-branch-id'],
      created_by: req.user?.id,
    });

    ok(res, {
      data: session,
      message: 'تم تسجيل نتيجة اللعبة',
      xp_earned: session.xp_earned,
      points_earned: session.points_earned,
    });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/gamification-v2/games/sessions/beneficiary/:id
 * @desc   جلسات ألعاب مستفيد محدد
 */
router.get('/games/sessions/beneficiary/:id', async (req, res) => {
  try {
    const { game_id, page = 1, limit = 20 } = req.query;
    const query = { beneficiary_id: req.params.id };
    if (game_id) query.game_id = game_id;

    const total = await GameSession2.countDocuments(query);
    const sessions = await GameSession2.find(query)
      .populate('game_id', 'name name_ar category thumbnail_path')
      .sort({ started_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: sessions, total, page: parseInt(page) });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🎁 المكافآت — Rewards
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/gamification-v2/rewards
 * @desc   المكافآت المتاحة
 */
router.get('/rewards', async (req, res) => {
  try {
    const { branch_id, type, max_cost, page = 1, limit = 20 } = req.query;
    const query = { is_active: true };
    if (branch_id) query.branch_id = branch_id;
    if (type) query.type = type;
    if (max_cost) query.points_cost = { $lte: parseInt(max_cost) };
    query.$and = [
      { $or: [{ stock: -1 }, { stock: { $gt: 0 } }] },
      { $or: [{ valid_until: null }, { valid_until: { $gte: new Date() } }] },
    ];

    const total = await GamificationReward.countDocuments(query);
    const rewards = await GamificationReward.find(query)
      .sort({ points_cost: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: rewards, total, page: parseInt(page) });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/rewards
 * @desc   إنشاء مكافأة
 */
router.post('/rewards', async (req, res) => {
  try {
    const { name, name_ar, type, points_cost } = req.body;
    if (!name || !name_ar || !type || !points_cost) {
      return fail(res, 'الحقول المطلوبة: name, name_ar, type, points_cost', 400);
    }
    const reward = await GamificationReward.create({
      ...req.body,
      uuid: require('crypto').randomUUID(),
      branch_id: req.body.branch_id || req.headers['x-branch-id'],
      created_by: req.user?.id,
    });
    ok(res, { data: reward, message: 'تم إنشاء المكافأة بنجاح' }, 201);
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/gamification-v2/rewards/:id
 * @desc   تحديث مكافأة
 */
router.put('/rewards/:id', async (req, res) => {
  try {
    const reward = await GamificationReward.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_by: req.user?.id },
      { new: true }
    );
    if (!reward) return fail(res, 'المكافأة غير موجودة', 404);
    ok(res, { data: reward, message: 'تم التحديث' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  DELETE /api/gamification-v2/rewards/:id
 * @desc   حذف مكافأة
 */
router.delete('/rewards/:id', async (req, res) => {
  try {
    await GamificationReward.findByIdAndDelete(req.params.id);
    ok(res, { message: 'تم الحذف' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/rewards/redeem
 * @desc   استبدال مكافأة بالنقاط
 */
router.post('/rewards/redeem', async (req, res) => {
  try {
    const { beneficiary_id, reward_id } = req.body;
    if (!beneficiary_id || !reward_id) {
      return fail(res, 'الحقول المطلوبة: beneficiary_id, reward_id', 400);
    }

    const redemption = await service.redeemReward(
      beneficiary_id,
      reward_id,
      req.body.branch_id || req.headers['x-branch-id']
    );

    ok(res, { data: redemption, message: 'تم استبدال المكافأة بنجاح' });
  } catch (e) {
    const clientErrors = ['نقاط غير كافية', 'غير متاحة', 'انتهت صلاحية', 'نفذت الكمية'];
    if (clientErrors.some(msg => e.message.includes(msg))) {
      return fail(res, e.message, 422);
    }
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/gamification-v2/rewards/redemptions
 * @desc   سجل استبدالات المكافآت
 */
router.get('/rewards/redemptions', async (req, res) => {
  try {
    const { branch_id, status, beneficiary_id, page = 1, limit = 20 } = req.query;
    const query = {};
    if (branch_id) query.branch_id = branch_id;
    if (status) query.status = status;
    if (beneficiary_id) query.beneficiary_id = beneficiary_id;

    const total = await RewardRedemption.countDocuments(query);
    const redemptions = await RewardRedemption.find(query)
      .populate('beneficiary_id', 'full_name')
      .populate('reward_id', 'name name_ar type')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: redemptions, total, page: parseInt(page) });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/gamification-v2/rewards/redemptions/:id/approve
 * @desc   الموافقة على استبدال
 */
router.put('/rewards/redemptions/:id/approve', async (req, res) => {
  try {
    const redemption = await RewardRedemption.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approved_by: req.user?.id, approved_at: new Date() },
      { new: true }
    );
    if (!redemption) return fail(res, 'السجل غير موجود', 404);
    ok(res, { data: redemption, message: 'تمت الموافقة' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/gamification-v2/rewards/redemptions/:id/deliver
 * @desc   تسليم المكافأة
 */
router.put('/rewards/redemptions/:id/deliver', async (req, res) => {
  try {
    const redemption = await RewardRedemption.findByIdAndUpdate(
      req.params.id,
      { status: 'delivered', delivered_at: new Date(), notes: req.body.notes },
      { new: true }
    );
    if (!redemption) return fail(res, 'السجل غير موجود', 404);
    ok(res, { data: redemption, message: 'تم التسليم' });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏅 لوحة المتصدرين — Leaderboard
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/gamification-v2/leaderboard
 * @desc   لوحة المتصدرين
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'weekly', category = 'overall', branch_id, limit = 20 } = req.query;
    const leaderboard = await service.getLeaderboard(type, category, branch_id, parseInt(limit));
    ok(res, { data: leaderboard, type, category });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/gamification-v2/leaderboard/update
 * @desc   تحديث لوحة المتصدرين
 */
router.post('/leaderboard/update', async (req, res) => {
  try {
    const { type = 'weekly', branch_id } = req.body;
    const branchId = branch_id || req.headers['x-branch-id'];

    const now = new Date();
    let periodStart, periodEnd;
    if (type === 'daily') {
      periodStart = new Date(now.setHours(0, 0, 0, 0));
      periodEnd = new Date(now.setHours(23, 59, 59, 999));
    } else if (type === 'weekly') {
      const day = now.getDay();
      periodStart = new Date(now.setDate(now.getDate() - day));
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const query = branchId
      ? { branch_id: branchId, show_on_leaderboard: true }
      : { show_on_leaderboard: true };
    const profiles = await GamificationProfile.find(query).lean();

    let updated = 0;
    for (const profile of profiles) {
      const txQuery = {
        beneficiary_id: profile.beneficiary_id,
        type: 'earned',
        createdAt: { $gte: periodStart, $lte: periodEnd },
      };
      const agg = await PointTransaction.aggregate([
        { $match: txQuery },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const score = agg[0]?.total || 0;

      await Leaderboard.findOneAndUpdate(
        {
          type,
          category: 'overall',
          period_start: periodStart,
          beneficiary_id: profile.beneficiary_id,
          branch_id: branchId,
        },
        { period_end: periodEnd, score, uuid: require('crypto').randomUUID() },
        { upsert: true }
      );
      updated++;
    }

    // تحديث الترتيب
    const entries = await Leaderboard.find({
      type,
      category: 'overall',
      period_start: periodStart,
      branch_id: branchId,
    })
      .sort({ score: -1 })
      .lean();
    for (let i = 0; i < entries.length; i++) {
      await Leaderboard.findByIdAndUpdate(entries[i]._id, { rank: i + 1 });
    }

    ok(res, { message: `تم تحديث لوحة المتصدرين (${updated} مستفيد)` });
  } catch (e) {
    fail(res, e.message);
  }
});

module.exports = router;

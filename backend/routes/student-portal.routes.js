/**
 * Student Portal — API Routes Skeleton (v1)
 *
 * Contract mirrors apps/web-student/src/lib/api.ts exactly.
 * Age-aware responses: backend must infer `variant` from DOB
 *   - age < 9  → CHILD (symbol-heavy frontend variant)
 *   - age 9-14 → YOUTH (current frontend build targets this)
 *   - age 15+  → TEEN_ADULT (mature variant)
 *
 * To activate: mount in backend/app.js via
 *   app.use('/api/v1/student', require('./routes/student-portal.routes'));
 *
 * Auth: /auth/login uses beneficiary credentials (identifier + PIN issued by parent/staff).
 * Scope: every handler returns data for req.user.beneficiaryId only.
 * Gamification: XP/level/badges computed server-side from activity completion events
 *   and beneficiary-red-flags.service signals (for streak rewards).
 */

const express = require('express');
const router = express.Router();

// Lazy requires so a missing dep never crashes module load.
let _authenticate, _Beneficiary, _Appointment, _RedFlagState;
function authenticate(req, res, next) {
  if (!_authenticate) _authenticate = require('../middleware/auth').authenticate;
  return _authenticate(req, res, next);
}
function Beneficiary() {
  if (!_Beneficiary) _Beneficiary = require('../models/Beneficiary');
  return _Beneficiary;
}
function Appointment() {
  if (!_Appointment) _Appointment = require('../models/Appointment');
  return _Appointment;
}
function RedFlagState() {
  if (!_RedFlagState) _RedFlagState = require('../models/RedFlagState');
  return _RedFlagState;
}

/**
 * Evaluate a mood-decline pattern over the trailing 5 entries:
 *   - 3+ consecutive entries with mood <= 2, OR
 *   - average of last 5 < 2.5
 *
 * Returns true if the pattern should trigger an auto-raised red-flag.
 */
function moodPatternWorrisome(moods) {
  if (!Array.isArray(moods) || moods.length < 3) return false;
  const recent = moods.slice(-5);
  let streak = 0;
  let maxStreak = 0;
  for (const m of recent) {
    if ((m?.mood ?? 3) <= 2) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else streak = 0;
  }
  if (maxStreak >= 3) return true;
  if (recent.length >= 5) {
    const avg = recent.reduce((s, m) => s + (m?.mood ?? 3), 0) / recent.length;
    if (avg < 2.5) return true;
  }
  return false;
}

/**
 * Raise an auto-flag (once) if the mood pattern is worrisome.
 * The unique (beneficiaryId, flagId, status) index on RedFlagState means
 * repeated detections don't spam the flag — subsequent mood entries are
 * no-ops while the flag stays active.
 *
 * Never throws — failures don't block the mood submission.
 */
async function maybeAutoRaiseMoodRedFlag(beneficiaryId, moods) {
  if (!moodPatternWorrisome(moods)) return;
  try {
    const now = new Date();
    await RedFlagState().create({
      beneficiaryId: String(beneficiaryId),
      flagId: 'auto:mood_decline',
      status: 'active',
      severity: 'warning',
      domain: 'CLINICAL',
      blocking: false,
      raisedAt: now,
      lastObservedAt: now,
      observedValue: {
        code: 'MOOD_DECLINE',
        priority: 'HIGH',
        notes: 'Auto-raised: 3+ consecutive low mood check-ins or 5-day avg < 2.5',
        raisedByUserId: 'system',
        sessionId: null,
      },
    });
  } catch (err) {
    // Duplicate key (already active) or DB hiccup — swallow silently.
    // This path must never break the mood submission UX.
  }
}

/**
 * Appointment.type → Student-friendly activity icon + kind.
 * The student portal is emoji-forward; plain text sessions get a sparkle.
 */
function appointmentIcon(type) {
  const map = {
    'علاج طبيعي': { icon: '🤸', kind: 'MOTOR' },
    'علاج وظيفي': { icon: '🖐️', kind: 'MOTOR' },
    'نطق وتخاطب': { icon: '🗣️', kind: 'SPEECH' },
    'علاج سلوكي': { icon: '🧠', kind: 'COGNITIVE' },
    'علاج نفسي': { icon: '💙', kind: 'SOCIAL' },
    تقييم: { icon: '📋', kind: 'COGNITIVE' },
    فحص: { icon: '🩺', kind: 'COGNITIVE' },
    'استشارة أولية': { icon: '💬', kind: 'SOCIAL' },
    متابعة: { icon: '✨', kind: 'COGNITIVE' },
  };
  return map[type] || { icon: '⭐', kind: 'COGNITIVE' };
}

/**
 * Age in whole years as of today. Null if DOB is missing.
 */
function ageInYears(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Backend-side variant inference. Must match the `variantFromAge` helper
 * in apps/web-student/src/lib/api.ts — keep in sync.
 */
function variantForAge(age) {
  if (age == null) return 'YOUTH';
  if (age < 9) return 'CHILD';
  if (age < 15) return 'YOUTH';
  return 'TEEN_ADULT';
}

// Gender-ish avatar defaults — parents/staff can override later via a profile setting.
function pickAvatar(gender, variant) {
  if (variant === 'CHILD') return gender === 'female' ? '🦄' : '🦁';
  if (variant === 'YOUTH') return gender === 'female' ? '🌸' : '🚀';
  return gender === 'female' ? '🌟' : '⭐';
}

function notImplemented(contract) {
  return (_req, res) =>
    res.status(501).json({
      error: 'NotImplemented',
      message: 'This endpoint is scaffolded but not yet wired.',
      contract,
    });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post(
  '/auth/login',
  notImplemented({
    request: { identifier: 'string', pin: 'string (4-6 digits)' },
    response: {
      accessToken: 'string',
      id: 'string',
      nameAr: 'string',
      variant: 'CHILD|YOUTH|TEEN_ADULT',
    },
  })
);

// ── Identity ──────────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    // Student portal auth uses the Beneficiary's own portal login; the JWT
    // `sub` is the beneficiary._id (not a User._id). Fallback to `userId`
    // for legacy tokens that linked via a User record.
    const beneficiaryId = req.user?.beneficiaryId || req.user?.sub || req.user?.id || req.user?._id;
    if (!beneficiaryId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized', message: 'beneficiary id missing from token' });
    }

    const b = await Beneficiary()
      .findById(beneficiaryId)
      .select('firstName_ar lastName_ar firstName_en lastName_en dateOfBirth gender status')
      .lean();

    if (!b) {
      return res.status(404).json({
        error: 'BeneficiaryNotFound',
        message: 'Beneficiary record not found.',
      });
    }

    const nameAr = [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ').trim();
    const nameEn = [b.firstName_en, b.lastName_en].filter(Boolean).join(' ').trim() || null;
    const ageYears = ageInYears(b.dateOfBirth);
    const variant = variantForAge(ageYears);
    const avatarEmoji = pickAvatar(b.gender, variant);

    // Gamification stats — these will migrate to a StudentProgress collection
    // (Phase 17). For now pull from a side store if present, else sensible defaults.
    const level = Number(b.student_level) || 1;
    const xp = Number(b.student_xp) || 0;
    const xpToNext = 100 * Math.pow(1.5, Math.max(0, level - 1));
    const streakDays = Number(b.student_streak_days) || 0;

    return res.json({
      id: String(b._id),
      nameAr: nameAr || 'الطالب',
      nameEn,
      ageYears,
      variant,
      avatarEmoji,
      level,
      xp,
      xpToNext: Math.round(xpToNext),
      streakDays,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to load student profile',
    });
  }
});

// ── Today & Mission ───────────────────────────────────────────────────────────
router.get('/today', authenticate, async (req, res) => {
  try {
    const beneficiaryId = req.user?.beneficiaryId || req.user?.sub || req.user?.id || req.user?._id;
    if (!beneficiaryId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized', message: 'beneficiary id missing from token' });
    }

    const b = await Beneficiary()
      .findById(beneficiaryId)
      .select(
        'firstName_ar lastName_ar dateOfBirth gender student_level student_xp student_streak_days'
      )
      .lean();
    if (!b) return res.status(404).json({ error: 'BeneficiaryNotFound' });

    const age = ageInYears(b.dateOfBirth);
    const variant = variantForAge(age);

    // Next session today or later, sorted earliest first.
    const now = new Date();
    const nextAppt = await Appointment()
      .findOne({
        beneficiary: beneficiaryId,
        date: { $gte: now },
        status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      })
      .sort({ date: 1, startTime: 1 })
      .select('date startTime type therapistName')
      .lean();

    let nextSession = null;
    if (nextAppt) {
      const d = new Date(nextAppt.date);
      if (typeof nextAppt.startTime === 'string' && /^\d{1,2}:\d{2}$/.test(nextAppt.startTime)) {
        const [h, m] = nextAppt.startTime.split(':').map(Number);
        d.setHours(h, m, 0, 0);
      }
      nextSession = {
        startsAt: d.toISOString(),
        therapistNameAr: nextAppt.therapistName || 'معالجك',
        programNameAr: nextAppt.type || 'جلسة',
      };
    }

    const level = Number(b.student_level) || 1;
    const xp = Number(b.student_xp) || 0;
    const xpToNext = Math.round(100 * Math.pow(1.5, Math.max(0, level - 1)));
    const streakDays = Number(b.student_streak_days) || 0;

    // Activity and badge collections aren't wired yet (Phase 17 StudentProgress).
    // Return empty arrays + default values; UI degrades to "no activities today"
    // without crashing.
    return res.json({
      student: {
        nameAr: [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ').trim() || 'الطالب',
        avatarEmoji: pickAvatar(b.gender, variant),
        level,
        xp,
        xpToNext,
        streakDays,
      },
      date: now.toISOString().slice(0, 10),
      todayActivities: [],
      nextSession,
      recentBadge: null,
      moodCheckedInToday: false,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Activities ────────────────────────────────────────────────────────────────
// Activity assignment requires a dedicated StudentActivity collection
// (Phase 17). Returning `[]` lets the UI render its "no activities today"
// empty-state without hardcoded fallbacks.
router.get('/activities', authenticate, (_req, res) => res.json([]));
router.get('/activities/:id', authenticate, (_req, res) => {
  // Until the StudentActivity collection lands (Phase 17), there are no
  // discoverable activity detail pages. The list endpoint returns []
  // so the UI never reaches this handler with a real ID, but we return
  // a clean 404 for anyone probing the URL directly.
  return res.status(404).json({
    error: 'NotFound',
    message: 'activity not found — StudentActivity collection not yet wired',
  });
});

router.post('/activities/:id/complete', authenticate, async (req, res) => {
  try {
    const beneficiaryId = req.user?.beneficiaryId || req.user?.sub || req.user?.id || req.user?._id;
    if (!beneficiaryId) return res.status(401).json({ error: 'Unauthorized' });

    // Without StudentActivity we can't lookup the actual XP reward, but we
    // still want the celebration flow to work. Award a conservative fixed
    // amount so streaks and leveling respond. This mirrors the frontend
    // DEMO fallback of 30 XP and keeps the UX identical.
    const XP_GAIN = 30;

    const b = await Beneficiary()
      .findById(beneficiaryId)
      .select('student_xp student_level student_streak_days');
    if (!b) return res.status(404).json({ error: 'BeneficiaryNotFound' });

    const currentLevel = Number(b.student_level) || 1;
    const currentXp = Number(b.student_xp) || 0;
    const xpToNext = Math.round(100 * Math.pow(1.5, Math.max(0, currentLevel - 1)));

    let newXp = currentXp + XP_GAIN;
    let newLevel = currentLevel;
    let levelUp = false;
    while (newXp >= Math.round(100 * Math.pow(1.5, Math.max(0, newLevel - 1)))) {
      newXp -= Math.round(100 * Math.pow(1.5, Math.max(0, newLevel - 1)));
      newLevel += 1;
      levelUp = true;
    }

    b.student_xp = newXp;
    b.student_level = newLevel;
    await b.save({ validateBeforeSave: false });

    return res.json({
      xpGained: XP_GAIN,
      levelUp,
      newBadge: null, // Badge collection integration pending (Phase 17)
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Schedule ──────────────────────────────────────────────────────────────────
router.get('/schedule', authenticate, async (req, res) => {
  try {
    const beneficiaryId = req.user?.beneficiaryId || req.user?.sub || req.user?.id || req.user?._id;
    if (!beneficiaryId) return res.status(401).json({ error: 'Unauthorized' });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOf7 = new Date(startOfDay);
    endOf7.setDate(endOf7.getDate() + 7);

    const appts = await Appointment()
      .find({ beneficiary: beneficiaryId, date: { $gte: startOfDay, $lt: endOf7 } })
      .sort({ date: 1, startTime: 1 })
      .select('date startTime type therapistName status')
      .lean();

    // Group appointments by day, filling empty days.
    const byDay = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() + i);
      byDay.set(d.toISOString().slice(0, 10), []);
    }
    for (const a of appts) {
      const key = new Date(a.date).toISOString().slice(0, 10);
      if (!byDay.has(key)) continue;
      const meta = appointmentIcon(a.type);
      byDay.get(key).push({
        id: String(a._id),
        kind: 'SESSION',
        time: a.startTime || null,
        titleAr: a.type
          ? `${a.type} مع ${a.therapistName || 'معالجك'}`
          : `جلسة مع ${a.therapistName || 'معالجك'}`,
        icon: meta.icon,
      });
    }

    return res.json(Array.from(byDay.entries()).map(([date, items]) => ({ date, items })));
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Achievements ──────────────────────────────────────────────────────────────
router.get('/achievements', authenticate, async (req, res) => {
  try {
    const beneficiaryId = req.user?.beneficiaryId || req.user?.sub || req.user?.id || req.user?._id;
    if (!beneficiaryId) return res.status(401).json({ error: 'Unauthorized' });

    const b = await Beneficiary()
      .findById(beneficiaryId)
      .select('student_level student_xp student_streak_days student_longest_streak')
      .lean();
    if (!b) return res.status(404).json({ error: 'BeneficiaryNotFound' });

    const level = Number(b.student_level) || 1;
    const xp = Number(b.student_xp) || 0;
    const xpToNext = Math.round(100 * Math.pow(1.5, Math.max(0, level - 1)));
    const streakDays = Number(b.student_streak_days) || 0;
    const longestStreak = Number(b.student_longest_streak) || streakDays;

    // Real sessions attended — honest count from Appointments.
    const sessionsAttended = await Appointment().countDocuments({
      beneficiary: beneficiaryId,
      status: 'COMPLETED',
    });

    return res.json({
      level,
      xp,
      xpToNext,
      streakDays,
      longestStreak,
      badges: [], // Badge collection wires in phase 17
      stats: {
        activitiesCompleted: 0, // StudentActivity.count(beneficiary, status=completed)
        sessionsAttended,
        goalsAchieved: 0, // GoalProgressEntry.where(progressPercent=100)
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Mood ──────────────────────────────────────────────────────────────────────
router.post('/mood', authenticate, async (req, res) => {
  try {
    const beneficiaryId = req.user?.beneficiaryId || req.user?.sub || req.user?.id || req.user?._id;
    if (!beneficiaryId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized', message: 'beneficiary id missing from token' });
    }

    const mood = Number(req.body?.mood);
    if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
      return res.status(400).json({ error: 'InvalidBody', message: 'mood must be an integer 1-5' });
    }

    const note =
      typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) || null : null;

    // Persist as an embedded mood-log entry on Beneficiary. Atomic $push so
    // concurrent submissions don't race. Cap history to ~365 entries so a
    // daily student doesn't grow the document forever — oldest drops off.
    const now = new Date();
    const entry = {
      _id: new (require('mongoose').Types.ObjectId)(),
      date: now,
      mood,
      note,
    };
    await Beneficiary().updateOne(
      { _id: beneficiaryId },
      {
        $push: {
          moodLog: {
            $each: [entry],
            $slice: -365,
          },
        },
      }
    );

    // Pattern check runs AFTER the insert so it sees the new entry.
    // Read back the tail only — we don't need the full 365-entry history.
    const latest = await Beneficiary()
      .findById(beneficiaryId)
      .select({ moodLog: { $slice: -5 } })
      .lean();
    await maybeAutoRaiseMoodRedFlag(beneficiaryId, latest?.moodLog || []);

    return res.json({
      id: String(entry._id),
      date: now.toISOString().slice(0, 10),
      mood,
      note,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

module.exports = router;

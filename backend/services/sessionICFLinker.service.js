/**
 * Session-ICF Goal Linking Service
 * خدمة ربط الجلسات بأهداف ICF وتتبع التقدم
 *
 * Links therapy sessions to ICF goals and tracks progress automatically.
 * Handles both DDD and legacy model schemas gracefully.
 *
 * @module services/sessionICFLinker
 */

const ICFAssessment = require('../models/assessment/ICFAssessmentLegacy');
const TherapeuticGoalModule = require('../domains/goals/models/TherapeuticGoal');
const ClinicalSessionModule = require('../domains/sessions/models/ClinicalSession');

// ─── Model extraction with fallbacks ─────────────────────────────────────────
// DDD models export { ModelName, schema, … }; legacy models export directly.
const TherapeuticGoal = TherapeuticGoalModule.TherapeuticGoal || TherapeuticGoalModule;
const ClinicalSession = ClinicalSessionModule.ClinicalSession || ClinicalSessionModule;

// ─── Session type → ICF domain mapping for auto-linking ────────────────────────
const SESSION_TYPE_ICF_DOMAIN_MAP = {
  physical: ['bodyFunctions', 'bodyStructures'],
  occupational: ['activitiesAndParticipation'],
  speech: ['bodyFunctions'],
  behavioral: ['personalFactors', 'environmentalFactors'],
};

// Specialty enum values → canonical session type
const SPECIALTY_TO_TYPE_MAP = {
  physical_therapy: 'physical',
  occupational_therapy: 'occupational',
  speech_therapy: 'speech',
  behavioral_therapy: 'behavioral',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derive the canonical session type from a ClinicalSession document.
 */
function getSessionType(session) {
  if (!session) return 'unknown';
  // The user's spec uses session.type = 'physical'|'occupational'|'speech'|'behavioral'.
  // The schema stores these in `specialty`; `type` is 'individual'|'group'|…
  const raw = session.type || SPECIALTY_TO_TYPE_MAP[session.specialty] || session.specialty;
  return raw || 'unknown';
}

/**
 * Map an ICF code prefix to its domain name.
 */
function getICFDomainFromCode(code) {
  if (!code || typeof code !== 'string') return null;
  const prefix = code.charAt(0).toLowerCase();
  const map = {
    b: 'bodyFunctions',
    s: 'bodyStructures',
    d: 'activitiesAndParticipation',
    e: 'environmentalFactors',
    p: 'personalFactors',
  };
  return map[prefix] || null;
}

/**
 * Calculate a priority score for goal ranking.
 */
function calculatePriorityScore(goal, assessment) {
  let score = 0;
  const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
  score += (priorityMap[goal.priority] || 1) * 10;

  if (goal.baseline?.value !== undefined && goal.target?.value !== undefined) {
    const gap = Math.abs(goal.target.value - goal.baseline.value);
    score += gap * 5;
  }

  score += (100 - (goal.currentProgress || 0)) * 0.3;

  // Overdue boost (uses virtual if present, else manual check)
  const isOverdue =
    goal.isOverdue ||
    (goal.targetDate && goal.status === 'active' && new Date() > new Date(goal.targetDate));
  if (isOverdue) score += 15;

  // Assessment severity boost: if this goal's domain scores poorly, raise priority
  if (assessment?.domainScores) {
    const mapping = Array.isArray(goal.icfMapping) ? goal.icfMapping[0] : null;
    const domain = mapping?.icfDomain || getICFDomainFromCode(mapping?.icfCode || goal.icfCode);
    if (domain && assessment.domainScores[domain] > 2) {
      score += assessment.domainScores[domain] * 5;
    }
  }

  return Math.round(score);
}

/**
 * Build a rating string from a numeric performance score (0-9 ICF-style).
 */
function scoreToRating(score) {
  if (score >= 7) return 'achieved';
  if (score >= 5) return 'maintained';
  if (score >= 3) return 'developing';
  if (score >= 1) return 'emerging';
  return 'not_attempted';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. getSessionICFTargets
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the ICF-related goals and codes that should be targeted in a session.
 *
 * @param {string} sessionId - MongoDB ObjectId of the ClinicalSession
 * @returns {Promise<object>} Structured target list with assessment snapshot
 */
async function getSessionICFTargets(sessionId) {
  try {
    console.log(`[SessionICFLinker] Fetching ICF targets for session: ${sessionId}`);

    if (!sessionId) {
      return { success: false, message: 'Session ID is required' };
    }

    // 1. Find session
    const session = await ClinicalSession.findById(sessionId)
      .populate('beneficiaryId', 'firstName lastName fullNameArabic mrn')
      .populate('episodeId', 'episodeNumber status startDate endDate');

    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    const beneficiaryId = session.beneficiaryId?._id || session.beneficiaryId;
    if (!beneficiaryId) {
      return { success: false, message: 'Session has no linked beneficiary' };
    }

    // 2. Find latest completed ICF assessment for the beneficiary
    let icfAssessment = null;
    try {
      if (ICFAssessment.findLatestByPatient) {
        icfAssessment = await ICFAssessment.findLatestByPatient(beneficiaryId);
      } else {
        icfAssessment = await ICFAssessment.findOne({
          beneficiary: beneficiaryId,
          status: 'completed',
        })
          .sort({ assessmentDate: -1 })
          .lean();
      }
    } catch (err) {
      console.error('[SessionICFLinker] Error fetching ICF assessment:', err.message);
    }

    // 3. Find active therapeutic goals with icfMapping
    let goals = [];
    try {
      const goalQuery = {
        beneficiaryId,
        status: { $in: ['active', 'draft'] },
        isDeleted: { $ne: true },
      };

      const goalDocs = await TherapeuticGoal.find(goalQuery).lean();

      // Filter to goals that have icfMapping OR are domain-matched when mapping is absent.
      // If the schema doesn't yet have icfMapping, we include all active goals so the
      // therapist can still manually select targets.
      goals = goalDocs.filter((g) => {
        const hasIcfMapping =
          Array.isArray(g.icfMapping) && g.icfMapping.length > 0;
        return hasIcfMapping || true; // include all active goals as fallback
      });
    } catch (err) {
      console.error('[SessionICFLinker] Error fetching therapeutic goals:', err.message);
      return { success: false, message: 'Error fetching therapeutic goals', error: err.message };
    }

    // 4. Build targets
    const targets = goals.map((goal) => {
      const mapping = Array.isArray(goal.icfMapping) ? goal.icfMapping[0] : {};
      const icfCode = mapping.icfCode || goal.icfCode || '';
      const icfDomain = mapping.icfDomain || getICFDomainFromCode(icfCode) || goal.domain || '';

      return {
        goalId: String(goal._id),
        goalStatement: goal.title || '',
        icfCode,
        icfDomain,
        currentBaseline: goal.baseline?.value ?? mapping.baselineQualifier ?? 0,
        targetValue: goal.target?.value ?? mapping.targetQualifier ?? 0,
        priorityScore: calculatePriorityScore(goal, icfAssessment),
      };
    });

    // Sort by priority descending
    targets.sort((a, b) => b.priorityScore - a.priorityScore);

    console.log(`[SessionICFLinker] Found ${targets.length} ICF targets for session ${sessionId}`);

    return {
      success: true,
      session: {
        id: String(session._id),
        beneficiaryId: String(beneficiaryId),
        date: session.scheduledDate,
        type: getSessionType(session),
      },
      icfAssessment: icfAssessment
        ? {
            overallScore: icfAssessment.overallScore,
            domainScores: icfAssessment.domainScores,
          }
        : null,
      targets,
    };
  } catch (error) {
    console.error('[SessionICFLinker] getSessionICFTargets error:', error);
    return { success: false, message: 'Failed to get session ICF targets', error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. recordSessionICFProgress
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Records progress on ICF codes during a session.
 *
 * @param {string} sessionId - MongoDB ObjectId of the ClinicalSession
 * @param {Array<{goalId, icfCode, performanceScore, capacityScore, notes}>} progressData
 * @returns {Promise<object>} Updated goals and confirmation message
 */
async function recordSessionICFProgress(sessionId, progressData) {
  try {
    console.log(`[SessionICFLinker] Recording ICF progress for session: ${sessionId}`);

    if (!sessionId) {
      return { success: false, message: 'Session ID is required' };
    }

    if (!Array.isArray(progressData) || progressData.length === 0) {
      return { success: false, message: 'Progress data array is required' };
    }

    const session = await ClinicalSession.findById(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    const updatedGoals = [];

    for (const entry of progressData) {
      const { goalId, icfCode, performanceScore, capacityScore, notes } = entry;

      if (!goalId) {
        console.warn('[SessionICFLinker] Skipping progress entry without goalId');
        continue;
      }

      try {
        const goal = await TherapeuticGoal.findById(goalId);
        if (!goal) {
          console.warn(`[SessionICFLinker] Goal not found: ${goalId}`);
          continue;
        }

        // Compute a blended increment (0–9 ICF qualifiers mapped to % space)
        const perf = performanceScore ?? 0;
        const cap = capacityScore ?? 0;
        const increment = (perf + cap) / 18 * 10; // small incremental step
        let newProgress = (goal.currentProgress || 0) + increment;
        newProgress = Math.min(100, Math.max(0, newProgress));

        goal.currentProgress = Math.round(newProgress);

        // Update lastProgressAt if schema supports it
        if (goal.schema && 'lastProgressAt' in goal.schema.paths) {
          goal.lastProgressAt = new Date();
        } else if ('lastProgressAt' in goal) {
          goal.lastProgressAt = new Date();
        }

        // Build history entry
        const historyEntry = {
          date: new Date(),
          sessionId: session._id,
          value: goal.currentProgress,
          rating: scoreToRating(perf),
          currentProgressSnapshot: goal.currentProgress,
          notes:
            notes ||
            `ICF progress recorded: ${icfCode || 'N/A'} (Performance: ${perf}, Capacity: ${cap})`,
        };

        // Use native recordProgress method if available (avoids double-save)
        if (typeof goal.recordProgress === 'function') {
          // recordProgress pushes and saves; we pre-push to include our full entry
          if (Array.isArray(goal.progressHistory)) {
            goal.progressHistory.push(historyEntry);
          }
          await goal.save();
        } else if (Array.isArray(goal.progressHistory)) {
          goal.progressHistory.push(historyEntry);
          await goal.save();
        } else {
          await goal.save();
        }

        updatedGoals.push({
          goalId: String(goalId),
          newProgressPercentage: goal.currentProgress,
        });

        console.log(
          `[SessionICFLinker] Updated goal ${goalId} progress to ${goal.currentProgress}%`
        );
      } catch (goalErr) {
        console.error(`[SessionICFLinker] Error updating goal ${goalId}:`, goalErr.message);
      }
    }

    // 3. Update session document with ICF progress flags
    try {
      // Set custom fields (best-effort; stripped if schema is strict, but safe)
      if (typeof session.set === 'function') {
        session.set('icfProgressRecorded', true);
        session.set('icfProgressData', progressData);
      }

      // Also sync into the native goalProgress array if present
      if (Array.isArray(session.goalProgress)) {
        for (const entry of progressData) {
          const existing = session.goalProgress.find(
            (gp) => gp.goalId && gp.goalId.toString() === String(entry.goalId)
          );
          const updated = updatedGoals.find((g) => g.goalId === String(entry.goalId));
          if (existing) {
            existing.progressAfter = updated?.newProgressPercentage ?? existing.progressAfter;
            existing.notes = entry.notes || existing.notes;
          } else if (updated) {
            session.goalProgress.push({
              goalId: entry.goalId,
              progressAfter: updated.newProgressPercentage,
              notes: entry.notes,
            });
          }
        }
      }

      await session.save();
    } catch (sessionErr) {
      console.error('[SessionICFLinker] Error updating session with ICF progress:', sessionErr.message);
    }

    return {
      success: true,
      updatedGoals,
      message: 'ICF progress recorded successfully',
    };
  } catch (error) {
    console.error('[SessionICFLinker] recordSessionICFProgress error:', error);
    return { success: false, message: 'Failed to record ICF progress', error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. getICFProgressForGoal
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns ICF progress history for a specific goal over time.
 *
 * @param {string} goalId - MongoDB ObjectId of the TherapeuticGoal
 * @param {string} timeRange - '1month' | '3months' | '6months' | '1year'
 * @returns {Promise<object>} Progress history with trend analysis
 */
async function getICFProgressForGoal(goalId, timeRange = '3months') {
  try {
    console.log(`[SessionICFLinker] Fetching ICF progress for goal: ${goalId}, range: ${timeRange}`);

    if (!goalId) {
      return { success: false, message: 'Goal ID is required' };
    }

    const goal = await TherapeuticGoal.findById(goalId).lean();
    if (!goal) {
      return { success: false, message: 'Goal not found' };
    }

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 3);
    }

    // Find sessions that targeted this goal in the time range
    let sessions = [];
    try {
      sessions = await ClinicalSession.find({
        $or: [
          { 'goalProgress.goalId': goalId },
          { 'goals.goalId': goalId },
          { goalIds: goalId },
        ],
        scheduledDate: { $gte: startDate, $lte: now },
        status: 'completed',
        isDeleted: { $ne: true },
      })
        .select('scheduledDate goalProgress icfProgressData')
        .sort({ scheduledDate: 1 })
        .lean();
    } catch (err) {
      console.error('[SessionICFLinker] Error fetching sessions:', err.message);
    }

    // Extract progress history from each session
    const progressHistory = [];
    for (const session of sessions) {
      let performanceScore = null;
      let capacityScore = null;
      let notes = null;

      // Prefer icfProgressData if it exists (custom field set by recordSessionICFProgress)
      if (Array.isArray(session.icfProgressData)) {
        const icfEntry = session.icfProgressData.find(
          (e) => String(e.goalId) === String(goalId)
        );
        if (icfEntry) {
          performanceScore = icfEntry.performanceScore;
          capacityScore = icfEntry.capacityScore;
          notes = icfEntry.notes;
        }
      }

      // Fallback to goalProgress
      if (
        performanceScore === null &&
        Array.isArray(session.goalProgress)
      ) {
        const gpEntry = session.goalProgress.find(
          (gp) => gp.goalId && gp.goalId.toString() === String(goalId)
        );
        if (gpEntry) {
          // Map progress delta to a synthetic performance score
          const delta =
            (gpEntry.progressAfter || 0) - (gpEntry.progressBefore || 0);
          performanceScore = delta > 0 ? Math.min(9, delta + 4) : 4;
          notes = gpEntry.notes || notes;
        }
      }

      progressHistory.push({
        date: session.scheduledDate,
        sessionId: String(session._id),
        performanceScore: performanceScore !== null ? performanceScore : undefined,
        capacityScore: capacityScore !== null ? capacityScore : undefined,
        notes: notes || '',
      });
    }

    // Calculate trend
    const trend = { direction: 'stable' };
    const scoredEntries = progressHistory.filter(
      (p) => typeof p.performanceScore === 'number'
    );
    if (scoredEntries.length >= 2) {
      const mid = Math.floor(scoredEntries.length / 2);
      const firstHalf = scoredEntries.slice(0, mid);
      const secondHalf = scoredEntries.slice(mid);
      const firstAvg =
        firstHalf.reduce((s, p) => s + p.performanceScore, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((s, p) => s + p.performanceScore, 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;

      if (diff > 0.5) trend.direction = 'improving';
      else if (diff < -0.5) trend.direction = 'worsening';
      else trend.direction = 'stable';
    } else if (scoredEntries.length === 1) {
      // Single data point: consider improving if score >= 5
      trend.direction = scoredEntries[0].performanceScore >= 5 ? 'improving' : 'stable';
    }

    return {
      success: true,
      goal: {
        goalId: String(goal._id),
        statement: goal.title || '',
        icfMapping: goal.icfMapping || goal.icfCode || null,
      },
      progressHistory,
      trend,
    };
  } catch (error) {
    console.error('[SessionICFLinker] getICFProgressForGoal error:', error);
    return { success: false, message: 'Failed to get ICF progress for goal', error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. autoLinkSessionToICF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Automatically links a new session to relevant ICF goals based on the session type.
 *
 * @param {string} sessionId - MongoDB ObjectId of the ClinicalSession
 * @returns {Promise<object>} Linked targets and update confirmation
 */
async function autoLinkSessionToICF(sessionId) {
  try {
    console.log(`[SessionICFLinker] Auto-linking session to ICF: ${sessionId}`);

    if (!sessionId) {
      return { success: false, message: 'Session ID is required' };
    }

    const session = await ClinicalSession.findById(sessionId)
      .populate('beneficiaryId', 'firstName lastName fullNameArabic mrn')
      .lean();

    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    const beneficiaryId = session.beneficiaryId?._id || session.beneficiaryId;
    if (!beneficiaryId) {
      return { success: false, message: 'Session has no linked beneficiary' };
    }

    const sessionType = getSessionType(session);
    const targetDomains = SESSION_TYPE_ICF_DOMAIN_MAP[sessionType] || [];

    if (targetDomains.length === 0) {
      console.log(`[SessionICFLinker] No ICF domain mapping for session type: ${sessionType}`);
      return {
        success: true,
        message: `No ICF domain mapping for session type: ${sessionType}`,
        linkedTargets: [],
      };
    }

    // 2. Find active goals with icfMapping for the beneficiary
    let goals = [];
    try {
      const goalDocs = await TherapeuticGoal.find({
        beneficiaryId,
        status: { $in: ['active', 'draft'] },
        isDeleted: { $ne: true },
      }).lean();

      goals = goalDocs.filter((g) => {
        if (!Array.isArray(g.icfMapping) || g.icfMapping.length === 0) {
          // When icfMapping is missing, include goals whose domain aligns
          return targetDomains.includes(g.domain);
        }
        return g.icfMapping.some((mapping) => {
          const codeDomain = getICFDomainFromCode(mapping.icfCode);
          const mappingDomain = mapping.icfDomain || codeDomain;
          return targetDomains.includes(mappingDomain);
        });
      });
    } catch (err) {
      console.error('[SessionICFLinker] Error fetching goals for auto-link:', err.message);
      return { success: false, message: 'Error fetching goals', error: err.message };
    }

    // 3. Build linked targets
    const linkedTargets = goals.map((goal) => {
      const mapping = Array.isArray(goal.icfMapping) ? goal.icfMapping[0] : {};
      const icfCode = mapping.icfCode || goal.icfCode || '';
      const icfDomain = mapping.icfDomain || getICFDomainFromCode(icfCode) || goal.domain || '';

      return {
        goalId: String(goal._id),
        goalStatement: goal.title || '',
        icfCode,
        icfDomain,
        currentBaseline: goal.baseline?.value ?? mapping.baselineQualifier ?? 0,
        targetValue: goal.target?.value ?? mapping.targetQualifier ?? 0,
        priorityScore: calculatePriorityScore(goal, null),
      };
    });

    // 4. Update session with linked goals
    try {
      const goalIds = linkedTargets.map((t) => t.goalId);
      const icfCodes = linkedTargets.map((t) => t.icfCode).filter(Boolean);

      const sessionDoc = await ClinicalSession.findById(sessionId);
      if (sessionDoc) {
        if (typeof sessionDoc.set === 'function') {
          sessionDoc.set('linkedGoalIds', goalIds);
          sessionDoc.set('linkedICFCodes', icfCodes);
        }

        // Sync into goalProgress array if present (pre-fill before session starts)
        if (Array.isArray(sessionDoc.goalProgress)) {
          for (const target of linkedTargets) {
            const exists = sessionDoc.goalProgress.some(
              (gp) => gp.goalId && gp.goalId.toString() === target.goalId
            );
            if (!exists) {
              sessionDoc.goalProgress.push({
                goalId: target.goalId,
                goalTitle: target.goalStatement,
                progressBefore: target.currentBaseline,
              });
            }
          }
        }

        // Also set legacy goals / goalIds arrays if the schema has them
        if (Array.isArray(sessionDoc.goals)) {
          for (const target of linkedTargets) {
            if (!sessionDoc.goals.some((g) => g.goalId?.toString() === target.goalId)) {
              sessionDoc.goals.push({ goalId: target.goalId });
            }
          }
        }
        if (Array.isArray(sessionDoc.goalIds)) {
          for (const gid of goalIds) {
            if (!sessionDoc.goalIds.includes(gid)) {
              sessionDoc.goalIds.push(gid);
            }
          }
        }

        await sessionDoc.save();
      }
    } catch (sessionErr) {
      console.error('[SessionICFLinker] Error updating session with linked goals:', sessionErr.message);
    }

    console.log(`[SessionICFLinker] Auto-linked ${linkedTargets.length} goals to session ${sessionId}`);

    return {
      success: true,
      sessionId: String(sessionId),
      sessionType,
      targetDomains,
      linkedTargets,
    };
  } catch (error) {
    console.error('[SessionICFLinker] autoLinkSessionToICF error:', error);
    return { success: false, message: 'Failed to auto-link session to ICF', error: error.message };
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  getSessionICFTargets,
  recordSessionICFProgress,
  getICFProgressForGoal,
  autoLinkSessionToICF,
};

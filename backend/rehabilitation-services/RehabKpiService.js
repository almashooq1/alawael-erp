/**
 * RehabKpiService — in-memory, deterministic KPI aggregator for rehabilitation dashboards.
 */

class RehabKpiService {
  constructor(deps = {}) {
    this.planService = deps.planService || null;
    this.sessionService = deps.sessionService || null;
    this.enrollmentService = deps.enrollmentService || null;
  }

  /**
   * Compute a rehabilitation dashboard from plain data objects.
   * Returns { overview, attendance, goals, sessions, plans, quality, period, computedAt }.
   */
  computeDashboard(data = {}) {
    const {
      plans = [],
      sessions = [],
      enrollments = [],
      goals = [],
      qualityScores = [],
      period = null,
    } = data;

    const totalPlans = plans.length;
    const activePlans = plans.filter(p => p.status === 'active').length;
    const completedPlans = plans.filter(p => p.status === 'completed').length;

    const totalSessions = sessions.length;
    const attendedSessions = sessions.filter(s => s.status === 'attended').length;
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length;
    const attendanceRate =
      totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;

    const totalGoals = goals.length;
    const achievedGoals = goals.filter(g => g.status === 'achieved').length;
    const inProgressGoals = goals.filter(g => g.status === 'in_progress').length;
    const pendingGoals = goals.filter(g => g.status === 'pending').length;
    const goalAchievementRate = totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0;

    const qualityAvg =
      qualityScores.length > 0
        ? Math.round(qualityScores.reduce((a, b) => a + Number(b), 0) / qualityScores.length)
        : 0;

    const overview = {
      totalPlans,
      activePlans,
      completedPlans,
      totalEnrollments: enrollments.length,
      totalSessions,
      attendedSessions,
      attendanceRate,
      totalGoals,
      achievedGoals,
      goalAchievementRate,
      qualityScore: qualityAvg,
    };

    return {
      overview,
      attendance: {
        total: totalSessions,
        attended: attendedSessions,
        cancelled: cancelledSessions,
        rate: attendanceRate,
      },
      goals: {
        total: totalGoals,
        achieved: achievedGoals,
        inProgress: inProgressGoals,
        pending: pendingGoals,
        achievementRate: goalAchievementRate,
      },
      sessions: {
        total: totalSessions,
        byStatus: sessions.reduce((acc, s) => {
          acc[s.status] = (acc[s.status] || 0) + 1;
          return acc;
        }, {}),
      },
      plans: {
        total: totalPlans,
        byStatus: plans.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {}),
      },
      quality: {
        average: qualityAvg,
        scores: qualityScores,
        count: qualityScores.length,
      },
      period,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Compute trend direction and percentage change over a numeric history.
   * history may be [value, ...] or [{ value }, ...].
   */
  computeTrend(history = []) {
    if (!Array.isArray(history) || history.length === 0) {
      return { direction: 'flat', changePercent: 0, first: null, last: null, count: 0 };
    }

    const first = history[0];
    const last = history[history.length - 1];
    const firstValue = first !== null && typeof first === 'object' ? first.value : first;
    const lastValue = last !== null && typeof last === 'object' ? last.value : last;

    const firstNum = Number(firstValue);
    const lastNum = Number(lastValue);

    let changePercent = 0;
    if (!Number.isNaN(firstNum) && !Number.isNaN(lastNum) && firstNum !== 0) {
      changePercent = Math.round(((lastNum - firstNum) / firstNum) * 1000) / 10;
    } else if (
      !Number.isNaN(firstNum) &&
      !Number.isNaN(lastNum) &&
      firstNum === 0 &&
      lastNum !== 0
    ) {
      changePercent = 100;
    }

    const direction = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat';

    return {
      direction,
      changePercent,
      first: firstValue,
      last: lastValue,
      count: history.length,
    };
  }

  /**
   * Benchmark metrics against target values.
   * Returns { metrics, belowTargetCount, overall }.
   */
  benchmark(metrics = [], targets = {}) {
    const evaluated = metrics.map(m => {
      const target = targets[m.name];
      const hasTarget = target !== undefined && target !== null;
      const belowTarget = hasTarget && Number(m.value) < Number(target);
      const gap = hasTarget ? Number(target) - Number(m.value) : null;
      return { ...m, target, belowTarget, gap };
    });

    const scoredMetrics = evaluated.filter(m => m.target !== undefined && m.target !== null);
    const belowTargetCount = scoredMetrics.filter(m => m.belowTarget).length;
    const overall =
      scoredMetrics.length > 0
        ? Math.round(((scoredMetrics.length - belowTargetCount) / scoredMetrics.length) * 100)
        : 0;

    return { metrics: evaluated, belowTargetCount, overall };
  }
}

module.exports = { RehabKpiService };

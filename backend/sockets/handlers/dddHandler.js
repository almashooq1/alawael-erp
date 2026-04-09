/* eslint-disable no-unused-vars */
/**
 * DDD Domains Real-Time Handler
 * معالج الأحداث المباشرة لمجالات DDD الموحدة
 *
 * Events:
 *  → ddd:subscribe        { domain, beneficiaryId? }
 *  → ddd:unsubscribe      { domain }
 *  ← ddd:update           { domain, type, data, timestamp }
 *  ← ddd:alert            { severity, title, domain }
 *  ← ddd:kpi:update       { kpiCode, value, trend }
 *  ← ddd:beneficiary:360  { beneficiaryId, widget, data }
 */

const logger = require('../../utils/logger');

/* ── Valid DDD domains ── */
const DDD_DOMAINS = new Set([
  'core',
  'episodes',
  'timeline',
  'assessments',
  'care-plans',
  'sessions',
  'goals',
  'workflow',
  'programs',
  'ai-recommendations',
  'quality',
  'family',
  'reports',
  'group-therapy',
  'tele-rehab',
  'ar-vr',
  'behavior',
  'research',
  'field-training',
  'dashboards',
]);

/**
 * DDD Domain Handler — follows exact pattern of dashboardHandler
 */
function dddHandler(socket, io, activeSubscriptions) {
  /* ── Subscribe to domain updates ── */
  socket.on('ddd:subscribe', (payload = {}) => {
    const { domain, beneficiaryId } = payload;

    // Validate domain
    if (domain && !DDD_DOMAINS.has(domain)) {
      socket.emit('error', {
        message: `مجال غير معروف: ${domain}`,
        code: 'INVALID_DOMAIN',
      });
      return;
    }

    // Join domain room(s)
    if (domain) {
      socket.join(`ddd:${domain}`);
      logger.info(`[DDD] ${socket.id} subscribed to domain: ${domain}`);
    } else {
      // Subscribe to ALL domains
      DDD_DOMAINS.forEach(d => socket.join(`ddd:${d}`));
      logger.info(`[DDD] ${socket.id} subscribed to ALL domains`);
    }

    // Subscribe to beneficiary-specific events
    if (beneficiaryId) {
      socket.join(`ddd:beneficiary:${beneficiaryId}`);
      logger.info(`[DDD] ${socket.id} subscribed to beneficiary: ${beneficiaryId}`);
    }

    // Track subscription
    const existing = activeSubscriptions.get(socket.id) || {};
    activeSubscriptions.set(socket.id, {
      ...existing,
      type: 'ddd',
      dddDomains: domain ? [domain] : Array.from(DDD_DOMAINS),
      beneficiaryId,
      subscribedAt: new Date(),
    });

    // Confirm
    socket.emit('ddd:subscribed', {
      domain: domain || 'all',
      beneficiaryId,
      timestamp: new Date().toISOString(),
    });
  });

  /* ── Unsubscribe from domain ── */
  socket.on('ddd:unsubscribe', (payload = {}) => {
    const { domain, beneficiaryId } = payload;

    if (domain) {
      socket.leave(`ddd:${domain}`);
      logger.info(`[DDD] ${socket.id} unsubscribed from domain: ${domain}`);
    } else {
      DDD_DOMAINS.forEach(d => socket.leave(`ddd:${d}`));
    }

    if (beneficiaryId) {
      socket.leave(`ddd:beneficiary:${beneficiaryId}`);
    }

    socket.emit('ddd:unsubscribed', {
      domain: domain || 'all',
      timestamp: new Date().toISOString(),
    });
  });

  /* ── Request KPI snapshot ── */
  socket.on('ddd:kpi:request', async (payload = {}) => {
    try {
      const mongoose = require('mongoose');
      const KPISnapshot = mongoose.models.KPISnapshot;
      const KPIDefinition = mongoose.models.KPIDefinition;

      if (!KPISnapshot || !KPIDefinition) {
        socket.emit('ddd:kpi:update', {
          error: 'KPI models not available',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const kpis = await KPIDefinition.find({ isActive: true }).lean();
      const latest = {};

      for (const kpi of kpis) {
        const snap = await KPISnapshot.findOne({ kpiId: kpi._id }).sort({ date: -1 }).lean();
        if (snap) {
          latest[kpi.code] = {
            name: kpi.nameAr || kpi.name,
            value: snap.value,
            target: kpi.target,
            unit: kpi.unit,
            date: snap.date,
            status: snap.value >= kpi.target ? 'on_track' : 'below_target',
          };
        }
      }

      socket.emit('ddd:kpi:update', { kpis: latest, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error('[DDD] KPI request error:', err.message);
      socket.emit('error', { message: 'خطأ في جلب بيانات المؤشرات', code: 'KPI_ERROR' });
    }
  });

  /* ── Request beneficiary 360 live data ── */
  socket.on('ddd:beneficiary:360:request', async (payload = {}) => {
    const { beneficiaryId } = payload;
    if (!beneficiaryId) {
      socket.emit('error', { message: 'beneficiaryId مطلوب', code: 'MISSING_PARAM' });
      return;
    }

    try {
      const mongoose = require('mongoose');
      const models = {
        Beneficiary: mongoose.models.Beneficiary,
        EpisodeOfCare: mongoose.models.EpisodeOfCare,
        ClinicalSession: mongoose.models.ClinicalSession,
        ClinicalAssessment: mongoose.models.ClinicalAssessment,
        TherapeuticGoal: mongoose.models.TherapeuticGoal,
      };

      const [activeEpisodes, recentSessions, assessmentCount, goalProgress] = await Promise.all([
        models.EpisodeOfCare?.countDocuments({ beneficiaryId, status: 'active' }) || 0,
        models.ClinicalSession?.countDocuments({ beneficiaryId, status: 'completed' }) || 0,
        models.ClinicalAssessment?.countDocuments({ beneficiaryId }) || 0,
        models.TherapeuticGoal?.find({ beneficiaryId }).select('status progressPercent').lean() ||
          [],
      ]);

      const achievedGoals = Array.isArray(goalProgress)
        ? goalProgress.filter(g => g.status === 'achieved').length
        : 0;
      const avgProgress =
        Array.isArray(goalProgress) && goalProgress.length > 0
          ? Math.round(
              goalProgress.reduce((s, g) => s + (g.progressPercent || 0), 0) / goalProgress.length
            )
          : 0;

      socket.emit('ddd:beneficiary:360', {
        beneficiaryId,
        summary: {
          activeEpisodes,
          totalSessions: recentSessions,
          totalAssessments: assessmentCount,
          totalGoals: goalProgress.length,
          achievedGoals,
          avgGoalProgress: avgProgress,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('[DDD] 360 request error:', err.message);
      socket.emit('error', { message: 'خطأ في جلب ملف المستفيد', code: 'B360_ERROR' });
    }
  });

  /* ── Request domain health ── */
  socket.on('ddd:health:request', () => {
    try {
      const { listDomains } = require('../../domains');
      const domains = listDomains();
      socket.emit('ddd:health', {
        domains: domains.map(d => ({ name: d.name, version: d.version, status: 'active' })),
        count: domains.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('[DDD] Health request error:', err.message);
      socket.emit('ddd:health', { error: err.message, timestamp: new Date().toISOString() });
    }
  });
}

/* ══════════════════════════════════════════════════════════════
 *  Broadcast helpers — called from services/routes when data changes
 * ══════════════════════════════════════════════════════════════ */

/**
 * Broadcast a DDD domain event to all subscribed clients
 * @param {object} io - Socket.IO server instance
 * @param {string} domain - DDD domain name
 * @param {string} eventType - e.g. 'created', 'updated', 'deleted', 'phase_transition'
 * @param {object} data - Event payload
 */
function broadcastDomainEvent(io, domain, eventType, data = {}) {
  if (!io) return;
  const event = {
    domain,
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  };
  io.to(`ddd:${domain}`).emit('ddd:update', event);

  // Also broadcast to beneficiary room if applicable
  if (data.beneficiaryId) {
    io.to(`ddd:beneficiary:${data.beneficiaryId}`).emit('ddd:update', event);
  }
}

/**
 * Broadcast a decision alert
 */
function broadcastAlert(io, alert) {
  if (!io) return;
  io.to('ddd:dashboards').emit('ddd:alert', {
    ...alert,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast KPI update
 */
function broadcastKPIUpdate(io, kpiCode, value, trend) {
  if (!io) return;
  io.to('ddd:dashboards').emit('ddd:kpi:update', {
    kpiCode,
    value,
    trend,
    timestamp: new Date().toISOString(),
  });
}

module.exports = dddHandler;
module.exports.broadcastDomainEvent = broadcastDomainEvent;
module.exports.broadcastAlert = broadcastAlert;
module.exports.broadcastKPIUpdate = broadcastKPIUpdate;

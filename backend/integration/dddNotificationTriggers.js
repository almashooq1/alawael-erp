/**
 * DDD Notification Triggers — مُحرّكات الإشعارات للدومينات العلاجية
 *
 * Listens to DDD domain events and dispatches notifications via
 * the existing notification system (push, SMS, email, in-app).
 *
 * Notification rules:
 *  1. Beneficiary registered → admin + clinical team notification
 *  2. Episode phase transition → assigned therapist + supervisor
 *  3. Session no-show → therapist + supervisor + family
 *  4. Assessment overdue → assigned clinician + quality team
 *  5. Goal achieved → family + supervisor
 *  6. Risk elevated → clinical director + assigned team
 *  7. Quality corrective action → assignee + manager
 *  8. Decision alert → executive + relevant dept
 *  9. AR/VR safety alert → therapist + medical team
 * 10. Behavior incident → behavior team + family + therapist
 *
 * @module integration/dddNotificationTriggers
 */

'use strict';

const logger = console;

/**
 * Notification dispatch helper — delegates to existing notification service
 */
async function dispatch(notification) {
  try {
    // Try to use the existing notification service
    const mongoose = require('mongoose');
    const Notification = mongoose.models.Notification;
    if (Notification) {
      await Notification.create({
        title: notification.title,
        titleEn: notification.titleEn,
        message: notification.message,
        type: notification.type || 'info',
        category: notification.category || 'ddd',
        priority: notification.priority || 'normal',
        recipients: notification.recipients || [],
        roles: notification.roles || [],
        data: notification.data || {},
        channel: notification.channel || ['in-app'],
        isRead: false,
      });
    }
  } catch {
    // Notification model may not exist — log only
    logger.debug(`[DDD-Notify] Dispatch skipped (no Notification model): ${notification.title}`);
  }
}

/**
 * Initialize all DDD notification triggers
 * @param {SystemIntegrationBus} integrationBus
 */
function initializeDDDNotifications(integrationBus) {
  if (!integrationBus) {
    logger.warn('[DDD-Notify] No integration bus — skipping notification triggers');
    return;
  }

  const triggers = [];

  // ── 1. Beneficiary registered ──────────────────────────────────────
  triggers.push({
    pattern: 'core.beneficiary.registered',
    handler: async event => {
      await dispatch({
        title: 'تم تسجيل مستفيد جديد',
        titleEn: 'New Beneficiary Registered',
        message: `تم تسجيل المستفيد ${event.payload.name} (${event.payload.mrn})`,
        type: 'info',
        category: 'beneficiary',
        priority: 'normal',
        roles: ['admin', 'supervisor', 'doctor'],
        data: { beneficiaryId: event.payload.beneficiaryId, mrn: event.payload.mrn },
        channel: ['in-app'],
      });
    },
  });

  // ── 2. Episode phase transition ────────────────────────────────────
  triggers.push({
    pattern: 'episodes.episode.phase_transitioned',
    handler: async event => {
      const isDischarge = ['discharge-planning', 'discharge'].includes(event.payload.toPhase);
      await dispatch({
        title: `انتقال مرحلة: ${event.payload.toPhase}`,
        titleEn: `Phase Transition: ${event.payload.toPhase}`,
        message: `حلقة الرعاية انتقلت من ${event.payload.fromPhase} إلى ${event.payload.toPhase}`,
        type: isDischarge ? 'warning' : 'info',
        category: 'episode',
        priority: isDischarge ? 'high' : 'normal',
        roles: ['therapist', 'supervisor', 'doctor'],
        data: {
          episodeId: event.payload.episodeId,
          beneficiaryId: event.payload.beneficiaryId,
        },
        channel: ['in-app', 'push'],
      });
    },
  });

  // ── 3. Session no-show ─────────────────────────────────────────────
  triggers.push({
    pattern: 'sessions.session.no_show',
    handler: async event => {
      const isCritical = event.payload.consecutiveNoShows >= 3;
      await dispatch({
        title: `عدم حضور جلسة${isCritical ? ' (متكرر!)' : ''}`,
        titleEn: `Session No-Show${isCritical ? ' (Repeated!)' : ''}`,
        message: `المستفيد لم يحضر الجلسة (${event.payload.consecutiveNoShows} مرات متتالية)`,
        type: isCritical ? 'error' : 'warning',
        category: 'session',
        priority: isCritical ? 'urgent' : 'high',
        roles: ['therapist', 'supervisor'],
        data: {
          sessionId: event.payload.sessionId,
          beneficiaryId: event.payload.beneficiaryId,
          consecutiveNoShows: event.payload.consecutiveNoShows,
        },
        channel: isCritical ? ['in-app', 'push', 'sms'] : ['in-app', 'push'],
      });
    },
  });

  // ── 4. Assessment overdue ──────────────────────────────────────────
  triggers.push({
    pattern: 'assessments.assessment.overdue',
    handler: async event => {
      await dispatch({
        title: `تقييم متأخر (${event.payload.daysPastDue} يوم)`,
        titleEn: `Assessment Overdue (${event.payload.daysPastDue} days)`,
        message: `تقييم المستفيد متأخر ${event.payload.daysPastDue} أيام عن الموعد المحدد`,
        type: 'warning',
        category: 'assessment',
        priority: event.payload.daysPastDue > 14 ? 'urgent' : 'high',
        roles: ['therapist', 'doctor', 'supervisor'],
        data: {
          beneficiaryId: event.payload.beneficiaryId,
          episodeId: event.payload.episodeId,
        },
        channel: ['in-app', 'push'],
      });
    },
  });

  // ── 5. Goal achieved ───────────────────────────────────────────────
  triggers.push({
    pattern: 'goals.goal.achieved',
    handler: async event => {
      await dispatch({
        title: 'تم تحقيق هدف علاجي 🎉',
        titleEn: 'Therapeutic Goal Achieved 🎉',
        message: `تم تحقيق هدف من نوع ${event.payload.goalType} للمستفيد`,
        type: 'success',
        category: 'goal',
        priority: 'normal',
        roles: ['therapist', 'supervisor', 'parent'],
        data: {
          goalId: event.payload.goalId,
          beneficiaryId: event.payload.beneficiaryId,
        },
        channel: ['in-app', 'push'],
      });
    },
  });

  // ── 6. Risk elevated ───────────────────────────────────────────────
  triggers.push({
    pattern: 'ai-recommendations.ai.risk_elevated',
    handler: async event => {
      await dispatch({
        title: `⚠️ خطر مرتفع: ${(event.payload.riskScore * 100).toFixed(0)}%`,
        titleEn: `⚠️ Elevated Risk: ${(event.payload.riskScore * 100).toFixed(0)}%`,
        message: `درجة المخاطر للمستفيد ارتفعت إلى ${(event.payload.riskScore * 100).toFixed(0)}% — عوامل: ${(event.payload.riskFactors || []).join(', ')}`,
        type: 'error',
        category: 'risk',
        priority: 'urgent',
        roles: ['doctor', 'supervisor', 'admin'],
        data: {
          beneficiaryId: event.payload.beneficiaryId,
          riskScore: event.payload.riskScore,
          riskFactors: event.payload.riskFactors,
        },
        channel: ['in-app', 'push', 'sms'],
      });
    },
  });

  // ── 7. Quality corrective action ───────────────────────────────────
  triggers.push({
    pattern: 'quality.quality.corrective_action_required',
    handler: async event => {
      await dispatch({
        title: 'مطلوب إجراء تصحيحي',
        titleEn: 'Corrective Action Required',
        message: `مطلوب إجراء تصحيحي: ${event.payload.finding} (${event.payload.severity})`,
        type: event.payload.severity === 'critical' ? 'error' : 'warning',
        category: 'quality',
        priority: event.payload.severity === 'critical' ? 'urgent' : 'high',
        recipients: event.payload.assigneeId ? [event.payload.assigneeId] : [],
        roles: ['manager', 'supervisor'],
        data: { auditId: event.payload.auditId },
        channel: ['in-app', 'push'],
      });
    },
  });

  // ── 8. Decision alert ──────────────────────────────────────────────
  triggers.push({
    pattern: 'dashboards.dashboard.alert_triggered',
    handler: async event => {
      await dispatch({
        title: `تنبيه قرار: ${event.payload.rule}`,
        titleEn: `Decision Alert: ${event.payload.rule}`,
        message: `مؤشر أداء تجاوز الحد — القيمة: ${event.payload.kpiValue}, الحد: ${event.payload.threshold}`,
        type: event.payload.severity === 'critical' ? 'error' : 'warning',
        category: 'dashboard',
        priority: event.payload.severity === 'critical' ? 'urgent' : 'high',
        roles: ['admin', 'manager'],
        data: { alertId: event.payload.alertId, rule: event.payload.rule },
        channel: ['in-app', 'push'],
      });
    },
  });

  // ── 9. AR/VR safety alert ──────────────────────────────────────────
  triggers.push({
    pattern: 'ar-vr.arvr.safety_alert',
    handler: async event => {
      await dispatch({
        title: '🚨 تنبيه سلامة AR/VR',
        titleEn: '🚨 AR/VR Safety Alert',
        message: `تنبيه سلامة: ${event.payload.alertType} — المقياس: ${event.payload.metric}=${event.payload.value}`,
        type: 'error',
        category: 'safety',
        priority: 'urgent',
        roles: ['therapist', 'doctor', 'supervisor'],
        data: {
          sessionId: event.payload.sessionId,
          beneficiaryId: event.payload.beneficiaryId,
        },
        channel: ['in-app', 'push', 'sms'],
      });
    },
  });

  // ── 10. Behavior incident ──────────────────────────────────────────
  triggers.push({
    pattern: 'behavior.behavior.incident_recorded',
    handler: async event => {
      const isSevere = event.payload.severity === 'severe';
      await dispatch({
        title: `حادثة سلوكية (${event.payload.severity})`,
        titleEn: `Behavior Incident (${event.payload.severity})`,
        message: `تم تسجيل حادثة سلوكية من نوع ${event.payload.behaviorType}`,
        type: isSevere ? 'error' : 'warning',
        category: 'behavior',
        priority: isSevere ? 'urgent' : 'high',
        roles: isSevere ? ['therapist', 'doctor', 'supervisor', 'parent'] : ['therapist'],
        data: {
          recordId: event.payload.recordId,
          beneficiaryId: event.payload.beneficiaryId,
        },
        channel: isSevere ? ['in-app', 'push', 'sms'] : ['in-app'],
      });
    },
  });

  // ── Register all triggers ──────────────────────────────────────────
  let registered = 0;
  for (const trigger of triggers) {
    try {
      integrationBus.subscribe(trigger.pattern, trigger.handler);
      registered++;
    } catch {
      try {
        integrationBus.on(trigger.pattern, trigger.handler);
        registered++;
      } catch {
        /* skip */
      }
    }
  }

  logger.info(`[DDD-Notify] ✓ ${registered}/${triggers.length} notification triggers registered`);

  return triggers;
}

module.exports = { initializeDDDNotifications };

/**
 * DDD Cross-Domain Subscribers — المشتركون عبر دومينات التأهيل
 *
 * Wires DDD domain events to their cross-domain consumers.
 * Creates a fully event-driven rehabilitation nervous system.
 *
 * Event flows:
 *  core → timeline/episodes/dashboards    : beneficiary registered/status changed
 *  episodes → timeline/workflow/dashboards : phase transitioned/closed
 *  assessments → care-plans/goals/ai      : assessment completed
 *  sessions → timeline/goals/dashboards   : session completed/no-show
 *  goals → ai-recommendations/timeline    : goal achieved/stalled
 *  quality → workflow/notification         : audit completed/corrective action
 *  family → ai-recommendations/workflow   : low engagement
 *  behavior → notification/family/timeline: incident recorded
 *  dashboards → notification/workflow     : alert triggered
 *  ai-recommendations → notification     : risk elevated
 *  ar-vr → notification/workflow          : safety alert
 *
 * @module integration/dddCrossModuleSubscribers
 */

'use strict';

const logger = console;

/**
 * Register all DDD cross-domain event subscribers
 * @param {SystemIntegrationBus} integrationBus
 * @param {ModuleConnector} moduleConnector
 */
function initializeDDDSubscribers(integrationBus, moduleConnector) {
  if (!integrationBus) {
    logger.warn('[DDD-CrossModule] No integration bus — skipping subscriber registration');
    return;
  }

  const subscribers = [];

  // ─── Core → Timeline: Record new beneficiary in timeline ───────────
  subscribers.push({
    name: 'core:registered → timeline:record',
    pattern: 'core.beneficiary.registered',
    handler: async event => {
      logger.info(`[DDD-CrossModule] New beneficiary ${event.payload.mrn} → recording in timeline`);
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline) {
          await CareTimeline.create({
            beneficiary: event.payload.beneficiaryId,
            eventType: 'beneficiary-registered',
            title: 'تسجيل مستفيد جديد',
            titleEn: 'New Beneficiary Registered',
            description: `تم تسجيل المستفيد ${event.payload.name}`,
            data: event.payload,
            source: 'core',
            importance: 'high',
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Timeline record failed: ${err.message}`);
      }
    },
  });

  // ─── Core → Dashboards: Update beneficiary KPI ─────────────────────
  subscribers.push({
    name: 'core:registered → dashboards:kpi',
    pattern: 'core.beneficiary.registered',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const KPISnapshot = mongoose.models.KPISnapshot;
        if (KPISnapshot) {
          const Beneficiary = mongoose.models.Beneficiary;
          const count = Beneficiary
            ? await Beneficiary.countDocuments({ isDeleted: { $ne: true } })
            : 0;
          await KPISnapshot.create({
            kpiId: 'beneficiary-total',
            value: count,
            period: 'daily',
            periodStart: new Date(),
            periodEnd: new Date(),
            metadata: { trigger: 'beneficiary.registered' },
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] KPI snapshot failed: ${err.message}`);
      }
    },
  });

  // ─── Episodes → Timeline: Phase transition ─────────────────────────
  subscribers.push({
    name: 'episodes:phase_transitioned → timeline:record',
    pattern: 'episodes.episode.phase_transitioned',
    handler: async event => {
      logger.info(
        `[DDD-CrossModule] Episode ${event.payload.episodeId}: ${event.payload.fromPhase} → ${event.payload.toPhase}`
      );
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline) {
          await CareTimeline.create({
            beneficiary: event.payload.beneficiaryId,
            episode: event.payload.episodeId,
            eventType: 'phase-transition',
            title: `انتقال مرحلة: ${event.payload.toPhase}`,
            titleEn: `Phase Transition: ${event.payload.toPhase}`,
            description: `من ${event.payload.fromPhase} إلى ${event.payload.toPhase}`,
            data: event.payload,
            source: 'episodes',
            importance: 'high',
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Timeline phase record failed: ${err.message}`);
      }
    },
  });

  // ─── Episodes → Workflow: Auto-create tasks on phase transition ─────
  subscribers.push({
    name: 'episodes:phase_transitioned → workflow:create_task',
    pattern: 'episodes.episode.phase_transitioned',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const WorkflowTask = mongoose.models.WorkflowTask;
        if (WorkflowTask) {
          const phaseTaskMap = {
            assessment: 'إجراء تقييم شامل',
            planning: 'إعداد خطة رعاية',
            'active-treatment': 'بدء الجلسات العلاجية',
            review: 'مراجعة التقدم',
            'discharge-planning': 'التخطيط للخروج',
          };
          const taskTitle = phaseTaskMap[event.payload.toPhase];
          if (taskTitle) {
            await WorkflowTask.create({
              beneficiary: event.payload.beneficiaryId,
              episode: event.payload.episodeId,
              title: taskTitle,
              titleEn: `Phase task: ${event.payload.toPhase}`,
              taskType: 'phase-requirement',
              status: 'pending',
              priority: 'high',
              phase: event.payload.toPhase,
              source: 'auto-generated',
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            });
          }
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Workflow task creation failed: ${err.message}`);
      }
    },
  });

  // ─── Sessions → Timeline: Session completed ────────────────────────
  subscribers.push({
    name: 'sessions:completed → timeline:record',
    pattern: 'sessions.session.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline) {
          await CareTimeline.create({
            beneficiary: event.payload.beneficiaryId,
            episode: event.payload.episodeId,
            eventType: 'session-completed',
            title: `جلسة مكتملة (${event.payload.sessionType})`,
            titleEn: `Session completed (${event.payload.sessionType})`,
            data: event.payload,
            source: 'sessions',
            importance: 'normal',
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Session timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Sessions → AI: No-show triggers risk analysis ─────────────────
  subscribers.push({
    name: 'sessions:no_show → ai:risk_check',
    pattern: 'sessions.session.no_show',
    handler: async event => {
      logger.warn(
        `[DDD-CrossModule] No-show for beneficiary ${event.payload.beneficiaryId} (${event.payload.consecutiveNoShows} consecutive)`
      );
      try {
        if (event.payload.consecutiveNoShows >= 3) {
          // Publish risk elevated event
          await integrationBus.publish(
            'ai-recommendations',
            'ai.risk_elevated',
            {
              beneficiaryId: event.payload.beneficiaryId,
              riskScore: 0.7 + event.payload.consecutiveNoShows * 0.05,
              previousScore: 0.5,
              riskFactors: [`${event.payload.consecutiveNoShows} consecutive no-shows`],
            },
            { priority: 'critical', delivery: ['persist', 'broadcast', 'realtime', 'local'] }
          );
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Risk check failed: ${err.message}`);
      }
    },
  });

  // ─── Goals → Timeline: Goal achieved ───────────────────────────────
  subscribers.push({
    name: 'goals:achieved → timeline:record',
    pattern: 'goals.goal.achieved',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline) {
          await CareTimeline.create({
            beneficiary: event.payload.beneficiaryId,
            eventType: 'goal-achieved',
            title: 'تم تحقيق هدف علاجي',
            titleEn: 'Therapeutic goal achieved',
            data: event.payload,
            source: 'goals',
            importance: 'high',
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Goal timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Goals → Family: Notify family of achievement ──────────────────
  subscribers.push({
    name: 'goals:achieved → family:notify',
    pattern: 'goals.goal.achieved',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const FamilyCommunication = mongoose.models.FamilyCommunication;
        const FamilyMember = mongoose.models.FamilyMember;
        if (FamilyCommunication && FamilyMember) {
          const members = await FamilyMember.find({
            beneficiary: event.payload.beneficiaryId,
            isDeleted: { $ne: true },
          }).limit(5);
          for (const member of members) {
            await FamilyCommunication.create({
              beneficiary: event.payload.beneficiaryId,
              familyMember: member._id,
              type: 'notification',
              direction: 'outbound',
              subject: 'تم تحقيق هدف علاجي',
              content: `تم تحقيق هدف علاجي (${event.payload.goalType}) لابنكم/ابنتكم`,
              status: 'sent',
              channel: 'system',
            });
          }
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Family notify failed: ${err.message}`);
      }
    },
  });

  // ─── Quality → Workflow: Create corrective action task ─────────────
  subscribers.push({
    name: 'quality:corrective_action → workflow:task',
    pattern: 'quality.quality.corrective_action_required',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const WorkflowTask = mongoose.models.WorkflowTask;
        if (WorkflowTask) {
          await WorkflowTask.create({
            title: `إجراء تصحيحي: ${event.payload.finding}`,
            titleEn: `Corrective Action: ${event.payload.finding}`,
            taskType: 'corrective-action',
            status: 'pending',
            priority: event.payload.severity === 'critical' ? 'urgent' : 'high',
            assignee: event.payload.assigneeId,
            source: 'quality-audit',
            metadata: { auditId: event.payload.auditId },
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Corrective action task failed: ${err.message}`);
      }
    },
  });

  // ─── Behavior → Timeline + Family: Incident recorded ──────────────
  subscribers.push({
    name: 'behavior:incident → timeline+family:notify',
    pattern: 'behavior.behavior.incident_recorded',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline) {
          await CareTimeline.create({
            beneficiary: event.payload.beneficiaryId,
            eventType: 'behavior-incident',
            title: `حادثة سلوكية (${event.payload.severity})`,
            titleEn: `Behavior incident (${event.payload.severity})`,
            data: event.payload,
            source: 'behavior',
            importance: event.payload.severity === 'severe' ? 'critical' : 'high',
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Behavior timeline failed: ${err.message}`);
      }
    },
  });

  // ─── AR/VR → Workflow: Safety alert creates urgent task ────────────
  subscribers.push({
    name: 'ar-vr:safety_alert → workflow:urgent_task',
    pattern: 'ar-vr.arvr.safety_alert',
    handler: async event => {
      logger.warn(`[DDD-CrossModule] AR/VR Safety Alert: ${event.payload.alertType}`);
      try {
        const mongoose = require('mongoose');
        const WorkflowTask = mongoose.models.WorkflowTask;
        if (WorkflowTask) {
          await WorkflowTask.create({
            beneficiary: event.payload.beneficiaryId,
            title: `تنبيه سلامة AR/VR: ${event.payload.alertType}`,
            titleEn: `AR/VR Safety: ${event.payload.alertType}`,
            taskType: 'safety-alert',
            status: 'pending',
            priority: 'urgent',
            source: 'ar-vr',
            metadata: {
              sessionId: event.payload.sessionId,
              metric: event.payload.metric,
              value: event.payload.value,
            },
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] AR/VR safety task failed: ${err.message}`);
      }
    },
  });

  // ─── Dashboard → Workflow: Alert triggers action task ──────────────
  subscribers.push({
    name: 'dashboards:alert → workflow:task',
    pattern: 'dashboards.dashboard.alert_triggered',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const WorkflowTask = mongoose.models.WorkflowTask;
        if (WorkflowTask && event.payload.severity === 'critical') {
          await WorkflowTask.create({
            title: `تنبيه قرار: ${event.payload.rule}`,
            titleEn: `Decision Alert: ${event.payload.rule}`,
            taskType: 'decision-alert',
            status: 'pending',
            priority: 'urgent',
            source: 'dashboards',
            metadata: {
              alertId: event.payload.alertId,
              kpiValue: event.payload.kpiValue,
              threshold: event.payload.threshold,
            },
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Dashboard alert task failed: ${err.message}`);
      }
    },
  });

  // ─── AI → Family: Notify family on risk elevated ───────────────────
  subscribers.push({
    name: 'ai:risk_elevated → family:alert',
    pattern: 'ai-recommendations.ai.risk_elevated',
    handler: async event => {
      try {
        if (event.payload.riskScore >= 0.8) {
          const mongoose = require('mongoose');
          const DecisionAlert = mongoose.models.DecisionAlert;
          if (DecisionAlert) {
            await DecisionAlert.create({
              title: 'خطر مرتفع للمستفيد',
              titleEn: 'Elevated Beneficiary Risk',
              level: 'critical',
              rule: 'ai-risk-elevated',
              message: `درجة المخاطر: ${(event.payload.riskScore * 100).toFixed(0)}%`,
              domain: 'ai-recommendations',
              kpiValue: event.payload.riskScore,
              threshold: 0.8,
              metadata: {
                beneficiaryId: event.payload.beneficiaryId,
                factors: event.payload.riskFactors,
              },
            });
          }
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Risk alert creation failed: ${err.message}`);
      }
    },
  });

  // ─── Assessment → AI: Trigger recommendations ─────────────────────
  subscribers.push({
    name: 'assessments:completed → ai:generate',
    pattern: 'assessments.assessment.completed',
    handler: async event => {
      logger.info(
        `[DDD-CrossModule] Assessment completed for ${event.payload.beneficiaryId} → trigger AI`
      );
      try {
        const mongoose = require('mongoose');
        const Recommendation = mongoose.models.Recommendation;
        if (Recommendation && event.payload.overallScore < 50) {
          await Recommendation.create({
            beneficiary: event.payload.beneficiaryId,
            episode: event.payload.episodeId,
            ruleId: 'low-assessment-score',
            type: 'treatment-adjustment',
            title: 'يُنصح بتعديل الخطة العلاجية',
            titleEn: 'Recommend treatment plan adjustment',
            description: `درجة التقييم ${event.payload.overallScore}% أقل من الحد المقبول`,
            priority: 'high',
            confidence: 0.85,
            status: 'pending',
            source: 'auto-generated',
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] AI recommendation failed: ${err.message}`);
      }
    },
  });

  // ─── Family Low Engagement → Workflow Task ─────────────────────────
  subscribers.push({
    name: 'family:engagement_low → workflow:task',
    pattern: 'family.family.engagement_low',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const WorkflowTask = mongoose.models.WorkflowTask;
        if (WorkflowTask) {
          await WorkflowTask.create({
            beneficiary: event.payload.beneficiaryId,
            title: `تفاعل أسري منخفض (${event.payload.daysSinceContact} يوم)`,
            titleEn: `Low family engagement (${event.payload.daysSinceContact} days)`,
            taskType: 'family-outreach',
            status: 'pending',
            priority: 'high',
            source: 'family-engagement',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Family engagement task failed: ${err.message}`);
      }
    },
  });

  // ── Register all subscribers ───────────────────────────────────────
  let registered = 0;
  for (const sub of subscribers) {
    try {
      integrationBus.subscribe(sub.pattern, sub.handler);
      registered++;
    } catch (err) {
      // Fallback: use EventEmitter pattern if subscribe() not available
      try {
        integrationBus.on(sub.pattern, sub.handler);
        registered++;
      } catch (e2) {
        logger.warn(`[DDD-CrossModule] Could not register: ${sub.name} — ${e2.message}`);
      }
    }
  }

  logger.info(
    `[DDD-CrossModule] ✓ ${registered}/${subscribers.length} DDD event subscribers registered`
  );

  return subscribers;
}

module.exports = { initializeDDDSubscribers };

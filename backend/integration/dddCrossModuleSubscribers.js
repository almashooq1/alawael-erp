/**
 * DDD Cross-Domain Subscribers — المشتركون عبر دومينات التأهيل
 *
 * Wires DDD domain events to their cross-domain consumers.
 * Creates a fully event-driven rehabilitation nervous system.
 *
 * Event flows:
 *  core → timeline/episodes/dashboards    : beneficiary registered/status changed
 *  appointments → timeline/dashboards     : booked/cancelled/no-show (W928)
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
function initializeDDDSubscribers(integrationBus, _moduleConnector) {
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
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'registration',
            category: 'administrative',
            severity: 'info',
            title: `New beneficiary registered: ${event.payload.name || ''}`.trim(),
            title_ar: `تسجيل مستفيد جديد: ${event.payload.name || ''}`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Timeline record failed: ${err.message}`);
      }
    },
  });

  // W928 REMOVED: 'core:registered → dashboards:kpi' subscriber.
  // It wrote a KPISnapshot per registration with `kpiId: 'beneficiary-total'`
  // (a string) — but KPISnapshot.kpiId is a REQUIRED ObjectId ref to
  // DashboardKPIDefinition, so every create() threw a CastError swallowed by
  // the try/catch (zero rows ever persisted). The design was also wrong: a
  // per-event "daily" snapshot spams one row per registration. Beneficiary-
  // count KPIs are derived by the scheduled KPI job + dashboard aggregate
  // queries, not by this event. The CareTimeline `registration` entry above is
  // the durable core-linkage artifact for a new beneficiary.

  // ─── Episodes → Timeline: Episode opened (فتح حلقة علاجية) ──────────
  // W929: closes the loop on the W928 registration→episode wiring. The
  // student-management route publishes `episodes.episode.created` when a new
  // beneficiary's care pathway is opened, but no subscriber recorded it on the
  // unified timeline (only phase_transitioned was wired). Without this entry
  // the timeline jumped straight from "registration" to the first phase
  // transition, hiding the moment the Episode of Care موحد was actually opened.
  subscribers.push({
    name: 'episodes:created → timeline:record',
    pattern: 'episodes.episode.created',
    handler: async event => {
      logger.info(
        `[DDD-CrossModule] Episode ${event.payload.episodeId} opened → recording in timeline`
      );
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const phase = event.payload.phase || 'intake';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'admission',
            category: 'clinical',
            severity: 'info',
            title: `Episode of care opened (phase: ${phase})`,
            title_ar: `فتح حلقة علاجية (المرحلة: ${phase})`,
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Timeline episode-open record failed: ${err.message}`);
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
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'phase_advanced',
            category: 'clinical',
            severity: 'info',
            title: `Phase transition: ${event.payload.toPhase}`,
            title_ar: `انتقال مرحلة: ${event.payload.toPhase}`,
            description: `from ${event.payload.fromPhase} to ${event.payload.toPhase}`,
            metadata: event.payload,
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
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'session_completed',
            category: 'clinical',
            severity: 'success',
            title: `Session completed (${event.payload.sessionType || ''})`.trim(),
            title_ar: `جلسة مكتملة (${event.payload.sessionType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Session timeline failed: ${err.message}`);
      }
    },
  });

  // W390 DELETED: 'sessions:no_show → ai:risk_check' subscriber.
  // Listened for 'sessions.session.no_show' which W377 deleted (SESSION_EVENTS.
  // NO_SHOW + CANCELLED). Subscriber was dead-on-arrival — its handler's
  // integrationBus.publish('ai-recommendations', 'ai.risk_elevated', ...) chain
  // also became unreachable. Removal closes the W389 baseline by 1 entry.

  // ─── Sessions → Timeline: Session cancelled (W974) ──────────────────
  // SessionService.cancelSession emits the canonical `session.cancelled`
  // (was ad-hoc `sessionCancelled`, never bridged), enriched with
  // beneficiaryId + episodeId so the cancellation lands on the timeline.
  subscribers.push({
    name: 'sessions:cancelled → timeline:record',
    pattern: 'sessions.session.cancelled',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const reason = event.payload.reason;
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'session_cancelled',
            category: 'clinical',
            severity: 'warning',
            title: 'Session cancelled',
            title_ar: reason ? `إلغاء الجلسة (${reason})` : 'إلغاء الجلسة',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Session cancel timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Sessions → Timeline: Session no-show (W974) ────────────────────
  // SessionService.markNoShow emits the canonical `session.no_show` (was
  // ad-hoc `sessionNoShow`, never bridged), enriched with the links so a
  // missed appointment is visible on the unified timeline.
  subscribers.push({
    name: 'sessions:no_show → timeline:record',
    pattern: 'sessions.session.no_show',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'session_no_show',
            category: 'clinical',
            severity: 'warning',
            title: 'Session no-show',
            title_ar: 'تغيّب عن الجلسة',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Session no-show timeline failed: ${err.message}`);
      }
    },
  });
  // ─── Goals → Timeline: Goal created (W939) ──────────────────
  // GoalService.afterCreate emits `goal.created` (normalized from the dead
  // `goalCreated` ad-hoc name + enriched with episodeId, bridged to
  // `goals.goal.created`). Until now only goal *achievement* landed on the
  // timeline — the goal-setting moment that opens each therapeutic objective was
  // invisible. Per doctrine "اربط كل هدف بالمستفيد والحلقة والزمن" the new
  // goal now lands on the timeline linked to its episode.
  subscribers.push({
    name: 'goals:created → timeline:record',
    pattern: 'goals.goal.created',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const num = event.payload.goalNumber;
          const numText = num ? ` #${num}` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'goal_created',
            category: 'clinical',
            severity: 'info',
            title: `Therapeutic goal set${num ? ` #${num}` : ''}`,
            title_ar: `تحديد هدف علاجي${numText}`,
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Timeline goal-create record failed: ${err.message}`);
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
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'goal_achieved',
            category: 'clinical',
            severity: 'success',
            title: 'Therapeutic goal achieved',
            title_ar: 'تم تحقيق هدف علاجي',
            metadata: event.payload,
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
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'behavior_incident',
            category: 'clinical',
            severity: event.payload.severity === 'severe' ? 'critical' : 'warning',
            title: `Behavior incident (${event.payload.severity || ''})`.trim(),
            title_ar: `حادثة سلوكية (${event.payload.severity || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Behavior timeline failed: ${err.message}`);
      }
    },
  });

  // W390 DELETED: 'ar-vr:safety_alert' + 'dashboards:alert' subscribers.
  // Listened for 'ar-vr.arvr.safety_alert' + 'dashboards.dashboard.alert_triggered'
  // which W377 deleted (ARVR_EVENTS + DASHBOARD_EVENTS whole groups).
  // Both subscribers were dead-on-arrival — no producer existed.

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

  // ─── Assessment → Timeline: Completed (W930) ──────────────────────
  // Closes the next pathway link after W929: when an assessment is completed
  // (AssessmentsService emits `assessment.completed` → bridged to
  // `assessments.assessment.completed`), the only subscriber was the AI
  // recommendation generator — nothing recorded the completion on the unified
  // CareTimeline. Per doctrine "اربط كل تقييم بالمستفيد والحلقة والزمن", the
  // assessment now lands on the timeline linked to its episode.
  subscribers.push({
    name: 'assessments:completed → timeline:record',
    pattern: 'assessments.assessment.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const score = event.payload.overallScore;
          const scoreText = score === undefined || score === null ? '' : ` (${score}%)`;
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'assessment_completed',
            category: 'clinical',
            severity: 'success',
            title: `Assessment completed: ${event.payload.type || ''}${scoreText}`.trim(),
            title_ar: `اكتمال تقييم: ${event.payload.type || ''}${scoreText}`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(
          `[DDD-CrossModule] Timeline assessment-complete record failed: ${err.message}`
        );
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

  // ─── Care plan → Timeline: Created (W937) ─────────────────────────
  // Completes the care-plan lifecycle on the unified timeline. CarePlansService
  // .createPlan emits `careplan.created` (bridged to `care-plans.careplan.created`)
  // with the draft plan's beneficiary + episode. Per doctrine "اربط كل خطة
  // بالمستفيد والحلقة والزمن" the drafted plan now lands on the timeline as the
  // opening of the chain that the W931 `care_plan_approved` entry continues.
  subscribers.push({
    name: 'care-plans:created → timeline:record',
    pattern: 'care-plans.careplan.created',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const type = event.payload.type || 'rehabilitation';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'care_plan_created',
            category: 'clinical',
            severity: 'info',
            title: `Care plan drafted: ${type}`,
            title_ar: `إنشاء خطة رعاية: ${type}`,
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Timeline care-plan-create record failed: ${err.message}`);
      }
    },
  });

  // ─── Care plan → Timeline: Updated (W945) ─────────────────────────
  // Closes the last ad-hoc care-plan event: CarePlansService.updatePlan emitted
  // a non-canonical `care-plan:updated` with no episode link and no timeline
  // record. W945 canonicalizes it to `careplan.updated` (bridged to
  // `care-plans.careplan.updated`) carrying episodeId, so every plan revision
  // lands on the unified timeline between the W937 `care_plan_created` opening
  // and the W931 `care_plan_approved` activation — per doctrine "اربط كل خطة
  // بالمستفيد والحلقة والزمن".
  subscribers.push({
    name: 'care-plans:updated → timeline:record',
    pattern: 'care-plans.careplan.updated',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'care_plan_updated',
            category: 'clinical',
            severity: 'info',
            title: 'Care plan updated',
            title_ar: 'تحديث خطة الرعاية',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Timeline care-plan-update record failed: ${err.message}`);
      }
    },
  });

  // ─── Care plan → Timeline: Activated (W931) ───────────────────────
  // Next pathway link after W930: CarePlansService.activatePlan emits
  // `careplan.activated` (bridged to `care-plans.careplan.activated`), consumed
  // until now only by downstream services — nothing recorded the activation on
  // the unified CareTimeline. Per doctrine "اربط كل خطة بالمستفيد والحلقة والزمن"
  // the activated plan now lands on the timeline linked to its episode.
  subscribers.push({
    name: 'care-plans:activated → timeline:record',
    pattern: 'care-plans.careplan.activated',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const goalCount = event.payload.goalCount;
          const goalText = typeof goalCount === 'number' ? ` (${goalCount} هدف)` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'care_plan_approved',
            category: 'clinical',
            severity: 'success',
            title: `Care plan activated${typeof goalCount === 'number' ? ` (${goalCount} goals)` : ''}`,
            title_ar: `تفعيل خطة الرعاية${goalText}`,
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Timeline care-plan-activate record failed: ${err.message}`);
      }
    },
  });

  // ─── Care plan → Timeline: Completed (W947) ─────────────────────
  // Closes the care-plan lifecycle on the unified timeline: after drafting
  // (W937), revision (W945) and activation (W931), CarePlansService.completePlan
  // emits `careplan.completed` (bridged to `care-plans.careplan.completed`) with
  // the beneficiary, episode (W947) and final achievementRate — yet nothing
  // recorded the clinical closure of the plan. Per doctrine "اربط كل خطة
  // بالمستفيد والحلقة والزمن" the completed plan now lands on the timeline as
  // the terminal milestone of the care-plan chain.
  subscribers.push({
    name: 'care-plans:completed → timeline:record',
    pattern: 'care-plans.careplan.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const rate = event.payload.achievementRate;
          const rateText = typeof rate === 'number' ? ` (نسبة التحقق ${rate}٪)` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'care_plan_completed',
            category: 'clinical',
            severity: 'success',
            title: `Care plan completed${typeof rate === 'number' ? ` (${rate}% achieved)` : ''}`,
            title_ar: `استكمال خطة الرعاية${rateText}`,
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Timeline care-plan-complete record failed: ${err.message}`);
      }
    },
  });

  // ─── Episodes → Timeline: Discharge / episode closed (W935) ───────
  // Final longitudinal pathway link: EpisodeService.dischargeEpisode emits
  // `episode.closed` (bridged to `episodes.episode.closed`) with outcome +
  // durationDays, but nothing recorded the discharge on the unified timeline —
  // the Episode of Care موحد closed silently. Per doctrine "اربط كل حلقة علاجية
  // بالمستفيد والزمن", the discharge now lands on the timeline linked to its
  // episode, closing the loop that opened with the W929 `admission` entry.
  subscribers.push({
    name: 'episodes:closed → timeline:record',
    pattern: 'episodes.episode.closed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const outcome = event.payload.outcome || 'completed';
          const days = event.payload.durationDays;
          const daysText = typeof days === 'number' ? ` (${days} يوم)` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'discharge',
            category: 'clinical',
            severity: 'info',
            title: `Episode of care closed: ${outcome}${typeof days === 'number' ? ` (${days} days)` : ''}`,
            title_ar: `إغلاق حلقة علاجية: ${outcome}${daysText}`,
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Timeline episode-close record failed: ${err.message}`);
      }
    },
  });

  // W390 DELETED: 'family:engagement_low' subscriber.
  // Listened for 'family.family.engagement_low' which W377 deleted (FAMILY_EVENTS
  // whole group). Dead-on-arrival — no producer existed.

  // ─── Appointments → Timeline: Booked (W928) ───────────────────────
  subscribers.push({
    name: 'appointments:booked → timeline:record',
    pattern: 'appointments.appointment.booked',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'appointment_booked',
            category: 'clinical',
            severity: 'info',
            title: `Appointment booked (${event.payload.appointmentType || ''})`.trim(),
            title_ar: `حجز موعد (${event.payload.appointmentType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Appointment booked timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Appointments → Timeline: Cancelled (W928) ────────────────────
  subscribers.push({
    name: 'appointments:cancelled → timeline:record',
    pattern: 'appointments.appointment.cancelled',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'appointment_cancelled',
            category: 'administrative',
            severity: 'info',
            title: 'Appointment cancelled',
            title_ar: 'إلغاء موعد',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Appointment cancelled timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Appointments → Timeline: No-show (W928) ──────────────────────
  // A no-show is a clinical-risk signal (disengagement / drop-out predictor),
  // so it lands as a HIGH-importance timeline entry the director dashboard
  // surfaces — not buried in the appointments grid.
  subscribers.push({
    name: 'appointments:no_show → timeline:record',
    pattern: 'appointments.appointment.no_show',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'appointment_no_show',
            category: 'clinical',
            severity: 'warning',
            title: 'Appointment no-show',
            title_ar: 'تغيّب عن موعد (عدم حضور)',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Appointment no-show timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Safety → Timeline: Seizure recorded (W977, CRITICAL) ─────────
  subscribers.push({
    name: 'safety:seizure → timeline:record',
    pattern: 'safety.seizure.recorded',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const emergency = event.payload.statusEpilepticus === true;
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'seizure_event',
            category: 'clinical',
            severity: emergency ? 'critical' : 'warning',
            title: emergency
              ? 'Seizure — STATUS EPILEPTICUS (emergency)'
              : `Seizure recorded (${event.payload.severity || ''})`.trim(),
            title_ar: emergency
              ? 'نوبة صرع — حالة صرعية مستمرة (طارئ)'
              : `تسجيل نوبة صرع (${event.payload.severity || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Seizure timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Safety → Timeline: Safeguarding concern raised (W977, CRITICAL) ─
  subscribers.push({
    name: 'safety:safeguarding → timeline:record',
    pattern: 'safety.safeguarding.raised',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'safeguarding_concern',
            category: 'clinical',
            severity: event.payload.severity === 'critical' ? 'critical' : 'warning',
            title: `Safeguarding concern raised (${event.payload.category || ''})`.trim(),
            title_ar: `بلاغ حماية (${event.payload.category || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Safeguarding timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Safety → Timeline: Restraint/seclusion applied (W977) ────────
  subscribers.push({
    name: 'safety:restraint → timeline:record',
    pattern: 'safety.restraint.applied',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'restraint_applied',
            category: 'clinical',
            severity: 'warning',
            title: `Restraint/seclusion applied (${event.payload.restraintType || ''})`.trim(),
            title_ar: `تطبيق تقييد/عزل (${event.payload.restraintType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Restraint timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Waitlist → Timeline: Added (W979) ────────────────────────────
  subscribers.push({
    name: 'waitlist:added → timeline:record',
    pattern: 'waitlist.waitlist.added',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'waitlisted',
            category: 'administrative',
            severity: 'info',
            title: `Added to waitlist (${event.payload.department || ''})`.trim(),
            title_ar: `إضافة لقائمة الانتظار (${event.payload.department || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Waitlist-added timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Waitlist → Timeline: Booked = admission (W979) ───────────────
  subscribers.push({
    name: 'waitlist:booked → timeline:record',
    pattern: 'waitlist.waitlist.booked',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'waitlist_booked',
            category: 'administrative',
            severity: 'success',
            title: `Booked from waitlist — admission (${event.payload.department || ''})`.trim(),
            title_ar: `حجز/قبول من قائمة الانتظار (${event.payload.department || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Waitlist-booked timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Screenings → Timeline: Vision finalized (W980) ───────────────
  subscribers.push({
    name: 'screenings:vision → timeline:record',
    pattern: 'screenings.screening.vision_completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const refer = event.payload.outcome === 'refer';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'screening_completed',
            category: 'clinical',
            severity: refer ? 'warning' : 'info',
            title: refer
              ? `Vision screening → REFER (${event.payload.referralTo || 'ophthalmology'})`
              : `Vision screening finalized (${event.payload.outcome || ''})`.trim(),
            title_ar: refer
              ? `فحص بصر → إحالة (${event.payload.referralTo || 'عيون'})`
              : `إنهاء فحص بصر (${event.payload.outcome || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Vision-screening timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Screenings → Timeline: Hearing finalized (W980) ──────────────
  subscribers.push({
    name: 'screenings:hearing → timeline:record',
    pattern: 'screenings.screening.hearing_completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const refer = event.payload.outcome === 'refer';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'screening_completed',
            category: 'clinical',
            severity: refer ? 'warning' : 'info',
            title: refer
              ? 'Hearing screening → REFER (audiology/ENT)'
              : `Hearing screening finalized (${event.payload.outcome || ''})`.trim(),
            title_ar: refer
              ? 'فحص سمع → إحالة (سمعيات/أنف وأذن)'
              : `إنهاء فحص سمع (${event.payload.outcome || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Hearing-screening timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Medication → Timeline: Administered (W981) ───────────────────
  subscribers.push({
    name: 'medication:administered → timeline:record',
    pattern: 'medication.medication.administered',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'medication_administered',
            category: 'clinical',
            severity: 'info',
            title: `Medication administered (${event.payload.medicationName || ''})`.trim(),
            title_ar: `إعطاء دواء (${event.payload.medicationName || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Medication-administered timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Medication → Timeline: NOT given = refused/missed/held (W981) ─
  subscribers.push({
    name: 'medication:not_given → timeline:record',
    pattern: 'medication.medication.not_given',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'medication_not_given',
            category: 'clinical',
            severity: 'warning',
            title: `Medication NOT given — ${event.payload.status || ''} (${event.payload.medicationName || ''})`.trim(),
            title_ar: `لم يُعطَ الدواء — ${event.payload.status || ''} (${event.payload.medicationName || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Medication-not-given timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Core → Timeline: Beneficiary status changed (W982) ───────────
  subscribers.push({
    name: 'core:status_changed → timeline:record',
    pattern: 'core.beneficiary.status_changed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const ns = event.payload.newStatus;
          // deceased = critical; transferred/inactive = warning; graduated = success
          const severity =
            ns === 'deceased'
              ? 'critical'
              : ns === 'transferred' || ns === 'inactive'
                ? 'warning'
                : ns === 'graduated'
                  ? 'success'
                  : 'info';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'status_changed',
            category: 'administrative',
            severity,
            title: `Status: ${event.payload.oldStatus || ''} → ${event.payload.newStatus || ''}`.trim(),
            title_ar: `تغيّر الحالة: ${event.payload.oldStatus || ''} ← ${event.payload.newStatus || ''}`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Status-changed timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Complaints → Timeline: Filed about a beneficiary (W984) ──────
  subscribers.push({
    name: 'complaints:filed → timeline:record',
    pattern: 'complaints.complaint.filed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const grievance = event.payload.type === 'grievance';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'complaint_filed',
            category: 'communication',
            severity: grievance ? 'warning' : 'info',
            title: `${grievance ? 'Grievance' : 'Complaint'} filed (${event.payload.category || ''})`.trim(),
            title_ar: `${grievance ? 'تظلّم' : 'شكوى'} (${event.payload.category || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Complaint-filed timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Family → Timeline: Visit completed (W985, engagement) ────────
  subscribers.push({
    name: 'family:visit_completed → timeline:record',
    pattern: 'family.visit.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'family_meeting',
            category: 'family',
            severity: 'success',
            title: `Family visit completed (${event.payload.relationship || ''})`.trim(),
            title_ar: `زيارة أسرية مكتملة (${event.payload.relationship || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Family-visit-completed timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Family → Timeline: Visit no-show (W985, disengagement) ───────
  subscribers.push({
    name: 'family:visit_no_show → timeline:record',
    pattern: 'family.visit.no_show',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'family_meeting',
            category: 'family',
            severity: 'warning',
            title: `Family visit no-show (${event.payload.relationship || ''})`.trim(),
            title_ar: `تغيّب الأسرة عن زيارة (${event.payload.relationship || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Family-visit-no-show timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Lifecycle → Timeline: transition plan completed (W986) ───────
  subscribers.push({
    name: 'lifecycle:transition_completed → timeline:record',
    pattern: 'lifecycle.transition.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'care_transition',
            category: 'clinical',
            severity: 'success',
            title: `Transition plan completed (${event.payload.transitionType || ''})`.trim(),
            title_ar: `اكتملت خطة الانتقال (${event.payload.transitionType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Transition-completed timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Lifecycle → Timeline: transition plan cancelled (W986) ───────
  subscribers.push({
    name: 'lifecycle:transition_cancelled → timeline:record',
    pattern: 'lifecycle.transition.cancelled',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'care_transition',
            category: 'clinical',
            severity: 'warning',
            title: `Transition plan cancelled (${event.payload.transitionType || ''})`.trim(),
            title_ar: `أُلغيت خطة الانتقال (${event.payload.transitionType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Transition-cancelled timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Follow-up → Timeline: post-rehab case completed (W987) ───────
  subscribers.push({
    name: 'followup:case_completed → timeline:record',
    pattern: 'followup.case.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'followup_completed',
            category: 'clinical',
            severity: 'success',
            title: `Post-rehab follow-up completed (${event.payload.caseNumber || ''})`.trim(),
            title_ar: `اكتملت متابعة ما بعد التأهيل (${event.payload.caseNumber || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Followup-completed timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Follow-up → Timeline: lost to follow-up (W987, disengagement) ─
  subscribers.push({
    name: 'followup:case_lost → timeline:record',
    pattern: 'followup.case.lost',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'followup_lost',
            category: 'clinical',
            severity: 'warning',
            title: `Lost to post-rehab follow-up (${event.payload.caseNumber || ''})`.trim(),
            title_ar: `فقدان متابعة ما بعد التأهيل (${event.payload.caseNumber || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Followup-lost timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Follow-up → Timeline: visit attended (W992, engagement) ──────
  subscribers.push({
    name: 'followup:visit_attended → timeline:record',
    pattern: 'followup.visit.attended',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'followup_visit',
            category: 'clinical',
            severity: 'success',
            title: `Follow-up visit attended (${event.payload.visitType || ''})`.trim(),
            title_ar: `حضور زيارة متابعة (${event.payload.visitType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Followup-visit-attended timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Follow-up → Timeline: visit missed (W992, disengagement) ─────
  subscribers.push({
    name: 'followup:visit_missed → timeline:record',
    pattern: 'followup.visit.missed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'followup_visit',
            category: 'clinical',
            severity: 'warning',
            title: `Follow-up visit missed (${event.payload.visitType || ''})`.trim(),
            title_ar: `تغيّب عن زيارة متابعة (${event.payload.visitType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Followup-visit-missed timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Insurance → Timeline: claim approved (W994, care funded) ─────
  subscribers.push({
    name: 'insurance:claim_approved → timeline:record',
    pattern: 'insurance.claim.approved',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'insurance_claim',
            category: 'administrative',
            severity: 'success',
            title: `Insurance claim approved (${event.payload.claimNumber || ''})`.trim(),
            title_ar: `اعتماد مطالبة تأمينية (${event.payload.claimNumber || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Insurance-claim-approved timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Insurance → Timeline: claim rejected (W994, funding denied) ──
  subscribers.push({
    name: 'insurance:claim_rejected → timeline:record',
    pattern: 'insurance.claim.rejected',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'insurance_claim',
            category: 'administrative',
            severity: 'warning',
            title: `Insurance claim rejected (${event.payload.claimNumber || ''})`.trim(),
            title_ar: `رفض مطالبة تأمينية (${event.payload.claimNumber || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Insurance-claim-rejected timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Referral → Timeline: accepted (W997, shared across 4 subsystems) ─
  subscribers.push({
    name: 'referral:accepted → timeline:record',
    pattern: 'referral.referral.accepted',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'referral',
            category: 'clinical',
            severity: 'info',
            title: `Referral accepted (${event.payload.referralType || ''})`.trim(),
            title_ar: `قبول إحالة (${event.payload.referralType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Referral-accepted timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Referral → Timeline: completed (W997) ────────────────────────
  subscribers.push({
    name: 'referral:completed → timeline:record',
    pattern: 'referral.referral.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'referral',
            category: 'clinical',
            severity: 'success',
            title: `Referral completed (${event.payload.referralType || ''})`.trim(),
            title_ar: `اكتمال إحالة (${event.payload.referralType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Referral-completed timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Referral → Timeline: rejected/declined (W997, warning) ───────
  subscribers.push({
    name: 'referral:rejected → timeline:record',
    pattern: 'referral.referral.rejected',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'referral',
            category: 'clinical',
            severity: 'warning',
            title: `Referral rejected (${event.payload.referralType || ''})`.trim(),
            title_ar: `رفض إحالة (${event.payload.referralType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Referral-rejected timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Consent → Timeline: obtained (W1002, PDPL/CRPD) ───────────────
  subscribers.push({
    name: 'consent:obtained → timeline:record',
    pattern: 'consent.consent.obtained',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'consent_obtained',
            category: 'administrative',
            severity: 'success',
            title: `Consent obtained (${event.payload.consentType || ''})`.trim(),
            title_ar: `منح موافقة (${event.payload.consentType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Consent-obtained timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Consent → Timeline: revoked (W1002, withdrawal — warning) ─────
  subscribers.push({
    name: 'consent:revoked → timeline:record',
    pattern: 'consent.consent.revoked',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'consent_revoked',
            category: 'administrative',
            severity: 'warning',
            title: `Consent revoked (${event.payload.consentType || ''})`.trim(),
            title_ar: `سحب موافقة (${event.payload.consentType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Consent-revoked timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Home program → Timeline: assigned (W1003) ────────────────────
  subscribers.push({
    name: 'home_program:assigned → timeline:record',
    pattern: 'home_program.home_program.assigned',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'home_program_assigned',
            category: 'clinical',
            severity: 'info',
            title: `Home program assigned (${event.payload.title || event.payload.programType || ''})`.trim(),
            title_ar: `إسناد برنامج منزلي (${event.payload.title || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Home-program-assigned timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Home program → Timeline: completed (W1003) ───────────────────
  subscribers.push({
    name: 'home_program:completed → timeline:record',
    pattern: 'home_program.home_program.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'home_program_completed',
            category: 'clinical',
            severity: 'success',
            title: `Home program completed (${event.payload.title || event.payload.programType || ''})`.trim(),
            title_ar: `اكتمال برنامج منزلي (${event.payload.title || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Home-program-completed timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Crisis → Timeline: reported (W1004, acute crisis) ────────────
  subscribers.push({
    name: 'crisis:reported → timeline:record',
    pattern: 'crisis.crisis.reported',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'crisis_reported',
            category: 'clinical',
            severity: 'warning',
            title: `Crisis reported (${event.payload.crisisType || ''}, ${event.payload.crisisSeverity || ''})`.trim(),
            title_ar: `الإبلاغ عن أزمة (${event.payload.crisisType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Crisis-reported timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Crisis → Timeline: resolved (W1004) ──────────────────────────
  subscribers.push({
    name: 'crisis:resolved → timeline:record',
    pattern: 'crisis.crisis.resolved',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'crisis_resolved',
            category: 'clinical',
            severity: 'success',
            title: `Crisis resolved (${event.payload.crisisType || ''})`.trim(),
            title_ar: `حل أزمة (${event.payload.crisisType || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Crisis-resolved timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Care-team → Timeline: member added (W1005) ───────────────────
  subscribers.push({
    name: 'careteam:member_added → timeline:record',
    pattern: 'careteam.careteam.member_added',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'team_member_added',
            category: 'clinical',
            severity: 'info',
            title: 'Care-team member added',
            title_ar: 'إضافة عضو لفريق الرعاية',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Careteam-member-added timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Care-team → Timeline: member removed (W1005) ─────────────────
  subscribers.push({
    name: 'careteam:member_removed → timeline:record',
    pattern: 'careteam.careteam.member_removed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'team_member_removed',
            category: 'clinical',
            severity: 'info',
            title: 'Care-team member removed',
            title_ar: 'إزالة عضو من فريق الرعاية',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Careteam-member-removed timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Care-team → Timeline: lead changed (W1005) ───────────────────
  subscribers.push({
    name: 'careteam:lead_changed → timeline:record',
    pattern: 'careteam.careteam.lead_changed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            episodeId: event.payload.episodeId,
            eventType: 'lead_changed',
            category: 'clinical',
            severity: 'info',
            title: 'Lead therapist changed',
            title_ar: 'تغيير المعالج الرئيسي',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Careteam-lead-changed timeline failed: ${err.message}`);
      }
    },
  });

  // ═══ Clinical-safety modules → Timeline (W1046 unified-core linkage) ═══
  // Producers: native post-save hooks on the W1010-W1042 models. Severity is
  // computed intelligently (serious pressure stages / outbreaks escalate to
  // error) so the unified timeline reflects real clinical risk.

  subscribers.push({
    name: 'falls-risk:finalized → timeline:record',
    pattern: 'clinical-safety.falls.assessment_finalized',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        const high = event.payload.riskLevel === 'high';
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'falls_risk_assessed',
          category: 'clinical',
          severity: high ? 'warning' : 'info',
          title: `Falls-risk assessment finalized (${event.payload.riskLevel || ''})`.trim(),
          title_ar: `اعتماد تقييم خطر السقوط (${event.payload.riskLevel || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] falls-risk timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'pressure-injury:identified → timeline:record',
    pattern: 'clinical-safety.pressure_injury.identified',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        const serious =
          ['stage_3', 'stage_4', 'unstageable', 'deep_tissue_injury'].includes(event.payload.stage) ||
          event.payload.origin === 'facility_acquired';
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'pressure_injury',
          category: 'clinical',
          severity: serious ? 'error' : 'warning',
          title: `Pressure injury identified (${event.payload.stage || ''} @ ${event.payload.bodySite || ''})`.trim(),
          title_ar: `رصد إصابة ضغط (${event.payload.stage || ''} @ ${event.payload.bodySite || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] pressure-injury timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'pressure-injury:resolved → timeline:record',
    pattern: 'clinical-safety.pressure_injury.resolved',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'pressure_injury_resolved',
          category: 'clinical',
          severity: 'success',
          title: `Pressure injury resolved (${event.payload.bodySite || ''})`.trim(),
          title_ar: `التئام إصابة الضغط (${event.payload.bodySite || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] pressure-injury-resolved timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'sleep:finalized → timeline:record',
    pattern: 'clinical-safety.sleep.assessment_finalized',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'sleep_assessment',
          category: 'clinical',
          severity: event.payload.problemSeverity === 'severe' ? 'warning' : 'info',
          title: `Sleep assessment finalized (${event.payload.problemSeverity || ''})`.trim(),
          title_ar: `اعتماد تقييم النوم (${event.payload.problemSeverity || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] sleep timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'om:finalized → timeline:record',
    pattern: 'clinical-safety.om.assessment_finalized',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'mobility_assessment',
          category: 'clinical',
          severity: event.payload.independenceLevel === 'dependent' ? 'warning' : 'info',
          title: `O&M assessment finalized (${event.payload.independenceLevel || ''})`.trim(),
          title_ar: `اعتماد تقييم التوجّه والحركة (${event.payload.independenceLevel || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] om timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'driving:finalized → timeline:record',
    pattern: 'clinical-safety.driving.assessment_finalized',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'driving_assessment',
          category: 'clinical',
          severity: event.payload.recommendation === 'not_fit_currently' ? 'warning' : 'info',
          title: `Driving-rehab assessment finalized (${event.payload.recommendation || ''})`.trim(),
          title_ar: `اعتماد تقييم تأهيل القيادة (${event.payload.recommendation || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] driving timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'medication-reconciliation:reconciled → timeline:record',
    pattern: 'clinical-safety.medication.reconciled',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        const unresolved = Number(event.payload.unresolvedDiscrepancyCount) || 0;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'medication_reconciliation',
          category: 'clinical',
          severity: unresolved > 0 ? 'warning' : 'success',
          title: `Medication reconciliation completed (${event.payload.reconciliationType || ''})`.trim(),
          title_ar: `إتمام مطابقة الأدوية (${event.payload.reconciliationType || ''})`.trim(),
          description: unresolved > 0 ? `${unresolved} unresolved discrepancy(ies)` : 'no unresolved discrepancies',
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] med-rec timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'infection:case_opened → timeline:record',
    pattern: 'clinical-safety.infection.case_opened',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        const p = event.payload;
        let severity = 'info';
        if (p.caseStatus === 'confirmed') severity = 'warning';
        if (p.isolationRequired || p.excludedFromCenter || p.outbreakId) severity = 'error';
        await CareTimeline.create({
          beneficiaryId: p.beneficiaryId,
          eventType: 'infection_case',
          category: 'clinical',
          severity,
          title: `Infection case opened (${p.category || ''}${p.pathogen ? ': ' + p.pathogen : ''})`.trim(),
          title_ar: `فتح حالة عدوى (${p.category || ''}${p.pathogen ? ': ' + p.pathogen : ''})`.trim(),
          metadata: p,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] infection-open timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'infection:case_resolved → timeline:record',
    pattern: 'clinical-safety.infection.case_resolved',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'infection_resolved',
          category: 'clinical',
          severity: 'success',
          title: `Infection case resolved (${event.payload.pathogen || event.payload.category || ''})`.trim(),
          title_ar: `حلّ حالة العدوى (${event.payload.pathogen || event.payload.category || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] infection-resolved timeline failed: ${err.message}`);
      }
    },
  });

  // ═══ Clinical-assessment trio → Timeline (W1047 — W670-W673 islands) ═══
  subscribers.push({
    name: 'dysphagia:finalized → timeline:record',
    pattern: 'clinical-assessment.dysphagia.assessment_finalized',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'dysphagia_assessment',
          category: 'clinical',
          severity: event.payload.aspirationRisk === 'high' ? 'warning' : 'info',
          title: `Dysphagia assessment finalized (aspiration risk: ${event.payload.aspirationRisk || ''})`.trim(),
          title_ar: `اعتماد تقييم البلع (خطر الشفط: ${event.payload.aspirationRisk || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] dysphagia timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'pain:finalized → timeline:record',
    pattern: 'clinical-assessment.pain.assessment_finalized',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'pain_assessment',
          category: 'clinical',
          severity: event.payload.painPresent ? 'warning' : 'info',
          title: `Pain assessment finalized (${event.payload.scale || ''}: ${event.payload.score ?? ''})`.trim(),
          title_ar: `اعتماد تقييم الألم (${event.payload.scale || ''}: ${event.payload.score ?? ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] pain timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'physiotherapy:finalized → timeline:record',
    pattern: 'clinical-assessment.physiotherapy.assessment_finalized',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'physiotherapy_assessment',
          category: 'clinical',
          severity: 'info',
          title: `Physiotherapy assessment finalized (${event.payload.assessmentType || ''})`.trim(),
          title_ar: `اعتماد تقييم العلاج الطبيعي (${event.payload.assessmentType || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] physiotherapy timeline failed: ${err.message}`);
      }
    },
  });

  // ═══ Deferred islands → Timeline (W1075 — 8 per-beneficiary lifecycle models) ═══
  subscribers.push({
    name: 'icf:approved → timeline:record',
    pattern: 'clinical-assessment.icf.assessment_approved',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'icf_assessment',
          category: 'clinical',
          severity: 'info',
          title: `ICF functioning profile approved (${event.payload.icfVersion || ''})`.trim(),
          title_ar: `اعتماد ملف التصنيف الدولي للأداء الوظيفي (${event.payload.icfVersion || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] icf timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'treatment-authorization:decided → timeline:record',
    pattern: 'authorization.treatment.authorization_decided',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'treatment_authorization',
          category: 'administrative',
          severity: event.payload.decision === 'denied' ? 'warning' : 'success',
          title: `Treatment authorization ${event.payload.decision || ''}`.trim(),
          title_ar: `قرار اعتماد العلاج: ${event.payload.decision || ''}`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] treatment-authorization timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'clinical-pathway:completed → timeline:record',
    pattern: 'care-pathway.clinical-pathway.completed',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'clinical_pathway_completed',
          category: 'clinical',
          severity: 'success',
          title: `Clinical pathway completed (${event.payload.pathwayType || ''})`.trim(),
          title_ar: `إتمام المسار العلاجي (${event.payload.pathwayType || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] clinical-pathway timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'mdt:completed → timeline:record',
    pattern: 'care-coordination.mdt.meeting_completed',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'mdt_meeting',
          category: 'clinical',
          severity: 'info',
          title: `MDT meeting completed (${event.payload.purpose || ''})`.trim(),
          title_ar: `إتمام اجتماع الفريق متعدد التخصصات (${event.payload.purpose || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] mdt timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'swallow-study:completed → timeline:record',
    pattern: 'clinical-assessment.swallow-study.completed',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'swallow_study',
          category: 'clinical',
          severity: event.payload.aspirationDetected ? 'warning' : 'info',
          title: `Instrumental swallow study completed (${event.payload.studyType || ''})`.trim(),
          title_ar: `إتمام دراسة البلع الآلية (${event.payload.studyType || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] swallow-study timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'emergency-plan:activated → timeline:record',
    pattern: 'safety.emergency-plan.activated',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        const conds = Array.isArray(event.payload.conditionTypes) ? event.payload.conditionTypes.join(', ') : '';
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'emergency_plan_activated',
          category: 'clinical',
          severity: 'warning',
          title: `Emergency plan activated${conds ? ` (${conds})` : ''}`,
          title_ar: `تفعيل خطة الطوارئ${conds ? ` (${conds})` : ''}`,
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] emergency-plan timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'consultation:answered → timeline:record',
    pattern: 'care-coordination.consultation.answered',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'consultation',
          category: 'clinical',
          severity: 'info',
          title: `Therapist consultation ${event.payload.status || 'answered'} (${event.payload.topic || ''})`.trim(),
          title_ar: `استشارة بين المعالجين (${event.payload.topic || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] consultation timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'cdss-alert:resolved → timeline:record',
    pattern: 'cdss.alert.resolved',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'cdss_alert_resolved',
          category: 'clinical',
          severity: 'info',
          title: `CDSS alert resolved (${event.payload.alertType || ''})`.trim(),
          title_ar: `حل تنبيه دعم القرار السريري (${event.payload.alertType || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] cdss-alert timeline failed: ${err.message}`);
      }
    },
  });

  // ═══ Residual islands → Timeline (W1120 — 6 assessment/plan/CRPD lifecycle models) ═══
  subscribers.push({
    name: 'adl:completed → timeline:record',
    pattern: 'clinical-assessment.adl.assessment_completed',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'adl_assessment',
          category: 'clinical',
          severity: 'info',
          title: `ADL assessment completed (${event.payload.assessmentType || ''})`.trim(),
          title_ar: `إتمام تقييم الأنشطة اليومية (${event.payload.assessmentType || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] adl timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'integration-assessment:completed → timeline:record',
    pattern: 'clinical-assessment.integration.assessment_completed',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'integration_assessment',
          category: 'clinical',
          severity: 'info',
          title: `Sensory-integration assessment completed (${event.payload.assessmentType || ''})`.trim(),
          title_ar: `إتمام تقييم التكامل الحسّي (${event.payload.assessmentType || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] integration-assessment timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'self-advocacy:completed → timeline:record',
    pattern: 'self-advocacy.plan.completed',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'self_advocacy_completed',
          category: 'clinical',
          severity: 'success',
          title: 'Self-advocacy training plan completed',
          title_ar: 'إتمام خطة تدريب المناصرة الذاتية',
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] self-advocacy timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'decision-rights:finalized → timeline:record',
    pattern: 'decision-rights.assessment.finalized',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'decision_rights_assessment',
          category: 'clinical',
          severity: 'info',
          title: `Decision-rights capacity assessment finalized (${event.payload.decisionType || ''})`.trim(),
          title_ar: `اعتماد تقييم القدرة على اتخاذ القرار (${event.payload.decisionType || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] decision-rights timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'independent-living:completed → timeline:record',
    pattern: 'independent-living.plan.completed',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'independent_living_completed',
          category: 'clinical',
          severity: 'success',
          title: 'Independent-living plan completed',
          title_ar: 'إتمام خطة الحياة المستقلة',
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] independent-living timeline failed: ${err.message}`);
      }
    },
  });

  subscribers.push({
    name: 'caregiver-support:completed → timeline:record',
    pattern: 'caregiver-support.program.completed',
    handler: async event => {
      try {
        const CareTimeline = require('mongoose').models.CareTimeline;
        if (!CareTimeline || !event.payload.beneficiaryId) return;
        await CareTimeline.create({
          beneficiaryId: event.payload.beneficiaryId,
          eventType: 'caregiver_support_completed',
          category: 'family',
          severity: 'success',
          title: `Caregiver support program completed (${event.payload.programType || ''})`.trim(),
          title_ar: `إتمام برنامج دعم مقدّم الرعاية (${event.payload.programType || ''})`.trim(),
          metadata: event.payload,
        });
      } catch (err) {
        logger.error(`[DDD-CrossModule] caregiver-support timeline failed: ${err.message}`);
      }
    },
  });

  // ── Register all subscribers ───────────────────────────────────────
  let registered = 0;
  for (const sub of subscribers) {
    try {
      integrationBus.subscribe(sub.pattern, sub.handler);
      registered++;
    } catch {
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

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

  // ─── Safety → Timeline: Seizure recorded (W992) ───────────────────
  // A seizure is a clinical safety event; a status-epilepticus candidate
  // (≥ 5 min) is escalated to critical so the director dashboard surfaces it.
  subscribers.push({
    name: 'safety:seizure_recorded → timeline:record',
    pattern: 'safety.seizure.recorded',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const sev = event.payload.statusEpilepticus
            ? 'critical'
            : event.payload.severity === 'severe'
              ? 'error'
              : 'warning';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            branchId: event.payload.branchId || undefined,
            eventType: 'seizure_event',
            category: 'clinical',
            severity: sev,
            title: `Seizure recorded (${event.payload.severity || ''})`.trim(),
            title_ar: `نوبة صرعية (${event.payload.severity || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Seizure timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Safety → Timeline: Safeguarding concern raised (W992) ────────
  // Child/vulnerable-adult protection concern — always high visibility;
  // critical/high severities escalate the timeline entry accordingly.
  subscribers.push({
    name: 'safety:safeguarding_raised → timeline:record',
    pattern: 'safety.safeguarding.concern_raised',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const sev =
            event.payload.severity === 'critical'
              ? 'critical'
              : event.payload.severity === 'high'
                ? 'error'
                : 'warning';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            branchId: event.payload.branchId || undefined,
            eventType: 'safeguarding_concern',
            category: 'clinical',
            severity: sev,
            title: `Safeguarding concern (${event.payload.category || ''})`.trim(),
            title_ar: `بلاغ حماية (${event.payload.category || ''})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Safeguarding timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Safety → Timeline: Safeguarding concern closed (W1027) ───────
  // Terminal resolution of a child/vulnerable-adult protection concern
  // (outcomeSummary + closedBy + closedAt). Records the closure milestone
  // on the subject beneficiary's longitudinal record.
  subscribers.push({
    name: 'safety:safeguarding_closed → timeline:record',
    pattern: 'safety.safeguarding.concern_closed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const out = event.payload.outcome ? ` — ${event.payload.outcome}` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            branchId: event.payload.branchId || undefined,
            eventType: 'safeguarding_concern_closed',
            category: 'clinical',
            severity: 'success',
            title: `Safeguarding concern closed${out}`,
            title_ar: 'تم إغلاق بلاغ الحماية',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Safeguarding closure timeline failed: ${err.message}`);
      }
    },
  });

  // ─── Safety → Timeline: Restraint/seclusion applied (W992) ────────
  // Staff-applied, high-scrutiny intervention (CBAHI/MOHRSD mandated review) —
  // recorded as a warning-level clinical event on the beneficiary timeline.
  subscribers.push({
    name: 'safety:restraint_applied → timeline:record',
    pattern: 'safety.restraint.applied',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            branchId: event.payload.branchId || undefined,
            eventType: 'restraint_seclusion',
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

  // ── Screening completed → unified-core timeline (W993) ─────────────
  // A finalized vision/hearing screening is a clinical milestone. Outcome
  // 'refer' (sensory loss suspected → onward referral) lands as a warning so
  // it stands out; 'pass'/'monitor' land as informational. One subscriber
  // serves both modalities — screeningType in the payload distinguishes them.
  subscribers.push({
    name: 'screenings:screening_completed → timeline:record',
    pattern: 'screenings.screening.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const type = event.payload.screeningType || 'sensory';
          const outcome = event.payload.outcome || '';
          const typeAr = type === 'vision' ? 'النظر' : type === 'hearing' ? 'السمع' : 'حسي';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            branchId: event.payload.branchId || undefined,
            eventType: 'screening_completed',
            category: 'clinical',
            severity: outcome === 'refer' ? 'warning' : 'info',
            title: `${type} screening completed (${outcome})`.trim(),
            title_ar: `اكتمل مسح ${typeAr} (${outcome})`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Screening timeline failed: ${err.message}`);
      }
    },
  });

  // ── Medication dose outcome → unified-core timeline (W994) ─────────
  // A recorded MAR dose lands on the beneficiary timeline. A refused or missed
  // dose is clinically significant (a missed anti-epileptic can precede a
  // seizure) → warning; administered/held are informational. One subscriber
  // serves every terminal outcome — the `status` payload field carries detail.
  subscribers.push({
    name: 'medications:dose_recorded → timeline:record',
    pattern: 'medications.medication.dose_recorded',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const status = event.payload.status || '';
          const med = event.payload.medicationName || 'medication';
          const elevated = status === 'refused' || status === 'missed';
          const statusAr =
            status === 'administered'
              ? 'تم إعطاؤها'
              : status === 'refused'
                ? 'مرفوضة'
                : status === 'missed'
                  ? 'فائتة'
                  : status === 'held'
                    ? 'مؤجلة'
                    : status;
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            branchId: event.payload.branchId || undefined,
            eventType: 'medication_dose_recorded',
            category: 'clinical',
            severity: elevated ? 'warning' : 'info',
            title: `Medication dose ${status}: ${med}`.trim(),
            title_ar: `جرعة دواء ${statusAr}: ${med}`.trim(),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Medication timeline failed: ${err.message}`);
      }
    },
  });

  // ── Discharge plan completion → unified-core timeline (W995) ───────
  // Completing a discharge plan is a terminal milestone of the episode of care.
  // It lands on the beneficiary timeline as a clinical success so the full
  // journey reads end-to-end.
  subscribers.push({
    name: 'discharge:completed → timeline:record',
    pattern: 'discharge.discharge.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const dtype = event.payload.dischargeType || '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            branchId: event.payload.branchId || undefined,
            eventType: 'discharge_completed',
            category: 'clinical',
            severity: 'success',
            title: `Discharge completed${dtype ? ` (${dtype})` : ''}`,
            title_ar: 'تم إنهاء الخدمة (خطة الخروج)',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Discharge timeline failed: ${err.message}`);
      }
    },
  });

  // ── Waitlist enrollment (admission) → unified-core timeline (W996) ─
  // Enrolling a waitlist applicant opens the beneficiary's episode of care.
  // It lands at the head of the beneficiary timeline as an administrative
  // success milestone.
  subscribers.push({
    name: 'admissions:enrolled → timeline:record',
    pattern: 'admissions.admission.enrolled',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const name = event.payload.applicantName || '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            branchId: event.payload.branchId || undefined,
            eventType: 'admission_enrolled',
            category: 'administrative',
            severity: 'success',
            title: `Admission — enrolled from waitlist${name ? `: ${name}` : ''}`,
            title_ar: 'تم القبول والتسجيل من قائمة الانتظار',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Admission timeline failed: ${err.message}`);
      }
    },
  });

  // ── Referral conversion (loop closed) → unified-core timeline (W997) ─
  // A referral for a known beneficiary that reaches 'converted' means the
  // referral resulted in the beneficiary entering/continuing care. It lands as
  // an administrative success milestone, preserving the referral attribution.
  subscribers.push({
    name: 'referrals:converted → timeline:record',
    pattern: 'referrals.referral.converted',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const dir = event.payload.direction ? ` (${event.payload.direction})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            branchId: event.payload.branchId || undefined,
            eventType: 'referral_converted',
            category: 'administrative',
            severity: 'success',
            title: `Referral converted to enrollment${dir}`,
            title_ar: 'تم تحويل الإحالة إلى التحاق فعلي',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Referral timeline failed: ${err.message}`);
      }
    },
  });

  // ── Medical referral completion → unified-core timeline (W1001) ────
  // A beneficiary's medical referral reaching 'completed' (consultation /
  // treatment loop closed) is a clinical milestone on the longitudinal record.
  subscribers.push({
    name: 'medical-referrals:completed → timeline:record',
    pattern: 'medical-referrals.medical_referral.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const spec = event.payload.specialty ? `: ${event.payload.specialty}` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            branchId: event.payload.branchId || undefined,
            eventType: 'medical_referral_completed',
            category: 'clinical',
            severity: 'success',
            title: `Medical referral completed${spec}`,
            title_ar: 'اكتملت الإحالة الطبية',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Medical referral timeline failed: ${err.message}`);
      }
    },
  });

  // ── Measurement result approved → unified-core timeline (W1022) ─────
  // A standardized measurement/assessment result reaching APPROVED is a
  // clinical milestone on the beneficiary's longitudinal record.
  subscribers.push({
    name: 'measurements:approved → timeline:record',
    pattern: 'measurements.measurement.result_approved',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const lvl = event.payload.overallLevel ? ` — ${event.payload.overallLevel}` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'measurement_result_approved',
            category: 'clinical',
            severity: 'success',
            title: `Measurement result approved${lvl}`,
            title_ar: 'تم اعتماد نتيجة القياس',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Measurement timeline failed: ${err.message}`);
      }
    },
  });

  // ── Insurance claim paid → unified-core timeline (W1000) ───────────
  // A beneficiary's insurance claim reaching 'paid' closes the reimbursement
  // loop — a financial milestone on the longitudinal record.
  subscribers.push({
    name: 'insurance-claims:paid → timeline:record',
    pattern: 'insurance-claims.insurance_claim.paid',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const num = event.payload.claimNumber ? ` (${event.payload.claimNumber})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'insurance_claim_paid',
            category: 'administrative',
            severity: 'success',
            title: `Insurance claim paid${num}`,
            title_ar: 'تم سداد مطالبة التأمين',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Insurance claim timeline failed: ${err.message}`);
      }
    },
  });

  // ── Invoice paid → unified-core timeline (W1023) ───────────────────
  // A beneficiary's invoice reaching 'PAID' closes the billing loop — a
  // financial milestone on the longitudinal record.
  subscribers.push({
    name: 'invoices:paid → timeline:record',
    pattern: 'invoices.invoice.paid',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const num = event.payload.invoiceNumber ? ` (${event.payload.invoiceNumber})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'invoice_paid',
            category: 'administrative',
            severity: 'success',
            title: `Invoice paid${num}`,
            title_ar: 'تم سداد الفاتورة',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Invoice timeline failed: ${err.message}`);
      }
    },
  });

  // ── Teleconsultation completed → unified-core timeline (W1024) ─────
  // A beneficiary's tele-rehab consultation reaching 'completed' is a clinical
  // milestone (remote session) on the longitudinal record.
  subscribers.push({
    name: 'teleconsultations:completed → timeline:record',
    pattern: 'teleconsultations.teleconsultation.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const num = event.payload.consultationNumber
            ? ` (${event.payload.consultationNumber})`
            : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'teleconsultation_completed',
            category: 'clinical',
            severity: 'success',
            title: `Tele-rehab consultation completed${num}`,
            title_ar: 'اكتملت جلسة التأهيل عن بُعد',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Teleconsultation timeline failed: ${err.message}`);
      }
    },
  });

  // ── Home visit completed → unified-core timeline (W1025) ───────────
  // A social/family home visit reaching 'completed' is a family-engagement
  // milestone on the beneficiary's longitudinal record.
  subscribers.push({
    name: 'home-visits:completed → timeline:record',
    pattern: 'home-visits.home_visit.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const num = event.payload.visitNumber ? ` (${event.payload.visitNumber})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'home_visit_completed',
            category: 'family',
            severity: 'info',
            title: `Home visit completed${num}`,
            title_ar: 'اكتملت الزيارة المنزلية',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Home visit timeline failed: ${err.message}`);
      }
    },
  });

  // ── Family counselling completed → unified-core timeline (W1026) ───
  // A family counselling encounter reaching 'completed' is a family-wellbeing
  // milestone on the beneficiary's longitudinal record.
  subscribers.push({
    name: 'family-counselling:completed → timeline:record',
    pattern: 'family-counselling.family_counselling.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const sType = event.payload.sessionType ? ` (${event.payload.sessionType})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'family_counselling_completed',
            category: 'family',
            severity: 'success',
            title: `Family counselling session completed${sType}`,
            title_ar: 'اكتملت جلسة الإرشاد الأسري',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Family counselling timeline failed: ${err.message}`);
      }
    },
  });

  // ── Assistive device returned → unified-core timeline (W1028) ──────
  // A loaned assistive device reaching 'returned' closes that loan on the
  // beneficiary's longitudinal record (equipment-handover milestone).
  subscribers.push({
    name: 'assistive-devices:returned → timeline:record',
    pattern: 'assistive-devices.assistive_device.returned',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const tag = event.payload.assetTag ? ` (${event.payload.assetTag})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            eventType: 'assistive_device_returned',
            category: 'administrative',
            severity: 'success',
            title: `Assistive device returned${tag}`,
            title_ar: 'تم إرجاع جهاز مساعد',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Assistive device timeline failed: ${err.message}`);
      }
    },
  });

  // ── Respite booking completed → unified-core timeline (W1029) ────
  // A respite stay reaching 'completed' (checked out) is a caregiver-relief
  // milestone on the beneficiary's longitudinal record.
  subscribers.push({
    name: 'respite:completed → timeline:record',
    pattern: 'respite.respite.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const bType = event.payload.bookingType ? ` (${event.payload.bookingType})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            eventType: 'respite_completed',
            category: 'family',
            severity: 'success',
            title: `Respite booking completed${bType}`,
            title_ar: 'اكتملت الرعاية المؤقتة',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Respite timeline failed: ${err.message}`);
      }
    },
  });

  // ── Transition plan completed → unified-core timeline (W1030) ────
  // A transition plan reaching 'completed' (life-stage milestone reached,
  // e.g. school→work, rehab→community) is a significant longitudinal event.
  subscribers.push({
    name: 'transition:completed → timeline:record',
    pattern: 'transition.transition.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const tType = event.payload.transitionType ? ` (${event.payload.transitionType})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            eventType: 'transition_completed',
            category: 'clinical',
            severity: 'success',
            title: `Transition plan completed${tType}`,
            title_ar: 'اكتملت خطة الانتقال',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Transition timeline failed: ${err.message}`);
      }
    },
  });

  // ── Diet prescription activated → unified-core timeline (W1031) ────
  // A diet prescription reaching 'active' (IDDSI / NPO / enteral plan now in
  // effect) is a clinical nutrition milestone on the beneficiary's record.
  subscribers.push({
    name: 'diet-prescription:activated → timeline:record',
    pattern: 'diet-prescription.diet_prescription.activated',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const mode = event.payload.npo
            ? ' (NPO)'
            : event.payload.foodIddsiLevel != null
              ? ` (IDDSI ${event.payload.foodIddsiLevel})`
              : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            eventType: 'diet_prescription_activated',
            category: 'clinical',
            severity: 'info',
            title: `Diet prescription activated${mode}`,
            title_ar: 'تم تفعيل وصفة التغذية',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Diet prescription timeline failed: ${err.message}`);
      }
    },
  });

  // ── Behavior plan completed → unified-core timeline (W1032) ────────
  // A behavior management plan (BIP) reaching 'completed' (target behaviors
  // resolved / intervention cycle finished) is a clinical milestone on the
  // beneficiary's longitudinal record.
  subscribers.push({
    name: 'behavior:plan_completed → timeline:record',
    pattern: 'behavior.behavior.plan_completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const titleSuffix = event.payload.title ? `: ${event.payload.title}` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            eventType: 'behavior_plan_completed',
            category: 'clinical',
            severity: 'success',
            title: `Behavior plan completed${titleSuffix}`,
            title_ar: 'اكتملت خطة إدارة السلوك',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Behavior plan timeline failed: ${err.message}`);
      }
    },
  });

  // ── AAC communication aid profile activated → unified-core timeline (W1042) ──
  // A CommunicationAidProfile reaching lifecycleStatus 'active' (the beneficiary
  // now has an active augmentative/alternative communication aid in place) is a
  // clinical milestone on the longitudinal record.
  subscribers.push({
    name: 'communication-aid:activated → timeline:record',
    pattern: 'communication-aid.communication_aid.activated',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const modality = event.payload.primaryModality
            ? ` (${event.payload.primaryModality})`
            : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            eventType: 'communication_aid_activated',
            category: 'clinical',
            severity: 'success',
            title: `Communication aid profile activated${modality}`,
            title_ar: 'تم تفعيل ملف وسيلة التواصل المعزز',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Communication aid timeline failed: ${err.message}`);
      }
    },
  });

  // ── AI-generated report sent → unified-core timeline (W1043) ──────────
  // When an AiGeneratedReport reaches status 'sent' (the family receives the
  // AI-generated progress / discharge / regulatory report), record it as a
  // communication milestone on the beneficiary's longitudinal record.
  subscribers.push({
    name: 'ai-report:sent → timeline:record',
    pattern: 'ai-report.ai_report.sent',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const via = event.payload.sentVia ? ` via ${event.payload.sentVia}` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            eventType: 'ai_report_sent',
            category: 'communication',
            severity: 'success',
            title: `AI-generated report sent${via}`,
            title_ar: 'تم إرسال تقرير مولّد بالذكاء الاصطناعي للأسرة',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] AI report timeline failed: ${err.message}`);
      }
    },
  });

  // ── Adaptive sports program completed → unified-core timeline (W1044) ──
  // When an AdaptiveSportsProgram reaches status 'completed' (the beneficiary
  // finished a structured adaptive / para-sport program), record it as a
  // clinical milestone on the longitudinal record.
  subscribers.push({
    name: 'adaptive-sports:completed → timeline:record',
    pattern: 'adaptive-sports.adaptive_sports.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const sport = event.payload.sport ? ` (${event.payload.sport})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            eventType: 'adaptive_sports_completed',
            category: 'clinical',
            severity: 'success',
            title: `Adaptive sports program completed${sport}`,
            title_ar: 'اكتمل برنامج الرياضة التكيفية',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Adaptive sports timeline failed: ${err.message}`);
      }
    },
  });

  // ── Individual Education Plan activated → unified-core timeline (W1045) ──
  // When an IEP/IFSP is signed and moves to status 'active', record the
  // activation as a clinical milestone on the longitudinal record so the care
  // team sees the education plan that is now in effect for the beneficiary.
  subscribers.push({
    name: 'iep:activated → timeline:record',
    pattern: 'iep.iep.activated',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const pt = event.payload.planType || 'IEP';
          const yr = event.payload.planYear ? ` ${event.payload.planYear}` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            eventType: 'iep_activated',
            category: 'clinical',
            severity: 'success',
            title: `Education plan activated (${pt}${yr})`,
            title_ar: 'تم تفعيل الخطة التربوية الفردية',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] IEP timeline failed: ${err.message}`);
      }
    },
  });

  // ── Vaccination administered → unified-core timeline (W1046) ──
  // When a Vaccination row moves to status 'administered' (the beneficiary
  // received a dose), record it as a clinical milestone on the longitudinal
  // record so the immunization history is visible alongside all other care.
  subscribers.push({
    name: 'vaccination:administered → timeline:record',
    pattern: 'vaccination.vaccination.administered',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const vaccine = event.payload.vaccine ? ` (${event.payload.vaccine})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'vaccination_administered',
            category: 'clinical',
            severity: 'success',
            title: `Vaccine administered${vaccine}`,
            title_ar: 'تم إعطاء التطعيم',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Vaccination timeline failed: ${err.message}`);
      }
    },
  });

  // ── Family home program completed → unified-core timeline (W1047) ──
  // When a FamilyHomeProgram reaches status 'COMPLETED' the family has
  // finished the prescribed home-practice plan — record it as a family
  // milestone on the beneficiary's longitudinal record.
  subscribers.push({
    name: 'family-home-program:completed → timeline:record',
    pattern: 'family-home-program.family_home_program.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const title = event.payload.title ? ` (${event.payload.title})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'family_home_program_completed',
            category: 'family',
            severity: 'success',
            title: `Home program completed${title}`,
            title_ar: 'اكتمل البرنامج المنزلي الأسري',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] FamilyHomeProgram timeline failed: ${err.message}`);
      }
    },
  });

  // ── Spasticity injection completed → unified-core timeline (W1048) ──
  // When a SpasticityInjection reaches status 'completed' the invasive
  // botulinum/phenol procedure was performed — record it as a clinical
  // milestone on the beneficiary's longitudinal record.
  subscribers.push({
    name: 'spasticity-injection:completed → timeline:record',
    pattern: 'spasticity-injection.spasticity_injection.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const agent = event.payload.agent ? ` (${event.payload.agent})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'spasticity_injection_completed',
            category: 'clinical',
            severity: 'success',
            title: `Spasticity injection completed${agent}`,
            title_ar: 'اكتملت حقنة التشنج العضلي',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] SpasticityInjection timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1049: prosthetic/orthotic delivered → core timeline ───────────
  // When a custom prosthesis/orthosis/seating system is delivered to the
  // beneficiary, record the delivery as a clinical milestone on the
  // beneficiary's longitudinal record.
  subscribers.push({
    name: 'prosthetic-orthotic-order:delivered → timeline:record',
    pattern: 'prosthetic-orthotic-order.prosthetic_orthotic.delivered',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const cat = event.payload.deviceCategory ? ` (${event.payload.deviceCategory})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'prosthetic_orthotic_delivered',
            category: 'clinical',
            severity: 'success',
            title: `Prosthetic/orthotic device delivered${cat}`,
            title_ar: 'تم تسليم الجهاز التقويمي/الطرف الصناعي',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] ProstheticOrthotic timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1050: seating/postural assessment finalized → core timeline ───
  // When a seating & postural assessment is finalized, record it as a
  // clinical milestone on the beneficiary's longitudinal record.
  subscribers.push({
    name: 'seating-postural-assessment:finalized → timeline:record',
    pattern: 'seating-postural-assessment.seating_postural.finalized',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const risk = event.payload.pressureInjuryRisk
            ? ` (pressure risk: ${event.payload.pressureInjuryRisk})`
            : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'seating_postural_finalized',
            category: 'clinical',
            severity: 'success',
            title: `Seating/postural assessment finalized${risk}`,
            title_ar: 'تم اعتماد تقييم الجلوس والوضعية',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] SeatingPostural timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1051: sensory diet program completed → core timeline ──────────
  // When a sensory diet program is completed, record it as a clinical
  // milestone on the beneficiary's longitudinal record.
  subscribers.push({
    name: 'sensory-diet-program:completed → timeline:record',
    pattern: 'sensory-diet-program.sensory_diet.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'sensory_diet_completed',
            category: 'clinical',
            severity: 'success',
            title: 'Sensory diet program completed',
            title_ar: 'اكتمل برنامج الحمية الحسية',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] SensoryDiet timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1052: prior authorization approved → core timeline ────────────
  // When an insurance prior authorization is approved, record it as an
  // administrative milestone on the beneficiary's longitudinal record.
  subscribers.push({
    name: 'prior-authorization:approved → timeline:record',
    pattern: 'prior-authorization.prior_authorization.approved',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const svc = event.payload.serviceType ? ` (${event.payload.serviceType})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'prior_authorization_approved',
            category: 'administrative',
            severity: 'success',
            title: `Prior authorization approved${svc}`,
            title_ar: 'تم اعتماد الموافقة المسبقة',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] PriorAuthorization timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1053: care plan review recorded → core timeline ───────────────
  // When a care-plan review is recorded, place it as a clinical milestone
  // on the beneficiary's longitudinal record.
  subscribers.push({
    name: 'plan-review:recorded → timeline:record',
    pattern: 'plan-review.plan_review.recorded',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const rt = event.payload.reviewType ? ` (${event.payload.reviewType})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'plan_review_recorded',
            category: 'clinical',
            severity: 'info',
            title: `Care plan review recorded${rt}`,
            title_ar: 'تم تسجيل مراجعة خطة الرعاية',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] PlanReview timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1054: instrumental swallow study completed → core timeline ────
  // When an instrumental swallow study (VFSS/FEES) is completed, record it
  // as a clinical milestone; aspiration findings raise the severity.
  subscribers.push({
    name: 'instrumental-swallow-study:completed → timeline:record',
    pattern: 'instrumental-swallow-study.swallow_study.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const aspirated = !!event.payload.aspirationDetected;
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'swallow_study_completed',
            category: 'clinical',
            severity: aspirated ? 'warning' : 'success',
            title: `Instrumental swallow study completed${aspirated ? ' — aspiration detected' : ''}`,
            title_ar: 'اكتملت دراسة البلع الأداتية',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] SwallowStudy timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1055: crisis incident resolved → core timeline ────────────────
  // When a crisis incident reaches 'resolved'/'closed', record it on the
  // beneficiary's timeline; critical/urgent crises keep a warning severity.
  subscribers.push({
    name: 'crisis-incident:resolved → timeline:record',
    pattern: 'crisis-incident.crisis_incident.resolved',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const sev = event.payload.severity;
          const high = sev === 'critical' || sev === 'urgent';
          const ct = event.payload.crisisType ? ` (${event.payload.crisisType})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'crisis_incident_resolved',
            category: 'clinical',
            severity: high ? 'warning' : 'success',
            title: `Crisis incident resolved${ct}`,
            title_ar: 'تم حل حادثة الأزمة',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] CrisisIncident timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1056: IQ assessment completed → core timeline ─────────────────
  // When a psychometric IQ assessment is recorded, log it as a clinical
  // milestone on the beneficiary's timeline.
  subscribers.push({
    name: 'iq-assessment:completed → timeline:record',
    pattern: 'iq-assessment.iq_assessment.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const fsiq = event.payload.fullScaleIQ;
          const tail = typeof fsiq === 'number' ? ` (FSIQ ${fsiq})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'iq_assessment_completed',
            category: 'clinical',
            severity: 'success',
            title: `IQ assessment completed${tail}`,
            title_ar: 'اكتمل تقييم الذكاء',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] IQAssessment timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1057: creative arts therapy session completed → core timeline ──
  // When a music/art/drama/dance/play therapy session is completed, record it
  // as a clinical milestone on the beneficiary's timeline.
  subscribers.push({
    name: 'creative-arts-therapy:completed → timeline:record',
    pattern: 'creative-arts-therapy.creative_arts_therapy.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const m = event.payload.modality ? ` (${event.payload.modality})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'creative_arts_therapy_completed',
            category: 'clinical',
            severity: 'success',
            title: `Creative arts therapy session completed${m}`,
            title_ar: 'اكتملت جلسة العلاج بالفنون الإبداعية',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] CreativeArtsTherapy timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1058: insurance eligibility check → core timeline ─────────────
  // When an NPHIES insurance-eligibility check is recorded, log it on the
  // beneficiary's timeline (administrative); ineligible results raise a warning.
  subscribers.push({
    name: 'insurance-eligibility:checked → timeline:record',
    pattern: 'insurance-eligibility.insurance_eligibility.checked',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const eligible = !!event.payload.isEligible;
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'insurance_eligibility_checked',
            category: 'administrative',
            severity: eligible ? 'success' : 'warning',
            title: `Insurance eligibility check: ${eligible ? 'eligible' : 'not eligible'}`,
            title_ar: eligible ? 'فحص أهلية التأمين: مؤهل' : 'فحص أهلية التأمين: غير مؤهل',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] InsuranceEligibility timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1059: flagged morning health check → core timeline ────────────
  // A morning health check with decision observe/send_home is a safety
  // event; log it on the beneficiary's timeline (send_home = error).
  subscribers.push({
    name: 'morning-health-check:flagged → timeline:record',
    pattern: 'morning-health-check.morning_health_check.flagged',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const sentHome = event.payload.decision === 'send_home';
          const temp =
            typeof event.payload.temperatureC === 'number'
              ? ` (${event.payload.temperatureC}°C)`
              : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'morning_health_check_flagged',
            category: 'clinical',
            severity: sentHome ? 'error' : 'warning',
            title: `Morning health check flagged: ${event.payload.decision}${temp}`,
            title_ar: sentHome ? 'فحص صحي صباحي: إرجاع للمنزل' : 'فحص صحي صباحي: تحت المراقبة',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] MorningHealthCheck timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1060: confirmed differential diagnosis → core timeline ────────
  // When a CDSS differential diagnosis is confirmed by a clinician, log it
  // on the beneficiary's timeline (clinical, success).
  subscribers.push({
    name: 'differential-diagnosis:confirmed → timeline:record',
    pattern: 'differential-diagnosis.differential_diagnosis.confirmed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'differential_diagnosis_confirmed',
            category: 'clinical',
            severity: 'success',
            title: 'Differential diagnosis confirmed',
            title_ar: 'تم تأكيد التشخيص التفريقي',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] DifferentialDiagnosis timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1061: completed community referral → core timeline ────────────
  // When a community referral linked to a beneficiary completes, log it on
  // the beneficiary's timeline (administrative, success).
  subscribers.push({
    name: 'community-referral:completed → timeline:record',
    pattern: 'community-referral.community_referral.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const t = event.payload.referralType ? ` (${event.payload.referralType})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'community_referral_completed',
            category: 'administrative',
            severity: 'success',
            title: `Community referral completed${t}`,
            title_ar: 'اكتملت الإحالة المجتمعية',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] CommunityReferral timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1062: completed clinical pathway plan → core timeline ─────────
  // When a unified clinical pathway plan is completed, log it on the
  // beneficiary's timeline (clinical, success).
  subscribers.push({
    name: 'clinical-pathway:completed → timeline:record',
    pattern: 'clinical-pathway.clinical_pathway.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const t = event.payload.pathwayType ? ` (${event.payload.pathwayType})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'clinical_pathway_completed',
            category: 'clinical',
            severity: 'success',
            title: `Clinical pathway plan completed${t}`,
            title_ar: 'اكتمل المسار السريري الموحد',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] ClinicalPathway timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1063: AAC PECS phase advanced → core timeline ────────────────
  // When a beneficiary's AAC profile records a PECS protocol phase
  // advancement, log the progression on their timeline (clinical, success).
  subscribers.push({
    name: 'aac-profile:pecs_phase_advanced → timeline:record',
    pattern: 'aac-profile.aac_profile.pecs_phase_advanced',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const p = event.payload.pecsPhase;
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'aac_pecs_phase_advanced',
            category: 'clinical',
            severity: 'success',
            title: `AAC PECS phase advanced${p ? ` to phase ${p}` : ''}`,
            title_ar: `تقدّم مرحلة PECS للتواصل البديل${p ? ` إلى المرحلة ${p}` : ''}`,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] AacProfile PECS timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1064: pain assessment finalized → core timeline ──────────────
  // When a beneficiary's pain assessment is finalized, log it on their
  // timeline (clinical; warning when the pain is clinically significant,
  // info otherwise) so the longitudinal pain record is visible on the core.
  subscribers.push({
    name: 'pain-assessment:finalized → timeline:record',
    pattern: 'pain-assessment.pain_assessment.finalized',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const sig = !!event.payload.significant;
          const s = typeof event.payload.score === 'number' ? ` (${event.payload.score})` : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'pain_assessment_finalized',
            category: 'clinical',
            severity: sig ? 'warning' : 'info',
            title: `Pain assessment finalized${s}`,
            title_ar: sig ? 'تم اعتماد تقييم الألم — ألم ملحوظ' : 'تم اعتماد تقييم الألم',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] PainAssessment timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1065: dysphagia (swallow) assessment finalized → core timeline ─
  // When a beneficiary's swallow-safety assessment is finalized, log it on
  // their timeline (clinical; error when the swallow is unsafe — high
  // aspiration risk / silent aspiration / active NPO — else info).
  subscribers.push({
    name: 'dysphagia-assessment:finalized → timeline:record',
    pattern: 'dysphagia-assessment.dysphagia_assessment.finalized',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const unsafe = !!event.payload.unsafe;
          const risk = event.payload.aspirationRisk
            ? ` — ${event.payload.aspirationRisk} aspiration risk`
            : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'dysphagia_assessment_finalized',
            category: 'clinical',
            severity: unsafe ? 'error' : 'info',
            title: `Dysphagia assessment finalized${risk}`,
            title_ar: unsafe ? 'تم اعتماد تقييم البلع — بلع غير آمن' : 'تم اعتماد تقييم البلع',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] DysphagiaAssessment timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1066: allergy recorded → core timeline ────────────────────────
  // A new active allergy is a safety milestone. Log it on the
  // beneficiary's timeline (clinical; error for severe / life-threatening
  // allergies, warning otherwise — an allergy always warrants attention).
  subscribers.push({
    name: 'allergy:recorded → timeline:record',
    pattern: 'allergy.allergy.recorded',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const severe = !!event.payload.severe;
          const sub = event.payload.substance || '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'allergy_recorded',
            category: 'clinical',
            severity: severe ? 'error' : 'warning',
            title: `Allergy recorded: ${sub} (${event.payload.severity})`,
            title_ar: severe ? `تم تسجيل حساسية خطيرة: ${sub}` : `تم تسجيل حساسية: ${sub}`,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Allergy timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1067: DTT (ABA) session completed → core timeline ─────────────
  // When a discrete-trial-training session is completed, log it on the
  // beneficiary's timeline (clinical; success when ≥1 target reached
  // mastery, info otherwise) with the headline ABA progress metrics.
  subscribers.push({
    name: 'dtt-session:completed → timeline:record',
    pattern: 'dtt-session.dtt_session.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const mastered = (event.payload.masteryCount || 0) > 0;
          const area = event.payload.programArea || '';
          const trials = event.payload.totalTrials || 0;
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'dtt_session_completed',
            category: 'clinical',
            severity: mastered ? 'success' : 'info',
            title: `DTT session completed (${area}) — ${trials} trials`,
            title_ar: mastered
              ? 'اكتملت جلسة المحاولات المنفصلة — تحقّق إتقان'
              : 'اكتملت جلسة المحاولات المنفصلة',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] DttSession timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1068: rehab goal achieved → core timeline ─────────────────────
  // When a progress snapshot records a goal reaching ≥ 100%, log the
  // achievement on the beneficiary's timeline (clinical/success).
  subscribers.push({
    name: 'goal-progress:achieved → timeline:record',
    pattern: 'goal-progress.goal_progress.goal_achieved',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const name = event.payload.goalName || '';
          const pct = event.payload.progressPct;
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'goal_progress_achieved',
            category: 'clinical',
            severity: 'success',
            title: `Goal achieved: ${name} (${pct}%)`,
            title_ar: `تحقّق هدف العلاج: ${name}`,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] GoalProgress timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1069: adjunct therapy session completed → core timeline ───────
  // When an adjunct-therapy session (hydro / hippo / animal-assisted) is
  // completed, log it on the beneficiary's timeline (clinical; warning if
  // an in-session incident was logged, success otherwise).
  subscribers.push({
    name: 'adjunct-therapy:completed → timeline:record',
    pattern: 'adjunct-therapy.adjunct_therapy.session_completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const incident = !!event.payload.hadIncident;
          const modality = event.payload.modality || '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'adjunct_therapy_completed',
            category: 'clinical',
            severity: incident ? 'warning' : 'success',
            title: `Adjunct therapy session completed (${modality})${
              incident ? ' — incident logged' : ''
            }`,
            title_ar: incident
              ? 'اكتملت جلسة العلاج المساند — مع تسجيل حادثة'
              : 'اكتملت جلسة العلاج المساند',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] AdjunctTherapy timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1070: disability card registered → core timeline ──────────────
  // When a beneficiary's disability card ("بطاقة الإعاقة") is registered
  // (status active), log it on the timeline — it gates government
  // entitlements/subsidies, an administrative milestone.
  subscribers.push({
    name: 'disability-card:registered → timeline:record',
    pattern: 'disability-card.disability_card.registered',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const level = event.payload.disabilityLevel || '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'disability_card_registered',
            category: 'administrative',
            severity: 'success',
            title: `Disability card registered (${level})`,
            title_ar: 'تم تسجيل بطاقة الإعاقة',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] DisabilityCard timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1071: portfolio milestone added → core timeline ───────────────
  // When a milestone-flagged portfolio item (achievement/artwork/report)
  // is added to a beneficiary's portfolio, surface it on the timeline as a
  // family-facing progress highlight.
  subscribers.push({
    name: 'portfolio:milestone-added → timeline:record',
    pattern: 'portfolio.portfolio.milestone_added',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const title = event.payload.title || '';
          const type = event.payload.type || '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'portfolio_milestone_added',
            category: 'family',
            severity: 'success',
            title: `Portfolio milestone added: ${title} (${type})`,
            title_ar: `تمت إضافة إنجاز إلى ملف الطفل: ${title}`,
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Portfolio timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1072: physiotherapy assessment finalized → core timeline ──────
  // When a physiotherapy assessment is finalized, log it on the
  // beneficiary's timeline as a clinical milestone (mobility baseline /
  // re-assessment / discharge outcome).
  subscribers.push({
    name: 'physiotherapy-assessment:finalized → timeline:record',
    pattern: 'physiotherapy-assessment.physiotherapy_assessment.finalized',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const type = event.payload.assessmentType || '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'physiotherapy_assessment_finalized',
            category: 'clinical',
            severity: 'success',
            title: `Physiotherapy assessment finalized (${type})`,
            title_ar: 'تم اعتماد تقييم العلاج الطبيعي',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] PhysiotherapyAssessment timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1073: service contract activated → core timeline ──────────────
  // When a beneficiary's service agreement with the center moves to
  // 'active', log it on the timeline as an administrative milestone
  // (enrollment / renewal anchor).
  subscribers.push({
    name: 'beneficiary-contract:activated → timeline:record',
    pattern: 'beneficiary-contract.beneficiary_contract.activated',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const number = event.payload.contractNumber || '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'service_contract_activated',
            category: 'administrative',
            severity: 'success',
            title: `Service contract activated: ${number}`,
            title_ar: 'تم تفعيل عقد الخدمة',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] BeneficiaryContract timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1074: subsidy payment received → core timeline ────────────────
  // When a beneficiary subsidy/pension is marked received, log it on the
  // timeline as an administrative milestone (financial support landed).
  subscribers.push({
    name: 'subsidy-entry:received → timeline:record',
    pattern: 'subsidy-entry.subsidy_entry.received',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const type = event.payload.subsidyType || '';
          const amount = event.payload.amountSAR != null ? event.payload.amountSAR : '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'subsidy_payment_received',
            category: 'administrative',
            severity: 'success',
            title: `Subsidy received: ${type} — ${amount} SAR`,
            title_ar: 'تم استلام إعانة مالية',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] SubsidyEntry timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1075: sponsorship activated → core timeline ───────────────────
  // When a beneficiary's kafala (sponsorship) becomes active, log it on
  // the timeline as an administrative milestone (a donor now covers them).
  subscribers.push({
    name: 'sponsorship:activated → timeline:record',
    pattern: 'sponsorship.sponsorship.activated',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const type = event.payload.sponsorshipType || '';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'sponsorship_activated',
            category: 'administrative',
            severity: 'success',
            title: `Sponsorship activated (${type})`,
            title_ar: 'تمت كفالة المستفيد',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] Sponsorship timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1076: potty request (toilet-training) → core timeline ─────────
  // When a child independently requests the potty (a positive
  // toilet-training milestone, not a routine diaper event), log it on the
  // timeline as a clinical win.
  subscribers.push({
    name: 'toileting-event:potty_requested → timeline:record',
    pattern: 'toileting-event.toileting_event.potty_requested',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'potty_request_milestone',
            category: 'clinical',
            severity: 'success',
            title: 'Potty requested independently (toilet-training progress)',
            title_ar: 'طلب الطفل الذهاب إلى الحمام (تقدّم في التدريب)',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] ToiletingEvent timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1077: home-practice completed → core timeline ─────────────────
  // A guardian logging a completed home-carryover activity is a positive
  // family-engagement signal — surface it on the beneficiary timeline.
  subscribers.push({
    name: 'home-carryover:completed → timeline:record',
    pattern: 'home-carryover.home_carryover.completed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'home_practice_completed',
            category: 'family',
            severity: 'success',
            title: 'Home-practice activity completed by guardian',
            title_ar: 'أنجز ولي الأمر تمريناً منزلياً',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] HomeCarryover timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1078: medication order activated → core timeline ──────────────
  // A new active medication order is a clinically significant event —
  // record it on the beneficiary timeline for the care team's review.
  subscribers.push({
    name: 'medication-order:activated → timeline:record',
    pattern: 'medication-order.medication_order.activated',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'medication_order_started',
            category: 'clinical',
            severity: 'info',
            title: `Medication started: ${event.payload.name || 'medication'}`,
            title_ar: 'بدء وصفة دواء جديدة',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] MedicationOrder timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1079: family visit approved → core timeline ───────────────────
  // An approved parent-visit request (parent will observe a session) is a
  // family-engagement milestone — surface it on the beneficiary timeline.
  subscribers.push({
    name: 'family-visit:approved → timeline:record',
    pattern: 'family-visit.family_visit.approved',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'family_visit_approved',
            category: 'family',
            severity: 'success',
            title: `Family visit approved (${event.payload.slot || 'visit'})`,
            title_ar: 'تمت الموافقة على زيارة الأهل',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] FamilyVisit timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1080: BIP fidelity check recorded → core timeline ─────────────
  // A behaviour-plan fidelity check is the #1 predictor of BIP outcomes —
  // record each check on the timeline; severity reflects the banding
  // (failing → error, concerning → warning, passing → success).
  subscribers.push({
    name: 'bip-fidelity:checked → timeline:record',
    pattern: 'bip-fidelity.bip_fidelity.checked',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const sev =
            event.payload.status === 'failing'
              ? 'error'
              : event.payload.status === 'concerning'
                ? 'warning'
                : 'success';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'bip_fidelity_checked',
            category: 'clinical',
            severity: sev,
            title: `BIP fidelity check: ${event.payload.status || 'recorded'} (${
              event.payload.fidelityPercent != null ? event.payload.fidelityPercent + '%' : 'n/a'
            })`,
            title_ar: 'تم تسجيل فحص دقّة تطبيق الخطة السلوكية',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] BipFidelity timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1081: goal progress entry recorded → core timeline ────────────
  // Each progress update toward a CarePlan goal is a clinical milestone —
  // record it on the timeline so a goal's trajectory is visible alongside
  // every other event in the beneficiary's longitudinal record.
  subscribers.push({
    name: 'goal-entry:recorded → timeline:record',
    pattern: 'goal-entry.goal_entry.recorded',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'goal_progress_recorded',
            category: 'clinical',
            severity: 'info',
            title: `Goal progress recorded (${
              event.payload.progressPercent != null
                ? event.payload.progressPercent + '%'
                : 'updated'
            })`,
            title_ar: 'تم تسجيل تقدّم على أحد أهداف الخطة العلاجية',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] GoalEntry timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1082: CDSS risk assessment recorded → core timeline ───────────
  // A clinical decision-support risk score (fall / pressure-ulcer /
  // malnutrition / deterioration) is a safety-critical milestone — record
  // it on the timeline; severity tracks the assessed risk level.
  subscribers.push({
    name: 'cdss-risk:assessed → timeline:record',
    pattern: 'cdss-risk.cdss_risk.assessed',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const sev =
            event.payload.riskLevel === 'very_high'
              ? 'critical'
              : event.payload.riskLevel === 'high'
                ? 'error'
                : event.payload.riskLevel === 'moderate'
                  ? 'warning'
                  : 'info';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'cdss_risk_assessed',
            category: 'clinical',
            severity: sev,
            title: `Clinical risk assessment: ${event.payload.assessmentType || 'recorded'} — ${
              event.payload.riskLevel || 'n/a'
            }`,
            title_ar: 'تم تسجيل تقييم مخاطر سريري للمستفيد',
            ...(event.payload.branchId ? { branchId: event.payload.branchId } : {}),
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] CdssRisk timeline failed: ${err.message}`);
      }
    },
  });

  // ── W1083: clinical red flag raised → core timeline ────────────────
  // A raised red flag (the highest-priority clinical safety signal) must
  // be visible on the beneficiary's longitudinal record. Severity passes
  // through from the flag (critical / warning / info).
  subscribers.push({
    name: 'red-flag:raised → timeline:record',
    pattern: 'red-flag.red_flag.raised',
    handler: async event => {
      try {
        const mongoose = require('mongoose');
        const CareTimeline = mongoose.models.CareTimeline;
        if (CareTimeline && event.payload.beneficiaryId) {
          const sev = ['critical', 'warning', 'info'].includes(event.payload.severity)
            ? event.payload.severity
            : 'warning';
          await CareTimeline.create({
            beneficiaryId: event.payload.beneficiaryId,
            eventType: 'red_flag_raised',
            category: 'clinical',
            severity: sev,
            title: `Red flag raised: ${event.payload.flagId || 'clinical signal'}${
              event.payload.blocking ? ' (blocking)' : ''
            }`,
            title_ar: 'تم رفع علامة خطر سريرية على المستفيد',
            metadata: event.payload,
          });
        }
      } catch (err) {
        logger.error(`[DDD-CrossModule] RedFlag timeline failed: ${err.message}`);
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

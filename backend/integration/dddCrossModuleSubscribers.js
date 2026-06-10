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

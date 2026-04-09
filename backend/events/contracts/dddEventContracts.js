/**
 * DDD Domain Event Contracts — عقود أحداث الدومينات العلاجية
 *
 * Formal contracts for all 20 DDD rehabilitation domains.
 * Every cross-domain interaction MUST use a registered contract.
 *
 * @module events/contracts/dddEventContracts
 */

'use strict';

const { DELIVERY, PRIORITY } = require('../../integration/systemIntegrationBus');

// ═══════════════════════════════════════════════════════════════════════════════
//  Core (Beneficiary) Events — أحداث المستفيدين
// ═══════════════════════════════════════════════════════════════════════════════

const BENEFICIARY_DDD_EVENTS = {
  REGISTERED: {
    domain: 'core',
    eventType: 'beneficiary.registered',
    version: 1,
    description: 'تم تسجيل مستفيد جديد — New beneficiary registered',
    payload: {
      beneficiaryId: 'string',
      mrn: 'string',
      name: 'string',
      disabilityType: 'string',
      disabilityLevel: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['episodes', 'timeline', 'family', 'dashboards', 'notification'],
  },

  STATUS_CHANGED: {
    domain: 'core',
    eventType: 'beneficiary.status_changed',
    version: 1,
    description: 'تغيّر حالة المستفيد — Beneficiary status changed',
    payload: {
      beneficiaryId: 'string',
      oldStatus: 'string',
      newStatus: 'string',
      reason: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['episodes', 'timeline', 'family', 'dashboards', 'workflow'],
  },

  PROFILE_UPDATED: {
    domain: 'core',
    eventType: 'beneficiary.profile_updated',
    version: 1,
    description: 'تم تحديث ملف المستفيد — Beneficiary profile updated',
    payload: {
      beneficiaryId: 'string',
      updatedFields: 'array',
      updatedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Episode Events — أحداث حلقات الرعاية
// ═══════════════════════════════════════════════════════════════════════════════

const EPISODE_EVENTS = {
  CREATED: {
    domain: 'episodes',
    eventType: 'episode.created',
    version: 1,
    description: 'تم إنشاء حلقة رعاية — Episode of care created',
    payload: {
      episodeId: 'string',
      beneficiaryId: 'string',
      phase: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'workflow', 'dashboards', 'notification'],
  },

  PHASE_TRANSITIONED: {
    domain: 'episodes',
    eventType: 'episode.phase_transitioned',
    version: 1,
    description: 'انتقال مرحلة الحلقة — Episode phase transitioned',
    payload: {
      episodeId: 'string',
      beneficiaryId: 'string',
      fromPhase: 'string',
      toPhase: 'string',
      performedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: [
      'timeline',
      'workflow',
      'care-plans',
      'sessions',
      'dashboards',
      'notification',
      'ai-recommendations',
    ],
  },

  CLOSED: {
    domain: 'episodes',
    eventType: 'episode.closed',
    version: 1,
    description: 'تم إغلاق حلقة الرعاية — Episode closed',
    payload: {
      episodeId: 'string',
      beneficiaryId: 'string',
      outcome: 'string',
      durationDays: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'reports', 'quality', 'ai-recommendations'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Assessment Events — أحداث التقييمات
// ═══════════════════════════════════════════════════════════════════════════════

const ASSESSMENT_EVENTS = {
  COMPLETED: {
    domain: 'assessments',
    eventType: 'assessment.completed',
    version: 1,
    description: 'تم إكمال تقييم — Assessment completed',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      type: 'string',
      overallScore: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'care-plans', 'goals', 'ai-recommendations', 'dashboards', 'reports'],
  },

  OVERDUE: {
    domain: 'assessments',
    eventType: 'assessment.overdue',
    version: 1,
    description: 'تقييم متأخر — Assessment overdue',
    payload: {
      beneficiaryId: 'string',
      episodeId: 'string',
      dueDate: 'date',
      daysPastDue: 'number',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['workflow', 'notification', 'quality', 'dashboards'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Care Plan Events — أحداث خطط الرعاية
// ═══════════════════════════════════════════════════════════════════════════════

const CARE_PLAN_EVENTS = {
  ACTIVATED: {
    domain: 'care-plans',
    eventType: 'careplan.activated',
    version: 1,
    description: 'تم تفعيل خطة رعاية — Care plan activated',
    payload: {
      planId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      goalCount: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'goals', 'sessions', 'workflow', 'dashboards'],
  },

  COMPLETED: {
    domain: 'care-plans',
    eventType: 'careplan.completed',
    version: 1,
    description: 'تم إكمال خطة الرعاية — Care plan completed',
    payload: {
      planId: 'string',
      beneficiaryId: 'string',
      achievementRate: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'reports', 'dashboards', 'ai-recommendations'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Session Events — أحداث الجلسات
// ═══════════════════════════════════════════════════════════════════════════════

const SESSION_EVENTS = {
  COMPLETED: {
    domain: 'sessions',
    eventType: 'session.completed',
    version: 1,
    description: 'تم إكمال جلسة — Session completed',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      therapistId: 'string',
      sessionType: 'string',
      duration: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'goals', 'dashboards', 'reports', 'ai-recommendations'],
  },

  CANCELLED: {
    domain: 'sessions',
    eventType: 'session.cancelled',
    version: 1,
    description: 'تم إلغاء جلسة — Session cancelled',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      reason: 'string',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['workflow', 'notification', 'dashboards', 'ai-recommendations'],
  },

  NO_SHOW: {
    domain: 'sessions',
    eventType: 'session.no_show',
    version: 1,
    description: 'عدم حضور جلسة — Session no-show',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      consecutiveNoShows: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['workflow', 'notification', 'family', 'ai-recommendations', 'dashboards'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Goal Events — أحداث الأهداف
// ═══════════════════════════════════════════════════════════════════════════════

const GOAL_EVENTS = {
  ACHIEVED: {
    domain: 'goals',
    eventType: 'goal.achieved',
    version: 1,
    description: 'تم تحقيق هدف — Goal achieved',
    payload: {
      goalId: 'string',
      beneficiaryId: 'string',
      goalType: 'string',
      achievementDate: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'care-plans', 'dashboards', 'notification', 'family'],
  },

  STALLED: {
    domain: 'goals',
    eventType: 'goal.stalled',
    version: 1,
    description: 'توقف تقدم الهدف — Goal progress stalled',
    payload: {
      goalId: 'string',
      beneficiaryId: 'string',
      lastProgressDate: 'date',
      daysSinceProgress: 'number',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['ai-recommendations', 'workflow', 'notification', 'dashboards'],
  },

  MEASURE_APPLIED: {
    domain: 'goals',
    eventType: 'goal.measure_applied',
    version: 1,
    description: 'تم تطبيق مقياس — Measure applied',
    payload: {
      measureId: 'string',
      beneficiaryId: 'string',
      measureName: 'string',
      score: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'assessments', 'dashboards', 'reports'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Workflow Events — أحداث سير العمل
// ═══════════════════════════════════════════════════════════════════════════════

const WORKFLOW_EVENTS = {
  TASK_ASSIGNED: {
    domain: 'workflow',
    eventType: 'workflow.task_assigned',
    version: 1,
    description: 'تم تعيين مهمة — Task assigned',
    payload: {
      taskId: 'string',
      assigneeId: 'string',
      taskType: 'string',
      priority: 'string',
      dueDate: 'date',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['notification', 'dashboards'],
  },

  TASK_OVERDUE: {
    domain: 'workflow',
    eventType: 'workflow.task_overdue',
    version: 1,
    description: 'مهمة متأخرة — Task overdue',
    payload: {
      taskId: 'string',
      assigneeId: 'string',
      dueDate: 'date',
      daysPastDue: 'number',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['notification', 'quality', 'dashboards'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Quality Events — أحداث الجودة
// ═══════════════════════════════════════════════════════════════════════════════

const QUALITY_EVENTS = {
  AUDIT_COMPLETED: {
    domain: 'quality',
    eventType: 'quality.audit_completed',
    version: 1,
    description: 'تم إكمال مراجعة جودة — Quality audit completed',
    payload: {
      auditId: 'string',
      score: 'number',
      findingsCount: 'number',
      criticalFindings: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['dashboards', 'notification', 'reports'],
  },

  CORRECTIVE_ACTION_REQUIRED: {
    domain: 'quality',
    eventType: 'quality.corrective_action_required',
    version: 1,
    description: 'مطلوب إجراء تصحيحي — Corrective action required',
    payload: {
      auditId: 'string',
      finding: 'string',
      severity: 'string',
      assigneeId: 'string',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['workflow', 'notification'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Family Events — أحداث الأسرة
// ═══════════════════════════════════════════════════════════════════════════════

const FAMILY_EVENTS = {
  COMMUNICATION_LOGGED: {
    domain: 'family',
    eventType: 'family.communication_logged',
    version: 1,
    description: 'تم تسجيل تواصل أسري — Family communication logged',
    payload: {
      beneficiaryId: 'string',
      familyMemberId: 'string',
      communicationType: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  ENGAGEMENT_LOW: {
    domain: 'family',
    eventType: 'family.engagement_low',
    version: 1,
    description: 'تفاعل أسري منخفض — Low family engagement detected',
    payload: {
      beneficiaryId: 'string',
      lastContactDate: 'date',
      daysSinceContact: 'number',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['ai-recommendations', 'notification', 'workflow', 'dashboards'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Dashboard / KPI Events — أحداث لوحات القيادة
// ═══════════════════════════════════════════════════════════════════════════════

const DASHBOARD_EVENTS = {
  ALERT_TRIGGERED: {
    domain: 'dashboards',
    eventType: 'dashboard.alert_triggered',
    version: 1,
    description: 'تم إطلاق تنبيه قرار — Decision alert triggered',
    payload: {
      alertId: 'string',
      rule: 'string',
      severity: 'string',
      kpiValue: 'number',
      threshold: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['notification', 'workflow'],
  },

  KPI_THRESHOLD_BREACHED: {
    domain: 'dashboards',
    eventType: 'dashboard.kpi_threshold_breached',
    version: 1,
    description: 'تجاوز عتبة مؤشر أداء — KPI threshold breached',
    payload: {
      kpiId: 'string',
      kpiName: 'string',
      currentValue: 'number',
      targetValue: 'number',
      direction: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['notification', 'reports'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Tele-Rehab & AR/VR Events
// ═══════════════════════════════════════════════════════════════════════════════

const TELEREHAB_EVENTS = {
  SESSION_COMPLETED: {
    domain: 'tele-rehab',
    eventType: 'telerehab.session_completed',
    version: 1,
    description: 'تم إكمال جلسة عن بُعد — Tele-session completed',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      duration: 'number',
      qualityScore: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'sessions', 'dashboards'],
  },
};

const ARVR_EVENTS = {
  SESSION_COMPLETED: {
    domain: 'ar-vr',
    eventType: 'arvr.session_completed',
    version: 1,
    description: 'تم إكمال جلسة AR/VR — AR/VR session completed',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      duration: 'number',
      safetyScore: 'number',
      progressDelta: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'sessions', 'goals', 'dashboards'],
  },

  SAFETY_ALERT: {
    domain: 'ar-vr',
    eventType: 'arvr.safety_alert',
    version: 1,
    description: 'تنبيه سلامة AR/VR — AR/VR safety alert',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      alertType: 'string',
      metric: 'string',
      value: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['notification', 'workflow', 'dashboards'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Behavior & Group Therapy Events
// ═══════════════════════════════════════════════════════════════════════════════

const BEHAVIOR_EVENTS = {
  INCIDENT_RECORDED: {
    domain: 'behavior',
    eventType: 'behavior.incident_recorded',
    version: 1,
    description: 'تم تسجيل حادثة سلوكية — Behavior incident recorded',
    payload: {
      recordId: 'string',
      beneficiaryId: 'string',
      behaviorType: 'string',
      severity: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'notification', 'family', 'dashboards', 'ai-recommendations'],
  },

  PLAN_UPDATED: {
    domain: 'behavior',
    eventType: 'behavior.plan_updated',
    version: 1,
    description: 'تم تحديث خطة سلوكية — Behavior plan updated',
    payload: {
      planId: 'string',
      beneficiaryId: 'string',
      strategies: 'array',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'care-plans'],
  },
};

const GROUP_THERAPY_EVENTS = {
  SESSION_COMPLETED: {
    domain: 'group-therapy',
    eventType: 'group.session_completed',
    version: 1,
    description: 'تم إكمال جلسة جماعية — Group session completed',
    payload: {
      groupId: 'string',
      sessionId: 'string',
      memberCount: 'number',
      duration: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'sessions', 'dashboards'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Research & Field Training Events
// ═══════════════════════════════════════════════════════════════════════════════

const RESEARCH_EVENTS = {
  STUDY_COMPLETED: {
    domain: 'research',
    eventType: 'research.study_completed',
    version: 1,
    description: 'تم إكمال دراسة بحثية — Research study completed',
    payload: {
      studyId: 'string',
      title: 'string',
      participantCount: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['dashboards', 'reports'],
  },
};

const FIELD_TRAINING_EVENTS = {
  TRAINEE_EVALUATED: {
    domain: 'field-training',
    eventType: 'training.trainee_evaluated',
    version: 1,
    description: 'تم تقييم متدرب — Trainee evaluated',
    payload: {
      traineeId: 'string',
      programId: 'string',
      score: 'number',
      competenciesMet: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['dashboards', 'reports'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  AI Recommendations Events
// ═══════════════════════════════════════════════════════════════════════════════

const AI_RECOMMENDATION_EVENTS = {
  GENERATED: {
    domain: 'ai-recommendations',
    eventType: 'ai.recommendation_generated',
    version: 1,
    description: 'تم توليد توصية ذكية — AI recommendation generated',
    payload: {
      recommendationId: 'string',
      beneficiaryId: 'string',
      ruleId: 'string',
      confidence: 'number',
      action: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['notification', 'workflow', 'dashboards'],
  },

  RISK_ELEVATED: {
    domain: 'ai-recommendations',
    eventType: 'ai.risk_elevated',
    version: 1,
    description: 'خطر مرتفع للمستفيد — Beneficiary risk elevated',
    payload: {
      beneficiaryId: 'string',
      riskScore: 'number',
      previousScore: 'number',
      riskFactors: 'array',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['notification', 'workflow', 'dashboards', 'family'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Aggregated Contracts Registry
// ═══════════════════════════════════════════════════════════════════════════════

const DDD_CONTRACTS = {
  core: BENEFICIARY_DDD_EVENTS,
  episodes: EPISODE_EVENTS,
  assessments: ASSESSMENT_EVENTS,
  'care-plans': CARE_PLAN_EVENTS,
  sessions: SESSION_EVENTS,
  goals: GOAL_EVENTS,
  workflow: WORKFLOW_EVENTS,
  quality: QUALITY_EVENTS,
  family: FAMILY_EVENTS,
  dashboards: DASHBOARD_EVENTS,
  'tele-rehab': TELEREHAB_EVENTS,
  'ar-vr': ARVR_EVENTS,
  behavior: BEHAVIOR_EVENTS,
  'group-therapy': GROUP_THERAPY_EVENTS,
  research: RESEARCH_EVENTS,
  'field-training': FIELD_TRAINING_EVENTS,
  'ai-recommendations': AI_RECOMMENDATION_EVENTS,
};

/**
 * Count all DDD event contracts
 */
function getDDDContractStats() {
  const stats = {};
  let total = 0;
  for (const [domain, contracts] of Object.entries(DDD_CONTRACTS)) {
    const count = Object.keys(contracts).length;
    stats[domain] = count;
    total += count;
  }
  return { domains: Object.keys(DDD_CONTRACTS).length, totalEvents: total, perDomain: stats };
}

module.exports = {
  BENEFICIARY_DDD_EVENTS,
  EPISODE_EVENTS,
  ASSESSMENT_EVENTS,
  CARE_PLAN_EVENTS,
  SESSION_EVENTS,
  GOAL_EVENTS,
  WORKFLOW_EVENTS,
  QUALITY_EVENTS,
  FAMILY_EVENTS,
  DASHBOARD_EVENTS,
  TELEREHAB_EVENTS,
  ARVR_EVENTS,
  BEHAVIOR_EVENTS,
  GROUP_THERAPY_EVENTS,
  RESEARCH_EVENTS,
  FIELD_TRAINING_EVENTS,
  AI_RECOMMENDATION_EVENTS,
  DDD_CONTRACTS,
  getDDDContractStats,
};

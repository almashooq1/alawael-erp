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
  CREATED: {
    domain: 'care-plans',
    eventType: 'careplan.created',
    version: 1,
    description: 'تم إنشاء خطة رعاية — Care plan created',
    payload: {
      planId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      type: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  UPDATED: {
    domain: 'care-plans',
    eventType: 'careplan.updated',
    version: 1,
    description: 'تم تعديل خطة رعاية — Care plan updated',
    payload: {
      planId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

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
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Goal Events — أحداث الأهداف
// ═══════════════════════════════════════════════════════════════════════════════

const GOAL_EVENTS = {
  CREATED: {
    domain: 'goals',
    eventType: 'goal.created',
    version: 1,
    description: 'تم إنشاء هدف علاجي — Therapy goal created',
    payload: {
      goalId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      goalNumber: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

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
//  Appointment Events — أحداث المواعيد (W970)
// ═══════════════════════════════════════════════════════════════════════════════
//
// The appointment timeline subscribers landed on main (alongside the W928/W929
// episode work) but their contracts + producer + CareTimeline enum never did —
// leaving `appointments.appointment.*` as orphan subscribers (W389 red) that
// would also throw at runtime. W970 completes the slice. Producer: Appointment
// post-save hooks (models/Appointment.js, pre-compile). Consumers: the
// CareTimeline subscribers in dddCrossModuleSubscribers.js.

const APPOINTMENT_EVENTS = {
  BOOKED: {
    domain: 'appointments',
    eventType: 'appointment.booked',
    version: 1,
    description: 'تم حجز موعد — Appointment booked',
    payload: {
      appointmentId: 'string',
      beneficiaryId: 'string',
      beneficiaryName: 'string',
      therapistId: 'string',
      appointmentType: 'string',
      date: 'date',
      startTime: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },

  CANCELLED: {
    domain: 'appointments',
    eventType: 'appointment.cancelled',
    version: 1,
    description: 'تم إلغاء موعد — Appointment cancelled',
    payload: {
      appointmentId: 'string',
      beneficiaryId: 'string',
      appointmentType: 'string',
      date: 'date',
      reason: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  NO_SHOW: {
    domain: 'appointments',
    eventType: 'appointment.no_show',
    version: 1,
    description: 'تغيّب المستفيد عن موعد — Beneficiary no-show',
    payload: {
      appointmentId: 'string',
      beneficiaryId: 'string',
      appointmentType: 'string',
      date: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'ai-recommendations', 'notification'],
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
  quality: QUALITY_EVENTS,
  behavior: BEHAVIOR_EVENTS,
  'ai-recommendations': AI_RECOMMENDATION_EVENTS,
  appointments: APPOINTMENT_EVENTS,
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
  QUALITY_EVENTS,
  BEHAVIOR_EVENTS,
  AI_RECOMMENDATION_EVENTS,
  APPOINTMENT_EVENTS,
  DDD_CONTRACTS,
  getDDDContractStats,
};

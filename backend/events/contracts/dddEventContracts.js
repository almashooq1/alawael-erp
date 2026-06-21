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
      episodeId: 'string',
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

  // W974 — session lifecycle reaches the unified timeline: cancelled / no-show.
  CANCELLED: {
    domain: 'sessions',
    eventType: 'session.cancelled',
    version: 1,
    description: 'تم إلغاء جلسة — Session cancelled',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      therapistId: 'string',
      sessionType: 'string',
      reason: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  NO_SHOW: {
    domain: 'sessions',
    eventType: 'session.no_show',
    version: 1,
    description: 'تغيّب المستفيد عن جلسة — Session no-show',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      therapistId: 'string',
      sessionType: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'ai-recommendations', 'notification'],
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

  // W1032 — Behavior plan reaching 'completed' (BIP goals met / cycle finished)
  PLAN_COMPLETED: {
    domain: 'behavior',
    eventType: 'behavior.plan_completed',
    version: 1,
    description: 'اكتملت خطة إدارة السلوك — Behavior management plan completed',
    payload: {
      planId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      title: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
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
//  Safety Events — أحداث السلامة (W992)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Tier-1 clinical safety events from the Core Linkage Ledger roadmap. These were
// standalone CRUD ledgers (W356 SeizureEvent / W357 SafeguardingConcern / W193b
// RestraintSeclusionEvent) that never surfaced on the per-beneficiary unified
// timeline — so a seizure, a safeguarding concern, or a restraint application was
// invisible to the care team's longitudinal view. W992 wires them via native
// pre-compile post-save hooks (the W970 mechanism — the generic modelEventBridge
// produces nothing for these because its hooks attach post-compile). Consumers:
// the CareTimeline subscribers in dddCrossModuleSubscribers.js.

const SAFETY_EVENTS = {
  SEIZURE_RECORDED: {
    domain: 'safety',
    eventType: 'seizure.recorded',
    version: 1,
    description: 'تم تسجيل نوبة صرعية — Seizure event recorded',
    payload: {
      seizureEventId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      seizureType: 'string',
      severity: 'string',
      durationSeconds: 'number',
      statusEpilepticus: 'boolean',
      date: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },

  SAFEGUARDING_CONCERN_RAISED: {
    domain: 'safety',
    eventType: 'safeguarding.concern_raised',
    version: 1,
    description: 'تم رفع بلاغ حماية — Safeguarding concern raised',
    payload: {
      concernId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      category: 'string',
      severity: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },

  // W1027 — safeguarding concern reached terminal 'closed' status. A closure
  // (with outcomeSummary + closedBy + closedAt) is a child-protection
  // resolution milestone on the subject beneficiary's longitudinal record.
  SAFEGUARDING_CONCERN_CLOSED: {
    domain: 'safety',
    eventType: 'safeguarding.concern_closed',
    version: 1,
    description: 'تم إغلاق بلاغ حماية — Safeguarding concern closed',
    payload: {
      concernId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      category: 'string',
      severity: 'string',
      outcome: 'string',
      closedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },

  RESTRAINT_APPLIED: {
    domain: 'safety',
    eventType: 'restraint.applied',
    version: 1,
    description: 'تم تطبيق تقييد/عزل — Restraint or seclusion applied',
    payload: {
      restraintEventId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      restraintType: 'string',
      techniqueUsed: 'string',
      durationMinutes: 'number',
      date: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },

  EMERGENCY_PLAN_ACTIVATED: {
    domain: 'safety',
    eventType: 'emergency_plan.activated',
    version: 1,
    description: 'تم تفعيل خطة الطوارئ — Emergency plan activated',
    payload: {
      planId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      conditionTypes: 'array',
      activatedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Screening Events — أحداث المسح الصحي (W993)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Vision (W720) + Hearing (W724) functional screenings. Undetected sensory loss
// silently undermines every other therapy, so a finalized screen is a first-class
// clinical milestone that belongs on the per-beneficiary timeline (CareTimeline)
// and dashboards — not buried in a standalone screening grid. Emitted on finalize
// (new-as-finalized OR draft→finalized) via native pre-compile post-save hooks.
// One contract serves both modalities (screeningType field distinguishes them).

const SCREENING_EVENTS = {
  SCREENING_COMPLETED: {
    domain: 'screenings',
    eventType: 'screening.completed',
    version: 1,
    description: 'تم إنهاء مسح صحي (نظر/سمع) — Vision/hearing screening finalized',
    payload: {
      screeningId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      screeningType: 'string',
      screeningMethod: 'string',
      outcome: 'string',
      date: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Medication Administration Events — أحداث تعاطي الدواء (W994)
// ═══════════════════════════════════════════════════════════════════════════════
//
// A recorded dose outcome (MAR, W191b) is a clinical event the care team must
// see on the per-beneficiary timeline — especially a REFUSED or MISSED dose
// (a missed anti-epileptic can precede a seizure). One contract covers every
// terminal outcome (administered/refused/missed/held); the `status` payload
// field distinguishes them. Emitted when a dose leaves 'scheduled' via native
// pre-compile post-save hooks (new-as-terminal OR scheduled→terminal).

const MEDICATION_EVENTS = {
  MEDICATION_DOSE_RECORDED: {
    domain: 'medications',
    eventType: 'medication.dose_recorded',
    version: 1,
    description: 'تم تسجيل نتيجة جرعة دوائية — Medication dose outcome recorded (MAR)',
    payload: {
      marId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      medicationName: 'string',
      status: 'string',
      route: 'string',
      isControlled: 'boolean',
      date: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Discharge Events — أحداث إنهاء الخدمة / الخروج (W995)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Completing a discharge plan (DischargePlan, rehab-advanced) is a terminal
// milestone in the beneficiary's episode of care — it MUST appear on the
// longitudinal timeline so the full journey reads end-to-end. Emitted when a
// plan reaches status 'completed' via native pre-compile post-save hooks.

const DISCHARGE_EVENTS = {
  DISCHARGE_COMPLETED: {
    domain: 'discharge',
    eventType: 'discharge.completed',
    version: 1,
    description: 'تم إنهاء خدمة المستفيد (خطة الخروج) — Discharge plan completed',
    payload: {
      dischargePlanId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      dischargeType: 'string',
      actualDischargeDate: 'date',
      overallProgressRating: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Admission Events — أحداث القبول / التسجيل من قائمة الانتظار (W996)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Enrolling a waitlist applicant (WaitlistEntry.status → 'enrolled') is the
// admission milestone that opens the beneficiary's episode of care. It MUST
// appear at the head of the longitudinal timeline. Emitted once when status
// reaches 'enrolled' via the model's existing pre-compile save middleware.

const ADMISSION_EVENTS = {
  ADMISSION_ENROLLED: {
    domain: 'admissions',
    eventType: 'admission.enrolled',
    version: 1,
    description:
      'تم تسجيل متقدم من قائمة الانتظار كمستفيد فعلي — Waitlist applicant enrolled (admission)',
    payload: {
      waitlistEntryId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      applicantName: 'string',
      disabilityType: 'string',
      enrolledAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};
// ═══════════════════════════════════════════════════════════════════════════════

// ── W997: Referral conversion → unified core ────────────────────────────────────
// ReferralTracking is the canonical, beneficiary-keyed referral record. When an
// incoming/outgoing referral for a KNOWN beneficiary reaches 'converted' (the
// referral resulted in the beneficiary entering/continuing care — the model's
// own "% convert to enrollments" KPI), the longitudinal record must show it.

const REFERRAL_EVENTS = {
  REFERRAL_CONVERTED: {
    domain: 'referrals',
    eventType: 'referral.converted',
    version: 1,
    description:
      'تم تحويل إحالة إلى التحاق فعلي للمستفيد — Referral converted to enrollment (loop closed)',
    payload: {
      referralId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      direction: 'string',
      serviceType: 'string',
      convertedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};
// ═══════════════════════════════════════════════════════════════════════════════

// ── W1001: Medical referral completion → unified core ────────────────────────
// MedicalReferral is the clinical, beneficiary-required referral record. When
// a referral reaches 'completed' (the consultation/treatment loop concluded),
// the longitudinal record must carry it as a clinical milestone.

const MEDICAL_REFERRAL_EVENTS = {
  MEDICAL_REFERRAL_COMPLETED: {
    domain: 'medical-referrals',
    eventType: 'medical_referral.completed',
    version: 1,
    description:
      'اكتملت الإحالة الطبية واستُلمت الاستشارة — Medical referral completed (consultation loop closed)',
    payload: {
      referralId: 'string',
      referralNumber: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      referralType: 'string',
      specialty: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};
// ═══════════════════════════════════════════════════════════════════════════════

// ── W1022: Measurement result approved → unified core ────────────────────
// A standardized measurement/assessment result reaching APPROVED is a clinical
// milestone; the longitudinal record must carry the finalized score + level.

const MEASUREMENT_EVENTS = {
  MEASUREMENT_RESULT_APPROVED: {
    domain: 'measurements',
    eventType: 'measurement.result_approved',
    version: 1,
    description:
      'تم اعتماد نتيجة قياس/تقييم معياري — Measurement result approved (finalized score)',
    payload: {
      resultId: 'string',
      beneficiaryId: 'string',
      measurementId: 'string',
      overallLevel: 'string',
      rawScore: 'number',
      standardScore: 'number',
      dateAdministrated: 'date',
      approvedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};
// ═══════════════════════════════════════════════════════════════════════════════

// ── W1000: Insurance claim paid → unified core ───────────────────────
// A beneficiary's insurance claim reaching 'paid' closes the reimbursement
// loop — a financial/operational milestone on the longitudinal record.

const INSURANCE_CLAIM_EVENTS = {
  INSURANCE_CLAIM_PAID: {
    domain: 'insurance-claims',
    eventType: 'insurance_claim.paid',
    version: 1,
    description: 'تم سداد مطالبة تأمين للمستفيد — Insurance claim paid (reimbursement loop closed)',
    payload: {
      claimId: 'string',
      claimNumber: 'string',
      beneficiaryId: 'string',
      claimType: 'string',
      payerShare: 'number',
      paymentAmount: 'number',
      paidAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};
// ── W1023: Invoice paid → unified core ────────────────────────────
// A beneficiary's invoice reaching 'PAID' is a financial milestone closing the
// billing loop on the longitudinal record.

const INVOICE_EVENTS = {
  INVOICE_PAID: {
    domain: 'invoices',
    eventType: 'invoice.paid',
    version: 1,
    description: 'تم سداد فاتورة المستفيد بالكامل — Invoice fully paid (billing loop closed)',
    payload: {
      invoiceId: 'string',
      invoiceNumber: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      totalAmount: 'number',
      paymentMethod: 'string',
      paidAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};

// ── W1024: Teleconsultation completed → unified core ─────────────────
// A beneficiary's tele-rehab consultation reaching 'completed' is a clinical
// milestone (remote session) on the longitudinal record.

const TELECONSULTATION_EVENTS = {
  TELECONSULTATION_COMPLETED: {
    domain: 'teleconsultations',
    eventType: 'teleconsultation.completed',
    version: 1,
    description: 'اكتملت جلسة تأهيل عن بُعد للمستفيد — Tele-rehab consultation completed',
    payload: {
      teleconsultationId: 'string',
      consultationNumber: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      specialty: 'string',
      type: 'string',
      durationMinutes: 'number',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};

// ── W1025: Home visit completed → unified core ───────────────────────
// A social/family home visit reaching 'completed' is a family-engagement
// milestone on the beneficiary's longitudinal record.

const HOME_VISIT_EVENTS = {
  HOME_VISIT_COMPLETED: {
    domain: 'home-visits',
    eventType: 'home_visit.completed',
    version: 1,
    description: 'اكتملت زيارة منزلية للمستفيد — Home visit completed (family engagement)',
    payload: {
      homeVisitId: 'string',
      visitNumber: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      visitType: 'string',
      overallConcernLevel: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// ── W1026: Family counselling session completed → unified core ─────────
// A family counselling encounter reaching 'completed' is a family-wellbeing
// milestone on the beneficiary's longitudinal record.

const FAMILY_COUNSELLING_EVENTS = {
  FAMILY_COUNSELLING_COMPLETED: {
    domain: 'family-counselling',
    eventType: 'family_counselling.completed',
    version: 1,
    description: 'اكتملت جلسة إرشاد أسري — Family counselling session completed (family wellbeing)',
    payload: {
      familyCounsellingSessionId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      sessionType: 'string',
      triggerSource: 'string',
      durationMinutes: 'number',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// W1028 — Assistive-device loan lifecycle → unified core.
const ASSISTIVE_DEVICE_EVENTS = {
  ASSISTIVE_DEVICE_RETURNED: {
    domain: 'assistive-devices',
    eventType: 'assistive_device.returned',
    version: 1,
    description: 'تم إرجاع جهاز مساعد — Assistive device returned by a beneficiary (loan closed)',
    payload: {
      deviceId: 'string',
      assetTag: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      category: 'string',
      conditionOnReturn: 'string',
      returnedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// W1029 — Respite booking lifecycle → unified core.
const RESPITE_EVENTS = {
  RESPITE_COMPLETED: {
    domain: 'respite',
    eventType: 'respite.completed',
    version: 1,
    description:
      'اكتملت رعاية مؤقتة — Respite booking completed (caregiver-relief stay closed out)',
    payload: {
      respiteBookingId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      bookingType: 'string',
      nightCount: 'number',
      checkedOutAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// W1030 — Transition plan lifecycle → unified core.
const TRANSITION_EVENTS = {
  TRANSITION_COMPLETED: {
    domain: 'transition',
    eventType: 'transition.completed',
    version: 1,
    description: 'اكتملت خطة الانتقال — Transition plan completed (life-stage milestone reached)',
    payload: {
      transitionPlanId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      transitionType: 'string',
      compositeReadinessScore: 'number',
      actualTransitionDate: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// W1031 — Diet prescription lifecycle → unified core.
const DIET_PRESCRIPTION_EVENTS = {
  DIET_PRESCRIPTION_ACTIVATED: {
    domain: 'diet-prescription',
    eventType: 'diet_prescription.activated',
    version: 1,
    description:
      'تفعيل وصفة تغذية — Diet prescription activated (IDDSI / NPO / enteral plan in effect)',
    payload: {
      prescriptionId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      npo: 'boolean',
      foodIddsiLevel: 'number',
      drinkIddsiLevel: 'number',
      prescribedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// W1042 — AAC communication aid profile lifecycle → unified core.
const COMMUNICATION_AID_EVENTS = {
  COMMUNICATION_AID_ACTIVATED: {
    domain: 'communication-aid',
    eventType: 'communication_aid.activated',
    version: 1,
    description: 'تفعيل ملف وسيلة التواصل المعزز — AAC communication aid profile activated',
    payload: {
      profileId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      primaryModality: 'string',
      vocabularyLevel: 'string',
      activatedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// W1043 — AI-generated report delivery → unified core.
const AI_REPORT_EVENTS = {
  AI_REPORT_SENT: {
    domain: 'ai-report',
    eventType: 'ai_report.sent',
    version: 1,
    description:
      'إرسال تقرير مولّد بالذكاء الاصطناعي — AI-generated report delivered to the family',
    payload: {
      reportId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      reportType: 'string',
      sentVia: 'string',
      sentAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// W1044 — Adaptive sports program completion → unified core.
const ADAPTIVE_SPORTS_EVENTS = {
  ADAPTIVE_SPORTS_COMPLETED: {
    domain: 'adaptive-sports',
    eventType: 'adaptive_sports.completed',
    version: 1,
    description: 'إتمام برنامج رياضة تكيفية — Adaptive sports program completed',
    payload: {
      programId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      sport: 'string',
      endDate: 'date',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// W1045 — Individual Education Plan activation → unified core.
const IEP_EVENTS = {
  IEP_ACTIVATED: {
    domain: 'iep',
    eventType: 'iep.activated',
    version: 1,
    description:
      'تفعيل الخطة التربوية الفردية — Individual Education Plan activated (signed & in effect)',
    payload: {
      iepId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      planType: 'string',
      planYear: 'number',
      activatedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// W1046 — Vaccination administered → unified core.
const VACCINATION_EVENTS = {
  VACCINATION_ADMINISTERED: {
    domain: 'vaccination',
    eventType: 'vaccination.administered',
    version: 1,
    description: 'إعطاء تطعيم للمستفيد — Vaccination administered',
    payload: {
      vaccinationId: 'string',
      beneficiaryId: 'string',
      vaccine: 'string',
      doseNumber: 'number',
      administeredAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// W1047 — Family home program completed → unified core.
const FAMILY_HOME_PROGRAM_EVENTS = {
  FAMILY_HOME_PROGRAM_COMPLETED: {
    domain: 'family-home-program',
    eventType: 'family_home_program.completed',
    version: 1,
    description: 'اكتمال برنامج منزلي أسري — Family home program completed',
    payload: {
      programId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      title: 'string',
      endDate: 'date',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

// W1048 — Spasticity injection completed → unified core.
const SPASTICITY_INJECTION_EVENTS = {
  SPASTICITY_INJECTION_COMPLETED: {
    domain: 'spasticity-injection',
    eventType: 'spasticity_injection.completed',
    version: 1,
    description: 'اكتمال حقنة التشنج العضلي — Spasticity injection procedure completed',
    payload: {
      injectionId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      agent: 'string',
      procedureDate: 'date',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const PROSTHETIC_ORTHOTIC_EVENTS = {
  PROSTHETIC_ORTHOTIC_DELIVERED: {
    domain: 'prosthetic-orthotic-order',
    eventType: 'prosthetic_orthotic.delivered',
    version: 1,
    description: 'تسليم الجهاز التقويمي/الطرف الصناعي — Prosthetic/orthotic device delivered',
    payload: {
      orderId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      deviceCategory: 'string',
      deliveredDate: 'date',
      deliveredAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const SEATING_POSTURAL_EVENTS = {
  SEATING_POSTURAL_FINALIZED: {
    domain: 'seating-postural-assessment',
    eventType: 'seating_postural.finalized',
    version: 1,
    description: 'اعتماد تقييم الجلوس والوضعية — Seating & postural assessment finalized',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      assessmentType: 'string',
      pressureInjuryRisk: 'string',
      finalizedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const SENSORY_DIET_EVENTS = {
  SENSORY_DIET_COMPLETED: {
    domain: 'sensory-diet-program',
    eventType: 'sensory_diet.completed',
    version: 1,
    description: 'إكمال برنامج الحمية الحسية — Sensory diet program completed',
    payload: {
      programId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const PRIOR_AUTHORIZATION_EVENTS = {
  PRIOR_AUTHORIZATION_APPROVED: {
    domain: 'prior-authorization',
    eventType: 'prior_authorization.approved',
    version: 1,
    description: 'اعتماد الموافقة المسبقة — Prior authorization approved',
    payload: {
      authorizationId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      serviceType: 'string',
      approvedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const PLAN_REVIEW_EVENTS = {
  PLAN_REVIEW_RECORDED: {
    domain: 'plan-review',
    eventType: 'plan_review.recorded',
    version: 1,
    description: 'تسجيل مراجعة خطة الرعاية — Care plan review recorded',
    payload: {
      reviewId: 'string',
      beneficiaryId: 'string',
      reviewType: 'string',
      progressRating: 'string',
      reviewDate: 'date',
      recordedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const SWALLOW_STUDY_EVENTS = {
  SWALLOW_STUDY_COMPLETED: {
    domain: 'instrumental-swallow-study',
    eventType: 'swallow_study.completed',
    version: 1,
    description: 'إكمال دراسة البلع الأداتية — Instrumental swallow study completed',
    payload: {
      studyId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      studyType: 'string',
      aspirationDetected: 'boolean',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const CRISIS_INCIDENT_EVENTS = {
  CRISIS_INCIDENT_RESOLVED: {
    domain: 'crisis-incident',
    eventType: 'crisis_incident.resolved',
    version: 1,
    description: 'حل حادثة أزمة — Crisis incident resolved',
    payload: {
      incidentId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      crisisType: 'string',
      severity: 'string',
      resolvedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const IQ_ASSESSMENT_EVENTS = {
  IQ_ASSESSMENT_COMPLETED: {
    domain: 'iq-assessment',
    eventType: 'iq_assessment.completed',
    version: 1,
    description: 'إكمال تقييم الذكاء — IQ assessment completed',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      instrumentType: 'string',
      fullScaleIQ: 'number',
      classificationBand: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const CREATIVE_ARTS_THERAPY_EVENTS = {
  CREATIVE_ARTS_THERAPY_COMPLETED: {
    domain: 'creative-arts-therapy',
    eventType: 'creative_arts_therapy.completed',
    version: 1,
    description: 'إكمال جلسة العلاج بالفنون الإبداعية — Creative arts therapy session completed',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      modality: 'string',
      engagementLevel: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const INSURANCE_ELIGIBILITY_EVENTS = {
  INSURANCE_ELIGIBILITY_CHECKED: {
    domain: 'insurance-eligibility',
    eventType: 'insurance_eligibility.checked',
    version: 1,
    description: 'إجراء فحص أهلية التأمين — Insurance eligibility check recorded',
    payload: {
      checkId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      checkType: 'string',
      isEligible: 'boolean',
      checkedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const MORNING_HEALTH_CHECK_EVENTS = {
  MORNING_HEALTH_CHECK_FLAGGED: {
    domain: 'morning-health-check',
    eventType: 'morning_health_check.flagged',
    version: 1,
    description: 'فحص صحي صباحي مُعلَّم (مراقبة/إرجاع للمنزل) — Morning health check flagged',
    payload: {
      checkId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      decision: 'string',
      temperatureC: 'number',
      flaggedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const DIFFERENTIAL_DIAGNOSIS_EVENTS = {
  DIFFERENTIAL_DIAGNOSIS_CONFIRMED: {
    domain: 'differential-diagnosis',
    eventType: 'differential_diagnosis.confirmed',
    version: 1,
    description: 'تأكيد التشخيص التفريقي (CDSS) — Differential diagnosis confirmed',
    payload: {
      diagnosisId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      confirmedDiagnosisId: 'string',
      confirmedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const COMMUNITY_REFERRAL_EVENTS = {
  COMMUNITY_REFERRAL_COMPLETED: {
    domain: 'community-referral',
    eventType: 'community_referral.completed',
    version: 1,
    description: 'إكمال إحالة مجتمعية — Community referral completed',
    payload: {
      referralId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      referralType: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const CLINICAL_PATHWAY_EVENTS = {
  CLINICAL_PATHWAY_COMPLETED: {
    domain: 'clinical-pathway',
    eventType: 'clinical_pathway.completed',
    version: 1,
    description: 'إكمال مسار سريري موحد — Clinical pathway plan completed',
    payload: {
      planId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      pathwayType: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const AAC_PROFILE_EVENTS = {
  AAC_PECS_PHASE_ADVANCED: {
    domain: 'aac-profile',
    eventType: 'aac_profile.pecs_phase_advanced',
    version: 1,
    description: 'تقدّم مرحلة PECS للتواصل البديل — AAC PECS phase advanced',
    payload: {
      profileId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      pecsPhase: 'number',
      primaryModality: 'string',
      advancedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const PAIN_ASSESSMENT_EVENTS = {
  PAIN_ASSESSMENT_FINALIZED: {
    domain: 'pain-assessment',
    eventType: 'pain_assessment.finalized',
    version: 1,
    description: 'اعتماد تقييم الألم — Pain assessment finalized',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      scale: 'string',
      score: 'number',
      painPresent: 'boolean',
      significant: 'boolean',
      finalizedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const DYSPHAGIA_ASSESSMENT_EVENTS = {
  DYSPHAGIA_ASSESSMENT_FINALIZED: {
    domain: 'dysphagia-assessment',
    eventType: 'dysphagia_assessment.finalized',
    version: 1,
    description: 'اعتماد تقييم البلع — Dysphagia (swallow) assessment finalized',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      screeningTool: 'string',
      aspirationRisk: 'string',
      npoRecommended: 'boolean',
      unsafe: 'boolean',
      recommendedIddsiFood: 'string',
      finalizedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const ALLERGY_EVENTS = {
  ALLERGY_RECORDED: {
    domain: 'allergy',
    eventType: 'allergy.recorded',
    version: 1,
    description: 'تسجيل حساسية للمستفيد — Beneficiary allergy recorded (safety)',
    payload: {
      allergyId: 'string',
      beneficiaryId: 'string',
      substance: 'string',
      severity: 'string',
      severe: 'boolean',
      recordedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const DTT_SESSION_EVENTS = {
  DTT_SESSION_COMPLETED: {
    domain: 'dtt-session',
    eventType: 'dtt_session.completed',
    version: 1,
    description: 'اكتمال جلسة المحاولات المنفصلة (ABA) — DTT session completed',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      programArea: 'string',
      totalTrials: 'number',
      independentCorrectRate: 'number',
      masteryCount: 'number',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const GOAL_PROGRESS_EVENTS = {
  GOAL_PROGRESS_ACHIEVED: {
    domain: 'goal-progress',
    eventType: 'goal_progress.goal_achieved',
    version: 1,
    description: 'تحقّق هدف علاجي (نسبة ≥ 100%) — Rehab goal achieved',
    payload: {
      snapshotId: 'string',
      beneficiaryId: 'string',
      goalId: 'string',
      goalName: 'string',
      progressPct: 'number',
      measuredAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const ADJUNCT_THERAPY_EVENTS = {
  ADJUNCT_THERAPY_COMPLETED: {
    domain: 'adjunct-therapy',
    eventType: 'adjunct_therapy.session_completed',
    version: 1,
    description: 'اكتمال جلسة علاج مساند (مائي/خيول/حيوان) — Adjunct therapy session completed',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      modality: 'string',
      beneficiaryResponse: 'string',
      hadIncident: 'boolean',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const DISABILITY_CARD_EVENTS = {
  DISABILITY_CARD_REGISTERED: {
    domain: 'disability-card',
    eventType: 'disability_card.registered',
    version: 1,
    description: 'تسجيل بطاقة إعاقة للمستفيد — Beneficiary disability card registered',
    payload: {
      cardId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      disabilityLevel: 'string',
      cardNumber: 'string',
      expiryDate: 'date',
      monthlySubsidySAR: 'number',
      registeredAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const PORTFOLIO_EVENTS = {
  PORTFOLIO_MILESTONE_ADDED: {
    domain: 'portfolio',
    eventType: 'portfolio.milestone_added',
    version: 1,
    description: 'إضافة إنجاز/معلَم إلى بورتفوليو الطفل — Beneficiary portfolio milestone added',
    payload: {
      itemId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      type: 'string',
      title: 'string',
      achievementDate: 'date',
      addedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const PHYSIOTHERAPY_ASSESSMENT_EVENTS = {
  PHYSIOTHERAPY_ASSESSMENT_FINALIZED: {
    domain: 'physiotherapy-assessment',
    eventType: 'physiotherapy_assessment.finalized',
    version: 1,
    description: 'اعتماد تقييم علاج طبيعي — Physiotherapy assessment finalized',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      assessmentType: 'string',
      mobilityStatus: 'string',
      homeProgramGiven: 'boolean',
      finalizedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const BENEFICIARY_CONTRACT_EVENTS = {
  SERVICE_CONTRACT_ACTIVATED: {
    domain: 'beneficiary-contract',
    eventType: 'beneficiary_contract.activated',
    version: 1,
    description: 'تفعيل عقد خدمة المستفيد مع المركز — Beneficiary service contract activated',
    payload: {
      contractId: 'string',
      beneficiaryId: 'string',
      contractNumber: 'string',
      startDate: 'date',
      endDate: 'date',
      totalAmount: 'number',
      currency: 'string',
      activatedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const SUBSIDY_ENTRY_EVENTS = {
  SUBSIDY_PAYMENT_RECEIVED: {
    domain: 'subsidy-entry',
    eventType: 'subsidy_entry.received',
    version: 1,
    description: 'استلام إعانة/معاش مالي للمستفيد — Beneficiary subsidy payment received',
    payload: {
      entryId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      subsidyType: 'string',
      amountSAR: 'number',
      year: 'number',
      month: 'number',
      receivedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const SPONSORSHIP_EVENTS = {
  SPONSORSHIP_ACTIVATED: {
    domain: 'sponsorship',
    eventType: 'sponsorship.activated',
    version: 1,
    description: 'تفعيل كفالة المستفيد من متبرع — Beneficiary sponsorship (kafala) activated',
    payload: {
      sponsorshipId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      sponsorshipType: 'string',
      monthlyAmount: 'number',
      currency: 'string',
      isZakat: 'boolean',
      startDate: 'date',
      activatedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const TOILETING_EVENT_EVENTS = {
  POTTY_REQUEST_MILESTONE: {
    domain: 'toileting-event',
    eventType: 'toileting_event.potty_requested',
    version: 1,
    description:
      'طلب الطفل الذهاب للحمام — تقدّم في التدريب على استخدام الحمام — Child requested potty (toilet-training progress)',
    payload: {
      eventId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      type: 'string',
      eventTime: 'date',
      requestedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const HOME_CARRYOVER_EVENTS = {
  HOME_PRACTICE_COMPLETED: {
    domain: 'home-carryover',
    eventType: 'home_carryover.completed',
    version: 1,
    description:
      'سجّل ولي الأمر تنفيذ تمرين منزلي — إشارة مشاركة أسرية إيجابية — Guardian logged a completed home-practice activity',
    payload: {
      entryId: 'string',
      beneficiaryId: 'string',
      outcome: 'string',
      loggedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const MEDICATION_ORDER_EVENTS = {
  MEDICATION_ORDER_STARTED: {
    domain: 'medication-order',
    eventType: 'medication_order.activated',
    version: 1,
    description:
      'بدء وصفة دواء فعّالة جديدة للمستفيد — A new active medication order was started for the beneficiary',
    payload: {
      orderId: 'string',
      beneficiaryId: 'string',
      name: 'string',
      rxNormId: 'string',
      startedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const FAMILY_VISIT_EVENTS = {
  FAMILY_VISIT_APPROVED: {
    domain: 'family-visit',
    eventType: 'family_visit.approved',
    version: 1,
    description:
      'تمت الموافقة على طلب زيارة الأهل لمشاهدة جلسة/فصل — A family visit request to observe a session was approved',
    payload: {
      requestId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      requestedDate: 'date',
      slot: 'string',
      sessionType: 'string',
      approvedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const BIP_FIDELITY_EVENTS = {
  BIP_FIDELITY_CHECKED: {
    domain: 'bip-fidelity',
    eventType: 'bip_fidelity.checked',
    version: 1,
    description:
      'تسجيل فحص دقّة تطبيق خطة التدخل السلوكي — A BIP fidelity check was recorded for the beneficiary',
    payload: {
      checkId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      fidelityPercent: 'number',
      status: 'string',
      checkedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const GOAL_ENTRY_EVENTS = {
  GOAL_PROGRESS_RECORDED: {
    domain: 'goal-entry',
    eventType: 'goal_entry.recorded',
    version: 1,
    description:
      'تسجيل تقدّم على هدف ضمن الخطة العلاجية — A goal progress entry was recorded for the beneficiary',
    payload: {
      entryId: 'string',
      beneficiaryId: 'string',
      carePlanId: 'string',
      goalId: 'string',
      progressPercent: 'number',
      recordedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const CDSS_RISK_EVENTS = {
  CDSS_RISK_ASSESSED: {
    domain: 'cdss-risk',
    eventType: 'cdss_risk.assessed',
    version: 1,
    description:
      'تسجيل تقييم مخاطر سريري (CDSS) للمستفيد — A clinical decision-support risk assessment was recorded',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      assessmentType: 'string',
      riskLevel: 'string',
      totalScore: 'number',
      assessmentDate: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const RED_FLAG_EVENTS = {
  RED_FLAG_RAISED: {
    domain: 'red-flag',
    eventType: 'red_flag.raised',
    version: 1,
    description:
      'رفع علامة خطر سريرية على المستفيد — A clinical red flag was raised for the beneficiary',
    payload: {
      beneficiaryId: 'string',
      flagId: 'string',
      severity: 'string',
      domain: 'string',
      blocking: 'boolean',
      raisedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const SESSION_ATTENDANCE_EVENTS = {
  SESSION_ATTENDANCE_MISSED: {
    domain: 'session-attendance',
    eventType: 'session_attendance.missed',
    version: 1,
    description:
      'تغيّب المستفيد عن جلسة علاجية (no_show / absent) — The beneficiary missed a therapy session',
    payload: {
      attendanceId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      sessionId: 'string',
      status: 'string',
      billable: 'boolean',
      scheduledDate: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const NPS_RESPONSE_EVENTS = {
  NPS_RESPONSE_RECORDED: {
    domain: 'nps-response',
    eventType: 'nps_response.recorded',
    version: 1,
    description:
      'تسجيل استبيان رضا الأسرة (NPS) للمستفيد — A family NPS satisfaction response was recorded',
    payload: {
      responseId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      surveyKey: 'string',
      score: 'number',
      bucket: 'string',
      submittedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const DAILY_COMM_LOG_EVENTS = {
  DAILY_COMM_LOG_PUBLISHED: {
    domain: 'daily-comm-log',
    eventType: 'daily_comm_log.published',
    version: 1,
    description:
      'نشر دفتر التواصل اليومي للمستفيد — A daily parent communication log was published',
    payload: {
      logId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      date: 'date',
      mood: 'string',
      engagement: 'string',
      authorName: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const CONSENT_RECORD_EVENTS = {
  CONSENT_GRANTED: {
    domain: 'consent-record',
    eventType: 'consent_record.granted',
    version: 1,
    description:
      'منح موافقة موثّقة باسم المستفيد (PDPL/CBAHI) — A documented consent was granted for the beneficiary',
    payload: {
      consentId: 'string',
      beneficiaryId: 'string',
      type: 'string',
      grantedAt: 'date',
      expiresAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const RISK_SNAPSHOT_EVENTS = {
  RISK_SNAPSHOT_ESCALATED: {
    domain: 'risk-snapshot',
    eventType: 'risk_snapshot.escalated',
    version: 1,
    description:
      'ارتفاع مستوى المخاطر الإكلينيكية للمستفيد في لقطة المخاطر — The beneficiary risk tier escalated in a snapshot',
    payload: {
      snapshotId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      overallTier: 'string',
      previousTier: 'string',
      tierDelta: 'string',
      overallScore: 'number',
      computedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const PROGRESS_REPORT_EVENTS = {
  PROGRESS_REPORT_RECORDED: {
    domain: 'progress-report',
    eventType: 'progress_report.recorded',
    version: 1,
    description:
      'تسجيل تقرير التقدّم الشهري للمستفيد — A monthly beneficiary progress report was recorded',
    payload: {
      reportId: 'string',
      beneficiaryId: 'string',
      month: 'string',
      academicScore: 'number',
      attendanceRate: 'number',
      overallPerformance: 'string',
      recordedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const DAY_ATTENDANCE_EVENTS = {
  DAY_ATTENDANCE_PRESENT: {
    domain: 'day-attendance',
    eventType: 'day_attendance.present',
    version: 1,
    description:
      'حضور المستفيد اليومي في مركز التأهيل النهاري — Beneficiary marked present for the day at the day-rehab center',
    payload: {
      attendanceId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      date: 'date',
      status: 'string',
      checkInTime: 'date',
      arrivedByBus: 'boolean',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const WAITING_LIST_EVENTS = {
  WAITING_LIST_JOINED: {
    domain: 'waiting-list',
    eventType: 'waiting_list.joined',
    version: 1,
    description:
      'إدراج المستفيد في قائمة انتظار خدمة جديدة — A known beneficiary joined the waiting list for a new service line',
    payload: {
      entryId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      serviceType: 'string',
      priority: 'number',
      requestedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const PICKUP_AUTHORIZATION_EVENTS = {
  PICKUP_AUTHORIZATION_REQUESTED: {
    domain: 'pickup-authorization',
    eventType: 'pickup_authorization.requested',
    version: 1,
    description:
      'إنشاء تصريح استلام للمستفيد من قبل شخص مفوّض — A pickup authorization was created for the beneficiary',
    payload: {
      authorizationId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      pickupPersonName: 'string',
      pickupPersonRelationship: 'string',
      validFrom: 'date',
      validUntil: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const MEAL_EVENT_EVENTS = {
  MEAL_ALLERGY_INCIDENT: {
    domain: 'meal-event',
    eventType: 'meal_event.allergy_incident',
    version: 1,
    description:
      'تسجيل حادثة حساسية غذائية أثناء وجبة للمستفيد — An allergy incident was recorded during a beneficiary meal',
    payload: {
      mealEventId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      date: 'date',
      mealType: 'string',
      refusedItems: 'array',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const CDSS_ALERT_EVENTS = {
  CDSS_ALERT_RAISED: {
    domain: 'cdss-alert',
    eventType: 'cdss_alert.raised',
    version: 1,
    description:
      'إطلاق تنبيه دعم قرار سريري حرج/طارئ للمستفيد — A critical/emergency CDSS alert was raised for a beneficiary',
    payload: {
      alertId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      alertType: 'string',
      severity: 'string',
      message: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const GAS_SNAPSHOT_EVENTS = {
  GAS_SCORE_SNAPSHOTTED: {
    domain: 'gas-snapshot',
    eventType: 'gas_snapshot.recorded',
    version: 1,
    description:
      'تسجيل لقطة درجة تحقيق الأهداف GAS للمستفيد — A GAS T-score snapshot was recorded for a beneficiary',
    payload: {
      snapshotId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      tScore: 'number',
      snapshotType: 'string',
      goalCount: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const PDPL_REQUEST_EVENTS = {
  PDPL_REQUEST_RECEIVED: {
    domain: 'pdpl-request',
    eventType: 'pdpl_request.received',
    version: 1,
    description:
      'استلام طلب حقوق صاحب بيانات (PDPL) من المستفيد — A PDPL data-subject request was received for a beneficiary',
    payload: {
      requestId: 'string',
      beneficiaryId: 'string',
      requestType: 'string',
      status: 'string',
      requestedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const BIP_EFFECTIVENESS_EVENTS = {
  BIP_EFFECTIVENESS_RECORDED: {
    domain: 'bip-effectiveness',
    eventType: 'bip_effectiveness.recorded',
    version: 1,
    description:
      'تسجيل قراءة فعّالية خطة التدخل السلوكي للمستفيد — A BIP effectiveness reading was recorded for a beneficiary',
    payload: {
      readingId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      fbaAssessmentId: 'string',
      percentChangeFromBaseline: 'number',
      measuredAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const SEAT_ALLOCATION_EVENTS = {
  SEAT_ALLOCATION_ASSIGNED: {
    domain: 'seat-allocation',
    eventType: 'seat_allocation.assigned',
    version: 1,
    description:
      'تخصيص مقعد يومي للمستفيد في مركز التأهيل النهاري — A day-center seat was allocated to a beneficiary',
    payload: {
      allocationId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      seatLabel: 'string',
      period: 'string',
      effectiveFrom: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const STUDENT_ACTIVITY_EVENTS = {
  STUDENT_ACTIVITY_COMPLETED: {
    domain: 'student-activity',
    eventType: 'student_activity.completed',
    version: 1,
    description:
      'إكمال المستفيد لنشاط علاجي محفّز في بوابة الطالب — A gamified student activity was completed by a beneficiary',
    payload: {
      activityId: 'string',
      beneficiaryId: 'string',
      kind: 'string',
      xpReward: 'number',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const STORY_BOOK_EVENTS = {
  STORY_BOOK_PUBLISHED: {
    domain: 'story-book',
    eventType: 'story_book.published',
    version: 1,
    description:
      'نشر كتاب قصة المستفيد الفترية لمشاركته مع الأسرة — A beneficiary quarterly story book was published',
    payload: {
      storyBookId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      periodType: 'string',
      coverage: 'number',
      publishedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const GAS_SCORING_EVENTS = {
  GAS_SCORING_RECORDED: {
    domain: 'gas-scoring',
    eventType: 'gas_scoring.recorded',
    version: 1,
    description:
      'تسجيل مستوى تحقيق هدف على مقياس GAS للمستفيد — A beneficiary goal-attainment level was scored on a GAS scale',
    payload: {
      scoringId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      goalId: 'string',
      achievedLevel: 'number',
      purpose: 'string',
      metExpected: 'boolean',
      scoredAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const SPEECH_SESSION_EVENTS = {
  SPEECH_SESSION_ANALYZED: {
    domain: 'speech-session',
    eventType: 'speech_session.analyzed',
    version: 1,
    description:
      'اكتمال تحليل تسجيل جلسة النطق للمستفيد وتوفر المؤشرات الصوتية واللغوية — A beneficiary speech-session recording finished analysis and metrics are available',
    payload: {
      recordingId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      sessionId: 'string',
      transcriptLanguage: 'string',
      transcriptConfidence: 'number',
      analysisProvider: 'string',
      analysisCompletedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const PORTAL_PAYMENT_EVENTS = {
  PORTAL_PAYMENT_PAID: {
    domain: 'portal-payment',
    eventType: 'portal_payment.paid',
    version: 1,
    description:
      'سداد دفعة فاتورة المستفيد عبر بوابة ولي الأمر — A beneficiary portal invoice was paid in full by the guardian',
    payload: {
      paymentId: 'string',
      beneficiaryId: 'string',
      guardianId: 'string',
      branchId: 'string',
      invoiceNumber: 'string',
      amount: 'number',
      currency: 'string',
      paymentMethod: 'string',
      paidDate: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const CAREGIVER_SUPPORT_EVENTS = {
  CAREGIVER_SUPPORT_COMPLETED: {
    domain: 'caregiver-support',
    eventType: 'caregiver_support.completed',
    version: 1,
    description:
      'إتمام مقدّم الرعاية لبرنامج دعم أسري (إرشاد/تدريب/مجموعة دعم) — A caregiver completed a family-support program (counseling, training, or support group)',
    payload: {
      programId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      programType: 'string',
      sessionsCount: 'number',
      satisfactionScore: 'number',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const COUPON_USAGE_EVENTS = {
  COUPON_USAGE_REDEEMED: {
    domain: 'coupon-usage',
    eventType: 'coupon_usage.redeemed',
    version: 1,
    description:
      'استخدام المستفيد لكوبون خصم على طلب/فاتورة — A beneficiary redeemed a discount coupon against an order or invoice',
    payload: {
      usageId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      couponId: 'string',
      discountAmount: 'number',
      orderAmount: 'number',
      usedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const INSURANCE_POLICY_EVENTS = {
  INSURANCE_POLICY_ACTIVATED: {
    domain: 'insurance-policy',
    eventType: 'insurance_policy.activated',
    version: 1,
    description:
      'تفعيل وثيقة تأمين للمستفيد (إصدار جديد أو استئناف نشط) — A beneficiary insurance policy became active (newly issued or resumed)',
    payload: {
      policyId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      policyNumber: 'string',
      memberId: 'string',
      planType: 'string',
      startDate: 'date',
      endDate: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const RED_FLAG_OVERRIDE_EVENTS = {
  RED_FLAG_OVERRIDE_RECORDED: {
    domain: 'red-flag-override',
    eventType: 'red_flag_override.recorded',
    version: 1,
    description:
      'تجاوز سريري لعلامة حمراء حاجبة لبدء جلسة المستفيد — سجل أدلة CBAHI — A clinician overrode a blocking red flag to start a beneficiary session (CBAHI evidence trail)',
    payload: {
      overrideId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      overriddenBy: 'string',
      reason: 'string',
      blockingFlagCount: 'number',
      sessionId: 'string',
      therapistId: 'string',
      overriddenAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const SMART_SCHEDULER_EVENTS = {
  SMART_SCHEDULER_ACTIVATED: {
    domain: 'smart-scheduler',
    eventType: 'smart_scheduler.activated',
    version: 1,
    description:
      'تفعيل جدول ذكي للمستفيد بعد اعتماده — A smart schedule for a beneficiary was approved and activated',
    payload: {
      schedulerId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      programId: 'string',
      frequency: 'string',
      planStartDate: 'date',
      planEndDate: 'date',
      activatedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const STORY_SURFACE_EVENTS = {
  STORY_SURFACE_PUBLISHED: {
    domain: 'story-surface',
    eventType: 'story_surface.published',
    version: 1,
    description:
      'نشر سرد قصصي مخصص لجمهور المستفيد (أسري/شقيق/سريري...) — An audience-specific story surface variant was published for a beneficiary',
    payload: {
      variantId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      storyBookId: 'string',
      surfaceType: 'string',
      lang: 'string',
      publishedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const ARVR_SESSION_EVENTS = {
  ARVR_SESSION_COMPLETED: {
    domain: 'arvr-session',
    eventType: 'arvr_session.completed',
    version: 1,
    description:
      'اكتملت جلسة تأهيل بالواقع الافتراضي/المعزّز للمستفيد — An AR/VR rehabilitation session for a beneficiary was completed',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      therapistId: 'string',
      technologyType: 'string',
      plannedDurationMinutes: 'number',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const PROGRAM_ENROLLMENT_EVENTS = {
  PROGRAM_ENROLLMENT_ACTIVATED: {
    domain: 'program-enrollment',
    eventType: 'program_enrollment.activated',
    version: 1,
    description:
      'أصبح التحاق المستفيد ببرنامج تأهيلي نشطاً — A beneficiary program enrollment became active',
    payload: {
      enrollmentId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      programId: 'string',
      groupId: 'string',
      leadTherapistId: 'string',
      activatedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const FAMILY_COMMUNICATION_EVENTS = {
  FAMILY_COMMUNICATION_LOGGED: {
    domain: 'family-communication',
    eventType: 'family_communication.logged',
    version: 1,
    description:
      'تم تسجيل تواصل مع أسرة المستفيد — A family communication touchpoint for a beneficiary was logged',
    payload: {
      communicationId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      episodeId: 'string',
      familyMemberId: 'string',
      type: 'string',
      direction: 'string',
      communicatedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const WORKFLOW_TASK_EVENTS = {
  WORKFLOW_TASK_COMPLETED: {
    domain: 'workflow-task',
    eventType: 'workflow_task.completed',
    version: 1,
    description:
      'اكتملت مهمة سير عمل ضمن حلقة رعاية المستفيد — A beneficiary care-workflow task was completed',
    payload: {
      taskId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      episodeId: 'string',
      type: 'string',
      phase: 'string',
      completedBy: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const BEHAVIOR_RECORD_EVENTS = {
  BEHAVIOR_RECORD_LOGGED: {
    domain: 'behavior-record',
    eventType: 'behavior_record.logged',
    version: 1,
    description:
      'تم تسجيل ملاحظة سلوكية (ABC) للمستفيد — A beneficiary behavior (ABC) record was logged',
    payload: {
      recordId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      episodeId: 'string',
      behaviorPlanId: 'string',
      reportedBy: 'string',
      topography: 'string',
      setting: 'string',
      occurredAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const MEASURE_REASSESSMENT_EVENTS = {
  MEASURE_REASSESSMENT_COMPLETED: {
    domain: 'measure-reassessment',
    eventType: 'measure_reassessment.completed',
    version: 1,
    description:
      'اكتملت مهمة إعادة تطبيق مقياس للمستفيد — A beneficiary measure-reassessment task was completed',
    payload: {
      taskId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      measureCode: 'string',
      measureId: 'string',
      phase: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}; // ═══════════════════════════════════════════════════════════════════════════════

const MEASURE_ALERT_EVENTS = Object.freeze({
  MEASURE_ALERT_RAISED: {
    domain: 'measure-alert',
    eventType: 'measure_alert.raised',
    version: 1,
    description:
      'A measure-driven alert (regression / plateau / MCID / forecast) was raised for a beneficiary.',
    payload: {
      alertId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      measureCode: 'string',
      measureId: 'string',
      alertType: 'string',
      severity: 'string',
      raisedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}); // ═══ W1116 — measure-alert raised → unified core timeline ═══

const MEASURE_BASELINE_EVENTS = Object.freeze({
  MEASURE_BASELINE_COMPLETED: {
    domain: 'measure-baseline',
    eventType: 'measure_baseline.completed',
    version: 1,
    description:
      'A baseline measurement slot was completed for a beneficiary (first application of a tracked measure).',
    payload: {
      slotId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      episodeId: 'string',
      measureCode: 'string',
      measureId: 'string',
      baselineApplicationId: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}); // ═══ W1117 — measure-baseline completed → unified core timeline ═══

const WORKFLOW_TRANSITION_EVENTS = Object.freeze({
  WORKFLOW_TRANSITION_RECORDED: {
    domain: 'workflow-transition',
    eventType: 'workflow_transition.recorded',
    version: 1,
    description:
      'A care-workflow phase transition was recorded for a beneficiary (audit-grade move between care phases).',
    payload: {
      logId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      episodeId: 'string',
      fromPhase: 'string',
      toPhase: 'string',
      status: 'string',
      executedBy: 'string',
      transitionedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}); // ═══ W1118 — workflow phase transition recorded → unified core timeline ═══

const GENERATED_REPORT_EVENTS = Object.freeze({
  GENERATED_REPORT_COMPLETED: {
    domain: 'generated-report',
    eventType: 'generated_report.completed',
    version: 1,
    description:
      'A scoped analytics report finished generating (status completed) for a beneficiary.',
    payload: {
      reportId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      templateCode: 'string',
      scope: 'string',
      title: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}); // ═══ W1119 — generated beneficiary report completed → unified core timeline ═══

const DECISION_ALERT_EVENTS = Object.freeze({
  DECISION_ALERT_RAISED: {
    domain: 'decision-alert',
    eventType: 'decision_alert.raised',
    version: 1,
    description:
      'A decision-support alert was raised for a beneficiary (clinical risk, treatment gap, KPI breach, etc.).',
    payload: {
      alertId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      episodeId: 'string',
      category: 'string',
      severity: 'string',
      title: 'string',
      raisedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}); // ═══ W1120 — decision-support alert raised → unified core timeline ═══

const GAS_SCALE_EVENTS = Object.freeze({
  GAS_SCALE_ACTIVATED: {
    domain: 'gas-scale',
    eventType: 'gas_scale.activated',
    version: 1,
    description:
      'A Goal-Attainment-Scaling scale was activated for a beneficiary therapeutic goal (definition/version live).',
    payload: {
      scaleId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      goalId: 'string',
      domain: 'string',
      titleAr: 'string',
      version: 'number',
      activatedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}); // ═══ W1121 — GAS scale activated → unified core timeline ═══

const QUALITY_AUDIT_RECORD_EVENTS = Object.freeze({
  QUALITY_AUDIT_RECORD_COMPLETED: {
    domain: 'quality-audit-record',
    eventType: 'quality_audit_record.completed',
    version: 1,
    description:
      'A beneficiary-scoped quality/compliance audit finished with an overall score and compliance level.',
    payload: {
      auditId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      episodeId: 'string',
      overallScore: 'number',
      complianceLevel: 'string',
      auditType: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}); // ═══ W1122 — beneficiary quality audit completed → unified core timeline ═══

const CLINICAL_RISK_SCORE_EVENTS = Object.freeze({
  CLINICAL_RISK_SCORE_ESCALATED: {
    domain: 'clinical-risk-score',
    eventType: 'clinical_risk_score.escalated',
    version: 1,
    description:
      'A rule-engine clinical risk score reached high/critical for a beneficiary (new reading or worsening trend).',
    payload: {
      riskScoreId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      episodeId: 'string',
      totalScore: 'number',
      previousScore: 'number',
      riskLevel: 'string',
      trend: 'string',
      escalatedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}); // ═══ W1131 — clinical risk score escalated → unified core timeline ═══

const CORRECTIVE_ACTION_EVENTS = Object.freeze({
  CORRECTIVE_ACTION_OPENED: {
    domain: 'corrective-action',
    eventType: 'corrective_action.opened',
    version: 1,
    description:
      'A beneficiary-scoped corrective action was opened (auto-created from a quality audit finding or manually by a quality supervisor).',
    payload: {
      correctiveActionId: 'string',
      auditId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      episodeId: 'string',
      actionType: 'string',
      severity: 'string',
      title: 'string',
      dueDate: 'date',
      openedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}); // ═══ W1134 — beneficiary corrective action opened → unified core timeline ═══

const BENEFICIARY_TRANSFER_EVENTS = Object.freeze({
  BENEFICIARY_TRANSFER_COMPLETED: {
    domain: 'beneficiary-transfer',
    eventType: 'transfer.completed',
    version: 1,
    description:
      'A beneficiary transfer between branches was completed (beneficiary moved to the destination branch).',
    payload: {
      transferId: 'string',
      beneficiaryId: 'string',
      fromBranchId: 'string',
      toBranchId: 'string',
      transferDate: 'date',
      continuePlan: 'boolean',
      transferRecords: 'boolean',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}); // ═══ W1135 — beneficiary branch transfer completed → unified core timeline ═══

const COMPLAINT_EVENTS = Object.freeze({
  COMPLAINT_RESOLVED: {
    domain: 'complaint',
    eventType: 'complaint.resolved',
    version: 1,
    description:
      'A beneficiary-linked complaint was resolved (advocate involvement guaranteed by the W465 CRPD Article 12 invariant).',
    payload: {
      complaintId: 'string',
      complaintNumber: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      type: 'string',
      priority: 'string',
      source: 'string',
      advocateInvolved: 'boolean',
      resolvedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
}); // ═══ W1136 — beneficiary-linked complaint resolved → unified core timeline ═══

// ═══════════════════════════════════════════════════════════════════════════════
//  Authorization Events — أحداث التراخيص العلاجية
// ═══════════════════════════════════════════════════════════════════════════════

const AUTHORIZATION_EVENTS = Object.freeze({
  TREATMENT_AUTHORIZATION_DECIDED: {
    domain: 'authorization',
    eventType: 'treatment.authorization_decided',
    version: 1,
    description: 'تم اتخاذ قرار الترخيص العلاجي — Treatment authorization decided',
    payload: {
      authorizationId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      decision: 'string',
      decidedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline'],
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Care-Coordination Events — أحداث تنسيق الرعاية
// ═══════════════════════════════════════════════════════════════════════════════

const CARE_COORDINATION_EVENTS = Object.freeze({
  MDT_MEETING_COMPLETED: {
    domain: 'care-coordination',
    eventType: 'mdt.meeting_completed',
    version: 1,
    description: 'اكتمل اجتماع الفريق متعدد التخصصات — MDT meeting completed',
    payload: {
      meetingId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      purpose: 'string',
      completedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },

  CONSULTATION_ANSWERED: {
    domain: 'care-coordination',
    eventType: 'consultation.answered',
    version: 1,
    description: 'تم الرد على استشارة المعالج — Therapist consultation answered',
    payload: {
      consultationId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      topic: 'string',
      answeredBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CDSS Events — أحداث دعم القرار السريري
// ═══════════════════════════════════════════════════════════════════════════════

const CDSS_EVENTS = Object.freeze({
  ALERT_RESOLVED: {
    domain: 'cdss',
    eventType: 'alert.resolved',
    version: 1,
    description: 'تم حل تنبيه دعم القرار السريري — CDSS alert resolved',
    payload: {
      alertId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      alertType: 'string',
      resolvedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Clinical Assessment Events — أحداث التقييمات السريرية
// ═══════════════════════════════════════════════════════════════════════════════

const CLINICAL_ASSESSMENT_EVENTS = Object.freeze({
  ADL_ASSESSMENT_COMPLETED: {
    domain: 'clinical-assessment',
    eventType: 'adl.assessment_completed',
    version: 1,
    description: 'تم اعتماد تقييم الأنشطة اليومية — ADL assessment completed',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      assessmentType: 'string',
      assessedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },

  INTEGRATION_ASSESSMENT_COMPLETED: {
    domain: 'clinical-assessment',
    eventType: 'integration.assessment_completed',
    version: 1,
    description: 'تم اعتماد تقييم الاندماج — Integration assessment completed',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      assessmentType: 'string',
      overallIntegrationScore: 'number',
      assessedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },

  ICF_ASSESSMENT_APPROVED: {
    domain: 'clinical-assessment',
    eventType: 'icf.assessment_approved',
    version: 1,
    description: 'تم اعتماد تقييم ICF — ICF assessment approved',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      assessmentType: 'string',
      icfVersion: 'string',
      approvedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Self-Advocacy Events — أحداث التأكد الذاتي
// ═══════════════════════════════════════════════════════════════════════════════

const SELF_ADVOCACY_EVENTS = Object.freeze({
  PLAN_COMPLETED: {
    domain: 'self-advocacy',
    eventType: 'self_advocacy.plan_completed',
    version: 1,
    description: 'تم إكمال خطة التأكد الذاتي — Self-advocacy plan completed',
    payload: {
      planId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      track: 'string',
      completedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Decision-Rights Events — أحداث تقييم حقوق القرار
// ═══════════════════════════════════════════════════════════════════════════════

const DECISION_RIGHTS_EVENTS = Object.freeze({
  ASSESSMENT_FINALIZED: {
    domain: 'decision-rights',
    eventType: 'assessment.finalized',
    version: 1,
    description: 'تم اعتماد تقييم حقوق القرار — Decision-rights assessment finalized',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      decisionType: 'string',
      capacity: 'object',
      finalizedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Independent-Living Events — أحداث الحياة المستقلة
// ═══════════════════════════════════════════════════════════════════════════════

const INDEPENDENT_LIVING_EVENTS = Object.freeze({
  PLAN_COMPLETED: {
    domain: 'independent-living',
    eventType: 'independent_living.plan_completed',
    version: 1,
    description: 'تم إكمال خطة الحياة المستقلة — Independent-living plan completed',
    payload: {
      planId: 'string',
      beneficiaryId: 'string',
      title: 'string',
      completedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Clinical Safety Events — أحداث السلامة السريرية
// ═══════════════════════════════════════════════════════════════════════════════

const CLINICAL_SAFETY_EVENTS = Object.freeze({
  FALLS_ASSESSMENT_FINALIZED: {
    domain: 'clinical-safety',
    eventType: 'falls.assessment_finalized',
    version: 1,
    description: 'تم اعتماد تقييم خطر السقوط — Falls risk assessment finalized',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      riskLevel: 'string',
      assessedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards'],
  },

  PRESSURE_INJURY_IDENTIFIED: {
    domain: 'clinical-safety',
    eventType: 'pressure_injury.identified',
    version: 1,
    description: 'تم تحديد إصابة ضغط — Pressure injury identified',
    payload: {
      recordId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      stage: 'string',
      identifiedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards'],
  },

  PRESSURE_INJURY_RESOLVED: {
    domain: 'clinical-safety',
    eventType: 'pressure_injury.resolved',
    version: 1,
    description: 'تم علاج إصابة ضغط — Pressure injury resolved',
    payload: {
      recordId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      resolvedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  SLEEP_ASSESSMENT_FINALIZED: {
    domain: 'clinical-safety',
    eventType: 'sleep.assessment_finalized',
    version: 1,
    description: 'تم اعتماد تقييم النوم — Sleep assessment finalized',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      sleepDisorder: 'string',
      assessedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  OM_ASSESSMENT_FINALIZED: {
    domain: 'clinical-safety',
    eventType: 'om.assessment_finalized',
    version: 1,
    description: 'تم اعتماد تقييم التوجه والتنقل — Orientation/mobility assessment finalized',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      outcome: 'string',
      assessedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  DRIVING_ASSESSMENT_FINALIZED: {
    domain: 'clinical-safety',
    eventType: 'driving.assessment_finalized',
    version: 1,
    description: 'تم اعتماد تقييم القيادة — Driving rehabilitation assessment finalized',
    payload: {
      assessmentId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      fitToDrive: 'boolean',
      assessedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  MEDICATION_RECONCILED: {
    domain: 'clinical-safety',
    eventType: 'medication.reconciled',
    version: 1,
    description: 'تم تسوية الأدوية — Medication reconciliation completed',
    payload: {
      reconciliationId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      discrepancies: 'number',
      reconciledBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards'],
  },

  INFECTION_CASE_OPENED: {
    domain: 'clinical-safety',
    eventType: 'infection.case_opened',
    version: 1,
    description: 'تم فتح حالة عدوى — Infection surveillance case opened',
    payload: {
      caseId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      infectionType: 'string',
      openedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards'],
  },

  INFECTION_CASE_RESOLVED: {
    domain: 'clinical-safety',
    eventType: 'infection.case_resolved',
    version: 1,
    description: 'تم إغلاق حالة عدوى — Infection surveillance case resolved',
    payload: {
      caseId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
      resolution: 'string',
      resolvedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },
});

// ── W974/W1430 restored cross-domain contracts ───────────────────────────────
// These contracts back the timeline subscribers restored in W1430 and whose
// producers already exist in the codebase (OfficialLetter, EpisodeOfCare,
// Waitlist, InsuranceClaim, FamilyHomeProgram/HomeAssignment, PostRehabCase,
// FollowUpVisit, and the bridged SessionService cancel/no-show events).

const OFFICIAL_LETTER_EVENTS = Object.freeze({
  ISSUED: {
    domain: 'official-letter',
    eventType: 'official_letter.issued',
    version: 1,
    description: 'تم إصدار خطاب رسمي — Official letter issued',
    payload: {
      letterId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      letterType: 'string',
      issuedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },

  REVOKED: {
    domain: 'official-letter',
    eventType: 'official_letter.revoked',
    version: 1,
    description: 'تم إلغاء خطاب رسمي — Official letter revoked',
    payload: {
      letterId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      letterType: 'string',
      revokedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },
});

const CARETEAM_EVENTS = Object.freeze({
  MEMBER_ADDED: {
    domain: 'careteam',
    eventType: 'careteam.member_added',
    version: 1,
    description: 'تم إضافة عضو لفريق الرعاية — Care-team member added',
    payload: {
      episodeId: 'string',
      beneficiaryId: 'string',
      userId: 'string',
      role: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },

  MEMBER_REMOVED: {
    domain: 'careteam',
    eventType: 'careteam.member_removed',
    version: 1,
    description: 'تمت إزالة عضو من فريق الرعاية — Care-team member removed',
    payload: {
      episodeId: 'string',
      beneficiaryId: 'string',
      userId: 'string',
      role: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },

  LEAD_CHANGED: {
    domain: 'careteam',
    eventType: 'careteam.lead_changed',
    version: 1,
    description: 'تم تغيير قائد فريق الرعاية — Care-team lead changed',
    payload: {
      episodeId: 'string',
      beneficiaryId: 'string',
      previousLeadId: 'string',
      newLeadId: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },
});

const WAITLIST_EVENTS = Object.freeze({
  ADDED: {
    domain: 'waitlist',
    eventType: 'waitlist.added',
    version: 1,
    description: 'تمت إضافة متقدم جديد لقائمة الانتظار — Waitlist entry added',
    payload: {
      waitlistEntryId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      applicantName: 'string',
      addedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },

  BOOKED: {
    domain: 'waitlist',
    eventType: 'waitlist.booked',
    version: 1,
    description: 'تم حجز موعد لمتقدم من قائمة الانتظار — Waitlist entry booked',
    payload: {
      waitlistEntryId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      appointmentId: 'string',
      bookedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },
});

const INSURANCE_OUTCOME_EVENTS = Object.freeze({
  CLAIM_APPROVED: {
    domain: 'insurance',
    eventType: 'claim.approved',
    version: 1,
    description: 'تمت الموافقة على مطالبة تأمين — Insurance claim approved',
    payload: {
      claimId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      claimNumber: 'string',
      approvedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },

  CLAIM_REJECTED: {
    domain: 'insurance',
    eventType: 'claim.rejected',
    version: 1,
    description: 'تم رفض مطالبة تأمين — Insurance claim rejected',
    payload: {
      claimId: 'string',
      beneficiaryId: 'string',
      branchId: 'string',
      claimNumber: 'string',
      reason: 'string',
      rejectedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline'],
  },
});

const HOME_PROGRAM_EVENTS = Object.freeze({
  ASSIGNED: {
    domain: 'home_program',
    eventType: 'home_program.assigned',
    version: 1,
    description: 'تم تكليف برنامج منزلي — Home program assigned',
    payload: {
      programId: 'string',
      beneficiaryId: 'string',
      programType: 'string',
      title: 'string',
      assignedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },

  COMPLETED: {
    domain: 'home_program',
    eventType: 'home_program.completed',
    version: 1,
    description: 'تم إكمال برنامج منزلي — Home program completed',
    payload: {
      programId: 'string',
      beneficiaryId: 'string',
      programType: 'string',
      title: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },
});

const FOLLOWUP_EVENTS = Object.freeze({
  CASE_COMPLETED: {
    domain: 'followup',
    eventType: 'case.completed',
    version: 1,
    description: 'تم إغلاق حالة متابعة ما بعد التأهيل — Post-rehab case completed',
    payload: {
      caseId: 'string',
      beneficiaryId: 'string',
      completedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },

  CASE_LOST: {
    domain: 'followup',
    eventType: 'case.lost',
    version: 1,
    description: 'فُقدت حالة متابعة ما بعد التأهيل — Post-rehab case lost',
    payload: {
      caseId: 'string',
      beneficiaryId: 'string',
      lostAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline'],
  },

  VISIT_ATTENDED: {
    domain: 'followup',
    eventType: 'visit.attended',
    version: 1,
    description: 'تم حضور زيارة متابعة — Post-rehab follow-up visit attended',
    payload: {
      visitId: 'string',
      beneficiaryId: 'string',
      caseId: 'string',
      visitType: 'string',
      attendedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline'],
  },

  VISIT_MISSED: {
    domain: 'followup',
    eventType: 'visit.missed',
    version: 1,
    description: 'تم تفويت زيارة متابعة — Post-rehab follow-up visit missed',
    payload: {
      visitId: 'string',
      beneficiaryId: 'string',
      caseId: 'string',
      visitType: 'string',
      missedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline'],
  },
});

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
  safety: SAFETY_EVENTS,
  screenings: SCREENING_EVENTS,
  medications: MEDICATION_EVENTS,
  discharge: DISCHARGE_EVENTS,
  admissions: ADMISSION_EVENTS,
  referrals: REFERRAL_EVENTS,
  'medical-referrals': MEDICAL_REFERRAL_EVENTS,
  measurements: MEASUREMENT_EVENTS,
  'insurance-claims': INSURANCE_CLAIM_EVENTS,
  invoices: INVOICE_EVENTS,
  teleconsultations: TELECONSULTATION_EVENTS,
  'home-visits': HOME_VISIT_EVENTS,
  'family-counselling': FAMILY_COUNSELLING_EVENTS,
  'assistive-devices': ASSISTIVE_DEVICE_EVENTS,
  respite: RESPITE_EVENTS,
  transition: TRANSITION_EVENTS,
  'diet-prescription': DIET_PRESCRIPTION_EVENTS,
  'communication-aid': COMMUNICATION_AID_EVENTS,
  'ai-report': AI_REPORT_EVENTS,
  'adaptive-sports': ADAPTIVE_SPORTS_EVENTS,
  iep: IEP_EVENTS,
  vaccination: VACCINATION_EVENTS,
  'family-home-program': FAMILY_HOME_PROGRAM_EVENTS,
  'spasticity-injection': SPASTICITY_INJECTION_EVENTS,
  'prosthetic-orthotic-order': PROSTHETIC_ORTHOTIC_EVENTS,
  'seating-postural-assessment': SEATING_POSTURAL_EVENTS,
  'sensory-diet-program': SENSORY_DIET_EVENTS,
  'prior-authorization': PRIOR_AUTHORIZATION_EVENTS,
  'plan-review': PLAN_REVIEW_EVENTS,
  'instrumental-swallow-study': SWALLOW_STUDY_EVENTS,
  'crisis-incident': CRISIS_INCIDENT_EVENTS,
  'iq-assessment': IQ_ASSESSMENT_EVENTS,
  'creative-arts-therapy': CREATIVE_ARTS_THERAPY_EVENTS,
  'insurance-eligibility': INSURANCE_ELIGIBILITY_EVENTS,
  'morning-health-check': MORNING_HEALTH_CHECK_EVENTS,
  'differential-diagnosis': DIFFERENTIAL_DIAGNOSIS_EVENTS,
  'community-referral': COMMUNITY_REFERRAL_EVENTS,
  'clinical-pathway': CLINICAL_PATHWAY_EVENTS,
  'aac-profile': AAC_PROFILE_EVENTS,
  'pain-assessment': PAIN_ASSESSMENT_EVENTS,
  'dysphagia-assessment': DYSPHAGIA_ASSESSMENT_EVENTS,
  allergy: ALLERGY_EVENTS,
  'dtt-session': DTT_SESSION_EVENTS,
  'goal-progress': GOAL_PROGRESS_EVENTS,
  'adjunct-therapy': ADJUNCT_THERAPY_EVENTS,
  'disability-card': DISABILITY_CARD_EVENTS,
  portfolio: PORTFOLIO_EVENTS,
  'physiotherapy-assessment': PHYSIOTHERAPY_ASSESSMENT_EVENTS,
  'beneficiary-contract': BENEFICIARY_CONTRACT_EVENTS,
  'subsidy-entry': SUBSIDY_ENTRY_EVENTS,
  sponsorship: SPONSORSHIP_EVENTS,
  'toileting-event': TOILETING_EVENT_EVENTS,
  'home-carryover': HOME_CARRYOVER_EVENTS,
  'medication-order': MEDICATION_ORDER_EVENTS,
  'student-activity': STUDENT_ACTIVITY_EVENTS,
  'family-visit': FAMILY_VISIT_EVENTS,
  'bip-fidelity': BIP_FIDELITY_EVENTS,
  'goal-entry': GOAL_ENTRY_EVENTS,
  'cdss-risk': CDSS_RISK_EVENTS,
  'red-flag': RED_FLAG_EVENTS,
  'session-attendance': SESSION_ATTENDANCE_EVENTS,
  'nps-response': NPS_RESPONSE_EVENTS,
  'daily-comm-log': DAILY_COMM_LOG_EVENTS,
  'consent-record': CONSENT_RECORD_EVENTS,
  'risk-snapshot': RISK_SNAPSHOT_EVENTS,
  'progress-report': PROGRESS_REPORT_EVENTS,
  'day-attendance': DAY_ATTENDANCE_EVENTS,
  'waiting-list': WAITING_LIST_EVENTS,
  'pickup-authorization': PICKUP_AUTHORIZATION_EVENTS,
  'meal-event': MEAL_EVENT_EVENTS,
  'cdss-alert': CDSS_ALERT_EVENTS,
  'gas-snapshot': GAS_SNAPSHOT_EVENTS,
  'pdpl-request': PDPL_REQUEST_EVENTS,
  'bip-effectiveness': BIP_EFFECTIVENESS_EVENTS,
  'seat-allocation': SEAT_ALLOCATION_EVENTS,
  'story-book': STORY_BOOK_EVENTS,
  'gas-scoring': GAS_SCORING_EVENTS,
  'speech-session': SPEECH_SESSION_EVENTS,
  'portal-payment': PORTAL_PAYMENT_EVENTS,
  'caregiver-support': CAREGIVER_SUPPORT_EVENTS,
  'coupon-usage': COUPON_USAGE_EVENTS,
  'insurance-policy': INSURANCE_POLICY_EVENTS,
  'red-flag-override': RED_FLAG_OVERRIDE_EVENTS,
  'smart-scheduler': SMART_SCHEDULER_EVENTS,
  'story-surface': STORY_SURFACE_EVENTS,
  'arvr-session': ARVR_SESSION_EVENTS,
  'program-enrollment': PROGRAM_ENROLLMENT_EVENTS,
  'family-communication': FAMILY_COMMUNICATION_EVENTS,
  'workflow-task': WORKFLOW_TASK_EVENTS,
  'behavior-record': BEHAVIOR_RECORD_EVENTS,
  'measure-reassessment': MEASURE_REASSESSMENT_EVENTS,
  'measure-alert': MEASURE_ALERT_EVENTS,
  'measure-baseline': MEASURE_BASELINE_EVENTS,
  'workflow-transition': WORKFLOW_TRANSITION_EVENTS,
  'generated-report': GENERATED_REPORT_EVENTS,
  'decision-alert': DECISION_ALERT_EVENTS,
  'gas-scale': GAS_SCALE_EVENTS,
  'quality-audit-record': QUALITY_AUDIT_RECORD_EVENTS,
  'clinical-risk-score': CLINICAL_RISK_SCORE_EVENTS,
  'corrective-action': CORRECTIVE_ACTION_EVENTS,
  'beneficiary-transfer': BENEFICIARY_TRANSFER_EVENTS,
  complaint: COMPLAINT_EVENTS,
  'clinical-safety': CLINICAL_SAFETY_EVENTS,
  'clinical-assessment': CLINICAL_ASSESSMENT_EVENTS,
  'self-advocacy': SELF_ADVOCACY_EVENTS,
  'decision-rights': DECISION_RIGHTS_EVENTS,
  'independent-living': INDEPENDENT_LIVING_EVENTS,
  authorization: AUTHORIZATION_EVENTS,
  'care-coordination': CARE_COORDINATION_EVENTS,
  cdss: CDSS_EVENTS,
  'official-letter': OFFICIAL_LETTER_EVENTS,
  careteam: CARETEAM_EVENTS,
  waitlist: WAITLIST_EVENTS,
  insurance: INSURANCE_OUTCOME_EVENTS,
  home_program: HOME_PROGRAM_EVENTS,
  followup: FOLLOWUP_EVENTS,
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
  SAFETY_EVENTS,
  SCREENING_EVENTS,
  MEDICATION_EVENTS,
  MEASUREMENT_EVENTS,
  INSURANCE_CLAIM_EVENTS,
  INVOICE_EVENTS,
  TELECONSULTATION_EVENTS,
  HOME_VISIT_EVENTS,
  FAMILY_COUNSELLING_EVENTS,
  ASSISTIVE_DEVICE_EVENTS,
  RESPITE_EVENTS,
  TRANSITION_EVENTS,
  DIET_PRESCRIPTION_EVENTS,
  COMMUNICATION_AID_EVENTS,
  AI_REPORT_EVENTS,
  ADAPTIVE_SPORTS_EVENTS,
  IEP_EVENTS,
  VACCINATION_EVENTS,
  FAMILY_HOME_PROGRAM_EVENTS,
  SPASTICITY_INJECTION_EVENTS,
  PROSTHETIC_ORTHOTIC_EVENTS,
  SEATING_POSTURAL_EVENTS,
  SENSORY_DIET_EVENTS,
  PRIOR_AUTHORIZATION_EVENTS,
  PLAN_REVIEW_EVENTS,
  SWALLOW_STUDY_EVENTS,
  CRISIS_INCIDENT_EVENTS,
  IQ_ASSESSMENT_EVENTS,
  CREATIVE_ARTS_THERAPY_EVENTS,
  INSURANCE_ELIGIBILITY_EVENTS,
  MORNING_HEALTH_CHECK_EVENTS,
  DIFFERENTIAL_DIAGNOSIS_EVENTS,
  COMMUNITY_REFERRAL_EVENTS,
  CLINICAL_PATHWAY_EVENTS,
  AAC_PROFILE_EVENTS,
  PAIN_ASSESSMENT_EVENTS,
  DYSPHAGIA_ASSESSMENT_EVENTS,
  ALLERGY_EVENTS,
  DTT_SESSION_EVENTS,
  GOAL_PROGRESS_EVENTS,
  ADJUNCT_THERAPY_EVENTS,
  DISABILITY_CARD_EVENTS,
  PORTFOLIO_EVENTS,
  PHYSIOTHERAPY_ASSESSMENT_EVENTS,
  BENEFICIARY_CONTRACT_EVENTS,
  SUBSIDY_ENTRY_EVENTS,
  SPONSORSHIP_EVENTS,
  TOILETING_EVENT_EVENTS,
  HOME_CARRYOVER_EVENTS,
  MEDICATION_ORDER_EVENTS,
  STUDENT_ACTIVITY_EVENTS,
  FAMILY_VISIT_EVENTS,
  BIP_FIDELITY_EVENTS,
  GOAL_ENTRY_EVENTS,
  CDSS_RISK_EVENTS,
  RED_FLAG_EVENTS,
  SESSION_ATTENDANCE_EVENTS,
  NPS_RESPONSE_EVENTS,
  DAILY_COMM_LOG_EVENTS,
  CONSENT_RECORD_EVENTS,
  RISK_SNAPSHOT_EVENTS,
  PROGRESS_REPORT_EVENTS,
  DAY_ATTENDANCE_EVENTS,
  WAITING_LIST_EVENTS,
  PICKUP_AUTHORIZATION_EVENTS,
  MEAL_EVENT_EVENTS,
  CDSS_ALERT_EVENTS,
  GAS_SNAPSHOT_EVENTS,
  PDPL_REQUEST_EVENTS,
  BIP_EFFECTIVENESS_EVENTS,
  SEAT_ALLOCATION_EVENTS,
  STORY_BOOK_EVENTS,
  GAS_SCORING_EVENTS,
  SPEECH_SESSION_EVENTS,
  PORTAL_PAYMENT_EVENTS,
  CAREGIVER_SUPPORT_EVENTS,
  COUPON_USAGE_EVENTS,
  INSURANCE_POLICY_EVENTS,
  RED_FLAG_OVERRIDE_EVENTS,
  SMART_SCHEDULER_EVENTS,
  STORY_SURFACE_EVENTS,
  ARVR_SESSION_EVENTS,
  PROGRAM_ENROLLMENT_EVENTS,
  FAMILY_COMMUNICATION_EVENTS,
  WORKFLOW_TASK_EVENTS,
  BEHAVIOR_RECORD_EVENTS,
  MEASURE_REASSESSMENT_EVENTS,
  MEASURE_ALERT_EVENTS,
  MEASURE_BASELINE_EVENTS,
  WORKFLOW_TRANSITION_EVENTS,
  GENERATED_REPORT_EVENTS,
  DECISION_ALERT_EVENTS,
  GAS_SCALE_EVENTS,
  QUALITY_AUDIT_RECORD_EVENTS,
  CLINICAL_RISK_SCORE_EVENTS,
  CORRECTIVE_ACTION_EVENTS,
  BENEFICIARY_TRANSFER_EVENTS,
  COMPLAINT_EVENTS,
  CLINICAL_SAFETY_EVENTS,
  CLINICAL_ASSESSMENT_EVENTS,
  SELF_ADVOCACY_EVENTS,
  DECISION_RIGHTS_EVENTS,
  INDEPENDENT_LIVING_EVENTS,
  AUTHORIZATION_EVENTS,
  CARE_COORDINATION_EVENTS,
  CDSS_EVENTS,
  OFFICIAL_LETTER_EVENTS,
  CARETEAM_EVENTS,
  WAITLIST_EVENTS,
  INSURANCE_OUTCOME_EVENTS,
  HOME_PROGRAM_EVENTS,
  FOLLOWUP_EVENTS,
  DDD_CONTRACTS,
  getDDDContractStats,
};

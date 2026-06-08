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
  DISCHARGE_EVENTS,
  ADMISSION_EVENTS,
  DDD_CONTRACTS,
  getDDDContractStats,
};

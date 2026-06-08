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

  // W977 — re-add contracts for the session.cancelled / session.no_show
  // subscribers a parallel session landed (producers exist via SessionService
  // emits + serviceEventBridge); W377 had deleted these contracts, leaving the
  // re-added subscribers orphan (W389 red).
  CANCELLED: {
    domain: 'sessions',
    eventType: 'session.cancelled',
    version: 1,
    description: 'تم إلغاء جلسة — Session cancelled',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      episodeId: 'string',
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
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'ai-recommendations'],
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
//  Safety Events — أحداث السلامة (W977)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Clinical safety events that MUST surface on the per-beneficiary timeline the
// moment they're recorded: a seizure (status-epilepticus = medical emergency),
// a safeguarding concern (regulatory), and a restraint/seclusion episode.
// Producers: native pre-compile post-save hooks in the respective models.
// Consumers: HIGH/CRITICAL-importance CareTimeline rows in
// dddCrossModuleSubscribers.js.

const SAFETY_EVENTS = {
  SEIZURE_RECORDED: {
    domain: 'safety',
    eventType: 'seizure.recorded',
    version: 1,
    description: 'تم تسجيل نوبة صرع — Seizure event recorded',
    payload: {
      seizureEventId: 'string',
      beneficiaryId: 'string',
      seizureType: 'string',
      severity: 'string',
      durationSeconds: 'number',
      statusEpilepticus: 'boolean',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },

  SAFEGUARDING_RAISED: {
    domain: 'safety',
    eventType: 'safeguarding.raised',
    version: 1,
    description: 'تم رفع بلاغ حماية — Safeguarding concern raised',
    payload: {
      concernId: 'string',
      beneficiaryId: 'string',
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
      restraintType: 'string',
      status: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Waitlist Events — أحداث قائمة الانتظار (W979)
// ═══════════════════════════════════════════════════════════════════════════════
//
// The start of a beneficiary's care journey: added to the waitlist, then —
// the high-value moment — BOOKED into active care (admission). Producer:
// native Waitlist post-save hooks. Consumers: CareTimeline subscribers.

const WAITLIST_EVENTS = {
  ADDED: {
    domain: 'waitlist',
    eventType: 'waitlist.added',
    version: 1,
    description: 'تمت إضافة المستفيد لقائمة الانتظار — Beneficiary waitlisted',
    payload: {
      waitlistId: 'string',
      beneficiaryId: 'string',
      department: 'string',
      priority: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  BOOKED: {
    domain: 'waitlist',
    eventType: 'waitlist.booked',
    version: 1,
    description: 'تم حجز/قبول مستفيد من قائمة الانتظار — Waitlist entry booked (admission)',
    payload: {
      waitlistId: 'string',
      beneficiaryId: 'string',
      department: 'string',
      priority: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Screening Events — أحداث الفحوصات (W980)
// ═══════════════════════════════════════════════════════════════════════════════
//
// A finalized vision/hearing screening surfaces on the timeline; outcome='refer'
// is the high-value signal (needs ophthalmology/optometry or audiology/ENT).
// Producers: native VisionScreening/HearingScreening post-save hooks.

const SCREENING_EVENTS = {
  VISION_COMPLETED: {
    domain: 'screenings',
    eventType: 'screening.vision_completed',
    version: 1,
    description: 'تم إنهاء فحص بصر — Vision screening finalized',
    payload: {
      screeningId: 'string',
      beneficiaryId: 'string',
      outcome: 'string',
      referralTo: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },

  HEARING_COMPLETED: {
    domain: 'screenings',
    eventType: 'screening.hearing_completed',
    version: 1,
    description: 'تم إنهاء فحص سمع — Hearing screening finalized',
    payload: {
      screeningId: 'string',
      beneficiaryId: 'string',
      outcome: 'string',
      lossType: 'string',
      severity: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Medication Events — أحداث الدواء (W981)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Medication administration on the timeline: an administered dose, and — the
// clinically significant signal — a dose NOT given (refused/missed/held).
// Producer: native MedicationAdministrationRecord post-save hooks.

const MEDICATION_EVENTS = {
  ADMINISTERED: {
    domain: 'medication',
    eventType: 'medication.administered',
    version: 1,
    description: 'تم إعطاء دواء — Medication administered',
    payload: {
      marId: 'string',
      beneficiaryId: 'string',
      medicationName: 'string',
      route: 'string',
      status: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  NOT_GIVEN: {
    domain: 'medication',
    eventType: 'medication.not_given',
    version: 1,
    description: 'لم يُعطَ الدواء (رفض/فوات/تأجيل) — Medication not given',
    payload: {
      marId: 'string',
      beneficiaryId: 'string',
      medicationName: 'string',
      route: 'string',
      status: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Complaint Events — أحداث الشكاوى (W984)
// ═══════════════════════════════════════════════════════════════════════════════
//
// A complaint/grievance ABOUT a beneficiary surfaces on the timeline at filing
// (CRPD-relevant). Producer: native Complaint post-save hook (beneficiary-linked
// only). Consumer: CareTimeline subscriber.

const COMPLAINT_EVENTS = {
  FILED: {
    domain: 'complaints',
    eventType: 'complaint.filed',
    version: 1,
    description: 'تم تقديم شكوى عن مستفيد — Complaint filed about a beneficiary',
    payload: {
      complaintId: 'string',
      beneficiaryId: 'string',
      type: 'string',
      category: 'string',
      subject: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'notification'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Family Events — أحداث الأسرة (W985)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Family engagement on the timeline: a completed visit (positive) and a no-show
// (disengagement signal). Producer: native FamilyVisitRequest post-save hook.

const FAMILY_EVENTS = {
  VISIT_COMPLETED: {
    domain: 'family',
    eventType: 'visit.completed',
    version: 1,
    description: 'تمت زيارة أسرية — Family visit completed',
    payload: {
      visitId: 'string',
      beneficiaryId: 'string',
      relationship: 'string',
      requestedDate: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  VISIT_NO_SHOW: {
    domain: 'family',
    eventType: 'visit.no_show',
    version: 1,
    description: 'تغيّبت الأسرة عن زيارة — Family visit no-show',
    payload: {
      visitId: 'string',
      beneficiaryId: 'string',
      relationship: 'string',
      requestedDate: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'ai-recommendations'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Lifecycle Events — أحداث الانتقال بين مراحل الحياة (W986)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Life-stage transition plans (early→school, school→work, rehab→community, …).
// A completed plan = the beneficiary successfully transitioned (positive); a
// cancelled plan = the transition was abandoned. Producer: native
// TransitionPlan post-save hook.

const LIFECYCLE_EVENTS = {
  TRANSITION_COMPLETED: {
    domain: 'lifecycle',
    eventType: 'transition.completed',
    version: 1,
    description: 'اكتملت خطة الانتقال — Life-stage transition plan completed',
    payload: {
      transitionPlanId: 'string',
      beneficiaryId: 'string',
      transitionType: 'string',
      targetPlacement: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  TRANSITION_CANCELLED: {
    domain: 'lifecycle',
    eventType: 'transition.cancelled',
    version: 1,
    description: 'أُلغيت خطة الانتقال — Life-stage transition plan cancelled',
    payload: {
      transitionPlanId: 'string',
      beneficiaryId: 'string',
      transitionType: 'string',
      targetPlacement: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'ai-recommendations'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Follow-up Events — أحداث متابعة ما بعد التأهيل (W987)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Post-rehabilitation follow-up cases. A completed case = the beneficiary was
// successfully followed through (positive); a lost-to-follow-up case = the
// beneficiary disengaged (a clinically important warning). Producer: native
// PostRehabCase post-save hook.

const FOLLOWUP_EVENTS = {
  CASE_COMPLETED: {
    domain: 'followup',
    eventType: 'case.completed',
    version: 1,
    description: 'اكتملت متابعة ما بعد التأهيل — Post-rehab follow-up case completed',
    payload: {
      caseId: 'string',
      beneficiaryId: 'string',
      caseNumber: 'string',
      originalProgramName: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  CASE_LOST: {
    domain: 'followup',
    eventType: 'case.lost',
    version: 1,
    description: 'فقدان المتابعة — Beneficiary lost to post-rehab follow-up',
    payload: {
      caseId: 'string',
      beneficiaryId: 'string',
      caseNumber: 'string',
      originalProgramName: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'ai-recommendations'],
  },

  // W992 — visit-level follow-up (companion to the case-level events above).
  // eventTypes are visit.attended/visit.missed (NOT visit.completed/no_show,
  // which the W985 family domain owns — registry-wide eventType strings are unique).
  VISIT_ATTENDED: {
    domain: 'followup',
    eventType: 'visit.attended',
    version: 1,
    description: 'حضور زيارة متابعة — Post-rehab follow-up visit attended',
    payload: {
      visitId: 'string',
      beneficiaryId: 'string',
      caseId: 'string',
      visitType: 'string',
      visitNumber: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  VISIT_MISSED: {
    domain: 'followup',
    eventType: 'visit.missed',
    version: 1,
    description: 'تغيّب عن زيارة متابعة — Post-rehab follow-up visit missed',
    payload: {
      visitId: 'string',
      beneficiaryId: 'string',
      caseId: 'string',
      visitType: 'string',
      visitNumber: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards', 'ai-recommendations'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Insurance Events — أحداث المطالبات التأمينية (W994)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Insurance-claim outcomes that gate a beneficiary's funded care. An approved
// (or partially-approved) claim = care is funded (positive); a rejected claim =
// funding denied (an actionable warning — access at risk). Producer: native
// NphiesInsuranceClaim post-save hook. (Not covered by the modelEventBridge
// finance mappings, which are invoice/payment/expense/payroll.)

const INSURANCE_EVENTS = {
  CLAIM_APPROVED: {
    domain: 'insurance',
    eventType: 'claim.approved',
    version: 1,
    description: 'اعتماد مطالبة تأمينية — Insurance claim approved (care funded)',
    payload: {
      claimId: 'string',
      beneficiaryId: 'string',
      claimNumber: 'string',
      totalAmount: 'number',
      approvedAmount: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  CLAIM_REJECTED: {
    domain: 'insurance',
    eventType: 'claim.rejected',
    version: 1,
    description: 'رفض مطالبة تأمينية — Insurance claim rejected (funding denied)',
    payload: {
      claimId: 'string',
      beneficiaryId: 'string',
      claimNumber: 'string',
      totalAmount: 'number',
      approvedAmount: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'ai-recommendations'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Referral Events — أحداث الإحالات (W997)
// ═══════════════════════════════════════════════════════════════════════════════
//
// A SHARED referral vocabulary across the 4 fragmented referral subsystems
// (medical / therapy / community / FHIR-portal). Each model's native post-save
// hook publishes the same 3 outcomes — accepted / completed / rejected — with a
// `referralType` discriminator in the payload, so the beneficiary timeline shows
// referral activity uniformly without forcing a model consolidation.

const REFERRAL_EVENTS = {
  ACCEPTED: {
    domain: 'referral',
    eventType: 'referral.accepted',
    version: 1,
    description: 'قبول إحالة — Referral accepted by the receiving service',
    payload: {
      referralId: 'string',
      beneficiaryId: 'string',
      referralType: 'string',
      status: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  COMPLETED: {
    domain: 'referral',
    eventType: 'referral.completed',
    version: 1,
    description: 'اكتمال إحالة — Referral fulfilled / completed',
    payload: {
      referralId: 'string',
      beneficiaryId: 'string',
      referralType: 'string',
      status: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  REJECTED: {
    domain: 'referral',
    eventType: 'referral.rejected',
    version: 1,
    description: 'رفض إحالة — Referral rejected / declined',
    payload: {
      referralId: 'string',
      beneficiaryId: 'string',
      referralType: 'string',
      status: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'ai-recommendations'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Consent Events — أحداث الموافقات (W1002, PDPL/CRPD)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Consent lifecycle on the beneficiary timeline. obtained = care/data processing
// permitted (positive); revoked = consent withdrawn (care/data access at risk —
// a compliance-significant warning). Producer: native Consent post-save hook.

const CONSENT_EVENTS = {
  OBTAINED: {
    domain: 'consent',
    eventType: 'consent.obtained',
    version: 1,
    description: 'منح موافقة — Consent granted for the beneficiary',
    payload: {
      consentId: 'string',
      beneficiaryId: 'string',
      consentType: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  REVOKED: {
    domain: 'consent',
    eventType: 'consent.revoked',
    version: 1,
    description: 'سحب موافقة — Consent revoked / withdrawn',
    payload: {
      consentId: 'string',
      beneficiaryId: 'string',
      consentType: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['timeline', 'dashboards', 'ai-recommendations'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Home Program Events — أحداث البرنامج المنزلي (W1003)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Parent-administered home exercise programs (care extends into the home). A
// shared vocabulary across FamilyHomeProgram + HomeAssignment, with a
// `programType` discriminator. assigned = a program was given to the family;
// completed = the program ran its course. Producer: native post-save hooks.

const HOME_PROGRAM_EVENTS = {
  ASSIGNED: {
    domain: 'home_program',
    eventType: 'home_program.assigned',
    version: 1,
    description: 'إسناد برنامج منزلي — Home program assigned to the family',
    payload: {
      programId: 'string',
      beneficiaryId: 'string',
      programType: 'string',
      title: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
  },

  COMPLETED: {
    domain: 'home_program',
    eventType: 'home_program.completed',
    version: 1,
    description: 'اكتمال برنامج منزلي — Home program completed',
    payload: {
      programId: 'string',
      beneficiaryId: 'string',
      programType: 'string',
      title: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['timeline', 'dashboards'],
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
  safety: SAFETY_EVENTS,
  waitlist: WAITLIST_EVENTS,
  screenings: SCREENING_EVENTS,
  medication: MEDICATION_EVENTS,
  complaints: COMPLAINT_EVENTS,
  family: FAMILY_EVENTS,
  lifecycle: LIFECYCLE_EVENTS,
  followup: FOLLOWUP_EVENTS,
  insurance: INSURANCE_EVENTS,
  referral: REFERRAL_EVENTS,
  consent: CONSENT_EVENTS,
  home_program: HOME_PROGRAM_EVENTS,
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
  WAITLIST_EVENTS,
  SCREENING_EVENTS,
  MEDICATION_EVENTS,
  COMPLAINT_EVENTS,
  FAMILY_EVENTS,
  LIFECYCLE_EVENTS,
  FOLLOWUP_EVENTS,
  INSURANCE_EVENTS,
  REFERRAL_EVENTS,
  CONSENT_EVENTS,
  HOME_PROGRAM_EVENTS,
  DDD_CONTRACTS,
  getDDDContractStats,
};

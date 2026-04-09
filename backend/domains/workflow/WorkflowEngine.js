/**
 * Workflow Engine — محرك سير العمل التكيفي
 *
 * State Machine مركزي يدير انتقالات مراحل الحلقة العلاجية:
 *   Referral → Intake → Triage → Assessment → MDT Review →
 *   Care Plan Approval → Active Treatment → Reassessment →
 *   Outcome Review → Discharge Planning → Discharge → Follow-up
 *
 * يدعم:
 *  - قواعد انتقال بين المراحل (Transition Rules)
 *  - موافقات مطلوبة (Required Approvals)
 *  - تنبيهات آلية (Event Hooks)
 *  - استثناءات سريرية (Exception Handling)
 *  - سجل تدقيق كامل (Audit Trail)
 *
 * @module domains/workflow/WorkflowEngine
 */

const EventEmitter = require('events');
const logger = require('../../utils/logger');

// ─── Phase Definitions ──────────────────────────────────────────────────────

/**
 * تعريف المراحل القياسية لرحلة المستفيد
 */
const PHASES = {
  referral: {
    name: 'referral',
    label: 'الإحالة',
    label_en: 'Referral',
    order: 1,
    requiredFields: ['beneficiaryId', 'referral.source'],
    requiredRoles: [],
    autoComplete: false,
    maxDays: 3,
    outputs: ['referral_document'],
    description: 'استقبال إحالة المستفيد من مصدر خارجي أو داخلي',
  },
  intake: {
    name: 'intake',
    label: 'القبول',
    label_en: 'Intake',
    order: 2,
    requiredFields: ['contactInfo', 'guardians', 'disability'],
    requiredRoles: ['coordinator', 'social_worker'],
    autoComplete: false,
    maxDays: 5,
    outputs: ['beneficiary_profile', 'consent_forms'],
    description: 'جمع البيانات الأساسية والموافقات',
  },
  triage: {
    name: 'triage',
    label: 'الفرز',
    label_en: 'Triage',
    order: 3,
    requiredFields: ['disability.type', 'disability.severity'],
    requiredRoles: ['coordinator', 'physician'],
    autoComplete: false,
    maxDays: 2,
    outputs: ['priority_level', 'service_pathway'],
    description: 'تحديد الأولوية والمسار العلاجي المناسب',
  },
  initial_assessment: {
    name: 'initial_assessment',
    label: 'التقييم الأولي',
    label_en: 'Initial Assessment',
    order: 4,
    requiredFields: [],
    requiredRoles: ['lead_therapist'],
    autoComplete: false,
    maxDays: 14,
    outputs: ['assessment_report', 'domain_scores'],
    description: 'تقييم شامل متعدد التخصصات',
    requires: {
      minAssessments: 1,
    },
  },
  mdt_review: {
    name: 'mdt_review',
    label: 'مراجعة الفريق',
    label_en: 'MDT Review',
    order: 5,
    requiredFields: [],
    requiredRoles: ['lead_therapist', 'supervisor'],
    autoComplete: false,
    maxDays: 7,
    outputs: ['mdt_decision', 'recommended_plan'],
    description: 'مراجعة الفريق متعدد التخصصات وتحديد المسار',
    requiredApprovals: ['supervisor'],
  },
  care_plan_approval: {
    name: 'care_plan_approval',
    label: 'اعتماد الخطة',
    label_en: 'Care Plan Approval',
    order: 6,
    requiredFields: [],
    requiredRoles: ['supervisor', 'coordinator'],
    autoComplete: false,
    maxDays: 5,
    outputs: ['approved_care_plan'],
    description: 'اعتماد خطة الرعاية من المشرف والمنسق',
    requires: {
      activeCarePlan: true,
    },
    requiredApprovals: ['supervisor'],
  },
  active_treatment: {
    name: 'active_treatment',
    label: 'العلاج النشط',
    label_en: 'Active Treatment',
    order: 7,
    requiredFields: [],
    requiredRoles: [],
    autoComplete: false,
    maxDays: null, // المدة حسب الخطة
    outputs: ['session_notes', 'goal_progress'],
    description: 'تنفيذ الجلسات العلاجية حسب خطة الرعاية',
  },
  reassessment: {
    name: 'reassessment',
    label: 'إعادة التقييم',
    label_en: 'Reassessment',
    order: 8,
    requiredFields: [],
    requiredRoles: ['lead_therapist'],
    autoComplete: false,
    maxDays: 14,
    outputs: ['reassessment_report', 'progress_comparison'],
    description: 'إعادة تقييم دورية لقياس التقدم',
    requires: {
      minAssessments: 1,
    },
  },
  outcome_review: {
    name: 'outcome_review',
    label: 'مراجعة النتائج',
    label_en: 'Outcome Review',
    order: 9,
    requiredFields: [],
    requiredRoles: ['lead_therapist', 'supervisor'],
    autoComplete: false,
    maxDays: 7,
    outputs: ['outcome_report', 'next_steps_decision'],
    description: 'مراجعة النتائج وتحديد الخطوة التالية',
    requiredApprovals: ['supervisor'],
  },
  discharge_planning: {
    name: 'discharge_planning',
    label: 'التخطيط للخروج',
    label_en: 'Discharge Planning',
    order: 10,
    requiredFields: [],
    requiredRoles: ['coordinator', 'social_worker'],
    autoComplete: false,
    maxDays: 7,
    outputs: ['discharge_plan', 'family_instructions'],
    description: 'إعداد خطة الخروج والتعليمات للأسرة',
  },
  discharge: {
    name: 'discharge',
    label: 'الخروج',
    label_en: 'Discharge',
    order: 11,
    requiredFields: ['dischargeReason'],
    requiredRoles: ['supervisor'],
    autoComplete: false,
    maxDays: 3,
    outputs: ['discharge_summary', 'final_report'],
    description: 'إتمام الخروج وإصدار التقرير النهائي',
    requiredApprovals: ['supervisor'],
  },
  post_discharge_followup: {
    name: 'post_discharge_followup',
    label: 'المتابعة بعد الخروج',
    label_en: 'Post-Discharge Follow-up',
    order: 12,
    requiredFields: [],
    requiredRoles: ['coordinator'],
    autoComplete: true,
    maxDays: 90,
    outputs: ['followup_notes'],
    description: 'متابعة دورية بعد الخروج',
  },
};

// ─── Transition Rules ────────────────────────────────────────────────────────

/**
 * قواعد الانتقال بين المراحل — يحدد من أين يمكن الانتقال ومتى
 */
const TRANSITIONS = {
  referral: {
    next: ['intake'],
    conditions: [],
  },
  intake: {
    next: ['triage'],
    conditions: ['beneficiary_profile_complete'],
    back: ['referral'],
  },
  triage: {
    next: ['initial_assessment'],
    conditions: ['triage_decision_made'],
    back: ['intake'],
  },
  initial_assessment: {
    next: ['mdt_review'],
    conditions: ['min_assessments_completed'],
    back: ['triage'],
  },
  mdt_review: {
    next: ['care_plan_approval', 'initial_assessment'], // يمكن الرجوع لمزيد من التقييم
    conditions: ['mdt_review_documented'],
  },
  care_plan_approval: {
    next: ['active_treatment'],
    conditions: ['care_plan_approved'],
    back: ['mdt_review'],
  },
  active_treatment: {
    next: ['reassessment', 'discharge_planning'],
    conditions: [],
    loops: true, // يمكن تكراره
  },
  reassessment: {
    next: ['outcome_review', 'active_treatment'], // استمرار أو مراجعة
    conditions: ['reassessment_completed'],
    back: ['active_treatment'],
  },
  outcome_review: {
    next: ['active_treatment', 'discharge_planning'], // استمرار أو خروج
    conditions: ['outcome_decision_made'],
  },
  discharge_planning: {
    next: ['discharge'],
    conditions: ['discharge_plan_ready'],
    back: ['active_treatment'],
  },
  discharge: {
    next: ['post_discharge_followup'],
    conditions: ['discharge_approved'],
  },
  post_discharge_followup: {
    next: [], // نهاية الرحلة
    conditions: [],
  },
};

// ─── Workflow Engine Class ──────────────────────────────────────────────────

class WorkflowEngine extends EventEmitter {
  constructor() {
    super();
    this.phases = PHASES;
    this.transitions = TRANSITIONS;
  }

  /**
   * الحصول على تعريف مرحلة
   */
  getPhaseDefinition(phaseName) {
    return this.phases[phaseName] || null;
  }

  /**
   * الحصول على كل المراحل مرتبة
   */
  getAllPhases() {
    return Object.values(this.phases).sort((a, b) => a.order - b.order);
  }

  /**
   * التحقق من إمكانية الانتقال من مرحلة لأخرى
   */
  canTransition(fromPhase, toPhase) {
    const rule = this.transitions[fromPhase];
    if (!rule) return { allowed: false, reason: `مرحلة غير معروفة: ${fromPhase}` };

    const allowedTargets = [...(rule.next || []), ...(rule.back || [])];
    if (!allowedTargets.includes(toPhase)) {
      return {
        allowed: false,
        reason: `لا يمكن الانتقال من "${this.phases[fromPhase]?.label}" إلى "${this.phases[toPhase]?.label}"`,
        allowedTargets: allowedTargets.map(t => ({ name: t, label: this.phases[t]?.label })),
      };
    }

    return { allowed: true };
  }

  /**
   * التحقق من استيفاء الشروط للانتقال
   */
  async validateTransition(episode, fromPhase, toPhase, context = {}) {
    const errors = [];
    const warnings = [];

    // 1. Check basic transition validity
    const canMove = this.canTransition(fromPhase, toPhase);
    if (!canMove.allowed) {
      errors.push(canMove.reason);
      return { valid: false, errors, warnings };
    }

    // 2. Check required fields for target phase
    const targetDef = this.phases[toPhase];
    if (targetDef?.requiredFields) {
      for (const field of targetDef.requiredFields) {
        const value = this._getNestedValue(episode, field);
        if (!value && value !== 0) {
          errors.push(`الحقل المطلوب مفقود: ${field}`);
        }
      }
    }

    // 3. Check conditions
    const sourceTransition = this.transitions[fromPhase];
    if (sourceTransition?.conditions) {
      for (const condition of sourceTransition.conditions) {
        const result = await this._evaluateCondition(condition, episode, context);
        if (!result.met) {
          errors.push(result.message);
        }
      }
    }

    // 4. Check required approvals for target phase
    if (targetDef?.requiredApprovals) {
      for (const role of targetDef.requiredApprovals) {
        if (!context.approvals?.[role]) {
          warnings.push(`يتطلب موافقة: ${role}`);
        }
      }
    }

    // 5. Check role authorization
    if (targetDef?.requiredRoles?.length > 0 && context.userRole) {
      if (!targetDef.requiredRoles.includes(context.userRole)) {
        errors.push(`الدور المطلوب: ${targetDef.requiredRoles.join(' أو ')}`);
      }
    }

    // 6. Check phase-specific requirements
    if (targetDef?.requires) {
      if (
        targetDef.requires.minAssessments &&
        context.assessmentCount < targetDef.requires.minAssessments
      ) {
        errors.push(`يجب إكمال ${targetDef.requires.minAssessments} تقييم على الأقل`);
      }
      if (targetDef.requires.activeCarePlan && !context.hasActiveCarePlan) {
        errors.push('يجب وجود خطة رعاية نشطة');
      }
    }

    // 7. Check SLA / max days warning
    const sourceDef = this.phases[fromPhase];
    if (sourceDef?.maxDays && episode.phases) {
      const currentPhaseEntry = episode.phases.find(p => p.name === fromPhase);
      if (currentPhaseEntry?.startedAt) {
        const daysInPhase = Math.floor(
          (Date.now() - new Date(currentPhaseEntry.startedAt)) / (1000 * 60 * 60 * 24)
        );
        if (daysInPhase > sourceDef.maxDays) {
          warnings.push(
            `تجاوز المدة المتوقعة (${sourceDef.maxDays} يوم) — ${daysInPhase} يوم فعلي`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * تنفيذ الانتقال بين المراحل
   */
  async executeTransition(episode, toPhase, context = {}) {
    const fromPhase = episode.currentPhase;

    // Validate
    const validation = await this.validateTransition(episode, fromPhase, toPhase, context);
    if (!validation.valid) {
      const error = new Error(`فشل الانتقال: ${validation.errors.join(', ')}`);
      error.statusCode = 400;
      error.details = validation;
      throw error;
    }

    // Log the transition
    const transitionRecord = {
      from: fromPhase,
      to: toPhase,
      executedBy: context.userId,
      executedAt: new Date(),
      warnings: validation.warnings,
      reason: context.reason || '',
    };

    // Execute
    logger.info(
      `[Workflow] Transition: ${fromPhase} → ${toPhase} | Episode: ${episode._id} | By: ${context.userId}`
    );

    // Emit events
    this.emit('transition', {
      episodeId: episode._id,
      beneficiaryId: episode.beneficiaryId,
      from: fromPhase,
      to: toPhase,
      context,
    });

    this.emit(`phase:${toPhase}:entered`, {
      episodeId: episode._id,
      beneficiaryId: episode.beneficiaryId,
      from: fromPhase,
    });

    this.emit(`phase:${fromPhase}:exited`, {
      episodeId: episode._id,
      beneficiaryId: episode.beneficiaryId,
      to: toPhase,
    });

    // Phase-specific side effects
    await this._executeSideEffects(toPhase, episode, context);

    return {
      success: true,
      transition: transitionRecord,
      warnings: validation.warnings,
    };
  }

  /**
   * معالجة الاستثناءات السريرية (تجاوز قواعد عادية)
   */
  async executeExceptionTransition(episode, toPhase, context = {}) {
    if (!context.reason) {
      const error = new Error('يجب تقديم سبب التجاوز السريري');
      error.statusCode = 400;
      throw error;
    }

    logger.warn(
      `[Workflow] EXCEPTION Transition: ${episode.currentPhase} → ${toPhase} | Episode: ${episode._id} | Reason: ${context.reason}`
    );

    this.emit('exception-transition', {
      episodeId: episode._id,
      beneficiaryId: episode.beneficiaryId,
      from: episode.currentPhase,
      to: toPhase,
      reason: context.reason,
      userId: context.userId,
    });

    return {
      success: true,
      isException: true,
      transition: {
        from: episode.currentPhase,
        to: toPhase,
        executedBy: context.userId,
        executedAt: new Date(),
        reason: context.reason,
        isException: true,
      },
    };
  }

  /**
   * الحصول على الانتقالات الممكنة من المرحلة الحالية
   */
  getAvailableTransitions(currentPhase) {
    const rule = this.transitions[currentPhase];
    if (!rule) return [];

    const targets = [...(rule.next || []), ...(rule.back || [])];
    return targets.map(t => ({
      name: t,
      label: this.phases[t]?.label,
      label_en: this.phases[t]?.label_en,
      order: this.phases[t]?.order,
      isBackward: (rule.back || []).includes(t),
      requiredRoles: this.phases[t]?.requiredRoles || [],
      requiredApprovals: this.phases[t]?.requiredApprovals || [],
      conditions: rule.conditions || [],
    }));
  }

  /**
   * حساب تقدم الرحلة
   */
  calculateJourneyProgress(episode) {
    if (!episode.phases || episode.phases.length === 0) return { percentage: 0, phase: 'referral' };

    const totalPhases = Object.keys(this.phases).length - 1; // exclude post_discharge
    const completed = episode.phases.filter(p => p.status === 'completed').length;
    const current = episode.currentPhase;
    const currentDef = this.phases[current];

    return {
      percentage: Math.round((completed / totalPhases) * 100),
      currentPhase: current,
      currentPhaseLabel: currentDef?.label,
      completedPhases: completed,
      totalPhases,
      isComplete: current === 'discharge' || current === 'post_discharge_followup',
    };
  }

  /**
   * اكتشاف التأخيرات في المراحل
   */
  detectDelays(episode) {
    const delays = [];
    if (!episode.phases) return delays;

    for (const phase of episode.phases) {
      if (phase.status !== 'in_progress') continue;

      const def = this.phases[phase.name];
      if (!def?.maxDays || !phase.startedAt) continue;

      const daysInPhase = Math.floor(
        (Date.now() - new Date(phase.startedAt)) / (1000 * 60 * 60 * 24)
      );
      if (daysInPhase > def.maxDays) {
        delays.push({
          phase: phase.name,
          label: def.label,
          maxDays: def.maxDays,
          actualDays: daysInPhase,
          severity: daysInPhase > def.maxDays * 2 ? 'critical' : 'warning',
        });
      }
    }

    return delays;
  }

  /**
   * التنبيهات المطلوبة للمرحلة الحالية
   */
  getPhaseAlerts(episode) {
    const alerts = [];
    const delays = this.detectDelays(episode);
    delays.forEach(d => {
      alerts.push({
        type: 'delay',
        severity: d.severity,
        message: `تأخر في مرحلة "${d.label}" — ${d.actualDays} يوم (الحد: ${d.maxDays})`,
        phase: d.phase,
      });
    });

    // Check for missing approvals
    const currentDef = this.phases[episode.currentPhase];
    if (currentDef?.requiredApprovals) {
      const currentPhaseEntry = episode.phases?.find(p => p.name === episode.currentPhase);
      for (const role of currentDef.requiredApprovals) {
        const approved = currentPhaseEntry?.requiredApprovals?.find(
          a => a.role === role && a.status === 'approved'
        );
        if (!approved) {
          alerts.push({
            type: 'approval_pending',
            severity: 'info',
            message: `بانتظار موافقة: ${role}`,
            phase: episode.currentPhase,
          });
        }
      }
    }

    return alerts;
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  async _evaluateCondition(condition, episode, context) {
    switch (condition) {
      case 'beneficiary_profile_complete':
        return {
          met: !!context.profileComplete || !!episode.beneficiaryId,
          message: 'يجب إكمال ملف المستفيد',
        };

      case 'triage_decision_made':
        return {
          met: !!context.triageComplete || !!episode.priority,
          message: 'يجب إكمال قرار الفرز',
        };

      case 'min_assessments_completed':
        return {
          met: (context.assessmentCount || 0) >= 1 || (episode.assessmentIds?.length || 0) >= 1,
          message: 'يجب إكمال تقييم واحد على الأقل',
        };

      case 'mdt_review_documented':
        return {
          met: !!context.mdtReviewDone,
          message: 'يجب توثيق مراجعة الفريق',
        };

      case 'care_plan_approved':
        return {
          met: !!context.carePlanApproved || !!episode.activeCarePlanId,
          message: 'يجب اعتماد خطة الرعاية',
        };

      case 'reassessment_completed':
        return {
          met: !!context.reassessmentDone,
          message: 'يجب إكمال إعادة التقييم',
        };

      case 'outcome_decision_made':
        return {
          met: !!context.outcomeDecision,
          message: 'يجب تحديد قرار المراجعة',
        };

      case 'discharge_plan_ready':
        return {
          met: !!context.dischargePlanReady,
          message: 'يجب إعداد خطة الخروج',
        };

      case 'discharge_approved':
        return {
          met: !!context.dischargeApproved,
          message: 'يجب الحصول على موافقة الخروج',
        };

      default:
        return { met: true, message: '' };
    }
  }

  async _executeSideEffects(toPhase, episode, context) {
    switch (toPhase) {
      case 'intake':
        this.emit('task:create', {
          type: 'collect_documents',
          assignTo: 'coordinator',
          episodeId: episode._id,
          beneficiaryId: episode.beneficiaryId,
          dueInDays: 5,
          title: 'جمع المستندات والموافقات',
        });
        break;

      case 'initial_assessment':
        this.emit('task:create', {
          type: 'schedule_assessment',
          assignTo: 'lead_therapist',
          episodeId: episode._id,
          beneficiaryId: episode.beneficiaryId,
          dueInDays: 14,
          title: 'جدولة التقييم الأولي',
        });
        break;

      case 'mdt_review':
        this.emit('notification:send', {
          type: 'mdt_review_scheduled',
          to: 'care_team',
          episodeId: episode._id,
          message: 'تمت جدولة مراجعة الفريق متعدد التخصصات',
        });
        break;

      case 'active_treatment':
        this.emit('task:create', {
          type: 'start_sessions',
          assignTo: 'lead_therapist',
          episodeId: episode._id,
          beneficiaryId: episode.beneficiaryId,
          title: 'بدء الجلسات العلاجية',
        });
        break;

      case 'discharge':
        this.emit('notification:send', {
          type: 'discharge_notice',
          to: 'family',
          episodeId: episode._id,
          message: 'تم إتمام خروج المستفيد',
        });
        break;
    }
  }

  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

const workflowEngine = new WorkflowEngine();

module.exports = { WorkflowEngine, workflowEngine, PHASES, TRANSITIONS };

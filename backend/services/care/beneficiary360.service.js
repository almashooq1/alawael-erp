'use strict';

/**
 * beneficiary360.service.js — Phase 17 Commit 7 (4.0.89). ⭐
 *
 * The crown jewel — aggregates every Phase-17 care subject
 * (leadFunnel, socialCase, homeVisit, welfare, community, psych,
 * independence) into one unified beneficiary profile.
 *
 * Introduces NO new collections. Purely an orchestrator — pulls
 * from the other services via injected accessors and composes
 * four views:
 *
 *   • getProfile(id, { windowDays?, include? }) — full 360 blob
 *   • getSummary(id)                            — lightweight card
 *   • getTimeline(id, { since?, limit? })       — unified event feed
 *   • getHealthScore(id)                        — cross-domain score
 *   • getAttention(id)                          — action-required list
 *
 * Services are passed as a registry object so bootstrap can inject
 * late-binding accessors and unavailable services degrade
 * gracefully (empty sections rather than hard failures).
 */

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'NOT_FOUND';
  }
}

function createBeneficiary360Service({
  services = {}, // { leadFunnel, socialCase, homeVisit, welfare, community, psych, independence }
  beneficiaryModel = null, // optional — enriches profile with demographic snapshot
  logger = console,
  now = () => new Date(),
} = {}) {
  function _svc(name) {
    const s = services[name];
    if (!s) {
      logger.warn(`[B360] service '${name}' not wired — section will be empty`);
      return null;
    }
    return s;
  }

  async function _safe(promise, fallback) {
    try {
      return await promise;
    } catch (err) {
      logger.warn(`[B360] section fetch failed: ${err.message}`);
      return fallback;
    }
  }

  // ── Beneficiary demographic snapshot ─────────────────────────────
  async function _beneficiarySnapshot(beneficiaryId) {
    if (!beneficiaryModel) return null;
    try {
      const b = await beneficiaryModel.findById(beneficiaryId);
      if (!b) return null;
      return {
        _id: String(b._id),
        fullName: b.fullName || b.name || null,
        fullNameAr: b.fullNameAr || b.nameAr || null,
        dateOfBirth: b.dateOfBirth || null,
        gender: b.gender || null,
        branchId: b.branchId ? String(b.branchId) : null,
        status: b.status || null,
        nationalId: b.nationalId || null,
      };
    } catch (_) {
      return null;
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // getProfile — full 360 blob
  // ═════════════════════════════════════════════════════════════════

  async function getProfile(beneficiaryId, { windowDays = 90, include = null } = {}) {
    if (!beneficiaryId) throw new NotFoundError('beneficiaryId required');

    const want = s => !include || include.includes(s);

    const sections = {};
    const promises = [];

    if (want('beneficiary')) {
      promises.push(
        _safe(_beneficiarySnapshot(beneficiaryId), null).then(v => {
          sections.beneficiary = v;
        })
      );
    }

    // CRM (C1) — most recent lead for context on entry path
    if (want('crm') && _svc('leadFunnel')) {
      const svc = _svc('leadFunnel');
      if (svc.list) {
        promises.push(
          _safe(svc.list({ beneficiaryId, limit: 5 }), []).then(v => {
            sections.leads = v || [];
          })
        );
      } else {
        sections.leads = [];
      }
    }

    // Social (C2)
    if (want('social') && _svc('socialCase')) {
      const svc = _svc('socialCase');
      promises.push(
        _safe(svc.list?.({ beneficiaryId, limit: 10 }) ?? Promise.resolve([]), []).then(v => {
          sections.socialCases = v || [];
          sections.activeSocialCase =
            (v || []).find(c => !['closed', 'cancelled', 'transferred'].includes(c.status)) || null;
        })
      );
    }

    // Home visits (C3)
    if (want('homeVisits') && _svc('homeVisit')) {
      const svc = _svc('homeVisit');
      promises.push(
        _safe(svc.list?.({ beneficiaryId, limit: 10 }) ?? Promise.resolve([]), []).then(v => {
          sections.homeVisits = v || [];
        })
      );
    }

    // Welfare (C4)
    if (want('welfare') && _svc('welfare')) {
      const svc = _svc('welfare');
      promises.push(
        _safe(svc.beneficiaryHistory?.(beneficiaryId) ?? Promise.resolve([]), []).then(v => {
          sections.welfareApplications = v || [];
        })
      );
    }

    // Community linkages (C4)
    if (want('community') && _svc('community')) {
      const svc = _svc('community');
      promises.push(
        _safe(
          svc.beneficiaryLinkages?.(beneficiaryId, { includeEnded: true }) ?? Promise.resolve([]),
          []
        ).then(v => {
          sections.communityLinkages = v || [];
        })
      );
    }

    // Psych (C5)
    if (want('psych') && _svc('psych')) {
      const svc = _svc('psych');
      promises.push(
        _safe(svc.listFlags?.({ beneficiaryId, limit: 20 }) ?? Promise.resolve([]), []).then(v => {
          sections.riskFlags = v || [];
        })
      );
      promises.push(
        _safe(svc.listAssessments?.({ beneficiaryId, limit: 20 }) ?? Promise.resolve([]), []).then(
          v => {
            sections.scaleAssessments = v || [];
          }
        )
      );
      promises.push(
        _safe(svc.listMdt?.({ beneficiaryId, limit: 10 }) ?? Promise.resolve([]), []).then(v => {
          sections.mdtMeetings = v || [];
        })
      );
    }

    // Independence (C6)
    if (want('independence') && _svc('independence')) {
      const svc = _svc('independence');
      promises.push(
        _safe(svc.beneficiaryActiveTransition?.(beneficiaryId) ?? Promise.resolve(null), null).then(
          v => {
            sections.activeTransitionAssessment = v;
          }
        )
      );
      promises.push(
        _safe(svc.beneficiaryIadlTrend?.(beneficiaryId) ?? Promise.resolve({ series: [] }), {
          series: [],
        }).then(v => {
          sections.iadlTrend = v;
        })
      );
      promises.push(
        _safe(
          svc.listParticipation?.({ beneficiaryId, limit: 20 }) ?? Promise.resolve([]),
          []
        ).then(v => {
          sections.participationLogs = v || [];
        })
      );
      promises.push(
        _safe(
          svc.beneficiaryParticipationAnalytics?.(beneficiaryId, { windowDays }) ??
            Promise.resolve(null),
          null
        ).then(v => {
          sections.participationAnalytics = v;
        })
      );
    }

    await Promise.all(promises);
    return {
      beneficiaryId: String(beneficiaryId),
      generatedAt: now(),
      windowDays,
      ...sections,
    };
  }

  // ═════════════════════════════════════════════════════════════════
  // getSummary — lightweight card
  // ═════════════════════════════════════════════════════════════════

  async function getSummary(beneficiaryId) {
    const profile = await getProfile(beneficiaryId, {
      include: ['beneficiary', 'social', 'homeVisits', 'psych', 'independence', 'welfare'],
    });
    const openFlags = (profile.riskFlags || []).filter(f =>
      ['active', 'monitoring', 'escalated'].includes(f.status)
    );
    const criticalFlags = openFlags.filter(f => f.severity === 'critical').length;
    const openApplications = (profile.welfareApplications || []).filter(
      a => !['closed', 'cancelled', 'appeal_rejected', 'rejected'].includes(a.status)
    );
    const nextHomeVisit =
      (profile.homeVisits || [])
        .filter(v => v.status === 'scheduled')
        .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0] || null;
    const lastIadl = profile.iadlTrend?.series?.[0] || null;

    return {
      beneficiaryId: String(beneficiaryId),
      beneficiary: profile.beneficiary,
      activeSocialCase: profile.activeSocialCase
        ? {
            id: String(profile.activeSocialCase._id),
            caseNumber: profile.activeSocialCase.caseNumber,
            status: profile.activeSocialCase.status,
            riskLevel: profile.activeSocialCase.riskLevel,
          }
        : null,
      openRiskFlagCount: openFlags.length,
      criticalRiskFlagCount: criticalFlags,
      highestFlagSeverity: _highestSeverity(openFlags),
      openWelfareApplicationCount: openApplications.length,
      nextHomeVisit: nextHomeVisit
        ? {
            id: String(nextHomeVisit._id),
            visitNumber: nextHomeVisit.visitNumber,
            scheduledFor: nextHomeVisit.scheduledFor,
          }
        : null,
      lastIadlBand: lastIadl?.band || null,
      lastIadlTotal: lastIadl?.total || null,
      activeTransitionTarget: profile.activeTransitionAssessment?.targetTransition || null,
      activeTransitionReadiness: profile.activeTransitionAssessment?.overallReadiness || null,
      generatedAt: now(),
    };
  }

  function _highestSeverity(flags) {
    const order = ['critical', 'high', 'moderate', 'low'];
    for (const s of order) {
      if (flags.some(f => f.severity === s)) return s;
    }
    return null;
  }

  // ═════════════════════════════════════════════════════════════════
  // getTimeline — unified cross-subject event feed
  // ═════════════════════════════════════════════════════════════════

  async function getTimeline(beneficiaryId, { since = null, limit = 50 } = {}) {
    const profile = await getProfile(beneficiaryId);
    const events = [];

    const pushEvent = (date, category, title, data = {}) => {
      if (!date) return;
      const d = new Date(date);
      if (since && d < new Date(since)) return;
      events.push({
        at: d,
        category,
        title,
        ...data,
      });
    };

    // Leads
    for (const l of profile.leads || []) {
      pushEvent(l.createdAt, 'crm', `Lead ${l.leadNumber || l._id} created`, {
        leadId: String(l._id),
        status: l.status,
      });
    }

    // Social cases
    for (const c of profile.socialCases || []) {
      pushEvent(c.createdAt || c.openedAt, 'social', `Social case ${c.caseNumber} opened`, {
        caseId: String(c._id),
        caseType: c.caseType,
      });
      for (const h of c.statusHistory || []) {
        pushEvent(h.at, 'social', `Case ${c.caseNumber}: ${h.from} → ${h.to}`, {
          caseId: String(c._id),
          from: h.from,
          to: h.to,
        });
      }
    }

    // Home visits
    for (const v of profile.homeVisits || []) {
      pushEvent(v.scheduledFor, 'home_visit', `Home visit ${v.visitNumber} scheduled`, {
        visitId: String(v._id),
        status: v.status,
        concernLevel: v.overallConcernLevel,
      });
      if (v.completedAt) {
        pushEvent(v.completedAt, 'home_visit', `Home visit ${v.visitNumber} completed`, {
          visitId: String(v._id),
          concernLevel: v.overallConcernLevel,
        });
      }
    }

    // Welfare
    for (const w of profile.welfareApplications || []) {
      pushEvent(
        w.createdAt,
        'welfare',
        `Welfare ${w.applicationNumber} filed (${w.applicationType})`,
        {
          applicationId: String(w._id),
          targetAgency: w.targetAgency,
        }
      );
      for (const h of w.statusHistory || []) {
        pushEvent(h.at, 'welfare', `Welfare ${w.applicationNumber}: ${h.from} → ${h.to}`, {
          applicationId: String(w._id),
        });
      }
      for (const d of w.disbursements || []) {
        pushEvent(
          d.disbursedAt,
          'welfare',
          `Welfare ${w.applicationNumber} disbursed ${d.amount} ${d.currency || 'SAR'}`,
          {
            applicationId: String(w._id),
            amount: d.amount,
          }
        );
      }
    }

    // Community linkages
    for (const l of profile.communityLinkages || []) {
      pushEvent(
        l.startDate || l.createdAt,
        'community',
        `Linked to ${l.partnerNameSnapshot || 'partner'}`,
        {
          linkageId: String(l._id),
          linkageType: l.linkageType,
          primaryPurpose: l.primaryPurpose,
        }
      );
      if (l.endDate) {
        pushEvent(
          l.endDate,
          'community',
          `Linkage with ${l.partnerNameSnapshot || 'partner'} ended`,
          {
            linkageId: String(l._id),
            endedReason: l.endedReason,
          }
        );
      }
    }

    // Psych flags
    for (const f of profile.riskFlags || []) {
      pushEvent(
        f.raisedAt,
        'psych_flag',
        `Risk flag ${f.flagNumber} raised (${f.flagType}, ${f.severity})`,
        {
          flagId: String(f._id),
          flagType: f.flagType,
          severity: f.severity,
        }
      );
      if (f.resolvedAt) {
        pushEvent(f.resolvedAt, 'psych_flag', `Risk flag ${f.flagNumber} resolved`, {
          flagId: String(f._id),
        });
      }
    }

    // Scales
    for (const a of profile.scaleAssessments || []) {
      pushEvent(
        a.administeredAt,
        'psych_scale',
        `${a.scaleCode.toUpperCase()} administered (total=${a.totalScore}, ${a.band})`,
        {
          assessmentId: String(a._id),
          scaleCode: a.scaleCode,
          totalScore: a.totalScore,
          autoFlagTriggered: a.autoFlagTriggered,
        }
      );
    }

    // MDT
    for (const m of profile.mdtMeetings || []) {
      pushEvent(m.scheduledFor, 'mdt', `MDT ${m.meetingNumber} scheduled (${m.purpose})`, {
        meetingId: String(m._id),
        purpose: m.purpose,
        status: m.status,
      });
      if (m.completedAt) {
        pushEvent(m.completedAt, 'mdt', `MDT ${m.meetingNumber} completed`, {
          meetingId: String(m._id),
        });
      }
    }

    // Independence: transition + IADL + participation
    if (profile.activeTransitionAssessment) {
      const t = profile.activeTransitionAssessment;
      pushEvent(
        t.assessedAt || t.createdAt,
        'transition',
        `Transition assessment ${t.assessmentNumber} (${t.targetTransition})`,
        {
          assessmentId: String(t._id),
          status: t.status,
          overallReadiness: t.overallReadiness,
        }
      );
    }
    for (const iadl of profile.iadlTrend?.series || []) {
      pushEvent(iadl.at, 'iadl', `IADL assessed (total=${iadl.total}, ${iadl.band})`, {
        assessmentId: iadl.assessmentId,
        total: iadl.total,
      });
    }
    for (const p of profile.participationLogs || []) {
      pushEvent(
        p.occurredAt,
        'participation',
        `${p.activityType}${p.partnerNameSnapshot ? ` @ ${p.partnerNameSnapshot}` : ''}`,
        {
          logId: String(p._id),
          activityType: p.activityType,
          outcome: p.outcome,
        }
      );
    }

    // Sort latest-first, cap
    events.sort((a, b) => b.at - a.at);
    return {
      beneficiaryId: String(beneficiaryId),
      generatedAt: now(),
      events: events.slice(0, limit),
      total: events.length,
    };
  }

  // ═════════════════════════════════════════════════════════════════
  // getHealthScore — cross-domain wellbeing score
  // ═════════════════════════════════════════════════════════════════

  /**
   * Produces three sub-scores (each 0..100) + overall:
   *
   *   mentalWellbeing    — derived from open psych flags + latest scales
   *   functionalIndependence — derived from latest IADL + transition readiness
   *   socialIntegration  — derived from active linkages + participation count
   *
   * Overall = average of the three sub-scores that have data.
   * Adds interpretive bands: concerning / watch / stable / thriving.
   */
  async function getHealthScore(beneficiaryId) {
    const profile = await getProfile(beneficiaryId, {
      include: ['psych', 'independence', 'community'],
    });

    // ── Mental wellbeing
    let mental = 75;
    const openFlags = (profile.riskFlags || []).filter(f =>
      ['active', 'monitoring', 'escalated'].includes(f.status)
    );
    for (const f of openFlags) {
      if (f.severity === 'critical') mental -= 25;
      else if (f.severity === 'high') mental -= 15;
      else if (f.severity === 'moderate') mental -= 7;
      else mental -= 2;
    }
    // Latest scale adjustment
    const latestScale = (profile.scaleAssessments || []).sort(
      (a, b) => new Date(b.administeredAt) - new Date(a.administeredAt)
    )[0];
    if (latestScale) {
      const bandBonus = {
        minimal: +10,
        normal: +10,
        mild: +3,
        moderate: -5,
        moderately_severe: -10,
        severe: -15,
        extremely_severe: -20,
      };
      mental += bandBonus[latestScale.band] ?? 0;
    }
    mental = Math.max(0, Math.min(100, Math.round(mental)));

    // ── Functional independence
    let functional = 60;
    const lastIadl = profile.iadlTrend?.series?.[0];
    if (lastIadl) {
      const bandBonus = {
        fully_dependent: -30,
        partially_dependent: -10,
        mostly_independent: +15,
        fully_independent: +30,
      };
      functional += bandBonus[lastIadl.band] ?? 0;
    }
    if (profile.activeTransitionAssessment?.overallReadiness) {
      const tierBonus = { not_ready: -15, emerging: -5, developing: +5, ready: +15 };
      functional += tierBonus[profile.activeTransitionAssessment.overallReadiness] ?? 0;
    }
    functional = Math.max(0, Math.min(100, Math.round(functional)));

    // ── Social integration
    let social = 50;
    const activeLinkages = (profile.communityLinkages || []).filter(l =>
      ['active', 'paused'].includes(l.status)
    ).length;
    social += activeLinkages * 6;
    const pa = profile.participationAnalytics;
    if (pa) {
      // +2 per logged activity, capped at +30
      social += Math.min(30, (pa.total || 0) * 2);
      if (typeof pa.positiveOutcomePct === 'number') {
        social += Math.round((pa.positiveOutcomePct - 50) / 5);
      }
    }
    social = Math.max(0, Math.min(100, Math.round(social)));

    const subscores = {
      mentalWellbeing: mental,
      functionalIndependence: functional,
      socialIntegration: social,
    };
    const overall = Math.round((mental + functional + social) / 3);
    const band = _healthBand(overall);

    return {
      beneficiaryId: String(beneficiaryId),
      generatedAt: now(),
      overall,
      band,
      subscores,
      contributors: {
        openRiskFlags: openFlags.length,
        latestScaleBand: latestScale?.band || null,
        latestIadlBand: lastIadl?.band || null,
        activeTransitionReadiness: profile.activeTransitionAssessment?.overallReadiness || null,
        activeCommunityLinkages: activeLinkages,
        recentParticipationCount: pa?.total || 0,
      },
    };
  }

  function _healthBand(score) {
    if (score < 40) return 'concerning';
    if (score < 60) return 'watch';
    if (score < 80) return 'stable';
    return 'thriving';
  }

  // ═════════════════════════════════════════════════════════════════
  // getAttention — action-required list
  // ═════════════════════════════════════════════════════════════════

  async function getAttention(beneficiaryId) {
    const profile = await getProfile(beneficiaryId);
    const items = [];

    // Open critical psych flags
    for (const f of profile.riskFlags || []) {
      if (['active', 'escalated'].includes(f.status) && f.severity === 'critical') {
        items.push({
          kind: 'critical_risk_flag',
          priority: 'critical',
          title: `Critical flag ${f.flagNumber}: ${f.flagType}`,
          ref: { flagId: String(f._id), flagNumber: f.flagNumber },
          raisedAt: f.raisedAt,
        });
      }
    }

    // High-risk active social case
    if (profile.activeSocialCase && profile.activeSocialCase.riskLevel === 'high') {
      items.push({
        kind: 'high_risk_case',
        priority: 'high',
        title: `High-risk case ${profile.activeSocialCase.caseNumber}`,
        ref: { caseId: String(profile.activeSocialCase._id) },
      });
    }

    // Overdue goals in active transition assessment
    const tra = profile.activeTransitionAssessment;
    if (tra) {
      const nowDate = now();
      for (const g of tra.goals || []) {
        if (g.status === 'pending' && g.targetDate && new Date(g.targetDate) < nowDate) {
          items.push({
            kind: 'overdue_goal',
            priority: 'normal',
            title: `Overdue goal: ${g.goal}`,
            ref: { assessmentId: String(tra._id), goalId: String(g._id) },
            dueAt: g.targetDate,
          });
        }
      }
    }

    // Welfare apps stuck in info_requested
    for (const w of profile.welfareApplications || []) {
      if (w.status === 'info_requested') {
        items.push({
          kind: 'welfare_info_requested',
          priority: 'normal',
          title: `Welfare ${w.applicationNumber} awaiting info`,
          ref: { applicationId: String(w._id) },
        });
      }
    }

    // Upcoming scheduled home visit
    const nextVisit = (profile.homeVisits || [])
      .filter(v => v.status === 'scheduled' && new Date(v.scheduledFor) > now())
      .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0];
    if (nextVisit) {
      items.push({
        kind: 'upcoming_home_visit',
        priority: 'normal',
        title: `Upcoming visit ${nextVisit.visitNumber}`,
        ref: { visitId: String(nextVisit._id) },
        dueAt: nextVisit.scheduledFor,
      });
    }

    // Scheduled MDT
    const upcomingMdt = (profile.mdtMeetings || [])
      .filter(m => m.status === 'scheduled' && new Date(m.scheduledFor) > now())
      .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0];
    if (upcomingMdt) {
      items.push({
        kind: 'upcoming_mdt',
        priority: 'normal',
        title: `Upcoming MDT ${upcomingMdt.meetingNumber} (${upcomingMdt.purpose})`,
        ref: { meetingId: String(upcomingMdt._id) },
        dueAt: upcomingMdt.scheduledFor,
      });
    }

    // Safety plan review overdue
    for (const f of profile.riskFlags || []) {
      if (
        f.status === 'monitoring' &&
        f.safetyPlanReviewDue &&
        new Date(f.safetyPlanReviewDue) < now()
      ) {
        items.push({
          kind: 'safety_plan_review_overdue',
          priority: 'high',
          title: `Safety plan review overdue for flag ${f.flagNumber}`,
          ref: { flagId: String(f._id) },
          dueAt: f.safetyPlanReviewDue,
        });
      }
    }

    // Sort by priority then by dueAt
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    items.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 9;
      const pb = priorityOrder[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      const da = a.dueAt ? new Date(a.dueAt) : 0;
      const db = b.dueAt ? new Date(b.dueAt) : 0;
      return da - db;
    });

    return {
      beneficiaryId: String(beneficiaryId),
      generatedAt: now(),
      items,
      count: items.length,
    };
  }

  return {
    getProfile,
    getSummary,
    getTimeline,
    getHealthScore,
    getAttention,
  };
}

module.exports = {
  createBeneficiary360Service,
  NotFoundError,
};

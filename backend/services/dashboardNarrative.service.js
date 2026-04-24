/**
 * dashboardNarrative.service.js — rule-based narrative generator
 * for the 4-level dashboard blueprint.
 *
 * Phase 18 Commit 1.
 *
 * Produces a short bilingual narrative (headline + 2-3 sentences +
 * confidence badge + references) for a given dashboard snapshot.
 * The generator is deliberately rule-based in this commit — no LLM
 * call — so that:
 *
 *   1. It is fully deterministic and testable.
 *   2. It ships zero PII/NPI risk (no external call, no prompt).
 *   3. It fails closed: if no rule fires, the result is a neutral
 *      "no notable deviations" message rather than a hallucinated
 *      one.
 *
 * A follow-up commit will layer an LLM-backed generator behind the
 * same interface, guarded by the PII redactor from Integration
 * Hardening I+II.
 *
 * ─── Public API ─────────────────────────────────────────────────
 *
 *   const { generate } = require('./dashboardNarrative.service');
 *
 *   const narrative = generate({
 *     dashboardId: 'executive',
 *     kpiSnapshots: [
 *       { id: 'finance.revenue.mtd.sar', value: 1_800_000, classification: 'green', delta: 0.06 },
 *       { id: 'finance.ar.dso.days', value: 72, classification: 'red', delta: 0.11 },
 *       { id: 'crm.nps.score', value: 38, classification: 'amber', delta: -0.07 },
 *     ],
 *     context: {
 *       branch: 'riyadh-2',
 *       period: 'MTD',
 *       now: new Date('2026-04-24T08:00:00Z'),
 *     },
 *   });
 *
 *   // → {
 *   //     headlineEn, headlineAr,
 *   //     paragraphsEn[], paragraphsAr[],
 *   //     confidence: 'high' | 'medium' | 'low',
 *   //     rulesFired: [ruleCode, ...],
 *   //     refs: [kpiId, ...],
 *   //   }
 *
 * Rules are small, composable, and pure. Adding a new rule never
 * requires touching the aggregator or routes.
 */

'use strict';

const { byId: kpiById } = require('../config/kpi.registry');
const { byId: dashboardById } = require('../config/dashboard.registry');

const CLASS_WEIGHT = { red: 3, amber: 2, green: 1, unknown: 0 };

function pickWorst(snapshots) {
  if (!snapshots || !snapshots.length) return null;
  return snapshots
    .slice()
    .sort(
      (a, b) =>
        (CLASS_WEIGHT[b.classification] || 0) - (CLASS_WEIGHT[a.classification] || 0) ||
        Math.abs(b.delta || 0) - Math.abs(a.delta || 0)
    )[0];
}

function pickBest(snapshots) {
  if (!snapshots || !snapshots.length) return null;
  return snapshots
    .slice()
    .filter(s => s.classification === 'green' && typeof s.delta === 'number' && s.delta > 0)
    .sort((a, b) => b.delta - a.delta)[0];
}

function formatPct(delta) {
  if (typeof delta !== 'number' || Number.isNaN(delta)) return '';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${(delta * 100).toFixed(1)}%`;
}

// ─── Rule library ───────────────────────────────────────────────

const RULES = [
  {
    code: 'R-RED-KPI',
    fires(ctx) {
      return ctx.worst && ctx.worst.classification === 'red';
    },
    narrate(ctx) {
      const kpi = kpiById(ctx.worst.id);
      const label = kpi ? kpi.nameAr : ctx.worst.id;
      const labelEn = kpi ? kpi.nameEn : ctx.worst.id;
      const delta = formatPct(ctx.worst.delta);
      return {
        en: `Critical breach on ${labelEn} (now ${ctx.worst.value}${delta ? `, ${delta} vs prior period` : ''}). Investigate upstream drivers before end of shift.`,
        ar: `خرق حرج في مؤشر ${label} (القيمة ${ctx.worst.value}${delta ? `، تغيّر ${delta} مقابل الفترة السابقة` : ''}). راجع المسببات خلال هذه الوردية.`,
      };
    },
  },
  {
    code: 'R-AMBER-DRIFT',
    fires(ctx) {
      return (
        ctx.worst && ctx.worst.classification === 'amber' && Math.abs(ctx.worst.delta || 0) >= 0.05
      );
    },
    narrate(ctx) {
      const kpi = kpiById(ctx.worst.id);
      const label = kpi ? kpi.nameAr : ctx.worst.id;
      const labelEn = kpi ? kpi.nameEn : ctx.worst.id;
      return {
        en: `${labelEn} is drifting toward breach (${formatPct(ctx.worst.delta)}). Owner should confirm the trend is not early-warning.`,
        ar: `مؤشر ${label} في مسار تدهور (${formatPct(ctx.worst.delta)}). على المسؤول تأكيد ما إذا كان إنذاراً مبكراً.`,
      };
    },
  },
  {
    code: 'R-POSITIVE-LIFT',
    fires(ctx) {
      return ctx.best && ctx.best.delta >= 0.04;
    },
    narrate(ctx) {
      const kpi = kpiById(ctx.best.id);
      const label = kpi ? kpi.nameAr : ctx.best.id;
      const labelEn = kpi ? kpi.nameEn : ctx.best.id;
      return {
        en: `On the positive side, ${labelEn} is up ${formatPct(ctx.best.delta)} — worth capturing what's working.`,
        ar: `على الجانب الإيجابي، ${label} ارتفع ${formatPct(ctx.best.delta)} — من المفيد توثيق ما ينجح.`,
      };
    },
  },
  {
    code: 'R-INTEGRATION-HEALTH',
    fires(ctx) {
      const h = ctx.byId['gov-integrations.integration_health.index'];
      return h && (h.classification === 'red' || h.classification === 'amber');
    },
    narrate(ctx) {
      const h = ctx.byId['gov-integrations.integration_health.index'];
      return {
        en: `Integration health is ${h.classification} (score ${h.value}). Check DLQ depth + NPHIES/Nafath webhook timings.`,
        ar: `مؤشر صحة التكاملات ${h.classification === 'red' ? 'حرج' : 'تحذيري'} (${h.value}). راجع عمق DLQ وتوقيتات Webhook لـ NPHIES و Nafath.`,
      };
    },
  },
  {
    code: 'R-REDFLAG-CLUSTER',
    fires(ctx) {
      const r = ctx.byId['clinical.red_flags.active.count'];
      return r && r.classification === 'red';
    },
    narrate(ctx) {
      const r = ctx.byId['clinical.red_flags.active.count'];
      return {
        en: `${r.value} active red-flags across Beneficiary-360 — clinical director should review the top-severity cluster today.`,
        ar: `${r.value} علم أحمر نشط في بانوراما المستفيدين 360 — على المدير الطبي مراجعة العنقود الأعلى خطورة اليوم.`,
      };
    },
  },
  {
    code: 'R-ANOMALY-DETECTED',
    fires(ctx) {
      return ctx.anomalies && ctx.anomalies.length > 0;
    },
    narrate(ctx) {
      const top = ctx.anomalies[0];
      const kpi = kpiById(top.id);
      const label = kpi ? kpi.nameAr : top.id;
      const labelEn = kpi ? kpi.nameEn : top.id;
      const dirAr = top.anomaly.direction === 'above' ? 'ارتفاع' : 'انخفاض';
      const dirEn = top.anomaly.direction === 'above' ? 'spike above' : 'drop below';
      const z = typeof top.anomaly.zScore === 'number' ? top.anomaly.zScore.toFixed(1) : '?';
      return {
        en: `Statistical anomaly on ${labelEn}: ${dirEn} the ${ctx.anomalies.length > 1 ? 'recent' : ''} EWMA baseline (z=${z}). Worth cross-checking upstream drivers.`,
        ar: `شذوذ إحصائي في ${label}: ${dirAr} عن خط الأساس المتحرك (z=${z}). يُستحسن فحص المسببات المصدرية.`,
      };
    },
  },
];

/**
 * Determine narrative confidence based on how many distinct rules
 * fired and how many snapshots had a definitive classification.
 * More evidence → higher confidence. No rules → low confidence and
 * a neutral all-clear message.
 */
function scoreConfidence(rulesFired, snapshots) {
  const classified = snapshots.filter(
    s => s.classification && s.classification !== 'unknown'
  ).length;
  if (rulesFired.length === 0) return 'low';
  if (rulesFired.length >= 3 && classified >= 4) return 'high';
  if (rulesFired.length >= 2) return 'medium';
  return 'medium';
}

function buildContext(kpiSnapshots, externalContext) {
  const byIdMap = Object.create(null);
  for (const s of kpiSnapshots) byIdMap[s.id] = s;
  const anomalies = kpiSnapshots
    .filter(s => s.anomaly && s.anomaly.detected)
    .sort((a, b) => Math.abs(b.anomaly.zScore || 0) - Math.abs(a.anomaly.zScore || 0));
  return {
    snapshots: kpiSnapshots,
    byId: byIdMap,
    worst: pickWorst(kpiSnapshots),
    best: pickBest(kpiSnapshots),
    anomalies,
    ext: externalContext || {},
  };
}

/**
 * Main entry point. Returns a narrative record shaped for the
 * W-NARRATIVE widget. Never throws — if the input is malformed, it
 * returns a low-confidence "insufficient data" narrative so that
 * dashboards never explode because of a narrative gap.
 */
function generate({ dashboardId, kpiSnapshots, context } = {}) {
  const dashboard = dashboardId ? dashboardById(dashboardId) : null;
  const snapshots = Array.isArray(kpiSnapshots) ? kpiSnapshots : [];

  if (!snapshots.length) {
    return {
      headlineEn: 'Insufficient data for narrative',
      headlineAr: 'بيانات غير كافية لتوليد ملخص',
      paragraphsEn: ['No KPI snapshots were supplied. Verify the aggregator pipeline.'],
      paragraphsAr: ['لم تُزوَّد أي قياسات مؤشرات. يرجى التحقق من خط تجميع البيانات.'],
      confidence: 'low',
      rulesFired: [],
      refs: [],
      dashboardId: dashboardId || null,
      dashboardLevel: dashboard ? dashboard.level : null,
    };
  }

  const ctx = buildContext(snapshots, context);
  const paragraphsEn = [];
  const paragraphsAr = [];
  const rulesFired = [];
  const refs = new Set();

  for (const rule of RULES) {
    let fired = false;
    try {
      fired = Boolean(rule.fires(ctx));
    } catch (_) {
      fired = false;
    }
    if (!fired) continue;
    const body = rule.narrate(ctx);
    if (body && body.en) paragraphsEn.push(body.en);
    if (body && body.ar) paragraphsAr.push(body.ar);
    rulesFired.push(rule.code);
    // Walk KPI ids surfaced by this rule so the refs[] array can
    // anchor the narrative to deep-links in the frontend.
    for (const s of snapshots) {
      if (ctx.worst && s.id === ctx.worst.id) refs.add(s.id);
      if (ctx.best && s.id === ctx.best.id) refs.add(s.id);
    }
  }

  // Always include the integration-health + red-flag refs if their
  // rules fired.
  if (rulesFired.includes('R-INTEGRATION-HEALTH'))
    refs.add('gov-integrations.integration_health.index');
  if (rulesFired.includes('R-REDFLAG-CLUSTER')) refs.add('clinical.red_flags.active.count');

  let headlineEn = 'No material KPI deviations detected';
  let headlineAr = 'لا توجد انحرافات جوهرية في المؤشرات';
  if (ctx.worst && ctx.worst.classification === 'red') {
    const kpi = kpiById(ctx.worst.id);
    headlineEn = `Red breach: ${kpi ? kpi.nameEn : ctx.worst.id}`;
    headlineAr = `خرق أحمر: ${kpi ? kpi.nameAr : ctx.worst.id}`;
  } else if (ctx.worst && ctx.worst.classification === 'amber') {
    headlineEn = 'Amber watchlist — early drift detected';
    headlineAr = 'قائمة مراقبة كهرمانية — رُصد انحراف مبكر';
  } else if (ctx.best) {
    headlineEn = 'All KPIs green; notable positive lift worth documenting';
    headlineAr = 'جميع المؤشرات خضراء؛ ارتفاع ملحوظ يستحق التوثيق';
  }

  if (!paragraphsEn.length) {
    paragraphsEn.push(
      'No individual rule fired. Treat as a quiet period and continue routine monitoring.'
    );
    paragraphsAr.push('لم تُطلق أي قاعدة — نفترض فترة هادئة ومتابعة اعتيادية.');
  }

  return {
    headlineEn,
    headlineAr,
    paragraphsEn,
    paragraphsAr,
    confidence: scoreConfidence(rulesFired, snapshots),
    rulesFired,
    refs: Array.from(refs),
    dashboardId: dashboardId || null,
    dashboardLevel: dashboard ? dashboard.level : null,
  };
}

module.exports = {
  generate,
  RULES, // exported for targeted tests
  _internals: { pickWorst, pickBest, scoreConfidence },
};

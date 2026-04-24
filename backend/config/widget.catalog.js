/**
 * widget.catalog.js — canonical widget library for the Al-Awael
 * dashboard platform.
 *
 * Phase 18 Commit 1.
 *
 * Each entry describes a reusable UI building block that the
 * frontend renders. The catalog is the single source of truth for:
 *
 *   - which widgets exist
 *   - what kind of data they consume (`dataShape`)
 *   - which filter keys they accept (from dashboard.registry.FILTER_KEYS)
 *   - whether they support drill-down, live-stream, or AI narrative
 *   - their recommended default grid span (colSpan × rowSpan on a
 *     12-col responsive grid, row-height 80px)
 *
 * The backend never renders widgets; it only validates shape and
 * ensures every dashboard references widgets that exist here. The
 * frontend imports the same JSON via /api/v1/dashboards/catalog so
 * a new widget ships as a single registry edit + frontend component.
 *
 * Pure data. Any change to an existing widget's `dataShape` is a
 * breaking change — add a successor (`W-CARD-V2`) and deprecate.
 */

'use strict';

const DATA_SHAPES = Object.freeze([
  'kpi-value', // { value, delta, target, sparkline[] }
  'time-series', // { series: [{name, points: [{t, v}]}], annotations? }
  'matrix', // { rows: [], cols: [], cells: [][] }
  'grid', // rows + cols of any scalar (heatmap, table)
  'funnel', // stages: [{name, count, dropoffPct}]
  'waterfall', // segments: [{label, value, kind: 'open'|'in'|'out'|'close'}]
  'pareto', // { categories: [{name, count, cumPct}] }
  'calendar', // { cells: [{date, value, severity}] }
  'geo-or-floor', // { map: 'geojson'|'svg', overlays: [] }
  'gantt', // { tasks: [{id, label, start, end, status, deps?}] }
  'queue', // { items: [{id, title, ageSeconds, severity, actions}] }
  'event-stream', // { events: [{id, ts, severity, source, title, ctx}] }
  'alert-card', // { severity, title, cta, ackState }
  'narrative', // { headline, paragraphs: [], confidence, refs: [] }
  'cohort', // { cohorts: [{label, points: [{tOffset, v}]}] }
  'compare', // { baseA, baseB, kpiDeltas: [] }
  'drill-table', // { columns: [], rows: [], pageSize }
]);

const WIDGETS = Object.freeze([
  {
    code: 'W-KPI-CARD',
    nameEn: 'Hero KPI card',
    nameAr: 'بطاقة مؤشر رئيسية',
    dataShape: 'kpi-value',
    supports: { drill: true, live: true, narrative: false, export: true },
    defaultSpan: { col: 2, row: 2 },
    description:
      'Number + delta + sparkline + status dot. The fastest way to answer "is this green?"',
  },
  {
    code: 'W-TREND',
    nameEn: 'Time-series chart',
    nameAr: 'مخطط اتجاه زمني',
    dataShape: 'time-series',
    supports: { drill: true, live: false, narrative: true, export: true },
    defaultSpan: { col: 6, row: 3 },
    description: 'Line / area chart with optional forecast band + annotations.',
  },
  {
    code: 'W-HEATMAP',
    nameEn: 'Branch × KPI heatmap',
    nameAr: 'خريطة حرارية فرع × مؤشر',
    dataShape: 'grid',
    supports: { drill: true, live: false, narrative: true, export: true },
    defaultSpan: { col: 8, row: 4 },
    description: 'Normalised 0–100 grid — click cell to pivot into (row, col) slice.',
  },
  {
    code: 'W-MATRIX-5x5',
    nameEn: 'Risk matrix 5×5',
    nameAr: 'مصفوفة المخاطر 5×5',
    dataShape: 'matrix',
    supports: { drill: true, live: false, narrative: false, export: true },
    defaultSpan: { col: 4, row: 4 },
    description: 'Likelihood × severity bubble matrix with risk-register counts.',
  },
  {
    code: 'W-FUNNEL',
    nameEn: 'Conversion funnel',
    nameAr: 'قمع التحويل',
    dataShape: 'funnel',
    supports: { drill: true, live: false, narrative: true, export: true },
    defaultSpan: { col: 4, row: 3 },
    description: 'Staged volume + drop-off %. Used for waitlist, attrition, complaint triage.',
  },
  {
    code: 'W-WATERFALL',
    nameEn: 'Revenue / AR waterfall',
    nameAr: 'مخطط الشلال المالي',
    dataShape: 'waterfall',
    supports: { drill: true, live: false, narrative: true, export: true },
    defaultSpan: { col: 6, row: 3 },
    description: 'Opening → in-flows → out-flows → closing balance visualisation.',
  },
  {
    code: 'W-PARETO',
    nameEn: 'Pareto 80/20 chart',
    nameAr: 'مخطط باريتو 80/20',
    dataShape: 'pareto',
    supports: { drill: true, live: false, narrative: true, export: true },
    defaultSpan: { col: 6, row: 3 },
    description: 'Ranked bars + cumulative line — find the vital few root causes.',
  },
  {
    code: 'W-CALENDAR',
    nameEn: 'Calendar heatmap',
    nameAr: 'خريطة حرارية تقويمية',
    dataShape: 'calendar',
    supports: { drill: true, live: false, narrative: false, export: true },
    defaultSpan: { col: 6, row: 2 },
    description: 'Day-level cells coloured by severity or volume.',
  },
  {
    code: 'W-MAP',
    nameEn: 'Geo / floor map',
    nameAr: 'خريطة جغرافية / قاعات',
    dataShape: 'geo-or-floor',
    supports: { drill: true, live: true, narrative: false, export: false },
    defaultSpan: { col: 6, row: 4 },
    description: 'Branch map, floor plan, or route map with live overlays.',
  },
  {
    code: 'W-GANTT',
    nameEn: 'Plan timeline (Gantt)',
    nameAr: 'جدول زمني (غانت)',
    dataShape: 'gantt',
    supports: { drill: true, live: false, narrative: false, export: true },
    defaultSpan: { col: 8, row: 4 },
    description: 'Care-plan / work-order timeline with baseline comparison.',
  },
  {
    code: 'W-QUEUE',
    nameEn: 'Live queue',
    nameAr: 'قائمة انتظار حيّة',
    dataShape: 'queue',
    supports: { drill: true, live: true, narrative: false, export: false },
    defaultSpan: { col: 4, row: 4 },
    description: 'Approvals, DLQ, SLA clocks — ages surface as urgency badges.',
  },
  {
    code: 'W-STREAM',
    nameEn: 'Live event stream',
    nameAr: 'بث أحداث حيّ',
    dataShape: 'event-stream',
    supports: { drill: true, live: true, narrative: false, export: false },
    defaultSpan: { col: 4, row: 4 },
    description: 'Red-flags, incidents, anomalies — newest on top with severity tint.',
  },
  {
    code: 'W-ALERT',
    nameEn: 'Alert card',
    nameAr: 'بطاقة تنبيه',
    dataShape: 'alert-card',
    supports: { drill: true, live: true, narrative: false, export: false },
    defaultSpan: { col: 4, row: 2 },
    description: 'Severity + title + one-click CTA (ack / snooze / create CAPA).',
  },
  {
    code: 'W-NARRATIVE',
    nameEn: 'AI narrative block',
    nameAr: 'ملخص ذكي (AI)',
    dataShape: 'narrative',
    supports: { drill: false, live: false, narrative: true, export: true },
    defaultSpan: { col: 12, row: 2 },
    description: 'Headline + 2-3 sentences + confidence badge + "how was this computed?" link.',
  },
  {
    code: 'W-COHORT',
    nameEn: 'Cohort curves',
    nameAr: 'منحنيات المجموعات',
    dataShape: 'cohort',
    supports: { drill: true, live: false, narrative: true, export: true },
    defaultSpan: { col: 6, row: 4 },
    description: 'Outcome trajectories per cohort aligned to t-zero (enrollment / discharge).',
  },
  {
    code: 'W-COMPARE',
    nameEn: 'Multi-period compare',
    nameAr: 'مقارنة فترات متعددة',
    dataShape: 'compare',
    supports: { drill: false, live: false, narrative: true, export: true },
    defaultSpan: { col: 6, row: 2 },
    description: 'Side-by-side KPI deltas across period A vs period B (e.g. MTD vs LY).',
  },
  {
    code: 'W-DRILL-TABLE',
    nameEn: 'Paginated drill table',
    nameAr: 'جدول تفصيلي صفحي',
    dataShape: 'drill-table',
    supports: { drill: true, live: false, narrative: false, export: true },
    defaultSpan: { col: 12, row: 4 },
    description: 'Row-level evidence — always the lowest layer of a drill chain.',
  },
]);

// ─── Lookups ─────────────────────────────────────────────────────

function byCode(code) {
  return WIDGETS.find(w => w.code === code) || null;
}

function byDataShape(shape) {
  return WIDGETS.filter(w => w.dataShape === shape);
}

/**
 * Validate that a widget reference includes every capability the
 * caller needs. Used by the aggregator to reject misconfigurations
 * early (e.g. asking a W-KPI-CARD to emit a narrative).
 */
function supports(code, capability) {
  const w = byCode(code);
  if (!w) return false;
  return Boolean(w.supports && w.supports[capability]);
}

module.exports = {
  WIDGETS,
  DATA_SHAPES,
  byCode,
  byDataShape,
  supports,
};

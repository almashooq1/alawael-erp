#!/usr/bin/env node
/**
 * rehab-seed-planner.js — CLI for the rehab-disciplines seed planner.
 *
 * Phase 9 Commit 6. Inspects the canonical registry and prints the
 * seed plan that a deployment pipeline (or a developer on first boot)
 * would apply. Read-only by default — no DB writes from this script.
 *
 * Exit codes:
 *   0 — plan generated successfully
 *   1 — bad CLI arguments
 *   2 — internal error
 *
 * Usage:
 *   node scripts/rehab-seed-planner.js                 full plan, table
 *   node scripts/rehab-seed-planner.js --measures      measures only
 *   node scripts/rehab-seed-planner.js --programs --branch <id>
 *   node scripts/rehab-seed-planner.js --interventions
 *   node scripts/rehab-seed-planner.js --goal-templates
 *   node scripts/rehab-seed-planner.js --json          machine-readable
 *   node scripts/rehab-seed-planner.js --markdown      MD report (docs)
 *   node scripts/rehab-seed-planner.js --help
 */

'use strict';

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));

if (flags.has('--help') || flags.has('-h')) {
  process.stdout.write(
    [
      'rehab-seed-planner — dry-run seed plan for the rehab registry',
      '',
      'Prints the materialisation plan that would create OutcomeMeasure,',
      'Program, Intervention, and GoalTemplate documents from the canonical',
      'rehab-disciplines registry. No DB writes — this is an inspection tool.',
      '',
      'Usage:',
      '  node scripts/rehab-seed-planner.js                  full plan (table)',
      '  node scripts/rehab-seed-planner.js --measures       measures only',
      '  node scripts/rehab-seed-planner.js --programs --branch <id>',
      '  node scripts/rehab-seed-planner.js --interventions  interventions only',
      '  node scripts/rehab-seed-planner.js --goal-templates SMART goal templates',
      '  node scripts/rehab-seed-planner.js --json           JSON output',
      '  node scripts/rehab-seed-planner.js --markdown       Markdown report',
      '  node scripts/rehab-seed-planner.js --help           this message',
      '',
    ].join('\n')
  );
  process.exit(0);
}

// Parse --branch <value>
function argValue(name) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx === args.length - 1) return null;
  return args[idx + 1];
}

const planner = require('../services/rehabSeedPlanner');

const JSON_MODE = flags.has('--json');
const MD_MODE = flags.has('--markdown');
const WANT_MEASURES = flags.has('--measures');
const WANT_PROGRAMS = flags.has('--programs');
const WANT_INTERVENTIONS = flags.has('--interventions');
const WANT_GOAL_TEMPLATES = flags.has('--goal-templates');
const WANT_ALL = !WANT_MEASURES && !WANT_PROGRAMS && !WANT_INTERVENTIONS && !WANT_GOAL_TEMPLATES;

const branchId = argValue('--branch');

if (WANT_PROGRAMS && !branchId) {
  process.stderr.write('ERROR: --programs requires --branch <id>. Programs are branch-scoped.\n');
  process.exit(1);
}

// ─── Build ───────────────────────────────────────────────────────

let plan;
try {
  if (WANT_ALL) {
    plan = planner.buildFullPlan({ branchId });
  } else {
    plan = {};
    if (WANT_MEASURES) plan.measures = planner.buildMeasurePlan();
    if (WANT_INTERVENTIONS) plan.interventions = planner.buildInterventionPlan();
    if (WANT_GOAL_TEMPLATES) plan.goalTemplates = planner.buildGoalTemplatePlan();
    if (WANT_PROGRAMS) plan.programs = planner.buildProgramPlan({ branchId });
  }
} catch (err) {
  process.stderr.write(`ERROR: ${err.message}\n`);
  process.exit(2);
}

// ─── Render ──────────────────────────────────────────────────────

if (JSON_MODE) {
  process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
  process.exit(0);
}

if (MD_MODE) {
  process.stdout.write(renderMarkdown(plan) + '\n');
  process.exit(0);
}

process.stdout.write(renderTable(plan) + '\n');
process.exit(0);

// ─── Renderers ───────────────────────────────────────────────────

function renderTable(p) {
  const lines = [];
  lines.push('═══ Rehab-disciplines seed plan ═══');

  if (p.disciplines) {
    lines.push('');
    lines.push(`Disciplines: ${p.disciplines.total} total`);
    for (const row of p.disciplines.byDomain) {
      lines.push(`  ${row.domain.padEnd(16)} ${row.count}`);
    }
  }

  if (p.measures) {
    lines.push('');
    lines.push(`Measures: ${p.measures.total} unique (${p.measures.totalReferences} references)`);
    for (const m of p.measures.uniqueMeasures) {
      lines.push(
        `  ${m.code.padEnd(18)} ${m.standardBody.padEnd(8)} ${m.instrumentType.padEnd(20)} used by ${m.disciplineCodes.join(', ')}`
      );
    }
  }

  if (p.interventions) {
    lines.push('');
    lines.push(
      `Interventions: ${p.interventions.total} unique (${p.interventions.totalReferences} references)`
    );
    for (const iv of p.interventions.uniqueInterventions) {
      lines.push(`  ${iv.code.padEnd(28)} [${iv.evidenceLevel}]  ${iv.technique.padEnd(28)}`);
    }
  }

  if (p.goalTemplates) {
    lines.push('');
    lines.push(`Goal templates: ${p.goalTemplates.total} total`);
    for (const row of p.goalTemplates.byDiscipline) {
      lines.push(`  ${row.code.padEnd(6)} ${row.count}`);
    }
  }

  if (p.programs && !p.programs.error && p.programs.programs) {
    lines.push('');
    lines.push(`Programs: ${p.programs.total} total (branch=${p.programs.branchId})`);
    for (const pr of p.programs.programs) {
      lines.push(
        `  ${pr.code.padEnd(22)} ${pr.disciplineCode.padEnd(6)} ${pr.deliveryMode.padEnd(14)} ${pr.frequencyPerWeek}x/wk × ${pr.durationMinutes}m × ${pr.cycleWeeks}wks [${pr.evidenceLevel}]`
      );
    }
  } else if (p.programs && p.programs.error) {
    lines.push('');
    lines.push(`Programs: SKIPPED — ${p.programs.error}`);
  } else if (p.programs && p.programs.note) {
    lines.push('');
    lines.push(`Programs: (${p.programs.note})`);
  }

  return lines.join('\n');
}

function renderMarkdown(p) {
  const lines = [];
  lines.push('# Rehab-disciplines seed plan');
  lines.push('');
  if (p.generatedAt) lines.push(`_Generated ${p.generatedAt}_`);
  lines.push('');

  if (p.disciplines) {
    lines.push('## Disciplines');
    lines.push('');
    lines.push(`Total: **${p.disciplines.total}**`);
    lines.push('');
    lines.push('| Domain | Count |');
    lines.push('|--------|-------|');
    for (const row of p.disciplines.byDomain) {
      lines.push(`| ${row.domain} | ${row.count} |`);
    }
    lines.push('');
  }

  if (p.measures) {
    lines.push('## Outcome measures');
    lines.push('');
    lines.push(
      `**${p.measures.total}** unique instruments across **${p.measures.totalReferences}** discipline references.`
    );
    lines.push('');
    lines.push('| Code | Standard | Instrument type | Disciplines |');
    lines.push('|------|----------|------------------|-------------|');
    for (const m of p.measures.uniqueMeasures) {
      lines.push(
        `| ${m.code} | ${m.standardBody} | ${m.instrumentType} | ${m.disciplineCodes.join(', ')} |`
      );
    }
    lines.push('');
  }

  if (p.interventions) {
    lines.push('## Interventions');
    lines.push('');
    lines.push(
      `**${p.interventions.total}** unique interventions across **${p.interventions.totalReferences}** references.`
    );
    lines.push('');
    lines.push('| Code | Technique | Evidence |');
    lines.push('|------|-----------|----------|');
    for (const iv of p.interventions.uniqueInterventions) {
      lines.push(`| ${iv.code} | ${iv.technique} | ${iv.evidenceLevel} |`);
    }
    lines.push('');
  }

  if (p.goalTemplates) {
    lines.push('## SMART goal templates');
    lines.push('');
    lines.push(`**${p.goalTemplates.total}** templates across disciplines.`);
    lines.push('');
    lines.push('| Code | Discipline | Metric | Baseline → Target |');
    lines.push('|------|------------|--------|-------------------|');
    for (const g of p.goalTemplates.templates) {
      lines.push(
        `| ${g.code} | ${g.disciplineCode} | ${g.metric} | ${g.baseline} → ${g.target} ${g.unit} |`
      );
    }
    lines.push('');
  }

  if (p.programs && p.programs.programs) {
    lines.push('## Program templates');
    lines.push('');
    lines.push(`**${p.programs.total}** seed programs for branch \`${p.programs.branchId}\`.`);
    lines.push('');
    lines.push('| Code | Discipline | Delivery | Dosing | Evidence |');
    lines.push('|------|------------|----------|--------|----------|');
    for (const pr of p.programs.programs) {
      lines.push(
        `| ${pr.code} | ${pr.disciplineCode} | ${pr.deliveryMode} | ${pr.frequencyPerWeek}×${pr.durationMinutes}m for ${pr.cycleWeeks}w | ${pr.evidenceLevel} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

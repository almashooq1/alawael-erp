/**
 * Kimi Task: repair-all-defects
 *
 * Meta-orchestration definition for a phased, multi-agent defect-repair run.
 * Reads CLAUDE.md (and MEMORY.md if present) first; they override defaults.
 *
 * This file is an orchestration sketch: it assumes a runtime that provides
 * phase(), log(), agent(), parallel(), and pipeline(). It is not intended to
 * be executed directly by Node without an agent harness.
 */

export const meta = {
  name: 'repair-all-defects',
  description: 'Discover every defect from diagnostic surfaces, fix root-cause in parallel by severity in isolated worktrees, adversarially verify each fix, and guarantee no-recurrence via red-before-green guards',
  phases: [
    { title: 'Discover', detail: 'multi-source sweep → Problem Ledger' },
    { title: 'Converge', detail: 'completeness critic + re-sweep until dry' },
    { title: 'Fix', detail: 'parallel root-cause fixes in isolated worktrees, by severity' },
    { title: 'Verify', detail: 'adversarial refutation + red-before-green check per fix' },
    { title: 'Critic', detail: 'whole-run completeness critic' },
    { title: 'Synthesize', detail: 'burn-down report + ADRs + owner handoff' },
  ],
}

const DOCTRINE = `Read CLAUDE.md + MEMORY.md first; they override defaults. Honor invariants:
no req.branchId (use effectiveBranchScope/branchFilter/assertBranchMatch); never break enforceMfa;
Beneficiary/Branch/User are canonical; UI->web-admin, backend->66666, never build in V4; atomic
commits; all 7 pre-push gates + sprint green. NEVER mask a symptom (no skip/disable/guard-softening).
Prove by RUNNING, never by reading.`

const LEDGER_ITEM = {
  type: 'object',
  required: ['id', 'title', 'file', 'severity', 'evidence', 'suspectedRootCause', 'klass'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    file: { type: 'string' },
    severity: { enum: ['P0', 'P1', 'P2'] },
    evidence: { type: 'string', description: 'pasted command output proving the defect' },
    suspectedRootCause: { type: 'string' },
    klass: { type: 'string', description: 'the defect CLASS a guard should block' },
    ownerSecretGated: { type: 'boolean' },
  },
}
const LEDGER_SCHEMA = { type: 'object', required: ['findings'], properties: { findings: { type: 'array', items: LEDGER_ITEM } } }

const FIX_SCHEMA = {
  type: 'object',
  required: ['id', 'rootCause', 'filesChanged', 'guardFile', 'redBeforeGreenProven', 'proof', 'status'],
  properties: {
    id: { type: 'string' },
    rootCause: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    guardFile: { type: 'string', description: 'regression guard added (in sprint-tests.txt)' },
    redBeforeGreenProven: { type: 'boolean', description: 'guard demonstrated to FAIL pre-fix then PASS post-fix' },
    baselineBefore: { type: 'string' },
    baselineAfter: { type: 'string' },
    proof: { type: 'string', description: 'pasted typecheck/jest/run output' },
    status: { enum: ['fixed', 'blocked', 'owner-gated'] },
    worktreeBranch: { type: 'string' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['id', 'refuted', 'reason', 'guardRedBeforeGreen', 'recurrenceRisk'],
  properties: {
    id: { type: 'string' },
    refuted: { type: 'boolean', description: 'true if the fix is wrong / bug still reproduces / guard is fake' },
    reason: { type: 'string' },
    guardRedBeforeGreen: { type: 'boolean' },
    recurrenceRisk: { enum: ['low', 'medium', 'high'] },
  },
}

// Each discovery agent owns ONE diagnostic surface (multi-modal sweep — each blind to the others).
const SURFACES = [
  { key: 'sprint',        cmd: 'cd backend && npm run test:sprint' },
  { key: 'jest-full',     cmd: 'cd backend && npx jest --config=jest.config.js' },
  { key: 'gates',         cmd: 'cd backend && npm run check:sprint-paths && npm run check:routes-load && npm run check:gitignored-sources && npm run check:hook-style && npm run check:wave-collision && npm run check:phantom-writes && npm run check:route-shadowing' },
  { key: 'phantom-extra', cmd: 'cd backend && npm run check:dormant-modules && npm run lint:duplication && npm run preflight' },
  { key: 'web-admin',     cmd: 'cd ../../alawael-rehab-platform/apps/web-admin && npm run typecheck && npm run lint' },
  { key: 'prod-logs',     cmd: 'inspect backend/logs (Winston) + error1.log for [ROUTE FAIL]/5xx; apply anti-pattern A8 (check LATEST timestamp per pattern before counting it live)' },
  { key: 'structural',    cmd: 'static analysis: 3 clinical session models, 2 IEP models, beneficiary entity confusion, orphaned endpoints, dead event contracts' },
]

phase('Discover')
log('Sweeping ' + SURFACES.length + ' diagnostic surfaces to build the Problem Ledger...')

async function sweep(round) {
  const sweeps = await parallel(SURFACES.map(s => () =>
    agent(
      `${DOCTRINE}\n\nDISCOVERY (round ${round}) — surface "${s.key}". Run/inspect: ${s.cmd}\n` +
      `Return EVERY real defect as a Ledger finding with PASTED evidence (the actual failing output). ` +
      `Classify severity P0(data/clinical/prod-5xx/isolation/broken-gate) / P1(contract/orphan/type/undelivered-event) / ` +
      `P2(hygiene/dup/dead/shadow/lint). Set "klass" to the defect class a guard should block. ` +
      `Set ownerSecretGated=true only if the fix needs SMTP/Nafath/payment/Meta secrets. Do NOT fix anything.`,
      { label: `discover:${s.key}`, phase: 'Discover', schema: LEDGER_SCHEMA }
    )
  ))
  return sweeps.filter(Boolean).flatMap(r => r.findings || [])
}

let ledger = await sweep(1)
// dedupe by file + class signature (plain code — needs the full set, hence the barrier above)
const seen = new Set()
const key = f => `${(f.file || '').trim()}::${(f.klass || f.title || '').trim().toLowerCase()}`
ledger = ledger.filter(f => { const k = key(f); if (seen.has(k)) return false; seen.add(k); return true })
log(`Round 1: ${ledger.length} unique defects.`)

phase('Converge')
// loop-until-dry: critic names missed surfaces, one more targeted sweep; stop after 2 dry rounds
let dry = 0, round = 2
while (dry < 2 && round <= 4) {
  const critic = await agent(
    `${DOCTRINE}\n\nCOMPLETENESS CRITIC. Current Ledger has ${ledger.length} defects across these classes: ` +
    `${[...new Set(ledger.map(f => f.klass))].join(', ')}. What defect CLASSES or diagnostic surfaces are likely MISSED? ` +
    `Name concrete re-checks (a guard not run, a baseline not read as a worklist, a route family not grepped).`,
    { label: `critic:round${round}`, phase: 'Converge', schema: { type: 'object', required: ['gaps'], properties: { gaps: { type: 'array', items: { type: 'string' } } } } }
  )
  if (!critic || !critic.gaps || !critic.gaps.length) { dry++; round++; continue }
  const more = (await parallel(critic.gaps.slice(0, 6).map((g, i) => () =>
    agent(`${DOCTRINE}\n\nTARGETED RE-SWEEP: ${g}. Return new Ledger findings with pasted evidence. Do NOT fix.`,
      { label: `re-sweep:r${round}.${i}`, phase: 'Converge', schema: LEDGER_SCHEMA })
  ))).filter(Boolean).flatMap(r => r.findings || [])
  const fresh = more.filter(f => { const k = key(f); if (seen.has(k)) return false; seen.add(k); return true })
  if (!fresh.length) { dry++ } else { dry = 0; ledger.push(...fresh); log(`Round ${round}: +${fresh.length} new (total ${ledger.length}).`) }
  round++
}

// triage: P0 first so they START first as concurrency slots free
const rank = { P0: 0, P1: 1, P2: 2 }
const work = ledger.filter(f => !f.ownerSecretGated).sort((a, b) => rank[a.severity] - rank[b.severity])
const ownerGated = ledger.filter(f => f.ownerSecretGated)
log(`Triaged: ${work.length} fixable (P0=${work.filter(f=>f.severity==='P0').length}, P1=${work.filter(f=>f.severity==='P1').length}, P2=${work.filter(f=>f.severity==='P2').length}); ${ownerGated.length} owner-gated.`)

// FIX -> VERIFY as a pipeline: each defect flows independently (no barrier). Worktree isolation so
// parallel fixes never collide on files (CLAUDE.md warns of cross-agent commit races).
const results = await pipeline(
  work,
  // stage 1 — root-cause fix + red-before-green guard, in an isolated worktree
  (item) => agent(
    `${DOCTRINE}\n\nFIX defect ${item.id} [${item.severity}] in ${item.file}: ${item.title}\n` +
    `Evidence: ${item.evidence}\nSuspected root cause: ${item.suspectedRootCause}\n\n` +
    `1) Reproduce it. 2) Fix the ROOT CAUSE, smallest correct change, NEVER mask the symptom (A6). ` +
    `3) Add a regression guard for the CLASS "${item.klass}" and PROVE it RED-BEFORE-GREEN: demonstrate the ` +
    `guard FAILS on the pre-fix state, then PASSES after (paste both). 4) Add static+behavioral counterparts to ` +
    `sprint-tests.txt (+ sync:sprint-paths + clean yml). 5) Ratchet the relevant baseline DOWN. 6) Prove by running ` +
    `(typecheck/jest/exercise the path) and paste output. 7) Atomic commit on this worktree branch with a free Wave number.`,
    { label: `fix:${item.id}`, phase: 'Fix', schema: FIX_SCHEMA, isolation: 'worktree', effort: item.severity === 'P0' ? 'high' : 'medium' }
  ),
  // stage 2 — adversarial verification: try to REFUTE the fix
  (fix, item) => agent(
    `${DOCTRINE}\n\nADVERSARIALLY VERIFY fix ${item.id}. Default to refuted=true unless convinced. Check: ` +
    `(a) does the original defect STILL reproduce? (b) is the regression guard genuinely RED-BEFORE-GREEN, or born-green/fake? ` +
    `(c) did the fix mask a symptom or soften a guard (A6)? (d) did it introduce a new failure (run the affected tests)? ` +
    `(e) does it violate any invariant (req.branchId, enforceMfa, phantom ref, V4)? Fix claim: ${JSON.stringify(fix)}. ` +
    `Rate recurrenceRisk low/medium/high.`,
    { label: `verify:${item.id}`, phase: 'Verify', schema: VERDICT_SCHEMA, effort: 'high' }
  ).then(v => ({ item, fix, verdict: v }))
)

const clean = results.filter(Boolean)
const confirmed = clean.filter(r => r.verdict && !r.verdict.refuted && r.verdict.guardRedBeforeGreen && r.verdict.recurrenceRisk !== 'high')
const rejected = clean.filter(r => !confirmed.includes(r))

phase('Critic')
const finalCritic = await agent(
  `${DOCTRINE}\n\nWHOLE-RUN COMPLETENESS CRITIC. Confirmed fixes: ${confirmed.length}. Rejected/at-risk: ${rejected.length}. ` +
  `Owner-gated: ${ownerGated.length}. What remains for WHOLE-SYSTEM correctness (§10): any class unfixed, any guard not ` +
  `red-before-green, the primary journey (beneficiary→session→attendance→invoice→report) not smoke-tested, or a baseline ` +
  `not at its target? List concrete residual work.`,
  { label: 'final-critic', phase: 'Critic', schema: { type: 'object', required: ['residual'], properties: { residual: { type: 'array', items: { type: 'string' } } } } }
)

phase('Synthesize')
const summary = await agent(
  `${DOCTRINE}\n\nSYNTHESIZE the repair run. Produce: (1) Problem Ledger burn-down by severity; (2) per confirmed fix: ` +
  `root cause + guard + red-before-green evidence + worktree branch to integrate; (3) rejected/at-risk fixes needing rework; ` +
  `(4) residual for whole-system correctness; (5) OWNER HANDOFF (secret-gated only): ${JSON.stringify(ownerGated.map(f => f.title))}; ` +
  `(6) integration plan: the order to merge the per-fix worktree branches sequentially (avoid the cross-agent race), then run full ` +
  `sprint+typecheck+gates+primary-journey smoke as the final §14 gate. Do NOT deploy.\n\n` +
  `CONFIRMED=${JSON.stringify(confirmed.map(r => ({ id: r.item.id, branch: r.fix.worktreeBranch })))}\n` +
  `REJECTED=${JSON.stringify(rejected.map(r => ({ id: r.item.id, reason: r.verdict && r.verdict.reason })))}\n` +
  `RESIDUAL=${JSON.stringify(finalCritic && finalCritic.residual)}`,
  { label: 'synthesize', phase: 'Synthesize', effort: 'high' }
)

return {
  ledgerTotal: ledger.length,
  confirmed: confirmed.length,
  rejected: rejected.length,
  ownerGated: ownerGated.length,
  report: summary,
}

'use strict';

/**
 * launchReadiness.service.js — W1375 (shared launch-readiness evaluator).
 *
 * The check logic behind `scripts/launch-readiness.js` (W1286/W1287),
 * extracted so BOTH the CLI and the read-only HTTP route
 * (routes/launch-readiness.routes.js → web-admin /launch-readiness page)
 * compute the SAME verdict from one source of truth.
 *
 * `evaluateLaunchReadiness({ db, env })` is PURE-ish: it only READS
 * (countDocuments) the supplied mongoose `db` handle + reads `env` for
 * mail config. No connect, no process.exit, no console. Returns
 * `{ go, checks, summary }`.
 *
 * Each check: { status: 'PASS'|'NOT-YET'|'INFO', name, detail, fix }.
 *   INFO (owner-gated: SMTP, demo-data) NEVER blocks — refuse to declare
 *   someone else's decision "wrong". Verdict GO iff zero NOT-YET.
 *
 * Collection names are the MODEL-TRUE names (W1287 lesson: a guessed plural
 * silently false-negatives — icfcodereferences not icfcodes; clinical_sessions
 * not clinicalsessions).
 */

async function evaluateLaunchReadiness({ db, env = process.env } = {}) {
  if (!db) throw new Error('evaluateLaunchReadiness requires a mongoose db handle');

  const checks = [];
  const add = (status, name, detail, fix) => checks.push({ status, name, detail, fix: fix || null });
  const PASS = (n, d) => add('PASS', n, d);
  const NOTYET = (n, d, fix) => add('NOT-YET', n, d, fix);
  const INFO = (n, d, fix) => add('INFO', n, d, fix);

  const countSafe = async (coll, query = {}) => {
    try {
      return await db.collection(coll).countDocuments(query);
    } catch (_e) {
      return null;
    }
  };

  // ── 1. Reference/config data seeded ──────────────────────────────
  const forms = await countSafe('formtemplates');
  forms > 0
    ? PASS('forms catalog seeded', `${forms} templates`)
    : NOTYET('forms catalog seeded', `${forms} templates`, 'npm run seed:forms-catalog');

  const measures = await countSafe('measures_library', { status: 'active' });
  measures > 0
    ? PASS('measures library seeded', `${measures} active instruments`)
    : NOTYET('measures library seeded', `${measures} active`, 'npm run seed:measures');

  const goalbank = await countSafe('goalbanks');
  goalbank > 0
    ? PASS('goal bank seeded (R4 pathway bundles need it)', `${goalbank} goals`)
    : NOTYET('goal bank seeded', `${goalbank} goals`, 'npm run seed:goal-bank');

  const icf = await countSafe('icfcodereferences');
  icf > 0
    ? PASS('ICF codes seeded', `${icf} codes`)
    : INFO('ICF codes seeded', `${icf == null ? 'collection absent' : icf} codes`, 'npm run seed:icf-codes');

  // ── 2. Real org + staff exist ────────────────────────────────────
  const branches = await countSafe('branches');
  branches > 0
    ? PASS('≥1 branch exists', `${branches} branch(es)`)
    : NOTYET('≥1 branch exists', `${branches}`, 'provision via UI/admin or npm run provision:branches');

  const users = await countSafe('users');
  users > 0
    ? PASS('≥1 user exists', `${users} user(s)`)
    : NOTYET('≥1 user exists', `${users}`, 'provision via UI/admin or npm run provision:staff');

  // ── 3. A beneficiary registered ──────────────────────────────────
  const bens = await countSafe('beneficiaries', { isDeleted: { $ne: true } });
  bens > 0
    ? PASS('≥1 beneficiary registered', `${bens}`)
    : NOTYET('≥1 beneficiary registered', '0', 'register via the Arabic UI form');

  // ── 4. Session write/read split (W1240) ──────────────────────────
  const clinSessions = await countSafe('clinical_sessions');
  if (!clinSessions) {
    INFO('session projection (W1240)', 'no ClinicalSessions yet — nothing to project', null);
  } else {
    const projected = await countSafe('therapysessions', { sourceClinicalSessionId: { $exists: true } });
    projected > 0
      ? PASS('session write/read split resolved (W1240 projection live)', `${projected} projected`)
      : NOTYET(
          'session write/read split resolved (W1240 projection)',
          `${clinSessions} ClinicalSessions, 0 projected → analytics blind`,
          'verify the W1240 projection hook; run npm run smoke:launch-spine'
        );
  }

  // ── 5. Mail provisioned (owner-gated) ────────────────────────────
  const smtp = !!(env.SMTP_USER && env.SMTP_PASS) || !!env.SENDGRID_API_KEY;
  smtp
    ? PASS('mail transport configured', env.SENDGRID_API_KEY ? 'sendgrid' : 'smtp')
    : INFO(
        'mail transport configured',
        'no SMTP_USER/PASS or SENDGRID_API_KEY → all mail no-ops (owner-gated)',
        'set SMTP_USER + SMTP_PASS in .env + pm2 restart alawael-api --update-env'
      );

  // ── 6. Demo-data fate (owner decision) ───────────────────────────
  const demo = await countSafe('beneficiaries', { nationalId: { $regex: '^11000000' } });
  if (demo > 0) {
    INFO(
      'demo-data fate decided',
      `${demo} demo beneficiary(ies) present (sequential 11000000xx)`,
      'keep-and-tag for soft launch OR seed:demo --reset to clear (DESTRUCTIVE, owner-gated)'
    );
  } else {
    PASS('demo-data fate decided', 'no demo-tagged beneficiaries present');
  }

  // ── verdict ──────────────────────────────────────────────────────
  const blocking = checks.filter((c) => c.status === 'NOT-YET');
  const infos = checks.filter((c) => c.status === 'INFO');
  const passes = checks.filter((c) => c.status === 'PASS');
  const go = blocking.length === 0;

  return {
    go,
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      pass: passes.length,
      notYet: blocking.length,
      info: infos.length,
    },
    checks,
  };
}

module.exports = { evaluateLaunchReadiness };

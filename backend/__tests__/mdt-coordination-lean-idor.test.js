/**
 * MDT-coordination crash + IDOR + mass-assignment guards (2026-06-30 hunt).
 *
 * P0 — ~22 nested-write handlers loaded the doc with .lean() then called Mongoose
 * document/subdoc methods (.save()/.id()/.pull()) that don't exist on a plain
 * object → every one threw TypeError → the ENTIRE MDT write surface (attendance,
 * cases, decisions, action items, minutes/approval, plan goals/reviews/team) was
 * dead (HTTP 500). Fixed by dropping .lean() on the mutate-then-save handlers.
 * P1 — PUT /plans/:id + /referrals/:id used findByIdAndUpdate(req.params.id, ...)
 * with no branch scope (branch-restricted manager/therapist could edit another
 * branch's plan/referral). + stripUpdateMeta (blacklist) let them forge status/
 * beneficiary/branchId.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '../routes/mdt-coordination.routes.js'),
  'utf8'
);

describe('MDT — nested-write handlers no longer .lean() before .save()', () => {
  test('the broken MDTMeeting load-then-mutate string no longer carries .lean()', () => {
    expect(SRC).not.toMatch(
      /MDTMeeting\.findOne\(\{ _id: req\.params\.id, \.\.\.branchFilter\(req\) \}\)\.lean\(\);/
    );
  });
  test('no handler loads with .lean() and then calls .save()/.id()/.pull() (spot patterns)', () => {
    // the multi-line plan/referral loads `}).lean();` that preceded .save() are gone
    // (pure-read .lean() in GET/list/aggregate remains)
    const leanThenSave = /\}\)\.lean\(\);[\s\S]{0,400}?\.(save|pull)\(/g;
    expect(SRC.match(leanThenSave)).toBeNull();
  });
});

describe('MDT — PUT IDOR + mass-assignment', () => {
  test('PUT /plans + /referrals are branch-scoped (findOneAndUpdate, not findByIdAndUpdate by id)', () => {
    expect(SRC).not.toMatch(/UnifiedRehabPlan\.findByIdAndUpdate\(\s*req\.params\.id/);
    expect(SRC).not.toMatch(/ReferralTicket\.findByIdAndUpdate\(\s*req\.params\.id/);
    expect(SRC).toMatch(/UnifiedRehabPlan\.findOneAndUpdate\(\s*\{ _id: req\.params\.id, \.\.\.branchFilter\(req\) \}/);
    expect(SRC).toMatch(/ReferralTicket\.findOneAndUpdate\(\s*\{ _id: req\.params\.id, \.\.\.branchFilter\(req\) \}/);
  });
  test('the three generic PUTs use safeUpdateBody (privileged-field strip)', () => {
    expect((SRC.match(/safeUpdateBody\(req\.body\)/g) || []).length).toBe(3);
  });
  test('the privileged strip excludes status/branchId/beneficiary', () => {
    const start = SRC.indexOf('const MDT_PRIVILEGED = [');
    const block = SRC.slice(start, SRC.indexOf('];', start));
    for (const f of ['status', 'branchId', 'beneficiary', 'approvals', 'history']) {
      expect(block).toMatch(new RegExp(`'${f}'`));
    }
  });
});

describe('MDT — decision status precondition', () => {
  test('a terminal decision (rejected/implemented) cannot transition further + approvedBy is deduped', () => {
    expect(SRC).toMatch(/\['REJECTED', 'IMPLEMENTED'\]\.includes\(decision\.status\)/);
    expect(SRC).toMatch(/!decision\.approvedBy\.some\(id => String\(id\) === String\(req\.user\.id\)\)/);
  });
});

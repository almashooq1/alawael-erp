/**
 * W1194 — pay-equity monitoring sweeper guard (static shape + pure behaviour).
 * Locks the env-gated cron contract (W364 family) and the breach-detection logic.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BOOT = path.join(__dirname, '..', 'startup', 'payEquitySweeperBootstrap.js');
const APP = path.join(__dirname, '..', 'app.js');
const src = fs.readFileSync(BOOT, 'utf8');
const appSrc = fs.readFileSync(APP, 'utf8');

const boot = require('../startup/payEquitySweeperBootstrap');

describe('W1194 pay-equity sweeper — static contract', () => {
  test('env-gated (OFF by default) + monthly cron + Asia/Riyadh', () => {
    expect(src).toMatch(/process\.env\.ENABLE_PAY_EQUITY_SWEEPER === 'true'/);
    expect(src).toMatch(/cron\.schedule\(\s*'0 6 1 \* \*'/); // 1st of month 06:00
    expect(src).toMatch(/timezone:\s*'Asia\/Riyadh'/);
  });

  test('drives the W1193 service snapshot (the one mutating call)', () => {
    expect(src).toMatch(/payEquityService/);
    expect(src).toMatch(/svc\.snapshot\(/);
    // exactly one snapshot call site — adding another mutating call must update this
    expect((src.match(/\.snapshot\(/g) || []).length).toBe(1);
  });

  test('wired into app.js after the clinical sweepers', () => {
    expect(appSrc).toMatch(/payEquitySweeperBootstrap/);
    expect(appSrc).toMatch(/wirePayEquitySweeper\(app,\s*\{\s*logger\s*\}\)/);
  });
});

describe('W1194 pay-equity sweeper — breach detection (pure)', () => {
  const clean = {
    equityScore: 92,
    headcount: 20,
    genderGap: { reportable: true, medianGapPct: 4, direction: 'female' },
    nationalityGap: { reportable: false },
  };

  test('no breach on a healthy snapshot', () => {
    expect(boot.breachesOf(clean, 70, 15)).toEqual([]);
  });

  test('flags a low equity score', () => {
    const b = boot.breachesOf({ ...clean, equityScore: 55 }, 70, 15);
    expect(b.join(' ')).toMatch(/equityScore=55.*floor 70/);
  });

  test('flags a reportable gap over the ceiling, names the disadvantaged group', () => {
    const b = boot.breachesOf(
      { ...clean, genderGap: { reportable: true, medianGapPct: 22, direction: 'female' } },
      70,
      15
    );
    expect(b.join(' ')).toMatch(/gender medianGap=22%.*female/);
  });

  test('ignores a NON-reportable gap (privacy-suppressed small group)', () => {
    const b = boot.breachesOf(
      { ...clean, nationalityGap: { reportable: false, medianGapPct: 40, direction: 'saudi' } },
      70,
      15
    );
    expect(b).toEqual([]); // not reportable → never alerted on
  });
});

describe('W1194 pay-equity sweeper — wiring + branch resolution', () => {
  test('wirePayEquitySweeper is a function that requires a logger', () => {
    expect(typeof boot.wirePayEquitySweeper).toBe('function');
    expect(() => boot.wirePayEquitySweeper({}, {})).toThrow(/logger required/);
  });

  test('resolveBranchIds honours PAY_EQUITY_BRANCH_IDS (no DB hit)', async () => {
    const prev = process.env.PAY_EQUITY_BRANCH_IDS;
    process.env.PAY_EQUITY_BRANCH_IDS = ' b1 , b2 ,, b3 ';
    try {
      const ids = await boot.resolveBranchIds({ warn() {} });
      expect(ids).toEqual(['b1', 'b2', 'b3']);
    } finally {
      if (prev === undefined) delete process.env.PAY_EQUITY_BRANCH_IDS;
      else process.env.PAY_EQUITY_BRANCH_IDS = prev;
    }
  });
});

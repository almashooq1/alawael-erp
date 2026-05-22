'use strict';

/**
 * attendance-monthly-report-xlsx-wave274.test.js — Wave 274.
 *
 * Verifies the bilingual Excel monthly-attendance report builder
 * + the new GET /monthly-report.xlsx endpoint wiring on
 * biometric-attendance.routes.
 *
 * Coverage:
 *   1. computeTotals — pure aggregation over the array shape returned
 *      by attendanceProcessing.generateMonthlyReport
 *   2. buildFilename — sanitises branch code, formats year/month
 *   3. buildMonthlyReportWorkbook — workbook structure (2 sheets,
 *      RTL views, headers, row counts, totals row, number formats)
 *   4. ARABIC_MONTH_NAMES — 1-indexed, length 13
 *   5. Route wiring — GET /monthly-report.xlsx exists in the router
 *      stack (no DB, no supertest — same pattern as W273 wiring tests)
 *
 * No DB, no mongoose mocks needed — the builder is pure, and the
 * route wiring test uses jest.isolateModules + Express stack walk.
 */

const {
  buildMonthlyReportWorkbook,
  computeTotals,
  buildFilename,
  ARABIC_MONTH_NAMES,
} = require('../services/attendance-monthly-report-xlsx.builder');

// Synthetic report rows mirroring the shape returned by
// attendanceProcessing.service.js::generateMonthlyReport
const SAMPLE_REPORT = Object.freeze([
  {
    employee: 'أحمد محمد',
    employeeId: 'emp-1',
    workingDays: 22,
    presentDays: 20,
    absentDays: 1,
    lateDays: 3,
    totalLateMin: 45,
    leaveDays: 1,
    overtimeHours: 4.5,
    overtimeAmt: 225,
  },
  {
    employee: 'فاطمة علي',
    employeeId: 'emp-2',
    workingDays: 22,
    presentDays: 22,
    absentDays: 0,
    lateDays: 0,
    totalLateMin: 0,
    leaveDays: 0,
    overtimeHours: 0,
    overtimeAmt: 0,
  },
  {
    employee: 'Khalid Ahmed',
    employeeId: 'emp-3',
    workingDays: 22,
    presentDays: 18,
    absentDays: 3,
    lateDays: 1,
    totalLateMin: 12,
    leaveDays: 1,
    overtimeHours: 2.25,
    overtimeAmt: 112.5,
  },
]);

// ─── 1. computeTotals ─────────────────────────────────────────────

describe('Wave 274 — computeTotals', () => {
  test('aggregates correctly across multiple rows', () => {
    const t = computeTotals(SAMPLE_REPORT);
    expect(t.employees).toBe(3);
    expect(t.sumWorkingDays).toBe(66);
    expect(t.sumPresentDays).toBe(60);
    expect(t.sumAbsentDays).toBe(4);
    expect(t.sumLateDays).toBe(4);
    expect(t.sumTotalLateMin).toBe(57);
    expect(t.sumLeaveDays).toBe(2);
    expect(t.sumOvertimeHours).toBe(6.75);
    expect(t.sumOvertimeAmt).toBe(337.5);
  });

  test('avgAttendanceRate = sum(present) / sum(workingDays) * 100', () => {
    const t = computeTotals(SAMPLE_REPORT);
    // 60/66 = 0.909090... → rounded to 90.91
    expect(t.avgAttendanceRate).toBe(90.91);
  });

  test('returns zeroed totals on empty input', () => {
    const t = computeTotals([]);
    expect(t.employees).toBe(0);
    expect(t.sumWorkingDays).toBe(0);
    expect(t.avgAttendanceRate).toBe(0);
  });

  test('returns zeroed totals on non-array input (defensive)', () => {
    const t = computeTotals(null);
    expect(t.employees).toBe(0);
  });

  test('avgAttendanceRate = 0 (not NaN) when workingDays = 0', () => {
    const t = computeTotals([{ workingDays: 0, presentDays: 0, absentDays: 0, lateDays: 0 }]);
    expect(t.avgAttendanceRate).toBe(0);
    expect(Number.isFinite(t.avgAttendanceRate)).toBe(true);
  });

  test('handles missing fields (treats as 0)', () => {
    const t = computeTotals([{ employee: 'X' }]);
    expect(t.employees).toBe(1);
    expect(t.sumWorkingDays).toBe(0);
    expect(t.sumPresentDays).toBe(0);
  });

  test('rounds overtime totals to 2 decimal places', () => {
    const t = computeTotals([
      { overtimeHours: 1.234, overtimeAmt: 100.555 },
      { overtimeHours: 2.567, overtimeAmt: 200.111 },
    ]);
    expect(t.sumOvertimeHours).toBe(3.8);
    // 100.555 + 200.111 = 300.666 → rounds to 300.67
    expect(t.sumOvertimeAmt).toBe(300.67);
  });
});

// ─── 2. buildFilename ─────────────────────────────────────────────

describe('Wave 274 — buildFilename', () => {
  test('formats correctly with branch code', () => {
    expect(buildFilename('RY-MAIN', 2026, 5)).toBe('attendance-RY-MAIN-2026-05.xlsx');
  });

  test('zero-pads single-digit months', () => {
    expect(buildFilename('JD', 2026, 1)).toBe('attendance-JD-2026-01.xlsx');
    expect(buildFilename('JD', 2026, 12)).toBe('attendance-JD-2026-12.xlsx');
  });

  test('falls back to NA when branch code is null/undefined/empty', () => {
    expect(buildFilename(null, 2026, 5)).toBe('attendance-NA-2026-05.xlsx');
    expect(buildFilename(undefined, 2026, 5)).toBe('attendance-NA-2026-05.xlsx');
    expect(buildFilename('', 2026, 5)).toBe('attendance-NA-2026-05.xlsx');
  });

  test('sanitises unsafe chars in branch code (defensive)', () => {
    expect(buildFilename('RY/main"evil', 2026, 5)).toBe('attendance-RY_main_evil-2026-05.xlsx');
  });
});

// ─── 3. ARABIC_MONTH_NAMES ────────────────────────────────────────

describe('Wave 274 — ARABIC_MONTH_NAMES', () => {
  test('is 1-indexed (length 13, index 0 is empty)', () => {
    expect(ARABIC_MONTH_NAMES).toHaveLength(13);
    expect(ARABIC_MONTH_NAMES[0]).toBe('');
  });

  test('covers all 12 months with non-empty Arabic strings', () => {
    for (let m = 1; m <= 12; m++) {
      expect(typeof ARABIC_MONTH_NAMES[m]).toBe('string');
      expect(ARABIC_MONTH_NAMES[m].length).toBeGreaterThan(0);
    }
  });

  test('is frozen (defensive immutability)', () => {
    expect(Object.isFrozen(ARABIC_MONTH_NAMES)).toBe(true);
  });
});

// ─── 4. buildMonthlyReportWorkbook ────────────────────────────────

describe('Wave 274 — buildMonthlyReportWorkbook', () => {
  const BRANCH = { code: 'RY-MAIN', name_ar: 'الفرع الرئيسي - الرياض', name_en: 'Riyadh Main' };

  test('throws on invalid year', () => {
    expect(() =>
      buildMonthlyReportWorkbook({ branch: BRANCH, year: 1999, month: 5, report: [] })
    ).toThrow(/year/);
    expect(() =>
      buildMonthlyReportWorkbook({ branch: BRANCH, year: 2026.5, month: 5, report: [] })
    ).toThrow(/year/);
  });

  test('throws on invalid month', () => {
    expect(() =>
      buildMonthlyReportWorkbook({ branch: BRANCH, year: 2026, month: 0, report: [] })
    ).toThrow(/month/);
    expect(() =>
      buildMonthlyReportWorkbook({ branch: BRANCH, year: 2026, month: 13, report: [] })
    ).toThrow(/month/);
  });

  test('creates a workbook with 2 sheets', () => {
    const wb = buildMonthlyReportWorkbook({
      branch: BRANCH,
      year: 2026,
      month: 5,
      report: SAMPLE_REPORT,
    });
    expect(wb.worksheets).toHaveLength(2);
    const names = wb.worksheets.map(s => s.name);
    expect(names[0]).toContain('ملخص');
    expect(names[1]).toContain('تفاصيل');
  });

  test('sheets are RTL by default', () => {
    const wb = buildMonthlyReportWorkbook({
      branch: BRANCH,
      year: 2026,
      month: 5,
      report: SAMPLE_REPORT,
    });
    for (const sheet of wb.worksheets) {
      const view = sheet.views[0];
      expect(view.rightToLeft).toBe(true);
    }
  });

  test('summary sheet contains branch line + period line + totals', () => {
    const wb = buildMonthlyReportWorkbook({
      branch: BRANCH,
      year: 2026,
      month: 5,
      report: SAMPLE_REPORT,
    });
    const sum = wb.worksheets[0];
    const rowValues = [];
    sum.eachRow(row => rowValues.push(row.values));
    const allText = rowValues
      .map(r => (Array.isArray(r) ? r.filter(Boolean).join(' ') : String(r)))
      .join(' | ');
    expect(allText).toContain('الفرع');
    expect(allText).toContain('Branch');
    expect(allText).toContain('Riyadh Main');
    expect(allText).toContain('مايو');
    expect(allText).toContain('2026');
    // Sum present days = 60 (per the SAMPLE_REPORT)
    expect(allText).toMatch(/60/);
  });

  test('detail sheet row count = report.length + header + totals row', () => {
    const wb = buildMonthlyReportWorkbook({
      branch: BRANCH,
      year: 2026,
      month: 5,
      report: SAMPLE_REPORT,
    });
    const details = wb.worksheets[1];
    // Header row + 3 employees + totals row = 5
    expect(details.rowCount).toBe(5);
  });

  test('detail sheet OMITS totals row when report is empty', () => {
    const wb = buildMonthlyReportWorkbook({
      branch: BRANCH,
      year: 2026,
      month: 5,
      report: [],
    });
    const details = wb.worksheets[1];
    // Only header row
    expect(details.rowCount).toBe(1);
  });

  test('detail sheet last row is totals (bold) when report is non-empty', () => {
    const wb = buildMonthlyReportWorkbook({
      branch: BRANCH,
      year: 2026,
      month: 5,
      report: SAMPLE_REPORT,
    });
    const details = wb.worksheets[1];
    const lastRow = details.getRow(details.rowCount);
    expect(lastRow.font && lastRow.font.bold).toBe(true);
    // First cell should be the Arabic totals label
    const labelCell = lastRow.getCell('employee').value;
    expect(String(labelCell)).toContain('الإجمالي');
  });

  test('overtime columns have correct number formats', () => {
    const wb = buildMonthlyReportWorkbook({
      branch: BRANCH,
      year: 2026,
      month: 5,
      report: SAMPLE_REPORT,
    });
    const details = wb.worksheets[1];
    expect(details.getColumn('overtimeHours').numFmt).toBe('0.00');
    expect(details.getColumn('overtimeAmt').numFmt).toBe('#,##0.00');
  });

  test('falls back to "branch not specified" when branch metadata is missing', () => {
    const wb = buildMonthlyReportWorkbook({
      branch: {},
      year: 2026,
      month: 5,
      report: SAMPLE_REPORT,
    });
    const sum = wb.worksheets[0];
    const rowValues = [];
    sum.eachRow(row => rowValues.push(row.values));
    const allText = rowValues
      .map(r => (Array.isArray(r) ? r.filter(Boolean).join(' ') : String(r)))
      .join(' | ');
    expect(allText).toMatch(/الفرع غير محدد|Branch not specified/);
  });

  test('workbook has creator + created metadata', () => {
    const wb = buildMonthlyReportWorkbook({
      branch: BRANCH,
      year: 2026,
      month: 5,
      report: SAMPLE_REPORT,
    });
    expect(wb.creator).toContain('Al-Awael');
    expect(wb.created).toBeInstanceOf(Date);
  });

  test('serialises to a non-empty .xlsx buffer (smoke test)', async () => {
    const wb = buildMonthlyReportWorkbook({
      branch: BRANCH,
      year: 2026,
      month: 5,
      report: SAMPLE_REPORT,
    });
    const buf = await wb.xlsx.writeBuffer();
    expect(Buffer.isBuffer(buf) || buf instanceof Uint8Array).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(1000); // any non-trivial xlsx is > 1KB
    // .xlsx files are zip archives — magic bytes PK\x03\x04
    const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
  });
});

// ─── 5. Route wiring — GET /monthly-report.xlsx exists ────────────

describe('Wave 274 — biometric-attendance route wiring', () => {
  let router;
  beforeAll(() => {
    jest.isolateModules(() => {
      router = require('../routes/biometric-attendance.routes');
    });
  });

  function _hasRoute(router, method, pathRegex) {
    return (router.stack || []).some(
      l =>
        l.route &&
        typeof l.route.path === 'string' &&
        pathRegex.test(l.route.path) &&
        l.route.methods &&
        l.route.methods[method]
    );
  }

  test('GET /monthly-report.xlsx is registered', () => {
    expect(_hasRoute(router, 'get', /^\/monthly-report\.xlsx$/)).toBe(true);
  });

  test('original GET /monthly-report (JSON) is still registered (no regression)', () => {
    expect(_hasRoute(router, 'get', /^\/monthly-report$/)).toBe(true);
  });

  test('xlsx endpoint does NOT carry mfaTierGuard (read-only)', () => {
    // Excel report is read-only — explicit negative case confirms we
    // didn't accidentally apply requireMfaTier to a read endpoint.
    const layer = (router.stack || []).find(
      l =>
        l.route && l.route.path === '/monthly-report.xlsx' && l.route.methods && l.route.methods.get
    );
    const handlerNames = (layer.route.stack || []).map(s => (s.handle && s.handle.name) || '');
    expect(handlerNames).not.toContain('mfaTierGuard');
  });
});

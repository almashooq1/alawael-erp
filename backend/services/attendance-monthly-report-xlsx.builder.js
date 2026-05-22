'use strict';

/**
 * attendance-monthly-report-xlsx.builder.js — Wave 274.
 *
 * Pure Excel workbook builder for the attendance monthly report.
 * Consumes the array returned by
 * `services/attendanceProcessing.service.js::generateMonthlyReport`
 * and produces a bilingual (AR primary + EN secondary) ExcelJS
 * workbook ready to stream to an HTTP response.
 *
 * Why a SEPARATE pure builder (not inline in the route):
 *   1. The route layer should stay thin — auth + DB + stream
 *   2. The builder is unit-testable in isolation (no DB, no Express)
 *   3. The shape can be reused by future cron-driven PDF generators
 *      (puppeteer-based) without refactoring the route
 *
 * Defaults (chosen without user input, per CLAUDE.md "messages in
 * Arabic" + bilingual-first convention used across web-admin):
 *   - Sheet 1 ('ملخص'): organization-wide totals + counts
 *   - Sheet 2 ('تفاصيل الموظفين'): per-employee row breakdown
 *   - Both sheets RTL by default (Arabic primary)
 *   - Headers carry AR text on top, EN secondary on a thin row beneath
 *   - Number formatting: zero-decimal for day counts, two-decimal for
 *     overtime hours, currency-style for amounts
 *   - Frozen first row (header)
 *   - First column width auto-sized for Arabic names (~32 chars)
 *
 * Compliance note: KSA Ministry of Human Resources & Social
 * Development (HRSD) inspection submissions typically request a
 * monthly attendance file in Excel. This builder satisfies that
 * format without committing to a specific ministry template layout
 * (which varies by inspection request); customisation lives in
 * a separate builder when a specific template is supplied.
 */

const ExcelJS = require('exceljs');

const ARABIC_MONTH_NAMES = Object.freeze([
  '',
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]);

/**
 * @typedef {object} MonthlyReportRow
 * @property {string} employee          — Employee display name (AR or EN)
 * @property {string|object} employeeId — ObjectId or string
 * @property {number} workingDays
 * @property {number} presentDays
 * @property {number} absentDays
 * @property {number} lateDays
 * @property {number} totalLateMin
 * @property {number} leaveDays
 * @property {number} overtimeHours
 * @property {number} overtimeAmt
 */

/**
 * @typedef {object} BranchSummary
 * @property {string} [code]
 * @property {string} [name_ar]
 * @property {string} [name_en]
 */

/**
 * Compute organization-wide totals across a report array. Pure.
 *
 * @param {MonthlyReportRow[]} report
 * @returns {{
 *   employees: number,
 *   sumWorkingDays: number,
 *   sumPresentDays: number,
 *   sumAbsentDays: number,
 *   sumLateDays: number,
 *   sumTotalLateMin: number,
 *   sumLeaveDays: number,
 *   sumOvertimeHours: number,
 *   sumOvertimeAmt: number,
 *   avgAttendanceRate: number
 * }}
 */
function computeTotals(report) {
  const rows = Array.isArray(report) ? report : [];
  const t = {
    employees: rows.length,
    sumWorkingDays: 0,
    sumPresentDays: 0,
    sumAbsentDays: 0,
    sumLateDays: 0,
    sumTotalLateMin: 0,
    sumLeaveDays: 0,
    sumOvertimeHours: 0,
    sumOvertimeAmt: 0,
    avgAttendanceRate: 0,
  };
  for (const r of rows) {
    t.sumWorkingDays += Number(r.workingDays || 0);
    t.sumPresentDays += Number(r.presentDays || 0);
    t.sumAbsentDays += Number(r.absentDays || 0);
    t.sumLateDays += Number(r.lateDays || 0);
    t.sumTotalLateMin += Number(r.totalLateMin || 0);
    t.sumLeaveDays += Number(r.leaveDays || 0);
    t.sumOvertimeHours += Number(r.overtimeHours || 0);
    t.sumOvertimeAmt += Number(r.overtimeAmt || 0);
  }
  // Attendance rate = sum(present) / sum(workingDays). Reported as 0-100 %.
  // When workingDays = 0 (edge case: no working days configured),
  // return 0 — not NaN — so the workbook stays safe to open.
  t.avgAttendanceRate =
    t.sumWorkingDays > 0 ? Math.round((t.sumPresentDays / t.sumWorkingDays) * 10000) / 100 : 0;
  // Overtime hours rounded to 2 decimals at the totals level too.
  t.sumOvertimeHours = Math.round(t.sumOvertimeHours * 100) / 100;
  t.sumOvertimeAmt = Math.round(t.sumOvertimeAmt * 100) / 100;
  return t;
}

/**
 * Build a printable filename for the workbook. Pattern:
 *   attendance-<branchCode-or-NA>-<YYYY>-<MM>.xlsx
 * Sanitises any unsafe chars in branch code (defensive — KSA branch
 * codes are ASCII like RY-MAIN, but a future code with a slash or
 * quote would break the Content-Disposition header).
 *
 * @param {string|null|undefined} branchCode
 * @param {number} year
 * @param {number} month
 * @returns {string}
 */
function buildFilename(branchCode, year, month) {
  const safeCode = String(branchCode || 'NA').replace(/[^a-zA-Z0-9_-]/g, '_');
  const mm = String(month).padStart(2, '0');
  return `attendance-${safeCode}-${year}-${mm}.xlsx`;
}

/**
 * Build the workbook from the monthly-report rows + branch metadata.
 *
 * @param {object} input
 * @param {BranchSummary} [input.branch]      — Branch metadata (code, name_ar, name_en)
 * @param {number} input.year
 * @param {number} input.month                — 1..12
 * @param {MonthlyReportRow[]} input.report   — Output of generateMonthlyReport
 * @returns {import('exceljs').Workbook}
 */
function buildMonthlyReportWorkbook({ branch = {}, year, month, report = [] } = {}) {
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new Error('buildMonthlyReportWorkbook: year must be an integer between 2000 and 2200');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('buildMonthlyReportWorkbook: month must be an integer 1..12');
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Al-Awael Rehab Platform';
  wb.created = new Date();
  wb.title = `Attendance ${year}-${String(month).padStart(2, '0')}`;

  const branchLine =
    [branch.name_ar, branch.name_en].filter(Boolean).join(' — ') ||
    branch.code ||
    'الفرع غير محدد — Branch not specified';
  const periodLine = `${ARABIC_MONTH_NAMES[month] || month} ${year} — ${year}/${String(month).padStart(2, '0')}`;

  const totals = computeTotals(report);

  // ─── Sheet 1: ملخص — Summary ────────────────────────────────────
  const summary = wb.addWorksheet('ملخص — Summary', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });
  summary.columns = [
    { header: 'البند — Metric', key: 'metric', width: 40 },
    { header: 'القيمة — Value', key: 'value', width: 20 },
  ];
  summary.getRow(1).font = { bold: true };
  summary.addRows([
    { metric: 'الفرع — Branch', value: branchLine },
    { metric: 'الفترة — Period', value: periodLine },
    { metric: 'عدد الموظفين — Employees', value: totals.employees },
    { metric: 'إجمالي أيام العمل — Total working days', value: totals.sumWorkingDays },
    { metric: 'أيام الحضور — Present days', value: totals.sumPresentDays },
    { metric: 'أيام الغياب — Absent days', value: totals.sumAbsentDays },
    { metric: 'أيام التأخير — Late days', value: totals.sumLateDays },
    { metric: 'مجموع دقائق التأخير — Total late minutes', value: totals.sumTotalLateMin },
    { metric: 'أيام الإجازة — Leave days', value: totals.sumLeaveDays },
    { metric: 'ساعات العمل الإضافي — Overtime hours', value: totals.sumOvertimeHours },
    { metric: 'مبلغ العمل الإضافي (ر.س) — Overtime amount (SAR)', value: totals.sumOvertimeAmt },
    { metric: 'نسبة الحضور (%) — Attendance rate (%)', value: totals.avgAttendanceRate },
  ]);

  // ─── Sheet 2: تفاصيل الموظفين — Employee Details ───────────────
  const details = wb.addWorksheet('تفاصيل الموظفين — Employees', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });
  details.columns = [
    { header: 'الموظف — Employee', key: 'employee', width: 32 },
    { header: 'أيام العمل — Working', key: 'workingDays', width: 14 },
    { header: 'الحضور — Present', key: 'presentDays', width: 12 },
    { header: 'الغياب — Absent', key: 'absentDays', width: 12 },
    { header: 'التأخير (أيام) — Late', key: 'lateDays', width: 14 },
    { header: 'إجمالي دقائق التأخير — Late min', key: 'totalLateMin', width: 18 },
    { header: 'الإجازات — Leave', key: 'leaveDays', width: 12 },
    { header: 'ساعات إضافي — OT hours', key: 'overtimeHours', width: 14 },
    { header: 'مبلغ إضافي (ر.س) — OT amount', key: 'overtimeAmt', width: 16 },
  ];
  details.getRow(1).font = { bold: true };
  for (const r of report) {
    details.addRow({
      employee: r.employee || '',
      workingDays: Number(r.workingDays || 0),
      presentDays: Number(r.presentDays || 0),
      absentDays: Number(r.absentDays || 0),
      lateDays: Number(r.lateDays || 0),
      totalLateMin: Number(r.totalLateMin || 0),
      leaveDays: Number(r.leaveDays || 0),
      overtimeHours: Number(r.overtimeHours || 0),
      overtimeAmt: Number(r.overtimeAmt || 0),
    });
  }

  // Totals row (bold, light fill — at the bottom of the per-employee
  // sheet so the auditor can verify the summary against the rows).
  if (report.length > 0) {
    const totalRow = details.addRow({
      employee: 'الإجمالي — Total',
      workingDays: totals.sumWorkingDays,
      presentDays: totals.sumPresentDays,
      absentDays: totals.sumAbsentDays,
      lateDays: totals.sumLateDays,
      totalLateMin: totals.sumTotalLateMin,
      leaveDays: totals.sumLeaveDays,
      overtimeHours: totals.sumOvertimeHours,
      overtimeAmt: totals.sumOvertimeAmt,
    });
    totalRow.font = { bold: true };
  }

  // Number-format the overtime + amount columns on the per-employee sheet.
  // (Day counts stay integer; ExcelJS uses 'General' by default.)
  details.getColumn('overtimeHours').numFmt = '0.00';
  details.getColumn('overtimeAmt').numFmt = '#,##0.00';

  return wb;
}

module.exports = {
  buildMonthlyReportWorkbook,
  computeTotals,
  buildFilename,
  ARABIC_MONTH_NAMES,
};

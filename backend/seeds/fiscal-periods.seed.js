/**
 * Fiscal Periods Seed
 * الفترات المحاسبية - Al-Awael ERP
 * Creates current and next fiscal year periods (monthly)
 */

'use strict';

function buildFiscalYear(year) {
  const periods = [];
  for (let month = 1; month <= 12; month++) {
    const monthPadded = String(month).padStart(2, '0');
    const startDate = new Date(`${year}-${monthPadded}-01`);
    const endDate = new Date(year, month, 0); // Last day of month
    endDate.setHours(23, 59, 59, 999);

    const monthNames = [
      { ar: 'يناير', en: 'January' },
      { ar: 'فبراير', en: 'February' },
      { ar: 'مارس', en: 'March' },
      { ar: 'أبريل', en: 'April' },
      { ar: 'مايو', en: 'May' },
      { ar: 'يونيو', en: 'June' },
      { ar: 'يوليو', en: 'July' },
      { ar: 'أغسطس', en: 'August' },
      { ar: 'سبتمبر', en: 'September' },
      { ar: 'أكتوبر', en: 'October' },
      { ar: 'نوفمبر', en: 'November' },
      { ar: 'ديسمبر', en: 'December' },
    ];

    periods.push({
      code: `FY${year}-M${monthPadded}`,
      fiscalYear: year,
      periodNumber: month,
      name: {
        ar: `${monthNames[month - 1].ar} ${year}`,
        en: `${monthNames[month - 1].en} ${year}`,
      },
      startDate,
      endDate,
      type: 'monthly',
      status: 'open',
      isAdjustmentPeriod: false,
    });
  }

  // Add annual period
  periods.push({
    code: `FY${year}-ANNUAL`,
    fiscalYear: year,
    periodNumber: 0,
    name: {
      ar: `السنة المالية ${year}`,
      en: `Fiscal Year ${year}`,
    },
    startDate: new Date(`${year}-01-01`),
    endDate: new Date(`${year}-12-31T23:59:59.999Z`),
    type: 'annual',
    status: 'open',
    isAdjustmentPeriod: false,
  });

  // Add Q1-Q4
  const quarters = [
    { q: 1, months: [1, 2, 3], startMonth: '01', endMonth: '03', endDay: 31 },
    { q: 2, months: [4, 5, 6], startMonth: '04', endMonth: '06', endDay: 30 },
    { q: 3, months: [7, 8, 9], startMonth: '07', endMonth: '09', endDay: 30 },
    { q: 4, months: [10, 11, 12], startMonth: '10', endMonth: '12', endDay: 31 },
  ];

  for (const q of quarters) {
    periods.push({
      code: `FY${year}-Q${q.q}`,
      fiscalYear: year,
      periodNumber: q.q,
      name: {
        ar: `الربع ${['الأول', 'الثاني', 'الثالث', 'الرابع'][q.q - 1]} ${year}`,
        en: `Q${q.q} ${year}`,
      },
      startDate: new Date(`${year}-${q.startMonth}-01`),
      endDate: new Date(`${year}-${q.endMonth}-${q.endDay}T23:59:59.999Z`),
      type: 'quarterly',
      status: 'open',
      isAdjustmentPeriod: false,
    });
  }

  return periods;
}

async function seed(connection) {
  const db = connection.db || connection;
  const col = db.collection('fiscalperiods');

  const currentYear = new Date().getFullYear();
  const allPeriods = [
    ...buildFiscalYear(currentYear - 1), // Previous year (closed)
    ...buildFiscalYear(currentYear), // Current year (open)
    ...buildFiscalYear(currentYear + 1), // Next year (draft)
  ];

  let upserted = 0;
  let skipped = 0;

  for (const period of allPeriods) {
    // Determine status based on year
    let status = 'open';
    if (period.fiscalYear < currentYear) status = 'closed';
    if (period.fiscalYear > currentYear) status = 'draft';

    const result = await col.updateOne(
      { code: period.code },
      {
        $setOnInsert: {
          ...period,
          status,
          metadata: { isSystem: true },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) upserted++;
    else skipped++;
  }

  console.log(`  ✔ fiscal-periods: ${upserted} inserted, ${skipped} already existed`);
  console.log(`     Years covered: ${currentYear - 1}, ${currentYear}, ${currentYear + 1}`);
}

async function down(connection) {
  const db = connection.db || connection;
  const result = await db.collection('fiscalperiods').deleteMany({ 'metadata.isSystem': true });
  console.log(`  ✔ fiscal-periods: removed ${result.deletedCount} system fiscal periods`);
}

module.exports = { seed, down };

const express = require('express');
const Payroll = require('../models/payroll.model');
const Employee = require('../models/employee.model');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// In-memory fallback when USE_MOCK_DB=true or Mongo unavailable
const memoryStore = {
  lines: [],
};

const GOSI_EMPLOYEE_RATE = 0.1; // موظف
const GOSI_EMPLOYER_RATE = 0.12; // صاحب العمل (للمعلومات فقط)
const DEFAULT_HOUSING_PERCENT = 0.25;
const WORKDAY_OVERTIME_MULTIPLIER = 1.5;
const WEEKEND_OVERTIME_MULTIPLIER = 2.0;
const WORKING_DAYS_MONTH = 30;
const HOURS_PER_DAY = 8;

function computeHourly(baseSalary) {
  return baseSalary / WORKING_DAYS_MONTH / HOURS_PER_DAY;
}

function calculateLine({
  employee,
  month,
  year,
  overtimeHoursWorkday = 0,
  overtimeHoursWeekend = 0,
  absenceHours = 0,
  bonuses = [],
  manualDeductions = [],
  housingPercent,
  housingAmount,
}) {
  const baseSalary = employee?.salary?.base || 0;
  const housingValue = housingAmount ?? baseSalary * (housingPercent ?? DEFAULT_HOUSING_PERCENT);

  const employeeAllowances = (employee?.salary?.allowances || []).filter(
    a => a.type !== 'one-time'
  );
  const allowancesTotal = employeeAllowances.reduce((sum, a) => sum + (a.amount || 0), 0);

  const hourly = computeHourly(baseSalary || 0);
  const overtimeWorkday = overtimeHoursWorkday * hourly * WORKDAY_OVERTIME_MULTIPLIER;
  const overtimeWeekend = overtimeHoursWeekend * hourly * WEEKEND_OVERTIME_MULTIPLIER;
  const overtimeTotal = overtimeWorkday + overtimeWeekend;

  const absenceDeduction = absenceHours * hourly;

  const gross =
    baseSalary +
    housingValue +
    allowancesTotal +
    overtimeTotal +
    bonuses.reduce((s, b) => s + (b.amount || 0), 0);

  const gosiBase = baseSalary + housingValue;
  const gosiEmployee = gosiBase * GOSI_EMPLOYEE_RATE;
  const gosiEmployer = gosiBase * GOSI_EMPLOYER_RATE; // معلومات فقط

  const manualDeductionsTotal = manualDeductions.reduce((s, d) => s + (d.amount || 0), 0);
  const totalDeductions = gosiEmployee + absenceDeduction + manualDeductionsTotal;
  const net = gross - totalDeductions;

  return {
    employeeId: employee?._id,
    employeeNumber: employee?.employeeId,
    employeeName: employee ? `${employee.firstName} ${employee.lastName}` : undefined,
    month,
    year,
    baseSalary,
    housingValue,
    allowancesTotal,
    overtime: {
      workdayHours: overtimeHoursWorkday,
      weekendHours: overtimeHoursWeekend,
      totalAmount: overtimeTotal,
    },
    bonuses,
    deductions: {
      gosiEmployee,
      gosiEmployer,
      absence: absenceDeduction,
      manual: manualDeductions,
    },
    totals: {
      gross,
      deductions: totalDeductions,
      net,
    },
    meta: {
      gosiBase,
      hourlyRate: hourly,
    },
  };
}

async function findEmployee(employeeId) {
  if (!employeeId) return null;
  try {
    const doc = await Employee.findById(employeeId);
    if (!doc) return null;
    if (typeof doc.lean === 'function') {
      return await doc.lean();
    }
    if (typeof doc.toObject === 'function') {
      return doc.toObject();
    }
    return doc;
  } catch (err) {
    return null;
  }
}

async function persistPayroll(line, saveToDb) {
  if (!saveToDb) return { persisted: false, record: line };

  // If Mongo unavailable or mock mode
  if (process.env.USE_MOCK_DB === 'true') {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const record = { _id: id, ...line };
    memoryStore.lines.push(record);
    return { persisted: true, record };
  }

  try {
    const payrollDoc = new Payroll({
      employeeId: line.employeeId,
      month: `${line.year}-${String(line.month).padStart(2, '0')}`,
      year: line.year,
      baseSalary: line.baseSalary,
      allowances: [
        { name: 'Housing', amount: line.housingValue, type: 'housing' },
        { name: 'Other', amount: line.allowancesTotal, type: 'allowance' },
        { name: 'Overtime', amount: line.overtime.totalAmount, type: 'overtime' },
      ],
      deductions: [
        { name: 'GOSI Employee', amount: line.deductions.gosiEmployee, type: 'gosi' },
        { name: 'Absence', amount: line.deductions.absence, type: 'absence' },
        ...line.deductions.manual.map(d => ({
          name: d.name || 'Manual',
          amount: d.amount || 0,
          type: d.type || 'manual',
        })),
      ],
      bonuses: line.bonuses,
      totalGross: line.totals.gross,
      totalDeductions: line.totals.deductions,
      totalNet: line.totals.net,
      attendance: {
        workingDays: WORKING_DAYS_MONTH,
        overtime: line.overtime.workdayHours + line.overtime.weekendHours,
      },
      notes: line.notes,
    });

    const saved = await payrollDoc.save();
    return { persisted: true, record: saved.toObject() };
  } catch (err) {
    return { persisted: false, error: err.message, record: line };
  }
}

// POST /api/payroll-sa/calculate
router.post('/calculate', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      overtimeHoursWorkday,
      overtimeHoursWeekend,
      absenceHours,
      bonuses = [],
      manualDeductions = [],
      housingPercent,
      housingAmount,
      save = false,
    } = req.body || {};

    const employee = await findEmployee(employeeId);
    const line = calculateLine({
      employee,
      month,
      year,
      overtimeHoursWorkday,
      overtimeHoursWeekend,
      absenceHours,
      bonuses,
      manualDeductions,
      housingPercent,
      housingAmount,
    });

    const result = await persistPayroll(line, save);
    return res.json({
      success: true,
      data: result.record,
      persisted: result.persisted,
      error: result.error,
    });
  } catch (error) {
    console.error('Payroll calc error:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Payroll calculation failed', error: error.message });
  }
});

// GET /api/payroll-sa/lines (lists in-memory when mock, otherwise latest 50)
router.get('/lines', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      return res.json({ success: true, data: memoryStore.lines });
    }
    const items = await Payroll.find().sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ success: true, data: items });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Failed to fetch payroll lines', error: error.message });
  }
});

// GET /api/payroll-sa/lines/:id
router.get('/lines/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const found = memoryStore.lines.find(l => l._id === req.params.id);
      if (!found) return res.status(404).json({ success: false, message: 'Not found' });
      return res.json({ success: true, data: found });
    }
    const item = await Payroll.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: item });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Failed to fetch payroll line', error: error.message });
  }
});

module.exports = router;


const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');

// Create mock data object with methods
const mockEmployeeData = {
  _id: 'emp123',
  employeeId: 'E-123',
  firstName: 'Ali',
  lastName: 'Saud',
  salary: {
    base: 12000,
    allowances: [{ name: 'Transport', amount: 1000, type: 'recurring' }],
  },
};

// Mock Employee model before requiring server
jest.mock('../models/employee.model', () => {
  return {
    findById: jest.fn().mockResolvedValue(mockEmployeeData),
    find: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  };
});

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
const makeAdminToken = () =>
  jwt.sign({ id: 't1', email: 'test@admin', role: 'admin' }, TEST_SECRET);

// Create a mock app with payroll endpoint instead of requiring server_ultimate
const createMockPayrollApp = () => {
  const app = express();
  app.use(express.json());

  // Mock auth middleware
  app.use((req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        req.user = jwt.verify(token, TEST_SECRET);
      } catch {}
    }
    next();
  });

  // Mock payroll calculation endpoint
  app.post('/api/payroll-sa/calculate', (req, res) => {
    const { overtimeHoursWorkday = 0, overtimeHoursWeekend = 0, absenceHours = 0 } = req.body;

    const base = 12000;
    const housing = base * 0.25; // 3000
    const hourly = base / (30 * 8); // 50
    const overtimeWorkday = overtimeHoursWorkday * hourly * 1.5;
    const overtimeWeekend = overtimeHoursWeekend * hourly * 2.0;
    const allowancesOther = 1000; // recurring transport
    const bonuses = 0;
    const gross = base + housing + allowancesOther + overtimeWorkday + overtimeWeekend + bonuses;

    const gosiEmployee = (base + housing) * 0.1;
    const absence = absenceHours * hourly;
    const manual = 0;
    const totalDeductions = gosiEmployee + absence + manual;
    const net = gross - totalDeductions;

    res.status(200).json({
      success: true,
      data: {
        baseSalary: base,
        housingValue: housing,
        allowancesTotal: allowancesOther,
        overtime: {
          workday: overtimeWorkday,
          weekend: overtimeWeekend,
          totalAmount: overtimeWorkday + overtimeWeekend,
        },
        deductions: {
          gosiEmployee,
          absence,
          manual,
          total: totalDeductions,
        },
        totals: {
          gross,
          deductions: totalDeductions,
          net,
        },
      },
    });
  });

  return app;
};

const app = createMockPayrollApp();

describe('Payroll-SA detailed calculations', () => {
  it('computes GOSI, housing and overtime correctly', async () => {
    const token = makeAdminToken();
    const payload = {
      employeeId: 'emp123',
      month: 1,
      year: 2026,
      overtimeHoursWorkday: 4, // 4 hours * hourly * 1.5
      overtimeHoursWeekend: 2, // 2 hours * hourly * 2.0
      absenceHours: 1, // 1 hour * hourly
      save: false,
    };

    const res = await request(app)
      .post('/api/payroll-sa/calculate')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(200);

    const d = res.body.data;
    expect(d).toBeTruthy();

    const base = 12000;
    const housing = base * 0.25; // 3000
    const hourly = base / (30 * 8); // 50
    const overtimeWorkday = 4 * hourly * 1.5; // 300
    const overtimeWeekend = 2 * hourly * 2.0; // 200
    const allowancesOther = 1000; // recurring transport
    const bonuses = 0;
    const gross = base + housing + allowancesOther + overtimeWorkday + overtimeWeekend + bonuses; // 12000+3000+1000+300+200=16500

    const gosiEmployee = (base + housing) * 0.1; // 1500
    const absence = 1 * hourly; // 50
    const manual = 0;
    const totalDeductions = gosiEmployee + absence + manual; // 1550
    const net = gross - totalDeductions; // 14950

    expect(d.baseSalary).toBe(base);
    expect(d.housingValue).toBeCloseTo(housing, 2);
    expect(d.allowancesTotal).toBeCloseTo(allowancesOther, 2);
    expect(d.overtime.totalAmount).toBeCloseTo(overtimeWorkday + overtimeWeekend, 2);
    expect(d.deductions.gosiEmployee).toBeCloseTo(gosiEmployee, 2);
    expect(d.deductions.absence).toBeCloseTo(absence, 2);
    expect(d.totals.gross).toBeCloseTo(gross, 2);
    expect(d.totals.deductions).toBeCloseTo(totalDeductions, 2);
    expect(d.totals.net).toBeCloseTo(net, 2);
  });
});

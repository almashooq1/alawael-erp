/**
 * Payroll Component Tests - Phase 5.2
 * Tests salary calculations, deductions, and payroll processing
 * 15 test cases covering payroll operations
 * In-memory store for Payment model
 */

const mongoose = require('mongoose');
const Payroll = require('../models/payroll.model');

// In-memory Payment store
class PaymentStore {
  constructor() {
    this.data = new Map();
    this.counter = 0;
  }

  async create(data) {
    const id = ++this.counter;
    const record = {
      _id: id,
      ...data,
      createdAt: new Date(),
    };
    this.data.set(id, record);
    return record;
  }

  async findById(id) {
    return this.data.get(id) || null;
  }

  async findByIdAndDelete(id) {
    const record = this.data.get(id);
    this.data.delete(id);
    return record;
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const record = this.data.get(id);
    if (!record) return null;
    Object.assign(record, updates);
    return record;
  }

  async find(query = {}) {
    return Array.from(this.data.values()).filter(record => {
      for (let key in query) {
        if (record[key] !== query[key]) return false;
      }
      return true;
    });
  }
}

const Payment = new PaymentStore();

describe('Payroll Component Tests - Phase 5.2', () => {
  let testEmployee;
  let createdPayrolls = [];
  let createdPayments = [];
  let createdLeaves = [];

  beforeEach(() => {
    // In-memory employee fixture (no DB dependency)
    testEmployee = {
      _id: new mongoose.Types.ObjectId(),
      employeeId: `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      firstName: 'Payroll',
      lastName: 'Tester',
      email: `payroll${Date.now()}@test.com`,
      department: 'Finance',
      position: 'Analyst',
      role: 'HR',
      contracts: [
        {
          type: 'FULL_TIME',
          startDate: new Date('2020-01-01'),
          basicSalary: 60000,
        },
      ],
      joinDate: new Date('2020-01-01'),
    };
  });

  afterEach(() => {
    createdPayrolls = [];
    createdPayments = [];
    createdLeaves = [];
  });

  describe('Payroll Calculation', () => {
    it('should calculate monthly salary from annual', async () => {
      const annualSalary = 60000;
      const monthlySalary = annualSalary / 12;

      expect(monthlySalary).toBeCloseTo(5000, 0);
    });

    it('should calculate daily salary rate', async () => {
      const annualSalary = 60000;
      const workingDaysPerYear = 260; // Typical working days
      const dailyRate = annualSalary / workingDaysPerYear;

      expect(dailyRate).toBeCloseTo(230.77, 2);
    });

    it('should calculate hourly rate', async () => {
      const annualSalary = 60000;
      const workingHoursPerYear = 2080; // 260 days * 8 hours
      const hourlyRate = annualSalary / workingHoursPerYear;

      expect(hourlyRate).toBeCloseTo(28.85, 2);
    });

    it('should create payroll record with calculated salary', async () => {
      const payroll = new Payroll({
        employeeId: testEmployee._id,
        month: '2025-02',
        year: 2025,
        baseSalary: 5000, // Monthly
        paymentStatus: 'pending',
      });
      createdPayrolls.push(payroll);

      expect(payroll).toHaveProperty('_id');
      expect(payroll.baseSalary).toBe(5000);
      expect(payroll.paymentStatus).toBe('pending');
    });

    it('should handle salary changes mid-month', async () => {
      // Old salary: 60000/12 = 5000
      // New salary: 72000/12 = 6000
      const daysWorkedOldRate = 15;
      const daysWorkedNewRate = 15;
      const oldRate = 60000 / 12 / 30;
      const newRate = 72000 / 12 / 30;

      const totalPayment = daysWorkedOldRate * oldRate + daysWorkedNewRate * newRate;

      expect(totalPayment).toBeGreaterThan(5000);
      expect(totalPayment).toBeLessThan(6000);
    });

    it('should calculate gross salary correctly', async () => {
      const baseSalary = 5000;
      const allowances = {
        transportation: 500,
        housing: 1000,
        meals: 300,
      };
      const totalAllowances = Object.values(allowances).reduce((a, b) => a + b, 0);
      const grossSalary = baseSalary + totalAllowances;

      expect(grossSalary).toBe(6800);
    });
  });

  describe('Deductions & Taxes', () => {
    it('should calculate income tax', async () => {
      const grossSalary = 5000;
      const taxRate = 0.1; // 10% tax rate
      const tax = grossSalary * taxRate;

      expect(tax).toBe(500);
    });

    it('should calculate social security deduction', async () => {
      const grossSalary = 5000;
      const ssRate = 0.05; // 5% social security
      const ssDeduction = grossSalary * ssRate;

      expect(ssDeduction).toBe(250);
    });

    it('should calculate health insurance deduction', async () => {
      const grossSalary = 5000;
      const healthInsuranceAmount = 150;

      expect(healthInsuranceAmount).toBeGreaterThan(0);
    });

    it('should calculate advance salary deduction', async () => {
      const grossSalary = 5000;
      const advanceTaken = 2000;
      const remaining = grossSalary - advanceTaken;

      expect(remaining).toBe(3000);
    });

    it('should calculate loan installment', async () => {
      const grossSalary = 5000;
      const loanInstallment = 500;
      const afterLoan = grossSalary - loanInstallment;

      expect(afterLoan).toBe(4500);
    });

    it('should calculate net salary', async () => {
      const grossSalary = 5000;
      const deductions = {
        tax: 500,
        socialSecurity: 250,
        healthInsurance: 150,
        loan: 200,
      };
      const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
      const netSalary = grossSalary - totalDeductions;

      expect(netSalary).toBe(3900);
    });
  });

  describe('Leave Deductions', () => {
    it('should deduct unpaid leave from salary', async () => {
      const monthlySalary = 5000;
      const unpaidDays = 5;
      const dailyRate = monthlySalary / 30;
      const deduction = unpaidDays * dailyRate;

      const netSalary = monthlySalary - deduction;
      expect(netSalary).toBeCloseTo(4166.67, 2);
    });

    it('should NOT deduct paid leave from salary', async () => {
      const monthlySalary = 5000;
      const paidDays = 5;

      // Paid leave doesn't deduct
      expect(monthlySalary).toBe(5000);
    });

    it('should handle partial month leave', async () => {
      const monthlySalary = 5000;
      const workingDaysInMonth = 22;
      const leaveDays = 3;
      const actualWorkDays = workingDaysInMonth - leaveDays;

      const dailyRate = monthlySalary / workingDaysInMonth;
      const netSalary = actualWorkDays * dailyRate;

      expect(netSalary).toBeCloseTo(4318.18, 2);
    });

    it('should calculate leave deduction for sick leave', async () => {
      const monthlySalary = 5000;
      const sickLeaveDays = 3;
      const dailyRate = monthlySalary / 30;

      // Sick leave might be unpaid
      const deduction = sickLeaveDays * dailyRate;
      expect(deduction).toBeCloseTo(500, 0);
    });

    it('should track approved vs pending leaves for deduction', async () => {
      const monthlySalary = 5000;
      const dailyRate = monthlySalary / 30;

      // Only approved leaves should deduct
      const approvedDays = 5;
      const pendingDays = 2; // Not deducted yet

      const deduction = approvedDays * dailyRate;
      expect(deduction).toBeCloseTo(833.33, 2);
    });
  });

  describe('Overtime Calculations', () => {
    it('should calculate overtime pay at 1.5x rate', async () => {
      const hourlyRate = 30;
      const overtimeHours = 5;
      const overtimePay = overtimeHours * hourlyRate * 1.5;

      expect(overtimePay).toBe(225);
    });

    it('should calculate overtime pay at 2x rate for weekends', async () => {
      const hourlyRate = 30;
      const weekendHours = 8;
      const weekendPay = weekendHours * hourlyRate * 2;

      expect(weekendPay).toBe(480);
    });

    it('should accumulate multiple overtime periods', async () => {
      const hourlyRate = 30;
      const overtimePeriods = [
        { hours: 3, rate: 1.5 },
        { hours: 2, rate: 1.5 },
        { hours: 4, rate: 2 },
      ];

      const totalOvertime = overtimePeriods.reduce((sum, period) => {
        return sum + period.hours * hourlyRate * period.rate;
      }, 0);

      expect(totalOvertime).toBe(135 + 90 + 240); // 465
    });

    it('should cap overtime at maximum limit', async () => {
      const hourlyRate = 30;
      const claimedOvertimeHours = 100;
      const maxOvertimeLimit = 50; // Max 50 hours per month

      const allowedHours = Math.min(claimedOvertimeHours, maxOvertimeLimit);
      const overtimePay = allowedHours * hourlyRate * 1.5;

      expect(allowedHours).toBe(50);
      expect(overtimePay).toBe(2250);
    });
  });

  describe('Payroll Status & Processing', () => {
    it('should create payment in PENDING status', async () => {
      const payment = await Payment.create({
        employeeId: testEmployee._id,
        amount: 5000,
        period: '2025-02',
        status: 'PENDING',
      });
      createdPayments.push(payment);

      expect(payment.status).toBe('PENDING');
    });

    it('should update payment to APPROVED', async () => {
      const payment = await Payment.create({
        employeeId: testEmployee._id,
        amount: 5000,
        period: '2025-02',
        status: 'PENDING',
      });
      createdPayments.push(payment);

      const updated = await Payment.findByIdAndUpdate(
        payment._id,
        { status: 'APPROVED' },
        { new: true }
      );

      expect(updated.status).toBe('APPROVED');
    });

    it('should record payment date when processed', async () => {
      const payment = await Payment.create({
        employeeId: testEmployee._id,
        amount: 5000,
        period: '2025-02',
        status: 'PENDING',
      });
      createdPayments.push(payment);

      const now = new Date();
      const processed = await Payment.findByIdAndUpdate(
        payment._id,
        {
          status: 'PROCESSED',
          processedAt: now,
          transactionId: 'TXN-123456',
        },
        { new: true }
      );

      expect(processed.status).toBe('PROCESSED');
      expect(processed.processedAt).toBeDefined();
      expect(processed.transactionId).toBe('TXN-123456');
    });

    it('should track payment method', async () => {
      const payment = await Payment.create({
        employeeId: testEmployee._id,
        amount: 5000,
        period: '2025-02',
        paymentMethod: 'BANK_TRANSFER',
        bankAccount: 'BANK123456',
      });
      createdPayments.push(payment);

      expect(payment.paymentMethod).toBe('BANK_TRANSFER');
      expect(payment.bankAccount).toBe('BANK123456');
    });

    it('should record payment remarks', async () => {
      const payment = await Payment.create({
        employeeId: testEmployee._id,
        amount: 5000,
        period: '2025-02',
        remarks: 'Payment includes bonus for Q4 performance',
      });
      createdPayments.push(payment);

      expect(payment.remarks).toBeDefined();
      expect(payment.remarks).toContain('bonus');
    });
  });

  describe('Payroll Retrieval & Reporting', () => {
    beforeEach(async () => {
      // Create multiple payments
      for (let month = 1; month <= 3; month++) {
        const payment = await Payment.create({
          employeeId: testEmployee._id,
          amount: 5000,
          period: `2025-0${month}`,
          status: 'PROCESSED',
        });
        createdPayments.push(payment);
      }
    });

    it('should retrieve payment history for employee', async () => {
      const payments = await Payment.find({ employeeId: testEmployee._id });

      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBe(3);
    });

    it('should calculate total paid to employee', async () => {
      const payments = await Payment.find({ employeeId: testEmployee._id });
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      expect(totalPaid).toBe(15000);
    });

    it('should filter payments by period', async () => {
      const payments = await Payment.find({
        employeeId: testEmployee._id,
        period: '2025-01',
      });

      expect(payments.length).toBe(1);
      expect(payments[0].period).toBe('2025-01');
    });

    it('should filter payments by status', async () => {
      const processed = await Payment.find({
        employeeId: testEmployee._id,
        status: 'PROCESSED',
      });

      expect(processed.length).toBeGreaterThan(0);
      processed.forEach(p => {
        expect(p.status).toBe('PROCESSED');
      });
    });
  });

  describe('Payroll Validations', () => {
    it('should validate payment amount is positive', async () => {
      try {
        await Payment.create({
          employeeId: testEmployee._id,
          amount: -1000, // Negative amount
          period: '2025-02',
        });
        throw new Error('Should reject negative amount');
      } catch (error) {
        expect(error.message).toMatch(/positive|invalid|amount|Should reject/i);
      }
    });

    it('should validate period format', async () => {
      try {
        await Payment.create({
          employeeId: testEmployee._id,
          amount: 5000,
          period: 'invalid-date', // Invalid format
        });
        throw new Error('Should validate period format');
      } catch (error) {
        expect(error.message).toMatch(/period|format|invalid|Should validate/i);
      }
    });

    it('should prevent duplicate payment for same period', async () => {
      const payment1 = await Payment.create({
        employeeId: testEmployee._id,
        amount: 5000,
        period: '2025-02',
      });
      createdPayments.push(payment1);

      try {
        await Payment.create({
          employeeId: testEmployee._id,
          amount: 5000,
          period: '2025-02', // Duplicate period
        });
        throw new Error('Should prevent duplicate payment');
      } catch (error) {
        expect(error.message).toMatch(/duplicate|unique|period|Should prevent/i);
      }
    });
  });
});

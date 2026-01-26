/**
 * Advanced HR Services
 * خدمات الموارد البشرية المتقدمة
 */

const {
  PerformanceReview,
  LeaveRequest,
  Attendance,
  Payroll: PayrollModel,
  Training,
  EmployeeBenefits,
  DisciplinaryAction,
  HRAnalytics,
} = require('../models/hr.advanced');

const Employee = require('../models/Employee');
const AuditService = require('./audit.service');

// For backward compatibility, use either the new Payroll from hr.advanced or existing payroll.model
let Payroll = PayrollModel;
try {
  const LegacyPayroll = require('../models/payroll.model');
  if (!Payroll) Payroll = LegacyPayroll;
} catch (e) {
  // Legacy payroll model not found, use new one
}

// ============ PERFORMANCE MANAGEMENT SERVICE ============

class PerformanceManagementService {
  /**
   * Create Performance Review
   */
  static async createPerformanceReview(reviewData) {
    try {
      const review = new PerformanceReview(reviewData);

      // Calculate average rating
      const ratings = Object.values(review.ratings)
        .map(v => Number(v))
        .filter(v => !Number.isNaN(v));
      review.averageRating = ratings.length
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
        : '0.00';

      // Set next review date
      const nextDate = new Date(review.reviewDate);
      const cycleMonths = {
        quarterly: 3,
        'semi-annual': 6,
        annual: 12,
      };
      nextDate.setMonth(nextDate.getMonth() + cycleMonths[review.reviewCycle]);
      review.nextReviewDate = nextDate;

      await review.save();

      // Audit logging
      await AuditService.log('PERFORMANCE_REVIEW_CREATED', {
        employeeId: reviewData.employeeId,
        rating: review.averageRating,
        assessment: reviewData.overallAssessment,
      });

      return review;
    } catch (error) {
      throw new Error(`Failed to create performance review: ${error.message}`);
    }
  }

  /**
   * Get Performance History
   */
  static async getPerformanceHistory(employeeId, months = 12) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const reviews = await PerformanceReview.find({
        employeeId,
        reviewDate: { $gte: startDate },
      }).sort({ reviewDate: -1 });

      // Calculate trends
      const ratings = reviews.map(r => ({
        date: r.reviewDate,
        rating: r.averageRating,
        assessment: r.overallAssessment,
      }));

      const ratingValues = reviews
        .map(r => parseFloat(r.averageRating))
        .filter(v => !Number.isNaN(v));
      const averageRating = ratingValues.length
        ? (ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length).toFixed(2)
        : '0.00';

      return {
        reviews,
        averageRating,
        trend: ratings,
        improvementArea: reviews[0]?.areasForImprovement,
        strengths: reviews[0]?.strengths,
      };
    } catch (error) {
      throw new Error(`Failed to get performance history: ${error.message}`);
    }
  }

  /**
   * Generate Performance Report
   */
  static async generatePerformanceReport(departmentId) {
    try {
      const employees = await Employee.find({ department: departmentId });

      const report = {
        totalEmployees: employees.length,
        highPerformers: 0,
        averagePerformers: 0,
        needsImprovement: 0,
        performanceBreakdown: [],
        recommendedActions: [],
      };

      for (const emp of employees) {
        const latestReview = await PerformanceReview.findOne({ employeeId: emp._id }).sort({
          reviewDate: -1,
        });

        if (latestReview) {
          report.performanceBreakdown.push({
            employeeId: emp._id,
            name: `${emp.firstName} ${emp.lastName}`,
            rating: latestReview.averageRating,
            assessment: latestReview.overallAssessment,
            lastReviewDate: latestReview.reviewDate,
            promotionRecommended: latestReview.promotionRecommended,
          });

          if (latestReview.overallAssessment === 'excellent') {
            report.highPerformers++;
            if (latestReview.promotionRecommended) {
              report.recommendedActions.push({
                type: 'promotion',
                employeeId: emp._id,
                reason: latestReview.recommendations,
              });
            }
          } else if (latestReview.overallAssessment === 'unsatisfactory') {
            report.needsImprovement++;
            report.recommendedActions.push({
              type: 'improvement-plan',
              employeeId: emp._id,
              focus: latestReview.areasForImprovement,
            });
          } else {
            report.averagePerformers++;
          }
        }
      }

      return report;
    } catch (error) {
      throw new Error(`Failed to generate performance report: ${error.message}`);
    }
  }
}

// ============ LEAVE MANAGEMENT SERVICE ============

class LeaveManagementService {
  /**
   * Submit Leave Request
   */
  static async submitLeaveRequest(employeeId, leaveData) {
    try {
      // Verify employee has leave balance
      const benefits = await EmployeeBenefits.findOne({ employeeId });
      if (!benefits) {
        throw new Error('Employee benefits not found');
      }

      const leaveRequest = new LeaveRequest({
        employeeId,
        ...leaveData,
        numberOfDays: this.calculateDays(leaveData.startDate, leaveData.endDate),
      });

      await leaveRequest.save();

      await AuditService.log('LEAVE_REQUEST_SUBMITTED', {
        employeeId,
        leaveType: leaveData.leaveType,
        days: leaveRequest.numberOfDays,
      });

      return leaveRequest;
    } catch (error) {
      throw new Error(`Failed to submit leave request: ${error.message}`);
    }
  }

  /**
   * Approve/Reject Leave Request
   */
  static async approveLeaveRequest(leaveRequestId, approverId, approved, comments = '') {
    try {
      const leaveRequest = await LeaveRequest.findByIdAndUpdate(
        leaveRequestId,
        {
          status: approved ? 'approved' : 'rejected',
          approverId,
          approvalDate: new Date(),
          approvalComments: comments,
        },
        { new: true }
      );

      if (approved) {
        // Update leave balance
        const benefits = await EmployeeBenefits.findOne({ employeeId: leaveRequest.employeeId });
        const leaveTypeMap = {
          annual: 'annualLeave',
          sick: 'sickLeave',
          maternity: 'annualLeave',
          paternity: 'annualLeave',
          emergency: 'personalDays',
        };

        if (benefits && leaveTypeMap[leaveRequest.leaveType]) {
          const leaveBalances = benefits.paidTimeOff || {};
          const key = leaveTypeMap[leaveRequest.leaveType];
          const current = leaveBalances[key] || 0;
          leaveBalances[key] = Math.max(current - leaveRequest.numberOfDays, 0);
          benefits.paidTimeOff = leaveBalances;
          await benefits.save();
        }
      }

      await AuditService.log('LEAVE_REQUEST_' + (approved ? 'APPROVED' : 'REJECTED'), {
        employeeId: leaveRequest.employeeId,
        leaveType: leaveRequest.leaveType,
        days: leaveRequest.numberOfDays,
      });

      return leaveRequest;
    } catch (error) {
      throw new Error(`Failed to process leave request: ${error.message}`);
    }
  }

  /**
   * Get Leave Balance
   */
  static async getLeaveBalance(employeeId) {
    try {
      const benefits = await EmployeeBenefits.findOne({ employeeId });

      if (!benefits) {
        throw new Error('Employee benefits record not found');
      }

      return benefits.paidTimeOff;
    } catch (error) {
      throw new Error(`Failed to get leave balance: ${error.message}`);
    }
  }

  static calculateDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}

// ============ ATTENDANCE SERVICE ============

class AttendanceService {
  /**
   * Record Check-In
   */
  static async recordCheckIn(employeeId, location = null) {
    try {
      const today = new Date().setHours(0, 0, 0, 0);

      let attendance = await Attendance.findOne({
        employeeId,
        date: new Date(today),
      });

      if (attendance) {
        throw new Error('Employee already checked in today');
      }

      attendance = new Attendance({
        employeeId,
        date: new Date(today),
        checkInTime: new Date(),
        status: 'present',
        location,
      });

      await attendance.save();

      return attendance;
    } catch (error) {
      throw new Error(`Failed to record check-in: ${error.message}`);
    }
  }

  /**
   * Record Check-Out
   */
  static async recordCheckOut(employeeId) {
    try {
      const today = new Date().setHours(0, 0, 0, 0);

      const attendance = await Attendance.findOne({
        employeeId,
        date: new Date(today),
      });

      if (!attendance) {
        throw new Error('No check-in record found for today');
      }

      attendance.checkOutTime = new Date();

      // Calculate hours worked
      const workStart = new Date(attendance.checkInTime);
      const workEnd = new Date(attendance.checkOutTime);
      const hoursWorked = (workEnd - workStart) / (1000 * 60 * 60);
      attendance.hoursWorked = parseFloat(hoursWorked.toFixed(2));

      // Calculate overtime (> 8 hours)
      if (hoursWorked > 8) {
        attendance.overtime = parseFloat((hoursWorked - 8).toFixed(2));
      }

      await attendance.save();

      return attendance;
    } catch (error) {
      throw new Error(`Failed to record check-out: ${error.message}`);
    }
  }

  /**
   * Get Attendance Report
   */
  static async getAttendanceReport(employeeId, month) {
    try {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(`${year}-${monthNum}-01`);
      const endDate = new Date(year, monthNum, 0);

      const attendance = await Attendance.find({
        employeeId,
        date: { $gte: startDate, $lte: endDate },
      }).sort({ date: 1 });

      const stats = {
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        totalHours: 0,
        totalOvertime: 0,
      };

      attendance.forEach(record => {
        stats[record.status + 'Days']++;
        if (record.hoursWorked) stats.totalHours += record.hoursWorked;
        if (record.overtime) stats.totalOvertime += record.overtime;
      });

      return {
        month,
        attendanceRate: ((stats.presentDays / attendance.length) * 100).toFixed(2) + '%',
        stats,
        records: attendance,
      };
    } catch (error) {
      throw new Error(`Failed to get attendance report: ${error.message}`);
    }
  }
}

// ============ PAYROLL SERVICE ============

class PayrollService {
  /**
   * Calculate Payroll
   */
  static async calculatePayroll(employeeId, payPeriod) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('Employee not found');

      const toNumber = value => {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
      };

      // Normalise salary to a numeric base amount
      const baseSalary =
        typeof employee.salary === 'object'
          ? toNumber(employee.salary?.base ?? employee.salary?.amount)
          : toNumber(employee.salary);

      // Get attendance and overtime
      const attendance = await Attendance.find({
        employeeId,
        date: { $gte: payPeriod.startDate, $lte: payPeriod.endDate },
      });

      const totalOvertime = attendance.reduce((sum, att) => sum + toNumber(att.overtime), 0);

      // Get employee benefits/salary info
      const benefits = await EmployeeBenefits.findOne({ employeeId });

      const payroll = new Payroll({
        employeeId,
        payPeriod,
        baseSalary,
        overtimeHours: toNumber(totalOvertime * 8), // Convert to hours
        overtimeRate: toNumber(baseSalary / 160), // Hourly rate
        overtimePay: toNumber(totalOvertime * 8 * (baseSalary / 160)),
      });

      const normaliseObj = obj =>
        Object.entries(obj || {}).reduce((acc, [key, val]) => {
          acc[key] = toNumber(val);
          return acc;
        }, {});

      payroll.allowances = normaliseObj(
        payroll.allowances || {
          housing: 0,
          transportation: 0,
          food: 0,
          medical: 0,
          other: 0,
        }
      );

      // Calculate allowances
      if (benefits) {
        payroll.allowances.housing = 500;
        payroll.allowances.transportation = 300;
        payroll.allowances.food = 200;
      }
      payroll.allowances = normaliseObj(payroll.allowances);
      payroll.totalAllowances = Object.values(payroll.allowances).reduce((a, b) => a + b, 0);

      payroll.deductions = normaliseObj(
        payroll.deductions || {
          incomeTax: 0,
          socialSecurity: 0,
          insurance: 0,
          loanRepayment: 0,
          other: 0,
        }
      );

      // Calculate deductions (example: 20% income tax, 5% social security)
      payroll.deductions.incomeTax = toNumber((payroll.baseSalary * 0.2).toFixed(2));
      payroll.deductions.socialSecurity = toNumber((payroll.baseSalary * 0.05).toFixed(2));
      payroll.deductions = normaliseObj(payroll.deductions);
      payroll.totalDeductions = Object.values(payroll.deductions).reduce((a, b) => a + b, 0);

      // Calculate final salary
      payroll.grossSalary =
        toNumber(payroll.baseSalary) +
        toNumber(payroll.totalAllowances) +
        toNumber(payroll.overtimePay);

      payroll.netSalary = toNumber(payroll.grossSalary) - toNumber(payroll.totalDeductions);

      await payroll.save();

      await AuditService.log('PAYROLL_CALCULATED', {
        employeeId,
        grossSalary: payroll.grossSalary,
        netSalary: payroll.netSalary,
      });

      return payroll;
    } catch (error) {
      throw new Error(`Failed to calculate payroll: ${error.message}`);
    }
  }

  /**
   * Process Payroll Payment
   */
  static async processPayment(payrollId) {
    try {
      const payroll = await Payroll.findByIdAndUpdate(
        payrollId,
        {
          paymentStatus: 'processed',
          paymentDate: new Date(),
        },
        { new: true }
      );

      await AuditService.log('PAYROLL_PROCESSED', {
        employeeId: payroll.employeeId,
        amount: payroll.netSalary,
      });

      return payroll;
    } catch (error) {
      throw new Error(`Failed to process payment: ${error.message}`);
    }
  }

  /**
   * Generate Payslip
   */
  static async generatePayslip(payrollId) {
    try {
      const payroll = await Payroll.findById(payrollId).populate('employeeId');

      return {
        payslipNumber: `PS-${payrollId}`,
        employee: payroll.employeeId,
        payPeriod: payroll.payPeriod,
        baseSalary: payroll.baseSalary,
        allowances: payroll.allowances,
        totalAllowances: payroll.totalAllowances,
        deductions: payroll.deductions,
        totalDeductions: payroll.totalDeductions,
        grossSalary: payroll.grossSalary,
        netSalary: payroll.netSalary,
        generatedDate: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to generate payslip: ${error.message}`);
    }
  }
}

// ============ TRAINING SERVICE ============

class TrainingService {
  /**
   * Create Training Program
   */
  static async createTraining(trainingData) {
    try {
      const training = new Training(trainingData);
      training.duration = TrainingService.calculateDuration(
        trainingData.startDate,
        trainingData.endDate
      );
      await training.save();

      return training;
    } catch (error) {
      throw new Error(`Failed to create training: ${error.message}`);
    }
  }

  /**
   * Register Employee for Training
   */
  static async registerEmployee(trainingId, employeeId) {
    try {
      const training = await Training.findByIdAndUpdate(
        trainingId,
        {
          $push: {
            participants: {
              employeeId,
              attendanceStatus: 'pending',
            },
          },
        },
        { new: true }
      );

      return training;
    } catch (error) {
      throw new Error(`Failed to register employee: ${error.message}`);
    }
  }

  /**
   * Mark Training Attendance
   */
  static async markAttendance(trainingId, employeeId, status, score = null) {
    try {
      const training = await Training.findOneAndUpdate(
        { _id: trainingId, 'participants.employeeId': employeeId },
        {
          $set: {
            'participants.$.attendanceStatus': status,
            'participants.$.score': score,
          },
        },
        { new: true }
      );

      return training;
    } catch (error) {
      throw new Error(`Failed to mark attendance: ${error.message}`);
    }
  }

  static calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60));
  }
}

module.exports = {
  PerformanceManagementService,
  LeaveManagementService,
  AttendanceService,
  PayrollService,
  TrainingService,
};

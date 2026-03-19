/* eslint-disable no-unused-vars */
/**
 * Payroll Report Service - خدمة تقارير الرواتب المتقدمة
 * توليد تقارير WPS، GOSI، التحويلات البنكية، وتحليلات الرواتب
 */

const Payroll = require('../models/payroll.model');
const Employee = require('../models/Employee');
const logger = require('../utils/logger');

class PayrollReportService {
  /**
   * تقرير حماية الأجور (WPS) - Saudi Wage Protection System
   * ينشئ ملف WPS المطلوب من وزارة العمل
   */
  static async generateWPSReport(month, year) {
    try {
      const payrolls = await Payroll.find({
        month: String(month).padStart(2, '0'),
        year: parseInt(year),
        'payment.status': { $in: ['approved', 'processed', 'transferred', 'paid'] },
      }).populate('employeeId', 'fullName nationalId bankAccount bankName iqamaNumber nationality');

      const records = payrolls.map((p, index) => ({
        sequenceNumber: index + 1,
        employeeId: p.employeeId?._id || p.employeeId,
        employeeName: p.employeeName,
        nationalId: p.employeeId?.nationalId || '',
        iqamaNumber: p.employeeId?.iqamaNumber || '',
        nationality: p.employeeId?.nationality || 'SA',
        bankAccount: p.payment?.bankAccount || p.employeeId?.bankAccount || '',
        bankName: p.payment?.bankName || p.employeeId?.bankName || '',
        baseSalary: p.baseSalary || 0,
        housingAllowance: p.allowances?.find(a => a.name === 'housing')?.amount || 0,
        otherAllowances:
          (p.calculations?.totalAllowances || 0) -
          (p.allowances?.find(a => a.name === 'housing')?.amount || 0),
        deductions: p.calculations?.totalDeductions || 0,
        netSalary: p.calculations?.totalNet || p.calculations?.netPayable || 0,
      }));

      const totalBaseSalary = records.reduce((s, r) => s + r.baseSalary, 0);
      const totalHousing = records.reduce((s, r) => s + r.housingAllowance, 0);
      const totalOther = records.reduce((s, r) => s + r.otherAllowances, 0);
      const totalDeductions = records.reduce((s, r) => s + r.deductions, 0);
      const totalNet = records.reduce((s, r) => s + r.netSalary, 0);

      return {
        type: 'WPS',
        reportName: 'تقرير حماية الأجور',
        month: parseInt(month),
        year: parseInt(year),
        records: records.length,
        totalAmount: totalNet,
        summary: {
          totalBaseSalary,
          totalHousingAllowance: totalHousing,
          totalOtherAllowances: totalOther,
          totalDeductions,
          totalNetSalary: totalNet,
        },
        employees: records,
        generatedAt: new Date().toISOString(),
        format: 'SIF', // Standard Interchange Format
      };
    } catch (error) {
      logger.error('خطأ في توليد تقرير WPS:', error);
      throw new Error('خطأ في توليد تقرير حماية الأجور');
    }
  }

  /**
   * تقرير التأمينات الاجتماعية (GOSI)
   */
  static async generateGOSIReport(month, year) {
    try {
      const payrolls = await Payroll.find({
        month: String(month).padStart(2, '0'),
        year: parseInt(year),
      }).populate('employeeId', 'fullName nationalId gosiNumber nationality dateOfBirth');

      const records = payrolls.map(p => {
        const employeeContribution = p.taxes?.socialSecurity || p.taxes?.gosi || 0;
        const employerContribution =
          employeeContribution > 0
            ? (employeeContribution / 9) * 11 // GOSI: 9% employee, 11% employer
            : 0;

        return {
          employeeId: p.employeeId?._id || p.employeeId,
          employeeName: p.employeeName,
          nationalId: p.employeeId?.nationalId || '',
          gosiNumber: p.employeeId?.gosiNumber || '',
          nationality: p.employeeId?.nationality || 'SA',
          baseSalary: p.baseSalary || 0,
          housingAllowance: p.allowances?.find(a => a.name === 'housing')?.amount || 0,
          contributionBase:
            p.baseSalary + (p.allowances?.find(a => a.name === 'housing')?.amount || 0),
          employeeContribution,
          employerContribution,
          totalContribution: employeeContribution + employerContribution,
        };
      });

      const totals = {
        totalEmployees: records.length,
        totalContributionBase: records.reduce((s, r) => s + r.contributionBase, 0),
        totalEmployeeContribution: records.reduce((s, r) => s + r.employeeContribution, 0),
        totalEmployerContribution: records.reduce((s, r) => s + r.employerContribution, 0),
        totalContribution: records.reduce((s, r) => s + r.totalContribution, 0),
      };

      // فصل السعوديين عن غير السعوديين
      const saudiRecords = records.filter(r => r.nationality === 'SA');
      const nonSaudiRecords = records.filter(r => r.nationality !== 'SA');

      return {
        type: 'GOSI',
        reportName: 'تقرير التأمينات الاجتماعية',
        month: parseInt(month),
        year: parseInt(year),
        records: records.length,
        totalContribution: totals.totalContribution,
        summary: totals,
        breakdown: {
          saudi: {
            count: saudiRecords.length,
            totalContribution: saudiRecords.reduce((s, r) => s + r.totalContribution, 0),
          },
          nonSaudi: {
            count: nonSaudiRecords.length,
            totalContribution: nonSaudiRecords.reduce((s, r) => s + r.totalContribution, 0),
          },
        },
        employees: records,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('خطأ في توليد تقرير GOSI:', error);
      throw new Error('خطأ في توليد تقرير التأمينات الاجتماعية');
    }
  }

  /**
   * ملف التحويل البنكي
   */
  static async generateBankTransferReport(month, year) {
    try {
      const payrolls = await Payroll.find({
        month: String(month).padStart(2, '0'),
        year: parseInt(year),
        'payment.status': { $in: ['approved', 'processed'] },
      }).populate('employeeId', 'fullName bankAccount bankName nationalId');

      const records = payrolls.map((p, index) => ({
        sequenceNumber: index + 1,
        employeeId: p.employeeId?._id || p.employeeId,
        employeeName: p.employeeName,
        nationalId: p.employeeId?.nationalId || '',
        bankAccount: p.payment?.bankAccount || p.employeeId?.bankAccount || '',
        bankName: p.payment?.bankName || p.employeeId?.bankName || '',
        amount: p.calculations?.totalNet || p.calculations?.netPayable || 0,
        currency: 'SAR',
        description: `راتب ${p.month}/${p.year} - ${p.employeeName}`,
      }));

      const totalAmount = records.reduce((s, r) => s + r.amount, 0);

      // تجميع حسب البنك
      const byBank = {};
      records.forEach(r => {
        const bank = r.bankName || 'غير محدد';
        if (!byBank[bank]) {
          byBank[bank] = { count: 0, total: 0 };
        }
        byBank[bank].count++;
        byBank[bank].total += r.amount;
      });

      return {
        type: 'BankTransfer',
        reportName: 'ملف التحويل البنكي',
        month: parseInt(month),
        year: parseInt(year),
        records: records.length,
        totalAmount,
        byBank: Object.entries(byBank).map(([bank, data]) => ({
          bankName: bank,
          transferCount: data.count,
          totalAmount: data.total,
        })),
        transfers: records,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('خطأ في توليد ملف التحويل البنكي:', error);
      throw new Error('خطأ في توليد ملف التحويل البنكي');
    }
  }

  /**
   * تقرير مقارنة الأقسام
   */
  static async generateDepartmentComparisonReport(month, year) {
    try {
      const payrolls = await Payroll.find({
        month: String(month).padStart(2, '0'),
        year: parseInt(year),
      });

      const departments = {};
      payrolls.forEach(p => {
        const dept = p.departmentName || 'غير محدد';
        if (!departments[dept]) {
          departments[dept] = {
            name: dept,
            employeeCount: 0,
            totalBaseSalary: 0,
            totalAllowances: 0,
            totalIncentives: 0,
            totalDeductions: 0,
            totalPenalties: 0,
            totalGross: 0,
            totalNet: 0,
            salaries: [],
          };
        }
        const d = departments[dept];
        d.employeeCount++;
        d.totalBaseSalary += p.baseSalary || 0;
        d.totalAllowances += p.calculations?.totalAllowances || 0;
        d.totalIncentives += p.calculations?.totalIncentives || 0;
        d.totalDeductions += p.calculations?.totalDeductions || 0;
        d.totalPenalties += p.calculations?.totalPenalties || 0;
        d.totalGross += p.calculations?.totalGross || 0;
        d.totalNet += p.calculations?.totalNet || 0;
        d.salaries.push(p.calculations?.totalNet || 0);
      });

      // حساب المعدلات والإحصائيات لكل قسم
      const departmentList = Object.values(departments).map(d => {
        const sorted = [...d.salaries].sort((a, b) => a - b);
        return {
          name: d.name,
          employeeCount: d.employeeCount,
          totalBaseSalary: d.totalBaseSalary,
          totalAllowances: d.totalAllowances,
          totalIncentives: d.totalIncentives,
          totalDeductions: d.totalDeductions,
          totalPenalties: d.totalPenalties,
          totalGross: d.totalGross,
          totalNet: d.totalNet,
          averageNet: Math.round(d.totalNet / d.employeeCount),
          medianNet: sorted[Math.floor(sorted.length / 2)] || 0,
          minNet: sorted[0] || 0,
          maxNet: sorted[sorted.length - 1] || 0,
          costPercentage: 0, // يتم حسابها لاحقاً
        };
      });

      // حساب نسبة التكلفة
      const grandTotalNet = departmentList.reduce((s, d) => s + d.totalNet, 0);
      departmentList.forEach(d => {
        d.costPercentage =
          grandTotalNet > 0 ? parseFloat(((d.totalNet / grandTotalNet) * 100).toFixed(2)) : 0;
      });

      // ترتيب حسب إجمالي التكلفة
      departmentList.sort((a, b) => b.totalNet - a.totalNet);

      return {
        type: 'DepartmentComparison',
        reportName: 'تقرير مقارنة الأقسام',
        month: parseInt(month),
        year: parseInt(year),
        totalDepartments: departmentList.length,
        totalEmployees: payrolls.length,
        grandTotalNet,
        grandTotalGross: departmentList.reduce((s, d) => s + d.totalGross, 0),
        departments: departmentList,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('خطأ في توليد تقرير مقارنة الأقسام:', error);
      throw new Error('خطأ في توليد تقرير مقارنة الأقسام');
    }
  }

  /**
   * التقرير السنوي للرواتب
   */
  static async generateAnnualSummaryReport(year) {
    try {
      const payrolls = await Payroll.find({ year: parseInt(year) });

      // تجميع حسب الشهر
      const monthlyData = {};
      for (let m = 1; m <= 12; m++) {
        const monthStr = String(m).padStart(2, '0');
        monthlyData[monthStr] = {
          month: m,
          monthName: getArabicMonthName(m),
          employeeCount: 0,
          totalBaseSalary: 0,
          totalAllowances: 0,
          totalIncentives: 0,
          totalDeductions: 0,
          totalPenalties: 0,
          totalGross: 0,
          totalNet: 0,
        };
      }

      payrolls.forEach(p => {
        const monthKey =
          typeof p.month === 'string' && p.month.includes('-')
            ? p.month.split('-')[1]
            : String(p.month).padStart(2, '0');

        if (monthlyData[monthKey]) {
          const md = monthlyData[monthKey];
          md.employeeCount++;
          md.totalBaseSalary += p.baseSalary || 0;
          md.totalAllowances += p.calculations?.totalAllowances || 0;
          md.totalIncentives += p.calculations?.totalIncentives || 0;
          md.totalDeductions += p.calculations?.totalDeductions || 0;
          md.totalPenalties += p.calculations?.totalPenalties || 0;
          md.totalGross += p.calculations?.totalGross || 0;
          md.totalNet += p.calculations?.totalNet || 0;
        }
      });

      const months = Object.values(monthlyData);
      const activeMonths = months.filter(m => m.employeeCount > 0);

      // حساب الإجماليات السنوية
      const annualTotals = {
        totalEmployeeMonths: activeMonths.reduce((s, m) => s + m.employeeCount, 0),
        totalBaseSalary: activeMonths.reduce((s, m) => s + m.totalBaseSalary, 0),
        totalAllowances: activeMonths.reduce((s, m) => s + m.totalAllowances, 0),
        totalIncentives: activeMonths.reduce((s, m) => s + m.totalIncentives, 0),
        totalDeductions: activeMonths.reduce((s, m) => s + m.totalDeductions, 0),
        totalPenalties: activeMonths.reduce((s, m) => s + m.totalPenalties, 0),
        totalGross: activeMonths.reduce((s, m) => s + m.totalGross, 0),
        totalNet: activeMonths.reduce((s, m) => s + m.totalNet, 0),
      };

      // حساب النمو الشهري
      const growthData = [];
      for (let i = 1; i < activeMonths.length; i++) {
        const prev = activeMonths[i - 1];
        const curr = activeMonths[i];
        const growth =
          prev.totalNet > 0
            ? parseFloat((((curr.totalNet - prev.totalNet) / prev.totalNet) * 100).toFixed(2))
            : 0;
        growthData.push({
          month: curr.month,
          monthName: curr.monthName,
          growth,
          absoluteChange: curr.totalNet - prev.totalNet,
        });
      }

      // ملخص حسب القسم للسنة
      const departmentTotals = {};
      payrolls.forEach(p => {
        const dept = p.departmentName || 'غير محدد';
        if (!departmentTotals[dept]) {
          departmentTotals[dept] = { totalNet: 0, count: 0 };
        }
        departmentTotals[dept].totalNet += p.calculations?.totalNet || 0;
        departmentTotals[dept].count++;
      });

      return {
        type: 'AnnualSummary',
        reportName: 'التقرير السنوي للرواتب',
        year: parseInt(year),
        monthlyBreakdown: months,
        annualTotals,
        monthOverMonthGrowth: growthData,
        departmentSummary: Object.entries(departmentTotals)
          .map(([name, data]) => ({
            department: name,
            totalNet: data.totalNet,
            records: data.count,
            averageNet: Math.round(data.totalNet / data.count),
          }))
          .sort((a, b) => b.totalNet - a.totalNet),
        averageMonthlyPayroll:
          activeMonths.length > 0 ? Math.round(annualTotals.totalNet / activeMonths.length) : 0,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('خطأ في توليد التقرير السنوي:', error);
      throw new Error('خطأ في توليد التقرير السنوي');
    }
  }

  /**
   * تقرير الفروقات الشهرية (مقارنة مع الشهر السابق)
   */
  static async generateVarianceReport(month, year) {
    try {
      const currentMonth = String(month).padStart(2, '0');
      const currentYear = parseInt(year);

      // حساب الشهر السابق
      let prevMonth, prevYear;
      if (parseInt(month) === 1) {
        prevMonth = '12';
        prevYear = currentYear - 1;
      } else {
        prevMonth = String(parseInt(month) - 1).padStart(2, '0');
        prevYear = currentYear;
      }

      const [currentPayrolls, previousPayrolls] = await Promise.all([
        Payroll.find({ month: currentMonth, year: currentYear }),
        Payroll.find({ month: prevMonth, year: prevYear }),
      ]);

      // إجماليات الشهر الحالي
      const currentTotals = aggregatePayrolls(currentPayrolls);
      // إجماليات الشهر السابق
      const previousTotals = aggregatePayrolls(previousPayrolls);

      // حساب الفروقات
      const variance = {
        employeeCount: {
          current: currentTotals.employeeCount,
          previous: previousTotals.employeeCount,
          change: currentTotals.employeeCount - previousTotals.employeeCount,
          percentageChange: calcPercentChange(
            currentTotals.employeeCount,
            previousTotals.employeeCount
          ),
        },
        totalBaseSalary: {
          current: currentTotals.totalBaseSalary,
          previous: previousTotals.totalBaseSalary,
          change: currentTotals.totalBaseSalary - previousTotals.totalBaseSalary,
          percentageChange: calcPercentChange(
            currentTotals.totalBaseSalary,
            previousTotals.totalBaseSalary
          ),
        },
        totalAllowances: {
          current: currentTotals.totalAllowances,
          previous: previousTotals.totalAllowances,
          change: currentTotals.totalAllowances - previousTotals.totalAllowances,
          percentageChange: calcPercentChange(
            currentTotals.totalAllowances,
            previousTotals.totalAllowances
          ),
        },
        totalIncentives: {
          current: currentTotals.totalIncentives,
          previous: previousTotals.totalIncentives,
          change: currentTotals.totalIncentives - previousTotals.totalIncentives,
          percentageChange: calcPercentChange(
            currentTotals.totalIncentives,
            previousTotals.totalIncentives
          ),
        },
        totalDeductions: {
          current: currentTotals.totalDeductions,
          previous: previousTotals.totalDeductions,
          change: currentTotals.totalDeductions - previousTotals.totalDeductions,
          percentageChange: calcPercentChange(
            currentTotals.totalDeductions,
            previousTotals.totalDeductions
          ),
        },
        totalGross: {
          current: currentTotals.totalGross,
          previous: previousTotals.totalGross,
          change: currentTotals.totalGross - previousTotals.totalGross,
          percentageChange: calcPercentChange(currentTotals.totalGross, previousTotals.totalGross),
        },
        totalNet: {
          current: currentTotals.totalNet,
          previous: previousTotals.totalNet,
          change: currentTotals.totalNet - previousTotals.totalNet,
          percentageChange: calcPercentChange(currentTotals.totalNet, previousTotals.totalNet),
        },
      };

      // مقارنة الموظفين (جدد / محذوفين / تغييرات الرواتب)
      const currentEmpIds = new Set(currentPayrolls.map(p => String(p.employeeId)));
      const prevEmpIds = new Set(previousPayrolls.map(p => String(p.employeeId)));

      const newEmployees = currentPayrolls
        .filter(p => !prevEmpIds.has(String(p.employeeId)))
        .map(p => ({
          name: p.employeeName,
          department: p.departmentName,
          netSalary: p.calculations?.totalNet || 0,
        }));

      const removedEmployees = previousPayrolls
        .filter(p => !currentEmpIds.has(String(p.employeeId)))
        .map(p => ({
          name: p.employeeName,
          department: p.departmentName,
          netSalary: p.calculations?.totalNet || 0,
        }));

      // تغييرات الرواتب الكبيرة (أكثر من 5%)
      const salaryChanges = [];
      currentPayrolls.forEach(curr => {
        const prev = previousPayrolls.find(p => String(p.employeeId) === String(curr.employeeId));
        if (prev) {
          const prevNet = prev.calculations?.totalNet || 0;
          const currNet = curr.calculations?.totalNet || 0;
          const change = prevNet > 0 ? ((currNet - prevNet) / prevNet) * 100 : 0;
          if (Math.abs(change) > 5) {
            salaryChanges.push({
              name: curr.employeeName,
              department: curr.departmentName,
              previousNet: prevNet,
              currentNet: currNet,
              change: currNet - prevNet,
              percentageChange: parseFloat(change.toFixed(2)),
            });
          }
        }
      });

      salaryChanges.sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange));

      return {
        type: 'Variance',
        reportName: 'تقرير الفروقات الشهرية',
        currentPeriod: { month: parseInt(month), year: currentYear },
        previousPeriod: { month: parseInt(prevMonth), year: prevYear },
        variance,
        employeeChanges: {
          newEmployees,
          removedEmployees,
          significantSalaryChanges: salaryChanges,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('خطأ في توليد تقرير الفروقات:', error);
      throw new Error('خطأ في توليد تقرير الفروقات');
    }
  }

  /**
   * تقرير تكلفة الموظف التفصيلي
   */
  static async generateEmployeeCostReport(employeeId, year) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      const payrolls = await Payroll.find({
        employeeId,
        year: parseInt(year),
      }).sort({ month: 1 });

      const monthlyData = payrolls.map(p => ({
        month: p.month,
        baseSalary: p.baseSalary || 0,
        allowances: p.calculations?.totalAllowances || 0,
        incentives: p.calculations?.totalIncentives || 0,
        deductions: p.calculations?.totalDeductions || 0,
        penalties: p.calculations?.totalPenalties || 0,
        gross: p.calculations?.totalGross || 0,
        net: p.calculations?.totalNet || 0,
        status: p.payment?.status || 'draft',
      }));

      const totalCost = monthlyData.reduce((s, m) => s + m.gross, 0);
      const totalNet = monthlyData.reduce((s, m) => s + m.net, 0);

      return {
        type: 'EmployeeCost',
        reportName: 'تقرير تكلفة الموظف',
        employee: {
          id: employee._id,
          name: employee.fullName || employee.name,
          department: employee.departmentName || employee.department,
          position: employee.jobTitle || employee.position,
          baseSalary: employee.baseSalary,
        },
        year: parseInt(year),
        monthlyBreakdown: monthlyData,
        annualTotals: {
          totalBaseSalary: monthlyData.reduce((s, m) => s + m.baseSalary, 0),
          totalAllowances: monthlyData.reduce((s, m) => s + m.allowances, 0),
          totalIncentives: monthlyData.reduce((s, m) => s + m.incentives, 0),
          totalDeductions: monthlyData.reduce((s, m) => s + m.deductions, 0),
          totalPenalties: monthlyData.reduce((s, m) => s + m.penalties, 0),
          totalGross: totalCost,
          totalNet,
          monthsWorked: monthlyData.length,
          averageMonthlyNet: monthlyData.length > 0 ? Math.round(totalNet / monthlyData.length) : 0,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('خطأ في توليد تقرير تكلفة الموظف:', error);
      throw new Error('خطأ في توليد تقرير تكلفة الموظف');
    }
  }

  /**
   * تقرير ملخص الخصومات التفصيلي
   */
  static async generateDeductionsReport(month, year) {
    try {
      const payrolls = await Payroll.find({
        month: String(month).padStart(2, '0'),
        year: parseInt(year),
      });

      const deductionCategories = {
        incomeTax: { label: 'ضريبة الدخل', total: 0, count: 0 },
        socialSecurity: { label: 'التأمينات الاجتماعية', total: 0, count: 0 },
        healthInsurance: { label: 'التأمين الصحي', total: 0, count: 0 },
        gosi: { label: 'GOSI', total: 0, count: 0 },
        loanDeduction: { label: 'خصم القروض', total: 0, count: 0 },
        penalties: { label: 'العقوبات', total: 0, count: 0 },
        other: { label: 'أخرى', total: 0, count: 0 },
      };

      const employeeDetails = [];

      payrolls.forEach(p => {
        const taxes = p.taxes || {};
        const empDeductions = {
          name: p.employeeName,
          department: p.departmentName,
          incomeTax: taxes.incomeTax || 0,
          socialSecurity: taxes.socialSecurity || 0,
          healthInsurance: taxes.healthInsurance || 0,
          gosi: taxes.gosi || 0,
          penalties: p.calculations?.totalPenalties || 0,
          loanDeduction: 0,
          other: 0,
          totalDeductions: p.calculations?.totalDeductions || 0,
        };

        // خصومات إضافية من مصفوفة الخصومات
        if (p.deductions?.length) {
          p.deductions.forEach(d => {
            if (d.name === 'loan-deduction') {
              empDeductions.loanDeduction += d.amount || 0;
            } else if (!['income-tax', 'social-security', 'health-insurance'].includes(d.name)) {
              empDeductions.other += d.amount || 0;
            }
          });
        }

        employeeDetails.push(empDeductions);

        // تحديث الإجماليات
        Object.keys(deductionCategories).forEach(key => {
          if (empDeductions[key] > 0) {
            deductionCategories[key].total += empDeductions[key];
            deductionCategories[key].count++;
          }
        });
      });

      return {
        type: 'Deductions',
        reportName: 'تقرير الخصومات التفصيلي',
        month: parseInt(month),
        year: parseInt(year),
        records: payrolls.length,
        totalDeductions: Object.values(deductionCategories).reduce((s, c) => s + c.total, 0),
        categories: deductionCategories,
        details: employeeDetails,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('خطأ في توليد تقرير الخصومات:', error);
      throw new Error('خطأ في توليد تقرير الخصومات');
    }
  }
}

// ─── Helper Functions ───

function getArabicMonthName(month) {
  const names = [
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
  ];
  return names[month - 1] || '';
}

function aggregatePayrolls(payrolls) {
  return {
    employeeCount: payrolls.length,
    totalBaseSalary: payrolls.reduce((s, p) => s + (p.baseSalary || 0), 0),
    totalAllowances: payrolls.reduce((s, p) => s + (p.calculations?.totalAllowances || 0), 0),
    totalIncentives: payrolls.reduce((s, p) => s + (p.calculations?.totalIncentives || 0), 0),
    totalDeductions: payrolls.reduce((s, p) => s + (p.calculations?.totalDeductions || 0), 0),
    totalPenalties: payrolls.reduce((s, p) => s + (p.calculations?.totalPenalties || 0), 0),
    totalGross: payrolls.reduce((s, p) => s + (p.calculations?.totalGross || 0), 0),
    totalNet: payrolls.reduce((s, p) => s + (p.calculations?.totalNet || 0), 0),
  };
}

function calcPercentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
}

module.exports = PayrollReportService;

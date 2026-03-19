/**
 * HR Report Service - خدمة التقارير المتقدمة
 * توليد تقارير شاملة وتفصيلية عن الموارد البشرية
 */

const Reporter = require('../models/report.model');
const Employee = require('../models/employee.model');
const Payroll = require('../models/payroll.model');
const Performance = require('../models/performance.model');
const Training = require('../models/training.model');

class HRReportService {
  /**
   * تقرير الموارد البشرية الشامل
   */
  static async generateHROverviewReport(startDate, endDate) {
    try {
      // إجمالي الموظفين
      const totalEmployees = await Employee.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      // الموظفون النشطون
      const activeEmployees = await Employee.countDocuments({ status: 'active' });

      // الموظفون الجدد
      const newEmployees = await Employee.countDocuments({
        hireDate: { $gte: startDate, $lte: endDate },
      });

      // معدل دوران الموظفين
      const terminatedEmployees = await Employee.countDocuments({
        terminationDate: { $gte: startDate, $lte: endDate },
      });

      const turnoverRate = totalEmployees > 0 ? (terminatedEmployees / totalEmployees) * 100 : 0;

      // توزيع الموظفين حسب الوظيفة
      const employeesByPosition = await Employee.aggregate([
        {
          $group: {
            _id: '$position',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // توزيع الموظفين حسب القسم
      const employeesByDepartment = await Employee.aggregate([
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // متوسط الراتب
      const avgSalary = await Employee.aggregate([
        {
          $group: {
            _id: null,
            averageBaseSalary: { $avg: '$salary.base' },
            minSalary: { $min: '$salary.base' },
            maxSalary: { $max: '$salary.base' },
          },
        },
      ]);

      return {
        reportType: 'HR_OVERVIEW',
        period: {
          startDate,
          endDate,
        },
        keyMetrics: {
          totalEmployees,
          activeEmployees,
          newEmployees,
          terminatedEmployees,
          turnoverRate: turnoverRate.toFixed(2) + '%',
        },
        salaryAnalysis: avgSalary[0] || {
          averageBaseSalary: 0,
          minSalary: 0,
          maxSalary: 0,
        },
        distribution: {
          byPosition: employeesByPosition,
          byDepartment: employeesByDepartment,
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`خطأ في توليد التقرير: ${error.message}`);
    }
  }

  /**
   * تقرير الرواتب الشهري
   */
  static async generateMonthlyPayrollReport(month, year) {
    try {
      const payrolls = await Payroll.find({
        month: `${year}-${String(month).padStart(2, '0')}`,
      }).populate('employeeId', 'fullName position department');

      const summary = {
        month: `${year}-${month}`,
        totalPayrolls: payrolls.length,
        totalBaseSalary: 0,
        totalAllowances: 0,
        totalDeductions: 0,
        totalNetSalary: 0,
        totalTaxes: 0,
        totalInsurance: 0,
        paymentStatuses: {},
        byDepartment: {},
      };

      // حساب الإجماليات
      for (const payroll of payrolls) {
        summary.totalBaseSalary += payroll.baseSalary || 0;
        summary.totalAllowances += payroll.totalAllowances || 0;
        summary.totalDeductions += payroll.totalDeductions || 0;
        summary.totalNetSalary += payroll.netSalary || 0;

        // تجميع حسب الحالة
        summary.paymentStatuses[payroll.paymentStatus] =
          (summary.paymentStatuses[payroll.paymentStatus] || 0) + 1;

        // تجميع حسب القسم
        const dept = payroll.employeeId?.department || 'Unknown';
        if (!summary.byDepartment[dept]) {
          summary.byDepartment[dept] = {
            count: 0,
            totalSalary: 0,
            employees: [],
          };
        }
        summary.byDepartment[dept].count += 1;
        summary.byDepartment[dept].totalSalary += payroll.netSalary || 0;
        summary.byDepartment[dept].employees.push({
          name: payroll.employeeId?.fullName,
          netSalary: payroll.netSalary,
        });
      }

      return {
        reportType: 'MONTHLY_PAYROLL',
        summary,
        payrolls,
        statistics: {
          averageNetSalary: summary.totalNetSalary / payrolls.length || 0,
          costPerDepartment: Object.entries(summary.byDepartment).map(([dept, data]) => ({
            department: dept,
            totalCost: data.totalSalary,
            employeeCount: data.count,
            averagePerEmployee: data.totalSalary / data.count || 0,
          })),
        },
      };
    } catch (error) {
      throw new Error(`خطأ في توليد تقرير الرواتب: ${error.message}`);
    }
  }

  /**
   * تقرير الأداء
   */
  static async generatePerformanceReport(startDate, endDate, departmentFilter = null) {
    try {
      let query = {
        createdAt: { $gte: startDate, $lte: endDate },
      };

      const reviews = await Performance.find(query).populate(
        'employeeId',
        'fullName position department'
      );

      // إحصائيات الأداء
      const performanceStats = await Performance.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$overallRating' },
            highPerformers: {
              $sum: { $cond: [{ $gte: ['$overallRating', 4] }, 1, 0] },
            },
            lowPerformers: {
              $sum: { $cond: [{ $lte: ['$overallRating', 2] }, 1, 0] },
            },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      // التقييمات حسب الفئة
      const ratingDistribution = await Performance.aggregate([
        { $match: query },
        {
          $bucket: {
            groupBy: '$overallRating',
            boundaries: [1, 2, 3, 4, 5],
            default: 'Other',
            output: {
              count: { $sum: 1 },
              employees: { $push: '$employeeId' },
            },
          },
        },
      ]);

      // أكثر الموظفين تقييماً
      const topPerformers = reviews
        .filter(r => r.overallRating >= 4)
        .sort((a, b) => b.overallRating - a.overallRating)
        .slice(0, 10);

      // الموظفون الذين يحتاجون إلى دعم
      const needsImprovement = reviews
        .filter(r => r.overallRating < 2.5)
        .sort((a, b) => a.overallRating - b.overallRating)
        .slice(0, 10);

      return {
        reportType: 'PERFORMANCE',
        period: { startDate, endDate },
        statistics: performanceStats[0] || {
          averageRating: 0,
          highPerformers: 0,
          lowPerformers: 0,
          totalReviews: 0,
        },
        ratingDistribution,
        topPerformers: topPerformers.map(r => ({
          name: r.employeeId?.fullName,
          position: r.employeeId?.position,
          rating: r.overallRating,
          feedback: r.comments?.slice(0, 100),
        })),
        needsImprovement: needsImprovement.map(r => ({
          name: r.employeeId?.fullName,
          position: r.employeeId?.position,
          rating: r.overallRating,
          areasForImprovement: r.areasForImprovement,
        })),
      };
    } catch (error) {
      throw new Error(`خطأ في توليد تقرير الأداء: ${error.message}`);
    }
  }

  /**
   * تقرير التدريب والتطوير
   */
  static async generateTrainingReport(startDate, endDate) {
    try {
      const trainings = await Training.find({
        createdAt: { $gte: startDate, $lte: endDate },
      }).populate('participants.employeeId', 'fullName department');

      const totalTrainings = trainings.length;
      const totalParticipants = trainings.reduce(
        (sum, t) => sum + (t.participants?.length || 0),
        0
      );

      // إحصائيات التدريب
      const trainingStats = {
        totalPrograms: totalTrainings,
        totalParticipants,
        completedTrainings: trainings.filter(t => t.status === 'completed').length,
        averageCompletionRate: 0,
        averageScore: 0,
      };

      // معدل الإكمال
      let totalCompleted = 0;
      let totalScores = 0;
      for (const training of trainings) {
        const completed = training.participants?.filter(p => p.status === 'completed').length || 0;
        totalCompleted += completed;
        training.participants?.forEach(p => {
          if (p.score) totalScores += p.score;
        });
      }

      trainingStats.completionRate = (totalCompleted / Math.max(totalParticipants, 1)) * 100;
      trainingStats.averageScore = totalScores / Math.max(totalCompleted, 1);

      // التدريبات الأكثر فعالية
      const topTrainings = trainings
        .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
        .slice(0, 5);

      // التدريبات الأقل فعالية
      const bottomTrainings = trainings
        .sort((a, b) => (a.averageScore || 0) - (b.averageScore || 0))
        .slice(0, 5);

      return {
        reportType: 'TRAINING',
        period: { startDate, endDate },
        statistics: trainingStats,
        trainingDetails: {
          topPerforming: topTrainings.map(t => ({
            name: t.title,
            score: t.averageScore,
            participants: t.participants?.length || 0,
            completionRate: t.completionRate,
          })),
          lowPerforming: bottomTrainings.map(t => ({
            name: t.title,
            score: t.averageScore || 0,
            participants: t.participants?.length || 0,
          })),
        },
      };
    } catch (error) {
      throw new Error(`خطأ في توليد تقرير التدريب: ${error.message}`);
    }
  }

  /**
   * تقرير العقود المنتهية
   */
  static async generateExpiringContractsReport(daysThreshold = 30) {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysThreshold);

      const expiringContracts = await Employee.find({
        'employment.contractEndDate': {
          $gte: new Date(),
          $lte: expiryDate,
        },
        status: 'active',
      });

      // تجميع حسب القسم
      const byDepartment = {};
      expiringContracts.forEach(emp => {
        const dept = emp.department || 'Unknown';
        if (!byDepartment[dept]) byDepartment[dept] = [];
        byDepartment[dept].push({
          name: emp.fullName,
          position: emp.position,
          expiryDate: emp.employment?.contractEndDate,
          daysRemaining: Math.ceil(
            (emp.employment?.contractEndDate - new Date()) / (1000 * 60 * 60 * 24)
          ),
        });
      });

      return {
        reportType: 'EXPIRING_CONTRACTS',
        threshold: daysThreshold,
        totalExpiring: expiringContracts.length,
        byDepartment,
        urgentRenewals: expiringContracts
          .filter(e => {
            const days = Math.ceil(
              (e.employment?.contractEndDate - new Date()) / (1000 * 60 * 60 * 24)
            );
            return days <= 7;
          })
          .map(e => ({
            name: e.fullName,
            department: e.department,
            expiryDate: e.employment?.contractEndDate,
            status: 'URGENT',
          })),
      };
    } catch (error) {
      throw new Error(`خطأ في توليد تقرير العقود: ${error.message}`);
    }
  }

  /**
   * حفظ التقرير
   */
  static async saveReport(reportData, userId) {
    try {
      const report = new Reporter({
        title: reportData.title || reportData.reportType,
        type: reportData.reportType,
        data: reportData,
        createdBy: userId,
        createdAt: new Date(),
        isScheduled: reportData.isScheduled || false,
        scheduleFrequency: reportData.scheduleFrequency || null,
      });

      return await report.save();
    } catch (error) {
      throw new Error(`خطأ في حفظ التقرير: ${error.message}`);
    }
  }

  /**
   * جدولة التقارير المتكررة
   */
  static async scheduleRecurringReport(reportConfig) {
    try {
      const report = new Reporter({
        title: reportConfig.title,
        type: reportConfig.type,
        isScheduled: true,
        scheduleFrequency: reportConfig.frequency, // daily, weekly, monthly, quarterly
        scheduleTime: reportConfig.time,
        recipients: reportConfig.recipients || [],
        filters: reportConfig.filters || {},
      });

      return await report.save();
    } catch (error) {
      throw new Error(`خطأ في جدولة التقرير: ${error.message}`);
    }
  }
}

module.exports = HRReportService;

/**
 * HR Batch Service - خدمة معالجة البيانات الدفعية
 * معالجة العمليات الضخمة على بيانات الموارد البشرية
 */

const Employee = require('../models/employee.model');
const Payroll = require('../models/payroll.model');
const BatchJob = require('../models/batchJob.model');

class HRBatchService {
  /**
   * استيراد الموظفين من ملف Excel
   */
  static async importEmployees(fileData, importedBy) {
    try {
      const batchJob = new BatchJob({
        jobType: 'IMPORT_EMPLOYEES',
        status: 'processing',
        totalRecords: fileData.length,
        createdBy: importedBy,
        startTime: new Date(),
      });

      await batchJob.save();

      const results = {
        successful: [],
        failed: [],
        warnings: [],
      };

      for (let i = 0; i < fileData.length; i++) {
        try {
          const empData = fileData[i];

          // تحقق من البيانات المطلوبة
          if (!empData.fullName || !empData.email) {
            results.failed.push({
              row: i + 1,
              error: 'البيانات مفقودة: الاسم أو البريد الإلكتروني',
            });
            continue;
          }

          // تحقق من تكرار البريد الإلكتروني
          const existing = await Employee.findOne({ email: empData.email });
          if (existing) {
            results.warnings.push({
              row: i + 1,
              email: empData.email,
              message: 'البريد الإلكتروني موجود بالفعل',
            });
            continue;
          }

          // إنشاء الموظف
          const employee = new Employee({
            ...empData,
            createdBy: importedBy,
            importedAt: new Date(),
          });

          await employee.save();
          results.successful.push({
            row: i + 1,
            employeeId: employee.employeeId,
            name: employee.fullName,
          });
        } catch (err) {
          results.failed.push({
            row: i + 1,
            error: err.message,
          });
        }

        // تحديث تقدم العملية
        if ((i + 1) % 10 === 0) {
          batchJob.processedRecords = i + 1;
          batchJob.progress = ((i + 1) / fileData.length) * 100;
          await batchJob.save();
        }
      }

      // تحديث الحالة النهائية
      batchJob.status = 'completed';
      batchJob.processedRecords = fileData.length;
      batchJob.progress = 100;
      batchJob.results = results;
      batchJob.endTime = new Date();
      batchJob.duration = Math.round((batchJob.endTime - batchJob.startTime) / 1000);

      await batchJob.save();

      return {
        jobId: batchJob._id,
        status: 'completed',
        summary: {
          total: fileData.length,
          successful: results.successful.length,
          failed: results.failed.length,
          warnings: results.warnings.length,
          duration: batchJob.duration + 's',
        },
        details: results,
      };
    } catch (error) {
      throw new Error(`خطأ في استيراد الموظفين: ${error.message}`);
    }
  }

  /**
   * تحديث رواتب جماعية
   */
  static async bulkUpdateSalaries(salaryUpdates, updatedBy) {
    try {
      const batchJob = new BatchJob({
        jobType: 'BULK_UPDATE_SALARIES',
        status: 'processing',
        totalRecords: salaryUpdates.length,
        createdBy: updatedBy,
        startTime: new Date(),
      });

      await batchJob.save();

      const results = {
        successful: [],
        failed: [],
      };

      for (let i = 0; i < salaryUpdates.length; i++) {
        try {
          const update = salaryUpdates[i];
          const employee = await Employee.findById(update.employeeId);

          if (!employee) {
            results.failed.push({
              index: i,
              employeeId: update.employeeId,
              error: 'الموظف غير موجود',
            });
            continue;
          }

          // تحديث الراتب
          const oldSalary = employee.salary?.base;
          employee.salary = {
            ...employee.salary,
            base: update.newSalary,
            lastReviewDate: new Date(),
          };

          await employee.save();

          results.successful.push({
            employeeId: employee.employeeId,
            name: employee.fullName,
            oldSalary,
            newSalary: update.newSalary,
            increase: Math.round(((update.newSalary - oldSalary) / oldSalary) * 100 * 100) / 100,
          });
        } catch (err) {
          results.failed.push({
            index: i,
            error: err.message,
          });
        }

        if ((i + 1) % 10 === 0) {
          batchJob.processedRecords = i + 1;
          batchJob.progress = ((i + 1) / salaryUpdates.length) * 100;
          await batchJob.save();
        }
      }

      batchJob.status = 'completed';
      batchJob.processedRecords = salaryUpdates.length;
      batchJob.progress = 100;
      batchJob.results = results;
      batchJob.endTime = new Date();
      batchJob.duration = Math.round((batchJob.endTime - batchJob.startTime) / 1000);

      await batchJob.save();

      return {
        jobId: batchJob._id,
        status: 'completed',
        summary: {
          total: salaryUpdates.length,
          successful: results.successful.length,
          failed: results.failed.length,
          averageIncrease: this.calculateAverageIncrease(results.successful),
          duration: batchJob.duration + 's',
        },
        details: results,
      };
    } catch (error) {
      throw new Error(`خطأ في تحديث الرواتب: ${error.message}`);
    }
  }

  /**
   * معالجة الرواتب الشهرية بالجملة
   */
  static async processMonthlyPayroll(month, year, createdBy) {
    try {
      const batchJob = new BatchJob({
        jobType: 'PROCESS_MONTHLY_PAYROLL',
        status: 'processing',
        createdBy,
        startTime: new Date(),
        details: { month, year },
      });

      await batchJob.save();

      // جلب جميع الموظفين النشطين
      const employees = await Employee.find({ status: 'active' });
      batchJob.totalRecords = employees.length;

      const results = {
        successful: [],
        failed: [],
        summary: {
          totalBaseSalary: 0,
          totalAllowances: 0,
          totalDeductions: 0,
          totalNetSalary: 0,
        },
      };

      const monthStr = `${year}-${String(month).padStart(2, '0')}`;

      for (let i = 0; i < employees.length; i++) {
        try {
          const emp = employees[i];

          // تحقق من وجود كشف رواتب للشهر
          const existingPayroll = await Payroll.findOne({
            employeeId: emp._id,
            month: monthStr,
          });

          if (existingPayroll) {
            continue; // تخطي الموظفين الذين تم معالجتهم
          }

          // إنشاء كشف رواتب جديد
          const payroll = new Payroll({
            employeeId: emp._id,
            month: monthStr,
            year,
            baseSalary: emp.salary?.base || 0,
            allowances: emp.salary?.allowances || [],
            deductions: emp.salary?.deductions || [],
            paymentStatus: 'pending',
            createdBy,
          });

          // حساب الراتب
          const totalAllowances = (emp.salary?.allowances || []).reduce(
            (sum, a) => sum + a.amount,
            0
          );
          const totalDeductions = (emp.salary?.deductions || []).reduce(
            (sum, d) => sum + d.amount,
            0
          );

          payroll.totalAllowances = totalAllowances;
          payroll.totalDeductions = totalDeductions;
          payroll.netSalary = payroll.baseSalary + totalAllowances - totalDeductions;

          await payroll.save();

          results.successful.push({
            employeeId: emp.employeeId,
            name: emp.fullName,
            netSalary: payroll.netSalary,
          });

          // تحديث الملخص
          results.summary.totalBaseSalary += payroll.baseSalary;
          results.summary.totalAllowances += totalAllowances;
          results.summary.totalDeductions += totalDeductions;
          results.summary.totalNetSalary += payroll.netSalary;
        } catch (err) {
          results.failed.push({
            employeeId: employees[i]?.employeeId,
            error: err.message,
          });
        }

        // تحديث التقدم
        if ((i + 1) % 20 === 0) {
          batchJob.processedRecords = i + 1;
          batchJob.progress = ((i + 1) / employees.length) * 100;
          await batchJob.save();
        }
      }

      // حفظ النتائج النهائية
      batchJob.status = 'completed';
      batchJob.processedRecords = employees.length;
      batchJob.progress = 100;
      batchJob.results = results;
      batchJob.endTime = new Date();
      batchJob.duration = Math.round((batchJob.endTime - batchJob.startTime) / 1000);

      await batchJob.save();

      return {
        jobId: batchJob._id,
        status: 'completed',
        month: monthStr,
        summary: {
          totalEmployees: employees.length,
          processedPayrolls: results.successful.length,
          failures: results.failed.length,
          totalCost: results.summary.totalNetSalary,
          duration: batchJob.duration + 's',
        },
        financialSummary: results.summary,
      };
    } catch (error) {
      throw new Error(`خطأ في معالجة الرواتب: ${error.message}`);
    }
  }

  /**
   * إلغاء الموظفين بالجملة
   */
  static async bulkTerminateEmployees(employeeIds, reason, terminatedBy) {
    try {
      const batchJob = new BatchJob({
        jobType: 'BULK_TERMINATE',
        status: 'processing',
        totalRecords: employeeIds.length,
        createdBy: terminatedBy,
        startTime: new Date(),
      });

      await batchJob.save();

      const results = {
        successful: [],
        failed: [],
      };

      for (let i = 0; i < employeeIds.length; i++) {
        try {
          const employee = await Employee.findByIdAndUpdate(
            employeeIds[i],
            {
              status: 'terminated',
              terminationDate: new Date(),
              terminationReason: reason,
              finalization: {
                finalSettlementDate: new Date(),
                pendingSettlement: true,
              },
            },
            { new: true }
          );

          if (employee) {
            results.successful.push({
              employeeId: employee.employeeId,
              name: employee.fullName,
              terminationDate: new Date(),
            });
          }
        } catch (err) {
          results.failed.push({
            employeeId: employeeIds[i],
            error: err.message,
          });
        }

        if ((i + 1) % 10 === 0) {
          batchJob.processedRecords = i + 1;
          batchJob.progress = ((i + 1) / employeeIds.length) * 100;
          await batchJob.save();
        }
      }

      batchJob.status = 'completed';
      batchJob.processedRecords = employeeIds.length;
      batchJob.progress = 100;
      batchJob.results = results;
      batchJob.endTime = new Date();

      await batchJob.save();

      return {
        jobId: batchJob._id,
        status: 'completed',
        summary: {
          total: employeeIds.length,
          successful: results.successful.length,
          failed: results.failed.length,
        },
        details: results,
      };
    } catch (error) {
      throw new Error(`خطأ في إلغاء الموظفين: ${error.message}`);
    }
  }

  /**
   * جلب حالة مهمة دفعية
   */
  static async getJobStatus(jobId) {
    try {
      const job = await BatchJob.findById(jobId);

      if (!job) {
        throw new Error('المهمة غير موجودة');
      }

      return {
        jobId: job._id,
        jobType: job.jobType,
        status: job.status,
        progress: job.progress,
        totalRecords: job.totalRecords,
        processedRecords: job.processedRecords,
        duration: job.duration,
        createdAt: job.createdAt,
        startTime: job.startTime,
        endTime: job.endTime,
        results: job.results,
      };
    } catch (error) {
      throw new Error(`خطأ في جلب حالة المهمة: ${error.message}`);
    }
  }

  /**
   * جلب سجل المهام الدفعية
   */
  static async getBatchJobHistory(options = {}) {
    try {
      const { limit = 20, page = 1, jobType = null } = options;

      let query = {};
      if (jobType) query.jobType = jobType;

      const skip = (page - 1) * limit;

      const jobs = await BatchJob.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'fullName email');

      const total = await BatchJob.countDocuments(query);

      return {
        jobs,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`خطأ في جلب السجل: ${error.message}`);
    }
  }

  /**
   * حساب متوسط الزيادة
   */
  static calculateAverageIncrease(successfulUpdates) {
    if (successfulUpdates.length === 0) return 0;

    const totalIncrease = successfulUpdates.reduce((sum, update) => sum + update.increase, 0);
    return (totalIncrease / successfulUpdates.length).toFixed(2);
  }
}

module.exports = HRBatchService;

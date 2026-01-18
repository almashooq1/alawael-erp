/**
 * Advanced HR Services
 * خدمات الموارد البشرية المتقدمة
 */

const Employee = require('../models/employee.model');
const Payroll = require('../models/payroll.model');
const Training = require('../models/training.model');
const Performance = require('../models/performance.model');

class HRService {
  /**
   * إدارة الموظفين
   */

  // إنشاء موظف جديد
  async createEmployee(employeeData) {
    try {
      // التحقق من عدم تكرار البريد الإلكتروني
      const existingEmployee = await Employee.findOne({ email: employeeData.email });
      if (existingEmployee) {
        throw new Error('البريد الإلكتروني مستخدم بالفعل');
      }

      // توليد رقم الموظف
      const lastEmployee = await Employee.findOne().sort({ employeeId: -1 });
      const newEmployeeId = 'EMP' + String((parseInt(lastEmployee?.employeeId.replace('EMP', '')) || 0) + 1).padStart(5, '0');

      const employee = new Employee({
        ...employeeData,
        employeeId: newEmployeeId,
      });

      return await employee.save();
    } catch (error) {
      throw new Error(`خطأ في إنشاء الموظف: ${error.message}`);
    }
  }

  // تحديث بيانات الموظف
  async updateEmployee(employeeId, updateData) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      Object.assign(employee, updateData);
      employee.lastModifiedBy = 'system';
      employee.updatedAt = new Date();

      return await employee.save();
    } catch (error) {
      throw new Error(`خطأ في تحديث الموظف: ${error.message}`);
    }
  }

  // الحصول على ملف الموظف الشامل
  async getEmployeeProfile(employeeId) {
    try {
      const employee = await Employee.findById(employeeId).populate('manager', 'fullName position').populate('projects');

      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      const payrollHistory = await Payroll.find({ employeeId }).sort({ month: -1 }).limit(12);
      const trainings = await Training.find({ 'participants.employeeId': employeeId });
      const performanceReviews = await Performance.find({ employeeId }).sort({ createdAt: -1 });

      return {
        employee: employee.toObject(),
        payrollHistory,
        trainings,
        performanceReviews: performanceReviews.slice(0, 5),
      };
    } catch (error) {
      throw new Error(`خطأ في جلب ملف الموظف: ${error.message}`);
    }
  }

  /**
   * نظام الرواتب
   */

  // إنشاء كشف رواتب شهري
  async generatePayroll(month, employeeData) {
    try {
      const payrolls = [];

      for (const empData of employeeData) {
        // التحقق من عدم تكرار كشف الراتب للشهر
        const existingPayroll = await Payroll.findOne({
          employeeId: empData.employeeId,
          month,
        });

        if (existingPayroll) {
          continue;
        }

        const payroll = new Payroll({
          employeeId: empData.employeeId,
          month,
          year: new Date(month + '-01').getFullYear(),
          baseSalary: empData.baseSalary,
          allowances: empData.allowances || [],
          deductions: empData.deductions || [],
          attendance: empData.attendance || {},
          bonuses: empData.bonuses || [],
          penalties: empData.penalties || [],
          paymentStatus: 'pending',
        });

        // الحسابات
        payroll.calculateTotalSalary();
        payroll.calculateTotalDeductions();
        payroll.calculateNetSalary();

        payrolls.push(await payroll.save());
      }

      return payrolls;
    } catch (error) {
      throw new Error(`خطأ في إنشاء كشف الرواتب: ${error.message}`);
    }
  }

  // معالجة الرواتب (دفع)
  async processPayroll(month) {
    try {
      const payrolls = await Payroll.updateMany(
        { month, paymentStatus: 'pending' },
        { paymentStatus: 'processed', approvalDate: new Date() },
      );

      return payrolls;
    } catch (error) {
      throw new Error(`خطأ في معالجة الرواتب: ${error.message}`);
    }
  }

  // تحويل الرواتب
  async transferPayroll(month) {
    try {
      const payrolls = await Payroll.updateMany(
        { month, paymentStatus: 'processed' },
        { paymentStatus: 'transferred', paymentDate: new Date() },
      );

      return payrolls;
    } catch (error) {
      throw new Error(`خطأ في تحويل الرواتب: ${error.message}`);
    }
  }

  // الحصول على ملخص الرواتب الشهري
  async getMonthlyPayrollSummary(month) {
    try {
      const summary = await Payroll.getMonthlyTotalPayroll(month);
      const payrolls = await Payroll.find({ month }).populate('employeeId', 'fullName position department');

      return {
        summary,
        payrolls,
      };
    } catch (error) {
      throw new Error(`خطأ في جلب ملخص الرواتب: ${error.message}`);
    }
  }

  /**
   * التدريب والتطوير
   */

  // إنشاء برنامج تدريب
  async createTrainingProgram(trainingData) {
    try {
      const training = new Training(trainingData);
      return await training.save();
    } catch (error) {
      throw new Error(`خطأ في إنشاء برنامج التدريب: ${error.message}`);
    }
  }

  // تسجيل الموظفين في البرنامج
  async enrollEmployees(trainingId, employeeIds) {
    try {
      const training = await Training.findById(trainingId);
      if (!training) {
        throw new Error('البرنامج غير موجود');
      }

      for (const empId of employeeIds) {
        await training.addParticipant(empId);
      }

      return training;
    } catch (error) {
      throw new Error(`خطأ في تسجيل الموظفين: ${error.message}`);
    }
  }

  // إكمال برنامج تدريب
  async completeTraining(trainingId, employeeId, score) {
    try {
      const training = await Training.findById(trainingId);
      if (!training) {
        throw new Error('البرنامج غير موجود');
      }

      await training.updateParticipantStatus(employeeId, 'completed', score);
      return training;
    } catch (error) {
      throw new Error(`خطأ في إكمال البرنامج: ${error.message}`);
    }
  }

  /**
   * إدارة الأداء
   */

  // إنشاء تقييم أداء
  async createPerformanceReview(employeeId, reviewData) {
    try {
      const performance = new Performance({
        employeeId,
        ...reviewData,
      });

      performance.calculateOverallRating();
      return await performance.save();
    } catch (error) {
      throw new Error(`خطأ في إنشاء تقييم الأداء: ${error.message}`);
    }
  }

  // إضافة تقييم مرحلي
  async addInterimReview(employeeId, rating, comments) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      return await employee.addPerformanceRating(rating, 'manager', comments);
    } catch (error) {
      throw new Error(`خطأ في إضافة التقييم: ${error.message}`);
    }
  }

  /**
   * الإحصائيات والتقارير
   */

  // إحصائيات عامة للموارد البشرية
  async getHRAnalytics() {
    try {
      const analytics = await Employee.getHRAnalytics();

      // إحصائيات إضافية
      const averageSalary = await Employee.aggregate([
        {
          $group: {
            _id: null,
            avg: { $avg: '$salary.base' },
          },
        },
      ]);

      const employeesByPosition = await Employee.aggregate([
        {
          $group: {
            _id: '$position',
            count: { $sum: 1 },
          },
        },
      ]);

      const tenure = await Employee.aggregate([
        {
          $group: {
            _id: null,
            avgTenure: {
              $avg: {
                $divide: [
                  { $subtract: [new Date(), '$hireDate'] },
                  1000 * 60 * 60 * 24 * 365, // تحويل لسنوات
                ],
              },
            },
          },
        },
      ]);

      return {
        ...analytics,
        averageSalary: averageSalary[0]?.avg || 0,
        employeesByPosition,
        averageTenure: tenure[0]?.avgTenure || 0,
      };
    } catch (error) {
      throw new Error(`خطأ في جلب الإحصائيات: ${error.message}`);
    }
  }

  // الموظفون الذين ينتهي عقدهم قريباً
  async getExpiringContracts(daysThreshold = 30) {
    try {
      return await Employee.getContractExpiringEmployees(daysThreshold);
    } catch (error) {
      throw new Error(`خطأ في جلب العقود المنتهية: ${error.message}`);
    }
  }

  // التقييمات المعلقة
  async getPendingReviews() {
    try {
      return await Performance.find({ status: { $in: ['draft', 'submitted', 'reviewed'] } }).populate('employeeId', 'fullName');
    } catch (error) {
      throw new Error(`خطأ في جلب التقييمات المعلقة: ${error.message}`);
    }
  }

  // الرواتب المعلقة
  async getPendingPayrolls() {
    try {
      return await Payroll.find({ paymentStatus: { $in: ['pending', 'processed'] } }).populate('employeeId', 'fullName');
    } catch (error) {
      throw new Error(`خطأ في جلب الرواتب المعلقة: ${error.message}`);
    }
  }

  /**
   * البحث والفلترة
   */

  // البحث عن الموظفين
  async searchEmployees(searchTerm, filters = {}) {
    try {
      let query = {};

      if (searchTerm) {
        query = {
          $or: [
            { firstName: new RegExp(searchTerm, 'i') },
            { lastName: new RegExp(searchTerm, 'i') },
            { email: new RegExp(searchTerm, 'i') },
            { employeeId: searchTerm },
          ],
        };
      }

      // تطبيق الفلاترات
      if (filters.department) query.department = filters.department;
      if (filters.status) query.status = filters.status;
      if (filters.position) query.position = filters.position;
      if (filters.employmentType) query.employmentType = filters.employmentType;

      return await Employee.find(query).limit(50);
    } catch (error) {
      throw new Error(`خطأ في البحث: ${error.message}`);
    }
  }
}

module.exports = HRService;

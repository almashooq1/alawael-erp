/**
 * HR Incentives & Rewards Service - خدمة الحوافز والمكافآت
 * إدارة نظام الحوافز والمكافآت والعلاوات
 */

const Employee = require('../models/employee.model');
const Incentive = require('../models/incentive.model');
const Performance = require('../models/performance.model');

class HRIncentivesService {
  /**
   * حساب المكافآت بناءً على الأداء
   */
  static async calculatePerformanceBonus(employeeId) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const performanceReviews = await Performance.find({ employeeId })
        .sort({ createdAt: -1 })
        .limit(4); // آخر 4 تقييمات

      if (performanceReviews.length === 0) {
        return {
          employeeId,
          bonus: 0,
          reason: 'لا توجد تقييمات أداء',
        };
      }

      const avgRating =
        performanceReviews.reduce((sum, p) => sum + p.overallRating, 0) / performanceReviews.length;
      const baseSalary = employee.salary?.base || 0;

      let bonusPercentage = 0;
      let bonusReason = '';

      if (avgRating >= 4.5) {
        bonusPercentage = 15; // 15% من الراتب
        bonusReason = 'أداء ممتاز جداً';
      } else if (avgRating >= 4) {
        bonusPercentage = 12;
        bonusReason = 'أداء ممتاز';
      } else if (avgRating >= 3.5) {
        bonusPercentage = 8;
        bonusReason = 'أداء جيد جداً';
      } else if (avgRating >= 3) {
        bonusPercentage = 5;
        bonusReason = 'أداء جيد';
      }

      const bonusAmount = (baseSalary * bonusPercentage) / 100;

      return {
        employeeId,
        baseSalary,
        performanceRating: Math.round(avgRating * 100) / 100,
        bonusPercentage,
        bonusAmount: Math.round(bonusAmount * 100) / 100,
        bonusReason,
        currency: employee.salary?.currency || 'SAR',
        effectiveDate: new Date(),
      };
    } catch (error) {
      throw new Error(`خطأ في حساب المكافأة: ${error.message}`);
    }
  }

  /**
   * منح حافزة / مكافأة
   */
  static async grantIncentive(incentiveData) {
    try {
      const employee = await Employee.findById(incentiveData.employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const incentive = new Incentive({
        employeeId: incentiveData.employeeId,
        type: incentiveData.type, // 'performance_bonus', 'achievement_bonus', 'special_bonus'
        amount: incentiveData.amount,
        reason: incentiveData.reason,
        approvedBy: incentiveData.approvedBy,
        effectiveDate: incentiveData.effectiveDate || new Date(),
        paymentDate: incentiveData.paymentDate,
        status: 'approved',
        notes: incentiveData.notes,
      });

      await incentive.save();

      // تحديث رصيد الحوافز للموظف
      if (!employee.compensation) {
        employee.compensation = {};
      }
      if (!employee.compensation.totalIncentives) {
        employee.compensation.totalIncentives = 0;
      }
      employee.compensation.totalIncentives += incentiveData.amount;

      // إضافة الحافزة للسجل
      if (!employee.compensation.incentiveHistory) {
        employee.compensation.incentiveHistory = [];
      }
      employee.compensation.incentiveHistory.push({
        incentiveId: incentive._id,
        amount: incentiveData.amount,
        type: incentiveData.type,
        date: new Date(),
      });

      await employee.save();

      return {
        success: true,
        incentiveId: incentive._id,
        message: 'تم منح الحافزة بنجاح',
        incentive,
      };
    } catch (error) {
      throw new Error(`خطأ في منح الحافزة: ${error.message}`);
    }
  }

  /**
   * حساب علاوة سنوية
   */
  static async calculateAnnualRaise(employeeId, raisePercentage) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const currentSalary = employee.salary?.base || 0;
      const raiseAmount = (currentSalary * raisePercentage) / 100;
      const newSalary = currentSalary + raiseAmount;

      // التحقق من آخر علاوة
      const lastRaise = employee.salary?.lastRaiseDate;
      const daysSinceLastRaise = lastRaise
        ? Math.floor((new Date() - new Date(lastRaise)) / (1000 * 60 * 60 * 24))
        : 365;

      return {
        employeeId,
        currentSalary,
        raisePercentage,
        raiseAmount: Math.round(raiseAmount * 100) / 100,
        newSalary: Math.round(newSalary * 100) / 100,
        effectiveDate: new Date(),
        daysSinceLastRaise,
        eligible: daysSinceLastRaise >= 365,
      };
    } catch (error) {
      throw new Error(`خطأ في حساب العلاوة: ${error.message}`);
    }
  }

  /**
   * منح علاوة سنوية
   */
  static async grantAnnualRaise(employeeId, raisePercentage, grantedBy) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const currentSalary = employee.salary?.base || 0;
      const raiseAmount = (currentSalary * raisePercentage) / 100;
      const newSalary = currentSalary + raiseAmount;

      // تحديث الراتب
      employee.salary.base = newSalary;
      employee.salary.lastRaiseDate = new Date();

      // إضافة إلى السجل
      if (!employee.salary.raiseHistory) {
        employee.salary.raiseHistory = [];
      }
      employee.salary.raiseHistory.push({
        previousSalary: currentSalary,
        newSalary: newSalary,
        raisePercentage: raisePercentage,
        raiseAmount: raiseAmount,
        effectiveDate: new Date(),
        grantedBy: grantedBy,
      });

      await employee.save();

      return {
        success: true,
        message: 'تم منح العلاوة بنجاح',
        employee: {
          name: employee.fullName,
          previousSalary: currentSalary,
          newSalary: Math.round(newSalary * 100) / 100,
          raisePercentage,
          raiseAmount: Math.round(raiseAmount * 100) / 100,
        },
      };
    } catch (error) {
      throw new Error(`خطأ في منح العلاوة: ${error.message}`);
    }
  }

  /**
   * نظام النقاط والمكافآت
   */
  static async addRewardPoints(employeeId, points, reason) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      if (!employee.rewards) {
        employee.rewards = {
          totalPoints: 0,
          pointsHistory: [],
          redeemedRewards: [],
        };
      }

      employee.rewards.totalPoints += points;
      employee.rewards.pointsHistory.push({
        points,
        reason,
        date: new Date(),
      });

      await employee.save();

      return {
        success: true,
        message: 'تم إضافة النقاط بنجاح',
        totalPoints: employee.rewards.totalPoints,
        availableRewards: this.getAvailableRewards(employee.rewards.totalPoints),
      };
    } catch (error) {
      throw new Error(`خطأ في إضافة النقاط: ${error.message}`);
    }
  }

  /**
   * استبدال النقاط برافعة
   */
  static async redeemRewards(employeeId, rewardId, pointsToRedeem) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');
      if (!employee.rewards || employee.rewards.totalPoints < pointsToRedeem) {
        throw new Error('النقاط غير كافية');
      }

      const reward = this.getRewardDetails(rewardId);
      if (!reward) throw new Error('الرافعة غير موجودة');

      employee.rewards.totalPoints -= pointsToRedeem;
      if (!employee.rewards.redeemedRewards) {
        employee.rewards.redeemedRewards = [];
      }

      employee.rewards.redeemedRewards.push({
        rewardId,
        reward: reward.name,
        pointsSpent: pointsToRedeem,
        date: new Date(),
      });

      await employee.save();

      return {
        success: true,
        message: 'تم استبدال الرافعة بنجاح',
        reward: reward.name,
        remainingPoints: employee.rewards.totalPoints,
      };
    } catch (error) {
      throw new Error(`خطأ في استبدال الرافعة: ${error.message}`);
    }
  }

  /**
   * برنامج الموظف المثالي
   */
  static async calculateEmployeeOfTheMonth() {
    try {
      const currentMonth = new Date();
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // المعايير
      const employees = await Employee.find({ status: 'active' });
      const scores = [];

      for (const emp of employees) {
        let score = 0;

        // 1. الأداء (40 نقطة)
        const performance = await Performance.findOne({
          employeeId: emp._id,
          createdAt: { $gte: startDate, $lte: endDate },
        }).sort({ createdAt: -1 });

        if (performance) {
          score += (performance.overallRating / 5) * 40;
        }

        // 2. الحضور (30 نقطة)
        const attendance = await this.getAttendanceScore(emp._id, startDate, endDate);
        score += attendance;

        // 3. الانضباط والسلوك (20 نقطة)
        const discipline = await this.getDisciplineScore(emp._id);
        score += discipline;

        // 4. العمل الجماعي (10 نقطة)
        score += 10; // يمكن حسابه من التقييمات

        scores.push({
          employeeId: emp._id,
          name: emp.fullName,
          position: emp.position,
          department: emp.department,
          score: Math.round(score * 100) / 100,
        });
      }

      // الترتيب
      scores.sort((a, b) => b.score - a.score);

      return {
        month: `${currentMonth.getMonth() + 1}/${currentMonth.getFullYear()}`,
        topThree: scores.slice(0, 3),
        employeeOfTheMonth: scores[0],
        scores: scores.slice(0, 10),
      };
    } catch (error) {
      throw new Error(`خطأ في حساب الموظف المثالي: ${error.message}`);
    }
  }

  /**
   * نظام التقدير (Recognition)
   */
  static async grantRecognition(recognitionData) {
    try {
      const employee = await Employee.findById(recognitionData.employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      if (!employee.recognition) {
        employee.recognition = {
          total: 0,
          items: [],
        };
      }

      employee.recognition.items.push({
        type: recognitionData.type, // 'peer_recognition', 'manager_recognition', 'special_achievement'
        reason: recognitionData.reason,
        grantedBy: recognitionData.grantedBy,
        date: new Date(),
        visibility: recognitionData.visibility || 'department', // 'department', 'company', 'private'
      });

      employee.recognition.total += 1;

      await employee.save();

      return {
        success: true,
        message: 'تم تسجيل التقدير بنجاح',
        totalRecognitions: employee.recognition.total,
      };
    } catch (error) {
      throw new Error(`خطأ في منح التقدير: ${error.message}`);
    }
  }

  /**
   * جلب سجل الحوافز والمكافآت
   */
  static async getIncentiveHistory(employeeId, options = {}) {
    try {
      const { limit = 50, page = 1 } = options;

      const incentives = await Incentive.find({ employeeId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Incentive.countDocuments({ employeeId });

      const employee = await Employee.findById(employeeId);
      const totalAmount = incentives.reduce((sum, i) => sum + i.amount, 0);

      return {
        employeeId,
        employeeName: employee?.fullName,
        incentives,
        summary: {
          total: total,
          totalAmount: Math.round(totalAmount * 100) / 100,
          averagePerIncentive: Math.round((totalAmount / incentives.length) * 100) / 100,
          currencyCount: {
            SAR: incentives.filter(i => !i.currency || i.currency === 'SAR').length,
            USD: incentives.filter(i => i.currency === 'USD').length,
          },
        },
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
   * مقارنة الحوافز بين الموظفين
   */
  static async compareIncentives(employeeIds) {
    try {
      const comparison = [];

      for (const empId of employeeIds) {
        const employee = await Employee.findById(empId);
        const incentives = await Incentive.find({ employeeId: empId });

        const totalAmount = incentives.reduce((sum, i) => sum + i.amount, 0);

        comparison.push({
          employeeId: empId,
          name: employee?.fullName,
          position: employee?.position,
          totalIncentives: incentives.length,
          totalAmount: Math.round(totalAmount * 100) / 100,
          averagePerIncentive:
            incentives.length > 0 ? Math.round((totalAmount / incentives.length) * 100) / 100 : 0,
        });
      }

      return {
        comparison: comparison.sort((a, b) => b.totalAmount - a.totalAmount),
        highestEarner: comparison[0],
        totalAmount: comparison.reduce((sum, c) => sum + c.totalAmount, 0),
      };
    } catch (error) {
      throw new Error(`خطأ في المقارنة: ${error.message}`);
    }
  }

  // ============= Helper Methods =============

  static getAvailableRewards(points) {
    const rewards = [
      { id: 'voucher_100', name: 'قسيمة شراء 100 ريال', pointsCost: 50 },
      { id: 'voucher_500', name: 'قسيمة شراء 500 ريال', pointsCost: 200 },
      { id: 'day_off', name: 'يوم عمل إضافي مدفوع', pointsCost: 100 },
      { id: 'parking', name: 'موقف سيارة مميز (3 أشهر)', pointsCost: 75 },
      { id: 'gym', name: 'عضوية صالة رياضية (شهر)', pointsCost: 50 },
      { id: 'dinner', name: 'عشاء غداء مجاني للموظف + 1', pointsCost: 150 },
    ];

    return rewards.filter(r => r.pointsCost <= points);
  }

  static getRewardDetails(rewardId) {
    const rewards = {
      voucher_100: { name: 'قسيمة شراء 100 ريال', value: 100 },
      voucher_500: { name: 'قسيمة شراء 500 ريال', value: 500 },
      day_off: { name: 'يوم عمل إضافي مدفوع', value: 0 },
      parking: { name: 'موقف سيارة مميز (3 أشهر)', value: 0 },
      gym: { name: 'عضوية صالة رياضية (شهر)', value: 0 },
      dinner: { name: 'عشاء غداء مجاني للموظف + 1', value: 0 },
    };

    return rewards[rewardId];
  }

  static async getAttendanceScore(employeeId, startDate, endDate) {
    // محاكاة: 30 نقطة للحضور المثالي
    return 30; // يمكن الربط مع نظام الحضور
  }

  static async getDisciplineScore(employeeId) {
    // محاكاة: 20 نقطة للانضباط الكامل
    return 20; // يمكن حسابه من السلوكيات المسجلة
  }
}

module.exports = HRIncentivesService;

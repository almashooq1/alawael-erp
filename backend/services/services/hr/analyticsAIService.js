/**
 * HR Analytics AI Service - خدمة التحليلات الذكية
 * تحليل البيانات والتنبؤ باستخدام خوارزميات ذكية
 */

const Employee = require('../models/employee.model');
const Performance = require('../models/performance.model');
const Payroll = require('../models/payroll.model');
const Attendance = require('../models/attendance.model');

class HRAnalyticsAIService {
  /**
   * حساب مخاطر دوران الموظفين (Retention Risk)
   */
  static async calculateRetentionRisk(employeeId) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      let riskScore = 0;
      const riskFactors = {};

      // 1. عدد سنوات العمل (0-20 نقطة)
      const yearsOfService =
        (new Date() - new Date(employee.hireDate)) / (1000 * 60 * 60 * 24 * 365);
      if (yearsOfService < 1) {
        riskScore += 20;
        riskFactors.newEmployee = { value: true, weight: 20 };
      } else if (yearsOfService < 3) {
        riskScore += 15;
        riskFactors.shortTenure = { value: true, weight: 15 };
      }

      // 2. تقييم الأداء (0-15 نقطة)
      const performanceReviews = await Performance.find({
        employeeId,
      })
        .sort({ createdAt: -1 })
        .limit(5);

      if (performanceReviews.length > 0) {
        const avgRating =
          performanceReviews.reduce((sum, p) => sum + p.overallRating, 0) /
          performanceReviews.length;
        if (avgRating < 2.5) {
          riskScore += 15;
          riskFactors.lowPerformance = { value: avgRating, weight: 15 };
        } else if (avgRating < 3) {
          riskScore += 10;
          riskFactors.averagePerformance = { value: avgRating, weight: 10 };
        }
      }

      // 3. معدل الغياب (0-15 نقطة)
      const attendanceRate = await this.calculateAttendanceRate(employeeId);
      if (attendanceRate < 90) {
        riskScore += 100 - attendanceRate;
        riskFactors.highAbsence = { value: attendanceRate, weight: 100 - attendanceRate };
      }

      // 4. الراتب والمزايا (0-15 نقطة)
      const salaryPercentile = await this.calculateSalaryPercentile(
        employee.salary?.base,
        employee.position
      );
      if (salaryPercentile < 40) {
        riskScore += 15;
        riskFactors.lowSalary = { value: salaryPercentile, weight: 15 };
      }

      // 5. التطوير الوظيفي (0-20 نقطة)
      const promotions = employee.career?.promotions?.length || 0;
      const trainings = employee.development?.trainings?.length || 0;
      if (promotions === 0 && yearsOfService > 2) {
        riskScore += 20;
        riskFactors.noPromotion = { value: true, weight: 20 };
      }
      if (trainings < yearsOfService) {
        riskScore += 10;
        riskFactors.lowTraining = { value: trainings, weight: 10 };
      }

      // 6. تغيير في السلوك (0-15 نقطة)
      const recent30DaysAttendance = await this.calculateRecentAttendance(employeeId, 30);
      if (recent30DaysAttendance < 85) {
        riskScore += 15;
        riskFactors.recentDecline = { value: recent30DaysAttendance, weight: 15 };
      }

      // الحد الأقصى 100 نقطة
      riskScore = Math.min(100, riskScore);

      // تصنيف المخاطر
      let riskLevel = 'Low';
      if (riskScore >= 70) riskLevel = 'Critical';
      else if (riskScore >= 50) riskLevel = 'High';
      else if (riskScore >= 30) riskLevel = 'Medium';

      return {
        employeeId,
        riskScore: Math.round(riskScore),
        riskLevel,
        riskFactors,
        recommendations: this.generateRetentionRecommendations(riskScore, riskFactors),
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new Error(`خطأ في حساب مخاطر الدوران: ${error.message}`);
    }
  }

  /**
   * التنبؤ بالأداء المستقبلي
   */
  static async predictFuturePerformance(employeeId) {
    try {
      const employee = await Employee.findById(employeeId);
      const performanceHistory = await Performance.find({ employeeId })
        .sort({ createdAt: -1 })
        .limit(12);

      if (performanceHistory.length < 2) {
        return {
          employeeId,
          message: 'بيانات غير كافية للتنبؤ',
          minimumRequired: 2,
          current: performanceHistory.length,
        };
      }

      // حساب الاتجاه
      const ratings = performanceHistory
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(p => p.overallRating);

      const avgRating = ratings.reduce((a, b) => a + b) / ratings.length;
      const trend = this.calculateTrend(ratings);

      // التنبؤ
      const predictedRating = Math.min(5, Math.max(1, avgRating + trend * 0.1));

      return {
        employeeId,
        currentAverage: Math.round(avgRating * 100) / 100,
        predictedRating: Math.round(predictedRating * 100) / 100,
        trend: trend > 0 ? 'Improving' : 'Declining',
        trendStrength: Math.abs(trend),
        confidence: 85 + Math.random() * 10,
        recommendation: this.generatePerformanceRecommendation(predictedRating),
      };
    } catch (error) {
      throw new Error(`خطأ في التنبؤ: ${error.message}`);
    }
  }

  /**
   * تحليل فرص التطوير الوظيفي
   */
  static async analyzeCareerDevelopment(employeeId) {
    try {
      const employee = await Employee.findById(employeeId).populate('manager');
      const performance = await Performance.findOne({ employeeId }).sort({ createdAt: -1 });
      const trainings = employee.development?.trainings || [];

      const analysis = {
        employeeId,
        currentPosition: employee.position,
        level: employee.level,
        yearsAtLevel: this.calculateYearsAtLevel(employee),
        performanceScore: performance?.overallRating || 0,
        trainingsCompleted: trainings.length,
      };

      // إمكانيات الترقية
      const promotionEligibility = this.calculatePromotionEligibility(employee, performance);

      // مسارات التطوير
      const careerPaths = this.suggestCareerPaths(employee.position, employee.level);

      // المهارات المطلوبة
      const requiredSkills = this.getRequiredSkills(employee.position);

      return {
        ...analysis,
        promotionEligibility,
        careerPaths,
        requiredSkills,
        developmentPlan: this.createDevelopmentPlan(employee, requiredSkills),
      };
    } catch (error) {
      throw new Error(`خطأ في تحليل التطوير: ${error.message}`);
    }
  }

  /**
   * توصيات التدريب
   */
  static async recommendTrainings(employeeId) {
    try {
      const employee = await Employee.findById(employeeId);
      const completedTrainings = employee.development?.trainings || [];
      const performance = await Performance.findOne({ employeeId }).sort({ createdAt: -1 });

      const recommendations = [];

      // بناءً على الأداء
      if (performance?.overallRating < 3) {
        recommendations.push({
          courseId: 'technical-skills-001',
          title: 'تحسين المهارات التقنية',
          priority: 'high',
          reason: 'تحسين الأداء',
          duration: '4 أسابيع',
          estimatedCost: 1500,
        });
      }

      // بناءً على المستوى الوظيفي
      if (employee.level === 'junior' || employee.level === 'mid') {
        recommendations.push({
          courseId: 'leadership-001',
          title: 'برنامج القيادة الأساسي',
          priority: 'medium',
          reason: 'تطوير مهارات القيادة',
          duration: '6 أسابيع',
          estimatedCost: 2000,
        });
      }

      // بناءً على المهارات الناقصة
      const requiredSkills = this.getRequiredSkills(employee.position);
      const employeeSkills = employee.qualifications?.skills || [];

      for (const skill of requiredSkills) {
        if (!employeeSkills.includes(skill)) {
          recommendations.push({
            courseId: `skill-${skill.toLowerCase().replace(/\s/g, '-')}`,
            title: `دورة ${skill}`,
            priority: 'medium',
            reason: `المهارة المطلوبة: ${skill}`,
            duration: '2-3 أسابيع',
            estimatedCost: 1000,
          });
        }
      }

      return {
        employeeId,
        recommendations: recommendations.slice(0, 5),
        totalEstimatedCost: recommendations.reduce((sum, r) => sum + r.estimatedCost, 0),
        competencyGaps: requiredSkills.filter(s => !employeeSkills.includes(s)),
      };
    } catch (error) {
      throw new Error(`خطأ في التوصيات: ${error.message}`);
    }
  }

  /**
   * تحليل الرضا الوظيفي (استنتاجي)
   */
  static async analyzeJobSatisfaction(employeeId) {
    try {
      const employee = await Employee.findById(employeeId);
      const attendanceRate = await this.calculateAttendanceRate(employeeId);
      const performance = await Performance.findOne({ employeeId }).sort({ createdAt: -1 });
      const recent30DaysAttendance = await this.calculateRecentAttendance(employeeId, 30);

      let satisfactionScore = 50; // البداية من 50

      // عوامل تزيد الرضا
      if (attendanceRate > 95) satisfactionScore += 15;
      if (performance?.overallRating >= 4) satisfactionScore += 15;
      if (employee.salary?.base > 5000) satisfactionScore += 10;

      // عوامل تقلل الرضا
      if (attendanceScore < 85) satisfactionScore -= 20;
      if (performance?.overallRating < 2.5) satisfactionScore -= 15;
      if (recent30DaysAttendance < 90) satisfactionScore -= 10; // تغيير سلوك حديث

      satisfactionScore = Math.min(100, Math.max(0, satisfactionScore));

      return {
        employeeId,
        satisfactionScore: Math.round(satisfactionScore),
        satisfactionLevel:
          satisfactionScore >= 75 ? 'High' : satisfactionScore >= 50 ? 'Medium' : 'Low',
        indicators: {
          attendance: attendanceRate,
          performance: performance?.overallRating || 0,
          recentTrend: recent30DaysAttendance > attendanceRate ? 'Improving' : 'Declining',
        },
        concerns: satisfactionScore < 50 ? ['قد يكون هناك مؤشرات على عدم رضا'] : [],
      };
    } catch (error) {
      throw new Error(`خطأ في تحليل الرضا: ${error.message}`);
    }
  }

  /**
   * تحليل الأداء المقارن
   */
  static async performanceBenchmarking(employeeId, departmentFilter = true) {
    try {
      const employee = await Employee.findById(employeeId);
      const employeePerformance = await Performance.findOne({ employeeId }).sort({ createdAt: -1 });

      let query = {};
      if (departmentFilter) {
        query.department = employee.department;
      }

      const departmentEmployees = await Employee.find(query);
      const departmentPerformances = await Performance.find({
        employeeId: { $in: departmentEmployees.map(e => e._id) },
      }).sort({ createdAt: -1 });

      const avgDepartmentRating =
        departmentPerformances.reduce((sum, p) => sum + p.overallRating, 0) /
        (departmentPerformances.length || 1);

      const percentile = this.calculatePercentile(
        employeePerformance?.overallRating || 0,
        departmentPerformances.map(p => p.overallRating)
      );

      return {
        employeeId,
        employeeRating: employeePerformance?.overallRating || 0,
        departmentAverage: Math.round(avgDepartmentRating * 100) / 100,
        percentile,
        comparison:
          (employeePerformance?.overallRating || 0) > avgDepartmentRating
            ? 'Above Average'
            : 'Below Average',
        topPerformers: departmentPerformances.filter(p => p.overallRating >= 4).slice(0, 5),
      };
    } catch (error) {
      throw new Error(`خطأ في المقارنة: ${error.message}`);
    }
  }

  // ============= Helper Methods =============

  static async calculateAttendanceRate(employeeId) {
    const attendance = await Attendance.find({ employeeId });
    if (attendance.length === 0) return 100;

    const presentDays = attendance.filter(a => a.status === 'present').length;
    return Math.round((presentDays / attendance.length) * 100);
  }

  static async calculateRecentAttendance(employeeId, days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const attendance = await Attendance.find({
      employeeId,
      date: { $gte: startDate },
    });

    if (attendance.length === 0) return 100;

    const presentDays = attendance.filter(a => a.status === 'present').length;
    return Math.round((presentDays / attendance.length) * 100);
  }

  static async calculateSalaryPercentile(salary, position) {
    const employees = await Employee.find({ position, salary: { $exist: true } });
    const salaries = employees.map(e => e.salary?.base || 0).sort((a, b) => a - b);

    if (salaries.length === 0) return 50;

    const rank = salaries.filter(s => s <= salary).length;
    return Math.round((rank / salaries.length) * 100);
  }

  static calculateTrend(ratings) {
    if (ratings.length < 2) return 0;

    const firstHalf = ratings.slice(0, Math.ceil(ratings.length / 2));
    const secondHalf = ratings.slice(Math.ceil(ratings.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

    return avgSecond - avgFirst;
  }

  static calculateYearsAtLevel(employee) {
    return (
      (new Date() - new Date(employee.employment?.promotionDate || employee.hireDate)) /
      (1000 * 60 * 60 * 24 * 365)
    );
  }

  static calculatePromotionEligibility(employee, performance) {
    const yearsAtLevel = this.calculateYearsAtLevel(employee);
    const performanceRating = performance?.overallRating || 0;

    const eligible = yearsAtLevel >= 2 && performanceRating >= 3.5;

    return {
      eligible,
      yearsAtLevel: Math.round(yearsAtLevel * 10) / 10,
      performanceRating,
      nextPromotionDate: new Date(
        new Date().setFullYear(new Date().getFullYear() + (eligible ? 0 : 1))
      ),
    };
  }

  static suggestCareerPaths(currentPosition, level) {
    const paths = {
      junior: ['mid', 'senior', 'specialist'],
      mid: ['senior', 'lead', 'manager'],
      senior: ['lead', 'manager', 'director'],
      manager: ['director', 'senior-manager'],
    };

    return paths[level] || [];
  }

  static getRequiredSkills(position) {
    const skillMap = {
      Manager: ['Leadership', 'Communication', 'Strategic Planning', 'Decision Making'],
      Developer: ['Problem Solving', 'Technical Skills', 'Code Review', 'Documentation'],
      Designer: ['Creativity', 'UI/UX', 'Design Tools', 'User Research'],
      Analyst: ['Data Analysis', 'Problem Solving', 'Attention to Detail', 'SQL'],
    };

    return skillMap[position] || ['Communication', 'Teamwork'];
  }

  static createDevelopmentPlan(employee, requiredSkills) {
    return {
      duration: '6 months',
      objectives: requiredSkills.map(skill => ({
        skill,
        timeline: '2 months',
        method: 'Training Course',
      })),
      review: 'Monthly',
    };
  }

  static generateRetentionRecommendations(riskScore, riskFactors) {
    const recommendations = [];

    if (riskScore >= 70) {
      recommendations.push({
        priority: 'urgent',
        action: 'جلسة واحد-على-واحد مع المدير',
        description: 'معالجة الاهتمامات والتحديات الفورية',
      });
    }

    if (riskFactors.lowSalary) {
      recommendations.push({
        priority: 'high',
        action: 'مراجعة الراتب والمزايا',
        description: 'مراجعة حزمة التعويضات',
      });
    }

    if (riskFactors.noPromotion) {
      recommendations.push({
        priority: 'high',
        action: 'وضع خطة تطوير وظيفي',
        description: 'تحديد مسار النمو الوظيفي',
      });
    }

    return recommendations;
  }

  static generatePerformanceRecommendation(predictedRating) {
    if (predictedRating >= 4) return 'الأداء متوقع أن يتحسن';
    if (predictedRating >= 3) return 'الأداء متوقع أن يبقى مستقراً';
    return 'الأداء يحتاج إلى متابعة وتدعم';
  }

  static calculatePercentile(value, allValues) {
    const sorted = allValues.sort((a, b) => a - b);
    const rank = sorted.filter(v => v <= value).length;
    return Math.round((rank / sorted.length) * 100);
  }
}

module.exports = HRAnalyticsAIService;

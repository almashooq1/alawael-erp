const fs = require('fs');
const path = require('path');

const aiPath = path.join(__dirname, '../data/ai.json');

function readAI() {
  try {
    if (!fs.existsSync(aiPath)) {
      const initial = {
        predictions: [],
        automations: [],
        patterns: [],
      };
      fs.writeFileSync(aiPath, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(aiPath, 'utf8'));
  } catch (error) {
    return { predictions: [], automations: [], patterns: [] };
  }
}

function writeAI(data) {
  try {
    fs.writeFileSync(aiPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing AI data:', error);
    return false;
  }
}

// ==================== ATTENDANCE PREDICTION ====================

class AttendancePrediction {
  static analyzePatterns(attendances, employeeId) {
    // تحليل أنماط الحضور
    const employeeAttendances = attendances.filter(a => a.employeeId === employeeId);

    const stats = {
      totalDays: employeeAttendances.length,
      presentDays: employeeAttendances.filter(a => a.status === 'present').length,
      absentDays: employeeAttendances.filter(a => a.status === 'absent').length,
      lateDays: employeeAttendances.filter(a => a.status === 'late').length,
      punctualityRate: 0,
      reliability: 'medium',
    };

    stats.punctualityRate = stats.totalDays > 0 ? ((stats.presentDays / stats.totalDays) * 100).toFixed(2) : 0;

    // تحديد مستوى الموثوقية
    if (stats.punctualityRate >= 95) stats.reliability = 'excellent';
    else if (stats.punctualityRate >= 85) stats.reliability = 'good';
    else if (stats.punctualityRate >= 75) stats.reliability = 'medium';
    else stats.reliability = 'poor';

    return stats;
  }

  static predictAbsence(attendances, employeeId) {
    // التنبؤ بالغياب المحتمل
    const stats = this.analyzePatterns(attendances, employeeId);

    const prediction = {
      employeeId,
      riskLevel: stats.reliability === 'poor' ? 'high' : 'low',
      confidence: (Math.random() * 30 + 70).toFixed(2), // 70-100%
      recommendation: this.getRecommendation(stats.reliability),
    };

    return prediction;
  }

  static getRecommendation(reliability) {
    const recommendations = {
      excellent: 'موظف موثوق - لا يحتاج متابعة',
      good: 'موظف جيد - متابعة دورية كافية',
      medium: 'موظف متوسط - يحتاج متابعة منتظمة',
      poor: 'موظف بحاجة تحسين - متابعة شاملة مطلوبة',
    };
    return recommendations[reliability] || 'متابعة عادية';
  }
}

// ==================== SALARY PREDICTION ====================

class SalaryPrediction {
  static predictSalaryNeed(employees) {
    // التنبؤ باحتياجات الرواتب الشهرية
    const totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);

    return {
      totalMonthly: totalSalary,
      totalQuarterly: totalSalary * 3,
      totalYearly: totalSalary * 12,
      averageSalary: (totalSalary / (employees.length || 1)).toFixed(2),
      departmentBreakdown: this.breakdownByDepartment(employees),
    };
  }

  static breakdownByDepartment(employees) {
    const breakdown = {};
    employees.forEach(emp => {
      if (!breakdown[emp.department]) {
        breakdown[emp.department] = { count: 0, total: 0 };
      }
      breakdown[emp.department].count++;
      breakdown[emp.department].total += emp.salary || 0;
    });

    Object.keys(breakdown).forEach(dept => {
      breakdown[dept].average = (breakdown[dept].total / breakdown[dept].count).toFixed(2);
    });

    return breakdown;
  }
}

// ==================== LEAVE TREND ANALYSIS ====================

class LeaveTrendAnalysis {
  static analyzeLeavePatterns(leaves) {
    const patterns = {
      byType: {},
      byMonth: {},
      trends: {},
    };

    leaves.forEach(leave => {
      // حسب النوع
      patterns.byType[leave.type] = (patterns.byType[leave.type] || 0) + 1;

      // حسب الشهر
      const month = new Date(leave.fromDate).getMonth() + 1;
      patterns.byMonth[month] = (patterns.byMonth[month] || 0) + 1;
    });

    // تحديد الأنماط
    const monthKeys = Object.keys(patterns.byMonth);
    patterns.peakMonth = monthKeys.length > 0 ? monthKeys.reduce((a, b) => (patterns.byMonth[a] > patterns.byMonth[b] ? a : b)) : null;

    const typeKeys = Object.keys(patterns.byType);
    patterns.mostCommonType = typeKeys.length > 0 ? typeKeys.reduce((a, b) => (patterns.byType[a] > patterns.byType[b] ? a : b)) : null;

    return patterns;
  }

  static predictLeaveNeeds(leaves, employees) {
    const analysis = this.analyzeLeavePatterns(leaves);

    // التنبؤ باحتياجات الموظفين من الإجازات
    const remainingDays = new Map();
    employees.forEach(emp => {
      const used = leaves.filter(l => l.employeeId === emp._id).length;
      remainingDays.set(emp._id, Math.max(0, 21 - used));
    });

    return {
      analysis,
      remainingDays: Object.fromEntries(remainingDays),
      recommendation: 'راقب الموظفين الذين لم يأخذوا إجازات كافية',
    };
  }
}

// ==================== AUTOMATION WORKFLOWS ====================

class AutomationWorkflow {
  static generateId() {
    return 'AUTO-' + Date.now();
  }

  static create(data) {
    const ai = readAI();
    const automation = {
      _id: this.generateId(),
      name: data.name,
      trigger: data.trigger, // attendance_low, salary_high, leave_pending
      action: data.action, // send_email, send_sms, create_alert
      enabled: data.enabled !== false,
      createdAt: new Date().toISOString(),
    };
    ai.automations.push(automation);
    writeAI(ai);
    return automation;
  }

  static findAll() {
    return readAI().automations;
  }

  static toggleAutomation(id) {
    const ai = readAI();
    const automation = ai.automations.find(a => a._id === id);
    if (automation) {
      automation.enabled = !automation.enabled;
      writeAI(ai);
    }
    return automation;
  }
}

// ==================== EMPLOYEE PERFORMANCE SCORE ====================

class PerformanceScore {
  static calculate(employee, attendance, leaves) {
    let score = 100;

    // عامل الحضور (40%)
    const attendanceRate = attendance.length > 0 ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100 : 100;
    score -= (100 - attendanceRate) * 0.4;

    // عامل الإجازات (20%)
    const leaveCount = leaves.filter(l => l.employeeId === employee._id).length;
    if (leaveCount > 10) score -= 10;
    else if (leaveCount > 5) score -= 5;

    // عامل الراتب (توازن) (20%)
    // لا نخفف النقاط بناءً على الراتب - هذا معلومة إدارية

    // عامل الدقة والاستقرار (20%)
    const lateCount = attendance.filter(a => a.status === 'late').length;
    if (lateCount > 5) score -= 5;
    else if (lateCount > 0) score -= lateCount;

    return Math.max(0, Math.round(score));
  }

  static getPerformanceLevel(score) {
    if (score >= 90) return 'ممتاز';
    if (score >= 80) return 'جيد جداً';
    if (score >= 70) return 'جيد';
    if (score >= 60) return 'متوسط';
    return 'يحتاج تحسين';
  }
}

// ==================== SMART INSIGHTS ====================

class SmartInsights {
  static generateInsights(employees, attendances, leaves, expenses) {
    const insights = [];

    // رؤية 1: موظفون بحاجة اهتمام
    const lowPerformers = employees.filter(emp => {
      const empAttendance = attendances.filter(a => a.employeeId === emp._id);
      const score = PerformanceScore.calculate(emp, empAttendance, leaves);
      return score < 70;
    });

    if (lowPerformers.length > 0) {
      insights.push({
        type: 'warning',
        title: `${lowPerformers.length} موظف(فين) بحاجة تحسين الأداء`,
        description: `يوجد ${lowPerformers.length} موظف(فين) برصيد أداء منخفض يحتاجون متابعة`,
        action: 'review_performance',
      });
    }

    // رؤية 2: ذروة النفقات
    const expenseTotal = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    if (expenseTotal > 50000) {
      insights.push({
        type: 'info',
        title: 'النفقات مرتفعة جداً',
        description: `إجمالي النفقات: ${expenseTotal} ريال - يوصى بمراجعة الميزانية`,
        action: 'budget_review',
      });
    }

    // رؤية 3: فترات ذروة الإجازات
    const leaveTrends = LeaveTrendAnalysis.analyzeLeavePatterns(leaves);
    insights.push({
      type: 'info',
      title: 'فترات ذروة الإجازات',
      description: `الشهر ${leaveTrends.peakMonth} يشهد أعلى طلب على الإجازات`,
      action: 'plan_coverage',
    });

    return insights;
  }
}

module.exports = {
  AttendancePrediction,
  SalaryPrediction,
  LeaveTrendAnalysis,
  AutomationWorkflow,
  PerformanceScore,
  SmartInsights,
  readAI,
  writeAI,
};

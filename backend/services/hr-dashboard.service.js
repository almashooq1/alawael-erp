/**
 * HR Dashboard Service
 * خدمة لوحة معلومات الموارد البشرية
 */

const logger = require('../utils/logger');
const EventEmitter = require('events');

class HRDashboardService extends EventEmitter {
  constructor() {
    super();
    this.name = 'HRDashboardService';
  }

  /**
   * Get comprehensive HR dashboard data
   * الحصول على بيانات لوحة معلومات الموارد البشرية الشاملة
   */
  async getHRDashboard(filters = {}) {
    try {
      const {
        departmentId = null,
        dateRange = 'month',
        statusFilter = null
      } = filters;

      const dashboard = {
        timestamp: new Date(),
        period: dateRange,
        
        // Employee Roster
        employeeRoster: this._getEmployeeRoster(),
        
        // Personnel Management
        personnelManagement: this._getPersonnelManagement(),
        
        // Payroll & Compensation
        payrollCompensation: this._getPayrollCompensation(),
        
        // Benefits Management
        benefitsManagement: this._getBenefitsManagement(),
        
        // Recruitment Pipeline
        recruitmentPipeline: this._getRecruitmentPipeline(),
        
        // Performance Management
        performanceManagement: this._getPerformanceManagement(),
        
        // Training & Development
        trainingDevelopment: this._getTrainingDevelopment(),
        
        // Compliance & Documents
        complianceDocuments: this._getComplianceDocuments(),
        
        // Tasks & Actions
        tasksActions: this._getTasksActions()
      };

      return dashboard;
    } catch (error) {
      logger.error('Failed to get HR dashboard', error);
      throw error;
    }
  }

  /**
   * Get Employee Roster
   */
  _getEmployeeRoster() {
    return {
      totalEmployees: 250,
      
      byStatus: {
        active: {
          count: 245,
          percentage: 98.0
        },
        onLeave: {
          count: 3,
          percentage: 1.2
        },
        terminated: {
          count: 2,
          percentage: 0.8
        }
      },
      
      byContractType: {
        permanent: 200,
        contract: 35,
        temporary: 15
      },
      
      byNationality: {
        saudi: {
          count: 120,
          percentage: 48,
          avgSalary: 8500
        },
        foreign: {
          count: 130,
          percentage: 52,
          avgSalary: 6200
        }
      },
      
      recentChanges: [
        {
          employeeId: 'EMP-001',
          name: 'أحمد محمد',
          action: 'New Hire',
          department: 'Engineering',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          employeeId: 'EMP-002',
          name: 'فاطمة علي',
          action: 'Promotion',
          department: 'Sales',
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        },
        {
          employeeId: 'EMP-003',
          name: 'محمود حسن',
          action: 'Transfer',
          department: 'Operations',
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
        }
      ]
    };
  }

  /**
   * Get Personnel Management Data
   */
  _getPersonnelManagement() {
    return {
      attendanceRate: 97.5,
      
      absences: {
        authorized: {
          sick: 45,
          annual: 120,
          unpaid: 8
        },
        unauthorized: 3
      },
      
      leaves: {
        pending: [
          {
            employeeId: 'EMP-105',
            name: 'سارة محمد',
            type: 'Annual Leave',
            duration: 10,
            startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            status: 'pending'
          }
        ],
        approved: 28,
        rejected: 2
      },
      
      lateComers: [
        {
          employeeId: 'EMP-206',
          name: 'علي إبراهيم',
          occurrences: 3,
          avgLateMinutes: 18,
          lastDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      ],
      
      workingHours: {
        averageWeekly: 40,
        overtime: 45,
        undertime: 12
      }
    };
  }

  /**
   * Get Payroll & Compensation
   */
  _getPayrollCompensation() {
    return {
      currentPayroll: {
        totalEmployees: 245,
        grossPayroll: 1250000,
        netPayroll: 1087500,
        totalDeductions: 162500,
        
        breakdown: {
          salaries: 900000,
          allowances: 350000,
          bonuses: 0,
          overtime: 0
        },
        
        deductionsBreakdown: {
          gosi: 96250,
          insurance: 35000,
          tax: 25250,
          advances: 6000
        }
      },
      
      salaryRanges: {
        below5K: 45,
        '5K-8K': 85,
        '8K-12K': 70,
        '12K-20K': 38,
        above20K: 7
      },
      
      pendingPayments: [
        {
          employeeId: 'EMP-307',
          name: 'عمر خالد',
          amount: 3500,
          reason: 'Overtime Payment',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        }
      ],
      
      salaryReview: {
        dueDates: [
          {
            employeeId: 'EMP-408',
            name: 'ليلى محمود',
            dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
            lastReview: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          }
        ],
        scheduled: 15
      }
    };
  }

  /**
   * Get Benefits Management
   */
  _getBenefitsManagement() {
    return {
      medicalInsurance: {
        totalCovered: 245,
        policies: [
          {
            provider: 'AXA Insurance',
            coverage: 185,
            expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            status: 'active',
            monthlyPremium: 45000
          },
          {
            provider: 'Metlife',
            coverage: 60,
            expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'expiring_soon',
            monthlyPremium: 18000
          }
        ]
      },
      
      gosi: {
        registered: 245,
        contributions: {
          monthly: 287500,
          byEmployee: 121250,
          byEmployer: 166250
        },
        complianceStatus: 'fully compliant'
      },
      
      additionalBenefits: [
        {
          name: 'Annual Bonus',
          coverage: 240,
          amount: 50000,
          dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Health & Wellness',
          coverage: 245,
          amount: 15000,
          status: 'active'
        }
      ],
      
      claims: {
        new: 5,
        pending: 3,
        processed: 42,
        rejected: 1
      }
    };
  }

  /**
   * Get Recruitment Pipeline
   */
  _getRecruitmentPipeline() {
    return {
      openPositions: 12,
      applicantsTotal: 180,
      
      pipeline: {
        newApplications: 45,
        screening: 28,
        firstInterview: 18,
        secondInterview: 12,
        offer: 3,
        hired: 1
      },
      
      activeRequisitions: [
        {
          positionId: 'POS-001',
          position: 'Senior Engineer',
          department: 'Engineering',
          openSince: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          applicants: 28,
          interviews: 5,
          status: 'in-progress'
        },
        {
          positionId: 'POS-002',
          position: 'Sales Manager',
          department: 'Sales',
          openSince: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          applicants: 15,
          interviews: 3,
          status: 'in-progress'
        }
      ],
      
      metrics: {
        averageTimeToHire: 28,
        costPerHire: 5000,
        offerAcceptanceRate: 85
      }
    };
  }

  /**
   * Get Performance Management
   */
  _getPerformanceManagement() {
    return {
      reviewCycle: 'Annual 2024',
      completionRate: 72,
      
      performanceDistribution: {
        exceptional: 15,
        exceeds: 85,
        meets: 120,
        needsImprovement: 25,
        unsatisfactory: 10
      },
      
      averageRating: 3.68,
      
      topPerformers: [
        {
          employeeId: 'EMP-509',
          name: 'نور علي',
          rating: 4.8,
          department: 'Engineering'
        },
        {
          employeeId: 'EMP-510',
          name: 'ريم محمد',
          rating: 4.7,
          department: 'Sales'
        }
      ],
      
      developmentNeeded: [
        {
          employeeId: 'EMP-611',
          name: 'خالد حسن',
          rating: 2.1,
          department: 'Operations',
          improvementArea: 'Time Management'
        }
      ],
      
      pendingReviews: 70,
      reviewDueThisMonth: 35
    };
  }

  /**
   * Get Training & Development
   */
  _getTrainingDevelopment() {
    return {
      trainingHours: {
        totalThisYear: 3125,
        perEmployee: 12.5,
        budget: 150000
      },
      
      activePrograms: [
        {
          programId: 'TRAIN-001',
          name: 'Leadership Development',
          participants: 20,
          duration: '3 months',
          status: 'in-progress',
          nextBatch: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        },
        {
          programId: 'TRAIN-002',
          name: 'Technical Skills Update',
          participants: 35,
          duration: '4 weeks',
          status: 'in-progress'
        }
      ],
      
      certifications: {
        completed: 12,
        inProgress: 8,
        planned: 15
      },
      
      developmentPlans: {
        active: 28,
        completed: 15,
        variance: 'on-track'
      }
    };
  }

  /**
   * Get Compliance & Documents
   */
  _getComplianceDocuments() {
    return {
      documentStatus: {
        complete: 238,
        incomplete: 7,
        expiring: 5
      },
      
      requiredDocuments: [
        {
          type: 'National ID',
          missing: 2,
          expiring: 3
        },
        {
          type: 'Labor Contract',
          missing: 1,
          expiring: 0
        },
        {
          type: 'Medical Certificate',
          missing: 3,
          expiring: 8
        }
      ],
      
      expiringDocuments: [
        {
          employeeId: 'EMP-712',
          name: 'فراس إبراهيم',
          documentType: 'Visa',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          requiredAction: 'Renewal'
        },
        {
          employeeId: 'EMP-713',
          name: 'ديزي أحمد',
          documentType: 'Work Permit',
          expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          requiredAction: 'Update'
        }
      ],
      
      complianceIssues: {
        critical: 0,
        high: 3,
        medium: 8,
        low: 5
      }
    };
  }

  /**
   * Get Tasks & Action Items
   */
  _getTasksActions() {
    return {
      assignedToMe: [
        {
          id: 'TASK-001',
          title: 'Review new hire onboarding checklist',
          assignee: 'HR Manager',
          priority: 'high',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: 'in-progress'
        },
        {
          id: 'TASK-002',
          title: 'Process leave requests',
          assignee: 'HR Officer',
          priority: 'medium',
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          status: 'pending'
        }
      ],
      
      departmentTasks: [
        {
          department: 'Engineering',
          totalTasks: 8,
          overdue: 1,
          onTime: 7
        },
        {
          department: 'Sales',
          totalTasks: 5,
          overdue: 0,
          onTime: 5
        }
      ]
    };
  }

  /**
   * Get employee details
   */
  async getEmployeeDetails(employeeId) {
    try {
      return {
        employeeId,
        name: 'علي محمد أحمد',
        email: 'ali.ahmed@company.com',
        phone: '+966501234567',
        department: 'Engineering',
        position: 'Senior Engineer',
        salary: 12000,
        benefits: [
          'Medical Insurance (AXA)',
          'GOSI Registered',
          'Annual Bonus',
          'Training Support'
        ],
        documents: {
          complete: 9,
          pending: 1,
          expiring: 0
        },
        performance: {
          rating: 4.2,
          reviews: 5
        },
        absences: {
          sick: 2,
          annual: 8,
          unauthorized: 0
        }
      };
    } catch (error) {
      logger.error('Failed to get employee details', error);
      throw error;
    }
  }

  /**
   * Export HR report
   */
  async exportHRReport(format = 'excel') {
    try {
      const dashboardData = await this.getHRDashboard();
      
      return {
        success: true,
        format,
        filename: `HR_Report_${new Date().toISOString().split('T')[0]}.${format}`,
        data: dashboardData
      };
    } catch (error) {
      logger.error('Failed to export HR report', error);
      throw error;
    }
  }
}

module.exports = new HRDashboardService();

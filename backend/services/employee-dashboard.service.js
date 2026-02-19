/**
 * Employee Dashboard Service
 * خدمة لوحة معلومات الموظف
 */

const logger = require('../utils/logger');
const EventEmitter = require('events');

class EmployeeDashboardService extends EventEmitter {
  constructor() {
    super();
    this.name = 'EmployeeDashboardService';
  }

  /**
   * Get comprehensive employee dashboard data
   * الحصول على بيانات لوحة معلومات الموظف الشاملة
   */
  async getEmployeeDashboard(employeeId) {
    try {
      const dashboard = {
        timestamp: new Date(),
        employeeId,
        
        // Personal Information
        personalInfo: this._getPersonalInfo(employeeId),
        
        // Salary & Compensation
        salaryCompensation: this._getSalaryCompensation(employeeId),
        
        // GOSI Information
        gosiInfo: this._getGOSIInfo(employeeId),
        
        // Insurance & Benefits
        insuranceBenefits: this._getInsuranceBenefits(employeeId),
        
        // Leave & Attendance
        leaveAttendance: this._getLeaveAttendance(employeeId),
        
        // Documents
        documents: this._getDocuments(employeeId),
        
        // Performance & Development
        performanceDevelopment: this._getPerformanceDevelopment(employeeId),
        
        // Announcements
        announcements: this._getAnnouncements(),
        
        // Quick Actions
        quickActions: this._getQuickActions()
      };

      return dashboard;
    } catch (error) {
      logger.error('Failed to get employee dashboard', error);
      throw error;
    }
  }

  /**
   * Get Personal Information
   */
  _getPersonalInfo(employeeId) {
    return {
      employeeId,
      name: 'علي محمد أحمد',
      nameEN: 'Ali Mohamed Ahmed',
      email: 'ali.ahmed@company.com',
      phone: '+966501234567',
      dateOfBirth: '1990-05-15',
      nationality: 'Saudi',
      gender: 'Male',
      
      employment: {
        department: 'Engineering',
        position: 'Senior Engineer',
        manager: 'محمد حسن',
        startDate: '2019-03-10',
        tenure: '5 years 6 months',
        status: 'Active',
        contractType: 'Permanent'
      },
      
      emergencyContact: {
        name: 'فاطمة علي',
        relationship: 'Wife',
        phone: '+966501234568'
      }
    };
  }

  /**
   * Get Salary & Compensation
   */
  _getSalaryCompensation(employeeId) {
    return {
      currentSalary: {
        baseSalary: 10000,
        housing: 2500,
        allowances: 1500,
        grossSalary: 14000,
        lastUpdate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
      },
      
      lastPayslip: {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        gross: 14000,
        deductions: {
          gosi: 1365,
          insurance: 350,
          tax: 140
        },
        net: 12145,
        downloadUrl: '/payslips/EMP-001-2024-01.pdf'
      },
      
      payslipHistory: [
        {
          month: 'January 2024',
          date: new Date(2024, 0, 5),
          gross: 14000,
          net: 12145,
          url: '/payslips/2024-01.pdf'
        },
        {
          month: 'December 2023',
          date: new Date(2023, 11, 5),
          gross: 14000,
          net: 12145,
          url: '/payslips/2023-12.pdf'
        }
      ],
      
      yearToDateSummary: {
        totalGross: 42000,
        totalDeductions: 4095,
        totalNet: 37905,
        averageMonthly: 14000
      },
      
      bonus: {
        eligible: true,
        expectedAmount: 25000,
        expectedDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
        basis: 'Annual Performance'
      }
    };
  }

  /**
   * Get GOSI Information
   */
  _getGOSIInfo(employeeId) {
    return {
      registrationStatus: 'Active',
      registrationDate: '2019-03-10',
      affiliationNumber: 'GOSI-2019-0001234',
      
      contributions: {
        currentMonth: {
          employee: 1365,
          employer: 1635,
          total: 3000
        },
        
        yearToDate: {
          employee: 4095,
          employer: 4905,
          total: 9000
        }
      },
      
      benefits: {
        meetsRequirements: true,
        minimumContributionMonths: 60,
        completedMonths: 66,
        completionPercentage: 110,
        eligible: [
          'Disability Insurance',
          'Old Age Pension',
          'Family Allowance',
          'Work Injury Insurance'
        ]
      },
      
      estimations: {
        retirementAge: 65,
        yearsUntilRetirement: 35,
        estimatedMonthlyPension: 8500,
        estimatedTotalPension: 2550000
      },
      
      documents: [
        {
          type: 'GOSI Certificate',
          date: new Date(),
          downloadUrl: '/documents/gosi-cert.pdf'
        },
        {
          type: 'Contribution Statement',
          date: new Date(),
          downloadUrl: '/documents/gosi-statement.pdf'
        }
      ]
    };
  }

  /**
   * Get Insurance & Benefits
   */
  _getInsuranceBenefits(employeeId) {
    return {
      medicalInsurance: {
        provider: 'AXA Insurance',
        policyNumber: 'AXA-2024-001234',
        startDate: '2024-01-01',
        expiryDate: '2024-12-31',
        status: 'Active',
        coverage: 'Family',
        familyMembers: 3,
        
        benefits: [
          { name: 'General Consultation', coverage: '100%' },
          { name: 'Dental Treatment', coverage: '50%' },
          { name: 'Eye Care', coverage: '100%' },
          { name: 'Laboratory Tests', coverage: '100%' },
          { name: 'Hospitalization', coverage: 'Full' }
        ],
        
        claimsYTD: {
          total: 3,
          approved: 3,
          rejected: 0,
          totalApproved: 2500
        },
        
        renewalDate: new Date(Date.now() + 330 * 24 * 60 * 60 * 1000)
      },
      
      additionalBenefits: [
        {
          name: 'Annual Bonus',
          amount: 25000,
          dueDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
          status: 'Scheduled'
        },
        {
          name: 'Health & Wellness Program',
          type: 'Preventive',
          cost: 'Free',
          status: 'Active'
        },
        {
          name: 'Training & Development Budget',
          amountAllocated: 5000,
          amountUsed: 1200,
          remaining: 3800,
          period: 'Annual'
        }
      ]
    };
  }

  /**
   * Get Leave & Attendance
   */
  _getLeaveAttendance(employeeId) {
    return {
      attendance: {
        averagePresence: 98.5,
        presentDays: 240,
        absentDays: 3,
        lateDays: 1,
        currentStreak: 18
      },
      
      leaveBalance: {
        annual: {
          entitlement: 30,
          taken: 8,
          pending: 1,
          balance: 21,
          carryOver: 5
        },
        sick: {
          entitlement: 15,
          taken: 2,
          balance: 13
        },
        unpaid: {
          entitlement: -1,
          taken: 0,
          balance: -1
        }
      },
      
      pendingLeaveRequests: [
        {
          requestId: 'LEAVE-001',
          type: 'Annual',
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
          duration: 10,
          status: 'Pending',
          submittedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        }
      ],
      
      leaveHistory: [
        {
          type: 'Annual',
          startDate: '2024-01-15',
          endDate: '2024-01-20',
          duration: 5
        },
        {
          type: 'Sick',
          startDate: '2024-02-01',
          endDate: '2024-02-02',
          duration: 2
        }
      ]
    };
  }

  /**
   * Get Documents
   */
  _getDocuments(employeeId) {
    return {
      personalDocuments: [
        {
          type: 'National ID',
          number: '1234567890',
          issuedDate: '2015-01-15',
          expiryDate: '2030-01-14',
          status: 'Valid',
          verified: true
        },
        {
          type: 'Passport',
          number: 'A12345678',
          issuedDate: '2015-06-20',
          expiryDate: '2025-06-19',
          status: 'Valid',
          verified: true
        },
        {
          type: 'Work Visa',
          number: 'VISA-2023-001234',
          issuedDate: '2023-03-10',
          expiryDate: '2028-03-09',
          status: 'Valid',
          verified: true
        }
      ],
      
      workDocuments: [
        {
          type: 'Labor Contract',
          date: '2019-03-10',
          url: '/documents/labor-contract.pdf',
          status: 'Active',
          lastUpdated: '2019-03-10'
        },
        {
          type: 'Job Description',
          date: '2023-06-01',
          url: '/documents/job-description.pdf'
        },
        {
          type: 'Organizational Chart',
          date: '2024-01-01',
          url: '/documents/org-chart.pdf'
        }
      ],
      
      certifications: [
        {
          name: 'AWS Certified Solutions Architect',
          issuer: 'Amazon',
          issueDate: '2022-06-15',
          expiryDate: '2025-06-15',
          credentialId: 'AWS-12345',
          url: '#'
        }
      ],
      
      uploadedDocuments: [
        {
          name: 'Updated CV',
          uploadDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          type: 'PDF',
          size: '2.5 MB'
        }
      ]
    };
  }

  /**
   * Get Performance & Development
   */
  _getPerformanceDevelopment(employeeId) {
    return {
      performanceReview: {
        lastReviewDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        overallRating: 4.2,
        ratingDistribution: {
          technical: 4.3,
          teamwork: 4.0,
          communication: 4.1,
          leadership: 4.2,
          punctuality: 4.5
        },
        feedback: 'Strong technical skills and consistent performance. Good team collaboration.',
        nextReviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
      },
      
      developmentPlan: {
        active: true,
        goals: [
          {
            goal: 'Complete AWS Certification',
            status: 'In Progress',
            completionPercentage: 75,
            dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
          },
          {
            goal: 'Improve Team Leadership Skills',
            status: 'In Progress',
            completionPercentage: 50,
            dueDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
          }
        ]
      },
      
      trainings: {
        completed: [
          {
            name: 'Project Management Basics',
            date: '2023-09-15',
            duration: '2 days',
            provider: 'Internal'
          }
        ],
        inProgress: [
          {
            name: 'Advanced Cloud Architecture',
            startDate: '2024-01-10',
            endDate: '2024-02-10',
            provider: 'LinkedIn Learning'
          }
        ],
        available: [
          {
            name: 'Machine Learning Fundamentals',
            duration: '4 weeks',
            provider: 'Coursera'
          }
        ]
      }
    };
  }

  /**
   * Get Announcements
   */
  _getAnnouncements() {
    return [
      {
        id: 'ANN-001',
        type: 'important',
        title: 'تحديث نظام الرواتب',
        titleEN: 'Payroll System Update',
        content: 'تم تحديث نظام الرواتب يوم الخميس...',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        readStatus: true
      },
      {
        id: 'ANN-002',
        type: 'event',
        title: 'حفل تكريم الموظفين المتميزين',
        titleEN: 'Outstanding Employees Recognition Event',
        content: 'يشرفنا دعوتك لحفل تكريم الموظفين...',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        readStatus: false
      }
    ];
  }

  /**
   * Get Quick Actions
   */
  _getQuickActions() {
    return [
      {
        id: 'action-1',
        label: 'Request Leave',
        labelAR: 'طلب إجازة',
        icon: 'calendar',
        action: '/requests/leave'
      },
      {
        id: 'action-2',
        label: 'View Payslip',
        labelAR: 'عرض كشف الراتب',
        icon: 'document',
        action: '/payslips'
      },
      {
        id: 'action-3',
        label: 'Upload Document',
        labelAR: 'رفع مستند',
        icon: 'upload',
        action: '/documents/upload'
      },
      {
        id: 'action-4',
        label: 'Download GOSI Certificate',
        labelAR: 'تحميل شهادة التأمينات',
        icon: 'download',
        action: '/documents/gosi-certificate'
      },
      {
        id: 'action-5',
        label: 'View Benefits',
        labelAR: 'عرض المزايا',
        icon: 'shield',
        action: '/benefits'
      },
      {
        id: 'action-6',
        label: 'Contact HR',
        labelAR: 'التواصل مع الموارد البشرية',
        icon: 'chat',
        action: '/support'
      }
    ];
  }

  /**
   * Request leave
   */
  async requestLeave(employeeId, leaveRequest) {
    try {
      const { type, startDate, endDate, reason } = leaveRequest;
      
      return {
        success: true,
        requestId: `LEAVE-${Date.now()}`,
        message: 'Leave request submitted successfully',
        status: 'Pending Approval',
        estimatedApprovalDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      logger.error('Failed to request leave', error);
      throw error;
    }
  }

  /**
   * Download document
   */
  async downloadDocument(employeeId, documentType) {
    try {
      return {
        success: true,
        filename: `${documentType}_${new Date().toISOString().split('T')[0]}.pdf`,
        url: `/downloads/${documentType}`,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to download document', error);
      throw error;
    }
  }
}

module.exports = new EmployeeDashboardService();

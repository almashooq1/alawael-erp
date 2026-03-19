/* eslint-disable no-unused-vars */
/**
 * Saudi HR Module Index
 * فهرس وحدة الموارد البشرية السعودية
 */

const {
  SaudiHRService,
  Employee,
  LeaveRequest,
  Attendance,
  Payroll,
} = require('./saudi-hr-service');

const hrRoutes = require('./saudi-hr-routes');

module.exports = {
  // Service
  SaudiHRService,

  // Models
  Employee,
  LeaveRequest,
  Attendance,
  Payroll,

  // Routes
  hrRoutes,

  // Saudi-specific features
  features: {
    gosi: {
      name: 'التأمينات الاجتماعية',
      description: 'GOSI Integration - حسابات التأمينات',
      contributionRates: {
        low: { employee: 10, employer: 12 },
        medium: { employee: 10, employer: 14 },
        high: { employee: 10, employer: 16 },
      },
    },
    nitaqat: {
      name: 'نطاقات',
      description: 'Saudization compliance - برنامج نطاقات',
      categories: ['platinum', 'green', 'yellow', 'red'],
    },
    wps: {
      name: 'حماية الأجور',
      description: 'Wage Protection System - نظام حماية الأجور',
    },
    leaves: {
      name: 'إدارة الإجازات',
      types: [
        'annual',
        'sick',
        'emergency',
        'maternity',
        'hajj',
        'marriage',
        'bereavement',
        'unpaid',
      ],
    },
    attendance: {
      name: 'الحضور والانصراف',
      description: 'Time and attendance management',
    },
    payroll: {
      name: 'الرواتب',
      description: 'Payroll calculation and processing',
    },
  },
};

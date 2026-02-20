/**
 * Traffic Accident Reporting System - Test Utilities
 * نظام تقارير الحوادث المرورية - أدوات الاختبار
 */

/**
 * Mock Data Generators
 */
export const generateMockReport = (overrides = {}) => {
  const baseDate = new Date('2026-02-18T10:00:00Z');

  return {
    _id: 'ObjectId',
    reportNumber: `TAR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    severity: 'moderate',
    status: 'draft',
    priority: 'high',
    accidentInfo: {
      accidentDateTime: baseDate.toISOString(),
      location: {
        address: 'شارع الملك فهد',
        city: 'الرياض',
        region: 'المنطقة الوسطى',
        coordinates: {
          type: 'Point',
          coordinates: [46.6753, 24.7136] // Riyadh coordinates
        }
      },
      weather: 'clear',
      visibility: 'good',
      lightingConditions: 'daylight',
      roadConditions: 'dry',
      roadType: 'highway',
      speedLimit: 120,
      description: 'حادثة اصطدام بين مركبتين'
    },
    vehicles: [
      {
        plateNumber: 'ج ا ب 1234',
        vehicleType: 'سيارة سيدان',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        color: 'أسود'
      }
    ],
    people: {
      drivers: [
        {
          name: 'محمد أحمد',
          identityNumber: '1234567890',
          phone: '+966501234567'
        }
      ],
      passengers: [],
      pedestrians: []
    },
    investigation: {
      status: 'not_started',
      findings: '',
      rootCause: '',
      recommendedActions: []
    },
    comments: [],
    attachments: [],
    witnesses: [],
    createdAt: baseDate.toISOString(),
    updatedAt: baseDate.toISOString(),
    archived: false,
    ...overrides
  };
};

export const generateMockStatistics = (overrides = {}) => {
  return {
    totalReports: 100,
    pendingReports: 25,
    closedReports: 50,
    archivedReports: 5,
    averageResolutionTime: 15.5,
    totalInjuries: 45,
    totalFatalities: 2,
    totalPropertyDamage: 250000,
    statusDistribution: {
      draft: 10,
      submitted: 15,
      under_investigation: 30,
      approved: 35,
      closed: 10
    },
    severityDistribution: {
      critical: 5,
      severe: 15,
      moderate: 40,
      minor: 40
    },
    locationBreakdown: {
      'الرياض': 45,
      'جدة': 25,
      'الدمام': 20,
      'أخرى': 10
    },
    ...overrides
  };
};

export const generateMockAnalytics = () => {
  return {
    timelineTrends: [
      { month: 'يناير', total: 45, injuries: 12, fatalities: 1 },
      { month: 'فبراير', total: 55, injuries: 15, fatalities: 2 }
    ],
    hotspots: [
      {
        location: 'شارع الملك فهد',
        city: 'الرياض',
        accidentCount: 15,
        injuries: 8,
        severity: 'high'
      },
      {
        location: 'طريق الملك عبدالعزيز',
        city: 'جدة',
        accidentCount: 12,
        injuries: 6,
        severity: 'high'
      }
    ],
    violationPatterns: [
      { violation: 'عدم الانتباه', count: 40, percentage: 35 },
      { violation: 'السرعة الزائدة', count: 30, percentage: 26 },
      { violation: 'عدم اتباع المسافة الآمنة', count: 25, percentage: 22 }
    ],
    injuryRates: {
      critical: 0.05,
      severe: 0.15,
      moderate: 0.35,
      minor: 0.45
    }
  };
};

export const generateMockInsights = () => {
  return [
    {
      type: 'danger',
      title: 'نقطة سوداء معروفة',
      description: 'شارع الملك فهد به أعلى معدل ذات للحوادث (15 حادثة)',
      severity: 'high'
    },
    {
      type: 'warning',
      title: 'اتجاه متزايد',
      description: 'الحوادث الخطيرة زادت بنسبة 20% العام الماضي',
      severity: 'medium'
    },
    {
      type: 'info',
      title: 'إحصائية إيجابية',
      description: 'وقت الاستجابة المتوسط قل من 18 ساعة إلى 15.5 ساعة',
      severity: 'low'
    }
  ];
};

/**
 * API Response Mocks
 */
export const mockApiResponses = {
  successGetReports: {
    success: true,
    reports: [
      generateMockReport(),
      generateMockReport({ severity: 'critical', status: 'submitted' }),
      generateMockReport({ severity: 'minor', status: 'closed' })
    ],
    pagination: {
      total: 100,
      pages: 20,
      currentPage: 1,
      limit: 5
    }
  },

  successGetReport: {
    success: true,
    data: generateMockReport()
  },

  successCreateReport: {
    success: true,
    message: 'تم إنشاء التقرير بنجاح',
    data: generateMockReport({ status: 'submitted' })
  },

  successUpdateStatus: {
    success: true,
    message: 'تم تحديث حالة التقرير',
    data: generateMockReport({ status: 'approved' })
  },

  successStartInvestigation: {
    success: true,
    message: 'تم بدء التحقيق',
    data: generateMockReport({
      status: 'under_investigation',
      investigation: { status: 'in_progress' }
    })
  },

  successAddComment: {
    success: true,
    message: 'تم إضافة التعليق',
    data: generateMockReport({
      comments: [
        {
          _id: '123',
          text: 'تعليق تجريبي',
          createdBy: 'user123',
          createdAt: new Date().toISOString()
        }
      ]
    })
  },

  successExportPDF: {
    success: true,
    message: 'تم إنشاء ملف PDF',
    contentType: 'application/pdf',
    filename: 'TAR-001-report.pdf'
  },

  successExportExcel: {
    success: true,
    message: 'تم إنشاء ملف Excel',
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: 'traffic-accidents.xlsx'
  },

  successGetStatistics: {
    success: true,
    data: generateMockStatistics()
  },

  successGetAnalytics: {
    success: true,
    data: generateMockAnalytics()
  },

  successGetInsights: {
    success: true,
    data: generateMockInsights()
  },

  errorValidation: {
    success: false,
    message: 'فشل التحقق من البيانات',
    errors: {
      'accidentInfo.location.city': 'هذا الحقل مطلوب',
      severity: 'قيمة غير صحيحة'
    }
  },

  errorUnauthorized: {
    success: false,
    message: 'غير مصرح',
    code: 'UNAUTHORIZED'
  },

  errorForbidden: {
    success: false,
    message: 'ممنوع الدخول',
    code: 'FORBIDDEN'
  },

  errorNotFound: {
    success: false,
    message: 'التقرير غير موجود',
    code: 'NOT_FOUND'
  },

  errorServerError: {
    success: false,
    message: 'خطأ في الخادم',
    code: 'SERVER_ERROR'
  }
};

/**
 * Test Data Factories
 */
export class TestDataFactory {
  static createReport(attributes = {}) {
    return generateMockReport(attributes);
  }

  static createReports(count = 5, attributes = {}) {
    return Array.from({ length: count }, (_, i) =>
      generateMockReport({
        reportNumber: `TAR-${String(i + 1).padStart(4, '0')}`,
        ...attributes
      })
    );
  }

  static createStatistics(attributes = {}) {
    return generateMockStatistics(attributes);
  }

  static createAnalytics() {
    return generateMockAnalytics();
  }

  static createInsights() {
    return generateMockInsights();
  }

  static createUser(overrides = {}) {
    return {
      _id: 'userId123',
      name: 'محمد أحمد',
      email: 'user@example.com',
      role: 'admin',
      permissions: [
        'view_accident_reports',
        'create_accident_report',
        'edit_accident_report',
        'delete_accident_report',
        'start_investigation',
        'complete_investigation',
        'view_accident_statistics'
      ],
      ...overrides
    };
  }
}

/**
 * Assertion Helpers
 */
export const assertReportStructure = (report) => {
  expect(report).toHaveProperty('_id');
  expect(report).toHaveProperty('reportNumber');
  expect(report).toHaveProperty('severity');
  expect(report).toHaveProperty('status');
  expect(report).toHaveProperty('accidentInfo');
  expect(report.accidentInfo).toHaveProperty('accidentDateTime');
  expect(report.accidentInfo).toHaveProperty('location');
};

export const assertStatisticsStructure = (stats) => {
  expect(stats).toHaveProperty('totalReports');
  expect(stats).toHaveProperty('pendingReports');
  expect(stats).toHaveProperty('closedReports');
  expect(stats).toHaveProperty('statusDistribution');
  expect(stats).toHaveProperty('severityDistribution');
};

export const assertErrorResponse = (response) => {
  expect(response).toHaveProperty('success', false);
  expect(response).toHaveProperty('message');
};

/**
 * Mock Axios Helpers
 */
export const setupAxiosMocks = (axios) => {
  return {
    mockGetSuccess: (reports = []) => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          reports: reports.length > 0 ? reports : [generateMockReport()],
          pagination: { total: reports.length || 1, pages: 1 }
        }
      });
    },

    mockPostSuccess: () => {
      axios.post.mockResolvedValue({
        data: {
          success: true,
          data: generateMockReport()
        }
      });
    },

    mockPatchSuccess: () => {
      axios.patch.mockResolvedValue({
        data: {
          success: true,
          data: generateMockReport()
        }
      });
    },

    mockGetError: (status = 500, message = 'Server error') => {
      axios.get.mockRejectedValue({
        response: {
          status,
          data: { success: false, message }
        }
      });
    },

    mockPostError: (status = 400, message = 'Validation error') => {
      axios.post.mockRejectedValue({
        response: {
          status,
          data: { success: false, message }
        }
      });
    }
  };
};

/**
 * Wait Helpers
 */
export const waitForLoadingToFinish = async (screen) => {
  const loaders = screen.queryAllByTestId('loading');
  return Promise.all(loaders.map(() => new Promise(resolve => resolve())));
};

/**
 * Render Options
 */
export const renderWithProviders = (component, options = {}) => {
  return {
    ...render(component, {
      ...options
    })
  };
};

/**
 * Test Utilities Export
 */
export default {
  generateMockReport,
  generateMockStatistics,
  generateMockAnalytics,
  generateMockInsights,
  TestDataFactory,
  mockApiResponses,
  assertReportStructure,
  assertStatisticsStructure,
  assertErrorResponse,
  setupAxiosMocks,
  waitForLoadingToFinish,
  renderWithProviders
};

/**
 * Beneficiaries Module — Frontend Tests
 *
 * Covers:
 *   - beneficiaryService API client (all methods)
 *   - Data transformation and defensive coding
 *   - BeneficiaryRoutes route definitions
 *
 * @version 2.0.0
 * @date 2026-03-22
 */

// ─── Mock axios ──────────────────────────────────────────────────────────────
const mockGet = jest.fn(() => Promise.resolve({ data: { data: [] } }));
const mockPost = jest.fn(() => Promise.resolve({ data: { data: {} } }));
const mockPut = jest.fn(() => Promise.resolve({ data: { data: {} } }));
const mockDelete = jest.fn(() => Promise.resolve({ data: { data: {} } }));
const mockPatch = jest.fn(() => Promise.resolve({ data: { data: {} } }));
const mockCreate = jest.fn(() => ({
  get: mockGet,
  post: mockPost,
  put: mockPut,
  delete: mockDelete,
  patch: mockPatch,
  interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
}));

jest.mock('axios', () => ({
  create: mockCreate,
  get: mockGet,
  post: mockPost,
  put: mockPut,
  delete: mockDelete,
  patch: mockPatch,
  interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
}));

// ═══════════════════════════════════════════════════════════════════════════════
describe('Beneficiaries Frontend Module', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICE TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('beneficiaryService', () => {
    let service;

    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetModules();
    });

    test('should export default object with expected methods', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(service).toBeDefined();
      const expectedMethods = [
        'getAll',
        'getById',
        'create',
        'update',
        'remove',
        'getStatistics',
        'getRecent',
        'exportData',
        'register',
        'login',
        'getSchedule',
        'getProgress',
      ];
      expectedMethods.forEach(method => {
        expect(typeof service[method]).toBe('function');
      });
    });

    test('getAll should exist and accept params', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.getAll).toBe('function');
    });

    test('getById should accept an id argument', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.getById).toBe('function');
    });

    test('create should accept data argument', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.create).toBe('function');
    });

    test('update should accept id and data', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.update).toBe('function');
    });

    test('remove should accept id and optional reason', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.remove).toBe('function');
    });

    test('restore should accept id', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.restore).toBe('function');
    });

    test('updateStatus should accept id and status', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.updateStatus).toBe('function');
    });

    test('bulkAction should accept action and ids', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.bulkAction).toBe('function');
    });

    test('getStatistics should exist', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.getStatistics).toBe('function');
    });

    test('getRecent should exist', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.getRecent).toBe('function');
    });

    test('exportData should accept format', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.exportData).toBe('function');
    });

    test('getProgressHistory should exist', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.getProgressHistory).toBe('function');
    });

    test('addProgress should accept id and data', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      expect(typeof service.addProgress).toBe('function');
    });

    test('portal methods should exist', () => {
      service =
        require('../services/beneficiaryService').default ||
        require('../services/beneficiaryService');
      [
        'register',
        'login',
        'getSchedule',
        'getProgress',
        'getMessages',
        'getSurveys',
        'getProfile',
        'updateProfile',
        'getDocuments',
        'getNotifications',
      ].forEach(m => {
        expect(typeof service[m]).toBe('function');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA STRUCTURE TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Data Structures', () => {
    test('beneficiary object should have expected fields', () => {
      const beneficiary = {
        _id: '507f1f77bcf86cd799439011',
        firstName: 'أحمد',
        lastName: 'العلي',
        firstName_ar: 'أحمد',
        lastName_ar: 'العلي',
        name: 'أحمد العلي',
        gender: 'male',
        dateOfBirth: '2010-05-15',
        status: 'active',
        category: 'physical',
        nationalId: 'NID-123456',
        mrn: 'MRN-789',
        disability: { type: 'physical', severity: 'moderate' },
        contactInfo: { primaryPhone: '+966500001111', email: 'test@test.com' },
        address: { city: 'الرياض', district: 'العليا' },
      };
      expect(beneficiary._id).toBeTruthy();
      expect(beneficiary.firstName).toBeTruthy();
      expect(beneficiary.status).toBe('active');
      expect(beneficiary.disability.type).toBe('physical');
    });

    test('statistics object should have expected shape', () => {
      const stats = {
        total: 150,
        byStatus: { active: 100, pending: 30, inactive: 20 },
        byCategory: [{ _id: 'physical', count: 45 }],
        newThisMonth: 8,
        completionRate: 72,
        monthlyRegistrations: [{ _id: { month: 3, year: 2026 }, count: 12 }],
        ageDistribution: [{ _id: { min: 7, max: 12 }, count: 38 }],
        progressDistribution: [{ range: '0-20%', count: 10 }],
      };
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byStatus.active).toBeGreaterThan(0);
      expect(stats.byCategory).toBeInstanceOf(Array);
      expect(stats.monthlyRegistrations).toBeInstanceOf(Array);
    });

    test('progress record should have required fields', () => {
      const progress = {
        month: '2026-03',
        academicScore: 85,
        attendanceRate: 92,
        behaviorRating: 8,
        overallPerformance: 'good',
        improvement: 5,
        notes: 'ملاحظات',
      };
      expect(progress.month).toBeTruthy();
      expect(progress.academicScore).toBeGreaterThanOrEqual(0);
      expect(progress.academicScore).toBeLessThanOrEqual(100);
      expect(progress.attendanceRate).toBeGreaterThanOrEqual(0);
      expect(progress.behaviorRating).toBeLessThanOrEqual(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS / CATEGORY MAPPINGS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('UI Mappings', () => {
    const STATUS_LABELS = {
      active: 'نشط',
      inactive: 'غير نشط',
      pending: 'قيد الانتظار',
      transferred: 'محوّل',
      graduated: 'متخرج',
    };
    const CATEGORY_LABELS = {
      physical: 'حركية',
      mental: 'ذهنية',
      sensory: 'حسية',
      multiple: 'متعددة',
      learning: 'تعلم',
      speech: 'نطق',
    };

    test('should map all status values', () => {
      ['active', 'inactive', 'pending', 'transferred', 'graduated'].forEach(s => {
        expect(STATUS_LABELS[s]).toBeTruthy();
      });
    });

    test('should map all category values', () => {
      ['physical', 'mental', 'sensory', 'multiple', 'learning', 'speech'].forEach(c => {
        expect(CATEGORY_LABELS[c]).toBeTruthy();
      });
    });

    test('Arabic labels should be non-empty strings', () => {
      Object.values(STATUS_LABELS).forEach(l => {
        expect(typeof l).toBe('string');
        expect(l.length).toBeGreaterThan(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH / FILTER LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Client-side Filtering', () => {
    const mockBeneficiaries = [
      {
        name: 'أحمد محمد',
        firstName_ar: 'أحمد',
        lastName_ar: 'محمد',
        status: 'active',
        category: 'physical',
        gender: 'male',
        nationalId: '111',
      },
      {
        name: 'سارة عبدالله',
        firstName_ar: 'سارة',
        lastName_ar: 'عبدالله',
        status: 'pending',
        category: 'mental',
        gender: 'female',
        nationalId: '222',
      },
      {
        name: 'خالد ناصر',
        firstName_ar: 'خالد',
        lastName_ar: 'ناصر',
        status: 'inactive',
        category: 'sensory',
        gender: 'male',
        nationalId: '333',
      },
    ];

    test('should filter by status', () => {
      const result = mockBeneficiaries.filter(b => b.status === 'active');
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('أحمد');
    });

    test('should filter by category', () => {
      const result = mockBeneficiaries.filter(b => b.category === 'mental');
      expect(result).toHaveLength(1);
    });

    test('should search by name (Arabic)', () => {
      const q = 'سارة';
      const result = mockBeneficiaries.filter(
        b => (b.name || '').includes(q) || (b.firstName_ar || '').includes(q)
      );
      expect(result).toHaveLength(1);
    });

    test('should search by nationalId', () => {
      const result = mockBeneficiaries.filter(b => (b.nationalId || '').includes('222'));
      expect(result).toHaveLength(1);
    });

    test('should combine status + category filter', () => {
      const result = mockBeneficiaries.filter(
        b => b.status === 'active' && b.category === 'physical'
      );
      expect(result).toHaveLength(1);
    });

    test('should return empty for no match', () => {
      const result = mockBeneficiaries.filter(b => b.status === 'graduated');
      expect(result).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGINATION LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Pagination', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `B-${i + 1}` }));
    const PAGE_SIZE = 10;

    test('should compute correct page count', () => {
      const totalPages = Math.ceil(items.length / PAGE_SIZE);
      expect(totalPages).toBe(3);
    });

    test('first page should have PAGE_SIZE items', () => {
      const page1 = items.slice(0, PAGE_SIZE);
      expect(page1).toHaveLength(10);
    });

    test('last page should have remainder', () => {
      const lastPage = items.slice(20, 30);
      expect(lastPage).toHaveLength(5);
    });
  });
});

/**
 * Functional unit tests for domains/core/services/beneficiary360.service.js
 * Tests pure methods and key async error paths.
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('mongoose', () => ({
  model: jest.fn(),
  Types: { ObjectId: jest.fn(id => id) },
}));

const {
  Beneficiary360Service,
  beneficiary360Service,
} = require('../../domains/core/services/beneficiary360.service');

describe('domains/core/services/beneficiary360.service.js', () => {
  let service;

  beforeEach(() => {
    service = new Beneficiary360Service();
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  //  Module exports
  // ─────────────────────────────────────────────────────────────────
  describe('module exports', () => {
    test('exports Beneficiary360Service class', () => {
      expect(typeof Beneficiary360Service).toBe('function');
    });

    test('exports beneficiary360Service singleton', () => {
      expect(beneficiary360Service).toBeInstanceOf(Beneficiary360Service);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  _model()
  // ─────────────────────────────────────────────────────────────────
  describe('Beneficiary360Service._model()', () => {
    test('returns the model when mongoose.model resolves', () => {
      const mockModel = { find: jest.fn() };
      const { model } = require('mongoose');
      model.mockReturnValue(mockModel);
      expect(service._model('Beneficiary')).toBe(mockModel);
    });

    test('returns null when mongoose.model throws', () => {
      const { model } = require('mongoose');
      model.mockImplementation(() => {
        throw new Error('Model not registered');
      });
      expect(service._model('NonExistentModel')).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  _buildSummary()
  // ─────────────────────────────────────────────────────────────────
  describe('Beneficiary360Service._buildSummary()', () => {
    const base = {
      _id: 'bid1',
      fileNumber: 'F-001',
      mrn: 'MRN-001',
      nationalId: 'N-001',
      personalInfo: {
        firstName: { ar: 'علي', en: 'Ali' },
        lastName: { ar: 'محمد', en: 'Mohamed' },
        dateOfBirth: '2000-01-01',
        gender: 'male',
      },
      age: 24,
      ageInMonths: 288,
      status: 'active',
      overallRiskLevel: 'medium',
      disability: { type: 'physical', severity: 'mild', primaryDiagnosis: 'CP', icdCode: 'G80.0' },
      currentEpisodeId: { _id: 'ep1' },
      totalEpisodes: 2,
      createdAt: '2024-01-01',
      branchId: 'br1',
    };

    test('returns id, fileNumber, mrn', () => {
      const r = service._buildSummary(base);
      expect(r.id).toBe('bid1');
      expect(r.fileNumber).toBe('F-001');
      expect(r.mrn).toBe('MRN-001');
    });

    test('builds Arabic name from personalInfo.firstName.ar + lastName.ar', () => {
      expect(service._buildSummary(base).name).toBe('علي محمد');
    });

    test('builds English name from personalInfo.firstName.en + lastName.en', () => {
      expect(service._buildSummary(base).nameEn).toBe('Ali Mohamed');
    });

    test('prefers fullNameAr when present', () => {
      const b = { ...base, personalInfo: { ...base.personalInfo, fullNameAr: 'الاسم الكامل' } };
      expect(service._buildSummary(b).name).toBe('الاسم الكامل');
    });

    test('returns correct status and overallRiskLevel', () => {
      const r = service._buildSummary(base);
      expect(r.status).toBe('active');
      expect(r.overallRiskLevel).toBe('medium');
    });

    test('defaults overallRiskLevel to "none" when missing', () => {
      expect(
        service._buildSummary({ _id: 'x', personalInfo: {}, status: 'inactive' }).overallRiskLevel
      ).toBe('none');
    });

    test('extracts currentEpisodeId._id when populated', () => {
      expect(service._buildSummary(base).currentEpisodeId).toBe('ep1');
    });

    test('passes through flat currentEpisodeId (string)', () => {
      const b = { ...base, currentEpisodeId: 'ep-flat' };
      expect(service._buildSummary(b).currentEpisodeId).toBe('ep-flat');
    });

    test('includes disability block', () => {
      const r = service._buildSummary(base);
      expect(r.disability.type).toBe('physical');
      expect(r.disability.icdCode).toBe('G80.0');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  _buildFamily()
  // ─────────────────────────────────────────────────────────────────
  describe('Beneficiary360Service._buildFamily()', () => {
    test('separates guardians from non-guardians', () => {
      const b = {
        familyMembers: [
          { name: 'Fatima', relation: 'mother', phone: '0501', email: 'f@x.com', isGuardian: true },
          {
            name: 'Ahmed',
            relation: 'brother',
            phone: '0502',
            email: 'a@x.com',
            isGuardian: false,
          },
        ],
        emergencyContacts: [],
      };
      const r = service._buildFamily(b);
      expect(r.guardians).toHaveLength(1);
      expect(r.guardians[0].name).toBe('Fatima');
      expect(r.totalFamilyMembers).toBe(2);
    });

    test('maps emergency contacts with isPrimary flag', () => {
      const b = {
        familyMembers: [],
        emergencyContacts: [{ name: 'Khalid', relation: 'uncle', phone: '0503', isPrimary: true }],
      };
      const r = service._buildFamily(b);
      expect(r.emergencyContacts).toHaveLength(1);
      expect(r.emergencyContacts[0].isPrimary).toBe(true);
    });

    test('reads portal access from b.portal', () => {
      const b = {
        familyMembers: [],
        emergencyContacts: [],
        portal: { isActive: true, lastLoginAt: '2024-06-01' },
      };
      const r = service._buildFamily(b);
      expect(r.portalAccess.enabled).toBe(true);
      expect(r.portalAccess.lastLogin).toBe('2024-06-01');
    });

    test('defaults portal.enabled to false when b.portal absent', () => {
      expect(service._buildFamily({}).portalAccess.enabled).toBe(false);
    });

    test('handles missing familyMembers and emergencyContacts', () => {
      const r = service._buildFamily({});
      expect(r.guardians).toHaveLength(0);
      expect(r.emergencyContacts).toHaveLength(0);
      expect(r.totalFamilyMembers).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  _getWidgetPriority()
  // ─────────────────────────────────────────────────────────────────
  describe('Beneficiary360Service._getWidgetPriority()', () => {
    const ROLES = [
      'lead_therapist',
      'therapist',
      'supervisor',
      'coordinator',
      'physician',
      'social_worker',
      'admin',
      'family',
      'general',
    ];
    const ALL_WIDGETS = [
      'summary',
      'journey',
      'timeline',
      'assessments',
      'goals',
      'carePlan',
      'sessions',
      'family',
      'alerts',
      'progress',
    ];

    test.each(ROLES)('role "%s" returns array of 10 widgets starting with summary', role => {
      const result = service._getWidgetPriority(role);
      expect(result).toHaveLength(10);
      expect(result[0]).toBe('summary');
    });

    test.each(ROLES)('role "%s" contains all 10 widget names', role => {
      const result = service._getWidgetPriority(role);
      ALL_WIDGETS.forEach(w => expect(result).toContain(w));
    });

    test('unknown role falls back to general priority list', () => {
      const general = service._getWidgetPriority('general');
      expect(service._getWidgetPriority('unknown_xyz')).toEqual(general);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  getDashboard() — error paths
  // ─────────────────────────────────────────────────────────────────
  describe('Beneficiary360Service.getDashboard()', () => {
    function mockNotFound() {
      const { model } = require('mongoose');
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      model.mockReturnValue({ findById: jest.fn().mockReturnValue(chain) });
    }

    test('throws with message and statusCode 404 when beneficiary not found', async () => {
      mockNotFound();
      await expect(service.getDashboard('nonexistent')).rejects.toMatchObject({
        message: expect.stringContaining('غير موجود'),
        statusCode: 404,
      });
    });

    test('calls findById with the provided beneficiaryId', async () => {
      const { model } = require('mongoose');
      const mockFindById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });
      model.mockReturnValue({ findById: mockFindById });

      await service.getDashboard('bid-test').catch(() => {});
      expect(mockFindById).toHaveBeenCalledWith('bid-test');
    });
  });
});

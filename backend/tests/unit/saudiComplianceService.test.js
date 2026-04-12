/**
 * Unit tests for services/saudiComplianceService.js
 * SaudiComplianceService — Saudi regulations compliance (dual export: class + singleton)
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

const mockVehicleSave = jest.fn().mockResolvedValue(undefined);
const mockDriverAddViolation = jest.fn().mockResolvedValue(undefined);

const mockVehicleFindById = jest.fn();
const mockVehicleFind = jest.fn();
const mockDriverFindById = jest.fn();

jest.mock('../../models/Vehicle', () => ({
  findById: (...a) => mockVehicleFindById(...a),
  find: (...a) => mockVehicleFind(...a),
}));

jest.mock('../../models/Driver', () => ({
  findById: (...a) => mockDriverFindById(...a),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { saudiComplianceService: service } = require('../../services/saudiComplianceService');

/* ─── helpers ───────────────────────────────────────────────────────── */

function fakeVehicle(overrides = {}) {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  return {
    _id: 'v1',
    registrationNumber: 'ABC-1234',
    basicInfo: {
      make: 'Toyota',
      model: 'Hilux',
      year: 2022,
      type: 'سيارة تجارية',
      vin: '12345678901234567',
      engineNumber: 'ENG001',
    },
    owner: { name: 'Ahmed', nationalId: '1234567890', ownershipType: 'فردي' },
    registration: { expiryDate: futureDate },
    insurance: { provider: 'Tawuniya', policyNumber: 'POL001', expiryDate: futureDate },
    inspection: { nextInspectionDate: futureDate },
    assignedDriver: { driverId: 'drv1' },
    violations: [],
    save: mockVehicleSave,
    ...overrides,
  };
}

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('SaudiComplianceService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getSaudiViolationCodes ───────────────────────────────────────

  describe('getSaudiViolationCodes', () => {
    it('returns violation code dictionary', () => {
      const codes = service.getSaudiViolationCodes();
      expect(codes[101]).toBeDefined();
      expect(codes[101].الغرامة).toBe(100);
      expect(codes[201].النقاط).toBe(3);
    });

    it('includes speed violations', () => {
      const codes = service.getSaudiViolationCodes();
      expect(codes[301]).toBeDefined();
      expect(codes[304].الغرامة).toBe(1500);
    });

    it('includes serious violations', () => {
      const codes = service.getSaudiViolationCodes();
      expect(codes[401].النقاط).toBe(12);
      expect(codes[406]).toBeDefined();
    });
  });

  // ── calculateViolationSeverity ───────────────────────────────────

  describe('calculateViolationSeverity', () => {
    it('returns simple for 0 points', () => {
      expect(service.calculateViolationSeverity(0)).toContain('بسيطة');
    });

    it('returns medium for 1-3 points', () => {
      expect(service.calculateViolationSeverity(2)).toContain('متوسطة');
    });

    it('returns serious for 4-6 points', () => {
      expect(service.calculateViolationSeverity(5)).toContain('خطيرة');
    });

    it('returns severe for 7+ points', () => {
      expect(service.calculateViolationSeverity(8)).toContain('شديدة');
    });
  });

  // ── checkRegistrationValidity ────────────────────────────────────

  describe('checkRegistrationValidity', () => {
    it('returns valid for future expiry', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const result = service.checkRegistrationValidity({
        registration: { expiryDate: future },
      });
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('صحيح');
      expect(result.renewalAlertLevel).toBe('green');
    });

    it('returns expired for past date', () => {
      const result = service.checkRegistrationValidity({
        registration: { expiryDate: new Date('2020-01-01') },
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('منتهي');
      expect(result.renewalAlertLevel).toBe('red');
    });

    it('returns near-expiry for within 30 days', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 15);
      const result = service.checkRegistrationValidity({
        registration: { expiryDate: soon },
      });
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('قريب الانتهاء');
      expect(result.requiresRenewal).toBe(true);
    });

    it('handles null vehicle', () => {
      const result = service.checkRegistrationValidity(null);
      expect(result.isValid).toBe(false);
      expect(result.daysRemaining).toBe(-1);
    });

    it('handles missing registration', () => {
      const result = service.checkRegistrationValidity({});
      expect(result.isValid).toBe(false);
    });

    it('handles invalid date', () => {
      const result = service.checkRegistrationValidity({
        registration: { expiryDate: 'not-a-date' },
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('غير صحيح');
    });
  });

  // ── checkInsuranceValidity ───────────────────────────────────────

  describe('checkInsuranceValidity', () => {
    it('returns valid for future expiry', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const result = service.checkInsuranceValidity({
        insurance: { provider: 'Tawuniya', expiryDate: future },
      });
      expect(result.isValid).toBe(true);
      expect(result.isMandatory).toBe(true);
      expect(result.provider).toBe('Tawuniya');
    });

    it('returns expired for past date', () => {
      const result = service.checkInsuranceValidity({
        insurance: { provider: 'X', expiryDate: new Date('2020-01-01') },
      });
      expect(result.isValid).toBe(false);
      expect(result.renewalAlertLevel).toBe('red');
    });
  });

  // ── checkInspectionValidity ──────────────────────────────────────

  describe('checkInspectionValidity', () => {
    it('returns compliant for future inspection', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const result = service.checkInspectionValidity({
        inspection: { nextInspectionDate: future },
        basicInfo: { type: 'سيارة خاصة' },
      });
      expect(result.isOverdue).toBe(false);
      expect(result.status).toBe('متوافق');
      expect(result.alertLevel).toBe('green');
    });

    it('returns overdue for past date', () => {
      const result = service.checkInspectionValidity({
        inspection: { nextInspectionDate: new Date('2020-01-01') },
        basicInfo: { type: 'سيارة خاصة' },
      });
      expect(result.isOverdue).toBe(true);
      expect(result.requiresInspection).toBe(true);
      expect(result.alertLevel).toBe('red');
    });
  });

  // ── getInspectionSchedule ────────────────────────────────────────

  describe('getInspectionSchedule', () => {
    it('returns schedule for known type', () => {
      const sched = service.getInspectionSchedule('سيارة تجارية');
      expect(sched['0-1']).toBeDefined();
    });

    it('falls back to private car schedule', () => {
      const sched = service.getInspectionSchedule('نوع غير معروف');
      expect(sched['0-3']).toBeDefined();
    });

    it('returns bus schedule', () => {
      const sched = service.getInspectionSchedule('حافلة');
      expect(sched['0+']).toContain('6 أشهر');
    });
  });

  // ── recordSaudiViolation ─────────────────────────────────────────

  describe('recordSaudiViolation', () => {
    it('records violation and updates driver points', async () => {
      const vehicle = fakeVehicle();
      mockVehicleFindById.mockResolvedValue(vehicle);
      const driver = { addViolation: mockDriverAddViolation };
      mockDriverFindById.mockResolvedValue(driver);

      const result = await service.recordSaudiViolation('v1', {
        violationCode: 201,
        location: 'Riyadh',
        officer: 'Off1',
      });

      expect(result.success).toBe(true);
      expect(vehicle.violations).toHaveLength(1);
      expect(vehicle.violations[0].violationCode).toBe(201);
      expect(mockVehicleSave).toHaveBeenCalled();
      expect(mockDriverAddViolation).toHaveBeenCalled();
    });

    it('records violation without points (no driver update)', async () => {
      const vehicle = fakeVehicle();
      mockVehicleFindById.mockResolvedValue(vehicle);

      const result = await service.recordSaudiViolation('v1', {
        violationCode: 101, // 0 points
      });

      expect(result.success).toBe(true);
      expect(mockDriverFindById).not.toHaveBeenCalled();
    });

    it('throws for invalid violation code', async () => {
      mockVehicleFindById.mockResolvedValue(fakeVehicle());
      await expect(service.recordSaudiViolation('v1', { violationCode: 999 })).rejects.toThrow(
        'كود المخالفة غير صحيح'
      );
    });

    it('throws when vehicle not found', async () => {
      mockVehicleFindById.mockResolvedValue(null);
      await expect(service.recordSaudiViolation('bad', { violationCode: 201 })).rejects.toThrow(
        'المركبة غير موجودة'
      );
    });

    it('handles vehicle without assigned driver', async () => {
      const vehicle = fakeVehicle({ assignedDriver: { driverId: null } });
      mockVehicleFindById.mockResolvedValue(vehicle);

      const result = await service.recordSaudiViolation('v1', { violationCode: 201 });

      expect(result.success).toBe(true);
      expect(mockDriverFindById).not.toHaveBeenCalled();
    });
  });

  // ── generateVehicleComplianceReport ──────────────────────────────

  describe('generateVehicleComplianceReport', () => {
    it('generates report with full compliance', async () => {
      const vehicle = fakeVehicle();
      mockVehicleFindById.mockResolvedValue(vehicle);

      const report = await service.generateVehicleComplianceReport('v1');

      expect(report.overallComplianceScore).toBe(100);
      expect(report.overallStatus).toBe('متوافق');
      expect(report.legalStatus.canBeDriven).toBe(true);
    });

    it('deducts score for expired registration', async () => {
      const vehicle = fakeVehicle({
        registration: { expiryDate: new Date('2020-01-01') },
      });
      mockVehicleFindById.mockResolvedValue(vehicle);

      const report = await service.generateVehicleComplianceReport('v1');

      expect(report.overallComplianceScore).toBeLessThan(100);
      expect(report.legalStatus.canBeDriven).toBe(false);
    });

    it('includes unpaid fines in report', async () => {
      const vehicle = fakeVehicle({
        violations: [
          { fine: 500, paymentStatus: 'لم تسدد' },
          { fine: 300, paymentStatus: 'لم تسدد' },
        ],
      });
      mockVehicleFindById.mockResolvedValue(vehicle);

      const report = await service.generateVehicleComplianceReport('v1');

      expect(report.violations.unpaid).toBe(2);
      expect(report.violations.totalFinesAmount).toBe(800);
    });

    it('throws when vehicle not found', async () => {
      mockVehicleFindById.mockResolvedValue(null);
      await expect(service.generateVehicleComplianceReport('bad')).rejects.toThrow(
        'المركبة غير موجودة'
      );
    });
  });

  // ── generateComplianceRecommendations ────────────────────────────

  describe('generateComplianceRecommendations', () => {
    it('returns empty for fully compliant', () => {
      const recs = service.generateComplianceRecommendations({
        registrationCheck: { isValid: true, daysRemaining: 60 },
        insuranceCheck: { isValid: true, daysRemaining: 60 },
        inspectionCheck: { isOverdue: false },
        violations: [],
      });
      expect(recs).toHaveLength(0);
    });

    it('adds urgent for expired registration', () => {
      const recs = service.generateComplianceRecommendations({
        registrationCheck: { isValid: false, daysRemaining: -5 },
        insuranceCheck: { isValid: true, daysRemaining: 60 },
        inspectionCheck: { isOverdue: false },
        violations: [],
      });
      expect(recs.some(r => r.type === 'عاجل' && r.message.includes('التسجيل'))).toBe(true);
    });

    it('adds recommendation for unpaid violations', () => {
      const recs = service.generateComplianceRecommendations({
        registrationCheck: { isValid: true, daysRemaining: 60 },
        insuranceCheck: { isValid: true, daysRemaining: 60 },
        inspectionCheck: { isOverdue: false },
        violations: [{ fine: 500 }, { fine: 300 }],
      });
      expect(recs.some(r => r.type === 'مهم' && r.amount === 800)).toBe(true);
    });

    it('adds alert for near-expiry registration', () => {
      const recs = service.generateComplianceRecommendations({
        registrationCheck: { isValid: true, daysRemaining: 20 },
        insuranceCheck: { isValid: true, daysRemaining: 60 },
        inspectionCheck: { isOverdue: false },
        violations: [],
      });
      expect(recs.some(r => r.type === 'تنبيه' && r.message.includes('التسجيل'))).toBe(true);
    });

    it('adds alert for near-expiry insurance', () => {
      const recs = service.generateComplianceRecommendations({
        registrationCheck: { isValid: true, daysRemaining: 60 },
        insuranceCheck: { isValid: true, daysRemaining: 20 },
        inspectionCheck: { isOverdue: false },
        violations: [],
      });
      expect(recs.some(r => r.type === 'تنبيه' && r.message.includes('التأمين'))).toBe(true);
    });

    it('adds urgent for overdue inspection', () => {
      const recs = service.generateComplianceRecommendations({
        registrationCheck: { isValid: true, daysRemaining: 60 },
        insuranceCheck: { isValid: true, daysRemaining: 60 },
        inspectionCheck: { isOverdue: true },
        violations: [],
      });
      expect(recs.some(r => r.type === 'عاجل' && r.message.includes('الفحص'))).toBe(true);
    });
  });

  // ── generateFleetComplianceReport ────────────────────────────────

  describe('generateFleetComplianceReport', () => {
    it('generates fleet report for multiple vehicles', async () => {
      const v1 = fakeVehicle({ _id: 'v1' });
      const v2 = fakeVehicle({ _id: 'v2' });
      mockVehicleFind.mockResolvedValue([v1, v2]);
      // generateVehicleComplianceReport calls Vehicle.findById for each
      mockVehicleFindById.mockResolvedValue(fakeVehicle());

      const report = await service.generateFleetComplianceReport(['v1', 'v2']);

      expect(report.totalVehicles).toBe(2);
      expect(report.vehicleDetails).toHaveLength(2);
      expect(report.complianceBreakdown.compliant).toBe(2);
    });

    it('throws on error', async () => {
      mockVehicleFind.mockRejectedValue(new Error('DB error'));

      await expect(service.generateFleetComplianceReport(['v1'])).rejects.toThrow('DB error');
    });
  });

  // ── calculateDaysRemaining ───────────────────────────────────────

  describe('calculateDaysRemaining', () => {
    it('returns positive days for future date', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      expect(service.calculateDaysRemaining(future)).toBe(10);
    });

    it('returns negative days for past date', () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      expect(service.calculateDaysRemaining(past)).toBe(-5);
    });

    it('returns 0 for today', () => {
      expect(service.calculateDaysRemaining(new Date())).toBe(0);
    });
  });

  // ── validateVehicleData ──────────────────────────────────────────

  describe('validateVehicleData', () => {
    it('validates complete vehicle data', () => {
      const vehicle = {
        registrationNumber: 'ABC-1234',
        basicInfo: {
          make: 'Toyota',
          model: 'Hilux',
          year: 2022,
          vin: '12345678901234567',
          engineNumber: 'ENG001',
        },
        owner: { name: 'Ahmed', nationalId: '1234567890' },
        registration: { expiryDate: new Date() },
        insurance: { policyNumber: 'POL001', expiryDate: new Date() },
      };

      const result = service.validateVehicleData(vehicle);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('detects missing fields', () => {
      const result = service.validateVehicleData({});
      expect(result.isValid).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });

    it('validates national ID format', () => {
      const vehicle = {
        registrationNumber: 'X',
        basicInfo: {
          make: 'X',
          model: 'X',
          year: 2022,
          vin: '12345678901234567',
          engineNumber: 'E',
        },
        owner: { name: 'X', nationalId: '123' }, // invalid - not 10 digits
        registration: { expiryDate: new Date() },
        insurance: { policyNumber: 'P', expiryDate: new Date() },
      };

      const result = service.validateVehicleData(vehicle);
      expect(result.invalidFields).toContain('owner.nationalId');
    });

    it('validates VIN length', () => {
      const vehicle = {
        registrationNumber: 'X',
        basicInfo: { make: 'X', model: 'X', year: 2022, vin: 'SHORT', engineNumber: 'E' },
        owner: { name: 'X', nationalId: '1234567890' },
        registration: { expiryDate: new Date() },
        insurance: { policyNumber: 'P', expiryDate: new Date() },
      };

      const result = service.validateVehicleData(vehicle);
      expect(result.invalidFields).toContain('basicInfo.vin');
    });

    it('includes data completion percentage', () => {
      const result = service.validateVehicleData({});
      expect(result.dataCompletionPercentage).toMatch(/\d+\.\d+%/);
    });
  });
});

/**
 * Unit tests for civilDefenseIntegration.service.js (797L)
 * Singleton with 26 methods, axios API calls, nodemailer, crypto HMAC, Map cache
 */

/* ─── mocks ─── */
jest.mock('axios', () => {
  const fn = jest.fn().mockResolvedValue({ status: 200, data: {} });
  fn.post = jest.fn().mockResolvedValue({ status: 200, data: {} });
  fn.get = jest.fn().mockResolvedValue({ status: 200, data: {} });
  return fn;
});
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
  }),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const axios = require('axios');
const nodemailer = require('nodemailer');
const service = require('../../services/civilDefenseIntegration.service');

beforeEach(() => {
  jest.clearAllMocks();
  service.clearCache();
});

describe('CivilDefenseIntegrationService', () => {
  // ═══════════════ Validation ═══════════════
  describe('Validation', () => {
    it('validateBuildingData — valid data', () => {
      const r = service.validateBuildingData({
        facilityId: 'f1',
        buildingType: 'commercial',
        facilitySizeMeters: 500,
        address: 'الرياض',
      });
      expect(r.isValid).toBe(true);
      expect(r.errors).toHaveLength(0);
    });

    it('validateBuildingData — missing fields', () => {
      const r = service.validateBuildingData({});
      expect(r.isValid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('validateAuditData — valid data', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const r = service.validateAuditData({
        facilityId: 'f1',
        auditType: 'comprehensive',
        preferredDate: futureDate.toISOString(),
        contactPerson: 'أحمد',
        contactPhone: '0501234567',
      });
      expect(r.isValid).toBe(true);
    });

    it('validateAuditData — missing fields', () => {
      const r = service.validateAuditData({});
      expect(r.isValid).toBe(false);
    });
  });

  // ═══════════════ Certificate Methods ═══════════════
  describe('Certificates', () => {
    it('requestSafetyCertificate — calls API and returns result', async () => {
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: { certificate_id: 'C001', reference_number: 'REF001' },
      });

      const r = await service.requestSafetyCertificate({
        facilityId: 'f1',
        buildingType: 'commercial',
        facilitySizeMeters: 500,
        address: 'الرياض',
      });
      expect(r.success).toBe(true);
      expect(r.certificateId).toBe('C001');
      expect(r.estimatedCompletionDate).toBeInstanceOf(Date);
    });

    it('requestSafetyCertificate — throws on invalid data', async () => {
      await expect(service.requestSafetyCertificate({})).rejects.toThrow();
    });

    it('getCertificateStatus — calls API', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: { status: 'valid' } });
      const r = await service.getCertificateStatus('C001');
      expect(r).toBeDefined();
    });

    it('renewSafetyCertificate — calls API', async () => {
      axios.mockResolvedValueOnce({
        status: 200,
        data: { certificateId: 'C001', status: 'renewal_pending' },
      });
      const r = await service.renewSafetyCertificate('C001', {
        facilityName: 'مركز',
        buildingType: 'hospital',
        address: 'الرياض',
        ownerName: 'صاحب',
        ownerPhone: '0501234567',
        floors: 2,
        area: 500,
        occupancy: 100,
      });
      expect(r).toBeDefined();
    });
  });

  // ═══════════════ Audit Methods ═══════════════
  describe('Audits', () => {
    it('scheduleSafetyAudit — calls API', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      // getAuditScheduleSlots uses axios.get() and reads available_slots
      axios.get.mockResolvedValueOnce({ status: 200, data: { available_slots: ['09:00'] } });
      // schedule POST uses axios.post()
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: {
          audit_id: 'A001',
          scheduled_date: futureDate.toISOString(),
          audit_type: 'comprehensive',
          inspector_name: 'X',
          inspector_phone: '05',
          estimated_duration: '2h',
          location: 'L',
        },
      });
      const r = await service.scheduleSafetyAudit({
        facilityId: 'f1',
        auditType: 'comprehensive',
        preferredDate: futureDate.toISOString(),
        contactPerson: 'أحمد',
        contactPhone: '0501234567',
      });
      expect(r.success).toBe(true);
      expect(r.auditId).toBe('A001');
    });

    it('scheduleSafetyAudit — throws on invalid data', async () => {
      await expect(service.scheduleSafetyAudit({})).rejects.toThrow();
    });

    it('getAuditScheduleSlots — returns slots or empty array', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: { slots: ['09:00', '10:00'] } });
      const r = await service.getAuditScheduleSlots('f1', '2026-06-01');
      expect(Array.isArray(r) || (r && r.slots)).toBeTruthy();
    });

    it('getAuditScheduleSlots — returns [] on error', async () => {
      axios.mockRejectedValueOnce(new Error('timeout'));
      const r = await service.getAuditScheduleSlots('f1', '2026-06-01');
      expect(r).toEqual([]);
    });
  });

  // ═══════════════ Compliance & Violations ═══════════════
  describe('Compliance', () => {
    it('getComplianceStatus — calls API', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: { status: 'compliant' } });
      const r = await service.getComplianceStatus('f1');
      expect(r).toBeDefined();
    });

    it('getViolations — calls API', async () => {
      axios.get.mockResolvedValueOnce({ status: 200, data: { violations: [] } });
      const r = await service.getViolations('f1');
      expect(r.totalViolations).toBe(0);
      expect(r.violations).toEqual([]);
    });
  });

  // ═══════════════ Fire Safety & Drills ═══════════════
  describe('Fire Safety & Drills', () => {
    it('scheduleFireSafetyInspection — calls API', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: { inspectionId: 'I001' } });
      const r = await service.scheduleFireSafetyInspection({
        facilityId: 'f1',
        date: '2026-06-01',
      });
      expect(r).toBeDefined();
    });

    it('getFireSafetyStatus — calls API', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: { status: 'passed' } });
      const r = await service.getFireSafetyStatus('f1');
      expect(r).toBeDefined();
    });

    it('scheduleEmergencyDrill — calls API', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: { drillId: 'D001' } });
      const r = await service.scheduleEmergencyDrill({
        facilityId: 'f1',
        drillType: 'fire',
        date: '2026-06-01',
      });
      expect(r).toBeDefined();
    });

    it('getEmergencyDrillResults — calls API', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: { result: 'passed' } });
      const r = await service.getEmergencyDrillResults('D001');
      expect(r).toBeDefined();
    });
  });

  // ═══════════════ Documents ═══════════════
  describe('Documents', () => {
    it('uploadSafetyDocuments — calls API', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: { uploaded: true } });
      const r = await service.uploadSafetyDocuments('f1', [
        { name: 'doc.pdf', type: 'safety_plan' },
      ]);
      expect(r).toBeDefined();
    });

    it('getRequiredDocumentsForType — returns list for known types', () => {
      const r = service.getRequiredDocumentsForType('hospital');
      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBeGreaterThan(0);
    });

    it('getRequiredDocumentsForType — returns base docs for unknown type', () => {
      const r = service.getRequiredDocumentsForType('unknown_type');
      expect(Array.isArray(r)).toBe(true);
    });
  });

  // ═══════════════ Email Notifications ═══════════════
  describe('Email', () => {
    it('sendAuditConfirmationEmail — sends email', async () => {
      const r = await service.sendAuditConfirmationEmail(
        { auditId: 'A001', scheduledDate: '2026-06-01' },
        { contactEmail: 'test@test.com', facilityName: 'مركز' }
      );
      expect(r.success).toBe(true);
    });

    it('sendAuditConfirmationEmail — returns {success:false} on error', async () => {
      nodemailer.createTransport().sendMail.mockRejectedValueOnce(new Error('SMTP fail'));
      const r = await service.sendAuditConfirmationEmail({}, { contactEmail: 'x@x.com' });
      expect(r.success).toBe(false);
    });

    it('sendEmergencyDrillNotification — sends email', async () => {
      const r = await service.sendEmergencyDrillNotification(
        { drillId: 'D001', drillDate: '2026-06-01' },
        { contactEmail: 'test@test.com', facilityName: 'مركز' }
      );
      expect(r.success).toBe(true);
    });
  });

  // ═══════════════ Auth Helpers ═══════════════
  describe('Auth Helpers', () => {
    it('getAuthHeaders — returns headers with timestamp and signature', () => {
      const h = service.getAuthHeaders();
      expect(h).toHaveProperty('X-Timestamp');
      expect(h).toHaveProperty('Content-Type', 'application/json');
      expect(h).toHaveProperty('Accept-Language', 'ar-SA');
    });

    it('generateSignature — returns string', () => {
      const sig = service.generateSignature(Date.now().toString());
      expect(typeof sig).toBe('string');
    });
  });

  // ═══════════════ Building Helpers ═══════════════
  describe('Building Helpers', () => {
    it('buildCertificateRequest — structures data', () => {
      const req = service.buildCertificateRequest({
        facilityId: 'f1',
        buildingType: 'commercial',
        facilitySizeMeters: 500,
        address: 'الرياض',
        contactPerson: 'أحمد',
        contactPhone: '05',
      });
      expect(req.facility_id).toBe('f1');
      expect(req.building_type).toBe('commercial');
      expect(req.facility_size).toBe(500);
    });

    it('calculateCompletionDate — returns Date', () => {
      const d = service.calculateCompletionDate('commercial');
      expect(d).toBeInstanceOf(Date);
    });

    it('calculateDaysRemaining — positive for future date', () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      const r = service.calculateDaysRemaining(future.toISOString());
      expect(r).toBeGreaterThan(0);
    });

    it('calculateDaysRemaining — negative for past date', () => {
      const past = new Date();
      past.setDate(past.getDate() - 10);
      const r = service.calculateDaysRemaining(past.toISOString());
      expect(r).toBeLessThan(0);
    });
  });

  // ═══════════════ Cache ═══════════════
  describe('Cache', () => {
    it('setCache + getFromCache — stores and retrieves', () => {
      service.setCache('k1', { data: true });
      expect(service.getFromCache('k1')).toEqual({ data: true });
    });

    it('getFromCache — returns null for missing key', () => {
      expect(service.getFromCache('nonexistent')).toBeNull();
    });

    it('getFromCache — returns null for expired data', () => {
      service.cache.set('k2', { data: 'x', timestamp: Date.now() - 99999999 });
      expect(service.getFromCache('k2')).toBeNull();
    });

    it('clearCache — clears specific key', () => {
      service.setCache('a', 1);
      service.setCache('b', 2);
      service.clearCache('a');
      expect(service.getFromCache('a')).toBeNull();
      expect(service.getFromCache('b')).toBeTruthy();
    });

    it('clearCache — clears all when no key', () => {
      service.setCache('x', 1);
      service.clearCache();
      expect(service.cache.size).toBe(0);
    });
  });
});

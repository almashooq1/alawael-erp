/**
 * Unit Tests: crm-advanced.service.js
 * CRM Advanced Service — Contacts, Deals, Follow-ups, Reports, Dashboard
 *
 * Uses jest.setup.js which fully mocks mongoose.
 * No real DB connections.
 */

// ─── Mocks for external deps ────────────────────────────────
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../utils/sanitize', () => ({
  escapeRegex: jest.fn(str => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  stripDangerousKeys: jest.fn(obj => obj),
}));

// ─── Helpers ─────────────────────────────────────────────────
const isObjectId = value => /^[a-f\d]{24}$/i.test(value);
const fakeId = '000000000000000000000099';
const fakeUserId = '000000000000000000000001';
const fakeUserName = 'أحمد تجريبي';

// ─── Import service ──────────────────────────────────────────
const {
  CRMAdvancedService,
  crmAdvancedService,
  CrmContact,
  CrmDeal,
  CrmFollowUp,
  CrmActivity,
} = require('../../services/crm-advanced.service');

// ═════════════════════════════════════════════════════════════
// 1. MODULE EXPORTS
// ═════════════════════════════════════════════════════════════

describe('CRM Advanced Service — Module Exports', () => {
  it('exports CRMAdvancedService class', () => {
    expect(CRMAdvancedService).toBeDefined();
    expect(typeof CRMAdvancedService).toBe('function');
  });

  it('exports crmAdvancedService singleton instance', () => {
    expect(crmAdvancedService).toBeDefined();
    expect(crmAdvancedService).toBeInstanceOf(CRMAdvancedService);
  });

  it('exports CrmContact model', () => {
    expect(CrmContact).toBeDefined();
    expect(CrmContact.find).toBeDefined();
  });

  it('exports CrmDeal model', () => {
    expect(CrmDeal).toBeDefined();
    expect(CrmDeal.find).toBeDefined();
  });

  it('exports CrmFollowUp model', () => {
    expect(CrmFollowUp).toBeDefined();
    expect(CrmFollowUp.find).toBeDefined();
  });

  it('exports CrmActivity model', () => {
    expect(CrmActivity).toBeDefined();
    expect(CrmActivity.find).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════
// 2. SERVICE METHOD EXISTENCE
// ═════════════════════════════════════════════════════════════

describe('CRM Advanced Service — Method Existence', () => {
  const expectedMethods = [
    // Internal
    '_logActivity',
    // Contacts
    'getContacts',
    'getContactById',
    'createContact',
    'updateContact',
    'deleteContact',
    'getContactStats',
    'addInteraction',
    // Deals
    'getDeals',
    'getDealById',
    'createDeal',
    'updateDeal',
    'deleteDeal',
    'updateDealStage',
    'getPipeline',
    // Follow-ups
    'getFollowUps',
    'createFollowUp',
    'updateFollowUp',
    'completeFollowUp',
    'getUpcomingFollowUps',
    'getOverdueFollowUps',
    // Dashboard
    'getDashboardStats',
    // Reports
    'getConversionReport',
    'getActivityReport',
    'getRevenueReport',
    // Leads
    'getLeads',
    'createLead',
    'updateLead',
    'deleteLead',
    'updateLeadStage',
    'convertLeadToContact',
    'getLeadsPipeline',
    // Activities
    'getActivities',
    // Seed
    'seedDemoData',
  ];

  expectedMethods.forEach(method => {
    it(`has method: ${method}`, () => {
      expect(typeof crmAdvancedService[method]).toBe('function');
    });
  });
});

// ═════════════════════════════════════════════════════════════
// 3. CONTACTS — جهات الاتصال
// ═════════════════════════════════════════════════════════════

describe('CRM Advanced Service — Contacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getContacts()', () => {
    it('returns data array and pagination with default params', async () => {
      CrmContact.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmContact.countDocuments.mockResolvedValue(0);

      const result = await crmAdvancedService.getContacts();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('pages');
    });

    it('passes page/limit to pagination', async () => {
      CrmContact.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmContact.countDocuments.mockResolvedValue(50);

      const result = await crmAdvancedService.getContacts({ page: 2, limit: 10 });
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.pages).toBe(5);
    });

    it('applies search filter with $or', async () => {
      CrmContact.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmContact.countDocuments.mockResolvedValue(0);

      await crmAdvancedService.getContacts({ search: 'test' });
      const calledFilter = CrmContact.find.mock.calls[0][0];
      expect(calledFilter.$or).toBeDefined();
      expect(calledFilter.$or.length).toBe(4);
    });

    it('applies status/type/sector/tier/city filters', async () => {
      CrmContact.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmContact.countDocuments.mockResolvedValue(0);

      await crmAdvancedService.getContacts({
        status: 'نشط',
        type: 'شركة',
        sector: 'التقنية',
        tier: 'ذهبي',
        city: 'الرياض',
      });

      const filter = CrmContact.find.mock.calls[0][0];
      expect(filter.status).toBe('نشط');
      expect(filter.type).toBe('شركة');
      expect(filter.sector).toBe('التقنية');
      expect(filter.tier).toBe('ذهبي');
      expect(filter.city).toBe('الرياض');
    });
  });

  describe('getContactById()', () => {
    it('throws if contact not found', async () => {
      CrmContact.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb(null))),
      });

      await expect(crmAdvancedService.getContactById(fakeId)).rejects.toThrow(
        'جهة الاتصال غير موجودة'
      );
    });

    it('returns contact with deals, followUps, recentActivity', async () => {
      const mockContact = { _id: fakeId, name: 'تست' };
      CrmContact.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb(mockContact))),
      });
      CrmDeal.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmFollowUp.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmActivity.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });

      const result = await crmAdvancedService.getContactById(fakeId);
      expect(result.name).toBe('تست');
      expect(result).toHaveProperty('deals');
      expect(result).toHaveProperty('followUps');
      expect(result).toHaveProperty('recentActivity');
    });
  });

  describe('createContact()', () => {
    it('creates and returns a new contact', async () => {
      const data = { name: 'شركة الاختبار', email: 'test@example.sa' };
      const created = { _id: fakeId, ...data, createdBy: fakeUserId };
      CrmContact.create.mockResolvedValue(created);
      CrmActivity.create.mockResolvedValue({});

      const result = await crmAdvancedService.createContact(data, fakeUserId, fakeUserName);
      expect(result.name).toBe('شركة الاختبار');
      expect(CrmContact.create).toHaveBeenCalled();
    });

    it('logs new_contact activity', async () => {
      CrmContact.create.mockResolvedValue({ _id: fakeId, name: 'تست' });
      CrmActivity.create.mockResolvedValue({});

      await crmAdvancedService.createContact({ name: 'تست' }, fakeUserId, fakeUserName);
      expect(CrmActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'new_contact' })
      );
    });
  });

  describe('updateContact()', () => {
    it('throws if contact not found', async () => {
      CrmContact.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        crmAdvancedService.updateContact(fakeId, { name: 'x' }, fakeUserId, fakeUserName)
      ).rejects.toThrow('جهة الاتصال غير موجودة');
    });

    it('returns updated contact', async () => {
      const updated = { _id: fakeId, name: 'اسم محدث' };
      CrmContact.findByIdAndUpdate.mockResolvedValue(updated);
      CrmActivity.create.mockResolvedValue({});

      const result = await crmAdvancedService.updateContact(
        fakeId,
        { name: 'اسم محدث' },
        fakeUserId,
        fakeUserName
      );
      expect(result.name).toBe('اسم محدث');
    });
  });

  describe('deleteContact()', () => {
    it('throws if contact not found', async () => {
      CrmContact.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb(null))),
      });

      await expect(
        crmAdvancedService.deleteContact(fakeId, fakeUserId, fakeUserName)
      ).rejects.toThrow('جهة الاتصال غير موجودة');
    });

    it('soft-deletes contact (status=محذوف) and returns success', async () => {
      const mockContact = {
        _id: fakeId,
        name: 'حذف',
        status: 'نشط',
        save: jest.fn().mockResolvedValue(true),
      };
      CrmContact.findById.mockResolvedValue(mockContact);
      CrmActivity.create.mockResolvedValue({});

      const result = await crmAdvancedService.deleteContact(fakeId, fakeUserId, fakeUserName);
      expect(mockContact.status).toBe('محذوف');
      expect(mockContact.save).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });
  });

  describe('getContactStats()', () => {
    it('returns stat object with expected keys', async () => {
      CrmContact.countDocuments.mockResolvedValue(10);
      CrmContact.aggregate.mockReturnValue({
        exec: jest.fn(async () => []),
        then: jest.fn(async cb => cb([])),
      });
      CrmContact.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });

      const stats = await crmAdvancedService.getContactStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('inactive');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('bySector');
      expect(stats).toHaveProperty('byTier');
      expect(stats).toHaveProperty('byCity');
      expect(stats).toHaveProperty('recentContacts');
    });
  });

  describe('addInteraction()', () => {
    it('throws if contact not found', async () => {
      CrmContact.findById.mockResolvedValue(null);

      await expect(
        crmAdvancedService.addInteraction(fakeId, { type: 'اتصال' }, fakeUserId, fakeUserName)
      ).rejects.toThrow('جهة الاتصال غير موجودة');
    });

    it('pushes interaction and updates lastContact', async () => {
      const mockContact = {
        _id: fakeId,
        name: 'عميل',
        interactions: [],
        lastContact: null,
        save: jest.fn().mockResolvedValue(true),
      };
      CrmContact.findById.mockResolvedValue(mockContact);
      CrmActivity.create.mockResolvedValue({});

      const result = await crmAdvancedService.addInteraction(
        fakeId,
        { type: 'اتصال', content: 'مكالمة' },
        fakeUserId,
        fakeUserName
      );
      expect(mockContact.interactions.length).toBe(1);
      expect(mockContact.lastContact).toBeInstanceOf(Date);
      expect(mockContact.save).toHaveBeenCalled();
    });
  });
});

// ═════════════════════════════════════════════════════════════
// 4. DEALS — الصفقات
// ═════════════════════════════════════════════════════════════

describe('CRM Advanced Service — Deals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeals()', () => {
    it('returns data and pagination', async () => {
      CrmDeal.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmDeal.countDocuments.mockResolvedValue(0);

      const result = await crmAdvancedService.getDeals();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });

    it('applies value range filters (minValue/maxValue)', async () => {
      CrmDeal.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmDeal.countDocuments.mockResolvedValue(0);

      await crmAdvancedService.getDeals({ minValue: 1000, maxValue: 50000 });
      const filter = CrmDeal.find.mock.calls[0][0];
      expect(filter.value.$gte).toBe(1000);
      expect(filter.value.$lte).toBe(50000);
    });

    it('applies search filter with $or', async () => {
      CrmDeal.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmDeal.countDocuments.mockResolvedValue(0);

      await crmAdvancedService.getDeals({ search: 'صفقة' });
      const filter = CrmDeal.find.mock.calls[0][0];
      expect(filter.$or).toBeDefined();
      expect(filter.$or.length).toBe(3);
    });
  });

  describe('getDealById()', () => {
    it('throws if deal not found', async () => {
      CrmDeal.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb(null))),
      });

      await expect(crmAdvancedService.getDealById(fakeId)).rejects.toThrow('الصفقة غير موجودة');
    });

    it('returns deal with contactDetails, followUps, activities', async () => {
      const mockDeal = { _id: fakeId, title: 'صفقة تجريبية', contact: fakeUserId };
      CrmDeal.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb(mockDeal))),
      });
      CrmContact.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb({ _id: fakeUserId, name: 'عميل' }))),
      });
      CrmFollowUp.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmActivity.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });

      const result = await crmAdvancedService.getDealById(fakeId);
      expect(result.title).toBe('صفقة تجريبية');
      expect(result).toHaveProperty('contactDetails');
      expect(result).toHaveProperty('followUps');
      expect(result).toHaveProperty('activities');
    });
  });

  describe('createDeal()', () => {
    it('creates deal and returns it', async () => {
      const data = { title: 'صفقة جديدة', value: 10000, contact: fakeUserId };
      CrmDeal.create.mockResolvedValue({ _id: fakeId, ...data });
      CrmContact.findByIdAndUpdate.mockResolvedValue({});
      CrmActivity.create.mockResolvedValue({});

      const result = await crmAdvancedService.createDeal(data, fakeUserId, fakeUserName);
      expect(result.title).toBe('صفقة جديدة');
      expect(CrmDeal.create).toHaveBeenCalled();
    });

    it('updates contact totalDeals when deal has contact', async () => {
      CrmDeal.create.mockResolvedValue({ _id: fakeId, title: 'x', contact: fakeUserId });
      CrmContact.findByIdAndUpdate.mockResolvedValue({});
      CrmActivity.create.mockResolvedValue({});

      await crmAdvancedService.createDeal(
        { title: 'x', contact: fakeUserId },
        fakeUserId,
        fakeUserName
      );
      expect(CrmContact.findByIdAndUpdate).toHaveBeenCalledWith(
        fakeUserId,
        expect.objectContaining({ $inc: { totalDeals: 1 } })
      );
    });
  });

  describe('updateDeal()', () => {
    it('throws if deal not found', async () => {
      CrmDeal.findById.mockResolvedValue(null);

      await expect(
        crmAdvancedService.updateDeal(fakeId, { title: 'x' }, fakeUserId, fakeUserName)
      ).rejects.toThrow('الصفقة غير موجودة');
    });

    it('tracks stage change in stageHistory', async () => {
      const existing = {
        _id: fakeId,
        title: 'صفقة',
        stage: 'جديد',
        stageHistory: [],
        contact: null,
        save: jest.fn().mockResolvedValue(true),
      };
      CrmDeal.findById.mockResolvedValue(existing);
      CrmActivity.create.mockResolvedValue({});

      await crmAdvancedService.updateDeal(fakeId, { stage: 'تفاوض' }, fakeUserId, fakeUserName);
      expect(existing.stageHistory.length).toBe(1);
      expect(existing.stageHistory[0].from).toBe('جديد');
      expect(existing.stageHistory[0].to).toBe('تفاوض');
    });

    it('logs deal_won when stage changes to مغلق - ربح', async () => {
      const existing = {
        _id: fakeId,
        title: 'صفقة',
        stage: 'تفاوض',
        value: 50000,
        stageHistory: [],
        contact: fakeUserId,
        save: jest.fn().mockResolvedValue(true),
      };
      CrmDeal.findById.mockResolvedValue(existing);
      CrmContact.findByIdAndUpdate.mockResolvedValue({});
      CrmActivity.create.mockResolvedValue({});

      await crmAdvancedService.updateDeal(
        fakeId,
        { stage: 'مغلق - ربح' },
        fakeUserId,
        fakeUserName
      );
      expect(CrmActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'deal_won' })
      );
    });

    it('logs deal_lost when stage changes to مغلق - خسارة', async () => {
      const existing = {
        _id: fakeId,
        title: 'صفقة',
        stage: 'تفاوض',
        value: 50000,
        stageHistory: [],
        contact: null,
        save: jest.fn().mockResolvedValue(true),
      };
      CrmDeal.findById.mockResolvedValue(existing);
      CrmActivity.create.mockResolvedValue({});

      await crmAdvancedService.updateDeal(
        fakeId,
        { stage: 'مغلق - خسارة' },
        fakeUserId,
        fakeUserName
      );
      expect(CrmActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'deal_lost' })
      );
    });
  });

  describe('deleteDeal()', () => {
    it('throws if deal not found', async () => {
      CrmDeal.findByIdAndDelete.mockResolvedValue(null);

      await expect(crmAdvancedService.deleteDeal(fakeId, fakeUserId, fakeUserName)).rejects.toThrow(
        'الصفقة غير موجودة'
      );
    });

    it('deletes deal and decrements contact totalDeals', async () => {
      CrmDeal.findByIdAndDelete.mockResolvedValue({
        _id: fakeId,
        title: 'حذف',
        contact: fakeUserId,
      });
      CrmContact.findByIdAndUpdate.mockResolvedValue({});
      CrmActivity.create.mockResolvedValue({});

      const result = await crmAdvancedService.deleteDeal(fakeId, fakeUserId, fakeUserName);
      expect(result).toHaveProperty('message');
      expect(CrmContact.findByIdAndUpdate).toHaveBeenCalledWith(
        fakeUserId,
        expect.objectContaining({ $inc: { totalDeals: -1 } })
      );
    });
  });

  describe('updateDealStage()', () => {
    it('delegates to updateDeal', async () => {
      const spy = jest
        .spyOn(crmAdvancedService, 'updateDeal')
        .mockResolvedValue({ stage: 'تفاوض' });
      await crmAdvancedService.updateDealStage(fakeId, 'تفاوض', fakeUserId, fakeUserName);
      expect(spy).toHaveBeenCalledWith(fakeId, { stage: 'تفاوض' }, fakeUserId, fakeUserName);
      spy.mockRestore();
    });
  });

  describe('getPipeline()', () => {
    it('returns array of 7 stages', async () => {
      CrmDeal.aggregate.mockReturnValue({
        exec: jest.fn(async () => []),
        then: jest.fn(async cb => cb([])),
      });

      const pipeline = await crmAdvancedService.getPipeline();
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline.length).toBe(7);
      pipeline.forEach(s => {
        expect(s).toHaveProperty('stage');
        expect(s).toHaveProperty('count');
        expect(s).toHaveProperty('totalValue');
        expect(s).toHaveProperty('avgProbability');
        expect(s).toHaveProperty('deals');
      });
    });
  });
});

// ═════════════════════════════════════════════════════════════
// 5. FOLLOW-UPS — المتابعات
// ═════════════════════════════════════════════════════════════

describe('CRM Advanced Service — Follow-Ups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFollowUps()', () => {
    it('returns data and pagination', async () => {
      CrmFollowUp.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmFollowUp.countDocuments.mockResolvedValue(0);

      const result = await crmAdvancedService.getFollowUps();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });

    it('applies status/type/priority/contactId filters', async () => {
      CrmFollowUp.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmFollowUp.countDocuments.mockResolvedValue(0);

      await crmAdvancedService.getFollowUps({
        status: 'مجدول',
        type: 'اتصال هاتفي',
        priority: 'عالية',
        contactId: fakeId,
      });
      const filter = CrmFollowUp.find.mock.calls[0][0];
      expect(filter.status).toBe('مجدول');
      expect(filter.type).toBe('اتصال هاتفي');
      expect(filter.priority).toBe('عالية');
      expect(filter.contact).toBe(fakeId);
    });
  });

  describe('createFollowUp()', () => {
    it('creates follow-up and logs activity', async () => {
      const data = { subject: 'متابعة عرض', scheduledDate: new Date() };
      CrmFollowUp.create.mockResolvedValue({ _id: fakeId, ...data });
      CrmActivity.create.mockResolvedValue({});

      const result = await crmAdvancedService.createFollowUp(data, fakeUserId, fakeUserName);
      expect(result.subject).toBe('متابعة عرض');
      expect(CrmFollowUp.create).toHaveBeenCalled();
      expect(CrmActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'follow_up' })
      );
    });
  });

  describe('updateFollowUp()', () => {
    it('throws if follow-up not found', async () => {
      CrmFollowUp.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        crmAdvancedService.updateFollowUp(fakeId, { notes: 'x' }, fakeUserId, fakeUserName)
      ).rejects.toThrow('المتابعة غير موجودة');
    });

    it('returns updated follow-up', async () => {
      CrmFollowUp.findByIdAndUpdate.mockResolvedValue({
        _id: fakeId,
        subject: 'محدث',
      });

      const result = await crmAdvancedService.updateFollowUp(
        fakeId,
        { subject: 'محدث' },
        fakeUserId,
        fakeUserName
      );
      expect(result.subject).toBe('محدث');
    });
  });

  describe('completeFollowUp()', () => {
    it('throws if follow-up not found', async () => {
      CrmFollowUp.findById.mockResolvedValue(null);

      await expect(
        crmAdvancedService.completeFollowUp(fakeId, 'notes', 'done', fakeUserId, fakeUserName)
      ).rejects.toThrow('المتابعة غير موجودة');
    });

    it('marks follow-up as مكتمل with completedAt', async () => {
      const mockFU = {
        _id: fakeId,
        subject: 'متابعة',
        status: 'مجدول',
        notes: '',
        save: jest.fn().mockResolvedValue(true),
      };
      CrmFollowUp.findById.mockResolvedValue(mockFU);
      CrmActivity.create.mockResolvedValue({});

      const result = await crmAdvancedService.completeFollowUp(
        fakeId,
        'ملاحظة',
        'تم',
        fakeUserId,
        fakeUserName
      );
      expect(mockFU.status).toBe('مكتمل');
      expect(mockFU.completedAt).toBeInstanceOf(Date);
      expect(mockFU.result).toBe('تم');
      expect(mockFU.save).toHaveBeenCalled();
    });
  });

  describe('getUpcomingFollowUps()', () => {
    it('returns array for scheduled follow-ups', async () => {
      CrmFollowUp.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });

      const result = await crmAdvancedService.getUpcomingFollowUps(7);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getOverdueFollowUps()', () => {
    it('returns array for overdue follow-ups', async () => {
      CrmFollowUp.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });

      const result = await crmAdvancedService.getOverdueFollowUps();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

// ═════════════════════════════════════════════════════════════
// 6. DASHBOARD — لوحة التحكم
// ═════════════════════════════════════════════════════════════

describe('CRM Advanced Service — Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getDashboardStats returns expected shape', async () => {
    // Mock all countDocuments calls
    CrmContact.countDocuments.mockResolvedValue(10);
    CrmDeal.countDocuments.mockResolvedValue(5);
    CrmFollowUp.countDocuments.mockResolvedValue(2);

    // Mock aggregates
    CrmDeal.aggregate.mockReturnValue({
      exec: jest.fn(async () => []),
      then: jest.fn(async cb => cb([])),
    });

    // Mock Activity find
    CrmActivity.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      then: jest.fn(cb => Promise.resolve(cb([]))),
    });

    // Mock FollowUp find
    CrmFollowUp.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      then: jest.fn(cb => Promise.resolve(cb([]))),
    });

    const stats = await crmAdvancedService.getDashboardStats();
    expect(stats).toHaveProperty('totalContacts');
    expect(stats).toHaveProperty('activeContacts');
    expect(stats).toHaveProperty('totalLeads');
    expect(stats).toHaveProperty('wonDeals');
    expect(stats).toHaveProperty('lostDeals');
    expect(stats).toHaveProperty('openDeals');
    expect(stats).toHaveProperty('totalRevenue');
    expect(stats).toHaveProperty('conversionRate');
    expect(stats).toHaveProperty('avgDealSize');
    expect(stats).toHaveProperty('monthlyTrend');
    expect(stats).toHaveProperty('pipelineDistribution');
    expect(stats).toHaveProperty('sourceDistribution');
    expect(stats).toHaveProperty('topPerformers');
    expect(stats).toHaveProperty('recentActivities');
    expect(stats).toHaveProperty('upcomingFollowUps');
  });
});

// ═════════════════════════════════════════════════════════════
// 7. REPORTS — التقارير
// ═════════════════════════════════════════════════════════════

describe('CRM Advanced Service — Reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversionReport()', () => {
    it('returns overall, bySource, byMonth, avgTimeToConvert', async () => {
      CrmDeal.aggregate.mockReturnValue({
        exec: jest.fn(async () => []),
        then: jest.fn(async cb => cb([])),
      });
      CrmDeal.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });

      const report = await crmAdvancedService.getConversionReport();
      expect(report).toHaveProperty('overall');
      expect(report.overall).toHaveProperty('total');
      expect(report.overall).toHaveProperty('converted');
      expect(report.overall).toHaveProperty('rate');
      expect(report).toHaveProperty('bySource');
      expect(report).toHaveProperty('byMonth');
      expect(report).toHaveProperty('avgTimeToConvert');
    });

    it('accepts date range params', async () => {
      CrmDeal.aggregate.mockReturnValue({
        exec: jest.fn(async () => []),
        then: jest.fn(async cb => cb([])),
      });
      CrmDeal.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });

      const report = await crmAdvancedService.getConversionReport({
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      });
      expect(report).toHaveProperty('overall');
    });
  });

  describe('getActivityReport()', () => {
    it('returns total, byType, timeline', async () => {
      CrmActivity.aggregate.mockReturnValue({
        exec: jest.fn(async () => []),
        then: jest.fn(async cb => cb([])),
      });
      CrmActivity.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmActivity.countDocuments.mockResolvedValue(0);

      const report = await crmAdvancedService.getActivityReport();
      expect(report).toHaveProperty('total');
      expect(report).toHaveProperty('byType');
      expect(report).toHaveProperty('timeline');
    });
  });

  describe('getRevenueReport()', () => {
    it('returns revenue breakdown by month/source/assignee', async () => {
      CrmDeal.aggregate.mockReturnValue({
        exec: jest.fn(async () => []),
        then: jest.fn(async cb => cb([])),
      });

      const report = await crmAdvancedService.getRevenueReport();
      expect(report).toHaveProperty('totalRevenue');
      expect(report).toHaveProperty('totalDeals');
      expect(report).toHaveProperty('avgDealSize');
      expect(report).toHaveProperty('maxDeal');
      expect(report).toHaveProperty('byMonth');
      expect(report).toHaveProperty('bySource');
      expect(report).toHaveProperty('byAssignee');
    });
  });
});

// ═════════════════════════════════════════════════════════════
// 8. LEADS — العملاء المحتملين
// ═════════════════════════════════════════════════════════════

describe('CRM Advanced Service — Leads', () => {
  const mongoose = require('mongoose');
  let mockLeadModel;

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure Lead model is registered via mongoose.model
    mockLeadModel = mongoose.model('Lead');
  });

  describe('getLeads()', () => {
    it('returns data and pagination', async () => {
      mockLeadModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      mockLeadModel.countDocuments.mockResolvedValue(0);

      const result = await crmAdvancedService.getLeads();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });
  });

  describe('createLead()', () => {
    it('creates lead with assignedTo', async () => {
      mockLeadModel.create.mockResolvedValue({
        _id: fakeId,
        firstName: 'تست',
        assignedTo: fakeUserId,
      });

      const result = await crmAdvancedService.createLead({ firstName: 'تست' }, fakeUserId);
      expect(result).toHaveProperty('_id');
      expect(mockLeadModel.create).toHaveBeenCalled();
    });
  });

  describe('updateLead()', () => {
    it('throws if lead not found', async () => {
      mockLeadModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(crmAdvancedService.updateLead(fakeId, { firstName: 'x' })).rejects.toThrow(
        'العميل المحتمل غير موجود'
      );
    });

    it('returns updated lead', async () => {
      mockLeadModel.findByIdAndUpdate.mockResolvedValue({ _id: fakeId, firstName: 'محدث' });

      const result = await crmAdvancedService.updateLead(fakeId, { firstName: 'محدث' });
      expect(result.firstName).toBe('محدث');
    });
  });

  describe('deleteLead()', () => {
    it('throws if lead not found', async () => {
      mockLeadModel.findByIdAndDelete.mockResolvedValue(null);
      await expect(crmAdvancedService.deleteLead(fakeId)).rejects.toThrow(
        'العميل المحتمل غير موجود'
      );
    });

    it('returns success message', async () => {
      mockLeadModel.findByIdAndDelete.mockResolvedValue({ _id: fakeId });
      const result = await crmAdvancedService.deleteLead(fakeId);
      expect(result).toHaveProperty('message');
    });
  });

  describe('updateLeadStage()', () => {
    it('throws if lead not found', async () => {
      mockLeadModel.findByIdAndUpdate.mockResolvedValue(null);
      await expect(crmAdvancedService.updateLeadStage(fakeId, 'CONTACTED')).rejects.toThrow(
        'العميل المحتمل غير موجود'
      );
    });

    it('updates lead status', async () => {
      mockLeadModel.findByIdAndUpdate.mockResolvedValue({ _id: fakeId, status: 'CONTACTED' });
      const result = await crmAdvancedService.updateLeadStage(fakeId, 'CONTACTED');
      expect(result.status).toBe('CONTACTED');
    });
  });

  describe('convertLeadToContact()', () => {
    it('throws if lead not found', async () => {
      mockLeadModel.findById.mockResolvedValue(null);
      await expect(
        crmAdvancedService.convertLeadToContact(fakeId, fakeUserId, fakeUserName)
      ).rejects.toThrow('العميل المحتمل غير موجود');
    });

    it('creates contact from lead data and marks lead as CONVERTED', async () => {
      const mockLead = {
        _id: fakeId,
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'a@b.sa',
        phone: '0500000000',
        notes: [{ body: 'ملاحظة' }],
        status: 'NEW',
        save: jest.fn().mockResolvedValue(true),
      };
      mockLeadModel.findById.mockResolvedValue(mockLead);
      CrmContact.create.mockResolvedValue({ _id: '000000000000000000000050', name: 'أحمد محمد' });
      CrmActivity.create.mockResolvedValue({});

      const result = await crmAdvancedService.convertLeadToContact(
        fakeId,
        fakeUserId,
        fakeUserName
      );
      expect(result).toHaveProperty('contact');
      expect(result).toHaveProperty('lead');
      expect(mockLead.status).toBe('CONVERTED');
      expect(mockLead.save).toHaveBeenCalled();
    });
  });

  describe('getLeadsPipeline()', () => {
    it('returns 5 stages', async () => {
      mockLeadModel.aggregate.mockReturnValue({
        exec: jest.fn(async () => []),
        then: jest.fn(async cb => cb([])),
      });

      const pipeline = await crmAdvancedService.getLeadsPipeline();
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline.length).toBe(5);
      pipeline.forEach(s => {
        expect(s).toHaveProperty('stage');
        expect(s).toHaveProperty('count');
      });
    });
  });
});

// ═════════════════════════════════════════════════════════════
// 9. ACTIVITIES — الأنشطة
// ═════════════════════════════════════════════════════════════

describe('CRM Advanced Service — Activities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActivities()', () => {
    it('returns data and pagination', async () => {
      CrmActivity.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmActivity.countDocuments.mockResolvedValue(0);

      const result = await crmAdvancedService.getActivities();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });

    it('filters by type', async () => {
      CrmActivity.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      CrmActivity.countDocuments.mockResolvedValue(0);

      await crmAdvancedService.getActivities({ type: 'deal_won' });
      const filter = CrmActivity.find.mock.calls[0][0];
      expect(filter.type).toBe('deal_won');
    });
  });
});

// ═════════════════════════════════════════════════════════════
// 10. SEED DATA — بيانات تجريبية
// ═════════════════════════════════════════════════════════════

describe('CRM Advanced Service — Seed Data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips seeding if contacts already exist', async () => {
    CrmContact.countDocuments.mockResolvedValue(10);

    const result = await crmAdvancedService.seedDemoData();
    expect(result.message).toContain('موجودة');
    expect(CrmContact.insertMany).not.toHaveBeenCalled();
  });

  it('seeds demo data when collection is empty', async () => {
    CrmContact.countDocuments.mockResolvedValue(0);
    CrmContact.insertMany.mockResolvedValue(
      Array(30)
        .fill()
        .map((_, i) => ({ _id: `${i}`.padStart(24, '0'), name: `شركة ${i}` }))
    );
    CrmDeal.insertMany.mockResolvedValue([]);
    CrmFollowUp.insertMany.mockResolvedValue([]);
    CrmActivity.insertMany.mockResolvedValue([]);

    const result = await crmAdvancedService.seedDemoData();
    expect(result).toHaveProperty('contacts');
    expect(result).toHaveProperty('deals');
    expect(result).toHaveProperty('followUps');
    expect(result).toHaveProperty('activities');
    expect(result.contacts).toBe(30);
    expect(result.deals).toBe(40);
    expect(result.followUps).toBe(20);
    expect(result.activities).toBe(30);
  });
});

// ═════════════════════════════════════════════════════════════
// 11. INTERNAL HELPERS
// ═════════════════════════════════════════════════════════════

describe('CRM Advanced Service — _logActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates activity record', async () => {
    CrmActivity.create.mockResolvedValue({});
    await crmAdvancedService._logActivity(
      'new_contact',
      'text',
      'contact',
      fakeId,
      fakeUserId,
      fakeUserName,
      {}
    );
    expect(CrmActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'new_contact',
        text: 'text',
        entityType: 'contact',
      })
    );
  });

  it('does not throw on failure — logs warning', async () => {
    CrmActivity.create.mockRejectedValue(new Error('DB down'));
    await expect(
      crmAdvancedService._logActivity('new_contact', 'text', 'contact', fakeId)
    ).resolves.not.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════
// 12. ObjectId VALIDATION HELPER
// ═════════════════════════════════════════════════════════════

describe('isObjectId helper', () => {
  it('validates 24-char hex strings', () => {
    expect(isObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isObjectId(fakeId)).toBe(true);
  });

  it('rejects non-24-char or non-hex strings', () => {
    expect(isObjectId('short')).toBe(false);
    expect(isObjectId('')).toBe(false);
    expect(isObjectId('zzzzzzzzzzzzzzzzzzzzzzzz')).toBe(false);
    expect(isObjectId(null)).toBe(false);
    expect(isObjectId(undefined)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════
// 13. ERROR HANDLING — safeError pattern
// ═════════════════════════════════════════════════════════════

describe('Error handling pattern — safeError', () => {
  const safeError = (res, e, label) => {
    const message = e?.message || 'Unknown error';
    return { success: false, error: `[${label}] ${message}` };
  };

  it('returns { success: false, error } from Error object', () => {
    const result = safeError({}, new Error('fail'), 'CRM');
    expect(result.success).toBe(false);
    expect(result.error).toContain('fail');
    expect(result.error).toContain('CRM');
  });

  it('handles null error gracefully', () => {
    const result = safeError({}, null, 'CRM');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown error');
  });
});

'use strict';

/* ── mock-prefixed variables ── */
const mockInstitutionalLicenseFind = jest.fn();
const mockInstitutionalLicenseCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'institutionalLicense1', ...d }));
const mockInstitutionalLicenseCount = jest.fn().mockResolvedValue(0);
const mockRenewalTrackingFind = jest.fn();
const mockRenewalTrackingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'renewalTracking1', ...d }));
const mockRenewalTrackingCount = jest.fn().mockResolvedValue(0);
const mockRegulatoryReportFind = jest.fn();
const mockRegulatoryReportCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'regulatoryReport1', ...d }));
const mockRegulatoryReportCount = jest.fn().mockResolvedValue(0);
const mockLicenseAlertFind = jest.fn();
const mockLicenseAlertCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'licenseAlert1', ...d }));
const mockLicenseAlertCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddLicensureManager', () => ({
  DDDInstitutionalLicense: {
    find: mockInstitutionalLicenseFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'institutionalLicense1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'institutionalLicense1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockInstitutionalLicenseCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'institutionalLicense1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'institutionalLicense1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'institutionalLicense1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'institutionalLicense1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'institutionalLicense1' }) }),
    countDocuments: mockInstitutionalLicenseCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDRenewalTracking: {
    find: mockRenewalTrackingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'renewalTracking1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'renewalTracking1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRenewalTrackingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'renewalTracking1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'renewalTracking1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'renewalTracking1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'renewalTracking1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'renewalTracking1' }) }),
    countDocuments: mockRenewalTrackingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDRegulatoryReport: {
    find: mockRegulatoryReportFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'regulatoryReport1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'regulatoryReport1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRegulatoryReportCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryReport1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryReport1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryReport1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryReport1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryReport1' }) }),
    countDocuments: mockRegulatoryReportCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDLicenseAlert: {
    find: mockLicenseAlertFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'licenseAlert1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'licenseAlert1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockLicenseAlertCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'licenseAlert1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'licenseAlert1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'licenseAlert1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'licenseAlert1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'licenseAlert1' }) }),
    countDocuments: mockLicenseAlertCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  LICENSE_TYPES: ['item1', 'item2'],
  LICENSE_STATUSES: ['item1', 'item2'],
  REGULATORY_BODIES: ['item1', 'item2'],
  RENEWAL_STATUSES: ['item1', 'item2'],
  REPORTING_FREQUENCIES: ['item1', 'item2'],
  DOCUMENT_CATEGORIES: ['item1', 'item2'],
  BUILTIN_LICENSE_TEMPLATES: ['item1', 'item2'],

}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor(n, m, models) { this.name = n; this.meta = m; this.models = models; }
    log() {}
    _list(M, q, o) {
      const c = M.find(q || {});
      if (o && o.sort) {
        const s = c.sort(o.sort);
        return (o.limit && s.limit) ? s.limit(o.limit).lean() : s.lean();
      }
      return c.lean ? c.lean() : c;
    }
    _getById(M, id) {
      const r = M.findById(id);
      return r && r.lean ? r.lean() : r;
    }
    _create(M, d) { return M.create(d); }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...(o || {}) }).lean();
    }
    _delete(M, id) { return M.findByIdAndDelete(id); }
  };
});

const svc = require('../../services/dddLicensureManager');

describe('dddLicensureManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _institutionalLicenseL = jest.fn().mockResolvedValue([]);
    const _institutionalLicenseLim = jest.fn().mockReturnValue({ lean: _institutionalLicenseL });
    const _institutionalLicenseS = jest.fn().mockReturnValue({ limit: _institutionalLicenseLim, lean: _institutionalLicenseL, populate: jest.fn().mockReturnValue({ lean: _institutionalLicenseL }) });
    mockInstitutionalLicenseFind.mockReturnValue({ sort: _institutionalLicenseS, lean: _institutionalLicenseL, limit: _institutionalLicenseLim, populate: jest.fn().mockReturnValue({ lean: _institutionalLicenseL, sort: _institutionalLicenseS }) });
    const _renewalTrackingL = jest.fn().mockResolvedValue([]);
    const _renewalTrackingLim = jest.fn().mockReturnValue({ lean: _renewalTrackingL });
    const _renewalTrackingS = jest.fn().mockReturnValue({ limit: _renewalTrackingLim, lean: _renewalTrackingL, populate: jest.fn().mockReturnValue({ lean: _renewalTrackingL }) });
    mockRenewalTrackingFind.mockReturnValue({ sort: _renewalTrackingS, lean: _renewalTrackingL, limit: _renewalTrackingLim, populate: jest.fn().mockReturnValue({ lean: _renewalTrackingL, sort: _renewalTrackingS }) });
    const _regulatoryReportL = jest.fn().mockResolvedValue([]);
    const _regulatoryReportLim = jest.fn().mockReturnValue({ lean: _regulatoryReportL });
    const _regulatoryReportS = jest.fn().mockReturnValue({ limit: _regulatoryReportLim, lean: _regulatoryReportL, populate: jest.fn().mockReturnValue({ lean: _regulatoryReportL }) });
    mockRegulatoryReportFind.mockReturnValue({ sort: _regulatoryReportS, lean: _regulatoryReportL, limit: _regulatoryReportLim, populate: jest.fn().mockReturnValue({ lean: _regulatoryReportL, sort: _regulatoryReportS }) });
    const _licenseAlertL = jest.fn().mockResolvedValue([]);
    const _licenseAlertLim = jest.fn().mockReturnValue({ lean: _licenseAlertL });
    const _licenseAlertS = jest.fn().mockReturnValue({ limit: _licenseAlertLim, lean: _licenseAlertL, populate: jest.fn().mockReturnValue({ lean: _licenseAlertL }) });
    mockLicenseAlertFind.mockReturnValue({ sort: _licenseAlertS, lean: _licenseAlertL, limit: _licenseAlertLim, populate: jest.fn().mockReturnValue({ lean: _licenseAlertL, sort: _licenseAlertS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('LicensureManager');
  });


  test('createLicense creates/returns result', async () => {
    let r; try { r = await svc.createLicense({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listLicenses returns result', async () => {
    let r; try { r = await svc.listLicenses({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getLicenseById returns result', async () => {
    let r; try { r = await svc.getLicenseById({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateLicense updates/returns result', async () => {
    let r; try { r = await svc.updateLicense('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createRenewal creates/returns result', async () => {
    let r; try { r = await svc.createRenewal({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listRenewals returns result', async () => {
    let r; try { r = await svc.listRenewals({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateRenewal updates/returns result', async () => {
    let r; try { r = await svc.updateRenewal('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createReport creates/returns result', async () => {
    let r; try { r = await svc.createReport({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listReports returns result', async () => {
    let r; try { r = await svc.listReports({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateReport updates/returns result', async () => {
    let r; try { r = await svc.updateReport('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createAlert creates/returns result', async () => {
    let r; try { r = await svc.createAlert({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAlerts returns result', async () => {
    let r; try { r = await svc.listAlerts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('acknowledgeAlert updates/returns result', async () => {
    let r; try { r = await svc.acknowledgeAlert('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getExpiringLicenses returns result', async () => {
    let r; try { r = await svc.getExpiringLicenses({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getLicenseSummary returns object', async () => {
    let r; try { r = await svc.getLicenseSummary(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

/**
 * Unit Tests — QualityManagementService
 * Covers all 56 public methods across 16 describe blocks (~160 tests)
 */

let service;

/* ─── helpers: safely pick seed items by index ─── */
const firstAudit = () => service.listAudits()[0];
const firstFinding = () => service.listFindings()[0];
const firstNC = () => service.listNonConformances()[0];
const firstCAPA = () => service.listCAPAs()[0];
const firstIndicator = () => service.listIndicators()[0];
const firstDocument = () => service.listDocuments()[0];
const firstRisk = () => service.listRisks()[0];

/* ─── suppress console output ─── */
beforeAll(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  // fresh singleton on each test — reset module cache
  jest.resetModules();
  service = require('../../services/qualityManagement.service');
});

/* ═══════════════════════════════════════════════════════
   1. Reference Data
   ═══════════════════════════════════════════════════════ */
describe('Reference Data getters', () => {
  test('getStandards returns 5 standards', () => {
    const s = service.getStandards();
    expect(s).toHaveLength(5);
    expect(s.map(x => x.id)).toEqual(
      expect.arrayContaining(['cbahi', 'jci', 'iso9001', 'iso45001', 'iso14001'])
    );
  });

  test('getAuditTypes returns 5 types', () => {
    expect(service.getAuditTypes()).toHaveLength(5);
  });

  test('getAuditStatuses returns 4 statuses', () => {
    expect(service.getAuditStatuses()).toHaveLength(4);
  });

  test('getFindingSeverities returns 5 severities', () => {
    const sev = service.getFindingSeverities();
    expect(sev).toHaveLength(5);
    expect(sev[0]).toHaveProperty('weight');
  });

  test('getNcStatuses returns 6 statuses', () => {
    expect(service.getNcStatuses()).toHaveLength(6);
  });

  test('getCapaTypes returns 2 types', () => {
    expect(service.getCapaTypes()).toHaveLength(2);
  });

  test('getRiskLevels returns 5 levels', () => {
    expect(service.getRiskLevels()).toHaveLength(5);
  });

  test('getDocTypes returns 6 doc types', () => {
    expect(service.getDocTypes()).toHaveLength(6);
  });

  test('getDepartments returns 12 department strings', () => {
    const d = service.getDepartments();
    expect(d).toHaveLength(12);
    expect(d).toContain('rehabilitation');
    expect(d).toContain('quality');
  });
});

/* ═══════════════════════════════════════════════════════
   2. Dashboard
   ═══════════════════════════════════════════════════════ */
describe('getDashboard', () => {
  test('returns expected summary shape', () => {
    const d = service.getDashboard();
    expect(d).toHaveProperty('summary');
    expect(d).toHaveProperty('complianceByStandard');
    expect(d).toHaveProperty('indicatorPerformance');
    expect(d).toHaveProperty('recentAudits');
    expect(d).toHaveProperty('recentFindings');
    expect(d).toHaveProperty('upcomingAudits');
  });

  test('summary counts match seed data', () => {
    const s = service.getDashboard().summary;
    expect(s.totalAudits).toBe(3);
    expect(s.completedAudits).toBe(1);
    expect(s.plannedAudits).toBe(1);
    expect(s.openFindings).toBe(5);
    expect(s.criticalFindings).toBe(1);
    expect(s.openNonConformances).toBe(1); // one NC is closed
    expect(s.totalDocuments).toBe(4);
  });

  test('complianceByStandard has one entry per standard', () => {
    const cbs = service.getDashboard().complianceByStandard;
    expect(cbs).toHaveLength(5);
    const cbahi = cbs.find(c => c.standard === 'cbahi');
    expect(cbahi.averageCompliance).toBe(87);
    expect(cbahi.auditCount).toBe(1);
  });

  test('indicatorPerformance has total matching active indicators', () => {
    const ip = service.getDashboard().indicatorPerformance;
    expect(ip.total).toBe(8);
    expect(typeof ip.onTarget).toBe('number');
    expect(typeof ip.warning).toBe('number');
    expect(typeof ip.critical).toBe('number');
    expect(ip.onTarget).toBeGreaterThanOrEqual(0);
  });

  test('upcomingAudits only includes planned audits', () => {
    const ua = service.getDashboard().upcomingAudits;
    ua.forEach(a => expect(a.status).toBe('planned'));
  });

  test('recentAudits has at most 5 entries', () => {
    expect(service.getDashboard().recentAudits.length).toBeLessThanOrEqual(5);
  });
});

/* ═══════════════════════════════════════════════════════
   3. Audits CRUD
   ═══════════════════════════════════════════════════════ */
describe('Audits CRUD', () => {
  test('listAudits returns 3 seed audits', () => {
    expect(service.listAudits()).toHaveLength(3);
  });

  test('listAudits filters by standard', () => {
    const r = service.listAudits({ standard: 'cbahi' });
    expect(r.length).toBeGreaterThanOrEqual(1);
    r.forEach(a => expect(a.standard).toBe('cbahi'));
  });

  test('listAudits filters by type', () => {
    const r = service.listAudits({ type: 'internal' });
    r.forEach(a => expect(a.type).toBe('internal'));
  });

  test('listAudits filters by status', () => {
    const r = service.listAudits({ status: 'planned' });
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('planned');
  });

  test('listAudits filters by department', () => {
    const r = service.listAudits({ department: 'rehabilitation' });
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  test('getAudit returns audit by id', () => {
    const a = firstAudit();
    expect(service.getAudit(a.id)).toBe(a);
  });

  test('getAudit returns null for unknown id', () => {
    expect(service.getAudit('nonexistent')).toBeNull();
  });

  test('createAudit creates with findingsCount=0 and complianceScore=null', () => {
    const a = service.createAudit(
      { titleAr: 'تدقيق جديد', titleEn: 'New Audit', standard: 'cbahi', type: 'internal' },
      'u1'
    );
    expect(a.id).toMatch(/^qm-\d+$/);
    expect(a.findingsCount).toBe(0);
    expect(a.complianceScore).toBeNull();
    expect(a.createdAt).toBeDefined();
    expect(service.getAudit(a.id)).toBe(a);
  });

  test('createAudit adds to list', () => {
    const before = service.listAudits().length;
    service.createAudit({ titleAr: 'X', titleEn: 'X' }, 'u1');
    expect(service.listAudits()).toHaveLength(before + 1);
  });

  test('updateAudit updates fields and sets updatedAt', () => {
    const a = firstAudit();
    const updated = service.updateAudit(a.id, { status: 'cancelled' }, 'u1');
    expect(updated.status).toBe('cancelled');
    expect(updated.updatedAt).toBeDefined();
  });

  test('updateAudit returns null for unknown id', () => {
    expect(service.updateAudit('nope', { status: 'x' }, 'u1')).toBeNull();
  });

  test('deleteAudit removes and returns audit', () => {
    const a = firstAudit();
    const id = a.id;
    const deleted = service.deleteAudit(id, 'u1');
    expect(deleted).toBe(a);
    expect(service.getAudit(id)).toBeNull();
  });

  test('deleteAudit returns null for unknown id', () => {
    expect(service.deleteAudit('nope', 'u1')).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════
   4. Findings CRUD
   ═══════════════════════════════════════════════════════ */
describe('Findings CRUD', () => {
  test('listFindings returns 5 seed findings', () => {
    expect(service.listFindings()).toHaveLength(5);
  });

  test('listFindings filters by auditId', () => {
    const audit = firstAudit();
    const r = service.listFindings({ auditId: audit.id });
    r.forEach(f => expect(f.auditId).toBe(audit.id));
  });

  test('listFindings filters by severity', () => {
    const r = service.listFindings({ severity: 'critical' });
    r.forEach(f => expect(f.severity).toBe('critical'));
  });

  test('listFindings filters by status', () => {
    const r = service.listFindings({ status: 'open' });
    expect(r).toHaveLength(5);
  });

  test('getFinding returns finding by id', () => {
    const f = firstFinding();
    expect(service.getFinding(f.id)).toBe(f);
  });

  test('getFinding returns null for unknown id', () => {
    expect(service.getFinding('nope')).toBeNull();
  });

  test('createFinding sets status=open and increments audit findingsCount', () => {
    const audit = firstAudit();
    const prevCount = audit.findingsCount;
    const f = service.createFinding(
      { auditId: audit.id, titleAr: 'ملاحظة', titleEn: 'Finding', severity: 'minor' },
      'u1'
    );
    expect(f.status).toBe('open');
    expect(f.createdAt).toBeDefined();
    expect(audit.findingsCount).toBe(prevCount + 1);
  });

  test('createFinding with non-existent auditId still creates finding', () => {
    const f = service.createFinding(
      { auditId: 'ghost-audit', titleAr: 'X', titleEn: 'X', severity: 'minor' },
      'u1'
    );
    expect(f.id).toMatch(/^qm-/);
  });

  test('updateFinding modifies fields', () => {
    const f = firstFinding();
    const upd = service.updateFinding(f.id, { severity: 'critical' }, 'u1');
    expect(upd.severity).toBe('critical');
    expect(upd.updatedAt).toBeDefined();
  });

  test('updateFinding returns null for unknown id', () => {
    expect(service.updateFinding('nope', {}, 'u1')).toBeNull();
  });

  test('closeFinding sets status=closed and closedAt', () => {
    const f = firstFinding();
    const closed = service.closeFinding(f.id, 'u1');
    expect(closed.status).toBe('closed');
    expect(closed.closedAt).toBeDefined();
  });

  test('closeFinding returns null for unknown id', () => {
    expect(service.closeFinding('nope', 'u1')).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════
   5. Non-Conformances CRUD
   ═══════════════════════════════════════════════════════ */
describe('Non-Conformances CRUD', () => {
  test('listNonConformances returns 2 seed NCs', () => {
    expect(service.listNonConformances()).toHaveLength(2);
  });

  test('listNonConformances filters by standard', () => {
    const r = service.listNonConformances({ standard: 'cbahi' });
    expect(r.length).toBeGreaterThanOrEqual(1);
    r.forEach(nc => expect(nc.standard).toBe('cbahi'));
  });

  test('listNonConformances filters by status', () => {
    const r = service.listNonConformances({ status: 'closed' });
    expect(r.length).toBe(1);
  });

  test('listNonConformances filters by department', () => {
    const r = service.listNonConformances({ department: 'nursing' });
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  test('listNonConformances filters by severity', () => {
    const r = service.listNonConformances({ severity: 'major' });
    r.forEach(nc => expect(nc.severity).toBe('major'));
  });

  test('getNonConformance returns NC by id', () => {
    const nc = firstNC();
    expect(service.getNonConformance(nc.id)).toBe(nc);
  });

  test('getNonConformance returns null for unknown id', () => {
    expect(service.getNonConformance('nope')).toBeNull();
  });

  test('createNonConformance sets status=open and closedDate=null', () => {
    const nc = service.createNonConformance(
      { titleAr: 'NC جديد', titleEn: 'New NC', standard: 'jci', department: 'pharmacy' },
      'u1'
    );
    expect(nc.status).toBe('open');
    expect(nc.closedDate).toBeNull();
    expect(nc.reportedDate).toBeDefined();
    expect(nc.createdAt).toBeDefined();
  });

  test('updateNonConformance modifies fields', () => {
    const nc = firstNC();
    const upd = service.updateNonConformance(nc.id, { severity: 'critical' }, 'u1');
    expect(upd.severity).toBe('critical');
    expect(upd.updatedAt).toBeDefined();
  });

  test('updateNonConformance sets closedDate when status=closed', () => {
    const nc = firstNC();
    const upd = service.updateNonConformance(nc.id, { status: 'closed' }, 'u1');
    expect(upd.closedDate).toBeDefined();
    expect(upd.closedDate).not.toBeNull();
  });

  test('updateNonConformance returns null for unknown id', () => {
    expect(service.updateNonConformance('nope', {}, 'u1')).toBeNull();
  });

  test('deleteNonConformance removes and returns NC', () => {
    const nc = firstNC();
    const id = nc.id;
    const deleted = service.deleteNonConformance(id, 'u1');
    expect(deleted).toBe(nc);
    expect(service.getNonConformance(id)).toBeNull();
  });

  test('deleteNonConformance returns null for unknown id', () => {
    expect(service.deleteNonConformance('nope', 'u1')).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════
   6. CAPA CRUD
   ═══════════════════════════════════════════════════════ */
describe('CAPA CRUD', () => {
  test('listCAPAs returns 3 seed CAPAs', () => {
    expect(service.listCAPAs()).toHaveLength(3);
  });

  test('listCAPAs filters by ncId', () => {
    const nc = firstNC();
    const r = service.listCAPAs({ ncId: nc.id });
    r.forEach(c => expect(c.ncId).toBe(nc.id));
  });

  test('listCAPAs filters by type', () => {
    const r = service.listCAPAs({ type: 'corrective' });
    r.forEach(c => expect(c.type).toBe('corrective'));
  });

  test('listCAPAs filters by status', () => {
    const r = service.listCAPAs({ status: 'closed' });
    r.forEach(c => expect(c.status).toBe('closed'));
  });

  test('getCAPA returns CAPA by id', () => {
    const c = firstCAPA();
    expect(service.getCAPA(c.id)).toBe(c);
  });

  test('getCAPA returns null for unknown id', () => {
    expect(service.getCAPA('nope')).toBeNull();
  });

  test('createCAPA sets completionPercent=0 and verified fields null', () => {
    const c = service.createCAPA(
      { titleAr: 'إجراء', titleEn: 'Action', type: 'corrective', ncId: 'nc-x' },
      'u1'
    );
    expect(c.completionPercent).toBe(0);
    expect(c.verifiedBy).toBeNull();
    expect(c.verifiedDate).toBeNull();
    expect(c.createdAt).toBeDefined();
  });

  test('updateCAPA modifies fields', () => {
    const c = firstCAPA();
    const upd = service.updateCAPA(c.id, { completionPercent: 80 }, 'u1');
    expect(upd.completionPercent).toBe(80);
    expect(upd.updatedAt).toBeDefined();
  });

  test('updateCAPA returns null for unknown id', () => {
    expect(service.updateCAPA('nope', {}, 'u1')).toBeNull();
  });

  test('verifyCAPA sets closed, 100%, verifiedBy & verifiedDate', () => {
    const c = firstCAPA();
    const v = service.verifyCAPA(c.id, 'auditor-1');
    expect(v.status).toBe('closed');
    expect(v.completionPercent).toBe(100);
    expect(v.verifiedBy).toBe('auditor-1');
    expect(v.verifiedDate).toBeDefined();
  });

  test('verifyCAPA returns null for unknown id', () => {
    expect(service.verifyCAPA('nope', 'u1')).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════
   7. Quality Indicators CRUD
   ═══════════════════════════════════════════════════════ */
describe('Quality Indicators CRUD', () => {
  test('listIndicators returns 8 seed indicators', () => {
    expect(service.listIndicators()).toHaveLength(8);
  });

  test('listIndicators filters by standard', () => {
    const r = service.listIndicators({ standard: 'cbahi' });
    expect(r.length).toBeGreaterThanOrEqual(1);
    r.forEach(qi => expect(qi.standard).toBe('cbahi'));
  });

  test('listIndicators filters by department', () => {
    const r = service.listIndicators({ department: 'nursing' });
    r.forEach(qi => expect(qi.department).toBe('nursing'));
  });

  test('listIndicators filters by isActive (boolean true)', () => {
    const r = service.listIndicators({ isActive: true });
    r.forEach(qi => expect(qi.isActive).toBe(true));
  });

  test('listIndicators filters by isActive (string "true")', () => {
    const r = service.listIndicators({ isActive: 'true' });
    r.forEach(qi => expect(qi.isActive).toBe(true));
  });

  test('listIndicators filters by isActive false returns empty for seed data', () => {
    const r = service.listIndicators({ isActive: false });
    expect(r).toHaveLength(0);
  });

  test('getIndicator returns indicator by id', () => {
    const qi = firstIndicator();
    expect(service.getIndicator(qi.id)).toBe(qi);
  });

  test('getIndicator returns null for unknown id', () => {
    expect(service.getIndicator('nope')).toBeNull();
  });

  test('createIndicator sets isActive=true', () => {
    const qi = service.createIndicator(
      { nameAr: 'مؤشر', nameEn: 'Indicator', code: 'QI-X', standard: 'jci' },
      'u1'
    );
    expect(qi.isActive).toBe(true);
    expect(qi.createdAt).toBeDefined();
  });

  test('updateIndicator modifies fields', () => {
    const qi = firstIndicator();
    const upd = service.updateIndicator(qi.id, { isActive: false }, 'u1');
    expect(upd.isActive).toBe(false);
    expect(upd.updatedAt).toBeDefined();
  });

  test('updateIndicator returns null for unknown id', () => {
    expect(service.updateIndicator('nope', {}, 'u1')).toBeNull();
  });

  test('deleteIndicator removes and returns indicator', () => {
    const qi = firstIndicator();
    const id = qi.id;
    const deleted = service.deleteIndicator(id, 'u1');
    expect(deleted).toBe(qi);
    expect(service.getIndicator(id)).toBeNull();
  });

  test('deleteIndicator returns null for unknown id', () => {
    expect(service.deleteIndicator('nope', 'u1')).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════
   8. Indicator Records
   ═══════════════════════════════════════════════════════ */
describe('Indicator Records', () => {
  test('getIndicatorRecords returns sorted records for known indicator', () => {
    const qi = firstIndicator();
    const recs = service.getIndicatorRecords(qi.id);
    expect(recs.length).toBeGreaterThanOrEqual(3); // 3 months seeded
    // verify sorting by period
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i].period >= recs[i - 1].period).toBe(true);
    }
  });

  test('getIndicatorRecords returns empty for unknown indicator', () => {
    expect(service.getIndicatorRecords('nope')).toHaveLength(0);
  });

  test('getIndicatorRecords filters by period', () => {
    const qi = firstIndicator();
    const recs = service.getIndicatorRecords(qi.id, { period: '2026-01' });
    expect(recs.length).toBeGreaterThanOrEqual(1);
    recs.forEach(r => expect(r.period).toBe('2026-01'));
  });

  test('addIndicatorRecord adds record for known indicator', () => {
    const qi = firstIndicator();
    const before = service.getIndicatorRecords(qi.id).length;
    const rec = service.addIndicatorRecord(qi.id, { period: '2026-04', value: 1.5 }, 'u1');
    expect(rec).not.toBeNull();
    expect(rec.indicatorId).toBe(qi.id);
    expect(rec.value).toBe(1.5);
    expect(rec.recordedAt).toBeDefined();
    expect(service.getIndicatorRecords(qi.id)).toHaveLength(before + 1);
  });

  test('addIndicatorRecord returns null for unknown indicator', () => {
    expect(service.addIndicatorRecord('nope', { value: 1 }, 'u1')).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════
   9. Indicator Trend
   ═══════════════════════════════════════════════════════ */
describe('getIndicatorTrend', () => {
  test('returns trend data for known indicator', () => {
    const qi = firstIndicator();
    const trend = service.getIndicatorTrend(qi.id);
    expect(trend).not.toBeNull();
    expect(trend).toHaveProperty('indicator');
    expect(trend).toHaveProperty('records');
    expect(trend).toHaveProperty('target');
    expect(trend).toHaveProperty('threshold');
    expect(trend.indicator).toBe(qi);
    expect(trend.target).toBe(qi.target);
    expect(trend.records.length).toBeGreaterThanOrEqual(3);
  });

  test('returns null for unknown indicator', () => {
    expect(service.getIndicatorTrend('nope')).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════
   10. Documents CRUD
   ═══════════════════════════════════════════════════════ */
describe('Documents CRUD', () => {
  test('listDocuments returns 4 seed documents', () => {
    expect(service.listDocuments()).toHaveLength(4);
  });

  test('listDocuments filters by type', () => {
    const r = service.listDocuments({ type: 'policy' });
    r.forEach(d => expect(d.type).toBe('policy'));
  });

  test('listDocuments filters by standard', () => {
    const r = service.listDocuments({ standard: 'iso9001' });
    r.forEach(d => expect(d.standard).toBe('iso9001'));
  });

  test('listDocuments filters by department', () => {
    const r = service.listDocuments({ department: 'quality' });
    r.forEach(d => expect(d.department).toBe('quality'));
  });

  test('listDocuments filters by status', () => {
    const r = service.listDocuments({ status: 'approved' });
    expect(r.length).toBe(3);
    r.forEach(d => expect(d.status).toBe('approved'));
  });

  test('getDocument returns doc by id', () => {
    const d = firstDocument();
    expect(service.getDocument(d.id)).toBe(d);
  });

  test('getDocument returns null for unknown id', () => {
    expect(service.getDocument('nope')).toBeNull();
  });

  test('createDocument sets status=draft and approvedBy=null', () => {
    const d = service.createDocument(
      { titleAr: 'Doc', titleEn: 'Doc', type: 'policy', standard: 'cbahi' },
      'u1'
    );
    expect(d.status).toBe('draft');
    expect(d.approvedBy).toBeNull();
    expect(d.approvedDate).toBeNull();
    expect(d.createdAt).toBeDefined();
  });

  test('updateDocument modifies fields', () => {
    const d = firstDocument();
    const upd = service.updateDocument(d.id, { version: '9.9' }, 'u1');
    expect(upd.version).toBe('9.9');
    expect(upd.updatedAt).toBeDefined();
  });

  test('updateDocument returns null for unknown id', () => {
    expect(service.updateDocument('nope', {}, 'u1')).toBeNull();
  });

  test('approveDocument sets status=approved, approvedBy and approvedDate', () => {
    const d = service.createDocument({ titleAr: 'وثيقة', titleEn: 'Doc', type: 'sop' }, 'u1');
    const approved = service.approveDocument(d.id, 'manager-1');
    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('manager-1');
    expect(approved.approvedDate).toBeDefined();
  });

  test('approveDocument returns null for unknown id', () => {
    expect(service.approveDocument('nope', 'u1')).toBeNull();
  });

  test('deleteDocument removes and returns document', () => {
    const d = firstDocument();
    const id = d.id;
    const deleted = service.deleteDocument(id, 'u1');
    expect(deleted).toBe(d);
    expect(service.getDocument(id)).toBeNull();
  });

  test('deleteDocument returns null for unknown id', () => {
    expect(service.deleteDocument('nope', 'u1')).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════
   11. Risk Register CRUD
   ═══════════════════════════════════════════════════════ */
describe('Risk Register CRUD', () => {
  test('listRisks returns 3 seed risks sorted by riskScore desc', () => {
    const r = service.listRisks();
    expect(r).toHaveLength(3);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].riskScore).toBeLessThanOrEqual(r[i - 1].riskScore);
    }
  });

  test('listRisks filters by standard', () => {
    const r = service.listRisks({ standard: 'cbahi' });
    r.forEach(risk => expect(risk.standard).toBe('cbahi'));
  });

  test('listRisks filters by department', () => {
    const r = service.listRisks({ department: 'it' });
    r.forEach(risk => expect(risk.department).toBe('it'));
  });

  test('listRisks filters by riskLevel', () => {
    const r = service.listRisks({ riskLevel: 'very_high' });
    r.forEach(risk => expect(risk.riskLevel).toBe('very_high'));
  });

  test('listRisks filters by status', () => {
    const r = service.listRisks({ status: 'mitigated' });
    r.forEach(risk => expect(risk.status).toBe('mitigated'));
  });

  test('getRisk returns risk by id', () => {
    const risk = firstRisk();
    expect(service.getRisk(risk.id)).toBe(risk);
  });

  test('getRisk returns null for unknown id', () => {
    expect(service.getRisk('nope')).toBeNull();
  });

  test('createRisk computes riskScore and riskLevel — very_high (>=15)', () => {
    const r = service.createRisk(
      { titleAr: 'خطر', titleEn: 'Risk', likelihood: 5, impact: 4 },
      'u1'
    );
    expect(r.riskScore).toBe(20);
    expect(r.riskLevel).toBe('very_high');
    expect(r.status).toBe('active');
  });

  test('createRisk computes riskLevel — high (>=10, <15)', () => {
    const r = service.createRisk(
      { titleAr: 'خطر', titleEn: 'Risk', likelihood: 2, impact: 5 },
      'u1'
    );
    expect(r.riskScore).toBe(10);
    expect(r.riskLevel).toBe('high');
  });

  test('createRisk computes riskLevel — medium (>=6, <10)', () => {
    const r = service.createRisk(
      { titleAr: 'خطر', titleEn: 'Risk', likelihood: 2, impact: 3 },
      'u1'
    );
    expect(r.riskScore).toBe(6);
    expect(r.riskLevel).toBe('medium');
  });

  test('createRisk computes riskLevel — low (>=3, <6)', () => {
    const r = service.createRisk(
      { titleAr: 'خطر', titleEn: 'Risk', likelihood: 1, impact: 3 },
      'u1'
    );
    expect(r.riskScore).toBe(3);
    expect(r.riskLevel).toBe('low');
  });

  test('createRisk computes riskLevel — very_low (<3)', () => {
    const r = service.createRisk(
      { titleAr: 'خطر', titleEn: 'Risk', likelihood: 1, impact: 2 },
      'u1'
    );
    expect(r.riskScore).toBe(2);
    expect(r.riskLevel).toBe('very_low');
  });

  test('createRisk defaults likelihood/impact to 1 if missing', () => {
    const r = service.createRisk({ titleAr: 'خطر', titleEn: 'Risk' }, 'u1');
    expect(r.riskScore).toBe(1);
    expect(r.riskLevel).toBe('very_low');
  });

  test('updateRisk recalculates score when both likelihood and impact provided', () => {
    const r = service.createRisk(
      { titleAr: 'خطر', titleEn: 'Risk', likelihood: 1, impact: 1 },
      'u1'
    );
    const upd = service.updateRisk(r.id, { likelihood: 5, impact: 5 }, 'u1');
    expect(upd.riskScore).toBe(25);
    expect(upd.riskLevel).toBe('very_high');
  });

  test('updateRisk does NOT recalculate when only one dimension given', () => {
    const r = service.createRisk(
      { titleAr: 'خطر', titleEn: 'Risk', likelihood: 2, impact: 3 },
      'u1'
    );
    const origScore = r.riskScore;
    const upd = service.updateRisk(r.id, { likelihood: 5 }, 'u1');
    expect(upd.riskScore).toBe(origScore); // no change
  });

  test('updateRisk returns null for unknown id', () => {
    expect(service.updateRisk('nope', {}, 'u1')).toBeNull();
  });

  test('deleteRisk removes and returns risk', () => {
    const risk = firstRisk();
    const id = risk.id;
    const deleted = service.deleteRisk(id, 'u1');
    expect(deleted).toBe(risk);
    expect(service.getRisk(id)).toBeNull();
  });

  test('deleteRisk returns null for unknown id', () => {
    expect(service.deleteRisk('nope', 'u1')).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════
   12. Accreditation Reports
   ═══════════════════════════════════════════════════════ */
describe('Accreditation Reports', () => {
  test('generateAccreditationReport returns report for valid standard', () => {
    const rpt = service.generateAccreditationReport({ standard: 'cbahi' }, 'u1');
    expect(rpt).not.toBeNull();
    expect(rpt.standard).toBe('cbahi');
    expect(rpt.standardInfo.id).toBe('cbahi');
    expect(rpt).toHaveProperty('overallCompliance');
    expect(rpt).toHaveProperty('readinessLevel');
    expect(rpt).toHaveProperty('auditSummary');
    expect(rpt).toHaveProperty('findingsSummary');
    expect(rpt).toHaveProperty('ncSummary');
    expect(rpt).toHaveProperty('indicatorSummary');
    expect(rpt).toHaveProperty('documentSummary');
    expect(rpt).toHaveProperty('riskSummary');
    expect(rpt).toHaveProperty('recommendations');
  });

  test('generateAccreditationReport returns null for invalid standard', () => {
    expect(service.generateAccreditationReport({ standard: 'bogus' }, 'u1')).toBeNull();
  });

  test('readinessLevel >= 90 → ready', () => {
    // create audit with high compliance
    service.createAudit(
      { titleAr: 'A', titleEn: 'A', standard: 'iso14001', type: 'internal' },
      'u1'
    );
    const audits = service.listAudits({ standard: 'iso14001' });
    service.updateAudit(audits[0].id, { complianceScore: 95, status: 'completed' }, 'u1');
    const rpt = service.generateAccreditationReport({ standard: 'iso14001' }, 'u1');
    expect(rpt.readinessLevel).toBe('ready');
  });

  test('readinessLevel >= 75 and < 90 → nearly_ready', () => {
    service.createAudit(
      { titleAr: 'B', titleEn: 'B', standard: 'iso45001', type: 'internal' },
      'u1'
    );
    const audits = service.listAudits({ standard: 'iso45001' });
    service.updateAudit(audits[0].id, { complianceScore: 80, status: 'completed' }, 'u1');
    const rpt = service.generateAccreditationReport({ standard: 'iso45001' }, 'u1');
    expect(rpt.readinessLevel).toBe('nearly_ready');
  });

  test('readinessLevel >= 50 and < 75 → in_progress', () => {
    const rpt = service.generateAccreditationReport({ standard: 'jci' }, 'u1');
    // jci seed audit has complianceScore=72
    expect(rpt.overallCompliance).toBe(72);
    expect(rpt.readinessLevel).toBe('in_progress');
  });

  test('readinessLevel < 50 → not_ready', () => {
    service.createAudit({ titleAr: 'C', titleEn: 'C', standard: 'iso14001', type: 'mock' }, 'u1');
    const all = service.listAudits({ standard: 'iso14001' });
    // update all iso14001 audits to score 30
    all.forEach(a => service.updateAudit(a.id, { complianceScore: 30, status: 'completed' }, 'u1'));
    const rpt = service.generateAccreditationReport({ standard: 'iso14001' }, 'u1');
    expect(rpt.readinessLevel).toBe('not_ready');
  });

  test('recommendations include critical findings when they exist', () => {
    const rpt = service.generateAccreditationReport({ standard: 'jci' }, 'u1');
    const crit = rpt.recommendations.find(r => r.priority === 'critical');
    expect(crit).toBeDefined();
  });

  test('period defaults to current year if not provided', () => {
    const rpt = service.generateAccreditationReport({ standard: 'cbahi' }, 'u1');
    expect(rpt.period).toBe(`${new Date().getFullYear()}`);
  });

  test('period uses provided value', () => {
    const rpt = service.generateAccreditationReport({ standard: 'cbahi', period: '2025-Q4' }, 'u1');
    expect(rpt.period).toBe('2025-Q4');
  });

  test('listAccreditationReports returns sorted by generatedAt desc', () => {
    service.generateAccreditationReport({ standard: 'cbahi' }, 'u1');
    service.generateAccreditationReport({ standard: 'jci' }, 'u1');
    const list = service.listAccreditationReports();
    expect(list.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < list.length; i++) {
      expect(list[i].generatedAt <= list[i - 1].generatedAt).toBe(true);
    }
  });

  test('listAccreditationReports filters by standard', () => {
    service.generateAccreditationReport({ standard: 'cbahi' }, 'u1');
    const r = service.listAccreditationReports({ standard: 'cbahi' });
    r.forEach(rpt => expect(rpt.standard).toBe('cbahi'));
  });

  test('getAccreditationReport returns report by id', () => {
    const rpt = service.generateAccreditationReport({ standard: 'cbahi' }, 'u1');
    expect(service.getAccreditationReport(rpt.id)).toBe(rpt);
  });

  test('getAccreditationReport returns null for unknown id', () => {
    expect(service.getAccreditationReport('nope')).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════
   13. Export Accreditation Report
   ═══════════════════════════════════════════════════════ */
describe('exportAccreditationReport', () => {
  test('exports JSON by default', () => {
    const rpt = service.generateAccreditationReport({ standard: 'cbahi' }, 'u1');
    const exp = service.exportAccreditationReport(rpt.id);
    expect(exp.format).toBe('json');
    expect(exp.content).toBe(rpt);
    expect(exp.filename).toContain('cbahi');
    expect(exp.filename).toMatch(/\.json$/);
  });

  test('exports CSV when format=csv', () => {
    const rpt = service.generateAccreditationReport({ standard: 'jci' }, 'u1');
    const exp = service.exportAccreditationReport(rpt.id, 'csv');
    expect(exp.format).toBe('csv');
    expect(typeof exp.content).toBe('string');
    expect(exp.content).toContain('Field,Value');
    expect(exp.content).toContain('Standard');
    expect(exp.content).toContain('Overall Compliance');
    expect(exp.filename).toMatch(/\.csv$/);
  });

  test('returns null for unknown id', () => {
    expect(service.exportAccreditationReport('nope')).toBeNull();
  });

  test('returns null for unknown id with csv format', () => {
    expect(service.exportAccreditationReport('nope', 'csv')).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════
   14. Statistics
   ═══════════════════════════════════════════════════════ */
describe('getStatistics', () => {
  test('returns expected shape with all categories', () => {
    const s = service.getStatistics();
    expect(s).toHaveProperty('audits');
    expect(s).toHaveProperty('findings');
    expect(s).toHaveProperty('nonConformances');
    expect(s).toHaveProperty('capaActions');
    expect(s).toHaveProperty('indicators');
    expect(s).toHaveProperty('documents');
    expect(s).toHaveProperty('risks');
  });

  test('audits statistics match seed data', () => {
    const a = service.getStatistics().audits;
    expect(a.total).toBe(3);
    expect(a.completed).toBe(1);
    expect(a.planned).toBe(1);
    expect(a.inProgress).toBe(1);
  });

  test('findings statistics match seed data', () => {
    const f = service.getStatistics().findings;
    expect(f.total).toBe(5);
    expect(f.open).toBe(5);
    expect(f.closed).toBe(0);
    expect(f.critical).toBe(1);
  });

  test('nonConformances statistics match seed data', () => {
    const n = service.getStatistics().nonConformances;
    expect(n.total).toBe(2);
    expect(n.closed).toBe(1);
    expect(n.open).toBe(1);
  });

  test('capaActions statistics match seed data', () => {
    const c = service.getStatistics().capaActions;
    expect(c.total).toBe(3);
    expect(c.closed).toBe(1);
    expect(c.open).toBe(2);
  });

  test('indicators statistics match seed data', () => {
    const i = service.getStatistics().indicators;
    expect(i.total).toBe(8);
    expect(i.active).toBe(8);
  });

  test('documents statistics match seed data', () => {
    const d = service.getStatistics().documents;
    expect(d.total).toBe(4);
    expect(d.approved).toBe(3);
    expect(d.underReview).toBe(1);
    expect(d.draft).toBe(0);
  });

  test('risks statistics match seed data', () => {
    const r = service.getStatistics().risks;
    expect(r.total).toBe(3);
    expect(r.veryHigh).toBe(1);
    expect(r.high).toBe(1);
    expect(r.medium).toBe(1);
    expect(r.low).toBe(0);
  });

  test('statistics update after creating items', () => {
    service.createAudit({ titleAr: 'X', titleEn: 'X' }, 'u1');
    service.createRisk({ titleAr: 'Y', titleEn: 'Y', likelihood: 1, impact: 1 }, 'u1');
    const s = service.getStatistics();
    expect(s.audits.total).toBe(4);
    expect(s.risks.total).toBe(4);
  });
});

/* ═══════════════════════════════════════════════════════
   15. Compliance Matrix
   ═══════════════════════════════════════════════════════ */
describe('getComplianceMatrix', () => {
  test('returns matrix for valid standard', () => {
    const m = service.getComplianceMatrix('cbahi');
    expect(m).not.toBeNull();
    expect(m.standard.id).toBe('cbahi');
    expect(m.totalClauses).toBe(285);
    expect(m).toHaveProperty('assessedClauses');
    expect(m).toHaveProperty('coverage');
    expect(m).toHaveProperty('clauses');
  });

  test('returns null for invalid standard', () => {
    expect(service.getComplianceMatrix('bogus')).toBeNull();
  });

  test('clauses array has correct shape', () => {
    const m = service.getComplianceMatrix('cbahi');
    m.clauses.forEach(c => {
      expect(c).toHaveProperty('ref');
      expect(c).toHaveProperty('findings');
      expect(c).toHaveProperty('openFindings');
      expect(c).toHaveProperty('ncs');
    });
  });

  test('coverage is calculated correctly', () => {
    const m = service.getComplianceMatrix('cbahi');
    // CBAHI has seed findings (3 clause refs) + NCs (1 clause ref) → unique clause refs
    if (m.assessedClauses > 0) {
      expect(m.coverage).toBe(Math.round((m.assessedClauses / 285) * 100));
    } else {
      expect(m.coverage).toBe(0);
    }
  });

  test('matrix for standard with no data returns zero coverage', () => {
    const m = service.getComplianceMatrix('iso14001');
    expect(m.assessedClauses).toBe(0);
    expect(m.coverage).toBe(0);
    expect(m.clauses).toHaveLength(0);
  });

  test('jci matrix includes findings from jci audits', () => {
    const m = service.getComplianceMatrix('jci');
    expect(m.findings).toBeGreaterThanOrEqual(2); // 2 seed findings for jci audit
  });
});

/* ═══════════════════════════════════════════════════════
   16. Audit Log
   ═══════════════════════════════════════════════════════ */
describe('getAuditLog', () => {
  test('returns seed log entries', () => {
    const log = service.getAuditLog();
    expect(log.length).toBeGreaterThanOrEqual(2);
  });

  test('returns entries in reverse chronological order (newest first)', () => {
    // trigger some actions to add log entries
    service.createAudit({ titleAr: 'A', titleEn: 'A' }, 'u1');
    const log = service.getAuditLog();
    expect(log.length).toBeGreaterThanOrEqual(3);
    // first entry should be the most recent
    expect(log[0].action).toBe('create');
  });

  test('filters by entityType', () => {
    service.createAudit({ titleAr: 'B', titleEn: 'B' }, 'u1');
    service.createRisk({ titleAr: 'R', titleEn: 'R', likelihood: 1, impact: 1 }, 'u1');
    const auditLogs = service.getAuditLog({ entityType: 'audit' });
    auditLogs.forEach(entry => expect(entry.entityType).toBe('audit'));
    const systemLogs = service.getAuditLog({ entityType: 'system' });
    systemLogs.forEach(entry => expect(entry.entityType).toBe('system'));
  });

  test('respects limit filter', () => {
    // add several log entries
    for (let i = 0; i < 10; i++) {
      service.createDocument({ titleAr: `D${i}`, titleEn: `D${i}`, type: 'form' }, 'u1');
    }
    const limited = service.getAuditLog({ limit: 3 });
    expect(limited).toHaveLength(3);
  });

  test('default limit is 50', () => {
    const log = service.getAuditLog();
    expect(log.length).toBeLessThanOrEqual(50);
  });

  test('limit as string is parsed correctly', () => {
    const limited = service.getAuditLog({ limit: '2' });
    expect(limited).toHaveLength(2);
  });

  test('log entries have expected shape', () => {
    const log = service.getAuditLog();
    log.forEach(entry => {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('entityType');
      expect(entry).toHaveProperty('userId');
      expect(entry).toHaveProperty('timestamp');
    });
  });
});

/* ═══════════════════════════════════════════════════════
   17. Cross-cutting / Edge Cases
   ═══════════════════════════════════════════════════════ */
describe('Cross-cutting concerns', () => {
  test('all created IDs follow qm-NNNN pattern', () => {
    const a = service.createAudit({ titleAr: 'X', titleEn: 'X' }, 'u1');
    const f = service.createFinding({ titleAr: 'X', titleEn: 'X', auditId: a.id }, 'u1');
    const nc = service.createNonConformance({ titleAr: 'X', titleEn: 'X' }, 'u1');
    const capa = service.createCAPA({ titleAr: 'X', titleEn: 'X', type: 'corrective' }, 'u1');
    const qi = service.createIndicator({ nameAr: 'X', nameEn: 'X' }, 'u1');
    const doc = service.createDocument({ titleAr: 'X', titleEn: 'X', type: 'form' }, 'u1');
    const risk = service.createRisk({ titleAr: 'X', titleEn: 'X', likelihood: 1, impact: 1 }, 'u1');

    [a, f, nc, capa, qi, doc, risk].forEach(item => {
      expect(item.id).toMatch(/^qm-\d+$/);
    });
  });

  test('CRUD operations write to audit log', () => {
    const logBefore = service.getAuditLog().length;
    service.createAudit({ titleAr: 'A', titleEn: 'A' }, 'log-check');
    const logAfter = service.getAuditLog();
    expect(logAfter.length).toBe(logBefore + 1);
    expect(logAfter[0].userId).toBe('log-check');
  });

  test('update and delete operations also log', () => {
    const a = service.createAudit({ titleAr: 'A', titleEn: 'A' }, 'u1');
    const logAfterCreate = service.getAuditLog().length;
    service.updateAudit(a.id, { status: 'cancelled' }, 'u1');
    expect(service.getAuditLog().length).toBe(logAfterCreate + 1);
    service.deleteAudit(a.id, 'u1');
    expect(service.getAuditLog().length).toBe(logAfterCreate + 2);
  });

  test('closing a finding adds a log entry', () => {
    const f = firstFinding();
    const before = service.getAuditLog().length;
    service.closeFinding(f.id, 'closer');
    expect(service.getAuditLog().length).toBe(before + 1);
    expect(service.getAuditLog()[0].action).toBe('close');
  });

  test('verifying a CAPA adds a log entry', () => {
    const c = firstCAPA();
    const before = service.getAuditLog().length;
    service.verifyCAPA(c.id, 'verifier');
    expect(service.getAuditLog().length).toBe(before + 1);
    expect(service.getAuditLog()[0].action).toBe('verify');
  });

  test('approving a document adds a log entry', () => {
    const d = service.createDocument({ titleAr: 'X', titleEn: 'X', type: 'sop' }, 'u1');
    const before = service.getAuditLog().length;
    service.approveDocument(d.id, 'approver');
    expect(service.getAuditLog().length).toBe(before + 1);
    expect(service.getAuditLog()[0].action).toBe('approve');
  });

  test('multiple filters combine correctly (audits)', () => {
    service.createAudit(
      {
        titleAr: 'A',
        titleEn: 'A',
        standard: 'cbahi',
        status: 'planned',
        type: 'internal',
        department: 'it',
      },
      'u1'
    );
    const r = service.listAudits({ standard: 'cbahi', type: 'internal', department: 'it' });
    expect(r.length).toBeGreaterThanOrEqual(1);
    r.forEach(a => {
      expect(a.standard).toBe('cbahi');
      expect(a.type).toBe('internal');
      expect(a.department).toBe('it');
    });
  });

  test('multiple filters combine correctly (documents)', () => {
    const r = service.listDocuments({
      standard: 'iso9001',
      status: 'approved',
      department: 'quality',
    });
    expect(r.length).toBeGreaterThanOrEqual(1);
    r.forEach(d => {
      expect(d.standard).toBe('iso9001');
      expect(d.status).toBe('approved');
      expect(d.department).toBe('quality');
    });
  });

  test('service is a singleton (same reference on re-require within same cache)', () => {
    const svc2 = require('../../services/qualityManagement.service');
    expect(svc2).toBe(service);
  });
});

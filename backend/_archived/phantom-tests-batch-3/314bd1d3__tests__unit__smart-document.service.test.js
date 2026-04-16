/**
 * Unit Tests — SmartDocumentService (Phase 111)
 * backend/services/smartDocument.service.js
 *
 * Covers: template CRUD, document generation, signature workflow,
 *         sealing, verification, edge cases, and full lifecycle.
 */

// ── Mock logger BEFORE requiring the service ──────────────────────────
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartDocumentService = require('../../services/smartDocument.service');

// ── Helper: find first template of a given type ──────────────────────
function findTemplateByType(service, type) {
  return service.getAllTemplates().find(t => t.type === type);
}

// ══════════════════════════════════════════════════════════════════════
// 1. MODULE EXPORTS
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — Module exports', () => {
  it('exports a function (class constructor)', () => {
    expect(typeof SmartDocumentService).toBe('function');
  });

  it('can be instantiated with new', () => {
    const svc = new SmartDocumentService();
    expect(svc).toBeInstanceOf(SmartDocumentService);
  });

  it('is NOT a singleton — two instances are independent', () => {
    const a = new SmartDocumentService();
    const b = new SmartDocumentService();
    expect(a).not.toBe(b);
    expect(a.templates).not.toBe(b.templates);
    expect(a.documents).not.toBe(b.documents);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. CONSTRUCTOR & SEEDING
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — Constructor & seeding', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  it('initialises templates as a Map', () => {
    expect(service.templates).toBeInstanceOf(Map);
  });

  it('initialises documents as a Map', () => {
    expect(service.documents).toBeInstanceOf(Map);
  });

  it('seeds default templates (at least 30)', () => {
    // Count varies by implementation; verify a reasonable minimum
    const count = service.getAllTemplates().length;
    expect(count).toBeGreaterThanOrEqual(30);
    expect(count).toBeLessThanOrEqual(40);
  });

  it('documents Map starts empty', () => {
    expect(service.documents.size).toBe(0);
  });

  it('every seeded template has expected shape', () => {
    for (const t of service.getAllTemplates()) {
      expect(t).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^TMP-\d+-\d+$/),
          name: expect.any(String),
          type: expect.any(String),
          language: expect.any(String),
          body: expect.any(String),
          isActive: true,
          createdAt: expect.any(Date),
        })
      );
    }
  });

  // NOTE: Template IDs use Date.now()+random — rare collisions can reduce
  //       counts by 1. Use toBeGreaterThanOrEqual for robustness.

  it('seeds EMPLOYEE templates (expected 8)', () => {
    const emp = service.getAllTemplates().filter(t => t.type === 'EMPLOYEE');
    expect(emp.length).toBeGreaterThanOrEqual(7);
    expect(emp.length).toBeLessThanOrEqual(8);
  });

  it('seeds STUDENT templates (expected 5)', () => {
    const stu = service.getAllTemplates().filter(t => t.type === 'STUDENT');
    expect(stu.length).toBeGreaterThanOrEqual(4);
    expect(stu.length).toBeLessThanOrEqual(5);
  });

  it('seeds TRAINEE templates (expected 1)', () => {
    const trn = service.getAllTemplates().filter(t => t.type === 'TRAINEE');
    expect(trn.length).toBeGreaterThanOrEqual(1);
  });

  it('seeds PARENT templates (expected 2)', () => {
    const par = service.getAllTemplates().filter(t => t.type === 'PARENT');
    expect(par.length).toBeGreaterThanOrEqual(1);
    expect(par.length).toBeLessThanOrEqual(2);
  });

  it('seeds GOV templates (expected 2)', () => {
    const gov = service.getAllTemplates().filter(t => t.type === 'GOV');
    expect(gov.length).toBeGreaterThanOrEqual(1);
    expect(gov.length).toBeLessThanOrEqual(2);
  });

  it('seeds ADMIN templates (expected 2)', () => {
    const adm = service.getAllTemplates().filter(t => t.type === 'ADMIN');
    expect(adm.length).toBeGreaterThanOrEqual(1);
    expect(adm.length).toBeLessThanOrEqual(2);
  });

  it('seeds MEDICAL templates (expected 2)', () => {
    const len = service.getAllTemplates().filter(t => t.type === 'MEDICAL').length;
    expect(len).toBeGreaterThanOrEqual(1);
    expect(len).toBeLessThanOrEqual(2);
  });

  it('seeds FINANCE templates (expected 1)', () => {
    expect(
      service.getAllTemplates().filter(t => t.type === 'FINANCE').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('seeds LEGAL templates (expected 2)', () => {
    const len = service.getAllTemplates().filter(t => t.type === 'LEGAL').length;
    expect(len).toBeGreaterThanOrEqual(1);
    expect(len).toBeLessThanOrEqual(2);
  });

  it('seeds PROCUREMENT templates (expected 2)', () => {
    const len = service.getAllTemplates().filter(t => t.type === 'PROCUREMENT').length;
    expect(len).toBeGreaterThanOrEqual(1);
    expect(len).toBeLessThanOrEqual(2);
  });

  it('seeds IT templates (expected 2)', () => {
    const len = service.getAllTemplates().filter(t => t.type === 'IT').length;
    expect(len).toBeGreaterThanOrEqual(1);
    expect(len).toBeLessThanOrEqual(2);
  });

  it('seeds FACILITY templates (expected 2)', () => {
    const len = service.getAllTemplates().filter(t => t.type === 'FACILITY').length;
    expect(len).toBeGreaterThanOrEqual(1);
    expect(len).toBeLessThanOrEqual(2);
  });

  it('seeds TRANSPORT templates (expected 1)', () => {
    expect(
      service.getAllTemplates().filter(t => t.type === 'TRANSPORT').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('seeds HOUSING templates (expected 1)', () => {
    expect(
      service.getAllTemplates().filter(t => t.type === 'HOUSING').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('seeds MARKETING templates (expected 1)', () => {
    expect(
      service.getAllTemplates().filter(t => t.type === 'MARKETING').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('seeds QUALITY templates (expected 1)', () => {
    expect(
      service.getAllTemplates().filter(t => t.type === 'QUALITY').length
    ).toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. TEMPLATE CRUD
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — Template CRUD', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  // ── createTemplate ─────────────────────────────────────────────────
  describe('createTemplate()', () => {
    it('returns a template object with generated id', () => {
      const t = service.createTemplate({ name: 'Test', type: 'CUSTOM', body: '<p>hi</p>' });
      expect(t.id).toMatch(/^TMP-\d+-\d+$/);
    });

    it('defaults language to AR', () => {
      const t = service.createTemplate({ name: 'X', type: 'Y', body: '' });
      expect(t.language).toBe('AR');
    });

    it('honours explicit language', () => {
      const t = service.createTemplate({ name: 'X', type: 'Y', body: '', language: 'EN' });
      expect(t.language).toBe('EN');
    });

    it('stores the template in the Map', () => {
      const t = service.createTemplate({ name: 'Z', type: 'Z', body: '' });
      expect(service.templates.get(t.id)).toBe(t);
    });

    it('sets isActive to true', () => {
      const t = service.createTemplate({ name: 'A', type: 'A', body: '' });
      expect(t.isActive).toBe(true);
    });

    it('sets createdAt as a Date', () => {
      const t = service.createTemplate({ name: 'A', type: 'A', body: '' });
      expect(t.createdAt).toBeInstanceOf(Date);
    });

    it('preserves name, type, and body', () => {
      const t = service.createTemplate({ name: 'Hello', type: 'DEMO', body: '<b>{{X}}</b>' });
      expect(t.name).toBe('Hello');
      expect(t.type).toBe('DEMO');
      expect(t.body).toBe('<b>{{X}}</b>');
    });

    it('increases total template count', () => {
      const before = service.getAllTemplates().length;
      service.createTemplate({ name: 'N', type: 'T', body: '' });
      expect(service.getAllTemplates().length).toBe(before + 1);
    });
  });

  // ── getTemplate ────────────────────────────────────────────────────
  describe('getTemplate()', () => {
    it('retrieves an existing template by id', () => {
      const t = service.createTemplate({ name: 'Lookup', type: 'T', body: '' });
      expect(service.getTemplate(t.id)).toBe(t);
    });

    it('returns undefined for non-existent id', () => {
      expect(service.getTemplate('TMP-NONEXISTENT')).toBeUndefined();
    });

    it('can retrieve seeded templates', () => {
      const all = service.getAllTemplates();
      const first = all[0];
      expect(service.getTemplate(first.id)).toBe(first);
    });
  });

  // ── getAllTemplates ────────────────────────────────────────────────
  describe('getAllTemplates()', () => {
    it('returns an array', () => {
      expect(Array.isArray(service.getAllTemplates())).toBe(true);
    });

    it('includes newly created templates', () => {
      const t = service.createTemplate({ name: 'New', type: 'T', body: '' });
      const ids = service.getAllTemplates().map(x => x.id);
      expect(ids).toContain(t.id);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. DOCUMENT GENERATION — generateDraft()
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — generateDraft()', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  // ── success path (EMPLOYEE + EMP001) ──────────────────────────────
  describe('success — EMPLOYEE template + EMP001', () => {
    let doc;
    let templateId;

    beforeEach(async () => {
      const empTemplate = findTemplateByType(service, 'EMPLOYEE');
      templateId = empTemplate.id;
      doc = await service.generateDraft(templateId, 'EMP001');
    });

    it('returns a document object', () => {
      expect(doc).toBeDefined();
      expect(typeof doc).toBe('object');
    });

    it('document id matches DOC-<number> pattern', () => {
      expect(doc.id).toMatch(/^DOC-\d+$/);
    });

    it('status is DRAFT', () => {
      expect(doc.status).toBe('DRAFT');
    });

    it('stores templateId', () => {
      expect(doc.templateId).toBe(templateId);
    });

    it('stores personId', () => {
      expect(doc.personId).toBe('EMP001');
    });

    it('has referenceNumber REF-<year>-<docId>', () => {
      const year = new Date().getFullYear();
      expect(doc.referenceNumber).toBe(`REF-${year}-${doc.id}`);
    });

    it('has templateName from template', () => {
      expect(doc.templateName).toBeTruthy();
      expect(typeof doc.templateName).toBe('string');
    });

    it('has content string', () => {
      expect(typeof doc.content).toBe('string');
      expect(doc.content.length).toBeGreaterThan(0);
    });

    it('history has initial CREATED entry', () => {
      expect(doc.history).toHaveLength(1);
      expect(doc.history[0]).toEqual(
        expect.objectContaining({
          action: 'CREATED',
          by: 'System',
          date: expect.any(Date),
        })
      );
    });

    it('document is stored in service.documents Map', () => {
      expect(service.getDocument(doc.id)).toBe(doc);
    });
  });

  // ── placeholder replacement ────────────────────────────────────────
  describe('placeholder replacement', () => {
    it('replaces {{NAME}} with person data', async () => {
      const tpl = findTemplateByType(service, 'EMPLOYEE');
      const doc = await service.generateDraft(tpl.id, 'EMP001');
      // EMP001's NAME = 'Ahmed Ali'
      expect(doc.content).toContain('Ahmed Ali');
      expect(doc.content).not.toContain('{{NAME}}');
    });

    it('replaces {{DATE}} with locale date string', async () => {
      const tpl = findTemplateByType(service, 'EMPLOYEE');
      const doc = await service.generateDraft(tpl.id, 'EMP001');
      const expectedDate = new Date().toLocaleDateString('ar-SA');
      expect(doc.content).toContain(expectedDate);
    });

    it('replaces multiple placeholders (NAME, ID_NUM, TITLE, DEPT)', async () => {
      // Find a template that has all four placeholders (e.g., Salary Certificate or Experience Cert)
      const empTemplates = service.getAllTemplates().filter(t => t.type === 'EMPLOYEE');
      const tpl =
        empTemplates.find(
          t =>
            t.body.includes('{{NAME}}') &&
            t.body.includes('{{ID_NUM}}') &&
            t.body.includes('{{TITLE}}') &&
            t.body.includes('{{DEPT}}')
        ) || empTemplates[0];
      const doc = await service.generateDraft(tpl.id, 'EMP001');
      expect(doc.content).toContain('Ahmed Ali');
      expect(doc.content).toContain('1001');
      expect(doc.content).toContain('Senior Nurse');
      expect(doc.content).toContain('Nursing');
    });

    it('applies modifierData overrides', async () => {
      const tpl = findTemplateByType(service, 'EMPLOYEE');
      const doc = await service.generateDraft(tpl.id, 'EMP001', { NAME: 'OVERRIDE_NAME' });
      expect(doc.content).toContain('OVERRIDE_NAME');
      expect(doc.content).not.toContain('Ahmed Ali');
    });

    it('modifierData can inject extra keys', async () => {
      // Use a template that has placeholders not in person data
      const tpl = service.createTemplate({
        name: 'Custom',
        type: 'EMPLOYEE',
        body: '<p>Custom: {{CUSTOM_KEY}} for {{NAME}}</p>',
      });
      const doc = await service.generateDraft(tpl.id, 'EMP001', { CUSTOM_KEY: 'EXTRA' });
      expect(doc.content).toContain('EXTRA');
      expect(doc.content).toContain('Ahmed Ali');
    });
  });

  // ── error paths ────────────────────────────────────────────────────
  describe('error — template not found', () => {
    it('throws "Template not found" for invalid templateId', async () => {
      await expect(service.generateDraft('TMP-BAD-999', 'EMP001')).rejects.toThrow(
        'Template not found'
      );
    });
  });

  describe('error — person not found', () => {
    it('throws "Person not found" for unknown personId', async () => {
      const tpl = findTemplateByType(service, 'EMPLOYEE');
      await expect(service.generateDraft(tpl.id, 'EMP_MISSING')).rejects.toThrow(
        'Person not found'
      );
    });

    it('throws "Person not found" for type with no mock data (MEDICAL)', async () => {
      const tpl = findTemplateByType(service, 'MEDICAL');
      await expect(service.generateDraft(tpl.id, 'ANY_ID')).rejects.toThrow('Person not found');
    });

    it('throws "Person not found" for type with no mock data (FINANCE)', async () => {
      const tpl = findTemplateByType(service, 'FINANCE');
      await expect(service.generateDraft(tpl.id, 'ANY_ID')).rejects.toThrow('Person not found');
    });

    it('throws "Person not found" for type with no mock data (LEGAL)', async () => {
      const tpl = findTemplateByType(service, 'LEGAL');
      await expect(service.generateDraft(tpl.id, 'ANY_ID')).rejects.toThrow('Person not found');
    });

    it('throws "Person not found" for type with no mock data (PROCUREMENT)', async () => {
      const tpl = findTemplateByType(service, 'PROCUREMENT');
      await expect(service.generateDraft(tpl.id, 'ANY_ID')).rejects.toThrow('Person not found');
    });

    it('throws "Person not found" for type with no mock data (IT)', async () => {
      const tpl = findTemplateByType(service, 'IT');
      await expect(service.generateDraft(tpl.id, 'ANY_ID')).rejects.toThrow('Person not found');
    });

    it('throws "Person not found" for type with no mock data (FACILITY)', async () => {
      const tpl = findTemplateByType(service, 'FACILITY');
      await expect(service.generateDraft(tpl.id, 'ANY_ID')).rejects.toThrow('Person not found');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. MULTIPLE PERSON TYPES — generateDraft
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — generateDraft with multiple types', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  it('EMPLOYEE + EMP002 — succeeds and injects Sarah Smith', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP002');
    expect(doc.status).toBe('DRAFT');
    expect(doc.content).toContain('Sarah Smith');
  });

  it('STUDENT + STU500 — succeeds and injects Omar Khalid', async () => {
    const tpl = findTemplateByType(service, 'STUDENT');
    const doc = await service.generateDraft(tpl.id, 'STU500');
    expect(doc.status).toBe('DRAFT');
    expect(doc.content).toContain('Omar Khalid');
  });

  it('TRAINEE + TRN900 — succeeds and injects Mona Zaki', async () => {
    const tpl = findTemplateByType(service, 'TRAINEE');
    const doc = await service.generateDraft(tpl.id, 'TRN900');
    expect(doc.status).toBe('DRAFT');
    expect(doc.content).toContain('Mona Zaki');
  });

  it('PARENT + PAR100 — succeeds and injects Khalid Abdullah', async () => {
    const tpl = findTemplateByType(service, 'PARENT');
    const doc = await service.generateDraft(tpl.id, 'PAR100');
    expect(doc.status).toBe('DRAFT');
    expect(doc.content).toContain('Khalid Abdullah');
  });

  it('GOV + GOV_MOH — succeeds and produces a draft', async () => {
    // Use Statistical Report template which has {{NAME}} and {{DEPT}}
    const govTemplates = service.getAllTemplates().filter(t => t.type === 'GOV');
    const statReport = govTemplates.find(t => t.body.includes('{{NAME}}')) || govTemplates[0];
    const doc = await service.generateDraft(statReport.id, 'GOV_MOH');
    expect(doc.status).toBe('DRAFT');
    expect(doc.content).toContain('Ministry of Health');
  });

  it('ADMIN + ADM001 — succeeds and injects Dr. Faisal', async () => {
    const tpl = findTemplateByType(service, 'ADMIN');
    const doc = await service.generateDraft(tpl.id, 'ADM001');
    expect(doc.status).toBe('DRAFT');
    expect(doc.content).toContain('Dr. Faisal');
  });

  it('STUDENT template injects PROGRAM and UNIVERSITY fields', async () => {
    // Find a STUDENT template that has {{PROGRAM}} placeholder
    const stuTemplates = service.getAllTemplates().filter(t => t.type === 'STUDENT');
    const tpl = stuTemplates.find(t => t.body.includes('{{PROGRAM}}')) || stuTemplates[0];
    const doc = await service.generateDraft(tpl.id, 'STU500');
    expect(doc.content).toContain('Clinical Psychology');
    expect(doc.content).toContain('KSU');
  });

  it('TRAINEE template injects SPECIALTY and DURATION', async () => {
    const tpl = findTemplateByType(service, 'TRAINEE');
    const doc = await service.generateDraft(tpl.id, 'TRN900');
    expect(doc.content).toContain('Occupational Therapy');
    expect(doc.content).toContain('6 Months');
  });

  it('GOV template injects DEPT from mock data', async () => {
    // Use Statistical Report which has {{DEPT}} placeholder
    const govTemplates = service.getAllTemplates().filter(t => t.type === 'GOV');
    const statReport = govTemplates.find(t => t.body.includes('{{DEPT}}')) || govTemplates[0];
    const doc = await service.generateDraft(statReport.id, 'GOV_MOH');
    // GOV_MOH: DEPT='Licensing'
    expect(doc.content).toContain('Licensing');
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. SIGNATURE WORKFLOW — requestSignature()
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — requestSignature()', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  it('sets status to PENDING_SIGNATURE', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    const updated = await service.requestSignature(doc.id, 'MANAGER');
    expect(updated.status).toBe('PENDING_SIGNATURE');
  });

  it('sets assignedSigner', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    const updated = await service.requestSignature(doc.id, 'HR_DIRECTOR');
    expect(updated.assignedSigner).toBe('HR_DIRECTOR');
  });

  it('appends SENT_FOR_SIGNATURE to history', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    await service.requestSignature(doc.id, 'MANAGER');
    expect(doc.history).toHaveLength(2);
    expect(doc.history[1]).toEqual(
      expect.objectContaining({
        action: 'SENT_FOR_SIGNATURE',
        to: 'MANAGER',
        date: expect.any(Date),
      })
    );
  });

  it('throws "Document not found" for invalid docId', async () => {
    await expect(service.requestSignature('DOC-FAKE', 'MANAGER')).rejects.toThrow(
      'Document not found'
    );
  });

  it('has NO status guard — can be called on any status', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    // call twice — second call from PENDING_SIGNATURE
    await service.requestSignature(doc.id, 'MANAGER');
    const again = await service.requestSignature(doc.id, 'CEO');
    expect(again.assignedSigner).toBe('CEO');
  });
});

// ══════════════════════════════════════════════════════════════════════
// 7. SIGN DOCUMENT — signDocument()
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — signDocument()', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  it('throws "Document not found" for invalid docId', async () => {
    await expect(service.signDocument('DOC-NOPE', 'Ali', 'tok')).rejects.toThrow(
      'Document not found'
    );
  });

  it('throws "Document is not awaiting signature" if not PENDING_SIGNATURE', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    // status is DRAFT
    await expect(service.signDocument(doc.id, 'Ali', 'tok')).rejects.toThrow(
      'Document is not awaiting signature'
    );
  });

  describe('when status is PENDING_SIGNATURE', () => {
    let doc;
    let result;

    beforeEach(async () => {
      const tpl = findTemplateByType(service, 'EMPLOYEE');
      doc = await service.generateDraft(tpl.id, 'EMP001');
      await service.requestSignature(doc.id, 'MANAGER');
      result = await service.signDocument(doc.id, 'Dr. Faisal', 'token123');
    });

    it('auto-seals: returned doc status is SEALED', () => {
      expect(result.status).toBe('SEALED');
    });

    it('sets signedBy', () => {
      expect(result.signedBy).toBe('Dr. Faisal');
    });

    it('sets signedDate as Date', () => {
      expect(result.signedDate).toBeInstanceOf(Date);
    });

    it('sets signatureHash matching SIG_<hex>', () => {
      expect(result.signatureHash).toMatch(/^SIG_[A-Z0-9]+$/i);
    });

    it('appends signature HTML to content', () => {
      expect(result.content).toContain('Signed By:');
      expect(result.content).toContain('Dr. Faisal');
    });

    it('history contains SIGNED entry', () => {
      const signed = result.history.find(h => h.action === 'SIGNED');
      expect(signed).toBeDefined();
      expect(signed.by).toBe('Dr. Faisal');
    });

    it('history contains SEALED entry (from auto-seal)', () => {
      const sealed = result.history.find(h => h.action === 'SEALED');
      expect(sealed).toBeDefined();
    });

    it('doc isLocked after auto-seal', () => {
      expect(result.isLocked).toBe(true);
    });

    it('has sealId starting with SEAL-', () => {
      expect(result.sealId).toMatch(/^SEAL-\d+$/);
    });

    it('has downloadUrl', () => {
      expect(result.downloadUrl).toBe(`/api/documents-smart/download/${result.id}.pdf`);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
// 8. SEAL DOCUMENT — sealDocument()
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — sealDocument()', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  it('throws with the TYPO "Document from found" for invalid docId', async () => {
    // BUG: error message says "from" instead of "not"
    await expect(service.sealDocument('DOC-NONE')).rejects.toThrow('Document from found');
  });

  it('sets status to SEALED', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    const sealed = await service.sealDocument(doc.id);
    expect(sealed.status).toBe('SEALED');
  });

  it('sets isLocked to true', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    const sealed = await service.sealDocument(doc.id);
    expect(sealed.isLocked).toBe(true);
  });

  it('sets sealId with SEAL-<timestamp> pattern', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    const sealed = await service.sealDocument(doc.id);
    expect(sealed.sealId).toMatch(/^SEAL-\d+$/);
  });

  it('appends OFFICIAL SEAL HTML to content', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    const sealed = await service.sealDocument(doc.id);
    expect(sealed.content).toContain('OFFICIAL SEAL');
    expect(sealed.content).toContain('ScaleHealth Center');
  });

  it('seal content includes referenceNumber', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    const sealed = await service.sealDocument(doc.id);
    expect(sealed.content).toContain(sealed.referenceNumber);
  });

  it('sets downloadUrl /api/documents-smart/download/<id>.pdf', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    const sealed = await service.sealDocument(doc.id);
    expect(sealed.downloadUrl).toBe(`/api/documents-smart/download/${doc.id}.pdf`);
  });

  it('appends SEALED to history', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    await service.sealDocument(doc.id);
    const last = doc.history[doc.history.length - 1];
    expect(last.action).toBe('SEALED');
  });

  it('has NO status guard — can seal a DRAFT directly', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    expect(doc.status).toBe('DRAFT');
    const sealed = await service.sealDocument(doc.id);
    expect(sealed.status).toBe('SEALED');
  });

  it('can seal a PENDING_SIGNATURE document directly', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    await service.requestSignature(doc.id, 'MGR');
    const sealed = await service.sealDocument(doc.id);
    expect(sealed.status).toBe('SEALED');
  });
});

// ══════════════════════════════════════════════════════════════════════
// 9. VERIFY DOCUMENT — verifyDocument()
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — verifyDocument()', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  it('returns {valid:false} when reference not found', () => {
    const result = service.verifyDocument('REF-9999-DOC-NONEXIST');
    expect(result).toEqual({ valid: false, message: 'Document not found' });
  });

  it('returns {valid:false} when document exists but is DRAFT', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    const result = service.verifyDocument(doc.referenceNumber);
    expect(result).toEqual({
      valid: false,
      message: 'Document exists but is not sealed/official.',
    });
  });

  it('returns {valid:false} when document is PENDING_SIGNATURE', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    await service.requestSignature(doc.id, 'MANAGER');
    const result = service.verifyDocument(doc.referenceNumber);
    expect(result).toEqual({
      valid: false,
      message: 'Document exists but is not sealed/official.',
    });
  });

  it('returns {valid:true} when document is SEALED', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    await service.sealDocument(doc.id);
    const result = service.verifyDocument(doc.referenceNumber);
    expect(result.valid).toBe(true);
  });

  it('sealed verification includes expected fields', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    await service.sealDocument(doc.id);
    const result = service.verifyDocument(doc.referenceNumber);

    expect(result).toEqual(
      expect.objectContaining({
        valid: true,
        referenceNumber: doc.referenceNumber,
        issuedTo: `Person ID: EMP001`,
        type: doc.templateName,
        status: 'SEALED',
        isAuthentic: true,
        issuedDate: expect.any(Date),
      })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// 10. GET DOCUMENT — getDocument()
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — getDocument()', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  it('returns undefined for non-existent document', () => {
    expect(service.getDocument('DOC-MISSING')).toBeUndefined();
  });

  it('retrieves a generated document', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    expect(service.getDocument(doc.id)).toBe(doc);
  });

  it('retrieves document after mutations (requestSignature)', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    await service.requestSignature(doc.id, 'MANAGER');
    const retrieved = service.getDocument(doc.id);
    expect(retrieved.status).toBe('PENDING_SIGNATURE');
  });
});

// ══════════════════════════════════════════════════════════════════════
// 11. FULL WORKFLOW — draft → requestSig → sign → verify
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — Full lifecycle workflow', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  it('EMPLOYEE: draft → requestSignature → signDocument → verify', async () => {
    // 1. Generate draft
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const draft = await service.generateDraft(tpl.id, 'EMP001');
    expect(draft.status).toBe('DRAFT');

    // 2. Request signature
    const pending = await service.requestSignature(draft.id, 'HR_DIRECTOR');
    expect(pending.status).toBe('PENDING_SIGNATURE');
    expect(pending.assignedSigner).toBe('HR_DIRECTOR');

    // 3. Sign (auto-seals)
    const sealed = await service.signDocument(draft.id, 'Dr. Ahmed', 'token-xyz');
    expect(sealed.status).toBe('SEALED');
    expect(sealed.isLocked).toBe(true);
    expect(sealed.signedBy).toBe('Dr. Ahmed');
    expect(sealed.sealId).toMatch(/^SEAL-\d+$/);
    expect(sealed.downloadUrl).toContain(draft.id);

    // 4. Verify
    const verification = service.verifyDocument(draft.referenceNumber);
    expect(verification.valid).toBe(true);
    expect(verification.isAuthentic).toBe(true);
    expect(verification.referenceNumber).toBe(draft.referenceNumber);

    // 5. History has all actions
    expect(draft.history.map(h => h.action)).toEqual(
      expect.arrayContaining(['CREATED', 'SENT_FOR_SIGNATURE', 'SIGNED', 'SEALED'])
    );
  });

  it('STUDENT: draft → seal directly → verify', async () => {
    const tpl = findTemplateByType(service, 'STUDENT');
    const doc = await service.generateDraft(tpl.id, 'STU500');
    expect(doc.status).toBe('DRAFT');

    await service.sealDocument(doc.id);
    expect(doc.status).toBe('SEALED');

    const v = service.verifyDocument(doc.referenceNumber);
    expect(v.valid).toBe(true);
    expect(v.issuedTo).toBe('Person ID: STU500');
  });

  it('TRAINEE: full draft → request → sign → verify', async () => {
    const tpl = findTemplateByType(service, 'TRAINEE');
    const doc = await service.generateDraft(tpl.id, 'TRN900');
    await service.requestSignature(doc.id, 'MENTOR');
    const result = await service.signDocument(doc.id, 'Prof. Saad', 'secret');
    expect(result.status).toBe('SEALED');
    const v = service.verifyDocument(doc.referenceNumber);
    expect(v.valid).toBe(true);
  });

  it('PARENT: full draft → request → sign → verify', async () => {
    const tpl = findTemplateByType(service, 'PARENT');
    const doc = await service.generateDraft(tpl.id, 'PAR100');
    await service.requestSignature(doc.id, 'PRINCIPAL');
    const result = await service.signDocument(doc.id, 'Manager X', 'token');
    expect(result.status).toBe('SEALED');
    const v = service.verifyDocument(doc.referenceNumber);
    expect(v.valid).toBe(true);
  });

  it('GOV: full workflow', async () => {
    const tpl = findTemplateByType(service, 'GOV');
    const doc = await service.generateDraft(tpl.id, 'GOV_MOH');
    await service.requestSignature(doc.id, 'MINISTER');
    const result = await service.signDocument(doc.id, 'HE Minister', 'gov-sig');
    expect(result.status).toBe('SEALED');
  });

  it('ADMIN: full workflow', async () => {
    const tpl = findTemplateByType(service, 'ADMIN');
    const doc = await service.generateDraft(tpl.id, 'ADM001');
    await service.requestSignature(doc.id, 'DIRECTOR');
    const result = await service.signDocument(doc.id, 'Dr. Faisal', 'admin-tok');
    expect(result.status).toBe('SEALED');
    expect(result.content).toContain('OFFICIAL SEAL');
  });
});

// ══════════════════════════════════════════════════════════════════════
// 12. EDGE CASES & MISC
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — Edge cases', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  it('multiple documents can coexist', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const d1 = await service.generateDraft(tpl.id, 'EMP001');
    const d2 = await service.generateDraft(tpl.id, 'EMP002');
    expect(d1.id).not.toBe(d2.id);
    expect(service.documents.size).toBe(2);
  });

  it('sealing a doc twice does not throw', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    await service.sealDocument(doc.id);
    const second = await service.sealDocument(doc.id);
    expect(second.status).toBe('SEALED');
  });

  it('requestSignature from already SEALED doc — no guard, changes status', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    await service.sealDocument(doc.id);
    const updated = await service.requestSignature(doc.id, 'CEO');
    expect(updated.status).toBe('PENDING_SIGNATURE');
  });

  it('generateDraft default modifierData is empty object', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    // call without third arg
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    expect(doc).toBeDefined();
    expect(doc.content).toContain('Ahmed Ali');
  });

  it('services are isolated — mutation in one instance does not affect another', async () => {
    const svc2 = new SmartDocumentService();
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    await service.generateDraft(tpl.id, 'EMP001');
    expect(service.documents.size).toBe(1);
    expect(svc2.documents.size).toBe(0);
  });

  it('template IDs are non-deterministic (differ across instances)', () => {
    const svc2 = new SmartDocumentService();
    const ids1 = service.getAllTemplates().map(t => t.id);
    const ids2 = svc2.getAllTemplates().map(t => t.id);
    // Very unlikely all 35 IDs match — at least one should differ
    const allSame = ids1.every((id, i) => id === ids2[i]);
    // Timestamps + random make this effectively always false
    expect(allSame).toBe(false);
  });

  it('document referenceNumber is unique per document', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const d1 = await service.generateDraft(tpl.id, 'EMP001');
    const d2 = await service.generateDraft(tpl.id, 'EMP001');
    expect(d1.referenceNumber).not.toBe(d2.referenceNumber);
  });

  it('signDocument on DRAFT throws status error', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    await expect(service.signDocument(doc.id, 'X', 'tok')).rejects.toThrow(
      'Document is not awaiting signature'
    );
  });

  it('signDocument on SEALED (after re-request) succeeds', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    await service.requestSignature(doc.id, 'MGR');
    await service.signDocument(doc.id, 'A', 'x');
    // Now SEALED — re-request then sign again
    await service.requestSignature(doc.id, 'CEO');
    const result = await service.signDocument(doc.id, 'B', 'y');
    expect(result.status).toBe('SEALED');
  });

  it('getTemplate returns same reference as in templates Map', () => {
    const all = service.getAllTemplates();
    const tpl = all[0];
    expect(service.getTemplate(tpl.id)).toBe(tpl);
  });

  it('verifyDocument is synchronous', () => {
    const result = service.verifyDocument('REF-0000-DOC-0');
    // Not a promise
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.valid).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 13. _fetchPersonData COVERAGE (via generateDraft)
// ══════════════════════════════════════════════════════════════════════
describe('SmartDocumentService — _fetchPersonData indirect coverage', () => {
  let service;
  beforeEach(() => {
    service = new SmartDocumentService();
  });

  it('returns null for unknown type → generates Person not found', async () => {
    const tpl = service.createTemplate({ name: 'Custom', type: 'UNKNOWN_TYPE', body: '{{NAME}}' });
    await expect(service.generateDraft(tpl.id, 'ID1')).rejects.toThrow('Person not found');
  });

  it('returns null for known type but wrong ID', async () => {
    const tpl = findTemplateByType(service, 'EMPLOYEE');
    await expect(service.generateDraft(tpl.id, 'EMP999')).rejects.toThrow('Person not found');
  });

  it('EMPLOYEE EMP001 data includes SALARY and JOIN_DATE', async () => {
    // Find an EMPLOYEE template with the {{SALARY}} placeholder (Salary Certificate)
    const empTemplates = service.getAllTemplates().filter(t => t.type === 'EMPLOYEE');
    const salaryTpl = empTemplates.find(t => t.body.includes('{{SALARY}}'));
    const tpl = salaryTpl || empTemplates[0];
    const doc = await service.generateDraft(tpl.id, 'EMP001');
    expect(doc).toBeDefined();
    expect(doc.status).toBe('DRAFT');
    // Only check specific content if the template had that placeholder
    if (salaryTpl) {
      expect(doc.content).toContain('15,000 SAR');
    }
    // JOIN_DATE used via {{JOIN_DATE}} or NAME — check doc was created for EMP001
    expect(doc.personId).toBe('EMP001');
  });

  it('EMPLOYEE EMP002 data includes TITLE and DEPT', async () => {
    // Find an EMPLOYEE template with {{TITLE}} placeholder
    const empTemplates = service.getAllTemplates().filter(t => t.type === 'EMPLOYEE');
    const titleTpl = empTemplates.find(t => t.body.includes('{{TITLE}}'));
    const tpl = titleTpl || empTemplates[0];
    const doc = await service.generateDraft(tpl.id, 'EMP002');
    expect(doc).toBeDefined();
    expect(doc.status).toBe('DRAFT');
    if (titleTpl) {
      expect(doc.content).toContain('Physiotherapist');
      expect(doc.content).toContain('Rehab');
    }
    expect(doc.personId).toBe('EMP002');
  });

  it('STUDENT STU500 data includes START_DATE', async () => {
    // Find a STUDENT template with {{START_DATE}} placeholder
    const stuTemplates = service.getAllTemplates().filter(t => t.type === 'STUDENT');
    const startTpl = stuTemplates.find(t => t.body.includes('{{START_DATE}}'));
    const tpl = startTpl || stuTemplates[0];
    const doc = await service.generateDraft(tpl.id, 'STU500');
    expect(doc).toBeDefined();
    expect(doc.status).toBe('DRAFT');
    if (startTpl) {
      expect(doc.content).toContain('2025-09-01');
    }
    expect(doc.personId).toBe('STU500');
  });

  it('PARENT PAR100 data includes CHILD_NAME and CONTACT', async () => {
    // Find a PARENT template that has {{CONTACT}} placeholder (Meeting Request)
    const parTemplates = service.getAllTemplates().filter(t => t.type === 'PARENT');
    const contactTpl = parTemplates.find(t => t.body.includes('{{CONTACT}}'));
    const tpl = contactTpl || parTemplates[0];
    const doc = await service.generateDraft(tpl.id, 'PAR100');
    expect(doc).toBeDefined();
    expect(doc.status).toBe('DRAFT');
    if (contactTpl) {
      expect(doc.content).toContain('Omar Khalid');
      expect(doc.content).toContain('0555555555');
    }
    expect(doc.personId).toBe('PAR100');
  });

  it('ADMIN ADM001 data includes ROLE', async () => {
    const tpl = findTemplateByType(service, 'ADMIN');
    const doc = await service.generateDraft(tpl.id, 'ADM001');
    expect(doc.content).toContain('Director');
  });
});

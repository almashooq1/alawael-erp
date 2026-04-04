/**
 * Tests for Modules 8-12: Communication + Documents + Branches + Inventory + Quality
 * اختبارات الوحدات 8-12: التواصل + الملفات + الفروع + المخزون + الجودة
 */

const request = require('supertest');

// Mock mongoose and models before requiring app
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue(true),
    connection: { readyState: 1 },
  };
});

// ─── Mock auth middleware ──────────────────────────────────────────────────────
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { _id: 'user123', id: 'user123', role: 'admin' };
    next();
  },
  authorize:
    (..._roles) =>
    (_req, _res, next) =>
      next(),
}));

// ─── Module 8: NotificationTemplate ──────────────────────────────────────────
const mockTemplate = {
  _id: 'tmpl1',
  code: 'appointment_reminder_24h',
  nameAr: 'تذكير موعد',
  nameEn: 'Appointment Reminder',
  category: 'appointment',
  channels: ['database', 'sms', 'whatsapp'],
  bodyAr: 'تذكير: موعدكم {{date}}',
  bodyEn: 'Reminder: your appointment on {{date}}',
  isActive: true,
  priority: 'normal',
};

jest.mock('../models/NotificationTemplate', () => ({
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([mockTemplate]),
  }),
  findById: jest.fn().mockResolvedValue(mockTemplate),
  create: jest.fn().mockResolvedValue(mockTemplate),
  findByIdAndUpdate: jest.fn().mockResolvedValue(mockTemplate),
}));

// ─── Module 8: NotificationPreference ────────────────────────────────────────
jest.mock('../models/NotificationPreference', () => ({
  find: jest.fn().mockResolvedValue([]),
  findOneAndUpdate: jest.fn().mockResolvedValue({ userId: 'user123', category: 'appointment' }),
}));

// ─── Module 8: Escalation ────────────────────────────────────────────────────
const mockEscalation = {
  _id: 'esc1',
  type: 'complaint',
  priority: 'high',
  currentLevel: 1,
  status: 'open',
  branchId: 'br1',
  description: 'Test escalation',
  escalationHistory: [],
  slaDeadlines: { acknowledge: '1h', resolve: '8h' },
};

jest.mock('../models/Escalation', () => ({
  find: jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue([mockEscalation]),
  }),
  findById: jest.fn().mockResolvedValue(mockEscalation),
  create: jest.fn().mockResolvedValue(mockEscalation),
  findByIdAndUpdate: jest.fn().mockResolvedValue({ ...mockEscalation, status: 'acknowledged' }),
}));

// ─── Module 8: BroadcastMessage ───────────────────────────────────────────────
const mockBroadcast = {
  _id: 'bcast1',
  targetAudience: 'all',
  channels: ['sms'],
  bodyAr: 'إعلان هام',
  status: 'draft',
  totalRecipients: 0,
};

jest.mock('../models/BroadcastMessage', () => ({
  find: jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue([mockBroadcast]),
  }),
  findById: jest.fn().mockResolvedValue(mockBroadcast),
  create: jest.fn().mockResolvedValue(mockBroadcast),
  findByIdAndUpdate: jest.fn().mockResolvedValue({ ...mockBroadcast, status: 'approved' }),
}));

// ─── Module 9: DocumentVersion ────────────────────────────────────────────────
jest.mock('../models/DocumentVersion', () => ({
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockResolvedValue([]),
  }),
  create: jest.fn().mockResolvedValue({ _id: 'v1', versionNumber: 1 }),
}));

// ─── Module 9: DocumentSignature ─────────────────────────────────────────────
jest.mock('../models/DocumentSignature', () => ({
  find: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue({ _id: 'sig1', status: 'pending', signOrder: 1 }),
  create: jest.fn().mockResolvedValue({ _id: 'sig1', status: 'pending' }),
  findByIdAndUpdate: jest.fn().mockResolvedValue({ _id: 'sig1', status: 'signed' }),
  findOne: jest.fn().mockResolvedValue(null),
}));

// ─── Module 9: DocumentShare ──────────────────────────────────────────────────
jest.mock('../models/DocumentShare', () => ({
  create: jest.fn().mockResolvedValue({ _id: 'share1', shareToken: 'abc123' }),
  findOne: jest.fn().mockResolvedValue(null),
  findByIdAndUpdate: jest.fn().mockResolvedValue({ _id: 'share1', isActive: false }),
}));

// ─── Module 9: DocumentAccessLog ─────────────────────────────────────────────
jest.mock('../models/DocumentAccessLog', () => ({
  find: jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  }),
  create: jest.fn().mockResolvedValue({ _id: 'log1' }),
}));

// ─── Module 10: Branch ────────────────────────────────────────────────────────
const mockBranch = {
  _id: 'br1',
  code: 'BR-001',
  nameAr: 'الفرع الرئيسي',
  nameEn: 'Main Branch',
  isActive: true,
  capacity: 80,
  currentBeneficiaries: 45,
};

jest.mock('../models/Branch', () => ({
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue([mockBranch]),
  }),
  findById: jest.fn().mockResolvedValue(mockBranch),
  create: jest.fn().mockResolvedValue(mockBranch),
  findByIdAndUpdate: jest.fn().mockResolvedValue(mockBranch),
}));

// ─── Module 10: BranchSetting ─────────────────────────────────────────────────
jest.mock('../models/BranchSetting', () => ({
  find: jest.fn().mockResolvedValue([]),
  findOneAndUpdate: jest.fn().mockResolvedValue({ key: 'appointment_slot_duration', value: '45' }),
  create: jest.fn().mockResolvedValue({}),
  insertMany: jest.fn().mockResolvedValue([]),
}));

// ─── Module 10: Room ──────────────────────────────────────────────────────────
const mockRoom = {
  _id: 'room1',
  code: 'R-001',
  nameAr: 'غرفة العلاج',
  type: 'therapy',
  branchId: 'br1',
};
jest.mock('../models/Room', () => ({
  find: jest.fn().mockResolvedValue([mockRoom]),
  create: jest.fn().mockResolvedValue(mockRoom),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockRoom),
}));

// ─── Module 10: BranchService ─────────────────────────────────────────────────
jest.mock('../models/BranchService', () => ({
  find: jest.fn().mockResolvedValue([]),
  findOneAndUpdate: jest.fn().mockResolvedValue({ serviceCode: 'pt', price: 150 }),
}));

// ─── Module 10: BeneficiaryTransfer ──────────────────────────────────────────
const mockTransfer = {
  _id: 'tr1',
  beneficiaryId: 'ben1',
  fromBranchId: 'br1',
  toBranchId: 'br2',
  status: 'pending',
};
jest.mock('../models/BeneficiaryTransfer', () => ({
  find: jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue([mockTransfer]),
  }),
  findById: jest.fn().mockResolvedValue(mockTransfer),
  create: jest.fn().mockResolvedValue(mockTransfer),
  findByIdAndUpdate: jest.fn().mockResolvedValue({ ...mockTransfer, status: 'approved' }),
}));

// ─── Module 11: InventoryItem ─────────────────────────────────────────────────
const mockItem = {
  _id: 'item1',
  sku: 'ITM-0001',
  nameAr: 'كرسي متحرك',
  type: 'assistive_device',
  reorderPoint: 5,
};
jest.mock('../models/InventoryItem', () => ({
  InventoryItem: {
    find: jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([mockItem]),
    }),
    findById: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockItem),
    }),
    create: jest.fn().mockResolvedValue(mockItem),
    findByIdAndUpdate: jest.fn().mockResolvedValue(mockItem),
    countDocuments: jest.fn().mockResolvedValue(1),
  },
  ItemCategory: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }),
    create: jest.fn().mockResolvedValue({ _id: 'cat1', nameAr: 'أجهزة مساعدة' }),
  },
}));

// ─── Module 11: InventoryStock ────────────────────────────────────────────────
jest.mock('../models/InventoryStock', () => ({
  InventoryStock: {
    find: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([]) }),
    findOne: jest.fn().mockResolvedValue({ quantityOnHand: 50, quantityReserved: 0 }),
    findOneAndUpdate: jest.fn().mockResolvedValue({ quantityOnHand: 100 }),
    create: jest.fn().mockResolvedValue({}),
  },
  InventoryTransaction: {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    }),
    create: jest.fn().mockResolvedValue({ _id: 'tx1', transactionType: 'receive', quantity: 50 }),
  },
  Supplier: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }),
    create: jest.fn().mockResolvedValue({ _id: 'sup1', nameAr: 'مورد الأجهزة' }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
  PurchaseOrder: {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    }),
    findById: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'po1', status: 'draft' }),
    }),
    create: jest.fn().mockResolvedValue({ _id: 'po1', poNumber: 'PO-2024-0001' }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({ status: 'approved' }),
  },
  Asset: {
    find: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([]) }),
    findById: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'ast1',
        purchaseCost: 50000,
        salvageValue: 5000,
        usefulLifeYears: 5,
        purchaseDate: new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000),
      }),
    }),
    create: jest.fn().mockResolvedValue({ _id: 'ast1' }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
  StockCount: {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    }),
    findById: jest.fn().mockResolvedValue({ _id: 'sc1', status: 'in_progress', items: [] }),
    create: jest.fn().mockResolvedValue({ _id: 'sc1', countNumber: 'SC-2024-001' }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({ status: 'approved' }),
  },
}));

// ─── Module 11: Warehouse ──────────────────────────────────────────────────────
jest.mock('../models/Warehouse', () => ({
  find: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([]) }),
  create: jest.fn().mockResolvedValue({ _id: 'wh1', code: 'WH-001' }),
}));

// ─── Module 12: QualityModels ─────────────────────────────────────────────────
const mockIncident = {
  _id: 'inc1',
  incidentNumber: 'INC-2024-0001',
  type: 'fall',
  severity: 'minor',
  category: 'patient_safety',
  status: 'reported',
  branchId: 'br1',
};
const mockRisk = {
  _id: 'risk1',
  likelihood: 3,
  impact: 3,
  riskScore: 9,
  riskLevel: 'medium',
  status: 'open',
};

jest.mock('../models/QualityModels', () => ({
  QualityStandard: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }),
    create: jest.fn().mockResolvedValue({ _id: 'std1', code: 'CBAHI-2.1' }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
  Checklist: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }),
    create: jest.fn().mockResolvedValue({ _id: 'cl1', titleAr: 'قائمة فحص يومية' }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
  ChecklistSubmission: {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    }),
    create: jest.fn().mockResolvedValue({ _id: 'sub1', complianceRate: 95 }),
  },
  Incident: {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([mockIncident]),
    }),
    findById: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockIncident),
    }),
    create: jest.fn().mockResolvedValue(mockIncident),
    findByIdAndUpdate: jest.fn().mockResolvedValue({ ...mockIncident, status: 'closed' }),
  },
  Complaint: {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    }),
    findById: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'cmp1', status: 'open' }),
    }),
    create: jest.fn().mockResolvedValue({ _id: 'cmp1' }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({ status: 'resolved' }),
  },
  SatisfactionSurvey: {
    find: jest
      .fn()
      .mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }),
    create: jest.fn().mockResolvedValue({ _id: 'srv1', npsScore: 9 }),
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue([]),
  },
  Audit: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }),
    findById: jest.fn().mockResolvedValue({ _id: 'aud1' }),
    create: jest.fn().mockResolvedValue({ _id: 'aud1', auditNumber: 'AUD-2024-001' }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
  ImprovementProject: {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    }),
    findById: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue({}) }),
    create: jest.fn().mockResolvedValue({ _id: 'prj1', currentPhase: 'plan' }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({ currentPhase: 'do' }),
  },
  Risk: {
    find: jest
      .fn()
      .mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockRisk]),
      }),
    findById: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(mockRisk) }),
    create: jest.fn().mockResolvedValue(mockRisk),
    findByIdAndUpdate: jest.fn().mockResolvedValue(mockRisk),
  },
}));

// ─── Mock Services ─────────────────────────────────────────────────────────────
jest.mock('../services/notifications/notification-enhanced.service', () =>
  jest.fn().mockImplementation(() => ({
    sendFromTemplate: jest.fn().mockResolvedValue(true),
    sendBroadcast: jest.fn().mockResolvedValue(true),
    escalate: jest.fn().mockResolvedValue({ _id: 'esc1' }),
    autoEscalate: jest.fn().mockResolvedValue(true),
  }))
);

jest.mock('../services/documents/document-enhanced.service', () =>
  jest.fn().mockImplementation(() => ({
    submitChecklist: jest.fn().mockResolvedValue({ complianceRate: 95 }),
    applyRetentionPolicies: jest.fn().mockResolvedValue(5),
  }))
);

jest.mock('../services/branches/branch-enhanced.service', () =>
  jest.fn().mockImplementation(() => ({
    initializeSettings: jest.fn().mockResolvedValue(true),
    compareBranches: jest.fn().mockResolvedValue([
      {
        branchId: 'br1',
        branchName: 'الفرع الرئيسي',
        totalBeneficiaries: 45,
        occupancyRate: 56.3,
        totalRevenue: 150000,
        attendanceRate: 88.5,
        collectionRate: 92.1,
        saudizationRate: 35.0,
        npsScore: 42.0,
      },
    ]),
    createRoom: jest.fn().mockResolvedValue(mockRoom),
    upsertBranchService: jest.fn().mockResolvedValue({ serviceCode: 'pt' }),
    completeBeneficiaryTransfer: jest.fn().mockResolvedValue(true),
  }))
);

jest.mock('../services/inventory/inventory-enhanced.service', () =>
  jest.fn().mockImplementation(() => ({
    receive: jest.fn().mockResolvedValue({ _id: 'tx1', quantity: 50, transactionType: 'receive' }),
    issue: jest.fn().mockResolvedValue({ _id: 'tx2', quantity: -10, transactionType: 'issue' }),
    transfer: jest.fn().mockResolvedValue([{}, {}]),
    adjust: jest.fn().mockResolvedValue({ _id: 'tx3', transactionType: 'adjust' }),
    getReorderAlerts: jest.fn().mockResolvedValue([{ itemId: 'item1', shortage: 15 }]),
    getExpiringItems: jest.fn().mockResolvedValue([]),
    createPurchaseOrder: jest.fn().mockResolvedValue({ _id: 'po1', poNumber: 'PO-2024-0001' }),
    receiveGoods: jest.fn().mockResolvedValue({ received: 2 }),
    calculateDepreciation: jest.fn().mockReturnValue({
      annualDepreciation: 9000,
      accumulatedDepreciation: 18000,
      currentBookValue: 32000,
    }),
    initiateStockCount: jest.fn().mockResolvedValue({ _id: 'sc1' }),
    recordStockCount: jest.fn().mockResolvedValue({ counted: true }),
    approveStockCount: jest.fn().mockResolvedValue({ status: 'approved' }),
  }))
);

jest.mock('../services/quality/quality-enhanced.service', () =>
  jest.fn().mockImplementation(() => ({
    getQualityDashboard: jest.fn().mockResolvedValue({
      nps: { nps: 42, promoters: 5, detractors: 2, total: 10 },
      incidents: { total: 3, open: 1 },
      complaints: { total: 2, open: 1, avgResolutionHours: 24 },
      compliance: { overallRate: 95 },
      risks: { total: 5, critical: 1, high: 2 },
      improvements: { active: 2, completedThisPeriod: 1 },
    }),
    submitChecklist: jest.fn().mockResolvedValue({ complianceRate: 95 }),
    reportIncident: jest.fn().mockResolvedValue(mockIncident),
    performFiveWhyAnalysis: jest.fn().mockResolvedValue(true),
    createComplaint: jest.fn().mockResolvedValue({ _id: 'cmp1' }),
    resolveComplaint: jest.fn().mockResolvedValue({ status: 'resolved' }),
    calculateNps: jest.fn().mockResolvedValue({ nps: 42, promoters: 5, detractors: 2, total: 10 }),
    assessRiskLevel: jest.fn().mockImplementation((l, i) => {
      const score = l * i;
      if (score >= 17) return 'critical';
      if (score >= 10) return 'high';
      if (score >= 5) return 'medium';
      return 'low';
    }),
    generateAuditNumber: jest.fn().mockResolvedValue('AUD-2024-001'),
    generateProjectNumber: jest.fn().mockResolvedValue('PRJ-2024-001'),
    generateRiskNumber: jest.fn().mockResolvedValue('RSK-2024-001'),
  }))
);

// ─── Express App Setup ─────────────────────────────────────────────────────────
const express = require('express');
const app = express();
app.use(express.json());

const notificationRoutes = require('../routes/notification-enhanced.routes');
const documentRoutes = require('../routes/document-enhanced.routes');
const branchRoutes = require('../routes/branch-enhanced.routes');
const inventoryRoutes = require('../routes/inventory-enhanced.routes');
const qualityRoutes = require('../routes/quality-enhanced.routes');

app.use('/api/communication/notifications', notificationRoutes);
app.use('/api/documents-enhanced', documentRoutes);
app.use('/api/branches-enhanced', branchRoutes);
app.use('/api/inventory-enhanced', inventoryRoutes);
app.use('/api/quality-enhanced', qualityRoutes);

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 8: COMMUNICATION & NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

describe('Module 8: Communication & Notifications', () => {
  describe('Notification Templates', () => {
    it('GET /templates — يرجع قائمة القوالب', async () => {
      const res = await request(app).get('/api/communication/notifications/templates');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /templates — ينشئ قالب جديد', async () => {
      const res = await request(app)
        .post('/api/communication/notifications/templates')
        .send({
          code: 'test_template',
          nameAr: 'قالب اختبار',
          category: 'appointment',
          channels: ['database'],
          bodyAr: 'نص القالب',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('PUT /templates/:id — يحدث قالبًا موجودًا', async () => {
      const res = await request(app)
        .put('/api/communication/notifications/templates/tmpl1')
        .send({ isActive: false });
      expect(res.status).toBe(200);
    });
  });

  describe('Escalations', () => {
    it('GET /escalations — يرجع قائمة التصعيدات', async () => {
      const res = await request(app).get('/api/communication/notifications/escalations');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /escalations — ينشئ تصعيدًا جديدًا', async () => {
      const res = await request(app).post('/api/communication/notifications/escalations').send({
        type: 'complaint',
        priority: 'high',
        description: 'شكوى عاجلة',
        branchId: 'br1',
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
    });

    it('PUT /escalations/:id/acknowledge — يُقرّ بالتصعيد', async () => {
      const res = await request(app)
        .put('/api/communication/notifications/escalations/esc1/acknowledge')
        .send();
      expect(res.status).toBe(200);
    });
  });

  describe('Broadcasts', () => {
    it('GET /broadcasts — يرجع الرسائل الجماعية', async () => {
      const res = await request(app).get('/api/communication/notifications/broadcasts');
      expect(res.status).toBe(200);
    });

    it('POST /broadcasts — ينشئ رسالة جماعية', async () => {
      const res = await request(app)
        .post('/api/communication/notifications/broadcasts')
        .send({
          targetAudience: 'all',
          channels: ['sms'],
          bodyAr: 'إعلان هام',
        });
      expect(res.status).toBe(201);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 10: BRANCH MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

describe('Module 10: Branch Management', () => {
  describe('Branches CRUD', () => {
    it('GET /branches-enhanced — يرجع قائمة الفروع', async () => {
      const res = await request(app).get('/api/branches-enhanced');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /branches-enhanced — ينشئ فرعًا جديدًا مع الإعدادات الافتراضية', async () => {
      const res = await request(app).post('/api/branches-enhanced').send({
        nameAr: 'فرع الرياض الشمالي',
        nameEn: 'North Riyadh Branch',
        phone: '0112345678',
        email: 'north@rehab.sa',
        capacity: 80,
      });
      expect(res.status).toBe(201);
    });

    it('GET /branches-enhanced/compare — يقارن أداء الفروع', async () => {
      const res = await request(app)
        .get('/api/branches-enhanced/compare')
        .query({ branch_ids: ['br1', 'br2'], period: 'month' });
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0]).toHaveProperty('occupancyRate');
    });

    it('GET /branches-enhanced/:id/dashboard — يرجع لوحة الفرع', async () => {
      const res = await request(app).get('/api/branches-enhanced/br1/dashboard');
      expect(res.status).toBe(200);
    });
  });

  describe('Branch Settings', () => {
    it('GET /:id/settings — يرجع إعدادات الفرع', async () => {
      const res = await request(app).get('/api/branches-enhanced/br1/settings');
      expect(res.status).toBe(200);
    });

    it('PUT /:id/settings — يحدث إعدادات الفرع', async () => {
      const res = await request(app)
        .put('/api/branches-enhanced/br1/settings')
        .send({
          settings: [{ key: 'appointment_slot_duration', value: '60' }],
        });
      expect(res.status).toBe(200);
    });
  });

  describe('Branch Rooms', () => {
    it('GET /:id/rooms — يرجع غرف الفرع', async () => {
      const res = await request(app).get('/api/branches-enhanced/br1/rooms');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('POST /:id/rooms — يضيف غرفة للفرع', async () => {
      const res = await request(app).post('/api/branches-enhanced/br1/rooms').send({
        code: 'R-002',
        nameAr: 'غرفة العلاج الوظيفي',
        type: 'therapy',
        capacity: 4,
      });
      expect(res.status).toBe(201);
    });
  });

  describe('Beneficiary Transfers', () => {
    it('GET /transfers — يرجع طلبات النقل', async () => {
      const res = await request(app).get('/api/branches-enhanced/transfers');
      expect(res.status).toBe(200);
    });

    it('POST /transfers — ينشئ طلب نقل مستفيد', async () => {
      const res = await request(app).post('/api/branches-enhanced/transfers').send({
        beneficiaryId: 'ben1',
        fromBranchId: 'br1',
        toBranchId: 'br2',
        reason: 'قرب السكن',
        transferDate: new Date().toISOString(),
      });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');
    });

    it('PUT /transfers/:id/approve — يوافق على طلب النقل', async () => {
      const res = await request(app).put('/api/branches-enhanced/transfers/tr1/approve').send();
      expect(res.status).toBe(200);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 11: INVENTORY
// ══════════════════════════════════════════════════════════════════════════════

describe('Module 11: Inventory', () => {
  describe('Items', () => {
    it('GET /items — يرجع قائمة الأصناف', async () => {
      const res = await request(app).get('/api/inventory-enhanced/items');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /items — يضيف صنفًا جديدًا', async () => {
      const res = await request(app).post('/api/inventory-enhanced/items').send({
        nameAr: 'كرسي متحرك كهربائي',
        type: 'assistive_device',
        unit: 'piece',
        reorderPoint: 2,
      });
      expect(res.status).toBe(201);
    });
  });

  describe('Inventory Transactions', () => {
    it('POST /transactions/receive — يستلم بضاعة', async () => {
      const res = await request(app).post('/api/inventory-enhanced/transactions/receive').send({
        itemId: 'item1',
        warehouseId: 'wh1',
        quantity: 50,
        unitCost: 25.0,
        reason: 'استلام أولي',
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
    });

    it('POST /transactions/issue — يصرف من المخزون', async () => {
      const res = await request(app).post('/api/inventory-enhanced/transactions/issue').send({
        itemId: 'item1',
        warehouseId: 'wh1',
        quantity: 10,
        reason: 'صرف للمستفيد',
      });
      expect(res.status).toBe(201);
    });

    it('POST /transactions/transfer — يحوّل بين المستودعات', async () => {
      const res = await request(app).post('/api/inventory-enhanced/transactions/transfer').send({
        itemId: 'item1',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20,
        reason: 'توزيع',
      });
      expect(res.status).toBe(201);
    });
  });

  describe('Reorder Alerts', () => {
    it('GET /alerts/reorder — يرجع تنبيهات إعادة الطلب', async () => {
      const res = await request(app).get('/api/inventory-enhanced/alerts/reorder');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0]).toHaveProperty('shortage');
    });
  });

  describe('Assets & Depreciation', () => {
    it('POST /assets — يضيف أصلًا ثابتًا', async () => {
      const res = await request(app).post('/api/inventory-enhanced/assets').send({
        nameAr: 'جهاز علاج طبيعي',
        category: 'medical_equipment',
        purchaseCost: 50000,
        purchaseDate: '2022-01-01',
        usefulLifeYears: 5,
        salvageValue: 5000,
      });
      expect(res.status).toBe(201);
    });

    it('GET /assets/:id/depreciation — يحسب الإهلاك بالقسط الثابت', async () => {
      const res = await request(app).get('/api/inventory-enhanced/assets/ast1/depreciation');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('annualDepreciation');
      expect(res.body.data.annualDepreciation).toBe(9000);
    });
  });

  describe('Stock Counts', () => {
    it('POST /stock-counts — يبدأ جرد دوري', async () => {
      const res = await request(app).post('/api/inventory-enhanced/stock-counts').send({
        warehouseId: 'wh1',
        type: 'full',
      });
      expect(res.status).toBe(201);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 12: QUALITY & COMPLIANCE
// ══════════════════════════════════════════════════════════════════════════════

describe('Module 12: Quality & Compliance', () => {
  describe('Quality Dashboard', () => {
    it('GET /dashboard/:branchId — يرجع لوحة مؤشرات الجودة', async () => {
      const res = await request(app).get('/api/quality-enhanced/dashboard/br1');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('nps');
      expect(res.body.data).toHaveProperty('incidents');
      expect(res.body.data).toHaveProperty('complaints');
      expect(res.body.data).toHaveProperty('risks');
    });
  });

  describe('Incidents', () => {
    it('GET /incidents — يرجع قائمة الحوادث', async () => {
      const res = await request(app).get('/api/quality-enhanced/incidents');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('POST /incidents — يسجّل حادثة جديدة', async () => {
      const res = await request(app).post('/api/quality-enhanced/incidents').send({
        branchId: 'br1',
        type: 'fall',
        severity: 'minor',
        occurredAt: new Date().toISOString(),
        location: 'غرفة العلاج',
        description: 'انزلاق مستفيد',
        category: 'patient_safety',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.incidentNumber).toBeDefined();
    });

    it('POST /incidents/:id/rca — يضيف تحليل السبب الجذري', async () => {
      const res = await request(app)
        .post('/api/quality-enhanced/incidents/inc1/rca')
        .send({
          whys: [
            { why: 'لماذا سقط المريض؟', answer: 'لأن الأرضية كانت مبللة' },
            { why: 'لماذا كانت مبللة؟', answer: 'لأن التنظيف لم يجفّ' },
          ],
        });
      expect(res.status).toBe(200);
    });

    it('PUT /incidents/:id/close — يغلق الحادثة', async () => {
      const res = await request(app)
        .put('/api/quality-enhanced/incidents/inc1/close')
        .send({ notes: 'تم اتخاذ الإجراءات التصحيحية' });
      expect(res.status).toBe(200);
    });
  });

  describe('NPS & Satisfaction Surveys', () => {
    it('POST /surveys — يحفظ استبيان رضا بدون مصادقة', async () => {
      const res = await request(app).post('/api/quality-enhanced/surveys').send({
        branchId: 'br1',
        npsScore: 9,
        surveyType: 'general',
      });
      expect(res.status).toBe(201);
    });

    it('GET /surveys/nps/:branchId — يحسب NPS للفرع', async () => {
      const res = await request(app).get('/api/quality-enhanced/surveys/nps/br1');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('nps');
    });
  });

  describe('Risk Matrix', () => {
    it('POST /risks — يضيف مخاطرة مع تقييم تلقائي للمستوى', async () => {
      const res = await request(app).post('/api/quality-enhanced/risks').send({
        branchId: 'br1',
        category: 'clinical',
        title: 'خطر سقوط المستفيدين',
        description: 'احتمال سقوط المستفيدين في المجاهر',
        likelihood: 3,
        impact: 3,
      });
      expect(res.status).toBe(201);
      expect(res.body.data.riskLevel).toBe('medium');
    });

    it('GET /risks/matrix/:branchId — يرجع مصفوفة المخاطر', async () => {
      const res = await request(app).get('/api/quality-enhanced/risks/matrix/br1');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('matrix');
    });
  });

  describe('Complaints', () => {
    it('POST /complaints — يسجل شكوى جديدة', async () => {
      const res = await request(app).post('/api/quality-enhanced/complaints').send({
        branchId: 'br1',
        source: 'guardian',
        category: 'service_quality',
        description: 'طول وقت الانتظار',
      });
      expect(res.status).toBe(201);
    });

    it('PUT /complaints/:id/resolve — يحل الشكوى', async () => {
      const res = await request(app)
        .put('/api/quality-enhanced/complaints/cmp1/resolve')
        .send({ resolution: 'تم تقليل وقت الانتظار' });
      expect(res.status).toBe(200);
    });
  });

  describe('PDCA Improvement Projects', () => {
    it('POST /improvements — ينشئ مشروع تحسين PDCA', async () => {
      const res = await request(app)
        .post('/api/quality-enhanced/improvements')
        .send({
          branchId: 'br1',
          titleAr: 'تحسين معدل الحضور',
          problemStatement: 'انخفاض معدل الحضور إلى 75%',
          objective: 'رفع معدل الحضور إلى 90%',
          startDate: new Date().toISOString(),
          targetEndDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
        });
      expect(res.status).toBe(201);
    });

    it('PUT /improvements/:id/phase — يحدث مرحلة PDCA', async () => {
      const res = await request(app)
        .put('/api/quality-enhanced/improvements/prj1/phase')
        .send({ phase: 'do', data: { interventions: [{ action: 'إرسال تذكيرات' }] } });
      expect(res.status).toBe(200);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS: Services Logic
// ══════════════════════════════════════════════════════════════════════════════

describe('Unit Tests: Service Logic', () => {
  describe('QualityEnhancedService.assessRiskLevel()', () => {
    const QualityEnhancedService = require('../services/quality/quality-enhanced.service');
    const svc = new QualityEnhancedService();

    it('يصنّف الخطر الحرج عند 5×5=25', () => {
      expect(svc.assessRiskLevel(5, 5)).toBe('critical');
    });

    it('يصنّف الخطر العالي عند 4×3=12', () => {
      expect(svc.assessRiskLevel(4, 3)).toBe('high');
    });

    it('يصنّف الخطر المتوسط عند 3×2=6', () => {
      expect(svc.assessRiskLevel(3, 2)).toBe('medium');
    });

    it('يصنّف الخطر المنخفض عند 1×2=2', () => {
      expect(svc.assessRiskLevel(1, 2)).toBe('low');
    });
  });

  describe('InventoryEnhancedService.calculateDepreciation()', () => {
    const InventoryEnhancedService = require('../services/inventory/inventory-enhanced.service');
    const svc = new InventoryEnhancedService();

    it('يحسب الإهلاك السنوي بشكل صحيح', () => {
      const asset = {
        purchaseCost: 50000,
        salvageValue: 5000,
        usefulLifeYears: 5,
        purchaseDate: new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000),
      };
      const result = svc.calculateDepreciation(asset);
      expect(result.annualDepreciation).toBe(9000);
    });
  });
});

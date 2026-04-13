 
/**
 * 📦 خدمة العمليات والأصول — Operations & Assets Service
 * AlAwael ERP — Unified Frontend Service
 * Covers: Inventory, Purchasing, Equipment, InternalAudit, Incidents, Licenses
 */
import apiClient from './api.client';
import logger from 'utils/logger';

const safe =
  fn =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      logger.warn('operationsService fallback:', e.message);
      return null;
    }
  };

// ═══════════════════════════════════════════
// 1. INVENTORY — المخزون
// ═══════════════════════════════════════════
export const inventoryService = {
  getProducts: safe(async (params = {}) => {
    const r = await apiClient.get('/inventory/products', { params });
    return r.data;
  }),
  getProduct: safe(async id => {
    const r = await apiClient.get(`/inventory/products/${id}`);
    return r.data;
  }),
  createProduct: safe(async data => {
    const r = await apiClient.post('/inventory/products', data);
    return r.data;
  }),
  updateProduct: safe(async (id, data) => {
    const r = await apiClient.put(`/inventory/products/${id}`, data);
    return r.data;
  }),
  deleteProduct: safe(async id => {
    const r = await apiClient.delete(`/inventory/products/${id}`);
    return r.data;
  }),

  getCategories: safe(async () => {
    const r = await apiClient.get('/inventory/categories');
    return r.data;
  }),
  createCategory: safe(async data => {
    const r = await apiClient.post('/inventory/categories', data);
    return r.data;
  }),

  getWarehouses: safe(async () => {
    const r = await apiClient.get('/inventory/warehouses');
    return r.data;
  }),
  createWarehouse: safe(async data => {
    const r = await apiClient.post('/inventory/warehouses', data);
    return r.data;
  }),

  getMovements: safe(async (params = {}) => {
    const r = await apiClient.get('/inventory/movements', { params });
    return r.data;
  }),
  createMovement: safe(async data => {
    const r = await apiClient.post('/inventory/movements', data);
    return r.data;
  }),

  getStockAlerts: safe(async () => {
    const r = await apiClient.get('/inventory/alerts');
    return r.data;
  }),
  getStats: safe(async () => {
    const r = await apiClient.get('/inventory/stats');
    return r.data;
  }),

  // Mock data
  getMockProducts: () => MOCK_PRODUCTS,
  getMockStats: () => MOCK_INV_STATS,
};

// ═══════════════════════════════════════════
// 2. PURCHASING — المشتريات
// ═══════════════════════════════════════════
export const purchasingService = {
  getVendors: safe(async (params = {}) => {
    const r = await apiClient.get('/purchasing/vendors', { params });
    return r.data;
  }),
  getVendor: safe(async id => {
    const r = await apiClient.get(`/purchasing/vendors/${id}`);
    return r.data;
  }),
  createVendor: safe(async data => {
    const r = await apiClient.post('/purchasing/vendors', data);
    return r.data;
  }),
  updateVendor: safe(async (id, data) => {
    const r = await apiClient.put(`/purchasing/vendors/${id}`, data);
    return r.data;
  }),

  getPurchaseRequests: safe(async (params = {}) => {
    const r = await apiClient.get('/purchasing/requests', { params });
    return r.data;
  }),
  createPurchaseRequest: safe(async data => {
    const r = await apiClient.post('/purchasing/requests', data);
    return r.data;
  }),
  approvePR: safe(async id => {
    const r = await apiClient.patch(`/purchasing/requests/${id}/approve`);
    return r.data;
  }),

  getPurchaseOrders: safe(async (params = {}) => {
    const r = await apiClient.get('/purchasing/orders', { params });
    return r.data;
  }),
  createPurchaseOrder: safe(async data => {
    const r = await apiClient.post('/purchasing/orders', data);
    return r.data;
  }),
  approvePO: safe(async id => {
    const r = await apiClient.patch(`/purchasing/orders/${id}/approve`);
    return r.data;
  }),
  receivePO: safe(async (id, data) => {
    const r = await apiClient.patch(`/purchasing/orders/${id}/receive`, data);
    return r.data;
  }),

  getStats: safe(async () => {
    const r = await apiClient.get('/purchasing/stats');
    return r.data;
  }),

  getMockVendors: () => MOCK_VENDORS,
  getMockPOs: () => MOCK_PURCHASE_ORDERS,
  getMockStats: () => MOCK_PUR_STATS,
};

// ═══════════════════════════════════════════
// 3. EQUIPMENT — المعدات
// ═══════════════════════════════════════════
export const equipmentService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/equipment', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/equipment/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/equipment', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/equipment/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/equipment/${id}`);
    return r.data;
  }),

  getMaintenance: safe(async id => {
    const r = await apiClient.get(`/equipment/${id}/maintenance`);
    return r.data;
  }),
  scheduleMaintenance: safe(async (id, data) => {
    const r = await apiClient.post(`/equipment/${id}/maintenance`, data);
    return r.data;
  }),

  getStats: safe(async () => {
    const r = await apiClient.get('/equipment/stats');
    return r.data;
  }),

  getMockEquipment: () => MOCK_EQUIPMENT,
  getMockStats: () => MOCK_EQ_STATS,
};

// ═══════════════════════════════════════════
// 4. INTERNAL AUDIT — التدقيق الداخلي
// ═══════════════════════════════════════════
export const auditService = {
  getPlans: safe(async (params = {}) => {
    const r = await apiClient.get('/internal-audit/audit-plans', { params });
    return r.data;
  }),
  createPlan: safe(async data => {
    const r = await apiClient.post('/internal-audit/audit-plans', data);
    return r.data;
  }),
  updatePlan: safe(async (id, data) => {
    const r = await apiClient.put(`/internal-audit/audit-plans/${id}`, data);
    return r.data;
  }),

  getNCRs: safe(async (params = {}) => {
    const r = await apiClient.get('/internal-audit/ncrs', { params });
    return r.data;
  }),
  createNCR: safe(async data => {
    const r = await apiClient.post('/internal-audit/ncrs', data);
    return r.data;
  }),

  getCAPAs: safe(async (params = {}) => {
    const r = await apiClient.get('/internal-audit/capas', { params });
    return r.data;
  }),
  createCAPA: safe(async data => {
    const r = await apiClient.post('/internal-audit/capas', data);
    return r.data;
  }),

  getSurpriseAudits: safe(async () => {
    const r = await apiClient.get('/internal-audit/surprise-audits');
    return r.data;
  }),

  getStats: safe(async () => {
    const r = await apiClient.get('/internal-audit/stats');
    return r.data;
  }),

  getMockPlans: () => MOCK_AUDIT_PLANS,
  getMockNCRs: () => MOCK_NCRS,
  getMockStats: () => MOCK_AUDIT_STATS,
};

// ═══════════════════════════════════════════
// 5. INCIDENTS — الحوادث
// ═══════════════════════════════════════════
export const incidentService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/incidents', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/incidents/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/incidents', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/incidents/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/incidents/${id}`);
    return r.data;
  }),

  updateStatus: safe(async (id, status) => {
    const r = await apiClient.patch(`/incidents/${id}/status`, { status });
    return r.data;
  }),
  assign: safe(async (id, data) => {
    const r = await apiClient.post(`/incidents/${id}/assign`, data);
    return r.data;
  }),
  escalate: safe(async id => {
    const r = await apiClient.post(`/incidents/${id}/escalate`);
    return r.data;
  }),
  resolve: safe(async (id, data) => {
    const r = await apiClient.post(`/incidents/${id}/resolve`, data);
    return r.data;
  }),
  close: safe(async id => {
    const r = await apiClient.post(`/incidents/${id}/close`);
    return r.data;
  }),

  getStatistics: safe(async () => {
    const r = await apiClient.get('/incidents/statistics');
    return r.data;
  }),
  getCritical: safe(async () => {
    const r = await apiClient.get('/incidents/critical');
    return r.data;
  }),

  getMockIncidents: () => MOCK_INCIDENTS,
  getMockStats: () => MOCK_INC_STATS,
};

// ═══════════════════════════════════════════
// 6. LICENSES — الرخص
// ═══════════════════════════════════════════
export const licenseService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/licenses', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/licenses/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/licenses', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/licenses/${id}`, data);
    return r.data;
  }),
  renew: safe(async (id, data) => {
    const r = await apiClient.patch(`/licenses/${id}/renew`, data);
    return r.data;
  }),

  getExpiring: safe(async (days = 30) => {
    const r = await apiClient.get('/licenses', { params: { expiringWithin: days } });
    return r.data;
  }),
  getStats: safe(async () => {
    const r = await apiClient.get('/licenses/stats');
    return r.data;
  }),

  getMockLicenses: () => MOCK_LICENSES,
  getMockStats: () => MOCK_LIC_STATS,
};

// ═══════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════

const MOCK_INV_STATS = {
  totalProducts: 342,
  totalValue: 1254000,
  lowStock: 18,
  outOfStock: 5,
  warehouses: 3,
  categories: 24,
};
const MOCK_PRODUCTS = [
  {
    _id: 'p1',
    sku: 'SKU-001',
    name: 'أقلام حبر جاف',
    category: 'مستلزمات مكتبية',
    currentStock: 450,
    minStock: 100,
    costPrice: 2.5,
    sellingPrice: 5,
    unit: 'قطعة',
    warehouse: 'المستودع الرئيسي',
    isActive: true,
  },
  {
    _id: 'p2',
    sku: 'SKU-002',
    name: 'ورق طباعة A4',
    category: 'مستلزمات مكتبية',
    currentStock: 80,
    minStock: 200,
    costPrice: 18,
    sellingPrice: 25,
    unit: 'رزمة',
    warehouse: 'المستودع الرئيسي',
    isActive: true,
  },
  {
    _id: 'p3',
    sku: 'SKU-003',
    name: 'حبر طابعة HP',
    category: 'مستلزمات طباعة',
    currentStock: 15,
    minStock: 20,
    costPrice: 120,
    sellingPrice: 180,
    unit: 'قطعة',
    warehouse: 'المستودع الرئيسي',
    isActive: true,
  },
  {
    _id: 'p4',
    sku: 'SKU-004',
    name: 'مكيف سبليت 24000 وحدة',
    category: 'أجهزة تكييف',
    currentStock: 3,
    minStock: 2,
    costPrice: 3500,
    sellingPrice: 4500,
    unit: 'قطعة',
    warehouse: 'مستودع المعدات',
    isActive: true,
  },
  {
    _id: 'p5',
    sku: 'SKU-005',
    name: 'طاولة مكتب خشبية',
    category: 'أثاث مكتبي',
    currentStock: 12,
    minStock: 5,
    costPrice: 800,
    sellingPrice: 1200,
    unit: 'قطعة',
    warehouse: 'مستودع الأثاث',
    isActive: true,
  },
  {
    _id: 'p6',
    sku: 'SKU-006',
    name: 'كرسي مكتب دوار',
    category: 'أثاث مكتبي',
    currentStock: 25,
    minStock: 10,
    costPrice: 450,
    sellingPrice: 700,
    unit: 'قطعة',
    warehouse: 'مستودع الأثاث',
    isActive: true,
  },
  {
    _id: 'p7',
    sku: 'SKU-007',
    name: 'لابتوب Dell Latitude',
    category: 'أجهزة إلكترونية',
    currentStock: 5,
    minStock: 3,
    costPrice: 4200,
    sellingPrice: 5500,
    unit: 'قطعة',
    warehouse: 'مستودع تقنية المعلومات',
    isActive: true,
  },
  {
    _id: 'p8',
    sku: 'SKU-008',
    name: 'معقم يدين 500مل',
    category: 'مستلزمات صحية',
    currentStock: 200,
    minStock: 50,
    costPrice: 8,
    sellingPrice: 15,
    unit: 'قطعة',
    warehouse: 'المستودع الرئيسي',
    isActive: true,
  },
];

const MOCK_VENDORS = [
  {
    _id: 'v1',
    vendorNumber: 'VND-001',
    name: 'شركة التوريدات المتكاملة',
    type: 'company',
    email: 'info@supply.com',
    phone: '0112345678',
    city: 'الرياض',
    rating: 5,
    isActive: true,
    paymentTerms: 'net30',
    creditLimit: 500000,
    totalOrders: 45,
    totalAmount: 234000,
  },
  {
    _id: 'v2',
    vendorNumber: 'VND-002',
    name: 'مؤسسة الأثاث الحديث',
    type: 'company',
    email: 'sales@modern.com',
    phone: '0113456789',
    city: 'جدة',
    rating: 4,
    isActive: true,
    paymentTerms: 'net15',
    creditLimit: 200000,
    totalOrders: 23,
    totalAmount: 156000,
  },
  {
    _id: 'v3',
    vendorNumber: 'VND-003',
    name: 'شركة الحلول التقنية',
    type: 'company',
    email: 'info@tech.sa',
    phone: '0114567890',
    city: 'الرياض',
    rating: 5,
    isActive: true,
    paymentTerms: 'net30',
    creditLimit: 1000000,
    totalOrders: 67,
    totalAmount: 890000,
  },
  {
    _id: 'v4',
    vendorNumber: 'VND-004',
    name: 'مؤسسة المستلزمات الطبية',
    type: 'company',
    email: 'order@medical.sa',
    phone: '0115678901',
    city: 'الدمام',
    rating: 4,
    isActive: true,
    paymentTerms: 'net45',
    creditLimit: 300000,
    totalOrders: 31,
    totalAmount: 278000,
  },
  {
    _id: 'v5',
    vendorNumber: 'VND-005',
    name: 'شركة التنظيف والصيانة',
    type: 'company',
    email: 'info@clean.sa',
    phone: '0116789012',
    city: 'الرياض',
    rating: 3,
    isActive: true,
    paymentTerms: 'immediate',
    creditLimit: 50000,
    totalOrders: 12,
    totalAmount: 45000,
  },
];

const MOCK_PURCHASE_ORDERS = [
  {
    _id: 'po1',
    orderNumber: 'PO-2026-001',
    vendor: 'شركة التوريدات المتكاملة',
    date: '2026-03-01',
    deliveryDate: '2026-03-15',
    items: 5,
    totalAmount: 24500,
    status: 'approved',
    department: 'الإدارة',
  },
  {
    _id: 'po2',
    orderNumber: 'PO-2026-002',
    vendor: 'شركة الحلول التقنية',
    date: '2026-03-05',
    deliveryDate: '2026-03-20',
    items: 3,
    totalAmount: 67800,
    status: 'pending',
    department: 'تقنية المعلومات',
  },
  {
    _id: 'po3',
    orderNumber: 'PO-2026-003',
    vendor: 'مؤسسة الأثاث الحديث',
    date: '2026-03-08',
    deliveryDate: '2026-03-25',
    items: 8,
    totalAmount: 45200,
    status: 'received',
    department: 'الموارد البشرية',
  },
  {
    _id: 'po4',
    orderNumber: 'PO-2026-004',
    vendor: 'مؤسسة المستلزمات الطبية',
    date: '2026-03-10',
    deliveryDate: '2026-03-30',
    items: 12,
    totalAmount: 18900,
    status: 'draft',
    department: 'الخدمات الطبية',
  },
  {
    _id: 'po5',
    orderNumber: 'PO-2026-005',
    vendor: 'شركة التنظيف والصيانة',
    date: '2026-03-12',
    deliveryDate: '2026-03-18',
    items: 2,
    totalAmount: 8500,
    status: 'ordered',
    department: 'الصيانة',
  },
];

const MOCK_PUR_STATS = {
  totalOrders: 156,
  totalAmount: 1245000,
  pendingApproval: 12,
  delivered: 98,
  vendors: 42,
  avgDeliveryDays: 8,
};

const MOCK_EQUIPMENT = [
  {
    _id: 'eq1',
    equipmentId: 'EQ-001',
    name: 'مكيف مركزي - المبنى الرئيسي',
    category: 'تكييف',
    status: 'operational',
    department: 'الصيانة',
    location: 'المبنى الرئيسي - الدور 1',
    purchaseDate: '2023-06-15',
    warranty: '2026-06-15',
    value: 45000,
    lastMaintenance: '2026-02-15',
    nextMaintenance: '2026-05-15',
  },
  {
    _id: 'eq2',
    equipmentId: 'EQ-002',
    name: 'طابعة ليزر HP LaserJet',
    category: 'طابعات',
    status: 'operational',
    department: 'تقنية المعلومات',
    location: 'غرفة الطباعة',
    purchaseDate: '2024-01-10',
    warranty: '2027-01-10',
    value: 8500,
    lastMaintenance: '2026-01-10',
    nextMaintenance: '2026-04-10',
  },
  {
    _id: 'eq3',
    equipmentId: 'EQ-003',
    name: 'مولد كهربائي احتياطي',
    category: 'كهرباء',
    status: 'standby',
    department: 'الصيانة',
    location: 'غرفة المولدات',
    purchaseDate: '2022-03-20',
    warranty: '2025-03-20',
    value: 120000,
    lastMaintenance: '2026-03-01',
    nextMaintenance: '2026-06-01',
  },
  {
    _id: 'eq4',
    equipmentId: 'EQ-004',
    name: 'حاسب آلي - معمل 1',
    category: 'حواسيب',
    status: 'operational',
    department: 'تقنية المعلومات',
    location: 'معمل الحاسب 1',
    purchaseDate: '2024-09-01',
    warranty: '2027-09-01',
    value: 4200,
    lastMaintenance: '2025-12-01',
    nextMaintenance: '2026-06-01',
  },
  {
    _id: 'eq5',
    equipmentId: 'EQ-005',
    name: 'كاميرا مراقبة IP',
    category: 'أمن',
    status: 'maintenance',
    department: 'الأمن',
    location: 'البوابة الرئيسية',
    purchaseDate: '2023-11-20',
    warranty: '2026-11-20',
    value: 3500,
    lastMaintenance: '2026-03-10',
    nextMaintenance: '2026-03-25',
  },
  {
    _id: 'eq6',
    equipmentId: 'EQ-006',
    name: 'مصعد كهربائي',
    category: 'مصاعد',
    status: 'operational',
    department: 'الصيانة',
    location: 'المبنى الرئيسي',
    purchaseDate: '2021-07-01',
    warranty: '2031-07-01',
    value: 250000,
    lastMaintenance: '2026-02-01',
    nextMaintenance: '2026-05-01',
  },
];

const MOCK_EQ_STATS = {
  total: 186,
  operational: 156,
  maintenance: 12,
  standby: 10,
  retired: 8,
  totalValue: 4520000,
  upcomingMaintenance: 14,
};

const MOCK_AUDIT_PLANS = [
  {
    _id: 'ap1',
    planId: 'AP-2026-001',
    title: 'تدقيق المالية Q1 2026',
    year: 2026,
    department: 'المالية',
    type: 'financial',
    status: 'in_progress',
    startDate: '2026-01-15',
    endDate: '2026-03-30',
    auditor: 'أحمد الشهري',
    findings: 3,
    score: 85,
  },
  {
    _id: 'ap2',
    planId: 'AP-2026-002',
    title: 'تدقيق الموارد البشرية',
    year: 2026,
    department: 'الموارد البشرية',
    type: 'compliance',
    status: 'completed',
    startDate: '2026-01-01',
    endDate: '2026-02-28',
    auditor: 'فهد العتيبي',
    findings: 5,
    score: 78,
  },
  {
    _id: 'ap3',
    planId: 'AP-2026-003',
    title: 'تدقيق أمن المعلومات',
    year: 2026,
    department: 'تقنية المعلومات',
    type: 'operational',
    status: 'planned',
    startDate: '2026-04-01',
    endDate: '2026-05-30',
    auditor: 'سارة القحطاني',
    findings: 0,
    score: null,
  },
  {
    _id: 'ap4',
    planId: 'AP-2026-004',
    title: 'تدقيق السلامة والصحة',
    year: 2026,
    department: 'السلامة',
    type: 'safety',
    status: 'planned',
    startDate: '2026-06-01',
    endDate: '2026-07-30',
    auditor: 'محمد الدوسري',
    findings: 0,
    score: null,
  },
  {
    _id: 'ap5',
    planId: 'AP-2026-005',
    title: 'تفتيش مفاجئ - المخازن',
    year: 2026,
    department: 'المخازن',
    type: 'surprise',
    status: 'completed',
    startDate: '2026-02-15',
    endDate: '2026-02-15',
    auditor: 'عبدالله المالكي',
    findings: 2,
    score: 92,
  },
];

const MOCK_NCRS = [
  {
    _id: 'ncr1',
    ncrId: 'NCR-001',
    title: 'عدم مطابقة وثائق الشراء',
    department: 'المشتريات',
    severity: 'major',
    status: 'open',
    dueDate: '2026-04-15',
    assignee: 'محمد الأحمدي',
  },
  {
    _id: 'ncr2',
    ncrId: 'NCR-002',
    title: 'تأخر في صيانة طفايات الحريق',
    department: 'السلامة',
    severity: 'critical',
    status: 'in_progress',
    dueDate: '2026-03-20',
    assignee: 'علي السبيعي',
  },
  {
    _id: 'ncr3',
    ncrId: 'NCR-003',
    title: 'نقص في التوثيق الإداري',
    department: 'الإدارة',
    severity: 'minor',
    status: 'closed',
    dueDate: '2026-02-28',
    assignee: 'نورة العنزي',
  },
];

const MOCK_AUDIT_STATS = {
  totalPlans: 12,
  completed: 5,
  inProgress: 3,
  planned: 4,
  openNCRs: 8,
  avgScore: 85,
  overdueCAPAs: 2,
};

const MOCK_INCIDENTS = [
  {
    _id: 'inc1',
    incidentNumber: 'INC-2026-001',
    title: 'سقوط موظف في الممر',
    type: 'safety',
    severity: 'high',
    status: 'investigating',
    reportedBy: 'خالد الحربي',
    reportedAt: '2026-03-10T08:30:00',
    location: 'المبنى الرئيسي - الممر',
    assignedTo: 'فريق السلامة',
    description: 'وقوع حادثة سقوط لأحد الموظفين بسبب أرضية مبتلة',
  },
  {
    _id: 'inc2',
    incidentNumber: 'INC-2026-002',
    title: 'تسرب مياه في المخزن',
    type: 'facility',
    severity: 'medium',
    status: 'open',
    reportedBy: 'عمر العمري',
    reportedAt: '2026-03-11T14:20:00',
    location: 'المستودع الرئيسي',
    assignedTo: 'فريق الصيانة',
    description: 'تسرب مياه من السقف يؤثر على البضائع المخزنة',
  },
  {
    _id: 'inc3',
    incidentNumber: 'INC-2026-003',
    title: 'عطل في نظام الإطفاء',
    type: 'fire_safety',
    severity: 'critical',
    status: 'resolved',
    reportedBy: 'أحمد الإبراهيمي',
    reportedAt: '2026-03-08T10:00:00',
    location: 'المبنى الشرقي',
    assignedTo: 'فريق السلامة',
    description: 'عطل في نظام الإطفاء التلقائي في المبنى الشرقي',
  },
  {
    _id: 'inc4',
    incidentNumber: 'INC-2026-004',
    title: 'حادث مروري لمركبة الأسطول',
    type: 'vehicle',
    severity: 'medium',
    status: 'closed',
    reportedBy: 'سعد الدوسري',
    reportedAt: '2026-03-05T16:45:00',
    location: 'طريق الملك فهد',
    assignedTo: 'إدارة الأسطول',
    description: 'اصطدام مركبة الأسطول رقم F-012 بحاجز طريق',
  },
  {
    _id: 'inc5',
    incidentNumber: 'INC-2026-005',
    title: 'انقطاع التيار الكهربائي',
    type: 'facility',
    severity: 'low',
    status: 'open',
    reportedBy: 'يوسف الزهراني',
    reportedAt: '2026-03-12T09:10:00',
    location: 'المبنى الإداري',
    assignedTo: 'فريق الصيانة',
    description: 'انقطاع كهربائي متكرر في الدور الثالث',
  },
];

const MOCK_INC_STATS = {
  total: 47,
  open: 12,
  investigating: 5,
  resolved: 22,
  closed: 8,
  critical: 3,
  avgResolution: '3.2 أيام',
};

const MOCK_LICENSES = [
  {
    _id: 'lic1',
    licenseNumber: 'LIC-001',
    name: 'رخصة بلدية - المبنى الرئيسي',
    licenseType: 'municipal',
    issuer: 'أمانة الرياض',
    issueDate: '2025-06-01',
    expiryDate: '2026-06-01',
    status: 'active',
    cost: 5000,
    renewalCost: 5000,
    department: 'الإدارة',
    responsible: 'خالد المطيري',
  },
  {
    _id: 'lic2',
    licenseNumber: 'LIC-002',
    name: 'رخصة الدفاع المدني',
    licenseType: 'civil_defense',
    issuer: 'الدفاع المدني',
    issueDate: '2025-09-15',
    expiryDate: '2026-09-15',
    status: 'active',
    cost: 3000,
    renewalCost: 3000,
    department: 'السلامة',
    responsible: 'عبدالرحمن الشمري',
  },
  {
    _id: 'lic3',
    licenseNumber: 'LIC-003',
    name: 'سجل تجاري',
    licenseType: 'commercial',
    issuer: 'وزارة التجارة',
    issueDate: '2024-01-01',
    expiryDate: '2026-04-15',
    status: 'expiring_soon',
    cost: 2000,
    renewalCost: 2000,
    department: 'الإدارة',
    responsible: 'فهد القحطاني',
  },
  {
    _id: 'lic4',
    licenseNumber: 'LIC-004',
    name: 'تصريح نقل ركاب',
    licenseType: 'transport',
    issuer: 'هيئة النقل',
    issueDate: '2025-03-01',
    expiryDate: '2026-03-01',
    status: 'expired',
    cost: 8000,
    renewalCost: 8500,
    department: 'الأسطول',
    responsible: 'ماجد العتيبي',
  },
  {
    _id: 'lic5',
    licenseNumber: 'LIC-005',
    name: 'رخصة مزاولة مهنة صحية',
    licenseType: 'health',
    issuer: 'وزارة الصحة',
    issueDate: '2025-07-01',
    expiryDate: '2027-07-01',
    status: 'active',
    cost: 1500,
    renewalCost: 1500,
    department: 'الخدمات الطبية',
    responsible: 'د. سارة العسيري',
  },
  {
    _id: 'lic6',
    licenseNumber: 'LIC-006',
    name: 'رخصة برامج Microsoft',
    licenseType: 'software',
    issuer: 'Microsoft',
    issueDate: '2025-01-01',
    expiryDate: '2026-01-01',
    status: 'expired',
    cost: 25000,
    renewalCost: 28000,
    department: 'تقنية المعلومات',
    responsible: 'عمر السالم',
  },
];

const MOCK_LIC_STATS = {
  total: 34,
  active: 22,
  expiringSoon: 5,
  expired: 7,
  totalCost: 145000,
  renewalDue: 35000,
};

export default {
  inventoryService,
  purchasingService,
  equipmentService,
  auditService,
  incidentService,
  licenseService,
};

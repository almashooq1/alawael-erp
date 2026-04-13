/* eslint-disable import/no-anonymous-default-export */
/**
 * 🏢 خدمة المخازن والمشتريات للفروع — Branch Warehouse & Purchasing Service
 * AlAwael ERP — Multi-Branch Operations
 * Covers: Branches, Warehouses, StockTransfers, BranchPurchasing, BranchReports
 */
import apiClient from './api.client';
import logger from 'utils/logger';

const safe =
  fn =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      logger.warn('branchWarehouseService fallback:', e.message);
      return null;
    }
  };

// ═══════════════════════════════════════════
// 1. BRANCHES — الفروع
// ═══════════════════════════════════════════
export const branchService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/branches', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/branches/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/branches', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/branches/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/branches/${id}`);
    return r.data;
  }),

  // Branch integration endpoints
  getKPIs: safe(async id => {
    const r = await apiClient.get(`/integration/branches/${id}/kpis`);
    return r.data;
  }),
  getInventorySync: safe(async id => {
    const r = await apiClient.get(`/integration/branches/${id}/inventory-sync`);
    return r.data;
  }),
  getDashboard: safe(async id => {
    const r = await apiClient.get(`/integration/branches/${id}/dashboard`);
    return r.data;
  }),
  getReports: safe(async (id, type) => {
    const r = await apiClient.get(`/integration/branches/${id}/reports/${type}`);
    return r.data;
  }),
  getForecasts: safe(async id => {
    const r = await apiClient.get(`/integration/branches/${id}/forecasts`);
    return r.data;
  }),
  syncAll: safe(async () => {
    const r = await apiClient.post('/integration/sync/branches');
    return r.data;
  }),

  getMockBranches: () => MOCK_BRANCHES,
  getMockStats: () => MOCK_BRANCH_STATS,
};

// ═══════════════════════════════════════════
// 2. WAREHOUSES — المستودعات
// ═══════════════════════════════════════════
export const warehouseService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/inventory/warehouses', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/inventory/warehouses/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/inventory/warehouses', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/inventory/warehouses/${id}`, data);
    return r.data;
  }),
  getStock: safe(async (id, params = {}) => {
    const r = await apiClient.get(`/inventory/warehouses/${id}/stock`, { params });
    return r.data;
  }),

  getMockWarehouses: () => MOCK_WAREHOUSES,
  getMockStats: () => MOCK_WH_STATS,
};

// ═══════════════════════════════════════════
// 3. STOCK TRANSFERS — تحويلات المخزون
// ═══════════════════════════════════════════
export const stockTransferService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/inventory/transfers', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/inventory/transfers/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/inventory/transfers', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/inventory/transfers/${id}`, data);
    return r.data;
  }),

  ship: safe(async (id, data = {}) => {
    const r = await apiClient.post(`/inventory/transfers/${id}/ship`, data);
    return r.data;
  }),
  receive: safe(async (id, data = {}) => {
    const r = await apiClient.post(`/inventory/transfers/${id}/receive`, data);
    return r.data;
  }),
  cancel: safe(async id => {
    const r = await apiClient.post(`/inventory/transfers/${id}/cancel`);
    return r.data;
  }),

  getMockTransfers: () => MOCK_TRANSFERS,
  getMockStats: () => MOCK_TRANSFER_STATS,
};

// ═══════════════════════════════════════════
// 4. STOCK MOVEMENTS — حركة المخزون
// ═══════════════════════════════════════════
export const stockMovementService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/inventory/movements', { params });
    return r.data;
  }),
  createIn: safe(async data => {
    const r = await apiClient.post('/inventory/movements/in', data);
    return r.data;
  }),
  createOut: safe(async data => {
    const r = await apiClient.post('/inventory/movements/out', data);
    return r.data;
  }),
  createAdjustment: safe(async data => {
    const r = await apiClient.post('/inventory/movements/adjustment', data);
    return r.data;
  }),

  getMockMovements: () => MOCK_MOVEMENTS,
};

// ═══════════════════════════════════════════
// 5. STOCK TAKES — جرد المخزون
// ═══════════════════════════════════════════
export const stockTakeService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/inventory/stock-takes', { params });
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/inventory/stock-takes', data);
    return r.data;
  }),
  recordCount: safe(async (id, data) => {
    const r = await apiClient.put(`/inventory/stock-takes/${id}/count`, data);
    return r.data;
  }),
  complete: safe(async id => {
    const r = await apiClient.post(`/inventory/stock-takes/${id}/complete`);
    return r.data;
  }),

  getMockStockTakes: () => MOCK_STOCK_TAKES,
};

// ═══════════════════════════════════════════
// 6. PURCHASE REQUESTS — طلبات الشراء للفروع
// ═══════════════════════════════════════════
export const purchaseRequestService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/purchasing/requests', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/purchasing/requests/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/purchasing/requests', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/purchasing/requests/${id}`, data);
    return r.data;
  }),
  submit: safe(async id => {
    const r = await apiClient.post(`/purchasing/requests/${id}/submit`);
    return r.data;
  }),
  approve: safe(async id => {
    const r = await apiClient.post(`/purchasing/requests/${id}/approve`);
    return r.data;
  }),
  reject: safe(async (id, data) => {
    const r = await apiClient.post(`/purchasing/requests/${id}/reject`, data);
    return r.data;
  }),

  getMockPRs: () => MOCK_PURCHASE_REQUESTS,
  getMockStats: () => MOCK_PR_STATS,
};

// ═══════════════════════════════════════════
// 7. PURCHASE RECEIPTS — استلام المشتريات
// ═══════════════════════════════════════════
export const purchaseReceiptService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/purchasing/receipts', { params });
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/purchasing/receipts', data);
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/purchasing/receipts/${id}`);
    return r.data;
  }),

  getMockReceipts: () => MOCK_RECEIPTS,
};

// ═══════════════════════════════════════════
// 8. VENDOR CONTRACTS — عقود الموردين
// ═══════════════════════════════════════════
export const vendorContractService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/purchasing/contracts', { params });
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/purchasing/contracts', data);
    return r.data;
  }),
  getExpiring: safe(async () => {
    const r = await apiClient.get('/purchasing/contracts/expiring');
    return r.data;
  }),

  getMockContracts: () => MOCK_CONTRACTS,
};

// ═══════════════════════════════════════════════════════
// MOCK DATA — البيانات التجريبية
// ═══════════════════════════════════════════════════════

const MOCK_BRANCHES = [
  {
    _id: 'br1',
    code: 'HQ',
    name: 'المقر الرئيسي',
    status: 'active',
    location: { city: 'الرياض', region: 'منطقة الرياض', address: 'طريق الملك فهد' },
    contact: { phone: '0112345678', email: 'hq@alawael.sa', manager: 'أحمد المالكي' },
    stats: { employees: 120, warehouses: 2, totalStock: 4500, stockValue: 2340000 },
  },
  {
    _id: 'br2',
    code: 'JED',
    name: 'فرع جدة',
    status: 'active',
    location: { city: 'جدة', region: 'منطقة مكة', address: 'طريق الكورنيش' },
    contact: { phone: '0123456789', email: 'jed@alawael.sa', manager: 'محمد الغامدي' },
    stats: { employees: 65, warehouses: 1, totalStock: 2100, stockValue: 980000 },
  },
  {
    _id: 'br3',
    code: 'DMM',
    name: 'فرع الدمام',
    status: 'active',
    location: { city: 'الدمام', region: 'المنطقة الشرقية', address: 'طريق الظهران' },
    contact: { phone: '0134567890', email: 'dmm@alawael.sa', manager: 'خالد الشمري' },
    stats: { employees: 45, warehouses: 1, totalStock: 1800, stockValue: 750000 },
  },
  {
    _id: 'br4',
    code: 'MED',
    name: 'فرع المدينة المنورة',
    status: 'active',
    location: { city: 'المدينة المنورة', region: 'منطقة المدينة', address: 'طريق الأمير سلطان' },
    contact: { phone: '0145678901', email: 'med@alawael.sa', manager: 'عبدالله القرني' },
    stats: { employees: 35, warehouses: 1, totalStock: 1200, stockValue: 520000 },
  },
  {
    _id: 'br5',
    code: 'ABH',
    name: 'فرع أبها',
    status: 'active',
    location: { city: 'أبها', region: 'منطقة عسير', address: 'طريق الملك عبدالعزيز' },
    contact: { phone: '0156789012', email: 'abh@alawael.sa', manager: 'سعد الأسمري' },
    stats: { employees: 28, warehouses: 1, totalStock: 900, stockValue: 380000 },
  },
  {
    _id: 'br6',
    code: 'TAB',
    name: 'فرع تبوك',
    status: 'maintenance',
    location: { city: 'تبوك', region: 'منطقة تبوك', address: 'شارع الأمير فهد' },
    contact: { phone: '0167890123', email: 'tab@alawael.sa', manager: 'ماجد البلوي' },
    stats: { employees: 15, warehouses: 1, totalStock: 450, stockValue: 180000 },
  },
];

const MOCK_BRANCH_STATS = {
  totalBranches: 6,
  activeBranches: 5,
  totalWarehouses: 7,
  totalEmployees: 308,
  totalStockValue: 5150000,
  totalProducts: 10950,
  pendingTransfers: 8,
  monthlyPurchases: 456000,
};

const MOCK_WAREHOUSES = [
  {
    _id: 'wh1',
    code: 'WH-HQ-1',
    name: 'المستودع الرئيسي',
    type: 'main',
    branch: 'br1',
    branchName: 'المقر الرئيسي',
    city: 'الرياض',
    manager: 'فهد العتيبي',
    phone: '0551234567',
    capacity: 10000,
    currentOccupancy: 6500,
    isActive: true,
    stockValue: 1800000,
    productsCount: 3200,
    lowStockItems: 12,
  },
  {
    _id: 'wh2',
    code: 'WH-HQ-2',
    name: 'مستودع المعدات',
    type: 'main',
    branch: 'br1',
    branchName: 'المقر الرئيسي',
    city: 'الرياض',
    manager: 'عمر السالم',
    phone: '0552345678',
    capacity: 5000,
    currentOccupancy: 2800,
    isActive: true,
    stockValue: 540000,
    productsCount: 1300,
    lowStockItems: 5,
  },
  {
    _id: 'wh3',
    code: 'WH-JED',
    name: 'مستودع فرع جدة',
    type: 'branch',
    branch: 'br2',
    branchName: 'فرع جدة',
    city: 'جدة',
    manager: 'سامي الزهراني',
    phone: '0553456789',
    capacity: 6000,
    currentOccupancy: 3200,
    isActive: true,
    stockValue: 980000,
    productsCount: 2100,
    lowStockItems: 8,
  },
  {
    _id: 'wh4',
    code: 'WH-DMM',
    name: 'مستودع فرع الدمام',
    type: 'branch',
    branch: 'br3',
    branchName: 'فرع الدمام',
    city: 'الدمام',
    manager: 'ياسر الحربي',
    phone: '0554567890',
    capacity: 5000,
    currentOccupancy: 2400,
    isActive: true,
    stockValue: 750000,
    productsCount: 1800,
    lowStockItems: 6,
  },
  {
    _id: 'wh5',
    code: 'WH-MED',
    name: 'مستودع فرع المدينة',
    type: 'branch',
    branch: 'br4',
    branchName: 'فرع المدينة المنورة',
    city: 'المدينة المنورة',
    manager: 'نايف الجهني',
    phone: '0555678901',
    capacity: 4000,
    currentOccupancy: 1600,
    isActive: true,
    stockValue: 520000,
    productsCount: 1200,
    lowStockItems: 4,
  },
  {
    _id: 'wh6',
    code: 'WH-ABH',
    name: 'مستودع فرع أبها',
    type: 'branch',
    branch: 'br5',
    branchName: 'فرع أبها',
    city: 'أبها',
    manager: 'تركي الشهراني',
    phone: '0556789012',
    capacity: 3000,
    currentOccupancy: 1200,
    isActive: true,
    stockValue: 380000,
    productsCount: 900,
    lowStockItems: 3,
  },
  {
    _id: 'wh7',
    code: 'WH-TAB',
    name: 'مستودع فرع تبوك',
    type: 'branch',
    branch: 'br6',
    branchName: 'فرع تبوك',
    city: 'تبوك',
    manager: 'حمد المطيري',
    phone: '0557890123',
    capacity: 2000,
    currentOccupancy: 600,
    isActive: false,
    stockValue: 180000,
    productsCount: 450,
    lowStockItems: 7,
  },
  {
    _id: 'wh8',
    code: 'WH-TRN',
    name: 'مستودع العبور',
    type: 'transit',
    branch: 'br1',
    branchName: 'المقر الرئيسي',
    city: 'الرياض',
    manager: 'مشاري الدوسري',
    phone: '0558901234',
    capacity: 3000,
    currentOccupancy: 450,
    isActive: true,
    stockValue: 120000,
    productsCount: 320,
    lowStockItems: 0,
  },
];

const MOCK_WH_STATS = {
  total: 8,
  active: 7,
  mainWarehouses: 2,
  branchWarehouses: 5,
  transitWarehouses: 1,
  totalCapacity: 38000,
  totalOccupancy: 18750,
  occupancyRate: 49.3,
  totalStockValue: 5270000,
  totalLowStock: 45,
};

const MOCK_TRANSFERS = [
  {
    _id: 'tr1',
    transferNumber: 'TR-2026-001',
    fromWarehouse: 'المستودع الرئيسي',
    fromBranch: 'المقر الرئيسي',
    toWarehouse: 'مستودع فرع جدة',
    toBranch: 'فرع جدة',
    date: '2026-03-01',
    status: 'received',
    items: 8,
    totalQuantity: 250,
    totalValue: 45000,
    shippedAt: '2026-03-02',
    receivedAt: '2026-03-04',
    requestedBy: 'محمد الغامدي',
    notes: 'تزويد فرع جدة بالمستلزمات المكتبية',
  },
  {
    _id: 'tr2',
    transferNumber: 'TR-2026-002',
    fromWarehouse: 'المستودع الرئيسي',
    fromBranch: 'المقر الرئيسي',
    toWarehouse: 'مستودع فرع الدمام',
    toBranch: 'فرع الدمام',
    date: '2026-03-05',
    status: 'shipped',
    items: 5,
    totalQuantity: 120,
    totalValue: 28000,
    shippedAt: '2026-03-06',
    receivedAt: null,
    requestedBy: 'خالد الشمري',
    notes: 'معدات طباعة وحواسيب',
  },
  {
    _id: 'tr3',
    transferNumber: 'TR-2026-003',
    fromWarehouse: 'مستودع فرع جدة',
    fromBranch: 'فرع جدة',
    toWarehouse: 'مستودع فرع المدينة',
    toBranch: 'فرع المدينة المنورة',
    date: '2026-03-08',
    status: 'pending',
    items: 3,
    totalQuantity: 80,
    totalValue: 15000,
    shippedAt: null,
    receivedAt: null,
    requestedBy: 'عبدالله القرني',
    notes: 'تحويل أثاث مكتبي',
  },
  {
    _id: 'tr4',
    transferNumber: 'TR-2026-004',
    fromWarehouse: 'المستودع الرئيسي',
    fromBranch: 'المقر الرئيسي',
    toWarehouse: 'مستودع فرع أبها',
    toBranch: 'فرع أبها',
    date: '2026-03-10',
    status: 'draft',
    items: 12,
    totalQuantity: 500,
    totalValue: 95000,
    shippedAt: null,
    receivedAt: null,
    requestedBy: 'سعد الأسمري',
    notes: 'تجهيزات الفرع الجديد',
  },
  {
    _id: 'tr5',
    transferNumber: 'TR-2026-005',
    fromWarehouse: 'مستودع فرع الدمام',
    fromBranch: 'فرع الدمام',
    toWarehouse: 'المستودع الرئيسي',
    toBranch: 'المقر الرئيسي',
    date: '2026-03-12',
    status: 'pending',
    items: 4,
    totalQuantity: 60,
    totalValue: 22000,
    shippedAt: null,
    receivedAt: null,
    requestedBy: 'ياسر الحربي',
    notes: 'إعادة معدات فائضة',
  },
  {
    _id: 'tr6',
    transferNumber: 'TR-2026-006',
    fromWarehouse: 'المستودع الرئيسي',
    fromBranch: 'المقر الرئيسي',
    toWarehouse: 'مستودع فرع تبوك',
    toBranch: 'فرع تبوك',
    date: '2026-02-20',
    status: 'received',
    items: 6,
    totalQuantity: 180,
    totalValue: 35000,
    shippedAt: '2026-02-21',
    receivedAt: '2026-02-25',
    requestedBy: 'ماجد البلوي',
    notes: 'مستلزمات تشغيل',
  },
  {
    _id: 'tr7',
    transferNumber: 'TR-2026-007',
    fromWarehouse: 'المستودع الرئيسي',
    fromBranch: 'المقر الرئيسي',
    toWarehouse: 'مستودع فرع جدة',
    toBranch: 'فرع جدة',
    date: '2026-03-13',
    status: 'draft',
    items: 10,
    totalQuantity: 300,
    totalValue: 67000,
    shippedAt: null,
    receivedAt: null,
    requestedBy: 'سامي الزهراني',
    notes: 'تعزيز مخزون Q2',
  },
];

const MOCK_TRANSFER_STATS = {
  total: 42,
  draft: 5,
  pending: 8,
  shipped: 3,
  received: 24,
  cancelled: 2,
  totalValue: 1250000,
  avgTransitDays: 2.8,
  thisMonth: 7,
};

const MOCK_MOVEMENTS = [
  {
    _id: 'mv1',
    movementNumber: 'MV-001',
    type: 'in',
    product: 'أقلام حبر جاف',
    sku: 'SKU-001',
    quantity: 500,
    warehouse: 'المستودع الرئيسي',
    branch: 'المقر الرئيسي',
    date: '2026-03-10',
    reference: 'PO-2026-001',
    createdBy: 'فهد العتيبي',
    notes: 'استلام أمر شراء',
  },
  {
    _id: 'mv2',
    movementNumber: 'MV-002',
    type: 'out',
    product: 'ورق طباعة A4',
    sku: 'SKU-002',
    quantity: 50,
    warehouse: 'المستودع الرئيسي',
    branch: 'المقر الرئيسي',
    date: '2026-03-10',
    reference: 'REQ-045',
    createdBy: 'عمر السالم',
    notes: 'صرف للقسم المالي',
  },
  {
    _id: 'mv3',
    movementNumber: 'MV-003',
    type: 'transfer',
    product: 'حبر طابعة HP',
    sku: 'SKU-003',
    quantity: 10,
    warehouse: 'المستودع الرئيسي',
    branch: 'المقر الرئيسي',
    date: '2026-03-09',
    reference: 'TR-2026-001',
    createdBy: 'مشاري الدوسري',
    notes: 'تحويل إلى فرع جدة',
  },
  {
    _id: 'mv4',
    movementNumber: 'MV-004',
    type: 'adjustment',
    product: 'معقم يدين 500مل',
    sku: 'SKU-008',
    quantity: -15,
    warehouse: 'مستودع فرع جدة',
    branch: 'فرع جدة',
    date: '2026-03-08',
    reference: 'ADJ-012',
    createdBy: 'سامي الزهراني',
    notes: 'تسوية جرد – تالف',
  },
  {
    _id: 'mv5',
    movementNumber: 'MV-005',
    type: 'in',
    product: 'لابتوب Dell Latitude',
    sku: 'SKU-007',
    quantity: 10,
    warehouse: 'مستودع فرع الدمام',
    branch: 'فرع الدمام',
    date: '2026-03-07',
    reference: 'PO-2026-003',
    createdBy: 'ياسر الحربي',
    notes: 'استلام مباشر للفرع',
  },
  {
    _id: 'mv6',
    movementNumber: 'MV-006',
    type: 'return',
    product: 'كرسي مكتب دوار',
    sku: 'SKU-006',
    quantity: 3,
    warehouse: 'المستودع الرئيسي',
    branch: 'المقر الرئيسي',
    date: '2026-03-06',
    reference: 'RET-005',
    createdBy: 'فهد العتيبي',
    notes: 'مرتجع من فرع أبها',
  },
  {
    _id: 'mv7',
    movementNumber: 'MV-007',
    type: 'damage',
    product: 'مكيف سبليت 24000',
    sku: 'SKU-004',
    quantity: -1,
    warehouse: 'مستودع فرع تبوك',
    branch: 'فرع تبوك',
    date: '2026-03-05',
    reference: 'DMG-003',
    createdBy: 'حمد المطيري',
    notes: 'تلف أثناء النقل',
  },
];

const MOCK_STOCK_TAKES = [
  {
    _id: 'st1',
    stockTakeNumber: 'ST-2026-001',
    warehouse: 'المستودع الرئيسي',
    branch: 'المقر الرئيسي',
    status: 'completed',
    date: '2026-02-28',
    completedAt: '2026-03-02',
    itemsCounted: 3200,
    discrepancies: 23,
    varianceValue: -12500,
    conductor: 'فهد العتيبي',
  },
  {
    _id: 'st2',
    stockTakeNumber: 'ST-2026-002',
    warehouse: 'مستودع فرع جدة',
    branch: 'فرع جدة',
    status: 'in_progress',
    date: '2026-03-10',
    completedAt: null,
    itemsCounted: 1450,
    discrepancies: 8,
    varianceValue: -3200,
    conductor: 'سامي الزهراني',
  },
  {
    _id: 'st3',
    stockTakeNumber: 'ST-2026-003',
    warehouse: 'مستودع فرع الدمام',
    branch: 'فرع الدمام',
    status: 'draft',
    date: '2026-03-15',
    completedAt: null,
    itemsCounted: 0,
    discrepancies: 0,
    varianceValue: 0,
    conductor: 'ياسر الحربي',
  },
];

const MOCK_PURCHASE_REQUESTS = [
  {
    _id: 'pr1',
    requestNumber: 'PR-2026-001',
    branch: 'فرع جدة',
    department: 'الإدارة',
    requestedBy: 'محمد الغامدي',
    date: '2026-03-01',
    requiredDate: '2026-03-20',
    items: 6,
    totalEstimated: 25000,
    priority: 'high',
    status: 'approved',
    approvedBy: 'أحمد المالكي',
    approvedAt: '2026-03-03',
  },
  {
    _id: 'pr2',
    requestNumber: 'PR-2026-002',
    branch: 'فرع الدمام',
    department: 'تقنية المعلومات',
    requestedBy: 'خالد الشمري',
    date: '2026-03-05',
    requiredDate: '2026-03-25',
    items: 3,
    totalEstimated: 45000,
    priority: 'medium',
    status: 'submitted',
    approvedBy: null,
  },
  {
    _id: 'pr3',
    requestNumber: 'PR-2026-003',
    branch: 'المقر الرئيسي',
    department: 'الصيانة',
    requestedBy: 'فهد العتيبي',
    date: '2026-03-08',
    requiredDate: '2026-03-22',
    items: 10,
    totalEstimated: 18000,
    priority: 'urgent',
    status: 'ordered',
    approvedBy: 'أحمد المالكي',
    approvedAt: '2026-03-09',
  },
  {
    _id: 'pr4',
    requestNumber: 'PR-2026-004',
    branch: 'فرع المدينة المنورة',
    department: 'الموارد البشرية',
    requestedBy: 'عبدالله القرني',
    date: '2026-03-10',
    requiredDate: '2026-04-01',
    items: 4,
    totalEstimated: 12000,
    priority: 'low',
    status: 'draft',
    approvedBy: null,
  },
  {
    _id: 'pr5',
    requestNumber: 'PR-2026-005',
    branch: 'فرع أبها',
    department: 'الإدارة',
    requestedBy: 'سعد الأسمري',
    date: '2026-03-12',
    requiredDate: '2026-03-30',
    items: 8,
    totalEstimated: 34000,
    priority: 'high',
    status: 'submitted',
    approvedBy: null,
  },
  {
    _id: 'pr6',
    requestNumber: 'PR-2026-006',
    branch: 'المقر الرئيسي',
    department: 'المالية',
    requestedBy: 'نورة العنزي',
    date: '2026-03-13',
    requiredDate: '2026-04-10',
    items: 2,
    totalEstimated: 8500,
    priority: 'medium',
    status: 'rejected',
    approvedBy: null,
  },
];

const MOCK_PR_STATS = {
  total: 56,
  draft: 8,
  submitted: 15,
  approved: 20,
  ordered: 10,
  rejected: 3,
  totalEstimated: 890000,
  avgApprovalDays: 2.1,
  urgentPending: 4,
};

const MOCK_RECEIPTS = [
  {
    _id: 'rc1',
    receiptNumber: 'GRN-2026-001',
    purchaseOrder: 'PO-2026-001',
    vendor: 'شركة التوريدات المتكاملة',
    warehouse: 'المستودع الرئيسي',
    branch: 'المقر الرئيسي',
    date: '2026-03-04',
    items: 5,
    totalReceived: 5,
    totalAmount: 24500,
    status: 'complete',
    receivedBy: 'فهد العتيبي',
    qualityCheck: 'passed',
  },
  {
    _id: 'rc2',
    receiptNumber: 'GRN-2026-002',
    purchaseOrder: 'PO-2026-003',
    vendor: 'مؤسسة الأثاث الحديث',
    warehouse: 'مستودع فرع جدة',
    branch: 'فرع جدة',
    date: '2026-03-08',
    items: 8,
    totalReceived: 6,
    totalAmount: 32000,
    status: 'partial',
    receivedBy: 'سامي الزهراني',
    qualityCheck: 'passed',
  },
  {
    _id: 'rc3',
    receiptNumber: 'GRN-2026-003',
    purchaseOrder: 'PO-2026-005',
    vendor: 'شركة التنظيف والصيانة',
    warehouse: 'مستودع فرع الدمام',
    branch: 'فرع الدمام',
    date: '2026-03-12',
    items: 2,
    totalReceived: 2,
    totalAmount: 8500,
    status: 'complete',
    receivedBy: 'ياسر الحربي',
    qualityCheck: 'pending',
  },
];

const MOCK_CONTRACTS = [
  {
    _id: 'ct1',
    contractNumber: 'CNT-2026-001',
    vendor: 'شركة التوريدات المتكاملة',
    type: 'annual',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    value: 500000,
    status: 'active',
    category: 'مستلزمات مكتبية',
    autoRenew: true,
  },
  {
    _id: 'ct2',
    contractNumber: 'CNT-2026-002',
    vendor: 'شركة الحلول التقنية',
    type: 'annual',
    startDate: '2025-06-01',
    endDate: '2026-05-31',
    value: 1200000,
    status: 'active',
    category: 'أجهزة إلكترونية',
    autoRenew: false,
  },
  {
    _id: 'ct3',
    contractNumber: 'CNT-2025-003',
    vendor: 'شركة التنظيف والصيانة',
    type: 'annual',
    startDate: '2025-01-01',
    endDate: '2026-03-31',
    value: 180000,
    status: 'expiring_soon',
    category: 'خدمات صيانة',
    autoRenew: false,
  },
];

export default {
  branchService,
  warehouseService,
  stockTransferService,
  stockMovementService,
  stockTakeService,
  purchaseRequestService,
  purchaseReceiptService,
  vendorContractService,
};

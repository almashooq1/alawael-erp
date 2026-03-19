/**
 * Accounting Service — خدمة المحاسبة
 * Connects frontend to backend accounting APIs with mock fallback
 */
import apiClient from './api.client';

// ── Mock Data ──────────────────────────────────────────────────────────
const mockChartOfAccounts = [
  {
    _id: '1',
    code: '1000',
    name: 'الأصول',
    nameEn: 'Assets',
    type: 'asset',
    balance: 850000,
    isActive: true,
    children: [
      {
        _id: '11',
        code: '1100',
        name: 'الأصول المتداولة',
        nameEn: 'Current Assets',
        type: 'asset',
        balance: 450000,
        isActive: true,
      },
      {
        _id: '12',
        code: '1200',
        name: 'الأصول الثابتة',
        nameEn: 'Fixed Assets',
        type: 'asset',
        balance: 400000,
        isActive: true,
      },
    ],
  },
  {
    _id: '2',
    code: '2000',
    name: 'الخصوم',
    nameEn: 'Liabilities',
    type: 'liability',
    balance: 320000,
    isActive: true,
    children: [
      {
        _id: '21',
        code: '2100',
        name: 'الخصوم المتداولة',
        nameEn: 'Current Liabilities',
        type: 'liability',
        balance: 120000,
        isActive: true,
      },
      {
        _id: '22',
        code: '2200',
        name: 'الخصوم طويلة الأجل',
        nameEn: 'Long-term Liabilities',
        type: 'liability',
        balance: 200000,
        isActive: true,
      },
    ],
  },
  {
    _id: '3',
    code: '3000',
    name: 'حقوق الملكية',
    nameEn: 'Equity',
    type: 'equity',
    balance: 530000,
    isActive: true,
  },
  {
    _id: '4',
    code: '4000',
    name: 'الإيرادات',
    nameEn: 'Revenue',
    type: 'revenue',
    balance: 280000,
    isActive: true,
    children: [
      {
        _id: '41',
        code: '4100',
        name: 'إيرادات الخدمات',
        nameEn: 'Service Revenue',
        type: 'revenue',
        balance: 200000,
        isActive: true,
      },
      {
        _id: '42',
        code: '4200',
        name: 'إيرادات أخرى',
        nameEn: 'Other Revenue',
        type: 'revenue',
        balance: 80000,
        isActive: true,
      },
    ],
  },
  {
    _id: '5',
    code: '5000',
    name: 'المصروفات',
    nameEn: 'Expenses',
    type: 'expense',
    balance: 185000,
    isActive: true,
    children: [
      {
        _id: '51',
        code: '5100',
        name: 'الرواتب والأجور',
        nameEn: 'Salaries',
        type: 'expense',
        balance: 120000,
        isActive: true,
      },
      {
        _id: '52',
        code: '5200',
        name: 'الإيجارات',
        nameEn: 'Rent',
        type: 'expense',
        balance: 35000,
        isActive: true,
      },
      {
        _id: '53',
        code: '5300',
        name: 'المرافق',
        nameEn: 'Utilities',
        type: 'expense',
        balance: 15000,
        isActive: true,
      },
      {
        _id: '54',
        code: '5400',
        name: 'مصروفات تشغيلية',
        nameEn: 'Operating Expenses',
        type: 'expense',
        balance: 15000,
        isActive: true,
      },
    ],
  },
];

const mockJournalEntries = [
  {
    _id: 'j1',
    entryNumber: 'JE-001',
    date: '2026-03-01',
    description: 'تسجيل إيرادات خدمات شهر مارس',
    status: 'posted',
    lines: [
      { account: 'الصندوق', accountCode: '1101', debit: 15000, credit: 0 },
      { account: 'إيرادات الخدمات', accountCode: '4100', debit: 0, credit: 15000 },
    ],
    totalDebit: 15000,
    totalCredit: 15000,
    createdBy: 'أحمد المحاسب',
  },
  {
    _id: 'j2',
    entryNumber: 'JE-002',
    date: '2026-03-03',
    description: 'صرف رواتب الموظفين',
    status: 'posted',
    lines: [
      { account: 'الرواتب والأجور', accountCode: '5100', debit: 45000, credit: 0 },
      { account: 'البنك', accountCode: '1102', debit: 0, credit: 45000 },
    ],
    totalDebit: 45000,
    totalCredit: 45000,
    createdBy: 'سارة المالية',
  },
  {
    _id: 'j3',
    entryNumber: 'JE-003',
    date: '2026-03-05',
    description: 'سداد فاتورة إيجار',
    status: 'posted',
    lines: [
      { account: 'الإيجارات', accountCode: '5200', debit: 12000, credit: 0 },
      { account: 'البنك', accountCode: '1102', debit: 0, credit: 12000 },
    ],
    totalDebit: 12000,
    totalCredit: 12000,
    createdBy: 'أحمد المحاسب',
  },
  {
    _id: 'j4',
    entryNumber: 'JE-004',
    date: '2026-03-08',
    description: 'تحصيل مستحقات عملاء',
    status: 'draft',
    lines: [
      { account: 'البنك', accountCode: '1102', debit: 28000, credit: 0 },
      { account: 'العملاء', accountCode: '1103', debit: 0, credit: 28000 },
    ],
    totalDebit: 28000,
    totalCredit: 28000,
    createdBy: 'سارة المالية',
  },
];

const mockInvoices = [
  {
    _id: 'inv1',
    invoiceNumber: 'INV-2026-001',
    date: '2026-03-01',
    dueDate: '2026-04-01',
    customer: 'مركز الأمل للتأهيل',
    items: [
      { description: 'خدمات علاج طبيعي', quantity: 10, unitPrice: 500, total: 5000 },
      { description: 'جلسات نطق وتخاطب', quantity: 8, unitPrice: 400, total: 3200 },
    ],
    subtotal: 8200,
    vatRate: 15,
    vatAmount: 1230,
    total: 9430,
    status: 'paid',
    paidAmount: 9430,
  },
  {
    _id: 'inv2',
    invoiceNumber: 'INV-2026-002',
    date: '2026-03-05',
    dueDate: '2026-04-05',
    customer: 'مدرسة النور الخاصة',
    items: [{ description: 'استشارات تربوية', quantity: 5, unitPrice: 600, total: 3000 }],
    subtotal: 3000,
    vatRate: 15,
    vatAmount: 450,
    total: 3450,
    status: 'sent',
    paidAmount: 0,
  },
  {
    _id: 'inv3',
    invoiceNumber: 'INV-2026-003',
    date: '2026-03-08',
    dueDate: '2026-03-22',
    customer: 'عائلة المنصور',
    items: [{ description: 'جلسات علاج وظيفي', quantity: 12, unitPrice: 350, total: 4200 }],
    subtotal: 4200,
    vatRate: 15,
    vatAmount: 630,
    total: 4830,
    status: 'overdue',
    paidAmount: 0,
  },
  {
    _id: 'inv4',
    invoiceNumber: 'INV-2026-004',
    date: '2026-03-10',
    dueDate: '2026-04-10',
    customer: 'مستشفى الملك فهد',
    items: [
      { description: 'تقارير تقييم شاملة', quantity: 3, unitPrice: 1500, total: 4500 },
      { description: 'برنامج تأهيلي', quantity: 1, unitPrice: 8000, total: 8000 },
    ],
    subtotal: 12500,
    vatRate: 15,
    vatAmount: 1875,
    total: 14375,
    status: 'draft',
    paidAmount: 0,
  },
];

const mockExpenses = [
  {
    _id: 'e1',
    date: '2026-03-02',
    category: 'رواتب',
    description: 'رواتب الموظفين - مارس',
    amount: 120000,
    status: 'approved',
    account: 'الرواتب والأجور',
    vendor: 'الموظفين',
  },
  {
    _id: 'e2',
    date: '2026-03-03',
    category: 'إيجار',
    description: 'إيجار المبنى الرئيسي',
    amount: 35000,
    status: 'approved',
    account: 'الإيجارات',
    vendor: 'شركة العقارات المتحدة',
  },
  {
    _id: 'e3',
    date: '2026-03-05',
    category: 'مرافق',
    description: 'فاتورة الكهرباء',
    amount: 8500,
    status: 'approved',
    account: 'المرافق',
    vendor: 'شركة الكهرباء',
  },
  {
    _id: 'e4',
    date: '2026-03-06',
    category: 'مستلزمات',
    description: 'مستلزمات مكتبية وطبية',
    amount: 4200,
    status: 'pending',
    account: 'مصروفات تشغيلية',
    vendor: 'الجبر للمستلزمات',
  },
  {
    _id: 'e5',
    date: '2026-03-08',
    category: 'صيانة',
    description: 'صيانة أجهزة المختبر',
    amount: 6800,
    status: 'approved',
    account: 'مصروفات تشغيلية',
    vendor: 'شركة التقنية الحديثة',
  },
  {
    _id: 'e6',
    date: '2026-03-10',
    category: 'تدريب',
    description: 'دورات تدريبية للمعالجين',
    amount: 12000,
    status: 'pending',
    account: 'مصروفات التدريب',
    vendor: 'أكاديمية التطوير',
  },
];

const mockBudgets = [
  {
    _id: 'b1',
    name: 'ميزانية التشغيل 2026',
    fiscalYear: '2026',
    period: 'annual',
    status: 'active',
    totalBudget: 1200000,
    totalSpent: 485000,
    items: [
      { account: 'الرواتب والأجور', budgeted: 600000, spent: 240000 },
      { account: 'الإيجارات', budgeted: 180000, spent: 70000 },
      { account: 'المرافق', budgeted: 120000, spent: 45000 },
      { account: 'مصروفات تشغيلية', budgeted: 150000, spent: 75000 },
      { account: 'التدريب والتطوير', budgeted: 80000, spent: 30000 },
      { account: 'التسويق', budgeted: 70000, spent: 25000 },
    ],
  },
  {
    _id: 'b2',
    name: 'ميزانية الربع الأول',
    fiscalYear: '2026',
    period: 'quarterly',
    status: 'active',
    totalBudget: 350000,
    totalSpent: 285000,
    items: [
      { account: 'الرواتب والأجور', budgeted: 150000, spent: 120000 },
      { account: 'الإيجارات', budgeted: 45000, spent: 35000 },
      { account: 'المرافق', budgeted: 30000, spent: 25000 },
      { account: 'مصروفات تشغيلية', budgeted: 60000, spent: 55000 },
      { account: 'التدريب', budgeted: 20000, spent: 18000 },
      { account: 'مصاريف متفرقة', budgeted: 45000, spent: 32000 },
    ],
  },
];

const mockDashboardData = {
  summary: {
    totalRevenue: 280000,
    totalExpenses: 185000,
    netIncome: 95000,
    totalAssets: 850000,
    totalLiabilities: 320000,
    totalEquity: 530000,
    cashBalance: 125000,
    accountsReceivable: 42000,
    accountsPayable: 28000,
    pendingInvoices: 3,
    overdueInvoices: 1,
  },
  revenueByMonth: [
    { month: 'يناير', amount: 85000 },
    { month: 'فبراير', amount: 92000 },
    { month: 'مارس', amount: 103000 },
  ],
  expensesByCategory: [
    { category: 'رواتب', amount: 120000, percentage: 65 },
    { category: 'إيجار', amount: 35000, percentage: 19 },
    { category: 'مرافق', amount: 15000, percentage: 8 },
    { category: 'تشغيلية', amount: 15000, percentage: 8 },
  ],
  recentTransactions: [
    {
      id: 1,
      date: '2026-03-10',
      description: 'تحصيل فاتورة INV-001',
      type: 'income',
      amount: 9430,
    },
    { id: 2, date: '2026-03-08', description: 'صيانة أجهزة', type: 'expense', amount: 6800 },
    { id: 3, date: '2026-03-05', description: 'فاتورة كهرباء', type: 'expense', amount: 8500 },
    { id: 4, date: '2026-03-03', description: 'صرف رواتب مارس', type: 'expense', amount: 120000 },
    { id: 5, date: '2026-03-01', description: 'إيرادات خدمات', type: 'income', amount: 15000 },
  ],
};

const mockFinancialReports = {
  balanceSheet: {
    generatedAt: '2026-03-12',
    assets: {
      current: [
        { name: 'الصندوق', amount: 45000 },
        { name: 'البنك', amount: 80000 },
        { name: 'العملاء', amount: 42000 },
        { name: 'مخزون', amount: 25000 },
      ],
      fixed: [
        { name: 'أراضي ومباني', amount: 300000 },
        { name: 'أثاث ومعدات', amount: 75000 },
        { name: 'أجهزة طبية', amount: 120000 },
        { name: 'مركبات', amount: 55000 },
      ],
      totalCurrent: 192000,
      totalFixed: 550000,
      total: 742000,
    },
    liabilities: {
      current: [
        { name: 'الموردين', amount: 28000 },
        { name: 'مصاريف مستحقة', amount: 45000 },
        { name: 'ضريبة القيمة المضافة', amount: 12000 },
      ],
      longTerm: [{ name: 'قرض بنكي', amount: 200000 }],
      totalCurrent: 85000,
      totalLongTerm: 200000,
      total: 285000,
    },
    equity: {
      items: [
        { name: 'رأس المال', amount: 400000 },
        { name: 'أرباح محتجزة', amount: 57000 },
      ],
      total: 457000,
    },
  },
  incomeStatement: {
    period: 'الربع الأول 2026',
    revenue: [
      { name: 'إيرادات خدمات علاجية', amount: 180000 },
      { name: 'إيرادات استشارات', amount: 65000 },
      { name: 'إيرادات أخرى', amount: 35000 },
    ],
    expenses: [
      { name: 'الرواتب والأجور', amount: 120000 },
      { name: 'الإيجار', amount: 35000 },
      { name: 'المرافق', amount: 15000 },
      { name: 'مصروفات تشغيلية', amount: 15000 },
    ],
    totalRevenue: 280000,
    totalExpenses: 185000,
    grossProfit: 280000,
    operatingProfit: 95000,
    netIncome: 95000,
  },
};

// ── Service Methods ────────────────────────────────────────────────────
const accountingService = {
  // Dashboard
  async getDashboard() {
    try {
      const res = await apiClient.get('/finance');
      return res?.data || res || mockDashboardData;
    } catch {
      return mockDashboardData;
    }
  },

  // Chart of Accounts
  async getChartOfAccounts(filters) {
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await apiClient.get(`/finance/accounts?${params}`);
      return res?.data || res;
    } catch {
      return mockChartOfAccounts;
    }
  },
  async createAccount(data) {
    try {
      const res = await apiClient.post('/finance/accounts', data);
      return res?.data || res;
    } catch {
      throw new Error('فشل إنشاء الحساب');
    }
  },
  async updateAccount(id, data) {
    try {
      const res = await apiClient.put(`/finance/accounts/${id}`, data);
      return res?.data || res;
    } catch {
      throw new Error('فشل تحديث الحساب');
    }
  },

  // Journal Entries
  async getJournalEntries(filters) {
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await apiClient.get(`/finance/journal-entries?${params}`);
      return res?.data || res;
    } catch {
      return mockJournalEntries;
    }
  },
  async createJournalEntry(data) {
    try {
      const res = await apiClient.post('/finance/journal-entries', data);
      return res?.data || res;
    } catch {
      throw new Error('فشل إنشاء القيد');
    }
  },
  async postJournalEntry(id) {
    try {
      const res = await apiClient.put(`/finance/journal-entries/${id}/post`);
      return res?.data || res;
    } catch {
      throw new Error('فشل ترحيل القيد');
    }
  },

  // Invoices
  async getInvoices(filters) {
    try {
      const params = filters ? new URLSearchParams(filters).toString() : '';
      const res = await apiClient.get(`/finance/invoices?${params}`);
      return res?.data || res;
    } catch {
      return mockInvoices;
    }
  },
  async createInvoice(data) {
    try {
      const res = await apiClient.post('/finance/invoices', data);
      return res?.data || res;
    } catch {
      throw new Error('فشل إنشاء الفاتورة');
    }
  },
  async updateInvoice(id, data) {
    try {
      const res = await apiClient.put(`/finance/invoices/${id}`, data);
      return res?.data || res;
    } catch {
      throw new Error('فشل تحديث الفاتورة');
    }
  },

  // Expenses
  async getExpenses(filters) {
    try {
      const params = filters ? new URLSearchParams(filters).toString() : '';
      const res = await apiClient.get(`/finance/expenses?${params}`);
      return res?.data || res;
    } catch {
      return mockExpenses;
    }
  },
  async createExpense(data) {
    try {
      const res = await apiClient.post('/finance/expenses', data);
      return res?.data || res;
    } catch {
      throw new Error('فشل إنشاء المصروف');
    }
  },
  async approveExpense(id) {
    try {
      const res = await apiClient.put(`/finance/expenses/${id}/approve`);
      return res?.data || res;
    } catch {
      throw new Error('فشل اعتماد المصروف');
    }
  },

  // Budgets
  async getBudgets() {
    try {
      const res = await apiClient.get('/finance/budgets');
      return res?.data || res;
    } catch {
      return mockBudgets;
    }
  },
  async createBudget(data) {
    try {
      const res = await apiClient.post('/finance/budgets', data);
      return res?.data || res;
    } catch {
      throw new Error('فشل إنشاء الميزانية');
    }
  },

  // Financial Reports
  async getFinancialReports(type) {
    try {
      const res = await apiClient.get(`/finance/financial-reports?type=${type || 'all'}`);
      return res?.data || res;
    } catch {
      return mockFinancialReports;
    }
  },
  async getBalanceSheet() {
    try {
      const res = await apiClient.get('/finance/financial-reports?type=balance-sheet');
      return res?.data || res;
    } catch {
      return mockFinancialReports.balanceSheet;
    }
  },
  async getIncomeStatement() {
    try {
      const res = await apiClient.get('/finance/financial-reports?type=income-statement');
      return res?.data || res;
    } catch {
      return mockFinancialReports.incomeStatement;
    }
  },

  // Payments
  async getPayments(filters) {
    try {
      const params = filters ? new URLSearchParams(filters).toString() : '';
      const res = await apiClient.get(`/finance/payments?${params}`);
      return res?.data || res;
    } catch {
      return [];
    }
  },
  async createPayment(data) {
    try {
      const res = await apiClient.post('/finance/payments', data);
      return res?.data || res;
    } catch {
      throw new Error('فشل تسجيل الدفعة');
    }
  },

  // Summary
  async getFinancialSummary() {
    try {
      const res = await apiClient.get('/finance/summary');
      return res?.data || res;
    } catch {
      return mockDashboardData.summary;
    }
  },

  // General Ledger - دفتر الأستاذ العام
  async getGeneralLedger(params) {
    try {
      const query = params ? new URLSearchParams(params).toString() : '';
      const res = await apiClient.get(`/finance/general-ledger?${query}`);
      return res?.data || res;
    } catch {
      return { accounts: [] };
    }
  },

  // Cost Centers - مراكز التكلفة
  async getCostCenters() {
    try {
      const res = await apiClient.get('/finance/cost-centers');
      return res?.data || res;
    } catch {
      return [];
    }
  },
  async createCostCenter(data) {
    try {
      const res = await apiClient.post('/finance/cost-centers', data);
      return res?.data || res;
    } catch {
      throw new Error('فشل إنشاء مركز التكلفة');
    }
  },
  async updateCostCenter(id, data) {
    try {
      const res = await apiClient.put(`/finance/cost-centers/${id}`, data);
      return res?.data || res;
    } catch {
      throw new Error('فشل تحديث مركز التكلفة');
    }
  },

  // Fixed Assets - الأصول الثابتة
  async getFixedAssets() {
    try {
      const res = await apiClient.get('/finance/fixed-assets');
      return res?.data || res;
    } catch {
      return [];
    }
  },
  async createFixedAsset(data) {
    try {
      const res = await apiClient.post('/finance/fixed-assets', data);
      return res?.data || res;
    } catch {
      throw new Error('فشل إنشاء الأصل الثابت');
    }
  },
  async updateFixedAsset(id, data) {
    try {
      const res = await apiClient.put(`/finance/fixed-assets/${id}`, data);
      return res?.data || res;
    } catch {
      throw new Error('فشل تحديث الأصل الثابت');
    }
  },

  // Cash Flow - التدفقات النقدية
  async getCashFlow(params) {
    try {
      const query = params ? new URLSearchParams(params).toString() : '';
      const res = await apiClient.get(`/finance/cash-flow?${query}`);
      return res?.data || res;
    } catch {
      return null;
    }
  },

  // VAT Returns - إقرارات ضريبة القيمة المضافة
  async getVATReturns() {
    try {
      const res = await apiClient.get('/finance/vat-returns');
      return res?.data || res;
    } catch {
      return [];
    }
  },
  async fileVATReturn(id) {
    try {
      const res = await apiClient.put(`/finance/vat-returns/${id}/file`);
      return res?.data || res;
    } catch {
      throw new Error('فشل تقديم إقرار الضريبة');
    }
  },

  // Zakat - الزكاة
  async getZakatData() {
    try {
      const res = await apiClient.get('/finance/zakat');
      return res?.data || res;
    } catch {
      return null;
    }
  },
};

export default accountingService;

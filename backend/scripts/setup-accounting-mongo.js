/* eslint-disable no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition, no-unused-expressions */
// سكريبت بديل لإعداد الحسابات مباشرة عبر MongoDB
// تشغيل من داخل حاوية MongoDB

const defaultAccounts = [
  // الأصول
  {
    code: '1000',
    name: 'الأصول',
    nameEn: 'Assets',
    type: 'asset',
    isPostable: false,
    active: true,
  },
  {
    code: '1010',
    name: 'الصندوق',
    nameEn: 'Cash',
    type: 'asset',
    category: 'current_asset',
    description: 'النقدية في الصندوق',
    active: true,
  },
  {
    code: '1020',
    name: 'البنك - الراجحي',
    nameEn: 'Bank - Al Rajhi',
    type: 'asset',
    category: 'current_asset',
    description: 'الحساب البنكي الرئيسي',
    active: true,
  },
  {
    code: '1030',
    name: 'المدينون',
    nameEn: 'Accounts Receivable',
    type: 'asset',
    category: 'current_asset',
    description: 'مستحقات من العملاء',
    active: true,
  },
  {
    code: '1040',
    name: 'ضريبة القيمة المضافة المدفوعة',
    nameEn: 'VAT Paid',
    type: 'asset',
    category: 'current_asset',
    description: 'ضريبة القيمة المضافة على المشتريات',
    vatType: 'paid',
    active: true,
  },
  {
    code: '1050',
    name: 'المخزون',
    nameEn: 'Inventory',
    type: 'asset',
    category: 'current_asset',
    description: 'مخزون البضائع',
    active: true,
  },
  {
    code: '1060',
    name: 'المصروفات المدفوعة مقدماً',
    nameEn: 'Prepaid Expenses',
    type: 'asset',
    category: 'current_asset',
    description: 'المصروفات المدفوعة مقدماً',
    active: true,
  },
  // أصول ثابتة
  {
    code: '1500',
    name: 'الأراضي',
    nameEn: 'Land',
    type: 'asset',
    category: 'fixed_asset',
    description: 'الأراضي المملوكة',
    active: true,
  },
  {
    code: '1510',
    name: 'المباني',
    nameEn: 'Buildings',
    type: 'asset',
    category: 'fixed_asset',
    description: 'المباني والمنشآت',
    active: true,
  },
  {
    code: '1520',
    name: 'الأثاث والمعدات',
    nameEn: 'Furniture & Equipment',
    type: 'asset',
    category: 'fixed_asset',
    description: 'الأثاث والمعدات المكتبية',
    active: true,
  },
  {
    code: '1530',
    name: 'السيارات',
    nameEn: 'Vehicles',
    type: 'asset',
    category: 'fixed_asset',
    description: 'السيارات والمركبات',
    active: true,
  },
  {
    code: '1590',
    name: 'مجمع الإهلاك',
    nameEn: 'Accumulated Depreciation',
    type: 'asset',
    category: 'fixed_asset',
    description: 'مجمع إهلاك الأصول الثابتة',
    balance: 0,
    active: true,
  },

  // الخصوم
  {
    code: '2000',
    name: 'الخصوم',
    nameEn: 'Liabilities',
    type: 'liability',
    isPostable: false,
    active: true,
  },
  {
    code: '2010',
    name: 'الدائنون',
    nameEn: 'Accounts Payable',
    type: 'liability',
    category: 'current_liability',
    description: 'مستحقات للموردين',
    active: true,
  },
  {
    code: '2020',
    name: 'ضريبة القيمة المضافة المستحقة',
    nameEn: 'VAT Payable',
    type: 'liability',
    category: 'current_liability',
    description: 'ضريبة القيمة المضافة على المبيعات',
    vatType: 'collected',
    active: true,
  },
  {
    code: '2030',
    name: 'الرواتب المستحقة',
    nameEn: 'Salaries Payable',
    type: 'liability',
    category: 'current_liability',
    description: 'رواتب الموظفين المستحقة',
    active: true,
  },
  {
    code: '2500',
    name: 'قروض قصيرة الأجل',
    nameEn: 'Short-term Loans',
    type: 'liability',
    category: 'current_liability',
    description: 'قروض تستحق خلال سنة',
    active: true,
  },
  {
    code: '2510',
    name: 'قروض طويلة الأجل',
    nameEn: 'Long-term Loans',
    type: 'liability',
    category: 'long_term_liability',
    description: 'قروض تستحق بعد سنة',
    active: true,
  },

  // حقوق الملكية
  {
    code: '3000',
    name: 'حقوق الملكية',
    nameEn: 'Equity',
    type: 'equity',
    isPostable: false,
    active: true,
  },
  {
    code: '3010',
    name: 'رأس المال',
    nameEn: 'Capital',
    type: 'equity',
    description: 'رأس المال المدفوع',
    active: true,
  },
  {
    code: '3020',
    name: 'الأرباح المحتجزة',
    nameEn: 'Retained Earnings',
    type: 'equity',
    description: 'أرباح السنوات السابقة',
    active: true,
  },
  {
    code: '3030',
    name: 'أرباح العام الحالي',
    nameEn: 'Current Year Profit',
    type: 'equity',
    description: 'أرباح العام الحالي',
    active: true,
  },

  // الإيرادات
  {
    code: '4000',
    name: 'الإيرادات',
    nameEn: 'Revenue',
    type: 'revenue',
    isPostable: false,
    active: true,
  },
  {
    code: '4010',
    name: 'إيرادات الخدمات الطبية',
    nameEn: 'Medical Services Revenue',
    type: 'revenue',
    description: 'إيرادات الخدمات الطبية',
    active: true,
  },
  {
    code: '4020',
    name: 'إيرادات العلاج الطبيعي',
    nameEn: 'Physical Therapy Revenue',
    type: 'revenue',
    description: 'إيرادات العلاج الطبيعي',
    active: true,
  },
  {
    code: '4030',
    name: 'إيرادات الاستشارات',
    nameEn: 'Consultation Revenue',
    type: 'revenue',
    description: 'إيرادات الاستشارات',
    active: true,
  },
  {
    code: '4090',
    name: 'إيرادات أخرى',
    nameEn: 'Other Revenue',
    type: 'revenue',
    description: 'إيرادات متنوعة',
    active: true,
  },

  // المصروفات
  {
    code: '5000',
    name: 'المصروفات',
    nameEn: 'Expenses',
    type: 'expense',
    isPostable: false,
    active: true,
  },
  {
    code: '5010',
    name: 'الرواتب والأجور',
    nameEn: 'Salaries & Wages',
    type: 'expense',
    category: 'operating_expense',
    description: 'رواتب وأجور الموظفين',
    active: true,
  },
  {
    code: '5020',
    name: 'الإيجارات',
    nameEn: 'Rent Expense',
    type: 'expense',
    category: 'operating_expense',
    description: 'إيجار المباني',
    active: true,
  },
  {
    code: '5030',
    name: 'الكهرباء والماء',
    nameEn: 'Utilities',
    type: 'expense',
    category: 'operating_expense',
    description: 'فواتير الكهرباء والماء',
    active: true,
  },
  {
    code: '5040',
    name: 'الصيانة والتصليحات',
    nameEn: 'Maintenance & Repairs',
    type: 'expense',
    category: 'operating_expense',
    description: 'صيانة الأجهزة والمعدات',
    active: true,
  },
  {
    code: '5050',
    name: 'المستلزمات الطبية',
    nameEn: 'Medical Supplies',
    type: 'expense',
    category: 'operating_expense',
    description: 'مستلزمات طبية وعلاجية',
    active: true,
  },
  {
    code: '5060',
    name: 'التأمين',
    nameEn: 'Insurance',
    type: 'expense',
    category: 'operating_expense',
    description: 'تأمينات متنوعة',
    active: true,
  },
  {
    code: '5070',
    name: 'القرطاسية والمطبوعات',
    nameEn: 'Stationery & Printing',
    type: 'expense',
    category: 'operating_expense',
    description: 'مصروفات قرطاسية ومطبوعات',
    active: true,
  },
  {
    code: '5080',
    name: 'الاتصالات والإنترنت',
    nameEn: 'Communications',
    type: 'expense',
    category: 'operating_expense',
    description: 'هاتف وإنترنت',
    active: true,
  },
  {
    code: '5090',
    name: 'التسويق والإعلان',
    nameEn: 'Marketing & Advertising',
    type: 'expense',
    category: 'operating_expense',
    description: 'مصروفات تسويقية',
    active: true,
  },
  {
    code: '5100',
    name: 'الرسوم القانونية',
    nameEn: 'Legal Fees',
    type: 'expense',
    category: 'operating_expense',
    description: 'رسوم قانونية واستشارية',
    active: true,
  },
  {
    code: '5200',
    name: 'فوائد القروض',
    nameEn: 'Interest Expense',
    type: 'expense',
    category: 'financial_expense',
    description: 'فوائد على القروض',
    active: true,
  },
  {
    code: '5210',
    name: 'رسوم بنكية',
    nameEn: 'Bank Charges',
    type: 'expense',
    category: 'financial_expense',
    description: 'رسوم وعمولات بنكية',
    active: true,
  },
  {
    code: '5300',
    name: 'الإهلاك',
    nameEn: 'Depreciation',
    type: 'expense',
    category: 'operating_expense',
    description: 'إهلاك الأصول الثابتة',
    active: true,
  },
];

// الإعدادات الافتراضية
const defaultSettings = {
  fiscalYearStart: { month: 1, day: 1 },
  fiscalYearEnd: { month: 12, day: 31 },
  currency: { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  vat: { enabled: true, rate: 15, accountCode: '2020' },
  defaultAccounts: {
    cash: '1010',
    bank: '1020',
    receivables: '1030',
    payables: '2010',
    revenue: '4010',
    expense: '5010',
    vatPaid: '1040',
    vatCollected: '2020',
  },
  journalEntry: { requireApproval: true, allowPostingToClosed: false },
  invoice: { autoGenerateNumber: true, prefix: 'INV', startNumber: 1000 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

print('🚀 بدء إعداد النظام المحاسبي...\n');

// استخدام قاعدة البيانات
db = db.getSiblingDB('alaweal_db');

// حذف البيانات القديمة
print('🗑️  حذف البيانات القديمة...');
db.accounts.deleteMany({});
db.accountingsettings.deleteMany({});

// إضافة الحسابات
print('📊 إضافة دليل الحسابات...');
let insertedCount = 0;
defaultAccounts.forEach(account => {
  account.createdAt = new Date();
  account.updatedAt = new Date();
  account.balance = account.balance || 0;
  db.accounts.insertOne(account);
  insertedCount++;
});
print(`✅ تم إضافة ${insertedCount} حساب بنجاح\n`);

// إضافة الإعدادات
print('⚙️  إضافة الإعدادات الافتراضية...');
db.accountingsettings.insertOne(defaultSettings);
print('✅ تم إضافة الإعدادات بنجاح\n');

// عرض الملخص
print('✅ تم الانتهاء من إعداد النظام المحاسبي!\n');
print('📊 الملخص:');
print(`   - عدد الحسابات: ${db.accounts.countDocuments()}`);
print(`   - الأصول: ${db.accounts.countDocuments({ type: 'asset' })}`);
print(`   - الخصوم: ${db.accounts.countDocuments({ type: 'liability' })}`);
print(`   - حقوق الملكية: ${db.accounts.countDocuments({ type: 'equity' })}`);
print(`   - الإيرادات: ${db.accounts.countDocuments({ type: 'revenue' })}`);
print(`   - المصروفات: ${db.accounts.countDocuments({ type: 'expense' })}`);
print('\n🎉 النظام جاهز للاستخدام!');

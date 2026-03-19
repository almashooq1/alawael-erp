/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * ACCOUNTING SETUP SCRIPT - سكريبت إعداد النظام المحاسبي
 * ===================================================================
 * الاستخدام: node backend/scripts/setup-accounting.js
 * ===================================================================
 */

const mongoose = require('mongoose');
const Account = require('../models/Account');
const AccountingSettings = require('../models/AccountingSettings');
require('dotenv').config();

// الحسابات الأساسية
const defaultAccounts = [
  // ===== الأصول (Assets) =====
  {
    code: '1000',
    name: 'الأصول',
    nameEn: 'Assets',
    type: 'asset',
    isPostable: false,
  },
  // أصول متداولة
  {
    code: '1010',
    name: 'الصندوق',
    nameEn: 'Cash',
    type: 'asset',
    category: 'current_asset',
    description: 'النقدية في الصندوق',
  },
  {
    code: '1020',
    name: 'البنك - الراجحي',
    nameEn: 'Bank - Al Rajhi',
    type: 'asset',
    category: 'current_asset',
    description: 'الحساب البنكي الرئيسي',
  },
  {
    code: '1030',
    name: 'المدينون',
    nameEn: 'Accounts Receivable',
    type: 'asset',
    category: 'current_asset',
    description: 'مستحقات من العملاء',
  },
  {
    code: '1040',
    name: 'ضريبة القيمة المضافة المسددة',
    nameEn: 'VAT Paid',
    type: 'asset',
    category: 'current_asset',
    description: 'ضريبة القيمة المضافة المدفوعة',
  },
  {
    code: '1050',
    name: 'المخزون',
    nameEn: 'Inventory',
    type: 'asset',
    category: 'current_asset',
    description: 'مخزون البضائع',
  },
  {
    code: '1060',
    name: 'مصروفات مدفوعة مقدماً',
    nameEn: 'Prepaid Expenses',
    type: 'asset',
    category: 'current_asset',
    description: 'مصروفات مدفوعة مقدماً',
  },
  // أصول ثابتة
  {
    code: '1500',
    name: 'الأصول الثابتة',
    nameEn: 'Fixed Assets',
    type: 'asset',
    category: 'fixed_asset',
    isPostable: false,
  },
  {
    code: '1510',
    name: 'الأراضي',
    nameEn: 'Land',
    type: 'asset',
    category: 'fixed_asset',
    description: 'الأراضي والعقارات',
  },
  {
    code: '1520',
    name: 'المباني',
    nameEn: 'Buildings',
    type: 'asset',
    category: 'fixed_asset',
    description: 'المباني والإنشاءات',
  },
  {
    code: '1530',
    name: 'المعدات والأجهزة',
    nameEn: 'Equipment',
    type: 'asset',
    category: 'fixed_asset',
    description: 'المعدات والأجهزة الطبية',
  },
  {
    code: '1540',
    name: 'الأثاث',
    nameEn: 'Furniture',
    type: 'asset',
    category: 'fixed_asset',
    description: 'الأثاث والمفروشات',
  },
  {
    code: '1550',
    name: 'السيارات',
    nameEn: 'Vehicles',
    type: 'asset',
    category: 'fixed_asset',
    description: 'المركبات',
  },
  {
    code: '1560',
    name: 'مجمع الإهلاك',
    nameEn: 'Accumulated Depreciation',
    type: 'asset',
    category: 'fixed_asset',
    description: 'مجمع إهلاك الأصول الثابتة',
  },

  // ===== الخصوم (Liabilities) =====
  {
    code: '2000',
    name: 'الخصوم',
    nameEn: 'Liabilities',
    type: 'liability',
    isPostable: false,
  },
  // خصوم متداولة
  {
    code: '2010',
    name: 'الدائنون',
    nameEn: 'Accounts Payable',
    type: 'liability',
    category: 'current_liability',
    description: 'مستحقات للموردين',
  },
  {
    code: '2020',
    name: 'ضريبة القيمة المضافة المستحقة',
    nameEn: 'VAT Payable',
    type: 'liability',
    category: 'current_liability',
    description: 'ضريبة القيمة المضافة المستحقة',
  },
  {
    code: '2030',
    name: 'رواتب مستحقة',
    nameEn: 'Salaries Payable',
    type: 'liability',
    category: 'current_liability',
    description: 'رواتب مستحقة للموظفين',
  },
  {
    code: '2040',
    name: 'قروض قصيرة الأجل',
    nameEn: 'Short-term Loans',
    type: 'liability',
    category: 'current_liability',
    description: 'قروض قصيرة الأجل',
  },
  // خصوم طويلة الأجل
  {
    code: '2500',
    name: 'قروض طويلة الأجل',
    nameEn: 'Long-term Loans',
    type: 'liability',
    category: 'long_term_liability',
    description: 'قروض طويلة الأجل',
  },

  // ===== حقوق الملكية (Equity) =====
  {
    code: '3000',
    name: 'حقوق الملكية',
    nameEn: 'Equity',
    type: 'equity',
    isPostable: false,
  },
  {
    code: '3010',
    name: 'رأس المال',
    nameEn: 'Capital',
    type: 'equity',
    category: 'capital',
    description: 'رأس المال المدفوع',
  },
  {
    code: '3020',
    name: 'الأرباح المحتجزة',
    nameEn: 'Retained Earnings',
    type: 'equity',
    category: 'retained_earnings',
    description: 'الأرباح المحتجزة',
  },
  {
    code: '3030',
    name: 'أرباح السنة الحالية',
    nameEn: 'Current Year Profit',
    type: 'equity',
    category: 'retained_earnings',
    description: 'صافي ربح السنة الحالية',
  },

  // ===== الإيرادات (Revenue) =====
  {
    code: '4000',
    name: 'الإيرادات',
    nameEn: 'Revenue',
    type: 'revenue',
    isPostable: false,
  },
  {
    code: '4010',
    name: 'إيرادات الخدمات الطبية',
    nameEn: 'Medical Services Revenue',
    type: 'revenue',
    category: 'operating_revenue',
    description: 'إيرادات من الخدمات الطبية والعلاجية',
  },
  {
    code: '4020',
    name: 'إيرادات العلاج الطبيعي',
    nameEn: 'Physical Therapy Revenue',
    type: 'revenue',
    category: 'operating_revenue',
    description: 'إيرادات جلسات العلاج الطبيعي',
  },
  {
    code: '4030',
    name: 'إيرادات الاستشارات',
    nameEn: 'Consultation Revenue',
    type: 'revenue',
    category: 'operating_revenue',
    description: 'إيرادات الاستشارات الطبية',
  },
  {
    code: '4040',
    name: 'إيرادات أخرى',
    nameEn: 'Other Revenue',
    type: 'revenue',
    category: 'non_operating_revenue',
    description: 'إيرادات متنوعة',
  },

  // ===== المصروفات (Expenses) =====
  {
    code: '5000',
    name: 'المصروفات',
    nameEn: 'Expenses',
    type: 'expense',
    isPostable: false,
  },
  // مصروفات تشغيلية
  {
    code: '5010',
    name: 'رواتب الموظفين',
    nameEn: 'Staff Salaries',
    type: 'expense',
    category: 'operating_expense',
    description: 'رواتب وأجور الموظفين',
  },
  {
    code: '5020',
    name: 'الإيجار',
    nameEn: 'Rent',
    type: 'expense',
    category: 'operating_expense',
    description: 'إيجار المقر',
  },
  {
    code: '5030',
    name: 'الكهرباء والماء',
    nameEn: 'Utilities',
    type: 'expense',
    category: 'operating_expense',
    description: 'مصروفات الكهرباء والماء',
  },
  {
    code: '5040',
    name: 'الصيانة',
    nameEn: 'Maintenance',
    type: 'expense',
    category: 'operating_expense',
    description: 'مصروفات الصيانة',
  },
  {
    code: '5050',
    name: 'اللوازم الطبية',
    nameEn: 'Medical Supplies',
    type: 'expense',
    category: 'operating_expense',
    description: 'مستلزمات ومعدات طبية',
  },
  {
    code: '5060',
    name: 'التأمينات',
    nameEn: 'Insurance',
    type: 'expense',
    category: 'operating_expense',
    description: 'مصروفات التأمين',
  },
  // مصروفات إدارية
  {
    code: '5100',
    name: 'المصروفات الإدارية',
    nameEn: 'Administrative Expenses',
    type: 'expense',
    category: 'administrative_expense',
    isPostable: false,
  },
  {
    code: '5110',
    name: 'القرطاسية',
    nameEn: 'Stationery',
    type: 'expense',
    category: 'administrative_expense',
    description: 'قرطاسية ومطبوعات',
  },
  {
    code: '5120',
    name: 'الاتصالات',
    nameEn: 'Communications',
    type: 'expense',
    category: 'administrative_expense',
    description: 'هاتف وإنترنت',
  },
  {
    code: '5130',
    name: 'التسويق والإعلان',
    nameEn: 'Marketing',
    type: 'expense',
    category: 'administrative_expense',
    description: 'مصروفات التسويق والإعلان',
  },
  {
    code: '5140',
    name: 'الرسوم القانونية',
    nameEn: 'Legal Fees',
    type: 'expense',
    category: 'administrative_expense',
    description: 'رسوم قانونية ومحاماة',
  },
  // مصروفات مالية
  {
    code: '5200',
    name: 'المصروفات المالية',
    nameEn: 'Financial Expenses',
    type: 'expense',
    category: 'financial_expense',
    isPostable: false,
  },
  {
    code: '5210',
    name: 'فوائد القروض',
    nameEn: 'Interest Expense',
    type: 'expense',
    category: 'financial_expense',
    description: 'فوائد وعمولات بنكية',
  },
  {
    code: '5220',
    name: 'رسوم بنكية',
    nameEn: 'Bank Charges',
    type: 'expense',
    category: 'financial_expense',
    description: 'رسوم وعمولات بنكية',
  },
  // الإهلاك
  {
    code: '5300',
    name: 'الإهلاك',
    nameEn: 'Depreciation',
    type: 'expense',
    category: 'operating_expense',
    description: 'إهلاك الأصول الثابتة',
  },
];

/**
 * الدالة الرئيسية للإعداد
 */
async function setupAccounting() {
  try {
    console.log('🚀 بدء إعداد النظام المحاسبي...\n');

    // الاتصال بقاعدة البيانات
    // استخدام localhost إذا لم يكن Docker قيد التشغيل
    const mongoUri =
      process.env.MONGODB_URI?.replace('mongo:', 'localhost:') ||
      'mongodb://localhost:27017/rehabilitation';
    console.log('🔌 محاولة الاتصال بـ MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ تم الاتصال بقاعدة البيانات\n');

    // التحقق من وجود حسابات مسبقاً
    const existingAccountsCount = await Account.countDocuments();
    if (existingAccountsCount > 0) {
      console.log(`⚠️  تحذير: يوجد ${existingAccountsCount} حساب موجود مسبقاً`);
      console.log('هل تريد الاستمرار والإضافة؟ (سيتم تجاهل الحسابات المكررة)\n');
    }

    // إنشاء الحسابات
    console.log('📊 جاري إنشاء دليل الحسابات...');
    let createdCount = 0;
    let skippedCount = 0;

    for (const accountData of defaultAccounts) {
      try {
        const existing = await Account.findOne({ code: accountData.code });
        if (existing) {
          console.log(`⏭️  تم تجاوز: ${accountData.code} - ${accountData.name} (موجود مسبقاً)`);
          skippedCount++;
          continue;
        }

        await Account.create(accountData);
        console.log(`✅ تم إنشاء: ${accountData.code} - ${accountData.name}`);
        createdCount++;
      } catch (error) {
        console.log(`❌ خطأ في إنشاء: ${accountData.code} - ${error.message}`);
      }
    }

    console.log(`\n📊 ملخص دليل الحسابات:`);
    console.log(`   ✅ تم الإنشاء: ${createdCount} حساب`);
    console.log(`   ⏭️  تم التجاوز: ${skippedCount} حساب`);
    console.log(`   📈 الإجمالي: ${createdCount + skippedCount} حساب\n`);

    // إنشاء الإعدادات الأساسية
    const existingSettings = await AccountingSettings.findOne();
    if (!existingSettings) {
      console.log('⚙️  جاري إنشاء الإعدادات الأساسية...');

      // البحث عن الحسابات الافتراضية
      const cashAccount = await Account.findOne({ code: '1010' });
      const bankAccount = await Account.findOne({ code: '1020' });
      const receivablesAccount = await Account.findOne({ code: '1030' });
      const payablesAccount = await Account.findOne({ code: '2010' });
      const revenueAccount = await Account.findOne({ code: '4010' });
      const expenseAccount = await Account.findOne({ code: '5010' });
      const vatPayableAccount = await Account.findOne({ code: '2020' });
      const vatPaidAccount = await Account.findOne({ code: '1040' });
      const retainedEarningsAccount = await Account.findOne({ code: '3020' });

      await AccountingSettings.create({
        companyInfo: {
          name: 'مركز التأهيل الطبي',
          nameEn: 'Medical Rehabilitation Center',
          taxNumber: '300000000000003',
          email: 'info@rehab-center.com',
          phone: '+966-XX-XXX-XXXX',
          address: 'الرياض، المملكة العربية السعودية',
        },
        baseCurrency: 'SAR',
        defaultTaxRate: 0.15,
        fiscalYear: {
          startMonth: 1,
          endMonth: 12,
        },
        defaultAccounts: {
          cashAccount: cashAccount?._id,
          bankAccount: bankAccount?._id,
          accountsReceivableAccount: receivablesAccount?._id,
          accountsPayableAccount: payablesAccount?._id,
          salesRevenueAccount: revenueAccount?._id,
          purchaseExpenseAccount: expenseAccount?._id,
          vatPayableAccount: vatPayableAccount?._id,
          vatReceivableAccount: vatPaidAccount?._id,
          retainedEarningsAccount: retainedEarningsAccount?._id,
        },
        invoiceSettings: {
          prefix: {
            sales: 'INV',
            purchase: 'PINV',
          },
          dueDays: 30,
        },
      });

      console.log('✅ تم إنشاء الإعدادات الأساسية\n');
    } else {
      console.log('⏭️  الإعدادات موجودة مسبقاً\n');
    }

    // إحصائيات نهائية
    console.log('📊 إحصائيات النظام المحاسبي:');
    const stats = await Account.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);

    stats.forEach(stat => {
      const typeNames = {
        asset: 'الأصول',
        liability: 'الخصوم',
        equity: 'حقوق الملكية',
        revenue: 'الإيرادات',
        expense: 'المصروفات',
      };
      console.log(`   ${typeNames[stat._id]}: ${stat.count} حساب`);
    });

    const totalAccounts = await Account.countDocuments();
    console.log(`   📈 إجمالي الحسابات: ${totalAccounts}\n`);

    console.log('✅ تم إعداد النظام المحاسبي بنجاح! 🎉\n');
    console.log('📝 الخطوات التالية:');
    console.log('   1. تسجيل المسارات في server.js');
    console.log('   2. إضافة دور "accountant" للمستخدمين');
    console.log('   3. البدء في استخدام النظام\n');
  } catch (error) {
    console.error('❌ خطأ في إعداد النظام:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ تم إغلاق الاتصال بقاعدة البيانات');
  }
}

// تشغيل السكريبت
if (require.main === module) {
  setupAccounting();
}

module.exports = setupAccounting;

#!/usr/bin/env node
/* eslint-disable no-unused-vars */

/**
 * 🎯 إعداد النظام المحاسبي المتقدم
 * ======================================
 *
 * هذا السكريبت يقوم بإعداد:
 * 1. حسابات دفتر الأستاذ للأصول الثابتة
 * 2. حسابات الإهلاك
 * 3. مراكز التكلفة الافتراضية
 * 4. أصول ثابتة تجريبية (اختياري)
 */

const mongoose = require('mongoose');

// ===================================================================
// الاتصال بقاعدة البيانات
// ===================================================================
async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/alawael-erp', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    console.log('✅ تم الاتصال بقاعدة البيانات');
  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
    process.exit(1);
  }
}

// ===================================================================
// 1. إنشاء حسابات الأستاذ العامة
// ===================================================================
async function createGLAccounts() {
  console.log('\n📊 إنشاء حسابات الأستاذ العامة...');

  const Account = require('../models/Account');

  const accounts = [
    // حسابات الأصول الثابتة
    {
      code: '1200',
      name: 'الأصول الثابتة',
      nameEn: 'Fixed Assets',
      type: 'asset',
      subtype: 'fixed-asset',
      isActive: true,
    },
    {
      code: '1210',
      name: 'أراضي',
      nameEn: 'Land',
      type: 'asset',
      subtype: 'fixed-asset',
      parentAccount: '1200',
      isActive: true,
    },
    {
      code: '1220',
      name: 'مباني',
      nameEn: 'Buildings',
      type: 'asset',
      subtype: 'fixed-asset',
      parentAccount: '1200',
      isActive: true,
    },
    {
      code: '1230',
      name: 'معدات',
      nameEn: 'Equipment',
      type: 'asset',
      subtype: 'fixed-asset',
      parentAccount: '1200',
      isActive: true,
    },
    {
      code: '1240',
      name: 'مركبات',
      nameEn: 'Vehicles',
      type: 'asset',
      subtype: 'fixed-asset',
      parentAccount: '1200',
      isActive: true,
    },
    {
      code: '1250',
      name: 'أثاث ومفروشات',
      nameEn: 'Furniture & Fixtures',
      type: 'asset',
      subtype: 'fixed-asset',
      parentAccount: '1200',
      isActive: true,
    },
    {
      code: '1260',
      name: 'أجهزة كمبيوتر',
      nameEn: 'Computer Equipment',
      type: 'asset',
      subtype: 'fixed-asset',
      parentAccount: '1200',
      isActive: true,
    },

    // حسابات الإهلاك المتراكم
    {
      code: '1300',
      name: 'الإهلاك المتراكم',
      nameEn: 'Accumulated Depreciation',
      type: 'asset',
      subtype: 'contra-asset',
      isActive: true,
    },
    {
      code: '1310',
      name: 'إهلاك متراكم - مباني',
      nameEn: 'Accumulated Depreciation - Buildings',
      type: 'asset',
      subtype: 'contra-asset',
      parentAccount: '1300',
      isActive: true,
    },
    {
      code: '1320',
      name: 'إهلاك متراكم - معدات',
      nameEn: 'Accumulated Depreciation - Equipment',
      type: 'asset',
      subtype: 'contra-asset',
      parentAccount: '1300',
      isActive: true,
    },
    {
      code: '1330',
      name: 'إهلاك متراكم - مركبات',
      nameEn: 'Accumulated Depreciation - Vehicles',
      type: 'asset',
      subtype: 'contra-asset',
      parentAccount: '1300',
      isActive: true,
    },
    {
      code: '1340',
      name: 'إهلاك متراكم - أثاث',
      nameEn: 'Accumulated Depreciation - Furniture',
      type: 'asset',
      subtype: 'contra-asset',
      parentAccount: '1300',
      isActive: true,
    },
    {
      code: '1350',
      name: 'إهلاك متراكم - كمبيوتر',
      nameEn: 'Accumulated Depreciation - Computer',
      type: 'asset',
      subtype: 'contra-asset',
      parentAccount: '1300',
      isActive: true,
    },

    // حسابات مصروف الإهلاك
    {
      code: '5100',
      name: 'مصروف الإهلاك',
      nameEn: 'Depreciation Expense',
      type: 'expense',
      subtype: 'operating',
      isActive: true,
    },

    // حسابات الصيانة
    {
      code: '5200',
      name: 'مصروف الصيانة',
      nameEn: 'Maintenance Expense',
      type: 'expense',
      subtype: 'operating',
      isActive: true,
    },
    {
      code: '5210',
      name: 'صيانة مباني',
      nameEn: 'Building Maintenance',
      type: 'expense',
      subtype: 'operating',
      parentAccount: '5200',
      isActive: true,
    },
    {
      code: '5220',
      name: 'صيانة معدات',
      nameEn: 'Equipment Maintenance',
      type: 'expense',
      subtype: 'operating',
      parentAccount: '5200',
      isActive: true,
    },
    {
      code: '5230',
      name: 'صيانة مركبات',
      nameEn: 'Vehicle Maintenance',
      type: 'expense',
      subtype: 'operating',
      parentAccount: '5200',
      isActive: true,
    },

    // حسابات الخسائر والأرباح من البيع
    {
      code: '7100',
      name: 'أرباح من بيع أصول',
      nameEn: 'Gain on Sale of Assets',
      type: 'revenue',
      subtype: 'other',
      isActive: true,
    },
    {
      code: '5300',
      name: 'خسائر من بيع أصول',
      nameEn: 'Loss on Sale of Assets',
      type: 'expense',
      subtype: 'other',
      isActive: true,
    },
  ];

  let createdCount = 0;

  for (const accountData of accounts) {
    try {
      const existing = await Account.findOne({ code: accountData.code });
      if (!existing) {
        await Account.create(accountData);
        createdCount++;
        console.log(`✅ تم إنشاء الحساب: ${accountData.code} - ${accountData.name}`);
      } else {
        console.log(`⏭️  الحساب موجود: ${accountData.code} - ${accountData.name}`);
      }
    } catch (error) {
      console.error(`❌ خطأ في إنشاء الحساب ${accountData.code}:`, error.message);
    }
  }

  console.log(`\n✅ تم إنشاء ${createdCount} حساب جديد من ${accounts.length}`);
}

// ===================================================================
// 2. إنشاء مراكز التكلفة الافتراضية
// ===================================================================
async function createCostCenters() {
  console.log('\n📊 إنشاء مراكز التكلفة الافتراضية...');

  const CostCenter = require('../models/CostCenter');

  const centers = [
    {
      code: 'CC-ADM',
      name: 'الإدارة العامة',
      nameEn: 'General Administration',
      type: 'cost',
      category: 'administrative',
      description: 'مركز تكلفة الإدارة العامة والمصروفات الإدارية',
      budget: {
        totalBudget: 500000,
        spentBudget: 0,
        remainingBudget: 500000,
        year: new Date().getFullYear(),
      },
      isActive: true,
    },
    {
      code: 'CC-HR',
      name: 'الموارد البشرية',
      nameEn: 'Human Resources',
      type: 'cost',
      category: 'administrative',
      description: 'مركز تكلفة قسم الموارد البشرية',
      budget: {
        totalBudget: 300000,
        spentBudget: 0,
        remainingBudget: 300000,
        year: new Date().getFullYear(),
      },
      isActive: true,
    },
    {
      code: 'CC-IT',
      name: 'تقنية المعلومات',
      nameEn: 'Information Technology',
      type: 'cost',
      category: 'technical',
      description: 'مركز تكلفة قسم تقنية المعلومات',
      budget: {
        totalBudget: 400000,
        spentBudget: 0,
        remainingBudget: 400000,
        year: new Date().getFullYear(),
      },
      isActive: true,
    },
    {
      code: 'CC-SALES',
      name: 'المبيعات',
      nameEn: 'Sales',
      type: 'revenue',
      category: 'sales',
      description: 'مركز إيراد المبيعات',
      budget: {
        totalBudget: 2000000,
        spentBudget: 0,
        remainingBudget: 2000000,
        year: new Date().getFullYear(),
      },
      revenue: {
        totalRevenue: 0,
        revenueSources: [],
      },
      isActive: true,
    },
    {
      code: 'CC-PROD',
      name: 'الإنتاج',
      nameEn: 'Production',
      type: 'profit',
      category: 'production',
      description: 'مركز ربحية الإنتاج',
      budget: {
        totalBudget: 1500000,
        spentBudget: 0,
        remainingBudget: 1500000,
        year: new Date().getFullYear(),
      },
      revenue: {
        totalRevenue: 0,
        revenueSources: [],
      },
      isActive: true,
    },
    {
      code: 'CC-MKT',
      name: 'التسويق',
      nameEn: 'Marketing',
      type: 'cost',
      category: 'marketing',
      description: 'مركز تكلفة التسويق والإعلان',
      budget: {
        totalBudget: 350000,
        spentBudget: 0,
        remainingBudget: 350000,
        year: new Date().getFullYear(),
      },
      isActive: true,
    },
  ];

  let createdCount = 0;

  for (const centerData of centers) {
    try {
      const existing = await CostCenter.findOne({ code: centerData.code });
      if (!existing) {
        await CostCenter.create(centerData);
        createdCount++;
        console.log(`✅ تم إنشاء مركز التكلفة: ${centerData.code} - ${centerData.name}`);
      } else {
        console.log(`⏭️  مركز التكلفة موجود: ${centerData.code} - ${centerData.name}`);
      }
    } catch (error) {
      console.error(`❌ خطأ في إنشاء مركز التكلفة ${centerData.code}:`, error.message);
    }
  }

  console.log(`\n✅ تم إنشاء ${createdCount} مركز تكلفة جديد من ${centers.length}`);
}

// ===================================================================
// 3. إنشاء أصول ثابتة تجريبية (اختياري)
// ===================================================================
async function createSampleAssets() {
  console.log('\n📦 إنشاء أصول ثابتة تجريبية...');

  const FixedAsset = require('../models/FixedAsset');
  const Account = require('../models/Account');

  // الحصول على حسابات الأصول
  const buildingAccount = await Account.findOne({ code: '1220' });
  const equipmentAccount = await Account.findOne({ code: '1230' });
  const vehicleAccount = await Account.findOne({ code: '1240' });

  if (!buildingAccount || !equipmentAccount || !vehicleAccount) {
    console.error('❌ يجب إنشاء حسابات الأستاذ العامة أولاً');
    return;
  }

  const assets = [
    {
      code: 'FA-BLD-001',
      name: 'مبنى المكتب الرئيسي',
      nameEn: 'Main Office Building',
      category: 'buildings',
      purchaseDate: new Date('2020-01-01'),
      purchaseCost: 5000000,
      salvageValue: 500000,
      usefulLife: 30,
      depreciationMethod: 'straight-line',
      status: 'active',
      location: 'الرياض',
      glAccount: buildingAccount._id,
      notes: 'المبنى الرئيسي للشركة',
    },
    {
      code: 'FA-EQP-001',
      name: 'معدات إنتاج رئيسية',
      nameEn: 'Main Production Equipment',
      category: 'machinery',
      purchaseDate: new Date('2022-06-15'),
      purchaseCost: 800000,
      salvageValue: 80000,
      usefulLife: 10,
      depreciationMethod: 'declining-balance',
      status: 'active',
      location: 'مصنع الإنتاج',
      glAccount: equipmentAccount._id,
      warrantyExpiry: new Date('2025-06-15'),
      maintenanceSchedule: [
        {
          type: 'preventive',
          frequency: 'quarterly',
          nextScheduledDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    {
      code: 'FA-VEH-001',
      name: 'شاحنة نقل',
      nameEn: 'Delivery Truck',
      category: 'vehicles',
      purchaseDate: new Date('2023-03-01'),
      purchaseCost: 250000,
      salvageValue: 50000,
      usefulLife: 5,
      depreciationMethod: 'sum-of-years',
      status: 'active',
      location: 'قسم النقل',
      glAccount: vehicleAccount._id,
      insuranceExpiry: new Date('2026-03-01'),
      maintenanceSchedule: [
        {
          type: 'preventive',
          frequency: 'monthly',
          nextScheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ],
    },
  ];

  let createdCount = 0;

  for (const assetData of assets) {
    try {
      const existing = await FixedAsset.findOne({ code: assetData.code });
      if (!existing) {
        await FixedAsset.create(assetData);
        createdCount++;
        console.log(`✅ تم إنشاء الأصل: ${assetData.code} - ${assetData.name}`);
      } else {
        console.log(`⏭️  الأصل موجود: ${assetData.code} - ${assetData.name}`);
      }
    } catch (error) {
      console.error(`❌ خطأ في إنشاء الأصل ${assetData.code}:`, error.message);
    }
  }

  console.log(`\n✅ تم إنشاء ${createdCount} أصل ثابت جديد من ${assets.length}`);
}

// ===================================================================
// التشغيل الرئيسي
// ===================================================================
async function main() {
  console.log('🚀 بدء إعداد النظام المحاسبي المتقدم');
  console.log('='.repeat(50));

  await connectDB();

  // 1. إنشاء حسابات الأستاذ
  await createGLAccounts();

  // 2. إنشاء مراكز التكلفة
  await createCostCenters();

  // 3. إنشاء أصول تجريبية (اختياري)
  const createSamples = process.argv.includes('--with-samples');
  if (createSamples) {
    await createSampleAssets();
  } else {
    console.log('\n⏭️  تم تخطي إنشاء الأصول التجريبية (استخدم --with-samples لإنشائها)');
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ تم إعداد النظام المحاسبي المتقدم بنجاح!');
  console.log('\nيمكنك الآن:');
  console.log('1. إضافة أصول ثابتة جديدة');
  console.log('2. تسجيل الإهلاك الشهري');
  console.log('3. إدارة مراكز التكلفة');
  console.log('4. إنشاء التقارير المالية المتقدمة');

  await mongoose.disconnect();
  console.log('\n👋 تم إغلاق الاتصال بقاعدة البيانات');
}

// تشغيل السكريبت
main().catch(error => {
  console.error('\n❌ خطأ في التشغيل:', error);
  process.exit(1);
});

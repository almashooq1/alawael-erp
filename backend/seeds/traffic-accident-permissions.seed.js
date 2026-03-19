/**
 * Traffic Accident Reporting System - Permission Seeding Script
 * نظام تقارير الحوادث المرورية - سكريبت بذر الصلاحيات
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Permission definitions for Traffic Accident Reporting System
const TRAFFIC_ACCIDENT_PERMISSIONS = [
  {
    id: 'view_accident_reports',
    name: 'عرض تقارير الحوادث',
    description: 'View traffic accident reports',
    category: 'accident_reports',
    resource: 'traffic_accidents',
    action: 'read',
    level: 1
  },
  {
    id: 'create_accident_report',
    name: 'إنشاء تقرير حادثة',
    description: 'Create new traffic accident reports',
    category: 'accident_reports',
    resource: 'traffic_accidents',
    action: 'create',
    level: 2
  },
  {
    id: 'edit_accident_report',
    name: 'تعديل تقرير الحادثة',
    description: 'Edit existing traffic accident reports',
    category: 'accident_reports',
    resource: 'traffic_accidents',
    action: 'update',
    level: 2
  },
  {
    id: 'delete_accident_report',
    name: 'حذف تقرير الحادثة',
    description: 'Delete traffic accident reports',
    category: 'accident_reports',
    resource: 'traffic_accidents',
    action: 'delete',
    level: 3
  },
  {
    id: 'start_investigation',
    name: 'بدء التحقيق',
    description: 'Start accident investigation',
    category: 'investigation',
    resource: 'accident_investigation',
    action: 'start',
    level: 2
  },
  {
    id: 'complete_investigation',
    name: 'إكمال التحقيق',
    description: 'Complete accident investigation',
    category: 'investigation',
    resource: 'accident_investigation',
    action: 'complete',
    level: 3
  },
  {
    id: 'determine_liability',
    name: 'تحديد المسؤولية',
    description: 'Determine liability and responsibility',
    category: 'liability',
    resource: 'accident_liability',
    action: 'determine',
    level: 3
  },
  {
    id: 'view_accident_statistics',
    name: 'عرض إحصائيات الحوادث',
    description: 'View accident statistics and reports',
    category: 'analytics',
    resource: 'accident_statistics',
    action: 'read',
    level: 1
  },
  {
    id: 'view_accident_analytics',
    name: 'عرض تحليلات الحوادث المتقدمة',
    description: 'View advanced analytics and insights',
    category: 'analytics',
    resource: 'accident_analytics',
    action: 'read',
    level: 2
  },
  {
    id: 'export_report',
    name: 'تصدير التقرير',
    description: 'Export accident reports to PDF/Excel',
    category: 'export',
    resource: 'accident_export',
    action: 'export',
    level: 1
  }
];

// Default role-permission mappings
const ROLE_PERMISSION_MAPPINGS = {
  admin: [
    'view_accident_reports',
    'create_accident_report',
    'edit_accident_report',
    'delete_accident_report',
    'start_investigation',
    'complete_investigation',
    'determine_liability',
    'view_accident_statistics',
    'view_accident_analytics',
    'export_report'
  ],
  traffic_officer: [
    'view_accident_reports',
    'create_accident_report',
    'edit_accident_report',
    'start_investigation',
    'determine_liability',
    'view_accident_statistics',
    'view_accident_analytics',
    'export_report'
  ],
  investigator: [
    'view_accident_reports',
    'create_accident_report',
    'edit_accident_report',
    'start_investigation',
    'complete_investigation',
    'determine_liability',
    'view_accident_statistics',
    'view_accident_analytics',
    'export_report'
  ],
  supervisor: [
    'view_accident_reports',
    'start_investigation',
    'complete_investigation',
    'view_accident_statistics',
    'view_accident_analytics',
    'export_report'
  ],
  staff: [
    'view_accident_reports',
    'create_accident_report',
    'view_accident_statistics',
    'export_report'
  ],
  viewer: [
    'view_accident_reports',
    'view_accident_statistics',
    'view_accident_analytics'
  ]
};

async function seedPermissions() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGOOSE_URI || 
                     process.env.MONGODB_URI || 
                     'mongodb://localhost:27017/erp_system';
    
    console.log('🔌 جارٍ الاتصال بـ MongoDB...');
    console.log(`   📍 URI: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ متصل بـ MongoDB بنجاح\n');

    // Get or create Permission collection
    const db = mongoose.connection.db;
    const permissionCollection = db.collection('permissions');
    const roleCollection = db.collection('roles');
    
    console.log('📝 جارٍ بذر صلاحيات نظام تقارير الحوادث المرورية...\n');

    // ========================================
    // SEED PERMISSIONS
    // ========================================
    
    // Check if permissions already exist
    const existingCount = await permissionCollection.countDocuments({
      category: 'accident_reports'
    });

    if (existingCount > 0) {
      console.log('⚠️  صلاحيات الحوادث المرورية موجودة بالفعل');
      const result = await permissionCollection.deleteMany({
        category: { $in: ['accident_reports', 'investigation', 'liability', 'analytics', 'export'] }
      });
      console.log(`   ✨ تم حذف ${result.deletedCount} صلاحية قديمة\n`);
    }

    // Insert new permissions
    const permissionResults = await permissionCollection.insertMany(
      TRAFFIC_ACCIDENT_PERMISSIONS.map(perm => ({
        ...perm,
        createdAt: new Date(),
        updatedAt: new Date(),
        enabled: true
      }))
    );

    console.log(`✅ تم إضافة ${permissionResults.insertedIds.length} صلاحية جديدة:`);
    TRAFFIC_ACCIDENT_PERMISSIONS.slice(0, 5).forEach(perm => {
      console.log(`   ✓ ${perm.name}`);
    });
    console.log(`   ... و${Math.max(0, TRAFFIC_ACCIDENT_PERMISSIONS.length - 5)} صلاحيات أخرى\n`);

    // ========================================
    // SEED ROLES (if needed)
    // ========================================

    const roleNames = Object.keys(ROLE_PERMISSION_MAPPINGS);
    console.log('📋 جارٍ تحديث أدوار النظام...\n');

    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSION_MAPPINGS)) {
      const roleData = {
        name: roleName,
        displayName: roleName.replace(/_/g, ' ').toUpperCase(),
        permissions: permissions,
        category: 'traffic_accident',
        updatedAt: new Date()
      };

      const result = await roleCollection.findOneAndUpdate(
        { name: roleName },
        {
          $set: roleData,
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true, returnDocument: 'after' }
      );

      console.log(`   ✓ ${roleName}: ${permissions.length} صلاحيات`);
    }

    console.log('\n✅ تم تحديث جميع أدوار النظام بنجاح\n');

    // ========================================
    // STATISTICS & SUMMARY
    // ========================================

    const totalPermissions = await permissionCollection.countDocuments();
    const totalRoles = await roleCollection.countDocuments();
    const trafficAccidentPerms = await permissionCollection.countDocuments({
      category: { $in: Object.keys(ROLE_PERMISSION_MAPPINGS[Object.keys(ROLE_PERMISSION_MAPPINGS)[0]]) }
    });

    console.log('📊 ملخص البذر:');
    console.log(`   📌 إجمالي الصلاحيات: ${totalPermissions}`);
    console.log(`   📌 إجمالي الأدوار: ${totalRoles}`);
    console.log(`   📌 صلاحيات الحوادث المرورية: ${TRAFFIC_ACCIDENT_PERMISSIONS.length}`);
    console.log(`   📌 أدوار الحوادث المرورية: ${roleNames.length}\n`);

    // ========================================
    // VERIFICATION
    // ========================================

    console.log('✅ التحقق من البيانات:\n');

    // Verify permissions
    const permissionIds = TRAFFIC_ACCIDENT_PERMISSIONS.map(p => p.id);
    for (const permId of permissionIds.slice(0, 3)) {
      const perm = await permissionCollection.findOne({ id: permId });
      if (perm) {
        console.log(`   ✓ ${perm.name}: موجودة في قاعدة البيانات`);
      }
    }
    console.log(`   ... و${Math.max(0, permissionIds.length - 3)} صلاحيات أخرى\n`);

    // Verify roles
    for (const roleName of roleNames.slice(0, 3)) {
      const role = await roleCollection.findOne({ name: roleName });
      if (role) {
        console.log(`   ✓ ${roleName}: ${role.permissions.length} صلاحيات`);
      }
    }
    console.log(`   ... و${Math.max(0, roleNames.length - 3)} أدوار أخرى\n`);

    console.log('═══════════════════════════════════════');
    console.log('✨ تم إكمال بذر صلاحيات الحوادث بنجاح!');
    console.log('═══════════════════════════════════════\n');

    console.log('📌 الخطوات التالية:');
    console.log('   1. تعيين الأدوار للمستخدمين في لوحة التحكم');
    console.log('   2. التحقق من صلاحيات المستخدمين');
    console.log('   3. اختبار API endpoints مع التوكن\n');

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 تم قطع الاتصال بـ MongoDB\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ خطأ في بذر الصلاحيات:', error.message);
    console.error('\n📋 تفاصيل الخطأ:\n', error);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
}

/**
 * Export for use in other scripts
 */
module.exports = {
  TRAFFIC_ACCIDENT_PERMISSIONS,
  ROLE_PERMISSION_MAPPINGS,
  seedPermissions
};

// Run if called directly
if (require.main === module) {
  seedPermissions();
}

/**
 * Usage:
 * 
 * 1. Direct execution:
 *    node seeds/traffic-accident-permissions.seed.js
 * 
 * 2. From another script:
 *    const { seedPermissions } = require('./seeds/traffic-accident-permissions.seed.js');
 *    await seedPermissions();
 * 
 * Environment variables:
 *    MONGOOSE_URI - MongoDB connection string
 *    MONGODB_URI - MongoDB connection string (fallback)
 * 
 * Default connection:
 *    mongodb://localhost:27017/erp_system
 */

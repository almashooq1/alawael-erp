/**
 * rehabRolesSeeder.js — Seeder لأدوار وصلاحيات نظام التأهيل
 *
 * الملف: backend/db/seeders/rehabRolesSeeder.js
 * المصدر: prompt_03 — نظام إدارة مراكز تأهيل ذوي الإعاقة — Rehab-ERP v2.0
 *
 * يُهيئ أدوار وصلاحيات نظام التأهيل في قاعدة البيانات (MongoDB).
 * مستقل تماماً عن أدوار النظام الموجودة في rbac.js.
 *
 * الاستخدام:
 *   node backend/db/seeders/rehabRolesSeeder.js
 *   أو من خلال ملف seeder رئيسي:
 *   const { seedRehabRoles } = require('./rehabRolesSeeder');
 *   await seedRehabRoles();
 */

'use strict';

const mongoose = require('mongoose');
const {
  REHAB_ROLES,
  REHAB_PERMISSIONS,
  ROLE_PERMISSIONS_MAP,
} = require('../../config/rehab-roles');

// ═══════════════════════════════════════════════════════════════
// نماذج MongoDB
// ═══════════════════════════════════════════════════════════════

const RehabRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    display_name_ar: { type: String, required: true },
    display_name_en: { type: String, required: true },
    level: { type: Number, required: true, default: 0 },
    is_system: { type: Boolean, default: true },
    permissions: [{ type: String }], // أسماء الصلاحيات
    is_active: { type: Boolean, default: true },
    description: { type: String, default: '' },
  },
  {
    collection: 'rehab_roles',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

const RehabPermissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    display_name_ar: { type: String, required: true },
    display_name_en: { type: String, required: true },
    module: { type: String, required: true },
    group: { type: String, required: true },
    is_active: { type: Boolean, default: true },
  },
  {
    collection: 'rehab_permissions',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// استخدام نماذج موجودة أو إنشاء جديدة
const RehabRole = mongoose.models.RehabRole || mongoose.model('RehabRole', RehabRoleSchema);
const RehabPermission =
  mongoose.models.RehabPermission || mongoose.model('RehabPermission', RehabPermissionSchema);

// ═══════════════════════════════════════════════════════════════
// بيانات الأدوار (12 دور)
// ═══════════════════════════════════════════════════════════════

const ROLES_DATA = [
  {
    name: REHAB_ROLES.SUPER_ADMIN,
    display_name_ar: 'مدير النظام',
    display_name_en: 'Super Admin',
    level: 0,
    is_system: true,
    description: 'صلاحيات كاملة على كل الفروع، إدارة النظام والإعدادات، لا قيود',
  },
  {
    name: REHAB_ROLES.BRANCH_ADMIN,
    display_name_ar: 'مدير الفرع',
    display_name_en: 'Branch Admin',
    level: 1,
    is_system: true,
    description: 'صلاحيات كاملة على فرع واحد، إدارة الموظفين والإعدادات المحلية',
  },
  {
    name: REHAB_ROLES.MEDICAL_DIRECTOR,
    display_name_ar: 'المدير الطبي',
    display_name_en: 'Medical Director',
    level: 2,
    is_system: true,
    description: 'إشراف سريري كامل، الموافقة على الخطط العلاجية، مراجعة التقييمات',
  },
  {
    name: REHAB_ROLES.DOCTOR,
    display_name_ar: 'طبيب',
    display_name_en: 'Doctor',
    level: 3,
    is_system: true,
    description: 'تشخيص، وصف، إحالة، كتابة تقارير طبية',
  },
  {
    name: REHAB_ROLES.THERAPIST,
    display_name_ar: 'أخصائي علاج',
    display_name_en: 'Therapist',
    level: 4,
    is_system: true,
    description: 'إدارة جلساته، كتابة ملاحظات، متابعة أهداف، تقارير تقدم',
  },
  {
    name: REHAB_ROLES.SPECIAL_EDUCATOR,
    display_name_ar: 'معلم تربية خاصة',
    display_name_en: 'Special Educator',
    level: 4,
    is_system: true,
    description: 'إدارة البرامج التعليمية، تقييمات تربوية، خطط تعليمية فردية',
  },
  {
    name: REHAB_ROLES.RECEPTIONIST,
    display_name_ar: 'موظف استقبال',
    display_name_en: 'Receptionist',
    level: 5,
    is_system: true,
    description: 'تسجيل المستفيدين، إدارة المواعيد، الاستقبال',
  },
  {
    name: REHAB_ROLES.ACCOUNTANT,
    display_name_ar: 'محاسب',
    display_name_en: 'Accountant',
    level: 5,
    is_system: true,
    description: 'فواتير، مدفوعات، مطالبات تأمينية، تقارير مالية',
  },
  {
    name: REHAB_ROLES.HR_MANAGER,
    display_name_ar: 'مدير موارد بشرية',
    display_name_en: 'HR Manager',
    level: 3,
    is_system: true,
    description: 'إدارة الموظفين، الرواتب، الإجازات، GOSI، مقيم',
  },
  {
    name: REHAB_ROLES.DRIVER,
    display_name_ar: 'سائق',
    display_name_en: 'Driver',
    level: 6,
    is_system: true,
    description: 'عرض الرحلات المسندة، تسجيل الحضور، تأكيد الاستلام/التسليم',
  },
  {
    name: REHAB_ROLES.PARENT_GUARDIAN,
    display_name_ar: 'ولي أمر',
    display_name_en: 'Parent/Guardian',
    level: 7,
    is_system: true,
    description: 'بوابة محدودة: عرض بيانات أبنائه، المواعيد، التقارير، الفواتير',
  },
  {
    name: REHAB_ROLES.AUDITOR,
    display_name_ar: 'مدقق',
    display_name_en: 'Auditor',
    level: 8,
    is_system: true,
    description: 'قراءة فقط: عرض كل البيانات بدون تعديل، تصدير التقارير',
  },
];

// ═══════════════════════════════════════════════════════════════
// دالة الـ Seeding الرئيسية
// ═══════════════════════════════════════════════════════════════

/**
 * تهيئة الصلاحيات في قاعدة البيانات
 * @returns {Promise<number>} عدد الصلاحيات المُنشأة
 */
async function seedPermissions() {
  console.log('  📋 إنشاء الصلاحيات (161 صلاحية)...');

  let created = 0;
  let skipped = 0;

  for (const perm of REHAB_PERMISSIONS) {
    try {
      const existing = await RehabPermission.findOne({ name: perm.name });
      if (existing) {
        // تحديث إذا تغيرت البيانات
        await RehabPermission.updateOne({ name: perm.name }, { $set: perm });
        skipped++;
      } else {
        await RehabPermission.create(perm);
        created++;
      }
    } catch (err) {
      if (err.code === 11000) {
        skipped++;
      } else {
        console.error(`    ❌ خطأ في إنشاء صلاحية ${perm.name}:`, err.message);
      }
    }
  }

  console.log(`  ✅ الصلاحيات: ${created} جديدة، ${skipped} موجودة`);
  return created;
}

/**
 * تهيئة الأدوار في قاعدة البيانات
 * @returns {Promise<number>} عدد الأدوار المُنشأة
 */
async function seedRoles() {
  console.log('  👥 إنشاء الأدوار (12 دور)...');

  let created = 0;
  let skipped = 0;

  for (const roleData of ROLES_DATA) {
    try {
      // الحصول على قائمة الصلاحيات لهذا الدور
      const permissions = ROLE_PERMISSIONS_MAP[roleData.name] || [];

      const existing = await RehabRole.findOne({ name: roleData.name });
      if (existing) {
        // تحديث الصلاحيات إذا تغيرت
        await RehabRole.updateOne({ name: roleData.name }, { $set: { ...roleData, permissions } });
        skipped++;
      } else {
        await RehabRole.create({ ...roleData, permissions });
        created++;
      }
    } catch (err) {
      if (err.code === 11000) {
        skipped++;
      } else {
        console.error(`    ❌ خطأ في إنشاء دور ${roleData.name}:`, err.message);
      }
    }
  }

  console.log(`  ✅ الأدوار: ${created} جديدة، ${skipped} موجودة`);
  return created;
}

/**
 * الدالة الرئيسية للـ seeding
 * @returns {Promise<{ roles: number, permissions: number }>}
 */
async function seedRehabRoles() {
  console.log('\n🚀 بدء تهيئة أدوار وصلاحيات نظام التأهيل...');
  console.log('═'.repeat(55));

  const permissionsCreated = await seedPermissions();
  const rolesCreated = await seedRoles();

  console.log('═'.repeat(55));
  console.log('✅ تمت التهيئة بنجاح!');
  console.log(`   - الصلاحيات: ${REHAB_PERMISSIONS.length} إجمالي`);
  console.log(`   - الأدوار: ${ROLES_DATA.length} إجمالي`);
  console.log('═'.repeat(55) + '\n');

  return { roles: rolesCreated, permissions: permissionsCreated };
}

// ═══════════════════════════════════════════════════════════════
// تشغيل مباشر (node rehabRolesSeeder.js)
// ═══════════════════════════════════════════════════════════════

async function runStandalone() {
  const MONGODB_URI =
    process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rehab_erp';

  try {
    console.log(`🔌 الاتصال بقاعدة البيانات: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ تم الاتصال بقاعدة البيانات');

    await seedRehabRoles();

    await mongoose.disconnect();
    console.log('🔌 تم قطع الاتصال بقاعدة البيانات');
    process.exit(0);
  } catch (err) {
    console.error('❌ خطأ في الـ Seeder:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// تشغيل مباشر إذا استُدعي الملف مباشرة
if (require.main === module) {
  runStandalone();
}

module.exports = {
  seedRehabRoles,
  seedPermissions,
  seedRoles,
  RehabRole,
  RehabPermission,
};

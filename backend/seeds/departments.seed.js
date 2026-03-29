/**
 * Departments Seed
 * الأقسام الوظيفية - Al-Awael Rehabilitation Center
 */

'use strict';

const departments = [
  // ─── الإدارة ─────────────────────────────────────────────
  {
    code: 'EXEC',
    name: { ar: 'الإدارة التنفيذية', en: 'Executive Management' },
    type: 'administrative',
    parentCode: null,
    description: { ar: 'المدير التنفيذي والإدارة العليا', en: 'CEO and top management' },
    isActive: true,
    order: 1,
  },
  {
    code: 'ADMIN',
    name: { ar: 'الإدارة العامة', en: 'General Administration' },
    type: 'administrative',
    parentCode: 'EXEC',
    description: { ar: 'الشؤون الإدارية العامة', en: 'General administrative affairs' },
    isActive: true,
    order: 2,
  },
  {
    code: 'HR',
    name: { ar: 'الموارد البشرية', en: 'Human Resources' },
    type: 'administrative',
    parentCode: 'ADMIN',
    description: { ar: 'إدارة شؤون الموظفين والتوظيف', en: 'Employee management and recruitment' },
    isActive: true,
    order: 3,
  },
  {
    code: 'FIN',
    name: { ar: 'المالية والمحاسبة', en: 'Finance & Accounting' },
    type: 'administrative',
    parentCode: 'ADMIN',
    description: { ar: 'الشؤون المالية والمحاسبية', en: 'Financial and accounting affairs' },
    isActive: true,
    order: 4,
  },
  {
    code: 'IT',
    name: { ar: 'تقنية المعلومات', en: 'Information Technology' },
    type: 'administrative',
    parentCode: 'ADMIN',
    description: { ar: 'إدارة أنظمة المعلومات والتقنية', en: 'IT systems management' },
    isActive: true,
    order: 5,
  },
  {
    code: 'QUAL',
    name: { ar: 'الجودة والاعتماد', en: 'Quality & Accreditation' },
    type: 'administrative',
    parentCode: 'ADMIN',
    description: {
      ar: 'إدارة الجودة والاعتماد المؤسسي',
      en: 'Quality management and accreditation',
    },
    isActive: true,
    order: 6,
  },
  {
    code: 'PR',
    name: { ar: 'العلاقات العامة والتسويق', en: 'Public Relations & Marketing' },
    type: 'administrative',
    parentCode: 'ADMIN',
    description: { ar: 'التواصل الخارجي والتسويق', en: 'External communication and marketing' },
    isActive: true,
    order: 7,
  },
  {
    code: 'PROC',
    name: { ar: 'المشتريات والمستودعات', en: 'Procurement & Warehousing' },
    type: 'administrative',
    parentCode: 'ADMIN',
    description: { ar: 'إدارة المشتريات والمخزون', en: 'Procurement and inventory management' },
    isActive: true,
    order: 8,
  },

  // ─── الخدمات الطبية والتأهيلية ──────────────────────────
  {
    code: 'REHAB',
    name: { ar: 'التأهيل والخدمات العلاجية', en: 'Rehabilitation & Therapeutic Services' },
    type: 'clinical',
    parentCode: 'EXEC',
    description: { ar: 'الخدمات التأهيلية الشاملة', en: 'Comprehensive rehabilitation services' },
    isActive: true,
    order: 10,
  },
  {
    code: 'OT',
    name: { ar: 'العلاج الوظيفي', en: 'Occupational Therapy' },
    type: 'clinical',
    parentCode: 'REHAB',
    description: { ar: 'وحدة العلاج الوظيفي', en: 'Occupational therapy unit' },
    isActive: true,
    order: 11,
  },
  {
    code: 'PT',
    name: { ar: 'العلاج الطبيعي', en: 'Physical Therapy' },
    type: 'clinical',
    parentCode: 'REHAB',
    description: { ar: 'وحدة العلاج الطبيعي', en: 'Physical therapy unit' },
    isActive: true,
    order: 12,
  },
  {
    code: 'ST',
    name: { ar: 'علاج النطق واللغة', en: 'Speech & Language Therapy' },
    type: 'clinical',
    parentCode: 'REHAB',
    description: {
      ar: 'وحدة النطق واللغة والتواصل',
      en: 'Speech, language and communication unit',
    },
    isActive: true,
    order: 13,
  },
  {
    code: 'PSY',
    name: { ar: 'علم النفس والسلوك', en: 'Psychology & Behavioral Sciences' },
    type: 'clinical',
    parentCode: 'REHAB',
    description: {
      ar: 'وحدة الدعم النفسي وتعديل السلوك',
      en: 'Psychological support and behavior modification unit',
    },
    isActive: true,
    order: 14,
  },
  {
    code: 'SPECEDUC',
    name: { ar: 'التربية الخاصة', en: 'Special Education' },
    type: 'clinical',
    parentCode: 'REHAB',
    description: {
      ar: 'برامج التربية الخاصة والتعليم',
      en: 'Special education and learning programs',
    },
    isActive: true,
    order: 15,
  },
  {
    code: 'SW',
    name: { ar: 'الخدمة الاجتماعية', en: 'Social Work' },
    type: 'clinical',
    parentCode: 'REHAB',
    description: {
      ar: 'الدعم الاجتماعي للمستفيدين وأسرهم',
      en: 'Social support for beneficiaries and families',
    },
    isActive: true,
    order: 16,
  },
  {
    code: 'NUTRITION',
    name: { ar: 'التغذية العلاجية', en: 'Clinical Nutrition' },
    type: 'clinical',
    parentCode: 'REHAB',
    description: {
      ar: 'التغذية العلاجية والتقييم الغذائي',
      en: 'Clinical nutrition and nutritional assessment',
    },
    isActive: true,
    order: 17,
  },
  {
    code: 'SENSORY',
    name: { ar: 'التكامل الحسي', en: 'Sensory Integration' },
    type: 'clinical',
    parentCode: 'REHAB',
    description: { ar: 'وحدة التكامل الحسي', en: 'Sensory integration unit' },
    isActive: true,
    order: 18,
  },

  // ─── الخدمات المساندة ────────────────────────────────────
  {
    code: 'RECEPTION',
    name: { ar: 'الاستقبال وخدمة العملاء', en: 'Reception & Customer Service' },
    type: 'support',
    parentCode: 'ADMIN',
    description: {
      ar: 'استقبال المراجعين وإدارة المواعيد',
      en: 'Visitor reception and appointment management',
    },
    isActive: true,
    order: 20,
  },
  {
    code: 'TRANSPORT',
    name: { ar: 'النقل والمواصلات', en: 'Transportation' },
    type: 'support',
    parentCode: 'ADMIN',
    description: { ar: 'خدمات النقل للمستفيدين', en: 'Transportation services for beneficiaries' },
    isActive: true,
    order: 21,
  },
  {
    code: 'MAINT',
    name: { ar: 'الصيانة والخدمات', en: 'Maintenance & Facilities' },
    type: 'support',
    parentCode: 'ADMIN',
    description: { ar: 'صيانة المبنى والمعدات', en: 'Building and equipment maintenance' },
    isActive: true,
    order: 22,
  },
  {
    code: 'SEC',
    name: { ar: 'الأمن والسلامة', en: 'Security & Safety' },
    type: 'support',
    parentCode: 'ADMIN',
    description: {
      ar: 'أمن المنشأة والسلامة المهنية',
      en: 'Facility security and occupational safety',
    },
    isActive: true,
    order: 23,
  },
];

async function seed(connection) {
  const db = connection.db || connection;
  const col = db.collection('departments');

  // Build code→_id map for parent references
  const idMap = {};

  let upserted = 0;
  let skipped = 0;

  for (const dept of departments) {
    const { parentCode, ...deptData } = dept;

    const doc = {
      ...deptData,
      parentDepartment: null,
      employees: [],
      isActive: deptData.isActive,
      metadata: { isSystem: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (parentCode && idMap[parentCode]) {
      doc.parentDepartment = idMap[parentCode];
    }

    const result = await col.updateOne(
      { code: dept.code },
      {
        $setOnInsert: doc,
        $set: { updatedAt: new Date(), name: deptData.name, isActive: deptData.isActive },
      },
      { upsert: true }
    );

    if (result.upsertedId) {
      idMap[dept.code] = result.upsertedId;
      upserted++;
    } else {
      const existing = await col.findOne({ code: dept.code }, { projection: { _id: 1 } });
      if (existing) idMap[dept.code] = existing._id;
      skipped++;
    }
  }

  console.log(`  ✔ departments: ${upserted} inserted, ${skipped} already existed`);
}

async function down(connection) {
  const db = connection.db || connection;
  const result = await db.collection('departments').deleteMany({ 'metadata.isSystem': true });
  console.log(`  ✔ departments: removed ${result.deletedCount} system departments`);
}

module.exports = { seed, down };

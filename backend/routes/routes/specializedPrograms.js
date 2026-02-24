/**
 * API البرامج المتخصصة - Specialized Programs API
 * يدير عمليات CRUD والتقارير الخاصة بالبرامج
 */

const express = require('express');
const router = express.Router();
const {
  SpecializedProgram,
  DISABILITY_TYPES,
  SEVERITY_LEVELS,
} = require('../models/specializedProgram');

/**
 * GET /api/programs
 * الحصول على قائمة البرامج مع التصفية والترتيب
 */
router.get('/', async (req, res) => {
  try {
    const {
      disabilityType,
      isActive = true,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = -1,
    } = req.query;

    const filter = { isActive };
    if (disabilityType) filter.disabilityType = disabilityType;

    const skip = (page - 1) * limit;

    const programs = await SpecializedProgram.model
      .find(filter)
      .sort({ [sortBy]: parseInt(sortOrder) })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SpecializedProgram.model.countDocuments(filter);

    res.success(
      {
        programs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
      'تم جلب البرامج بنجاح'
    );
  } catch (error) {
    res.error(error, 'فشل في جلب البرامج');
  }
});

/**
 * GET /api/programs/disability-types
 * الحصول على قائمة أنواع الإعاقات المدعومة
 */
router.get('/disability-types', (req, res) => {
  try {
    res.success(
      {
        types: DISABILITY_TYPES,
        severityLevels: SEVERITY_LEVELS,
      },
      'تم جلب أنواع الإعاقات'
    );
  } catch (error) {
    res.error(error, 'فشل في جلب أنواع الإعاقات');
  }
});

/**
 * GET /api/programs/:id
 * الحصول على تفاصيل برنامج واحد
 */
router.get('/:id', async (req, res) => {
  try {
    const program = await SpecializedProgram.model.findById(req.params.id);

    if (!program) {
      return res.error('البرنامج غير موجود', 'Program not found', 404);
    }

    // جلب الأنشطة والمواد المرتبطة إذا كانت موجودة
    const enrichedProgram = {
      ...program.toObject(),
      activitiesCount: program.activities?.length || 0,
      materialsCount: program.materials?.length || 0,
      equipmentCount: program.requiredEquipment?.length || 0,
    };

    res.success(enrichedProgram, 'تم جلب تفاصيل البرنامج');
  } catch (error) {
    res.error(error, 'فشل في جلب البرنامج');
  }
});

/**
 * POST /api/programs
 * إنشاء برنامج متخصص جديد
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      disabilityType,
      supportedSeverityLevels,
      ageGroup,
      sessionConfig,
      programGoals,
      activities,
      requiredEquipment,
      materials,
      qualifiedSpecialists,
      eligibilityCriteria,
      expectedOutcomes,
      pricing,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !code || !disabilityType) {
      return res.error('البيانات المطلوبة غير مكتملة', 'Missing required fields', 400);
    }

    // التحقق من فريادة الكود
    const existingProgram = await SpecializedProgram.model.findOne({ code });
    if (existingProgram) {
      return res.error('هذا الكود مستخدم بالفعل', 'Code already exists', 400);
    }

    const newProgram = new SpecializedProgram.model({
      name,
      code,
      description,
      disabilityType,
      supportedSeverityLevels: supportedSeverityLevels || [],
      ageGroup,
      sessionConfig: sessionConfig || {},
      programGoals: programGoals || [],
      activities: activities || [],
      requiredEquipment: requiredEquipment || [],
      materials: materials || [],
      qualifiedSpecialists: qualifiedSpecialists || [],
      eligibilityCriteria: eligibilityCriteria || {},
      expectedOutcomes: expectedOutcomes || [],
      pricing,
      createdBy: req.user?.id,
      status: 'draft',
    });

    await newProgram.save();

    res.success(newProgram, 'تم إنشاء البرنامج بنجاح', 201);
  } catch (error) {
    res.error(error, 'فشل في إنشاء البرنامج');
  }
});

/**
 * PUT /api/programs/:id
 * تحديث برنامج متخصص
 */
router.put('/:id', async (req, res) => {
  try {
    const program = await SpecializedProgram.model.findById(req.params.id);

    if (!program) {
      return res.error('البرنامج غير موجود', 'Program not found', 404);
    }

    // تحديث الحقول المسموحة
    const allowedFields = [
      'name',
      'description',
      'supportedSeverityLevels',
      'ageGroup',
      'sessionConfig',
      'programGoals',
      'activities',
      'requiredEquipment',
      'materials',
      'qualifiedSpecialists',
      'eligibilityCriteria',
      'expectedOutcomes',
      'pricing',
      'specialNotes',
      'isActive',
      'status',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        program[field] = req.body[field];
      }
    });

    program.updatedBy = req.user?.id;
    program.updatedAt = new Date();

    await program.save();

    res.success(program, 'تم تحديث البرنامج بنجاح');
  } catch (error) {
    res.error(error, 'فشل في تحديث البرنامج');
  }
});

/**
 * DELETE /api/programs/:id
 * حذف برنامج (تأرشيف فقط، لا حذف حقيقي)
 */
router.delete('/:id', async (req, res) => {
  try {
    const program = await SpecializedProgram.model.findById(req.params.id);

    if (!program) {
      return res.error('البرنامج غير موجود', 'Program not found', 404);
    }

    program.isActive = false;
    program.status = 'archived';
    program.updatedBy = req.user?.id;
    program.updatedAt = new Date();

    await program.save();

    res.success(program, 'تم أرشفة البرنامج بنجاح');
  } catch (error) {
    res.error(error, 'فشل في حذف البرنامج');
  }
});

/**
 * GET /api/programs/by-disability/:disabilityType
 * الحصول على البرامج حسب نوع الإعاقة
 */
router.get('/by-disability/:disabilityType', async (req, res) => {
  try {
    const programs = await SpecializedProgram.model.find({
      disabilityType: req.params.disabilityType,
      isActive: true,
    });

    if (programs.length === 0) {
      return res.success([], 'لا توجد برامج لهذا النوع من الإعاقة');
    }

    res.success(programs, `تم جلب ${programs.length} برامج لنوع الإعاقة المحدد`);
  } catch (error) {
    res.error(error, 'فشل في جلب البرامج');
  }
});

/**
 * POST /api/programs/:id/activate
 * تفعيل برنامج
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const program = await SpecializedProgram.model.findById(req.params.id);

    if (!program) {
      return res.error('البرنامج غير موجود', 'Program not found', 404);
    }

    program.isActive = true;
    program.status = 'active';
    program.updatedBy = req.user?.id;

    await program.save();

    res.success(program, 'تم تفعيل البرنامج بنجاح');
  } catch (error) {
    res.error(error, 'فشل في تفعيل البرنامج');
  }
});

/**
 * GET /api/programs/:id/statistics
 * الحصول على إحصائيات البرنامج
 */
router.get('/:id/statistics', async (req, res) => {
  try {
    const program = await SpecializedProgram.model.findById(req.params.id);

    if (!program) {
      return res.error('البرنامج غير موجود', 'Program not found', 404);
    }

    res.success(
      {
        programId: program._id,
        programName: program.name,
        statistics: program.statistics || {},
        lastUpdated: program.updatedAt,
      },
      'تم جلب إحصائيات البرنامج'
    );
  } catch (error) {
    res.error(error, 'فشل في جلب الإحصائيات');
  }
});

module.exports = router;

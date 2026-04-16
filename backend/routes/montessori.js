const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { paginate } = require('../utils/paginate');
const {
  Student,
  MontessoriPlan,
  Session,
  Evaluation,
  Activity,
  TeamMember,
  Parent,
  MediaFile,
  Report,
  MontessoriProgram,
} = require('../models/montessori');
const { authenticateToken, requireRole: authorizeRoles } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// Async error safety wrapper — catches unhandled promise rejections in route handlers
const wrapAsync = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const _get = router.get.bind(router);
const _post = router.post.bind(router);
const _put = router.put.bind(router);
const _delete = router.delete.bind(router);
const wrapHandlers = (...args) => args.map(a => (typeof a === 'function' ? wrapAsync(a) : a));
router.get = (path, ...h) => _get(path, ...wrapHandlers(...h));
router.post = (path, ...h) => _post(path, ...wrapHandlers(...h));
router.put = (path, ...h) => _put(path, ...wrapHandlers(...h));
router.delete = (path, ...h) => _delete(path, ...wrapHandlers(...h));

// حماية جميع المسارات - يجب تسجيل الدخول
router.use(authenticateToken);
router.use(requireBranchAccess);
// ─── برامج المنتسوري CRUD (المسار الجذري) ────────────────────
router.get('/', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const query = MontessoriProgram.find().sort({ createdAt: -1 });
  const { data, meta } = await paginate(query, req.query);
  res.json({ success: true, data, ...meta });
});
router.post('/', authorizeRoles('مدير', 'معلم'), async (req, res) => {
  const program = new MontessoriProgram({ ...req.body, createdBy: req.user?.id });
  await program.save();
  res.status(201).json(program);
});
router.get('/:id', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res, next) => {
  // تجاوز إذا كان المسار يطابق أحد الموارد الفرعية
  const subResources = [
    'students',
    'plans',
    'sessions',
    'evaluations',
    'activities',
    'team',
    'parents',
    'media',
    'reports',
  ];
  if (subResources.includes(req.params.id)) return next();
  const program = await MontessoriProgram.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'البرنامج غير موجود' });
  res.json(program);
});
router.put('/:id', authorizeRoles('مدير', 'معلم'), async (req, res, next) => {
  const subResources = [
    'students',
    'plans',
    'sessions',
    'evaluations',
    'activities',
    'team',
    'parents',
    'media',
    'reports',
  ];
  if (subResources.includes(req.params.id)) return next();
  const { name, ageGroup, capacity, enrolled, instructor, status, schedule, description } =
    req.body;
  const program = await MontessoriProgram.findByIdAndUpdate(
    req.params.id,
    { name, ageGroup, capacity, enrolled, instructor, status, schedule, description },
    { new: true }
  );
  if (!program) return res.status(404).json({ message: 'البرنامج غير موجود' });
  res.json(program);
});
router.delete('/:id', authorizeRoles('مدير'), async (req, res, next) => {
  const subResources = [
    'students',
    'plans',
    'sessions',
    'evaluations',
    'activities',
    'team',
    'parents',
    'media',
    'reports',
  ];
  if (subResources.includes(req.params.id)) return next();
  const program = await MontessoriProgram.findByIdAndDelete(req.params.id);
  if (!program) return res.status(404).json({ message: 'البرنامج غير موجود' });
  res.json({ message: 'تم حذف البرنامج بنجاح' });
});

// الطلاب CRUD
router.get('/students', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const query = Student.find().populate('parent plan evaluations media');
  const { data, meta } = await paginate(query, req.query);
  res.json({ success: true, data, ...meta });
});
router.post('/students', authorizeRoles('مدير', 'معلم'), async (req, res) => {
  const student = new Student(req.body);
  await student.save();
  res.status(201).json(student);
});
router.get(
  '/students/:id',
  authorizeRoles('مدير', 'معلم', 'أخصائي', 'ولي أمر'),
  async (req, res) => {
    const student = await Student.findById(req.params.id).populate('parent plan evaluations media');
    if (!student) return res.status(404).json({ message: 'Not found' });
    res.json(student);
  }
);
router.put('/students/:id', authorizeRoles('مدير', 'معلم'), async (req, res) => {
  const { fullName, birthDate, gender, disabilityTypes, parent, plan, notes } = req.body;
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { fullName, birthDate, gender, disabilityTypes, parent, plan, notes },
    { new: true }
  );
  if (!student) return res.status(404).json({ message: 'Not found' });
  res.json(student);
});
router.delete('/students/:id', authorizeRoles('مدير'), async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

// الخطط الفردية CRUD
router.get('/plans', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const query = MontessoriPlan.find().populate('student createdBy');
  const { data, meta } = await paginate(query, req.query);
  res.json({ success: true, data, ...meta });
});
router.post('/plans', authorizeRoles('مدير', 'معلم'), async (req, res) => {
  const plan = new MontessoriPlan(req.body);
  await plan.save();
  res.status(201).json(plan);
});
router.get('/plans/:id', authorizeRoles('مدير', 'معلم', 'أخصائي', 'ولي أمر'), async (req, res) => {
  const plan = await MontessoriPlan.findById(req.params.id).populate('student createdBy');
  if (!plan) return res.status(404).json({ message: 'Not found' });
  res.json(plan);
});
router.put('/plans/:id', authorizeRoles('مدير', 'معلم'), async (req, res) => {
  const { student, goals } = req.body;
  const plan = await MontessoriPlan.findByIdAndUpdate(
    req.params.id,
    { student, goals },
    { new: true }
  );
  if (!plan) return res.status(404).json({ message: 'Not found' });
  res.json(plan);
});
router.delete('/plans/:id', authorizeRoles('مدير'), async (req, res) => {
  const plan = await MontessoriPlan.findByIdAndDelete(req.params.id);
  if (!plan) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

// الجلسات CRUD
router.get('/sessions', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const query = Session.find().populate('student plan createdBy');
  const { data, meta } = await paginate(query, req.query);
  res.json({ success: true, data, ...meta });
});
router.post('/sessions', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const session = new Session(req.body);
  await session.save();
  res.status(201).json(session);
});
router.get(
  '/sessions/:id',
  authorizeRoles('مدير', 'معلم', 'أخصائي', 'ولي أمر'),
  async (req, res) => {
    const session = await Session.findById(req.params.id).populate('student plan createdBy');
    if (!session) return res.status(404).json({ message: 'Not found' });
    res.json(session);
  }
);
router.put('/sessions/:id', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const { student, plan: planRef, date, type, activities, attendance, notes } = req.body;
  const session = await Session.findByIdAndUpdate(
    req.params.id,
    { student, plan: planRef, date, type, activities, attendance, notes },
    { new: true }
  );
  if (!session) return res.status(404).json({ message: 'Not found' });
  res.json(session);
});
router.delete('/sessions/:id', authorizeRoles('مدير'), async (req, res) => {
  const session = await Session.findByIdAndDelete(req.params.id);
  if (!session) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

// التقييمات CRUD
router.get('/evaluations', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const query = Evaluation.find().populate('student plan createdBy');
  const { data, meta } = await paginate(query, req.query);
  res.json({ success: true, data, ...meta });
});
router.post('/evaluations', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const evaluation = new Evaluation(req.body);
  await evaluation.save();
  res.status(201).json(evaluation);
});
router.get(
  '/evaluations/:id',
  authorizeRoles('مدير', 'معلم', 'أخصائي', 'ولي أمر'),
  async (req, res) => {
    const evaluation = await Evaluation.findById(req.params.id).populate('student plan createdBy');
    if (!evaluation) return res.status(404).json({ message: 'Not found' });
    res.json(evaluation);
  }
);
router.put('/evaluations/:id', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const { student, plan: planRef, date, area, skill, level, notes } = req.body;
  const evaluation = await Evaluation.findByIdAndUpdate(
    req.params.id,
    { student, plan: planRef, date, area, skill, level, notes },
    { new: true }
  );
  if (!evaluation) return res.status(404).json({ message: 'Not found' });
  res.json(evaluation);
});
router.delete('/evaluations/:id', authorizeRoles('مدير'), async (req, res) => {
  const evaluation = await Evaluation.findByIdAndDelete(req.params.id);
  if (!evaluation) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

// الأنشطة CRUD
router.get('/activities', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const query = Activity.find().populate('media');
  const { data, meta } = await paginate(query, req.query);
  res.json({ success: true, data, ...meta });
});
router.post('/activities', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const activity = new Activity(req.body);
  await activity.save();
  res.status(201).json(activity);
});
router.get(
  '/activities/:id',
  authorizeRoles('مدير', 'معلم', 'أخصائي', 'ولي أمر'),
  async (req, res) => {
    const activity = await Activity.findById(req.params.id).populate('media');
    if (!activity) return res.status(404).json({ message: 'Not found' });
    res.json(activity);
  }
);
router.put('/activities/:id', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const { name, description, area, media } = req.body;
  const activity = await Activity.findByIdAndUpdate(
    req.params.id,
    { name, description, area, media },
    { new: true }
  );
  if (!activity) return res.status(404).json({ message: 'Not found' });
  res.json(activity);
});
router.delete('/activities/:id', authorizeRoles('مدير'), async (req, res) => {
  const activity = await Activity.findByIdAndDelete(req.params.id);
  if (!activity) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

// الفريق CRUD
router.get('/team', authorizeRoles('مدير'), async (req, res) => {
  const query = TeamMember.find().populate('user');
  const { data, meta } = await paginate(query, req.query);
  res.json({ success: true, data, ...meta });
});
router.post('/team', authorizeRoles('مدير'), async (req, res) => {
  const member = new TeamMember(req.body);
  await member.save();
  res.status(201).json(member);
});
router.get('/team/:id', authorizeRoles('مدير'), async (req, res) => {
  const member = await TeamMember.findById(req.params.id).populate('user');
  if (!member) return res.status(404).json({ message: 'Not found' });
  res.json(member);
});
router.put('/team/:id', authorizeRoles('مدير'), async (req, res) => {
  const { name, role, contact } = req.body;
  const member = await TeamMember.findByIdAndUpdate(
    req.params.id,
    { name, role, contact },
    { new: true }
  );
  if (!member) return res.status(404).json({ message: 'Not found' });
  res.json(member);
});
router.delete('/team/:id', authorizeRoles('مدير'), async (req, res) => {
  const member = await TeamMember.findByIdAndDelete(req.params.id);
  if (!member) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

// أولياء الأمور CRUD
router.get('/parents', authorizeRoles('مدير', 'معلم'), async (req, res) => {
  const query = Parent.find().populate('students user');
  const { data, meta } = await paginate(query, req.query);
  res.json({ success: true, data, ...meta });
});
router.post('/parents', authorizeRoles('مدير'), async (req, res) => {
  const parent = new Parent(req.body);
  await parent.save();
  res.status(201).json(parent);
});
router.get('/parents/:id', authorizeRoles('مدير', 'معلم', 'ولي أمر'), async (req, res) => {
  const parent = await Parent.findById(req.params.id).populate('students user');
  if (!parent) return res.status(404).json({ message: 'Not found' });
  res.json(parent);
});
router.put('/parents/:id', authorizeRoles('مدير'), async (req, res) => {
  const { name, phone, email, students } = req.body;
  const parent = await Parent.findByIdAndUpdate(
    req.params.id,
    { name, phone, email, students },
    { new: true }
  );
  if (!parent) return res.status(404).json({ message: 'Not found' });
  res.json(parent);
});
router.delete('/parents/:id', authorizeRoles('مدير'), async (req, res) => {
  const parent = await Parent.findByIdAndDelete(req.params.id);
  if (!parent) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

// ملفات الوسائط CRUD
router.get('/media', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const query = MediaFile.find().populate('uploadedBy');
  const { data, meta } = await paginate(query, req.query);
  res.json({ success: true, data, ...meta });
});
router.post('/media', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const media = new MediaFile(req.body);
  await media.save();
  res.status(201).json(media);
});
router.get('/media/:id', authorizeRoles('مدير', 'معلم', 'أخصائي', 'ولي أمر'), async (req, res) => {
  const media = await MediaFile.findById(req.params.id).populate('uploadedBy');
  if (!media) return res.status(404).json({ message: 'Not found' });
  res.json(media);
});
router.put('/media/:id', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const { url, type } = req.body;
  const media = await MediaFile.findByIdAndUpdate(req.params.id, { url, type }, { new: true });
  if (!media) return res.status(404).json({ message: 'Not found' });
  res.json(media);
});
router.delete('/media/:id', authorizeRoles('مدير'), async (req, res) => {
  const media = await MediaFile.findByIdAndDelete(req.params.id);
  if (!media) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

// التقارير CRUD
router.get('/reports', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const query = Report.find().populate('student plan createdBy');
  const { data, meta } = await paginate(query, req.query);
  res.json({ success: true, data, ...meta });
});
router.post('/reports', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const report = new Report(req.body);
  await report.save();
  res.status(201).json(report);
});
router.get(
  '/reports/:id',
  authorizeRoles('مدير', 'معلم', 'أخصائي', 'ولي أمر'),
  async (req, res) => {
    const report = await Report.findById(req.params.id).populate('student plan createdBy');
    if (!report) return res.status(404).json({ message: 'Not found' });
    res.json(report);
  }
);
router.put('/reports/:id', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const { student, plan: planRef, date, summary, recommendations } = req.body;
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { student, plan: planRef, date, summary, recommendations },
    { new: true }
  );
  if (!report) return res.status(404).json({ message: 'Not found' });
  res.json(report);
});
router.delete('/reports/:id', authorizeRoles('مدير'), async (req, res) => {
  const report = await Report.findByIdAndDelete(req.params.id);
  if (!report) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

// Router-level error handler
router.use((err, _req, res, _next) => {
  logger.error('Montessori route error:', err.message);
  res.status(err.status || 500).json({ success: false, error: 'حدث خطأ في الخادم' });
});

module.exports = router;

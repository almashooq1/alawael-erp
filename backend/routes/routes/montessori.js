const express = require('express');
const router = express.Router();
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
} = require('../models/montessori');
const { authenticateToken, authorizeRoles } = require('../middleware/montessoriAuth');

// حماية جميع المسارات - يجب تسجيل الدخول
router.use(authenticateToken);

// الطلاب CRUD
// الطلاب CRUD
router.get('/students', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const students = await Student.find().populate('parent plan evaluations media');
  res.json(students);
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
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!student) return res.status(404).json({ message: 'Not found' });
  res.json(student);
});
router.delete('/students/:id', authorizeRoles('مدير'), async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// الخطط الفردية CRUD
router.get('/plans', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const plans = await MontessoriPlan.find().populate('student createdBy');
  res.json(plans);
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
  const plan = await MontessoriPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!plan) return res.status(404).json({ message: 'Not found' });
  res.json(plan);
});
router.delete('/plans/:id', authorizeRoles('مدير'), async (req, res) => {
  await MontessoriPlan.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// الجلسات CRUD
router.get('/sessions', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const sessions = await Session.find().populate('student plan createdBy');
  res.json(sessions);
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
  const session = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!session) return res.status(404).json({ message: 'Not found' });
  res.json(session);
});
router.delete('/sessions/:id', authorizeRoles('مدير'), async (req, res) => {
  await Session.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// التقييمات CRUD
router.get('/evaluations', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const evaluations = await Evaluation.find().populate('student plan createdBy');
  res.json(evaluations);
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
  const evaluation = await Evaluation.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!evaluation) return res.status(404).json({ message: 'Not found' });
  res.json(evaluation);
});
router.delete('/evaluations/:id', authorizeRoles('مدير'), async (req, res) => {
  await Evaluation.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// الأنشطة CRUD
router.get('/activities', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const activities = await Activity.find().populate('media');
  res.json(activities);
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
  const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!activity) return res.status(404).json({ message: 'Not found' });
  res.json(activity);
});
router.delete('/activities/:id', authorizeRoles('مدير'), async (req, res) => {
  await Activity.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// الفريق CRUD
router.get('/team', authorizeRoles('مدير'), async (req, res) => {
  const team = await TeamMember.find().populate('user');
  res.json(team);
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
  const member = await TeamMember.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!member) return res.status(404).json({ message: 'Not found' });
  res.json(member);
});
router.delete('/team/:id', authorizeRoles('مدير'), async (req, res) => {
  await TeamMember.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// أولياء الأمور CRUD
router.get('/parents', authorizeRoles('مدير', 'معلم'), async (req, res) => {
  const parents = await Parent.find().populate('students user');
  res.json(parents);
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
  const parent = await Parent.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!parent) return res.status(404).json({ message: 'Not found' });
  res.json(parent);
});
router.delete('/parents/:id', authorizeRoles('مدير'), async (req, res) => {
  await Parent.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// ملفات الوسائط CRUD
router.get('/media', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const media = await MediaFile.find().populate('uploadedBy');
  res.json(media);
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
  const media = await MediaFile.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!media) return res.status(404).json({ message: 'Not found' });
  res.json(media);
});
router.delete('/media/:id', authorizeRoles('مدير'), async (req, res) => {
  await MediaFile.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// التقارير CRUD
router.get('/reports', authorizeRoles('مدير', 'معلم', 'أخصائي'), async (req, res) => {
  const reports = await Report.find().populate('student plan createdBy');
  res.json(reports);
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
  const report = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!report) return res.status(404).json({ message: 'Not found' });
  res.json(report);
});
router.delete('/reports/:id', authorizeRoles('مدير'), async (req, res) => {
  await Report.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;

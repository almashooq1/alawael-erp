/* ─────────────────────────────────────────────────────────
   Al-Awael ERP — Task & Project Management Service  (Port 3700)
   ───────────────────────────────────────────────────────── */
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const helmet = require('helmet');
const cors = require('cors');
const cron = require('node-cron');
const dayjs = require('dayjs');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 3700;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_tasks';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/* ── Redis ───────────────────────────────────────────── */
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});
redis.on('error', e => console.error('Redis error', e.message));

/* ── BullMQ ──────────────────────────────────────────── */
const connection = { connection: redis };
const taskQueue = new Queue('task-actions', connection);

/* ── Mongoose Schemas ────────────────────────────────── */

// ── Project ──
const projectSchema = new mongoose.Schema(
  {
    projectId: { type: String, unique: true },
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled', 'archived'],
      default: 'planning',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    manager: { userId: String, name: String },
    members: [{ userId: String, name: String, role: { type: String, enum: ['owner', 'manager', 'member', 'viewer'], default: 'member' } }],
    startDate: Date,
    endDate: Date,
    budget: { allocated: { type: Number, default: 0 }, spent: { type: Number, default: 0 }, currency: { type: String, default: 'SAR' } },
    tags: [String],
    category: { type: String, enum: ['academic', 'administrative', 'maintenance', 'events', 'development', 'other'], default: 'other' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

projectSchema.pre('save', async function (next) {
  if (!this.projectId) {
    const count = await mongoose.model('Project').countDocuments();
    this.projectId = `PRJ-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});
const Project = mongoose.model('Project', projectSchema);

// ── Task ──
const taskSchema = new mongoose.Schema(
  {
    taskId: { type: String, unique: true },
    projectId: String,
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    status: {
      type: String,
      enum: ['backlog', 'todo', 'in-progress', 'in-review', 'testing', 'done', 'cancelled'],
      default: 'todo',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    type: { type: String, enum: ['task', 'bug', 'feature', 'improvement', 'sub-task', 'epic'], default: 'task' },
    assignee: { userId: String, name: String },
    reporter: { userId: String, name: String },
    watchers: [{ userId: String, name: String }],
    parentTaskId: String,
    dependencies: [{ taskId: String, type: { type: String, enum: ['blocks', 'blocked-by', 'relates-to'] } }],
    dueDate: Date,
    startDate: Date,
    completedAt: Date,
    estimatedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    tags: [String],
    attachments: [{ name: String, url: String, size: Number, uploadedAt: Date }],
    comments: [
      {
        commentId: String,
        userId: String,
        userName: String,
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    board: { column: String, order: { type: Number, default: 0 } },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

taskSchema.pre('save', async function (next) {
  if (!this.taskId) {
    const count = await mongoose.model('Task').countDocuments();
    this.taskId = `TSK-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});
const Task = mongoose.model('Task', taskSchema);

// ── Board (Kanban) ──
const boardSchema = new mongoose.Schema(
  {
    boardId: { type: String, unique: true },
    projectId: { type: String, required: true },
    name: { type: String, required: true },
    columns: [
      {
        columnId: String,
        name: String,
        nameAr: String,
        order: Number,
        wipLimit: { type: Number, default: 0 },
        color: String,
      },
    ],
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

boardSchema.pre('save', async function (next) {
  if (!this.boardId) {
    const count = await mongoose.model('Board').countDocuments();
    this.boardId = `BRD-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});
const Board = mongoose.model('Board', boardSchema);

// ── Sprint / Milestone ──
const sprintSchema = new mongoose.Schema(
  {
    sprintId: { type: String, unique: true },
    projectId: { type: String, required: true },
    name: { type: String, required: true },
    goal: String,
    status: { type: String, enum: ['planning', 'active', 'completed', 'cancelled'], default: 'planning' },
    startDate: Date,
    endDate: Date,
    taskIds: [String],
    velocity: { type: Number, default: 0 },
    completedPoints: { type: Number, default: 0 },
  },
  { timestamps: true },
);

sprintSchema.pre('save', async function (next) {
  if (!this.sprintId) {
    const count = await mongoose.model('Sprint').countDocuments();
    this.sprintId = `SPR-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});
const Sprint = mongoose.model('Sprint', sprintSchema);

// ── Activity Log ──
const activitySchema = new mongoose.Schema({
  action: { type: String, required: true },
  entityType: { type: String, enum: ['project', 'task', 'board', 'sprint', 'comment'] },
  entityId: String,
  userId: String,
  userName: String,
  details: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, expires: 7776000 }, // 90 days TTL
});
const Activity = mongoose.model('Activity', activitySchema);

/* ── BullMQ Worker ───────────────────────────────────── */
new Worker(
  'task-actions',
  async job => {
    const { action, data } = job.data;
    if (action === 'update-project-stats') {
      const { projectId } = data;
      const total = await Task.countDocuments({ projectId });
      const completed = await Task.countDocuments({ projectId, status: 'done' });
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      await Project.findOneAndUpdate({ projectId }, { totalTasks: total, completedTasks: completed, progress });
    }
    if (action === 'check-overdue') {
      const overdue = await Task.updateMany(
        { status: { $nin: ['done', 'cancelled'] }, dueDate: { $lt: new Date() } },
        { $set: { 'metadata.overdue': true } },
      );
      console.log(`[Cron] Marked ${overdue.modifiedCount} tasks as overdue`);
    }
  },
  connection,
);

/* ── Helper ──────────────────────────────────────────── */
async function logActivity(action, entityType, entityId, userId, userName, details) {
  await Activity.create({ action, entityType, entityId, userId, userName, details });
}

/* ── Health ───────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  res.status(mongoOk && redisOk ? 200 : 503).json({
    status: mongoOk && redisOk ? 'healthy' : 'degraded',
    service: 'task-project-service',
    timestamp: new Date().toISOString(),
    mongo: mongoOk ? 'connected' : 'disconnected',
    redis: redisOk ? 'connected' : 'disconnected',
  });
});

/* ══════════════ PROJECT ENDPOINTS ══════════════ */

app.post('/api/projects', async (req, res) => {
  try {
    const project = await new Project(req.body).save();
    // create default board
    await new Board({
      projectId: project.projectId,
      name: 'Default Board',
      isDefault: true,
      columns: [
        { columnId: 'backlog', name: 'Backlog', nameAr: 'قائمة الانتظار', order: 0, color: '#94a3b8' },
        { columnId: 'todo', name: 'To Do', nameAr: 'قيد الانتظار', order: 1, color: '#60a5fa' },
        { columnId: 'in-progress', name: 'In Progress', nameAr: 'قيد التنفيذ', order: 2, color: '#fbbf24' },
        { columnId: 'in-review', name: 'In Review', nameAr: 'قيد المراجعة', order: 3, color: '#a78bfa' },
        { columnId: 'done', name: 'Done', nameAr: 'مكتمل', order: 4, color: '#34d399' },
      ],
    }).save();
    await logActivity('create', 'project', project.projectId, req.body.manager?.userId, req.body.manager?.name, { name: project.name });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const projects = await Project.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Project.countDocuments(filter);
    res.json({ success: true, data: projects, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ projectId: req.params.id });
    if (!project) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate({ projectId: req.params.id }, req.body, { new: true });
    if (!project) return res.status(404).json({ success: false, error: 'Not found' });
    await logActivity('update', 'project', req.params.id, req.body.updatedBy, null, req.body);
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await Project.findOneAndDelete({ projectId: req.params.id });
    await Task.deleteMany({ projectId: req.params.id });
    await Board.deleteMany({ projectId: req.params.id });
    await Sprint.deleteMany({ projectId: req.params.id });
    res.json({ success: true, message: 'Project and related data deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ TASK ENDPOINTS ══════════════ */

app.post('/api/tasks', async (req, res) => {
  try {
    const task = await new Task(req.body).save();
    if (task.projectId) {
      await taskQueue.add('update-project-stats', { action: 'update-project-stats', data: { projectId: task.projectId } });
    }
    await logActivity('create', 'task', task.taskId, req.body.reporter?.userId, req.body.reporter?.name, { title: task.title });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const { projectId, status, priority, assignee, type, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter['assignee.userId'] = assignee;
    if (type) filter.type = type;
    const tasks = await Task.find(filter)
      .sort({ 'board.order': 1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Task.countDocuments(filter);
    res.json({ success: true, data: tasks, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ taskId: req.params.id });
    if (!task) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    if (req.body.status === 'done' && !req.body.completedAt) req.body.completedAt = new Date();
    const task = await Task.findOneAndUpdate({ taskId: req.params.id }, req.body, { new: true });
    if (!task) return res.status(404).json({ success: false, error: 'Not found' });
    if (task.projectId) {
      await taskQueue.add('update-project-stats', { action: 'update-project-stats', data: { projectId: task.projectId } });
    }
    await logActivity('update', 'task', req.params.id, req.body.updatedBy, null, req.body);
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ taskId: req.params.id });
    if (task?.projectId) {
      await taskQueue.add('update-project-stats', { action: 'update-project-stats', data: { projectId: task.projectId } });
    }
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─ Task Comments
app.post('/api/tasks/:id/comments', async (req, res) => {
  try {
    const { userId, userName, text } = req.body;
    const task = await Task.findOneAndUpdate(
      { taskId: req.params.id },
      { $push: { comments: { commentId: `CMT-${Date.now()}`, userId, userName, text } } },
      { new: true },
    );
    if (!task) return res.status(404).json({ success: false, error: 'Not found' });
    await logActivity('comment', 'task', req.params.id, userId, userName, { text });
    res.status(201).json({ success: true, data: task.comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─ Move task on Kanban board
app.put('/api/tasks/:id/move', async (req, res) => {
  try {
    const { column, order, status } = req.body;
    const update = { 'board.column': column };
    if (order !== undefined) update['board.order'] = order;
    if (status) update.status = status;
    if (status === 'done') update.completedAt = new Date();
    const task = await Task.findOneAndUpdate({ taskId: req.params.id }, update, { new: true });
    if (!task) return res.status(404).json({ success: false, error: 'Not found' });
    if (task.projectId) {
      await taskQueue.add('update-project-stats', { action: 'update-project-stats', data: { projectId: task.projectId } });
    }
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─ My tasks
app.get('/api/tasks/user/:userId', async (req, res) => {
  try {
    const tasks = await Task.find({ 'assignee.userId': req.params.userId, status: { $nin: ['done', 'cancelled'] } }).sort({
      priority: -1,
      dueDate: 1,
    });
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ BOARD ENDPOINTS ══════════════ */

app.get('/api/boards/:projectId', async (req, res) => {
  try {
    const boards = await Board.find({ projectId: req.params.projectId });
    res.json({ success: true, data: boards });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/boards', async (req, res) => {
  try {
    const board = await new Board(req.body).save();
    res.status(201).json({ success: true, data: board });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/boards/:id', async (req, res) => {
  try {
    const board = await Board.findOneAndUpdate({ boardId: req.params.id }, req.body, { new: true });
    res.json({ success: true, data: board });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─ Kanban view: board + tasks grouped by column
app.get('/api/boards/:projectId/kanban', async (req, res) => {
  try {
    const board = await Board.findOne({ projectId: req.params.projectId, isDefault: true });
    if (!board) return res.status(404).json({ success: false, error: 'No board found' });
    const tasks = await Task.find({ projectId: req.params.projectId, status: { $ne: 'cancelled' } }).sort({ 'board.order': 1 });
    const kanban = board.columns.map(col => ({
      ...col.toObject(),
      tasks: tasks.filter(t => t.board?.column === col.columnId || (!t.board?.column && col.columnId === 'backlog')),
    }));
    res.json({ success: true, data: { board, kanban } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ SPRINT ENDPOINTS ══════════════ */

app.post('/api/sprints', async (req, res) => {
  try {
    const sprint = await new Sprint(req.body).save();
    await logActivity('create', 'sprint', sprint.sprintId, null, null, { name: sprint.name });
    res.status(201).json({ success: true, data: sprint });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sprints', async (req, res) => {
  try {
    const { projectId, status } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    const sprints = await Sprint.find(filter).sort({ startDate: -1 });
    res.json({ success: true, data: sprints });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/sprints/:id', async (req, res) => {
  try {
    const sprint = await Sprint.findOneAndUpdate({ sprintId: req.params.id }, req.body, { new: true });
    res.json({ success: true, data: sprint });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sprints/:id/tasks', async (req, res) => {
  try {
    const { taskIds } = req.body;
    const sprint = await Sprint.findOneAndUpdate(
      { sprintId: req.params.id },
      { $addToSet: { taskIds: { $each: taskIds } } },
      { new: true },
    );
    res.json({ success: true, data: sprint });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ ACTIVITY LOG ══════════════ */

app.get('/api/activities', async (req, res) => {
  try {
    const { entityType, entityId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, data: activities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ DASHBOARD ══════════════ */

app.get('/api/tasks/dashboard/overview', async (req, res) => {
  try {
    const cacheKey = 'task-project:dashboard';
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const [totalProjects, activeProjects, totalTasks, tasksByStatus, tasksByPriority, overdueTasks, recentActivity] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: 'active' }),
      Task.countDocuments(),
      Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Task.countDocuments({ status: { $nin: ['done', 'cancelled'] }, dueDate: { $lt: new Date() } }),
      Activity.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const completedTasks = tasksByStatus.find(s => s._id === 'done')?.count || 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const dashboard = {
      projects: { total: totalProjects, active: activeProjects },
      tasks: { total: totalTasks, overdue: overdueTasks, completionRate },
      tasksByStatus: tasksByStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
      tasksByPriority: tasksByPriority.reduce((a, p) => ({ ...a, [p._id]: p.count }), {}),
      recentActivity,
      generatedAt: new Date().toISOString(),
    };
    await redis.setex(cacheKey, 30, JSON.stringify(dashboard));
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Cron Jobs ───────────────────────────────────────── */

// Check overdue tasks every hour
cron.schedule('0 * * * *', async () => {
  try {
    await taskQueue.add('check-overdue', { action: 'check-overdue', data: {} });
  } catch (e) {
    console.error('[Cron] overdue check failed', e.message);
  }
});

// Recalculate all project stats daily at 1AM
cron.schedule('0 1 * * *', async () => {
  try {
    const projects = await Project.find({ status: { $in: ['planning', 'active'] } }, 'projectId');
    for (const p of projects) {
      await taskQueue.add('update-project-stats', { action: 'update-project-stats', data: { projectId: p.projectId } });
    }
    console.log(`[Cron] Queued stats update for ${projects.length} projects`);
  } catch (e) {
    console.error('[Cron] stats refresh failed', e.message);
  }
});

/* ── Seed Data ───────────────────────────────────────── */
async function seedDefaults() {
  const count = await Project.countDocuments();
  if (count > 0) return;

  const project = await new Project({
    name: 'School Year 2026 Preparation',
    nameAr: 'تحضيرات العام الدراسي 2026',
    status: 'active',
    priority: 'high',
    category: 'academic',
    manager: { userId: 'USR-001', name: 'أحمد المدير' },
    members: [
      { userId: 'USR-001', name: 'أحمد المدير', role: 'owner' },
      { userId: 'USR-002', name: 'فاطمة المنسقة', role: 'manager' },
    ],
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-08-31'),
  }).save();

  const tasks = [
    { title: 'Update curriculum materials', titleAr: 'تحديث المواد الدراسية', status: 'in-progress', priority: 'high', type: 'task' },
    { title: 'Hire new teachers', titleAr: 'توظيف مدرسين جدد', status: 'todo', priority: 'critical', type: 'task' },
    { title: 'Facility maintenance', titleAr: 'صيانة المرافق', status: 'backlog', priority: 'medium', type: 'task' },
    { title: 'Registration system upgrade', titleAr: 'تطوير نظام التسجيل', status: 'todo', priority: 'high', type: 'feature' },
    { title: 'Parent communication plan', titleAr: 'خطة تواصل أولياء الأمور', status: 'done', priority: 'medium', type: 'task' },
  ];

  for (const t of tasks) {
    await new Task({
      ...t,
      projectId: project.projectId,
      assignee: { userId: 'USR-002', name: 'فاطمة المنسقة' },
      reporter: { userId: 'USR-001', name: 'أحمد المدير' },
      dueDate: dayjs()
        .add(Math.floor(Math.random() * 60) + 1, 'day')
        .toDate(),
      board: { column: t.status === 'done' ? 'done' : t.status === 'in-progress' ? 'in-progress' : 'todo', order: 0 },
    }).save();
  }

  console.log('[Seed] Default project and tasks created');
}

/* ── Start ───────────────────────────────────────────── */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_tasks');
    await seedDefaults();
    app.listen(PORT, () => console.log(`🚀 Task & Project Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const { Queue } = require('bullmq');
const cron = require('node-cron');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* ═══════════════════════════════════════════════════════════════ */

const formSchema = new mongoose.Schema(
  {
    formNo: { type: String, unique: true },
    titleAr: { type: String, required: true },
    titleEn: String,
    descriptionAr: String,
    descriptionEn: String,
    type: {
      type: String,
      enum: ['survey', 'feedback', 'registration', 'application', 'evaluation', 'complaint', 'suggestion', 'quiz', 'checklist', 'custom'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'academic',
        'administrative',
        'parent-satisfaction',
        'student-feedback',
        'staff-evaluation',
        'event-registration',
        'admission',
        'health',
        'transport',
        'other',
      ],
      default: 'other',
    },
    fields: [
      {
        fieldId: String,
        labelAr: String,
        labelEn: String,
        type: {
          type: String,
          enum: [
            'text',
            'textarea',
            'number',
            'email',
            'phone',
            'date',
            'time',
            'select',
            'multi-select',
            'radio',
            'checkbox',
            'file',
            'rating',
            'scale',
            'matrix',
            'section-header',
            'paragraph',
          ],
        },
        options: [{ valueAr: String, valueEn: String, score: Number }],
        validation: { required: Boolean, minLength: Number, maxLength: Number, min: Number, max: Number, pattern: String },
        conditional: { dependsOn: String, showWhen: String },
        order: Number,
      },
    ],
    settings: {
      allowAnonymous: { type: Boolean, default: false },
      multipleSubmissions: { type: Boolean, default: false },
      showProgress: { type: Boolean, default: true },
      confirmationMessage: String,
      redirectUrl: String,
      notifyOnSubmission: [String],
      maxResponses: Number,
      deadline: Date,
    },
    audience: [
      { type: String, enum: ['all', 'students', 'parents', 'teachers', 'staff', 'admin', 'specific-class', 'specific-department'] },
    ],
    targetClasses: [String],
    targetDepartments: [String],
    scoring: { enabled: Boolean, maxScore: Number, passingScore: Number },
    branding: { logo: String, headerColor: String, backgroundColor: String },
    status: { type: String, enum: ['draft', 'published', 'closed', 'archived'], default: 'draft' },
    publishedAt: Date,
    closedAt: Date,
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

formSchema.pre('save', async function (next) {
  if (!this.formNo) {
    const count = await this.constructor.countDocuments();
    this.formNo = `FRM-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const responseSchema = new mongoose.Schema(
  {
    responseNo: { type: String, unique: true },
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
    respondent: { userId: String, name: String, role: String, isAnonymous: Boolean },
    answers: [
      {
        fieldId: String,
        value: mongoose.Schema.Types.Mixed,
        score: Number,
      },
    ],
    totalScore: Number,
    percentage: Number,
    passed: Boolean,
    timeSpent: Number, // seconds
    metadata: { device: String, browser: String, ip: String },
    status: { type: String, enum: ['in-progress', 'submitted', 'reviewed'], default: 'submitted' },
    reviewedBy: { userId: String, name: String, comments: String, reviewDate: Date },
  },
  { timestamps: true },
);

responseSchema.pre('save', async function (next) {
  if (!this.responseNo) {
    const count = await this.constructor.countDocuments();
    this.responseNo = `RSP-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const formTemplateSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    titleAr: String,
    titleEn: String,
    category: String,
    description: String,
    fields: [], // same structure as form fields
    isPublic: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

const Form = mongoose.model('Form', formSchema);
const Response = mongoose.model('Response', responseSchema);
const FormTemplate = mongoose.model('FormTemplate', formTemplateSchema);

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_forms';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3550;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const responseQueue = new Queue('form-response-processing', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({ status: mongo && red ? 'ok' : 'degraded', service: 'forms-survey-service', mongo, redis: red, uptime: process.uptime() });
});

// Forms
app.post('/api/forms', async (req, res) => {
  try {
    res.status(201).json(await Form.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/forms', async (req, res) => {
  const { type, category, status, search, page = 1, limit = 20 } = req.query;
  const q = {};
  if (type) q.type = type;
  if (category) q.category = category;
  if (status) q.status = status;
  if (search) q.$or = [{ titleAr: new RegExp(search, 'i') }, { titleEn: new RegExp(search, 'i') }];
  const [data, total] = await Promise.all([
    Form.find(q)
      .select('-fields')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    Form.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.get('/api/forms/:id', async (req, res) => {
  const f = await Form.findById(req.params.id);
  if (!f) return res.status(404).json({ error: 'النموذج غير موجود' });
  const responseCount = await Response.countDocuments({ formId: f._id });
  res.json({ ...f.toObject(), responseCount });
});
app.put('/api/forms/:id', async (req, res) => {
  res.json(await Form.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Responses
app.post('/api/forms/:formId/responses', async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form || form.status !== 'published') return res.status(400).json({ error: 'النموذج غير متاح' });
    if (form.settings?.maxResponses) {
      const count = await Response.countDocuments({ formId: form._id });
      if (count >= form.settings.maxResponses) return res.status(400).json({ error: 'تم الوصول للحد الأقصى من الردود' });
    }
    req.body.formId = form._id;
    // Calculate score if scoring enabled
    if (form.scoring?.enabled && req.body.answers) {
      let total = 0;
      req.body.answers.forEach(a => {
        const field = form.fields.find(f => f.fieldId === a.fieldId);
        if (field?.options) {
          const opt = field.options.find(o => o.valueAr === a.value || o.valueEn === a.value);
          if (opt?.score) {
            a.score = opt.score;
            total += opt.score;
          }
        }
      });
      req.body.totalScore = total;
      req.body.percentage = form.scoring.maxScore ? Math.round((total / form.scoring.maxScore) * 100) : 0;
      req.body.passed = form.scoring.passingScore ? total >= form.scoring.passingScore : null;
    }
    const resp = await Response.create(req.body);
    await responseQueue.add('process', { responseId: resp._id.toString() }, { attempts: 3 });
    res.status(201).json(resp);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/forms/:formId/responses', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const q = { formId: req.params.formId };
  const [data, total] = await Promise.all([
    Response.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    Response.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});

// Analysis
app.get('/api/forms/:formId/analysis', async (req, res) => {
  const cacheKey = `form:analysis:${req.params.formId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const form = await Form.findById(req.params.formId);
  if (!form) return res.status(404).json({ error: 'النموذج غير موجود' });
  const responses = await Response.find({ formId: form._id, status: 'submitted' });
  const analysis = { totalResponses: responses.length, fields: {} };
  for (const field of form.fields) {
    if (['section-header', 'paragraph'].includes(field.type)) continue;
    const answers = responses.map(r => r.answers.find(a => a.fieldId === field.fieldId)?.value).filter(Boolean);
    const fd = { label: field.labelAr, responseCount: answers.length };
    if (['rating', 'scale', 'number'].includes(field.type)) {
      const nums = answers.map(Number).filter(n => !isNaN(n));
      fd.average = nums.length ? (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(2) : 0;
      fd.min = nums.length ? Math.min(...nums) : 0;
      fd.max = nums.length ? Math.max(...nums) : 0;
    }
    if (['select', 'radio', 'multi-select', 'checkbox'].includes(field.type)) {
      const dist = {};
      answers.flat().forEach(v => {
        dist[v] = (dist[v] || 0) + 1;
      });
      fd.distribution = dist;
    }
    analysis.fields[field.fieldId] = fd;
  }
  if (form.scoring?.enabled) {
    const scores = responses.map(r => r.totalScore).filter(s => s != null);
    analysis.scoring = {
      avgScore: scores.length ? (scores.reduce((s, n) => s + n, 0) / scores.length).toFixed(1) : 0,
      passRate: (responses.filter(r => r.passed).length / (responses.length || 1)) * 100,
    };
  }
  await redis.set(cacheKey, JSON.stringify(analysis), 'EX', 300);
  res.json(analysis);
});

// Templates
app.post('/api/form-templates', async (req, res) => {
  try {
    res.status(201).json(await FormTemplate.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/form-templates', async (_req, res) => {
  res.json(await FormTemplate.find({ isPublic: true }).sort({ usageCount: -1 }));
});
app.post('/api/form-templates/:id/use', async (req, res) => {
  const tmpl = await FormTemplate.findByIdAndUpdate(req.params.id, { $inc: { usageCount: 1 } });
  if (!tmpl) return res.status(404).json({ error: 'القالب غير موجود' });
  const form = await Form.create({
    ...req.body,
    fields: tmpl.fields,
    titleAr: req.body.titleAr || tmpl.titleAr,
    type: req.body.type || 'custom',
  });
  res.status(201).json(form);
});

// Dashboard
app.get('/api/forms/dashboard/summary', async (_req, res) => {
  const cacheKey = 'forms:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const [totalForms, activeForms, totalResponses, thisMonthResponses] = await Promise.all([
    Form.countDocuments(),
    Form.countDocuments({ status: 'published' }),
    Response.countDocuments(),
    Response.countDocuments({ createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }),
  ]);
  const result = { totalForms, activeForms, totalResponses, thisMonthResponses };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  res.json(result);
});

// Cron: auto-close forms past deadline every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  const now = new Date();
  const { modifiedCount } = await Form.updateMany(
    { status: 'published', 'settings.deadline': { $lte: now } },
    { status: 'closed', closedAt: now },
  );
  if (modifiedCount) console.log(`⏰ Auto-closed ${modifiedCount} forms past deadline`);
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — forms-survey');
    app.listen(PORT, () => console.log(`📋 Forms-Survey Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

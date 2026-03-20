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

const budgetSchema = new mongoose.Schema(
  {
    budgetNo: { type: String, unique: true },
    titleAr: { type: String, required: true },
    titleEn: String,
    fiscalYear: { type: String, required: true },
    type: { type: String, enum: ['annual', 'quarterly', 'monthly', 'project', 'department', 'supplementary'], required: true },
    department: String,
    costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'CostCenter' },
    lineItems: [
      {
        category: String,
        subcategory: String,
        descriptionAr: String,
        descriptionEn: String,
        plannedAmount: { type: Number, default: 0 },
        actualAmount: { type: Number, default: 0 },
        variance: { type: Number, default: 0 },
        notes: String,
      },
    ],
    totalPlanned: { type: Number, default: 0 },
    totalActual: { type: Number, default: 0 },
    totalVariance: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    approvals: [
      {
        level: Number,
        approver: String,
        status: { type: String, enum: ['pending', 'approved', 'rejected'] },
        date: Date,
        comments: String,
      },
    ],
    status: { type: String, enum: ['draft', 'submitted', 'under-review', 'approved', 'active', 'frozen', 'closed'], default: 'draft' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

budgetSchema.pre('save', async function (next) {
  if (!this.budgetNo) {
    const count = await this.constructor.countDocuments();
    this.budgetNo = `BDG-${this.fiscalYear}-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.lineItems?.length) {
    this.totalPlanned = this.lineItems.reduce((s, i) => s + (i.plannedAmount || 0), 0);
    this.totalActual = this.lineItems.reduce((s, i) => s + (i.actualAmount || 0), 0);
    this.totalVariance = this.totalPlanned - this.totalActual;
    this.lineItems.forEach(i => {
      i.variance = (i.plannedAmount || 0) - (i.actualAmount || 0);
    });
  }
  next();
});

const costCenterSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    type: { type: String, enum: ['department', 'branch', 'project', 'program', 'activity'], default: 'department' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CostCenter' },
    manager: { userId: String, name: String },
    annualBudget: { type: Number, default: 0 },
    usedBudget: { type: Number, default: 0 },
    remainingBudget: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

costCenterSchema.pre('save', function (next) {
  this.remainingBudget = (this.annualBudget || 0) - (this.usedBudget || 0);
  next();
});

const expenseSchema = new mongoose.Schema(
  {
    expenseNo: { type: String, unique: true },
    budgetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget' },
    costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'CostCenter' },
    category: {
      type: String,
      enum: [
        'salaries',
        'utilities',
        'maintenance',
        'supplies',
        'equipment',
        'training',
        'transport',
        'food',
        'medical',
        'insurance',
        'marketing',
        'technology',
        'rent',
        'licenses',
        'consulting',
        'other',
      ],
      required: true,
    },
    descriptionAr: String,
    descriptionEn: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    vendor: { name: String, taxId: String, invoiceNo: String },
    paymentMethod: { type: String, enum: ['cash', 'bank-transfer', 'check', 'credit-card', 'petty-cash'] },
    receiptUrl: String,
    date: { type: Date, required: true },
    recurring: { isRecurring: Boolean, frequency: String, nextDate: Date },
    approvedBy: { userId: String, name: String, date: Date },
    status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected', 'cancelled'], default: 'pending' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

expenseSchema.pre('save', async function (next) {
  if (!this.expenseNo) {
    const count = await this.constructor.countDocuments();
    this.expenseNo = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const forecastSchema = new mongoose.Schema(
  {
    forecastNo: { type: String, unique: true },
    fiscalYear: String,
    quarter: String,
    department: String,
    costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'CostCenter' },
    projections: [
      {
        category: String,
        month: String,
        projected: Number,
        actual: Number,
        variance: Number,
        confidence: { type: Number, min: 0, max: 100 },
      },
    ],
    assumptions: [String],
    risks: [{ description: String, impact: String, probability: String, mitigation: String }],
    totalProjected: Number,
    notes: String,
    status: { type: String, enum: ['draft', 'submitted', 'approved'], default: 'draft' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

forecastSchema.pre('save', async function (next) {
  if (!this.forecastNo) {
    const count = await this.constructor.countDocuments();
    this.forecastNo = `FC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.projections?.length) {
    this.totalProjected = this.projections.reduce((s, p) => s + (p.projected || 0), 0);
    this.projections.forEach(p => {
      p.variance = (p.projected || 0) - (p.actual || 0);
    });
  }
  next();
});

const Budget = mongoose.model('Budget', budgetSchema);
const CostCenter = mongoose.model('CostCenter', costCenterSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Forecast = mongoose.model('Forecast', forecastSchema);

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_budget';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3560;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const budgetQueue = new Queue('budget-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({
      status: mongo && red ? 'ok' : 'degraded',
      service: 'budget-financial-planning-service',
      mongo,
      redis: red,
      uptime: process.uptime(),
    });
});

// Budgets
app.post('/api/budgets', async (req, res) => {
  try {
    res.status(201).json(await Budget.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/budgets', async (req, res) => {
  const { fiscalYear, type, department, status, page = 1, limit = 20 } = req.query;
  const q = {};
  if (fiscalYear) q.fiscalYear = fiscalYear;
  if (type) q.type = type;
  if (department) q.department = department;
  if (status) q.status = status;
  const [data, total] = await Promise.all([
    Budget.find(q)
      .select('-lineItems')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    Budget.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.get('/api/budgets/:id', async (req, res) => {
  const b = await Budget.findById(req.params.id).populate('costCenterId');
  if (!b) return res.status(404).json({ error: 'الميزانية غير موجودة' });
  const expenses = await Expense.find({ budgetId: b._id });
  res.json({ ...b.toObject(), expenses, expenseCount: expenses.length });
});
app.put('/api/budgets/:id', async (req, res) => {
  res.json(await Budget.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }));
});

// Cost Centers
app.post('/api/cost-centers', async (req, res) => {
  try {
    res.status(201).json(await CostCenter.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/cost-centers', async (req, res) => {
  const { type, active, parentId } = req.query;
  const q = {};
  if (type) q.type = type;
  if (active !== undefined) q.isActive = active === 'true';
  if (parentId) q.parentId = parentId;
  res.json(await CostCenter.find(q).populate('parentId', 'nameAr code').sort({ code: 1 }));
});
app.put('/api/cost-centers/:id', async (req, res) => {
  res.json(await CostCenter.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Expenses
app.post('/api/expenses', async (req, res) => {
  try {
    const exp = await Expense.create(req.body);
    // Update cost center used budget
    if (exp.costCenterId && exp.status === 'approved') {
      await CostCenter.findByIdAndUpdate(exp.costCenterId, { $inc: { usedBudget: exp.amount } });
    }
    res.status(201).json(exp);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/expenses', async (req, res) => {
  const { budgetId, costCenterId, category, status, from, to, page = 1, limit = 20 } = req.query;
  const q = {};
  if (budgetId) q.budgetId = budgetId;
  if (costCenterId) q.costCenterId = costCenterId;
  if (category) q.category = category;
  if (status) q.status = status;
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = new Date(from);
    if (to) q.date.$lte = new Date(to);
  }
  const [data, total] = await Promise.all([
    Expense.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ date: -1 }),
    Expense.countDocuments(q),
  ]);
  const totalAmount = await Expense.aggregate([{ $match: q }, { $group: { _id: null, sum: { $sum: '$amount' } } }]);
  res.json({ data, total, totalAmount: totalAmount[0]?.sum || 0, page: +page, pages: Math.ceil(total / limit) });
});
app.put('/api/expenses/:id', async (req, res) => {
  res.json(await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Forecasts
app.post('/api/forecasts', async (req, res) => {
  try {
    res.status(201).json(await Forecast.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/forecasts', async (req, res) => {
  const { fiscalYear, department, status } = req.query;
  const q = {};
  if (fiscalYear) q.fiscalYear = fiscalYear;
  if (department) q.department = department;
  if (status) q.status = status;
  res.json(await Forecast.find(q).sort({ createdAt: -1 }));
});

// Dashboard
app.get('/api/budget/dashboard', async (_req, res) => {
  const cacheKey = 'budget:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const year = new Date().getFullYear().toString();
  const [totalBudgeted, totalSpent, activeBudgets, pendingExpenses, byCategory] = await Promise.all([
    Budget.aggregate([
      { $match: { fiscalYear: year, status: { $in: ['approved', 'active'] } } },
      { $group: { _id: null, sum: { $sum: '$totalPlanned' } } },
    ]),
    Expense.aggregate([
      { $match: { status: { $in: ['approved', 'paid'] }, date: { $gte: new Date(+year, 0, 1) } } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]),
    Budget.countDocuments({ fiscalYear: year, status: { $in: ['approved', 'active'] } }),
    Expense.countDocuments({ status: 'pending' }),
    Expense.aggregate([
      { $match: { status: { $in: ['approved', 'paid'] }, date: { $gte: new Date(+year, 0, 1) } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
  ]);
  const result = {
    totalBudgeted: totalBudgeted[0]?.sum || 0,
    totalSpent: totalSpent[0]?.sum || 0,
    remaining: (totalBudgeted[0]?.sum || 0) - (totalSpent[0]?.sum || 0),
    utilizationRate: totalBudgeted[0]?.sum ? (((totalSpent[0]?.sum || 0) / totalBudgeted[0].sum) * 100).toFixed(1) : 0,
    activeBudgets,
    pendingExpenses,
    byCategory,
  };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  res.json(result);
});

// Cron: monthly budget utilization report at 1st of every month
cron.schedule('0 7 1 * *', async () => {
  console.log('📊 Monthly budget utilization check');
  const overBudget = await CostCenter.find({ $expr: { $gt: ['$usedBudget', '$annualBudget'] }, isActive: true });
  if (overBudget.length) {
    console.warn(`⚠️ ${overBudget.length} cost centers over budget!`);
    await budgetQueue.add('over-budget-alert', { costCenters: overBudget.map(c => c.code) }, { attempts: 3 });
  }
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — budget-financial-planning');
    app.listen(PORT, () => console.log(`💰 Budget-Financial-Planning Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

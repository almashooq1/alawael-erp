/* ─────────────────────────────────────────────────────────
   Al-Awael ERP — Report Scheduler & Export Service  (Port 3730)
   ───────────────────────────────────────────────────────── */
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const helmet = require('helmet');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const dayjs = require('dayjs');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3730;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_reports';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/app/reports';

// Ensure output directory
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/* ── Redis ───────────────────────────────────────────── */
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});
redis.on('error', e => console.error('Redis error', e.message));

/* ── BullMQ ──────────────────────────────────────────── */
const connection = { connection: redis };
const reportQueue = new Queue('report-generation', connection);

/* ── Mongoose Schemas ────────────────────────────────── */

// ── Report Template ──
const templateSchema = new mongoose.Schema(
  {
    templateId: { type: String, unique: true },
    name: { type: String, required: true },
    nameAr: String,
    category: {
      type: String,
      enum: ['students', 'staff', 'finance', 'attendance', 'academic', 'health', 'transport', 'inventory', 'compliance', 'custom'],
      default: 'custom',
    },
    description: String,
    format: { type: String, enum: ['pdf', 'excel', 'csv', 'html'], default: 'pdf' },
    dataSource: {
      service: String,
      endpoint: String,
      method: { type: String, default: 'GET' },
      query: mongoose.Schema.Types.Mixed,
    },
    layout: {
      orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
      pageSize: { type: String, default: 'A4' },
      margins: { top: Number, bottom: Number, left: Number, right: Number },
      header: String,
      headerAr: String,
      footer: String,
      logo: Boolean,
    },
    columns: [
      {
        key: String,
        label: String,
        labelAr: String,
        width: Number,
        format: { type: String, enum: ['text', 'number', 'currency', 'date', 'percent', 'boolean'] },
        alignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
      },
    ],
    filters: [
      {
        key: String,
        label: String,
        type: { type: String, enum: ['text', 'date', 'select', 'dateRange', 'number'] },
        options: [String],
        defaultValue: mongoose.Schema.Types.Mixed,
      },
    ],
    isActive: { type: Boolean, default: true },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

templateSchema.pre('save', async function (next) {
  if (!this.templateId) {
    const count = await mongoose.model('ReportTemplate').countDocuments();
    this.templateId = `TPL-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});
const ReportTemplate = mongoose.model('ReportTemplate', templateSchema);

// ── Generated Report ──
const reportSchema = new mongoose.Schema(
  {
    reportId: { type: String, unique: true },
    templateId: String,
    name: String,
    nameAr: String,
    format: String,
    status: { type: String, enum: ['queued', 'generating', 'completed', 'failed', 'expired'], default: 'queued' },
    filePath: String,
    fileSize: Number,
    downloadUrl: String,
    parameters: mongoose.Schema.Types.Mixed,
    rowCount: { type: Number, default: 0 },
    generationTime: Number, // ms
    error: String,
    requestedBy: { userId: String, name: String },
    expiresAt: { type: Date, default: () => dayjs().add(7, 'day').toDate() },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

reportSchema.pre('save', async function (next) {
  if (!this.reportId) {
    const count = await mongoose.model('Report').countDocuments();
    this.reportId = `RPT-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});
const Report = mongoose.model('Report', reportSchema);

// ── Schedule ──
const scheduleSchema = new mongoose.Schema(
  {
    scheduleId: { type: String, unique: true },
    templateId: { type: String, required: true },
    name: String,
    cronExpression: { type: String, required: true },
    parameters: mongoose.Schema.Types.Mixed,
    format: { type: String, default: 'pdf' },
    recipients: [{ email: String, name: String }],
    isActive: { type: Boolean, default: true },
    lastRunAt: Date,
    nextRunAt: Date,
    runCount: { type: Number, default: 0 },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

scheduleSchema.pre('save', async function (next) {
  if (!this.scheduleId) {
    const count = await mongoose.model('ReportSchedule').countDocuments();
    this.scheduleId = `SCH-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});
const ReportSchedule = mongoose.model('ReportSchedule', scheduleSchema);

/* ── Report Generator Functions ──────────────────────── */

async function generatePDF(template, data, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: template.layout?.pageSize || 'A4',
      layout: template.layout?.orientation || 'portrait',
      margins: template.layout?.margins || { top: 50, bottom: 50, left: 50, right: 50 },
    });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text(template.nameAr || template.name, { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor('#666')
      .text(`Generated: ${dayjs().format('YYYY-MM-DD HH:mm')} | Rows: ${data.length}`, { align: 'center' });
    doc.moveDown();
    doc.fillColor('#000');

    // Table header
    if (template.columns?.length) {
      const cols = template.columns;
      const colWidth = (doc.page.width - 100) / cols.length;
      let x = 50;
      doc.fontSize(9).font('Helvetica-Bold');
      for (const col of cols) {
        doc.text(col.labelAr || col.label, x, doc.y, { width: colWidth, continued: false });
        x += colWidth;
      }
      doc.moveDown(0.5);
      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke();
      doc.moveDown(0.5);

      // Data rows
      doc.font('Helvetica').fontSize(8);
      for (const row of data) {
        if (doc.y > doc.page.height - 80) {
          doc.addPage();
          doc.y = 50;
        }
        x = 50;
        for (const col of cols) {
          let val = row[col.key] ?? '';
          if (col.format === 'currency') val = `${Number(val).toLocaleString()} SAR`;
          if (col.format === 'date') val = dayjs(val).format('YYYY-MM-DD');
          if (col.format === 'percent') val = `${val}%`;
          doc.text(String(val), x, doc.y, { width: colWidth });
          x += colWidth;
        }
        doc.moveDown(0.3);
      }
    } else {
      // Fallback: JSON dump
      doc.fontSize(8).text(JSON.stringify(data, null, 2));
    }

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor('#999')
        .text(`Al-Awael ERP — Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 40, { align: 'center' });
    }

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

async function generateExcel(template, data, filePath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al-Awael ERP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(template.nameAr || template.name);

  // Title row
  sheet.mergeCells('A1', `${String.fromCharCode(64 + (template.columns?.length || 5))}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = template.nameAr || template.name;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Subtitle
  sheet.mergeCells('A2', `${String.fromCharCode(64 + (template.columns?.length || 5))}2`);
  sheet.getCell('A2').value = `Generated: ${dayjs().format('YYYY-MM-DD HH:mm')} | Rows: ${data.length}`;
  sheet.getCell('A2').font = { size: 10, color: { argb: '666666' } };
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  // Column headers
  if (template.columns?.length) {
    const cols = template.columns.map(c => ({
      header: c.labelAr || c.label,
      key: c.key,
      width: c.width || 18,
    }));
    sheet.columns = cols;

    // Re-set header row (row 4)
    const headerRow = sheet.getRow(4);
    template.columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.labelAr || col.label;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
      cell.alignment = { horizontal: col.alignment || 'left' };
    });

    // Data rows starting from row 5
    data.forEach((row, idx) => {
      const r = sheet.getRow(idx + 5);
      template.columns.forEach((col, i) => {
        let val = row[col.key] ?? '';
        if (col.format === 'number' || col.format === 'currency') val = Number(val) || 0;
        r.getCell(i + 1).value = val;
      });
      if (idx % 2 === 0) {
        r.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
        });
      }
    });
  } else {
    // Fallback
    const keys = data.length ? Object.keys(data[0]) : [];
    keys.forEach((k, i) => (sheet.getRow(4).getCell(i + 1).value = k));
    data.forEach((row, idx) => {
      keys.forEach((k, i) => (sheet.getRow(idx + 5).getCell(i + 1).value = row[k] ?? ''));
    });
  }

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

async function generateCSV(template, data, filePath) {
  const cols = template.columns?.length ? template.columns : data.length ? Object.keys(data[0]).map(k => ({ key: k, label: k })) : [];
  const header = cols.map(c => c.labelAr || c.label).join(',');
  const rows = data.map(row => cols.map(c => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(','));
  const bom = '\uFEFF'; // UTF-8 BOM for Arabic support
  fs.writeFileSync(filePath, bom + header + '\n' + rows.join('\n'), 'utf8');
  return filePath;
}

/* ── BullMQ Worker ───────────────────────────────────── */
new Worker(
  'report-generation',
  async job => {
    const { reportId } = job.data;
    const report = await Report.findOne({ reportId });
    if (!report) return;

    const start = Date.now();
    await Report.updateOne({ _id: report._id }, { status: 'generating' });

    try {
      const template = await ReportTemplate.findOne({ templateId: report.templateId });
      if (!template) throw new Error('Template not found');

      // Simulate data fetch from source service
      const sampleData = [];
      const rowCount = Math.floor(Math.random() * 50) + 10;
      for (let i = 0; i < rowCount; i++) {
        const row = {};
        for (const col of template.columns || []) {
          if (col.format === 'number' || col.format === 'currency') row[col.key] = Math.floor(Math.random() * 10000);
          else if (col.format === 'date')
            row[col.key] = dayjs()
              .subtract(Math.floor(Math.random() * 365), 'day')
              .format('YYYY-MM-DD');
          else if (col.format === 'percent') row[col.key] = Math.floor(Math.random() * 100);
          else row[col.key] = `${col.label} ${i + 1}`;
        }
        sampleData.push(row);
      }

      const ext = report.format || template.format || 'pdf';
      const fileName = `${report.reportId}_${dayjs().format('YYYYMMDD_HHmmss')}.${ext === 'excel' ? 'xlsx' : ext}`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      if (ext === 'pdf') await generatePDF(template, sampleData, filePath);
      else if (ext === 'excel') await generateExcel(template, sampleData, filePath);
      else if (ext === 'csv') await generateCSV(template, sampleData, filePath);
      else {
        // HTML
        const html = `<html><head><meta charset="utf-8"><title>${template.nameAr || template.name}</title></head><body><h1>${template.nameAr || template.name}</h1><pre>${JSON.stringify(sampleData, null, 2)}</pre></body></html>`;
        fs.writeFileSync(filePath, html, 'utf8');
      }

      const stat = fs.statSync(filePath);
      await Report.updateOne(
        { _id: report._id },
        {
          status: 'completed',
          filePath,
          fileSize: stat.size,
          downloadUrl: `/api/reports/download/${report.reportId}`,
          rowCount: sampleData.length,
          generationTime: Date.now() - start,
        },
      );
      console.log(`[Report] ${report.reportId} generated in ${Date.now() - start}ms`);
    } catch (err) {
      await Report.updateOne({ _id: report._id }, { status: 'failed', error: err.message });
      console.error(`[Report] ${report.reportId} failed:`, err.message);
    }
  },
  { connection: redis, concurrency: 3 },
);

/* ── Health ───────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  res.status(mongoOk && redisOk ? 200 : 503).json({
    status: mongoOk && redisOk ? 'healthy' : 'degraded',
    service: 'report-scheduler-service',
    timestamp: new Date().toISOString(),
    mongo: mongoOk ? 'connected' : 'disconnected',
    redis: redisOk ? 'connected' : 'disconnected',
  });
});

/* ══════════════ TEMPLATE ENDPOINTS ══════════════ */

app.post('/api/reports/templates', async (req, res) => {
  try {
    const tpl = await new ReportTemplate(req.body).save();
    res.status(201).json({ success: true, data: tpl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/templates', async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const templates = await ReportTemplate.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/templates/:id', async (req, res) => {
  try {
    const tpl = await ReportTemplate.findOne({ templateId: req.params.id });
    if (!tpl) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: tpl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/reports/templates/:id', async (req, res) => {
  try {
    const tpl = await ReportTemplate.findOneAndUpdate({ templateId: req.params.id }, req.body, { new: true });
    res.json({ success: true, data: tpl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/reports/templates/:id', async (req, res) => {
  try {
    await ReportTemplate.findOneAndDelete({ templateId: req.params.id });
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ REPORT GENERATION ══════════════ */

app.post('/api/reports/generate', async (req, res) => {
  try {
    const { templateId, format, parameters, userId, userName } = req.body;
    const template = await ReportTemplate.findOne({ templateId });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    const report = await new Report({
      templateId,
      name: template.name,
      nameAr: template.nameAr,
      format: format || template.format,
      parameters,
      requestedBy: { userId, name: userName },
    }).save();

    await reportQueue.add('generate', { reportId: report.reportId }, { priority: 2 });
    res.status(202).json({ success: true, data: { reportId: report.reportId, status: 'queued' } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const { status, templateId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (templateId) filter.templateId = templateId;
    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Report.countDocuments(filter);
    res.json({ success: true, data: reports, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/:id', async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/download/:id', async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.id, status: 'completed' });
    if (!report) return res.status(404).json({ success: false, error: 'Report not ready or not found' });
    if (!fs.existsSync(report.filePath)) return res.status(404).json({ success: false, error: 'File missing from disk' });
    await Report.updateOne({ _id: report._id }, { $inc: { downloadCount: 1 } });
    res.download(report.filePath, path.basename(report.filePath));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.id });
    if (report?.filePath && fs.existsSync(report.filePath)) fs.unlinkSync(report.filePath);
    await Report.deleteOne({ reportId: req.params.id });
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ SCHEDULE ENDPOINTS ══════════════ */

app.post('/api/reports/schedules', async (req, res) => {
  try {
    const schedule = await new ReportSchedule(req.body).save();
    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/schedules', async (req, res) => {
  try {
    const schedules = await ReportSchedule.find().sort({ createdAt: -1 });
    res.json({ success: true, data: schedules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/reports/schedules/:id', async (req, res) => {
  try {
    const schedule = await ReportSchedule.findOneAndUpdate({ scheduleId: req.params.id }, req.body, { new: true });
    res.json({ success: true, data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/reports/schedules/:id', async (req, res) => {
  try {
    await ReportSchedule.findOneAndDelete({ scheduleId: req.params.id });
    res.json({ success: true, message: 'Schedule deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ DASHBOARD ══════════════ */

app.get('/api/reports/dashboard/overview', async (req, res) => {
  try {
    const cacheKey = 'report-scheduler:dashboard';
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const [totalTemplates, totalReports, completedReports, failedReports, activeSchedules, byCategory, recentReports] = await Promise.all([
      ReportTemplate.countDocuments({ isActive: true }),
      Report.countDocuments(),
      Report.countDocuments({ status: 'completed' }),
      Report.countDocuments({ status: 'failed' }),
      ReportSchedule.countDocuments({ isActive: true }),
      ReportTemplate.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Report.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const totalSize = await Report.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$fileSize' } } },
    ]);

    const avgGenTime = await Report.aggregate([
      { $match: { status: 'completed', generationTime: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$generationTime' } } },
    ]);

    const dashboard = {
      totalTemplates,
      totalReports,
      completedReports,
      failedReports,
      successRate: totalReports > 0 ? Math.round((completedReports / totalReports) * 100) : 0,
      activeSchedules,
      totalFileSize: totalSize[0]?.total || 0,
      avgGenerationTime: Math.round(avgGenTime[0]?.avg || 0),
      byCategory: byCategory.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
      recentReports,
      generatedAt: new Date().toISOString(),
    };
    await redis.setex(cacheKey, 30, JSON.stringify(dashboard));
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Cron Jobs ───────────────────────────────────────── */

// Process scheduled reports every minute
cron.schedule('* * * * *', async () => {
  try {
    const schedules = await ReportSchedule.find({ isActive: true });
    for (const sched of schedules) {
      // Simple cron check — see if it's time to run
      if (cron.validate(sched.cronExpression)) {
        const task = cron.schedule(sched.cronExpression, () => {}, { scheduled: false });
        // Check via nextRunAt
        if (sched.nextRunAt && new Date() >= sched.nextRunAt) {
          const report = await new Report({
            templateId: sched.templateId,
            name: `Scheduled: ${sched.name}`,
            format: sched.format,
            parameters: sched.parameters,
            requestedBy: sched.createdBy,
          }).save();

          await reportQueue.add('generate', { reportId: report.reportId }, { priority: 5 });
          await ReportSchedule.updateOne(
            { _id: sched._id },
            {
              lastRunAt: new Date(),
              $inc: { runCount: 1 },
              nextRunAt: dayjs().add(1, 'day').toDate(), // simplified
            },
          );
          console.log(`[Scheduler] Triggered ${sched.scheduleId} → ${report.reportId}`);
        }
      }
    }
  } catch (e) {
    console.error('[Scheduler] run failed', e.message);
  }
});

// Cleanup expired reports daily at 3AM
cron.schedule('0 3 * * *', async () => {
  try {
    const expired = await Report.find({ expiresAt: { $lt: new Date() }, status: 'completed' });
    for (const r of expired) {
      if (r.filePath && fs.existsSync(r.filePath)) fs.unlinkSync(r.filePath);
    }
    const result = await Report.updateMany({ expiresAt: { $lt: new Date() } }, { status: 'expired' });
    console.log(`[Cron] Expired ${result.modifiedCount} old reports`);
  } catch (e) {
    console.error('[Cron] cleanup failed', e.message);
  }
});

/* ── Seed Data ───────────────────────────────────────── */
async function seedDefaults() {
  const count = await ReportTemplate.countDocuments();
  if (count > 0) return;

  const templates = [
    {
      name: 'Student Enrollment Report',
      nameAr: 'تقرير تسجيل الطلاب',
      category: 'students',
      format: 'pdf',
      columns: [
        { key: 'studentId', label: 'Student ID', labelAr: 'رقم الطالب', width: 12 },
        { key: 'name', label: 'Name', labelAr: 'الاسم', width: 20 },
        { key: 'grade', label: 'Grade', labelAr: 'الصف', width: 10 },
        { key: 'enrollDate', label: 'Enroll Date', labelAr: 'تاريخ التسجيل', width: 15, format: 'date' },
        { key: 'status', label: 'Status', labelAr: 'الحالة', width: 12 },
      ],
    },
    {
      name: 'Financial Summary',
      nameAr: 'الملخص المالي',
      category: 'finance',
      format: 'excel',
      columns: [
        { key: 'month', label: 'Month', labelAr: 'الشهر', width: 12 },
        { key: 'revenue', label: 'Revenue', labelAr: 'الإيرادات', width: 15, format: 'currency', alignment: 'right' },
        { key: 'expenses', label: 'Expenses', labelAr: 'المصروفات', width: 15, format: 'currency', alignment: 'right' },
        { key: 'net', label: 'Net', labelAr: 'الصافي', width: 15, format: 'currency', alignment: 'right' },
        { key: 'margin', label: 'Margin', labelAr: 'الهامش', width: 10, format: 'percent' },
      ],
    },
    {
      name: 'Attendance Report',
      nameAr: 'تقرير الحضور',
      category: 'attendance',
      format: 'pdf',
      columns: [
        { key: 'name', label: 'Name', labelAr: 'الاسم', width: 20 },
        { key: 'date', label: 'Date', labelAr: 'التاريخ', width: 12, format: 'date' },
        { key: 'checkIn', label: 'Check In', labelAr: 'وقت الحضور', width: 12 },
        { key: 'checkOut', label: 'Check Out', labelAr: 'وقت الانصراف', width: 12 },
        { key: 'hours', label: 'Hours', labelAr: 'الساعات', width: 10, format: 'number' },
      ],
    },
    {
      name: 'Staff Directory',
      nameAr: 'دليل الموظفين',
      category: 'staff',
      format: 'excel',
      columns: [
        { key: 'empId', label: 'Employee ID', labelAr: 'رقم الموظف', width: 12 },
        { key: 'name', label: 'Name', labelAr: 'الاسم', width: 20 },
        { key: 'department', label: 'Department', labelAr: 'القسم', width: 15 },
        { key: 'position', label: 'Position', labelAr: 'المنصب', width: 15 },
        { key: 'phone', label: 'Phone', labelAr: 'الهاتف', width: 15 },
      ],
    },
    {
      name: 'Health Screening Report',
      nameAr: 'تقرير الفحص الصحي',
      category: 'health',
      format: 'pdf',
      columns: [
        { key: 'studentName', label: 'Student', labelAr: 'الطالب', width: 20 },
        { key: 'screenDate', label: 'Date', labelAr: 'التاريخ', width: 12, format: 'date' },
        { key: 'height', label: 'Height (cm)', labelAr: 'الطول', width: 10, format: 'number' },
        { key: 'weight', label: 'Weight (kg)', labelAr: 'الوزن', width: 10, format: 'number' },
        { key: 'notes', label: 'Notes', labelAr: 'ملاحظات', width: 25 },
      ],
    },
  ];

  for (const t of templates) await new ReportTemplate(t).save();

  // Seed schedules
  await new ReportSchedule({
    templateId: 'TPL-0001',
    name: 'Monthly Enrollment',
    cronExpression: '0 6 1 * *',
    format: 'pdf',
    isActive: true,
    nextRunAt: dayjs().add(1, 'month').startOf('month').hour(6).toDate(),
    createdBy: { userId: 'USR-001', name: 'أحمد المدير' },
  }).save();

  await new ReportSchedule({
    templateId: 'TPL-0002',
    name: 'Weekly Financial',
    cronExpression: '0 7 * * 0',
    format: 'excel',
    isActive: true,
    nextRunAt: dayjs().day(0).add(1, 'week').hour(7).toDate(),
    createdBy: { userId: 'USR-001', name: 'أحمد المدير' },
  }).save();

  console.log('[Seed] Default report templates and schedules created');
}

/* ── Start ───────────────────────────────────────────── */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_reports');
    await seedDefaults();
    app.listen(PORT, () => console.log(`🚀 Report Scheduler Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

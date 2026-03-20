'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const helmet = require('helmet');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const cron = require('node-cron');
const { v4: uuid } = require('uuid');
const dayjs = require('dayjs');

const app = express();
const PORT = process.env.PORT || 3620;

/* ═══════════════════════════════════════════════════════════════ */
/*  Middleware                                                    */
/* ═══════════════════════════════════════════════════════════════ */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* ═══════════════════════════════════════════════════════════════ */
/*  Redis & BullMQ                                                */
/* ═══════════════════════════════════════════════════════════════ */
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000), lazyConnect: true });
redis.connect().catch(() => console.warn('⚠️ Redis unavailable'));

const reportQueue = new Queue('report-generation', { connection: { url: REDIS_URL } });

/* ═══════════════════════════════════════════════════════════════ */
/*  MongoDB Schemas                                               */
/* ═══════════════════════════════════════════════════════════════ */
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_reports';

// ── Report Definition ──
const reportDefSchema = new mongoose.Schema(
  {
    reportId: { type: String, default: uuid, unique: true },
    code: { type: String, required: true, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    category: {
      type: String,
      enum: ['student', 'financial', 'attendance', 'hr', 'academic', 'health', 'operational', 'compliance', 'custom'],
      required: true,
    },
    description: String,
    dataSource: { service: String, endpoint: String, method: { type: String, default: 'GET' } },
    columns: [{ key: String, labelAr: String, labelEn: String, type: { type: String, default: 'string' }, width: Number }],
    filters: [{ key: String, labelAr: String, type: { type: String }, options: [String] }],
    schedule: { enabled: { type: Boolean, default: false }, cronExpression: String, recipients: [String] },
    format: { type: String, enum: ['pdf', 'excel', 'both'], default: 'both' },
    isActive: { type: Boolean, default: true },
    createdBy: String,
    tenantId: String,
  },
  { timestamps: true },
);

const ReportDef = mongoose.model('ReportDef', reportDefSchema);

// ── Generated Report ──
const generatedReportSchema = new mongoose.Schema(
  {
    genId: { type: String, default: uuid, unique: true },
    reportId: { type: String, index: true },
    reportCode: String,
    nameAr: String,
    category: String,
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    format: { type: String, enum: ['pdf', 'excel'] },
    fileData: Buffer,
    fileSize: Number,
    filters: mongoose.Schema.Types.Mixed,
    generatedBy: String,
    tenantId: String,
    error: String,
    startedAt: Date,
    completedAt: Date,
    rowCount: Number,
  },
  { timestamps: true },
);

generatedReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 }); // 30 days TTL
const GeneratedReport = mongoose.model('GeneratedReport', generatedReportSchema);

// ── KPI Snapshot ──
const kpiSchema = new mongoose.Schema(
  {
    snapshotId: { type: String, default: uuid },
    date: { type: Date, default: Date.now, index: true },
    tenantId: String,
    metrics: {
      totalStudents: Number,
      activeStudents: Number,
      totalStaff: Number,
      attendanceRate: Number,
      feeCollectionRate: Number,
      outstandingFees: Number,
      totalRevenue: Number,
      totalExpenses: Number,
      parentSatisfaction: Number,
      occupancyRate: Number,
      incidentCount: Number,
      maintenanceRequests: Number,
      activeEnrollments: Number,
      graduationRate: Number,
    },
    serviceData: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

const KPISnapshot = mongoose.model('KPISnapshot', kpiSchema);

// ── Scheduled Report ──
const scheduleSchema = new mongoose.Schema(
  {
    scheduleId: { type: String, default: uuid, unique: true },
    reportId: String,
    reportCode: String,
    nameAr: String,
    cronExpression: { type: String, required: true },
    format: { type: String, enum: ['pdf', 'excel'], default: 'pdf' },
    recipients: [{ email: String, nameAr: String }],
    filters: mongoose.Schema.Types.Mixed,
    isActive: { type: Boolean, default: true },
    lastRun: Date,
    nextRun: Date,
    runCount: { type: Number, default: 0 },
    createdBy: String,
    tenantId: String,
  },
  { timestamps: true },
);

const Schedule = mongoose.model('Schedule', scheduleSchema);

/* ═══════════════════════════════════════════════════════════════ */
/*  Service Data Aggregation                                      */
/* ═══════════════════════════════════════════════════════════════ */
const SERVICE_ENDPOINTS = {
  students: { url: 'http://student-lifecycle-service:3570/api/lifecycle/dashboard', name: 'الطلاب' },
  attendance: { url: 'http://attendance-biometric-service:3320/api/attendance/dashboard', name: 'الحضور' },
  fees: { url: 'http://fee-billing-service:3380/api/fees/dashboard', name: 'الرسوم' },
  hr: { url: 'http://hr-payroll-service:3300/api/hr/dashboard', name: 'الموارد البشرية' },
  health: { url: 'http://student-health-medical-service:3470/api/health/dashboard', name: 'الصحة' },
  events: { url: 'http://events-activities-service:3510/api/events/dashboard', name: 'الفعاليات' },
  maintenance: { url: 'http://facility-space-management-service:3590/api/facility-space/dashboard', name: 'الصيانة' },
  inventory: { url: 'http://inventory-warehouse-service:3450/api/inventory/dashboard', name: 'المخزون' },
  crm: { url: 'http://crm-service:3310/api/crm/dashboard', name: 'العلاقات' },
  academic: { url: 'http://academic-curriculum-service:3460/api/academic/dashboard', name: 'المنهج' },
  budget: { url: 'http://budget-financial-planning-service:3560/api/budget/dashboard', name: 'الميزانية' },
  compliance: { url: 'http://compliance-accreditation-service:3500/api/compliance/dashboard', name: 'الامتثال' },
};

async function fetchServiceData(serviceKey) {
  try {
    const svc = SERVICE_ENDPOINTS[serviceKey];
    if (!svc) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(svc.url, { signal: ctrl.signal, headers: { 'X-Internal-Service': 'smart-reports' } });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function collectAllKPIs() {
  const results = {};
  const keys = Object.keys(SERVICE_ENDPOINTS);
  const settled = await Promise.allSettled(keys.map(k => fetchServiceData(k)));
  keys.forEach((k, i) => {
    results[k] = settled[i].status === 'fulfilled' ? settled[i].value : null;
  });
  return results;
}

/* ═══════════════════════════════════════════════════════════════ */
/*  PDF Generation                                                */
/* ═══════════════════════════════════════════════════════════════ */
function generatePDF(reportName, columns, data, filters) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(20).text('نظام الأوائل - Al-Awael ERP', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).text(reportName, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).text(`تاريخ التقرير: ${dayjs().format('YYYY-MM-DD HH:mm')}`, { align: 'center' });
      if (filters) doc.fontSize(9).text(`الفلاتر: ${JSON.stringify(filters)}`, { align: 'center' });
      doc.moveDown(1);

      // Table Header
      const startX = 40;
      const colWidth = (doc.page.width - 80) / columns.length;
      let y = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      columns.forEach((col, i) => {
        doc.text(col.labelAr || col.key, startX + i * colWidth, y, { width: colWidth, align: 'center' });
      });
      y += 25;
      doc
        .moveTo(startX, y)
        .lineTo(doc.page.width - 40, y)
        .stroke();
      y += 10;

      // Table Body
      doc.font('Helvetica').fontSize(9);
      for (const row of data) {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = 40;
        }
        columns.forEach((col, i) => {
          const val = row[col.key] ?? '-';
          doc.text(String(val), startX + i * colWidth, y, { width: colWidth, align: 'center' });
        });
        y += 20;
      }

      // Footer
      doc.fontSize(8).text(`إجمالي السجلات: ${data.length}`, 40, doc.page.height - 40, { align: 'center' });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Excel Generation                                              */
/* ═══════════════════════════════════════════════════════════════ */
async function generateExcel(reportName, columns, data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al-Awael ERP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(reportName, { views: [{ rightToLeft: true }] });

  // Title row
  sheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `${reportName} - نظام الأوائل`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Date row
  sheet.mergeCells(2, 1, 2, columns.length);
  sheet.getCell(2, 1).value = `تاريخ التقرير: ${dayjs().format('YYYY-MM-DD HH:mm')}`;
  sheet.getCell(2, 1).alignment = { horizontal: 'center' };

  // Header row
  const headerRow = sheet.getRow(4);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.labelAr || col.key;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2196F3' } };
    cell.alignment = { horizontal: 'center' };
    sheet.getColumn(i + 1).width = col.width || 18;
  });

  // Data rows
  data.forEach((row, ri) => {
    const excelRow = sheet.getRow(5 + ri);
    columns.forEach((col, ci) => {
      excelRow.getCell(ci + 1).value = row[col.key] ?? '';
    });
    if (ri % 2 === 0) {
      excelRow.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      });
    }
  });

  // Summary
  const summaryRow = sheet.getRow(5 + data.length + 1);
  summaryRow.getCell(1).value = `إجمالي السجلات: ${data.length}`;
  summaryRow.getCell(1).font = { bold: true };

  return await workbook.xlsx.writeBuffer();
}

/* ═══════════════════════════════════════════════════════════════ */
/*  BullMQ Worker — Report Generation                             */
/* ═══════════════════════════════════════════════════════════════ */
const worker = new Worker(
  'report-generation',
  async job => {
    const { genId, reportId, format, filters } = job.data;
    try {
      await GeneratedReport.updateOne({ genId }, { status: 'processing', startedAt: new Date() });

      const reportDef = await ReportDef.findOne({ reportId });
      if (!reportDef) throw new Error('تعريف التقرير غير موجود');

      // Fetch data from source service
      let data = [];
      if (reportDef.dataSource?.endpoint) {
        try {
          const resp = await fetch(reportDef.dataSource.endpoint, {
            method: reportDef.dataSource.method || 'GET',
            headers: { 'Content-Type': 'application/json', 'X-Internal-Service': 'smart-reports' },
            ...(filters && reportDef.dataSource.method === 'POST' ? { body: JSON.stringify(filters) } : {}),
          });
          const json = await resp.json();
          data = json.data || json.items || (Array.isArray(json) ? json : []);
        } catch {
          data = [];
        }
      }

      let fileData;
      if (format === 'pdf') {
        fileData = await generatePDF(reportDef.nameAr, reportDef.columns, data, filters);
      } else {
        fileData = Buffer.from(await generateExcel(reportDef.nameAr, reportDef.columns, data));
      }

      await GeneratedReport.updateOne(
        { genId },
        {
          status: 'completed',
          fileData,
          fileSize: fileData.length,
          completedAt: new Date(),
          rowCount: data.length,
        },
      );
      console.log(`📊 Report generated: ${reportDef.nameAr} (${format}, ${data.length} rows)`);
    } catch (err) {
      await GeneratedReport.updateOne({ genId }, { status: 'failed', error: err.message, completedAt: new Date() });
      console.error(`❌ Report generation failed: ${err.message}`);
    }
  },
  { connection: { url: REDIS_URL }, concurrency: 3 },
);

/* ═══════════════════════════════════════════════════════════════ */
/*  API Endpoints                                                 */
/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'smart-reports-service', uptime: process.uptime() }));

// ── Report Definitions CRUD ──
app.get('/api/reports/definitions', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (search) filter.$or = [{ nameAr: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }];
    const defs = await ReportDef.find(filter).sort({ category: 1, nameAr: 1 });
    res.json(defs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/definitions', async (req, res) => {
  try {
    const def = await ReportDef.create(req.body);
    res.status(201).json(def);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/reports/definitions/:reportId', async (req, res) => {
  try {
    const def = await ReportDef.findOneAndUpdate({ reportId: req.params.reportId }, req.body, { new: true });
    if (!def) return res.status(404).json({ error: 'التقرير غير موجود' });
    res.json(def);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generate Report ──
app.post('/api/reports/generate', async (req, res) => {
  try {
    const { reportId, reportCode, format = 'pdf', filters } = req.body;
    const reportDef = await ReportDef.findOne(reportId ? { reportId } : { code: reportCode });
    if (!reportDef) return res.status(404).json({ error: 'تعريف التقرير غير موجود' });

    const genId = uuid();
    await GeneratedReport.create({
      genId,
      reportId: reportDef.reportId,
      reportCode: reportDef.code,
      nameAr: reportDef.nameAr,
      category: reportDef.category,
      format,
      filters,
      generatedBy: req.headers['x-user-id'],
      tenantId: req.headers['x-tenant-id'],
    });

    await reportQueue.add(
      'generate',
      { genId, reportId: reportDef.reportId, format, filters },
      { attempts: 2, backoff: { type: 'exponential', delay: 5000 } },
    );
    res.status(202).json({ message: 'جاري إنشاء التقرير', genId, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Generated Reports ──
app.get('/api/reports/generated', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      GeneratedReport.find(filter)
        .select('-fileData')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit),
      GeneratedReport.countDocuments(filter),
    ]);
    res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Download Report ──
app.get('/api/reports/download/:genId', async (req, res) => {
  try {
    const report = await GeneratedReport.findOne({ genId: req.params.genId, status: 'completed' });
    if (!report || !report.fileData) return res.status(404).json({ error: 'التقرير غير موجود أو لم يكتمل' });

    const ext = report.format === 'pdf' ? 'pdf' : 'xlsx';
    const mime = report.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const filename = `${report.nameAr}_${dayjs().format('YYYY-MM-DD')}.${ext}`;

    res.set({
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': report.fileData.length,
    });
    res.send(report.fileData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── KPI Dashboard ──
app.get('/api/reports/kpi', async (req, res) => {
  try {
    const cacheKey = 'reports:kpi:latest';
    if (redis.status === 'ready') {
      const c = await redis.get(cacheKey);
      if (c) return res.json(JSON.parse(c));
    }

    const latest = await KPISnapshot.findOne().sort({ date: -1 }).lean();
    if (latest && redis.status === 'ready') await redis.setex(cacheKey, 600, JSON.stringify(latest));
    res.json(latest || { message: 'لا توجد بيانات KPI بعد' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/kpi/history', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const from = dayjs().subtract(+days, 'day').toDate();
    const snapshots = await KPISnapshot.find({ date: { $gte: from } })
      .sort({ date: 1 })
      .lean();
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Quick Reports (predefined) ──
app.get('/api/reports/quick/attendance-summary', async (req, res) => {
  try {
    const data = await fetchServiceData('attendance');
    res.json({ report: 'ملخص الحضور', data: data || {}, generatedAt: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/quick/financial-summary', async (req, res) => {
  try {
    const [fees, budget] = await Promise.all([fetchServiceData('fees'), fetchServiceData('budget')]);
    res.json({ report: 'الملخص المالي', fees: fees || {}, budget: budget || {}, generatedAt: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/quick/student-overview', async (req, res) => {
  try {
    const [students, health, academic] = await Promise.all([
      fetchServiceData('students'),
      fetchServiceData('health'),
      fetchServiceData('academic'),
    ]);
    res.json({
      report: 'نظرة عامة على الطلاب',
      students: students || {},
      health: health || {},
      academic: academic || {},
      generatedAt: new Date(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/quick/operational', async (req, res) => {
  try {
    const [maintenance, inventory, events] = await Promise.all([
      fetchServiceData('maintenance'),
      fetchServiceData('inventory'),
      fetchServiceData('events'),
    ]);
    res.json({
      report: 'التقرير التشغيلي',
      maintenance: maintenance || {},
      inventory: inventory || {},
      events: events || {},
      generatedAt: new Date(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Schedules CRUD ──
app.get('/api/reports/schedules', async (_req, res) => {
  try {
    res.json(await Schedule.find({ isActive: true }).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/schedules', async (req, res) => {
  try {
    const s = await Schedule.create(req.body);
    res.status(201).json(s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard ──
app.get('/api/reports/dashboard', async (_req, res) => {
  try {
    const cacheKey = 'reports:dashboard';
    if (redis.status === 'ready') {
      const c = await redis.get(cacheKey);
      if (c) return res.json(JSON.parse(c));
    }

    const [totalDefs, totalGenerated, pendingReports, completedReports, failedReports, categories, activeSchedules, latestKPI] =
      await Promise.all([
        ReportDef.countDocuments({ isActive: true }),
        GeneratedReport.countDocuments(),
        GeneratedReport.countDocuments({ status: 'pending' }),
        GeneratedReport.countDocuments({ status: 'completed' }),
        GeneratedReport.countDocuments({ status: 'failed' }),
        ReportDef.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
        Schedule.countDocuments({ isActive: true }),
        KPISnapshot.findOne().sort({ date: -1 }).lean(),
      ]);

    const dashboard = {
      reportDefinitions: totalDefs,
      totalGenerated,
      pending: pendingReports,
      completed: completedReports,
      failed: failedReports,
      categories,
      activeSchedules,
      latestKPI: latestKPI?.metrics || {},
      timestamp: new Date(),
    };
    if (redis.status === 'ready') await redis.setex(cacheKey, 300, JSON.stringify(dashboard));
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Cron: KPI Collection (every 4 hours)                          */
/* ═══════════════════════════════════════════════════════════════ */
cron.schedule('0 */4 * * *', async () => {
  try {
    console.log('📊 Collecting KPI data...');
    const serviceData = await collectAllKPIs();
    const metrics = {
      totalStudents: serviceData.students?.totalStudents || 0,
      activeStudents: serviceData.students?.activeStudents || 0,
      totalStaff: serviceData.hr?.totalStaff || 0,
      attendanceRate: serviceData.attendance?.attendanceRate || 0,
      feeCollectionRate: serviceData.fees?.collectionRate || 0,
      outstandingFees: serviceData.fees?.outstanding || 0,
      totalRevenue: serviceData.budget?.totalRevenue || 0,
      totalExpenses: serviceData.budget?.totalExpenses || 0,
      incidentCount: serviceData.health?.incidents || 0,
      maintenanceRequests: serviceData.maintenance?.openRequests || 0,
      activeEnrollments: serviceData.students?.activeEnrollments || 0,
      occupancyRate: serviceData.maintenance?.occupancyRate || 0,
    };
    await KPISnapshot.create({ metrics, serviceData });
    if (redis.status === 'ready') await redis.del('reports:kpi:latest');
    console.log('✅ KPI snapshot saved');
  } catch (e) {
    console.error('KPI collection error:', e.message);
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Seed Default Report Definitions                               */
/* ═══════════════════════════════════════════════════════════════ */
async function seedDefaults() {
  const defaults = [
    {
      code: 'RPT-ATT-001',
      nameAr: 'تقرير الحضور اليومي',
      category: 'attendance',
      dataSource: { service: 'attendance-biometric', endpoint: 'http://attendance-biometric-service:3320/api/attendance' },
      columns: [
        { key: 'studentName', labelAr: 'اسم الطالب' },
        { key: 'date', labelAr: 'التاريخ' },
        { key: 'status', labelAr: 'الحالة' },
        { key: 'time', labelAr: 'الوقت' },
      ],
    },
    {
      code: 'RPT-FIN-001',
      nameAr: 'تقرير الرسوم المستحقة',
      category: 'financial',
      dataSource: { service: 'fee-billing', endpoint: 'http://fee-billing-service:3380/api/fees/outstanding' },
      columns: [
        { key: 'studentName', labelAr: 'اسم الطالب' },
        { key: 'amount', labelAr: 'المبلغ' },
        { key: 'dueDate', labelAr: 'تاريخ الاستحقاق' },
        { key: 'status', labelAr: 'الحالة' },
      ],
    },
    {
      code: 'RPT-STD-001',
      nameAr: 'تقرير الطلاب المسجلين',
      category: 'student',
      dataSource: { service: 'student-lifecycle', endpoint: 'http://student-lifecycle-service:3570/api/lifecycle/students' },
      columns: [
        { key: 'name', labelAr: 'الاسم' },
        { key: 'grade', labelAr: 'الصف' },
        { key: 'enrollDate', labelAr: 'تاريخ التسجيل' },
        { key: 'status', labelAr: 'الحالة' },
      ],
    },
    {
      code: 'RPT-HR-001',
      nameAr: 'تقرير الموظفين',
      category: 'hr',
      dataSource: { service: 'hr-payroll', endpoint: 'http://hr-payroll-service:3300/api/hr/employees' },
      columns: [
        { key: 'name', labelAr: 'الاسم' },
        { key: 'department', labelAr: 'القسم' },
        { key: 'role', labelAr: 'المنصب' },
        { key: 'joinDate', labelAr: 'تاريخ الانضمام' },
      ],
    },
    {
      code: 'RPT-HLT-001',
      nameAr: 'تقرير السجلات الصحية',
      category: 'health',
      dataSource: { service: 'student-health-medical', endpoint: 'http://student-health-medical-service:3470/api/health/records' },
      columns: [
        { key: 'studentName', labelAr: 'اسم الطالب' },
        { key: 'condition', labelAr: 'الحالة' },
        { key: 'date', labelAr: 'التاريخ' },
        { key: 'notes', labelAr: 'ملاحظات' },
      ],
    },
  ];
  for (const d of defaults) {
    await ReportDef.updateOne({ code: d.code }, d, { upsert: true });
  }
  console.log('📋 Default report definitions seeded');
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Start                                                         */
/* ═══════════════════════════════════════════════════════════════ */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_reports');
    await seedDefaults();
    app.listen(PORT, () => console.log(`📊 Smart Reports Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });

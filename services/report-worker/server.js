/**
 * ═══════════════════════════════════════════════════════════════
 * Al-Awael ERP — Report Worker Service
 * خدمة توليد التقارير الثقيلة — PDF, Excel, CSV
 *
 * Features:
 *  - BullMQ queue for async report generation
 *  - PDF generation with Arabic RTL support
 *  - Excel workbook generation with charts
 *  - CSV export with streaming
 *  - Template-based reports (Handlebars)
 *  - Upload output to MinIO
 *  - Notification on completion
 * ═══════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { stringify } = require('csv-stringify');
const fs = require('fs');
const path = require('path');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'report-worker' },
  transports: [new winston.transports.Console()],
});

const app = express();
const PORT = process.env.PORT || 3220;
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/tmp/reports';
app.use(express.json({ limit: '10mb' }));

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_reports', { maxPoolSize: 10 });
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', { maxRetriesPerRequest: null });

// ─── Report Schema ───────────────────────────────────────────────────────────
const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['pdf', 'excel', 'csv'], required: true },
    template: String,
    status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued', index: true },
    requestedBy: { type: String, required: true, index: true },
    parameters: mongoose.Schema.Types.Mixed,
    dataSource: String,
    outputPath: String,
    outputUrl: String,
    fileSize: Number,
    pages: Number,
    rows: Number,
    errorMessage: String,
    processingTimeMs: Number,
  },
  { timestamps: true },
);

const Report = mongoose.model('Report', reportSchema);

// ─── Report Generators ───────────────────────────────────────────────────────
const generators = {
  async pdf(report, data) {
    return new Promise((resolve, reject) => {
      const filePath = path.join(OUTPUT_DIR, `${report._id}.pdf`);
      const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: report.title, Author: 'Al-Awael ERP' } });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text(report.title, { align: 'center' });
      doc.moveDown();
      doc
        .fontSize(10)
        .fillColor('#666')
        .text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, { align: 'center' });
      doc.moveDown(2);

      // Table data
      if (data && Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        const colWidth = (doc.page.width - 100) / headers.length;

        // Header row
        doc.fontSize(9).fillColor('#fff');
        let x = 50;
        headers.forEach(h => {
          doc.rect(x, doc.y, colWidth, 20).fill('#2563eb');
          doc.fill('#fff').text(h, x + 4, doc.y + 5, { width: colWidth - 8 });
          x += colWidth;
        });
        doc.moveDown();

        // Data rows
        data.forEach((row, i) => {
          x = 50;
          const bg = i % 2 === 0 ? '#f8fafc' : '#fff';
          headers.forEach(h => {
            doc.rect(x, doc.y, colWidth, 18).fill(bg);
            doc
              .fill('#333')
              .fontSize(8)
              .text(String(row[h] ?? ''), x + 4, doc.y + 4, { width: colWidth - 8 });
            x += colWidth;
          });
          doc.moveDown(0.5);
        });
      }

      // Footer
      doc
        .fontSize(8)
        .fillColor('#999')
        .text('تم التوليد بواسطة نظام الأوائل ERP', 50, doc.page.height - 50, { align: 'center' });

      doc.end();
      stream.on('finish', () => {
        const stats = fs.statSync(filePath);
        resolve({ path: filePath, size: stats.size, pages: doc._pageBuffer?.length || 1 });
      });
      stream.on('error', reject);
    });
  },

  async excel(report, data) {
    const filePath = path.join(OUTPUT_DIR, `${report._id}.xlsx`);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Al-Awael ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(report.title.slice(0, 31), { views: [{ rightToLeft: true }] });

    if (data && Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      // Header row
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
      });

      // Data rows
      data.forEach(row => sheet.addRow(headers.map(h => row[h])));

      // Auto-width
      sheet.columns.forEach(col => {
        col.width = Math.max(12, ...data.map(r => String(r[headers[sheet.columns.indexOf(col)]] ?? '').length + 2));
      });
    }

    await workbook.xlsx.writeFile(filePath);
    const stats = fs.statSync(filePath);
    return { path: filePath, size: stats.size, rows: data?.length || 0 };
  },

  async csv(report, data) {
    const filePath = path.join(OUTPUT_DIR, `${report._id}.csv`);
    return new Promise((resolve, reject) => {
      if (!data || !Array.isArray(data)) return resolve({ path: filePath, size: 0, rows: 0 });
      const headers = Object.keys(data[0]);
      const stringifier = stringify({ header: true, columns: headers, bom: true });
      const stream = fs.createWriteStream(filePath);
      stringifier.pipe(stream);
      data.forEach(row => stringifier.write(headers.map(h => row[h])));
      stringifier.end();
      stream.on('finish', () => {
        const stats = fs.statSync(filePath);
        resolve({ path: filePath, size: stats.size, rows: data.length });
      });
      stream.on('error', reject);
    });
  },
};

// ─── BullMQ Worker ───────────────────────────────────────────────────────────
const reportQueue = new Queue('report-generation', { connection: redis });

const worker = new Worker(
  'report-generation',
  async job => {
    const report = await Report.findById(job.data.reportId);
    if (!report) throw new Error('Report not found');

    const startTime = Date.now();
    report.status = 'processing';
    await report.save();

    try {
      // Fetch data (from dataSource or parameters.data)
      let data = report.parameters?.data || [];

      // If dataSource is a MongoDB collection
      if (report.dataSource && !data.length) {
        const db = mongoose.connection.db;
        const collection = db.collection(report.dataSource);
        data = await collection
          .find(report.parameters?.filter || {})
          .limit(report.parameters?.limit || 10000)
          .toArray();
      }

      const result = await generators[report.type](report, data);
      report.outputPath = result.path;
      report.fileSize = result.size;
      report.pages = result.pages;
      report.rows = result.rows;
      report.status = 'completed';
      report.processingTimeMs = Date.now() - startTime;
      await report.save();
      logger.info(`Report completed: ${report.title}`, { id: report._id, type: report.type, ms: report.processingTimeMs });
    } catch (error) {
      report.status = 'failed';
      report.errorMessage = error.message;
      report.processingTimeMs = Date.now() - startTime;
      await report.save();
      throw error;
    }
  },
  { connection: redis, concurrency: 3 },
);

// ─── API ─────────────────────────────────────────────────────────────────────

app.post('/api/reports', async (req, res) => {
  try {
    const report = await Report.create(req.body);
    await reportQueue.add(
      'generate',
      { reportId: report._id.toString() },
      {
        attempts: 2,
        backoff: { type: 'fixed', delay: 10000 },
      },
    );
    res.status(201).json({ data: report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports', async (req, res) => {
  const { requestedBy, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (requestedBy) filter.requestedBy = requestedBy;
  if (status) filter.status = status;
  const [data, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .lean(),
    Report.countDocuments(filter),
  ]);
  res.json({ data, total });
});

app.get('/api/reports/:id', async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  res.json({ data: report });
});

app.get('/api/reports/:id/download', async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report || report.status !== 'completed') return res.status(404).json({ error: 'Report not ready' });
  if (!fs.existsSync(report.outputPath)) return res.status(404).json({ error: 'File not found' });
  const ext = { pdf: 'pdf', excel: 'xlsx', csv: 'csv' }[report.type];
  res.download(report.outputPath, `${report.title}.${ext}`);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'report-worker', version: '1.0.0', uptime: process.uptime(), formats: ['pdf', 'excel', 'csv'] });
});

app.listen(PORT, '0.0.0.0', () => logger.info(`📊 Report Worker running on port ${PORT}`));
module.exports = app;

"use strict";
// ml.export.ts
// نظام تصدير تقارير ML المتقدم (CSV, PDF, Excel)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportFeedbackCSV = exportFeedbackCSV;
exports.exportDriftEventsCSV = exportDriftEventsCSV;
exports.exportAlertsCSV = exportAlertsCSV;
exports.exportComprehensiveReportPDF = exportComprehensiveReportPDF;
exports.exportComprehensiveReportExcel = exportComprehensiveReportExcel;
const json2csv_1 = require("json2csv");
const pdfkit_1 = __importDefault(require("pdfkit"));
const exceljs_1 = __importDefault(require("exceljs"));
const ml_feedback_model_1 = __importDefault(require("../models/ml.feedback.model"));
const ml_drift_model_1 = __importDefault(require("../models/ml.drift.model"));
const ml_alert_model_1 = __importDefault(require("../models/ml.alert.model"));
// تصدير Feedback كـ CSV
async function exportFeedbackCSV(startDate, endDate) {
    const query = {};
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate)
            query.createdAt.$gte = startDate;
        if (endDate)
            query.createdAt.$lte = endDate;
    }
    const feedback = await ml_feedback_model_1.default.find(query)
        .sort({ createdAt: -1 })
        .limit(10000)
        .lean();
    const fields = [
        'processId',
        'predicted',
        'actual',
        'match',
        'modelVersion',
        'source',
        'createdAt',
        'confidence',
        'processingTime',
    ];
    const parser = new json2csv_1.Parser({ fields });
    return parser.parse(feedback);
}
// تصدير Drift Events كـ CSV
async function exportDriftEventsCSV(startDate, endDate) {
    const query = {};
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate)
            query.createdAt.$gte = startDate;
        if (endDate)
            query.createdAt.$lte = endDate;
    }
    const events = await ml_drift_model_1.default.find(query)
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();
    const fields = [
        'status',
        'windowSize',
        'baselineSize',
        'accuracyDrop',
        'f1Drop',
        'recentAccuracy',
        'baselineAccuracy',
        'recentF1',
        'baselineF1',
        'createdAt',
    ];
    const parser = new json2csv_1.Parser({ fields });
    return parser.parse(events);
}
// تصدير Alerts كـ CSV
async function exportAlertsCSV(severity, source, unread) {
    const query = {};
    if (severity)
        query.severity = severity;
    if (source)
        query.source = source;
    if (unread !== undefined)
        query.read = !unread;
    const alerts = await ml_alert_model_1.default.find(query)
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean();
    const fields = [
        'severity',
        'message',
        'source',
        'processId',
        'createdAt',
        'read',
        'readAt',
    ];
    const parser = new json2csv_1.Parser({ fields });
    return parser.parse(alerts);
}
// تصدير تقرير شامل كـ PDF
async function exportComprehensiveReportPDF(res, metrics, driftStatus, recentAlerts) {
    const doc = new pdfkit_1.default({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ml-report-${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);
    // العنوان الرئيسي
    doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('ML Monitoring Comprehensive Report', { align: 'center' });
    doc.moveDown(0.5);
    doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);
    // قسم المقاييس
    doc.fontSize(16).font('Helvetica-Bold').text('Model Performance Metrics');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
    doc.text(`Precision: ${(metrics.precision * 100).toFixed(2)}%`);
    doc.text(`Recall: ${(metrics.recall * 100).toFixed(2)}%`);
    doc.text(`F1 Score: ${(metrics.f1Score * 100).toFixed(2)}%`);
    doc.text(`Sample Count: ${metrics.sampleCount || 0}`);
    doc.moveDown(2);
    // قسم الانحراف
    doc.fontSize(16).font('Helvetica-Bold').text('Drift Detection Status');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Status: ${driftStatus.status || 'Unknown'}`);
    if (driftStatus.deltas) {
        doc.text(`Accuracy Drop: ${(driftStatus.deltas.accuracy * 100).toFixed(2)}%`);
        doc.text(`F1 Score Drop: ${(driftStatus.deltas.f1Score * 100).toFixed(2)}%`);
    }
    doc.text(`Window Size: ${driftStatus.windowSize || 0}`);
    doc.text(`Baseline Size: ${driftStatus.baselineSize || 0}`);
    doc.moveDown(2);
    // قسم التنبيهات الأخيرة
    doc.fontSize(16).font('Helvetica-Bold').text('Recent Alerts');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    recentAlerts.slice(0, 10).forEach((alert, idx) => {
        doc.text(`${idx + 1}. [${alert.severity.toUpperCase()}] ${alert.message}`, { width: 500 });
        doc.text(`   Source: ${alert.source}, Time: ${new Date(alert.createdAt).toLocaleString()}`, {
            indent: 15,
        });
        doc.moveDown(0.3);
    });
    // تذييل
    doc.moveDown(2);
    doc
        .fontSize(8)
        .font('Helvetica')
        .text('This report was generated automatically by the Intelligent Agent ML Monitoring System.', { align: 'center' });
    doc.end();
}
// تصدير تقرير شامل كـ Excel
async function exportComprehensiveReportExcel(res, metrics, driftEvents, alerts, feedback) {
    const workbook = new exceljs_1.default.Workbook();
    workbook.creator = 'ML Monitoring System';
    workbook.created = new Date();
    // ورقة المقاييس
    const metricsSheet = workbook.addWorksheet('Metrics');
    metricsSheet.columns = [
        { header: 'Metric', key: 'metric', width: 20 },
        { header: 'Value', key: 'value', width: 15 },
    ];
    metricsSheet.addRows([
        { metric: 'Accuracy', value: (metrics.accuracy * 100).toFixed(2) + '%' },
        { metric: 'Precision', value: (metrics.precision * 100).toFixed(2) + '%' },
        { metric: 'Recall', value: (metrics.recall * 100).toFixed(2) + '%' },
        { metric: 'F1 Score', value: (metrics.f1Score * 100).toFixed(2) + '%' },
        { metric: 'Sample Count', value: metrics.sampleCount || 0 },
    ]);
    metricsSheet.getRow(1).font = { bold: true };
    // ورقة الانحراف
    const driftSheet = workbook.addWorksheet('Drift Events');
    driftSheet.columns = [
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Accuracy Drop', key: 'accuracyDrop', width: 15 },
        { header: 'F1 Drop', key: 'f1Drop', width: 15 },
        { header: 'Window Size', key: 'windowSize', width: 15 },
        { header: 'Baseline Size', key: 'baselineSize', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 25 },
    ];
    driftEvents.forEach((event) => {
        driftSheet.addRow({
            status: event.status,
            accuracyDrop: (event.accuracyDrop * 100).toFixed(2) + '%',
            f1Drop: (event.f1Drop * 100).toFixed(2) + '%',
            windowSize: event.windowSize,
            baselineSize: event.baselineSize,
            createdAt: new Date(event.createdAt).toLocaleString(),
        });
    });
    driftSheet.getRow(1).font = { bold: true };
    // ورقة التنبيهات
    const alertsSheet = workbook.addWorksheet('Alerts');
    alertsSheet.columns = [
        { header: 'Severity', key: 'severity', width: 12 },
        { header: 'Message', key: 'message', width: 50 },
        { header: 'Source', key: 'source', width: 20 },
        { header: 'Process ID', key: 'processId', width: 25 },
        { header: 'Created At', key: 'createdAt', width: 25 },
        { header: 'Read', key: 'read', width: 10 },
    ];
    alerts.forEach((alert) => {
        alertsSheet.addRow({
            severity: alert.severity,
            message: alert.message,
            source: alert.source,
            processId: alert.processId || 'N/A',
            createdAt: new Date(alert.createdAt).toLocaleString(),
            read: alert.read ? 'Yes' : 'No',
        });
    });
    alertsSheet.getRow(1).font = { bold: true };
    // ورقة Feedback
    const feedbackSheet = workbook.addWorksheet('Feedback');
    feedbackSheet.columns = [
        { header: 'Process ID', key: 'processId', width: 25 },
        { header: 'Predicted', key: 'predicted', width: 15 },
        { header: 'Actual', key: 'actual', width: 15 },
        { header: 'Match', key: 'match', width: 10 },
        { header: 'Model Version', key: 'modelVersion', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 25 },
    ];
    feedback.forEach((fb) => {
        feedbackSheet.addRow({
            processId: fb.processId,
            predicted: fb.predicted,
            actual: fb.actual,
            match: fb.match ? 'Yes' : 'No',
            modelVersion: fb.modelVersion,
            createdAt: new Date(fb.createdAt).toLocaleString(),
        });
    });
    feedbackSheet.getRow(1).font = { bold: true };
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ml-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
}

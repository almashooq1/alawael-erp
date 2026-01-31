"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("../services/queue");
const logger_1 = require("../utils/logger");
const nodemailer_1 = __importDefault(require("nodemailer"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs = __importStar(require("fs"));
const fsPromises = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const logger = (0, logger_1.createLogger)('JobProcessors');
// Email transporter
const emailTransporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});
// ==================== EMAIL PROCESSOR ====================
queue_1.queueService.processJobs(queue_1.JobType.SEND_EMAIL, async (job) => {
    const { to, subject, body, html, attachments } = job.data;
    try {
        const info = await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@example.com',
            to,
            subject,
            text: body,
            html: html || body,
            attachments
        });
        logger.info('Email sent successfully', { to, messageId: info.messageId });
        return { sent: true, messageId: info.messageId };
    }
    catch (error) {
        logger.error('Failed to send email', { to, error: error.message });
        throw error;
    }
}, 5 // Process 5 emails concurrently
);
// ==================== REPORT GENERATION PROCESSOR ====================
queue_1.queueService.processJobs(queue_1.JobType.GENERATE_REPORT, async (job) => {
    const { reportType, userId, projectId, startDate, endDate } = job.data;
    try {
        // Update job progress
        job.progress(10);
        // Fetch data based on report type
        const reportData = await fetchReportData(reportType, {
            userId,
            projectId,
            startDate,
            endDate
        });
        job.progress(50);
        // Generate PDF
        const pdfPath = await generatePDF(reportData, reportType);
        job.progress(90);
        // Send email with report
        await queue_1.queueService.addJob(queue_1.JobType.SEND_EMAIL, {
            to: reportData.userEmail,
            subject: `Your ${reportType} Report is Ready`,
            body: 'Please find your report attached.',
            attachments: [
                {
                    filename: `${reportType}-${Date.now()}.pdf`,
                    path: pdfPath
                }
            ]
        });
        job.progress(100);
        logger.info('Report generated successfully', { reportType, userId });
        return { reportPath: pdfPath };
    }
    catch (error) {
        logger.error('Failed to generate report', { reportType, error: error.message });
        throw error;
    }
}, 2 // Process 2 reports concurrently
);
// ==================== MODEL TRAINING PROCESSOR ====================
queue_1.queueService.processJobs(queue_1.JobType.TRAIN_MODEL, async (job) => {
    const { modelId, datasetId, parameters } = job.data;
    try {
        logger.info('Starting model training', { modelId, datasetId });
        // Simulate training with progress updates
        const totalEpochs = parameters.epochs || 100;
        for (let epoch = 1; epoch <= totalEpochs; epoch++) {
            // Simulate epoch processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Update progress
            const progress = (epoch / totalEpochs) * 100;
            job.progress(progress);
            // Log every 10 epochs
            if (epoch % 10 === 0) {
                logger.info('Training progress', { modelId, epoch, totalEpochs });
            }
        }
        // Save model
        const accuracy = 0.85 + Math.random() * 0.1; // Simulated accuracy
        const modelPath = `/models/${modelId}_${Date.now()}.h5`;
        logger.info('Model training completed', { modelId, accuracy });
        // Send notification
        await queue_1.queueService.addJob(queue_1.JobType.SEND_NOTIFICATION, {
            userId: job.data.userId,
            type: 'model_trained',
            message: `Model ${modelId} training completed with ${(accuracy * 100).toFixed(2)}% accuracy`,
            metadata: { modelId, accuracy }
        });
        return {
            modelId,
            modelPath,
            accuracy,
            epochs: totalEpochs
        };
    }
    catch (error) {
        logger.error('Model training failed', { modelId, error: error.message });
        throw error;
    }
}, 1 // Process one model training at a time
);
// ==================== DATASET PROCESSING PROCESSOR ====================
queue_1.queueService.processJobs(queue_1.JobType.PROCESS_DATASET, async (job) => {
    const { datasetId, filePath, operations } = job.data;
    try {
        logger.info('Processing dataset', { datasetId, filePath });
        job.progress(10);
        // Read dataset
        const data = await readDataset(filePath);
        job.progress(30);
        // Apply transformations
        let processedData = data;
        for (const operation of operations) {
            processedData = await applyOperation(processedData, operation);
            job.progress(30 + (operations.indexOf(operation) / operations.length) * 40);
        }
        job.progress(70);
        // Save processed dataset
        const outputPath = `/datasets/processed/${datasetId}_${Date.now()}.csv`;
        await saveDataset(processedData, outputPath);
        job.progress(90);
        // Update database
        // await updateDatasetStatus(datasetId, 'processed', outputPath);
        job.progress(100);
        logger.info('Dataset processing completed', { datasetId, outputPath });
        return { datasetId, outputPath, recordCount: processedData.length };
    }
    catch (error) {
        logger.error('Dataset processing failed', { datasetId, error: error.message });
        throw error;
    }
}, 3 // Process 3 datasets concurrently
);
// ==================== FILE CLEANUP PROCESSOR ====================
queue_1.queueService.processJobs(queue_1.JobType.CLEANUP_FILES, async (job) => {
    const { directory, maxAge } = job.data;
    try {
        logger.info('Starting file cleanup', { directory, maxAge });
        const files = await fsPromises.readdir(directory);
        const now = Date.now();
        let deletedCount = 0;
        for (const file of files) {
            const filePath = path.join(directory, file);
            const stats = await fsPromises.stat(filePath);
            const ageMs = now - stats.mtimeMs;
            if (ageMs > maxAge) {
                await fsPromises.unlink(filePath);
                deletedCount++;
            }
            job.progress((files.indexOf(file) / files.length) * 100);
        }
        logger.info('File cleanup completed', { directory, deletedCount });
        return { deletedCount, directory };
    }
    catch (error) {
        logger.error('File cleanup failed', { directory, error: error.message });
        throw error;
    }
}, 1);
// ==================== NOTIFICATION PROCESSOR ====================
queue_1.queueService.processJobs(queue_1.JobType.SEND_NOTIFICATION, async (job) => {
    const { userId, type, message, metadata } = job.data;
    try {
        // Save notification to database
        // await saveNotification({ userId, type, message, metadata });
        // Send real-time notification via WebSocket
        // wsService.notifyUser(userId, { type, message, metadata });
        logger.info('Notification sent', { userId, type });
        return { sent: true, userId, type };
    }
    catch (error) {
        logger.error('Failed to send notification', { userId, error: error.message });
        throw error;
    }
}, 10 // Process 10 notifications concurrently
);
// ==================== DATABASE BACKUP PROCESSOR ====================
queue_1.queueService.processJobs(queue_1.JobType.BACKUP_DATABASE, async (job) => {
    const { database } = job.data;
    try {
        logger.info('Starting database backup', { database });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = `/backups/db_${database}_${timestamp}.sql`;
        // Perform backup (example with pg_dump)
        // await execCommand(`pg_dump ${database} > ${backupFile}`);
        logger.info('Database backup completed', { database, backupFile });
        return { backupFile, database, timestamp };
    }
    catch (error) {
        logger.error('Database backup failed', { database, error: error.message });
        throw error;
    }
}, 1);
// ==================== HELPER FUNCTIONS ====================
async function fetchReportData(reportType, filters) {
    // Simulate fetching data
    return {
        reportType,
        data: [ /* report data */],
        userEmail: 'user@example.com'
    };
}
async function generatePDF(data, reportType) {
    const pdfPath = `/tmp/${reportType}_${Date.now()}.pdf`;
    // Create PDF using pdfkit
    const doc = new pdfkit_1.default();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    doc.fontSize(20).text(`${reportType} Report`, 100, 100);
    doc.fontSize(12).text(JSON.stringify(data, null, 2), 100, 150);
    doc.end();
    return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(pdfPath));
        stream.on('error', reject);
    });
}
async function readDataset(filePath) {
    // Simulate reading dataset
    return [];
}
async function applyOperation(data, operation) {
    // Simulate data transformation
    return data;
}
async function saveDataset(data, outputPath) {
    // Simulate saving dataset
    await fsPromises.writeFile(outputPath, JSON.stringify(data));
}
logger.info('All job processors initialized');

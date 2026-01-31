import { Job } from 'bull';
import { queueService, JobType } from '../services/queue';
import { createLogger } from '../utils/logger';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

const logger = createLogger('JobProcessors');

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ==================== EMAIL PROCESSOR ====================
queueService.processJobs(
  JobType.SEND_EMAIL,
  async (job: Job) => {
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
    } catch (error: any) {
      logger.error('Failed to send email', { to, error: error.message });
      throw error;
    }
  },
  5 // Process 5 emails concurrently
);

// ==================== REPORT GENERATION PROCESSOR ====================
queueService.processJobs(
  JobType.GENERATE_REPORT,
  async (job: Job) => {
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
      await queueService.addJob(JobType.SEND_EMAIL, {
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
    } catch (error: any) {
      logger.error('Failed to generate report', { reportType, error: error.message });
      throw error;
    }
  },
  2 // Process 2 reports concurrently
);

// ==================== MODEL TRAINING PROCESSOR ====================
queueService.processJobs(
  JobType.TRAIN_MODEL,
  async (job: Job) => {
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
      await queueService.addJob(JobType.SEND_NOTIFICATION, {
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
    } catch (error: any) {
      logger.error('Model training failed', { modelId, error: error.message });
      throw error;
    }
  },
  1 // Process one model training at a time
);

// ==================== DATASET PROCESSING PROCESSOR ====================
queueService.processJobs(
  JobType.PROCESS_DATASET,
  async (job: Job) => {
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
    } catch (error: any) {
      logger.error('Dataset processing failed', { datasetId, error: error.message });
      throw error;
    }
  },
  3 // Process 3 datasets concurrently
);

// ==================== FILE CLEANUP PROCESSOR ====================
queueService.processJobs(
  JobType.CLEANUP_FILES,
  async (job: Job) => {
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
    } catch (error: any) {
      logger.error('File cleanup failed', { directory, error: error.message });
      throw error;
    }
  },
  1
);

// ==================== NOTIFICATION PROCESSOR ====================
queueService.processJobs(
  JobType.SEND_NOTIFICATION,
  async (job: Job) => {
    const { userId, type, message, metadata } = job.data;

    try {
      // Save notification to database
      // await saveNotification({ userId, type, message, metadata });

      // Send real-time notification via WebSocket
      // wsService.notifyUser(userId, { type, message, metadata });

      logger.info('Notification sent', { userId, type });
      return { sent: true, userId, type };
    } catch (error: any) {
      logger.error('Failed to send notification', { userId, error: error.message });
      throw error;
    }
  },
  10 // Process 10 notifications concurrently
);

// ==================== DATABASE BACKUP PROCESSOR ====================
queueService.processJobs(
  JobType.BACKUP_DATABASE,
  async (job: Job) => {
    const { database } = job.data;

    try {
      logger.info('Starting database backup', { database });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `/backups/db_${database}_${timestamp}.sql`;

      // Perform backup (example with pg_dump)
      // await execCommand(`pg_dump ${database} > ${backupFile}`);

      logger.info('Database backup completed', { database, backupFile });
      return { backupFile, database, timestamp };
    } catch (error: any) {
      logger.error('Database backup failed', { database, error: error.message });
      throw error;
    }
  },
  1
);

// ==================== HELPER FUNCTIONS ====================

async function fetchReportData(reportType: string, filters: any) {
  // Simulate fetching data
  return {
    reportType,
    data: [/* report data */],
    userEmail: 'user@example.com'
  };
}

async function generatePDF(data: any, reportType: string): Promise<string> {
  const pdfPath = `/tmp/${reportType}_${Date.now()}.pdf`;
  
  // Create PDF using pdfkit
  const doc = new PDFDocument();
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

async function readDataset(filePath: string) {
  // Simulate reading dataset
  return [];
}

async function applyOperation(data: any[], operation: any) {
  // Simulate data transformation
  return data;
}

async function saveDataset(data: any[], outputPath: string) {
  // Simulate saving dataset
  await fsPromises.writeFile(outputPath, JSON.stringify(data));
}

logger.info('All job processors initialized');

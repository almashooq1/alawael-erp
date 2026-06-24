#!/usr/bin/env node
'use strict';

/**
 * Migration: Link embedded file URLs to the unified Document model.
 * =========================================================================
 * Scans HR/Medical/Finance collections that store fileUrl/filePath strings
 * and creates Document + link records for files that physically exist.
 *
 * Run: node backend/scripts/migrate-embedded-files-to-documents.js [--dry-run]
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: false });

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  require('../models/Document');
  require('../models/HR/Employee');
  const CaseManagement = require('../models/CaseManagement');
  process.stdout.write(
    `[MIGRATION] CaseManagement type=${typeof CaseManagement} updateOne=${typeof CaseManagement.updateOne}\n`
  );
  require('../models/Invoice');
  const Payment = require('../models/Payment');

  const stats = {
    cases: 0,
    payments: 0,
    skipped: 0,
    errors: 0,
  };

  // Migrate CaseManagement.medicalFiles
  const allCases = await CaseManagement.find({}).lean();
  process.stdout.write(`[MIGRATION] Total cases: ${allCases.length}\n`);
  if (allCases.length > 0) {
    process.stdout.write(
      `[MIGRATION] First case medicalFiles: ${JSON.stringify(allCases[0].medicalFiles)}\n`
    );
  }
  const cases = await CaseManagement.find({ medicalFiles: { $exists: true, $ne: [] } }).lean();
  process.stdout.write(`[MIGRATION] Cases with medicalFiles: ${cases.length}\n`);
  for (const c of cases) {
    for (const mf of c.medicalFiles || []) {
      try {
        if (mf.documentId) continue;
        const filePath = resolveFilePath(mf.fileUrl);
        process.stdout.write(
          `[MIGRATION] case ${c._id} fileUrl=${mf.fileUrl} resolved=${filePath} exists=${fs.existsSync(filePath)}\n`
        );
        if (!filePath || !fs.existsSync(filePath)) {
          stats.skipped++;
          continue;
        }
        if (DRY_RUN) {
          console.log(`[DRY-RUN] Would migrate case ${c._id} file ${mf.fileName}`);
          continue;
        }
        const buffer = fs.readFileSync(filePath);
        const mimeType = mf.mimeType || inferMimeType(mf.fileName);
        const doc = await createDocumentFromBuffer(buffer, mf.fileName, mimeType, {
          sourceModule: 'medical',
          entityType: 'CaseManagement',
          entityId: String(c._id),
          category: 'تقارير',
          tags: [mf.fileType, ...(mf.tags || [])].filter(Boolean),
        });
        await CaseManagement.updateOne(
          { _id: c._id, 'medicalFiles._id': mf._id },
          {
            $set: {
              'medicalFiles.$.documentId': doc._id,
              'medicalFiles.$.fileUrl': `/api/v1/documents/${doc._id}/download`,
            },
          }
        );
        stats.cases++;
      } catch (err) {
        stats.errors++;
        process.stderr.write(`[Migration] Case ${c._id}: ${err.stack || err.message}\n`);
      }
    }
  }

  // Migrate Payment.attachments
  const payments = await Payment.find({ attachments: { $exists: true, $ne: [] } }).lean();
  for (const p of payments) {
    for (const att of p.attachments || []) {
      try {
        if (att.documentId) continue;
        const filePath = resolveFilePath(att.url);
        if (!filePath || !fs.existsSync(filePath)) {
          stats.skipped++;
          continue;
        }
        if (DRY_RUN) {
          console.log(`[DRY-RUN] Would migrate payment ${p._id} file ${att.name}`);
          continue;
        }
        const buffer = fs.readFileSync(filePath);
        const mimeType = inferMimeType(att.name);
        const doc = await createDocumentFromBuffer(buffer, att.name, mimeType, {
          sourceModule: 'finance',
          entityType: 'Payment',
          entityId: String(p._id),
          category: 'مالي',
        });
        await Payment.updateOne(
          { _id: p._id, 'attachments._id': att._id },
          {
            $set: {
              'attachments.$.documentId': doc._id,
              'attachments.$.url': `/api/v1/documents/${doc._id}/download`,
            },
          }
        );
        await Payment.findByIdAndUpdate(p._id, { $addToSet: { attachmentIds: doc._id } });
        stats.payments++;
      } catch (err) {
        stats.errors++;
        logger.error(`[Migration] Payment ${p._id}: ${err.message}`);
      }
    }
  }

  process.stdout.write(`Migration stats: ${JSON.stringify(stats)}\n`);
  await mongoose.disconnect();
  console.log('Disconnected');
}

async function createDocumentFromBuffer(buffer, originalName, mimeType, metadata = {}) {
  const documentUploadService = require('../services/documents/documentUpload.service');
  const file = {
    buffer,
    originalname: originalName,
    mimetype: mimeType,
    size: buffer.length,
  };
  const migrationUserId = new mongoose.Types.ObjectId();
  return documentUploadService.createDocumentRecord(
    file,
    { id: migrationUserId, name: 'System Migration' },
    metadata
  );
}

function resolveFilePath(urlOrPath) {
  if (!urlOrPath) return null;
  // Convert web-style /uploads/... to local path first
  if (urlOrPath.startsWith('/uploads/')) {
    // Resolve relative to this script's backend root to avoid double-backend
    // paths when the script is executed from inside backend/.
    const backendRoot = path.resolve(__dirname, '..');
    return path.join(backendRoot, urlOrPath);
  }
  if (path.isAbsolute(urlOrPath)) return urlOrPath;
  return null;
}

function inferMimeType(fileName) {
  const ext = path.extname(fileName || '').toLowerCase();
  const map = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext] || 'application/octet-stream';
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };

/* eslint-disable no-unused-vars */
/**
 * Virus/Malware Scan Middleware
 * فحص الملفات المرفوعة ضد الفيروسات والبرمجيات الخبيثة
 *
 * Uses ClamAV daemon over TCP (clamd) if available.
 * Graceful degradation: if ClamAV is unreachable, logs a warning and
 * allows the upload through (configurable via REQUIRE_VIRUS_SCAN env var).
 *
 * Usage:
 *   router.post('/upload', upload.single('file'), virusScan, handler);
 */

const net = require('net');
const fs = require('fs');
const logger = require('../utils/logger');

// ClamAV daemon connection settings
const CLAMD_HOST = process.env.CLAMD_HOST || '127.0.0.1';
const CLAMD_PORT = parseInt(process.env.CLAMD_PORT, 10) || 3310;
const CLAMD_TIMEOUT = parseInt(process.env.CLAMD_TIMEOUT, 10) || 30000; // 30s
const REQUIRE_VIRUS_SCAN = process.env.REQUIRE_VIRUS_SCAN === 'true'; // strict mode
const ENABLE_VIRUS_SCAN = process.env.ENABLE_VIRUS_SCAN !== 'false'; // default on

/**
 * Scan a file buffer via ClamAV's INSTREAM protocol.
 * Returns { clean: boolean, result: string }
 */
function scanBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';

    socket.setTimeout(CLAMD_TIMEOUT);

    socket.connect(CLAMD_PORT, CLAMD_HOST, () => {
      // INSTREAM command: send "zINSTREAM\0", then chunks, then zero-length chunk
      socket.write('zINSTREAM\0');

      // Send file in chunks (max 2MB each per ClamAV protocol)
      const CHUNK_SIZE = 2 * 1024 * 1024;
      for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
        const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32BE(chunk.length, 0);
        socket.write(sizeBuffer);
        socket.write(chunk);
      }

      // Zero-length terminator
      const end = Buffer.alloc(4);
      end.writeUInt32BE(0, 0);
      socket.write(end);
    });

    socket.on('data', data => {
      response += data.toString();
    });

    socket.on('end', () => {
      const clean = response.includes('OK') && !response.includes('FOUND');
      resolve({ clean, result: response.trim() });
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('ClamAV scan timeout'));
    });

    socket.on('error', err => {
      reject(err);
    });
  });
}

/**
 * Express middleware: scans req.file (multer single) or req.files (multer array).
 */
const virusScan = async (req, res, next) => {
  // Skip if disabled
  if (!ENABLE_VIRUS_SCAN) return next();

  // Collect files to scan
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else {
      // multer fields: { fieldname: [files] }
      Object.values(req.files).forEach(arr => files.push(...arr));
    }
  }

  if (files.length === 0) return next();

  for (const file of files) {
    try {
      // Read file buffer (multer memoryStorage) or from disk
      let buffer;
      if (file.buffer) {
        buffer = file.buffer;
      } else if (file.path && fs.existsSync(file.path)) {
        buffer = fs.readFileSync(file.path);
      } else {
        continue; // No scannable content
      }

      const { clean, result } = await scanBuffer(buffer);

      if (!clean) {
        logger.warn(`🦠 Malware detected in uploaded file: ${file.originalname} — ${result}`);
        // Delete infected file from disk if present
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return res.status(422).json({
          success: false,
          message: 'Uploaded file was rejected by security scan.',
        });
      }
    } catch (scanErr) {
      logger.warn(`⚠️ ClamAV unavailable: ${scanErr.message}`);
      if (REQUIRE_VIRUS_SCAN) {
        // Strict mode — reject upload when scanner is down
        return res.status(503).json({
          success: false,
          message: 'File security scanning is temporarily unavailable. Please try again later.',
        });
      }
      // Graceful mode — allow upload but log warning
    }
  }

  next();
};

module.exports = virusScan;

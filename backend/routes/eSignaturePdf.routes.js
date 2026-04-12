/**
 * E-Signature PDF Routes — توليد PDF + رمز QR + تضمين التوقيع والختم
 *
 * Endpoints:
 *   POST  /generate/:id      Generate signed PDF with QR verification
 *   POST  /stamp-pdf/:id     Embed stamp image into an uploaded PDF
 *   POST  /upload-document    Upload document for a signature request
 *   GET   /download/:id      Download the generated signed PDF
 *   GET   /public/verify/:code  Public verification (no auth)
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const ESignature = require('../models/ESignature');
const EStamp = require('../models/EStamp');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/* ─── PDF & QR libs (already in package.json) ────────────────────────────── */
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const safeError = require('../utils/safeError');

/* ─── Multer config for document uploads ─────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'signatures');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `sig-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const allowedMime = ['application/pdf', 'image/png', 'image/jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) && allowedMime.includes(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم. المسموح: PDF, PNG, JPG'));
  },
});

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLIC Verify — لا يحتاج تسجيل دخول (للعملاء الخارجيين)
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/public/verify/:code', async (req, res) => {
  try {
    const code = req.params.code;
    // Try signature verification first
    const doc = await ESignature.findOne({ verificationCode: code }).lean();
    if (doc) {
      const isValid = doc.status === 'completed';
      return res.json({
        success: true,
        data: {
          type: 'signature',
          isValid,
          requestId: doc.requestId,
          documentTitle: doc.documentTitle,
          status: doc.status,
          completedAt: doc.completedAt,
          createdAt: doc.createdAt,
          createdByName: doc.createdByName,
          signersCount: doc.signers.length,
          signedCount: doc.signers.filter(s => s.status === 'signed').length,
          signers: doc.signers.map(s => ({
            name: s.name,
            role: s.role,
            status: s.status,
            signedAt: s.signedAt,
          })),
        },
        message: isValid ? 'المستند موثق بالكامل ✓' : 'المستند لم يكتمل توثيقه',
      });
    }

    // Try stamp verification
    const stamp = await EStamp.findOne({ 'usageHistory.verificationCode': code }).lean();
    if (stamp) {
      const usage = stamp.usageHistory.find(u => u.verificationCode === code);
      return res.json({
        success: true,
        data: {
          type: 'stamp',
          valid: true,
          stamp: {
            stampId: stamp.stampId,
            name_ar: stamp.name_ar,
            stampType: stamp.stampType,
            organization: stamp.organization,
            department: stamp.department,
            status: stamp.status,
          },
          application: {
            documentTitle: usage?.documentTitle,
            appliedByName: usage?.appliedByName,
            appliedAt: usage?.appliedAt,
          },
        },
      });
    }

    res.json({
      success: true,
      data: { type: 'unknown', isValid: false },
      message: 'رمز التحقق غير صالح',
    });
  } catch (error) {
    safeError(res, error, 'Public verify error');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Protected endpoints — require authentication
   ═══════════════════════════════════════════════════════════════════════════ */
router.use(authenticate);

/* ═══════════════════════════════════════════════════════════════════════════
   Upload Document — attach PDF/image to a signature request
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/upload-document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم تحميل أي ملف' });
    }

    const { signatureRequestId } = req.body;
    const fileUrl = `/uploads/signatures/${req.file.filename}`;
    const fileSize = req.file.size;

    // If linked to a signature request, update it
    if (signatureRequestId) {
      const doc = await ESignature.findById(signatureRequestId);
      if (doc) {
        doc.documentUrl = fileUrl;
        doc.documentSize = fileSize;

        // Calculate pages for PDF
        if (req.file.mimetype === 'application/pdf') {
          try {
            const pdfBytes = fs.readFileSync(req.file.path);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            doc.documentPages = pdfDoc.getPageCount();
          } catch {
            doc.documentPages = 1;
          }
        }

        // Generate document hash
        const hash = crypto.createHash('sha256');
        const fileBuffer = fs.readFileSync(req.file.path);
        hash.update(fileBuffer);
        doc.documentHash = hash.digest('hex');

        doc.addAuditEntry(
          'created',
          req.user.id,
          req.user.name,
          `تم رفع المستند: ${req.file.originalname}`,
          req.ip,
          req.get('user-agent')
        );
        await doc.save();
      }
    }

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: fileSize,
        mimetype: req.file.mimetype,
      },
      message: 'تم رفع المستند بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'Document upload error');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Generate Signed PDF — creates a PDF certificate with all signatures + QR
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/generate/:id', async (req, res) => {
  try {
    const doc = await ESignature.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    const baseUrl = req.body.baseUrl || `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${baseUrl}/api/e-signature-pdf/public/verify/${doc.verificationCode}`;

    /* ─── Create PDF ─────────────────────────────────────────────── */
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    let y = height - 60;

    /* ─── Header ─────────────────────────────────────────────────── */
    // Organization name
    page.drawText('Al-Awael Rehabilitation Center', {
      x: 50,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.14, 0.49),
    });
    y -= 22;

    // Line separator
    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 2,
      color: rgb(0.1, 0.14, 0.49),
    });
    y -= 30;

    /* ─── Title ──────────────────────────────────────────────────── */
    page.drawText('Electronic Signature Certificate', {
      x: 50,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 30;

    /* ─── Document Info Table ────────────────────────────────────── */
    const info = [
      ['Request ID', doc.requestId],
      ['Document Title', doc.documentTitle],
      ['Document Type', doc.documentType],
      ['Status', doc.status],
      ['Priority', doc.priority],
      ['Created By', doc.createdByName || 'N/A'],
      ['Created At', doc.createdAt ? new Date(doc.createdAt).toLocaleString('en-GB') : 'N/A'],
      ['Completed At', doc.completedAt ? new Date(doc.completedAt).toLocaleString('en-GB') : 'N/A'],
      ['Verification Code', doc.verificationCode || 'N/A'],
      ['Document Hash', doc.documentHash ? doc.documentHash.slice(0, 32) + '...' : 'N/A'],
    ];

    for (const [label, value] of info) {
      page.drawText(`${label}:`, { x: 50, y, size: 10, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
      page.drawText(String(value), { x: 200, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
      y -= 18;
    }

    y -= 15;

    /* ─── Separator ──────────────────────────────────────────────── */
    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 25;

    /* ─── Signers Section ────────────────────────────────────────── */
    page.drawText('Signers:', { x: 50, y, size: 12, font: boldFont, color: rgb(0.1, 0.14, 0.49) });
    y -= 20;

    for (const signer of doc.signers) {
      // Signer box
      const boxY = y;
      page.drawRectangle({
        x: 50,
        y: boxY - 45,
        width: width - 100,
        height: 50,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
        color: rgb(0.97, 0.97, 0.97),
      });

      page.drawText(`${signer.name} (${signer.role})`, {
        x: 60,
        y: boxY - 12,
        size: 10,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      });

      const statusText = signer.status === 'signed' ? 'SIGNED' : signer.status.toUpperCase();
      const statusColor =
        signer.status === 'signed'
          ? rgb(0.13, 0.55, 0.13)
          : signer.status === 'rejected'
            ? rgb(0.8, 0.13, 0.13)
            : rgb(0.6, 0.6, 0.0);

      page.drawText(statusText, {
        x: width - 150,
        y: boxY - 12,
        size: 10,
        font: boldFont,
        color: statusColor,
      });

      if (signer.signedAt) {
        page.drawText(`Signed: ${new Date(signer.signedAt).toLocaleString('en-GB')}`, {
          x: 60,
          y: boxY - 28,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }

      if (signer.signatureHash) {
        page.drawText(`Hash: ${signer.signatureHash.slice(0, 40)}...`, {
          x: 60,
          y: boxY - 40,
          size: 7,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      // Embed signature image if available
      if (signer.signatureImage && signer.status === 'signed') {
        try {
          const sigData = signer.signatureImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
          const sigBytes = Buffer.from(sigData, 'base64');
          const sigImage = signer.signatureImage.includes('image/png')
            ? await pdfDoc.embedPng(sigBytes)
            : await pdfDoc.embedJpg(sigBytes);

          const dims = sigImage.scale(0.3);
          page.drawImage(sigImage, {
            x: width - 200,
            y: boxY - 45,
            width: Math.min(dims.width, 80),
            height: Math.min(dims.height, 40),
          });
        } catch (imgErr) {
          logger.warn('Could not embed signature image for %s: %s', signer.name, imgErr.message);
        }
      }

      y -= 60;

      // New page if needed
      if (y < 120) {
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        y = newPage.getSize().height - 60;
      }
    }

    /* ─── QR Code ────────────────────────────────────────────────── */
    y -= 20;
    page.drawText('Verification QR Code:', {
      x: 50,
      y,
      size: 10,
      font: boldFont,
      color: rgb(0.1, 0.14, 0.49),
    });
    y -= 10;

    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 120,
        margin: 1,
        color: { dark: '#1a237e', light: '#ffffff' },
      });
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'));
      page.drawImage(qrImage, { x: 50, y: y - 110, width: 100, height: 100 });
    } catch (qrErr) {
      logger.warn('QR generation error: %s', qrErr.message);
    }

    page.drawText(`Scan to verify: ${verifyUrl}`, {
      x: 160,
      y: y - 60,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    /* ─── Footer ─────────────────────────────────────────────────── */
    const footerY = 30;
    page.drawLine({
      start: { x: 50, y: footerY + 15 },
      end: { x: width - 50, y: footerY + 15 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    page.drawText(
      `Generated: ${new Date().toLocaleString('en-GB')} | Al-Awael ERP Electronic Signature System`,
      { x: 50, y: footerY, size: 7, font, color: rgb(0.5, 0.5, 0.5) }
    );

    /* ─── Save & respond ─────────────────────────────────────────── */
    const pdfBytes = await pdfDoc.save();
    const outputDir = path.join(__dirname, '..', 'uploads', 'signatures', 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputFile = `signed-${doc.requestId}-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, outputFile);
    fs.writeFileSync(outputPath, pdfBytes);

    // Update the doc with the generated PDF URL
    doc.addAuditEntry(
      'downloaded',
      req.user.id,
      req.user.name,
      'تم توليد شهادة التوقيع الإلكتروني PDF',
      req.ip,
      req.get('user-agent')
    );
    await doc.save();

    res.json({
      success: true,
      data: {
        pdfUrl: `/uploads/signatures/generated/${outputFile}`,
        filename: outputFile,
        size: pdfBytes.length,
        verificationCode: doc.verificationCode,
        verifyUrl,
      },
      message: 'تم توليد شهادة التوقيع بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'PDF generation error');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Download Generated PDF
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/download/:id', async (req, res) => {
  try {
    const doc = await ESignature.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    // Find the latest generated PDF
    const genDir = path.join(__dirname, '..', 'uploads', 'signatures', 'generated');
    if (!fs.existsSync(genDir)) {
      return res.status(404).json({ success: false, message: 'لم يتم توليد PDF بعد' });
    }

    const files = fs.readdirSync(genDir).filter(f => f.startsWith(`signed-${doc.requestId}-`));
    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'لم يتم توليد PDF بعد' });
    }

    const latestFile = files.sort().pop();
    const filePath = path.join(genDir, latestFile);

    res.download(filePath, `${doc.requestId}-certificate.pdf`);
  } catch (error) {
    safeError(res, error, 'PDF download error');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Download Stamped PDF — download the latest stamped PDF for a stamp
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/stamped/:stampId', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.stampId).select('stampId name_ar').lean();
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    const stampedDir = path.join(__dirname, '..', 'uploads', 'signatures', 'stamped');
    if (!fs.existsSync(stampedDir)) {
      return res.status(404).json({ success: false, message: 'لم يتم ختم أي مستند بعد' });
    }

    const files = fs.readdirSync(stampedDir).filter(f => f.startsWith(`stamped-${stamp.stampId}-`));
    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'لم يتم ختم أي مستند بعد' });
    }

    const latestFile = files.sort().pop();
    const filePath = path.join(stampedDir, latestFile);

    res.download(filePath, `${stamp.stampId}-stamped.pdf`);
  } catch (error) {
    safeError(res, error, 'Stamped PDF download error');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Stamp PDF — embed a stamp image into an existing PDF at given position
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/stamp-pdf/:stampId', upload.single('document'), async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.stampId);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });
    if (stamp.status !== 'active') {
      return res.status(400).json({ success: false, message: 'الختم غير مفعّل' });
    }

    // Check usage limits
    if (stamp.maxUsageCount > 0 && stamp.usageCount >= stamp.maxUsageCount) {
      return res
        .status(400)
        .json({ success: false, message: 'تم تجاوز الحد الأقصى لاستخدام الختم' });
    }

    let pdfBytes;
    if (req.file) {
      pdfBytes = fs.readFileSync(req.file.path);
    } else if (req.body.documentUrl) {
      // Path traversal protection: only allow files within uploads directory
      const uploadsDir = path.resolve(__dirname, '..', 'uploads');
      const docPath = path.resolve(uploadsDir, path.basename(req.body.documentUrl));
      if (!docPath.startsWith(uploadsDir)) {
        return res.status(400).json({ success: false, message: 'مسار الملف غير صالح' });
      }
      if (!fs.existsSync(docPath)) {
        return res.status(404).json({ success: false, message: 'ملف المستند غير موجود' });
      }
      pdfBytes = fs.readFileSync(docPath);
    } else {
      return res.status(400).json({ success: false, message: 'يجب رفع مستند PDF أو تحديد رابطه' });
    }

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageNum = parseInt(req.body.page) || 1;
    const x = parseFloat(req.body.x) || 400;
    const y = parseFloat(req.body.y) || 50;
    const stampScale = parseFloat(req.body.scale) || 0.5;

    if (pageNum > pdfDoc.getPageCount() || pageNum < 1) {
      return res.status(400).json({ success: false, message: 'رقم الصفحة غير صحيح' });
    }

    const page = pdfDoc.getPages()[pageNum - 1];

    /* ─── Embed stamp image ──────────────────────────────────────── */
    if (stamp.stampImage) {
      const imgData = stamp.stampImage.replace(/^data:image\/(png|jpeg|jpg|svg\+xml);base64,/, '');
      const imgBytes = Buffer.from(imgData, 'base64');

      let stampImg;
      if (stamp.stampImage.includes('image/png') || stamp.stampImage.includes('image/svg')) {
        stampImg = await pdfDoc.embedPng(imgBytes);
      } else {
        stampImg = await pdfDoc.embedJpg(imgBytes);
      }

      const dims = stampImg.scale(stampScale);
      page.drawImage(stampImg, {
        x,
        y,
        width: dims.width,
        height: dims.height,
        opacity: 0.85,
      });
    }

    /* ─── Add verification text under stamp ──────────────────────── */
    const verificationCode = stamp.generateVerificationCode();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(`Verification: ${verificationCode}`, {
      x: x,
      y: y - 12,
      size: 6,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    /* ─── Add date if configured ─────────────────────────────────── */
    if (stamp.includeDate) {
      page.drawText(new Date().toLocaleDateString('en-GB'), {
        x: x,
        y: y - 20,
        size: 6,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    /* ─── Add QR code if configured ──────────────────────────────── */
    if (stamp.includeQR) {
      const baseUrl = req.body.baseUrl || `${req.protocol}://${req.get('host')}`;
      const qrUrl = `${baseUrl}/api/e-signature-pdf/public/verify/${verificationCode}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 80, margin: 1 });
        const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'));
        page.drawImage(qrImage, {
          x: x + (stamp.size?.width || 150) * stampScale + 5,
          y,
          width: 50,
          height: 50,
        });
      } catch {
        /* QR embedding optional */
      }
    }

    /* ─── Save stamped PDF ───────────────────────────────────────── */
    const stampedPdfBytes = await pdfDoc.save();
    const outputDir = path.join(__dirname, '..', 'uploads', 'signatures', 'stamped');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputFile = `stamped-${stamp.stampId}-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, outputFile);
    fs.writeFileSync(outputPath, stampedPdfBytes);

    /* ─── Record usage ───────────────────────────────────────────── */
    const verificationHash = stamp.generateApplicationHash(req.body.documentTitle || 'pdf');
    stamp.usageHistory.push({
      documentId: req.body.documentId || outputFile,
      documentTitle: req.body.documentTitle || 'PDF Document',
      documentType: req.body.documentType || 'other',
      appliedBy: req.user?._id || req.user?.id,
      appliedByName: req.user?.name || req.user?.fullName,
      position: { x, y, page: pageNum, scale: stampScale },
      verificationCode,
      verificationHash,
      notes: req.body.notes,
      ip: req.ip,
    });
    stamp.usageCount += 1;
    stamp.lastUsedAt = new Date();
    stamp.lastUsedBy = req.user?._id || req.user?.id;
    stamp.addAuditEntry(
      'applied',
      req.user,
      `تم ختم مستند PDF: ${req.body.documentTitle || 'PDF'}`
    );
    await stamp.save();

    // Cleanup uploaded temp file
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore */
      }
    }

    res.json({
      success: true,
      data: {
        pdfUrl: `/uploads/signatures/stamped/${outputFile}`,
        filename: outputFile,
        size: stampedPdfBytes.length,
        verificationCode,
        verificationHash,
        stampId: stamp.stampId,
      },
      message: 'تم ختم المستند بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'Stamp PDF error');
  }
});

module.exports = router;

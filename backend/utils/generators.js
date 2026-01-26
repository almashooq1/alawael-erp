const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ============================================
// QR Code Generator
// ============================================

/**
 * توليد QR Code لاتصال معين
 * @param {Object} communication - بيانات الاتصال
 * @param {String} baseUrl - URL الأساسي للنظام
 * @returns {Promise<String>} - Data URL للـ QR Code
 */
async function generateQRCode(communication, baseUrl = 'http://localhost:3002') {
  try {
    const trackingUrl = `${baseUrl}/communications-system/track/${communication._id}`;

    const qrData = {
      id: communication._id,
      referenceNumber: communication.referenceNumber,
      title: communication.title,
      type: communication.type,
      url: trackingUrl,
      generatedAt: new Date().toISOString(),
    };

    // توليد QR Code كـ Data URL
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('فشل توليد رمز QR');
  }
}

/**
 * حفظ QR Code كملف
 * @param {Object} communication - بيانات الاتصال
 * @param {String} baseUrl - URL الأساسي
 * @param {String} outputDir - مجلد الحفظ
 * @returns {Promise<String>} - مسار الملف
 */
async function saveQRCodeToFile(communication, baseUrl, outputDir = './public/qrcodes') {
  try {
    // إنشاء المجلد إذا لم يكن موجود
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const trackingUrl = `${baseUrl}/communications-system/track/${communication._id}`;
    const filename = `qr_${communication.referenceNumber}.png`;
    const filepath = path.join(outputDir, filename);

    await QRCode.toFile(filepath, trackingUrl, {
      width: 300,
      margin: 2,
    });

    return `/qrcodes/${filename}`;
  } catch (error) {
    console.error('Error saving QR code:', error);
    throw new Error('فشل حفظ رمز QR');
  }
}

// ============================================
// PDF Generator
// ============================================

/**
 * توليد PDF لاتصال معين
 * @param {Object} communication - بيانات الاتصال
 * @param {String} outputPath - مسار الحفظ
 * @param {String} qrCodeDataURL - QR Code كـ Data URL
 * @returns {Promise<String>} - مسار الملف
 */
function generatePDF(communication, outputPath, qrCodeDataURL = null) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // العنوان
      doc.fontSize(20).font('Helvetica-Bold').text('Communication Report', { align: 'center' });

      doc.moveDown();

      // معلومات أساسية
      doc.fontSize(12).font('Helvetica');

      doc.fontSize(14).font('Helvetica-Bold').text('Basic Information:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');

      doc.text(`Reference Number: ${communication.referenceNumber}`);
      doc.text(`Title: ${communication.title}`);
      doc.text(`Type: ${communication.type}`);
      doc.text(`Status: ${communication.status}`);
      doc.text(`Priority: ${communication.priority}`);

      doc.moveDown();

      // المرسل والمستقبل
      doc.fontSize(14).font('Helvetica-Bold').text('Sender & Receiver:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');

      doc.text(`Sender: ${communication.sender.name}`);
      if (communication.sender.email) {
        doc.text(`  Email: ${communication.sender.email}`);
      }
      if (communication.sender.department) {
        doc.text(`  Department: ${communication.sender.department}`);
      }

      doc.moveDown(0.5);

      doc.text(`Receiver: ${communication.receiver.name}`);
      if (communication.receiver.email) {
        doc.text(`  Email: ${communication.receiver.email}`);
      }
      if (communication.receiver.department) {
        doc.text(`  Department: ${communication.receiver.department}`);
      }

      doc.moveDown();

      // التواريخ
      doc.fontSize(14).font('Helvetica-Bold').text('Dates:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');

      doc.text(`Sent Date: ${new Date(communication.sentDate).toLocaleDateString()}`);
      if (communication.receivedDate) {
        doc.text(`Received Date: ${new Date(communication.receivedDate).toLocaleDateString()}`);
      }
      if (communication.dueDate) {
        doc.text(`Due Date: ${new Date(communication.dueDate).toLocaleDateString()}`);
      }

      doc.moveDown();

      // الموضوع والوصف
      doc.fontSize(14).font('Helvetica-Bold').text('Subject:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(communication.subject, { align: 'justify' });

      if (communication.description) {
        doc.moveDown();
        doc.fontSize(14).font('Helvetica-Bold').text('Description:', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        doc.text(communication.description, { align: 'justify' });
      }

      // QR Code (إذا كان متوفراً)
      if (qrCodeDataURL) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Tracking QR Code:', { align: 'center' });
        doc.moveDown();

        // تحويل Data URL إلى Buffer
        const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        doc.image(imageBuffer, {
          fit: [250, 250],
          align: 'center',
          valign: 'center',
        });

        doc.moveDown();
        doc
          .fontSize(10)
          .font('Helvetica')
          .text('Scan this QR code to track this communication', { align: 'center' });
      }

      // التذييل
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
          align: 'center',
        });

      doc.end();

      writeStream.on('finish', () => {
        resolve(outputPath);
      });

      writeStream.on('error', error => {
        reject(error);
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}

/**
 * توليد PDF شامل مع إحصائيات
 * @param {Array} communications - قائمة الاتصالات
 * @param {Object} stats - إحصائيات
 * @param {String} outputPath - مسار الحفظ
 * @returns {Promise<String>} - مسار الملف
 */
function generateSummaryPDF(communications, stats, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // العنوان
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Communications Summary Report', { align: 'center' });

      doc.moveDown(2);

      // الإحصائيات
      doc.fontSize(16).font('Helvetica-Bold').text('Statistics:');
      doc.moveDown();

      doc.fontSize(12).font('Helvetica');
      if (stats.totals && stats.totals[0]) {
        const totals = stats.totals[0];
        doc.text(`Total Communications: ${totals.total || 0}`);
        doc.text(`Pending: ${totals.pending || 0}`);
        doc.text(`Completed: ${totals.completed || 0}`);
        doc.text(`Starred: ${totals.starred || 0}`);
        doc.text(`Archived: ${totals.archived || 0}`);
      }

      doc.moveDown(2);

      // جدول الاتصالات
      doc.fontSize(16).font('Helvetica-Bold').text('Communications List:');
      doc.moveDown();

      doc.fontSize(10).font('Helvetica');

      communications.forEach((comm, index) => {
        if (index > 0 && index % 5 === 0) {
          doc.addPage();
        }

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`${index + 1}. ${comm.referenceNumber}`);
        doc.fontSize(10).font('Helvetica');
        doc.text(`   Title: ${comm.title}`);
        doc.text(`   Type: ${comm.type} | Status: ${comm.status} | Priority: ${comm.priority}`);
        doc.text(`   Date: ${new Date(comm.sentDate).toLocaleDateString()}`);
        doc.moveDown(0.5);
      });

      // التذييل
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(`Report generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
          align: 'center',
        });

      doc.end();

      writeStream.on('finish', () => {
        resolve(outputPath);
      });

      writeStream.on('error', error => {
        reject(error);
      });
    } catch (error) {
      console.error('Error generating summary PDF:', error);
      reject(error);
    }
  });
}

module.exports = {
  generateQRCode,
  saveQRCodeToFile,
  generatePDF,
  generateSummaryPDF,
};

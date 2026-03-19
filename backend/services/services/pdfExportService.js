// backend/services/pdfExportService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');

// توليد PDF لخطاب/إشعار مع رقم وباركود ومعلومات الامتثال
async function generateNotificationPDF({
  title,
  message,
  serialNumber,
  barcodeBase64,
  archiveStatus,
  signatureStatus,
  stampStatus,
  outputPath = null,
}) {
  // صور افتراضية (يمكن استبدالها بمسارات فعلية أو تحميلها من قاعدة البيانات)
  const logoPath = __dirname + '/../assets/logo.png';
  const signaturePath = __dirname + '/../assets/signature.png';
  const stampPath = __dirname + '/../assets/stamp.png';
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      if (outputPath) fs.writeFileSync(outputPath, pdfData);
      resolve(pdfData);
    });

    // الشعار أعلى الصفحة
    try {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, doc.page.width / 2 - 50, doc.y, {
          width: 100,
          height: 60,
          align: 'center',
        });
        doc.moveDown(1.5);
      }
    } catch {}

    // العنوان
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    // الرقم التسلسلي
    doc.fontSize(12).text(`رقم الخطاب: ${serialNumber}`, { align: 'right' });
    doc.moveDown(0.5);
    // الباركود
    if (barcodeBase64) {
      const base64Data = barcodeBase64.replace(/^data:image\/png;base64,/, '');
      const imgBuffer = Buffer.from(base64Data, 'base64');
      doc.image(imgBuffer, doc.page.width - 120, doc.y, { width: 80, height: 40 });
      doc.moveDown();
    }
    // نص الخطاب
    doc.fontSize(14).text(message, { align: 'right' });
    doc.moveDown(1.5);
    // معلومات الامتثال
    doc.fontSize(13).text('معلومات الامتثال:', { align: 'right', underline: true });
    doc.moveDown(0.5);
    // الأرشفة
    doc
      .fontSize(12)
      .text(
        `الأرشفة: ${archiveStatus === 'archived' ? 'مؤرشف' : archiveStatus === 'pending' ? 'قيد الأرشفة' : archiveStatus === 'failed' ? 'فشل الأرشفة' : 'غير محدد'}`,
        { align: 'right' }
      );
    // التوقيع الإلكتروني
    doc
      .fontSize(12)
      .text(
        `التوقيع الإلكتروني: ${signatureStatus === 'signed' ? 'موقع إلكترونياً' : signatureStatus === 'pending' ? 'بانتظار التوقيع' : signatureStatus === 'failed' ? 'فشل التوقيع' : 'غير محدد'}`,
        { align: 'right' }
      );
    // صورة التوقيع
    try {
      if (signatureStatus === 'signed' && fs.existsSync(signaturePath)) {
        doc.image(signaturePath, doc.page.width - 180, doc.y + 10, { width: 90, height: 40 });
        doc.moveDown(1);
      }
    } catch {}
    // الختم الإلكتروني
    doc
      .fontSize(12)
      .text(
        `الختم الإلكتروني: ${stampStatus === 'stamped' ? 'مختوم إلكترونياً' : stampStatus === 'pending' ? 'بانتظار الختم' : stampStatus === 'failed' ? 'فشل الختم' : 'غير محدد'}`,
        { align: 'right' }
      );
    // صورة الختم
    try {
      if (stampStatus === 'stamped' && fs.existsSync(stampPath)) {
        doc.image(stampPath, doc.page.width - 90, doc.y - 30, { width: 60, height: 60 });
      }
    } catch {}
    doc.end();
  });
}

module.exports = { generateNotificationPDF };

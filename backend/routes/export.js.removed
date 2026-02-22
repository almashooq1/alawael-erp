const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { generateQRCode, saveQRCodeToFile, generatePDF, generateSummaryPDF } = require('../utils/generators');

// تأكد من وجود مجلد المخرجات
const OUTPUT_DIR = path.join(__dirname, '../public/exports');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================
// POST /api/export/qrcode/:id - توليد QR Code
// ============================================
router.post('/qrcode/:id', async (req, res) => {
  try {
    const communicationId = req.params.id;
    
    // جلب بيانات الاتصال (يجب تعديله حسب نوع قاعدة البيانات)
    // هنا مثال بسيط - يجب استبداله بالجلب الحقيقي
    const communication = {
      _id: communicationId,
      referenceNumber: req.body.referenceNumber || `COM-${Date.now()}`,
      title: req.body.title || 'اتصال إداري',
      type: req.body.type || 'incoming'
    };
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    
    // توليد QR Code كـ Data URL
    const qrCodeDataURL = await generateQRCode(communication, baseUrl);
    
    res.json({
      success: true,
      message: 'تم توليد QR Code بنجاح',
      qrCode: qrCodeDataURL
    });
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      message: 'فشل توليد QR Code',
      error: error.message
    });
  }
});

// ============================================
// POST /api/export/qrcode/:id/file - حفظ QR Code كملف
// ============================================
router.post('/qrcode/:id/file', async (req, res) => {
  try {
    const communicationId = req.params.id;
    
    const communication = {
      _id: communicationId,
      referenceNumber: req.body.referenceNumber || `COM-${Date.now()}`,
      title: req.body.title || 'اتصال إداري',
      type: req.body.type || 'incoming'
    };
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    const outputDir = path.join(__dirname, '../public/qrcodes');
    
    // حفظ QR Code كملف
    const qrFilePath = await saveQRCodeToFile(communication, baseUrl, outputDir);
    
    res.json({
      success: true,
      message: 'تم حفظ QR Code بنجاح',
      filePath: qrFilePath,
      url: `${req.protocol}://${req.get('host')}${qrFilePath}`
    });
    
  } catch (error) {
    console.error('Error saving QR code:', error);
    res.status(500).json({
      success: false,
      message: 'فشل حفظ QR Code',
      error: error.message
    });
  }
});

// ============================================
// POST /api/export/pdf/:id - توليد PDF لاتصال واحد
// ============================================
router.post('/pdf/:id', async (req, res) => {
  try {
    const communicationId = req.params.id;
    
    // بيانات الاتصال (مثال - يجب استبداله بجلب حقيقي من قاعدة البيانات)
    const communication = {
      _id: communicationId,
      referenceNumber: req.body.referenceNumber || `COM-2026-00001`,
      title: req.body.title || 'اتصال إداري',
      subject: req.body.subject || 'موضوع الاتصال',
      description: req.body.description || 'وصف تفصيلي للاتصال',
      type: req.body.type || 'incoming',
      status: req.body.status || 'pending',
      priority: req.body.priority || 'medium',
      sender: req.body.sender || {
        name: 'الجهة المرسلة',
        email: 'sender@example.com',
        department: 'القسم الإداري'
      },
      receiver: req.body.receiver || {
        name: 'الجهة المستقبلة',
        email: 'receiver@example.com',
        department: 'القسم المالي'
      },
      sentDate: req.body.sentDate || new Date(),
      receivedDate: req.body.receivedDate || new Date(),
      dueDate: req.body.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
    
    // توليد QR Code (اختياري)
    let qrCodeDataURL = null;
    if (req.body.includeQR !== false) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
      qrCodeDataURL = await generateQRCode(communication, baseUrl);
    }
    
    // مسار الحفظ
    const filename = `communication_${communication.referenceNumber}_${Date.now()}.pdf`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    
    // توليد PDF
    await generatePDF(communication, outputPath, qrCodeDataURL);
    
    // إرسال الملف
    res.download(outputPath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // حذف الملف بعد الإرسال (اختياري)
      setTimeout(() => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }, 60000); // حذف بعد دقيقة
    });
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'فشل توليد PDF',
      error: error.message
    });
  }
});

// ============================================
// POST /api/export/pdf/summary - توليد PDF شامل
// ============================================
router.post('/pdf/summary', async (req, res) => {
  try {
    const { communications = [], stats = {} } = req.body;
    
    if (!communications || communications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد اتصالات للتصدير'
      });
    }
    
    // مسار الحفظ
    const filename = `communications_summary_${Date.now()}.pdf`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    
    // توليد PDF
    await generateSummaryPDF(communications, stats, outputPath);
    
    // إرسال الملف
    res.download(outputPath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // حذف الملف بعد الإرسال
      setTimeout(() => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }, 60000);
    });
    
  } catch (error) {
    console.error('Error generating summary PDF:', error);
    res.status(500).json({
      success: false,
      message: 'فشل توليد تقرير PDF',
      error: error.message
    });
  }
});

// ============================================
// GET /api/export/test - اختبار التصدير
// ============================================
router.get('/test', async (req, res) => {
  try {
    const testCommunication = {
      _id: 'test123',
      referenceNumber: 'COM-2026-TEST',
      title: 'اتصال تجريبي',
      subject: 'هذا موضوع تجريبي لاختبار التصدير',
      description: 'وصف تفصيلي للاتصال التجريبي',
      type: 'incoming',
      status: 'pending',
      priority: 'medium',
      sender: {
        name: 'أحمد محمد',
        email: 'ahmad@example.com',
        department: 'القسم الإداري'
      },
      receiver: {
        name: 'محمد علي',
        email: 'mohamed@example.com',
        department: 'القسم المالي'
      },
      sentDate: new Date(),
      receivedDate: new Date()
    };
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    const qrCode = await generateQRCode(testCommunication, baseUrl);
    
    res.json({
      success: true,
      message: 'Export service is working!',
      qrCode: qrCode,
      endpoints: {
        qrcode: '/api/export/qrcode/:id',
        qrcodeFile: '/api/export/qrcode/:id/file',
        pdf: '/api/export/pdf/:id',
        summaryPdf: '/api/export/pdf/summary'
      }
    });
    
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

module.exports = router;


/**
 * Export Routes
 * Data Export API Endpoints (PDF, Excel, CSV)
 *
 * Routes:
 * - POST /api/export/pdf       - Export data as PDF
 * - POST /api/export/excel     - Export data as Excel
 * - POST /api/export/csv       - Export data as CSV
 * - GET  /api/export/status/:id - Get export status
 */

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { stringify } = require('csv-stringify/sync');
const exceljs = require('exceljs');
const { authenticate } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Ensure exports directory exists
const exportsDir = path.join(__dirname, '../exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

/**
 * @route   POST /api/export/pdf
 * @access  Private
 * @body    {Object} data - Data to export
 * @body    {String} title - Report title
 * @body    {String} format - Layout format (portrait/landscape)
 * @returns {Object} Export status with file info
 */
router.post('/pdf', authenticate, (req, res) => {
  try {
    const { data, title = 'Report', format = 'portrait' } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Data is required for PDF export'
      });
    }

    const exportId = 'export_' + Date.now();
    const filename = `${exportId}.pdf`;
    const filepath = path.join(exportsDir, filename);

    // Create PDF document
    const doc = new PDFDocument({
      orientation: format === 'landscape' ? 'landscape' : 'portrait'
    });

    // Pipe to file
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Add content
    doc.fontSize(18).text(title, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'right' });
    doc.moveDown();

    // Add data as JSON
    if (typeof data === 'object') {
      doc.fontSize(10);
      doc.text(JSON.stringify(data, null, 2));
    } else {
      doc.text(data);
    }

    doc.end();

    stream.on('finish', () => {
      res.status(201).json({
        success: true,
        message: 'PDF exported successfully',
        data: {
          exportId,
          filename,
          format: 'pdf',
          size: fs.statSync(filepath).size,
          url: `/api/export/${exportId}/download`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      });
    });

    stream.on('error', (err) => {
      res.status(500).json({
        success: false,
        message: 'Error creating PDF',
        error: err.message
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting to PDF',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/export/excel
 * @access  Private
 * @body    {Array} data - Array of objects to export
 * @body    {String} sheetName - Worksheet name
 * @returns {Object} Export status with file info
 */
router.post('/excel', authenticate, (req, res) => {
  try {
    const { data, sheetName = 'Sheet1' } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Data must be an array for Excel export'
      });
    }

    const exportId = 'export_' + Date.now();
    const filename = `${exportId}.xlsx`;
    const filepath = path.join(exportsDir, filename);

    // Create workbook
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length > 0) {
      // Add headers from first object
      const headers = Object.keys(data[0]);
      worksheet.columns = headers.map(h => ({ header: h, key: h, width: 20 }));

      // Add data
      data.forEach(row => {
        worksheet.addRow(row);
      });
    }

    // Save and send response
    workbook.xlsx.writeFile(filepath).then(() => {
      res.status(201).json({
        success: true,
        message: 'Excel exported successfully',
        data: {
          exportId,
          filename,
          format: 'xlsx',
          size: fs.statSync(filepath).size,
          rows: data.length,
          url: `/api/export/${exportId}/download`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      });
    }).catch(err => {
      res.status(500).json({
        success: false,
        message: 'Error creating Excel',
        error: err.message
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting to Excel',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/export/csv
 * @access  Private
 * @body    {Array} data - Array of objects to export
 * @returns {Object} Export status with file info
 */
router.post('/csv', authenticate, (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Data must be an array for CSV export'
      });
    }

    const exportId = 'export_' + Date.now();
    const filename = `${exportId}.csv`;
    const filepath = path.join(exportsDir, filename);

    // Create CSV
    const csv = stringify(data, { header: true });

    // Write to file
    fs.writeFileSync(filepath, csv);

    res.status(201).json({
      success: true,
      message: 'CSV exported successfully',
      data: {
        exportId,
        filename,
        format: 'csv',
        size: fs.statSync(filepath).size,
        rows: data.length,
        url: `/api/export/${exportId}/download`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting to CSV',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/export/status/:id
 * @access  Private
 * @param   {String} id - Export ID
 * @returns {Object} Export status information
 */
router.get('/status/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Export ID is required'
      });
    }

    // TODO: Implement export status tracking
    res.json({
      success: true,
      message: 'Export status retrieved',
      data: {
        exportId: id,
        status: 'completed',
        progress: 100,
        filename: `${id}.pdf`,
        format: 'pdf',
        size: 102400,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        downloadUrl: `/api/export/${id}/download`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving export status',
      error: error.message
    });
  }
});

module.exports = router;

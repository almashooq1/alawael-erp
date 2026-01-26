/**
 * Export/Import Controller
 * Handles HTTP requests for export and import operations
 */

const exportImportService = require('../services/export-import.service');
const path = require('path');
const fs = require('fs');

class ExportImportController {
  /**
   * Export programs to Excel
   * GET /api/export/excel
   */
  async exportToExcel(req, res) {
    try {
      const filters = {};

      // Apply filters from query params
      if (req.query.disability_type) {
        filters['disability_info.primary_disability'] = req.query.disability_type;
      }
      if (req.query.status) {
        filters['program_info.status'] = req.query.status;
      }
      if (req.query.start_date || req.query.end_date) {
        filters['program_info.start_date'] = {};
        if (req.query.start_date) {
          filters['program_info.start_date'].$gte = new Date(req.query.start_date);
        }
        if (req.query.end_date) {
          filters['program_info.start_date'].$lte = new Date(req.query.end_date);
        }
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `programs_export_${timestamp}.xlsx`;
      const filePath = path.join(__dirname, '../exports', filename);

      // Ensure exports directory exists
      const exportsDir = path.join(__dirname, '../exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // Export to Excel
      await exportImportService.exportToExcel(filters, filePath);

      // Send file
      res.download(filePath, filename, err => {
        if (err) {
          console.error('Error sending file:', err);
        }
        // Delete file after sending
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting to Excel',
        error: error.message,
      });
    }
  }

  /**
   * Export program to PDF
   * GET /api/export/pdf/:id
   */
  async exportProgramToPDF(req, res) {
    try {
      const { id } = req.params;

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `program_${id}_${timestamp}.pdf`;
      const filePath = path.join(__dirname, '../exports', filename);

      // Ensure exports directory exists
      const exportsDir = path.join(__dirname, '../exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // Export to PDF
      await exportImportService.exportProgramToPDF(id, filePath);

      // Send file
      res.download(filePath, filename, err => {
        if (err) {
          console.error('Error sending file:', err);
        }
        // Delete file after sending
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting to PDF',
        error: error.message,
      });
    }
  }

  /**
   * Import programs from Excel
   * POST /api/import/excel
   */
  async importFromExcel(req, res) {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const file = req.files.file;
      const uploadPath = path.join(__dirname, '../uploads', file.name);

      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Save uploaded file
      await file.mv(uploadPath);

      // Import from Excel
      const result = await exportImportService.importFromExcel(uploadPath);

      // Delete uploaded file
      if (fs.existsSync(uploadPath)) {
        fs.unlinkSync(uploadPath);
      }

      res.status(200).json({
        success: true,
        data: result,
        message: `Successfully imported ${result.imported} of ${result.total} programs`,
      });
    } catch (error) {
      console.error('Error importing from Excel:', error);
      res.status(500).json({
        success: false,
        message: 'Error importing from Excel',
        error: error.message,
      });
    }
  }

  /**
   * Download Excel template
   * GET /api/import/template
   */
  async downloadImportTemplate(req, res) {
    try {
      const timestamp = Date.now();
      const filename = `import_template_${timestamp}.xlsx`;
      const filePath = path.join(__dirname, '../exports', filename);

      // Ensure exports directory exists
      const exportsDir = path.join(__dirname, '../exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // Generate template
      await exportImportService.generateImportTemplate(filePath);

      // Send file
      res.download(filePath, 'template_import_programs.xlsx', err => {
        if (err) {
          console.error('Error sending template:', err);
        }
        // Delete file after sending
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating import template',
        error: error.message,
      });
    }
  }

  /**
   * Get export/import info
   * GET /api/export-import/info
   */
  async getInfo(req, res) {
    res.status(200).json({
      success: true,
      message: 'Export/Import API',
      version: '1.0.0',
      endpoints: [
        'GET /export/excel - Export programs to Excel',
        'GET /export/pdf/:id - Export program to PDF',
        'POST /import/excel - Import programs from Excel',
        'GET /import/template - Download import template',
      ],
      supportedFormats: {
        export: ['Excel (.xlsx)', 'PDF (.pdf)'],
        import: ['Excel (.xlsx)'],
      },
    });
  }
}

module.exports = new ExportImportController();

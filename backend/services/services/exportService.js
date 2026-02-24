// ===================================
// Export Service - PDF and Excel
// ===================================

const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create exports directory
const exportsDir = path.join(__dirname, '../exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

/**
 * Export data to Excel
 */
async function exportToExcel(data, filename, options = {}) {
  try {
    const { sheetName = 'Sheet1', columns = null, title = null } = options;

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data
    let worksheetData = data;

    // Add title row if specified
    if (title) {
      worksheetData = [[title], [], ...data];
    }

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData, {
      header: columns || undefined,
      skipHeader: false,
    });

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = {};

    // Calculate column widths
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        const value = String(row[key] || '');
        const width = Math.min(Math.max(value.length, key.length), maxWidth);
        colWidths[key] = Math.max(colWidths[key] || 0, width);
      });
    });

    // Set column widths
    worksheet['!cols'] = Object.values(colWidths).map(w => ({ wch: w + 2 }));

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate file path
    const filePath = path.join(exportsDir, `${filename}.xlsx`);

    // Write file
    XLSX.writeFile(workbook, filePath);

    return {
      success: true,
      filename: `${filename}.xlsx`,
      path: filePath,
      url: `/exports/${filename}.xlsx`,
    };
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error(`Failed to export to Excel: ${error.message}`);
  }
}

/**
 * Export data to PDF
 */
async function exportToPDF(data, filename, options = {}) {
  try {
    const {
      title = 'Report',
      subtitle = null,
      columns = null,
      orientation = 'portrait',
      pageSize = 'A4',
    } = options;

    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: pageSize,
          layout: orientation,
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const filePath = path.join(exportsDir, `${filename}.pdf`);
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Add title
        doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
        doc.moveDown();

        // Add subtitle if specified
        if (subtitle) {
          doc.fontSize(12).font('Helvetica').text(subtitle, { align: 'center' });
          doc.moveDown();
        }

        // Add metadata
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown(2);

        // Prepare columns
        const cols = columns || (data.length > 0 ? Object.keys(data[0]) : []);
        const colCount = cols.length;
        const pageWidth = doc.page.width - 100; // Account for margins
        const colWidth = pageWidth / colCount;

        // Table header
        doc.fontSize(10).font('Helvetica-Bold');
        let yPosition = doc.y;

        cols.forEach((col, index) => {
          const x = 50 + index * colWidth;
          doc.text(col, x, yPosition, { width: colWidth, align: 'left' });
        });

        doc.moveDown();
        yPosition = doc.y;

        // Draw header line
        doc
          .moveTo(50, yPosition)
          .lineTo(doc.page.width - 50, yPosition)
          .stroke();
        doc.moveDown(0.5);

        // Table rows
        doc.font('Helvetica').fontSize(9);

        data.forEach((row, rowIndex) => {
          yPosition = doc.y;

          // Check if we need a new page
          if (yPosition > doc.page.height - 100) {
            doc.addPage();
            yPosition = 50;
          }

          cols.forEach((col, colIndex) => {
            const x = 50 + colIndex * colWidth;
            const value = String(row[col] || '');
            doc.text(value, x, yPosition, {
              width: colWidth - 5,
              align: 'left',
              ellipsis: true,
            });
          });

          doc.moveDown(0.5);

          // Draw row separator for every 5 rows
          if ((rowIndex + 1) % 5 === 0) {
            yPosition = doc.y;
            doc
              .strokeColor('#EEEEEE')
              .moveTo(50, yPosition)
              .lineTo(doc.page.width - 50, yPosition)
              .stroke();
            doc.strokeColor('#000000');
            doc.moveDown(0.3);
          }
        });

        // Add footer
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc
            .fontSize(8)
            .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 50, { align: 'center' });
        }

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          resolve({
            success: true,
            filename: `${filename}.pdf`,
            path: filePath,
            url: `/exports/${filename}.pdf`,
          });
        });

        stream.on('error', error => {
          reject(new Error(`Failed to write PDF: ${error.message}`));
        });
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error(`Failed to export to PDF: ${error.message}`);
  }
}

/**
 * Export data to CSV
 */
async function exportToCSV(data, filename) {
  try {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    // Get headers
    const headers = Object.keys(data[0]);

    // Create CSV content
    let csv = headers.join(',') + '\n';

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csv += values.join(',') + '\n';
    });

    // Write file
    const filePath = path.join(exportsDir, `${filename}.csv`);
    fs.writeFileSync(filePath, csv, 'utf8');

    return {
      success: true,
      filename: `${filename}.csv`,
      path: filePath,
      url: `/exports/${filename}.csv`,
    };
  } catch (error) {
    console.error('CSV export error:', error);
    throw new Error(`Failed to export to CSV: ${error.message}`);
  }
}

/**
 * Delete export file
 */
async function deleteExport(filename) {
  try {
    const filePath = path.join(exportsDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true, message: 'File deleted' };
    }

    return { success: false, message: 'File not found' };
  } catch (error) {
    console.error('Delete export error:', error);
    throw new Error(`Failed to delete export: ${error.message}`);
  }
}

/**
 * List export files
 */
async function listExports() {
  try {
    if (!fs.existsSync(exportsDir)) {
      return [];
    }

    const files = fs.readdirSync(exportsDir);

    return files.map(filename => {
      const filePath = path.join(exportsDir, filename);
      const stats = fs.statSync(filePath);

      return {
        filename,
        size: stats.size,
        createdAt: stats.birthtime,
        url: `/exports/${filename}`,
      };
    });
  } catch (error) {
    console.error('List exports error:', error);
    throw new Error(`Failed to list exports: ${error.message}`);
  }
}

module.exports = {
  exportToExcel,
  exportToPDF,
  exportToCSV,
  deleteExport,
  listExports,
};

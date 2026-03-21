// Heavy libs loaded on-demand (code-split)
// import ExcelJS from 'exceljs';       → dynamic
// import { jsPDF } from 'jspdf';       → dynamic
// import html2canvas from 'html2canvas' → dynamic
import logger from 'utils/logger';
import { brandColors, surfaceColors } from 'theme/palette';
import { getOrgBranding } from 'utils/storageService';
import { triggerBlobDownload } from 'utils/downloadHelper';

// إعدادات التخصيص المؤسسي (شعار/ألوان)
const getBranding = () => {
  return getOrgBranding();
};

/**
 * خدمة تصدير البيانات
 * Data Export Service
 *
 * يوفر واجهة برمجية لتصدير البيانات بصيغ مختلفة
 * Provides API interface for exporting data in multiple formats
 */

const exportService = {
  /**
   * تصدير البيانات إلى Excel
   * Export data to Excel format
   *
   * @param {Array} data - البيانات المراد تصديرها
   * @param {string} fileName - اسم الملف
   * @param {Object} options - خيارات إضافية
   * @returns {void}
   */
  toExcel: async (data, fileName = 'export', options = {}) => {
    try {
      const branding = getBranding();
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(options.sheetName || 'Sheet1');

      // Set columns from data keys
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        worksheet.columns = keys.map((key, i) => ({
          header: key,
          key,
          width: options.columnWidths ? options.columnWidths[i] : 20,
        }));
      }

      // Add data rows
      worksheet.addRows(data);

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      if (options.headerStyle && options.headerStyle.fill) {
        headerRow.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: options.headerStyle.fill.fgColor.rgb },
          };
        });
      } else if (branding.color) {
        const argb = 'FF' + branding.color.replace('#', '');
        headerRow.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb },
          };
        });
      }

      // Write to buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      triggerBlobDownload(blob, `${fileName}.xlsx`);
    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      throw error;
    }
  },

  /**
   * تصدير البيانات إلى CSV
   * Export data to CSV format
   *
   * @param {Array} data - البيانات المراد تصديرها
   * @param {string} fileName - اسم الملف
   * @returns {void}
   */
  toCSV: (data, fileName = 'export') => {
    try {
      if (!data || data.length === 0) throw new Error('No data to export');
      const keys = Object.keys(data[0]);
      const csvRows = [
        keys.map(k => `"${k}"`).join(','),
        ...data.map(row =>
          keys
            .map(k => {
              const v = row[k];
              const escaped = v !== null && v !== undefined ? String(v).replace(/"/g, '""') : '';
              return `"${escaped}"`;
            })
            .join(',')
        ),
      ];
      const csv = csvRows.join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      triggerBlobDownload(blob, `${fileName}.csv`);
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      throw error;
    }
  },

  /**
   * تصدير الجدول إلى PDF
   * Export table to PDF format
   *
   * @param {string} elementId - معرّف العنصر المراد تصديره
   * @param {string} fileName - اسم الملف
   * @param {Object} options - خيارات PDF
   * @returns {Promise}
   */
  toPDF: async (elementId, fileName = 'export', options = {}) => {
    try {
      const branding = getBranding();
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
      }

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        ...options.canvasOptions,
      });

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: options.orientation || 'portrait',
        unit: 'mm',
        format: options.format || 'a4',
      });

      // إضافة الشعار المؤسسي أعلى الصفحة
      if (branding.logo) {
        const logoImg = new Image();
        logoImg.src = branding.logo;
        await new Promise(resolve => {
          logoImg.onload = resolve;
          logoImg.onerror = () => resolve(); // Skip logo on error
          setTimeout(resolve, 5000); // Timeout after 5s
        });
        pdf.addImage(logoImg, 'PNG', 10, 5, 30, 18);
      }
      // اسم المؤسسة
      if (branding.name) {
        pdf.setFontSize(13);
        pdf.setTextColor(branding.color);
        pdf.text(branding.name, 45, 15, { align: 'left' });
      }

      const imgWidth = pdf.internal.pageSize.getWidth() - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 30;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 30;
        pdf.addPage();
        if (branding.logo) {
          const logoImg = new Image();
          logoImg.src = branding.logo;
          await new Promise(resolve => {
            logoImg.onload = resolve;
            logoImg.onerror = () => resolve();
            setTimeout(resolve, 5000);
          });
          pdf.addImage(logoImg, 'PNG', 10, 5, 30, 18);
        }
        if (branding.name) {
          pdf.setFontSize(13);
          pdf.setTextColor(branding.color);
          pdf.text(branding.name, 45, 15, { align: 'left' });
        }
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      // إضافة معلومات الملف
      if (options.title) {
        pdf.setProperties({
          title: options.title,
          author: options.author || branding.name || 'System',
          subject: options.subject || 'Export',
        });
      }

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      logger.error('Error exporting to PDF:', error);
      throw error;
    }
  },

  /**
   * تصدير بيانات الجدول إلى PDF متقدم
   * Export table data to advanced PDF with formatting
   *
   * @param {Array} data - البيانات
   * @param {Array} columns - تعريف الأعمدة
   * @param {string} fileName - اسم الملف
   * @param {Object} options - خيارات PDF
   * @returns {Promise}
   */
  tableToAdvancedPDF: async (data, columns, fileName = 'export', options = {}) => {
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: options.orientation || 'landscape',
        unit: 'mm',
        format: options.format || 'a4',
      });

      // إضافة العنوان
      if (options.title) {
        pdf.setFontSize(16);
        pdf.text(options.title, 15, 15);
      }

      // إضافة التاريخ
      if (options.showDate) {
        pdf.setFontSize(10);
        pdf.text(`التاريخ: ${new Date().toLocaleDateString('ar-SA')}`, 15, 25);
      }

      // إنشاء الجدول
      let yPosition = options.title ? 35 : 15;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const colWidth = (pageWidth - 30) / columns.length;

      // رأس الجدول
      pdf.setFillColor(102, 126, 234);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);

      columns.forEach((col, index) => {
        const xPos = 15 + index * colWidth;
        pdf.rect(xPos, yPosition, colWidth, 8, 'F');
        pdf.text(col.label, xPos + 2, yPosition + 5);
      });

      yPosition += 8;
      pdf.setTextColor(0, 0, 0);

      // صفوف البيانات
      data.forEach(row => {
        if (yPosition > pageHeight - 15) {
          pdf.addPage();
          yPosition = 15;
        }

        columns.forEach((col, index) => {
          const xPos = 15 + index * colWidth;
          const cellValue = row[col.key] || '';
          pdf.setFontSize(9);
          pdf.text(String(cellValue).substring(0, 20), xPos + 2, yPosition + 5);
        });

        yPosition += 8;
      });

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      logger.error('Error exporting to advanced PDF:', error);
      throw error;
    }
  },

  /**
   * تصدير البيانات بصيغة JSON
   * Export data to JSON format
   *
   * @param {any} data - البيانات
   * @param {string} fileName - اسم الملف
   * @returns {void}
   */
  toJSON: (data, fileName = 'export') => {
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      triggerBlobDownload(blob, `${fileName}.json`);
    } catch (error) {
      logger.error('Error exporting to JSON:', error);
      throw error;
    }
  },

  /**
   * نسخ البيانات إلى الحافظة
   * Copy data to clipboard
   *
   * @param {string} text - النص المراد نسخه
   * @returns {Promise}
   */
  copyToClipboard: async text => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      logger.error('Error copying to clipboard:', error);
      throw error;
    }
  },

  /**
   * طباعة البيانات
   * Print data
   *
   * @param {string} elementId - معرّف العنصر
   * @param {Object} options - خيارات الطباعة
   * @returns {Promise}
   */
  print: async (elementId, options = {}) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
      }

      const printWindow = window.open('', '', 'height=600,width=800');
      if (!printWindow) {
        throw new Error('تعذر فتح نافذة الطباعة - يرجى السماح بالنوافذ المنبثقة');
      }
      const content = element.innerHTML;

      printWindow.document.write(`
        <html>
          <head>
            <title>${options.title || 'Print'}</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid ${surfaceColors.borderLight}; padding: 12px; text-align: right; }
              th { background-color: ${brandColors.primaryStart}; color: white; }
              h1 { text-align: center; color: ${brandColors.primaryStart}; }
            </style>
          </head>
          <body>
            ${options.title ? `<h1>${options.title}</h1>` : ''}
            ${content}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      logger.error('Error printing:', error);
      throw error;
    }
  },

  /**
   * تصدير بيانات عام بحسب الصيغة
   * Generic export by format (excel, csv, pdf)
   *
   * @param {Array} data - البيانات المراد تصديرها
   * @param {string} format - صيغة التصدير ('excel' | 'csv' | 'pdf')
   * @param {Object} options - خيارات التصدير
   * @returns {{ success: boolean, message: string }}
   */
  exportData: async (data, format = 'excel', options = {}) => {
    try {
      const filename = options.filename || 'export';
      switch (format.toLowerCase()) {
        case 'excel':
        case 'xlsx':
          await exportService.toExcel(data, filename, options);
          return { success: true, message: `✅ تم تصدير ${data.length} صف إلى Excel` };
        case 'csv':
          exportService.toCSV(data, filename);
          return { success: true, message: `✅ تم تصدير ${data.length} صف إلى CSV` };
        case 'pdf':
          exportService.tableToAdvancedPDF(data, options.columns || [], filename, options);
          return { success: true, message: `✅ تم تصدير ${data.length} صف إلى PDF` };
        default:
          return { success: false, message: `❌ صيغة تصدير غير مدعومة: ${format}` };
      }
    } catch (error) {
      logger.error('Export error:', error);
      return { success: false, message: '❌ خطأ في التصدير: ' + error.message };
    }
  },
};

export default exportService;

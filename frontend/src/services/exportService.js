import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// إعدادات التخصيص المؤسسي (شعار/ألوان)
const getBranding = () => {
  return {
    logo: localStorage.getItem('orgLogo') || '',
    color: localStorage.getItem('orgColor') || '#667eea',
    name: localStorage.getItem('orgName') || '',
  };
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
  toExcel: (data, fileName = 'export', options = {}) => {
    try {
      const branding = getBranding();
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Sheet1');

      // تنسيق الأعمدة
      if (options.columnWidths) {
        ws['!cols'] = options.columnWidths.map(w => ({ wch: w }));
      }

      // تعيين الألوان للرأس
      if (options.headerStyle || branding.color) {
        const headerRange = XLSX.utils.decode_range(ws['!ref']);
        for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: 0, c: C });
          if (!ws[address]) continue;
          ws[address].s = options.headerStyle || {
            fill: { fgColor: { rgb: branding.color.replace('#', '') } },
          };
        }
      }

      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
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
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
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

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        ...options.canvasOptions,
      });

      const imgData = canvas.toDataURL('image/png');
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
      console.error('Error exporting to PDF:', error);
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
      console.error('Error exporting to advanced PDF:', error);
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
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.json`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
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
      console.error('Error copying to clipboard:', error);
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
      const content = element.innerHTML;

      printWindow.document.write(`
        <html>
          <head>
            <title>${options.title || 'Print'}</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
              th { background-color: #667eea; color: white; }
              h1 { text-align: center; color: #667eea; }
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
      console.error('Error printing:', error);
      throw error;
    }
  },
};

export default exportService;

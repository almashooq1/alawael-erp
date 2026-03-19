/**
 * Advanced Export Service
 * خدمة التصدير المتقدم
 *
 * Supports:
 * - Excel export (XLSX)
 * - PDF export
 * - CSV export
 * - Custom formatting
 * - Arabic RTL support
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// دعم جلب الهوية المؤسسية من OrgBrandingContext
let brandingCache = null;
export function setBrandingForExport(branding) {
  brandingCache = branding;
}

// Add Arabic font support for PDF (you'll need to include the font file)
// For now, we'll use a workaround with Unicode

class ExportService {
  /**
   * Export data to Excel (XLSX format)
   * @param {Array} data - Array of objects to export
   * @param {string} filename - Output filename
   * @param {Object} options - Export options (columns, formatting, etc.)
   */
  exportToExcel(data, filename = 'export', options = {}) {
    try {
      const {
        columns = null, // Array of column definitions: [{ key: 'name', label: 'الاسم', width: 20 }]
        sheetName = 'Sheet1',
        formatting = true,
        branding = brandingCache,
      } = options;

      // Prepare data
      let exportData = data;

      // If columns specified, filter and rename
      if (columns) {
        exportData = data.map(row => {
          const newRow = {};
          columns.forEach(col => {
            newRow[col.label || col.key] = row[col.key];
          });
          return newRow;
        });
      }

      // إضافة صف رأس الهوية المؤسسية إذا توفرت
      let headerRows = [];
      if (branding && (branding.name || branding.logo)) {
        const logoCell = branding.logo ? '[شعار]' : '';
        headerRows.push({
          ...(columns
            ? Object.fromEntries(
                columns.map((col, i) => [
                  col.label || col.key,
                  i === 0 ? branding.name || '' : i === 1 && branding.logo ? logoCell : '',
                ])
              )
            : { اسم: branding.name || '', شعار: branding.logo ? '[شعار]' : '' }),
        });
      }
      if (headerRows.length > 0) {
        exportData = [...headerRows, ...exportData];
      }

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData, {
        header: columns ? columns.map(col => col.label || col.key) : undefined,
      });

      // Apply column widths if specified
      if (columns && formatting) {
        ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));
      }

      // إضافة صورة الشعار إذا توفرت (ملاحظة: XLSX لا يدعم الصور مباشرة، يمكن دعمها لاحقاً عبر مكتبات متقدمة)

      // Add styling for headers (if using xlsx-js-style library)
      if (formatting) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
          if (!ws[cellAddress]) continue;
          // Style header cells (أول صف = الهوية، ثاني صف = رؤوس الأعمدة)
          ws[cellAddress].s = {
            font: {
              bold: true,
              color: { rgb: C === 0 && headerRows.length > 0 ? '667EEA' : 'FFFFFF' },
            },
            fill: { fgColor: { rgb: C === 0 && headerRows.length > 0 ? 'F8F9FF' : '667EEA' } },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
        }
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Save file
      XLSX.writeFile(wb, `${filename}.xlsx`);

      return { success: true, message: `✅ تم تصدير ${data.length} صف إلى Excel` };
    } catch (error) {
      console.error('Export to Excel error:', error);
      return { success: false, message: '❌ خطأ في التصدير إلى Excel: ' + error.message };
    }
  }

  /**
   * Export data to CSV format
   * @param {Array} data - Array of objects to export
   * @param {string} filename - Output filename
   * @param {Object} options - Export options
   */
  exportToCSV(data, filename = 'export', options = {}) {
    try {
      const {
        columns = null,
        delimiter = ',',
        includeHeaders = true,
        // encoding = 'utf-8-bom', // BOM for Excel Arabic support - unused
      } = options;

      let csvContent = '';

      // Prepare columns
      const cols =
        columns || (data.length > 0 ? Object.keys(data[0]).map(key => ({ key, label: key })) : []);

      // Add headers
      if (includeHeaders) {
        csvContent += cols.map(col => `"${col.label}"`).join(delimiter) + '\n';
      }

      // Add rows
      data.forEach(row => {
        const values = cols.map(col => {
          const value = row[col.key];
          // Escape quotes and wrap in quotes
          const escaped =
            value !== null && value !== undefined ? String(value).replace(/"/g, '""') : '';
          return `"${escaped}"`;
        });
        csvContent += values.join(delimiter) + '\n';
      });

      // Create blob and download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();

      return { success: true, message: `✅ تم تصدير ${data.length} صف إلى CSV` };
    } catch (error) {
      console.error('Export to CSV error:', error);
      return { success: false, message: '❌ خطأ في التصدير إلى CSV: ' + error.message };
    }
  }

  /**
   * Export data to PDF format
   * @param {Array} data - Array of objects to export
   * @param {string} filename - Output filename
   * @param {Object} options - Export options
   */
  exportToPDF(data, filename = 'export', options = {}) {
    try {
      const {
        columns = null,
        title = 'تقرير البيانات',
        orientation = 'landscape', // 'portrait' or 'landscape'
        pageSize = 'a4',
        fontSize = 10,
        includeDate = true,
        branding = brandingCache,
      } = options;

      // Create PDF document
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: pageSize,
      });

      // Set document properties
      doc.setProperties({
        title: title,
        subject: 'Exported Data',
        author: branding?.name || 'System',
        creator: 'Export Service',
      });

      // Add org branding (logo + name) at the top
      let y = 12;
      if (branding && (branding.logo || branding.name)) {
        if (branding.logo) {
          try {
            // إضافة الشعار (base64 فقط)
            doc.addImage(branding.logo, 'PNG', 14, y, 18, 18);
          } catch {}
        }
        if (branding.name) {
          doc.setFontSize(14);
          doc.setTextColor(102, 126, 234);
          doc.text(branding.name, branding.logo ? 36 : 14, y + 10);
        }
        y += 18;
      }

      // Add title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(title, 14, y + 6);
      y += 12;

      // Add date if requested
      if (includeDate) {
        doc.setFontSize(10);
        const dateStr = new Date().toLocaleDateString('ar-SA');
        doc.text(`التاريخ: ${dateStr}`, 14, y + 6);
        y += 8;
      }

      // Prepare columns
      const cols =
        columns || (data.length > 0 ? Object.keys(data[0]).map(key => ({ key, label: key })) : []);

      // Prepare table data
      const tableColumns = cols.map(col => col.label || col.key);
      const tableRows = data.map(row => cols.map(col => row[col.key] || ''));

      // Add table
      doc.autoTable({
        head: [tableColumns],
        body: tableRows,
        startY: y + 4,
        styles: {
          fontSize: fontSize,
          cellPadding: 3,
          halign: 'center',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [248, 249, 255],
        },
        margin: { top: 14, right: 14, bottom: 14, left: 14 },
        theme: 'grid',
      });

      // Add footer with page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `صفحة ${i} من ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          {
            align: 'center',
          }
        );
      }

      // Save PDF
      doc.save(`${filename}.pdf`);

      return { success: true, message: `✅ تم تصدير ${data.length} صف إلى PDF` };
    } catch (error) {
      console.error('Export to PDF error:', error);
      return { success: false, message: '❌ خطأ في التصدير إلى PDF: ' + error.message };
    }
  }

  /**
   * Export documents list
   * @param {Array} documents - Documents to export
   * @param {string} format - Export format ('excel', 'csv', 'pdf')
   * @param {string} filename - Output filename
   */
  exportDocuments(documents, format = 'excel', filename = 'documents_export') {
    const columns = [
      { key: 'title', label: 'العنوان', width: 30 },
      { key: 'originalFileName', label: 'اسم الملف', width: 25 },
      { key: 'category', label: 'الفئة', width: 15 },
      { key: 'fileSize', label: 'الحجم (بايت)', width: 15 },
      { key: 'uploadedByName', label: 'المستخدم', width: 20 },
      { key: 'createdAt', label: 'تاريخ الرفع', width: 20 },
    ];

    // Format data
    const formattedData = documents.map(doc => ({
      ...doc,
      fileSize: doc.fileSize || 0,
      createdAt: new Date(doc.createdAt).toLocaleDateString('ar-SA'),
      uploadedByName: doc.uploadedByName || 'غير معروف',
    }));

    switch (format.toLowerCase()) {
      case 'excel':
        return this.exportToExcel(formattedData, filename, { columns, sheetName: 'المستندات' });
      case 'csv':
        return this.exportToCSV(formattedData, filename, { columns });
      case 'pdf':
        return this.exportToPDF(formattedData, filename, { columns, title: 'قائمة المستندات' });
      default:
        return { success: false, message: '❌ صيغة تصدير غير مدعومة' };
    }
  }

  /**
   * Export employees list
   * @param {Array} employees - Employees to export
   * @param {string} format - Export format
   * @param {string} filename - Output filename
   */
  exportEmployees(employees, format = 'excel', filename = 'employees_export') {
    const columns = [
      { key: 'firstName', label: 'الاسم الأول', width: 20 },
      { key: 'lastName', label: 'اسم العائلة', width: 20 },
      { key: 'email', label: 'البريد الإلكتروني', width: 30 },
      { key: 'phone', label: 'الهاتف', width: 15 },
      { key: 'position', label: 'المنصب', width: 20 },
      { key: 'department', label: 'القسم', width: 15 },
      { key: 'status', label: 'الحالة', width: 15 },
      { key: 'rating', label: 'التقييم', width: 10 },
    ];

    // Format data
    const formattedData = employees.map(emp => ({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      phone: emp.phone || '',
      position: emp.position || '',
      department: emp.department || '',
      status: emp.status || '',
      rating: emp.performance?.currentRating || 0,
    }));

    switch (format.toLowerCase()) {
      case 'excel':
        return this.exportToExcel(formattedData, filename, { columns, sheetName: 'الموظفون' });
      case 'csv':
        return this.exportToCSV(formattedData, filename, { columns });
      case 'pdf':
        return this.exportToPDF(formattedData, filename, { columns, title: 'قائمة الموظفين' });
      default:
        return { success: false, message: '❌ صيغة تصدير غير مدعومة' };
    }
  }

  /**
   * Generic export function for any data
   * @param {Array} data - Data to export
   * @param {string} format - Export format
   * @param {Object} options - Export options
   */
  export(data, format = 'excel', options = {}) {
    switch (format.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        return this.exportToExcel(data, options.filename || 'export', options);
      case 'csv':
        return this.exportToCSV(data, options.filename || 'export', options);
      case 'pdf':
        return this.exportToPDF(data, options.filename || 'export', options);
      default:
        return { success: false, message: `❌ صيغة تصدير غير مدعومة: ${format}` };
    }
  }
}

// Create singleton instance
const exportService = new ExportService();

export default exportService;

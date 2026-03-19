import { useCallback, useRef } from 'react';
import { useSnackbar } from '../contexts/SnackbarContext';
import logger from 'utils/logger';

/**
 * useExport — Hook for exporting data to PDF, Excel, CSV, and printing.
 *
 * @param {string} [defaultFileName] — Default filename without extension
 * @returns {object} { exportPDF, exportExcel, exportCSV, handlePrint, isExporting }
 */
const useExport = (defaultFileName = 'export') => {
  const showSnackbar = useSnackbar();
  const exportingRef = useRef(false);

  /**
   * Export to PDF using jspdf + html2canvas.
   * @param {HTMLElement|ref} element — DOM element or React ref to capture
   * @param {object} [options] — { fileName, orientation, title }
   */
  const exportPDF = useCallback(
    async (element, options = {}) => {
      if (exportingRef.current) return;
      exportingRef.current = true;
      try {
        const el = element?.current || element;
        if (!el) throw new Error('No element provided');

        const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
          import('jspdf'),
          import('html2canvas'),
        ]);

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: options.orientation || 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        if (options.title) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(16);
          pdf.text(options.title, pdfWidth / 2, 15, { align: 'center' });
          pdf.addImage(imgData, 'PNG', 0, 25, pdfWidth, pdfHeight);
        } else {
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save(`${options.fileName || defaultFileName}.pdf`);
        showSnackbar('تم تصدير PDF بنجاح', 'success');
      } catch (err) {
        logger.error('PDF export error:', err);
        showSnackbar('خطأ في تصدير PDF', 'error');
      } finally {
        exportingRef.current = false;
      }
    },
    [defaultFileName, showSnackbar]
  );

  /**
   * Export data to Excel.
   * @param {Array}  data    — Array of objects
   * @param {Array}  columns — [{key, header, width?}]
   * @param {object} [options] — { fileName, sheetName }
   */
  const exportExcel = useCallback(
    async (data, columns, options = {}) => {
      if (exportingRef.current) return;
      exportingRef.current = true;
      try {
        const XLSX = await import('xlsx');
        const headers = columns.map(c => c.header);
        const rows = data.map(row =>
          columns.map(c => {
            const val = c.key.split('.').reduce((obj, k) => obj?.[k], row);
            return c.format ? c.format(val, row) : val;
          })
        );

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        columns.forEach((c, i) => {
          if (c.width) {
            if (!ws['!cols']) ws['!cols'] = [];
            ws['!cols'][i] = { wch: c.width };
          }
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Sheet1');
        XLSX.writeFile(wb, `${options.fileName || defaultFileName}.xlsx`);
        showSnackbar('تم تصدير Excel بنجاح', 'success');
      } catch (err) {
        logger.error('Excel export error:', err);
        showSnackbar('خطأ في تصدير Excel', 'error');
      } finally {
        exportingRef.current = false;
      }
    },
    [defaultFileName, showSnackbar]
  );

  /**
   * Export data to CSV.
   * @param {Array}  data    — Array of objects
   * @param {Array}  columns — [{key, header}]
   * @param {object} [options] — { fileName, separator }
   */
  const exportCSV = useCallback(
    (data, columns, options = {}) => {
      try {
        const sep = options.separator || ',';
        const headers = columns.map(c => `"${c.header}"`).join(sep);
        const rows = data.map(row =>
          columns
            .map(c => {
              const val = c.key.split('.').reduce((obj, k) => obj?.[k], row);
              return `"${String(val ?? '').replace(/"/g, '""')}"`;
            })
            .join(sep)
        );

        const bom = '\uFEFF'; // UTF-8 BOM for Arabic
        const csv = bom + [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${options.fileName || defaultFileName}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showSnackbar('تم تصدير CSV بنجاح', 'success');
      } catch (err) {
        logger.error('CSV export error:', err);
        showSnackbar('خطأ في تصدير CSV', 'error');
      }
    },
    [defaultFileName, showSnackbar]
  );

  /**
   * Print the current page or a specific element.
   * @param {HTMLElement|ref} [element] — Optional element to print
   */
  const handlePrint = useCallback(
    element => {
      if (element?.current || element instanceof HTMLElement) {
        const el = element.current || element;
        const win = window.open('', '_blank');
        if (!win) {
          showSnackbar('يرجى السماح بالنوافذ المنبثقة', 'warning');
          return;
        }
        win.document.write(`
        <html dir="rtl"><head>
          <style>body{font-family:Cairo,sans-serif;direction:rtl;padding:20px}
          table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px 10px;text-align:right}th{font-weight:bold;background:#f0f0f0}</style>
        </head><body>${el.innerHTML}</body></html>
      `);
        win.document.close();
        win.print();
        win.close();
      } else {
        window.print();
      }
    },
    [showSnackbar]
  );

  return { exportPDF, exportExcel, exportCSV, handlePrint };
};

export default useExport;

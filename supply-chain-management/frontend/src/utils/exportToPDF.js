/* eslint-disable no-unused-vars */
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Export data to PDF with Arabic-friendly table formatting
 * @param {Array} data - Array of row objects
 * @param {Array} columns - Array of { label, value } column definitions
 * @param {string} fileName - Output file name
 */
export function exportToPDF(data, columns, fileName = 'data.pdf') {
  const doc = new jsPDF({ orientation: data.length > 0 && columns.length > 5 ? 'landscape' : 'portrait' });

  // Title
  doc.setFontSize(16);
  doc.text(fileName.replace('.pdf', ''), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString('en-US')}  |  Records: ${data.length}`, doc.internal.pageSize.getWidth() / 2, 23, { align: 'center' });

  // Table headers
  const headers = columns.map(col => col.label);

  // Table body
  const body = data.map(row =>
    columns.map(col => {
      const val = typeof col.value === 'function' ? col.value(row) : row[col.value];
      return val != null ? String(val) : '';
    })
  );

  doc.autoTable({
    head: [headers],
    body,
    startY: 28,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      halign: 'center',
    },
    headStyles: {
      fillColor: [27, 94, 32],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 28, left: 10, right: 10 },
    didDrawPage: (hookData) => {
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${hookData.pageNumber} / ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  doc.save(fileName);
}

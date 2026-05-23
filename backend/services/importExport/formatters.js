'use strict';

/**
 * formatters.js — extracted from services/importExportPro.service.js (W278e).
 *
 * 6 format-specific exporters (xlsx, csv, json, pdf, xml, docx). Each
 * is a pure async function taking (data, fields, module, options) and
 * returning { buffer, fileName, mimeType, size }. No class state, no
 * `this` — moved out of ImportExportProService so the parent service
 * focuses on lifecycle (createExport / parseImport / job mgmt /
 * scheduled) instead of per-format serialization details.
 *
 * Pre-extract these lived as `_exportTo<Format>` methods using
 * `this._resolveColumns` + `this._getNestedValue`. Post-extract they
 * call the imported helpers directly. Zero behaviour change.
 */

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { stringify: csvStringify } = require('csv-stringify/sync');
const {
  Document: DocxDocument,
  Packer,
  Paragraph,
  Table: DocxTable,
  TableRow: DocxTableRow,
  TableCell: DocxTableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TextRun,
} = require('docx');

const { resolveColumns, getNestedValue } = require('./format-helpers');
const { MODULE_REGISTRY } = require('./module-registry');

/**
 * Export to Excel with professional formatting
 */
async function exportToExcel(data, fields, module, options = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'الأوائل - نظام الاستيراد والتصدير';
  workbook.created = new Date();

  const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };
  const sheetName = options.sheetName || moduleInfo.labelEn || 'Data';
  const worksheet = workbook.addWorksheet(sheetName, {
    properties: { defaultColWidth: 18 },
    views: [{ state: 'frozen', ySplit: 2 }], // Freeze header rows
  });

  // Determine columns from fields or data
  const columns = resolveColumns(data, fields, module);

  // --- Title Row ---
  const titleText =
    options.language === 'en'
      ? `${moduleInfo.labelEn} Export Report`
      : `تقرير تصدير ${moduleInfo.label}`;

  worksheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = titleText;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 40;

  // --- Header Row ---
  const headerRow = worksheet.getRow(2);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = options.language === 'en' ? col.name : col.nameAr || col.name;
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      right: { style: 'thin', color: { argb: 'FFB0BEC5' } },
    };
  });
  headerRow.height = 30;

  // --- Data Rows ---
  data.forEach((item, rowIdx) => {
    const row = worksheet.getRow(rowIdx + 3);
    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      let value = getNestedValue(item, col.key);

      // Format value based on type
      if (col.dataType === 'date' && value) {
        value = new Date(value).toLocaleDateString('en-CA');
      } else if (col.dataType === 'currency' && typeof value === 'number') {
        cell.numFmt = '#,##0.00';
      } else if (col.dataType === 'boolean') {
        value = value ? 'نعم / Yes' : 'لا / No';
      } else if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }

      cell.value = value ?? '';
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };

      // Alternate row colors
      if (rowIdx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    });
    row.height = 22;
  });

  // --- Auto-fit columns ---
  columns.forEach((col, i) => {
    const maxLen = Math.max(
      (col.nameAr || col.name || '').length,
      ...data.slice(0, 50).map(d => String(getNestedValue(d, col.key) ?? '').length)
    );
    worksheet.getColumn(i + 1).width = Math.min(Math.max(maxLen + 4, 12), 50);
  });

  // --- Summary Row ---
  const summaryRowIdx = data.length + 3;
  worksheet.mergeCells(summaryRowIdx, 1, summaryRowIdx, columns.length);
  const summaryCell = worksheet.getCell(`A${summaryRowIdx}`);
  const dateStr = new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' });
  summaryCell.value = `إجمالي السجلات: ${data.length} | تاريخ التصدير: ${dateStr} | النظام: الأوائل`;
  summaryCell.font = { size: 9, italic: true, color: { argb: 'FF757575' } };
  summaryCell.alignment = { horizontal: 'center' };

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: data.length + 2, column: columns.length },
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `${module}_export_${Date.now()}.xlsx`;

  return {
    buffer: Buffer.from(buffer),
    fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.byteLength,
  };
}

/**
 * Export to CSV
 */
async function exportToCSV(data, fields, module, options = {}) {
  const columns = resolveColumns(data, fields, module);
  const headers = columns.map(c => (options.language === 'en' ? c.name : c.nameAr || c.name));

  const rows = data.map(item =>
    columns.map(col => {
      let value = getNestedValue(item, col.key);
      if (value instanceof Date) value = value.toISOString().split('T')[0];
      if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
      return value ?? '';
    })
  );

  const csvContent = csvStringify([headers, ...rows], {
    delimiter: options.delimiter || ',',
    bom: true, // UTF-8 BOM for Arabic support
  });

  const buffer = Buffer.from(csvContent, 'utf-8');
  const fileName = `${module}_export_${Date.now()}.csv`;

  return {
    buffer,
    fileName,
    mimeType: 'text/csv; charset=utf-8',
    size: buffer.length,
  };
}

/**
 * Export to JSON
 */
async function exportToJSON(data, fields, module, _options = {}) {
  const columns = resolveColumns(data, fields, module);
  const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };

  const exportData = {
    metadata: {
      module,
      moduleName: moduleInfo.label,
      moduleNameEn: moduleInfo.labelEn,
      exportDate: new Date().toISOString(),
      totalRecords: data.length,
      fields: columns.map(c => c.key),
      system: 'الأوائل - Al-Awael ERP',
      version: '2.0',
    },
    data:
      fields && fields.length > 0
        ? data.map(item => {
            const filtered = {};
            columns.forEach(col => {
              filtered[col.key] = getNestedValue(item, col.key);
            });
            return filtered;
          })
        : data,
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const buffer = Buffer.from(jsonStr, 'utf-8');
  const fileName = `${module}_export_${Date.now()}.json`;

  return {
    buffer,
    fileName,
    mimeType: 'application/json; charset=utf-8',
    size: buffer.length,
  };
}

/**
 * Export to PDF with professional design
 */
async function exportToPDF(data, fields, module, options = {}) {
  const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };
  const columns = resolveColumns(data, fields, module);

  const isLandscape = options.orientation === 'landscape' || columns.length > 6;
  const pageSize = options.pageSize || 'A4';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: pageSize,
      layout: isLandscape ? 'landscape' : 'portrait',
      margins: { top: 50, bottom: 50, left: 40, right: 40 },
      bufferPages: true,
      info: {
        Title: `${moduleInfo.labelEn} Export`,
        Author: 'Al-Awael ERP System',
        Subject: `${moduleInfo.label} - تقرير تصدير`,
        CreationDate: new Date(),
      },
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        buffer,
        fileName: `${module}_export_${Date.now()}.pdf`,
        mimeType: 'application/pdf',
        size: buffer.length,
      });
    });
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = Math.min(pageWidth / columns.length, 150);

    // --- Header ---
    doc
      .fillColor('#1565C0')
      .rect(30, 20, doc.page.width - 60, 50)
      .fill();
    doc
      .fillColor('#FFFFFF')
      .fontSize(18)
      .text(`${moduleInfo.label} — ${moduleInfo.labelEn}`, 40, 32, {
        width: doc.page.width - 80,
        align: 'center',
      });

    // --- Meta info ---
    doc
      .fillColor('#757575')
      .fontSize(9)
      .text(
        `تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')} | إجمالي: ${data.length} سجل | النظام: الأوائل`,
        40,
        80,
        { width: pageWidth, align: 'center' }
      );

    let y = 100;

    // --- Table Header ---
    doc.fillColor('#1976D2').rect(doc.page.margins.left, y, pageWidth, 25).fill();
    columns.forEach((col, i) => {
      doc
        .fillColor('#FFFFFF')
        .fontSize(8)
        .text(col.nameAr || col.name, doc.page.margins.left + i * colWidth + 3, y + 7, {
          width: colWidth - 6,
          align: 'center',
        });
    });
    y += 25;

    // --- Table Data ---
    const maxRows = Math.min(data.length, 500); // Limit for PDF
    for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
        // Re-draw header
        doc.fillColor('#1976D2').rect(doc.page.margins.left, y, pageWidth, 25).fill();
        columns.forEach((col, i) => {
          doc
            .fillColor('#FFFFFF')
            .fontSize(8)
            .text(col.nameAr || col.name, doc.page.margins.left + i * colWidth + 3, y + 7, {
              width: colWidth - 6,
              align: 'center',
            });
        });
        y += 25;
      }

      // Alternate row background
      if (rowIdx % 2 === 1) {
        doc.fillColor('#F5F5F5').rect(doc.page.margins.left, y, pageWidth, 20).fill();
      }

      const item = data[rowIdx];
      columns.forEach((col, i) => {
        let value = getNestedValue(item, col.key);
        if (value instanceof Date) value = value.toLocaleDateString('en-CA');
        if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
        value = String(value ?? '').substring(0, 40); // Truncate long text

        doc
          .fillColor('#333333')
          .fontSize(7)
          .text(value, doc.page.margins.left + i * colWidth + 3, y + 5, {
            width: colWidth - 6,
            align: 'center',
          });
      });
      y += 20;
    }

    // --- Footer ---
    if (data.length > 500) {
      doc
        .fillColor('#FF6600')
        .fontSize(9)
        .text(
          `⚠ عرض أول 500 سجل من ${data.length} — استخدم تصدير Excel للبيانات الكاملة`,
          doc.page.margins.left,
          y + 10,
          { width: pageWidth, align: 'center' }
        );
    }

    // Page numbers
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fillColor('#999999')
        .fontSize(8)
        .text(`صفحة ${i + 1} من ${pages.count}`, doc.page.margins.left, doc.page.height - 35, {
          width: pageWidth,
          align: 'center',
        });
    }

    doc.end();
  });
}

/**
 * Export to XML
 */
async function exportToXML(data, fields, module, _options = {}) {
  const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };
  const columns = resolveColumns(data, fields, module);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<export module="${module}" moduleName="${moduleInfo.label}" date="${new Date().toISOString()}" total="${data.length}">\n`;

  data.forEach((item, idx) => {
    xml += `  <record index="${idx + 1}">\n`;
    columns.forEach(col => {
      let value = getNestedValue(item, col.key);
      if (value instanceof Date) value = value.toISOString();
      if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
      const escaped = String(value ?? '').replace(
        /[&<>"']/g,
        c =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&apos;',
          })[c]
      );
      xml += `    <${col.key} label="${col.nameAr || col.name}">${escaped}</${col.key}>\n`;
    });
    xml += `  </record>\n`;
  });

  xml += '</export>\n';

  const buffer = Buffer.from(xml, 'utf-8');
  const fileName = `${module}_export_${Date.now()}.xml`;

  return {
    buffer,
    fileName,
    mimeType: 'application/xml; charset=utf-8',
    size: buffer.length,
  };
}

/**
 * Export to DOCX (Word Document)
 */
async function exportToDOCX(data, fields, module, options = {}) {
  if (!data || data.length === 0) {
    throw new Error('لا توجد بيانات للتصدير في هذه الوحدة');
  }

  const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };
  const columns = resolveColumns(data, fields, module);

  const titleText =
    options.language === 'en'
      ? `${moduleInfo.labelEn} Export Report`
      : `تقرير تصدير ${moduleInfo.label}`;

  // Build table header row
  const headerCells = columns.map(
    col =>
      new DocxTableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: col.nameAr || col.name,
                bold: true,
                size: 20,
                color: 'FFFFFF',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        shading: { fill: '1B5E20' },
        width: { size: Math.floor(9000 / columns.length), type: WidthType.DXA },
      })
  );
  const headerRow = new DocxTableRow({ children: headerCells });

  // Build data rows
  const dataRows = data.slice(0, 5000).map(item => {
    const cells = columns.map(col => {
      let value = getNestedValue(item, col.key);
      if (value instanceof Date) value = value.toISOString().split('T')[0];
      if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
      return new DocxTableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: String(value ?? ''), size: 18 })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: Math.floor(9000 / columns.length), type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        },
      });
    });
    return new DocxTableRow({ children: cells });
  });

  const doc = new DocxDocument({
    sections: [
      {
        children: [
          new Paragraph({
            text: titleText,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `التاريخ: ${new Date().toLocaleDateString('ar-SA')}  |  إجمالي السجلات: ${data.length}`,
                size: 20,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new DocxTable({
            rows: [headerRow, ...dataRows],
            width: { size: 9000, type: WidthType.DXA },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `\nتم التصدير بواسطة نظام الأوائل - ${new Date().toISOString()}`,
                size: 16,
                color: '999999',
                italics: true,
              }),
            ],
            spacing: { before: 400 },
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `${module}_export_${Date.now()}.docx`;

  return {
    buffer,
    fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: buffer.length,
  };
}

module.exports = {
  exportToExcel,
  exportToCSV,
  exportToJSON,
  exportToPDF,
  exportToXML,
  exportToDOCX,
};

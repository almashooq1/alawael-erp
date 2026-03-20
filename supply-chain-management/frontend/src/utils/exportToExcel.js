/* eslint-disable no-unused-vars */
import ExcelJS from 'exceljs';

export async function exportToExcel(data, columns, fileName = 'data.xlsx') {
  const rows = data.map(row => {
    const obj = {};
    columns.forEach(col => {
      obj[col.label] = typeof col.value === 'function' ? col.value(row) : row[col.value];
    });
    return obj;
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    worksheet.columns = keys.map(key => ({ header: key, key, width: 20 }));
    worksheet.addRows(rows);
    worksheet.getRow(1).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

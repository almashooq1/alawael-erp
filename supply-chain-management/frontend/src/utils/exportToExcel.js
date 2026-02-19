import { utils, writeFile } from 'xlsx';

export function exportToExcel(data, columns, fileName = 'data.xlsx') {
  const rows = data.map(row => {
    const obj = {};
    columns.forEach(col => {
      obj[col.label] = typeof col.value === 'function' ? col.value(row) : row[col.value];
    });
    return obj;
  });
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Sheet1');
  writeFile(wb, fileName);
}

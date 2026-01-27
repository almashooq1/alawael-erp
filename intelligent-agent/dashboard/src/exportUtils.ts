import React from 'react';

export function exportPoliciesToCSV(policies: any[]) {
  const header = ['الاسم', 'الوصف', 'الحالة'];
  const rows = policies.map(p => [p.name, p.description, p.enabled ? 'مفعلة' : 'معطلة']);
  const csv = [header, ...rows].map(r => r.map(x => '"'+(x||'')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'compliance-policies.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPoliciesToExcel(policies: any[]) {
  // Simple Excel export using HTML table (works for basic needs)
  let html = '<table><tr><th>الاسم</th><th>الوصف</th><th>الحالة</th></tr>';
  for (const p of policies) {
    html += `<tr><td>${p.name}</td><td>${p.description}</td><td>${p.enabled ? 'مفعلة' : 'معطلة'}</td></tr>`;
  }
  html += '</table>';
  const blob = new Blob([
    `\ufeff<html><head><meta charset="UTF-8"></head><body>${html}</body></html>`
  ], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'compliance-policies.xls';
  a.click();
  URL.revokeObjectURL(url);
}

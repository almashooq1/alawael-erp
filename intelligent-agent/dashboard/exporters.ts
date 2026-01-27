import { Response } from 'express';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export function exportReportPDF(res: Response, stats: any) {
  const doc = new jsPDF();
  doc.text('تقرير الذكاء الذاتي', 10, 10);
  doc.text(`إجمالي التفاعلات: ${stats.total}`, 10, 20);
  doc.text(`تفاعلات هذا الأسبوع: ${stats.weekCount}`, 10, 30);
  doc.text(`عدد الأخطاء: ${stats.errorCount}`, 10, 40);
  doc.text('أكثر الأسئلة:', 10, 50);
  stats.topQuestions.forEach(([q, c]: [string, number], i: number) => {
    doc.text(`${i+1}. ${q} (${c})`, 12, 60 + i*10);
  });
  doc.save('report.pdf');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
  res.end(doc.output('arraybuffer'));
}

export function exportReportExcel(res: Response, stats: any) {
  const ws = XLSX.utils.json_to_sheet([
    { العنوان: 'إجمالي التفاعلات', القيمة: stats.total },
    { العنوان: 'تفاعلات الأسبوع', القيمة: stats.weekCount },
    { العنوان: 'عدد الأخطاء', القيمة: stats.errorCount },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'تقرير');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
  res.end(buf);
}

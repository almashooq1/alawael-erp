import { Response } from 'express';
import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';

export function exportReportPDF(res: Response, stats: any) {
  const doc = new jsPDF();
  doc.text('تقرير الذكاء الذاتي', 10, 10);
  doc.text(`إجمالي التفاعلات: ${stats.total}`, 10, 20);
  doc.text(`تفاعلات هذا الأسبوع: ${stats.weekCount}`, 10, 30);
  doc.text(`عدد الأخطاء: ${stats.errorCount}`, 10, 40);
  doc.text('أكثر الأسئلة:', 10, 50);
  stats.topQuestions.forEach(([q, c]: [string, number], i: number) => {
    doc.text(`${i + 1}. ${q} (${c})`, 12, 60 + i * 10);
  });
  doc.save('report.pdf');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
  res.end(doc.output('arraybuffer'));
}

export async function exportReportExcel(res: Response, stats: any) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('تقرير');
  const dataArray = [
    { العنوان: 'إجمالي التفاعلات', القيمة: stats.total },
    { العنوان: 'تفاعلات الأسبوع', القيمة: stats.weekCount },
    { العنوان: 'عدد الأخطاء', القيمة: stats.errorCount },
  ];
  ws.columns = Object.keys(dataArray[0]).map(key => ({ header: key, key, width: 20 }));
  ws.addRows(dataArray);
  const buf = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
  res.end(buf);
}

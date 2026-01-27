// خدمة تقارير الامتثال (تصدير PDF/Excel)
import ComplianceEvent from '../models/compliance-event';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import fs from 'fs';

export async function generateComplianceReport({
  from,
  to,
  format = 'pdf',
  filePath = ''
}: {
  from: Date,
  to: Date,
  format?: 'pdf' | 'excel',
  filePath?: string
}) {
  const events = await ComplianceEvent.find({
    timestamp: { $gte: from, $lte: to }
  }).lean();
  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Compliance Events');
    sheet.columns = [
      { header: 'التاريخ', key: 'timestamp', width: 20 },
      { header: 'المستخدم', key: 'userId', width: 20 },
      { header: 'الإجراء', key: 'action', width: 20 },
      { header: 'المورد', key: 'resource', width: 20 },
      { header: 'الحالة', key: 'status', width: 15 },
      { header: 'تفاصيل', key: 'details', width: 30 },
      { header: 'السياسة', key: 'policy', width: 20 }
    ];
    events.forEach((e: any) => sheet.addRow(e));
    const outPath = filePath || `compliance-report-${from.toISOString().slice(0,10)}-${to.toISOString().slice(0,10)}.xlsx`;
    await workbook.xlsx.writeFile(outPath);
    return outPath;
  } else {
    const doc = new jsPDF();
    doc.text('تقرير الامتثال', 10, 10);
    let y = 20;
    events.forEach((e: any) => {
      doc.text(`${e.timestamp} | ${e.userId || ''} | ${e.action} | ${e.resource} | ${e.status} | ${e.details || ''} | ${e.policy || ''}`, 10, y);
      y += 10;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    const outPath = filePath || `compliance-report-${from.toISOString().slice(0,10)}-${to.toISOString().slice(0,10)}.pdf`;
    doc.save(outPath);
    return outPath;
  }
}

import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportPoliciesToPDF(policies) {
  const doc = new jsPDF({orientation:'landscape'});
  doc.setFont('Tahoma');
  doc.setFontSize(16);
  doc.text('تقرير سياسات الامتثال', 14, 18, {align:'right'});
  const tableData = policies.map(p => [p.name, p.description, p.enabled ? 'مفعلة' : 'معطلة']);
  doc.autoTable({
    head: [['الاسم', 'الوصف', 'الحالة']],
    body: tableData,
    styles: {font:'Tahoma',fontStyle:'normal',halign:'right'},
    headStyles: {fillColor:[24,144,255],textColor:255,halign:'right'},
    bodyStyles: {halign:'right'},
    margin: {top: 28}
  });
  doc.save('compliance-policies.pdf');
}

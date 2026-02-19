/**
 * خدمة تصدير البيانات - Excel/CSV
 * Data Export Service - Excel & CSV
 * 
 * يوفر قدرات التصدير المتقدمة لبيانات الرواتب
 * npm install xlsx exceljs
 */

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');

class DataExportService {
  /**
   * تصدير رواتب الشهر إلى Excel
   */
  static async exportPayrollsToExcel(payrolls, month, year, outputPath) {
    const workbook = new ExcelJS.Workbook();

    // إنشاء ورقة العمل الأولى - ملخص
    const summarySheet = workbook.addWorksheet('ملخص بيانات الراتب');
    this.stylizeSummarySheet(summarySheet, payrolls, month, year);

    // إنشاء ورقة التفاصيل
    const detailsSheet = workbook.addWorksheet('تفاصيل الرواتب');
    this.stylizeDetailsSheet(detailsSheet, payrolls);

    // إنشاء ورقة الإحصائيات
    const statsSheet = workbook.addWorksheet('الإحصائيات');
    this.stylizeStatsSheet(statsSheet, payrolls);

    // حفظ الملف
    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  }

  /**
   * تنسيق ورقة الملخص
   */
  static stylizeSummarySheet(sheet, payrolls, month, year) {
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    // العنوان
    sheet.merge('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `ملخص بيانات رواتب ${monthNames[month - 1]} ${year}`;
    titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007BFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'center' };
    sheet.getRow(1).height = 25;

    sheet.moveDown();

    // إحصائيات الملخص
    const totalGross = payrolls.reduce((sum, p) => sum + (p.calculations?.totalGross || 0), 0);
    const totalDeductions = payrolls.reduce((sum, p) => sum + (p.calculations?.totalDeductions || 0), 0);
    const totalNet = payrolls.reduce((sum, p) => sum + (p.calculations?.totalNet || 0), 0);
    const totalIncentives = payrolls.reduce((sum, p) => sum + (p.calculations?.totalIncentives || 0), 0);

    const statsData = [
      ['البيان | Description', 'المبلغ | Amount'],
      ['عدد الموظفين | Employee Count', payrolls.length],
      ['إجمالي الرواتب الإجمالية | Total Gross Salary', totalGross.toFixed(2)],
      ['إجمالي الحوافز | Total Incentives', totalIncentives.toFixed(2)],
      ['إجمالي الخصومات | Total Deductions', totalDeductions.toFixed(2)],
      ['إجمالي الرواتب الصافية | Total Net Salary', totalNet.toFixed(2)],
      ['متوسط الراتب | Average Salary', (totalNet / payrolls.length).toFixed(2)]
    ];

    let row = 3;
    statsData.forEach((data, index) => {
      const r = sheet.getRow(row);
      r.values = data;

      const cell1 = r.getCell(1);
      const cell2 = r.getCell(2);

      if (index === 0) {
        cell1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };
        cell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };
      }

      if (data[1] !== 'Amount') {
        cell2.numFmt = '#,##0.00';
      }

      row++;
    });

    sheet.columns = [
      { width: 30 },
      { width: 20 }
    ];
  }

  /**
   * تنسيق ورقة التفاصيل
   */
  static stylizeDetailsSheet(sheet, payrolls) {
    // رؤوس الأعمدة
    const headers = [
      'اسم الموظف | Name',
      'رقم الموظف | ID',
      'القسم | Department',
      'الراتب الأساسي | Base Salary',
      'المزايا | Allowances',
      'الحوافز | Incentives',
      'الإجمالي الإجمالي | Gross',
      'الخصومات | Deductions',
      'الراتب الصافي | Net',
      'الحالة | Status'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007BFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'center' };

    // البيانات
    payrolls.forEach(payroll => {
      sheet.addRow([
        payroll.employeeName,
        payroll.employeeId,
        payroll.departmentId,
        payroll.baseSalary,
        payroll.calculations?.totalAllowances || 0,
        payroll.calculations?.totalIncentives || 0,
        payroll.calculations?.totalGross || 0,
        payroll.calculations?.totalDeductions || 0,
        payroll.calculations?.totalNet || 0,
        payroll.status
      ]);
    });

    // تعيين أعرض الأعمدة
    sheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15, numFmt: '#,##0.00' },
      { width: 15, numFmt: '#,##0.00' },
      { width: 15, numFmt: '#,##0.00' },
      { width: 15, numFmt: '#,##0.00' },
      { width: 15, numFmt: '#,##0.00' },
      { width: 15, numFmt: '#,##0.00' },
      { width: 15 }
    ];

    // تطبيق الحدود على جميع الخلايا
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // تجميد الصف الأول
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  /**
   * تنسيق ورقة الإحصائيات
   */
  static stylizeStatsSheet(sheet, payrolls) {
    sheet.merge('A1:C1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'الإحصائيات والتحليلات | Statistics & Analysis';
    titleCell.font = { size: 12, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    sheet.moveDown();

    // حساب التوزيع حسب الحالة
    const statusCounts = {};
    const departmentStats = {};

    payrolls.forEach(payroll => {
      // إحصائيات الحالة
      statusCounts[payroll.status] = (statusCounts[payroll.status] || 0) + 1;

      // إحصائيات القسم
      const dept = payroll.departmentId || 'بدون قسم';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          count: 0,
          totalGross: 0,
          totalNet: 0
        };
      }
      departmentStats[dept].count++;
      departmentStats[dept].totalGross += payroll.calculations?.totalGross || 0;
      departmentStats[dept].totalNet += payroll.calculations?.totalNet || 0;
    });

    // إحصائيات الحالة
    let row = 3;
    sheet.getCell(`A${row}`).value = 'توزيع الرواتب حسب الحالة';
    sheet.getCell(`A${row}`).font = { bold: true };
    row++;

    const statusHeaders = ['الحالة | Status', 'العدد | Count'];
    const statusHeaderRow = sheet.getRow(row);
    statusHeaderRow.values = statusHeaders;
    statusHeaderRow.font = { bold: true };
    row++;

    Object.entries(statusCounts).forEach(([status, count]) => {
      sheet.getRow(row).values = [status, count];
      row++;
    });

    row += 2;

    // إحصائيات الأقسام
    sheet.getCell(`A${row}`).value = 'توزيع الرواتب حسب القسم';
    sheet.getCell(`A${row}`).font = { bold: true };
    row++;

    const deptHeaders = ['القسم | Department', 'العدد | Count', 'إجمالي الإجمالي | Total Gross', 'متوسط | Average'];
    const deptHeaderRow = sheet.getRow(row);
    deptHeaderRow.values = deptHeaders;
    deptHeaderRow.font = { bold: true };
    row++;

    Object.entries(departmentStats).forEach(([dept, stats]) => {
      sheet.getRow(row).values = [
        dept,
        stats.count,
        stats.totalGross.toFixed(2),
        (stats.totalGross / stats.count).toFixed(2)
      ];
      row++;
    });

    sheet.columns = [
      { width: 25 },
      { width: 15 },
      { width: 20 },
      { width: 15 }
    ];
  }

  /**
   * تصدير إلى CSV
   */
  static async exportPayrollsToCSV(payrolls, outputPath) {
    const fields = [
      'employeeName',
      'employeeId',
      'departmentId',
      'baseSalary',
      { label: 'totalAllowances', value: payroll => payroll.calculations?.totalAllowances || 0 },
      { label: 'totalIncentives', value: payroll => payroll.calculations?.totalIncentives || 0 },
      { label: 'totalGross', value: payroll => payroll.calculations?.totalGross || 0 },
      { label: 'totalDeductions', value: payroll => payroll.calculations?.totalDeductions || 0 },
      { label: 'totalNet', value: payroll => payroll.calculations?.totalNet || 0 },
      'status'
    ];

    try {
      const parser = new Parser({ fields });
      const csv = parser.parse(payrolls);

      fs.writeFileSync(outputPath, csv, 'utf8');
      return outputPath;
    } catch (error) {
      throw new Error(`خطأ في تصدير CSV: ${error.message}`);
    }
  }

  /**
   * تصدير الحوافز الفردية إلى Excel
   */
  static async exportIncentivesToExcel(incentives, outputPath) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('السجلات الفردية');

    const headers = [
      'رقم الموظف | Employee ID',
      'نوع الحافزة | Type',
      'الشهر | Month',
      'السنة | Year',
      'المبلغ | Amount',
      'السبب | Reason',
      'الحالة | Status',
      'تاريخ الموافقة | Approval Date',
      'تاريخ الدفع | Payment Date'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } };

    incentives.forEach(incentive => {
      sheet.addRow([
        incentive.employeeId,
        incentive.incentiveType,
        incentive.month,
        incentive.year,
        incentive.amount,
        incentive.reason,
        incentive.status,
        incentive.approvals?.approvedBy?.date || '',
        incentive.payment?.paidDate || ''
      ]);
    });

    sheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 10 },
      { width: 10 },
      { width: 12, numFmt: '#,##0.00' },
      { width: 30 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];

    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  }

  /**
   * تصدير العقوبات إلى Excel
   */
  static async exportPenaltiesToExcel(penalties, outputPath) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('السجلات والعقوبات');

    const headers = [
      'رقم الموظف | Employee ID',
      'نوع العقوبة | Type',
      'الشدة | Severity',
      'المبلغ | Amount',
      'السبب | Reason',
      'تاريخ الحادثة | Incident Date',
      'الحالة | Status',
      'تاريخ الاستئناف | Appeal Date',
      'نتيجة الاستئناف | Appeal Outcome'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC3545' } };

    penalties.forEach(penalty => {
      sheet.addRow([
        penalty.employeeId,
        penalty.penaltyType,
        penalty.severity,
        penalty.amount,
        penalty.reason,
        penalty.incidentDate,
        penalty.status,
        penalty.appeal?.appealedDate || '',
        penalty.appeal?.appealOutcome || ''
      ]);
    });

    sheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 12 },
      { width: 12, numFmt: '#,##0.00' },
      { width: 30 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];

    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  }

  /**
   * حفظ الملفات المصدرة
   */
  static ensureExportDir() {
    const exportDir = path.join(__dirname, '../../uploads/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    return exportDir;
  }

  /**
   * إنشاء ملف متعدد الأوراق
   */
  static async createComprehensivePayrollReport(payrolls, month, year) {
    const exportDir = this.ensureExportDir();
    const fileName = `Payroll_Report_${year}${String(month).padStart(2, '0')}_${Date.now()}.xlsx`;
    const filePath = path.join(exportDir, fileName);

    // استدعاء إنشاء Excel المتقدم
    await this.exportPayrollsToExcel(payrolls, month, year, filePath);

    return {
      fileName,
      filePath,
      url: `/uploads/exports/${fileName}`,
      size: fs.statSync(filePath).size
    };
  }
}

module.exports = DataExportService;

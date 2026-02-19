/**
 * خدمة توليد الراتب الورقي (Payslip)
 * Payslip Generation Service
 * 
 * يوفر طرقا لتوليد ملفات PDF وصور الراتب الشاملة
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PayslipGenerationService {
  /**
   * توليد كائن بيانات الراتب الورقي
   */
  static generatePayslipData(payroll, employee, compensationStructure) {
    return {
      employeeInfo: {
        name: payroll.employeeName,
        email: payroll.employeeEmail,
        employeeId: payroll.employeeId,
        department: payroll.departmentId,
        position: employee?.position || 'موظف'
      },
      payrollInfo: {
        month: payroll.month,
        year: payroll.year,
        processDate: new Date(),
        status: payroll.status
      },
      earnings: {
        baseSalary: payroll.baseSalary,
        allowances: payroll.allowances || [],
        totalAllowances: payroll.calculations?.totalAllowances || 0,
        incentives: payroll.incentives || {},
        totalIncentives: payroll.calculations?.totalIncentives || 0,
        overtime: payroll.attendance?.overtime || {},
        totalEarnings: (payroll.calculations?.totalGross || 0) + (payroll.calculations?.totalIncentives || 0)
      },
      deductions: {
        taxes: {
          incomeTax: payroll.taxes?.incomeTax?.amount || 0,
          socialSecurity: payroll.taxes?.socialSecurity?.amount || 0,
          healthInsurance: payroll.taxes?.healthInsurance?.amount || 0,
          GOSI: payroll.taxes?.GOSI?.amount || 0
        },
        penalties: payroll.penalties || {},
        totalDeductions: payroll.calculations?.totalDeductions || 0
      },
      summary: {
        grossSalary: payroll.calculations?.totalGross || 0,
        netSalary: payroll.calculations?.totalNet || 0,
        netPayable: payroll.calculations?.netPayable || 0
      },
      bankDetails: {
        method: payroll.paymentMethod || 'bank_transfer',
        account: payroll.bankAccount || 'N/A',
        transactionRef: payroll.transactionReference || 'معلق'
      },
      approvals: payroll.approvals || {},
      notes: []
    };
  }

  /**
   * توليد PDF الراتب الورقي
   */
  static async generatePayslipPDF(payroll, employee, compensationStructure, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          bufferPages: true
        });

        const output = fs.createWriteStream(outputPath);
        doc.pipe(output);

        // الرأس الرئيسي
        doc.fontSize(20).font('Helvetica-Bold').text('كشف الراتب الشهري', { align: 'center' });
        doc.fontSize(10).text('Monthly Payslip', { align: 'center' });
        doc.moveDown(0.5);

        // معلومات الشركة (يمكن تخصيصها)
        doc.fontSize(9).font('Helvetica').text('شركة الألوائيل ERP', { align: 'center' });
        doc.text('AlAwael Enterprise Resource Planning', { align: 'center' });
        doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
        doc.moveDown(1);

        // معلومات الموظف
        doc.fontSize(11).font('Helvetica-Bold').text('معلومات الموظف | Employee Information:', { underline: true });
        doc.fontSize(9).font('Helvetica');

        const employeeY = doc.y;
        doc.text(`الاسم | Name: ${payroll.employeeName}`, 50);
        doc.text(`البريد الإلكتروني | Email: ${payroll.employeeEmail}`, 50);
        doc.text(`معرف الموظف | ID: ${payroll.employeeId}`, 50);

        doc.fontSize(9).text(`الشهر | Month: ${this.getMonthName(payroll.month)} ${payroll.year}`, 350);
        doc.text(`الحالة | Status: ${this.getStatusLabel(payroll.status)}`, 350);
        doc.moveDown(0.5);

        // جدول الأرباح
        doc.fontSize(11).font('Helvetica-Bold').text('الأرباح | Earnings:', { underline: true });
        doc.moveDown(0.3);

        const earningsData = [
          ['الوصف | Description', 'المبلغ | Amount', 'ملاحظات | Notes'],
          ['الراتب الأساسي | Base Salary', `${payroll.baseSalary.toFixed(2)} SAR`, ''],
          ...payroll.allowances.map(a => [
            a.name,
            `${a.amount.toFixed(2)} SAR`,
            a.type || ''
          ]),
          ['الحوافز | Incentives', `${payroll.calculations?.totalIncentives?.toFixed(2) || '0.00'} SAR`, 'الأداء و الحضور'],
          ['المجموع الأولي | Subtotal', `${payroll.calculations?.totalGross?.toFixed(2) || '0.00'} SAR`, '']
        ];

        this.drawTable(doc, earningsData, 50, doc.y, {
          width: 500,
          rowHeight: 20,
          headerBg: '#d3d3d3'
        });

        doc.moveDown(1);

        // جدول الخصومات
        doc.fontSize(11).font('Helvetica-Bold').text('الخصومات | Deductions:', { underline: true });
        doc.moveDown(0.3);

        const deductionsData = [
          ['الوصف | Description', 'النسبة | Rate', 'المبلغ | Amount'],
          ['ضريبة الدخل | Income Tax', `${(payroll.taxes?.incomeTax?.percentage || 0).toFixed(1)}%`, `${(payroll.taxes?.incomeTax?.amount || 0).toFixed(2)} SAR`],
          ['الضمان الاجتماعي | Social Security', '6%', `${(payroll.taxes?.socialSecurity?.amount || 0).toFixed(2)} SAR`],
          ['التأمين الصحي | Health Insurance', '2%', `${(payroll.taxes?.healthInsurance?.amount || 0).toFixed(2)} SAR`],
          ['GOSI (التأمينات)', '3%', `${(payroll.taxes?.GOSI?.amount || 0).toFixed(2)} SAR`],
          ['المجموع | Total Deductions', '', `${(payroll.calculations?.totalDeductions || 0).toFixed(2)} SAR`]
        ];

        this.drawTable(doc, deductionsData, 50, doc.y, {
          width: 500,
          rowHeight: 20,
          headerBg: '#d3d3d3'
        });

        doc.moveDown(1);

        // الملخص النهائي
        doc.fontSize(12).font('Helvetica-Bold').text('الملخص | Summary:', { underline: true });
        doc.moveDown(0.3);

        const summaryLineWidth = 300;
        const summaryX = 50;

        // الإجمالي الإجمالي
        doc.fontSize(11).font('Helvetica-Bold').text('الراتب الإجمالي | Gross Salary:', summaryX);
        doc.fontSize(11).font('Helvetica-Bold').text(
          `${(payroll.calculations?.totalGross || 0).toFixed(2)} SAR`,
          summaryX + summaryLineWidth,
          doc.y - 16,
          { align: 'right' }
        );
        doc.moveDown(0.8);

        // الخصومات
        doc.fontSize(11).font('Helvetica').text('الخصومات | Deductions:', summaryX);
        doc.fontSize(11).font('Helvetica').text(
          `(${(payroll.calculations?.totalDeductions || 0).toFixed(2)} SAR)`,
          summaryX + summaryLineWidth,
          doc.y - 16,
          { align: 'right' }
        );
        doc.moveDown(0.8);

        // الراتب الصافي
        doc.moveTo(summaryX, doc.y + 5).lineTo(summaryX + summaryLineWidth, doc.y + 5).stroke();
        doc.fontSize(12).font('Helvetica-Bold').text('الراتب الصافي | Net Salary:', summaryX);
        doc.fontSize(12).font('Helvetica-Bold').text(
          `${(payroll.calculations?.totalNet || 0).toFixed(2)} SAR`,
          summaryX + summaryLineWidth,
          doc.y - 19,
          { align: 'right' }
        );
        doc.moveDown(1);

        // بيانات البنك
        if (payroll.paymentMethod === 'bank_transfer') {
          doc.fontSize(9).font('Helvetica-Bold').text('بيانات التحويل | Bank Transfer Details:');
          doc.fontSize(9).font('Helvetica');
          doc.text(`الطريقة | Method: ${payroll.paymentMethod}`);
          doc.text(`الحساب | Account: ****${payroll.bankAccount?.slice(-4) || 'N/A'}`);
          if (payroll.transactionReference) {
            doc.text(`رقم المرجع | Reference: ${payroll.transactionReference}`);
          }
          if (payroll.paymentDate) {
            doc.text(`تاريخ الدفع | Payment Date: ${new Date(payroll.paymentDate).toLocaleDateString('ar-SA')}`);
          }
          doc.moveDown(0.5);
        }

        // الموافقات
        doc.fontSize(9).font('Helvetica-Bold').text('الموافقات | Approvals:', { underline: true });
        doc.fontSize(8).font('Helvetica');

        if (payroll.approvals?.preparedBy) {
          doc.text(`تم التحضير بواسطة | Prepared by: ${payroll.approvals.preparedBy.name} - ${new Date(payroll.approvals.preparedBy.date).toLocaleDateString('ar-SA')}`);
        }
        if (payroll.approvals?.approvedBy) {
          doc.text(`تمت الموافقة من | Approved by: ${payroll.approvals.approvedBy.name} - ${new Date(payroll.approvals.approvedBy.date).toLocaleDateString('ar-SA')}`);
        }

        doc.moveDown(1);

        // التذييل
        doc.fontSize(8).text(
          'هذا المستند سري وموجه للموظف المحترم فقط. | This document is confidential and strictly for the employee.',
          50,
          doc.page.height - 50,
          { align: 'center', width: 500 }
        );

        doc.end();

        output.on('finish', () => {
          resolve(outputPath);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * طرسم جدول في PDF
   */
  static drawTable(doc, data, x, y, options = {}) {
    const { width = 500, rowHeight = 20, headerBg = '#f0f0f0' } = options;
    const columnWidth = width / data[0].length;

    let currentY = y;

    data.forEach((row, rowIndex) => {
      let currentX = x;

      // رسم خلفية الرأس
      if (rowIndex === 0) {
        doc.rect(x, currentY, width, rowHeight).fill(headerBg);
        doc.fillColor('#000000');
      }

      row.forEach((cell, cellIndex) => {
        const cellX = currentX + 5;
        const cellY = currentY + 5;

        doc.fontSize(9);
        if (rowIndex === 0) {
          doc.font('Helvetica-Bold');
        } else {
          doc.font('Helvetica');
        }

        doc.text(String(cell), cellX, cellY, {
          width: columnWidth - 10,
          height: rowHeight - 10,
          align: cellIndex === row.length - 1 ? 'right' : 'left',
          lineBreak: false
        });

        currentX += columnWidth;
      });

      // رسم حدود الصف
      doc.strokeColor('#cccccc').rect(x, currentY, width, rowHeight).stroke();
      currentY += rowHeight;
    });

    doc.moveDown(Math.ceil(currentY / doc.currentLineHeight(true)));
  }

  /**
   * الحصول على اسم الشهر بالعربية
   */
  static getMonthName(month) {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[month - 1] || 'الشهر المجهول';
  }

  /**
   * الحصول على تسمية الحالة بالعربية
   */
  static getStatusLabel(status) {
    const labels = {
      'draft': 'مسودة',
      'pending-approval': 'قيد الموافقة',
      'approved': 'موافق عليه',
      'processed': 'معالج',
      'transferred': 'محول',
      'paid': 'مدفوع',
      'cancelled': 'ملغى'
    };
    return labels[status] || status;
  }

  /**
   * حفظ PDF الراتب الورقي
   */
  static async savePayslipPDF(payroll, employee, compensationStructure) {
    const fileName = `payslip_${payroll.employeeId}_${payroll.year}${String(payroll.month).padStart(2, '0')}.pdf`;
    const uploadDir = path.join(__dirname, '../../uploads/payslips');

    // التأكد من وجود المجلد
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    await this.generatePayslipPDF(payroll, employee, compensationStructure, filePath);

    return {
      fileName,
      filePath,
      url: `/uploads/payslips/${fileName}`
    };
  }

  /**
   * إنشاء HTML للعرض
   */
  static generatePayslipHTML(payslipData) {
    const monthName = this.getMonthName(payslipData.payrollInfo.month);
    const year = payslipData.payrollInfo.year;

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>كشف الراتب - ${payslipData.employeeInfo.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #007bff; padding-bottom: 20px; }
    .header h1 { color: #333; font-size: 24px; margin-bottom: 5px; }
    .header p { color: #666; font-size: 14px; }
    .employee-info, .payroll-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .info-item { flex: 1; }
    .info-item label { color: #666; font-size: 12px; font-weight: bold; }
    .info-item span { display: block; color: #333; font-size: 14px; margin-top: 3px; }
    .section { margin: 30px 0; }
    .section-title { background: #f0f0f0; padding: 10px 15px; font-weight: bold; color: #333; border-right: 4px solid #007bff; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th, td { padding: 10px 15px; text-align: right; border: 1px solid #ddd; }
    th { background: #f0f0f0; font-weight: bold; }
    .amount { font-weight: bold; }
    .summary { background: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .summary-row.total { font-size: 16px; font-weight: bold; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 10px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
    .print-btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; display: block; margin: 20px auto; }
    .print-btn:hover { background: #0056b3; }
    @media print {
      body { background: white; }
      .print-btn { display: none; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>كشف الراتب الشهري</h1>
      <p>شركة الألوائيل ERP - AlAwael Payslip</p>
    </div>

    <div class="employee-info">
      <div class="info-item">
        <label>الاسم</label>
        <span>${payslipData.employeeInfo.name}</span>
      </div>
      <div class="info-item">
        <label>رقم الموظف</label>
        <span>${payslipData.employeeInfo.employeeId}</span>
      </div>
      <div class="info-item">
        <label>البريد الإلكتروني</label>
        <span>${payslipData.employeeInfo.email}</span>
      </div>
    </div>

    <div class="payroll-info">
      <div class="info-item">
        <label>الشهر</label>
        <span>${monthName} ${year}</span>
      </div>
      <div class="info-item">
        <label>الحالة</label>
        <span>${payslipData.payrollInfo.status}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">الأرباح والمزايا</div>
      <table>
        <thead>
          <tr>
            <th>المبلغ</th>
            <th>البيان</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="amount">${payslipData.earnings.baseSalary.toFixed(2)} SAR</td>
            <td>الراتب الأساسي</td>
          </tr>
          ${payslipData.earnings.allowances.map(a => `
          <tr>
            <td class="amount">${(a.amount || 0).toFixed(2)} SAR</td>
            <td>${a.name}</td>
          </tr>
          `).join('')}
          <tr>
            <td class="amount">${payslipData.earnings.totalIncentives.toFixed(2)} SAR</td>
            <td>الحوافز</td>
          </tr>
          <tr style="background: #f0f0f0;">
            <td class="amount"><strong>${payslipData.earnings.totalEarnings.toFixed(2)} SAR</strong></td>
            <td><strong>إجمالي الأرباح</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">الخصومات والتأمينات</div>
      <table>
        <thead>
          <tr>
            <th>المبلغ</th>
            <th>البيان</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="amount">${payslipData.deductions.taxes.incomeTax.toFixed(2)} SAR</td>
            <td>ضريبة الدخل</td>
          </tr>
          <tr>
            <td class="amount">${payslipData.deductions.taxes.socialSecurity.toFixed(2)} SAR</td>
            <td>الضمان الاجتماعي</td>
          </tr>
          <tr>
            <td class="amount">${payslipData.deductions.taxes.healthInsurance.toFixed(2)} SAR</td>
            <td>التأمين الصحي</td>
          </tr>
          <tr>
            <td class="amount">${payslipData.deductions.taxes.GOSI.toFixed(2)} SAR</td>
            <td>GOSI</td>
          </tr>
          <tr style="background: #f0f0f0;">
            <td class="amount"><strong>${payslipData.deductions.totalDeductions.toFixed(2)} SAR</strong></td>
            <td><strong>إجمالي الخصومات</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary">
      <div class="summary-row">
        <span>الراتب الإجمالي:</span>
        <strong>${payslipData.summary.grossSalary.toFixed(2)} SAR</strong>
      </div>
      <div class="summary-row">
        <span>الخصومات:</span>
        <strong>- ${payslipData.summary.grossSalary - payslipData.summary.netSalary.toFixed(2)}</strong>
      </div>
      <div class="summary-row total">
        <span>الراتب الصافي:</span>
        <strong>${payslipData.summary.netSalary.toFixed(2)} SAR</strong>
      </div>
    </div>

    <button class="print-btn" onclick="window.print()">اطبع الكشف</button>

    <div class="footer">
      <p>هذا المستند سري وموجه للموظف المحترم فقط</p>
      <p>Generated on ${new Date().toLocaleDateString('ar-SA')}</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

module.exports = PayslipGenerationService;

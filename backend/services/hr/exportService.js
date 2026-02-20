/**
 * HR Export Service - خدمة التصدير المتقدمة
 * تصدير بيانات الموارد البشرية إلى Excel و PDF
 */

const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Employee = require('../models/employee.model');
const Payroll = require('../models/payroll.model');

const exportsDir = path.join(__dirname, '../exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

class HRExportService {
  /**
   * تصدير بيانات الموظفين إلى Excel
   */
  static async exportEmployeesToExcel(filters = {}) {
    try {
      let query = {};
      if (filters.department) query.department = filters.department;
      if (filters.status) query.status = filters.status;
      if (filters.position) query.position = filters.position;

      const employees = await Employee.find(query);

      const data = employees.map(emp => ({
        'رقم الموظف': emp.employeeId,
        'الاسم الكامل': emp.fullName,
        'البريد الإلكتروني': emp.email,
        الهاتف: emp.phone,
        القسم: emp.department,
        الوظيفة: emp.position,
        المستوى: emp.level,
        'حالة الموظف': emp.status,
        'تاريخ التوظيف': emp.hireDate?.toLocaleDateString('ar-EG'),
        'الراتب الأساسي': emp.salary?.base || 0,
        'نوع العقد': emp.employment?.contractType,
        'تاريخ انتهاء العقد': emp.employment?.contractEndDate?.toLocaleDateString('ar-EG'),
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      // تعيين عرض الأعمدة
      const colWidths = [
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
      ];
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'الموظفون');

      const fileName = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
      const filePath = path.join(exportsDir, fileName);

      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        fileName,
        filePath,
        recordCount: employees.length,
        message: `تم تصدير ${employees.length} موظف بنجاح`,
      };
    } catch (error) {
      throw new Error(`خطأ في تصدير الموظفين: ${error.message}`);
    }
  }

  /**
   * تصدير بيانات الرواتب إلى Excel
   */
  static async exportPayrollToExcel(month, year) {
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const payrolls = await Payroll.find({
        month: monthStr,
      }).populate('employeeId', 'fullName position department');

      const data = payrolls.map(p => ({
        'رقم الموظف': p.employeeId?.employeeId,
        'اسم الموظف': p.employeeId?.fullName,
        الوظيفة: p.employeeId?.position,
        القسم: p.employeeId?.department,
        'الراتب الأساسي': p.baseSalary,
        البدلات: p.totalAllowances,
        الخصومات: p.totalDeductions,
        الضرائب: p.taxes || 0,
        التأمينات: p.insurance || 0,
        'الراتب الصافي': p.netSalary,
        'حالة الدفع': p.paymentStatus,
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      const colWidths = [
        { wch: 12 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
      ];
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'الرواتب');

      const fileName = `payroll_${monthStr}.xlsx`;
      const filePath = path.join(exportsDir, fileName);

      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        fileName,
        filePath,
        recordCount: payrolls.length,
        month: monthStr,
        message: `تم تصدير رواتب ${payrolls.length} موظف`,
      };
    } catch (error) {
      throw new Error(`خطأ في تصدير الرواتب: ${error.message}`);
    }
  }

  /**
   * تصدير ملف موظف إلى PDF
   */
  static async exportEmployeeProfileToPDF(employeeId) {
    try {
      const employee = await Employee.findById(employeeId).populate('manager', 'fullName position');

      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      const doc = new PDFDocument({
        bufferPages: true,
        margin: 50,
      });

      // العنوان
      doc.fontSize(24).font('Helvetica-Bold').text('ملف الموظف', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).text(`${employee.fullName}`, { align: 'center' });
      doc.moveDown(1);

      // معلومات أساسية
      doc.fontSize(12).font('Helvetica-Bold').text('معلومات أساسية:', { underline: true });
      doc.fontSize(10).font('Helvetica');

      const basicInfo = [
        ['رقم الموظف:', employee.employeeId],
        ['البريد الإلكتروني:', employee.email],
        ['رقم الهاتف:', employee.phone],
        ['الجنسية:', employee.nationality || '-'],
        ['الحالة الاجتماعية:', employee.maritalStatus || '-'],
        ['عدد المعالين:', employee.numberOfDependents || 0],
      ];

      basicInfo.forEach(([label, value]) => {
        doc.text(`${label} ${value}`);
      });

      doc.moveDown(1);

      // معلومات الوظيفة
      doc.fontSize(12).font('Helvetica-Bold').text('معلومات الوظيفة:', { underline: true });
      doc.fontSize(10).font('Helvetica');

      const jobInfo = [
        ['الوظيفة:', employee.position],
        ['القسم:', employee.department],
        ['المستوى:', employee.level],
        ['تاريخ التوظيف:', employee.hireDate?.toLocaleDateString('ar-EG')],
        ['نوع التوظيف:', employee.employment?.employmentType],
        ['نوع العقد:', employee.employment?.contractType],
        ['تاريخ انتهاء العقد:', employee.employment?.contractEndDate?.toLocaleDateString('ar-EG')],
      ];

      jobInfo.forEach(([label, value]) => {
        doc.text(`${label} ${value || '-'}`);
      });

      doc.moveDown(1);

      // معلومات الراتب
      doc.fontSize(12).font('Helvetica-Bold').text('معلومات الراتب:', { underline: true });
      doc.fontSize(10).font('Helvetica');

      const salaryInfo = [
        ['الراتب الأساسي:', `${employee.salary?.base || 0} ريال`],
        ['العملة:', employee.salary?.currency || 'SAR'],
        ['تكرار الدفع:', employee.salary?.paymentFrequency || 'شهري'],
      ];

      salaryInfo.forEach(([label, value]) => {
        doc.text(`${label} ${value}`);
      });

      // الختم وتاريخ
      doc.moveDown(2);
      doc
        .fontSize(9)
        .text(`تم إنشاء هذا المستند في: ${new Date().toLocaleDateString('ar-EG')}`, {
          align: 'center',
        });

      const fileName = `employee_${employee.employeeId}_${new Date().getTime()}.pdf`;
      const filePath = path.join(exportsDir, fileName);

      doc.pipe(fs.createWriteStream(filePath));
      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('finish', () => {
          resolve({
            success: true,
            fileName,
            filePath,
            message: 'تم إنشاء ملف PDF بنجاح',
          });
        });
        doc.on('error', reject);
      });
    } catch (error) {
      throw new Error(`خطأ في إنشاء ملف PDF: ${error.message}`);
    }
  }

  /**
   * تصدير تقرير رواتب شامل إلى PDF
   */
  static async exportPayrollReportToPDF(month, year) {
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const payrolls = await Payroll.find({
        month: monthStr,
      }).populate('employeeId', 'fullName position department');

      const doc = new PDFDocument({
        bufferPages: true,
        margin: 50,
      });

      // العنوان
      doc.fontSize(20).font('Helvetica-Bold').text('تقرير الرواتب الشهري', {
        align: 'center',
      });
      doc.fontSize(12).text(`للشهر: ${month}/${year}`, { align: 'center' });
      doc.moveDown(1);

      // ملخص
      const totalBaseSalary = payrolls.reduce((sum, p) => sum + (p.baseSalary || 0), 0);
      const totalAllowances = payrolls.reduce((sum, p) => sum + (p.totalAllowances || 0), 0);
      const totalDeductions = payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
      const totalNetSalary = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

      doc.fontSize(11).font('Helvetica-Bold').text('ملخص الرواتب:', { underline: true });
      doc.fontSize(10).font('Helvetica');
      doc.text(`عدد الموظفين: ${payrolls.length}`);
      doc.text(`إجمالي الرواتب الأساسية: ${totalBaseSalary.toFixed(2)} ريال`);
      doc.text(`إجمالي البدلات: ${totalAllowances.toFixed(2)} ريال`);
      doc.text(`إجمالي الخصومات: ${totalDeductions.toFixed(2)} ريال`);
      doc.text(`إجمالي الرواتب الصافية: ${totalNetSalary.toFixed(2)} ريال`);

      doc.moveDown(1.5);

      // جدول الموظفين
      doc.fontSize(11).font('Helvetica-Bold').text('تفاصيل الرواتب:', { underline: true });
      doc
        .fontSize(9)
        .font('Helvetica')
        .text('الاسم | الوظيفة | الراتب الأساسي | البدلات | الخصومات | الراتب الصافي');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.3);

      payrolls.forEach(p => {
        doc.text(
          `${p.employeeId?.fullName || '-'} | ${p.employeeId?.position || '-'} | ${(p.baseSalary || 0).toFixed(2)} | ${(p.totalAllowances || 0).toFixed(2)} | ${(p.totalDeductions || 0).toFixed(2)} | ${(p.netSalary || 0).toFixed(2)}`
        );
      });

      const fileName = `payroll_report_${monthStr}_${new Date().getTime()}.pdf`;
      const filePath = path.join(exportsDir, fileName);

      doc.pipe(fs.createWriteStream(filePath));
      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('finish', () => {
          resolve({
            success: true,
            fileName,
            filePath,
            message: 'تم إنشاء تقرير الرواتب بنجاح',
          });
        });
        doc.on('error', reject);
      });
    } catch (error) {
      throw new Error(`خطأ في إنشاء تقرير الرواتب: ${error.message}`);
    }
  }

  /**
   * جلب قائمة الملفات المُصدّرة
   */
  static async getExportedFiles() {
    try {
      const files = fs.readdirSync(exportsDir);

      return {
        success: true,
        files: files.map(file => {
          const filePath = path.join(exportsDir, file);
          const stats = fs.statSync(filePath);
          return {
            fileName: file,
            size: (stats.size / 1024).toFixed(2) + ' KB',
            createdAt: stats.birthtime,
            downloadUrl: `/exports/${file}`,
          };
        }),
      };
    } catch (error) {
      throw new Error(`خطأ في جلب الملفات: ${error.message}`);
    }
  }

  /**
   * حذف الملفات المُصدّرة القديمة
   */
  static async cleanupOldExports(daysOld = 7) {
    try {
      const now = new Date();
      const files = fs.readdirSync(exportsDir);

      let deletedCount = 0;
      for (const file of files) {
        const filePath = path.join(exportsDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = (now - stats.birthtime) / (1000 * 60 * 60 * 24);

        if (fileAge > daysOld) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      return {
        success: true,
        deletedCount,
        message: `تم حذف ${deletedCount} ملف قديم`,
      };
    } catch (error) {
      throw new Error(`خطأ في حذف الملفات: ${error.message}`);
    }
  }
}

module.exports = HRExportService;

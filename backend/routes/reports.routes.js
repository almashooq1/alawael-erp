const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee.memory');
const Attendance = require('../models/Attendance.memory');
const Leave = require('../models/Leave.memory');
const db = require('../config/inMemoryDB');
const { authenticateToken } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// 🔐 يتطلب مصادقة
router.use(authenticateToken);

/**
 * @route   GET /api/reports/employee-summary
 * @desc    ملخص الموظفين
 * @returns {Object} إحصائيات الموظفين
 */
router.get('/employee-summary', async (req, res) => {
  try {
    const data = db.read();
    const employees = data.employees || [];

    const summary = {
      total: employees.length,
      byDepartment: {},
      byStatus: {},
      bySalaryRange: {
        'أقل من 3000': 0,
        '3000-5000': 0,
        '5000-10000': 0,
        'أكثر من 10000': 0,
      },
    };

    employees.forEach(emp => {
      // بقسم
      summary.byDepartment[emp.department] = (summary.byDepartment[emp.department] || 0) + 1;

      // بالحالة
      summary.byStatus[emp.status] = (summary.byStatus[emp.status] || 0) + 1;

      // برطاقة الراتب
      const salary = emp.salary || 0;
      if (salary < 3000) summary.bySalaryRange['أقل من 3000']++;
      else if (salary <= 5000) summary.bySalaryRange['3000-5000']++;
      else if (salary <= 10000) summary.bySalaryRange['5000-10000']++;
      else summary.bySalaryRange['أكثر من 10000']++;
    });

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/attendance-stats
 * @desc    إحصائيات الحضور
 */
router.get('/attendance-stats', async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const data = db.read();
    const attendances = data.attendances || [];
    const employees = data.employees || [];

    let filtered = attendances;

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      filtered = filtered.filter(a => {
        const date = new Date(a.date);
        return date >= start && date <= end;
      });
    }

    if (department) {
      const deptEmps = employees.filter(e => e.department === department).map(e => e._id);
      filtered = filtered.filter(a => deptEmps.includes(a.employeeId));
    }

    const stats = {
      total: filtered.length,
      byStatus: {},
      averagePerDay: 0,
    };

    filtered.forEach(att => {
      stats.byStatus[att.status] = (stats.byStatus[att.status] || 0) + 1;
    });

    const uniqueDays = new Set(filtered.map(a => a.date)).size;
    stats.averagePerDay = uniqueDays > 0 ? (filtered.length / uniqueDays).toFixed(2) : 0;

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/leave-stats
 * @desc    إحصائيات الإجازات
 */
router.get('/leave-stats', async (req, res) => {
  try {
    const data = db.read();
    const leaves = data.leaves || [];

    const stats = {
      total: leaves.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      byType: {},
    };

    leaves.forEach(leave => {
      stats[leave.status.toLowerCase()] = (stats[leave.status.toLowerCase()] || 0) + 1;
      stats.byType[leave.type] = (stats.byType[leave.type] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/export-excel/:type
 * @desc    تصدير إلى Excel
 * @param   {String} type - employees, attendance, leaves
 */
router.get('/export-excel/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const data = db.read();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('البيانات');

    if (type === 'employees') {
      worksheet.columns = [
        { header: 'الاسم', key: 'fullName', width: 20 },
        { header: 'البريد الإلكتروني', key: 'email', width: 25 },
        { header: 'القسم', key: 'department', width: 15 },
        { header: 'الوظيفة', key: 'position', width: 15 },
        { header: 'الراتب', key: 'salary', width: 10 },
        { header: 'الحالة', key: 'status', width: 10 },
      ];

      data.employees.forEach(emp => {
        worksheet.addRow(emp);
      });
    }

    if (type === 'attendance') {
      worksheet.columns = [
        { header: 'معرف الموظف', key: 'employeeId', width: 20 },
        { header: 'التاريخ', key: 'date', width: 15 },
        { header: 'وقت الحضور', key: 'checkIn', width: 15 },
        { header: 'وقت المغادرة', key: 'checkOut', width: 15 },
        { header: 'الحالة', key: 'status', width: 15 },
      ];

      data.attendances.forEach(att => {
        worksheet.addRow(att);
      });
    }

    if (type === 'leaves') {
      worksheet.columns = [
        { header: 'معرف الموظف', key: 'employeeId', width: 20 },
        { header: 'النوع', key: 'type', width: 15 },
        { header: 'من', key: 'fromDate', width: 15 },
        { header: 'إلى', key: 'toDate', width: 15 },
        { header: 'السبب', key: 'reason', width: 25 },
        { header: 'الحالة', key: 'status', width: 10 },
      ];

      data.leaves.forEach(leave => {
        worksheet.addRow(leave);
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/export-pdf/:type
 * @desc    تصدير إلى PDF
 */
router.get('/export-pdf/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const data = db.read();

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${Date.now()}.pdf"`);

    doc.pipe(res);

    // الرأس
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(`تقرير ${type === 'employees' ? 'الموظفين' : type === 'attendance' ? 'الحضور' : 'الإجازات'}`, { align: 'right' });
    doc.moveDown();
    doc.fontSize(10).text(`التاريخ: ${new Date().toLocaleDateString('ar-EG')}`, { align: 'right' });
    doc.moveDown(1.5);

    if (type === 'employees') {
      doc.fontSize(12).font('Helvetica-Bold').text('قائمة الموظفين');
      doc.moveDown();

      data.employees.forEach((emp, i) => {
        doc.fontSize(10).text(`${i + 1}. ${emp.fullName}`, { indent: 20 });
        doc.fontSize(9).text(`البريد: ${emp.email}`, { indent: 30 });
        doc.fontSize(9).text(`القسم: ${emp.department}`, { indent: 30 });
        doc.fontSize(9).text(`الراتب: ${emp.salary}`, { indent: 30 });
        doc.moveDown(0.5);
      });
    }

    doc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/dashboard
 * @desc    لوحة البيانات الشاملة
 */
router.get('/dashboard', async (req, res) => {
  try {
    const data = db.read();

    const dashboard = {
      employees: {
        total: (data.employees || []).length,
        active: (data.employees || []).filter(e => e.status === 'active').length,
        inactive: (data.employees || []).filter(e => e.status === 'inactive').length,
      },
      attendance: {
        today: (data.attendances || []).filter(a => a.date === new Date().toISOString().split('T')[0]).length,
        present: (data.attendances || []).filter(a => a.status === 'present').length,
        absent: (data.attendances || []).filter(a => a.status === 'absent').length,
        late: (data.attendances || []).filter(a => a.status === 'late').length,
      },
      leaves: {
        pending: (data.leaves || []).filter(l => l.status === 'pending').length,
        approved: (data.leaves || []).filter(l => l.status === 'approved').length,
        rejected: (data.leaves || []).filter(l => l.status === 'rejected').length,
      },
      users: {
        total: (data.users || []).length,
        admin: (data.users || []).filter(u => u.role === 'admin').length,
        user: (data.users || []).filter(u => u.role === 'user').length,
      },
    };

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;


/**
 * Export/Import Service
 * Handle Excel and PDF export/import operations
 */

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const DisabilityRehabilitation = require('../models/disability-rehabilitation.model');
const fs = require('fs');
const path = require('path');

class ExportImportService {
  /**
   * Export programs to Excel
   * @param {Object} filters - Filtering criteria
   * @param {String} filePath - Output file path
   * @returns {String} - File path
   */
  async exportToExcel(filters = {}, filePath) {
    const programs = await DisabilityRehabilitation.find(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Alaweal System';
    workbook.created = new Date();

    // Sheet 1: Programs Overview
    const programsSheet = workbook.addWorksheet('البرامج', {
      properties: { rightToLeft: true },
    });

    // Define columns
    programsSheet.columns = [
      { header: 'رقم البرنامج', key: 'id', width: 15 },
      { header: 'اسم البرنامج', key: 'name_ar', width: 30 },
      { header: 'اسم المستفيد', key: 'beneficiary_name', width: 25 },
      { header: 'نوع الإعاقة', key: 'disability_type', width: 20 },
      { header: 'الحالة', key: 'status', width: 15 },
      { header: 'الشدة', key: 'severity', width: 15 },
      { header: 'تاريخ البدء', key: 'start_date', width: 15 },
      { header: 'تاريخ الانتهاء', key: 'end_date', width: 15 },
      { header: 'نسبة التقدم', key: 'progress', width: 15 },
      { header: 'الميزانية المخصصة', key: 'budget_allocated', width: 20 },
      { header: 'الميزانية المصروفة', key: 'budget_spent', width: 20 },
    ];

    // Style header row
    programsSheet.getRow(1).font = { bold: true, size: 12 };
    programsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' },
    };
    programsSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    programs.forEach(program => {
      programsSheet.addRow({
        id: program._id.toString().slice(-8),
        name_ar: program.program_info.name_ar,
        beneficiary_name: program.beneficiary.name_ar,
        disability_type: this.translateDisabilityType(program.disability_info.primary_disability),
        status: this.translateStatus(program.program_info.status),
        severity: this.translateSeverity(program.program_info.severity),
        start_date: this.formatDate(program.program_info.start_date),
        end_date: program.program_info.end_date
          ? this.formatDate(program.program_info.end_date)
          : 'مستمر',
        progress: `${program.progress_tracking.overall_progress_percentage}%`,
        budget_allocated: program.program_info.budget_allocated || 0,
        budget_spent: program.program_info.budget_spent || 0,
      });
    });

    // Sheet 2: Goals Details
    const goalsSheet = workbook.addWorksheet('الأهداف التأهيلية', {
      properties: { rightToLeft: true },
    });

    goalsSheet.columns = [
      { header: 'رقم البرنامج', key: 'program_id', width: 15 },
      { header: 'اسم البرنامج', key: 'program_name', width: 30 },
      { header: 'الهدف', key: 'goal_description', width: 40 },
      { header: 'الفئة', key: 'category', width: 20 },
      { header: 'الأولوية', key: 'priority', width: 15 },
      { header: 'الحالة', key: 'status', width: 15 },
      { header: 'نسبة الإنجاز', key: 'progress', width: 15 },
    ];

    // Style header
    goalsSheet.getRow(1).font = { bold: true, size: 12 };
    goalsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' },
    };
    goalsSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add goals data
    programs.forEach(program => {
      program.rehabilitation_goals.forEach(goal => {
        goalsSheet.addRow({
          program_id: program._id.toString().slice(-8),
          program_name: program.program_info.name_ar,
          goal_description: goal.description_ar,
          category: this.translateGoalCategory(goal.category),
          priority: this.translatePriority(goal.priority),
          status: this.translateGoalStatus(goal.status),
          progress: `${goal.progress_percentage}%`,
        });
      });
    });

    // Sheet 3: Sessions Summary
    const sessionsSheet = workbook.addWorksheet('الجلسات', {
      properties: { rightToLeft: true },
    });

    sessionsSheet.columns = [
      { header: 'رقم البرنامج', key: 'program_id', width: 15 },
      { header: 'اسم البرنامج', key: 'program_name', width: 30 },
      { header: 'تاريخ الجلسة', key: 'session_date', width: 20 },
      { header: 'نوع الجلسة', key: 'session_type', width: 15 },
      { header: 'المدة (دقيقة)', key: 'duration', width: 15 },
      { header: 'الحضور', key: 'attendance', width: 15 },
      { header: 'النتيجة', key: 'outcome', width: 15 },
    ];

    // Style header
    sessionsSheet.getRow(1).font = { bold: true, size: 12 };
    sessionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF9800' },
    };
    sessionsSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add sessions data
    programs.forEach(program => {
      program.therapy_sessions.forEach(session => {
        sessionsSheet.addRow({
          program_id: program._id.toString().slice(-8),
          program_name: program.program_info.name_ar,
          session_date: this.formatDate(session.session_date),
          session_type: this.translateSessionType(session.type),
          duration: session.duration_minutes,
          attendance: this.translateAttendance(session.attendance),
          outcome: this.translateOutcome(session.outcome),
        });
      });
    });

    // Sheet 4: Statistics
    const statsSheet = workbook.addWorksheet('الإحصائيات', {
      properties: { rightToLeft: true },
    });

    const totalPrograms = programs.length;
    const activePrograms = programs.filter(p => p.program_info.status === 'active').length;
    const completedPrograms = programs.filter(p => p.program_info.status === 'completed').length;
    const totalBudget = programs.reduce(
      (sum, p) => sum + (p.program_info.budget_allocated || 0),
      0
    );
    const totalSpent = programs.reduce((sum, p) => sum + (p.program_info.budget_spent || 0), 0);

    statsSheet.addRow(['البيان', 'القيمة']);
    statsSheet.addRow(['إجمالي البرامج', totalPrograms]);
    statsSheet.addRow(['البرامج النشطة', activePrograms]);
    statsSheet.addRow(['البرامج المكتملة', completedPrograms]);
    statsSheet.addRow(['الميزانية الإجمالية', totalBudget]);
    statsSheet.addRow(['الميزانية المصروفة', totalSpent]);
    statsSheet.addRow([
      'معدل النجاح',
      `${((completedPrograms / totalPrograms) * 100).toFixed(2)}%`,
    ]);

    statsSheet.getRow(1).font = { bold: true, size: 14 };
    statsSheet.getColumn(1).width = 30;
    statsSheet.getColumn(2).width = 20;

    // Save workbook
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * Export program to PDF
   * @param {String} programId - Program ID
   * @param {String} filePath - Output file path
   * @returns {String} - File path
   */
  async exportProgramToPDF(programId, filePath) {
    const program = await DisabilityRehabilitation.findById(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Title
    doc.fontSize(20).text('تقرير برنامج التأهيل', { align: 'center' });
    doc.moveDown();

    // Program Information
    doc.fontSize(16).text('معلومات البرنامج', { underline: true });
    doc.fontSize(12);
    doc.text(`اسم البرنامج: ${program.program_info.name_ar}`);
    doc.text(`رقم البرنامج: ${program._id}`);
    doc.text(`الحالة: ${this.translateStatus(program.program_info.status)}`);
    doc.text(`تاريخ البدء: ${this.formatDate(program.program_info.start_date)}`);
    doc.text(
      `تاريخ الانتهاء: ${program.program_info.end_date ? this.formatDate(program.program_info.end_date) : 'مستمر'}`
    );
    doc.moveDown();

    // Beneficiary Information
    doc.fontSize(16).text('بيانات المستفيد', { underline: true });
    doc.fontSize(12);
    doc.text(`الاسم: ${program.beneficiary.name_ar}`);
    doc.text(`رقم المستفيد: ${program.beneficiary.id}`);
    doc.text(`تاريخ الميلاد: ${this.formatDate(program.beneficiary.date_of_birth)}`);
    doc.text(`الجنس: ${program.beneficiary.gender === 'male' ? 'ذكر' : 'أنثى'}`);
    doc.moveDown();

    // Disability Information
    doc.fontSize(16).text('معلومات الإعاقة', { underline: true });
    doc.fontSize(12);
    doc.text(
      `نوع الإعاقة الأساسي: ${this.translateDisabilityType(program.disability_info.primary_disability)}`
    );
    doc.text(`مستوى الشدة: ${this.translateSeverity(program.disability_info.severity_level)}`);
    doc.moveDown();

    // Goals
    doc.fontSize(16).text('الأهداف التأهيلية', { underline: true });
    doc.fontSize(12);
    program.rehabilitation_goals.forEach((goal, index) => {
      doc.text(
        `${index + 1}. ${goal.description_ar} - ${this.translateGoalStatus(goal.status)} (${goal.progress_percentage}%)`
      );
    });
    doc.moveDown();

    // Progress
    doc.fontSize(16).text('التقدم العام', { underline: true });
    doc.fontSize(12);
    doc.text(`نسبة التقدم الكلي: ${program.progress_tracking.overall_progress_percentage}%`);
    doc.text(`معدل إنجاز الأهداف: ${program.progress_tracking.goal_completion_rate}%`);
    doc.moveDown();

    // Sessions Summary
    doc.fontSize(16).text('ملخص الجلسات', { underline: true });
    doc.fontSize(12);
    doc.text(`إجمالي الجلسات: ${program.therapy_sessions.length}`);
    const presentCount = program.therapy_sessions.filter(s => s.attendance === 'present').length;
    doc.text(`الحضور: ${presentCount} جلسة`);
    doc.text(
      `معدل الحضور: ${((presentCount / program.therapy_sessions.length) * 100).toFixed(2)}%`
    );

    // Finalize PDF
    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Import programs from Excel
   * @param {String} filePath - Input file path
   * @returns {Object} - Import results
   */
  async importFromExcel(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.getWorksheet('البرامج') || workbook.getWorksheet(1);
    const programs = [];
    const errors = [];

    sheet.eachRow((row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1) return;

      try {
        const programData = {
          program_info: {
            name_ar: row.getCell(2).value,
            name_en: row.getCell(2).value, // Would need English name in import
            start_date: new Date(row.getCell(7).value),
            end_date: row.getCell(8).value ? new Date(row.getCell(8).value) : undefined,
            status: this.reverseTranslateStatus(row.getCell(5).value),
            severity: this.reverseTranslateSeverity(row.getCell(6).value),
            budget_allocated: parseFloat(row.getCell(10).value) || 0,
            budget_spent: parseFloat(row.getCell(11).value) || 0,
          },
          beneficiary: {
            id: `IMPORT_${Date.now()}_${rowNumber}`,
            name_ar: row.getCell(3).value,
            name_en: row.getCell(3).value,
            date_of_birth: new Date('2000-01-01'), // Default, would need from import
          },
          disability_info: {
            primary_disability: this.reverseTranslateDisabilityType(row.getCell(4).value),
            severity_level: this.reverseTranslateSeverity(row.getCell(6).value),
          },
          rehabilitation_goals: [],
          rehabilitation_services: [],
          created_by: 'import_system',
          updated_by: 'import_system',
        };

        programs.push(programData);
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error.message,
        });
      }
    });

    // Save imported programs
    let savedCount = 0;
    for (const programData of programs) {
      try {
        const program = new DisabilityRehabilitation(programData);
        await program.save();
        savedCount++;
      } catch (error) {
        errors.push({
          program: programData.program_info.name_ar,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      imported: savedCount,
      total: programs.length,
      errors: errors.length > 0 ? errors : null,
    };
  }

  /**
   * Generate Excel template for import
   * @param {String} filePath - Output file path
   * @returns {String} - File path
   */
  async generateImportTemplate(filePath) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('قالب البرامج', {
      properties: { rightToLeft: true },
    });

    sheet.columns = [
      { header: 'اسم البرنامج (عربي)*', key: 'name_ar', width: 30 },
      { header: 'اسم المستفيد*', key: 'beneficiary_name', width: 25 },
      { header: 'نوع الإعاقة*', key: 'disability_type', width: 20 },
      { header: 'الحالة*', key: 'status', width: 15 },
      { header: 'الشدة*', key: 'severity', width: 15 },
      { header: 'تاريخ البدء (YYYY-MM-DD)*', key: 'start_date', width: 25 },
      { header: 'تاريخ الانتهاء (YYYY-MM-DD)', key: 'end_date', width: 25 },
      { header: 'الميزانية المخصصة', key: 'budget_allocated', width: 20 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' },
    };

    // Add example row
    sheet.addRow({
      name_ar: 'برنامج تأهيلي تجريبي',
      beneficiary_name: 'اسم المستفيد',
      disability_type: 'بدنية',
      status: 'نشط',
      severity: 'متوسط',
      start_date: '2026-01-01',
      end_date: '2026-06-30',
      budget_allocated: 50000,
    });

    // Add instructions
    const instructionsSheet = workbook.addWorksheet('التعليمات', {
      properties: { rightToLeft: true },
    });

    instructionsSheet.addRow(['تعليمات الاستخدام']);
    instructionsSheet.addRow(['']);
    instructionsSheet.addRow(['1. احذف الصف التجريبي قبل إضافة البيانات الحقيقية']);
    instructionsSheet.addRow(['2. الحقول المعلمة بـ * إلزامية']);
    instructionsSheet.addRow(['3. استخدم التنسيق YYYY-MM-DD للتواريخ']);
    instructionsSheet.addRow(['']);
    instructionsSheet.addRow(['القيم المسموحة:']);
    instructionsSheet.addRow([
      'نوع الإعاقة: بدنية، بصرية، سمعية، ذهنية، توحد، تعلمية، متعددة، نطق، سلوكية، نمائية',
    ]);
    instructionsSheet.addRow(['الحالة: نشط، معلق، مكتمل، متوقف']);
    instructionsSheet.addRow(['الشدة: خفيف، متوسط، شديد']);

    instructionsSheet.getColumn(1).width = 80;

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  // Helper translation methods
  translateDisabilityType(type) {
    const types = {
      physical: 'بدنية',
      visual: 'بصرية',
      hearing: 'سمعية',
      intellectual: 'ذهنية',
      autism: 'توحد',
      learning: 'تعلمية',
      multiple: 'متعددة',
      speech: 'نطق',
      behavioral: 'سلوكية',
      developmental: 'نمائية',
    };
    return types[type] || type;
  }

  reverseTranslateDisabilityType(arabicType) {
    const types = {
      بدنية: 'physical',
      بصرية: 'visual',
      سمعية: 'hearing',
      ذهنية: 'intellectual',
      توحد: 'autism',
      تعلمية: 'learning',
      متعددة: 'multiple',
      نطق: 'speech',
      سلوكية: 'behavioral',
      نمائية: 'developmental',
    };
    return types[arabicType] || 'physical';
  }

  translateStatus(status) {
    const statuses = {
      active: 'نشط',
      pending: 'معلق',
      completed: 'مكتمل',
      on_hold: 'متوقف',
    };
    return statuses[status] || status;
  }

  reverseTranslateStatus(arabicStatus) {
    const statuses = {
      نشط: 'active',
      معلق: 'pending',
      مكتمل: 'completed',
      متوقف: 'on_hold',
    };
    return statuses[arabicStatus] || 'active';
  }

  translateSeverity(severity) {
    const severities = {
      mild: 'خفيف',
      moderate: 'متوسط',
      severe: 'شديد',
    };
    return severities[severity] || severity;
  }

  reverseTranslateSeverity(arabicSeverity) {
    const severities = {
      خفيف: 'mild',
      متوسط: 'moderate',
      شديد: 'severe',
    };
    return severities[arabicSeverity] || 'moderate';
  }

  translateGoalCategory(category) {
    const categories = {
      mobility: 'الحركة',
      communication: 'التواصل',
      self_care: 'العناية الذاتية',
      independence: 'الاستقلالية',
      social_integration: 'الاندماج الاجتماعي',
      educational: 'تعليمية',
      vocational: 'مهنية',
      emotional_wellbeing: 'الصحة النفسية',
    };
    return categories[category] || category;
  }

  translateGoalStatus(status) {
    const statuses = {
      pending: 'معلق',
      in_progress: 'قيد التنفيذ',
      achieved: 'محقق',
      paused: 'متوقف',
    };
    return statuses[status] || status;
  }

  translatePriority(priority) {
    const priorities = {
      high: 'عالية',
      medium: 'متوسطة',
      low: 'منخفضة',
    };
    return priorities[priority] || priority;
  }

  translateSessionType(type) {
    const types = {
      individual: 'فردية',
      group: 'جماعية',
      family: 'عائلية',
    };
    return types[type] || type;
  }

  translateAttendance(attendance) {
    const attendances = {
      present: 'حاضر',
      absent: 'غائب',
      partially_present: 'حضور جزئي',
    };
    return attendances[attendance] || attendance;
  }

  translateOutcome(outcome) {
    const outcomes = {
      positive: 'إيجابية',
      neutral: 'محايدة',
      negative: 'سلبية',
    };
    return outcomes[outcome] || outcome;
  }

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

module.exports = new ExportImportService();

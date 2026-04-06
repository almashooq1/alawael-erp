/**
 * ImportExport Pro Service
 * ========================
 * خدمة الاستيراد والتصدير الاحترافية الشاملة
 * Professional comprehensive import/export service
 *
 * Features:
 * - Multi-format export (Excel, CSV, JSON, PDF, XML, ZIP)
 * - Multi-format import with validation & preview
 * - Column mapping & data transformation
 * - Progress tracking & batch processing
 * - Template management
 * - Scheduled exports
 * - Data validation engine
 * - Audit logging
 *
 * @module services/importExportPro.service
 */

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { parse: csvParse } = require('csv-parse/sync');
const { stringify: csvStringify } = require('csv-stringify/sync');
const mongoose = require('mongoose');
const _crypto = require('crypto');
const path = require('path');
const _fs = require('fs');
const archiver = require('archiver');
const {
  Document: DocxDocument,
  Packer,
  Paragraph,
  Table: DocxTable,
  TableRow: DocxTableRow,
  TableCell: DocxTableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TextRun,
} = require('docx');
const logger = require('../utils/logger');

const ImportExportJob = require('../models/ImportExportJob');
const ImportExportTemplate = require('../models/ImportExportTemplate');
const { escapeRegex } = require('../utils/sanitize');

// ──────────────────────────────────────────────────────
// Module Registry — maps module names to model references
// ──────────────────────────────────────────────────────
const MODULE_REGISTRY = {
  employees: { model: 'Employee', label: 'الموظفين', labelEn: 'Employees' },
  users: { model: 'User', label: 'المستخدمين', labelEn: 'Users' },
  beneficiaries: { model: 'Beneficiary', label: 'المستفيدين', labelEn: 'Beneficiaries' },
  students: { model: 'Student', label: 'الطلاب', labelEn: 'Students' },
  vehicles: { model: 'Vehicle', label: 'المركبات', labelEn: 'Vehicles' },
  drivers: { model: 'Driver', label: 'السائقين', labelEn: 'Drivers' },
  documents: { model: 'Document', label: 'المستندات', labelEn: 'Documents' },
  invoices: { model: 'Invoice', label: 'الفواتير', labelEn: 'Invoices' },
  expenses: { model: 'Expense', label: 'المصروفات', labelEn: 'Expenses' },
  attendance: { model: 'Attendance', label: 'الحضور والانصراف', labelEn: 'Attendance' },
  leaves: { model: 'Leave', label: 'الإجازات', labelEn: 'Leaves' },
  sessions: { model: 'TherapySession', label: 'الجلسات', labelEn: 'Sessions' },
  assessments: { model: 'Assessment', label: 'التقييمات', labelEn: 'Assessments' },
  inventory: { model: 'InventoryItem', label: 'المخزون', labelEn: 'Inventory' },
  suppliers: { model: 'Supplier', label: 'الموردين', labelEn: 'Suppliers' },
  purchase_orders: { model: 'PurchaseOrder', label: 'أوامر الشراء', labelEn: 'Purchase Orders' },
  departments: { model: 'Department', label: 'الأقسام', labelEn: 'Departments' },
  contracts: { model: 'Contract', label: 'العقود', labelEn: 'Contracts' },
  tasks: { model: 'Task', label: 'المهام', labelEn: 'Tasks' },
  reports: { model: 'Report', label: 'التقارير', labelEn: 'Reports' },
  // fleet_maintenance: model removed — no FleetMaintenance Mongoose model exists
  // Re-add when a fleet maintenance model is created
  fleet_fuel: { model: 'FleetFuel', label: 'وقود الأسطول', labelEn: 'Fleet Fuel' },
  traffic_fines: { model: 'TrafficFine', label: 'المخالفات المرورية', labelEn: 'Traffic Fines' },
  payroll: { model: 'Payroll', label: 'الرواتب', labelEn: 'Payroll' },
  notifications: { model: 'Notification', label: 'الإشعارات', labelEn: 'Notifications' },

  // ─── Phase 25: Medical Systems ───
  pharmacy: { model: 'PharmacyInventory', label: 'الصيدلية', labelEn: 'Pharmacy' },
  appointments: {
    model: 'ScheduleTemplate',
    label: 'جدولة المواعيد',
    labelEn: 'Appointment Scheduling',
  },
  insurance_claims: {
    model: 'InsuranceClaim',
    label: 'مطالبات التأمين',
    labelEn: 'Insurance Claims',
  },
  medical_equipment: {
    model: 'MedicalEquipment',
    label: 'المعدات الطبية',
    labelEn: 'Medical Equipment',
  },
  medical_referrals: {
    model: 'MedicalReferral',
    label: 'التحويلات الطبية',
    labelEn: 'Medical Referrals',
  },
  emr: {
    model: 'MedicalRecord',
    label: 'السجلات الطبية الإلكترونية',
    labelEn: 'Electronic Medical Records',
  },
};

// ──────────────────────────────────────────────────────
// System Templates for common module fields
// ──────────────────────────────────────────────────────
const SYSTEM_TEMPLATES = {
  employees: [
    {
      key: 'employeeId',
      name: 'Employee ID',
      nameAr: 'رقم الموظف',
      dataType: 'string',
      required: true,
    },
    { key: 'name', name: 'Full Name', nameAr: 'الاسم الكامل', dataType: 'string', required: true },
    { key: 'nameAr', name: 'Arabic Name', nameAr: 'الاسم بالعربي', dataType: 'string' },
    { key: 'email', name: 'Email', nameAr: 'البريد الإلكتروني', dataType: 'email', required: true },
    { key: 'phone', name: 'Phone', nameAr: 'الهاتف', dataType: 'phone' },
    { key: 'department', name: 'Department', nameAr: 'القسم', dataType: 'string' },
    { key: 'position', name: 'Position', nameAr: 'المنصب', dataType: 'string' },
    {
      key: 'hireDate',
      name: 'Hire Date',
      nameAr: 'تاريخ التعيين',
      dataType: 'date',
      format: 'YYYY-MM-DD',
    },
    { key: 'salary', name: 'Salary', nameAr: 'الراتب', dataType: 'currency' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['active', 'inactive', 'suspended'],
    },
    { key: 'nationality', name: 'Nationality', nameAr: 'الجنسية', dataType: 'string' },
    { key: 'idNumber', name: 'ID Number', nameAr: 'رقم الهوية', dataType: 'string' },
  ],
  beneficiaries: [
    {
      key: 'beneficiaryId',
      name: 'Beneficiary ID',
      nameAr: 'رقم المستفيد',
      dataType: 'string',
      required: true,
    },
    { key: 'name', name: 'Full Name', nameAr: 'الاسم الكامل', dataType: 'string', required: true },
    { key: 'dateOfBirth', name: 'Date of Birth', nameAr: 'تاريخ الميلاد', dataType: 'date' },
    { key: 'disabilityType', name: 'Disability Type', nameAr: 'نوع الإعاقة', dataType: 'string' },
    {
      key: 'severity',
      name: 'Severity',
      nameAr: 'درجة الشدة',
      dataType: 'select',
      options: ['mild', 'moderate', 'severe'],
    },
    { key: 'guardian', name: 'Guardian Name', nameAr: 'اسم ولي الأمر', dataType: 'string' },
    { key: 'phone', name: 'Phone', nameAr: 'الهاتف', dataType: 'phone' },
    { key: 'enrollmentDate', name: 'Enrollment Date', nameAr: 'تاريخ التسجيل', dataType: 'date' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['active', 'inactive', 'graduated'],
    },
  ],
  vehicles: [
    {
      key: 'plateNumber',
      name: 'Plate Number',
      nameAr: 'رقم اللوحة',
      dataType: 'string',
      required: true,
    },
    { key: 'make', name: 'Make', nameAr: 'الشركة المصنعة', dataType: 'string' },
    { key: 'model', name: 'Model', nameAr: 'الموديل', dataType: 'string' },
    { key: 'year', name: 'Year', nameAr: 'السنة', dataType: 'number' },
    {
      key: 'type',
      name: 'Vehicle Type',
      nameAr: 'نوع المركبة',
      dataType: 'select',
      options: ['sedan', 'suv', 'van', 'bus', 'truck'],
    },
    { key: 'color', name: 'Color', nameAr: 'اللون', dataType: 'string' },
    { key: 'vin', name: 'VIN', nameAr: 'رقم الهيكل', dataType: 'string' },
    { key: 'mileage', name: 'Mileage (km)', nameAr: 'المسافة المقطوعة', dataType: 'number' },
    {
      key: 'fuelType',
      name: 'Fuel Type',
      nameAr: 'نوع الوقود',
      dataType: 'select',
      options: ['gasoline', 'diesel', 'electric', 'hybrid'],
    },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['active', 'maintenance', 'retired'],
    },
  ],
  invoices: [
    {
      key: 'invoiceNumber',
      name: 'Invoice Number',
      nameAr: 'رقم الفاتورة',
      dataType: 'string',
      required: true,
    },
    { key: 'date', name: 'Date', nameAr: 'التاريخ', dataType: 'date', required: true },
    { key: 'clientName', name: 'Client', nameAr: 'العميل', dataType: 'string' },
    { key: 'amount', name: 'Amount', nameAr: 'المبلغ', dataType: 'currency', required: true },
    { key: 'tax', name: 'Tax', nameAr: 'الضريبة', dataType: 'currency' },
    { key: 'total', name: 'Total', nameAr: 'الإجمالي', dataType: 'currency' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    },
    { key: 'dueDate', name: 'Due Date', nameAr: 'تاريخ الاستحقاق', dataType: 'date' },
    { key: 'description', name: 'Description', nameAr: 'الوصف', dataType: 'string' },
  ],

  // ─── Users ───
  users: [
    { key: 'name', name: 'Full Name', nameAr: 'الاسم الكامل', dataType: 'string', required: true },
    { key: 'email', name: 'Email', nameAr: 'البريد الإلكتروني', dataType: 'email', required: true },
    { key: 'phone', name: 'Phone', nameAr: 'الهاتف', dataType: 'phone' },
    {
      key: 'role',
      name: 'Role',
      nameAr: 'الدور',
      dataType: 'select',
      options: ['admin', 'manager', 'user', 'viewer'],
    },
    { key: 'department', name: 'Department', nameAr: 'القسم', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['active', 'inactive', 'suspended'],
    },
    { key: 'lastLogin', name: 'Last Login', nameAr: 'آخر دخول', dataType: 'date' },
  ],

  // ─── Students ───
  students: [
    {
      key: 'studentId',
      name: 'Student ID',
      nameAr: 'رقم الطالب',
      dataType: 'string',
      required: true,
    },
    { key: 'name', name: 'Full Name', nameAr: 'الاسم الكامل', dataType: 'string', required: true },
    { key: 'nameAr', name: 'Arabic Name', nameAr: 'الاسم بالعربي', dataType: 'string' },
    { key: 'dateOfBirth', name: 'Date of Birth', nameAr: 'تاريخ الميلاد', dataType: 'date' },
    {
      key: 'gender',
      name: 'Gender',
      nameAr: 'الجنس',
      dataType: 'select',
      options: ['male', 'female'],
    },
    { key: 'grade', name: 'Grade', nameAr: 'الصف', dataType: 'string' },
    { key: 'classroom', name: 'Classroom', nameAr: 'الفصل', dataType: 'string' },
    { key: 'guardianName', name: 'Guardian Name', nameAr: 'ولي الأمر', dataType: 'string' },
    { key: 'guardianPhone', name: 'Guardian Phone', nameAr: 'هاتف ولي الأمر', dataType: 'phone' },
    { key: 'enrollmentDate', name: 'Enrollment Date', nameAr: 'تاريخ التسجيل', dataType: 'date' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['active', 'inactive', 'graduated', 'transferred'],
    },
    { key: 'notes', name: 'Notes', nameAr: 'ملاحظات', dataType: 'string' },
  ],

  // ─── Drivers ───
  drivers: [
    {
      key: 'driverId',
      name: 'Driver ID',
      nameAr: 'رقم السائق',
      dataType: 'string',
      required: true,
    },
    { key: 'name', name: 'Full Name', nameAr: 'الاسم الكامل', dataType: 'string', required: true },
    { key: 'phone', name: 'Phone', nameAr: 'الهاتف', dataType: 'phone', required: true },
    { key: 'licenseNumber', name: 'License Number', nameAr: 'رقم الرخصة', dataType: 'string' },
    { key: 'licenseExpiry', name: 'License Expiry', nameAr: 'انتهاء الرخصة', dataType: 'date' },
    { key: 'idNumber', name: 'ID Number', nameAr: 'رقم الهوية', dataType: 'string' },
    {
      key: 'assignedVehicle',
      name: 'Assigned Vehicle',
      nameAr: 'المركبة المعينة',
      dataType: 'string',
    },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['active', 'inactive', 'on_leave'],
    },
    { key: 'hireDate', name: 'Hire Date', nameAr: 'تاريخ التعيين', dataType: 'date' },
    { key: 'salary', name: 'Salary', nameAr: 'الراتب', dataType: 'currency' },
  ],

  // ─── Documents ───
  documents: [
    { key: 'title', name: 'Title', nameAr: 'العنوان', dataType: 'string', required: true },
    {
      key: 'type',
      name: 'Document Type',
      nameAr: 'نوع المستند',
      dataType: 'select',
      options: ['contract', 'report', 'letter', 'certificate', 'other'],
    },
    { key: 'category', name: 'Category', nameAr: 'التصنيف', dataType: 'string' },
    { key: 'issueDate', name: 'Issue Date', nameAr: 'تاريخ الإصدار', dataType: 'date' },
    { key: 'expiryDate', name: 'Expiry Date', nameAr: 'تاريخ الانتهاء', dataType: 'date' },
    { key: 'relatedTo', name: 'Related To', nameAr: 'مرتبط بـ', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['active', 'expired', 'archived'],
    },
    { key: 'notes', name: 'Notes', nameAr: 'ملاحظات', dataType: 'string' },
  ],

  // ─── Expenses ───
  expenses: [
    {
      key: 'expenseId',
      name: 'Expense ID',
      nameAr: 'رقم المصروف',
      dataType: 'string',
      required: true,
    },
    { key: 'date', name: 'Date', nameAr: 'التاريخ', dataType: 'date', required: true },
    {
      key: 'category',
      name: 'Category',
      nameAr: 'التصنيف',
      dataType: 'select',
      options: ['supplies', 'services', 'maintenance', 'travel', 'utilities', 'other'],
    },
    { key: 'description', name: 'Description', nameAr: 'الوصف', dataType: 'string' },
    { key: 'amount', name: 'Amount', nameAr: 'المبلغ', dataType: 'currency', required: true },
    { key: 'tax', name: 'Tax', nameAr: 'الضريبة', dataType: 'currency' },
    { key: 'total', name: 'Total', nameAr: 'الإجمالي', dataType: 'currency' },
    {
      key: 'paymentMethod',
      name: 'Payment Method',
      nameAr: 'طريقة الدفع',
      dataType: 'select',
      options: ['cash', 'bank_transfer', 'credit_card', 'check'],
    },
    { key: 'vendor', name: 'Vendor', nameAr: 'المورد', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['pending', 'approved', 'rejected', 'paid'],
    },
    { key: 'approvedBy', name: 'Approved By', nameAr: 'اعتمد بواسطة', dataType: 'string' },
  ],

  // ─── Attendance ───
  attendance: [
    {
      key: 'employeeId',
      name: 'Employee ID',
      nameAr: 'رقم الموظف',
      dataType: 'string',
      required: true,
    },
    { key: 'employeeName', name: 'Employee Name', nameAr: 'اسم الموظف', dataType: 'string' },
    { key: 'date', name: 'Date', nameAr: 'التاريخ', dataType: 'date', required: true },
    {
      key: 'checkIn',
      name: 'Check In',
      nameAr: 'وقت الحضور',
      dataType: 'string',
      example: '08:00',
    },
    {
      key: 'checkOut',
      name: 'Check Out',
      nameAr: 'وقت الانصراف',
      dataType: 'string',
      example: '16:00',
    },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['present', 'absent', 'late', 'half_day', 'on_leave'],
    },
    { key: 'hoursWorked', name: 'Hours Worked', nameAr: 'ساعات العمل', dataType: 'number' },
    { key: 'overtime', name: 'Overtime', nameAr: 'ساعات إضافية', dataType: 'number' },
    { key: 'notes', name: 'Notes', nameAr: 'ملاحظات', dataType: 'string' },
  ],

  // ─── Leaves ───
  leaves: [
    {
      key: 'employeeId',
      name: 'Employee ID',
      nameAr: 'رقم الموظف',
      dataType: 'string',
      required: true,
    },
    { key: 'employeeName', name: 'Employee Name', nameAr: 'اسم الموظف', dataType: 'string' },
    {
      key: 'leaveType',
      name: 'Leave Type',
      nameAr: 'نوع الإجازة',
      dataType: 'select',
      options: ['annual', 'sick', 'unpaid', 'maternity', 'emergency', 'hajj'],
    },
    {
      key: 'startDate',
      name: 'Start Date',
      nameAr: 'تاريخ البداية',
      dataType: 'date',
      required: true,
    },
    { key: 'endDate', name: 'End Date', nameAr: 'تاريخ النهاية', dataType: 'date', required: true },
    { key: 'days', name: 'Days', nameAr: 'عدد الأيام', dataType: 'number' },
    { key: 'reason', name: 'Reason', nameAr: 'السبب', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['pending', 'approved', 'rejected', 'cancelled'],
    },
    { key: 'approvedBy', name: 'Approved By', nameAr: 'اعتمد بواسطة', dataType: 'string' },
  ],

  // ─── Sessions (Therapy) ───
  sessions: [
    {
      key: 'sessionId',
      name: 'Session ID',
      nameAr: 'رقم الجلسة',
      dataType: 'string',
      required: true,
    },
    {
      key: 'beneficiaryName',
      name: 'Beneficiary',
      nameAr: 'المستفيد',
      dataType: 'string',
      required: true,
    },
    { key: 'therapistName', name: 'Therapist', nameAr: 'المعالج', dataType: 'string' },
    {
      key: 'sessionType',
      name: 'Session Type',
      nameAr: 'نوع الجلسة',
      dataType: 'select',
      options: ['individual', 'group', 'assessment', 'follow_up'],
    },
    { key: 'date', name: 'Date', nameAr: 'التاريخ', dataType: 'date', required: true },
    { key: 'duration', name: 'Duration (min)', nameAr: 'المدة (دقيقة)', dataType: 'number' },
    { key: 'goals', name: 'Goals', nameAr: 'الأهداف', dataType: 'string' },
    { key: 'notes', name: 'Notes', nameAr: 'ملاحظات', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['scheduled', 'completed', 'cancelled', 'no_show'],
    },
  ],

  // ─── Assessments ───
  assessments: [
    {
      key: 'assessmentId',
      name: 'Assessment ID',
      nameAr: 'رقم التقييم',
      dataType: 'string',
      required: true,
    },
    {
      key: 'beneficiaryName',
      name: 'Beneficiary',
      nameAr: 'المستفيد',
      dataType: 'string',
      required: true,
    },
    { key: 'assessorName', name: 'Assessor', nameAr: 'المقيّم', dataType: 'string' },
    {
      key: 'type',
      name: 'Assessment Type',
      nameAr: 'نوع التقييم',
      dataType: 'select',
      options: ['initial', 'periodic', 'final', 'progress'],
    },
    { key: 'date', name: 'Date', nameAr: 'التاريخ', dataType: 'date', required: true },
    { key: 'score', name: 'Score', nameAr: 'الدرجة', dataType: 'number' },
    { key: 'maxScore', name: 'Max Score', nameAr: 'الدرجة القصوى', dataType: 'number' },
    { key: 'category', name: 'Category', nameAr: 'المجال', dataType: 'string' },
    { key: 'recommendations', name: 'Recommendations', nameAr: 'التوصيات', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['draft', 'completed', 'reviewed'],
    },
  ],

  // ─── Inventory ───
  inventory: [
    { key: 'itemCode', name: 'Item Code', nameAr: 'رمز الصنف', dataType: 'string', required: true },
    { key: 'name', name: 'Item Name', nameAr: 'اسم الصنف', dataType: 'string', required: true },
    { key: 'nameAr', name: 'Arabic Name', nameAr: 'الاسم بالعربي', dataType: 'string' },
    { key: 'category', name: 'Category', nameAr: 'التصنيف', dataType: 'string' },
    {
      key: 'unit',
      name: 'Unit',
      nameAr: 'الوحدة',
      dataType: 'select',
      options: ['piece', 'kg', 'liter', 'meter', 'box', 'pack'],
    },
    { key: 'quantity', name: 'Quantity', nameAr: 'الكمية', dataType: 'number', required: true },
    { key: 'minQuantity', name: 'Min Quantity', nameAr: 'الحد الأدنى', dataType: 'number' },
    { key: 'unitPrice', name: 'Unit Price', nameAr: 'سعر الوحدة', dataType: 'currency' },
    { key: 'totalValue', name: 'Total Value', nameAr: 'القيمة الإجمالية', dataType: 'currency' },
    { key: 'location', name: 'Location', nameAr: 'الموقع', dataType: 'string' },
    { key: 'supplier', name: 'Supplier', nameAr: 'المورد', dataType: 'string' },
    { key: 'lastRestocked', name: 'Last Restocked', nameAr: 'آخر تزويد', dataType: 'date' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
    },
  ],

  // ─── Suppliers ───
  suppliers: [
    {
      key: 'supplierCode',
      name: 'Supplier Code',
      nameAr: 'رمز المورد',
      dataType: 'string',
      required: true,
    },
    { key: 'name', name: 'Company Name', nameAr: 'اسم الشركة', dataType: 'string', required: true },
    { key: 'contactPerson', name: 'Contact Person', nameAr: 'شخص الاتصال', dataType: 'string' },
    { key: 'email', name: 'Email', nameAr: 'البريد الإلكتروني', dataType: 'email' },
    { key: 'phone', name: 'Phone', nameAr: 'الهاتف', dataType: 'phone' },
    { key: 'address', name: 'Address', nameAr: 'العنوان', dataType: 'string' },
    { key: 'city', name: 'City', nameAr: 'المدينة', dataType: 'string' },
    { key: 'taxNumber', name: 'Tax Number (VAT)', nameAr: 'الرقم الضريبي', dataType: 'string' },
    { key: 'category', name: 'Category', nameAr: 'التصنيف', dataType: 'string' },
    {
      key: 'paymentTerms',
      name: 'Payment Terms',
      nameAr: 'شروط الدفع',
      dataType: 'select',
      options: ['cash', 'net_15', 'net_30', 'net_60'],
    },
    { key: 'rating', name: 'Rating', nameAr: 'التقييم', dataType: 'number', description: '1-5' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['active', 'inactive', 'blacklisted'],
    },
  ],

  // ─── Purchase Orders ───
  purchase_orders: [
    {
      key: 'poNumber',
      name: 'PO Number',
      nameAr: 'رقم أمر الشراء',
      dataType: 'string',
      required: true,
    },
    { key: 'date', name: 'Date', nameAr: 'التاريخ', dataType: 'date', required: true },
    { key: 'supplierName', name: 'Supplier', nameAr: 'المورد', dataType: 'string', required: true },
    { key: 'items', name: 'Items Description', nameAr: 'وصف الأصناف', dataType: 'string' },
    { key: 'quantity', name: 'Total Quantity', nameAr: 'إجمالي الكمية', dataType: 'number' },
    { key: 'unitPrice', name: 'Unit Price', nameAr: 'سعر الوحدة', dataType: 'currency' },
    {
      key: 'totalAmount',
      name: 'Total Amount',
      nameAr: 'المبلغ الإجمالي',
      dataType: 'currency',
      required: true,
    },
    { key: 'tax', name: 'Tax', nameAr: 'الضريبة', dataType: 'currency' },
    { key: 'deliveryDate', name: 'Delivery Date', nameAr: 'تاريخ التسليم', dataType: 'date' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['draft', 'pending', 'approved', 'received', 'cancelled'],
    },
    { key: 'approvedBy', name: 'Approved By', nameAr: 'اعتمد بواسطة', dataType: 'string' },
  ],

  // ─── Departments ───
  departments: [
    {
      key: 'code',
      name: 'Department Code',
      nameAr: 'رمز القسم',
      dataType: 'string',
      required: true,
    },
    {
      key: 'name',
      name: 'Department Name',
      nameAr: 'اسم القسم',
      dataType: 'string',
      required: true,
    },
    { key: 'nameAr', name: 'Arabic Name', nameAr: 'الاسم بالعربي', dataType: 'string' },
    { key: 'manager', name: 'Manager', nameAr: 'المدير', dataType: 'string' },
    {
      key: 'parentDepartment',
      name: 'Parent Department',
      nameAr: 'القسم الرئيسي',
      dataType: 'string',
    },
    { key: 'employeeCount', name: 'Employee Count', nameAr: 'عدد الموظفين', dataType: 'number' },
    { key: 'budget', name: 'Budget', nameAr: 'الميزانية', dataType: 'currency' },
    { key: 'location', name: 'Location', nameAr: 'الموقع', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['active', 'inactive'],
    },
  ],

  // ─── Contracts ───
  contracts: [
    {
      key: 'contractNumber',
      name: 'Contract Number',
      nameAr: 'رقم العقد',
      dataType: 'string',
      required: true,
    },
    { key: 'title', name: 'Title', nameAr: 'العنوان', dataType: 'string', required: true },
    {
      key: 'type',
      name: 'Contract Type',
      nameAr: 'نوع العقد',
      dataType: 'select',
      options: ['employment', 'vendor', 'service', 'rental', 'maintenance'],
    },
    {
      key: 'partyName',
      name: 'Party Name',
      nameAr: 'اسم الطرف',
      dataType: 'string',
      required: true,
    },
    {
      key: 'startDate',
      name: 'Start Date',
      nameAr: 'تاريخ البداية',
      dataType: 'date',
      required: true,
    },
    { key: 'endDate', name: 'End Date', nameAr: 'تاريخ النهاية', dataType: 'date' },
    { key: 'value', name: 'Contract Value', nameAr: 'قيمة العقد', dataType: 'currency' },
    {
      key: 'paymentFrequency',
      name: 'Payment Frequency',
      nameAr: 'دورة الدفع',
      dataType: 'select',
      options: ['monthly', 'quarterly', 'annually', 'one_time'],
    },
    { key: 'autoRenew', name: 'Auto Renew', nameAr: 'تجديد تلقائي', dataType: 'boolean' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['draft', 'active', 'expired', 'terminated', 'renewed'],
    },
    { key: 'notes', name: 'Notes', nameAr: 'ملاحظات', dataType: 'string' },
  ],

  // ─── Tasks ───
  tasks: [
    { key: 'taskId', name: 'Task ID', nameAr: 'رقم المهمة', dataType: 'string', required: true },
    { key: 'title', name: 'Title', nameAr: 'العنوان', dataType: 'string', required: true },
    { key: 'description', name: 'Description', nameAr: 'الوصف', dataType: 'string' },
    { key: 'assignedTo', name: 'Assigned To', nameAr: 'مسند إلى', dataType: 'string' },
    {
      key: 'priority',
      name: 'Priority',
      nameAr: 'الأولوية',
      dataType: 'select',
      options: ['low', 'medium', 'high', 'urgent'],
    },
    { key: 'dueDate', name: 'Due Date', nameAr: 'تاريخ الاستحقاق', dataType: 'date' },
    { key: 'category', name: 'Category', nameAr: 'التصنيف', dataType: 'string' },
    {
      key: 'estimatedHours',
      name: 'Estimated Hours',
      nameAr: 'الساعات المقدرة',
      dataType: 'number',
    },
    { key: 'progress', name: 'Progress %', nameAr: 'نسبة الإنجاز', dataType: 'number' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['todo', 'in_progress', 'review', 'completed', 'cancelled'],
    },
  ],

  // ─── Fleet Maintenance ───
  fleet_maintenance: [
    {
      key: 'maintenanceId',
      name: 'Maintenance ID',
      nameAr: 'رقم الصيانة',
      dataType: 'string',
      required: true,
    },
    {
      key: 'vehiclePlate',
      name: 'Vehicle Plate',
      nameAr: 'لوحة المركبة',
      dataType: 'string',
      required: true,
    },
    {
      key: 'type',
      name: 'Maintenance Type',
      nameAr: 'نوع الصيانة',
      dataType: 'select',
      options: ['preventive', 'corrective', 'scheduled', 'emergency'],
    },
    { key: 'description', name: 'Description', nameAr: 'الوصف', dataType: 'string' },
    { key: 'scheduledDate', name: 'Scheduled Date', nameAr: 'التاريخ المقرر', dataType: 'date' },
    { key: 'completedDate', name: 'Completed Date', nameAr: 'تاريخ الإنجاز', dataType: 'date' },
    { key: 'mileageAtService', name: 'Mileage', nameAr: 'المسافة عند الصيانة', dataType: 'number' },
    { key: 'cost', name: 'Cost', nameAr: 'التكلفة', dataType: 'currency' },
    { key: 'vendor', name: 'Vendor', nameAr: 'مركز الصيانة', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    },
  ],

  // ─── Fleet Fuel ───
  fleet_fuel: [
    {
      key: 'fuelId',
      name: 'Fuel Record ID',
      nameAr: 'رقم سجل الوقود',
      dataType: 'string',
      required: true,
    },
    {
      key: 'vehiclePlate',
      name: 'Vehicle Plate',
      nameAr: 'لوحة المركبة',
      dataType: 'string',
      required: true,
    },
    { key: 'driverName', name: 'Driver', nameAr: 'السائق', dataType: 'string' },
    { key: 'date', name: 'Date', nameAr: 'التاريخ', dataType: 'date', required: true },
    {
      key: 'fuelType',
      name: 'Fuel Type',
      nameAr: 'نوع الوقود',
      dataType: 'select',
      options: ['gasoline_91', 'gasoline_95', 'diesel'],
    },
    { key: 'liters', name: 'Liters', nameAr: 'اللترات', dataType: 'number', required: true },
    { key: 'pricePerLiter', name: 'Price/Liter', nameAr: 'سعر اللتر', dataType: 'currency' },
    { key: 'totalCost', name: 'Total Cost', nameAr: 'التكلفة الإجمالية', dataType: 'currency' },
    { key: 'mileage', name: 'Mileage', nameAr: 'عداد المسافة', dataType: 'number' },
    { key: 'station', name: 'Station', nameAr: 'المحطة', dataType: 'string' },
  ],

  // ─── Traffic Fines ───
  traffic_fines: [
    {
      key: 'fineNumber',
      name: 'Fine Number',
      nameAr: 'رقم المخالفة',
      dataType: 'string',
      required: true,
    },
    {
      key: 'vehiclePlate',
      name: 'Vehicle Plate',
      nameAr: 'لوحة المركبة',
      dataType: 'string',
      required: true,
    },
    { key: 'driverName', name: 'Driver', nameAr: 'السائق', dataType: 'string' },
    { key: 'violationType', name: 'Violation Type', nameAr: 'نوع المخالفة', dataType: 'string' },
    { key: 'date', name: 'Date', nameAr: 'التاريخ', dataType: 'date', required: true },
    { key: 'location', name: 'Location', nameAr: 'الموقع', dataType: 'string' },
    {
      key: 'amount',
      name: 'Fine Amount',
      nameAr: 'مبلغ المخالفة',
      dataType: 'currency',
      required: true,
    },
    { key: 'paidDate', name: 'Paid Date', nameAr: 'تاريخ الدفع', dataType: 'date' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['unpaid', 'paid', 'appealed', 'dismissed'],
    },
    {
      key: 'responsibility',
      name: 'Responsibility',
      nameAr: 'المسؤولية',
      dataType: 'select',
      options: ['driver', 'company'],
    },
  ],

  // ─── Payroll ───
  payroll: [
    {
      key: 'employeeId',
      name: 'Employee ID',
      nameAr: 'رقم الموظف',
      dataType: 'string',
      required: true,
    },
    { key: 'employeeName', name: 'Employee Name', nameAr: 'اسم الموظف', dataType: 'string' },
    {
      key: 'month',
      name: 'Month',
      nameAr: 'الشهر',
      dataType: 'string',
      example: '2026-01',
      required: true,
    },
    {
      key: 'basicSalary',
      name: 'Basic Salary',
      nameAr: 'الراتب الأساسي',
      dataType: 'currency',
      required: true,
    },
    {
      key: 'housingAllowance',
      name: 'Housing Allowance',
      nameAr: 'بدل السكن',
      dataType: 'currency',
    },
    {
      key: 'transportAllowance',
      name: 'Transport Allowance',
      nameAr: 'بدل النقل',
      dataType: 'currency',
    },
    {
      key: 'otherAllowances',
      name: 'Other Allowances',
      nameAr: 'بدلات أخرى',
      dataType: 'currency',
    },
    { key: 'overtime', name: 'Overtime Pay', nameAr: 'أجر إضافي', dataType: 'currency' },
    { key: 'deductions', name: 'Deductions', nameAr: 'الخصومات', dataType: 'currency' },
    { key: 'gosiDeduction', name: 'GOSI Deduction', nameAr: 'خصم التأمينات', dataType: 'currency' },
    { key: 'netSalary', name: 'Net Salary', nameAr: 'صافي الراتب', dataType: 'currency' },
    { key: 'paymentDate', name: 'Payment Date', nameAr: 'تاريخ الصرف', dataType: 'date' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['draft', 'approved', 'paid', 'cancelled'],
    },
  ],

  // ─── Phase 25: Medical Systems ───
  pharmacy: [
    {
      key: 'medicationName',
      name: 'Medication Name',
      nameAr: 'اسم الدواء',
      dataType: 'string',
      required: true,
    },
    { key: 'genericName', name: 'Generic Name', nameAr: 'الاسم العلمي', dataType: 'string' },
    {
      key: 'dosageForm',
      name: 'Dosage Form',
      nameAr: 'الشكل الصيدلي',
      dataType: 'select',
      options: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler'],
    },
    { key: 'strength', name: 'Strength', nameAr: 'التركيز', dataType: 'string' },
    { key: 'manufacturer', name: 'Manufacturer', nameAr: 'الشركة المصنعة', dataType: 'string' },
    { key: 'batchNumber', name: 'Batch Number', nameAr: 'رقم التشغيلة', dataType: 'string' },
    { key: 'expiryDate', name: 'Expiry Date', nameAr: 'تاريخ الانتهاء', dataType: 'date' },
    {
      key: 'quantityInStock',
      name: 'Quantity in Stock',
      nameAr: 'الكمية المتوفرة',
      dataType: 'number',
      required: true,
    },
    { key: 'reorderLevel', name: 'Reorder Level', nameAr: 'حد إعادة الطلب', dataType: 'number' },
    { key: 'unitPrice', name: 'Unit Price', nameAr: 'سعر الوحدة', dataType: 'currency' },
    {
      key: 'category',
      name: 'Category',
      nameAr: 'التصنيف',
      dataType: 'select',
      options: ['prescription', 'otc', 'controlled', 'supplement'],
    },
    {
      key: 'storageConditions',
      name: 'Storage Conditions',
      nameAr: 'ظروف التخزين',
      dataType: 'select',
      options: ['room_temperature', 'refrigerated', 'frozen'],
    },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['available', 'low_stock', 'out_of_stock', 'expired', 'recalled'],
    },
  ],
  appointments: [
    {
      key: 'appointmentId',
      name: 'Appointment ID',
      nameAr: 'رقم الموعد',
      dataType: 'string',
      required: true,
    },
    {
      key: 'patientName',
      name: 'Patient Name',
      nameAr: 'اسم المريض',
      dataType: 'string',
      required: true,
    },
    {
      key: 'doctorName',
      name: 'Doctor Name',
      nameAr: 'اسم الطبيب',
      dataType: 'string',
      required: true,
    },
    { key: 'department', name: 'Department', nameAr: 'القسم', dataType: 'string' },
    {
      key: 'appointmentDate',
      name: 'Appointment Date',
      nameAr: 'تاريخ الموعد',
      dataType: 'date',
      required: true,
    },
    {
      key: 'timeSlot',
      name: 'Time Slot',
      nameAr: 'الفترة الزمنية',
      dataType: 'string',
      example: '09:00-09:30',
    },
    {
      key: 'type',
      name: 'Type',
      nameAr: 'النوع',
      dataType: 'select',
      options: ['new_visit', 'follow_up', 'consultation', 'emergency', 'telemedicine'],
    },
    {
      key: 'priority',
      name: 'Priority',
      nameAr: 'الأولوية',
      dataType: 'select',
      options: ['normal', 'urgent', 'emergency'],
    },
    { key: 'reason', name: 'Reason', nameAr: 'سبب الزيارة', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: [
        'scheduled',
        'confirmed',
        'checked_in',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
      ],
    },
    { key: 'notes', name: 'Notes', nameAr: 'ملاحظات', dataType: 'string' },
  ],
  insurance_claims: [
    {
      key: 'claimNumber',
      name: 'Claim Number',
      nameAr: 'رقم المطالبة',
      dataType: 'string',
      required: true,
    },
    {
      key: 'patientName',
      name: 'Patient Name',
      nameAr: 'اسم المريض',
      dataType: 'string',
      required: true,
    },
    {
      key: 'insuranceProvider',
      name: 'Insurance Provider',
      nameAr: 'شركة التأمين',
      dataType: 'string',
      required: true,
    },
    { key: 'policyNumber', name: 'Policy Number', nameAr: 'رقم الوثيقة', dataType: 'string' },
    {
      key: 'claimDate',
      name: 'Claim Date',
      nameAr: 'تاريخ المطالبة',
      dataType: 'date',
      required: true,
    },
    { key: 'serviceDate', name: 'Service Date', nameAr: 'تاريخ الخدمة', dataType: 'date' },
    {
      key: 'diagnosisCode',
      name: 'Diagnosis Code (ICD)',
      nameAr: 'رمز التشخيص',
      dataType: 'string',
    },
    {
      key: 'procedureCode',
      name: 'Procedure Code (CPT)',
      nameAr: 'رمز الإجراء',
      dataType: 'string',
    },
    {
      key: 'claimedAmount',
      name: 'Claimed Amount',
      nameAr: 'المبلغ المطالب',
      dataType: 'currency',
      required: true,
    },
    {
      key: 'approvedAmount',
      name: 'Approved Amount',
      nameAr: 'المبلغ المعتمد',
      dataType: 'currency',
    },
    { key: 'patientShare', name: 'Patient Share', nameAr: 'حصة المريض', dataType: 'currency' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: [
        'submitted',
        'under_review',
        'approved',
        'partially_approved',
        'rejected',
        'paid',
        'appealed',
      ],
    },
    { key: 'rejectionReason', name: 'Rejection Reason', nameAr: 'سبب الرفض', dataType: 'string' },
  ],
  medical_equipment: [
    {
      key: 'equipmentId',
      name: 'Equipment ID',
      nameAr: 'رقم المعدة',
      dataType: 'string',
      required: true,
    },
    {
      key: 'name',
      name: 'Equipment Name',
      nameAr: 'اسم المعدة',
      dataType: 'string',
      required: true,
    },
    {
      key: 'category',
      name: 'Category',
      nameAr: 'التصنيف',
      dataType: 'select',
      options: [
        'diagnostic',
        'therapeutic',
        'surgical',
        'monitoring',
        'laboratory',
        'rehabilitation',
      ],
    },
    { key: 'manufacturer', name: 'Manufacturer', nameAr: 'الشركة المصنعة', dataType: 'string' },
    { key: 'model', name: 'Model', nameAr: 'الموديل', dataType: 'string' },
    { key: 'serialNumber', name: 'Serial Number', nameAr: 'الرقم التسلسلي', dataType: 'string' },
    { key: 'purchaseDate', name: 'Purchase Date', nameAr: 'تاريخ الشراء', dataType: 'date' },
    { key: 'warrantyExpiry', name: 'Warranty Expiry', nameAr: 'انتهاء الضمان', dataType: 'date' },
    { key: 'lastMaintenanceDate', name: 'Last Maintenance', nameAr: 'آخر صيانة', dataType: 'date' },
    {
      key: 'nextMaintenanceDate',
      name: 'Next Maintenance',
      nameAr: 'الصيانة القادمة',
      dataType: 'date',
    },
    { key: 'location', name: 'Location', nameAr: 'الموقع', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['operational', 'maintenance', 'out_of_service', 'decommissioned'],
    },
    { key: 'purchasePrice', name: 'Purchase Price', nameAr: 'سعر الشراء', dataType: 'currency' },
  ],
  medical_referrals: [
    {
      key: 'referralId',
      name: 'Referral ID',
      nameAr: 'رقم التحويل',
      dataType: 'string',
      required: true,
    },
    {
      key: 'patientName',
      name: 'Patient Name',
      nameAr: 'اسم المريض',
      dataType: 'string',
      required: true,
    },
    {
      key: 'referringDoctor',
      name: 'Referring Doctor',
      nameAr: 'الطبيب المحيل',
      dataType: 'string',
      required: true,
    },
    {
      key: 'referredToDoctor',
      name: 'Referred To Doctor',
      nameAr: 'الطبيب المحال إليه',
      dataType: 'string',
    },
    {
      key: 'referredToFacility',
      name: 'Referred To Facility',
      nameAr: 'المنشأة المحال إليها',
      dataType: 'string',
    },
    { key: 'specialty', name: 'Specialty', nameAr: 'التخصص', dataType: 'string' },
    {
      key: 'referralDate',
      name: 'Referral Date',
      nameAr: 'تاريخ التحويل',
      dataType: 'date',
      required: true,
    },
    {
      key: 'urgency',
      name: 'Urgency',
      nameAr: 'الأولوية',
      dataType: 'select',
      options: ['routine', 'urgent', 'emergency'],
    },
    { key: 'reason', name: 'Reason', nameAr: 'سبب التحويل', dataType: 'string' },
    { key: 'diagnosis', name: 'Diagnosis', nameAr: 'التشخيص', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['pending', 'accepted', 'scheduled', 'completed', 'cancelled', 'expired'],
    },
    { key: 'appointmentDate', name: 'Appointment Date', nameAr: 'تاريخ الموعد', dataType: 'date' },
  ],
  emr: [
    { key: 'recordId', name: 'Record ID', nameAr: 'رقم السجل', dataType: 'string', required: true },
    {
      key: 'patientName',
      name: 'Patient Name',
      nameAr: 'اسم المريض',
      dataType: 'string',
      required: true,
    },
    {
      key: 'patientId',
      name: 'Patient ID',
      nameAr: 'رقم المريض',
      dataType: 'string',
      required: true,
    },
    { key: 'dateOfBirth', name: 'Date of Birth', nameAr: 'تاريخ الميلاد', dataType: 'date' },
    {
      key: 'gender',
      name: 'Gender',
      nameAr: 'الجنس',
      dataType: 'select',
      options: ['male', 'female'],
    },
    {
      key: 'bloodType',
      name: 'Blood Type',
      nameAr: 'فصيلة الدم',
      dataType: 'select',
      options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    { key: 'allergies', name: 'Allergies', nameAr: 'الحساسية', dataType: 'string' },
    {
      key: 'chronicConditions',
      name: 'Chronic Conditions',
      nameAr: 'الحالات المزمنة',
      dataType: 'string',
    },
    {
      key: 'currentMedications',
      name: 'Current Medications',
      nameAr: 'الأدوية الحالية',
      dataType: 'string',
    },
    { key: 'lastVisitDate', name: 'Last Visit Date', nameAr: 'تاريخ آخر زيارة', dataType: 'date' },
    { key: 'primaryDoctor', name: 'Primary Doctor', nameAr: 'الطبيب الرئيسي', dataType: 'string' },
    {
      key: 'status',
      name: 'Status',
      nameAr: 'الحالة',
      dataType: 'select',
      options: ['active', 'inactive', 'deceased', 'transferred'],
    },
    { key: 'notes', name: 'Clinical Notes', nameAr: 'ملاحظات سريرية', dataType: 'string' },
  ],
};

class ImportExportProService {
  // ─────────────────────────────────────────────────
  // EXPORT OPERATIONS
  // ─────────────────────────────────────────────────

  /**
   * Create and execute an export job
   */
  async createExport(params) {
    const {
      module,
      format = 'xlsx',
      fields,
      query = {},
      sort = { createdAt: -1 },
      dateRange,
      options = {},
      userId,
      jobName,
    } = params;

    // Create job record
    const job = new ImportExportJob({
      jobName: jobName || `تصدير ${MODULE_REGISTRY[module]?.label || module}`,
      jobNameAr: `تصدير ${MODULE_REGISTRY[module]?.label || module}`,
      type: 'export',
      format,
      dataSource: { module, model: MODULE_REGISTRY[module]?.model, query, fields, sort, dateRange },
      exportOptions: { ...options },
      status: 'processing',
      createdBy: userId,
      processingDetails: { startedAt: new Date() },
    });
    await job.save();

    try {
      // Fetch data
      const data = await this._fetchModuleData(module, query, fields, sort, dateRange);

      job.progress.total = data.length;

      // Generate file based on format
      let result;
      switch (format) {
        case 'xlsx':
          result = await this._exportToExcel(data, fields, module, options);
          break;
        case 'csv':
          result = await this._exportToCSV(data, fields, module, options);
          break;
        case 'json':
          result = await this._exportToJSON(data, fields, module, options);
          break;
        case 'pdf':
          result = await this._exportToPDF(data, fields, module, options);
          break;
        case 'xml':
          result = await this._exportToXML(data, fields, module, options);
          break;
        case 'docx':
          result = await this._exportToDOCX(data, fields, module, options);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Update job
      job.status = 'completed';
      job.progress.processed = data.length;
      job.progress.successful = data.length;
      job.progress.percentage = 100;

      // Persist buffer to disk so /download/:jobId can serve it later
      const fs = require('fs');
      const exportsDir = path.join(__dirname, '../exports');
      if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
      const storedName = `${job.jobId}_${result.fileName}`;
      const filePath = path.join(exportsDir, storedName);
      fs.writeFileSync(filePath, result.buffer);

      job.file = {
        originalName: result.fileName,
        storedName,
        path: filePath,
        size: result.size,
        mimeType: result.mimeType,
        downloadUrl: `/api/import-export-pro/download/${job.jobId}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      };
      job.processingDetails.completedAt = new Date();
      job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
      await job.save();

      return {
        job: job.toObject(),
        buffer: result.buffer,
        fileName: result.fileName,
        mimeType: result.mimeType,
      };
    } catch (error) {
      job.status = 'failed';
      job.processingDetails.errorMessage = error.message;
      job.processingDetails.completedAt = new Date();
      job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
      await job.save();
      throw error;
    }
  }

  /**
   * Export to Excel with professional formatting
   */
  async _exportToExcel(data, fields, module, options = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'الأوائل - نظام الاستيراد والتصدير';
    workbook.created = new Date();

    const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };
    const sheetName = options.sheetName || moduleInfo.labelEn || 'Data';
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: { defaultColWidth: 18 },
      views: [{ state: 'frozen', ySplit: 2 }], // Freeze header rows
    });

    // Determine columns from fields or data
    const columns = this._resolveColumns(data, fields, module);

    // --- Title Row ---
    const titleText =
      options.language === 'en'
        ? `${moduleInfo.labelEn} Export Report`
        : `تقرير تصدير ${moduleInfo.label}`;

    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = titleText;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    // --- Header Row ---
    const headerRow = worksheet.getRow(2);
    columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = options.language === 'en' ? col.name : col.nameAr || col.name;
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        right: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      };
    });
    headerRow.height = 30;

    // --- Data Rows ---
    data.forEach((item, rowIdx) => {
      const row = worksheet.getRow(rowIdx + 3);
      columns.forEach((col, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        let value = this._getNestedValue(item, col.key);

        // Format value based on type
        if (col.dataType === 'date' && value) {
          value = new Date(value).toLocaleDateString('en-CA');
        } else if (col.dataType === 'currency' && typeof value === 'number') {
          cell.numFmt = '#,##0.00';
        } else if (col.dataType === 'boolean') {
          value = value ? 'نعم / Yes' : 'لا / No';
        } else if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }

        cell.value = value ?? '';
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };

        // Alternate row colors
        if (rowIdx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        }
      });
      row.height = 22;
    });

    // --- Auto-fit columns ---
    columns.forEach((col, i) => {
      const maxLen = Math.max(
        (col.nameAr || col.name || '').length,
        ...data.slice(0, 50).map(d => String(this._getNestedValue(d, col.key) ?? '').length)
      );
      worksheet.getColumn(i + 1).width = Math.min(Math.max(maxLen + 4, 12), 50);
    });

    // --- Summary Row ---
    const summaryRowIdx = data.length + 3;
    worksheet.mergeCells(summaryRowIdx, 1, summaryRowIdx, columns.length);
    const summaryCell = worksheet.getCell(`A${summaryRowIdx}`);
    const dateStr = new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' });
    summaryCell.value = `إجمالي السجلات: ${data.length} | تاريخ التصدير: ${dateStr} | النظام: الأوائل`;
    summaryCell.font = { size: 9, italic: true, color: { argb: 'FF757575' } };
    summaryCell.alignment = { horizontal: 'center' };

    // Auto-filter
    worksheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: data.length + 2, column: columns.length },
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${module}_export_${Date.now()}.xlsx`;

    return {
      buffer: Buffer.from(buffer),
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.byteLength,
    };
  }

  /**
   * Export to CSV
   */
  async _exportToCSV(data, fields, module, options = {}) {
    const columns = this._resolveColumns(data, fields, module);
    const headers = columns.map(c => (options.language === 'en' ? c.name : c.nameAr || c.name));

    const rows = data.map(item =>
      columns.map(col => {
        let value = this._getNestedValue(item, col.key);
        if (value instanceof Date) value = value.toISOString().split('T')[0];
        if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
        return value ?? '';
      })
    );

    const csvContent = csvStringify([headers, ...rows], {
      delimiter: options.delimiter || ',',
      bom: true, // UTF-8 BOM for Arabic support
    });

    const buffer = Buffer.from(csvContent, 'utf-8');
    const fileName = `${module}_export_${Date.now()}.csv`;

    return {
      buffer,
      fileName,
      mimeType: 'text/csv; charset=utf-8',
      size: buffer.length,
    };
  }

  /**
   * Export to JSON
   */
  async _exportToJSON(data, fields, module, _options = {}) {
    const columns = this._resolveColumns(data, fields, module);
    const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };

    const exportData = {
      metadata: {
        module,
        moduleName: moduleInfo.label,
        moduleNameEn: moduleInfo.labelEn,
        exportDate: new Date().toISOString(),
        totalRecords: data.length,
        fields: columns.map(c => c.key),
        system: 'الأوائل - Al-Awael ERP',
        version: '2.0',
      },
      data:
        fields && fields.length > 0
          ? data.map(item => {
              const filtered = {};
              columns.forEach(col => {
                filtered[col.key] = this._getNestedValue(item, col.key);
              });
              return filtered;
            })
          : data,
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');
    const fileName = `${module}_export_${Date.now()}.json`;

    return {
      buffer,
      fileName,
      mimeType: 'application/json; charset=utf-8',
      size: buffer.length,
    };
  }

  /**
   * Export to PDF with professional design
   */
  async _exportToPDF(data, fields, module, options = {}) {
    const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };
    const columns = this._resolveColumns(data, fields, module);

    const isLandscape = options.orientation === 'landscape' || columns.length > 6;
    const pageSize = options.pageSize || 'A4';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: pageSize,
        layout: isLandscape ? 'landscape' : 'portrait',
        margins: { top: 50, bottom: 50, left: 40, right: 40 },
        bufferPages: true,
        info: {
          Title: `${moduleInfo.labelEn} Export`,
          Author: 'Al-Awael ERP System',
          Subject: `${moduleInfo.label} - تقرير تصدير`,
          CreationDate: new Date(),
        },
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          fileName: `${module}_export_${Date.now()}.pdf`,
          mimeType: 'application/pdf',
          size: buffer.length,
        });
      });
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidth = Math.min(pageWidth / columns.length, 150);

      // --- Header ---
      doc
        .fillColor('#1565C0')
        .rect(30, 20, doc.page.width - 60, 50)
        .fill();
      doc
        .fillColor('#FFFFFF')
        .fontSize(18)
        .text(`${moduleInfo.label} — ${moduleInfo.labelEn}`, 40, 32, {
          width: doc.page.width - 80,
          align: 'center',
        });

      // --- Meta info ---
      doc
        .fillColor('#757575')
        .fontSize(9)
        .text(
          `تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')} | إجمالي: ${data.length} سجل | النظام: الأوائل`,
          40,
          80,
          { width: pageWidth, align: 'center' }
        );

      let y = 100;

      // --- Table Header ---
      doc.fillColor('#1976D2').rect(doc.page.margins.left, y, pageWidth, 25).fill();
      columns.forEach((col, i) => {
        doc
          .fillColor('#FFFFFF')
          .fontSize(8)
          .text(col.nameAr || col.name, doc.page.margins.left + i * colWidth + 3, y + 7, {
            width: colWidth - 6,
            align: 'center',
          });
      });
      y += 25;

      // --- Table Data ---
      const maxRows = Math.min(data.length, 500); // Limit for PDF
      for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = 50;
          // Re-draw header
          doc.fillColor('#1976D2').rect(doc.page.margins.left, y, pageWidth, 25).fill();
          columns.forEach((col, i) => {
            doc
              .fillColor('#FFFFFF')
              .fontSize(8)
              .text(col.nameAr || col.name, doc.page.margins.left + i * colWidth + 3, y + 7, {
                width: colWidth - 6,
                align: 'center',
              });
          });
          y += 25;
        }

        // Alternate row background
        if (rowIdx % 2 === 1) {
          doc.fillColor('#F5F5F5').rect(doc.page.margins.left, y, pageWidth, 20).fill();
        }

        const item = data[rowIdx];
        columns.forEach((col, i) => {
          let value = this._getNestedValue(item, col.key);
          if (value instanceof Date) value = value.toLocaleDateString('en-CA');
          if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
          value = String(value ?? '').substring(0, 40); // Truncate long text

          doc
            .fillColor('#333333')
            .fontSize(7)
            .text(value, doc.page.margins.left + i * colWidth + 3, y + 5, {
              width: colWidth - 6,
              align: 'center',
            });
        });
        y += 20;
      }

      // --- Footer ---
      if (data.length > 500) {
        doc
          .fillColor('#FF6600')
          .fontSize(9)
          .text(
            `⚠ عرض أول 500 سجل من ${data.length} — استخدم تصدير Excel للبيانات الكاملة`,
            doc.page.margins.left,
            y + 10,
            { width: pageWidth, align: 'center' }
          );
      }

      // Page numbers
      const pages = doc.bufferedPageRange();
      for (let i = pages.start; i < pages.start + pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fillColor('#999999')
          .fontSize(8)
          .text(`صفحة ${i + 1} من ${pages.count}`, doc.page.margins.left, doc.page.height - 35, {
            width: pageWidth,
            align: 'center',
          });
      }

      doc.end();
    });
  }

  /**
   * Export to XML
   */
  async _exportToXML(data, fields, module, _options = {}) {
    const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };
    const columns = this._resolveColumns(data, fields, module);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<export module="${module}" moduleName="${moduleInfo.label}" date="${new Date().toISOString()}" total="${data.length}">\n`;

    data.forEach((item, idx) => {
      xml += `  <record index="${idx + 1}">\n`;
      columns.forEach(col => {
        let value = this._getNestedValue(item, col.key);
        if (value instanceof Date) value = value.toISOString();
        if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
        const escaped = String(value ?? '').replace(
          /[&<>"']/g,
          c =>
            ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&apos;',
            })[c]
        );
        xml += `    <${col.key} label="${col.nameAr || col.name}">${escaped}</${col.key}>\n`;
      });
      xml += `  </record>\n`;
    });

    xml += '</export>\n';

    const buffer = Buffer.from(xml, 'utf-8');
    const fileName = `${module}_export_${Date.now()}.xml`;

    return {
      buffer,
      fileName,
      mimeType: 'application/xml; charset=utf-8',
      size: buffer.length,
    };
  }

  /**
   * Export to DOCX (Word Document)
   */
  async _exportToDOCX(data, fields, module, options = {}) {
    if (!data || data.length === 0) {
      throw new Error('لا توجد بيانات للتصدير في هذه الوحدة');
    }

    const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };
    const columns = this._resolveColumns(data, fields, module);

    const titleText =
      options.language === 'en'
        ? `${moduleInfo.labelEn} Export Report`
        : `تقرير تصدير ${moduleInfo.label}`;

    // Build table header row
    const headerCells = columns.map(
      col =>
        new DocxTableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: col.nameAr || col.name,
                  bold: true,
                  size: 20,
                  color: 'FFFFFF',
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: '1B5E20' },
          width: { size: Math.floor(9000 / columns.length), type: WidthType.DXA },
        })
    );
    const headerRow = new DocxTableRow({ children: headerCells });

    // Build data rows
    const dataRows = data.slice(0, 5000).map(item => {
      const cells = columns.map(col => {
        let value = this._getNestedValue(item, col.key);
        if (value instanceof Date) value = value.toISOString().split('T')[0];
        if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
        return new DocxTableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: String(value ?? ''), size: 18 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: Math.floor(9000 / columns.length), type: WidthType.DXA },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          },
        });
      });
      return new DocxTableRow({ children: cells });
    });

    const doc = new DocxDocument({
      sections: [
        {
          children: [
            new Paragraph({
              text: titleText,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `التاريخ: ${new Date().toLocaleDateString('ar-SA')}  |  إجمالي السجلات: ${data.length}`,
                  size: 20,
                  color: '666666',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new DocxTable({
              rows: [headerRow, ...dataRows],
              width: { size: 9000, type: WidthType.DXA },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `\nتم التصدير بواسطة نظام الأوائل - ${new Date().toISOString()}`,
                  size: 16,
                  color: '999999',
                  italics: true,
                }),
              ],
              spacing: { before: 400 },
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `${module}_export_${Date.now()}.docx`;

    return {
      buffer,
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: buffer.length,
    };
  }

  // ─────────────────────────────────────────────────
  // IMPORT OPERATIONS
  // ─────────────────────────────────────────────────

  /**
   * Parse uploaded file and return preview + validation
   */
  async parseImportFile(params) {
    const { fileBuffer, fileName, module, options = {} } = params;

    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    let rawData;

    switch (ext) {
      case 'xlsx':
      case 'xls':
        rawData = await this._parseExcel(fileBuffer, options);
        break;
      case 'csv':
        rawData = this._parseCSV(fileBuffer, options);
        break;
      case 'json':
        rawData = this._parseJSON(fileBuffer);
        break;
      default:
        throw new Error(`Unsupported import format: ${ext}`);
    }

    // Detect columns
    const detectedColumns = rawData.length > 0 ? Object.keys(rawData[0]) : [];

    // Auto-suggest column mappings
    const suggestedMappings = this._suggestColumnMappings(detectedColumns, module);

    // Preview data (first 20 rows)
    const preview = rawData.slice(0, 20);

    // Basic validation
    const validation = this._validateImportData(rawData, suggestedMappings, module);

    return {
      totalRows: rawData.length,
      detectedColumns,
      suggestedMappings,
      preview,
      validation,
      format: ext,
    };
  }

  /**
   * Execute import with validated data
   */
  async executeImport(params) {
    const { fileBuffer, fileName, module, columnMappings, options = {}, userId, jobName } = params;

    const ext = path.extname(fileName).toLowerCase().replace('.', '');

    // Parse file
    let rawData;
    switch (ext) {
      case 'xlsx':
      case 'xls':
        rawData = await this._parseExcel(fileBuffer, options);
        break;
      case 'csv':
        rawData = this._parseCSV(fileBuffer, options);
        break;
      case 'json':
        rawData = this._parseJSON(fileBuffer);
        break;
      default:
        throw new Error(`Unsupported import format: ${ext}`);
    }

    // Create job
    const job = new ImportExportJob({
      jobName: jobName || `استيراد ${MODULE_REGISTRY[module]?.label || module}`,
      jobNameAr: `استيراد ${MODULE_REGISTRY[module]?.label || module}`,
      type: 'import',
      format: ext === 'xls' ? 'xlsx' : ext,
      dataSource: { module, model: MODULE_REGISTRY[module]?.model },
      columnMappings: columnMappings || [],
      importOptions: { ...options },
      status: 'processing',
      progress: { total: rawData.length },
      createdBy: userId,
      file: { originalName: fileName, size: fileBuffer.length },
      processingDetails: { startedAt: new Date() },
    });
    await job.save();

    try {
      // Transform data using column mappings
      const transformedData = this._transformImportData(rawData, columnMappings);

      // Validate
      if (options.validateOnly) {
        const validation = this._validateImportData(transformedData, columnMappings, module);
        job.status = 'completed';
        job.validation = validation;
        job.progress.processed = rawData.length;
        job.progress.percentage = 100;
        job.processingDetails.completedAt = new Date();
        job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
        await job.save();
        return { job: job.toObject(), validation, dryRun: true };
      }

      // Get the model
      const Model = this._getModel(module);
      if (!Model) {
        throw new Error(`نموذج البيانات غير موجود للوحدة: ${module}`);
      }

      // Clean & enrich data if enabled
      const processedData =
        options.autoClean !== false
          ? this.cleanAndEnrichData(transformedData, module, {
              normalizeSpaces: true,
              removeEmpty: false,
            })
          : transformedData;

      // Batch insert/update with bulkWrite optimization
      const batchSize = options.batchSize || 200;
      const results = { inserted: [], updated: [], failed: [], skipped: [] };
      const useBulkWrite = options.mode === 'insert' || !options.duplicateCheckField;

      for (let i = 0; i < processedData.length; i += batchSize) {
        const batch = processedData.slice(i, i + batchSize);

        if (useBulkWrite && options.mode !== 'update') {
          // Fast path: use bulkWrite for pure inserts
          try {
            const ops = batch.map(record => ({
              insertOne: { document: record },
            }));
            const bulkResult = await Model.bulkWrite(ops, { ordered: false });
            const insertedCount = bulkResult.insertedCount || 0;

            for (let j = 0; j < insertedCount; j++) {
              results.inserted.push(i + j);
              job.progress.successful++;
            }

            // Handle write errors
            if (bulkResult.hasWriteErrors?.()) {
              for (const writeErr of bulkResult.getWriteErrors()) {
                const globalIdx = i + writeErr.index;
                if (writeErr.code === 11000 && options.skipDuplicates) {
                  results.skipped.push(globalIdx);
                  job.progress.skipped++;
                } else {
                  results.failed.push({ row: globalIdx + 1, error: writeErr.errmsg });
                  job.progress.failed++;
                }
              }
            }
          } catch (bulkErr) {
            // If bulkWrite itself throws, process individually
            if (bulkErr.writeErrors) {
              const successCount = batch.length - bulkErr.writeErrors.length;
              for (let j = 0; j < successCount; j++) {
                results.inserted.push(i + j);
                job.progress.successful++;
              }
              for (const writeErr of bulkErr.writeErrors) {
                const globalIdx = i + writeErr.index;
                if (writeErr.code === 11000 && options.skipDuplicates) {
                  results.skipped.push(globalIdx);
                  job.progress.skipped++;
                } else {
                  results.failed.push({
                    row: globalIdx + 1,
                    error: writeErr.errmsg || writeErr.message,
                  });
                  job.progress.failed++;
                }
              }
            } else {
              // Complete batch failure - fall back to one-by-one
              for (const [batchIdx, record] of batch.entries()) {
                const globalIdx = i + batchIdx;
                try {
                  const doc = new Model(record);
                  await doc.save();
                  results.inserted.push(doc._id);
                  job.progress.successful++;
                } catch (err) {
                  results.failed.push({ row: globalIdx + 1, error: err.message });
                  job.progress.failed++;
                }
              }
            }
          }
          job.progress.processed = Math.min(i + batch.length, processedData.length);
          job.progress.percentage = Math.round(
            (job.progress.processed / processedData.length) * 100
          );
        } else {
          // Upsert/update mode — process individually with duplicate checking
          for (const [batchIdx, record] of batch.entries()) {
            const globalIdx = i + batchIdx;
            try {
              if (options.mode === 'upsert' && options.duplicateCheckField) {
                const filter = {
                  [options.duplicateCheckField]: record[options.duplicateCheckField],
                };
                const existing = await Model.findOne(filter);
                if (existing) {
                  if (options.skipDuplicates) {
                    results.skipped.push(globalIdx);
                    job.progress.skipped++;
                  } else {
                    await Model.findOneAndUpdate(filter, record, { new: true });
                    results.updated.push(globalIdx);
                    job.progress.successful++;
                  }
                } else {
                  const doc = new Model(record);
                  await doc.save();
                  results.inserted.push(doc._id);
                  job.progress.successful++;
                }
              } else if (options.mode === 'update' && options.duplicateCheckField) {
                const filter = {
                  [options.duplicateCheckField]: record[options.duplicateCheckField],
                };
                const updated = await Model.findOneAndUpdate(filter, record, { new: true });
                if (updated) {
                  results.updated.push(updated._id);
                  job.progress.successful++;
                } else {
                  results.skipped.push(globalIdx);
                  job.progress.skipped++;
                }
              } else {
                const doc = new Model(record);
                await doc.save();
                results.inserted.push(doc._id);
                job.progress.successful++;
              }
            } catch (err) {
              results.failed.push({ row: globalIdx + 1, error: err.message });
              job.progress.failed++;
            }

            job.progress.processed = globalIdx + 1;
            job.progress.percentage = Math.round(((globalIdx + 1) / processedData.length) * 100);
          }
        }

        // Save progress periodically
        if (i % (batchSize * 3) === 0) {
          await job.save();
        }
      }

      // Finalize job
      job.status = job.progress.failed > 0 ? 'partial' : 'completed';
      job.results = {
        insertedIds: results.inserted,
        updatedIds: results.updated,
        failedRows: results.failed.map(f => f.row),
        summary: {
          inserted: results.inserted.length,
          updated: results.updated.length,
          failed: results.failed.length,
          skipped: results.skipped.length,
          errors: results.failed,
        },
      };
      job.processingDetails.completedAt = new Date();
      job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
      job.progress.percentage = 100;
      await job.save();

      return { job: job.toObject(), results: job.results.summary };
    } catch (error) {
      job.status = 'failed';
      job.processingDetails.errorMessage = error.message;
      job.processingDetails.completedAt = new Date();
      job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
      await job.save();
      throw error;
    }
  }

  // ─────────────────────────────────────────────────
  // TEMPLATE OPERATIONS
  // ─────────────────────────────────────────────────

  /**
   * Generate downloadable import template
   */
  async generateImportTemplate(params) {
    const { module, format = 'xlsx', templateId, userId } = params;

    let fields;

    if (templateId) {
      const template = await ImportExportTemplate.findById(templateId);
      if (!template) throw new Error('القالب غير موجود');
      fields = template.fields;
      template.usageCount++;
      template.lastUsedAt = new Date();
      template.lastUsedBy = userId;
      await template.save();
    } else {
      fields = SYSTEM_TEMPLATES[module] || this._generateDefaultFields(module);
    }

    if (format === 'xlsx') {
      return this._generateExcelTemplate(fields, module);
    } else if (format === 'csv') {
      return this._generateCSVTemplate(fields, module);
    }
    throw new Error(`Template format not supported: ${format}`);
  }

  /**
   * Generate Excel import template with validation and instructions
   */
  async _generateExcelTemplate(fields, module) {
    const workbook = new ExcelJS.Workbook();
    const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };

    // --- Instructions Sheet ---
    const instrSheet = workbook.addWorksheet('تعليمات - Instructions', {
      properties: { tabColor: { argb: 'FF4CAF50' } },
    });

    instrSheet.mergeCells('A1:F1');
    const instrTitle = instrSheet.getCell('A1');
    instrTitle.value = `تعليمات استيراد ${moduleInfo.label} — ${moduleInfo.labelEn} Import Instructions`;
    instrTitle.font = { size: 16, bold: true, color: { argb: 'FF1565C0' } };
    instrTitle.alignment = { horizontal: 'center' };
    instrSheet.getRow(1).height = 35;

    const instructions = [
      ['', '', '', '', '', ''],
      ['#', 'الحقل', 'Field', 'النوع', 'مطلوب؟', 'ملاحظات'],
    ];

    fields.forEach((f, i) => {
      instructions.push([
        i + 1,
        f.nameAr || f.name,
        f.name,
        f.dataType,
        f.required ? '✅ نعم' : '❌ لا',
        f.description || f.example || '',
      ]);
    });

    instructions.push(['', '', '', '', '', '']);
    instructions.push(['⚠️', 'لا تحذف صف العناوين', 'Do not delete the header row', '', '', '']);
    instructions.push(['⚠️', 'ابدأ البيانات من الصف 2', 'Start data from row 2', '', '', '']);
    instructions.push(['⚠️', 'حفظ بصيغة .xlsx', 'Save as .xlsx format', '', '', '']);

    instructions.forEach((row, i) => {
      const excelRow = instrSheet.getRow(i + 1);
      row.forEach((val, j) => {
        excelRow.getCell(j + 1).value = val;
      });
    });

    // Style header
    const instrHeader = instrSheet.getRow(3);
    instrHeader.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    });

    instrSheet.columns = [
      { width: 5 },
      { width: 25 },
      { width: 25 },
      { width: 12 },
      { width: 12 },
      { width: 30 },
    ];

    // --- Data Sheet ---
    const dataSheet = workbook.addWorksheet('البيانات - Data', {
      properties: { tabColor: { argb: 'FF2196F3' } },
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Header row
    const headerRow = dataSheet.getRow(1);
    fields.forEach((f, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = f.nameAr ? `${f.nameAr}\n${f.name}` : f.name;
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: f.required ? 'FFD32F2F' : 'FF1976D2' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 40;

    // Set column widths
    fields.forEach((f, i) => {
      dataSheet.getColumn(i + 1).width = Math.max(15, (f.nameAr || f.name || '').length + 5);
    });

    // Add data validation for select fields
    fields.forEach((f, i) => {
      if (f.dataType === 'select' && f.options && f.options.length > 0) {
        for (let row = 2; row <= 1001; row++) {
          dataSheet.getCell(row, i + 1).dataValidation = {
            type: 'list',
            allowBlank: !f.required,
            formulae: [`"${f.options.join(',')}"`],
            showErrorMessage: true,
            errorTitle: 'قيمة غير صالحة',
            error: `الرجاء اختيار من: ${f.options.join(', ')}`,
          };
        }
      }
    });

    // Example row
    const exampleRow = dataSheet.getRow(2);
    fields.forEach((f, i) => {
      const cell = exampleRow.getCell(i + 1);
      cell.value = f.example || this._getExampleValue(f);
      cell.font = { italic: true, color: { argb: 'FF9E9E9E' } };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${module}_import_template_${Date.now()}.xlsx`;

    return {
      buffer: Buffer.from(buffer),
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.byteLength,
    };
  }

  /**
   * Generate CSV import template
   */
  async _generateCSVTemplate(fields, module) {
    const headers = fields.map(f => (f.nameAr ? `${f.nameAr} (${f.name})` : f.name));
    const example = fields.map(f => f.example || this._getExampleValue(f));

    const csvContent = csvStringify([headers, example], { bom: true });
    const buffer = Buffer.from(csvContent, 'utf-8');

    return {
      buffer,
      fileName: `${module}_import_template_${Date.now()}.csv`,
      mimeType: 'text/csv; charset=utf-8',
      size: buffer.length,
    };
  }

  /**
   * Create a custom template
   */
  async createTemplate(params) {
    const { name, nameAr, description, module, type, fields, options, userId } = params;

    const template = new ImportExportTemplate({
      name,
      nameAr,
      description,
      module,
      type: type || 'both',
      fields,
      defaultExportOptions: options?.export || {},
      defaultImportOptions: options?.import || {},
      createdBy: userId,
    });

    await template.save();
    return template;
  }

  /**
   * List templates for a module
   */
  async listTemplates(params) {
    const { module, type, userId, page = 1, limit = 20 } = params;
    const query = { isActive: true, isDeleted: false };

    if (module) query.module = module;
    if (type) query.type = { $in: [type, 'both'] };
    if (userId) {
      query.$or = [{ isPublic: true }, { isSystem: true }, { createdBy: userId }];
    }

    const [templates, total] = await Promise.all([
      ImportExportTemplate.find(query)
        .sort({ isSystem: -1, usageCount: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ImportExportTemplate.countDocuments(query),
    ]);

    return { templates, total, page, pages: Math.ceil(total / limit) };
  }

  // ─────────────────────────────────────────────────
  // JOB MANAGEMENT
  // ─────────────────────────────────────────────────

  /**
   * Get job list with filters
   */
  async getJobs(params) {
    const { type, status, module, userId, page = 1, limit = 20, search, dateRange } = params;
    const query = { isDeleted: false };

    if (type) query.type = type;
    if (status) query.status = status;
    if (module) query['dataSource.module'] = module;
    if (userId) query.createdBy = userId;
    if (search) {
      query.$or = [
        { jobName: { $regex: escapeRegex(search), $options: 'i' } },
        { jobNameAr: { $regex: escapeRegex(search), $options: 'i' } },
        { jobId: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    if (dateRange) {
      query.createdAt = {};
      if (dateRange.from) query.createdAt.$gte = new Date(dateRange.from);
      if (dateRange.to) query.createdAt.$lte = new Date(dateRange.to);
    }

    const [jobs, total] = await Promise.all([
      ImportExportJob.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name email')
        .lean(),
      ImportExportJob.countDocuments(query),
    ]);

    return { jobs, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Get single job details
   */
  async getJob(jobId) {
    const job = await ImportExportJob.findOne({
      $or: [{ _id: jobId }, { jobId: jobId }],
      isDeleted: false,
    })
      .populate('createdBy', 'name email')
      .populate('template', 'name nameAr module')
      .lean();

    if (!job) throw new Error('المهمة غير موجودة');
    return job;
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId, userId) {
    const job = await ImportExportJob.findOne({
      $or: [{ _id: jobId }, { jobId: jobId }],
      status: { $in: ['pending', 'processing', 'queued'] },
    });

    if (!job) throw new Error('المهمة غير موجودة أو لا يمكن إلغاؤها');

    job.status = 'cancelled';
    job.updatedBy = userId;
    job.processingDetails.completedAt = new Date();
    await job.save();

    return job;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId, userId) {
    const original = await ImportExportJob.findOne({
      $or: [{ _id: jobId }, { jobId: jobId }],
      status: 'failed',
    }).lean();

    if (!original) throw new Error('المهمة غير موجودة أو لم تفشل');

    // Create a new retry job
    const retryJob = new ImportExportJob({
      ...original,
      _id: undefined,
      jobId: undefined,
      status: 'pending',
      progress: { total: 0, processed: 0, successful: 0, failed: 0, skipped: 0, percentage: 0 },
      processingDetails: { retryCount: (original.processingDetails?.retryCount || 0) + 1 },
      createdBy: userId,
      createdAt: undefined,
      updatedAt: undefined,
    });
    await retryJob.save();

    return retryJob;
  }

  /**
   * Delete a job (soft delete)
   */
  async deleteJob(jobId, userId) {
    const job = await ImportExportJob.findOne({
      $or: [{ _id: jobId }, { jobId: jobId }],
    });

    if (!job) throw new Error('المهمة غير موجودة');

    job.isDeleted = true;
    job.deletedAt = new Date();
    job.deletedBy = userId;
    await job.save();

    return { success: true };
  }

  // ─────────────────────────────────────────────────
  // STATISTICS & ANALYTICS
  // ─────────────────────────────────────────────────

  /**
   * Get comprehensive dashboard statistics
   */
  async getStatistics(params = {}) {
    const { userId, dateRange } = params;
    const match = { isDeleted: false };

    if (userId) match.createdBy = new mongoose.Types.ObjectId(userId);
    if (dateRange) {
      match.createdAt = {};
      if (dateRange.from) match.createdAt.$gte = new Date(dateRange.from);
      if (dateRange.to) match.createdAt.$lte = new Date(dateRange.to);
    }

    const [stats] = await ImportExportJob.aggregate([
      { $match: match },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalJobs: { $sum: 1 },
                totalExports: { $sum: { $cond: [{ $eq: ['$type', 'export'] }, 1, 0] } },
                totalImports: { $sum: { $cond: [{ $eq: ['$type', 'import'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                totalRowsProcessed: { $sum: '$progress.processed' },
                avgDuration: { $avg: '$processingDetails.duration' },
                totalFileSize: { $sum: '$file.size' },
              },
            },
          ],
          byFormat: [{ $group: { _id: '$format', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          byModule: [
            { $group: { _id: '$dataSource.module', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          dailyTrend: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: -1 } },
            { $limit: 30 },
          ],
          recentJobs: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                jobId: 1,
                jobName: 1,
                type: 1,
                format: 1,
                status: 1,
                progress: 1,
                createdAt: 1,
                'dataSource.module': 1,
              },
            },
          ],
          topModules: [
            {
              $group: {
                _id: '$dataSource.module',
                exports: { $sum: { $cond: [{ $eq: ['$type', 'export'] }, 1, 0] } },
                imports: { $sum: { $cond: [{ $eq: ['$type', 'import'] }, 1, 0] } },
                total: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);

    return {
      overview: stats.overview[0] || {
        totalJobs: 0,
        totalExports: 0,
        totalImports: 0,
        completed: 0,
        failed: 0,
        totalRowsProcessed: 0,
        avgDuration: 0,
        totalFileSize: 0,
      },
      byFormat: stats.byFormat,
      byModule: stats.byModule,
      byStatus: stats.byStatus,
      dailyTrend: stats.dailyTrend,
      recentJobs: stats.recentJobs,
      topModules: stats.topModules,
    };
  }

  // ─────────────────────────────────────────────────
  // MODULE OPERATIONS
  // ─────────────────────────────────────────────────

  /**
   * Get available modules for import/export
   */
  getAvailableModules() {
    return Object.entries(MODULE_REGISTRY).map(([key, info]) => ({
      key,
      label: info.label,
      labelEn: info.labelEn,
      model: info.model,
      hasTemplate: !!SYSTEM_TEMPLATES[key],
    }));
  }

  /**
   * Get fields for a module
   */
  async getModuleFields(module) {
    // Try system templates first
    if (SYSTEM_TEMPLATES[module]) {
      return SYSTEM_TEMPLATES[module];
    }

    // Try to introspect model
    const Model = this._getModel(module);
    if (Model && Model.schema) {
      const fields = [];
      const paths = Model.schema.paths;
      for (const [key, schemaType] of Object.entries(paths)) {
        if (key.startsWith('_') || key === '__v') continue;
        fields.push({
          key,
          name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          nameAr: key,
          dataType: this._mongooseTypeToDataType(schemaType.instance),
          required: !!schemaType.isRequired,
        });
      }
      return fields;
    }

    return [];
  }

  // ─────────────────────────────────────────────────
  // BULK EXPORT (ZIP)
  // ─────────────────────────────────────────────────

  /**
   * Export multiple modules as a ZIP bundle
   */
  async bulkExport(params) {
    const { modules, format = 'xlsx', options = {}, userId } = params;

    const job = new ImportExportJob({
      jobName: `تصدير شامل - ${modules.length} وحدات`,
      type: 'export',
      format: 'zip',
      dataSource: { module: 'bulk', query: { modules } },
      status: 'processing',
      createdBy: userId,
      processingDetails: { startedAt: new Date() },
    });
    await job.save();

    try {
      const buffers = [];

      for (const mod of modules) {
        try {
          const result = await this.createExport({
            module: mod,
            format,
            options,
            userId,
            jobName: `تصدير ${MODULE_REGISTRY[mod]?.label || mod}`,
          });
          buffers.push({ name: result.fileName, buffer: result.buffer });
        } catch (err) {
          logger.error(`Bulk export: Failed to export ${mod}:`, err.message);
        }
      }

      // Create ZIP
      const zipBuffer = await this._createZip(buffers);
      const fileName = `bulk_export_${Date.now()}.zip`;

      job.status = 'completed';
      job.progress = {
        total: modules.length,
        processed: buffers.length,
        successful: buffers.length,
        percentage: 100,
      };
      job.file = {
        originalName: fileName,
        size: zipBuffer.length,
        mimeType: 'application/zip',
        downloadUrl: `/api/import-export-pro/download/${job.jobId}`,
      };
      job.processingDetails.completedAt = new Date();
      job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
      await job.save();

      return { job: job.toObject(), buffer: zipBuffer, fileName, mimeType: 'application/zip' };
    } catch (error) {
      job.status = 'failed';
      job.processingDetails.errorMessage = error.message;
      await job.save();
      throw error;
    }
  }

  // ─────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────

  /**
   * Fetch data from a module
   */
  async _fetchModuleData(module, query = {}, fields, sort, dateRange) {
    const Model = this._getModel(module);

    if (!Model) {
      // Warn instead of silently returning empty — helps diagnose missing model issues
      logger.warn(
        `[ImportExportPro] Module "${module}" has no active Mongoose model — returning empty data`
      );
      return [];
    }

    const mongoQuery = { ...query };

    // Apply date range
    if (dateRange && dateRange.field) {
      mongoQuery[dateRange.field] = {};
      if (dateRange.from) mongoQuery[dateRange.field].$gte = new Date(dateRange.from);
      if (dateRange.to) mongoQuery[dateRange.field].$lte = new Date(dateRange.to);
    }

    // Build projection
    const projection = {};
    if (fields && fields.length > 0) {
      fields.forEach(f => {
        projection[f] = 1;
      });
    }

    const data = await Model.find(mongoQuery)
      .select(Object.keys(projection).length > 0 ? projection : undefined)
      .sort(sort || { createdAt: -1 })
      .limit(50000)
      .lean();

    return data;
  }

  /**
   * Get Mongoose model safely
   */
  _getModel(module) {
    try {
      const modelName = MODULE_REGISTRY[module]?.model;
      if (!modelName) return null;
      return mongoose.model(modelName);
    } catch {
      return null;
    }
  }

  /**
   * Resolve columns from fields, data, or system templates
   */
  _resolveColumns(data, fields, module) {
    // Use provided fields
    if (fields && fields.length > 0) {
      return fields.map(f => {
        if (typeof f === 'string') {
          const sysField = (SYSTEM_TEMPLATES[module] || []).find(sf => sf.key === f);
          return sysField || { key: f, name: f, nameAr: f, dataType: 'string' };
        }
        return f;
      });
    }

    // Use system template
    if (SYSTEM_TEMPLATES[module]) {
      return SYSTEM_TEMPLATES[module];
    }

    // Auto-detect from data
    if (data.length > 0) {
      const sample = data[0];
      return Object.keys(sample)
        .filter(k => !k.startsWith('_') && k !== '__v')
        .map(key => ({
          key,
          name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          nameAr: key,
          dataType:
            typeof sample[key] === 'number'
              ? 'number'
              : sample[key] instanceof Date
                ? 'date'
                : 'string',
        }));
    }

    return [];
  }

  /**
   * Get nested object value by dot-separated key
   */
  _getNestedValue(obj, key) {
    if (!obj || !key) return undefined;
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  /**
   * Parse Excel file
   */
  async _parseExcel(buffer, options = {}) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[options.sheetIndex || 0];
    if (!worksheet) throw new Error('لا توجد صفحات بيانات في الملف');

    const headerRow = options.headerRow || 1;
    const startRow = options.startRow || 2;

    // Get headers
    const headers = [];
    worksheet.getRow(headerRow).eachCell((cell, colNum) => {
      let value = cell.value;
      if (typeof value === 'object' && value?.richText) {
        value = value.richText.map(r => r.text).join('');
      }
      headers[colNum] = String(value || '').trim();
    });

    // Parse rows
    const data = [];
    for (let rowNum = startRow; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const record = {};
      let hasData = false;

      headers.forEach((header, colNum) => {
        if (!header) return;
        let value = row.getCell(colNum).value;

        // Handle Excel date objects
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        } else if (typeof value === 'object' && value?.result !== undefined) {
          value = value.result;
        } else if (typeof value === 'object' && value?.richText) {
          value = value.richText.map(r => r.text).join('');
        }

        if (value !== null && value !== undefined && value !== '') {
          hasData = true;
        }
        record[header] = value;
      });

      if (
        hasData &&
        (!options.skipEmptyRows || Object.values(record).some(v => v !== null && v !== ''))
      ) {
        data.push(record);
      }
    }

    return data;
  }

  /**
   * Parse CSV file
   */
  _parseCSV(buffer, options = {}) {
    const content = buffer.toString(options.encoding || 'utf-8');
    return csvParse(content, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      delimiter: options.delimiter || ',',
      trim: options.trimWhitespace !== false,
    });
  }

  /**
   * Parse JSON file
   */
  _parseJSON(buffer) {
    const content = buffer.toString('utf-8');
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error(`Invalid JSON file: ${err.message}`);
    }

    // Handle both array and { data: [] } formats
    if (Array.isArray(parsed)) return parsed;
    if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
    if (parsed.records && Array.isArray(parsed.records)) return parsed.records;

    throw new Error('JSON format not recognized. Expected array or { data: [] }');
  }

  /**
   * Auto-suggest column mappings based on column names
   */
  _suggestColumnMappings(detectedColumns, module) {
    const systemFields = SYSTEM_TEMPLATES[module] || [];
    const mappings = [];

    for (const col of detectedColumns) {
      const colLower = col.toLowerCase().trim();

      // Direct match
      let match = systemFields.find(
        f =>
          f.key.toLowerCase() === colLower ||
          f.name.toLowerCase() === colLower ||
          (f.nameAr && f.nameAr === col)
      );

      // Fuzzy match
      if (!match) {
        match = systemFields.find(
          f =>
            colLower.includes(f.key.toLowerCase()) ||
            f.key.toLowerCase().includes(colLower) ||
            f.name.toLowerCase().includes(colLower)
        );
      }

      mappings.push({
        sourceColumn: col,
        targetField: match?.key || col,
        dataType: match?.dataType || 'string',
        required: match?.required || false,
        confidence: match ? (match.key.toLowerCase() === colLower ? 'high' : 'medium') : 'low',
        autoDetected: !!match,
      });
    }

    return mappings;
  }

  /**
   * Validate import data (enhanced with Saudi-specific validators)
   */
  _validateImportData(data, mappings, _module) {
    const errors = [];
    const warnings = [];
    let validRows = 0;
    let invalidRows = 0;

    data.forEach((row, idx) => {
      let rowValid = true;

      (mappings || []).forEach(mapping => {
        const value = row[mapping.sourceColumn] || row[mapping.targetField];

        // Required check
        if (mapping.required && (value === null || value === undefined || value === '')) {
          errors.push({
            row: idx + 1,
            column: mapping.sourceColumn,
            field: mapping.targetField,
            value,
            error: `الحقل مطلوب: ${mapping.sourceColumn}`,
            severity: 'error',
          });
          rowValid = false;
        }

        // Type validation
        if (value !== null && value !== undefined && value !== '') {
          const strVal = String(value);
          switch (mapping.dataType) {
            case 'email':
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
                errors.push({
                  row: idx + 1,
                  column: mapping.sourceColumn,
                  field: mapping.targetField,
                  value,
                  error: 'بريد إلكتروني غير صالح',
                  severity: 'error',
                });
                rowValid = false;
              }
              break;
            case 'number':
            case 'currency':
              if (isNaN(Number(strVal.replace(/[,\s]/g, '')))) {
                errors.push({
                  row: idx + 1,
                  column: mapping.sourceColumn,
                  field: mapping.targetField,
                  value,
                  error: 'يجب أن يكون رقماً',
                  severity: 'error',
                });
                rowValid = false;
              } else if (
                mapping.dataType === 'currency' &&
                Number(strVal.replace(/[,\s]/g, '')) < 0
              ) {
                warnings.push({
                  row: idx + 1,
                  column: mapping.sourceColumn,
                  field: mapping.targetField,
                  value,
                  error: 'قيمة مالية سالبة',
                  severity: 'warning',
                });
              }
              break;
            case 'date':
              if (isNaN(Date.parse(value))) {
                warnings.push({
                  row: idx + 1,
                  column: mapping.sourceColumn,
                  field: mapping.targetField,
                  value,
                  error: 'تنسيق تاريخ غير معروف',
                  severity: 'warning',
                });
              }
              break;
            case 'phone':
              if (!/^[\d\s\-+()]{7,20}$/.test(strVal)) {
                warnings.push({
                  row: idx + 1,
                  column: mapping.sourceColumn,
                  field: mapping.targetField,
                  value,
                  error: 'رقم هاتف قد يكون غير صالح',
                  severity: 'warning',
                });
              }
              // Saudi phone validation
              else if (/(\+?966|05)/.test(strVal)) {
                const digits = strVal.replace(/\D/g, '');
                const normalized = digits.startsWith('966')
                  ? digits
                  : digits.startsWith('05')
                    ? '966' + digits.substring(1)
                    : digits;
                if (normalized.startsWith('966') && normalized.length !== 12) {
                  warnings.push({
                    row: idx + 1,
                    column: mapping.sourceColumn,
                    field: mapping.targetField,
                    value,
                    error: 'رقم هاتف سعودي يجب أن يكون 12 رقم (مع 966)',
                    severity: 'warning',
                  });
                }
              }
              break;
            case 'boolean': {
              const boolValid = ['true', 'false', '1', '0', 'yes', 'no', 'نعم', 'لا', 'صح', 'خطأ'];
              if (!boolValid.includes(strVal.toLowerCase().trim())) {
                warnings.push({
                  row: idx + 1,
                  column: mapping.sourceColumn,
                  field: mapping.targetField,
                  value,
                  error: 'قيمة منطقية غير معروفة',
                  severity: 'warning',
                });
              }
              break;
            }
            case 'select':
              if (
                mapping.options &&
                mapping.options.length > 0 &&
                !mapping.options.includes(strVal)
              ) {
                errors.push({
                  row: idx + 1,
                  column: mapping.sourceColumn,
                  field: mapping.targetField,
                  value,
                  error: `قيمة غير مسموحة. القيم المتاحة: ${mapping.options.join(', ')}`,
                  severity: 'error',
                });
                rowValid = false;
              }
              break;
          }

          // Custom field-level validations
          const fieldKey = (mapping.targetField || '').toLowerCase();
          if (fieldKey === 'idnumber' || fieldKey === 'id_number') {
            // Saudi ID / Iqama validation (10 digits, starts with 1 or 2)
            const digits = strVal.replace(/\D/g, '');
            if (digits.length !== 10 || !['1', '2'].includes(digits[0])) {
              warnings.push({
                row: idx + 1,
                column: mapping.sourceColumn,
                field: mapping.targetField,
                value,
                error: 'رقم الهوية/الإقامة يجب أن يكون 10 أرقام يبدأ بـ 1 أو 2',
                severity: 'warning',
              });
            }
          }
          if (fieldKey === 'taxnumber' || fieldKey === 'tax_number') {
            // VAT number validation (15 digits, starts with 3)
            const digits = strVal.replace(/\D/g, '');
            if (digits.length !== 15 || digits[0] !== '3') {
              warnings.push({
                row: idx + 1,
                column: mapping.sourceColumn,
                field: mapping.targetField,
                value,
                error: 'الرقم الضريبي يجب أن يكون 15 رقم يبدأ بـ 3',
                severity: 'warning',
              });
            }
          }
          if (fieldKey === 'iban') {
            // Saudi IBAN validation
            if (!/^SA\d{22}$/.test(strVal.replace(/\s/g, ''))) {
              warnings.push({
                row: idx + 1,
                column: mapping.sourceColumn,
                field: mapping.targetField,
                value,
                error: 'IBAN سعودي يجب أن يبدأ بـ SA ويتبعه 22 رقم',
                severity: 'warning',
              });
            }
          }
        }
      });

      if (rowValid) validRows++;
      else invalidRows++;
    });

    // Duplicate detection
    const duplicates = this._detectDuplicates(data, mappings);
    if (duplicates.length > 0) {
      duplicates.forEach(dup => {
        warnings.push({
          row: dup.rows.join(', '),
          column: dup.field,
          field: dup.field,
          value: dup.value,
          error: `قيمة مكررة في الصفوف: ${dup.rows.join(', ')}`,
          severity: 'warning',
        });
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.slice(0, 100),
      warnings: warnings.slice(0, 50),
      totalRows: data.length,
      validRows,
      invalidRows,
      duplicateCount: duplicates.length,
    };
  }

  /**
   * Detect duplicates in import data
   */
  _detectDuplicates(data, mappings) {
    const duplicates = [];
    const requiredFields = (mappings || [])
      .filter(m => m.required)
      .map(m => m.sourceColumn || m.targetField);

    requiredFields.forEach(field => {
      const seen = {};
      data.forEach((row, idx) => {
        const val = String(row[field] || '').trim();
        if (!val) return;
        if (seen[val]) {
          seen[val].push(idx + 1);
        } else {
          seen[val] = [idx + 1];
        }
      });
      Object.entries(seen).forEach(([val, rows]) => {
        if (rows.length > 1) {
          duplicates.push({ field, value: val, rows, count: rows.length });
        }
      });
    });

    return duplicates;
  }

  /**
   * Transform import data using column mappings
   */
  _transformImportData(rawData, mappings) {
    if (!mappings || mappings.length === 0) return rawData;

    return rawData.map(row => {
      const transformed = {};

      mappings.forEach(mapping => {
        const sourceCol = mapping.sourceColumn;
        let value = row[sourceCol];
        const targetField = mapping.targetField;

        // Apply transformations
        if (mapping.transformRule) {
          value = this._applyTransform(value, mapping.transformRule);
        }

        // Type casting
        switch (mapping.dataType) {
          case 'number':
          case 'currency':
            value = value !== '' && value !== null ? Number(value) : undefined;
            break;
          case 'boolean':
            value = ['true', '1', 'yes', 'نعم', 'صح'].includes(String(value).toLowerCase());
            break;
          case 'date':
            value = value ? new Date(value) : undefined;
            break;
          default:
            if (typeof value === 'string') value = value.trim();
        }

        if (value !== undefined && value !== '') {
          transformed[targetField] = value;
        }
      });

      return transformed;
    });
  }

  /**
   * Apply transformation rules (enhanced)
   */
  _applyTransform(value, rule) {
    if (value === null || value === undefined) return value;

    const str = String(value);
    switch (rule) {
      case 'uppercase':
        return str.toUpperCase();
      case 'lowercase':
        return str.toLowerCase();
      case 'trim':
        return str.trim();
      case 'capitalize':
        return str.charAt(0).toUpperCase() + str.slice(1);
      case 'titleCase':
        return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
      case 'removeSpaces':
        return str.replace(/\s+/g, '');
      case 'normalizeSpaces':
        return str.replace(/\s+/g, ' ').trim();
      case 'normalizeArabic':
        return str.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
      case 'removeArabicDiacritics':
        return str.replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '');
      case 'saudiPhone': {
        // Normalize to +966 format
        let phone = str.replace(/[-\s()]/g, '');
        if (phone.startsWith('00966')) phone = '+966' + phone.substring(5);
        else if (phone.startsWith('966')) phone = '+' + phone;
        else if (phone.startsWith('05')) phone = '+966' + phone.substring(1);
        else if (phone.startsWith('5') && phone.length === 9) phone = '+966' + phone;
        return phone;
      }
      case 'cleanNumber':
        return str.replace(/[^0-9.-]/g, '');
      case 'extractDigits':
        return str.replace(/\D/g, '');
      case 'currency_sar': {
        const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? str : num.toFixed(2);
      }
      case 'percentToDecimal': {
        const pct = parseFloat(str.replace('%', ''));
        return isNaN(pct) ? str : (pct / 100).toString();
      }
      case 'booleanNormalize': {
        const trueVals = ['true', '1', 'yes', 'نعم', 'صح', 'موافق', 'y'];
        return trueVals.includes(str.toLowerCase().trim()) ? 'true' : 'false';
      }
      default:
        if (rule.startsWith('dateFormat:')) {
          return new Date(value).toISOString().split('T')[0];
        }
        if (rule.startsWith('prefix:')) {
          return rule.substring(7) + str;
        }
        if (rule.startsWith('suffix:')) {
          return str + rule.substring(7);
        }
        if (rule.startsWith('replace:')) {
          const [, from, to] = rule.match(/^replace:(.+?):(.*)$/) || [];
          return from ? str.replace(new RegExp(from, 'g'), to || '') : str;
        }
        if (rule.startsWith('substring:')) {
          const [start, end] = rule.substring(10).split(',').map(Number);
          return str.substring(start, end);
        }
        if (rule.startsWith('padStart:')) {
          const [len, ch] = rule.substring(9).split(',');
          return str.padStart(parseInt(len), ch || '0');
        }
        if (rule.startsWith('lookup:')) {
          // Format: lookup:key1=val1,key2=val2,...
          const pairs = rule.substring(7).split(',');
          const map = {};
          pairs.forEach(p => {
            const [k, v] = p.split('=');
            if (k && v) map[k.trim()] = v.trim();
          });
          return map[str.trim()] || str;
        }
        return value;
    }
  }

  /**
   * Map Mongoose type to our data type
   */
  _mongooseTypeToDataType(instance) {
    const map = {
      String: 'string',
      Number: 'number',
      Date: 'date',
      Boolean: 'boolean',
      ObjectID: 'string',
      Mixed: 'string',
    };
    return map[instance] || 'string';
  }

  /**
   * Get example value for template field
   */
  _getExampleValue(field) {
    switch (field.dataType) {
      case 'string':
        return 'مثال / Example';
      case 'number':
        return '100';
      case 'date':
        return '2026-01-01';
      case 'boolean':
        return 'true';
      case 'email':
        return 'example@domain.com';
      case 'phone':
        return '966501234567';
      case 'currency':
        return '5000.00';
      case 'select':
        return (field.options && field.options[0]) || '';
      default:
        return '';
    }
  }

  /**
   * Generate default fields from model introspection
   */
  _generateDefaultFields(module) {
    const Model = this._getModel(module);
    if (!Model || !Model.schema) return [];

    return Object.entries(Model.schema.paths)
      .filter(([key]) => !key.startsWith('_') && key !== '__v')
      .slice(0, 20)
      .map(([key, schemaType]) => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        nameAr: key,
        dataType: this._mongooseTypeToDataType(schemaType.instance),
        required: !!schemaType.isRequired,
      }));
  }

  // ─────────────────────────────────────────────────
  // SCHEDULED EXPORTS
  // ─────────────────────────────────────────────────

  /**
   * Create a scheduled export job
   */
  async createScheduledExport(params) {
    const {
      module,
      format = 'xlsx',
      fields,
      query,
      options = {},
      schedule,
      userId,
      jobName,
    } = params;

    if (!schedule || !schedule.frequency) {
      throw new Error('جدول التصدير مطلوب (frequency)');
    }

    const moduleInfo = MODULE_REGISTRY[module];
    if (!moduleInfo) throw new Error(`وحدة غير معروفة: ${module}`);

    const job = new ImportExportJob({
      jobName: jobName || `تصدير مجدول - ${moduleInfo.label}`,
      jobNameAr: `تصدير مجدول - ${moduleInfo.label}`,
      type: 'export',
      format,
      dataSource: { module, model: moduleInfo.model, query, fields },
      exportOptions: { ...options },
      schedule: {
        enabled: true,
        frequency: schedule.frequency,
        cronExpression: this._frequencyToCron(schedule.frequency, schedule.time || '06:00'),
        timezone: schedule.timezone || 'Asia/Riyadh',
        nextRunAt: this._getNextRunDate(schedule.frequency, schedule.time || '06:00'),
        maxRuns: schedule.maxRuns || 0,
      },
      status: 'scheduled',
      createdBy: userId,
    });

    await job.save();
    return job.toObject();
  }

  /**
   * List scheduled export jobs
   */
  async listScheduledExports(params = {}) {
    const { userId, page = 1, limit = 20 } = params;
    const query = { 'schedule.enabled': true, isDeleted: false };
    if (userId) query.createdBy = userId;

    const [jobs, total] = await Promise.all([
      ImportExportJob.find(query)
        .sort({ 'schedule.nextRunAt': 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ImportExportJob.countDocuments(query),
    ]);

    return { jobs, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Execute all due scheduled exports
   */
  async executeScheduledExports() {
    const now = new Date();
    const dueJobs = await ImportExportJob.find({
      'schedule.enabled': true,
      'schedule.nextRunAt': { $lte: now },
      status: { $in: ['scheduled', 'completed', 'partial'] },
      isDeleted: false,
    });

    const results = [];
    for (const job of dueJobs) {
      try {
        // Check max runs
        if (job.schedule.maxRuns > 0 && (job.schedule.runCount || 0) >= job.schedule.maxRuns) {
          job.schedule.enabled = false;
          job.status = 'completed';
          await job.save();
          continue;
        }

        // Execute the export
        const _exportResult = await this.createExport({
          module: job.dataSource.module,
          format: job.format,
          fields: job.dataSource.fields,
          query: job.dataSource.query,
          options: job.exportOptions || {},
          userId: job.createdBy,
          jobName: `${job.jobName} (تشغيل #${(job.schedule.runCount || 0) + 1})`,
        });

        // Update schedule
        job.schedule.lastRunAt = now;
        job.schedule.runCount = (job.schedule.runCount || 0) + 1;
        job.schedule.nextRunAt = this._getNextRunDate(job.schedule.frequency, null, now);
        job.status = 'scheduled';
        await job.save();

        results.push({ jobId: job.jobId, status: 'success', module: job.dataSource.module });
      } catch (error) {
        job.schedule.lastRunAt = now;
        job.schedule.nextRunAt = this._getNextRunDate(job.schedule.frequency, null, now);
        await job.save();
        results.push({ jobId: job.jobId, status: 'failed', error: error.message });
      }
    }

    return { executed: results.length, results };
  }

  /**
   * Toggle scheduled export on/off
   */
  async toggleScheduledExport(jobId, enabled, userId) {
    const job = await ImportExportJob.findOne({
      $or: [{ _id: jobId }, { jobId: jobId }],
      isDeleted: false,
    });
    if (!job) throw new Error('المهمة المجدولة غير موجودة');
    job.schedule.enabled = enabled;
    if (enabled) {
      job.schedule.nextRunAt = this._getNextRunDate(job.schedule.frequency);
      job.status = 'scheduled';
    } else {
      job.status = 'cancelled';
    }
    job.updatedBy = userId;
    await job.save();
    return job.toObject();
  }

  /**
   * Convert frequency to cron expression
   */
  _frequencyToCron(frequency, time = '06:00') {
    const [hours, minutes] = time.split(':').map(Number);
    switch (frequency) {
      case 'hourly':
        return `0 * * * *`;
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        return `${minutes} ${hours} * * 0`; // Sunday
      case 'monthly':
        return `${minutes} ${hours} 1 * *`; // 1st of month
      case 'quarterly':
        return `${minutes} ${hours} 1 */3 *`;
      default:
        return `${minutes} ${hours} * * *`;
    }
  }

  /**
   * Calculate next run date from frequency
   */
  _getNextRunDate(frequency, time, fromDate) {
    const now = fromDate || new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'hourly':
        next.setHours(next.getHours() + 1, 0, 0, 0);
        break;
      case 'daily':
        next.setDate(next.getDate() + 1);
        if (time) {
          const [h, m] = time.split(':').map(Number);
          next.setHours(h, m, 0, 0);
        }
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        if (time) {
          const [h, m] = time.split(':').map(Number);
          next.setHours(h, m, 0, 0);
        }
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1, 1);
        if (time) {
          const [h, m] = time.split(':').map(Number);
          next.setHours(h, m, 0, 0);
        }
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3, 1);
        if (time) {
          const [h, m] = time.split(':').map(Number);
          next.setHours(h, m, 0, 0);
        }
        break;
      default:
        next.setDate(next.getDate() + 1);
    }

    return next;
  }

  // ─────────────────────────────────────────────────
  // DATA CLEANUP & ENRICHMENT
  // ─────────────────────────────────────────────────

  /**
   * Clean and enrich data before import
   */
  cleanAndEnrichData(data, module, options = {}) {
    return data.map(row => {
      const cleaned = {};
      for (const [key, value] of Object.entries(row)) {
        let val = value;

        // Basic cleanup
        if (typeof val === 'string') {
          val = val.trim();
          if (options.normalizeSpaces !== false) val = val.replace(/\s+/g, ' ');
          // eslint-disable-next-line no-control-regex
          if (options.removeInvisibleChars) val = val.replace(/[\x00-\x1F\x7F]/g, '');
        }

        // Remove empty strings
        if (val === '' && options.removeEmpty) continue;

        cleaned[key] = val;
      }

      // Auto-calculate fields
      if (module === 'invoices' || module === 'expenses') {
        if (cleaned.amount && cleaned.tax === undefined) {
          const amount = parseFloat(cleaned.amount);
          if (!isNaN(amount)) {
            cleaned.tax = (amount * 0.15).toFixed(2); // 15% VAT
            cleaned.total = (amount * 1.15).toFixed(2);
          }
        }
      }

      if (module === 'payroll') {
        const basic = parseFloat(cleaned.basicSalary) || 0;
        const housing = parseFloat(cleaned.housingAllowance) || 0;
        const transport = parseFloat(cleaned.transportAllowance) || 0;
        const other = parseFloat(cleaned.otherAllowances) || 0;
        const overtime = parseFloat(cleaned.overtime) || 0;
        const deductions = parseFloat(cleaned.deductions) || 0;
        const gosi = parseFloat(cleaned.gosiDeduction) || basic * 0.0975; // 9.75% GOSI

        if (!cleaned.gosiDeduction) cleaned.gosiDeduction = gosi.toFixed(2);
        if (!cleaned.netSalary) {
          cleaned.netSalary = (
            basic +
            housing +
            transport +
            other +
            overtime -
            deductions -
            gosi
          ).toFixed(2);
        }
      }

      return cleaned;
    });
  }

  /**
   * Generate data quality report
   */
  generateDataQualityReport(data, mappings, _module) {
    const report = {
      totalRows: data.length,
      completeness: {},
      uniqueness: {},
      consistency: {},
      suggestions: [],
    };

    // Analyze completeness per field
    (mappings || []).forEach(mapping => {
      const field = mapping.sourceColumn || mapping.targetField;
      let filled = 0;
      data.forEach(row => {
        const val = row[field];
        if (val !== null && val !== undefined && val !== '') filled++;
      });
      report.completeness[field] = {
        filled,
        empty: data.length - filled,
        percentage: data.length ? Math.round((filled / data.length) * 100) : 0,
      };

      // Suggest removing empty columns
      if (filled === 0) {
        report.suggestions.push({
          type: 'remove_empty',
          field,
          message: `العمود "${field}" فارغ بالكامل ويمكن حذفه`,
        });
      }
    });

    // Analyze uniqueness for key fields
    const keyFields = (mappings || []).filter(m => m.required);
    keyFields.forEach(mapping => {
      const field = mapping.sourceColumn || mapping.targetField;
      const values = data.map(r => String(r[field] || '')).filter(v => v);
      const unique = new Set(values);
      report.uniqueness[field] = {
        total: values.length,
        unique: unique.size,
        duplicates: values.length - unique.size,
        isUnique: values.length === unique.size,
      };

      if (values.length !== unique.size) {
        report.suggestions.push({
          type: 'duplicates',
          field,
          message: `يوجد ${values.length - unique.size} قيمة مكررة في "${field}"`,
        });
      }
    });

    // Data type consistency
    (mappings || []).forEach(mapping => {
      const field = mapping.sourceColumn || mapping.targetField;
      const expectedType = mapping.dataType;
      let consistent = 0;
      let inconsistent = 0;

      data.forEach(row => {
        const val = row[field];
        if (val === null || val === undefined || val === '') return;

        switch (expectedType) {
          case 'number':
          case 'currency':
            if (isNaN(Number(String(val).replace(/[,\s]/g, '')))) {
              inconsistent++;
            } else {
              consistent++;
            }
            break;
          case 'date':
            if (isNaN(Date.parse(val))) {
              inconsistent++;
            } else {
              consistent++;
            }
            break;
          case 'email':
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
              consistent++;
            } else {
              inconsistent++;
            }
            break;
          default:
            consistent++;
        }
      });

      report.consistency[field] = { consistent, inconsistent, total: consistent + inconsistent };
      if (inconsistent > 0) {
        report.suggestions.push({
          type: 'inconsistency',
          field,
          message: `${inconsistent} قيمة غير متوافقة مع النوع "${expectedType}" في "${field}"`,
        });
      }
    });

    report.overallScore = this._calculateDataQualityScore(report);
    return report;
  }

  /**
   * Calculate overall data quality score (0-100)
   */
  _calculateDataQualityScore(report) {
    const scores = [];

    // Completeness score
    const compValues = Object.values(report.completeness);
    if (compValues.length > 0) {
      const avgComp = compValues.reduce((s, c) => s + c.percentage, 0) / compValues.length;
      scores.push(avgComp);
    }

    // Uniqueness score for key fields
    const uniqValues = Object.values(report.uniqueness);
    if (uniqValues.length > 0) {
      const avgUniq =
        uniqValues.reduce((s, u) => {
          return s + (u.total > 0 ? (u.unique / u.total) * 100 : 100);
        }, 0) / uniqValues.length;
      scores.push(avgUniq);
    }

    // Consistency score
    const consValues = Object.values(report.consistency);
    if (consValues.length > 0) {
      const avgCons =
        consValues.reduce((s, c) => {
          return s + (c.total > 0 ? (c.consistent / c.total) * 100 : 100);
        }, 0) / consValues.length;
      scores.push(avgCons);
    }

    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;
  }

  /**
   * Create ZIP from file buffers
   */
  _createZip(files) {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks = [];

      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      files.forEach(file => {
        archive.append(file.buffer, { name: file.name });
      });

      archive.finalize();
    });
  }
}

module.exports = new ImportExportProService();

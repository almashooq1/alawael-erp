'use strict';

/**
 * module-registry.js — extracted from services/importExportPro.service.js.
 *
 * Maps module names to their canonical Mongoose model references +
 * bilingual labels. Pure data; no logic. Used by ImportExportProService
 * to resolve which collection to read/write for a given /api/import-export
 * module key.
 *
 * Extracted to keep the parent service focused on logic, not registry data.
 */

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

module.exports = { MODULE_REGISTRY };

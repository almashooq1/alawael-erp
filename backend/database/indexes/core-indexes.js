/**
 * @file core-indexes.js
 * @description فهارس MongoDB الأساسية لنظام الأوائل ERP
 * Core MongoDB Indexes for Al-Awael ERP System
 *
 * يغطي هذا الملف الفهارس لجميع النماذج الأساسية:
 * - المستخدمون (Users)
 * - المستفيدون (Beneficiaries)
 * - الموظفون (Employees)
 * - الحضور (Attendance)
 * - الجلسات (Sessions/TherapySessions)
 * - الإجازات (Leaves)
 * - الرواتب (Payroll)
 * - الفواتير (Invoices)
 * - السجلات التدقيقية (AuditLogs)
 * - الإشعارات (Notifications)
 * - الفروع (Branches)
 * - المركبات (Vehicles)
 * - الأصول (Assets)
 * - المشاريع (Projects)
 */

'use strict';

const mongoose = require('mongoose');

// =====================================================================
//  HELPERS
// =====================================================================

const log = msg => console.log(`  [INDEX] ${msg}`);
const warn = msg => console.warn(`  [INDEX WARN] ${msg}`);

/**
 * إنشاء فهرس بأمان - يتجاهل إذا كان موجوداً مسبقاً
 * Safely create an index - ignores if already exists
 */
async function safeCreateIndex(collection, indexSpec, options = {}) {
  try {
    await collection.createIndex(indexSpec, { background: true, ...options });
  } catch (err) {
    if (err.code === 85 || err.code === 86) {
      // IndexOptionsConflict or IndexKeySpecsConflict - index exists with different options
      warn(`Index conflict on ${collection.collectionName}: ${err.message}`);
    } else if (err.code === 11000) {
      warn(`Duplicate key conflict creating index on ${collection.collectionName}`);
    } else {
      throw err;
    }
  }
}

/**
 * إسقاط فهرس بأمان - يتجاهل إذا لم يكن موجوداً
 * Safely drop an index - ignores if not found
 */
async function safeDropIndex(collection, indexName) {
  try {
    await collection.dropIndex(indexName);
    log(`Dropped index: ${collection.collectionName}.${indexName}`);
  } catch (err) {
    if (err.code === 27 || err.message.includes('index not found')) {
      // Index not found - that's fine
    } else {
      warn(`Could not drop index ${indexName} from ${collection.collectionName}: ${err.message}`);
    }
  }
}

// =====================================================================
//  USERS INDEXES
// =====================================================================
async function createUserIndexes(db) {
  const col = db.collection('users');
  log('Creating users indexes...');

  // Unique email (sparse for optional email)
  await safeDropIndex(col, 'email_1');
  await safeCreateIndex(
    col,
    { email: 1 },
    { unique: true, sparse: true, name: 'idx_users_email_unique' }
  );

  // Username unique
  await safeCreateIndex(
    col,
    { username: 1 },
    { unique: true, sparse: true, name: 'idx_users_username_unique' }
  );

  // National ID
  await safeCreateIndex(col, { nationalId: 1 }, { sparse: true, name: 'idx_users_nationalId' });

  // Role + active status (for RBAC queries)
  await safeCreateIndex(col, { role: 1, isActive: 1 }, { name: 'idx_users_role_active' });

  // Branch assignment
  await safeCreateIndex(col, { branchId: 1, role: 1 }, { name: 'idx_users_branch_role' });

  // Last login (for session cleanup)
  await safeCreateIndex(col, { lastLogin: -1 }, { sparse: true, name: 'idx_users_lastLogin' });

  // Password reset token (sparse - only set during reset)
  await safeCreateIndex(
    col,
    { passwordResetToken: 1 },
    { sparse: true, expireAfterSeconds: 3600, name: 'idx_users_resetToken_ttl' }
  );

  // Email verification token
  await safeCreateIndex(
    col,
    { emailVerificationToken: 1 },
    { sparse: true, expireAfterSeconds: 86400, name: 'idx_users_emailVerify_ttl' }
  );

  // Refresh token lookup
  await safeCreateIndex(col, { 'tokens.token': 1 }, { sparse: true, name: 'idx_users_tokens' });

  // Full text search
  await safeCreateIndex(
    col,
    { name: 'text', email: 'text', username: 'text', 'profile.phone': 'text' },
    {
      name: 'idx_users_text',
      default_language: 'none',
      weights: { name: 10, email: 8, username: 5 },
    }
  );

  // Created at (for sorting/pagination)
  await safeCreateIndex(col, { createdAt: -1 }, { name: 'idx_users_createdAt' });

  log('✅ Users indexes created');
}

// =====================================================================
//  BENEFICIARIES INDEXES
// =====================================================================
async function createBeneficiaryIndexes(db) {
  const col = db.collection('beneficiaries');
  log('Creating beneficiaries indexes...');

  // Beneficiary number (unique)
  await safeCreateIndex(
    col,
    { beneficiaryNumber: 1 },
    { unique: true, sparse: true, name: 'idx_beneficiary_number_unique' }
  );

  // National ID
  await safeCreateIndex(
    col,
    { nationalId: 1 },
    { sparse: true, name: 'idx_beneficiary_nationalId' }
  );

  // Case status + branch (most common query)
  await safeCreateIndex(
    col,
    { caseStatus: 1, branchId: 1 },
    { name: 'idx_beneficiary_status_branch' }
  );

  // Program enrollment
  await safeCreateIndex(
    col,
    { programId: 1, caseStatus: 1 },
    { name: 'idx_beneficiary_program_status' }
  );

  // Disability type
  await safeCreateIndex(col, { disabilityType: 1 }, { name: 'idx_beneficiary_disability' });

  // Guardian/family relationship
  await safeCreateIndex(col, { guardianId: 1 }, { sparse: true, name: 'idx_beneficiary_guardian' });

  // Date of birth (for age-based queries)
  await safeCreateIndex(col, { dateOfBirth: 1 }, { name: 'idx_beneficiary_dob' });

  // Enrollment date
  await safeCreateIndex(col, { enrollmentDate: -1 }, { name: 'idx_beneficiary_enrollment' });

  // Assigned therapist
  await safeCreateIndex(
    col,
    { assignedTherapist: 1 },
    { sparse: true, name: 'idx_beneficiary_therapist' }
  );

  // Waitlist position
  await safeCreateIndex(
    col,
    { waitlistPosition: 1 },
    { sparse: true, name: 'idx_beneficiary_waitlist' }
  );

  // Full text search (Arabic + English)
  await safeCreateIndex(
    col,
    { 'name.ar': 'text', 'name.en': 'text', nationalId: 'text', notes: 'text' },
    {
      name: 'idx_beneficiary_text',
      default_language: 'none',
      weights: { 'name.ar': 10, 'name.en': 10, nationalId: 8, notes: 2 },
    }
  );

  // Created at
  await safeCreateIndex(col, { createdAt: -1 }, { name: 'idx_beneficiary_createdAt' });

  log('✅ Beneficiaries indexes created');
}

// =====================================================================
//  EMPLOYEES INDEXES
// =====================================================================
async function createEmployeeIndexes(db) {
  const col = db.collection('employees');
  log('Creating employees indexes...');

  // Employee ID (unique)
  await safeCreateIndex(
    col,
    { employeeId: 1 },
    { unique: true, sparse: true, name: 'idx_employee_id_unique' }
  );

  // National ID
  await safeCreateIndex(col, { nationalId: 1 }, { sparse: true, name: 'idx_employee_nationalId' });

  // Iqama number (for foreign workers)
  await safeCreateIndex(col, { iqamaNumber: 1 }, { sparse: true, name: 'idx_employee_iqama' });

  // Department + position
  await safeCreateIndex(
    col,
    { department: 1, position: 1 },
    { name: 'idx_employee_dept_position' }
  );

  // Branch
  await safeCreateIndex(col, { branchId: 1, status: 1 }, { name: 'idx_employee_branch_status' });

  // Employment status
  await safeCreateIndex(
    col,
    { status: 1, employmentType: 1 },
    { name: 'idx_employee_status_type' }
  );

  // Manager/supervisor lookup
  await safeCreateIndex(col, { managerId: 1 }, { sparse: true, name: 'idx_employee_manager' });

  // User account link
  await safeCreateIndex(col, { userId: 1 }, { sparse: true, name: 'idx_employee_user' });

  // Contract expiry alerts
  await safeCreateIndex(
    col,
    { contractEndDate: 1 },
    { sparse: true, name: 'idx_employee_contractEnd' }
  );

  // Iqama expiry alerts
  await safeCreateIndex(
    col,
    { iqamaExpiryDate: 1 },
    { sparse: true, name: 'idx_employee_iqamaExpiry' }
  );

  // Full text search
  await safeCreateIndex(
    col,
    {
      'name.ar': 'text',
      'name.en': 'text',
      employeeId: 'text',
      department: 'text',
      position: 'text',
    },
    {
      name: 'idx_employee_text',
      default_language: 'none',
      weights: { 'name.ar': 10, 'name.en': 10, employeeId: 8, department: 4, position: 4 },
    }
  );

  await safeCreateIndex(col, { createdAt: -1 }, { name: 'idx_employee_createdAt' });

  log('✅ Employees indexes created');
}

// =====================================================================
//  ATTENDANCE INDEXES
// =====================================================================
async function createAttendanceIndexes(db) {
  const col = db.collection('attendances');
  log('Creating attendance indexes...');

  // Employee + date (most common query)
  await safeCreateIndex(col, { employeeId: 1, date: -1 }, { name: 'idx_attendance_emp_date' });

  // Branch + date (for branch reports)
  await safeCreateIndex(col, { branchId: 1, date: -1 }, { name: 'idx_attendance_branch_date' });

  // Status (late, absent, present)
  await safeCreateIndex(col, { status: 1, date: -1 }, { name: 'idx_attendance_status_date' });

  // Date range queries (reports)
  await safeCreateIndex(col, { date: -1 }, { name: 'idx_attendance_date' });

  // Shift assignment
  await safeCreateIndex(col, { shiftId: 1 }, { sparse: true, name: 'idx_attendance_shift' });

  // Biometric device
  await safeCreateIndex(
    col,
    { deviceId: 1, date: -1 },
    { sparse: true, name: 'idx_attendance_device_date' }
  );

  // Auto-expire old records after 3 years (optional - only for logs)
  // await safeCreateIndex(col, { createdAt: 1 }, { expireAfterSeconds: 94608000, name: 'idx_attendance_ttl' });

  log('✅ Attendance indexes created');
}

// =====================================================================
//  THERAPY SESSIONS INDEXES
// =====================================================================
async function createTherapySessionIndexes(db) {
  const col = db.collection('therapysessions');
  log('Creating therapy sessions indexes...');

  // Beneficiary + date
  await safeCreateIndex(
    col,
    { beneficiaryId: 1, sessionDate: -1 },
    { name: 'idx_session_beneficiary_date' }
  );

  // Therapist + date
  await safeCreateIndex(
    col,
    { therapistId: 1, sessionDate: -1 },
    { name: 'idx_session_therapist_date' }
  );

  // Program + type
  await safeCreateIndex(
    col,
    { programId: 1, sessionType: 1 },
    { name: 'idx_session_program_type' }
  );

  // Status
  await safeCreateIndex(col, { status: 1, sessionDate: -1 }, { name: 'idx_session_status_date' });

  // Room booking
  await safeCreateIndex(
    col,
    { roomId: 1, sessionDate: -1 },
    { sparse: true, name: 'idx_session_room_date' }
  );

  // Date range
  await safeCreateIndex(col, { sessionDate: -1 }, { name: 'idx_session_date' });

  log('✅ Therapy sessions indexes created');
}

// =====================================================================
//  LEAVES INDEXES
// =====================================================================
async function createLeaveIndexes(db) {
  const col = db.collection('leaves');
  log('Creating leaves indexes...');

  // Employee + year
  await safeCreateIndex(col, { employeeId: 1, year: -1 }, { name: 'idx_leave_emp_year' });

  // Status + dates
  await safeCreateIndex(col, { status: 1, startDate: -1 }, { name: 'idx_leave_status_date' });

  // Type + department
  await safeCreateIndex(col, { leaveType: 1, department: 1 }, { name: 'idx_leave_type_dept' });

  // Approver lookup
  await safeCreateIndex(
    col,
    { approverId: 1, status: 1 },
    { sparse: true, name: 'idx_leave_approver_status' }
  );

  // Branch
  await safeCreateIndex(col, { branchId: 1, status: 1 }, { name: 'idx_leave_branch_status' });

  log('✅ Leaves indexes created');
}

// =====================================================================
//  PAYROLL INDEXES
// =====================================================================
async function createPayrollIndexes(db) {
  const col = db.collection('payrolls');
  log('Creating payroll indexes...');

  // Employee + period (unique per period)
  await safeCreateIndex(col, { employeeId: 1, payPeriod: -1 }, { name: 'idx_payroll_emp_period' });

  // Period (for bulk processing)
  await safeCreateIndex(col, { payPeriod: -1, status: 1 }, { name: 'idx_payroll_period_status' });

  // Branch + period
  await safeCreateIndex(col, { branchId: 1, payPeriod: -1 }, { name: 'idx_payroll_branch_period' });

  // Payment status
  await safeCreateIndex(col, { paymentStatus: 1 }, { name: 'idx_payroll_payment_status' });

  // GOSI sync
  await safeCreateIndex(col, { gosiSynced: 1 }, { sparse: true, name: 'idx_payroll_gosi_sync' });

  log('✅ Payroll indexes created');
}

// =====================================================================
//  INVOICES INDEXES
// =====================================================================
async function createInvoiceIndexes(db) {
  const col = db.collection('invoices');
  log('Creating invoices indexes...');

  // Invoice number (unique)
  await safeCreateIndex(
    col,
    { invoiceNumber: 1 },
    { unique: true, sparse: true, name: 'idx_invoice_number_unique' }
  );

  // Client + date
  await safeCreateIndex(col, { clientId: 1, invoiceDate: -1 }, { name: 'idx_invoice_client_date' });

  // Status + due date (for collections)
  await safeCreateIndex(col, { status: 1, dueDate: 1 }, { name: 'idx_invoice_status_duedate' });

  // Branch + period
  await safeCreateIndex(col, { branchId: 1, invoiceDate: -1 }, { name: 'idx_invoice_branch_date' });

  // Zatca/FATOORAH e-invoice reference
  await safeCreateIndex(col, { zatcaUUID: 1 }, { sparse: true, name: 'idx_invoice_zatca_uuid' });

  // Payment reference
  await safeCreateIndex(col, { paymentRef: 1 }, { sparse: true, name: 'idx_invoice_payment_ref' });

  log('✅ Invoices indexes created');
}

// =====================================================================
//  AUDIT LOGS INDEXES
// =====================================================================
async function createAuditLogIndexes(db) {
  const col = db.collection('auditlogs');
  log('Creating audit logs indexes...');

  // User + action + date (main audit query)
  await safeCreateIndex(
    col,
    { userId: 1, action: 1, createdAt: -1 },
    { name: 'idx_audit_user_action_date' }
  );

  // Resource type + id
  await safeCreateIndex(
    col,
    { resourceType: 1, resourceId: 1, createdAt: -1 },
    { name: 'idx_audit_resource' }
  );

  // IP address (security)
  await safeCreateIndex(
    col,
    { ipAddress: 1, createdAt: -1 },
    { sparse: true, name: 'idx_audit_ip_date' }
  );

  // Branch audit
  await safeCreateIndex(
    col,
    { branchId: 1, createdAt: -1 },
    { sparse: true, name: 'idx_audit_branch_date' }
  );

  // Severity level
  await safeCreateIndex(col, { severity: 1, createdAt: -1 }, { name: 'idx_audit_severity_date' });

  // Auto-expire after 90 days
  await safeCreateIndex(
    col,
    { createdAt: 1 },
    { expireAfterSeconds: 7776000, name: 'idx_audit_ttl_90days' }
  );

  log('✅ Audit logs indexes created');
}

// =====================================================================
//  NOTIFICATIONS INDEXES
// =====================================================================
async function createNotificationIndexes(db) {
  const col = db.collection('notifications');
  log('Creating notifications indexes...');

  // Recipient + read status + date
  await safeCreateIndex(
    col,
    { recipientId: 1, isRead: 1, createdAt: -1 },
    { name: 'idx_notif_recipient_read' }
  );

  // Type + date
  await safeCreateIndex(col, { type: 1, createdAt: -1 }, { name: 'idx_notif_type_date' });

  // Channel (push, email, sms, whatsapp)
  await safeCreateIndex(col, { channel: 1, status: 1 }, { name: 'idx_notif_channel_status' });

  // Scheduled notifications
  await safeCreateIndex(
    col,
    { scheduledAt: 1, status: 1 },
    { sparse: true, name: 'idx_notif_scheduled' }
  );

  // Auto-expire after 30 days
  await safeCreateIndex(
    col,
    { createdAt: 1 },
    { expireAfterSeconds: 2592000, name: 'idx_notif_ttl_30days' }
  );

  log('✅ Notifications indexes created');
}

// =====================================================================
//  BRANCHES INDEXES
// =====================================================================
async function createBranchIndexes(db) {
  const col = db.collection('branches');
  log('Creating branches indexes...');

  // Branch code (unique)
  await safeCreateIndex(
    col,
    { code: 1 },
    { unique: true, sparse: true, name: 'idx_branch_code_unique' }
  );

  // Type + status
  await safeCreateIndex(col, { type: 1, isActive: 1 }, { name: 'idx_branch_type_active' });

  // Region/city
  await safeCreateIndex(col, { region: 1, city: 1 }, { name: 'idx_branch_region_city' });

  // Manager
  await safeCreateIndex(col, { managerId: 1 }, { sparse: true, name: 'idx_branch_manager' });

  log('✅ Branches indexes created');
}

// =====================================================================
//  VEHICLES INDEXES
// =====================================================================
async function createVehicleIndexes(db) {
  const col = db.collection('vehicles');
  log('Creating vehicles indexes...');

  // Plate number (unique)
  await safeCreateIndex(
    col,
    { plateNumber: 1 },
    { unique: true, sparse: true, name: 'idx_vehicle_plate_unique' }
  );

  // Status + branch
  await safeCreateIndex(col, { status: 1, branchId: 1 }, { name: 'idx_vehicle_status_branch' });

  // Insurance expiry
  await safeCreateIndex(
    col,
    { insuranceExpiryDate: 1 },
    { sparse: true, name: 'idx_vehicle_insurance_expiry' }
  );

  // License expiry
  await safeCreateIndex(
    col,
    { licenseExpiryDate: 1 },
    { sparse: true, name: 'idx_vehicle_license_expiry' }
  );

  // Maintenance schedule
  await safeCreateIndex(
    col,
    { nextMaintenanceDate: 1 },
    { sparse: true, name: 'idx_vehicle_maintenance' }
  );

  log('✅ Vehicles indexes created');
}

// =====================================================================
//  PROGRAMS INDEXES
// =====================================================================
async function createProgramIndexes(db) {
  const col = db.collection('programs');
  log('Creating programs indexes...');

  await safeCreateIndex(
    col,
    { code: 1 },
    { unique: true, sparse: true, name: 'idx_program_code_unique' }
  );
  await safeCreateIndex(col, { category: 1, isActive: 1 }, { name: 'idx_program_category_active' });
  await safeCreateIndex(col, { disabilityType: 1 }, { name: 'idx_program_disability_type' });
  await safeCreateIndex(col, { branchId: 1, isActive: 1 }, { name: 'idx_program_branch_active' });

  log('✅ Programs indexes created');
}

// =====================================================================
//  ASSESSMENTS INDEXES
// =====================================================================
async function createAssessmentIndexes(db) {
  const col = db.collection('assessments');
  log('Creating assessments indexes...');

  await safeCreateIndex(
    col,
    { beneficiaryId: 1, assessmentDate: -1 },
    { name: 'idx_assessment_beneficiary_date' }
  );
  await safeCreateIndex(col, { type: 1, createdAt: -1 }, { name: 'idx_assessment_type_date' });
  await safeCreateIndex(col, { assessorId: 1 }, { sparse: true, name: 'idx_assessment_assessor' });
  await safeCreateIndex(col, { status: 1 }, { name: 'idx_assessment_status' });

  log('✅ Assessments indexes created');
}

// =====================================================================
//  APPOINTMENTS INDEXES
// =====================================================================
async function createAppointmentIndexes(db) {
  const col = db.collection('appointments');
  log('Creating appointments indexes...');

  await safeCreateIndex(
    col,
    { beneficiaryId: 1, appointmentDate: -1 },
    { name: 'idx_appointment_beneficiary_date' }
  );
  await safeCreateIndex(
    col,
    { therapistId: 1, appointmentDate: -1 },
    { name: 'idx_appointment_therapist_date' }
  );
  await safeCreateIndex(
    col,
    { status: 1, appointmentDate: -1 },
    { name: 'idx_appointment_status_date' }
  );
  await safeCreateIndex(
    col,
    { roomId: 1, appointmentDate: -1 },
    { sparse: true, name: 'idx_appointment_room_date' }
  );

  log('✅ Appointments indexes created');
}

// =====================================================================
//  DOCUMENTS INDEXES
// =====================================================================
async function createDocumentIndexes(db) {
  const col = db.collection('documents');
  log('Creating documents indexes...');

  await safeCreateIndex(
    col,
    { ownerId: 1, ownerType: 1, createdAt: -1 },
    { name: 'idx_doc_owner' }
  );
  await safeCreateIndex(col, { category: 1, status: 1 }, { name: 'idx_doc_category_status' });
  await safeCreateIndex(col, { expiryDate: 1 }, { sparse: true, name: 'idx_doc_expiry' });
  await safeCreateIndex(col, { branchId: 1, category: 1 }, { name: 'idx_doc_branch_category' });
  await safeCreateIndex(
    col,
    { title: 'text', description: 'text', tags: 'text' },
    { name: 'idx_doc_text', default_language: 'none' }
  );

  log('✅ Documents indexes created');
}

// =====================================================================
//  PROJECTS / TASKS INDEXES
// =====================================================================
async function createProjectIndexes(db) {
  const projectCol = db.collection('projects');
  const taskCol = db.collection('tasks');

  log('Creating projects/tasks indexes...');

  await safeCreateIndex(
    projectCol,
    { status: 1, startDate: -1 },
    { name: 'idx_project_status_date' }
  );
  await safeCreateIndex(
    projectCol,
    { managerId: 1 },
    { sparse: true, name: 'idx_project_manager' }
  );
  await safeCreateIndex(projectCol, { branchId: 1 }, { name: 'idx_project_branch' });

  await safeCreateIndex(taskCol, { projectId: 1, status: 1 }, { name: 'idx_task_project_status' });
  await safeCreateIndex(
    taskCol,
    { assigneeId: 1, status: 1, dueDate: 1 },
    { name: 'idx_task_assignee_status' }
  );
  await safeCreateIndex(taskCol, { dueDate: 1, status: 1 }, { name: 'idx_task_duedate_status' });

  log('✅ Projects/Tasks indexes created');
}

// =====================================================================
//  FINANCIAL INDEXES
// =====================================================================
async function createFinancialIndexes(db) {
  // Transactions
  const txCol = db.collection('transactions');
  const journalCol = db.collection('journalentries');
  const paymentCol = db.collection('payments');

  log('Creating financial indexes...');

  await safeCreateIndex(txCol, { type: 1, date: -1 }, { name: 'idx_tx_type_date' });
  await safeCreateIndex(txCol, { accountId: 1, date: -1 }, { name: 'idx_tx_account_date' });
  await safeCreateIndex(txCol, { branchId: 1, date: -1 }, { name: 'idx_tx_branch_date' });
  await safeCreateIndex(txCol, { reference: 1 }, { sparse: true, name: 'idx_tx_reference' });

  await safeCreateIndex(
    journalCol,
    { entryNumber: 1 },
    { unique: true, sparse: true, name: 'idx_journal_number_unique' }
  );
  await safeCreateIndex(journalCol, { date: -1, status: 1 }, { name: 'idx_journal_date_status' });
  await safeCreateIndex(journalCol, { fiscalPeriod: 1 }, { name: 'idx_journal_fiscal_period' });

  await safeCreateIndex(
    paymentCol,
    { invoiceId: 1, createdAt: -1 },
    { name: 'idx_payment_invoice' }
  );
  await safeCreateIndex(paymentCol, { status: 1, createdAt: -1 }, { name: 'idx_payment_status' });
  await safeCreateIndex(paymentCol, { method: 1, createdAt: -1 }, { name: 'idx_payment_method' });

  log('✅ Financial indexes created');
}

// =====================================================================
//  SESSIONS (USER AUTH) INDEXES
// =====================================================================
async function createAuthSessionIndexes(db) {
  const col = db.collection('sessions');
  log('Creating auth sessions indexes...');

  await safeCreateIndex(col, { userId: 1, isActive: 1 }, { name: 'idx_session_user_active' });
  await safeCreateIndex(
    col,
    { token: 1 },
    { unique: true, sparse: true, name: 'idx_session_token_unique' }
  );
  await safeCreateIndex(
    col,
    { refreshToken: 1 },
    { sparse: true, name: 'idx_session_refresh_token' }
  );

  // Auto-expire after 7 days
  await safeCreateIndex(
    col,
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'idx_session_expiry_ttl' }
  );

  log('✅ Auth sessions indexes created');
}

// =====================================================================
//  WAITLIST INDEXES
// =====================================================================
async function createWaitlistIndexes(db) {
  const col = db.collection('waitlists');
  log('Creating waitlist indexes...');

  await safeCreateIndex(
    col,
    { programId: 1, status: 1, position: 1 },
    { name: 'idx_waitlist_program_status' }
  );
  await safeCreateIndex(col, { beneficiaryId: 1 }, { name: 'idx_waitlist_beneficiary' });
  await safeCreateIndex(col, { registrationDate: 1 }, { name: 'idx_waitlist_reg_date' });

  log('✅ Waitlist indexes created');
}

// =====================================================================
//  MAIN EXPORT: CREATE ALL CORE INDEXES
// =====================================================================
async function createAllCoreIndexes(db) {
  console.log('\n📊 Creating core database indexes...\n');
  const start = Date.now();

  const indexFunctions = [
    createUserIndexes,
    createBeneficiaryIndexes,
    createEmployeeIndexes,
    createAttendanceIndexes,
    createTherapySessionIndexes,
    createLeaveIndexes,
    createPayrollIndexes,
    createInvoiceIndexes,
    createAuditLogIndexes,
    createNotificationIndexes,
    createBranchIndexes,
    createVehicleIndexes,
    createProgramIndexes,
    createAssessmentIndexes,
    createAppointmentIndexes,
    createDocumentIndexes,
    createProjectIndexes,
    createFinancialIndexes,
    createAuthSessionIndexes,
    createWaitlistIndexes,
  ];

  const results = { success: [], failed: [] };

  for (const fn of indexFunctions) {
    try {
      await fn(db);
      results.success.push(fn.name);
    } catch (err) {
      console.error(`❌ Failed: ${fn.name}: ${err.message}`);
      results.failed.push({ name: fn.name, error: err.message });
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n✅ Core indexes completed in ${elapsed}s`);
  console.log(`   Success: ${results.success.length} | Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.warn('⚠️  Failed index creations:');
    results.failed.forEach(f => console.warn(`   - ${f.name}: ${f.error}`));
  }

  return results;
}

module.exports = {
  createAllCoreIndexes,
  createUserIndexes,
  createBeneficiaryIndexes,
  createEmployeeIndexes,
  createAttendanceIndexes,
  createTherapySessionIndexes,
  createLeaveIndexes,
  createPayrollIndexes,
  createInvoiceIndexes,
  createAuditLogIndexes,
  createNotificationIndexes,
  createBranchIndexes,
  createVehicleIndexes,
  createProgramIndexes,
  createAssessmentIndexes,
  createAppointmentIndexes,
  createDocumentIndexes,
  createProjectIndexes,
  createFinancialIndexes,
  createAuthSessionIndexes,
  createWaitlistIndexes,
  safeCreateIndex,
  safeDropIndex,
};

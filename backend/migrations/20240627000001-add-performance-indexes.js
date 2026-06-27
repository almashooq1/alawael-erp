/**
 * Migration: Add Performance Indexes (20240627)
 * إضافة indexes الأداء لـ MongoDB
 */

module.exports = {
  async up(db) {
    console.log('Creating performance indexes...');

    // WhatsApp & Communication indexes
    await db.collection('whatsappdlqs').createIndex(
      { status: 1, nextRetryAt: 1, lockedUntil: 1 },
      { name: 'idx_whatsappdlq_claim' }
    );
    await db.collection('whatsappconversations').createIndex(
      { phone: 1, lastMessageAt: -1 },
      { name: 'idx_whatsappconversation_recent' }
    );

    // Report & Dashboard indexes
    await db.collection('reporttemplates').createIndex(
      { category: 1, type: 1, isActive: 1 },
      { name: 'idx_reporttemplate_lookup' }
    );
    await db.collection('scheduledreports').createIndex(
      { status: 1, nextRunAt: 1 },
      { name: 'idx_scheduledreport_pending' }
    );

    // ZATCA & Finance indexes
    await db.collection('invoices').createIndex(
      { zatcaStatus: 1, submissionDate: -1 },
      { name: 'idx_invoice_zatca_status' }
    );
    await db.collection('chartofaccounts').createIndex(
      { code: 1, status: 1 },
      { name: 'idx_coa_code' }
    );

    // Beneficiary indexes
    await db.collection('beneficiaries').createIndex(
      { status: 1, branchId: 1 },
      { name: 'idx_beneficiary_status_branch' }
    );

    // Session indexes
    await db.collection('sessions').createIndex(
      { beneficiaryId: 1, date: -1 },
      { name: 'idx_session_beneficiary_date' }
    );

    // Employee indexes
    await db.collection('employees').createIndex(
      { departmentId: 1, status: 1 },
      { name: 'idx_employee_dept_status' }
    );

    console.log('Indexes created successfully');
  },

  async down(db) {
    console.log('Removing performance indexes...');

    await db.collection('whatsappdlqs').dropIndex('idx_whatsappdlq_claim');
    await db.collection('whatsappconversations').dropIndex('idx_whatsappconversation_recent');
    await db.collection('reporttemplates').dropIndex('idx_reporttemplate_lookup');
    await db.collection('scheduledreports').dropIndex('idx_scheduledreport_pending');
    await db.collection('invoices').dropIndex('idx_invoice_zatca_status');
    await db.collection('chartofaccounts').dropIndex('idx_coa_code');
    await db.collection('beneficiaries').dropIndex('idx_beneficiary_status_branch');
    await db.collection('sessions').dropIndex('idx_session_beneficiary_date');
    await db.collection('employees').dropIndex('idx_employee_dept_status');

    console.log('Indexes removed successfully');
  },
};

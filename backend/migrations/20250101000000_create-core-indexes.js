/**
 * Migration: Create core indexes
 * Created: Initial migration
 *
 * Ensures all critical indexes exist for performance optimization.
 *
 * @param {import('mongodb').Db} db
 */

module.exports = {
  async up(db) {
    // Users indexes – drop legacy non-sparse email index if it exists
    await db
      .collection('users')
      .dropIndex('email_1')
      .catch(() => {});
    await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ role: 1, isActive: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });

    // Beneficiaries indexes
    await db
      .collection('beneficiaries')
      .createIndex({ nationalId: 1 }, { unique: true, sparse: true });
    await db.collection('beneficiaries').createIndex({ status: 1, center: 1 });
    await db.collection('beneficiaries').createIndex({ 'guardian.phone': 1 });
    await db.collection('beneficiaries').createIndex({ createdAt: -1 });

    // Sessions / Appointments
    await db.collection('sessions').createIndex({ beneficiary: 1, date: -1 });
    await db.collection('sessions').createIndex({ therapist: 1, date: -1 });
    await db.collection('sessions').createIndex({ status: 1, date: 1 });

    // Invoices
    await db
      .collection('invoices')
      .createIndex({ invoiceNumber: 1 }, { unique: true, sparse: true });
    await db.collection('invoices').createIndex({ beneficiary: 1, createdAt: -1 });
    await db.collection('invoices').createIndex({ status: 1, dueDate: 1 });

    // Audit logs
    await db.collection('auditlogs').createIndex({ user: 1, createdAt: -1 });
    await db.collection('auditlogs').createIndex({ action: 1, createdAt: -1 });
    await db.collection('auditlogs').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 90 * 24 * 3600 } // 90-day TTL
    );

    // Notifications
    await db.collection('notifications').createIndex({ recipient: 1, read: 1, createdAt: -1 });
    await db.collection('notifications').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 30 * 24 * 3600 } // 30-day TTL
    );
  },

  async down(db) {
    // Roll back only the non-unique indexes to be safe
    await db
      .collection('users')
      .dropIndex('role_1_isActive_1')
      .catch(() => {});
    await db
      .collection('users')
      .dropIndex('createdAt_-1')
      .catch(() => {});
    await db
      .collection('beneficiaries')
      .dropIndex('status_1_center_1')
      .catch(() => {});
    await db
      .collection('beneficiaries')
      .dropIndex('guardian.phone_1')
      .catch(() => {});
    await db
      .collection('sessions')
      .dropIndex('beneficiary_1_date_-1')
      .catch(() => {});
    await db
      .collection('sessions')
      .dropIndex('therapist_1_date_-1')
      .catch(() => {});
    await db
      .collection('sessions')
      .dropIndex('status_1_date_1')
      .catch(() => {});
    await db
      .collection('invoices')
      .dropIndex('beneficiary_1_createdAt_-1')
      .catch(() => {});
    await db
      .collection('invoices')
      .dropIndex('status_1_dueDate_1')
      .catch(() => {});
  },
};

/**
 * Migration: Add text search indexes
 * Created: Second migration
 *
 * Adds compound text indexes for Arabic+English full-text search
 * on key collections.
 *
 * @param {import('mongodb').Db} db
 */

module.exports = {
  async up(db) {
    // Beneficiaries text search (Arabic/English names, notes)
    await db.collection('beneficiaries').createIndex(
      {
        'name.ar': 'text',
        'name.en': 'text',
        nationalId: 'text',
        notes: 'text',
      },
      {
        name: 'beneficiaries_text_search',
        default_language: 'none',
        weights: { 'name.ar': 10, 'name.en': 10, nationalId: 5, notes: 1 },
      }
    );

    // Users text search
    await db.collection('users').createIndex(
      {
        name: 'text',
        email: 'text',
        username: 'text',
      },
      {
        name: 'users_text_search',
        weights: { name: 10, email: 5, username: 3 },
      }
    );

    // Employees text search
    await db.collection('employees').createIndex(
      {
        'name.ar': 'text',
        'name.en': 'text',
        employeeId: 'text',
        department: 'text',
      },
      {
        name: 'employees_text_search',
        default_language: 'none',
        weights: { 'name.ar': 10, 'name.en': 10, employeeId: 5, department: 3 },
      }
    );
  },

  async down(db) {
    await db
      .collection('beneficiaries')
      .dropIndex('beneficiaries_text_search')
      .catch(() => {});
    await db
      .collection('users')
      .dropIndex('users_text_search')
      .catch(() => {});
    await db
      .collection('employees')
      .dropIndex('employees_text_search')
      .catch(() => {});
  },
};

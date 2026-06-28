/**
 * Migration: Add Default Timestamps (20240627)
 * إضافة timestamps افتراضية للـ documents القديمة
 */

module.exports = {
  async up(db) {
    console.log('Adding default timestamps...');

    const now = new Date();

    // Add createdAt/updatedAt to documents missing them
    const collections = ['beneficiaries', 'employees', 'sessions', 'invoices'];

    for (const coll of collections) {
      const result = await db.collection(coll).updateMany(
        { createdAt: { $exists: false } },
        { $set: { createdAt: now, updatedAt: now } }
      );
      console.log(`  ${coll}: ${result.modifiedCount} documents updated`);
    }

    console.log('Timestamps added successfully');
  },

  async down(_db) {
    // Note: We don't remove timestamps in down migration
    // as it would be destructive and hard to recover
    console.log('Down migration: timestamps left intact (non-destructive)');
  },
};

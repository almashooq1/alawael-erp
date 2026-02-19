/**
 * 🧪 Test Database Helper
 * Handles safe database operations for integration tests
 * Prevents MongoDB Memory Server concurrency timeouts
 */

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class TestDBHelper {
  /**
   * Create a single document with aggressive retry logic
   * Handles MongoDB Memory Server buffer timeouts
   */
  static async createDocument(Model, data, retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        const doc = await Model.create(data);
        await delay(200); // Larger delay to prevent buffer overflow
        return doc;
      } catch (error) {
        const isBufferingError = error.message.includes('buffering timed out');
        if (isBufferingError || i < retries - 1) {
          // Exponential backoff: 300ms, 600ms, 1200ms, 2400ms
          const backoffMs = 300 * Math.pow(2, i);
          await delay(backoffMs);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Create multiple documents sequentially with large delays
   * Essential for preventing MongoDB Memory Server buffer overflow
   */
  static async createDocuments(Model, dataArray, retries = 5) {
    const docs = [];
    for (const data of dataArray) {
      const doc = await this.createDocument(Model, data, retries);
      docs.push(doc);
      // Larger delay between creates to prevent buffering
      await delay(300);
    }
    return docs;
  }

  /**
   * Safe batch delete with extended delays and retry
   */
  static async cleanupCollection(Model, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Use direct deleteMany without count to avoid additional buffer operations
        await Model.deleteMany({});
        await delay(200);
        return;
      } catch (error) {
        if (attempt === retries - 1) {
          // Log but don't throw - cleanup failures shouldn't fail tests
          console.error(`⚠️ Cleanup failed for ${Model.collection.name}: ${error.message}`);
          return;
        }
        // Exponential backoff for retries
        await delay(500 * Math.pow(2, attempt));
      }
    }
  }

  /**
   * Bulk cleanup for multiple collections with sequential operation
   */
  static async cleanupCollections(Models) {
    for (const Model of Models) {
      await this.cleanupCollection(Model);
    }
  }

  /**
   * Find or create document (prevents duplicates with retry)
   */
  static async findOrCreate(Model, filter, data) {
    let doc = await Model.findOne(filter);
    if (!doc) {
      doc = await this.createDocument(Model, { ...filter, ...data });
    }
    return doc;
  }

  /**
   * Safe update with comprehensive retry
   */
  static async updateDocument(Model, filter, update, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const doc = await Model.findOneAndUpdate(filter, update, { new: true });
        await delay(200);
        return doc;
      } catch (error) {
        if (i === retries - 1) throw error;
        await delay(300 * Math.pow(2, i));
      }
    }
  }

  /**
   * Wait for operation with timeout
   */
  static async withTimeout(promise, timeoutMs = 10000) {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    );
    return Promise.race([promise, timeout]);
  }

  /**
   * Get seeded data (return existing if available)
   */
  static async getSeedData(Model, filter, createFn) {
    let existing = await Model.findOne(filter);
    if (existing) return existing;

    return await this.createDocument(Model, await createFn());
  }
}

module.exports = TestDBHelper;

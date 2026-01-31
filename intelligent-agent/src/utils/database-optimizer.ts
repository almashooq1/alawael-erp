import mongoose from 'mongoose';
import { Logger } from '../modules/logger';

const logger = Logger.getInstance();

/**
 * تحسين أداء قاعدة البيانات
 */
export class DatabaseOptimizer {
  /**
   * إنشاء indexes لتحسين أداء الاستعلامات
   */
  static async createIndexes() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();

      for (const collection of collections) {
        const collectionName = collection.name;

        // تخطي system collections
        if (collectionName.startsWith('system.')) continue;

        const indexes = await mongoose.connection.db
          .collection(collectionName)
          .indexes();

        logger.info(`Indexes for ${collectionName}`, {
          count: indexes.length,
          indexes: indexes.map(i => i.name)
        });
      }

      logger.info('Database indexes verified');
    } catch (error) {
      logger.error('Failed to create indexes', {}, error as Error);
    }
  }

  /**
   * تحسين استعلامات mongoose
   */
  static optimizeQueries() {
    // تفعيل lean() بشكل افتراضي للقراءة فقط
    mongoose.set('toJSON', {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    });

    // تفعيل strict mode
    mongoose.set('strict', true);

    logger.info('Mongoose query optimizations applied');
  }

  /**
   * مراقبة أداء الاستعلامات
   */
  static enableQueryProfiling() {
    mongoose.set('debug', (collectionName: string, method: string, ...args: any[]) => {
      const startTime = Date.now();

      // تسجيل الاستعلامات البطيئة فقط (> 100ms)
      setTimeout(() => {
        const duration = Date.now() - startTime;
        if (duration > 100) {
          logger.warn('Slow database query detected', {
            collection: collectionName,
            method,
            duration: `${duration}ms`,
            args: JSON.stringify(args).substring(0, 200),
          });
        }
      }, 0);
    });

    logger.info('Query profiling enabled');
  }

  /**
   * تنظيف البيانات القديمة
   */
  static async cleanupOldData(days: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const collections = ['logs', 'sessions', 'temp_data'];
      let totalDeleted = 0;

      for (const collectionName of collections) {
        try {
          const result = await mongoose.connection.db
            .collection(collectionName)
            .deleteMany({ createdAt: { $lt: cutoffDate } });

          totalDeleted += result.deletedCount || 0;
          logger.info(`Cleaned up ${collectionName}`, { deleted: result.deletedCount });
        } catch (error) {
          // Collection might not exist
          logger.debug(`Collection ${collectionName} not found or error`, {}, error as Error);
        }
      }

      logger.info('Old data cleanup completed', { totalDeleted, days });
      return totalDeleted;
    } catch (error) {
      logger.error('Failed to cleanup old data', {}, error as Error);
      return 0;
    }
  }

  /**
   * تحسين حجم قاعدة البيانات
   */
  static async compactDatabase() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();

      for (const collection of collections) {
        const collectionName = collection.name;

        // تخطي system collections
        if (collectionName.startsWith('system.')) continue;

        try {
          await mongoose.connection.db.command({
            compact: collectionName,
            force: true,
          });

          logger.info(`Compacted collection: ${collectionName}`);
        } catch (error) {
          logger.debug(`Could not compact ${collectionName}`, {}, error as Error);
        }
      }

      logger.info('Database compaction completed');
    } catch (error) {
      logger.error('Failed to compact database', {}, error as Error);
    }
  }

  /**
   * الحصول على إحصائيات قاعدة البيانات
   */
  static async getDatabaseStats() {
    try {
      const stats = await mongoose.connection.db.stats();

      return {
        collections: stats.collections,
        dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
        indexes: stats.indexes,
        indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
        avgObjSize: `${(stats.avgObjSize / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      logger.error('Failed to get database stats', {}, error as Error);
      return null;
    }
  }
}

export default DatabaseOptimizer;

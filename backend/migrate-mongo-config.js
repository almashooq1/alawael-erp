/**
 * Migrate MongoDB Configuration
 * إعدادات migrate-mongo
 */

const config = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/alawael_erp?authSource=admin',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
};

module.exports = config;

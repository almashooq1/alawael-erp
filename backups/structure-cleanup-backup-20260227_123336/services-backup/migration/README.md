# Data Migration System - Complete Documentation

## 🎯 Overview

A comprehensive, production-ready data migration system for the ERP backend that enables seamless data transfer between databases with support for CSV import/export, data transformation, validation, and detailed logging.

## 📋 Features

✅ **Database Migration**
- Copy tables from source to target database
- Batch processing for large datasets
- Data transformation during migration
- Duplicate handling strategies
- Verification and validation

✅ **CSV Processing**
- Import CSV files with custom formatting
- Export database tables to CSV
- Chunked processing for large files
- Column mapping and transformation
- Data validation and sampling

✅ **Orchestra & Management**
- Planned migration with multiple steps
- Pre/post validation support
- Automatic backup creation
- Error handling strategies
- Comprehensive execution logging

✅ **REST API**
- Easy HTTP access to migration functions
- Real-time status monitoring
- Detailed execution reports

✅ **Comprehensive Logging**
- Migration progress tracking
- Detailed error reporting
- Performance metrics
- Audit trails

## 📁 Project Structure

```
backend/
├── services/
│   └── migration/
│       ├── index.js                    # Main export
│       ├── CSVProcessor.js             # CSV import/export
│       ├── DatabaseMigration.js        # Database operations
│       ├── MigrationManager.js         # Migration orchestration
│       ├── MIGRATION_GUIDE.md          # Full documentation
│       ├── INTEGRATION_GUIDE.md        # Integration steps
│       ├── QUICK_REFERENCE.md          # Quick lookup
│       └── README.md                   # This file
├── routes/
│   └── migrations.js                   # REST API endpoints
├── config/
│   └── migration.config.js             # Configuration
├── examples/
│   └── migration-examples.js           # Usage examples
└── __tests__/
    └── migration.test.js               # Test suite
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install csv-parse csv-stringify
```

### 2. Import in Your App

```javascript
const express = require('express');
const migrationRoutes = require('./routes/migrations');
const MigrationManager = require('./services/migration/MigrationManager');

const app = express();

// Create migration manager
const migrationManager = new MigrationManager({
  sourceDB: sourceConnection,
  targetDB: targetConnection
});

// Mount routes
app.use('/api/migrations', migrationRoutes);
```

### 3. Make a Migration Request

```bash
curl -X POST http://localhost:3000/api/migrations/plan \
  -H "Content-Type: application/json" \
  -d '{
    "tables": ["users", "products"],
    "options": {
      "preValidation": true,
      "postValidation": true
    }
  }'
```

## 📚 Core Components

### CSVProcessor
Handles CSV file operations with comprehensive features:
- Parse CSV files
- Export to CSV format
- Transform data
- Validate structure
- Sample contents
- Get file information

### DatabaseMigration
Manages database-to-database transfers:
- Migrate tables in batches
- Apply transformations
- Verify integrity
- Rollback on failure

### MigrationManager
Orchestrates complete migration workflows:
- Create migration plans
- Execute step-by-step
- Import from CSV
- Export to CSV
- Track progress

## 🔌 API Endpoints

### Initialization
```
POST /api/migrations/initialize
```

### Planning
```
POST /api/migrations/plan
GET /api/migrations/plan
```

### Execution
```
POST /api/migrations/execute
GET /api/migrations/summary
GET /api/migrations/log
DELETE /api/migrations/log
```

### CSV Operations
```
POST /api/migrations/import-csv
POST /api/migrations/export-csv
POST /api/migrations/sample-csv
GET /api/migrations/csv-info
POST /api/migrations/validate-csv
```

### Control
```
POST /api/migrations/pause
POST /api/migrations/resume
```

## 💻 Usage Examples

### Simple Table Migration

```javascript
const manager = new MigrationManager({
  sourceDB: sourceConnection,
  targetDB: targetConnection
});

const plan = manager.createMigrationPlan(['users', 'products']);
const result = await manager.executeMigrationPlan();
```

### CSV Import with Transformation

```javascript
const result = await manager.migrateFromCSV(
  './data/users.csv',
  'users',
  {
    transform: {
      email: (val) => val.toLowerCase(),
      status: { mapping: { '1': 'active', '0': 'inactive' } }
    }
  }
);
```

### Large File Processing

```javascript
const csvProcessor = new CSVProcessor();
const chunked = await csvProcessor.importCSVInChunks(
  './large-file.csv',
  5000  // rows per chunk
);
```

### Verification

```javascript
const verification = await manager.dbMigration.verifyAllMigrations(
  ['users', 'products', 'orders']
);
```

## ⚙️ Configuration

### Environment Variables

```env
SOURCE_DB_HOST=localhost
SOURCE_DB_USER=root
SOURCE_DB_PASSWORD=password
SOURCE_DB_NAME=source_db

TARGET_DB_HOST=localhost
TARGET_DB_USER=root
TARGET_DB_PASSWORD=password
TARGET_DB_NAME=target_db

MIGRATION_BATCH_SIZE=1000
MIGRATION_MAX_CHUNK_SIZE=10000
```

### Migration Options

```javascript
{
  preValidation: true,      // Validate before
  postValidation: true,     // Verify after
  postCleanup: false,       // Cleanup source
  skipDuplicates: false,    // Skip duplicates
  continueOnError: false    // Stop on error
}
```

## 📊 Monitoring & Logging

### Get Migration Status

```javascript
const summary = manager.getExecutionSummary();
console.log(summary.summary);
// {
//   totalSteps: 5,
//   completedSteps: 5,
//   failedSteps: 0,
//   overallStatus: 'success'
// }
```

### View Execution Log

```javascript
const log = manager.getExecutionLog();
log.forEach(entry => {
  console.log(`${entry.name}: ${entry.status} (${entry.duration}ms)`);
});
```

## 🧪 Testing

Run the test suite:

```bash
npm test -- __tests__/migration.test.js
```

Or run examples:

```bash
node examples/migration-examples.js 1
node examples/migration-examples.js 2
# ... etc
```

## 🔒 Security Considerations

- ✅ Use environment variables for credentials
- ✅ Validate all imported data
- ✅ Protect CSV files with sensitive data
- ✅ Create backups before migration
- ✅ Enable validation steps
- ✅ Audit all migrations

## ⚡ Performance Tips

- Use larger batch sizes (5000) for better performance
- Use chunked import for files > 100MB
- Disable unnecessary validations for speed
- Optimize database indexes
- Use connection pooling

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Check DB credentials and ensure DB is running |
| CSV parse error | Verify delimiter and encoding match |
| Memory errors | Use chunked import for large files |
| Migration timeout | Reduce batch size |
| Duplicate key errors | Enable `skipDuplicates` option |

## 📖 Documentation Files

- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Complete API documentation
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Integration instructions
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick lookup guide
- **[migration-examples.js](../examples/migration-examples.js)** - Code examples

## 🔄 Migration Workflows

### Workflow 1: Database to Database
```
1. Create migration plan
2. Execute migration
3. Verify integrity
4. Review results
```

### Workflow 2: CSV Import
```
1. Validate CSV structure
2. Sample data
3. Import with transformation
4. Verify records
```

### Workflow 3: Full Backup
```
1. Export all tables
2. Archive CSV files
3. Verify backup
4. Store securely
```

## 📦 Dependencies

```json
{
  "csv-parse": "^5.4.0",
  "csv-stringify": "^6.4.0",
  "mysql2": "^3.0.0",
  "express": "^4.18.0"
}
```

## 🎯 Common Scenarios

### Scenario 1: Migrate ERP Data
```javascript
const plan = manager.createMigrationPlan([
  'users', 'products', 'customers', 'orders', 'invoices'
], {
  preValidation: true,
  postValidation: true
});
```

### Scenario 2: Import Customer List
```javascript
await manager.migrateFromCSV(
  './imports/customers.csv',
  'customers',
  { transform: transformationRules.customers }
);
```

### Scenario 3: Backup Before Upgrade
```javascript
for (const table of allTables) {
  await manager.exportTableToCSV(table, `./backup/${table}.csv`);
}
```

## 📞 Support

For detailed information:
1. Check the [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
2. Review [examples](../examples/migration-examples.js)
3. See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
4. Review test cases in [migration.test.js](../__tests__/migration.test.js)

## 📝 License

This migration system is part of the ERP project and follows the same license.

## 🚀 Future Enhancements

- [ ] Support for PostgreSQL, MongoDB
- [ ] Real-time WebSocket updates
- [ ] Scheduled migrations
- [ ] Data encryption for CSVs
- [ ] Parallel table migration
- [ ] Advanced conflict resolution
- [ ] Data quality metrics
- [ ] Performance optimization reports

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready ✅

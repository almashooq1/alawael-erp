# Migration System Quick Reference

## Common Tasks

### 1. Basic Table Migration

```javascript
const { MigrationManager } = require('./services/migration');

const manager = new MigrationManager({
  sourceDB: sourceConnection,
  targetDB: targetConnection
});

// Create and execute
const plan = manager.createMigrationPlan(['users', 'products']);
const result = await manager.executeMigrationPlan();
console.log(result.summary);
```

### 2. Import CSV File

```javascript
const { CSVProcessor } = require('./services/migration');

const csvProcessor = new CSVProcessor();
const data = await csvProcessor.importCSV('./data.csv', {
  columns: true
});

console.log(`Imported ${data.recordCount} records`);
```

### 3. Export Table to CSV

```javascript
const manager = new MigrationManager({...});

const result = await manager.exportTableToCSV(
  'users',
  './exports/users.csv'
);

console.log(`Exported ${result.recordsExported} records`);
```

### 4. CSV with Data Transformation

```javascript
const result = await manager.migrateFromCSV(
  './data.csv',
  'users',
  {
    transform: {
      email: (val) => val.toLowerCase(),
      phone: (val) => val.replace(/\D/g, ''),
      status: { mapping: { 'A': 'active', 'I': 'inactive' } }
    }
  }
);
```

### 5. Batch Processing Large Files

```javascript
const csvProcessor = new CSVProcessor();

const { chunks } = await csvProcessor.importCSVInChunks(
  './large-file.csv',
  5000 // rows per chunk
);

for (const chunk of chunks) {
  await dbMigration.insertBatch('users', chunk);
}
```

### 6. Verify Migration Integrity

```javascript
const manager = new MigrationManager({...});

const verification = await manager.dbMigration.verifyAllMigrations(
  ['users', 'products', 'orders']
);

verification.forEach(v => {
  console.log(`${v.table}: ${v.sourceRecords} source, ${v.targetRecords} target`);
});
```

### 7. CSV Validation

```javascript
const csvProcessor = new CSVProcessor();

const validation = await csvProcessor.validateCSVStructure(
  './data.csv',
  ['id', 'name', 'email'] // required columns
);

if (validation.valid) {
  console.log('CSV is valid');
} else {
  console.error('Validation errors:', validation.errors);
}
```

### 8. Get CSV Information

```javascript
const csvProcessor = new CSVProcessor();

const info = await csvProcessor.getCSVInfo('./data.csv');
console.log(`File size: ${info.fileSizeKB} KB`);
console.log(`Rows: ${info.rowCount}`);
console.log(`Columns: ${info.columns.join(', ')}`);
```

### 9. Sample CSV Before Full Import

```javascript
const csvProcessor = new CSVProcessor();

const sample = await csvProcessor.sampleCSV('./data.csv', 10);
console.log('First 10 rows:', sample.samples);
```

### 10. Migration with Pre/Post Validation

```javascript
const plan = manager.createMigrationPlan(
  ['users', 'products'],
  {
    preValidation: true,   // Check before
    postValidation: true,  // Verify after
    postCleanup: false
  }
);

const result = await manager.executeMigrationPlan();
console.log('Validations:', result.executionLog);
```

## API Quick Reference

### Initialize
```
POST /api/migrations/initialize
```

### Create Plan
```
POST /api/migrations/plan
Body: { tables: [...], options: {...} }
```

### Execute
```
POST /api/migrations/execute
Body: { continueOnError: false }
```

### Get Status
```
GET /api/migrations/summary
GET /api/migrations/log
```

### CSV Operations
```
POST /api/migrations/import-csv
POST /api/migrations/export-csv
GET /api/migrations/csv-info?csvPath=...
POST /api/migrations/validate-csv
POST /api/migrations/sample-csv
```

### Control
```
POST /api/migrations/pause
POST /api/migrations/resume
DELETE /api/migrations/log
```

## Configuration Quick Guide

### CSVProcessor Options
```javascript
new CSVProcessor({
  delimiter: ',',        // Field separator
  encoding: 'utf-8',     // File encoding
  maxRowsPerChunk: 1000  // Rows per batch
})
```

### Migration Plan Options
```javascript
{
  preValidation: true,    // Validate source before
  postValidation: true,   // Verify target after
  postCleanup: false,     // Remove source after
  skipDuplicates: false,  // Ignore duplicate keys
  continueOnError: false  // Stop on first error
}
```

### Data Type Conversion
```javascript
{
  age: { type: 'integer' },
  salary: { type: 'float' },
  active: { type: 'boolean' },
  created_at: { type: 'date' },
  
  // Or custom mapping
  status: { mapping: { '1': 'active', '0': 'inactive' } },
  
  // Or custom function
  email: (val) => val.toLowerCase()
}
```

## Troubleshooting Quick Tips

| Problem | Solution |
|---------|----------|
| Connection refused | Check DB credentials and ensure DB running |
| CSV parse error | Verify delimiter and encoding match |
| Migration timeout | Reduce batch size or increase timeout |
| Memory errors | Use chunked import for large files |
| Duplicate key errors | Enable `skipDuplicates` option |
| Missing data | Enable pre/post validation |
| API returns 400 | Ensure required parameters provided |

## Performance Tips

- **Larger batches** (5000) for better speed on fast connections
- **Smaller batches** (100-500) for better memory usage
- **Disable validation** for initial test runs
- **Index optimization** for database performance
- **Chunked import** for files > 100MB

## Security Reminders

✓ Use environment variables for DB credentials
✓ Validate all imported data
✓ Protect CSV files with sensitive data
✓ Always create backups before migration
✓ Use transactions for critical operations
✓ Log all migrations for audit trail

## File Locations

```
backend/
├── services/migration/
│   ├── index.js                    # Main export
│   ├── CSVProcessor.js             # CSV handling
│   ├── DatabaseMigration.js        # DB operations
│   ├── MigrationManager.js         # Orchestration
│   ├── MIGRATION_GUIDE.md          # Full documentation
│   └── INTEGRATION_GUIDE.md        # Integration steps
├── routes/
│   └── migrations.js               # API endpoints
└── __tests__/
    └── migration.test.js           # Test suite
```

## Getting Help

1. Check `MIGRATION_GUIDE.md` for detailed documentation
2. Review `INTEGRATION_GUIDE.md` for setup instructions
3. See `migration.test.js` for usage examples
4. Review error messages in execution log
5. Enable debug logging: set `logger: console` in config

## Common Workflows

### Workflow 1: Simple Migration
1. Create plan
2. Execute migration
3. Get summary

### Workflow 2: CSV Import
1. Validate CSV structure
2. Sample data
3. Import with transformation
4. Verify records

### Workflow 3: Full Backup
1. Create plan with backups
2. Export all tables to CSV
3. Archive CSV files
4. Keep execution logs

### Workflow 4: Incremental Sync
1. Use `skipDuplicates: true`
2. Import only new data
3. Verify counts
4. Update logs

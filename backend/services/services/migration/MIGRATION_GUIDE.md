# Data Migration System Complete Guide

## Overview

This guide provides comprehensive documentation for the data migration system implemented in the ERP backend. The system facilitates seamless data transfer between database systems while maintaining data integrity and providing detailed logging and verification capabilities.

## Architecture

The migration system consists of four main components:

### 1. **CSVProcessor** (`CSVProcessor.js`)
Handles reading and writing CSV files for data import/export operations.

#### Key Features:
- **CSV Import**: Parse CSV files with custom delimiters and encoding
- **Batch Import**: Process large CSV files in chunks to manage memory
- **CSV Export**: Write data arrays to CSV format
- **Data Transformation**: Apply transformations during import
- **Column Mapping**: Map source columns to target fields
- **Data Filtering**: Filter records based on custom logic
- **CSV Sampling**: Preview file contents without full load
- **CSV Validation**: Verify structure and required columns

#### Usage Example:
```javascript
const CSVProcessor = require('./CSVProcessor');

const csvProcessor = new CSVProcessor({
  delimiter: ',',
  encoding: 'utf-8',
  maxRowsPerChunk: 1000
});

// Import CSV
const result = await csvProcessor.importCSV('./data.csv', {
  columns: true
});

// Import in chunks
const chunked = await csvProcessor.importCSVInChunks('./large-data.csv', 5000);

// Export to CSV
await csvProcessor.exportToCSV(data, './output.csv');

// Get CSV info
const info = await csvProcessor.getCSVInfo('./data.csv');

// Validate structure
const validation = await csvProcessor.validateCSVStructure(
  './data.csv',
  ['id', 'name', 'email'] // expected columns
);
```

### 2. **DatabaseMigration** (`DatabaseMigration.js`)
Manages data migration between database systems.

#### Key Features:
- **Table Migration**: Copy entire tables from source to target
- **Batch Operations**: Insert records in configurable batch sizes
- **Data Transformation**: Apply transformations during migration
- **Duplicate Handling**: Skip or replace duplicate records
- **Verification**: Compare record counts between source and target
- **Rollback**: Clear target table on failure
- **Logging**: Track migration progress and metrics

#### Usage Example:
```javascript
const DatabaseMigration = require('./DatabaseMigration');

const migration = new DatabaseMigration(sourceDB, targetDB);
migration.setBatchSize(1000);

// Migrate single table
const result = await migration.migrateTable('users');

// Migrate multiple tables
const results = await migration.migrateTables(
  ['users', 'products', 'orders'],
  { continueOnError: true }
);

// Migrate with transformation
const transformed = await migration.migrateTableWithTransform(
  'users',
  (row) => ({
    ...row,
    email: row.email.toLowerCase(),
    createdAt: new Date(row.created_date)
  })
);

// Verify migration
const verification = await migration.verifyMigration('users');

// Get summary
const summary = migration.getMigrationSummary();
```

### 3. **MigrationManager** (`MigrationManager.js`)
Orchestrates the entire migration process with planning and execution.

#### Key Features:
- **Migration Planning**: Create structured migration plans with steps
- **Step-by-Step Execution**: Execute pre-defined migration steps
- **Pre/Post Validation**: Validate before and after migration
- **Backup Management**: Create database backups before migration
- **CSV Integration**: Import/export via CSV files
- **Error Handling**: Continue or stop on errors
- **Detailed Reporting**: Comprehensive execution summaries

#### Usage Example:
```javascript
const MigrationManager = require('./MigrationManager');

const manager = new MigrationManager({
  sourceDB: sourceConnection,
  targetDB: targetConnection
});

// Create migration plan
const plan = manager.createMigrationPlan(
  ['users', 'products', 'orders'],
  {
    preValidation: true,
    postValidation: true,
    skipDuplicates: true
  }
);

// Execute migration
const summary = await manager.executeMigrationPlan({
  continueOnError: false
});

// Import from CSV
const csvResult = await manager.migrateFromCSV(
  './data.csv',
  'users',
  {
    transform: {
      email: (val) => val.toLowerCase(),
      status: { mapping: { '1': 'active', '0': 'inactive' } }
    }
  }
);

// Export table to CSV
const exportResult = await manager.exportTableToCSV('users', './export.csv');
```

### 4. **Migration Routes** (`migrations.js`)
RESTful API endpoints for migration operations.

#### Endpoints:

##### Initialization
- **POST** `/api/migrations/initialize`: Initialize migration manager

##### Planning
- **POST** `/api/migrations/plan`: Create migration plan
- **GET** `/api/migrations/plan`: Get current plan

##### Execution
- **POST** `/api/migrations/execute`: Execute migration plan
- **GET** `/api/migrations/summary`: Get execution summary
- **GET** `/api/migrations/log`: Get execution log
- **DELETE** `/api/migrations/log`: Clear execution log

##### CSV Operations
- **POST** `/api/migrations/import-csv`: Import CSV to database
- **POST** `/api/migrations/export-csv`: Export table to CSV
- **POST** `/api/migrations/sample-csv`: Sample CSV contents
- **GET** `/api/migrations/csv-info`: Get CSV file information
- **POST** `/api/migrations/validate-csv`: Validate CSV structure

##### Control
- **POST** `/api/migrations/pause`: Pause migration
- **POST** `/api/migrations/resume`: Resume migration

## API Documentation

### Initialize Migration Manager
```http
POST /api/migrations/initialize
Content-Type: application/json

{
  "sourceDB": <database_connection>,
  "targetDB": <database_connection>
}

Response:
{
  "success": true,
  "message": "Migration manager initialized"
}
```

### Create Migration Plan
```http
POST /api/migrations/plan
Content-Type: application/json

{
  "tables": ["users", "products", "orders"],
  "options": {
    "preValidation": true,
    "postValidation": true,
    "skipDuplicates": false,
    "continueOnError": false
  }
}

Response:
{
  "success": true,
  "plan": {
    "tables": [...],
    "options": {...},
    "steps": [
      {
        "id": "pre_validation",
        "name": "Pre-migration Validation",
        "type": "validation"
      },
      {
        "id": "backup",
        "name": "Create Database Backup",
        "type": "backup"
      },
      ...
    ]
  }
}
```

### Execute Migration Plan
```http
POST /api/migrations/execute
Content-Type: application/json

{
  "continueOnError": false
}

Response:
{
  "success": true,
  "stats": {
    "startTime": 1234567890,
    "endTime": 1234567900,
    "duration": 10000,
    "totalTables": 3,
    "completedTables": 3,
    "failedTables": 0,
    "totalRecords": 50000
  },
  "summary": {
    "totalSteps": 5,
    "completedSteps": 5,
    "failedSteps": 0,
    "warningSteps": 0,
    "overallStatus": "success"
  },
  "executionLog": [...]
}
```

### Import CSV to Database
```http
POST /api/migrations/import-csv
Content-Type: application/json

{
  "csvPath": "./data/users.csv",
  "tableName": "users",
  "options": {
    "transform": {
      "email": "string",
      "status": { "mapping": { "1": "active", "0": "inactive" } }
    }
  }
}

Response:
{
  "success": true,
  "status": "completed",
  "csvFile": "./data/users.csv",
  "tableName": "users",
  "recordsMigrated": 1000,
  "duration": 5000
}
```

### Export Table to CSV
```http
POST /api/migrations/export-csv
Content-Type: application/json

{
  "tableName": "users",
  "csvPath": "./exports/users.csv"
}

Response:
{
  "success": true,
  "status": "completed",
  "table": "users",
  "csvFile": "./exports/users.csv",
  "recordsExported": 1000,
  "fileSize": 102400,
  "duration": 3000
}
```

### Get CSV Information
```http
GET /api/migrations/csv-info?csvPath=./data/users.csv

Response:
{
  "success": true,
  "info": {
    "filePath": "./data/users.csv",
    "fileSize": 102400,
    "fileSizeKB": "100.00",
    "rowCount": 1000,
    "columnCount": 5,
    "columns": ["id", "name", "email", "status", "created_at"]
  }
}
```

### Validate CSV Structure
```http
POST /api/migrations/validate-csv
Content-Type: application/json

{
  "csvPath": "./data/users.csv",
  "expectedColumns": ["id", "name", "email"]
}

Response:
{
  "success": true,
  "valid": true,
  "errors": [],
  "warnings": [],
  "filePath": "./data/users.csv",
  "rowCount": 1000,
  "columnCount": 5,
  "columns": ["id", "name", "email", "status", "created_at"]
}
```

## Configuration Options

### CSVProcessor Options
```javascript
{
  delimiter: ',',           // CSV delimiter character
  encoding: 'utf-8',        // File encoding
  maxRowsPerChunk: 1000     // Rows per batch
}
```

### Migration Plan Options
```javascript
{
  preValidation: true,      // Validate before migration
  postValidation: true,     // Verify after migration
  postCleanup: false,       // Cleanup source data
  skipDuplicates: false,    // Skip duplicate records
  continueOnError: false,   // Continue on step failure
  transforms: {             // Custom transformations per table
    users: (row) => {...}
  }
}
```

### Data Transformation Rules
```javascript
// Type conversion
{
  email: { type: 'string' },
  age: { type: 'integer' },
  salary: { type: 'float' },
  active: { type: 'boolean' },
  created_at: { type: 'date' }
}

// Value mapping
{
  status: { mapping: { '1': 'active', '0': 'inactive' } }
}

// Custom function
{
  email: (val) => val.toLowerCase()
}
```

## Workflow Examples

### Example 1: Simple Table Migration
```javascript
const manager = new MigrationManager({
  sourceDB: mysql.createConnection(sourceConfig),
  targetDB: mysql.createConnection(targetConfig)
});

// Plan
const plan = manager.createMigrationPlan(['users', 'products']);

// Execute
const result = await manager.executeMigrationPlan();

// Check results
console.log(result.summary);
```

### Example 2: CSV Import with Transformation
```javascript
const result = await manager.migrateFromCSV(
  './imports/users.csv',
  'users',
  {
    transform: {
      email: (val) => val.toLowerCase().trim(),
      phone: (val) => val.replace(/\D/g, ''),
      status: {
        mapping: {
          'A': 'active',
          'I': 'inactive',
          'S': 'suspended'
        }
      },
      created_at: { type: 'date' }
    }
  }
);
```

### Example 3: Large File Migration with Validation
```javascript
const manager = new MigrationManager({...});

// First, sample the CSV
const sample = await csvProcessor.sampleCSV('./large-file.csv', 100);
console.log('Sample data:', sample.samples);

// Validate structure
const validation = await csvProcessor.validateCSVStructure(
  './large-file.csv',
  ['id', 'name', 'email']
);

if (validation.valid) {
  // Proceed with migration
  const result = await manager.migrateFromCSV('./large-file.csv', 'users');
  console.log(`Migrated ${result.recordsMigrated} records`);
}
```

### Example 4: Full Migration with Pre/Post Validation
```javascript
const plan = manager.createMigrationPlan(
  ['users', 'products', 'orders'],
  {
    preValidation: true,
    postValidation: true,
    postCleanup: true,
    skipDuplicates: true
  }
);

const result = await manager.executeMigrationPlan({
  continueOnError: false
});

// Check all validations passed
const summary = result.summary;
if (summary.overallStatus === 'success') {
  console.log('Migration completed successfully');
  console.log(`Total records: ${result.stats.totalRecords}`);
}
```

## Error Handling

### Common Errors and Solutions

**Error: "CSV parsing error"**
- Solution: Check file encoding, verify delimiter matches format

**Error: "Failed to insert batch"**
- Solution: Verify table structure, check data types, handle duplicates

**Error: "Migration manager not initialized"**
- Solution: Call `/initialize` endpoint first

**Error: "No migration plan created"**
- Solution: Create a plan with `/plan` endpoint before executing

### Error Recovery

The system supports three error handling strategies:

1. **Stop on Error** (default)
   - Halts migration on first error
   - Returns detailed error information

2. **Continue on Error**
   - Logs errors but continues execution
   - Allows partial successful migrations

3. **Skip Duplicates**
   - Ignores duplicate key errors
   - Useful for incremental migrations

## Monitoring and Logging

### Migration Statistics
- Start/end timestamps
- Total records migrated
- Completed/failed tables
- Execution duration per step

### Execution Log Structure
```javascript
{
  step: "migrate_users",
  name: "Migrate users",
  status: "completed",
  duration: 5000,
  recordsMigrated: 1000,
  table: "users"
}
```

### Retrieving Logs
```javascript
// Get full log
const log = manager.getExecutionLog();

// Get summary
const summary = manager.getExecutionSummary();

// Clear log
manager.clearLog();
```

## Performance Optimization

### Tips for Large Migrations

1. **Adjust Batch Size**
   ```javascript
   migration.setBatchSize(5000); // Larger batches for better performance
   ```

2. **Use Chunked Import for Large CSV**
   ```javascript
   const chunked = await csvProcessor.importCSVInChunks(
     './massive-file.csv',
     10000 // 10k rows per chunk
   );
   ```

3. **Disable Validations for Speed**
   ```javascript
   manager.createMigrationPlan(tables, {
     preValidation: false,
     postValidation: false
   });
   ```

4. **Index Optimization**
   - Disable indexes before migration
   - Re-enable after completion

## Security Considerations

1. **Database Credentials**: Never commit database credentials
2. **CSV Files**: Protect CSV files containing sensitive data
3. **Access Control**: Restrict API access with authentication
4. **Data Validation**: Always validate imported data
5. **Backup**: Always create backups before migration

## Integration with Express App

```javascript
const express = require('express');
const migrationRoutes = require('./routes/migrations');

const app = express();

// Mount migration routes
app.use('/api/migrations', migrationRoutes);

// Optionally initialize manager globally
const MigrationManager = require('./services/migration/MigrationManager');
const manager = new MigrationManager({
  sourceDB: sourceConnection,
  targetDB: targetConnection
});

migrationRoutes.setMigrationManager(manager);
```

## Testing

### Sample Test Cases

```javascript
describe('Migration System', () => {
  it('should import CSV successfully', async () => {
    const result = await csvProcessor.importCSV('./test-data.csv');
    expect(result.success).toBe(true);
    expect(result.recordCount).toBeGreaterThan(0);
  });

  it('should validate CSV structure', async () => {
    const result = await csvProcessor.validateCSVStructure(
      './test-data.csv',
      ['id', 'name']
    );
    expect(result.valid).toBe(true);
  });

  it('should migrate table successfully', async () => {
    const result = await migration.migrateTable('users');
    expect(result.status).toBe('completed');
  });

  it('should verify migration integrity', async () => {
    const result = await migration.verifyMigration('users');
    expect(result.match).toBe(true);
  });
});
```

## Troubleshooting

### Migration Hangs
- Check database connections
- Verify sufficient disk space
- Review batch size settings

### Data Loss
- Always verify before the final step
- Use backup strategy
- Enable post-validation

### Performance Issues
- Increase batch size
- Disable unnecessary validations
- Check database indexing

## Future Enhancements

- [ ] Support for multiple database types (PostgreSQL, MongoDB)
- [ ] Real-time progress WebSocket updates
- [ ] Automated scheduling
- [ ] Data encryption for CSV files
- [ ] Advanced conflict resolution strategies
- [ ] Parallel table migration
- [ ] Data quality reporting

## Support and Contact

For issues or questions, refer to the ERP system documentation or contact the development team.

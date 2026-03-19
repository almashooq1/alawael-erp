# Migration System Integration Guide

## Quick Start

### Step 1: Install Dependencies

The migration system requires the following npm packages. Add them to your `package.json`:

```json
{
  "dependencies": {
    "csv-parse": "^5.4.0",
    "csv-stringify": "^6.4.0"
  }
}
```

Install dependencies:
```bash
npm install csv-parse csv-stringify
```

### Step 2: Import in Your App

In your main `app.js` or `server.js`:

```javascript
const express = require('express');
const migrationRoutes = require('./routes/migrations');
const MigrationManager = require('./services/migration/MigrationManager');

const app = express();

// Middleware
app.use(express.json());

// Initialize migration manager with your database connections
const migrationManager = new MigrationManager({
  sourceDB: sourceConnection, // Your source database connection
  targetDB: targetConnection, // Your target database connection
  logger: console,
});

// Set migration manager for routes
migrationRoutes.setMigrationManager(migrationManager);

// Mount migration routes
app.use('/api/migrations', migrationRoutes);

// Other routes...
```

### Step 3: Database Connection Setup

Ensure your database connections are properly configured:

```javascript
const mysql = require('mysql2/promise');

// Source database
const sourceConnection = mysql.createPool({
  host: process.env.SOURCE_DB_HOST,
  user: process.env.SOURCE_DB_USER,
  password: process.env.SOURCE_DB_PASSWORD,
  database: process.env.SOURCE_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Target database
const targetConnection = mysql.createPool({
  host: process.env.TARGET_DB_HOST,
  user: process.env.TARGET_DB_USER,
  password: process.env.TARGET_DB_PASSWORD,
  database: process.env.TARGET_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
```

### Step 4: Environment Variables

Add to your `.env` file:

```
# Source Database
SOURCE_DB_HOST=localhost
SOURCE_DB_USER=root
SOURCE_DB_PASSWORD=password
SOURCE_DB_NAME=source_db

# Target Database
TARGET_DB_HOST=localhost
TARGET_DB_USER=root
TARGET_DB_PASSWORD=password
TARGET_DB_NAME=target_db

# Migration Settings
MIGRATION_BATCH_SIZE=1000
MIGRATION_MAX_CHUNK_SIZE=10000
```

## Complete Integration Example

### app.js

```javascript
const express = require('express');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const migrationRoutes = require('./routes/migrations');
const MigrationManager = require('./services/migration/MigrationManager');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connections
const sourcePool = mysql.createPool({
  host: process.env.SOURCE_DB_HOST,
  user: process.env.SOURCE_DB_USER,
  password: process.env.SOURCE_DB_PASSWORD,
  database: process.env.SOURCE_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

const targetPool = mysql.createPool({
  host: process.env.TARGET_DB_HOST,
  user: process.env.TARGET_DB_USER,
  password: process.env.TARGET_DB_PASSWORD,
  database: process.env.TARGET_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Create migration manager
const migrationManager = new MigrationManager({
  sourceDB: sourcePool,
  targetDB: targetPool,
  logger: console,
});

// Set manager for routes
migrationRoutes.setMigrationManager(migrationManager);

// Routes
app.use('/api/migrations', migrationRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Migration system ready at /api/migrations');
});
```

## Usage Examples

### Using cURL

#### Initialize Migration
```bash
curl -X POST http://localhost:3000/api/migrations/initialize \
  -H "Content-Type: application/json" \
  -d '{"sourceDB": {}, "targetDB": {}}'
```

#### Create Migration Plan
```bash
curl -X POST http://localhost:3000/api/migrations/plan \
  -H "Content-Type: application/json" \
  -d '{
    "tables": ["users", "products", "orders"],
    "options": {
      "preValidation": true,
      "postValidation": true
    }
  }'
```

#### Execute Migration
```bash
curl -X POST http://localhost:3000/api/migrations/execute \
  -H "Content-Type: application/json" \
  -d '{"continueOnError": false}'
```

#### Import CSV
```bash
curl -X POST http://localhost:3000/api/migrations/import-csv \
  -H "Content-Type: application/json" \
  -d '{
    "csvPath": "./data/users.csv",
    "tableName": "users"
  }'
```

### Using JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api/migrations'
});

async function runMigration() {
  try {
    // Create plan
    const planResponse = await api.post('/plan', {
      tables: ['users', 'products'],
      options: {
        preValidation: true,
        postValidation: true
      }
    });

    console.log('Plan created:', planResponse.data.plan);

    // Execute migration
    const executeResponse = await api.post('/execute');
    console.log('Migration result:', executeResponse.data);

    // Get summary
    const summaryResponse = await api.get('/summary');
    console.log('Summary:', summaryResponse.data);
  } catch (error) {
    console.error('Migration failed:', error.response.data);
  }
}

runMigration();
```

### Using Postman

1. Create a new collection "ERP Migrations"
2. Add the following requests:

**Request 1: Create Plan**
```
POST /api/migrations/plan
Body (JSON):
{
  "tables": ["users", "products", "orders"],
  "options": {
    "preValidation": true,
    "postValidation": true,
    "skipDuplicates": false
  }
}
```

**Request 2: Execute Migration**
```
POST /api/migrations/execute
Body (JSON):
{
  "continueOnError": false
}
```

**Request 3: Get Summary**
```
GET /api/migrations/summary
```

## Programmatic Usage

### Direct Usage Without Routes

```javascript
const {
  MigrationManager,
  CSVProcessor
} = require('./services/migration');

// Create instances
const csvProcessor = new CSVProcessor();
const manager = new MigrationManager({
  sourceDB: sourcePool,
  targetDB: targetPool
});

// Create and execute plan
const plan = manager.createMigrationPlan(['users', 'products']);
const result = await manager.executeMigrationPlan();

console.log(result.summary);
```

### Advanced Scenarios

#### Scenario 1: Import CSV with Data Transformation

```javascript
const result = await manager.migrateFromCSV(
  './imports/users.csv',
  'users',
  {
    csvOptions: {
      delimiter: ';'
    },
    transform: {
      email: { type: 'string' },
      age: { type: 'integer' },
      status: {
        mapping: { 'A': 'active', 'I': 'inactive' }
      }
    }
  }
);

console.log(`Migrated ${result.recordsMigrated} records`);
```

#### Scenario 2: Batch Migration with CSV

```javascript
const tables = ['users', 'products', 'orders'];

for (const table of tables) {
  const result = await manager.migrateFromCSV(
    `./data/${table}.csv`,
    table
  );
  
  console.log(`${table}: ${result.recordsMigrated} records`);
}
```

#### Scenario 3: Export and Backup

```javascript
// Export all tables to CSV for backup
const tables = ['users', 'products', 'orders'];

for (const table of tables) {
  await manager.exportTableToCSV(
    table,
    `./backups/${table}_${Date.now()}.csv`
  );
}

console.log('Backup completed');
```

## Troubleshooting

### Issue: Connection refused

**Solution**: Verify database credentials and ensure both databases are running.

```bash
# Test connection
mysql -h localhost -u root -p database_name
```

### Issue: CSV import fails

**Solution**: Check CSV format and encoding.

```javascript
// Validate before import
const validation = await csvProcessor.validateCSVStructure(
  './file.csv',
  ['expected', 'columns']
);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Issue: Migration timeout

**Solution**: Increase timeout or reduce batch size.

```javascript
migration.setBatchSize(500); // Smaller batches

// Or configure at connection level
const pool = mysql.createPool({
  // ... other config
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});
```

### Issue: Memory issues with large files

**Solution**: Use chunked import.

```javascript
const chunked = await csvProcessor.importCSVInChunks(
  './large-file.csv',
  5000 // rows per chunk
);

for (const chunk of chunked.chunks) {
  await migration.insertBatch('users', chunk);
}
```

## Performance Tuning

### For Large Migrations

```javascript
const manager = new MigrationManager({
  sourceDB: sourcePool,
  targetDB: targetPool,
  logger: console
});

// Increase batch size
manager.dbMigration.setBatchSize(5000);

// Create plan without validation (for speed)
const plan = manager.createMigrationPlan(tables, {
  preValidation: false,
  postValidation: false
});

// Execute
await manager.executeMigrationPlan();
```

### Database Optimization

```sql
-- Disable indexes before migration
ALTER TABLE users DISABLE KEYS;

-- Migration happens here

-- Re-enable indexes
ALTER TABLE users ENABLE KEYS;

-- Optimize table
OPTIMIZE TABLE users;
```

## Monitoring

### View Migration Progress

```javascript
// Get execution log
const log = manager.getExecutionLog();
log.forEach(entry => {
  console.log(`${entry.name}: ${entry.status} (${entry.duration}ms)`);
});

// Get summary
const summary = manager.getExecutionSummary();
console.log(`Total: ${summary.stats.totalRecords} records`);
console.log(`Duration: ${summary.stats.duration}ms`);
```

## Next Steps

1. Integrate migration system into your app
2. Configure database connections
3. Test with sample data
4. Plan your migration strategy
5. Execute full migration with validation

## Support

For detailed documentation, see `MIGRATION_GUIDE.md` in the migration service directory.

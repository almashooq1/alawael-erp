# 🎓 MIGRATION SYSTEM - TEAM TRAINING GUIDE

**For**: Development & Operations Teams  
**Duration**: 2-3 hours  
**Difficulty**: Intermediate

---

## 📚 TRAINING AGENDA

### Part 1: Foundation (30 minutes)
- [x] What is the Migration System?
- [x] Why do we need it?
- [x] Key features & benefits

### Part 2: Technical Overview (45 minutes)
- [x] Architecture & components
- [x] How it works internally
- [x] Data flow & processing

### Part 3: Hands-On Labs (60 minutes)
- [x] Lab 1: Initialize migration
- [x] Lab 2: Create & execute plan
- [x] Lab 3: Monitor progress
- [x] Lab 4: Handle errors

### Part 4: Best Practices (30 minutes)
- [x] Migration patterns
- [x] Performance optimization
- [x] Troubleshooting

---

## 🎯 PART 1: FOUNDATION

### What is the Migration System?

The Migration System is an **automated database migration tool** that enables:

- ✅ Database-to-database data transfer
- ✅ CSV import/export with transformations
- ✅ Data validation & quality checks
- ✅ Real-time progress monitoring
- ✅ Pause/resume capabilities
- ✅ Error recovery & rollback

### Why Do We Need It?

#### Before (Manual Process)
```
❌ Days of manual SQL scripting
❌ High error rates
❌ No progress visibility
❌ Difficult to rollback
❌ Requires downtime
```

#### After (Migration System)
```
✅ Minutes to hours (automated)
✅ Built-in validation
✅ Real-time dashboard
✅ Easy rollback
✅ Minimal/zero downtime
```

### Key Features

| Feature | Benefit |
|---------|---------|
| **Batch Processing** | Handle millions of records efficiently |
| **Data Validation** | Ensure data quality before migration |
| **CSV Support** | Import/export for external integrations |
| **Progress Tracking** | Monitor migration status in real-time |
| **Error Handling** | Automatic retry & partial recovery |
| **Logging** | Complete audit trail of all operations |
| **Pause/Resume** | Can pause and resume long migrations |
| **Transformations** | Automatic data format conversion |

---

## 🏗️ PART 2: TECHNICAL OVERVIEW

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Migration Dashboard (UI)                │
│        (React Component - Monitor & Control)             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              REST API Layer (/api/migrations)            │
│  initialize, plan, execute, pause, resume, status, log  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│           Migration Service (Orchestration)              │
│        MigrationService - Core Business Logic            │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────────┐
        │            │            │              │
    ┌───▼──┐  ┌─────▼──┐  ┌──────▼──┐  ┌──────▼──┐
    │  Data │  │Database│  │   CSV   │  │Duplicate│
    │Validator│Migrator │  │Processor│  │Detector │
    └────────┘  └────────┘  └─────────┘  └─────────┘
        │            │            │              │
        └────────────┼────────────┼──────────────┘
                     │
        ┌────────────▼────────────┐
        │   Database Abstraction   │
        │  (MongoDB/PostgreSQL)    │
        └─────────────────────────┘
```

### Core Components

#### 1. **MigrationService** (Orchestrator)
```javascript
// Coordinates entire migration process
const service = new MigrationService({
  sourceDB: 'mongodb://source:27017/db',
  targetDB: 'mongodb://target:27017/db'
});

// Creates plans, executes, monitors
```

#### 2. **DatabaseMigration** (Data Operations)
```javascript
// Handles actual data transfer
// - Reads from source
// - Transforms data
// - Inserts into target
// - Validates results
```

#### 3. **CSVProcessor** (File Operations)
```javascript
// Handles CSV import/export
// - Parses CSV files
// - Validates data
// - Transforms data
// - Exports results
```

#### 4. **DataValidator** (Quality Control)
```javascript
// Validates data integrity
// - Type checking
// - Required fields
// - Format validation
// - Range validation
```

### Data Flow Example

```
1. User initiates migration
        ↓
2. Service creates migration plan
   ├─ Connects to source DB
   ├─ Analyzes schema
   └─ Generates execution plan
        ↓
3. Execute migration
   ├─ For each table:
   │  ├─ Read batch (e.g., 5000 records)
   │  ├─ Validate data
   │  ├─ Transform if needed
   │  ├─ Insert into target
   │  ├─ Verify insert
   │  └─ Log results
   └─ Continue until complete
        ↓
4. Verify results
   ├─ Count comparison
   ├─ Data validation
   ├─ Integrity checks
   └─ Generate report
        ↓
5. Update dashboard with results
```

---

## 💻 PART 3: HANDS-ON LABS

### Lab 1: Initialize Migration Manager

**Time**: 15 minutes  
**Goal**: Set up source and target databases

#### Steps:

1. **Open Dashboard**
   ```
   Navigate to: http://localhost:3001/admin/migrations
   ```

2. **Fill in Database URLs**
   ```
   Source DB: mongodb://localhost:27017/source_db
   Target DB: mongodb://localhost:27017/target_db
   ```

3. **Click Initialize**
   ```
   Expected: "Migration manager initialized successfully"
   Status: ✅ Completed
   ```

4. **Verify Connection**
   ```bash
   # Terminal verification
   curl -X POST http://localhost:3001/api/migrations/initialize \
     -H "Content-Type: application/json" \
     -d '{
       "sourceDB": "mongodb://localhost:27017/source_db",
       "targetDB": "mongodb://localhost:27017/target_db"
     }'
   ```

---

### Lab 2: Create & Execute Migration Plan

**Time**: 30 minutes  
**Goal**: Plan and execute a migration

#### Steps:

1. **Select Tables to Migrate**
   ```
   ☑️ users
   ☑️ products
   ☑️ orders
   ```

2. **Create Plan**
   - Click "Create Plan" button
   - Wait for plan generation
   - Review plan details

3. **Review Execution Details**
   ```
   Plan shows:
   - Total records to migrate
   - Estimated time
   - Data transformations
   - Validation rules
   ```

4. **Execute Migration**
   - Click "Execute Migration"
   - Monitor progress bar
   - Watch logs in real-time

5. **Expected Output**
   ```
   ✅ Migration started
   📊 Progress: 15% → 50% → 100%
   📋 Logs showing:
      - Batch 1: 5000 records migrated
      - Batch 2: 5000 records migrated
      - Validation: All passed
   ✅ Migration complete
   ```

---

### Lab 3: Monitor Progress

**Time**: 15 minutes  
**Goal**: Understand monitoring & real-time updates

#### Monitor via Dashboard

```
📊 Real-time Metrics:
├─ Total Records: 50,000
├─ Migrated: 35,000 (70%)
├─ Failed: 100 (0.2%)
└─ Duration: 45 minutes

📋 Live Logs:
├─ [10:30:45] Processing batch 1
├─ [10:31:12] Batch 1 migrated: 5000 records
├─ [10:31:45] Validation: All passed
└─ [10:32:01] Processing batch 2
```

#### Monitor via API

```bash
# Get current status
curl http://localhost:3001/api/migrations/summary

# Response:
{
  "success": true,
  "summary": {
    "status": "executing",
    "totalRecords": 50000,
    "migratedCount": 35000,
    "failedCount": 100,
    "progress": 70,
    "duration": "45 minutes",
    "startTime": "2026-02-18T10:30:00Z"
  }
}
```

#### View Logs

```bash
# Get detailed logs
curl http://localhost:3001/api/migrations/log

# Response shows each batch:
[
  {
    "timestamp": "2026-02-18T10:30:45Z",
    "level": "INFO",
    "message": "Processing batch 1 (5000 records)",
    "table": "users"
  },
  ...
]
```

---

### Lab 4: Handle Errors & Recovery

**Time**: 20 minutes  
**Goal**: Understand error handling and recovery

#### Scenario: Migration Fails Partway

1. **Pause Migration**
   - Click "Pause" button on dashboard
   - System stops processing new batches
   - Current batch completes

2. **Check Error Logs**
   ```bash
   curl http://localhost:3001/api/migrations/log | grep -i error
   
   # Review error details
   # Example:
   "error": "Duplicate key in users.email",
   "recordId": 1234,
   "value": "test@example.com"
   ```

3. **Fix Issues**
   - Option A: Fix in source database
   - Option B: Applied transformation rule (auto-fix duplicates)
   - Option C: Skip the failing batch

4. **Resume Migration**
   - Click "Resume" button
   - System continues from where it paused
   - Processes remaining batches

5. **Verify Completion**
   ```bash
   # Final verification
   curl http://localhost:3001/api/migrations/summary
   
   # Should show:
   - All records migrated or skipped
   - Failed count (if any)
   - Total duration
   ```

---

## 🎓 PART 4: BEST PRACTICES

### Migration Patterns

#### Pattern 1: Large Database Migration
```
Problem:  Database has 10M+ records
Solution: Use chunked processing
          - Batch size: 10,000 records
          - Process during off-hours
          - Monitor memory usage
```

#### Pattern 2: Multiple Table Dependencies
```
Problem:  Tables have foreign key constraints
Solution: Migrate in dependency order
          Order: users → products → orders → transactions
```

#### Pattern 3: Incremental Migration
```
Problem:  Need to minimize downtime
Solution: Migrate in phases
          - Phase 1: Historical data (off-hours)
          - Phase 2: Active data (minimal windows)
          - Phase 3: Verification & cutover
```

### Performance Optimization

```javascript
// ✅ GOOD: Optimized batch size
const migrationPlan = {
  tables: ['users', 'products'],
  batchSize: 10000,      // Balanced for memory & speed
  parallelBatches: 3,    // Process 3 batches in parallel
  validation: true,      // Validate each batch
  retryFailed: true      // Retry failed records
};

// ❌ BAD: Inefficient settings
const badPlan = {
  batchSize: 1000000,    // Too large - memory issues
  parallelBatches: 20,   // Too many - CPU contention
  validation: false,     // Risky - data quality issues
  retryFailed: false     // Lost data on failures
};
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Out of Memory | Large batch size | Reduce `batchSize` to 5000 |
| Slow Speed | Single-threaded | Increase `parallelBatches` |
| Data Loss | No validation | Enable validation checks |
| Connection Errors | Network timeout | Increase `timeout` value |
| Duplicate Records | No dedup check | Use `DuplicateDetector` |

### Security Practices

```bash
# ✅ DO: Secure credentials
export DB_USER="migration_user"
export DB_PASSWORD="secure-random-password"
export DB_AUTH_SOURCE="admin"

# ❌ DON'T: Hardcode credentials
const connectionString = "mongodb://user:pass@host";

# ✅ DO: Audit all operations
- Enable detailed logging
- Store logs securely
- Review logs regularly

# ❌ DON'T: Skip validation
- Always validate data before migration
- Check data types & ranges
- Verify record counts before/after
```

### Troubleshooting Checklist

When something goes wrong:

1. **Check Server Status**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Review Error Logs**
   ```bash
   curl http://localhost:3001/api/migrations/log | grep -i error
   ```

3. **Verify Database Connection**
   ```bash
   # Test source connection
   mongosh "mongodb://source:27017/db"
   
   # Test target connection
   mongosh "mongodb://target:27017/db"
   ```

4. **Check Resource Usage**
   ```bash
   # Memory
   pm2 monit
   
   # Disk
   df -h
   
   # Network
   netstat -an | grep 3001
   ```

5. **Review Recent Logs**
   ```bash
   pm2 logs erp-backend | tail -100
   ```

---

## 📋 QUICK REFERENCE

### API Endpoints Cheat Sheet

```bash
# Initialize
POST /api/migrations/initialize
{
  "sourceDB": "mongodb://...",
  "targetDB": "mongodb://..."
}

# Create plan
POST /api/migrations/plan
{ "tables": ["users", "products"] }

# Execute
POST /api/migrations/execute
{}

# Get summary
GET /api/migrations/summary

# Get logs
GET /api/migrations/log

# Pause
POST /api/migrations/pause
{}

# Resume
POST /api/migrations/resume
{}

# Delete logs
DELETE /api/migrations/log
{}
```

### Dashboard Quick Actions

| Action | Steps | Expected Time |
|--------|-------|----------------|
| Initialize | Enter URLs → Click Initialize | 5 seconds |
| Create Plan | Select tables → Click Plan | 30 seconds |
| Execute | Click Execute → Monitor | 5-60 minutes |
| Pause | Click Pause (during execution) | Immediate |
| Resume | Click Resume (after pause) | 5 seconds |
| View Logs | Scroll in Logs section | Real-time |

---

## 🎯 CERTIFICATION

### What You Should Know

- [ ] How the migration system works
- [ ] How to initialize migrations
- [ ] How to create migration plans
- [ ] How to execute and monitor migrations
- [ ] How to handle errors and pause/resume
- [ ] How to troubleshoot common issues
- [ ] Best practices for performance
- [ ] Security considerations

### After Training

You should be able to:

1. **Plan a large database migration** (2 hours)
2. **Execute a migration without errors** (varies by data size)
3. **Monitor progress and respond to issues** (real-time)
4. **Troubleshoot common problems** (< 30 minutes)
5. **Optimize migration performance** (before execution)

---

## 📚 ADDITIONAL RESOURCES

### Documentation
- [Migration API Reference](services/migration/MIGRATION_GUIDE.md)
- [Integration Guide](services/migration/INTEGRATION_GUIDE.md)
- [Deployment Guide](DEPLOYMENT_GUIDE_MIGRATION_SYSTEM.md)
- [Quick Reference](services/migration/QUICK_REFERENCE.md)

### Videos (if available)
- [ ] Introduction to Migration System (5 min)
- [ ] Live Migration Demo (15 min)
- [ ] Troubleshooting Workshop (20 min)
- [ ] Performance Optimization (10 min)

### Contact

**Questions?**
- Dev Team: dev-team@company.com
- Slack Channel: #migration-system
- Office Hours: Tuesday & Thursday 2-3 PM

---

## ✅ Training Complete!

**Next Steps:**
1. Practice with Lab environments
2. Assist with staging migration
3. Lead production migration
4. Mentor new team members

---

**Version**: 1.0.0  
**Duration**: 2-3 hours  
**Skill Level**: Intermediate → Advanced

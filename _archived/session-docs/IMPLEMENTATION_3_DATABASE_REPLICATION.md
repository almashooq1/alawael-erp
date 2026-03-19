# IMPLEMENTATION GUIDE 3: DATABASE REPLICATION (HIGH AVAILABILITY)
# MongoDB Replica Set Configuration
# ALAWAEL ERP Production System
# Date: February 28, 2026

---

## QUICK START (4 Hours)

### Step 1: Plan Replica Set

**Current Setup:**
```
Single MongoDB Instance on localhost:27017
```

**Target Setup:**
```
Replica Set: alawael-rs
├─ Primary:     localhost:27017
├─ Secondary-1: localhost:27018
└─ Secondary-2: localhost:27019
```

### Step 2: Prepare MongoDB Instances

```bash
# Create data directories
mkdir -p /data/mongodb/rs1
mkdir -p /data/mongodb/rs2
mkdir -p /data/mongodb/rs3

# Windows
mkdir C:\mongodb-data\rs1
mkdir C:\mongodb-data\rs2
mkdir C:\mongodb-data\rs3
```

### Step 3: Start MongoDB Instances

```bash
# Terminal 1: Primary (Port 27017)
mongod --replSet alawael-rs --port 27017 --dbpath /data/mongodb/rs1 --logpath /var/log/mongodb/rs1.log

# Terminal 2: Secondary 1 (Port 27018)
mongod --replSet alawael-rs --port 27018 --dbpath /data/mongodb/rs2 --logpath /var/log/mongodb/rs2.log

# Terminal 3: Secondary 2 (Port 27019)
mongod --replSet alawael-rs --port 27019 --dbpath /data/mongodb/rs3 --logpath /var/log/mongodb/rs3.log

# Windows PowerShell
# Terminal 1
mongod --replSet alawael-rs --port 27017 --dbpath C:\mongodb-data\rs1

# Terminal 2
mongod --replSet alawael-rs --port 27018 --dbpath C:\mongodb-data\rs2

# Terminal 3
mongod --replSet alawael-rs --port 27019 --dbpath C:\mongodb-data\rs3
```

### Step 4: Initialize Replica Set

```javascript
// Connect to primary (port 27017)
mongo --port 27017

// Initialize replica set
rs.initiate({
  _id: "alawael-rs",
  members: [
    {_id: 0, host: "localhost:27017", priority: 10},
    {_id: 1, host: "localhost:27018", priority: 5},
    {_id: 2, host: "localhost:27019", priority: 5}
  ]
})

// Check status (wait 10 seconds)
rs.status()

// Expected output:
// alawael-rs:PRIMARY>
// Replica set initialized with 1 primary, 2 secondaries
```

### Step 5: Update Node.js Connection String

```javascript
// File: backend/.env

// OLD:
MONGODB_URI=mongodb://localhost:27017/alawael-erp

// NEW:
MONGODB_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/alawael-erp?replicaSet=alawael-rs
```

### Step 6: Restart Node.js

```bash
pm2 reload alawael-backend
pm2 status
```

### Step 7: Verify Replication

```javascript
// Connect to any node
mongo --port 27017

// Check replication status
rs.status()

// Verify data is replicated
use alawael-erp
db.users.count()  // Run on primary
db.setReadPref("secondary")
db.users.count()  // Run on secondary (should match)
```

---

## COMPLETE SETUP GUIDE

### Architecture: Before & After

**BEFORE (Single Point of Failure)**
```
┌─────────────────────┐
│  Node.js App        │
│  (8 instances)      │
└──────────┬──────────┘
           │ MongoDB Connection
           ▼
┌─────────────────────┐
│  MongoDB            │
│  localhost:27017    │
│  (SINGLE)           │ ← If this fails, app fails
└─────────────────────┘
```

**AFTER (High Availability)**
```
┌─────────────────────────────────────────┐
│  Node.js App (8 instances)              │
│  Connection: mongodb://node1,node2,node3│
└──────────────┬──────────────────────────┘
       Read/Write to Primary
       Read from Secondaries (optional)
       │
       ├──────────┬──────────┬──────────────┐
       ▼          ▼          ▼              ▼
    ┌──────┐  ┌──────┐  ┌──────┐
    │ Pri. │──│ Sec1 │──│ Sec2 │
    │ Port │  │Port  │  │Port  │
    │27017 │  │27018 │  │27019 │
    └──────┘  └──────┘  └──────┘
    
    Auto-failover: If Primary fails,
    Secondaries elect new Primary in <30s
```

### MongoDB Configuration (mongod.conf)

```yaml
# File: /etc/mongod.conf (Linux) or mongod.conf (Windows)

storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

net:
  port: 27017
  bindIp: 0.0.0.0

replication:
  replSetName: alawael-rs
  oplogSizeMB: 2560

# Optional: Enable authentication
security:
  authorization: enabled

# Logging
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
```

### Replica Set Configuration (JavaScript API)

```javascript
// Initial setup
rs.initiate({
  _id: "alawael-rs",
  version: 1,
  members: [
    {
      _id: 0,
      host: "mongodb-primary:27017",
      priority: 10,
      tags: {type: "primary", backup: "hourly"}
    },
    {
      _id: 1,
      host: "mongodb-secondary-1:27017",
      priority: 5,
      tags: {type: "secondary", backup: "hourly"}
    },
    {
      _id: 2,
      host: "mongodb-secondary-2:27017",
      priority: 5,
      tags: {type: "secondary", backup: "hourly"}
    }
  ],
  settings: {
    heartbeatIntervalMillis: 2000,
    electionTimeoutMillis: 10000,
    catchUpTimeoutMillis: -1
  }
})

// Check
rs.status()
rs.conf()
```

### Application Connection Pool

```javascript
// File: backend/src/db/mongodb.js

const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 
  'mongodb://localhost:27017,localhost:27018,localhost:27019/alawael-erp?replicaSet=alawael-rs';

const client = new MongoClient(mongoUri, {
  // Connection pool
  maxPoolSize: 50,
  minPoolSize: 10,
  
  // Replica set options
  replicaSet: 'alawael-rs',
  retryWrites: true,
  retryReads: true,
  
  // Read preferences
  readPreference: 'primary', // Read from primary
  // alternatives: 'secondary', 'primaryPreferred', 'secondaryPreferred'
  
  // Write concern
  writeConcern: {
    w: 'majority', // Wait for majority to acknowledge
    j: true,       // Journaled
    wtimeout: 5000 // 5 second timeout
  },
  
  // Timeouts
  connectTimeoutMS: 30000,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  
  // Monitoring
  monitorCommands: true
});

async function connect() {
  try {
    await client.connect();
    console.log('✅ MongoDB Replica Set connected');
    
    // Health check
    const admin = client.db('admin');
    const status = await admin.command({replSetGetStatus: 1});
    console.log(`Replica Set: ${status.set}`);
    console.log(`Members: ${status.members.length}`);
    console.log(`Primary: ${status.members.find(m => m.state === 1)?.name}`);
    
    return client;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

module.exports = { client, connect };
```

### Read Preference Options

```javascript
// Send all reads to primary (default, safest)
db.collection('users').find().setReadPreference('primary')

// Read from secondary if available (distribute load)
db.collection('users').find().setReadPreference('secondaryPreferred')

// Read from secondary only (for reporting)
db.collection('analytics').find().setReadPreference('secondary')

// Complex: Read from tagged nodes
db.collection('users').find().setReadPreference('secondary', 
  [{type: "reporting"}]  // Only secondaries tagged with type:reporting
)
```

---

## FAILOVER & RECOVERY

### Automatic Failover

```
Timeline:
├─ T+0s:    Primary unavailable
├─ T+2s:    Health check detects failure
├─ T+10s:   Secondary detects heartbeat failure
├─ T+15s:   New election starts
├─ T+20s:   New Primary elected
├─ T+25s:   Application reconnects
├─ T+30s:   Replication resumes
└─ Total RTO: ~20-30 seconds (automatic)
```

### Manual Failover

```javascript
// Force failover to Secondary 2 (for maintenance)
rs.stepDown(60)  // Step down for 60 seconds
// Secondary with highest priority becomes new primary

// Or explicitly elect a member
rs.freeze(120)   // Freezes for 120 seconds (can't be elected)
```

### Step Down Procedure (Maintenance)

```javascript
// 1. Stop writes
// 2. Step down primary gracefully
rs.stepDown(300)  // Wait 5 minutes, allow secondary to catch up

// 3. Wait for election
// Take a few seconds, new primary automatically elected

// 4. Verify new primary
rs.status()

// 5. Maintenance on old primary
// Restart, update, etc.

// 6. Restart and rejoin
mongod --replSet alawael-rs

// 7. Verify replication
rs.status()
```

---

## MONITORING REPLICA SET

### Health Check Queries

```javascript
// Check replica set status
rs.status()

// Check sync lag (replication lag)
db.printReplicationInfo()   // Primary: oplog range
db.printSecondaryReplicationInfo()  // Secondary: lag

// Detailed member status
rs.members()

// Check operation log
db.adminCommand({replSetGetStatus: 1})
```

### Performance Metrics

```javascript
// Replication lag
db.adminCommand({replSetGetStatus: 1})
  .members
  .filter(m => m.state === 2)
  .map(m => ({
    name: m.name,
    lag: m.optimeDate - m.lastHeartbeat
  }))

// Oplog size and retention
db.adminCommand({replSetGetStatus: 1})

// Operation times
db.getReplicationInfo()
```

### Prometheus Metrics (MongoDB Exporter)

```yaml
# MongoDB Exporter Config
mongodb_up: 1 (if connected)
mongodb_replica_set_number_of_members: 3
mongodb_replica_set_my_state: 1 (primary:1, secondary:2)
mongodb_replica_set_members_health: 1 (healthy)
mongodb_replica_set_members_state_text: "PRIMARY", "SECONDARY"
mongodb_replication_lag_count: 0 (in bytes)
```

---

## BACKUP STRATEGY WITH REPLICA SET

### Backup from Secondary (Non-blocking)

```bash
# Set secondary to non-voting, non-electable (safe for backup)
rs.reconfig({
  _id: "alawael-rs",
  members: [
    {_id: 0, host: "primary:27017", priority: 10},
    {_id: 1, host: "secondary1:27017", priority: 5},
    {_id: 2, host: "secondary2:27017", priority: 0, hidden: true, votes: 0}
  ]
})

# Now secondary-2 won't affect quorum, safe to backup from
mongodump --host secondary2:27017 --out /backup/secondary-2
```

### Backup Architecture

```
Secondary Node (dedicated for backup)
├─ Receives replication stream from Primary
├─ Data always in sync
├─ Can pause follower for backup without affecting failover
└─ Automated daily: mongodump to /backup/

Primary
├─ Serves all reads/writes
├─ No backup I/O impact
└─ Protected by majority write concern
```

---

## DEPLOYMENT TIMELINE

| Step | Task | Time | Status |
|------|------|------|--------|
| 1 | Create data directories | 5 min | Ready |
| 2 | Start 3x MongoDB instances | 10 min | Ready |
| 3 | Initialize replica set | 5 min | Ready |
| 4 | Update connection string | 5 min | Ready |
| 5 | Restart Node.js | 5 min | Ready |
| 6 | Verify replication | 10 min | Ready |
| 7 | Configure monitoring | 20 min | Ready |

**Total Time: ~90 minutes (1.5 hours)**

---

## TESTING FAILOVER

### Simulate Primary Failure

```bash
# Terminal with Primary (port 27017)
# Press Ctrl+C to kill

# Watch: Secondary automatically becomes new Primary
# Replication lag: ~10-20 seconds

# Verify in application
curl http://localhost:3001/api/v1/health/db
# Should still show: "status": "connected"
```

### Test Read from Secondary

```javascript
// Set read preference to secondary
db.setReadPref("secondary")

// Queries now read from secondary
db.users.find().explain("executionStats")

// Check which member served the query
// Look for "serverAddress" in output
```

---

## CAPACITY IMPACT

### Storage Requirements
```
Single instance:  1 GB
3-node replica:   3 GB (3x replication)

Note: Only needed during transition. After migration,
old data can be archived.
```

### Performance Impact
```
Write latency:     +5-10% (waiting for majority)
Read latency:      -10% (option to read from secondary)
Network:           2x bandwidth (replication stream)
```

### High Availability Gain
```
Before:  MTTR = ∞ if primary failure (manual recovery needed)
After:   MTTR = 20-30 seconds (automatic failover)
         RPO = ~1 second (replication lag < 1s)
         Availability: 99.9% → 99.99%
```

---

## MAINTENANCE PROCEDURES

### Add New Replica Member

```javascript
// Add new secondary
rs.add("mongodb-secondary-3:27017")

// Or with priority/tags
rs.add({
  _id: 3,
  host: "mongodb-secondary-3:27017",
  priority: 5,
  tags: {type: "secondary"}
})

// Monitor initial sync
db.adminCommand({replSetGetStatus: 1})
// Watch syncingTo, optime fields
```

### Remove Replica Member

```javascript
// Remove member
rs.remove("mongodb-secondary-3:27017")

// Graceful removal:
// 1. Set priority to 0
rs.reconfig({their _id: 3, priority: 0})

// 2. Wait for secondary to catch up
rs.status()

// 3. Remove
rs.remove("mongodb-secondary-3:27017")
```

### Reconfigure (Change Priority, Tags, etc)

```javascript
// Get current config
cfg = rs.conf()

// Modify
cfg.members[1].priority = 10
cfg.members[1].tags = {type: "reporting"}

// Apply
rs.reconfig(cfg)

// Verify
rs.conf()
```

---

## TROUBLESHOOTING

### Not Joining Replica Set
```
Check:
1. All instances using same replSetName
2. All instances reachable on network
3. Data directories exist and writable
4. No port conflicts
5. Check logs: mongod.log
```

### Replication Lag
```
Check:
1. Network latency: ping between nodes
2. Secondary load: high queries?
3. Disk I/O: slow writes?
4. Oplog size: too small for workload?
   → Increase: --oplogSizeMB
```

### Failover Not Working
```
Check:
1. Heartbeat enabled: heartbeatIntervalMillis
2. Voting members: rs.conf().members[x].votes
3. Majority available: >n/2 members up
   → 3 members: need 2 up
   → 5 members: need 3 up
```

---

## STATUS: ✅ READY TO IMPLEMENT

Complete MongoDB Replica Set configuration provided. Deployment improves:
- **Availability:** 99.9% → 99.99%
- **RTO:** ∞ → 20-30 seconds
- **Read scaling:** Can distribute reads to secondaries

**Next command to execute Database Replication: READY** ✅

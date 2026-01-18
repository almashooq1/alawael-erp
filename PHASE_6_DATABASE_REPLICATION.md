# 🗄️ **Phase 6.4: Database Replication**

**التاريخ:** 14 يناير 2026  
**المدة:** 1-2 ساعة  
**المستوى:** متقدم

---

## 📋 **جدول المحتويات**

1. [المقدمة](#المقدمة)
2. [Replica Set Architecture](#replica-set-architecture)
3. [Setup Instructions](#setup-instructions)
4. [Sharding Strategy](#sharding-strategy)
5. [Failover Management](#failover-management)
6. [Monitoring](#monitoring)

---

## 🎯 **المقدمة**

### الهدف:

إعداد MongoDB Replication للـ High Availability و Scale-Out:

- ✅ Replica set with 3 nodes
- ✅ Read preference routing
- ✅ Automatic failover
- ✅ Data consistency

### الفوائد:

```
Read Throughput:   1x → 3x          (3x improvement)
Write Throughput:  1x → 1.2x        (replica overhead)
Availability:      99% → 99.95%
Recovery Time:     manual → automatic
```

---

## 🏗️ **Replica Set Architecture**

### Single Node vs Replica Set

```
Single Node (Not Recommended):
┌──────────────┐
│   Primary    │ ← Single point of failure
│  MongoDB     │
└──────────────┘

Replica Set (Recommended):
┌──────────────┐
│   Primary    │ ← Read/Write
│  MongoDB     │
└──────┬───────┘
       │ Replicates
       │ (async)
       ├─────────────────────┐
       │                     │
   ┌───▼────┐           ┌────▼───┐
   │Secondary│           │Secondary│
   │MongoDB  │ ← Read    │MongoDB  │ ← Read
   └────────┘           └────────┘
```

### Replica Set Configuration

```
Nodes:        3 (1 primary + 2 secondary)
Replication:  Asynchronous
Quorum:       2 of 3 (majority)
Election:     Automatic
Recovery:     Automatic
Read Pref:    Primary/Secondary/Tags
```

---

## 🔧 **Setup Instructions**

### Step 1: Initialize Replica Set

```javascript
// mongodb-init.js

const MongoClient = require('mongodb').MongoClient;

async function initializeReplicaSet() {
  const client = new MongoClient('mongodb://localhost:27017,localhost:27018,localhost:27019');

  try {
    await client.connect();
    const admin = client.db('admin').admin();

    const config = {
      _id: 'almashooq-rs',
      members: [
        {
          _id: 0,
          host: 'mongodb-1:27017',
          priority: 1,
          votes: 1,
        },
        {
          _id: 1,
          host: 'mongodb-2:27017',
          priority: 0.5,
          votes: 1,
          tags: {
            region: 'secondary',
          },
        },
        {
          _id: 2,
          host: 'mongodb-3:27017',
          priority: 0.5,
          votes: 1,
          tags: {
            region: 'secondary',
          },
        },
      ],
      settings: {
        heartbeatIntervalMillis: 2000,
        heartbeatTimeoutSecs: 10,
        electionTimeoutMillis: 10000,
        catchUpTimeoutMillis: 60000,
      },
    };

    const result = await admin.command({ replSetInitiate: config });
    console.log('✅ Replica set initialized:', result);

    return result;
  } finally {
    await client.close();
  }
}

initializeReplicaSet().catch(console.error);
```

### Step 2: Docker Compose Setup

```yaml
# docker-compose.yml

version: '3.8'

services:
  mongodb-1:
    image: mongo:latest
    command: mongod --replSet almashooq-rs --port 27017
    ports:
      - '27017:27017'
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb-1-data:/data/db
    networks:
      - mongodb-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test
      interval: 10s
      timeout: 5s
      retries: 5

  mongodb-2:
    image: mongo:latest
    command: mongod --replSet almashooq-rs --port 27017
    ports:
      - '27018:27017'
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb-2-data:/data/db
    networks:
      - mongodb-network
    depends_on:
      - mongodb-1

  mongodb-3:
    image: mongo:latest
    command: mongod --replSet almashooq-rs --port 27017
    ports:
      - '27019:27017'
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb-3-data:/data/db
    networks:
      - mongodb-network
    depends_on:
      - mongodb-1

volumes:
  mongodb-1-data:
  mongodb-2-data:
  mongodb-3-data:

networks:
  mongodb-network:
    driver: bridge
```

### Step 3: Connection String

```javascript
// backend/config/database.js

const mongoose = require('mongoose');

const connectionString =
  process.env.MONGODB_URI ||
  'mongodb://admin:password@mongodb-1:27017,mongodb-2:27017,mongodb-3:27017/almashooq?replicaSet=almashooq-rs&authSource=admin';

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  readPreference: 'secondaryPreferred', // Read from secondary if available
  retryWrites: true,
  w: 'majority', // Write to majority
  journal: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  minPoolSize: 10,
};

async function connectDB() {
  try {
    await mongoose.connect(connectionString, options);
    console.log('✅ Connected to MongoDB Replica Set');

    // Monitor replica set status
    monitorReplicaSet();

    return mongoose.connection;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
}

function monitorReplicaSet() {
  const admin = mongoose.connection.db.admin();

  setInterval(async () => {
    try {
      const status = await admin.replSetGetStatus();

      console.log('📊 Replica Set Status:');
      status.members.forEach(member => {
        console.log(`  - ${member.name}: ${member.health ? '✅' : '❌'}`);
      });
    } catch (error) {
      console.error('Monitor error:', error);
    }
  }, 30000);
}

module.exports = connectDB;
```

---

## 🔀 **Sharding Strategy**

### Sharding Configuration

```javascript
// backend/config/sharding.js

const mongoose = require('mongoose');

class ShardingManager {
  async enableSharding(database) {
    try {
      const admin = mongoose.connection.db.admin();

      // Enable sharding for database
      await admin.command({
        enableSharding: database,
      });

      console.log(`✅ Sharding enabled for ${database}`);
    } catch (error) {
      console.error('Sharding error:', error);
    }
  }

  async shardCollection(database, collection, shardKey) {
    try {
      const admin = mongoose.connection.db.admin();

      // Create index on shard key
      const db = mongoose.connection.db.collection(collection);
      await db.createIndex(shardKey);

      // Shard the collection
      await admin.command({
        shardCollection: `${database}.${collection}`,
        key: shardKey,
      });

      console.log(`✅ ${collection} sharded on ${JSON.stringify(shardKey)}`);
    } catch (error) {
      console.error('Shard collection error:', error);
    }
  }

  async balanceChunks() {
    try {
      const admin = mongoose.connection.db.admin();

      // Enable balancer
      await admin.command({
        balancerStart: 1,
      });

      console.log('✅ Chunk balancer started');
    } catch (error) {
      console.error('Balancer error:', error);
    }
  }
}

// Sharding strategy for almashooq
const shardingStrategy = {
  users: { _id: 'hashed' }, // Hash sharding for distribution
  students: { userId: 1 }, // Range sharding by userId
  sessions: { studentId: 'hashed' }, // Hash sharding
  analytics: { timestamp: 1 }, // Range sharding by time
  documents: { studentId: 1 }, // Range sharding by studentId
  communications: { userId: 'hashed' }, // Hash sharding
};

module.exports = { ShardingManager, shardingStrategy };
```

### Shard Key Selection Criteria

```
Good Shard Key Properties:
1. High Cardinality      - Many distinct values
2. Low Monotonic Growth  - Not always increasing
3. Even Distribution     - Data distributed equally
4. Query Pattern Aligned - Used in common queries

Examples:
✓ userId (hashed)        - Good: high cardinality, even
✓ email (range)          - Good: high cardinality
✗ status (range)         - Bad: low cardinality
✗ createdAt (range)      - Bad: always increasing
```

---

## 🔄 **Failover Management**

### Automatic Failover

```javascript
// backend/monitoring/failover-manager.js

class FailoverManager {
  constructor(mongoClient) {
    this.client = mongoClient;
    this.isMonitoring = false;
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    this.client.on('serverDescriptionChanged', event => {
      this.handleServerChange(event);
    });

    this.client.on('topologyDescriptionChanged', event => {
      this.handleTopologyChange(event);
    });

    console.log('📡 Failover monitoring started');
  }

  handleServerChange(event) {
    const { address, newDescription } = event;

    if (newDescription.type === 'Unknown') {
      console.warn(`⚠️ Server ${address} is down`);
      this.alertOps(`Server ${address} disconnected`);
    } else if (newDescription.type === 'RSPrimary') {
      console.log(`✅ ${address} became primary`);
      this.alertOps(`${address} is now primary`);
    }
  }

  handleTopologyChange(event) {
    const { newDescription } = event;

    const hasWritable = newDescription.hasWritableSever;
    const hasPrimary = newDescription.hasPrimaryServer;

    if (!hasWritable) {
      console.error('❌ No writable server available');
      this.alertOps('CRITICAL: No writable MongoDB server');
    } else if (!hasPrimary) {
      console.warn('⚠️ No primary available, election in progress');
    }

    console.log(`Topology: Writable=${hasWritable}, Primary=${hasPrimary}`);
  }

  alertOps(message) {
    // Send to monitoring system
    console.log(`[ALERT] ${message}`);
    // Slack, PagerDuty, etc.
  }

  getReplicaSetStatus() {
    return {
      connected: this.client.topology.connected,
      primary: this.client.topology.primaryDescription,
      secondaries: this.client.topology.secondaryDescriptions,
      members: this.client.topology.all.length,
    };
  }
}

module.exports = FailoverManager;
```

---

## 📊 **Monitoring**

### Replica Set Monitoring

```javascript
// backend/monitoring/replication-monitor.js

class ReplicationMonitor {
  async getReplicaSetStatus() {
    try {
      const admin = mongoose.connection.db.admin();
      const status = await admin.replSetGetStatus();

      return {
        name: status.set,
        state: this.getState(status.myState),
        members: status.members.map(m => ({
          name: m.name,
          state: this.getMemberState(m.state),
          health: m.health,
          optime: m.optime,
          lag: m.optime ? status.optimeDate - m.optime : null,
        })),
        electionVersion: status.electionVersion,
        term: status.term,
      };
    } catch (error) {
      console.error('Status error:', error);
      return null;
    }
  }

  getMemberState(state) {
    const states = {
      0: 'Down',
      1: 'Primary',
      2: 'Secondary',
      3: 'Recovering',
      4: 'Fatal',
      5: 'Startup2',
      6: 'Unknown',
      7: 'Arbiter',
      8: 'Down',
      9: 'SecondaryLag',
      10: 'Rollback',
    };
    return states[state] || 'Unknown';
  }

  async monitorOplog() {
    try {
      const oplogCollection = mongoose.connection.db.collection('oplog.rs');
      const lastOp = await oplogCollection.findOne({}, { sort: { $natural: -1 } });

      return {
        lastOperation: lastOp.op,
        timestamp: lastOp.ts,
        namespace: lastOp.ns,
        lag: Date.now() - (lastOp.ts.getTime ? lastOp.ts.getTime() : lastOp.ts),
      };
    } catch (error) {
      console.error('Oplog error:', error);
      return null;
    }
  }

  async getMetrics() {
    const status = await this.getReplicaSetStatus();
    const oplog = await this.monitorOplog();

    return {
      replica_set: status,
      oplog: oplog,
      timestamp: new Date(),
    };
  }
}

// API endpoint
app.get('/api/replication/status', async (req, res) => {
  const monitor = new ReplicationMonitor();
  const metrics = await monitor.getMetrics();
  res.json(metrics);
});
```

### Replication Dashboard

```javascript
// backend/routes/replication-dashboard.js

router.get('/replication/dashboard', async (req, res) => {
  try {
    const admin = mongoose.connection.db.admin();
    const replicaSetStatus = await admin.replSetGetStatus();

    const dashboard = {
      cluster: {
        name: replicaSetStatus.set,
        members: replicaSetStatus.members.length,
        primary: replicaSetStatus.members.find(m => m.state === 1)?.name,
        healthy: replicaSetStatus.members.filter(m => m.health === 1).length,
      },
      members: replicaSetStatus.members.map(m => ({
        name: m.name,
        state: ['Down', 'Primary', 'Secondary'][Math.min(m.state, 2)] || 'Unknown',
        health: m.health ? 'Healthy' : 'Unhealthy',
        uptime: m.uptime,
        lastHeartbeat: m.lastHeartbeat,
      })),
      uptime: replicaSetStatus.uptime,
      elections: replicaSetStatus.electionVersion,
    };

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## ⚡ **Performance Optimization**

### Read Preference Routing

```javascript
// backend/models/Vehicle.js

const vehicleSchema = new Schema(
  {
    // ... fields
  },
  {
    readPreference: 'secondaryPreferred', // Read from secondary
  },
);

// For specific queries
async function getAnalytics() {
  return Vehicle.find().setOptions({ readPreference: 'secondaryPreferred' }).lean().exec();
}

// For write-sensitive data
async function getUserData(userId) {
  return Vehicle.findById(userId).setOptions({ readPreference: 'primary' }).exec();
}
```

### Write Concern

```javascript
// Ensure write durability
const options = {
  w: 'majority', // Write to majority
  j: true, // Journal write
  wtimeout: 5000, // Wait 5 seconds
  retryWrites: true, // Retry on failure
};

await collection.insertOne(doc, options);
```

---

## 🎯 **Checklist**

- [ ] Replica set initialized
- [ ] 3 MongoDB nodes running
- [ ] Replication verified
- [ ] Sharding strategy defined
- [ ] Shard keys created
- [ ] Failover tested
- [ ] Read preferences configured
- [ ] Monitoring setup complete

---

**تم إنشاء هذا الملف:** 14 يناير 2026  
**الحالة:** ✅ جاهز للتطبيق الفوري

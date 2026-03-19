/**
 * Database Configuration Module
 * Phase 13 - Week 2: Database & Redis Optimization
 *
 * Features:
 * - Connection pooling with pg-pool
 * - Read replica support
 * - Query performance monitoring
 * - Automatic failover
 * - Connection retry logic
 */

const { Pool } = require('pg');

// Environment configuration
const config = {
  // Primary database (write operations)
  primary: {
    host: process.env.DB_PRIMARY_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PRIMARY_PORT || process.env.DB_PORT || '5432'),
    database: process.env.DB_PRIMARY_DATABASE || process.env.DB_NAME || 'alawael_erp',
    user: process.env.DB_PRIMARY_USER || process.env.DB_USER || 'alawael_user',
    password: process.env.DB_PRIMARY_PASSWORD || process.env.DB_PASSWORD || 'changeme',

    // Connection pool settings
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '20'),

    // Connection timeouts
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,

    // Keep-alive settings
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,

    // Statement timeout (30 seconds)
    statement_timeout: 30000,

    // Query timeout (30 seconds)
    query_timeout: 30000,

    // Application name for monitoring
    application_name: 'alawael_erp_backend',
  },

  // Read replicas (for read-heavy queries)
  replicas: [
    {
      host: process.env.DB_REPLICA1_HOST || 'localhost',
      port: parseInt(process.env.DB_REPLICA1_PORT || '5433'),
      database: process.env.DB_NAME || 'alawael_erp',
      user: process.env.DB_USER || 'alawael_user',
      password: process.env.DB_PASSWORD || 'changeme',
      min: 2,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      keepAlive: true,
      application_name: 'alawael_erp_replica',
    },
    // Add more replicas as needed
  ],
};

// Primary connection pool
let primaryPool = null;
let replicaPools = [];
let currentReplicaIndex = 0;

// Performance metrics
const metrics = {
  queries: {
    total: 0,
    successful: 0,
    failed: 0,
    slow: 0, // > 1 second
  },
  connections: {
    active: 0,
    idle: 0,
    waiting: 0,
  },
  replicas: {
    healthy: 0,
    unhealthy: 0,
  },
};

/**
 * Initialize database connections
 */
async function initialize() {
  console.log('🔌 Initializing database connections...');

  // Create primary pool
  primaryPool = new Pool(config.primary);

  // Primary pool event handlers
  primaryPool.on('connect', client => {
    console.log(`✅ Connected to PRIMARY database (PID: ${client.processID})`);
    metrics.connections.active++;
  });

  primaryPool.on('acquire', client => {
    metrics.connections.active++;
    metrics.connections.idle--;
  });

  primaryPool.on('release', client => {
    metrics.connections.active--;
    metrics.connections.idle++;
  });

  primaryPool.on('error', (err, client) => {
    console.error('❌ PRIMARY pool error:', err.message);
  });

  // Test primary connection
  try {
    const client = await primaryPool.connect();
    const result = await client.query('SELECT NOW() as time, version() as version');
    console.log(`✅ PRIMARY database ready: ${result.rows[0].version}`);
    client.release();
  } catch (err) {
    console.error('❌ Failed to connect to PRIMARY database:', err.message);
    throw err;
  }

  // Initialize read replicas
  if (process.env.DB_ENABLE_REPLICAS === 'true') {
    for (let i = 0; i < config.replicas.length; i++) {
      const replicaConfig = config.replicas[i];
      const replicaPool = new Pool(replicaConfig);

      replicaPool.on('error', err => {
        console.error(`❌ REPLICA ${i + 1} error:`, err.message);
        metrics.replicas.unhealthy++;
      });

      try {
        const client = await replicaPool.connect();
        await client.query('SELECT 1');
        client.release();

        replicaPools.push(replicaPool);
        metrics.replicas.healthy++;
        console.log(`✅ REPLICA ${i + 1} connected`);
      } catch (err) {
        console.warn(`⚠️  REPLICA ${i + 1} unavailable (continuing without it)`);
        metrics.replicas.unhealthy++;
      }
    }
  }

  console.log(`✅ Database initialized (1 primary, ${replicaPools.length} replicas)`);
}

/**
 * Execute query on primary database (write operations)
 */
async function query(sql, params = [], options = {}) {
  const startTime = Date.now();
  metrics.queries.total++;

  try {
    const result = await primaryPool.query(sql, params);
    const duration = Date.now() - startTime;

    metrics.queries.successful++;

    // Track slow queries
    if (duration > 1000) {
      metrics.queries.slow++;
      console.warn(`🐌 Slow query (${duration}ms): ${sql.substring(0, 100)}`);
    }

    if (options.debug) {
      console.log(`📊 Query executed in ${duration}ms`);
    }

    return result;
  } catch (err) {
    metrics.queries.failed++;
    console.error('❌ Query failed:', err.message);
    console.error('   SQL:', sql);
    throw err;
  }
}

/**
 * Execute read query with replica support (round-robin)
 */
async function queryRead(sql, params = [], options = {}) {
  // If no replicas available, use primary
  if (replicaPools.length === 0) {
    return query(sql, params, options);
  }

  // Round-robin load balancing across replicas
  const replica = replicaPools[currentReplicaIndex];
  currentReplicaIndex = (currentReplicaIndex + 1) % replicaPools.length;

  const startTime = Date.now();
  metrics.queries.total++;

  try {
    const result = await replica.query(sql, params);
    const duration = Date.now() - startTime;

    metrics.queries.successful++;

    if (duration > 1000) {
      metrics.queries.slow++;
      console.warn(`🐌 Slow read query (${duration}ms): ${sql.substring(0, 100)}`);
    }

    return result;
  } catch (err) {
    // Fallback to primary on replica failure
    console.warn('⚠️  Replica query failed, falling back to primary');
    return query(sql, params, options);
  }
}

/**
 * Begin transaction
 */
async function transaction(callback) {
  const client = await primaryPool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute batch insert with optimized performance
 */
async function batchInsert(table, columns, rows, options = {}) {
  if (!rows || rows.length === 0) {
    return { rowCount: 0 };
  }

  const chunkSize = options.chunkSize || 1000;
  let totalInserted = 0;

  // Process in chunks
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    // Build VALUES clause
    const values = [];
    const params = [];
    let paramIndex = 1;

    chunk.forEach(row => {
      const rowParams = columns.map(() => `$${paramIndex++}`);
      values.push(`(${rowParams.join(', ')})`);
      params.push(...Object.values(row));
    });

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${values.join(', ')}
      ${options.onConflict || ''}
      ${options.returning ? 'RETURNING *' : ''}
    `;

    const result = await query(sql, params);
    totalInserted += result.rowCount;
  }

  return { rowCount: totalInserted };
}

/**
 * Get connection pool statistics
 */
function getPoolStats() {
  const primaryStats = {
    total: primaryPool.totalCount,
    idle: primaryPool.idleCount,
    waiting: primaryPool.waitingCount,
  };

  const replicaStats = replicaPools.map((pool, index) => ({
    replica: index + 1,
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  }));

  return {
    primary: primaryStats,
    replicas: replicaStats,
    metrics,
  };
}

/**
 * Health check
 */
async function healthCheck() {
  const checks = {
    primary: { status: 'unknown', healthy: false, latency: 0 },
    replicas: [],
  };

  // Check primary
  try {
    const start = Date.now();
    await primaryPool.query('SELECT 1');
    checks.primary.status = 'healthy';
    checks.primary.healthy = true;
    checks.primary.latency = Date.now() - start;
  } catch (err) {
    checks.primary.status = 'unhealthy';
    checks.primary.healthy = false;
    checks.primary.error = err.message;
  }

  // Check replicas
  for (let i = 0; i < replicaPools.length; i++) {
    try {
      const start = Date.now();
      await replicaPools[i].query('SELECT 1');
      checks.replicas.push({
        replica: i + 1,
        status: 'healthy',
        healthy: true,
        latency: Date.now() - start,
      });
    } catch (err) {
      checks.replicas.push({
        replica: i + 1,
        status: 'unhealthy',
        healthy: false,
        error: err.message,
      });
    }
  }

  return checks;
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('🔌 Closing database connections...');

  if (primaryPool) {
    await primaryPool.end();
    console.log('✅ PRIMARY pool closed');
  }

  for (let i = 0; i < replicaPools.length; i++) {
    await replicaPools[i].end();
    console.log(`✅ REPLICA ${i + 1} pool closed`);
  }
}

// Graceful shutdown on process termination
process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

module.exports = {
  initialize,
  query,
  queryRead,
  transaction,
  batchInsert,
  getPoolStats,
  healthCheck,
  shutdown,

  // Direct pool access (use with caution)
  get primaryPool() {
    return primaryPool;
  },
  get replicaPools() {
    return replicaPools;
  },
};

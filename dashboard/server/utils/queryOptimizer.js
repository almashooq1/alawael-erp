/**
 * Query Optimizer Utilities
 * Phase 13 - Week 2: Database & Redis Optimization
 *
 * Features:
 * - Query analysis and optimization
 * - Index recommendations
 * - Slow query detection
 * - Query plan analysis
 * - Automatic query caching
 */

const db = require('../config/database');
const redis = require('../config/redis');

// Query cache settings
const CACHE_PREFIX = 'query:';
const DEFAULT_TTL = 300; // 5 minutes

// Performance thresholds
const THRESHOLDS = {
  SLOW_QUERY_MS: 1000,
  VERY_SLOW_QUERY_MS: 5000,
  CACHE_FOR_READS: true,
};

// Statistics
const stats = {
  queries: {
    total: 0,
    cached: 0,
    slow: 0,
    failed: 0,
  },
  cache: {
    hits: 0,
    misses: 0,
    saves: 0,
  },
};

/**
 * Execute optimized query with automatic caching
 */
async function optimizedQuery(sql, params = [], options = {}) {
  const {
    cacheable = true,
    ttl = DEFAULT_TTL,
    cacheKey = null,
    useReplica = false,
    debug = false,
  } = options;

  stats.queries.total++;
  const startTime = Date.now();

  // Generate cache key
  const key = cacheKey || generateCacheKey(sql, params);

  // Try cache first (for SELECT queries)
  if (cacheable && isSelectQuery(sql) && redis.client) {
    const cached = await redis.get(key, { json: true });

    if (cached !== null) {
      stats.cache.hits++;
      stats.queries.cached++;

      if (debug) {
        console.log(`✅ Cache HIT: ${key} (${Date.now() - startTime}ms)`);
      }

      return cached;
    }

    stats.cache.misses++;
  }

  // Execute query
  try {
    const queryFn = useReplica ? db.queryRead : db.query;
    const result = await queryFn(sql, params, { debug });

    const duration = Date.now() - startTime;

    // Track slow queries
    if (duration > THRESHOLDS.SLOW_QUERY_MS) {
      stats.queries.slow++;

      if (duration > THRESHOLDS.VERY_SLOW_QUERY_MS) {
        console.error(`🐢 VERY SLOW query (${duration}ms):`);
        console.error(`   SQL: ${sql}`);
        console.error(`   Params: ${JSON.stringify(params)}`);

        // Analyze query plan
        await analyzeQuery(sql, params);
      } else {
        console.warn(`🐌 Slow query (${duration}ms): ${sql.substring(0, 100)}`);
      }
    }

    // Cache result (for SELECT queries)
    if (cacheable && isSelectQuery(sql) && redis.client) {
      await redis.set(key, result.rows, { ttl });
      stats.cache.saves++;

      if (debug) {
        console.log(`💾 Cached result: ${key} (TTL: ${ttl}s)`);
      }
    }

    return result;
  } catch (err) {
    stats.queries.failed++;
    console.error('❌ Query execution failed:', err.message);
    throw err;
  }
}

/**
 * Analyze query execution plan
 */
async function analyzeQuery(sql, params = []) {
  try {
    console.log('\n📊 Query Analysis:');

    // Get query plan
    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
    const result = await db.query(explainSql, params);

    const plan = result.rows[0]['QUERY PLAN'][0];
    const execution = plan['Execution Time'];
    const planning = plan['Planning Time'];

    console.log(`   Planning Time: ${planning.toFixed(2)}ms`);
    console.log(`   Execution Time: ${execution.toFixed(2)}ms`);
    console.log(`   Total Time: ${(planning + execution).toFixed(2)}ms`);

    // Analyze plan nodes
    analyzePlanNode(plan.Plan, 0);

    // Suggest indexes
    const suggestions = suggestIndexes(plan.Plan);
    if (suggestions.length > 0) {
      console.log('\n💡 Index Suggestions:');
      suggestions.forEach(s => console.log(`   ${s}`));
    }

    console.log('');
  } catch (err) {
    console.error('❌ Query analysis failed:', err.message);
  }
}

/**
 * Analyze plan node recursively
 */
function analyzePlanNode(node, depth = 0) {
  const indent = '   ' + '  '.repeat(depth);

  console.log(`${indent}→ ${node['Node Type']}`);

  // Show important metrics
  if (node['Actual Total Time']) {
    console.log(`${indent}  Time: ${node['Actual Total Time'].toFixed(2)}ms`);
  }

  if (node['Actual Rows']) {
    console.log(`${indent}  Rows: ${node['Actual Rows']}`);
  }

  // Highlight sequential scans (potential optimization target)
  if (node['Node Type'] === 'Seq Scan') {
    console.warn(`${indent}  ⚠️  Sequential scan detected on ${node['Relation Name']}`);
  }

  // Recurse into child nodes
  if (node['Plans']) {
    node['Plans'].forEach(child => analyzePlanNode(child, depth + 1));
  }
}

/**
 * Suggest indexes based on query plan
 */
function suggestIndexes(plan) {
  const suggestions = [];

  function traverse(node) {
    // Sequential scan on large table
    if (node['Node Type'] === 'Seq Scan' && node['Actual Rows'] > 1000) {
      const table = node['Relation Name'];
      const filter = node['Filter'];

      if (filter) {
        suggestions.push(`CREATE INDEX idx_${table}_filter ON ${table} (column_name);`);
      }
    }

    // Hash join without indexes
    if (node['Node Type'] === 'Hash Join') {
      suggestions.push('Consider adding indexes on join columns for better performance');
    }

    // Sort operations
    if (node['Node Type'] === 'Sort' && node['Sort Key']) {
      suggestions.push(`Consider index on sort columns: ${node['Sort Key'].join(', ')}`);
    }

    if (node['Plans']) {
      node['Plans'].forEach(traverse);
    }
  }

  traverse(plan);
  return suggestions;
}

/**
 * Generate cache key from SQL and params
 */
function generateCacheKey(sql, params) {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  const paramsStr = JSON.stringify(params);

  // Simple hash (use crypto for production)
  const hash = Buffer.from(normalized + paramsStr)
    .toString('base64')
    .substring(0, 32);

  return `${CACHE_PREFIX}${hash}`;
}

/**
 * Check if query is SELECT
 */
function isSelectQuery(sql) {
  return /^\s*SELECT/i.test(sql);
}

/**
 * Invalidate cache for table
 */
async function invalidateTableCache(tableName) {
  if (!redis.client) return 0;

  const pattern = `${CACHE_PREFIX}*${tableName}*`;
  const deleted = await redis.delPattern(pattern);

  console.log(`🗑️  Invalidated ${deleted} cache entries for table: ${tableName}`);
  return deleted;
}

/**
 * Common query patterns with optimization
 */
const queries = {
  /**
   * Find by ID (cached, uses index)
   */
  async findById(table, id, options = {}) {
    const sql = `SELECT * FROM ${table} WHERE id = $1`;
    const result = await optimizedQuery(sql, [id], {
      ...options,
      cacheable: true,
      useReplica: true,
    });

    return result.rows[0] || null;
  },

  /**
   * Find many with pagination
   */
  async findMany(table, conditions = {}, options = {}) {
    const { limit = 50, offset = 0, orderBy = 'id', order = 'ASC' } = options;

    // Build WHERE clause
    const whereClause = [];
    const params = [];
    let paramIndex = 1;

    Object.entries(conditions).forEach(([key, value]) => {
      whereClause.push(`${key} = $${paramIndex++}`);
      params.push(value);
    });

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    params.push(limit, offset);

    const sql = `
      SELECT * FROM ${table}
      ${where}
      ORDER BY ${orderBy} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const result = await optimizedQuery(sql, params, {
      ...options,
      useReplica: true,
    });

    return result.rows;
  },

  /**
   * Count rows (cached)
   */
  async count(table, conditions = {}, options = {}) {
    const whereClause = [];
    const params = [];
    let paramIndex = 1;

    Object.entries(conditions).forEach(([key, value]) => {
      whereClause.push(`${key} = $${paramIndex++}`);
      params.push(value);
    });

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const sql = `SELECT COUNT(*) as count FROM ${table} ${where}`;

    const result = await optimizedQuery(sql, params, {
      ...options,
      useReplica: true,
      ttl: 60, // Cache for 1 minute
    });

    return parseInt(result.rows[0].count);
  },

  /**
   * Bulk insert with transaction
   */
  async bulkInsert(table, rows, options = {}) {
    if (!rows || rows.length === 0) return { rowCount: 0 };

    const columns = Object.keys(rows[0]);

    return await db.batchInsert(table, columns, rows, options);
  },

  /**
   * Update by ID
   */
  async updateById(table, id, data, options = {}) {
    const keys = Object.keys(data);
    const values = Object.values(data);

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    const sql = `
      UPDATE ${table}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(sql, [id, ...values]);

    // Invalidate cache
    await invalidateTableCache(table);

    return result.rows[0] || null;
  },

  /**
   * Delete by ID
   */
  async deleteById(table, id, options = {}) {
    const sql = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;

    const result = await db.query(sql, [id]);

    // Invalidate cache
    await invalidateTableCache(table);

    return result.rows[0] || null;
  },
};

/**
 * Get query statistics
 */
function getStats() {
  const cacheHitRate =
    stats.cache.hits + stats.cache.misses > 0
      ? ((stats.cache.hits / (stats.cache.hits + stats.cache.misses)) * 100).toFixed(2)
      : '0.00';

  return {
    queries: {
      ...stats.queries,
      slowPercentage:
        stats.queries.total > 0
          ? ((stats.queries.slow / stats.queries.total) * 100).toFixed(2) + '%'
          : '0.00%',
    },
    cache: {
      ...stats.cache,
      hitRate: `${cacheHitRate}%`,
    },
  };
}

/**
 * Reset statistics
 */
function resetStats() {
  stats.queries.total = 0;
  stats.queries.cached = 0;
  stats.queries.slow = 0;
  stats.queries.failed = 0;
  stats.cache.hits = 0;
  stats.cache.misses = 0;
  stats.cache.saves = 0;
}

module.exports = {
  optimizedQuery,
  analyzeQuery,
  invalidateTableCache,
  queries,
  getStats,
  resetStats,
};

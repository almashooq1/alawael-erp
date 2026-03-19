/**
 * Database Service - SQLite storage for test results
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/quality.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database(DB_PATH, err => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('✅ Database connected:', DB_PATH);
    initializeSchema();
  }
});

/**
 * Initialize database schema
 */
function initializeSchema() {
  db.serialize(() => {
    // Test runs table
    db.run(
      `
      CREATE TABLE IF NOT EXISTS test_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL,
        status TEXT NOT NULL,
        tests_passed INTEGER,
        tests_failed INTEGER,
        tests_total INTEGER,
        coverage REAL,
        duration_ms INTEGER,
        output TEXT,
        error TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      err => {
        if (err) {
          console.error('Error creating table:', err);
        } else {
          console.log('✅ Database schema initialized');
        }
      }
    );

    // Create indexes separately
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_service
      ON test_runs(service)
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_timestamp
      ON test_runs(timestamp)
    `);
    console.log('✅ Database schema initialized');
  });
}

/**
 * Save test run
 */
function saveTestRun(data) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO test_runs
      (service, status, tests_passed, tests_failed, tests_total, coverage, duration_ms, output, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      sql,
      [
        data.service,
        data.status,
        data.tests_passed,
        data.tests_failed,
        data.tests_total,
        data.coverage,
        data.duration_ms,
        data.output,
        data.error,
      ],
      function (err) {
        if (err) {
          console.error('Error saving test run:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * Get latest run for a service
 */
function getLatestRun(service) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM test_runs
      WHERE service = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    db.get(sql, [service], (err, row) => {
      if (err) {
        console.error('Error getting latest run:', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Get service history
 */
function getServiceHistory(service, limit = 10) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, service, status, tests_passed, tests_total, coverage, duration_ms, timestamp
      FROM test_runs
      WHERE service = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    db.all(sql, [service, limit], (err, rows) => {
      if (err) {
        console.error('Error getting service history:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Get recent runs across all services
 */
function getRecentRuns(limit = 20) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, service, status, tests_passed, tests_total, coverage, duration_ms, timestamp
      FROM test_runs
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    db.all(sql, [limit], (err, rows) => {
      if (err) {
        console.error('Error getting recent runs:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Get trends for a service (or all services)
 */
function getTrends(service = null, days = 30) {
  return new Promise((resolve, reject) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let sql = `
      SELECT
        DATE(timestamp) as date,
        service,
        AVG(coverage) as avg_coverage,
        AVG(tests_total) as avg_tests,
        COUNT(*) as run_count,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed_count
      FROM test_runs
      WHERE timestamp >= ?
    `;

    const params = [cutoffDate.toISOString()];

    if (service) {
      sql += ' AND service = ?';
      params.push(service);
    }

    sql += ' GROUP BY DATE(timestamp), service ORDER BY date DESC';

    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error getting trends:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Close database connection
 */
function close() {
  return new Promise((resolve, reject) => {
    db.close(err => {
      if (err) {
        console.error('Error closing database:', err);
        reject(err);
      } else {
        console.log('Database connection closed');
        resolve();
      }
    });
  });
}

module.exports = {
  saveTestRun,
  getLatestRun,
  getServiceHistory,
  getRecentRuns,
  getTrends,
  close,
};

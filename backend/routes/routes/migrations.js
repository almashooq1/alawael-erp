/**
 * Migration Routes
 * API endpoints for managing data migrations
 */

const express = require('express');
const router = express.Router();
const MigrationManager = require('../services/migration/MigrationManager');
const CSVProcessor = require('../services/migration/CSVProcessor');
const DatabaseMigration = require('../services/migration/DatabaseMigration');

// Initialize migration manager (would be instantiated in app.js with actual DB connections)
let migrationManager = null;

/**
 * Initialize migration manager
 * POST /api/migrations/initialize
 */
router.post('/initialize', (req, res) => {
  try {
    const { sourceDB, targetDB } = req.body;

    if (!sourceDB || !targetDB) {
      return res.status(400).json({
        success: false,
        error: 'Source and target databases are required',
      });
    }

    migrationManager = new MigrationManager({
      sourceDB,
      targetDB,
      csvProcessor: new CSVProcessor(),
      logger: console,
    });

    res.json({
      success: true,
      message: 'Migration manager initialized',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Create migration plan
 * POST /api/migrations/plan
 */
router.post('/plan', (req, res) => {
  try {
    if (!migrationManager) {
      return res.status(400).json({
        success: false,
        error: 'Migration manager not initialized. Call /initialize first.',
      });
    }

    const { tables, options } = req.body;

    if (!Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tables array is required and cannot be empty',
      });
    }

    const plan = migrationManager.createMigrationPlan(tables, options);

    res.json({
      success: true,
      plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get migration plan
 * GET /api/migrations/plan
 */
router.get('/plan', (req, res) => {
  try {
    if (!migrationManager || !migrationManager.migrationPlan) {
      return res.status(400).json({
        success: false,
        error: 'No migration plan created',
      });
    }

    res.json({
      success: true,
      plan: migrationManager.migrationPlan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Execute migration plan
 * POST /api/migrations/execute
 */
router.post('/execute', async (req, res) => {
  try {
    if (!migrationManager) {
      return res.status(400).json({
        success: false,
        error: 'Migration manager not initialized',
      });
    }

    const options = req.body;
    const summary = await migrationManager.executeMigrationPlan(options);

    res.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get execution summary
 * GET /api/migrations/summary
 */
router.get('/summary', (req, res) => {
  try {
    if (!migrationManager) {
      return res.status(400).json({
        success: false,
        error: 'Migration manager not initialized',
      });
    }

    const summary = migrationManager.getExecutionSummary();

    res.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get migration log
 * GET /api/migrations/log
 */
router.get('/log', (req, res) => {
  try {
    if (!migrationManager) {
      return res.status(400).json({
        success: false,
        error: 'Migration manager not initialized',
      });
    }

    const log = migrationManager.getExecutionLog();

    res.json({
      success: true,
      log,
      totalEntries: log.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Clear migration log
 * DELETE /api/migrations/log
 */
router.delete('/log', (req, res) => {
  try {
    if (!migrationManager) {
      return res.status(400).json({
        success: false,
        error: 'Migration manager not initialized',
      });
    }

    migrationManager.clearLog();

    res.json({
      success: true,
      message: 'Migration log cleared',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Import CSV and migrate to database
 * POST /api/migrations/import-csv
 */
router.post('/import-csv', async (req, res) => {
  try {
    if (!migrationManager) {
      return res.status(400).json({
        success: false,
        error: 'Migration manager not initialized',
      });
    }

    const { csvPath, tableName, options } = req.body;

    if (!csvPath || !tableName) {
      return res.status(400).json({
        success: false,
        error: 'CSV path and table name are required',
      });
    }

    const result = await migrationManager.migrateFromCSV(csvPath, tableName, options);

    res.json({
      success: result.status === 'completed',
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Export table to CSV
 * POST /api/migrations/export-csv
 */
router.post('/export-csv', async (req, res) => {
  try {
    if (!migrationManager) {
      return res.status(400).json({
        success: false,
        error: 'Migration manager not initialized',
      });
    }

    const { tableName, csvPath, options } = req.body;

    if (!tableName || !csvPath) {
      return res.status(400).json({
        success: false,
        error: 'Table name and CSV path are required',
      });
    }

    const result = await migrationManager.exportTableToCSV(tableName, csvPath, options);

    res.json({
      success: result.status === 'completed',
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Sample CSV file
 * POST /api/migrations/sample-csv
 */
router.post('/sample-csv', async (req, res) => {
  try {
    const { csvPath, sampleSize } = req.body;

    if (!csvPath) {
      return res.status(400).json({
        success: false,
        error: 'CSV path is required',
      });
    }

    const csvProcessor = new CSVProcessor();
    const result = await csvProcessor.sampleCSV(csvPath, sampleSize || 10);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get CSV info
 * GET /api/migrations/csv-info
 */
router.get('/csv-info', async (req, res) => {
  try {
    const { csvPath } = req.query;

    if (!csvPath) {
      return res.status(400).json({
        success: false,
        error: 'CSV path is required as query parameter',
      });
    }

    const csvProcessor = new CSVProcessor();
    const info = await csvProcessor.getCSVInfo(csvPath);

    res.json({
      success: true,
      info,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Validate CSV structure
 * POST /api/migrations/validate-csv
 */
router.post('/validate-csv', async (req, res) => {
  try {
    const { csvPath, expectedColumns } = req.body;

    if (!csvPath) {
      return res.status(400).json({
        success: false,
        error: 'CSV path is required',
      });
    }

    const csvProcessor = new CSVProcessor();
    const result = await csvProcessor.validateCSVStructure(csvPath, expectedColumns);

    res.json({
      success: result.valid,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Pause migration
 * POST /api/migrations/pause
 */
router.post('/pause', (req, res) => {
  try {
    if (!migrationManager) {
      return res.status(400).json({
        success: false,
        error: 'Migration manager not initialized',
      });
    }

    const result = migrationManager.pauseMigration();

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Resume migration
 * POST /api/migrations/resume
 */
router.post('/resume', (req, res) => {
  try {
    if (!migrationManager) {
      return res.status(400).json({
        success: false,
        error: 'Migration manager not initialized',
      });
    }

    const result = migrationManager.resumeMigration();

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Set migration manager instance
 * Called during app initialization
 */
function setMigrationManager(manager) {
  migrationManager = manager;
}

module.exports = router;
module.exports.setMigrationManager = setMigrationManager;

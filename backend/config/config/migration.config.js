/**
 * Migration System Configuration
 * Sample configuration for different scenarios
 */

/**
 * Development Configuration
 */
const devConfig = {
  sourceDB: {
    host: process.env.DEV_SOURCE_DB_HOST || 'localhost',
    user: process.env.DEV_SOURCE_DB_USER || 'root',
    password: process.env.DEV_SOURCE_DB_PASSWORD || 'password',
    database: process.env.DEV_SOURCE_DB_NAME || 'source_db_dev',
    waitForConnections: true,
    connectionLimit: 5,
  },

  targetDB: {
    host: process.env.DEV_TARGET_DB_HOST || 'localhost',
    user: process.env.DEV_TARGET_DB_USER || 'root',
    password: process.env.DEV_TARGET_DB_PASSWORD || 'password',
    database: process.env.DEV_TARGET_DB_NAME || 'target_db_dev',
    waitForConnections: true,
    connectionLimit: 5,
  },

  migration: {
    batchSize: 500, // Smaller batches for dev
    maxChunkSize: 1000,
    continueOnError: true, // Continue on errors for testing
    preValidation: true,
    postValidation: true,
    skipDuplicates: false,
  },

  csv: {
    delimiter: ',',
    encoding: 'utf-8',
    maxRowsPerChunk: 500,
  },

  logging: {
    level: 'debug',
    verbose: true,
  },
};

/**
 * Production Configuration
 */
const prodConfig = {
  sourceDB: {
    host: process.env.PROD_SOURCE_DB_HOST,
    user: process.env.PROD_SOURCE_DB_USER,
    password: process.env.PROD_SOURCE_DB_PASSWORD,
    database: process.env.PROD_SOURCE_DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
  },

  targetDB: {
    host: process.env.PROD_TARGET_DB_HOST,
    user: process.env.PROD_TARGET_DB_USER,
    password: process.env.PROD_TARGET_DB_PASSWORD,
    database: process.env.PROD_TARGET_DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
  },

  migration: {
    batchSize: 5000, // Larger batches for production
    maxChunkSize: 10000,
    continueOnError: false, // Stop on errors in production
    preValidation: true,
    postValidation: true,
    skipDuplicates: false,
  },

  csv: {
    delimiter: ',',
    encoding: 'utf-8',
    maxRowsPerChunk: 5000,
  },

  logging: {
    level: 'info',
    verbose: false,
  },

  backup: {
    enabled: true,
    location: './backups/',
    compress: true,
  },
};

/**
 * Testing Configuration
 */
const testConfig = {
  sourceDB: {
    host: 'localhost',
    user: 'test',
    password: 'test',
    database: 'test_source_db',
  },

  targetDB: {
    host: 'localhost',
    user: 'test',
    password: 'test',
    database: 'test_target_db',
  },

  migration: {
    batchSize: 10, // Very small for testing
    maxChunkSize: 100,
    continueOnError: false,
    preValidation: false,
    postValidation: false,
    skipDuplicates: true,
  },

  csv: {
    delimiter: ',',
    encoding: 'utf-8',
    maxRowsPerChunk: 10,
  },

  logging: {
    level: 'silent',
    verbose: false,
  },
};

/**
 * Migration Plans Configuration
 */
const migrationPlans = {
  /**
   * Basic ERP Migration
   */
  basicERP: {
    name: 'Basic ERP Migration',
    tables: [
      'users',
      'roles',
      'permissions',
      'companies',
      'departments',
      'employees',
      'products',
      'product_categories',
      'suppliers',
      'customers',
      'orders',
      'order_items',
      'invoices',
      'payments',
      'inventory',
      'transactions',
    ],
    options: {
      preValidation: true,
      postValidation: true,
      skipDuplicates: false,
      continueOnError: false,
    },
  },

  /**
   * Full ERP with Relationships
   */
  fullERP: {
    name: 'Full ERP Migration with Validation',
    tables: [
      // Master data
      'users',
      'roles',
      'permissions',
      'companies',
      'departments',
      'employees',
      'locations',
      'currencies',

      // Products
      'products',
      'product_categories',
      'product_variants',
      'product_images',

      // Suppliers
      'suppliers',
      'supplier_contacts',
      'supplier_products',

      // Customers
      'customers',
      'customer_contacts',
      'customer_addresses',

      // Orders
      'orders',
      'order_items',
      'order_status_history',

      // Invoicing
      'invoices',
      'invoice_items',
      'invoice_payments',

      // Payment
      'payments',
      'payment_methods',

      // Inventory
      'inventory',
      'warehouse',
      'stock_movements',

      // Accounting
      'chart_of_accounts',
      'journal_entries',
      'transactions',
      'reconciliations',

      // Projects
      'projects',
      'project_tasks',
      'project_resources',

      // Audit
      'audit_logs',
      'error_logs',
    ],
    options: {
      preValidation: true,
      postValidation: true,
      postCleanup: false,
      skipDuplicates: false,
      continueOnError: false,
    },
  },

  /**
   * CSV Import Plan
   */
  csvImport: {
    name: 'CSV Data Import',
    csvFiles: [
      {
        source: './data/users.csv',
        table: 'users',
        transform: {
          email: (val) => val.toLowerCase().trim(),
          phone: (val) => val.replace(/\D/g, ''),
          status: { mapping: { 'A': 'active', 'I': 'inactive' } },
        },
      },
      {
        source: './data/products.csv',
        table: 'products',
        transform: {
          price: { type: 'float' },
          stock: { type: 'integer' },
          active: { type: 'boolean' },
        },
      },
      {
        source: './data/customers.csv',
        table: 'customers',
        transform: {
          email: (val) => val.toLowerCase().trim(),
          tax_id: (val) => val.replace(/\D/g, ''),
        },
      },
    ],
  },

  /**
   * Incremental Sync Plan
   */
  incrementalSync: {
    name: 'Incremental Data Sync',
    tables: [
      'orders',
      'invoices',
      'payments',
      'inventory',
      'transactions',
    ],
    options: {
      skipDuplicates: true, // Skip records that already exist
      continueOnError: true,
      preValidation: false, // Skip for performance
      postValidation: false,
    },
  },

  /**
   * Backup Plan
   */
  backup: {
    name: 'Database Backup to CSV',
    mode: 'export',
    tables: [
      'users',
      'products',
      'customers',
      'orders',
      'invoices',
      'inventory',
    ],
    options: {
      exportPath: './backups/',
      timestamp: true,
      compress: true,
    },
  },
};

/**
 * Data Transformation Rules
 */
const transformationRules = {
  /**
   * Common transformations
   */
  common: {
    email: (val) => val.toLowerCase().trim(),
    phone: (val) => val.replace(/\D/g, ''),
    zipcode: (val) => val.replace(/\D/g, '').padStart(5, '0'),
  },

  /**
   * Custom transformations per table
   */
  users: {
    email: (val) => val.toLowerCase().trim(),
    phone: (val) => val.replace(/\D/g, ''),
    status: { mapping: { '1': 'active', '0': 'inactive' } },
    created_at: { type: 'date' },
  },

  products: {
    price: { type: 'float' },
    cost: { type: 'float' },
    stock: { type: 'integer' },
    active: { type: 'boolean' },
    sku: (val) => val.toUpperCase().trim(),
  },

  customers: {
    email: (val) => val.toLowerCase().trim(),
    phone: (val) => val.replace(/\D/g, ''),
    tax_id: (val) => val.replace(/\D/g, ''),
    status: { mapping: { 'A': 'active', 'I': 'inactive', 'S': 'suspended' } },
  },

  orders: {
    total: { type: 'float' },
    tax: { type: 'float' },
    discount: { type: 'float' },
    status: { mapping: { '1': 'pending', '2': 'confirmed', '3': 'shipped', '4': 'delivered' } },
    order_date: { type: 'date' },
  },

  invoices: {
    amount: { type: 'float' },
    tax: { type: 'float' },
    status: { mapping: { 'D': 'draft', 'P': 'pending', 'P': 'paid', 'C': 'cancelled' } },
    invoice_date: { type: 'date' },
    due_date: { type: 'date' },
  },
};

/**
 * Get configuration based on environment
 */
function getConfig(env = process.env.NODE_ENV || 'development') {
  switch (env) {
    case 'production':
      return prodConfig;
    case 'test':
      return testConfig;
    case 'development':
    default:
      return devConfig;
  }
}

/**
 * Get migration plan
 */
function getMigrationPlan(planName) {
  return migrationPlans[planName] || null;
}

/**
 * Get transformation rules
 */
function getTransformationRules(table) {
  return transformationRules[table] || transformationRules.common;
}

module.exports = {
  devConfig,
  prodConfig,
  testConfig,
  migrationPlans,
  transformationRules,
  getConfig,
  getMigrationPlan,
  getTransformationRules,
};

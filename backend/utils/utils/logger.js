/**
 * Logger Utility
 * Simple logging system with color support
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class Logger {
  constructor(namespace = 'App') {
    this.namespace = namespace;
    this.logFile = path.join(LOG_DIR, 'app.log');
  }

  /**
   * Format timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Write to file
   */
  writeToFile(level, message, meta = '') {
    try {
      const timestamp = this.getTimestamp();
      const logEntry = `[${timestamp}] [${level}] [${this.namespace}] ${message} ${meta}\n`;
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Info log
   */
  info(message, meta = '') {
    const output = `${colors.cyan}[INFO]${colors.reset} ${this.namespace}: ${message}`;
    console.log(output, meta);
    this.writeToFile('INFO', message, meta);
  }

  /**
   * Warn log
   */
  warn(message, meta = '') {
    const output = `${colors.yellow}[WARN]${colors.reset} ${this.namespace}: ${message}`;
    console.warn(output, meta);
    this.writeToFile('WARN', message, meta);
  }

  /**
   * Error log
   */
  error(message, error = '') {
    const output = `${colors.red}[ERROR]${colors.reset} ${this.namespace}: ${message}`;
    console.error(output, error);
    this.writeToFile('ERROR', message, error?.message || error);
  }

  /**
   * Debug log
   */
  debug(message, meta = '') {
    if (process.env.NODE_ENV === 'development') {
      const output = `${colors.blue}[DEBUG]${colors.reset} ${this.namespace}: ${message}`;
      console.log(output, meta);
    }
    this.writeToFile('DEBUG', message, meta);
  }

  /**
   * Success log
   */
  success(message, meta = '') {
    const output = `${colors.green}[SUCCESS]${colors.reset} ${this.namespace}: ${message}`;
    console.log(output, meta);
    this.writeToFile('SUCCESS', message, meta);
  }
}

module.exports = new Logger();

/**
 * ============================================
 * ADVANCED LOGGING SYSTEM
 * نظام تسجيل متقدم
 * ============================================
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Log Level Enum
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

/**
 * Log Entry Interface
 */
interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  stack?: string;
  duration?: number;
}

/**
 * Advanced Logger
 */
export class AdvancedLogger extends EventEmitter {
  private logs: LogEntry[] = [];
  private maxLogs: number = 10000;
  private logFile?: string;
  private levelMap: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.CRITICAL]: 'CRITICAL',
  };

  constructor(maxLogs: number = 10000, logFile?: string) {
    super();
    this.maxLogs = maxLogs;
    this.logFile = logFile;

    // Rotate logs if reaching max
    setInterval(() => this.rotateLogs(), 60000);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    stack?: string
  ) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      metadata,
      stack,
    };

    this.logs.push(entry);

    // Emit event
    this.emit('log', entry);

    // Write to file if configured
    if (this.logFile) {
      this.writeToFile(entry);
    }

    // Rotate if needed
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs / 2);
    }

    // Console output
    this.consoleOutput(entry);
  }

  /**
   * Debug logging
   */
  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  /**
   * Info logging
   */
  info(message: string, context?: string, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  /**
   * Warning logging
   */
  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  /**
   * Error logging with stack trace
   */
  error(message: string, error?: Error | string, context?: string, metadata?: Record<string, any>) {
    const stack = error instanceof Error ? error.stack : undefined;
    const msg = typeof error === 'string' ? `${message}: ${error}` : message;
    this.log(LogLevel.ERROR, msg, context, metadata, stack);
  }

  /**
   * Critical logging
   */
  critical(message: string, error?: Error, context?: string, metadata?: Record<string, any>) {
    const stack = error?.stack;
    this.log(LogLevel.CRITICAL, message, context, metadata, stack);
    this.emit('critical', { message, error, context, metadata });
  }

  /**
   * Performance logging
   */
  logPerformance(
    operationName: string,
    duration: number,
    context?: string,
    metadata?: Record<string, any>
  ) {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message: `Performance: ${operationName}`,
      context,
      metadata: { ...metadata, duration },
      duration,
    };

    this.logs.push(entry);
    this.emit('performance', entry);
    this.consoleOutput(entry);
  }

  /**
   * Console output with colors
   */
  private consoleOutput(entry: LogEntry) {
    const levelName = this.levelMap[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${levelName}]`;

    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m', // Green
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.CRITICAL]: '\x1b[35m', // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[entry.level];

    let output = `${color}${prefix}${reset} ${entry.message}`;

    if (entry.context) {
      output += ` [${entry.context}]`;
    }

    if (entry.metadata) {
      output += ` ${JSON.stringify(entry.metadata)}`;
    }

    const logFunction = entry.level >= LogLevel.ERROR ? console.error : console.log;
    logFunction(output);

    if (entry.stack) {
      console.error(entry.stack);
    }
  }

  /**
   * Write log entry to file
   */
  private writeToFile(entry: LogEntry) {
    if (!this.logFile) return;

    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const line = JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: this.levelMap[entry.level],
      message: entry.message,
      context: entry.context,
      metadata: entry.metadata,
      stack: entry.stack,
    });

    fs.appendFileSync(this.logFile, line + '\n');
  }

  /**
   * Rotate logs
   */
  private rotateLogs() {
    if (!this.logFile || !fs.existsSync(this.logFile)) return;

    const stats = fs.statSync(this.logFile);
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (stats.size > maxSize) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `${this.logFile}.${timestamp}`;
      fs.renameSync(this.logFile, backupFile);

      // Clean old backups
      const dir = path.dirname(this.logFile);
      const files = fs.readdirSync(dir);
      const backups = files.filter(f => f.startsWith(path.basename(this.logFile)));

      if (backups.length > 5) {
        const toDelete = backups.sort().slice(0, -5);
        toDelete.forEach(f => fs.unlinkSync(path.join(dir, f)));
      }
    }
  }

  /**
   * Get logs with filtering
   */
  getLogs(filter?: {
    level?: LogLevel;
    context?: string;
    since?: Date;
    limit?: number;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter?.level !== undefined) {
      filtered = filtered.filter(l => l.level >= filter.level!);
    }

    if (filter?.context) {
      filtered = filtered.filter(l => l.context === filter.context);
    }

    if (filter?.since) {
      filtered = filtered.filter(l => l.timestamp >= filter.since!);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        critical: 0,
      },
      errors: this.logs.filter(l => l.level >= LogLevel.ERROR),
      avgResponseTime: 0,
    };

    this.logs.forEach(log => {
      const levelName = this.levelMap[log.level].toLowerCase();
      stats.byLevel[levelName as keyof typeof stats.byLevel]++;
    });

    const perfLogs = this.logs.filter(l => l.duration);
    if (perfLogs.length > 0) {
      const totalDuration = perfLogs.reduce((sum, l) => sum + (l.duration || 0), 0);
      stats.avgResponseTime = totalDuration / perfLogs.length;
    }

    return stats;
  }

  /**
   * Export logs as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportCSV(): string {
    const headers = ['Timestamp', 'Level', 'Message', 'Context', 'Metadata'];
    const rows = this.logs.map(l => [
      l.timestamp.toISOString(),
      this.levelMap[l.level],
      l.message,
      l.context || '',
      l.metadata ? JSON.stringify(l.metadata) : '',
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  /**
   * Clear logs
   */
  clear() {
    this.logs = [];
  }
}

/**
 * Create global logger instance
 */
const logsDir = path.join(process.cwd(), 'logs');
export const globalLogger = new AdvancedLogger(
  10000,
  path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`)
);

export default AdvancedLogger;

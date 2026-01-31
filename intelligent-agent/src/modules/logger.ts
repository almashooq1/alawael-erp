// Advanced Logger Module
// Provides structured logging with levels, timestamps, and file output

import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: any;
  stack?: string;
}

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'application.log');

export class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    this.ensureLogDirectory();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  }

  private writeLog(entry: LogEntry) {
    const logLine = JSON.stringify(entry) + '\n';

    // Write to file
    try {
      fs.appendFileSync(LOG_FILE, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write log:', error);
    }

    // Also output to console
    const consoleMsg = `[${entry.timestamp}] ${entry.level}: ${entry.message}`;
    switch (entry.level) {
      case 'ERROR':
      case 'FATAL':
        console.error(consoleMsg, entry.context || '');
        break;
      case 'WARN':
        console.warn(consoleMsg, entry.context || '');
        break;
      default:
        console.log(consoleMsg, entry.context || '');
    }
  }

  private log(level: LogLevel, levelName: string, message: string, context?: any, errorObj?: Error) {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      context,
    };

    if (errorObj && errorObj.stack) {
      entry.stack = errorObj.stack;
    }

    this.writeLog(entry);
  }

  debug(message: string, ...args: any[]) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, args.length > 0 ? args : undefined);
  }

  info(message: string, ...args: any[]) {
    this.log(LogLevel.INFO, 'INFO', message, args.length > 0 ? args : undefined);
  }

  warn(message: string, ...args: any[]) {
    this.log(LogLevel.WARN, 'WARN', message, args.length > 0 ? args : undefined);
  }

  error(message: string, ...args: any[]) {
    const errorObj = args.find(arg => arg instanceof Error);
    const context = args.filter(arg => !(arg instanceof Error));
    this.log(LogLevel.ERROR, 'ERROR', message, context.length > 0 ? context : undefined, errorObj);
  }

  fatal(message: string, ...args: any[]) {
    const errorObj = args.find(arg => arg instanceof Error);
    const context = args.filter(arg => !(arg instanceof Error));
    this.log(LogLevel.FATAL, 'FATAL', message, context.length > 0 ? context : undefined, errorObj);
  }

  // Clear old logs (keep last N days)
  clearOldLogs(daysToKeep: number = 7) {
    try {
      const files = fs.readdirSync(LOG_DIR);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

      files.forEach(file => {
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          this.info(`Deleted old log file: ${file}`);
        }
      });
    } catch (err) {
      console.error('Error clearing old logs:', err);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();


"use strict";
// Advanced Logger Module
// Provides structured logging with levels, timestamps, and file output
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 4] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const LOG_DIR = path_1.default.join(__dirname, '../../logs');
const LOG_FILE = path_1.default.join(LOG_DIR, 'application.log');
class Logger {
    constructor() {
        this.minLevel = LogLevel.INFO;
        this.ensureLogDirectory();
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setMinLevel(level) {
        this.minLevel = level;
    }
    ensureLogDirectory() {
        if (!fs_1.default.existsSync(LOG_DIR)) {
            fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
        }
    }
    writeLog(entry) {
        const logLine = JSON.stringify(entry) + '\n';
        // Write to file
        try {
            fs_1.default.appendFileSync(LOG_FILE, logLine, 'utf-8');
        }
        catch (error) {
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
    log(level, levelName, message, context, errorObj) {
        if (level < this.minLevel)
            return;
        const entry = {
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
    debug(message, ...args) {
        this.log(LogLevel.DEBUG, 'DEBUG', message, args.length > 0 ? args : undefined);
    }
    info(message, ...args) {
        this.log(LogLevel.INFO, 'INFO', message, args.length > 0 ? args : undefined);
    }
    warn(message, ...args) {
        this.log(LogLevel.WARN, 'WARN', message, args.length > 0 ? args : undefined);
    }
    error(message, ...args) {
        const errorObj = args.find(arg => arg instanceof Error);
        const context = args.filter(arg => !(arg instanceof Error));
        this.log(LogLevel.ERROR, 'ERROR', message, context.length > 0 ? context : undefined, errorObj);
    }
    fatal(message, ...args) {
        const errorObj = args.find(arg => arg instanceof Error);
        const context = args.filter(arg => !(arg instanceof Error));
        this.log(LogLevel.FATAL, 'FATAL', message, context.length > 0 ? context : undefined, errorObj);
    }
    // Clear old logs (keep last N days)
    clearOldLogs(daysToKeep = 7) {
        try {
            const files = fs_1.default.readdirSync(LOG_DIR);
            const now = Date.now();
            const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
            files.forEach(file => {
                const filePath = path_1.default.join(LOG_DIR, file);
                const stats = fs_1.default.statSync(filePath);
                if (now - stats.mtimeMs > maxAge) {
                    fs_1.default.unlinkSync(filePath);
                    this.info(`Deleted old log file: ${file}`);
                }
            });
        }
        catch (err) {
            console.error('Error clearing old logs:', err);
        }
    }
}
exports.Logger = Logger;
// Export singleton instance
exports.logger = Logger.getInstance();

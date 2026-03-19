/**
 * Professional Gateway Logger — نظام سجلات البوابة
 * Structured JSON logging with correlation IDs.
 */

const winston = require('winston');
const path = require('path');

const logDir = path.join(__dirname, 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'api-gateway', version: '3.0.0' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'gateway-error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'gateway.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...rest }) => {
          const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
          return `[${timestamp}] [${service}] ${level}: ${message}${extra}`;
        }),
      ),
    }),
  );
}

module.exports = logger;

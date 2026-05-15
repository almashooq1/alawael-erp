'use strict';

const winston = require('winston');

module.exports = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
      const meta = info.metadata ? ` ${JSON.stringify(info.metadata)}` : '';
      return `${info.timestamp} [${info.level}] ${info.message}${meta}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

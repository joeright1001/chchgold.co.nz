const winston = require('winston');

const consoleFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  let metaStr = '';
  if (Object.keys(meta).length) {
    try {
      metaStr = ` ${JSON.stringify(meta)}`;
    } catch (error) {
      // handle circular references
      metaStr = ' [unable to serialize metadata]';
    }
  }
  return `${timestamp} ${level}: ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat()
  ),
  defaultMeta: { service: 'quote-server' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
      )
    })
  ]
});

module.exports = logger;

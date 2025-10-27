const { Pool } = require('pg');
require('dotenv').config();
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  logger.info('Database connected successfully');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', { error: err });
  process.exit(-1);
});

module.exports = pool;

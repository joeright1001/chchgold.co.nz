require('dotenv').config();
const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function expireOldQuotes() {
  const client = await pool.connect();
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const result = await client.query(
      "UPDATE quotes SET status = 'expired' WHERE created_at < $1 AND status = 'active'",
      [fourteenDaysAgo]
    );

    logger.info(`Expired ${result.rowCount} old quotes.`);
  } catch (err) {
    logger.error('Error expiring old quotes:', err);
  } finally {
    client.release();
    pool.end();
  }
}

expireOldQuotes();

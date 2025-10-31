/**
 * @file database.js
 * @description Database utility functions to reduce boilerplate code and ensure
 * consistent transaction handling and connection management.
 */

const pool = require('../config/database');
const logger = require('./logger');

/**
 * Executes a callback function within a database transaction.
 * Automatically handles BEGIN, COMMIT, ROLLBACK, and connection release.
 * 
 * @param {Function} callback - Async function that receives a database client
 * @returns {Promise<*>} The result returned by the callback function
 * @throws {Error} Re-throws any error after rolling back the transaction
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back due to error', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Executes a callback function with a database client.
 * Automatically handles connection acquisition and release.
 * Use this for operations that don't require transactions.
 * 
 * @param {Function} callback - Async function that receives a database client
 * @returns {Promise<*>} The result returned by the callback function
 * @throws {Error} Re-throws any error from the callback
 */
async function withClient(callback) {
  const client = await pool.connect();
  try {
    return await callback(client);
  } catch (error) {
    logger.error('Database operation error', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  withTransaction,
  withClient
};

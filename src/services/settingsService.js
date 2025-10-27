const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * Gets a setting value by key
 * @param {string} key - The setting key
 * @returns {Promise<string|null>} The setting value or null if not found
 */
async function getSetting(key) {
  const client = await pool.connect();
  try {
    const query = 'SELECT value FROM settings WHERE key = $1';
    const result = await client.query(query, [key]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0].value;
  } catch (error) {
    logger.error(`Error fetching setting ${key}`, { error });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Updates a setting value
 * @param {string} key - The setting key
 * @param {string} value - The new value
 * @returns {Promise<void>}
 */
async function updateSetting(key, value) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO settings (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = $2, updated_at = NOW()
    `;
    await client.query(query, [key, value]);
    logger.info(`Setting ${key} updated to ${value}`);
  } catch (error) {
    logger.error(`Error updating setting ${key}`, { error });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Gets the spot normalisation offset percentage
 * @returns {Promise<number>} The offset as a decimal (e.g., 0.25 for 0.25%)
 */
async function getSpotNormalisationOffset() {
  try {
    const value = await getSetting('spot_normalisation_offset');
    return value ? parseFloat(value) : 0;
  } catch (error) {
    logger.error('Error fetching spot normalisation offset, using default 0', { error });
    return 0;
  }
}

/**
 * Gets all settings
 * @returns {Promise<Object>} Object with all settings
 */
async function getAllSettings() {
  const client = await pool.connect();
  try {
    const query = 'SELECT key, value, updated_at FROM settings';
    const result = await client.query(query);
    
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        updated_at: row.updated_at
      };
    });
    
    return settings;
  } catch (error) {
    logger.error('Error fetching all settings', { error });
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getSetting,
  updateSetting,
  getSpotNormalisationOffset,
  getAllSettings
};

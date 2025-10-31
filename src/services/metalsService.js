const axios = require('axios');
const logger = require('../utils/logger');
const { getSpotNormalisationOffset } = require('./settingsService');

const TROY_OUNCE_IN_GRAMS = parseFloat(process.env.TROY_OUNCE_IN_GRAMS) || 31.1035;

/**
 * Applies the spot normalisation offset to a price
 * @param {number} price - The original price
 * @param {number} offsetPercent - The offset percentage (e.g., 0.25 for 0.25%)
 * @returns {number} The normalized price
 */
function applyNormalisationOffset(price, offsetPercent) {
  return price * (1 - offsetPercent / 100);
}

/**
 * Calculates ounce prices from gram prices using the troy ounce conversion.
 * This utility function ensures consistent price calculation across the application.
 * @param {object} gramPrices - Object containing gold_gram_nzd and silver_gram_nzd
 * @returns {object} Complete price object with both gram and ounce prices
 */
function calculateAllPrices(gramPrices) {
  return {
    gold_gram_nzd: gramPrices.gold_gram_nzd,
    silver_gram_nzd: gramPrices.silver_gram_nzd,
    gold_ounce_nzd: gramPrices.gold_gram_nzd * TROY_OUNCE_IN_GRAMS,
    silver_ounce_nzd: gramPrices.silver_gram_nzd * TROY_OUNCE_IN_GRAMS
  };
}

/**
 * Fetches the current spot prices for gold and silver in NZD, both per gram and per ounce.
 * Applies the spot normalisation offset from settings.
 * @returns {Promise<{
 *   gold_gram_nzd: number,
 *   silver_gram_nzd: number,
 *   gold_ounce_nzd: number,
 *   silver_ounce_nzd: number
 * }>} The spot prices with offset applied.
 */
async function getSpotPrices() {
  try {
    logger.info('Fetching live spot prices from metals.dev...');
    const response = await axios.get('https://api.metals.dev/v1/latest', {
      params: {
        api_key: process.env.SPOT_PRICE_API_KEY,
        currency: 'NZD',
        unit: 'g'
      }
    });

    const rates = response.data.metals;
    
    // Get the normalisation offset
    const offset = await getSpotNormalisationOffset();
    logger.info(`Applying spot normalisation offset: ${offset}%`);
    
    // Apply offset to prices
    const prices = {
      gold_gram_nzd: applyNormalisationOffset(rates.gold, offset),
      silver_gram_nzd: applyNormalisationOffset(rates.silver, offset),
    };

    logger.info('Successfully fetched and normalized gram spot prices', prices);
    return prices;

  } catch (error) {
    logger.error('Error fetching live spot prices', { 
      error: error.response ? error.response.data : error.message 
    });
    // Critical: Do not return fallback data. Let the error propagate.
    throw new Error('Failed to fetch live spot prices.');
  }
}

module.exports = {
  getSpotPrices,
  calculateAllPrices
};

const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Fetches the current spot prices for gold and silver.
 * NOTE: This is a placeholder. Replace with the actual API endpoint and logic.
 * @returns {Promise<{gold: number, silver: number}>} The spot prices for gold and silver.
 */
async function getSpotPrices() {
  try {
    // In a real application, you would make an API call here.
    // For example:
    // const response = await axios.get('https://api.metals.live/v1/spot', {
    //   headers: { 'Authorization': `Bearer ${process.env.SPOT_PRICE_API_KEY}` }
    // });
    // const prices = response.data;
    // return { gold: prices.gold, silver: prices.silver };

    // For now, we'll return mock data.
    logger.info('Fetching mock spot prices...');
    return {
      gold: 3500.50, // Mock price per ounce
      silver: 45.75    // Mock price per ounce
    };
  } catch (error) {
    logger.error('Error fetching spot prices', { error: error.message });
    // Fallback to default values if the API fails
    return {
      gold: 3500.00,
      silver: 45.00
    };
  }
}

module.exports = {
  getSpotPrices,
};

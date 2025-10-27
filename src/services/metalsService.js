const axios = require('axios');
const logger = require('../utils/logger');

const TROY_OUNCE_IN_GRAMS = 31.1035;

/**
 * Fetches the current spot prices for gold and silver in NZD, both per gram and per ounce.
 * @returns {Promise<{
 *   gold_gram_nzd: number,
 *   silver_gram_nzd: number,
 *   gold_ounce_nzd: number,
 *   silver_ounce_nzd: number
 * }>} The spot prices.
 */
async function getSpotPrices() {
  try {
    logger.info('Fetching live spot prices from metals.dev...');
    const response = await axios.get('https://api.metals.dev/v1/latest', {
      params: {
        api_key: process.env.SPOT_PRICE_API_KEY,
        currency: 'NZD',
        unit: 'gram'
      }
    });

    const rates = response.data.rates;
    const goldGramNzd = 1 / rates.XAU; // Price of 1 gram of Gold in NZD
    const silverGramNzd = 1 / rates.XAG; // Price of 1 gram of Silver in NZD

    const goldOunceNzd = goldGramNzd * TROY_OUNCE_IN_GRAMS;
    const silverOunceNzd = silverGramNzd * TROY_OUNCE_IN_GRAMS;

    const prices = {
      gold_gram_nzd: goldGramNzd,
      silver_gram_nzd: silverGramNzd,
      gold_ounce_nzd: goldOunceNzd,
      silver_ounce_nzd: silverOunceNzd,
    };

    logger.info('Successfully fetched and calculated spot prices', prices);
    return prices;

  } catch (error) {
    logger.error('Error fetching live spot prices', { 
      error: error.response ? error.response.data : error.message 
    });
    // Fallback to default mock values if the API fails
    return {
      gold_gram_nzd: 115.00,
      silver_gram_nzd: 1.50,
      gold_ounce_nzd: 3577.00,
      silver_ounce_nzd: 46.65
    };
  }
}

module.exports = {
  getSpotPrices,
};

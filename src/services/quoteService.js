const pool = require('../config/database');
const logger = require('../utils/logger');

// Generate a short, URL-friendly ID (8 characters: alphanumeric)
function generateShortId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let shortId = '';
    for (let i = 0; i < 8; i++) {
        shortId += chars[Math.floor(Math.random() * chars.length)];
    }
    return shortId;
}

// Ensure short_id is unique by checking database
async function ensureUniqueShortId() {
    let shortId;
    let isUnique = false;
    
    while (!isUnique) {
        shortId = generateShortId();
        const result = await pool.query('SELECT id FROM quotes WHERE short_id = $1', [shortId]);
        if (result.rows.length === 0) {
            isUnique = true;
        }
    }
    
    return shortId;
}

/**
 * Generates the next sequential quote number (e.g., SBQ-000284).
 * This function uses a transaction to ensure the sequence is updated atomically.
 * @returns {Promise<string>} The next quote number.
 */
async function getNextQuoteNumber() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "UPDATE sequences SET value = value + 1 WHERE name = 'quote_number' RETURNING value"
    );
    if (result.rows.length === 0) {
      throw new Error('Quote number sequence not found.');
    }
    const nextValue = result.rows[0].value;
    await client.query('COMMIT');
    // Format the number with leading zeros
    return `SBQ-${String(nextValue).padStart(6, '0')}`;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error generating quote number', { error });
    throw error;
  } finally {
    client.release();
  }
}

const { getSpotPrices } = require('./metalsService');
const TROY_OUNCE_IN_GRAMS = 31.1035;

/**
 * Creates a new quote and its associated items in the database.
 * @param {object} customerDetails - The customer's information.
 * @param {Array<object>} items - An array of items for the quote.
 * @returns {Promise<object>} The newly created quote.
 */
async function createQuote(customerDetails, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Generate unique short ID
    const shortId = await ensureUniqueShortId();

    // 2. Get the next quote number
    const quoteNumberResult = await client.query(
      "UPDATE sequences SET value = value + 1 WHERE name = 'quote_number' RETURNING value"
    );
    if (quoteNumberResult.rows.length === 0) {
      throw new Error('Quote number sequence not found.');
    }
    const nextValue = quoteNumberResult.rows[0].value;
    const quoteNumber = `SBQ-${String(nextValue).padStart(6, '0')}`;

    // 3. Get current spot prices (per gram)
    const gramPrices = await getSpotPrices();

    // 4. Calculate ounce prices
    const spotPrices = {
      gold_gram_nzd: gramPrices.gold_gram_nzd,
      silver_gram_nzd: gramPrices.silver_gram_nzd,
      gold_ounce_nzd: gramPrices.gold_gram_nzd * TROY_OUNCE_IN_GRAMS,
      silver_ounce_nzd: gramPrices.silver_gram_nzd * TROY_OUNCE_IN_GRAMS,
    };

    // 5. TODO: Calculate totals based on items and spot prices
    const totals = { grandTotal: 0 }; // Placeholder for calculation logic

    // 6. Insert the main quote record
    const quoteInsertQuery = `
      INSERT INTO quotes (
        short_id, quote_number, customer_first_name, customer_surname, customer_mobile, customer_email, zoho_id, 
        spot_price_gold_gram_nzd, spot_price_silver_gram_nzd, spot_price_gold_ounce_nzd, spot_price_silver_ounce_nzd, 
        totals
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const quoteValues = [
      shortId,
      quoteNumber,
      customerDetails.firstName,
      customerDetails.surname,
      customerDetails.mobile,
      customerDetails.email,
      customerDetails.zohoId,
      spotPrices.gold_gram_nzd,
      spotPrices.silver_gram_nzd,
      spotPrices.gold_ounce_nzd,
      spotPrices.silver_ounce_nzd,
      JSON.stringify(totals),
    ];
    const quoteResult = await client.query(quoteInsertQuery, quoteValues);
    const newQuote = quoteResult.rows[0];

    // 7. Insert each quote item
    if (items && items.length > 0) {
      const itemInsertQuery = `
        INSERT INTO quote_items (quote_id, item_name, metal_type, percent, weight, weight_type, quantity)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `;
      for (const item of items) {
        const itemValues = [newQuote.id, item.name, item.metalType, item.percent, item.weight, item.weightType, item.quantity || 1];
        await client.query(itemInsertQuery, itemValues);
      }
    }

    await client.query('COMMIT');
    return newQuote;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating quote', { error });
    throw error;
  } finally {
    client.release();
  }
}


/**
 * Retrieves a single quote and its items by the quote's UUID.
 * @param {string} id - The UUID of the quote.
 * @returns {Promise<{quote: object, items: Array<object>}>} The quote and its items.
 */
async function getQuoteById(id) {
  const client = await pool.connect();
  try {
    const quoteQuery = 'SELECT * FROM quotes WHERE id = $1';
    const itemsQuery = 'SELECT * FROM quote_items WHERE quote_id = $1';

    const quoteResult = await client.query(quoteQuery, [id]);
    const itemsResult = await client.query(itemsQuery, [id]);

    if (quoteResult.rows.length === 0) {
      return null; // Or throw an error
    }

    return {
      quote: quoteResult.rows[0],
      items: itemsResult.rows,
    };
  } catch (error) {
    logger.error(`Error fetching quote by id ${id}`, { error });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retrieves a single quote and its items by the quote's short_id.
 * @param {string} shortId - The short_id of the quote (8 characters).
 * @returns {Promise<{quote: object, items: Array<object>}>} The quote and its items.
 */
async function getQuoteByShortId(shortId) {
  const client = await pool.connect();
  try {
    const quoteQuery = 'SELECT * FROM quotes WHERE short_id = $1';
    const quoteResult = await client.query(quoteQuery, [shortId]);

    if (quoteResult.rows.length === 0) {
      return null;
    }

    const quote = quoteResult.rows[0];
    const itemsQuery = 'SELECT * FROM quote_items WHERE quote_id = $1';
    const itemsResult = await client.query(itemsQuery, [quote.id]);

    return {
      quote: quote,
      items: itemsResult.rows,
    };
  } catch (error) {
    logger.error(`Error fetching quote by short_id ${shortId}`, { error });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Updates the spot prices for an existing quote.
 * @param {string} id - The UUID of the quote to update.
 * @returns {Promise<object>} The updated quote with new prices.
 */
async function updateQuotePrices(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const gramPrices = await getSpotPrices();
    const spotPrices = {
      gold_gram_nzd: gramPrices.gold_gram_nzd,
      silver_gram_nzd: gramPrices.silver_gram_nzd,
      gold_ounce_nzd: gramPrices.gold_gram_nzd * TROY_OUNCE_IN_GRAMS,
      silver_ounce_nzd: gramPrices.silver_gram_nzd * TROY_OUNCE_IN_GRAMS,
    };

    const updateQuery = `
      UPDATE quotes
      SET 
        spot_price_gold_gram_nzd = $1,
        spot_price_silver_gram_nzd = $2,
        spot_price_gold_ounce_nzd = $3,
        spot_price_silver_ounce_nzd = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *;
    `;
    const values = [
      spotPrices.gold_gram_nzd,
      spotPrices.silver_gram_nzd,
      spotPrices.gold_ounce_nzd,
      spotPrices.silver_ounce_nzd,
      id,
    ];

    const result = await client.query(updateQuery, values);
    await client.query('COMMIT');

    if (result.rows.length === 0) {
      throw new Error('Quote not found for price update.');
    }

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Error updating prices for quote ${id}`, { error });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Updates only the items of a quote, without refreshing spot prices.
 * Used for auto-saving.
 * @param {string} id - The UUID of the quote.
 * @param {Array<object>} items - The array of items to update.
 * @returns {Promise<void>}
 */
async function updateQuoteItems(id, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing items and re-insert the new state.
    await client.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);

    if (items && items.length > 0) {
      const itemInsertQuery = `
        INSERT INTO quote_items (quote_id, item_name, metal_type, percent, weight, weight_type, quantity)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `;
      for (const item of items) {
        if (item.name && item.name.trim() !== '') {
          const itemValues = [id, item.name, item.metalType, item.percent || null, item.weight || null, item.weightType || null, item.quantity || 1];
          await client.query(itemInsertQuery, itemValues);
        }
      }
    }
    
    // Touch the updated_at timestamp on the parent quote
    await client.query('UPDATE quotes SET updated_at = NOW() WHERE id = $1', [id]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Error auto-saving items for quote ${id}`, { error });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Validates if a given credential (mobile or email) matches the quote.
 * @param {string} id - The UUID of the quote.
 * @param {string} credential - The customer's mobile number or email.
 * @returns {Promise<boolean>} True if the credential is valid, false otherwise.
 */
async function validateCustomerCredential(id, credential) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 1 FROM quotes 
      WHERE id = $1 AND (customer_mobile = $2 OR customer_email = $2)
    `;
    const result = await client.query(query, [id, credential]);
    return result.rows.length > 0;
  } catch (error) {
    logger.error(`Error validating customer credential for quote ${id}`, { error });
    throw error; // Re-throw the error to be handled by the caller
  } finally {
    client.release();
  }
}

/**
 * Updates the customer details and items for a given quote.
 * @param {string} id - The UUID of the quote.
 * @param {object} customerDetails - The customer's information.
 * @param {Array<object>} items - An array of items for the quote.
 * @returns {Promise<void>}
 */
async function updateQuoteDetails(id, customerDetails, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update customer details
    const quoteUpdateQuery = `
      UPDATE quotes 
      SET 
        customer_first_name = $1, 
        customer_surname = $2, 
        customer_mobile = $3, 
        customer_email = $4, 
        zoho_id = $5,
        updated_at = NOW()
      WHERE id = $6;
    `;
    const quoteValues = [
      customerDetails.firstName,
      customerDetails.surname,
      customerDetails.mobile,
      customerDetails.email,
      customerDetails.zohoId,
      id,
    ];
    await client.query(quoteUpdateQuery, quoteValues);

    // Update items
    await client.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);
    if (items && items.length > 0) {
      const itemInsertQuery = `
        INSERT INTO quote_items (quote_id, item_name, metal_type, percent, weight, weight_type, quantity)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `;
      for (const item of items) {
        if (item.name && item.name.trim() !== '') {
          const itemValues = [id, item.name, item.metalType, item.percent || null, item.weight || null, item.weightType || null, item.quantity || 1];
          await client.query(itemInsertQuery, itemValues);
        }
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Error updating quote details for quote ${id}`, { error });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Updates the settings for a given quote.
 * @param {string} id - The UUID of the quote.
 * @param {object} settings - The settings to update.
 * @returns {Promise<void>}
 */
async function updateQuoteSettings(id, settings) {
  const client = await pool.connect();
  try {
    const { showQuotedRate } = settings;
    const query = `
      UPDATE quotes 
      SET 
        show_quoted_rate = $1,
        updated_at = NOW()
      WHERE id = $2;
    `;
    await client.query(query, [showQuotedRate, id]);
  } catch (error) {
    logger.error(`Error updating quote settings for quote ${id}`, { error });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Updates the status of a given quote.
 * @param {string} id - The UUID of the quote.
 * @param {string} status - The new status (e.g., 'active', 'expired').
 * @returns {Promise<void>}
 */
async function updateQuoteStatus(id, status) {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE quotes 
      SET 
        status = $1,
        updated_at = NOW()
      WHERE id = $2;
    `;
    await client.query(query, [status, id]);
  } catch (error) {
    logger.error(`Error updating quote status for quote ${id}`, { error });
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getNextQuoteNumber,
  createQuote,
  getQuoteById,
  getQuoteByShortId,
  updateQuotePrices,
  updateQuoteItems,
  validateCustomerCredential,
  updateQuoteDetails,
  updateQuoteSettings,
  updateQuoteStatus,
  ensureUniqueShortId, // Export for migration script
};

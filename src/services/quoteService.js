const pool = require('../config/database');

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
    console.error('Error generating quote number:', error);
    throw error;
  } finally {
    client.release();
  }
}

const { getSpotPrices } = require('./metalsService');

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

    // 1. Get the next quote number
    const quoteNumberResult = await client.query(
      "UPDATE sequences SET value = value + 1 WHERE name = 'quote_number' RETURNING value"
    );
    if (quoteNumberResult.rows.length === 0) {
      throw new Error('Quote number sequence not found.');
    }
    const nextValue = quoteNumberResult.rows[0].value;
    const quoteNumber = `SBQ-${String(nextValue).padStart(6, '0')}`;

    // 2. Get current spot prices
    const spotPrices = await getSpotPrices();

    // 3. TODO: Calculate totals based on items and spot prices
    const totals = { grandTotal: 0 }; // Placeholder for calculation logic

    // 4. Insert the main quote record
    const quoteInsertQuery = `
      INSERT INTO quotes (quote_number, customer_first_name, customer_surname, customer_mobile, customer_email, zoho_id, spot_price_gold, spot_price_silver, totals)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const quoteValues = [
      quoteNumber,
      customerDetails.firstName,
      customerDetails.surname,
      customerDetails.mobile,
      customerDetails.email,
      customerDetails.zohoId,
      spotPrices.gold,
      spotPrices.silver,
      JSON.stringify(totals),
    ];
    const quoteResult = await client.query(quoteInsertQuery, quoteValues);
    const newQuote = quoteResult.rows[0];

    // 5. Insert each quote item
    if (items && items.length > 0) {
      const itemInsertQuery = `
        INSERT INTO quote_items (quote_id, item_name, metal_type, percent, weight)
        VALUES ($1, $2, $3, $4, $5);
      `;
      for (const item of items) {
        const itemValues = [newQuote.id, item.name, item.metalType, item.percent, item.weight];
        await client.query(itemInsertQuery, itemValues);
      }
    }

    await client.query('COMMIT');
    return newQuote;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating quote:', error);
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
    console.error(`Error fetching quote by id ${id}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getNextQuoteNumber,
  createQuote,
  getQuoteById,
};

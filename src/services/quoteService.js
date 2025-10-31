/**
 * @file quoteService.js
 * @description This service handles all database operations related to quotes.
 * It provides functions for creating, retrieving, updating, and managing quotes,
 * their associated items, and settings. It ensures data integrity through transactions
 * and provides clear separation of concerns for quote-related business logic.
 */

const pool = require('../config/database');
const logger = require('../utils/logger');
const { getSpotPrices, calculateAllPrices } = require('./metalsService');

// --- PRIVATE HELPER FUNCTIONS ---

/**
 * Generates a short, URL-friendly, and random alphanumeric ID.
 * @returns {string} A random 8-character string.
 */
function generateShortId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let shortId = '';
    for (let i = 0; i < 8; i++) {
        shortId += chars[Math.floor(Math.random() * chars.length)];
    }
    return shortId;
}

/**
 * Ensures the generated short_id is unique by checking the database.
 * This function will loop until a unique ID is found.
 * @returns {Promise<string>} A unique 8-character short_id.
 */
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
 * A reusable helper function to insert quote items for a given quote.
 * This function first deletes all existing items to ensure a clean slate.
 * @param {object} client - The database client to use for the transaction.
 * @param {string} quoteId - The UUID of the quote.
 * @param {Array<object>} items - An array of items to insert.
 */
async function _insertQuoteItems(client, quoteId, items) {
    // Clear existing items for the quote to ensure a fresh insert.
    await client.query('DELETE FROM quote_items WHERE quote_id = $1', [quoteId]);

    if (items && items.length > 0) {
        const itemInsertQuery = `
            INSERT INTO quote_items (quote_id, item_name, metal_type, percent, weight, weight_type, quantity)
            VALUES ($1, $2, $3, $4, $5, $6, $7);
        `;
        for (const item of items) {
            // Ensure that only items with a name are inserted.
            if (item.name && item.name.trim() !== '') {
                const itemValues = [
                    quoteId,
                    item.name,
                    item.metalType,
                    item.percent || null,
                    item.weight || null,
                    item.weightType || null,
                    item.quantity || 1
                ];
                await client.query(itemInsertQuery, itemValues);
            }
        }
    }
}


// --- PUBLIC SERVICE FUNCTIONS ---

/**
 * Generates the next sequential quote number (e.g., SBQ-000284).
 * This function uses a transaction to ensure the sequence is updated atomically.
 * @returns {Promise<string>} The next quote number.
 */
async function getNextQuoteNumber() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Initialize the sequence if it does not exist.
        await client.query("CREATE TABLE IF NOT EXISTS sequences (name TEXT PRIMARY KEY, value INTEGER NOT NULL)");
        await client.query("INSERT INTO sequences (name, value) VALUES ('quote_number', 253) ON CONFLICT (name) DO NOTHING");

        const result = await client.query(
            "UPDATE sequences SET value = value + 1 WHERE name = 'quote_number' RETURNING value"
        );
        
        if (result.rows.length === 0) {
            throw new Error('Quote number sequence not found and could not be created.');
        }
        
        const nextValue = result.rows[0].value;
        await client.query('COMMIT');
        
        // Format the number with leading zeros for consistency.
        return `SBQ-${String(nextValue).padStart(6, '0')}`;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error generating quote number', { error });
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Creates a new quote and its associated items in the database.
 * @param {object} customerDetails - The customer's information.
 * @param {Array<object>} items - An array of items for the quote.
 * @param {object} spotPrices - The spot prices for gold and silver.
 * @returns {Promise<object>} The newly created quote.
 */
async function createQuote(customerDetails, items, spotPrices) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Generate a unique short ID and the next quote number.
        const shortId = await ensureUniqueShortId();
        const quoteNumber = await getNextQuoteNumber();

        // 2. Calculate ounce prices from the provided gram prices using utility function.
        const prices = calculateAllPrices(spotPrices);

        // 3. TODO: Calculate totals based on items and spot prices.
        const totals = { grandTotal: 0 }; // Placeholder for calculation logic.

        // 4. Insert the main quote record into the database.
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
            prices.gold_gram_nzd,
            prices.silver_gram_nzd,
            prices.gold_ounce_nzd,
            prices.silver_ounce_nzd,
            JSON.stringify(totals),
        ];
        const quoteResult = await client.query(quoteInsertQuery, quoteValues);
        const newQuote = quoteResult.rows[0];

        // 5. Insert the associated quote items using the reusable helper function.
        await _insertQuoteItems(client, newQuote.id, items);

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
            return null;
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

        // 1. Fetch the latest spot prices and calculate ounce prices using utility function.
        const gramPrices = await getSpotPrices();
        const spotPrices = calculateAllPrices(gramPrices);

        // 2. Update the quote with the new prices.
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
 * This is primarily used for auto-saving functionality.
 * @param {string} id - The UUID of the quote.
 * @param {Array<object>} items - The array of items to update.
 */
async function updateQuoteItems(id, items) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update the items using the reusable helper function.
        await _insertQuoteItems(client, id, items);
        
        // 2. Touch the updated_at timestamp on the parent quote to reflect the change.
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
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Updates the customer details and items for a given quote.
 * @param {string} id - The UUID of the quote.
 * @param {object} customerDetails - The customer's information.
 * @param {Array<object>} items - An array of items for the quote.
 */
async function updateQuoteDetails(id, customerDetails, items) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update the customer details on the main quote record.
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

        // 2. Update the items using the reusable helper function.
        await _insertQuoteItems(client, id, items);

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
    ensureUniqueShortId, // Export for potential migration scripts
};

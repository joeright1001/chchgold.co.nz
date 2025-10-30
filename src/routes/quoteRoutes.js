/**
 * QUOTE ROUTES - Customer Access & API Endpoints
 * 
 * This file handles customer-facing quote access and admin API endpoints:
 * 
 * KEY FUNCTIONS:
 * 1. Customer Login - Authenticate customers to view their quotes
 * 2. Customer Quote View - Display quotes to authenticated customers
 * 3. Live Price API - Provide current metal prices (used by admin_create_edit.js)
 * 4. Refresh Price API - Update quote with latest prices (used by admin_create_edit.js)
 * 
 * WORKFLOW:
 * CUSTOMER ACCESS:
 * - Customer visits /quote/:shortId → Not authenticated → Redirects to /quote/:shortId/login
 * - Customer enters mobile/email → POST /quote/:shortId/login → Validates credential
 * - If valid → Stores shortId in session → Redirects to /quote/:shortId → Shows quote
 * 
 * ADMIN API ENDPOINTS:
 * - Admin page loads → Calls GET /quote/get-live-prices → Returns current metal prices
 * - Admin clicks "Update Live Price" → POST /quote/edit/:id/refresh-price → Updates quote prices
 * 
 * NOTE: Customer routes use short_id (e.g., "ABC123") instead of UUID for cleaner URLs
 * NOTE: Admin API endpoints require staffAuth middleware
 */

const express = require('express');
const router = express.Router();
const quoteService = require('../services/quoteService');
const { getSpotPrices } = require('../services/metalsService');
const logger = require('../utils/logger');
const { staffAuth } = require('../middleware/auth');

const TROY_OUNCE_IN_GRAMS = 31.1035;

// STAFF ROUTE: Fetches current live spot prices (for the create page).
router.get('/get-live-prices', staffAuth, async (req, res) => {
  try {
    const gramPrices = await getSpotPrices();
    const spotPrices = {
      gold_gram_nzd: gramPrices.gold_gram_nzd,
      silver_gram_nzd: gramPrices.silver_gram_nzd,
      gold_ounce_nzd: gramPrices.gold_gram_nzd * TROY_OUNCE_IN_GRAMS,
      silver_ounce_nzd: gramPrices.silver_gram_nzd * TROY_OUNCE_IN_GRAMS,
    };
    res.json(spotPrices);
  } catch (error) {
    logger.error('Error fetching live prices', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch live prices' });
  }
});

// STAFF ROUTE: Handles the "Refresh Live Price" button click (used by admin_create_edit page).
router.post('/edit/:id/refresh-price', staffAuth, async (req, res) => {
  try {
    const updatedQuote = await quoteService.updateQuotePrices(req.params.id);
    res.json(updatedQuote); // Send back the new prices as JSON
  } catch (error) {
    logger.error(`Error refreshing price for quote ${req.params.id}`, { error: error.message });
    res.status(500).json({ error: 'Failed to refresh prices' });
  }
});

// CUSTOMER ROUTE: Renders the login page for a specific quote (using short_id).
router.get('/:shortId/login', (req, res) => {
  res.render('customer_login', { quoteId: req.params.shortId, error: null });
});

// CUSTOMER ROUTE: Handles the login attempt (using short_id).
router.post('/:shortId/login', async (req, res) => {
  try {
    const { shortId } = req.params;
    const { credential } = req.body;

    // Check for admin password first
    const isAdmin = credential === process.env.ADMIN_PASSWORD;

    // Get quote by short_id to get the UUID
    const quoteData = await quoteService.getQuoteByShortId(shortId);
    if (!quoteData) {
      return res.render('customer_login', {
        quoteId: shortId,
        error: 'Quote not found.',
      });
    }

    // Validate customer credential OR check if it's an admin
    const isValidCustomer = await quoteService.validateCustomerCredential(quoteData.quote.id, credential);

    if (isValidCustomer || isAdmin) {
      req.session.authenticatedQuoteId = shortId; // Store short_id in session
      // Save session before redirect to ensure it's persisted
      req.session.save((err) => {
        if (err) {
          logger.error(`Error saving session for quote ${shortId}`, { error: err.message });
          return res.status(500).send('Session error during login.');
        }
        res.redirect(`/quote/${shortId}`);
      });
    } else {
      res.render('customer_login', {
        quoteId: shortId,
        error: 'Invalid mobile number, email, or password. Please try again.',
      });
    }
  } catch (error) {
    logger.error(`Error during customer login for quote ${req.params.shortId}`, { error: error.message });
    res.status(500).send('Server error during login.');
  }
});

// CUSTOMER ROUTE: The customer-facing view of the quote (using short_id).
// This dynamic route is last, so it won't incorrectly match '/create' or '/edit'.
router.get('/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;
    // Check if the user is authenticated for this specific quote
    if (req.session.authenticatedQuoteId !== shortId) {
      return res.redirect(`/quote/${shortId}/login`);
    }

    const quoteData = await quoteService.getQuoteByShortId(shortId);
    if (!quoteData) {
      return res.status(404).send('Quote not found');
    }
    res.render('customer_view_quote', {
      quote: quoteData.quote,
      items: quoteData.items,
    });
  } catch (error) {
    logger.error(`Error fetching quote for customer view (short_id: ${req.params.shortId})`, { error: error.message });
    res.status(500).send('Server error');
  }
});

module.exports = router;

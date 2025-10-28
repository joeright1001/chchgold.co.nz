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

// STAFF ROUTE: Renders the new quote creation page.
// This specific path '/create' is defined BEFORE the dynamic '/:id' path.
router.get('/create', staffAuth, (req, res) => {
  res.render('create_quote');
});

// STAFF ROUTE: Handles the form submission for a new quote.
router.post('/create', staffAuth, async (req, res) => {
  try {
    const { customerDetails, items } = req.body;
    if (!customerDetails) {
      return res.status(400).json({ error: 'Missing customer details.' });
    }
    const filledItems = (items || []).filter(item => item && item.name && item.name.trim() !== '');
    const newQuote = await quoteService.createQuote(customerDetails, filledItems);
    res.redirect(`/admin/${newQuote.id}?new=true`);
  } catch (error) {
    logger.error('Error in POST /quote/create', { error: error.message });
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// STAFF ROUTE: Handles the form submission for updating a quote's items.
router.post('/edit/:id', staffAuth, async (req, res) => {
  try {
    const { items } = req.body;
    await quoteService.updateQuoteItems(req.params.id, items);
    res.redirect(`/quote/edit/${req.params.id}`);
  } catch (error) {
    logger.error(`Error updating items for quote ${req.params.id}`, { error: error.message });
    res.status(500).json({ error: 'Failed to update items' });
  }
});

// STAFF ROUTE: Handles the "Refresh Live Price" button click.
router.post('/edit/:id/refresh-price', staffAuth, async (req, res) => {
  try {
    const updatedQuote = await quoteService.updateQuotePrices(req.params.id);
    res.json(updatedQuote); // Send back the new prices as JSON
  } catch (error) {
    logger.error(`Error refreshing price for quote ${req.params.id}`, { error: error.message });
    res.status(500).json({ error: 'Failed to refresh prices' });
  }
});

// STAFF ROUTE: Renders the "in-person" edit view.
router.get('/edit/:id', staffAuth, async (req, res) => {
  try {
    const quoteData = await quoteService.getQuoteById(req.params.id);
    if (!quoteData) {
      return res.status(404).send('Quote not found');
    }
    // Use short_id for customer URL (much shorter and easier)
    // Force HTTPS in production
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
    const customerUrl = `${protocol}://${req.get('host')}/quote/${quoteData.quote.short_id}`;
    res.render('edit_quote', {
      quote: quoteData.quote,
      items: quoteData.items,
      customerUrl: customerUrl,
    });
  } catch (error) {
    logger.error(`Error fetching quote for edit view (ID: ${req.params.id})`, { error: error.message });
    res.status(500).send('Server error');
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
    
    // Get quote by short_id first to get the UUID
    const quoteData = await quoteService.getQuoteByShortId(shortId);
    if (!quoteData) {
      return res.render('customer_login', { 
        quoteId: shortId, 
        error: 'Quote not found.' 
      });
    }
    
    const isValid = await quoteService.validateCustomerCredential(quoteData.quote.id, credential);

    if (isValid) {
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
        error: 'Invalid mobile number or email. Please try again.' 
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

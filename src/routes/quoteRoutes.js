const express = require('express');
const router = express.Router();
const quoteService = require('../services/quoteService');
const logger = require('../utils/logger');
const { staffAuth } = require('../middleware/auth');

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
    res.redirect(`/quote/edit/${newQuote.id}`);
  } catch (error) {
    logger.error('Error in POST /quote/create', { error: error.message });
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// STAFF ROUTE: Renders the "in-person" edit view.
router.get('/edit/:id', staffAuth, async (req, res) => {
  try {
    const quoteData = await quoteService.getQuoteById(req.params.id);
    if (!quoteData) {
      return res.status(404).send('Quote not found');
    }
    res.render('edit_quote', {
      quote: quoteData.quote,
      items: quoteData.items,
    });
  } catch (error) {
    logger.error(`Error fetching quote for edit view (ID: ${req.params.id})`, { error: error.message });
    res.status(500).send('Server error');
  }
});

// CUSTOMER ROUTE: The customer-facing view of the quote.
// This dynamic route is last, so it won't incorrectly match '/create' or '/edit'.
router.get('/:id', async (req, res) => {
    try {
        // TODO: Implement customer authentication (e.g., with mobile number)
        const quoteData = await quoteService.getQuoteById(req.params.id);
        if (!quoteData) {
            return res.status(404).send('Quote not found');
        }
        res.render('customer_view_quote', {
            quote: quoteData.quote,
            items: quoteData.items,
        });
  } catch (error) {
    logger.error(`Error fetching quote for customer view (ID: ${req.params.id})`, { error: error.message });
    res.status(500).send('Server error');
  }
});

module.exports = router;

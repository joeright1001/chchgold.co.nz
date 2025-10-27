const express = require('express');
const router = express.Router();
const quoteService = require('../../services/quoteService');
const logger = require('../../utils/logger');

// GET /quote/create - Renders the new quote creation page
router.get('/create', (req, res) => {
  res.render('create_quote');
});

// POST /quote/create - Handles the form submission for a new quote
router.post('/create', async (req, res) => {
  try {
    const { customerDetails, items } = req.body;
    
    // Basic validation
    if (!customerDetails || !items) {
      return res.status(400).json({ error: 'Missing customer details or items.' });
    }

    // Filter out empty item rows before processing
    const filledItems = items.filter(item => item && item.name && item.name.trim() !== '');

    const newQuote = await quoteService.createQuote(customerDetails, filledItems);
    
    // As per the workflow, redirect to the edit page after creation
    res.redirect(`/staff/quote/edit/${newQuote.id}`);

  } catch (error) {
    logger.error('Error in POST /staff/quote/create', { error: error.message });
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// GET /quote/edit/:id - Renders the "in-person" edit view
router.get('/edit/:id', async (req, res) => {
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

module.exports = router;

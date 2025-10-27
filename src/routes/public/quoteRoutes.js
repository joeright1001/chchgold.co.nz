const express = require('express');
const router = express.Router();
const quoteService = require('../../services/quoteService');

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

    const newQuote = await quoteService.createQuote(customerDetails, items);
    
    // As per the workflow, redirect to the edit page after creation
    res.redirect(`/quote/edit/${newQuote.id}`);

  } catch (error) {
    console.error('Error in POST /quote/create:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// GET /quote/edit/:id - Renders the "in-person" edit view
router.get('/edit/:id', (req, res) => {
  // Placeholder - we will fetch quote data and render an EJS template here
  res.send(`This is the edit page for quote ID: ${req.params.id}`);
});

module.exports = router;

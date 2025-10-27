const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const quoteService = require('../../services/quoteService');
const logger = require('../../utils/logger');

// GET /admin - Displays a list of all quotes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, quote_number, customer_first_name, customer_surname, created_at FROM quotes ORDER BY created_at DESC');
    res.render('admin_dashboard', { quotes: result.rows });
  } catch (error) {
    logger.error('Error fetching quotes for admin dashboard', { error: error.message });
    res.status(500).send('Server error');
  }
});

// GET /admin/:id - Displays the full admin view for a single quote
router.get('/:id', async (req, res) => {
  try {
    const quoteData = await quoteService.getQuoteById(req.params.id);
    if (!quoteData) {
      return res.status(404).send('Quote not found');
    }
    res.render('admin_view_quote', {
      quote: quoteData.quote,
      items: quoteData.items,
    });
  } catch (error) {
    logger.error(`Error fetching quote for admin view (ID: ${req.params.id})`, { error: error.message });
    res.status(500).send('Server error');
  }
});

module.exports = router;

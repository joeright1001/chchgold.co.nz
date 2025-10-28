const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const quoteService = require('../../services/quoteService');
const settingsService = require('../../services/settingsService');
const logger = require('../../utils/logger');

// GET /admin - Displays a list of all quotes
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        q.id, 
        q.quote_number, 
        q.customer_first_name, 
        q.customer_surname,
        q.customer_mobile,
        q.customer_email,
        q.created_at,
        STRING_AGG(qi.item_name, ', ') AS items
      FROM quotes q
      LEFT JOIN quote_items qi ON q.id = qi.quote_id
      GROUP BY q.id, q.customer_mobile, q.customer_email
      ORDER BY q.created_at DESC;
    `;
    const result = await pool.query(query);
    
    // Get current settings
    const spotOffset = await settingsService.getSetting('spot_normalisation_offset');
    
    res.render('admin_dashboard', { 
      quotes: result.rows,
      spotNormalisationOffset: spotOffset || '0.25'
    });
  } catch (error) {
    logger.error('Error fetching quotes for admin dashboard', { error: error.message });
    res.status(500).send('Server error');
  }
});

// POST /admin/settings/update - Handles updating settings
router.post('/settings/update', async (req, res) => {
  try {
    const { spot_normalisation_offset } = req.body;
    
    // Validate the input
    const offset = parseFloat(spot_normalisation_offset);
    if (isNaN(offset) || offset < 0 || offset > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid offset value. Must be between 0 and 100.' 
      });
    }
    
    await settingsService.updateSetting('spot_normalisation_offset', spot_normalisation_offset);
    logger.info(`Spot normalisation offset updated to ${spot_normalisation_offset}%`);
    
    res.json({ 
      success: true, 
      message: 'Spot normalisation offset updated successfully.' 
    });
  } catch (error) {
    logger.error('Error updating spot normalisation offset', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update settings.' 
    });
  }
});

// GET /admin/:id - Displays the full admin view for a single quote
router.get('/:id', async (req, res) => {
  try {
    const quoteData = await quoteService.getQuoteById(req.params.id);
    if (!quoteData) {
      return res.status(404).send('Quote not found');
    }
    // Use short_id for customer URL (much shorter and easier)
    // Force HTTPS in production
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
    const customerUrl = `${protocol}://${req.get('host')}/quote/${quoteData.quote.short_id}`;
    
    // Check if this is a newly created quote
    const isNewQuote = req.query.new === 'true';
    
    res.render('admin_view_quote', {
      quote: quoteData.quote,
      items: quoteData.items,
      customerUrl: customerUrl,
      isNewQuote: isNewQuote,
    });
  } catch (error) {
    logger.error(`Error fetching quote for admin view (ID: ${req.params.id})`, { error: error.message });
    res.status(500).send('Server error');
  }
});

// POST /admin/:id - Handles the form submission for updating a quote
router.post('/:id', async (req, res) => {
  try {
    const { customerDetails, items } = req.body;
    await quoteService.updateQuoteDetails(req.params.id, customerDetails, items);
    res.redirect(`/admin/${req.params.id}`);
  } catch (error) {
    logger.error(`Error updating quote ${req.params.id}`, { error: error.message });
    res.status(500).send('Server error');
  }
});

module.exports = router;

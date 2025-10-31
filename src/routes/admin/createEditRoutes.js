/**
 * CREATE-EDIT ROUTES - Unified Quote Management
 * 
 * This file handles ALL individual quote operations in one unified interface:
 * 
 * KEY FUNCTIONS:
 * 1. CREATE Mode - Create new quotes with customer details, prices, and items
 * 2. EDIT Mode - View and update existing quotes
 * 3. Expire - Mark quotes as expired
 * 
 * WORKFLOW:
 * CREATE:
 * - Admin clicks "Create New Quote" → GET /admin/create-edit → Renders empty form
 * - Admin fills details, gets live prices, adds items → POST /admin/create-edit
 * - Creates quote → Redirects to /admin/create-edit/:id?new=true with success message
 * 
 * EDIT:
 * - Admin clicks "View" on dashboard → GET /admin/create-edit/:id → Renders form with quote data
 * - Admin modifies quote → POST /admin/create-edit/:id → Updates quote
 * - Redirects to /admin/create-edit/:id?updated=true with success message
 * 
 * EXPIRE:
 * - Admin clicks "Mark as Expired" → POST /admin/create-edit/:id/expire
 * - Updates status → Redirects with updated=true flag
 * 
 * DATA FLOW for Weight Options:
 * - Reads the master list of weight options from `../../config/weightOptions`.
 * - Passes this list to the `admin_create_edit.ejs` template during render.
 * 
 * NOTE: This route file is mounted at /admin/create-edit in server.js
 * NOTE: All routes require staffAuth middleware applied at mount point
 */

const express = require('express');
const router = express.Router();
const quoteService = require('../../services/quoteService');
const logger = require('../../utils/logger');

// GET /admin/create-edit - Renders the unified create/edit page in CREATE mode
router.get('/', async (req, res) => {
  try {
    res.render('admin_create_edit', {
      isEditMode: false,
      isNewQuote: false,
      isUpdated: false,
      quote: {},
      items: [],
      customerUrl: ''
    });
  } catch (error) {
    logger.error('Error rendering create-edit page', { error: error.message });
    res.status(500).send('Server error');
  }
});

// GET /admin/create-edit/:id - Renders the unified create/edit page in EDIT mode
router.get('/:id', async (req, res) => {
  try {
    const quoteData = await quoteService.getQuoteById(req.params.id);
    if (!quoteData) {
      return res.status(404).send('Quote not found');
    }
    
    // Use short_id for customer URL
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
    const customerUrl = `${protocol}://${req.get('host')}/quote/${quoteData.quote.short_id}`;
    
    // Check if this is a newly created quote or updated
    const isNewQuote = req.query.new === 'true';
    const isUpdated = req.query.updated === 'true';
    
    res.render('admin_create_edit', {
      isEditMode: true,
      isNewQuote: isNewQuote,
      isUpdated: isUpdated,
      quote: quoteData.quote,
      items: quoteData.items,
      customerUrl: customerUrl
    });
  } catch (error) {
    logger.error(`Error fetching quote for create-edit view (ID: ${req.params.id})`, { error: error.message });
    res.status(500).send('Server error');
  }
});

// POST /admin/create-edit - Handles form submission for creating a new quote
router.post('/', async (req, res) => {
  try {
    const { customerDetails, items, showQuotedRate, spotPrices } = req.body;
    
    // Ensure customerDetails is an object
    const details = customerDetails || {
      firstName: req.body['customerDetails[firstName]'],
      surname: req.body['customerDetails[surname]'],
      mobile: req.body['customerDetails[mobile]'],
      email: req.body['customerDetails[email]'],
      zohoId: req.body['customerDetails[zohoId]'],
    };
    
    // Filter out empty items
    const filledItems = (items || []).filter(item => item && item.name && item.name.trim() !== '');
    
    // Prepare spot prices, ensuring they are numbers
    const prices = {
      gold_gram_nzd: parseFloat(spotPrices.gold_gram_nzd) || 0,
      silver_gram_nzd: parseFloat(spotPrices.silver_gram_nzd) || 0,
    };

    // Create the quote
    const newQuote = await quoteService.createQuote(details, filledItems, prices);
    
    // Update settings if needed
    if (showQuotedRate !== undefined) {
      const settings = {
        showQuotedRate: showQuotedRate === 'on'
      };
      await quoteService.updateQuoteSettings(newQuote.id, settings);
    }
    
    res.redirect(`/admin/create-edit/${newQuote.id}?new=true`);
  } catch (error) {
    logger.error('Error creating quote via create-edit', { error: error.message });
    res.status(500).send('Server error');
  }
});

// POST /admin/create-edit/:id - Handles form submission for updating a quote
router.post('/:id', async (req, res) => {
  try {
    const { customerDetails, items, showQuotedRate } = req.body;
    
    // Ensure customerDetails is an object
    const details = customerDetails || {
      firstName: req.body['customerDetails[firstName]'],
      surname: req.body['customerDetails[surname]'],
      mobile: req.body['customerDetails[mobile]'],
      email: req.body['customerDetails[email]'],
      zohoId: req.body['customerDetails[zohoId]'],
    };
    
    const settings = {
      showQuotedRate: showQuotedRate === 'on'
    };

    await Promise.all([
      quoteService.updateQuoteDetails(req.params.id, details, items),
      quoteService.updateQuoteSettings(req.params.id, settings)
    ]);

    res.redirect(`/admin/create-edit/${req.params.id}?updated=true`);
  } catch (error) {
    logger.error(`Error updating quote ${req.params.id} via create-edit`, { error: error.message });
    res.status(500).send('Server error');
  }
});

// POST /admin/create-edit/:id/expire - Marks a quote as expired (from create-edit page)
router.post('/:id/expire', async (req, res) => {
  try {
    await quoteService.updateQuoteStatus(req.params.id, 'expired');
    logger.info(`Quote ${req.params.id} marked as expired by admin via create-edit.`);
    res.redirect(`/admin/create-edit/${req.params.id}?updated=true&t=${Date.now()}`);
  } catch (error) {
    logger.error(`Error expiring quote ${req.params.id} via create-edit`, { error: error.message });
    res.status(500).send('Server error');
  }
});

module.exports = router;

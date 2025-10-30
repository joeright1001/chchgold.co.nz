/**
 * ADMIN ROUTES - Dashboard & Settings Management
 * 
 * This file handles the core admin functionality:
 * 
 * KEY FUNCTIONS:
 * 1. Dashboard Display - Shows list of all quotes with search functionality
 * 2. Settings Management - Updates spot normalisation offset for pricing
 * 
 * WORKFLOW:
 * - Admin accesses /admin → Displays dashboard with all quotes
 * - Admin clicks "View" on quote → Redirects to /admin/create-edit/:id (handled by createEditRoutes.js)
 * - Admin updates settings → POST /admin/settings/update → Updates database → Returns JSON response
 * 
 * NOTE: Individual quote operations (create/edit/expire) are handled by createEditRoutes.js
 */

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
        q.status,
        STRING_AGG(qi.item_name, ', ') AS items
      FROM quotes q
      LEFT JOIN quote_items qi ON q.id = qi.quote_id
      GROUP BY q.id, q.customer_mobile, q.customer_email, q.status
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

module.exports = router;

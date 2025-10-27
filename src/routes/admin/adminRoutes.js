const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /admin - Displays a list of all quotes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, quote_number, customer_first_name, customer_surname, created_at FROM quotes ORDER BY created_at DESC');
    // Placeholder - we will render an EJS template with the quotes
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quotes for admin dashboard:', error);
    res.status(500).send('Server error');
  }
});

// GET /admin/:id - Displays the full admin view for a single quote
router.get('/:id', async (req, res) => {
  // Placeholder - we will fetch detailed quote data and render an EJS template
  res.send(`This is the admin view for quote ID: ${req.params.id}`);
});

module.exports = router;

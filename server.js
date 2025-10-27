require("dotenv").config();
process.env.TZ = 'Pacific/Auckland';

const express = require("express");
const path = require('path');

const app = express();

// Set up templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Import routes
const staffQuoteRoutes = require('./src/routes/public/quoteRoutes');
const customerQuoteRoutes = require('./src/routes/public/customerQuoteRoutes');
const adminRoutes = require('./src/routes/admin/adminRoutes');
const { staffAuth } = require('./src/middleware/auth');

// Basic route for testing
app.get('/', (req, res) => {
  res.send('ChchGold Sell Bullion Quote server is running.');
});

// Staff-only routes for creating and editing quotes
app.use('/staff/quote', staffAuth, staffQuoteRoutes);

// Public route for customers to view their quote
app.use('/quote', customerQuoteRoutes);

// Admin routes - applying auth to all admin routes
app.use('/admin', staffAuth, adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

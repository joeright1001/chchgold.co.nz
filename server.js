require("dotenv").config();
process.env.TZ = 'Pacific/Auckland';

const express = require("express");
const path = require('path');
const logger = require('./src/utils/logger');

const app = express();

// Set up templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Import routes
const quoteRoutes = require('./src/routes/quoteRoutes');
const adminRoutes = require('./src/routes/admin/adminRoutes');
const { staffAuth } = require('./src/middleware/auth');

// Root route - displays splash page and redirects
app.get('/', (req, res) => {
  res.render('splash');
});

// All quote-related routes are now handled by a single router
// Authentication is handled internally within the quote router
app.use('/quote', quoteRoutes);

// Admin routes - applying auth to all admin routes
app.use('/admin', staffAuth, adminRoutes);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.message, { url: req.originalUrl, stack: err.stack });
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

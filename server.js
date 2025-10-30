/**
 * SERVER.JS - Main Application Entry Point
 * 
 * This is the core Express server that orchestrates the entire application:
 * 
 * KEY FUNCTIONS:
 * 1. Configuration - Sets up Express, sessions, middleware
 * 2. Route Mounting - Connects route files at specific paths
 * 3. Error Handling - Catches and logs application errors
 * 
 * ROUTE STRUCTURE:
 * - / → Splash page (splash.ejs)
 * - /quote → Customer routes (quoteRoutes.js) - login, view quotes
 * - /admin/create-edit → Unified quote management (createEditRoutes.js)
 * - /admin → Dashboard and settings (adminRoutes.js)
 * 
 * MIDDLEWARE APPLIED:
 * - express.static → Serves CSS, JS, images from /public
 * - express.urlencoded → Parses form data
 * - express.json → Parses JSON requests
 * - express-session → Manages customer authentication sessions
 * - staffAuth → Protects admin routes (applied at mount point)
 * 
 * IMPORTANT: Route order matters! More specific routes (/admin/create-edit) must be
 * mounted BEFORE generic routes (/admin/:id) to prevent incorrect matching.
 */

require("dotenv").config();
process.env.TZ = 'Pacific/Auckland';

const express = require("express");
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./src/config/database');
const logger = require('./src/utils/logger');

const app = express();

// Trust Railway's proxy for secure cookies and client IP
app.set('trust proxy', 1);

// Set up templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware for customer authentication with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool: pool,                   // Connection pool
    tableName: 'session',         // Table name (matches schema.sql)
    createTableIfMissing: false   // Table already created in schema.sql
  }),
  secret: process.env.SESSION_SECRET || 'a_default_secret_for_development',
  resave: false,
  saveUninitialized: false,       // Changed to false to prevent storing empty sessions
  cookie: { 
    secure: process.env.NODE_ENV === 'production',  // Use secure cookies in production
    httpOnly: true,
    sameSite: 'lax',  // Allow cookies to be sent on same-site navigations and top-level navigations
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Import routes
const quoteRoutes = require('./src/routes/quoteRoutes');
const adminRoutes = require('./src/routes/admin/adminRoutes');
const createEditRoutes = require('./src/routes/admin/createEditRoutes');
const { staffAuth } = require('./src/middleware/auth');

// Root route - displays splash page and redirects
app.get('/', (req, res) => {
  res.render('splash');
});

// All quote-related routes are now handled by a single router
// Authentication is handled internally within the quote router
app.use('/quote', quoteRoutes);

// Admin routes - mount create-edit routes BEFORE generic admin routes
app.use('/admin/create-edit', staffAuth, createEditRoutes);
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

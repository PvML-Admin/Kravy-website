const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { initializeDatabase } = require('./database/init');
const { scheduleDailyReset, scheduleWeeklyReset, scheduleMonthlyReset, startContinuousSync, cleanupSchedulers } = require('./utils/scheduler');
const { cleanupSyncProgress } = require('./services/syncService');
const { addCategoryToActivities } = require('./database/migrations/add_category_to_activities');
const { addGrandmasterCA } = require('./database/migrate-add-grandmaster-ca');
const db = require('./config/database');

const membersRouter = require('./api/members');
const syncRouter = require('./api/sync');
const leaderboardRouter = require('./api/leaderboard');
const clanRouter = require('./api/clan');
const activitiesRouter = require('./api/activities');
const eventsRouter = require('./api/events');
const twitterRouter = require('./api/twitter');
const authRouter = require('./api/auth');
const adminRouter = require('./api/admin');
const passport = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow frontend domains
const corsOptions = {
  origin: [
    'http://localhost:3000',  // Local development
    'https://kravy-website-1.onrender.com',  // Production frontend (Render)
    'https://kravyrs.com',  // Custom domain
    'https://www.kravyrs.com',  // Custom domain with www
    process.env.FRONTEND_URL  // Optional: set via environment variable
  ].filter(Boolean),
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration with PostgreSQL store
const isProduction = process.env.NODE_ENV === 'production';
const sessionStore = new pgSession({
  pool: db.pool, // Use existing PostgreSQL connection pool
  tableName: 'session', // Table name for sessions
  createTableIfMissing: true, // Auto-create session table
  pruneSessionInterval: 60 * 15 // Prune expired sessions every 15 minutes
});

app.use(session({
  store: sessionStore, // Use PostgreSQL session store instead of MemoryStore
  secret: process.env.SESSION_SECRET || 'kravy-tracker-secret-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  proxy: true, // Trust proxy for secure cookies behind Render's proxy
  cookie: {
    secure: isProduction, // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-site cookies in production
    domain: process.env.COOKIE_DOMAIN || undefined // Don't set domain in production, let browser handle it
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize database
(async () => {
  try {
    // Run any pending migrations first
    await addCategoryToActivities();
    await addGrandmasterCA();

    // Then, initialize the database schema (creates tables if they don't exist)
    await initializeDatabase();
    console.log('Database setup complete');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1); // Exit if database setup fails
  }
})();

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes (must be before protected routes)
app.use('/api/auth', authRouter);

// API routes
app.use('/api/members', membersRouter);
app.use('/api/sync', syncRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/clan', clanRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/twitter', twitterRouter);
app.use('/api/admin', adminRouter);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Schedule the daily XP gain reset to run at 00:00 UTC
  scheduleDailyReset();
  scheduleWeeklyReset();
  scheduleMonthlyReset();

  // Start continuous rolling sync (10 members every 5 minutes)
  console.log('Starting continuous rolling sync system...');
  startContinuousSync();
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
    
    // Cleanup schedulers and intervals
    cleanupSchedulers();
    
    // Cleanup sync progress tracking
    cleanupSyncProgress();
    
    // Close database pool
    db.pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after 30s timeout');
    process.exit(1);
  }, 30000);
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
});

module.exports = app;


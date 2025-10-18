const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./database/init');
const { addLastSyncAttempt } = require('./database/migrate-add-last-sync-attempt');
const { migrate: addPeriodicXpGains } = require('./database/migrate-add-periodic-xp-gains');
const { up: addClanEvents } = require('./database/migrate-add-clan-events');
const { scheduleDailyReset, scheduleWeeklyReset, startContinuousSync } = require('./utils/scheduler');

const membersRouter = require('./api/members');
const syncRouter = require('./api/sync');
const leaderboardRouter = require('./api/leaderboard');
const clanRouter = require('./api/clan');
const activitiesRouter = require('./api/activities');
const eventsRouter = require('./api/events');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow frontend domains
const corsOptions = {
  origin: [
    'http://localhost:3000',  // Local development
    'https://kravy-website-1.onrender.com',  // Production frontend
    process.env.FRONTEND_URL  // Optional: set via environment variable
  ].filter(Boolean),
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize database and run migrations
(async () => {
  try {
    await initializeDatabase();
    await addLastSyncAttempt();
    await addPeriodicXpGains();
    await addClanEvents();
    console.log('Database initialization and migrations complete');
  } catch (error) {
    console.error('Database setup failed:', error);
  }
})();

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/members', membersRouter);
app.use('/api/sync', syncRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/clan', clanRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/events', eventsRouter);

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Schedule the daily XP gain reset to run at 00:00 UTC
  scheduleDailyReset();
  scheduleWeeklyReset();

  // Start continuous rolling sync (10 members every 5 minutes)
  console.log('Starting continuous rolling sync system...');
  startContinuousSync();
});

module.exports = app;


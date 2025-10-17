const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./database/init');
const { scheduleDailyReset, scheduleWeeklyReset, scheduleMemberSync } = require('./utils/scheduler');

const membersRouter = require('./api/members');
const syncRouter = require('./api/sync');
const leaderboardRouter = require('./api/leaderboard');
const clanRouter = require('./api/clan');
const activitiesRouter = require('./api/activities');
const eventsRouter = require('./api/events');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

initializeDatabase();

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

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../../frontend/build', 'index.html'));
  });
}

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Schedule the daily XP gain reset to run at 00:00 UTC
  scheduleDailyReset();
  scheduleWeeklyReset();

  // Conditionally schedule the member sync based on environment
  const syncSchedule = process.env.SYNC_SCHEDULE || '0 */6 * * *';
  if (process.env.NODE_ENV !== 'development' && syncSchedule) {
    console.log('Setting up scheduled member sync...');
    scheduleMemberSync(syncSchedule);
  } else {
    console.log('Scheduled member sync is disabled in the current environment.');
  }
});

module.exports = app;


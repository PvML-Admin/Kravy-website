const cron = require('node-cron');
const db = require('../config/database');
const { syncAllMembers } = require('../services/syncService');

async function resetDailyGains() {
  try {
    console.log('Running daily reset for daily_xp_gain...');
    await db.runAsync('UPDATE skills SET daily_xp_gain = 0');
    console.log('Successfully reset daily_xp_gain for all skills.');
  } catch (error) {
    console.error('Failed to reset daily XP gains:', error);
  }
}

async function resetWeeklyGains() {
  try {
    console.log('Running weekly reset for weekly_xp_gain...');
    await db.runAsync('UPDATE skills SET weekly_xp_gain = 0');
    console.log('Successfully reset weekly_xp_gain for all skills.');
  } catch (error) {
    console.error('Failed to reset weekly XP gains:', error);
  }
}

function scheduleDailyReset() {
  // Schedule a task to run at midnight every day for resetting gains.
  cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled daily XP gain reset...');
    resetDailyGains();
  }, {
    timezone: "UTC"
  });

  console.log('Scheduled daily XP gain reset has been set up to run at 00:00 UTC.');
}

function scheduleWeeklyReset() {
  // Schedule a task to run at midnight on Monday every week for resetting gains.
  cron.schedule('0 0 * * 1', () => {
    console.log('Running scheduled weekly XP gain reset...');
    resetWeeklyGains();
  }, {
    timezone: "UTC"
  });

  console.log('Scheduled weekly XP gain reset has been set up to run at 00:00 UTC on Mondays.');
}

function scheduleMemberSync(schedule) {
  if (!schedule) {
    console.log('Member sync schedule is not defined. Auto-sync is disabled.');
    return;
  }
  
  // Schedule a task to run for syncing all members
  cron.schedule(schedule, () => {
    console.log('Running scheduled member sync...');
    syncAllMembers().catch(err => {
      console.error('Scheduled member sync failed:', err);
    });
  });

  console.log(`Scheduled member sync has been set up with schedule: "${schedule}"`);
}

module.exports = { scheduleDailyReset, scheduleWeeklyReset, scheduleMemberSync };



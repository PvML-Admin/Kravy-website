const cron = require('node-cron');
const db = require('../config/database');
const { syncMember } = require('../services/syncService');
const { MemberModel } = require('../database/models');
const { populateDailyXp } = require('../database/populate-daily-xp');

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
  // Schedule a task to run at 23:55 UTC to record daily XP before reset
  cron.schedule('55 23 * * *', () => {
    console.log('Recording daily clan XP totals...');
    populateDailyXp().catch(err => {
      console.error('Failed to record daily XP totals:', err);
    });
  }, {
    timezone: "UTC"
  });

  // Schedule a task to run at midnight every day for resetting gains.
  cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled daily XP gain reset...');
    resetDailyGains();
  }, {
    timezone: "UTC"
  });

  console.log('Scheduled daily XP recording and reset has been set up.');
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

/**
 * Continuous rolling sync - syncs 10 members every 5 minutes
 * Prioritizes members who haven't been attempted to sync in the longest time
 * Uses last_sync_attempt to track all attempts (success or failure)
 */
async function rollingSyncBatch() {
  try {
    // Get all active members sorted by last_sync_attempt (oldest first, NULL first)
    const members = await db.allAsync(`
      SELECT id, name, last_synced, last_sync_attempt
      FROM members 
      WHERE is_active = 1 
      ORDER BY 
        CASE WHEN last_sync_attempt IS NULL THEN 0 ELSE 1 END,
        last_sync_attempt ASC
      LIMIT 10
    `);

    if (members.length === 0) {
      console.log('[Rolling Sync] No members to sync');
      return;
    }

    console.log(`[Rolling Sync] Syncing ${members.length} members (prioritizing least recently attempted)...`);
    
    let successCount = 0;
    let failCount = 0;

    // Sync members sequentially with a small delay to avoid rate limiting
    for (const member of members) {
      // Update last_sync_attempt BEFORE attempting the sync
      // This ensures failed syncs don't block the queue
      await db.runAsync(
        'UPDATE members SET last_sync_attempt = CURRENT_TIMESTAMP WHERE id = ?',
        [member.id]
      );

      try {
        const lastSyncStr = member.last_synced 
          ? new Date(member.last_synced).toLocaleString() 
          : 'Never';
        const lastAttemptStr = member.last_sync_attempt
          ? new Date(member.last_sync_attempt).toLocaleString()
          : 'Never';
        console.log(`[Rolling Sync] Syncing ${member.name} (last synced: ${lastSyncStr}, last attempt: ${lastAttemptStr})`);
        
        await syncMember(member.id);
        successCount++;
        
        // Small delay between syncs (30 seconds / 10 members = 3 seconds each)
        if (members.indexOf(member) < members.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        failCount++;
        console.error(`[Rolling Sync] Failed to sync ${member.name}:`, error.message);
        // Note: last_sync_attempt was already updated, so this member won't block the queue
      }
    }

    console.log(`[Rolling Sync] Batch complete: ${successCount} successful, ${failCount} failed`);
  } catch (error) {
    console.error('[Rolling Sync] Error in rolling sync batch:', error);
  }
}

/**
 * Start continuous rolling sync - runs every 5 minutes
 */
function startContinuousSync() {
  // Run immediately on startup
  console.log('[Rolling Sync] Starting continuous rolling sync system...');
  rollingSyncBatch().catch(err => {
    console.error('[Rolling Sync] Initial sync batch failed:', err);
  });

  // Schedule to run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    rollingSyncBatch().catch(err => {
      console.error('[Rolling Sync] Scheduled sync batch failed:', err);
    });
  });

  console.log('[Rolling Sync] Continuous sync scheduled to run every 5 minutes (10 members per batch)');
}

module.exports = { 
  scheduleDailyReset, 
  scheduleWeeklyReset, 
  startContinuousSync 
};



const db = require('../config/database');

/**
 * This script resets all XP gain values to fix corrupted data
 * Run this after deploying the XP gain bug fix to start tracking fresh
 */
async function fixXpGains() {
  try {
    console.log('Resetting all daily and weekly XP gains to start fresh...');
    
    // Reset all XP gains to 0
    await db.runAsync('UPDATE skills SET daily_xp_gain = 0, weekly_xp_gain = 0');
    
    console.log('Successfully reset all XP gain values to 0.');
    console.log('XP gains will now be tracked correctly from the next sync.');
    console.log('You can restart your server now.');
  } catch (error) {
    console.error('Failed to fix XP gains:', error);
    throw error;
  } finally {
    // Close the database connection
    if (db.close) {
      db.close();
    }
  }
}

// Allow running this script directly
if (require.main === module) {
  fixXpGains()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { fixXpGains };


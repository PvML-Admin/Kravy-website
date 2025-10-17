const db = require('../config/database');

async function resetDailyGains() {
  try {
    console.log('Manually resetting daily_xp_gain for all skills...');
    await db.runAsync('UPDATE skills SET daily_xp_gain = 0');
    console.log('Successfully reset daily_xp_gain for all skills.');
    console.log('You can now restart your server.');
  } catch (error) {
    console.error('Failed to reset daily XP gains:', error);
  } finally {
    // Close the database connection if the script is standalone
    db.close();
  }
}

// Allow running this script directly
if (require.main === module) {
  resetDailyGains();
}

module.exports = { resetDailyGains };


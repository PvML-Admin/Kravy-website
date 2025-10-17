const db = require('../config/database');

async function resetXpGain() {
  await db.runAsync(`
    UPDATE skills SET xp_gain = 0
  `);
  console.log('Successfully reset all xp_gain values to 0 in the skills table.');
}

// Allow running this script directly
if (require.main === module) {
  resetXpGain().catch(err => {
    console.error('Failed to reset XP gain:', err);
    process.exit(1);
  });
}

module.exports = { resetXpGain };

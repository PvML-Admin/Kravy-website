const db = require('../config/database');

async function populateDailyXp() {
  console.log('Calculating daily clan XP totals...');

  // Get the sum of all active members' daily XP gains
  const dailyTotal = await db.getAsync(`
    SELECT 
      COALESCE(SUM(s.daily_xp_gain), 0) as total_daily,
      COALESCE(SUM(s.weekly_xp_gain), 0) as total_weekly
    FROM skills s
    JOIN members m ON s.member_id = m.id
    WHERE m.is_active = TRUE
  `);

  // Check if there's already an entry for today
  const today = new Date().toISOString().split('T')[0];
  const existingEntry = await db.getAsync(`
    SELECT id FROM periodic_xp_gains 
    WHERE DATE(timestamp) = ?
  `, [today]);

  if (existingEntry) {
    // Update existing entry
    await db.runAsync(`
      UPDATE periodic_xp_gains
      SET total_daily_xp_gain = ?,
          total_weekly_xp_gain = ?
      WHERE id = ?
    `, [dailyTotal.total_daily, dailyTotal.total_weekly, existingEntry.id]);
    console.log(`Updated today's XP totals: ${dailyTotal.total_daily} XP (daily), ${dailyTotal.total_weekly} XP (weekly)`);
  } else {
    // Insert new entry
    await db.runAsync(`
      INSERT INTO periodic_xp_gains (total_daily_xp_gain, total_weekly_xp_gain)
      VALUES (?, ?)
    `, [dailyTotal.total_daily, dailyTotal.total_weekly]);
    console.log(`Recorded today's XP totals: ${dailyTotal.total_daily} XP (daily), ${dailyTotal.total_weekly} XP (weekly)`);
  }
}

if (require.main === module) {
  populateDailyXp()
    .then(() => {
      console.log('Daily XP population complete!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed to populate daily XP:', err);
      process.exit(1);
    });
}

module.exports = { populateDailyXp };


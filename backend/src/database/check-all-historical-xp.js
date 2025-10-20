const db = require('../config/database');

async function checkAllHistoricalData() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  CHECKING ALL HISTORICAL XP DATA');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Get count of all records
    const count = await db.getAsync(`
      SELECT COUNT(*) as total FROM periodic_xp_gains
    `);
    console.log(`Total records in periodic_xp_gains: ${count.total}\n`);

    if (count.total === 0) {
      console.log('❌ No historical data found! The periodic_xp_gains table is empty.');
      console.log('   This means populateDailyXp() has not been running.\n');
      return;
    }

    // Get date range
    const dateRange = await db.getAsync(`
      SELECT 
        MIN(timestamp) as first_record,
        MAX(timestamp) as last_record
      FROM periodic_xp_gains
    `);
    console.log('Date Range:');
    console.log(`   First record: ${dateRange.first_record}`);
    console.log(`   Last record: ${dateRange.last_record}\n`);

    // Get all records
    console.log('All Historical Records:');
    console.log('─'.repeat(80));
    const allRecords = await db.allAsync(`
      SELECT 
        id,
        DATE(timestamp) as date,
        TO_CHAR(timestamp, 'Day') as day_name,
        total_daily_xp_gain as daily_xp,
        total_weekly_xp_gain as weekly_xp,
        timestamp
      FROM periodic_xp_gains
      ORDER BY timestamp DESC
    `);

    console.log(`\n${'Date'.padEnd(12)} ${'Day'.padEnd(10)} ${'Daily XP'.padStart(15)} ${'Weekly XP'.padStart(15)} ${'Timestamp'.padEnd(25)}`);
    console.log('─'.repeat(80));

    let lastWeeklyXp = null;
    let resetDates = [];

    allRecords.forEach((row, index) => {
      const dailyXp = parseInt(row.daily_xp || 0);
      const weeklyXp = parseInt(row.weekly_xp || 0);
      const date = new Date(row.date);
      const dayOfWeek = date.getUTCDay();
      const dayName = row.day_name ? row.day_name.trim() : '';
      const dateStr = row.date ? row.date.toString().substring(0, 10) : 'N/A';
      
      console.log(
        `${dateStr.padEnd(12)} ${dayName.padEnd(10)} ${dailyXp.toLocaleString().padStart(15)} ${weeklyXp.toLocaleString().padStart(15)} ${row.timestamp}`
      );

      // Check for weekly reset (big drop in weekly XP)
      if (lastWeeklyXp !== null && lastWeeklyXp > weeklyXp * 2) {
        const isMonday = dayOfWeek === 1;
        resetDates.push({
          date: row.date,
          dayName: dayName,
          dayOfWeek: dayOfWeek,
          isMonday: isMonday,
          previousWeeklyXp: lastWeeklyXp,
          currentWeeklyXp: weeklyXp,
          drop: lastWeeklyXp - weeklyXp
        });
      }

      lastWeeklyXp = weeklyXp;
    });

    // Analyze resets
    console.log('\n\nWEEKLY RESET ANALYSIS:');
    console.log('─'.repeat(80));
    
    if (resetDates.length === 0) {
      console.log('✅ No weekly resets detected in the data (not enough data points).');
    } else {
      console.log(`Found ${resetDates.length} weekly reset(s):\n`);
      
      const incorrectResets = resetDates.filter(r => !r.isMonday);
      const correctResets = resetDates.filter(r => r.isMonday);
      
      if (correctResets.length > 0) {
        console.log(`✅ Correct resets (on Mondays): ${correctResets.length}`);
        correctResets.forEach(reset => {
          console.log(`   • ${reset.date} (${reset.dayName}): ${reset.previousWeeklyXp.toLocaleString()} → ${reset.currentWeeklyXp.toLocaleString()} XP`);
        });
        console.log();
      }
      
      if (incorrectResets.length > 0) {
        console.log(`❌ INCORRECT resets (NOT on Mondays): ${incorrectResets.length}`);
        incorrectResets.forEach(reset => {
          console.log(`   • ${reset.date} (${reset.dayName}, day ${reset.dayOfWeek}): ${reset.previousWeeklyXp.toLocaleString()} → ${reset.currentWeeklyXp.toLocaleString()} XP`);
        });
        console.log('\n⚠️  WARNING: Weekly XP is being reset on non-Monday days!');
      } else {
        console.log('✅ All detected resets occurred on Mondays (correct behavior).');
      }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ ERROR during analysis:', error);
  }
}

if (require.main === module) {
  checkAllHistoricalData()
    .then(() => {
      console.log('\nDone!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed to check historical data:', err);
      process.exit(1);
    });
}

module.exports = { checkAllHistoricalData };


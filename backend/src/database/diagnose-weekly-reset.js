const db = require('../config/database');

async function diagnoseWeeklyReset() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  WEEKLY XP RESET DIAGNOSTIC TOOL');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // 1. Check current weekly XP gains
    console.log('1. CURRENT WEEKLY XP GAINS:');
    console.log('─'.repeat(50));
    const currentWeekly = await db.getAsync(`
      SELECT 
        COALESCE(SUM(weekly_xp_gain), 0) as total_weekly_xp
      FROM skills s
      JOIN members m ON s.member_id = m.id
      WHERE m.is_active = TRUE
    `);
    console.log(`   Total Weekly XP: ${parseInt(currentWeekly.total_weekly_xp || 0).toLocaleString()} XP\n`);

    // 2. Check current daily XP gains
    console.log('2. CURRENT DAILY XP GAINS:');
    console.log('─'.repeat(50));
    const currentDaily = await db.getAsync(`
      SELECT 
        COALESCE(SUM(daily_xp_gain), 0) as total_daily_xp
      FROM skills s
      JOIN members m ON s.member_id = m.id
      WHERE m.is_active = TRUE
    `);
    console.log(`   Total Daily XP: ${parseInt(currentDaily.total_daily_xp || 0).toLocaleString()} XP\n`);

    // 3. Check historical data from periodic_xp_gains
    console.log('3. HISTORICAL XP DATA (Last 14 days):');
    console.log('─'.repeat(50));
    const history = await db.allAsync(`
      SELECT 
        DATE(timestamp) as date,
        MAX(total_daily_xp_gain) as daily_xp,
        MAX(total_weekly_xp_gain) as weekly_xp,
        MAX(timestamp) as last_update
      FROM periodic_xp_gains
      WHERE timestamp >= NOW() - INTERVAL '14 days'
      GROUP BY DATE(timestamp)
      ORDER BY DATE(timestamp) DESC
    `);
    
    if (history.length > 0) {
      history.forEach(row => {
        const date = new Date(row.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        console.log(`   ${row.date} (${dayName}): Daily: ${parseInt(row.daily_xp || 0).toLocaleString()} XP | Weekly: ${parseInt(row.weekly_xp || 0).toLocaleString()} XP`);
      });
      console.log();
      
      // Analyze for unexpected weekly resets
      console.log('4. WEEKLY RESET ANALYSIS:');
      console.log('─'.repeat(50));
      let suspiciousResets = [];
      for (let i = 0; i < history.length - 1; i++) {
        const current = history[i];
        const previous = history[i + 1];
        const currentDate = new Date(current.date);
        const dayOfWeek = currentDate.getUTCDay();
        
        // If weekly XP dropped significantly and it wasn't a Monday
        if (parseInt(previous.weekly_xp) > parseInt(current.weekly_xp) * 10 && dayOfWeek !== 1) {
          suspiciousResets.push({
            date: current.date,
            dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
            previousWeekly: parseInt(previous.weekly_xp),
            currentWeekly: parseInt(current.weekly_xp),
            drop: parseInt(previous.weekly_xp) - parseInt(current.weekly_xp)
          });
        }
      }
      
      if (suspiciousResets.length > 0) {
        console.log('   ⚠️  SUSPICIOUS WEEKLY RESETS DETECTED:');
        suspiciousResets.forEach(reset => {
          console.log(`   • ${reset.date} (${reset.dayOfWeek}): ${reset.previousWeekly.toLocaleString()} → ${reset.currentWeekly.toLocaleString()} XP (dropped ${reset.drop.toLocaleString()} XP)`);
        });
        console.log('\n   ❌ Weekly XP is being reset on non-Monday days!');
      } else {
        console.log('   ✅ No suspicious weekly resets detected in the data.');
      }
    } else {
      console.log('   ⚠️  No historical data found in periodic_xp_gains table.');
    }

    console.log('\n5. CURRENT SERVER TIME:');
    console.log('─'.repeat(50));
    const now = new Date();
    console.log(`   Local: ${now.toString()}`);
    console.log(`   UTC: ${now.toUTCString()}`);
    console.log(`   Day of Week (UTC): ${now.getUTCDay()} (0=Sunday, 1=Monday)`);

    console.log('\n6. TOP 10 MEMBERS BY WEEKLY XP GAIN:');
    console.log('─'.repeat(50));
    const topMembers = await db.allAsync(`
      SELECT 
        m.name,
        m.display_name,
        SUM(s.weekly_xp_gain) as weekly_xp
      FROM skills s
      JOIN members m ON s.member_id = m.id
      WHERE m.is_active = TRUE
      GROUP BY m.id, m.name, m.display_name
      HAVING SUM(s.weekly_xp_gain) > 0
      ORDER BY weekly_xp DESC
      LIMIT 10
    `);
    
    if (topMembers.length > 0) {
      topMembers.forEach((member, index) => {
        const name = member.display_name || member.name;
        console.log(`   ${index + 1}. ${name}: ${parseInt(member.weekly_xp || 0).toLocaleString()} XP`);
      });
    } else {
      console.log('   ⚠️  No members have weekly XP gains (possible recent reset)');
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  DIAGNOSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ ERROR during diagnosis:', error);
  }
}

if (require.main === module) {
  diagnoseWeeklyReset()
    .then(() => {
      console.log('\nDone!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed to run diagnostic:', err);
      process.exit(1);
    });
}

module.exports = { diagnoseWeeklyReset };


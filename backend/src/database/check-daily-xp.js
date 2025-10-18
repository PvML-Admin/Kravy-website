const db = require('../config/database');

async function checkData() {
  console.log('Checking periodic_xp_gains table...');
  
  const rows = await db.allAsync('SELECT * FROM periodic_xp_gains ORDER BY timestamp DESC LIMIT 10');
  
  console.log(`Found ${rows.length} rows:`);
  rows.forEach(row => {
    console.log(`- ID: ${row.id}, Date: ${row.timestamp}, Daily XP: ${row.total_daily_xp_gain}, Weekly XP: ${row.total_weekly_xp_gain}`);
  });
}

checkData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });


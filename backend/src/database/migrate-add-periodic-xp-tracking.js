const db = require('../config/database');

async function migrate() {
  console.log('Creating periodic_xp_gains table...');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS periodic_xp_gains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_daily_xp_gain INTEGER DEFAULT 0,
      total_weekly_xp_gain INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_periodic_xp_timestamp ON periodic_xp_gains(timestamp);
  `);

  console.log('periodic_xp_gains table created successfully!');
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration complete!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate };


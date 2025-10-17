const db = require('../config/database');

async function up() {
  console.log('Applying migration: Create clan_events table...');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS clan_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_name TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('join', 'leave')),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Migration completed successfully.');
}

async function down() {
  console.log('Reverting migration: Create clan_events table...');
  await db.execAsync('DROP TABLE IF EXISTS clan_events;');
  console.log('Migration reverted.');
}

// Allow running this script directly
if (require.main === module) {
  up().catch(err => {
    console.error('Failed to apply migration:', err);
    process.exit(1);
  });
}

module.exports = { up, down };


const db = require('../config/database');

async function up() {
  await db.runAsync(`
    ALTER TABLE skills ADD COLUMN xp_gain INTEGER DEFAULT 0
  `);
  console.log('Migration successful: Added xp_gain column to skills table.');
}

async function down() {
  // SQLite doesn't easily support dropping columns. 
  // A common strategy is to recreate the table and copy data.
  // For this migration, we'll assume a downward migration is not critical,
  // but in a production system, this would need a more robust solution.
  console.log('Downward migration for dropping xp_gain column is not implemented.');
}

// Allow running this script directly
if (require.main === module) {
  up().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { up, down };

const db = require('../config/database');

async function migrateAddTotalRank() {
  console.log('Starting migration: Adding total_rank column to members table...');

  try {
    // Add total_rank column
    await db.runAsync(`
      ALTER TABLE members ADD COLUMN total_rank INTEGER;
    `);
    console.log('Added total_rank column');
    
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('total_rank column already exists, skipping...');
    } else {
      throw error;
    }
  }

  console.log('Migration completed successfully!');
}

if (require.main === module) {
  migrateAddTotalRank()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateAddTotalRank };


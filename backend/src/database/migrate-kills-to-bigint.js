const db = require('../config/database');

/**
 * Migrate kills column from INT to BIGINT to support values over 2.1 billion
 */
async function migrate() {
  try {
    console.log('Migrating kills column from INT to BIGINT...');
    
    await db.runAsync('ALTER TABLE members ALTER COLUMN kills TYPE BIGINT');
    
    console.log('Successfully migrated kills column to BIGINT!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    // If it fails, it might already be BIGINT, which is fine
    if (error.message.includes('already type')) {
      console.log('Column is already BIGINT, no migration needed.');
    } else {
      throw error;
    }
  }
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration complete!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}

module.exports = { migrate };


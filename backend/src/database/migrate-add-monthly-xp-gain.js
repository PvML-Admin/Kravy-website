const db = require('../config/database');

async function migrate() {
  try {
    console.log('Adding monthly_xp_gain column to skills table...');
    
    await db.runAsync(`
      ALTER TABLE skills 
      ADD COLUMN IF NOT EXISTS monthly_xp_gain BIGINT DEFAULT 0
    `);
    
    console.log('Successfully added monthly_xp_gain column');
    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Close the database connection
    if (db.pool) {
      await db.pool.end();
    }
    process.exit(0);
  }
}

migrate();


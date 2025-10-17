const db = require('../config/database');

async function migrateAddRankColumn() {
  console.log('Running migration: Add clan_rank column...');
  
  try {
    // Check if column already exists
    const tableInfo = await db.allAsync('PRAGMA table_info(members)');
    const hasRankColumn = tableInfo.some(col => col.name === 'clan_rank');
    
    if (hasRankColumn) {
      console.log('clan_rank column already exists, skipping migration.');
      return;
    }

    // Add clan_rank column
    await db.runAsync(`ALTER TABLE members ADD COLUMN clan_rank TEXT DEFAULT 'Recruit'`);
    console.log('Added clan_rank column to members table');

    // Create index on clan_rank
    await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_members_rank ON members(clan_rank)`);
    console.log('Created index on clan_rank column');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateAddRankColumn()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed to run migration:', err);
      process.exit(1);
    });
}

module.exports = { migrateAddRankColumn };



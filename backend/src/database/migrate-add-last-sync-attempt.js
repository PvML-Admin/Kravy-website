const db = require('../config/database');

async function addLastSyncAttempt() {
  console.log('Adding last_sync_attempt column to members table...');

  try {
    // Check if column already exists
    const tableInfo = await db.allAsync('PRAGMA table_info(members)');
    const hasColumn = tableInfo.some(col => col.name === 'last_sync_attempt');

    if (hasColumn) {
      console.log('Column last_sync_attempt already exists. Skipping migration.');
      return;
    }

    // Add the column
    await db.runAsync('ALTER TABLE members ADD COLUMN last_sync_attempt DATETIME');
    
    console.log('Successfully added last_sync_attempt column!');
  } catch (error) {
    console.error('Error adding last_sync_attempt column:', error);
    throw error;
  }
}

if (require.main === module) {
  addLastSyncAttempt()
    .then(() => {
      console.log('Migration complete!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { addLastSyncAttempt };


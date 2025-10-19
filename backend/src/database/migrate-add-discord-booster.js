const db = require('../config/database');

async function addDiscordBoosterField() {
  try {
    console.log('Adding discord_booster field to members table...');
    
    await db.runAsync(`
      ALTER TABLE members 
      ADD COLUMN is_discord_booster INTEGER DEFAULT 0
    `);
    
    console.log('✓ Successfully added is_discord_booster field to members table');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('✓ is_discord_booster field already exists, skipping...');
    } else {
      console.error('Error adding discord_booster field:', error);
      throw error;
    }
  }
}

// Run migration
addDiscordBoosterField()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });


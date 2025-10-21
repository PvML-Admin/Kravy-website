const db = require('../config/database');

async function addManualItemSupport() {
  console.log('Adding manual item support to bingo_items table...');
  
  try {
    // Add manual_item_id column to store manual item IDs (strings)
    const addColumnQuery = `
      ALTER TABLE bingo_items 
      ADD COLUMN IF NOT EXISTS manual_item_id TEXT;
    `;
    
    await db.runAsync(addColumnQuery);
    console.log('✅ Added manual_item_id column to bingo_items table');
    
    // Modify item_id column to allow null values (for manual items)
    const modifyColumnQuery = `
      ALTER TABLE bingo_items 
      ALTER COLUMN item_id DROP NOT NULL;
    `;
    
    await db.runAsync(modifyColumnQuery);
    console.log('✅ Modified item_id column to allow null values');
    
    console.log('✅ Manual item support migration completed successfully!');
    
  } catch (error) {
    if (error.code === '42701') {
      console.log('⚠️  Column already exists, skipping...');
    } else {
      console.error('❌ Error adding manual item support:', error);
      throw error;
    }
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addManualItemSupport()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addManualItemSupport;

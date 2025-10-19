const db = require('../config/database');

async function addGrandmasterCA() {
  try {
    console.log('Adding grandmaster_ca field to members table...');
    
    // Add is_grandmaster_ca column (defaults to 0/false)
    await db.pool.query(`
      ALTER TABLE members 
      ADD COLUMN IF NOT EXISTS is_grandmaster_ca INTEGER DEFAULT 0
    `);
    
    console.log('✓ Successfully added is_grandmaster_ca field to members table');
  } catch (error) {
    if (error.message.includes('already exists') || error.code === '42701') {
      console.log('✓ is_grandmaster_ca field already exists, skipping...');
    } else {
      console.error('Error adding grandmaster_ca field:', error);
      throw error;
    }
  }
}

module.exports = { addGrandmasterCA };


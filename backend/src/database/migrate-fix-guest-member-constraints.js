const db = require('../config/database');

async function migrate() {
  try {
    console.log('Fixing guest member constraints in bingo_team_members...');

    // Make member_id nullable for guest members
    try {
      await db.runAsync(`
        ALTER TABLE bingo_team_members 
        ALTER COLUMN member_id DROP NOT NULL;
      `);
      console.log('✅ Made member_id nullable in bingo_team_members');
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('already nullable')) {
        console.log('⚠️ member_id column is already nullable or does not exist');
      } else {
        console.error('Error making member_id nullable:', error);
        throw error;
      }
    }

    // Add a constraint to ensure either member_id OR guest_member_id is provided (but not both)
    try {
      await db.runAsync(`
        ALTER TABLE bingo_team_members 
        ADD CONSTRAINT check_member_or_guest 
        CHECK ((member_id IS NOT NULL AND guest_member_id IS NULL) OR (member_id IS NULL AND guest_member_id IS NOT NULL));
      `);
      console.log('✅ Added constraint to ensure either member_id or guest_member_id is provided');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ check_member_or_guest constraint already exists');
      } else {
        console.error('Error adding constraint:', error);
        throw error;
      }
    }

    console.log('✅ Guest member constraints migration completed successfully!');
  } catch (error) {
    console.error('Error during guest member constraints migration:', error);
  }
}

migrate();

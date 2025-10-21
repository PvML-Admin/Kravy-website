const db = require('../config/database');

async function migrateAddBingoScheduling() {
  try {
    console.log('🗓️ Adding bingo scheduling fields...');

    // Add scheduling fields to bingo_boards (check if exists first)
    try {
      await db.runAsync(`
        ALTER TABLE bingo_boards 
        ADD COLUMN start_date TIMESTAMP DEFAULT NULL;
      `);
      console.log('✅ Added start_date to bingo_boards');
    } catch (error) {
      if (error.code === '42701') {
        console.log('⚠️ start_date column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.runAsync(`
        ALTER TABLE bingo_boards 
        ADD COLUMN end_date TIMESTAMP DEFAULT NULL;
      `);
      console.log('✅ Added end_date to bingo_boards');
    } catch (error) {
      if (error.code === '42701') {
        console.log('⚠️ end_date column already exists');
      } else {
        throw error;
      }
    }

    // Add support for non-clan members in teams
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS bingo_guest_members (
        id SERIAL PRIMARY KEY,
        display_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Created bingo_guest_members table');

    // Add guest support to team members
    try {
      await db.runAsync(`
        ALTER TABLE bingo_team_members 
        ADD COLUMN guest_member_id INTEGER DEFAULT NULL;
      `);
      console.log('✅ Added guest_member_id to bingo_team_members');
    } catch (error) {
      if (error.code === '42701') {
        console.log('⚠️ guest_member_id column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.runAsync(`
        ALTER TABLE bingo_team_members 
        ADD COLUMN display_name TEXT DEFAULT NULL;
      `);
      console.log('✅ Added display_name to bingo_team_members');
    } catch (error) {
      if (error.code === '42701') {
        console.log('⚠️ display_name column already exists');
      } else {
        throw error;
      }
    }

    // Update completions to support guest members
    try {
      await db.runAsync(`
        ALTER TABLE bingo_completions 
        ADD COLUMN guest_member_id INTEGER DEFAULT NULL;
      `);
      console.log('✅ Added guest_member_id to bingo_completions');
    } catch (error) {
      if (error.code === '42701') {
        console.log('⚠️ guest_member_id column already exists in completions');
      } else {
        throw error;
      }
    }

    try {
      await db.runAsync(`
        ALTER TABLE bingo_completions 
        ADD COLUMN completed_by_name TEXT DEFAULT NULL;
      `);
      console.log('✅ Added completed_by_name to bingo_completions');
    } catch (error) {
      if (error.code === '42701') {
        console.log('⚠️ completed_by_name column already exists in completions');
      } else {
        throw error;
      }
    }

    console.log('🎯 Bingo scheduling and guest member migration complete!');

  } catch (error) {
    console.error('❌ Error adding bingo scheduling:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateAddBingoScheduling()
    .then(() => {
      console.log('Bingo scheduling migration finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Bingo scheduling migration failed:', error);
      process.exit(1);
    });
} else {
  module.exports = migrateAddBingoScheduling;
}

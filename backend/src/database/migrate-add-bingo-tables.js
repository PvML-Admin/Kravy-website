const db = require('../config/database');

async function createBingoTables() {
  console.log('🎯 Creating Bingo tables...');
  
  try {
    // 1. Bingo Boards Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS bingo_boards (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        rows INTEGER NOT NULL DEFAULT 5 CHECK (rows >= 3 AND rows <= 7),
        columns INTEGER NOT NULL DEFAULT 5 CHECK (columns >= 3 AND columns <= 7),
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created bingo_boards table');

    // 2. Bingo Teams Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS bingo_teams (
        id SERIAL PRIMARY KEY,
        board_id INTEGER NOT NULL REFERENCES bingo_boards(id) ON DELETE CASCADE,
        team_name VARCHAR(255) NOT NULL,
        color VARCHAR(7) NOT NULL DEFAULT '#3498db',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_team_per_board UNIQUE(board_id, team_name)
      )
    `);
    console.log('✅ Created bingo_teams table');

    // 3. Team Members Junction Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS bingo_team_members (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES bingo_teams(id) ON DELETE CASCADE,
        member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_member_per_team UNIQUE(team_id, member_id)
      )
    `);
    console.log('✅ Created bingo_team_members table');

    // 4. Bingo Items/Squares Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS bingo_items (
        id SERIAL PRIMARY KEY,
        board_id INTEGER NOT NULL REFERENCES bingo_boards(id) ON DELETE CASCADE,
        row_number INTEGER NOT NULL CHECK (row_number >= 1),
        column_number INTEGER NOT NULL CHECK (column_number >= 1),
        item_name VARCHAR(255) NOT NULL,
        item_id INTEGER, -- RuneScape item ID for wiki integration
        icon_url TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_square_per_board UNIQUE(board_id, row_number, column_number)
      )
    `);
    console.log('✅ Created bingo_items table');

    // 5. Bingo Completions Table (for Step 2, but creating foundation now)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS bingo_completions (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES bingo_items(id) ON DELETE CASCADE,
        team_id INTEGER NOT NULL REFERENCES bingo_teams(id) ON DELETE CASCADE,
        member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL,
        evidence_text TEXT, -- Copy of the activity text as evidence
        CONSTRAINT unique_completion_per_team_item UNIQUE(item_id, team_id)
      )
    `);
    console.log('✅ Created bingo_completions table');

    // 6. Create indexes for better performance
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_bingo_teams_board_id ON bingo_teams(board_id)');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_bingo_team_members_team_id ON bingo_team_members(team_id)');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_bingo_team_members_member_id ON bingo_team_members(member_id)');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_bingo_items_board_id ON bingo_items(board_id)');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_bingo_items_position ON bingo_items(board_id, row_number, column_number)');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_bingo_completions_item_id ON bingo_completions(item_id)');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_bingo_completions_team_id ON bingo_completions(team_id)');
    console.log('✅ Created performance indexes');

    console.log('🎯 All Bingo tables created successfully!');
    
    // Show summary
    const tableCheck = await db.allAsync(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'bingo_%'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Bingo Tables Summary:');
    tableCheck.forEach(table => {
      console.log(`  ✓ ${table.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error creating Bingo tables:', error);
    throw error;
  }
}

// Function to drop bingo tables (for development/testing)
async function dropBingoTables() {
  console.log('🗑️ Dropping Bingo tables...');
  
  try {
    // Drop in reverse dependency order
    await db.runAsync('DROP TABLE IF EXISTS bingo_completions CASCADE');
    await db.runAsync('DROP TABLE IF EXISTS bingo_items CASCADE');  
    await db.runAsync('DROP TABLE IF EXISTS bingo_team_members CASCADE');
    await db.runAsync('DROP TABLE IF EXISTS bingo_teams CASCADE');
    await db.runAsync('DROP TABLE IF EXISTS bingo_boards CASCADE');
    
    console.log('✅ All Bingo tables dropped successfully!');
  } catch (error) {
    console.error('❌ Error dropping Bingo tables:', error);
    throw error;
  }
}

// Export functions for use in other scripts
module.exports = {
  createBingoTables,
  dropBingoTables
};

// If run directly, create the tables
if (require.main === module) {
  createBingoTables()
    .then(() => {
      console.log('\n🎉 Bingo database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

const db = require('./src/config/database');

async function verifyBingoDatabase() {
  try {
    console.log('🔍 Verifying bingo database configuration...\n');

    // 1. Check database connection and type
    console.log('1. Database Connection Info:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set (PostgreSQL on Render)' : 'NOT SET'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   PORT: ${process.env.PORT}`);
    
    // Test connection
    const testResult = await db.getAsync('SELECT version() as version');
    console.log(`   ✅ Connected to: ${testResult.version.split(' ')[0]} ${testResult.version.split(' ')[1]}\n`);

    // 2. Check all bingo tables exist
    console.log('2. Checking Bingo Tables:');
    const bingoTables = [
      'bingo_boards',
      'bingo_teams', 
      'bingo_team_members',
      'bingo_items',
      'bingo_completions',
      'bingo_guest_members'
    ];

    for (const tableName of bingoTables) {
      try {
        const tableExists = await db.allAsync(`
          SELECT tablename FROM pg_tables 
          WHERE tablename = $1 AND schemaname = 'public'
        `, [tableName]);
        
        if (tableExists.length > 0) {
          // Count records in table
          const count = await db.getAsync(`SELECT COUNT(*) as count FROM ${tableName}`);
          console.log(`   ✅ ${tableName}: EXISTS (${count.count} records)`);
        } else {
          console.log(`   ❌ ${tableName}: MISSING`);
        }
      } catch (error) {
        console.log(`   ❌ ${tableName}: ERROR - ${error.message}`);
      }
    }

    // 3. Check specific bingo board data
    console.log('\n3. Bingo Board Details:');
    const boards = await db.allAsync(`
      SELECT 
        id, 
        title, 
        description,
        is_active,
        start_date,
        end_date,
        created_at,
        rows,
        columns
      FROM bingo_boards 
      ORDER BY created_at DESC
    `);

    if (boards.length === 0) {
      console.log('   ❌ No bingo boards found in database');
      return;
    }

    for (const board of boards) {
      console.log(`\n   📋 Board ID ${board.id}: "${board.title}"`);
      console.log(`      Active: ${board.is_active}`);
      console.log(`      Grid: ${board.columns}x${board.rows}`);
      console.log(`      Start: ${board.start_date}`);
      console.log(`      End: ${board.end_date}`);
      console.log(`      Created: ${board.created_at}`);

      // Check teams for this board
      const teams = await db.allAsync(`
        SELECT bt.*, COUNT(btm.id) as member_count
        FROM bingo_teams bt
        LEFT JOIN bingo_team_members btm ON bt.id = btm.team_id
        WHERE bt.board_id = $1
        GROUP BY bt.id
        ORDER BY bt.team_name
      `, [board.id]);

      console.log(`      Teams: ${teams.length}`);
      for (const team of teams) {
        console.log(`        - ${team.team_name} (${team.member_count} members)`);
      }

      // Check items for this board
      const items = await db.getAsync(`
        SELECT COUNT(*) as count FROM bingo_items WHERE board_id = $1
      `, [board.id]);
      console.log(`      Items: ${items.count}`);

      // Check completions for this board
      const completions = await db.getAsync(`
        SELECT COUNT(*) as count FROM bingo_completions bc
        JOIN bingo_items bi ON bc.item_id = bi.id
        WHERE bi.board_id = $1
      `, [board.id]);
      console.log(`      Completions: ${completions.count}`);
    }

    // 4. Test API routes (if server is running)
    console.log('\n4. Testing Bingo API Routes:');
    try {
      const axios = require('axios');
      const baseURL = `http://localhost:${process.env.PORT || 3001}`;
      
      // Test boards endpoint
      const boardsResponse = await axios.get(`${baseURL}/api/bingo/boards`);
      console.log(`   ✅ GET /api/bingo/boards: ${boardsResponse.status} - ${boardsResponse.data.boards?.length || 0} boards`);
      
      // Test specific board endpoint if boards exist
      if (boards.length > 0) {
        const boardResponse = await axios.get(`${baseURL}/api/bingo/boards/${boards[0].id}`);
        console.log(`   ✅ GET /api/bingo/boards/${boards[0].id}: ${boardResponse.status}`);
      }

    } catch (apiError) {
      console.log(`   ❌ API Test Failed: ${apiError.message}`);
      console.log(`      → Make sure backend server is running on port ${process.env.PORT || 3001}`);
    }

    // 5. Environment check for production
    console.log('\n5. Production Environment Check:');
    if (process.env.NODE_ENV === 'production') {
      console.log('   ✅ NODE_ENV is set to production');
    } else {
      console.log('   ⚠️  NODE_ENV is not production (currently: ' + process.env.NODE_ENV + ')');
    }

    if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) {
      console.log('   ✅ FRONTEND_URL is set for production');
    } else {
      console.log('   ⚠️  FRONTEND_URL points to localhost: ' + process.env.FRONTEND_URL);
    }

    console.log('\n🎯 Database verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyBingoDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Verification script failed:', err);
    process.exit(1);
  });
